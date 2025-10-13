import React from 'react'

const HeaderGreeting = ({ stats, profile, onLogout }) => {
  const displayName = profile?.name || profile?.email || 'estudiante'
  const secondaryLabel = profile?.name ? profile.email : 'Cuenta conectada'

  return (
    <header className="overview" aria-labelledby="welcome-heading">
      <div className="overview__brand">
        <div className="brand-icon" aria-hidden="true">
          CC
        </div>
        <div className="overview__intro">
          <p className="overview__eyebrow">Tu agenda universitaria</p>
          <h1 id="welcome-heading" className="overview__title">
            CogniCore
          </h1>
          <p className="overview__description">
            Hola {displayName}, listo para conquistar tu semana con un calendario colorido y resúmenes que puedes escuchar cuando
            quieras.
          </p>
        </div>
      </div>
      <div className="overview__session" role="group" aria-label="Tu sesión de CogniCore">
        <div className="overview__user">
          <span className="overview__avatar" aria-hidden="true">
            {(profile?.name || profile?.email || 'C')[0].toUpperCase()}
          </span>
          <div>
            <p className="overview__user-name">{displayName}</p>
            <p className="overview__user-email">{secondaryLabel}</p>
          </div>
        </div>
        <button type="button" className="overview__logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
      <div className="overview__stickers" aria-hidden="true">
        <span className="sticker sticker--pulse">Pomodoro flexible</span>
        <span className="sticker sticker--accent">Recordatorios coloridos</span>
        <span className="sticker sticker--outline">Audio + resúmenes claros</span>
      </div>
      <div className="overview__metrics" role="list" aria-label="Indicadores de progreso">
        <article className="metric" role="listitem">
          <span className="metric__label">Tareas completadas</span>
          <strong className="metric__value">{stats.tasks_completed}</strong>
          <span className="metric__hint">{stats.focus_hours} h de enfoque</span>
        </article>
        <article className="metric" role="listitem">
          <span className="metric__label">Hábitos activos</span>
          <strong className="metric__value">{stats.milestones_completed}</strong>
          <span className="metric__hint">{stats.streak_days} días en racha</span>
        </article>
        <article className="metric" role="listitem">
          <span className="metric__label">Recordatorios próximos</span>
          <strong className="metric__value">{stats.upcoming_reminders}</strong>
          <span className="metric__hint">Notificaciones programadas</span>
        </article>
      </div>
    </header>
  )
}

export default HeaderGreeting
