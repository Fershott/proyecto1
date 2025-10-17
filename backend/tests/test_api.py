"""Pruebas integrales para la API de CogniCore."""

from __future__ import annotations

import asyncio
import io
import sys
import types
from pathlib import Path
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest

try:  # pragma: no cover - prefer real FastAPI if available
    from fastapi import HTTPException, Response
except ModuleNotFoundError:  # pragma: no cover - testing fallback
    fastapi_stub = types.ModuleType("fastapi")

    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class UploadFile:
        def __init__(self, filename: str, file: io.BytesIO, content_type: str):
            self.filename = filename
            self.file = file
            self.content_type = content_type

    class FastAPI:  # pragma: no cover - minimal placeholder
        def __init__(self, *args, **kwargs):
            self.routes = {}

        def add_middleware(self, *args, **kwargs):
            return None

        def _decorator(self, *args, **kwargs):
            def wrapper(func):
                return func

            return wrapper

        get = post = put = patch = delete = _decorator

    def Form(default=None):  # pragma: no cover - placeholder
        return default

    def File(default=None):  # pragma: no cover - placeholder
        return default

    class Response:
        def __init__(self):
            self.status_code = 200

    fastapi_stub.HTTPException = HTTPException
    fastapi_stub.FastAPI = FastAPI
    fastapi_stub.Form = Form
    fastapi_stub.File = File
    fastapi_stub.UploadFile = UploadFile
    fastapi_stub.Response = Response

    sys.modules["fastapi"] = fastapi_stub

    middleware_module = types.ModuleType("fastapi.middleware")
    cors_module = types.ModuleType("fastapi.middleware.cors")

    class CORSMiddleware:  # pragma: no cover - placeholder
        def __init__(self, *args, **kwargs):
            pass

    cors_module.CORSMiddleware = CORSMiddleware
    sys.modules["fastapi.middleware"] = middleware_module
    sys.modules["fastapi.middleware.cors"] = cors_module

    from fastapi import HTTPException, Response  # type: ignore  # noqa: E402

try:  # pragma: no cover - prefer real pydantic if available
    from pydantic import BaseModel, Field  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - testing fallback
    pydantic_stub = types.ModuleType("pydantic")

    class _Missing:
        pass

    MISSING = _Missing()

    class FieldInfo:
        def __init__(self, default=MISSING, default_factory=None, **kwargs):
            self.default = default
            self.default_factory = default_factory

    def Field(default=MISSING, default_factory=None, **kwargs):  # noqa: D401 - mimic pydantic signature
        return FieldInfo(default, default_factory, **kwargs)

    class BaseModelMeta(type):
        def __new__(mcls, name, bases, namespace):
            annotations = namespace.get("__annotations__", {})
            fields = {}
            for key in annotations:
                fields[key] = namespace.get(key, MISSING)
            namespace["__fields__"] = fields
            return super().__new__(mcls, name, bases, namespace)

    class BaseModel(metaclass=BaseModelMeta):
        __fields__: dict[str, object]

        def __init__(self, **data):
            for field, default in self.__fields__.items():
                value = data.pop(field, MISSING)
                if value is MISSING:
                    if isinstance(default, FieldInfo):
                        if default.default is not MISSING:
                            value = default.default
                        elif default.default_factory is not None:
                            value = default.default_factory()
                    elif default is not MISSING:
                        value = default
                if value is MISSING:
                    raise TypeError(f"Missing field '{field}'")
                setattr(self, field, value)
            for extra_key in data:
                setattr(self, extra_key, data[extra_key])

        def dict(self):
            return {field: getattr(self, field) for field in self.__fields__}

        def copy(self, update=None):
            payload = self.dict()
            if update:
                payload.update(update)
            return self.__class__(**payload)

    pydantic_stub.BaseModel = BaseModel
    pydantic_stub.Field = Field
    sys.modules["pydantic"] = pydantic_stub

    from pydantic import BaseModel, Field  # type: ignore  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

def naive_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


from backend.app import main, storage
from backend.app.models import (
    AuthProvider,
    DashboardStats,
    FocusSession,
    Reminder,
    ReminderCreate,
    ReminderUpdate,
    ScheduleEntry,
    Session,
    SessionCreate,
    DisplayNameUpdate,
    Task,
    TaskStatus,
)


@pytest.fixture()
def patched_storage(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "DATA_DIR", tmp_path)

    tasks_file = tmp_path / "tasks.json"
    reminders_file = tmp_path / "reminders.json"
    focus_file = tmp_path / "focus_sessions.json"
    schedule_file = tmp_path / "schedule.json"
    stats_file = tmp_path / "stats.json"
    sessions_file = tmp_path / "sessions.json"
    users_file = tmp_path / "users.json"
    oauth_states_file = tmp_path / "oauth_states.json"

    monkeypatch.setattr(storage, "TASKS_FILE", tasks_file)
    monkeypatch.setattr(storage, "REMINDERS_FILE", reminders_file)
    monkeypatch.setattr(storage, "FOCUS_FILE", focus_file)
    monkeypatch.setattr(storage, "SCHEDULE_FILE", schedule_file)
    monkeypatch.setattr(storage, "STATS_FILE", stats_file)
    monkeypatch.setattr(storage, "SESSIONS_FILE", sessions_file)
    monkeypatch.setattr(storage, "USERS_FILE", users_file)
    monkeypatch.setattr(storage, "OAUTH_STATES_FILE", oauth_states_file)
    monkeypatch.setenv("COGNICORE_EMAIL_OUTBOX", str(tmp_path / "outbox"))
    monkeypatch.setenv("COGNICORE_FRONTEND_URL", "http://localhost:5173")
    monkeypatch.setenv("COGNICORE_OAUTH_MODE", "stub")
    monkeypatch.setenv("COGNICORE_GOOGLE_CLIENT_ID", "test-google-id")
    monkeypatch.setenv("COGNICORE_GOOGLE_CLIENT_SECRET", "test-google-secret")
    monkeypatch.setenv("COGNICORE_GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
    monkeypatch.setenv("COGNICORE_MICROSOFT_CLIENT_ID", "test-microsoft-id")
    monkeypatch.setenv("COGNICORE_MICROSOFT_CLIENT_SECRET", "test-microsoft-secret")
    monkeypatch.setenv("COGNICORE_MICROSOFT_REDIRECT_URI", "http://localhost:8000/auth/microsoft/callback")

    return storage


def register_via_api(payload: SessionCreate) -> tuple[Session, Response]:
    """Ejecuta el flujo de registro devolviendo la sesión y la respuesta HTTP."""

    response = Response()
    session = main.register_user(payload, response)
    return session, response


def test_health_check():
    assert main.health_check() == {"status": "ok"}


def test_registration_and_session_flow(patched_storage, tmp_path):
    assert main.get_session() is None

    with pytest.raises(HTTPException) as excinfo:
        main.register_user(
            SessionCreate(
                email="persona@yahoo.com",
                provider=AuthProvider.GOOGLE,
                display_name="Persona",
            ),
            Response(),
        )
    assert excinfo.value.status_code == 400

    created, register_response = register_via_api(
        SessionCreate(
            email="team.student@outlook.com",
            provider=AuthProvider.MICROSOFT,
            display_name=" Team   Student  ",
        )
    )

    assert created.id == 1
    assert created.email == "team.student@outlook.com"
    assert created.provider is AuthProvider.MICROSOFT
    assert created.display_name == "Team Student"
    assert main.get_session() == created
    assert register_response.status_code == 201

    outbox_files = list((tmp_path / "outbox").glob("welcome_*.eml"))
    assert len(outbox_files) == 1

    updated_session, repeated_response = register_via_api(
        SessionCreate(
            email="team.student@outlook.com",
            provider=AuthProvider.MICROSOFT,
            display_name="Team Actualizado",
        )
    )
    assert updated_session.id == created.id
    assert updated_session.display_name == "Team Actualizado"
    assert repeated_response.status_code == 200
    assert len(list((tmp_path / "outbox").glob("welcome_*.eml"))) == 1

    main.clear_session()
    assert main.get_session() is None

    with pytest.raises(HTTPException) as excinfo:
        main.create_session(
            SessionCreate(
                email="team.student@outlook.com",
                provider=AuthProvider.GOOGLE,
                display_name="Team",
            )
        )
    assert excinfo.value.status_code == 403

    with pytest.raises(HTTPException) as excinfo:
        main.create_session(
            SessionCreate(
                email="no.existe@outlook.com",
                provider=AuthProvider.MICROSOFT,
                display_name="Desconocido",
            )
        )
    assert excinfo.value.status_code == 401

    logged = main.create_session(
        SessionCreate(
            email="team.student@outlook.com",
            provider=AuthProvider.MICROSOFT,
            display_name="Team Actualizado",
        )
    )
    assert logged.display_name == "Team Actualizado"


def test_update_display_name_endpoint(patched_storage):
    response = Response()
    session = main.register_google(
        SessionCreate(
            email="estudiante.original@gmail.com",
            provider=AuthProvider.GOOGLE,
            display_name="",
        ),
        response,
    )

    assert session.display_name == "Estudiante Original"
    assert response.status_code == 201

    updated_session = main.update_display_name(
        DisplayNameUpdate(display_name="Estudiante Personalizado"),
    )

    assert updated_session.display_name == "Estudiante Personalizado"
    assert main.get_session().display_name == "Estudiante Personalizado"

def test_reminder_requires_session(patched_storage):
    with pytest.raises(HTTPException) as excinfo:
        main.create_reminder(
            ReminderCreate(
                title="Recordar sin sesión",
                description=None,
                remind_at=naive_utc() + timedelta(hours=1),
            )
        )
    assert excinfo.value.status_code == 401


def test_task_crud_flow(patched_storage):
    assert main.list_tasks() == []

    created = main.create_task(
        Task(
            id=0,
            title="Plan lectura",
            course="Neurociencia",
            due_date=naive_utc() + timedelta(days=2),
            status=TaskStatus.PENDING,
            notes="Leer capítulo 3",
            tags=["lectura"],
        )
    )
    assert created.id == 1
    assert created.title == "Plan lectura"

    updated = main.update_task(
        1,
        Task(
            id=1,
            title="Plan de lectura actualizado",
            course="Neurociencia",
            due_date=created.due_date,
            status=TaskStatus.IN_PROGRESS,
            notes="Anotar ideas principales",
            tags=["lectura", "resumen"],
        ),
    )
    assert updated.title == "Plan de lectura actualizado"
    assert updated.status == TaskStatus.IN_PROGRESS

    patched = main.update_task_status(1, TaskStatus.COMPLETED)
    assert patched.status == TaskStatus.COMPLETED

    main.delete_task(1)
    assert main.list_tasks() == []

    with pytest.raises(HTTPException) as excinfo:
        main.update_task(99, updated)
    assert excinfo.value.status_code == 404
def test_reminder_flow(patched_storage, tmp_path):
    register_via_api(
        SessionCreate(
            email="sofia.student@gmail.com",
            provider=AuthProvider.GOOGLE,
            display_name="Sofía Student",
        )
    )

    created = main.create_reminder(
        ReminderCreate(
            title="Entrega de proyecto",
            description="Enviar informe final",
            remind_at=naive_utc() + timedelta(hours=3),
        )
    )
    assert created.id == 1
    assert created.title == "Entrega de proyecto"
    assert created.delivery_provider == AuthProvider.GOOGLE

    reminder_files = list((tmp_path / "outbox").glob("reminder_*.eml"))
    assert len(reminder_files) == 1

    updated = main.update_reminder(
        created.id,
        ReminderUpdate(
            title="Entrega final actualizada",
            description="Revisar rúbrica antes de enviar.",
            remind_at=naive_utc() + timedelta(hours=4),
        ),
    )
    assert updated.title == "Entrega final actualizada"
    assert updated.description == "Revisar rúbrica antes de enviar."
    assert updated.delivery_provider == AuthProvider.GOOGLE

    reminder_files_after = list((tmp_path / "outbox").glob("reminder_*.eml"))
    assert len(reminder_files_after) == 2

    no_change = main.update_reminder(created.id, ReminderUpdate())
    assert no_change.title == updated.title
    assert len(list((tmp_path / "outbox").glob("reminder_*.eml"))) == 2

    reminders = main.list_reminders()
    assert len(reminders) == 1

    main.delete_reminder(1)
    assert main.list_reminders() == []

    with pytest.raises(HTTPException) as excinfo:
        main.delete_reminder(1)
    assert excinfo.value.status_code == 404


def test_schedule_flow(patched_storage):
    created = main.create_schedule_entry(
        ScheduleEntry(
            id=0,
            title="Laboratorio de química",
            day_of_week=1,
            start_time=datetime.strptime("09:00", "%H:%M").time(),
            end_time=datetime.strptime("10:30", "%H:%M").time(),
            location="Sala 302",
            description="Recordar bata y gafas",
        )
    )

    assert created.id == 1
    assert created.day_of_week == 1

    all_entries = main.list_schedule()
    assert len(all_entries) == 1

    with pytest.raises(HTTPException) as excinfo:
        main.create_schedule_entry(
            ScheduleEntry(
                id=0,
                title="Clase inválida",
                day_of_week=2,
                start_time=datetime.strptime("11:00", "%H:%M").time(),
                end_time=datetime.strptime("10:30", "%H:%M").time(),
            )
        )
    assert excinfo.value.status_code == 400

    main.delete_schedule_entry(created.id)
    assert main.list_schedule() == []

    with pytest.raises(HTTPException) as excinfo:
        main.delete_schedule_entry(created.id)
    assert excinfo.value.status_code == 404


def test_focus_sessions_flow(patched_storage):
    created = main.create_focus_session(
        FocusSession(
            id=0,
            topic="Matemáticas avanzadas",
            duration_minutes=50,
            completed_at=naive_utc(),
        )
    )
    assert created.id == 1
    assert created.topic == "Matemáticas avanzadas"

    sessions = main.list_focus_sessions()
    assert len(sessions) == 1


def test_dashboard_stats(patched_storage):
    storage.save_stats(
        DashboardStats(
            tasks_completed=0,
            focus_hours=0,
            milestones_completed=7,
            upcoming_reminders=0,
            streak_days=5,
        )
    )

    register_via_api(
        SessionCreate(
            email="luis.organizer@outlook.com",
            provider=AuthProvider.MICROSOFT,
            display_name="Luis Organizer",
        )
    )

    main.create_task(
        Task(
            id=0,
            title="Ensayo",
            course="Historia",
            status=TaskStatus.COMPLETED,
            due_date=naive_utc() - timedelta(days=1),
            tags=[],
        )
    )
    main.create_task(
        Task(
            id=0,
            title="Lectura",
            course="Filosofía",
            status=TaskStatus.PENDING,
            due_date=naive_utc() + timedelta(days=1),
            tags=[],
        )
    )

    main.create_focus_session(
        FocusSession(
            id=0,
            topic="Investigación",
            duration_minutes=90,
            completed_at=naive_utc(),
        )
    )

    main.create_reminder(
        ReminderCreate(
            title="Recordar reunión",
            description="Reunión con tutor",
            remind_at=naive_utc() + timedelta(hours=4),
        )
    )

    stats = main.dashboard()
    assert stats.tasks_completed == 1
    assert stats.focus_hours == 1.5
    assert stats.milestones_completed == 7
    assert stats.upcoming_reminders == 1
    assert stats.streak_days == 5


def test_provider_specific_endpoints(patched_storage):
    response_google = Response()
    session_google = main.register_google(
        SessionCreate(
            email="alumna.focus@gmail.com",
            provider=AuthProvider.MICROSOFT,
            display_name="Alumna Focus",
        ),
        response_google,
    )
    assert session_google.provider is AuthProvider.GOOGLE
    assert response_google.status_code == 201

    logged_google = main.login_google(
        SessionCreate(
            email="alumna.focus@gmail.com",
            provider=AuthProvider.GOOGLE,
            display_name="Alumna Actualizada",
        )
    )
    assert logged_google.display_name == "Alumna Actualizada"

    response_ms = Response()
    session_ms = main.register_microsoft(
        SessionCreate(
            email="mentor.plan@outlook.com",
            provider=AuthProvider.GOOGLE,
            display_name="Mentor Plan",
        ),
        response_ms,
    )
    assert session_ms.provider is AuthProvider.MICROSOFT
    assert response_ms.status_code == 201

    logged_ms = main.login_microsoft(
        SessionCreate(
            email="mentor.plan@outlook.com",
            provider=AuthProvider.MICROSOFT,
            display_name="Mentor Planner",
        )
    )
    assert logged_ms.display_name == "Mentor Planner"


def test_oauth_start_and_callback_flow(patched_storage):
    response = main.start_google_oauth(
        mode="register",
        display_name="Estudiante Uno",
        next="/panel",
        stub_email="estudiante@gmail.com",
    )
    assert response.status_code == 307
    location = response.headers.get("location")
    assert location is not None
    state_value = parse_qs(urlparse(location).query)["state"][0]

    redirect_response = asyncio.run(main.google_callback(code="stub-code", state=state_value))
    assert redirect_response.status_code == 303
    redirect_location = redirect_response.headers.get("location")
    assert redirect_location is not None
    assert "auth=registered" in redirect_location
    assert "provider=google" in redirect_location

    session = main.get_session()
    assert session is not None
    assert session.provider is AuthProvider.GOOGLE
    assert session.email == "estudiante@gmail.com"

    # Permite registrar incluso si no se proporcionó un nombre antes del flujo OAuth.
    nameless_register = main.start_google_oauth(
        mode="register",
        next="/panel",
        stub_email="sin_nombre@gmail.com",
    )
    nameless_state = parse_qs(urlparse(nameless_register.headers["location"]).query)["state"][0]
    nameless_result = asyncio.run(main.google_callback(code="stub-code", state=nameless_state))
    assert nameless_result.status_code == 303

    main.clear_session()

    login_redirect = main.start_google_oauth(
        mode="login",
        next="/panel",
        stub_email="estudiante@gmail.com",
    )
    state_login = parse_qs(urlparse(login_redirect.headers["location"]).query)["state"][0]
    login_result = asyncio.run(main.google_callback(code="stub-code", state=state_login))
    assert "auth=signed-in" in login_result.headers["location"]

    ms_register = main.start_microsoft_oauth(
        mode="register",
        display_name="Mentor Plan",
        next="http://localhost:5173/dashboard",
        stub_email="mentor@outlook.com",
    )
    state_ms = parse_qs(urlparse(ms_register.headers["location"]).query)["state"][0]
    ms_result = asyncio.run(main.microsoft_callback(code="stub-code", state=state_ms))
    assert "provider=microsoft" in ms_result.headers["location"]

    session_ms = main.get_session()
    assert session_ms is not None
    assert session_ms.provider is AuthProvider.MICROSOFT
    assert session_ms.email == "mentor@outlook.com"


def test_summary_text_endpoint(patched_storage):
    response = asyncio.run(
        main.create_summary_from_text(
            request=types.SimpleNamespace(
                text="La atención plena mejora el enfoque. Permite organizar mejor el tiempo.", sentences=1
            )
        )
    )
    assert response.summary
    assert "enfoque" in response.original_text.lower()
    assert isinstance(response.highlighted_keywords, list)


def test_summary_file_endpoint(patched_storage):
    from fastapi import UploadFile  # type: ignore

    buffer = io.BytesIO(
        "La tecnología asistiva apoya a estudiantes con diferentes estilos de aprendizaje.".encode("utf-8")
    )
    try:
        upload = UploadFile(filename="ayuda.txt", file=buffer, content_type="text/plain")
    except TypeError:  # pragma: no cover - compatibility with Starlette >= 0.38
        from starlette.datastructures import Headers  # type: ignore

        upload = UploadFile(buffer, filename="ayuda.txt", headers=Headers({"content-type": "text/plain"}))
    response = asyncio.run(main.create_summary(text=None, sentences=1, file=upload))
    assert "estudiantes" in response.original_text.lower()
    assert response.summary
    assert response.highlighted_keywords


def test_summary_requires_input():
    with pytest.raises(HTTPException) as excinfo:
        asyncio.run(main.create_summary(text=None, sentences=1, file=None))
    assert excinfo.value.status_code == 400
