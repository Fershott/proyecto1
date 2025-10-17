/**
 * Lista de tareas académicas con formulario de alta y acciones rápidas.
 */
import React, { useState } from 'react'

const statusClass = {
  completed: 'status-pill status-pill--completed',
  pending: 'status-pill status-pill--pending',
  in_progress: 'status-pill status-pill--in_progress'
}

const readableStatus = {
  completed: 'completada',
  pending: 'pendiente',
  in_progress: 'en progreso'
}

// Componente que presenta las tareas y permite marcarlas como finalizadas.
const TaskList = ({ tasks = [], onMarkComplete, onAdd, isSessionActive = true }) => {
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!onAdd || isSubmitting) return

    if (!title.trim()) {
      setError('Añade el título de la tarea para poder registrarla.')
      return
    }

    setError('')
    setIsSubmitting(true)

    const created = await onAdd({
      title: title.trim(),
      course,
      dueDate,
      notes
    })

    setIsSubmitting(false)

    if (created) {
      setTitle('')
      setCourse('')
      setDueDate('')
      setNotes('')
    }
  }

  return (
    <section
      className="panel panel--with-sticker"
      aria-labelledby="tasks-heading"
      data-sticker="Plan de estudio"
      data-icon="📚"
    >
      <header className="panel__header">
        <div>
          <h2 id="tasks-heading" className="panel__title">
            Plan diario
          </h2>
          <p className="panel__subtitle">Organiza tus materias y marca lo que avances para mantener la semana bajo control.</p>
        </div>
      </header>
      <form className="task-form" onSubmit={handleSubmit}>
        <div className="task-form__grid">
          <label className="task-form__label task-form__label--wide" htmlFor="task-title">
            <span>Título de la tarea</span>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Ensayo de literatura"
              disabled={!isSessionActive || !onAdd}
            />
          </label>
          <label className="task-form__label" htmlFor="task-course">
            <span>Materia</span>
            <input
              id="task-course"
              type="text"
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              placeholder="Curso o proyecto"
              disabled={!isSessionActive || !onAdd}
            />
          </label>
          <label className="task-form__label" htmlFor="task-due">
            <span>Fecha y hora</span>
            <input
              id="task-due"
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={!isSessionActive || !onAdd}
            />
          </label>
          <label className="task-form__label task-form__label--wide" htmlFor="task-notes">
            <span>Notas (opcional)</span>
            <textarea
              id="task-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Indicaciones, enlaces o apoyos que necesitas"
              disabled={!isSessionActive || !onAdd}
            />
          </label>
        </div>
        <div className="task-form__footer">
          {error && (
            <span className="task-form__error" role="alert">
              {error}
            </span>
          )}
          <button type="submit" className="task-form__submit" disabled={!isSessionActive || !onAdd || isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Añadir tarea'}
          </button>
        </div>
      </form>
      <div className="list" role="list">
        {tasks.map((task) => (
          <article key={task.id} className="list-item" role="listitem">
            <div className="list-item__body">
              <span className="list-item__title">{task.title}</span>
              <span className="list-item__meta">
                {(task.course && task.course.trim()) || 'General'} ·{' '}
                {task.due_date ? new Date(task.due_date).toLocaleString('es-ES') : 'Sin fecha definida'}
              </span>
              {task.notes && <span className="list-item__meta">{task.notes}</span>}
            </div>
            <div className="list-item__actions">
              <span className={statusClass[task.status] || 'status-pill'}>{readableStatus[task.status]}</span>
              {task.status !== 'completed' && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onMarkComplete(task.id)}
                >
                  Marcar completada
                </button>
              )}
            </div>
          </article>
        ))}
        {tasks.length === 0 && (
          <p className="empty-state">No tienes tareas registradas todavía. Empieza añadiendo la primera.</p>
        )}
      </div>
    </section>
  )
}

export default TaskList
