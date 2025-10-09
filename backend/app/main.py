from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import summarizer
from .models import (
    DashboardStats,
    FocusSession,
    Reminder,
    SummaryRequest,
    SummaryResponse,
    Task,
    TaskStatus,
)
from .storage import (
    compute_dashboard_stats,
    load_focus_sessions,
    load_reminders,
    load_tasks,
    next_id,
    save_focus_sessions,
    save_reminders,
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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


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
def create_reminder(reminder: Reminder) -> Reminder:
    reminders = load_reminders()
    reminder.id = next_id(reminders)
    reminders.append(reminder)
    save_reminders(reminders)
    return reminder


@app.delete("/reminders/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int) -> None:
    reminders = load_reminders()
    updated = [reminder for reminder in reminders if reminder.id != reminder_id]
    if len(updated) == len(reminders):
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    save_reminders(updated)


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
