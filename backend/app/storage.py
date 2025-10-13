"""Módulo de persistencia basado en archivos JSON para CogniCore."""

import json
from datetime import datetime, time
from pathlib import Path
from typing import List

from .models import (
    AuthProvider,
    DashboardStats,
    FocusSession,
    Reminder,
    ScheduleEntry,
    Session,
    Task,
    TaskStatus,
    User,
)


DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)

TASKS_FILE = DATA_DIR / "tasks.json"
REMINDERS_FILE = DATA_DIR / "reminders.json"
FOCUS_FILE = DATA_DIR / "focus_sessions.json"
SCHEDULE_FILE = DATA_DIR / "schedule.json"
STATS_FILE = DATA_DIR / "stats.json"
SESSIONS_FILE = DATA_DIR / "sessions.json"
USERS_FILE = DATA_DIR / "users.json"


def _read_json(path: Path, default):
    """Lee un archivo JSON y devuelve un valor predeterminado si no existe."""
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: Path, data):
    """Escribe datos en JSON con codificación UTF-8 y formato legible."""
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_tasks() -> List[Task]:
    """Carga todas las tareas guardadas en disco."""
    raw = _read_json(TASKS_FILE, [])
    tasks = []
    for item in raw:
        if item.get("due_date"):
            item["due_date"] = datetime.fromisoformat(item["due_date"])
        tasks.append(Task(**item))
    return tasks


def save_tasks(tasks: List[Task]) -> None:
    """Persiste la lista completa de tareas serializando fechas a ISO 8601."""
    payload = []
    for task in tasks:
        data = task.dict()
        if task.due_date:
            data["due_date"] = task.due_date.isoformat()
        payload.append(data)
    _write_json(TASKS_FILE, payload)


def load_schedule() -> List[ScheduleEntry]:
    """Obtiene los bloques del horario semanal y sus horas en formato `time`."""
    raw = _read_json(SCHEDULE_FILE, [])
    entries: List[ScheduleEntry] = []
    for item in raw:
        item["start_time"] = time.fromisoformat(item["start_time"])
        item["end_time"] = time.fromisoformat(item["end_time"])
        entries.append(ScheduleEntry(**item))
    return entries


def save_schedule(entries: List[ScheduleEntry]) -> None:
    """Guarda el horario semanal convirtiendo las horas a texto ISO."""
    payload = []
    for entry in entries:
        data = entry.dict()
        data["start_time"] = entry.start_time.isoformat()
        data["end_time"] = entry.end_time.isoformat()
        payload.append(data)
    _write_json(SCHEDULE_FILE, payload)


def load_reminders() -> List[Reminder]:
    """Recupera todos los recordatorios ajustando el proveedor por defecto."""
    raw = _read_json(REMINDERS_FILE, [])
    reminders = []
    for item in raw:
        item["remind_at"] = datetime.fromisoformat(item["remind_at"])
        if "delivery_provider" not in item:
            item["delivery_provider"] = AuthProvider.GOOGLE.value
        reminders.append(Reminder(**item))
    return reminders


def save_reminders(reminders: List[Reminder]) -> None:
    """Escribe los recordatorios en disco incluyendo el proveedor como cadena."""
    payload = []
    for reminder in reminders:
        data = reminder.dict()
        data["remind_at"] = reminder.remind_at.isoformat()
        data["delivery_provider"] = reminder.delivery_provider.value
        payload.append(data)
    _write_json(REMINDERS_FILE, payload)


def load_focus_sessions() -> List[FocusSession]:
    """Carga el historial de sesiones de enfoque convertidas a `datetime`."""
    raw = _read_json(FOCUS_FILE, [])
    sessions = []
    for item in raw:
        item["completed_at"] = datetime.fromisoformat(item["completed_at"])
        sessions.append(FocusSession(**item))
    return sessions


def save_focus_sessions(sessions: List[FocusSession]) -> None:
    """Persiste las sesiones de enfoque con sus marcas de tiempo en ISO."""
    payload = []
    for session in sessions:
        data = session.dict()
        data["completed_at"] = session.completed_at.isoformat()
        payload.append(data)
    _write_json(FOCUS_FILE, payload)


def load_stats() -> DashboardStats:
    """Obtiene los indicadores del tablero o usa valores base si no existen."""
    raw = _read_json(
        STATS_FILE,
        {
            "tasks_completed": 0,
            "focus_hours": 0.0,
            "milestones_completed": 0,
            "upcoming_reminders": 0,
            "streak_days": 0,
        },
    )
    return DashboardStats(**raw)


def save_stats(stats: DashboardStats) -> None:
    """Guarda los indicadores agregados del tablero."""
    _write_json(STATS_FILE, stats.dict())


def next_id(items: List) -> int:
    """Calcula el próximo identificador incremental."""
    if not items:
        return 1
    return max(item.id for item in items) + 1


def compute_dashboard_stats(tasks: List[Task], reminders: List[Reminder], sessions: List[FocusSession]) -> DashboardStats:
    """Genera estadísticas combinando tareas, recordatorios y sesiones."""
    tasks_completed = sum(1 for task in tasks if task.status == TaskStatus.COMPLETED)
    focus_minutes = sum(session.duration_minutes for session in sessions)
    focus_hours = round(focus_minutes / 60, 1)
    upcoming_reminders = sum(1 for reminder in reminders if reminder.remind_at > datetime.utcnow())

    base = load_stats()
    return DashboardStats(
        tasks_completed=tasks_completed,
        focus_hours=focus_hours,
        milestones_completed=base.milestones_completed,
        upcoming_reminders=upcoming_reminders,
        streak_days=base.streak_days,
    )


def load_sessions() -> List[Session]:
    """Carga las sesiones activas desde el almacenamiento."""
    raw = _read_json(SESSIONS_FILE, [])
    sessions: List[Session] = []
    for item in raw:
        sessions.append(Session(**item))
    return sessions


def save_sessions(sessions: List[Session]) -> None:
    """Guarda las sesiones activas serializando el proveedor como texto."""
    payload = []
    for session in sessions:
        data = session.dict()
        data["provider"] = session.provider.value
        payload.append(data)
    _write_json(SESSIONS_FILE, payload)


def load_users() -> List[User]:
    """Recupera los usuarios registrados convirtiendo `created_at` a datetime."""
    raw = _read_json(USERS_FILE, [])
    users: List[User] = []
    for item in raw:
        item["created_at"] = datetime.fromisoformat(item["created_at"])
        users.append(User(**item))
    return users


def save_users(users: List[User]) -> None:
    """Persiste la lista de usuarios en disco."""
    payload = []
    for user in users:
        data = user.dict()
        data["created_at"] = user.created_at.isoformat()
        data["provider"] = user.provider.value
        payload.append(data)
    _write_json(USERS_FILE, payload)


