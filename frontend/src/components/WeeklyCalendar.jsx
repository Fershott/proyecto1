import React, { useMemo } from 'react'

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const normalizeDate = (date) => {
  const cloned = new Date(date)
  cloned.setHours(0, 0, 0, 0)
  return cloned
}

const getStartOfWeek = (date) => {
  const target = normalizeDate(date)
  const day = target.getDay()
  // Convert Sunday (0) to 6 so Monday becomes index 0
  const distanceToMonday = (day + 6) % 7
  target.setDate(target.getDate() - distanceToMonday)
  return target
}

const WeeklyCalendar = ({ tasks = [] }) => {
  const { weekDays, eventsByDay } = useMemo(() => {
    const today = new Date()
    const startOfWeek = getStartOfWeek(today)
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + index)
      return date
    })

    const grouped = days.map((day) => {
      const sameDayTasks = tasks.filter((task) => {
        if (!task.due_date) return false
        const dueDate = new Date(task.due_date)
        if (Number.isNaN(dueDate.getTime())) return false
        return normalizeDate(dueDate).getTime() === day.getTime()
      })

      return sameDayTasks
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .map((task) => {
          const dueDate = new Date(task.due_date)
          const time = Number.isNaN(dueDate.getTime())
            ? 'Sin hora'
            : dueDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })
          return {
            id: task.id,
            title: task.title,
            course: task.course,
            time,
            status: task.status
          }
        })
    })

    return { weekDays: days, eventsByDay: grouped }
  }, [tasks])

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
                <p className="calendar__empty">Sin tareas programadas</p>
              ) : (
                events.map((event) => (
                  <article
                    key={event.id}
                    className={`calendar-event calendar-event--${event.status || 'pending'}`}
                    aria-label={`${event.title} a las ${event.time}`}
                  >
                    <span className="calendar-event__time">{event.time}</span>
                    <span className="calendar-event__title">{event.title}</span>
                    {event.course && <span className="calendar-event__meta">{event.course}</span>}
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
