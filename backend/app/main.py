from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import summarizer
from .models import (
    AuthProvider,
    DashboardStats,
    FocusSession,
    Reminder,
    ReminderCreate,
    ScheduleEntry,
    SummaryRequest,
    SummaryResponse,
    Task,
    TaskStatus,
    Session,
    SessionCreate,
)
from .storage import (
    compute_dashboard_stats,
    load_focus_sessions,
    load_reminders,
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
)

app = FastAPI(title="Cognicore API", version="1.0.0")

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


def _get_active_session() -> Session | None:
    sessions = load_sessions()
    return sessions[0] if sessions else None


def _require_session() -> Session:
    session = _get_active_session()
    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Inicia sesión con Google o Microsoft para programar recordatorios y sincronizar notificaciones.",
        )
    return session


def _validate_email_provider(email: str, provider: AuthProvider) -> None:
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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/session", response_model=Optional[Session])
def get_session() -> Session | None:
    return _get_active_session()


@app.post("/session", response_model=Session, status_code=201)
def create_session(payload: SessionCreate) -> Session:
    _validate_email_provider(payload.email, payload.provider)

    normalized_email = payload.email.strip().lower()
    sessions = [
        Session(
            id=1,
            email=normalized_email,
            provider=payload.provider,
            display_name=payload.display_name.strip() or normalized_email.split("@", 1)[0],
        )
    ]
    save_sessions(sessions)
    return sessions[0]


@app.delete("/session", status_code=204)
def clear_session() -> None:
    save_sessions([])


@app.get("/tasks", response_model=list[Task])
def list_tasks() -> list[Task]:
    return load_tasks()


@app.post("/tasks", response_model=Task, status_code=201)
def create_task(task: Task) -> Task:
    tasks = load_tasks()
    task.id = next_id(tasks)
    tasks.append(task)
    save_tasks(tasks)
    return task


@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task: Task) -> Task:
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
    tasks = load_tasks()
    for index, existing in enumerate(tasks):
        if existing.id == task_id:
            updated = existing.copy(update={"status": status})
            tasks[index] = updated
            save_tasks(tasks)
            return updated
    raise HTTPException(status_code=404, detail="Tarea no encontrada")


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int) -> None:
    existing_tasks = load_tasks()
    tasks = [task for task in existing_tasks if task.id != task_id]
    if len(tasks) == len(existing_tasks):
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    save_tasks(tasks)


@app.get("/reminders", response_model=list[Reminder])
def list_reminders() -> list[Reminder]:
    return load_reminders()


@app.post("/reminders", response_model=Reminder, status_code=201)
def create_reminder(reminder: ReminderCreate) -> Reminder:
    session = _require_session()
    reminders = load_reminders()
    reminder_id = next_id(reminders)
    new_reminder = Reminder(
        id=reminder_id,
        title=reminder.title,
        description=reminder.description,
        remind_at=reminder.remind_at,
        type=reminder.type,
        delivery_provider=session.provider,
    )
    reminders.append(new_reminder)
    save_reminders(reminders)
    return new_reminder


@app.delete("/reminders/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int) -> None:
    reminders = load_reminders()
    updated = [reminder for reminder in reminders if reminder.id != reminder_id]
    if len(updated) == len(reminders):
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    save_reminders(updated)


@app.get("/schedule", response_model=list[ScheduleEntry])
def list_schedule() -> list[ScheduleEntry]:
    return load_schedule()


@app.post("/schedule", response_model=ScheduleEntry, status_code=201)
def create_schedule_entry(entry: ScheduleEntry) -> ScheduleEntry:
    if entry.end_time <= entry.start_time:
        raise HTTPException(status_code=400, detail="La hora de término debe ser posterior al inicio.")

    entries = load_schedule()
    entry.id = next_id(entries)
    entries.append(entry)
    save_schedule(entries)
    return entry


@app.delete("/schedule/{entry_id}", status_code=204)
def delete_schedule_entry(entry_id: int) -> None:
    entries = load_schedule()
    updated = [entry for entry in entries if entry.id != entry_id]
    if len(entries) == len(updated):
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    save_schedule(updated)


@app.get("/focus-sessions", response_model=list[FocusSession])
def list_focus_sessions() -> list[FocusSession]:
    return load_focus_sessions()


@app.post("/focus-sessions", response_model=FocusSession, status_code=201)
def create_focus_session(session: FocusSession) -> FocusSession:
    sessions = load_focus_sessions()
    session.id = next_id(sessions)
    sessions.append(session)
    save_focus_sessions(sessions)
    return session


@app.get("/dashboard", response_model=DashboardStats)
def dashboard() -> DashboardStats:
    return compute_dashboard_stats(load_tasks(), load_reminders(), load_focus_sessions())


@app.post("/summary", response_model=SummaryResponse)
async def create_summary(
    text: Optional[str] = Form(None),
    sentences: int = Form(5),
    file: Optional[UploadFile] = File(None),
) -> SummaryResponse:
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
    save_stats(stats)
    return stats
