"""Modelos de datos compartidos entre la API y el frontend de CogniCore."""

from datetime import datetime, time
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """Estados posibles para una tarea académica."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ReminderType(str, Enum):
    """Tipologías de recordatorios que puede crear la persona usuaria."""

    TASK = "task"
    FOCUS = "focus"
    PERSONAL = "personal"


class Reminder(BaseModel):
    """Representa un recordatorio sincronizable con Gmail u Outlook."""

    id: int
    title: str
    description: Optional[str] = None
    remind_at: datetime
    type: ReminderType = ReminderType.TASK
    delivery_provider: "AuthProvider" = Field(default_factory=lambda: AuthProvider.GOOGLE)


class Task(BaseModel):
    """Define la estructura de una tarea planificada dentro de CogniCore."""

    id: int
    title: str
    course: str
    due_date: Optional[datetime] = None
    status: TaskStatus = TaskStatus.PENDING
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class ScheduleEntry(BaseModel):
    """Bloque de horario semanal mostrado en el calendario organizado de CogniCore."""

    id: int
    title: str
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    location: Optional[str] = None
    description: Optional[str] = None


class FocusSession(BaseModel):
    """Registro de una sesión de enfoque o pomodoro completada."""

    id: int
    topic: str
    duration_minutes: int
    completed_at: datetime


class SummaryRequest(BaseModel):
    """Petición de resumen enviada cuando el cliente manda texto en JSON."""

    text: Optional[str] = None
    sentences: int = 5


class SummaryResponse(BaseModel):
    """Respuesta estructurada de la API de resúmenes."""

    summary: str
    highlighted_keywords: List[str] = Field(default_factory=list)
    original_text: str = ""


class DashboardStats(BaseModel):
    """Indicadores que alimentan la cabecera de progreso del tablero."""

    tasks_completed: int
    focus_hours: float
    milestones_completed: int
    upcoming_reminders: int
    streak_days: int


class AuthProvider(str, Enum):
    """Proveedores admitidos para autenticación y notificaciones."""

    GOOGLE = "google"
    MICROSOFT = "microsoft"


class SessionBase(BaseModel):
    """Campos compartidos entre sesiones existentes y nuevas."""

    email: str
    provider: AuthProvider
    display_name: str


class Session(SessionBase):
    """Representa una sesión iniciada que ya fue persistida."""

    id: int

    def __eq__(self, other: object) -> bool:
        """Compara sesiones por contenido para facilitar las pruebas."""
        if not isinstance(other, Session):
            return NotImplemented
        return (
            getattr(self, "id", None) == getattr(other, "id", None)
            and getattr(self, "email", None) == getattr(other, "email", None)
            and getattr(self, "provider", None) == getattr(other, "provider", None)
            and getattr(self, "display_name", None) == getattr(other, "display_name", None)
        )


class SessionCreate(SessionBase):
    """Payload utilizado para registrar o iniciar sesión."""


class UserBase(BaseModel):
    """Atributos fundamentales de un perfil de CogniCore."""

    email: str
    provider: AuthProvider
    display_name: str


class User(UserBase):
    """Perfil persistido con identificador y fecha de creación."""

    id: int
    created_at: datetime


class UserCreate(UserBase):
    """Modelo auxiliar cuando se necesita crear usuarios desde scripts."""


class ReminderCreate(BaseModel):
    """Estructura que utiliza el frontend para proponer un nuevo recordatorio."""

    title: str
    description: Optional[str] = None
    remind_at: datetime
    type: ReminderType = ReminderType.TASK


class ReminderUpdate(BaseModel):
    """Permite actualizar campos puntuales de un recordatorio existente."""

    title: Optional[str] = None
    description: Optional[str] = None
    remind_at: Optional[datetime] = None
    type: Optional[ReminderType] = None


