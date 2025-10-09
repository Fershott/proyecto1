import React from 'react'

const ReminderList = ({ reminders = [] }) => {
  const formattedReminders = reminders
    .slice()
    .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())

  const nextReminder = formattedReminders[0]

  return (
    <section
      className="panel panel--with-sticker"
      aria-labelledby="reminders-heading"
      data-sticker="Alertas suaves"
      data-icon="🔔"
    >
      <header className="panel__header panel__header--split">
        <div>
          <h2 id="reminders-heading" className="panel__title">
            Recordatorios programados
          </h2>
          <p className="panel__subtitle">
            Visualiza tus notificaciones por orden cronológico y mantén claros los próximos hitos.
          </p>
        </div>
        {nextReminder && (
          <div className="panel__callout" aria-live="polite">
            <span className="panel__callout-label">Próximo aviso</span>
            <strong className="panel__callout-value">
              {new Date(nextReminder.remind_at).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </strong>
          </div>
        )}
      </header>
      <div className="reminder-grid">
        <div className="reminder-grid__list" role="list" aria-label="Lista de recordatorios programados">
          {formattedReminders.map((reminder) => (
            <article key={reminder.id} className="list-item" role="listitem">
              <div className="list-item__body">
                <span className="list-item__title">{reminder.title}</span>
                {reminder.description && <span className="list-item__meta">{reminder.description}</span>}
                <span className="list-item__meta">
                  {new Date(reminder.remind_at).toLocaleString('es-ES', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
              <div className="list-item__actions">
                <span className="pill pill--outline">Notificación</span>
              </div>
            </article>
          ))}
          {formattedReminders.length === 0 && (
            <p className="empty-state">No hay recordatorios pendientes. Programa el próximo para recibir la notificación.</p>
          )}
        </div>
        <aside className="reminder-grid__aside" aria-label="Sugerencias para tus recordatorios">
          <h3 className="reminder-aside__title">Agenda visual</h3>
          <p className="reminder-aside__text">
            Agrupa los recordatorios por materias y añade descripciones breves. El tablero organizará cada uno de forma
            automática para evitar saturación.
          </p>
          <ul className="reminder-aside__tips">
            <li>Usa horarios similares para crear rutinas reconocibles.</li>
            <li>Configura avisos dobles cuando la entrega sea crítica.</li>
            <li>Apóyate en la pestaña de resúmenes para preparar materiales.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}

export default ReminderList
