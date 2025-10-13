"""Utilidades para enviar correos transaccionales de CogniCore."""
from __future__ import annotations

import os
import smtplib
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

from .models import AuthProvider, User
from .storage import DATA_DIR


def _build_message(user: User) -> EmailMessage:
    """Construye el mensaje de bienvenida personalizado para la persona usuaria."""
    message = EmailMessage()
    message["Subject"] = "¡Bienvenido a CogniCore!"
    message["To"] = user.email
    message["From"] = os.getenv("COGNICORE_EMAIL_FROM", "no-reply@cognicore.local")

    provider_hint = (
        "Hemos conectado tus recordatorios con Gmail para que recibas avisos estilo Teams."
        if user.provider == AuthProvider.GOOGLE
        else "Tus recordatorios se enviarán a Outlook y Microsoft Teams automáticamente."
    )

    body = f"""
Hola {user.display_name},

¡Gracias por registrarte como la primera persona en tu equipo dentro de CogniCore! Ya puedes planificar tus tareas, programar recordatorios y generar resúmenes accesibles.

{provider_hint}

Si en algún momento quieres actualizar tus datos o desactivar los avisos, puedes hacerlo desde el menú de tu perfil.

¡Mucho éxito en tu semestre!
El equipo de CogniCore
""".strip()

    message.set_content(body)
    return message


def _write_to_outbox(message: EmailMessage) -> Path:
    """Guarda el correo generado en disco cuando no hay SMTP disponible."""
    outbox_dir = Path(os.getenv("COGNICORE_EMAIL_OUTBOX", DATA_DIR / "outbox"))
    outbox_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    recipient = message["To"].replace("@", "_at_").replace("/", "_")
    file_path = outbox_dir / f"welcome_{timestamp}_{recipient}.eml"
    file_path.write_text(message.as_string(), encoding="utf-8")
    return file_path


def send_registration_email(user: User) -> Path | None:
    """Envía el correo de bienvenida o lo escribe en el buzón local.

    Si no se configuró un servidor SMTP, el mensaje se almacena en la carpeta
    de outbox para poder revisar el contenido durante el desarrollo local.
    """

    message = _build_message(user)
    smtp_host = os.getenv("COGNICORE_SMTP_HOST")

    if not smtp_host:
        return _write_to_outbox(message)

    smtp_port = int(os.getenv("COGNICORE_SMTP_PORT", "587"))
    smtp_user = os.getenv("COGNICORE_SMTP_USER")
    smtp_password = os.getenv("COGNICORE_SMTP_PASSWORD", "")
    use_tls = os.getenv("COGNICORE_SMTP_USE_TLS", "true").lower() != "false"

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        if use_tls:
            server.starttls()
        if smtp_user:
            server.login(smtp_user, smtp_password)
        server.send_message(message)

    return None
