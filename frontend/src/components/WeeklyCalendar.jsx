/**
 * Calendario semanal que mezcla clases y tareas al estilo Outlook.
 */
import React, { useMemo } from 'react'

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const readableStatus = {
  completed: 'Completada',
  pending: 'Pendiente',
  in_progress: 'En progreso'
}

// Normaliza una fecha eliminando la parte de tiempo.
const normalizeDate = (date) => {
  const cloned = new Date(date)
  cloned.setHours(0, 0, 0, 0)
  return cloned
}

// Calcula el lunes correspondiente para construir la semana.
const getStartOfWeek = (date) => {
  const target = normalizeDate(date)
  const day = target.getDay()
  // Convert Sunday (0) to 6 so Monday becomes index 0
  const distanceToMonday = (day + 6) % 7
  target.setDate(target.getDate() - distanceToMonday)
  return target
}

// Convierte una hora HH:MM a minutos para ordenar eventos.
const toMinutes = (timeValue) => {
  if (!timeValue && timeValue !== 0) return null
  const parts = String(timeValue).split(':')
  const [hours, minutes] = [Number(parts[0] || 0), Number(parts[1] || 0)]
  return hours * 60 + minutes
}

// Genera la cadena amigable con el rango horario de un evento.
const formatRange = (start, end) => {
  if (!start) return 'Sin hora'
  const startLabel = String(start).slice(0, 5)
  if (!end) return startLabel
  return `${startLabel} – ${String(end).slice(0, 5)}`
}

// Componente que organiza los bloques semanales y tareas por día.
const WeeklyCalendar = ({ scheduleEntries = [], tasks = [] }) => {
  const { weekDays, eventsByDay } = useMemo(() => {
    const today = new Date()
    const startOfWeek = getStartOfWeek(today)
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + index)
      return date
    })

    const grouped = days.map((_, index) => {
      const scheduleForDay = scheduleEntries
        .filter((entry) => entry.day_of_week === index)
        .map((entry) => ({
          id: `schedule-${entry.id}`,
          title: entry.title,
          meta: entry.location,
          notes: entry.description,
          range: formatRange(entry.start_time, entry.end_time),
          sortOrder: toMinutes(entry.start_time),
          variant: 'schedule'
        }))

      const taskEvents = tasks
        .filter((task) => {
          if (!task.due_date) return false
          const dueDate = new Date(task.due_date)
          if (Number.isNaN(dueDate.getTime())) return false
          const taskIndex = (dueDate.getDay() + 6) % 7
          return taskIndex === index
        })
        .map((task) => {
          const dueDate = new Date(task.due_date)
          const timeLabel = Number.isNaN(dueDate.getTime())
            ? 'Sin hora'
            : dueDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })
          return {
            id: `task-${task.id}`,
            title: task.title,
            meta: task.course,
            notes: task.notes,
            range: timeLabel,
            sortOrder: toMinutes(`${dueDate.getHours()}:${dueDate.getMinutes()}`),
            variant: 'task',
            status: task.status
          }
        })

      return [...scheduleForDay, ...taskEvents].sort((a, b) => {
        const aOrder = a.sortOrder ?? Number.POSITIVE_INFINITY
        const bOrder = b.sortOrder ?? Number.POSITIVE_INFINITY
        return aOrder - bOrder
      })
    })

    return { weekDays: days, eventsByDay: grouped }
  }, [scheduleEntries, tasks])

  return (
    <section
      className="panel panel--calendar"
      aria-labelledby="calendar-heading"
      data-sticker="Agenda semanal"
      data-icon="📅"
    >
      <header className="panel__header">
        <div>
          <h2 id="calendar-heading" className="panel__title">
            Calendario semanal
          </h2>
          <p className="panel__subtitle">
            Visualiza tu semana como en Outlook: distribuye tareas por día y detecta espacios libres.
          </p>
        </div>
      </header>
      <div className="calendar" role="grid" aria-label="Calendario semanal tipo Outlook">
        <div className="calendar__head" role="row">
          {weekDays.map((day, index) => (
            <div key={WEEKDAY_LABELS[index]} className="calendar__head-cell" role="columnheader">
              <span className="calendar__head-day">{WEEKDAY_LABELS[index]}</span>
              <span className="calendar__head-date">
                {day.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short'
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="calendar__body" role="rowgroup">
          {eventsByDay.map((events, dayIndex) => (
            <div key={WEEKDAY_LABELS[dayIndex]} className="calendar__column" role="gridcell">
              {events.length === 0 ? (
                <p className="calendar__empty">Sin actividades planificadas</p>
              ) : (
                events.map((event) => (
                  <article
                    key={event.id}
                    className={`calendar-event calendar-event--${event.variant}${
                      event.variant === 'task' && event.status ? ` calendar-event--task-${event.status}` : ''
                    }`}
                    aria-label={`${event.title} ${event.range}`}
                  >
                    <span className="calendar-event__time">{event.range}</span>
                    <span className="calendar-event__title">{event.title}</span>
                    {event.meta && <span className="calendar-event__meta">{event.meta}</span>}
                    {event.variant === 'task' && event.status && (
                      <span className="calendar-event__pill">{readableStatus[event.status] || 'Pendiente'}</span>
                    )}
                    {event.notes && <span className="calendar-event__notes">{event.notes}</span>}
                  </article>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WeeklyCalendar
