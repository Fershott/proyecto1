import React, { useEffect, useRef, useState } from 'react'

const PRESET_MINUTES = [15, 25, 45]

const FocusTimer = ({ onSessionComplete }) => {
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [secondsRemaining, setSecondsRemaining] = useState(focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setIsRunning(false)
            onSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(intervalRef.current)
  }, [isRunning, onSessionComplete])

  useEffect(() => {
    if (!isRunning) {
      setSecondsRemaining(focusMinutes * 60)
    }
  }, [focusMinutes, isRunning])

  const minutesDisplay = String(Math.floor(secondsRemaining / 60)).padStart(2, '0')
  const secondsDisplay = String(secondsRemaining % 60).padStart(2, '0')

  const handleReset = () => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setSecondsRemaining(focusMinutes * 60)
  }

  const handleStartPause = () => {
    if (isRunning) {
      clearInterval(intervalRef.current)
    }
    setIsRunning((prev) => !prev)
  }

  const handlePresetChange = (minutes) => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setFocusMinutes(minutes)
  }

  const handleCustomChange = (event) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    const safeValue = Math.max(5, Math.min(90, value))
    setFocusMinutes(safeValue)
  }

  const handleCustomBlur = () => {
    setFocusMinutes((prev) => {
      if (!prev) {
        return 25
      }
      return Math.max(5, Math.min(90, prev))
    })
  }

  return (
    <section
      className="panel panel--with-sticker"
      aria-labelledby="focus-heading"
      data-sticker="Tiempo de enfoque"
      data-icon="⏰"
    >
      <header className="panel__header">
        <div>
          <h2 id="focus-heading" className="panel__title">
            Ritmo Pomodoro
          </h2>
          <p className="panel__subtitle">Configura la duración que mejor encaje con tu energía de estudio y haz pausas activas.</p>
        </div>
      </header>
      <div className="timer" role="group" aria-label="Temporizador de enfoque">
        <div className="timer__display" aria-live="polite">
          <span className="timer__time">
            {minutesDisplay}:{secondsDisplay}
          </span>
        </div>
        <div className="timer__presets" role="group" aria-label="Duraciones sugeridas">
          {PRESET_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`pill ${focusMinutes === minutes ? 'is-active' : ''}`}
              onClick={() => handlePresetChange(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <label htmlFor="custom-duration" className="timer__label">
          Duración personalizada (5-90 min)
        </label>
        <input
          id="custom-duration"
          type="number"
          min="5"
          max="90"
          value={focusMinutes}
          onChange={handleCustomChange}
          onBlur={handleCustomBlur}
        />
        <div className="timer__actions">
          <button type="button" className="primary" onClick={handleStartPause}>
            {isRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button type="button" className="ghost-button" onClick={handleReset}>
            Reiniciar
          </button>
        </div>
      </div>
    </section>
  )
}

export default FocusTimer
