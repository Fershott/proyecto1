/**
 * Entrada principal al ecosistema CogniCore.
 * Presenta un login minimalista con opciones para Google y Microsoft.
 */
import React, { useMemo, useState } from 'react'

const providerCopy = {
  google: {
    loginLabel: 'Iniciar con Google',
    registerLabel: 'Crear cuenta con Google',
    helper: 'Recibirás recordatorios académicos en tu bandeja de Gmail.',
    fallbackName: 'Estudiante Google'
  },
  microsoft: {
    loginLabel: 'Iniciar con Microsoft',
    registerLabel: 'Crear cuenta con Microsoft',
    helper: 'Sincronizaremos avisos con Outlook y Microsoft 365.',
    fallbackName: 'Estudiante Microsoft'
  }
}

// Interfaz del login basado en OAuth con soporte para modo offline.
const AuthGateway = ({
  isLoading,
  isBackendReachable,
  isDarkMode,
  onToggleDarkMode,
  apiBaseUrl,
  onOfflineAuth
}) => {
  const [mode, setMode] = useState('login')
  const [displayName, setDisplayName] = useState('')
  const [offlineEmail, setOfflineEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [pendingProvider, setPendingProvider] = useState('')

  const helperMessage = useMemo(() => {
    if (mode === 'register') {
      return 'Te enviaremos un correo de bienvenida para confirmar la cuenta educativa que utilizarás con CogniCore.'
    }
    return 'Inicia sesión con tu cuenta institucional para recibir notificaciones de recordatorios por correo.'
  }, [mode])

  const buildRedirectTarget = (provider) => {
    const params = new URLSearchParams({
      mode,
      next: window.location.origin + window.location.pathname
    })
    if (mode === 'register') {
      params.set('display_name', displayName.trim())
    }
    return `${apiBaseUrl}/auth/${provider}/start?${params.toString()}`
  }

  const handleOfflineAuth = (provider) => {
    const normalizedEmail = offlineEmail.trim() || `${provider}@cognicore.demo`
    const normalizedDisplay = displayName.trim() || providerCopy[provider].fallbackName
    onOfflineAuth?.({
      email: normalizedEmail,
      provider,
      displayName: normalizedDisplay
    })
    setFeedback(
      'Modo sin conexión activado. Tus recordatorios y resúmenes se guardarán localmente hasta reconectar el backend.'
    )
  }

  const handleProviderClick = (provider) => {
    setFeedback('')

    if (!isBackendReachable) {
      handleOfflineAuth(provider)
      return
    }

    if (mode === 'register' && !displayName.trim()) {
      setFeedback('Indica el nombre con el que quieres ser recibido en el tablero de CogniCore.')
      return
    }

    setPendingProvider(provider)
    const target = buildRedirectTarget(provider)
    window.location.href = target
  }

  return (
    <section className="panel panel--auth" aria-labelledby="login-heading">
      <header className="panel__header">
        <div className="panel__header-main">
          <p className="overview__eyebrow">Acceso</p>
          <h2 id="login-heading" className="panel__title">
            Bienvenido a CogniCore
          </h2>
          <p className="panel__subtitle">Organiza tus tareas, recordatorios y resúmenes apoyándote en Google o Microsoft.</p>
        </div>
        <button type="button" className="panel__mode-toggle" onClick={() => onToggleDarkMode?.()}>
          {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </header>
      <div className="auth-card" role="form" aria-describedby="auth-helper">
        {!isBackendReachable && (
          <p className="auth-card__demo-hint" role="status">
            El backend no está disponible. Puedes activar el modo demostración iniciando sesión con un correo de prueba.
          </p>
        )}
        <p id="auth-helper" className="auth-card__helper-block">
          {helperMessage}
        </p>
        <div className="auth-card__mode" role="radiogroup" aria-label="Selecciona entre registro o inicio de sesión">
          {[{ id: 'login', label: 'Ya tengo cuenta' }, { id: 'register', label: 'Quiero registrarme' }].map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={mode === option.id}
              className={`auth-card__mode-button ${mode === option.id ? 'is-active' : ''}`}
              onClick={() => setMode(option.id)}
              disabled={isLoading}
            >
              {option.label}
            </button>
          ))}
        </div>
        {mode === 'register' && (
          <label className="auth-card__label" htmlFor="display-name">
            <span>Nombre para mostrar</span>
            <input
              id="display-name"
              type="text"
              placeholder="Cómo quieres que te salude CogniCore"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={isLoading}
            />
          </label>
        )}
        {!isBackendReachable && (
          <label className="auth-card__label" htmlFor="offline-email">
            <span>Correo para modo demostración</span>
            <input
              id="offline-email"
              type="email"
              placeholder="tucuenta@universidad.edu"
              value={offlineEmail}
              onChange={(event) => setOfflineEmail(event.target.value)}
              disabled={isLoading}
            />
          </label>
        )}
        <div className="auth-card__providers" role="group" aria-label="Proveedores disponibles">
          {(['google', 'microsoft']).map((provider) => {
            const copy = providerCopy[provider]
            const label = mode === 'register' ? copy.registerLabel : copy.loginLabel
            const isPending = pendingProvider === provider

            return (
              <button
                key={provider}
                type="button"
                className={`auth-card__provider auth-card__provider--${provider}`}
                onClick={() => handleProviderClick(provider)}
                disabled={isLoading || isPending}
              >
                {isPending ? 'Redirigiendo…' : label}
                <span className="auth-card__helper">{copy.helper}</span>
              </button>
            )
          })}
        </div>
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
