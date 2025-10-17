/**
 * Temporizador Pomodoro adaptable a distintos ritmos de estudio.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

const PRESET_MINUTES = [15, 25, 45]

// Componente que controla el conteo regresivo y notifica el fin de la sesión.
const FocusTimer = ({ onSessionComplete }) => {
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [secondsRemaining, setSecondsRemaining] = useState(focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef(null)
  const audioContextRef = useRef(null)

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === 'undefined') return null
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const context = audioContextRef.current
    if (context.state === 'suspended') {
      try {
        await context.resume()
      } catch (error) {
        console.warn('No se pudo activar el audio del temporizador', error)
      }
    }
    return context
  }, [])

  const triggerAlarm = useCallback(() => {
    ensureAudioContext().then((context) => {
      if (!context) return
      const duration = 1.2
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(880, context.currentTime)
      gainNode.gain.setValueAtTime(0.0001, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + duration)
    })
  }, [ensureAudioContext])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setIsRunning(false)
            triggerAlarm()
            onSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(intervalRef.current)
  }, [isRunning, onSessionComplete, triggerAlarm])

  useEffect(() => {
    if (!isRunning) {
      setSecondsRemaining(focusMinutes * 60)
    }
  }, [focusMinutes, isRunning])

  const minutesDisplay = String(Math.floor(secondsRemaining / 60)).padStart(2, '0')
  const secondsDisplay = String(secondsRemaining % 60).padStart(2, '0')

  // Restaura el temporizador a la duración seleccionada.
  const handleReset = () => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setSecondsRemaining(focusMinutes * 60)
  }

  // Alterna entre iniciar y pausar el conteo.
  const handleStartPause = () => {
    if (isRunning) {
      clearInterval(intervalRef.current)
    }
    ensureAudioContext()
    setIsRunning((prev) => !prev)
  }

  // Cambia rápidamente la duración usando los accesos directos.
  const handlePresetChange = (minutes) => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setFocusMinutes(minutes)
  }

  // Permite ajustar manualmente la duración del ciclo.
  const handleCustomChange = (event) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    const safeValue = Math.max(5, Math.min(90, value))
    setFocusMinutes(safeValue)
  }

  // Garantiza que la duración personalizada se mantenga en el rango permitido.
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
