/**
 * Entrada principal al ecosistema CogniCore con opciones limpias de Google y Microsoft.
 */
import React, { useState } from 'react'

const providerCopy = {
  google: {
    title: 'Google',
    description: 'Sincroniza tus recordatorios con Gmail y Google Calendar.',
    loginLabel: 'Iniciar sesión',
    registerLabel: 'Crear cuenta',
    fallbackEmail: 'estudiante.google@demo.cognicore',
    fallbackName: 'Estudiante Google'
  },
  microsoft: {
    title: 'Microsoft',
    description: 'Conecta tus avisos con Outlook y Microsoft 365.',
    loginLabel: 'Iniciar sesión',
    registerLabel: 'Crear cuenta',
    fallbackEmail: 'estudiante.microsoft@demo.cognicore',
    fallbackName: 'Estudiante Microsoft'
  }
}

// Interfaz del login basado en OAuth con soporte para modo offline sin campos extra.
const AuthGateway = ({
  isLoading,
  isBackendReachable,
  isDarkMode,
  onToggleDarkMode,
  apiBaseUrl,
  onOfflineAuth
}) => {
  const [feedback, setFeedback] = useState('')
  const [pendingKey, setPendingKey] = useState('')

  const buildRedirectTarget = (provider, mode) => {
    const params = new URLSearchParams({
      mode,
      next: window.location.origin + window.location.pathname
    })
    return `${apiBaseUrl}/auth/${provider}/start?${params.toString()}`
  }

  const handleOffline = (provider) => {
    const copy = providerCopy[provider]
    onOfflineAuth?.({
      provider,
      email: copy.fallbackEmail,
      displayName: copy.fallbackName
    })
    setFeedback(
      'Modo demostración activado. Puedes explorar CogniCore y sincronizaremos los datos cuando el backend vuelva a estar disponible.'
    )
  }

  const handleAction = (provider, mode) => {
    setFeedback('')
    const key = `${provider}-${mode}`

    if (!isBackendReachable) {
      handleOffline(provider)
      return
    }

    setPendingKey(key)
    window.location.href = buildRedirectTarget(provider, mode)
  }

  return (
    <section className="panel panel--auth" aria-labelledby="login-heading">
      <header className="panel__header">
        <div className="panel__header-main">
          <p className="overview__eyebrow">Acceso</p>
          <h2 id="login-heading" className="panel__title">
            Bienvenido a CogniCore
          </h2>
          <p className="panel__subtitle">
            Elige Google o Microsoft para recibir tus recordatorios en la bandeja de entrada que usas a diario.
          </p>
        </div>
        <button type="button" className="panel__mode-toggle" onClick={() => onToggleDarkMode?.()}>
          {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </header>
      <div className="auth-card" role="form" aria-describedby="auth-helper">
        {!isBackendReachable && (
          <p className="auth-card__demo-hint" role="status">
            El backend no está disponible. Puedes activar un modo demostración para seguir revisando el tablero.
          </p>
        )}
        <p id="auth-helper" className="auth-card__helper-block">
          Regístrate o inicia sesión con tu cuenta educativa y te enviaremos correos de bienvenida y recordatorios.
        </p>
        <div className="auth-card__grid">
          {(['google', 'microsoft']).map((provider) => {
            const copy = providerCopy[provider]
            return (
              <article key={provider} className={`auth-card__provider-card auth-card__provider-card--${provider}`}>
                <header className="auth-card__provider-header">
                  <span className="auth-card__provider-title">{copy.title}</span>
                  <p className="auth-card__provider-desc">{copy.description}</p>
                </header>
                <div className="auth-card__provider-actions">
                  <button
                    type="button"
                    className="auth-card__provider-button"
                    onClick={() => handleAction(provider, 'login')}
                    disabled={isLoading || pendingKey === `${provider}-login`}
                  >
                    {pendingKey === `${provider}-login` ? 'Redirigiendo…' : copy.loginLabel}
                  </button>
                  <button
                    type="button"
                    className="auth-card__provider-button auth-card__provider-button--secondary"
                    onClick={() => handleAction(provider, 'register')}
                    disabled={isLoading || pendingKey === `${provider}-register`}
                  >
                    {pendingKey === `${provider}-register` ? 'Redirigiendo…' : copy.registerLabel}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
        {!isBackendReachable && (
          <button type="button" className="auth-card__offline" onClick={() => handleOffline('google')}>
            Probar en modo demostración
          </button>
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
