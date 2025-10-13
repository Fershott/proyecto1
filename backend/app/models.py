from datetime import datetime, time
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ReminderType(str, Enum):
    TASK = "task"
    FOCUS = "focus"
    PERSONAL = "personal"


class Reminder(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    remind_at: datetime
    type: ReminderType = ReminderType.TASK


class Task(BaseModel):
    id: int
    title: str
    course: str
    due_date: Optional[datetime] = None
    status: TaskStatus = TaskStatus.PENDING
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class ScheduleEntry(BaseModel):
    id: int
    title: str
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    location: Optional[str] = None
    description: Optional[str] = None


class FocusSession(BaseModel):
    id: int
    topic: str
    duration_minutes: int
    completed_at: datetime


class SummaryRequest(BaseModel):
    text: Optional[str] = None
    sentences: int = 5


class SummaryResponse(BaseModel):
    summary: str
    highlighted_keywords: List[str] = Field(default_factory=list)
    original_text: str = ""


class DashboardStats(BaseModel):
    tasks_completed: int
    focus_hours: float
    milestones_completed: int
    upcoming_reminders: int
    streak_days: int


