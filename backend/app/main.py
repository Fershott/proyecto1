"""Punto de entrada principal de la API de CogniCore.

Este módulo inicializa la aplicación de FastAPI, configura el middleware de CORS y
define todos los endpoints necesarios para operar la plataforma estudiantil
CogniCore. Las rutas abarcan registro e inicio de sesión, tareas, recordatorios,
horarios semanales, sesiones de enfoque, estadísticas del tablero y el servicio
de resúmenes.

Cada función incluye docstrings descriptivos en español para facilitar el
mantenimiento por parte del equipo y asegurar que cualquier persona comprenda el
objetivo de cada pieza de lógica sin necesidad de explorar otros archivos.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from . import summarizer
from .mailer import send_registration_email, send_reminder_email
from .models import (
    AuthProvider,
    DashboardStats,
    DisplayNameUpdate,
    FocusSession,
    Reminder,
    ReminderCreate,
    ReminderUpdate,
    ScheduleEntry,
    Session,
    SessionCreate,
    SummaryRequest,
    SummaryResponse,
    Task,
    TaskStatus,
    User,
)
from .storage import (
    compute_dashboard_stats,
    load_focus_sessions,
    load_reminders,
    load_users,
    load_sessions,
    load_schedule,
    load_tasks,
    next_id,
    save_focus_sessions,
    save_reminders,
    save_sessions,
    save_schedule,
    save_stats,
    save_tasks,
    save_users,
)
from .oauth import (
    OAuthStateStore,
    get_oauth_client,
    is_stub_mode,
    resolve_frontend_base_url,
)

app = FastAPI(title="Cognicore API", version="1.0.0")

logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ALLOWED_DOMAINS: dict[AuthProvider, tuple[str, ...]] = {
    AuthProvider.GOOGLE: ("gmail.com", "googlemail.com"),
    AuthProvider.MICROSOFT: (
        "outlook.com",
        "outlook.es",
        "hotmail.com",
        "hotmail.es",
        "live.com",
        "live.es",
    ),
}

oauth_state_store = OAuthStateStore()


def _ensure_utc(dt: datetime) -> datetime:
    """Normaliza una marca de tiempo a UTC con información de zona horaria."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _model_copy(instance, **kwargs):
    """Obtiene una copia del modelo compatible con pydantic v1 y v2."""
    if hasattr(instance, "model_copy"):
        return instance.model_copy(**kwargs)  # type: ignore[call-arg]
    if hasattr(instance, "copy"):
        return instance.copy(**kwargs)  # type: ignore[call-arg]
    update = kwargs.get("update") or {}
    payload = {
        key: getattr(instance, key)
        for key in getattr(instance, "__dict__", {})
    }
    payload.update(update)
    return type(instance)(**payload)


def _resolve_redirect_target(next_url: Optional[str]) -> str:
    """Valida y construye la URL de retorno tras completar OAuth."""

    base = resolve_frontend_base_url()
    if not next_url:
        return base

    parsed_target = urlparse(next_url)
    parsed_base = urlparse(base)

    if parsed_target.scheme and parsed_target.netloc:
        if (
            parsed_target.netloc != parsed_base.netloc
            or parsed_target.scheme != parsed_base.scheme
        ):
            raise HTTPException(
                status_code=400,
                detail="La URL de retorno no coincide con el dominio configurado para el frontend.",
            )
        return next_url

    combined = urljoin(base + "/", next_url.lstrip("/"))
    return combined


def _append_query_params(url: str, params: dict[str, str]) -> str:
    """Agrega parámetros de consulta preservando los existentes."""

    parsed = urlparse(url)
    current = dict(parse_qsl(parsed.query, keep_blank_values=True))
    current.update(params)
    new_query = urlencode(current)
    return urlunparse(parsed._replace(query=new_query))


def _get_active_session() -> Session | None:
    """Obtiene la sesión activa almacenada en disco, si existe."""
    sessions = load_sessions()
    return sessions[0] if sessions else None


def _require_session() -> Session:
    """Valida que haya una sesión activa antes de permitir una acción protegida."""
    session = _get_active_session()
    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Inicia sesión con Google o Microsoft para programar recordatorios y sincronizar notificaciones.",
        )
    return session


def _normalize_email(email: str) -> str:
    """Normaliza el correo eliminando espacios y pasando a minúsculas."""
    return email.strip().lower()


def _normalize_display_name(display_name: str, fallback_email: str) -> str:
    """Limpia el nombre mostrado y genera uno amigable si no se proporcionó."""
    normalized = display_name.strip()
    if normalized:
        return " ".join(normalized.split())
    return fallback_email.split("@", 1)[0].replace(".", " ").title()


def _validate_email_provider(email: str, provider: AuthProvider) -> None:
    """Comprueba que el correo pertenezca al proveedor (Google/Microsoft) esperado."""
    email = email.strip()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="El correo electrónico debe contener un dominio válido.")
    domain = email.split("@", 1)[1].lower()
    allowed = ALLOWED_DOMAINS.get(provider, ())
    if domain not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Utiliza un correo de Gmail u Outlook para conectarte con las notificaciones de CogniCore.",
        )


def _find_user(email: str) -> User | None:
    """Busca un usuario persistido usando el correo normalizado."""
    normalized_email = _normalize_email(email)
    for user in load_users():
        if user.email == normalized_email:
            return user
    return None


def _send_reminder_notification(reminder: Reminder) -> None:
    """Envía el correo del recordatorio y registra errores sin interrumpir la API."""

    session = _get_active_session()
    if session is None:
        return
    user = _find_user(session.email)
    if user is None:
        return
    try:
        send_reminder_email(reminder, user)
    except Exception as exc:  # noqa: BLE001 - queremos registrar fallos inesperados
        logger.warning("No se pudo enviar el correo del recordatorio: %s", exc)


def _persist_session_for_user(user: User) -> Session:
    """Crea y guarda la sesión activa basada en el usuario proporcionado."""
    session = Session(
        id=user.id,
        email=user.email,
        provider=user.provider,
        display_name=user.display_name,
    )
    save_sessions([session])
    return session


@app.get("/health")
def health_check() -> dict[str, str]:
    """Permite verificar que la API está viva."""
    return {"status": "ok"}


@app.get("/session", response_model=Optional[Session])
def get_session() -> Session | None:
    """Devuelve la sesión actual si existe, de lo contrario `None`."""
    return _get_active_session()


@app.post("/session", response_model=Session, status_code=201)
def create_session(payload: SessionCreate) -> Session:
    """Alias para `login` que permite compatibilidad con clientes antiguos."""
    return login(payload)


@app.post("/login", response_model=Session)
def login(payload: SessionCreate) -> Session:
    """Permite iniciar sesión con un correo ya registrado en CogniCore."""
    normalized_email = _normalize_email(payload.email)
    user = _find_user(normalized_email)
    if user is None:
        _validate_email_provider(payload.email, payload.provider)
        raise HTTPException(
            status_code=401,
            detail="Regístrate con tu cuenta educativa para acceder al tablero de CogniCore.",
        )
    if user.provider != payload.provider:
        raise HTTPException(
            status_code=403,
            detail="El proveedor seleccionado no coincide con el registrado para este correo.",
        )

    display_name = _normalize_display_name(payload.display_name, user.email)
    if display_name != user.display_name:
        user.display_name = display_name
        users = load_users()
        for index, existing in enumerate(users):
            if existing.id == user.id:
                users[index] = user
                break
        save_users(users)

    return _persist_session_for_user(user)


@app.post("/auth/google/login", response_model=Session)
def login_google(payload: SessionCreate) -> Session:
    """Inicia sesión obligando a que el proveedor sea Google."""

    enforced = _enforce_provider(payload, AuthProvider.GOOGLE)
    return login(enforced)


@app.post("/auth/microsoft/login", response_model=Session)
def login_microsoft(payload: SessionCreate) -> Session:
    """Inicia sesión obligando a que el proveedor sea Microsoft."""

    enforced = _enforce_provider(payload, AuthProvider.MICROSOFT)
    return login(enforced)


def _register_payload(payload: SessionCreate, response: Response) -> Session:
    """Registra un nuevo usuario y envía el correo de bienvenida."""
    _validate_email_provider(payload.email, payload.provider)
    normalized_email = _normalize_email(payload.email)
    display_name = _normalize_display_name(payload.display_name, normalized_email)

    existing = _find_user(normalized_email)
    if existing is not None:
        if existing.provider != payload.provider:
            raise HTTPException(
                status_code=409,
                detail="El correo ya está registrado con otro proveedor. Elige el servicio correcto.",
            )

        if existing.display_name != display_name:
            users = load_users()
            for index, user in enumerate(users):
                if user.id == existing.id:
                    users[index] = _model_copy(user, update={"display_name": display_name})
                    existing = users[index]
                    break
            save_users(users)
        response.status_code = 200
        return _persist_session_for_user(existing)

    users = load_users()
    user = User(
        id=next_id(users),
        email=normalized_email,
        provider=payload.provider,
        display_name=display_name,
        created_at=_ensure_utc(datetime.now(timezone.utc)),
    )
    users.append(user)
    save_users(users)

    response.status_code = 201
    send_registration_email(user)
    return _persist_session_for_user(user)


def _enforce_provider(payload: SessionCreate, provider: AuthProvider) -> SessionCreate:
    """Crea un nuevo payload asegurando que el proveedor coincida con el endpoint."""

    return SessionCreate(email=payload.email, provider=provider, display_name=payload.display_name)


def _issue_oauth_state(
    provider: AuthProvider,
    mode: str,
    display_name: Optional[str],
    next_url: Optional[str],
    stub_email: Optional[str],
) -> str:
    """Genera y guarda el estado necesario para completar el flujo OAuth."""

    normalized_mode = "register" if mode == "register" else "login"
    payload = {
        "mode": normalized_mode,
        "provider": provider.value,
        "next": _resolve_redirect_target(next_url),
    }

    if display_name and display_name.strip():
        payload["display_name"] = " ".join(display_name.strip().split())

    if stub_email and stub_email.strip():
        payload["stub_email"] = _normalize_email(stub_email)

    return oauth_state_store.issue(payload)


@app.get("/auth/google/start")
def start_google_oauth(
    mode: str = "login",
    display_name: Optional[str] = None,
    next: Optional[str] = None,
    stub_email: Optional[str] = None,
) -> RedirectResponse:
    """Inicia el flujo OAuth de Google redirigiendo al consentimiento oficial."""

    state = _issue_oauth_state(AuthProvider.GOOGLE, mode, display_name, next, stub_email)
    client = get_oauth_client(AuthProvider.GOOGLE)

    if is_stub_mode():
        fake_callback = _append_query_params(
            client.config.redirect_uri,
            {"code": "stub-code", "state": state},
        )
        return RedirectResponse(fake_callback, status_code=307)

    prompt = "consent" if mode == "register" else None
    authorize_url = client.build_authorize_url(state, prompt=prompt)
    return RedirectResponse(authorize_url, status_code=307)


@app.get("/auth/microsoft/start")
def start_microsoft_oauth(
    mode: str = "login",
    display_name: Optional[str] = None,
    next: Optional[str] = None,
    stub_email: Optional[str] = None,
) -> RedirectResponse:
    """Inicia el flujo OAuth con Microsoft Azure (Outlook/Teams)."""

    state = _issue_oauth_state(AuthProvider.MICROSOFT, mode, display_name, next, stub_email)
    client = get_oauth_client(AuthProvider.MICROSOFT)

    if is_stub_mode():
        fake_callback = _append_query_params(
            client.config.redirect_uri,
            {"code": "stub-code", "state": state},
        )
        return RedirectResponse(fake_callback, status_code=307)

    authorize_url = client.build_authorize_url(state)
    return RedirectResponse(authorize_url, status_code=307)


@app.get("/auth/google/callback")
async def google_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
) -> RedirectResponse:
    """Recibe la respuesta de Google y completa el flujo de autenticación."""

    if not state:
        raise HTTPException(status_code=400, detail="Falta el estado de autenticación de Google.")
    return await _complete_oauth_callback(AuthProvider.GOOGLE, code, state, error)


@app.get("/auth/microsoft/callback")
async def microsoft_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
) -> RedirectResponse:
    """Recibe la respuesta de Microsoft y completa el flujo de autenticación."""

    if not state:
        raise HTTPException(status_code=400, detail="Falta el estado de autenticación de Microsoft.")
    return await _complete_oauth_callback(AuthProvider.MICROSOFT, code, state, error)


@app.post("/register", response_model=Session, status_code=201)
def register_user(payload: SessionCreate, response: Response) -> Session:
    """Endpoint genérico compatible con clientes antiguos."""

    return _register_payload(payload, response)


@app.post("/auth/google/register", response_model=Session, status_code=201)
def register_google(payload: SessionCreate, response: Response) -> Session:
    """Registra una cuenta garantizando que el proveedor sea Google."""

    enforced = _enforce_provider(payload, AuthProvider.GOOGLE)
    return _register_payload(enforced, response)


@app.post("/auth/microsoft/register", response_model=Session, status_code=201)
def register_microsoft(payload: SessionCreate, response: Response) -> Session:
    """Registra una cuenta garantizando que el proveedor sea Microsoft."""

    enforced = _enforce_provider(payload, AuthProvider.MICROSOFT)
    return _register_payload(enforced, response)


def _extract_email(profile: dict, provider: AuthProvider) -> str | None:
    """Obtiene el correo electrónico del perfil según el proveedor."""

    if provider is AuthProvider.GOOGLE:
        return profile.get("email")
    return (
        profile.get("mail")
        or profile.get("userPrincipalName")
        or profile.get("preferred_username")
        or profile.get("email")
    )


async def _complete_oauth_callback(
    provider: AuthProvider,
    code: Optional[str],
    state: str,
    error: Optional[str],
) -> RedirectResponse:
    """Procesa la respuesta del proveedor OAuth y redirige al frontend."""

    state_payload = oauth_state_store.consume(state)
    redirect_target = _resolve_redirect_target(state_payload.get("next"))

    if error:
        params = {
            "auth": "error",
            "provider": provider.value,
            "message": error,
        }
        return RedirectResponse(_append_query_params(redirect_target, params), status_code=303)

    if not code:
        raise HTTPException(status_code=400, detail="El proveedor no entregó un código de autorización válido.")

    client = get_oauth_client(provider)
    tokens = await client.exchange_code(code)
    profile = await client.fetch_profile(tokens, state_payload)

    email = _extract_email(profile, provider)
    if not email:
        raise HTTPException(status_code=400, detail="No se pudo obtener el correo electrónico del perfil autenticado.")

    raw_display = state_payload.get("display_name") or (
        profile.get("name")
        or profile.get("displayName")
        or profile.get("given_name")
        or profile.get("preferred_username")
        or ""
    )
    display_name = _normalize_display_name(str(raw_display or ""), email)

    payload = SessionCreate(email=email, provider=provider, display_name=display_name)
    mode = state_payload.get("mode")

    if mode == "register":
        response = Response()
        if provider is AuthProvider.GOOGLE:
            register_google(payload, response)
        else:
            register_microsoft(payload, response)
        status_label = "registered" if response.status_code == 201 else "signed-in"
    else:
        if provider is AuthProvider.GOOGLE:
            login_google(payload)
        else:
            login_microsoft(payload)
        status_label = "signed-in"

    params = {
        "auth": status_label,
        "provider": provider.value,
    }
    final_url = _append_query_params(redirect_target, params)
    return RedirectResponse(final_url, status_code=303)


@app.delete("/session", status_code=204)
def clear_session() -> None:
    """Cierra la sesión activa eliminando el registro en disco."""
    save_sessions([])


@app.patch("/session/display-name", response_model=Session)
def update_display_name(payload: DisplayNameUpdate) -> Session:
    """Actualiza el nombre para mostrar de la sesión y del perfil guardado."""

    session = _require_session()
    normalized_name = _normalize_display_name(payload.display_name, session.email)
    users = load_users()

    for index, user in enumerate(users):
        if user.id != session.id:
            continue

        updated_user = _model_copy(user, update={"display_name": normalized_name})
        users[index] = updated_user
        save_users(users)
        return _persist_session_for_user(updated_user)

    raise HTTPException(status_code=404, detail="No se encontró el usuario asociado a la sesión activa")


@app.get("/tasks", response_model=list[Task])
def list_tasks() -> list[Task]:
    """Devuelve todas las tareas guardadas."""
    return load_tasks()


@app.post("/tasks", response_model=Task, status_code=201)
def create_task(task: Task) -> Task:
    """Crea una nueva tarea asignando un identificador incremental."""
    tasks = load_tasks()
    task.id = next_id(tasks)
    tasks.append(task)
    save_tasks(tasks)
    return task


@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task: Task) -> Task:
    """Reemplaza el contenido de una tarea existente."""
    tasks = load_tasks()
    for index, existing in enumerate(tasks):
        if existing.id == task_id:
            task.id = task_id
            tasks[index] = task
            save_tasks(tasks)
            return task
    raise HTTPException(status_code=404, detail="Tarea no encontrada")


@app.patch("/tasks/{task_id}/status", response_model=Task)
def update_task_status(task_id: int, status: TaskStatus) -> Task:
    """Actualiza solo el estado de una tarea sin modificar el resto de campos."""
    tasks = load_tasks()
    for index, existing in enumerate(tasks):
        if existing.id == task_id:
            updated = _model_copy(existing, update={"status": status})
            tasks[index] = updated
            save_tasks(tasks)
            return updated
    raise HTTPException(status_code=404, detail="Tarea no encontrada")


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int) -> None:
    """Elimina una tarea por identificador."""
    existing_tasks = load_tasks()
    tasks = [task for task in existing_tasks if task.id != task_id]
    if len(tasks) == len(existing_tasks):
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    save_tasks(tasks)


@app.get("/reminders", response_model=list[Reminder])
def list_reminders() -> list[Reminder]:
    """Devuelve los recordatorios almacenados."""
    return load_reminders()


@app.post("/reminders", response_model=Reminder, status_code=201)
def create_reminder(reminder: ReminderCreate) -> Reminder:
    """Crea un recordatorio asignándolo al proveedor de la sesión activa."""
    session = _require_session()
    reminders = load_reminders()
    reminder_id = next_id(reminders)
    new_reminder = Reminder(
        id=reminder_id,
        title=reminder.title,
        description=reminder.description,
        remind_at=_ensure_utc(reminder.remind_at),
        type=reminder.type,
        delivery_provider=session.provider,
    )
    reminders.append(new_reminder)
    save_reminders(reminders)
    _send_reminder_notification(new_reminder)
    return new_reminder


@app.delete("/reminders/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int) -> None:
    """Elimina un recordatorio existente."""
    reminders = load_reminders()
    updated = [reminder for reminder in reminders if reminder.id != reminder_id]
    if len(updated) == len(reminders):
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    save_reminders(updated)


@app.patch("/reminders/{reminder_id}", response_model=Reminder)
def update_reminder(reminder_id: int, update: ReminderUpdate) -> Reminder:
    """Permite ajustar título, notas, hora o tipo de un recordatorio."""

    session = _require_session()
    reminders = load_reminders()
    for index, existing in enumerate(reminders):
        if existing.id != reminder_id:
            continue

        changes: dict[str, object] = {}
        if update.title is not None:
            changes["title"] = update.title
        if update.description is not None:
            changes["description"] = update.description
        if update.remind_at is not None:
            changes["remind_at"] = _ensure_utc(update.remind_at)
        if update.type is not None:
            changes["type"] = update.type

        if not changes:
            return existing

        updated_reminder = _model_copy(
            existing,
            update={
                **changes,
                "delivery_provider": session.provider,
            },
        )
        reminders[index] = updated_reminder
        save_reminders(reminders)
        _send_reminder_notification(updated_reminder)
        return updated_reminder

    raise HTTPException(status_code=404, detail="Recordatorio no encontrado")


@app.get("/schedule", response_model=list[ScheduleEntry])
def list_schedule() -> list[ScheduleEntry]:
    """Entrega todos los bloques del horario semanal."""
    return load_schedule()


@app.post("/schedule", response_model=ScheduleEntry, status_code=201)
def create_schedule_entry(entry: ScheduleEntry) -> ScheduleEntry:
    """Registra un bloque de horario validando que la hora final sea posterior."""
    if entry.end_time <= entry.start_time:
        raise HTTPException(status_code=400, detail="La hora de término debe ser posterior al inicio.")

    entries = load_schedule()
    entry.id = next_id(entries)
    entries.append(entry)
    save_schedule(entries)
    return entry


@app.delete("/schedule/{entry_id}", status_code=204)
def delete_schedule_entry(entry_id: int) -> None:
    """Elimina un bloque del horario semanal."""
    entries = load_schedule()
    updated = [entry for entry in entries if entry.id != entry_id]
    if len(entries) == len(updated):
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    save_schedule(updated)


@app.get("/focus-sessions", response_model=list[FocusSession])
def list_focus_sessions() -> list[FocusSession]:
    """Recupera el historial de sesiones de enfoque (pomodoro)."""
    return load_focus_sessions()


@app.post("/focus-sessions", response_model=FocusSession, status_code=201)
def create_focus_session(session: FocusSession) -> FocusSession:
    """Guarda una nueva sesión de enfoque con duración y fecha."""
    sessions = load_focus_sessions()
    session.id = next_id(sessions)
    sessions.append(session)
    save_focus_sessions(sessions)
    return session


@app.get("/dashboard", response_model=DashboardStats)
def dashboard() -> DashboardStats:
    """Calcula estadísticas rápidas para el tablero principal."""
    return compute_dashboard_stats(load_tasks(), load_reminders(), load_focus_sessions())


@app.post("/summary", response_model=SummaryResponse)
async def create_summary(
    text: Optional[str] = Form(None),
    sentences: int = Form(5),
    file: Optional[UploadFile] = File(None),
) -> SummaryResponse:
    """Genera un resumen desde un archivo o texto crudo y extrae palabras clave."""
    summary_text, original_text = await summarizer.generate_summary(file, text, sentences)
    source_for_keywords = original_text or text or summary_text
    keywords = summarizer.top_keywords(source_for_keywords)
    return SummaryResponse(
        summary=summary_text,
        highlighted_keywords=keywords,
        original_text=original_text,
    )


@app.post("/summary/text", response_model=SummaryResponse)
async def create_summary_from_text(request: SummaryRequest) -> SummaryResponse:
    """Permite generar resúmenes exclusivamente desde texto enviado en JSON."""
    summary_text, original_text = await summarizer.summarize_from_text(
        request.text or "",
        request.sentences,
    )
    keywords = summarizer.top_keywords(original_text or request.text or summary_text)
    return SummaryResponse(
        summary=summary_text,
        highlighted_keywords=keywords,
        original_text=original_text,
    )


@app.post("/stats", response_model=DashboardStats)
def update_stats(stats: DashboardStats) -> DashboardStats:
    """Persiste las estadísticas manuales del tablero cuando el cliente las envía."""
    save_stats(stats)
    return stats
