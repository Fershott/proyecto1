/**
 * Lista de tareas académicas con estados y acción rápida de completado.
 */
import React from 'react'

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
const TaskList = ({ tasks = [], onMarkComplete }) => {
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
      <div className="list" role="list">
        {tasks.map((task) => (
          <article key={task.id} className="list-item" role="listitem">
            <div className="list-item__body">
              <span className="list-item__title">{task.title}</span>
              <span className="list-item__meta">
                {task.course} · {task.due_date ? new Date(task.due_date).toLocaleString('es-ES') : 'Sin fecha definida'}
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
