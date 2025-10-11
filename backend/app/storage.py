import json
from datetime import datetime, time
from pathlib import Path
from typing import List

from .models import (
    DashboardStats,
    FocusSession,
    Reminder,
    ScheduleEntry,
    Task,
    TaskStatus,
)


DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)

TASKS_FILE = DATA_DIR / "tasks.json"
REMINDERS_FILE = DATA_DIR / "reminders.json"
FOCUS_FILE = DATA_DIR / "focus_sessions.json"
SCHEDULE_FILE = DATA_DIR / "schedule.json"
STATS_FILE = DATA_DIR / "stats.json"


def _read_json(path: Path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: Path, data):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_tasks() -> List[Task]:
    raw = _read_json(TASKS_FILE, [])
    tasks = []
    for item in raw:
        if item.get("due_date"):
            item["due_date"] = datetime.fromisoformat(item["due_date"])
        tasks.append(Task(**item))
    return tasks


def save_tasks(tasks: List[Task]) -> None:
    payload = []
    for task in tasks:
        data = task.dict()
        if task.due_date:
            data["due_date"] = task.due_date.isoformat()
        payload.append(data)
    _write_json(TASKS_FILE, payload)


def load_schedule() -> List[ScheduleEntry]:
    raw = _read_json(SCHEDULE_FILE, [])
    entries: List[ScheduleEntry] = []
    for item in raw:
        item["start_time"] = time.fromisoformat(item["start_time"])
        item["end_time"] = time.fromisoformat(item["end_time"])
        entries.append(ScheduleEntry(**item))
    return entries


def save_schedule(entries: List[ScheduleEntry]) -> None:
    payload = []
    for entry in entries:
        data = entry.dict()
        data["start_time"] = entry.start_time.isoformat()
        data["end_time"] = entry.end_time.isoformat()
        payload.append(data)
    _write_json(SCHEDULE_FILE, payload)


def load_reminders() -> List[Reminder]:
    raw = _read_json(REMINDERS_FILE, [])
    reminders = []
    for item in raw:
        item["remind_at"] = datetime.fromisoformat(item["remind_at"])
        reminders.append(Reminder(**item))
    return reminders


def save_reminders(reminders: List[Reminder]) -> None:
    payload = []
    for reminder in reminders:
        data = reminder.dict()
        data["remind_at"] = reminder.remind_at.isoformat()
        payload.append(data)
    _write_json(REMINDERS_FILE, payload)


def load_focus_sessions() -> List[FocusSession]:
    raw = _read_json(FOCUS_FILE, [])
    sessions = []
    for item in raw:
        item["completed_at"] = datetime.fromisoformat(item["completed_at"])
        sessions.append(FocusSession(**item))
    return sessions


def save_focus_sessions(sessions: List[FocusSession]) -> None:
    payload = []
    for session in sessions:
        data = session.dict()
        data["completed_at"] = session.completed_at.isoformat()
        payload.append(data)
    _write_json(FOCUS_FILE, payload)


def load_stats() -> DashboardStats:
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
    _write_json(STATS_FILE, stats.dict())


def next_id(items: List) -> int:
    if not items:
        return 1
    return max(item.id for item in items) + 1


def compute_dashboard_stats(tasks: List[Task], reminders: List[Reminder], sessions: List[FocusSession]) -> DashboardStats:
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
