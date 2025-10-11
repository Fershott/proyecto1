import React from 'react'

const QuickNotes = ({ onAdd }) => {
  const suggestions = [
    'Resumir capítulo de Historia para el examen del viernes',
    'Preparar guion de estudio con bloques de 25 minutos',
    'Organizar recordatorio para entregar el informe del laboratorio'
  ]

  return (
    <section className="panel panel--support" aria-labelledby="quick-actions-heading">
      <header className="panel__header panel__header--compact">
        <div>
          <h2 id="quick-actions-heading" className="panel__title">
            Ideas rápidas
          </h2>
          <p className="panel__subtitle">
            Envía una idea directamente al gestor de resúmenes o inspírate para organizar tus sesiones.
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
