/**
 * Módulo de autenticación que guía el inicio de sesión y registro.
 * Permite conectarse con Google o Microsoft para habilitar notificaciones.
 */
import React, { useState } from 'react'

const providerCopy = {
  google: {
    label: 'Continuar con Google',
    helper: 'Recibirás avisos en Gmail como si fueran recordatorios de Teams.'
  },
  microsoft: {
    label: 'Continuar con Microsoft',
    helper: 'Sincroniza tus avisos con Outlook y Teams.'
  }
}

// Componente que muestra el formulario de acceso a CogniCore.
const AuthGateway = ({
  session,
  onLogin,
  onRegister,
  onLogout,
  isLoading,
  isOfflineMode,
  isBackendReachable,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [feedback, setFeedback] = useState('')
  const [submittingProvider, setSubmittingProvider] = useState('')
  const [mode, setMode] = useState('login')

  // Gestiona tanto el inicio de sesión como el registro según el modo seleccionado.
  const handleAction = async (provider) => {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setFeedback('Escribe el correo asociado a tu cuenta educativa de Google u Outlook.')
      return
    }

    const handler = mode === 'register' ? onRegister : onLogin
    if (!handler) return

    if (mode === 'register' && !displayName.trim()) {
      setFeedback('Indica cómo quieres que te saludemos en el tablero estudiantil.')
      return
    }

    const payload =
      mode === 'register'
        ? { email: normalizedEmail, provider, displayName }
        : { email: normalizedEmail, provider }

    try {
      setSubmittingProvider(provider)
      setFeedback('')
      const result = await handler(payload)
      if (!result?.success) {
        setFeedback(result?.error || 'No pudimos conectar tu cuenta. Inténtalo de nuevo.')
        return
      }
      setFeedback(
        mode === 'register'
          ? '¡Registro completado! Revisa tu correo para la confirmación y organiza tu semana con CogniCore.'
          : '¡Listo! Ya puedes organizar tu semana con CogniCore.'
      )
      setEmail('')
      setDisplayName('')
      setMode('login')
    } finally {
      setSubmittingProvider('')
    }
  }

  // Permite cerrar la sesión desde la pestaña principal.
  const handleLogout = async () => {
    if (!onLogout) return
    await onLogout()
    setFeedback('Sesión cerrada. Vuelve a iniciar cuando quieras continuar organizando tu agenda.')
  }

  return (
    <section
      className="panel panel--auth"
      aria-labelledby="login-heading"
      data-sticker="Acceso"
      data-icon="🔐"
    >
      <header className="panel__header">
        <div className="panel__header-main">
          <h2 id="login-heading" className="panel__title">
            Ingresa a CogniCore
          </h2>
          <p className="panel__subtitle">
            Usa tu cuenta de Google o Microsoft para que los recordatorios funcionen como Teams y te lleguen por correo.
          </p>
        </div>
        <button type="button" className="panel__mode-toggle" onClick={() => onToggleDarkMode?.()}>
          {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </header>
      <div className="auth-card" role="form">
        {!isBackendReachable && (
          <p className="auth-card__demo-hint" role="status">
            Modo demostración sin conexión: tus cambios se guardarán localmente hasta que el backend vuelva a conectarse.
          </p>
        )}
        <div className="auth-card__mode" role="radiogroup" aria-label="Elige cómo continuar">
          {[
            { id: 'login', label: 'Ya tengo cuenta' },
            { id: 'register', label: 'Soy nuevo/a' }
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={mode === option.id}
              className={`auth-card__mode-button ${mode === option.id ? 'is-active' : ''}`}
              onClick={() => setMode(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="auth-card__label" htmlFor="auth-email">
          <span>Correo educativo</span>
          <input
            id="auth-email"
            type="email"
            placeholder="tucuenta@university.edu"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading || (Boolean(session) && !isOfflineMode)}
          />
        </label>
        {mode === 'register' && (
          <label className="auth-card__label" htmlFor="auth-display-name">
            <span>Nombre para mostrar</span>
            <input
              id="auth-display-name"
              type="text"
              placeholder="Ej. Sofía Estudiante"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={isLoading || (Boolean(session) && !isOfflineMode)}
            />
          </label>
        )}
        <div className="auth-card__providers" role="group" aria-label="Proveedores de inicio de sesión">
          {(['google', 'microsoft']).map((provider) => (
            <button
              key={provider}
              type="button"
              className={`auth-card__provider auth-card__provider--${provider}`}
              onClick={() => handleAction(provider)}
              disabled={
                isLoading ||
                Boolean(session && !isOfflineMode && isBackendReachable) ||
                submittingProvider === provider
              }
            >
              {submittingProvider === provider
                ? mode === 'register'
                  ? 'Registrando...'
                  : 'Conectando...'
                : providerCopy[provider].label}
              <span className="auth-card__helper">{providerCopy[provider].helper}</span>
            </button>
          ))}
        </div>
        {session && (
          <div className="auth-card__session" aria-live="polite">
            <p className="auth-card__session-title">Sesión activa</p>
            <p className="auth-card__session-text">
              {session.display_name} · {session.email}
            </p>
            <span className="auth-card__session-pill">
              Notificaciones vía {session.provider === 'google' ? 'Gmail (estilo Teams)' : 'Outlook / Teams'}
            </span>
            <button type="button" className="auth-card__logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
        {feedback && (
          <p className="auth-card__feedback" role="status">
            {feedback}
          </p>
        )}
      </div>
    </section>
  )
}

export default AuthGateway
