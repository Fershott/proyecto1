import React, { useEffect, useMemo, useState } from 'react'

const PROVIDER_DETAILS = {
  google: {
    id: 'google',
    label: 'Continuar con Google',
    description: 'Conecta tu cuenta de Gmail para recibir recordatorios al instante.',
    accent: 'provider--google'
  },
  microsoft: {
    id: 'microsoft',
    label: 'Continuar con Microsoft',
    description: 'Usa Outlook para sincronizar tus notificaciones académicas.',
    accent: 'provider--microsoft'
  }
}

const AuthLogin = ({ apiUrl, onLogin, onContinue, onLogout, profile }) => {
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!profile) {
      setSelectedProvider(null)
      setEmail('')
      setName('')
      setError('')
    }
  }, [profile])

  const provider = useMemo(() => {
    if (!selectedProvider) {
      return null
    }
    return PROVIDER_DETAILS[selectedProvider]
  }, [selectedProvider])

  const handleSelect = (providerId) => {
    setSelectedProvider(providerId)
    setEmail('')
    setName('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!provider) {
      return
    }
    if (!email.trim()) {
      setError('Ingresa tu correo para continuar.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: provider.id,
          email: email.trim(),
          name: name.trim()
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.detail || 'No se pudo iniciar sesión. Inténtalo nuevamente.')
      }

      onLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (profile) {
    return (
      <div className="auth-shell">
        <div className="auth-card auth-card--signed-in" role="region" aria-labelledby="auth-title">
          <div className="auth-card__header">
            <div className="auth-logo" aria-hidden="true">
              CC
            </div>
            <div>
              <p className="auth-eyebrow">Sesión activa</p>
              <h1 id="auth-title" className="auth-title">
                ¡Hola, {profile.name || profile.email}!
              </h1>
              <p className="auth-subtitle">
                Ya tienes acceso a tu tablero organizado. Puedes seguir navegando por las pestañas o cambiar de cuenta
                cuando lo necesites.
              </p>
            </div>
          </div>
          <div className="auth-session-actions" role="group" aria-label="Acciones rápidas de sesión">
            <button type="button" className="auth-submit" onClick={onContinue}>
              Ir al dashboard
            </button>
            <button type="button" className="auth-change auth-change--logout" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
          <dl className="auth-session-meta">
            <div>
              <dt>Proveedor conectado</dt>
              <dd>{profile.provider === 'google' ? 'Google (Gmail)' : 'Microsoft (Outlook)'}</dd>
            </div>
            <div>
              <dt>Correo utilizado</dt>
              <dd>{profile.email}</dd>
            </div>
          </dl>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" role="dialog" aria-labelledby="auth-title">
        <div className="auth-card__header">
          <div className="auth-logo" aria-hidden="true">
            CC
          </div>
          <div>
            <p className="auth-eyebrow">Bienvenido a CogniCore</p>
            <h1 id="auth-title" className="auth-title">
              Tu espacio organizado empieza aquí
            </h1>
            <p className="auth-subtitle">
              Ingresa con tu correo institucional de Google o Microsoft para sincronizar tus recordatorios y resúmenes.
            </p>
          </div>
        </div>

        {!provider && (
          <div className="auth-providers" role="list">
            {Object.values(PROVIDER_DETAILS).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`auth-provider ${item.accent}`}
                onClick={() => handleSelect(item.id)}
                role="listitem"
              >
                <span className="auth-provider__icon" aria-hidden="true">
                  {item.id === 'google' ? 'G' : 'M'}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        {provider && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form__provider">
              <button type="button" className={`auth-provider ${provider.accent} is-active`}>
                <span className="auth-provider__icon" aria-hidden="true">
                  {provider.id === 'google' ? 'G' : 'M'}
                </span>
                <span>
                  <strong>{provider.label}</strong>
                  <small>{provider.description}</small>
                </span>
              </button>
              <button type="button" className="auth-change" onClick={() => handleSelect(null)}>
                Elegir otro proveedor
              </button>
            </div>

            <label className="auth-field">
              <span>Nombre preferido</span>
              <input
                type="text"
                name="name"
                placeholder="Como quieres que CogniCore te salude"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder={provider.id === 'google' ? 'tu.nombre@gmail.com' : 'tu.nombre@outlook.com'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Conectando...' : 'Entrar a CogniCore'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default AuthLogin
