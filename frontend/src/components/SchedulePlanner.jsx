/**
 * Planificador semanal que combina formulario y calendario académico.
 */
import React, { useMemo, useState } from 'react'
import WeeklyCalendar from './WeeklyCalendar'

const DAYS = [
  { value: 0, label: 'Lunes' },
  { value: 1, label: 'Martes' },
  { value: 2, label: 'Miércoles' },
  { value: 3, label: 'Jueves' },
  { value: 4, label: 'Viernes' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' }
]

// Formatea una cadena de tiempo HH:MM asegurando dos dígitos.
const formatTime = (value) => {
  if (!value) return ''
  const [hours, minutes] = String(value).split(':')
  return `${hours.padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`
}

// Devuelve la etiqueta amigable para el día de la semana.
const formatDay = (day) => {
  const option = DAYS.find((item) => item.value === day)
  return option ? option.label : 'Día'
}

// Componente que permite crear bloques y visualizarlos en el calendario.
const SchedulePlanner = ({ schedule = [], tasks = [], onAdd, onDelete }) => {
  const [title, setTitle] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const orderedEntries = useMemo(() => {
    return schedule
      .slice()
      .sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) {
          return a.day_of_week - b.day_of_week
        }
        return String(a.start_time).localeCompare(String(b.start_time))
      })
  }, [schedule])

  // Limpia los campos del formulario después de guardar un bloque.
  const resetForm = () => {
    setTitle('')
    setDayOfWeek(0)
    setStartTime('08:00')
    setEndTime('09:00')
    setLocation('')
    setDescription('')
  }

  // Valida y envía un bloque nuevo al componente padre.
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!onAdd || isSubmitting) return

    if (!title.trim()) {
      setError('Añade el nombre de la clase o actividad para agendarla.')
      return
    }

    if (!startTime || !endTime) {
      setError('Define una hora de inicio y de fin para ubicarla en el calendario.')
      return
    }

    if (startTime >= endTime) {
      setError('La hora de fin debe ser posterior al inicio.')
      return
    }

    setError('')
    setIsSubmitting(true)

    const created = await onAdd({
      title: title.trim(),
      day_of_week: Number(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
      location: location.trim() ? location.trim() : null,
      description: description.trim() ? description.trim() : null
    })

    setIsSubmitting(false)

    if (created) {
      resetForm()
    }
  }

  return (
    <section
      className="panel panel--with-sticker"
      aria-labelledby="schedule-heading"
      data-sticker="Tu horario colorido"
      data-icon="🗓️"
    >
      <header className="panel__header">
        <div>
          <h2 id="schedule-heading" className="panel__title">
            Organizador semanal
          </h2>
          <p className="panel__subtitle">
            Crea tu horario clase por clase y visualízalo en un calendario semanal junto a tus tareas.
          </p>
        </div>
      </header>
      <div className="schedule-grid">
        <form className="schedule-form" onSubmit={handleSubmit}>
          <div className="schedule-form__grid">
            <label className="schedule-form__label schedule-form__label--wide" htmlFor="schedule-title">
              <span>Actividad</span>
              <input
                id="schedule-title"
                type="text"
                placeholder="Seminario de investigación"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="schedule-form__label" htmlFor="schedule-day">
              <span>Día</span>
              <select
                id="schedule-day"
                value={dayOfWeek}
                onChange={(event) => setDayOfWeek(Number(event.target.value))}
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="schedule-form__label" htmlFor="schedule-start">
              <span>Inicio</span>
              <input
                id="schedule-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </label>
            <label className="schedule-form__label" htmlFor="schedule-end">
              <span>Fin</span>
              <input
                id="schedule-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
            <label className="schedule-form__label" htmlFor="schedule-location">
              <span>Ubicación (opcional)</span>
              <input
                id="schedule-location"
                type="text"
                placeholder="Aula 204 o virtual"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <label className="schedule-form__label schedule-form__label--wide" htmlFor="schedule-description">
              <span>Notas (opcional)</span>
              <textarea
                id="schedule-description"
                rows={3}
                placeholder="Material, preparación o apoyos que necesitas"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>
          <div className="schedule-form__footer">
            {error && (
              <span className="schedule-form__error" role="alert">
                {error}
              </span>
            )}
            <button type="submit" className="schedule-form__submit" disabled={isSubmitting}>
              {isSubmitting ? 'Añadiendo…' : 'Guardar en el calendario'}
            </button>
          </div>
        </form>
        <aside className="schedule-sidebar" aria-label="Horario registrado">
          <h3 className="schedule-sidebar__title">Bloques agendados</h3>
          <ul className="schedule-sidebar__list">
            {orderedEntries.map((entry) => (
              <li key={entry.id} className="schedule-sidebar__item">
                <div>
                  <p className="schedule-sidebar__headline">{entry.title}</p>
                  <p className="schedule-sidebar__meta">
                    {formatDay(entry.day_of_week)} · {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                  </p>
                  {entry.location && <p className="schedule-sidebar__meta">{entry.location}</p>}
                  {entry.description && <p className="schedule-sidebar__notes">{entry.description}</p>}
                </div>
                {onDelete && (
                  <button
                    type="button"
                    className="ghost-button schedule-sidebar__delete"
                    onClick={() => onDelete(entry.id)}
                    aria-label={`Eliminar ${entry.title} del horario`}
                  >
                    Quitar
                  </button>
                )}
              </li>
            ))}
            {orderedEntries.length === 0 && (
              <li className="schedule-sidebar__empty">Aún no registras clases. Completa el formulario y verás tu horario aquí.</li>
            )}
          </ul>
        </aside>
      </div>
      <WeeklyCalendar scheduleEntries={schedule} tasks={tasks} />
    </section>
  )
}

export default SchedulePlanner
