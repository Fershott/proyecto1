"""Clientes OAuth para Google y Microsoft con almacenamiento de estado temporal."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from urllib.parse import urlencode

try:  # pragma: no cover - permite ejecutar pruebas sin instalar la dependencia
    import httpx
except ModuleNotFoundError:  # pragma: no cover
    httpx = None  # type: ignore
from fastapi import HTTPException

from .models import AuthProvider
from .storage import load_oauth_states, save_oauth_states


@dataclass
class OAuthConfig:
    """Configuración básica necesaria para interactuar con un proveedor OAuth."""

    client_id: str
    client_secret: str
    redirect_uri: str
    scope: str


def _env(key: str) -> str:
    """Recupera una variable de entorno y lanza un error descriptivo si falta."""

    value = os.getenv(key)
    if not value:
        raise HTTPException(
            status_code=503,
            detail=(
                "Falta configurar la variable de entorno "
                f"`{key}` para habilitar el inicio de sesión con proveedores externos."
            ),
        )
    return value


def _build_config(prefix: str, default_scope: str) -> OAuthConfig:
    """Construye la configuración de OAuth a partir de variables de entorno."""

    return OAuthConfig(
        client_id=_env(f"COGNICORE_{prefix}_CLIENT_ID"),
        client_secret=_env(f"COGNICORE_{prefix}_CLIENT_SECRET"),
        redirect_uri=_env(f"COGNICORE_{prefix}_REDIRECT_URI"),
        scope=os.getenv(f"COGNICORE_{prefix}_SCOPE", default_scope),
    )


def is_stub_mode() -> bool:
    """Indica si las llamadas a los proveedores deben simularse (modo pruebas)."""

    return os.getenv("COGNICORE_OAUTH_MODE", "").lower() == "stub"


class OAuthStateStore:
    """Gestiona los estados emitidos para prevenir ataques CSRF en OAuth."""

    def __init__(self, ttl_seconds: int | None = None) -> None:
        self._ttl = ttl_seconds or int(os.getenv("COGNICORE_OAUTH_STATE_TTL", "900"))

    def issue(self, payload: Dict[str, Any]) -> str:
        """Genera un nuevo estado y lo guarda con una marca de tiempo."""

        state = secrets.token_urlsafe(32)
        states = load_oauth_states()
        states[state] = {
            **payload,
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }
        save_oauth_states(states)
        return state

    def consume(self, state: str) -> Dict[str, Any]:
        """Recupera y elimina el estado validando que no haya caducado."""

        states = load_oauth_states()
        payload = states.pop(state, None)
        save_oauth_states(states)
        if payload is None:
            raise HTTPException(status_code=400, detail="Estado de autenticación inválido o expirado.")

        issued_raw = payload.get("issued_at")
        if issued_raw:
            try:
                issued_at = datetime.fromisoformat(issued_raw)
            except ValueError:
                issued_at = datetime.now(timezone.utc)
        else:
            issued_at = datetime.now(timezone.utc)

        if issued_at.tzinfo is None:
            issued_at = issued_at.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) - issued_at > timedelta(seconds=self._ttl):
            raise HTTPException(status_code=400, detail="El estado de autenticación ha caducado. Intenta de nuevo.")

        return payload


class OAuthClient:
    """Cliente genérico para construir URLs y consultar tokens/perfiles."""

    authorize_url: str
    token_url: str
    userinfo_url: str

    def __init__(self, provider: AuthProvider, config: OAuthConfig) -> None:
        self.provider = provider
        self.config = config

    def authorize_params(self) -> Dict[str, Any]:
        """Parámetros por defecto para la URL de autorización."""

        return {
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "response_type": "code",
            "scope": self.config.scope,
        }

    def build_authorize_url(self, state: str, *, prompt: str | None = None) -> str:
        """Devuelve la URL de autorización lista para redirigir al proveedor."""

        params = self.authorize_params()
        params["state"] = state
        if prompt:
            params["prompt"] = prompt
        query = urlencode(params, doseq=True)
        return f"{self.authorize_url}?{query}"

    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """Intercambia el código de autorización por tokens de acceso/refresco."""

        if is_stub_mode():
            return {"access_token": "stub", "token_type": "Bearer"}

        data = {
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
            "code": code,
            "redirect_uri": self.config.redirect_uri,
            "grant_type": "authorization_code",
        }

        if httpx is None:
            raise HTTPException(
                status_code=503,
                detail="Instala la dependencia `httpx` para completar la autenticación con proveedores externos.",
            )

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(self.token_url, data=data, headers={"Accept": "application/json"})

        if response.status_code >= 400:
            raise HTTPException(status_code=400, detail="No se pudo intercambiar el código de autorización.")

        return response.json()

    async def fetch_profile(self, tokens: Dict[str, Any], state_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Recupera la información básica del usuario autenticado."""

        if is_stub_mode():
            email = state_payload.get("stub_email") or state_payload.get("email")
            if not email:
                raise HTTPException(
                    status_code=400,
                    detail="Falta proporcionar `stub_email` para la autenticación simulada.",
                )
            name = state_payload.get("display_name") or state_payload.get("stub_name") or email.split("@", 1)[0]
            return {"email": email, "name": name}

        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="El proveedor no devolvió un token de acceso válido.")

        if httpx is None:
            raise HTTPException(
                status_code=503,
                detail="Instala la dependencia `httpx` para completar la autenticación con proveedores externos.",
            )

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                self.userinfo_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )

        if response.status_code >= 400:
            raise HTTPException(status_code=400, detail="No se pudo obtener el perfil del proveedor externo.")

        return response.json()


class GoogleOAuthClient(OAuthClient):
    """Cliente específico para Google OAuth 2.0."""

    authorize_url = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url = "https://oauth2.googleapis.com/token"
    userinfo_url = "https://openidconnect.googleapis.com/v1/userinfo"

    def __init__(self) -> None:
        super().__init__(AuthProvider.GOOGLE, _build_config("GOOGLE", "openid email profile"))

    def authorize_params(self) -> Dict[str, Any]:  # noqa: D401 - explicación en docstring base
        params = super().authorize_params()
        params.update({"access_type": "offline", "include_granted_scopes": "true"})
        return params


class MicrosoftOAuthClient(OAuthClient):
    """Cliente específico para Microsoft Azure (cuentas Outlook)."""

    authorize_url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    userinfo_url = "https://graph.microsoft.com/v1.0/me"

    def __init__(self) -> None:
        super().__init__(
            AuthProvider.MICROSOFT,
            _build_config("MICROSOFT", "offline_access openid email profile User.Read"),
        )

    def authorize_params(self) -> Dict[str, Any]:  # noqa: D401 - explicación en docstring base
        params = super().authorize_params()
        params.update({"response_mode": "query"})
        return params


def get_oauth_client(provider: AuthProvider) -> OAuthClient:
    """Devuelve el cliente correspondiente al proveedor solicitado."""

    if provider is AuthProvider.GOOGLE:
        return GoogleOAuthClient()
    if provider is AuthProvider.MICROSOFT:
        return MicrosoftOAuthClient()
    raise HTTPException(status_code=400, detail="Proveedor de autenticación no soportado.")


def resolve_frontend_base_url() -> str:
    """Obtiene la URL base del frontend para redirigir tras iniciar sesión."""

    value = os.getenv("COGNICORE_FRONTEND_URL")
    if not value:
        raise HTTPException(
            status_code=503,
            detail="Configura `COGNICORE_FRONTEND_URL` para completar el flujo de autenticación.",
        )
    return value.rstrip("/")

