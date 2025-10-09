import React from 'react'

const QuickNotes = ({ onAdd }) => {
  const suggestions = [
    'Generar resumen para repasar neurodivergencia',
    'Crear guion de estudio con técnica Pomodoro',
    'Recordatorio amable para entregar proyecto inclusivo'
  ]

  return (
    <section className="panel panel--support" aria-labelledby="quick-actions-heading">
      <header className="panel__header panel__header--compact">
        <div>
          <h2 id="quick-actions-heading" className="panel__title">
            Atajos interactivos
          </h2>
          <p className="panel__subtitle">
            Envía una idea directamente al gestor de resúmenes o inspírate con rituales de enfoque.
          </p>
        </div>
        <span className="panel__badge" aria-hidden="true">
          ✨
        </span>
      </header>
      <div className="quick-actions" role="list">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="quick-action"
            role="listitem"
            onClick={() => onAdd(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <p className="quick-actions__hint">Puedes ajustar el texto antes de generar el resumen o iniciar una sesión de foco.</p>
    </section>
  )
}

export default QuickNotes
