import React, { useState } from 'react'

const ReminderList = ({ reminders = [], onAdd }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [type, setType] = useState('task')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setScheduledAt('')
    setType('task')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!onAdd || isSubmitting) return

    if (!title.trim() || !scheduledAt) {
      setError('Indica un título y una fecha para poder agendar el recordatorio.')
      return
    }

    setError('')
    setIsSubmitting(true)

    const created = await onAdd({
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      remindAt: new Date(scheduledAt).toISOString(),
      type
    })

    setIsSubmitting(false)

    if (created) {
      resetForm()
    }
  }

  const formattedReminders = reminders
    .slice()
    .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())

  const nextReminder = formattedReminders[0]

  return (
    <section
      className="panel panel--with-sticker"
      aria-labelledby="reminders-heading"
      data-sticker="Agenda de avisos"
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
      <form className="reminder-composer" onSubmit={handleSubmit}>
        <div className="reminder-composer__grid">
          <label className="reminder-composer__label reminder-composer__label--wide" htmlFor="reminder-title">
            <span>Título</span>
            <input
              id="reminder-title"
              type="text"
              value={title}
              placeholder="Entrega de proyecto integrador"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="reminder-composer__label" htmlFor="reminder-type">
            <span>Tipo</span>
            <select
              id="reminder-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="task">Tarea</option>
              <option value="focus">Enfoque</option>
              <option value="personal">Personal</option>
            </select>
          </label>
          <label className="reminder-composer__label" htmlFor="reminder-datetime">
            <span>Fecha y hora</span>
            <input
              id="reminder-datetime"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
          <label className="reminder-composer__label reminder-composer__label--wide" htmlFor="reminder-description">
            <span>Notas (opcional)</span>
            <textarea
              id="reminder-description"
              value={description}
              placeholder="Añade instrucciones para recordar el contexto."
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>
        <div className="reminder-composer__footer">
          <p className="reminder-composer__hint">La plataforma te avisará con tiempo para que llegues a cada entrega con calma.</p>
          <div className="reminder-composer__actions">
            {error && (
              <span className="reminder-composer__error" role="alert">
                {error}
              </span>
            )}
            <button type="submit" className="reminder-composer__submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Agendar recordatorio'}
            </button>
          </div>
        </div>
      </form>
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
          <h3 className="reminder-aside__title">Tips de organización</h3>
          <p className="reminder-aside__text">
            Agrupa los recordatorios por materias y añade descripciones breves. Así reconocerás cada pendiente de un
            vistazo.
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
