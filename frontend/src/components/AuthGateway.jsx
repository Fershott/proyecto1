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

const AuthGateway = ({ session, onLogin, onLogout, isLoading }) => {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [submittingProvider, setSubmittingProvider] = useState('')

  const handleLogin = async (provider) => {
    if (!onLogin) return
    if (!email.trim()) {
      setFeedback('Escribe el correo asociado a tu cuenta educativa de Google u Outlook.')
      return
    }

    try {
      setSubmittingProvider(provider)
      setFeedback('')
      const result = await onLogin({ email: email.trim(), provider })
      if (!result?.success) {
        setFeedback(result?.error || 'No pudimos conectar tu cuenta. Inténtalo de nuevo.')
        return
      }
      setFeedback('¡Listo! Ya puedes organizar tu semana con CogniCore.')
      setEmail('')
    } finally {
      setSubmittingProvider('')
    }
  }

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
        <div>
          <h2 id="login-heading" className="panel__title">
            Ingresa a CogniCore
          </h2>
          <p className="panel__subtitle">
            Usa tu cuenta de Google o Microsoft para que los recordatorios funcionen como Teams y te lleguen por correo.
          </p>
        </div>
      </header>
      <div className="auth-card" role="form">
        <label className="auth-card__label" htmlFor="auth-email">
          <span>Correo educativo</span>
          <input
            id="auth-email"
            type="email"
            placeholder="tucuenta@university.edu"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading || Boolean(session)}
          />
        </label>
        <div className="auth-card__providers" role="group" aria-label="Proveedores de inicio de sesión">
          {(['google', 'microsoft']).map((provider) => (
            <button
              key={provider}
              type="button"
              className={`auth-card__provider auth-card__provider--${provider}`}
              onClick={() => handleLogin(provider)}
              disabled={isLoading || Boolean(session) || submittingProvider === provider}
            >
              {submittingProvider === provider ? 'Conectando...' : providerCopy[provider].label}
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
