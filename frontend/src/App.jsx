import React, { useCallback, useEffect, useState } from 'react'
import HeaderGreeting from './components/HeaderGreeting'
import TaskList from './components/TaskList'
import ReminderList from './components/ReminderList'
import SummaryAssistant from './components/SummaryAssistant'
import FocusTimer from './components/FocusTimer'
import QuickNotes from './components/QuickNotes'
import SchedulePlanner from './components/SchedulePlanner'
import AuthGateway from './components/AuthGateway'

const DEFAULT_STATS = {
  tasks_completed: 0,
  focus_hours: 0,
  milestones_completed: 0,
  upcoming_reminders: 0,
  streak_days: 0
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = [
  { id: 'login', label: 'Acceso' },
  { id: 'tasks', label: 'Tareas' },
  { id: 'timer', label: 'Pomodoro' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'reminders', label: 'Recordatorios' },
  { id: 'summary', label: 'Resúmenes' },
  { id: 'ideas', label: 'Ideas rápidas' }
]

const App = () => {
  const [activeTab, setActiveTab] = useState('login')
  const [session, setSession] = useState(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [stats, setStats] = useState(() => ({ ...DEFAULT_STATS }))
  const [tasks, setTasks] = useState([])
  const [scheduleEntries, setScheduleEntries] = useState([])
  const [reminders, setReminders] = useState([])
  const [summary, setSummary] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [keywords, setKeywords] = useState([])
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [presetSummaryText, setPresetSummaryText] = useState('')

  const resetCollections = useCallback(() => {
    setStats({ ...DEFAULT_STATS })
    setTasks([])
    setReminders([])
    setScheduleEntries([])
    setSummary('')
    setOriginalText('')
    setKeywords([])
    setPresetSummaryText('')
  }, [])

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${API_URL}/session`)
        if (!response.ok) {
          return
        }
        const data = await response.json()
        if (data) {
          setSession(data)
          setActiveTab('tasks')
        }
      } catch (error) {
        console.error('No se pudo obtener la sesión', error)
      } finally {
        setIsSessionLoading(false)
      }
    }

    fetchSession()
  }, [])

  useEffect(() => {
    if (!session) {
      resetCollections()
      if (!isSessionLoading) {
        setActiveTab('login')
      }
      return
    }

    const fetchData = async () => {
      try {
        const [statsResponse, tasksResponse, remindersResponse, scheduleResponse] = await Promise.all([
          fetch(`${API_URL}/dashboard`).then((res) => res.json()),
          fetch(`${API_URL}/tasks`).then((res) => res.json()),
          fetch(`${API_URL}/reminders`).then((res) => res.json()),
          fetch(`${API_URL}/schedule`).then((res) => res.json())
        ])
        setStats(statsResponse)
        setTasks(tasksResponse)
        setReminders(remindersResponse)
        setScheduleEntries(scheduleResponse)
      } catch (error) {
        console.error('Error cargando datos', error)
      }
    }

    fetchData()
  }, [session, isSessionLoading, resetCollections])

  const handleMarkComplete = async (taskId) => {
    try {
      const updatedTask = await fetch(`${API_URL}/tasks/${taskId}/status?status=completed`, {
        method: 'PATCH'
      }).then((res) => res.json())
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)))
      setStats((prev) => ({
        ...prev,
        tasks_completed: prev.tasks_completed + 1
      }))
    } catch (error) {
      console.error('No se pudo actualizar la tarea', error)
    }
  }

  const handleSummaryUpload = async (payload) => {
    setIsSummarizing(true)
    try {
      const response = await fetch(`${API_URL}/summary`, {
        method: 'POST',
        body: payload
      })
      const data = await response.json()
      if (!response.ok) {
        const message = data?.detail || 'No se pudo generar el resumen. Inténtalo nuevamente.'
        alert(message)
        setSummary('')
        setKeywords([])
        setOriginalText('')
        return
      }
      setSummary(data.summary)
      setKeywords(data.highlighted_keywords)
      setOriginalText(data.original_text)
      setActiveTab('summary')
    } catch (error) {
      console.error('Error generando resumen', error)
      alert('Ocurrió un problema al generar el resumen. Revisa tu conexión e inténtalo otra vez.')
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleAddReminder = useCallback(
    async ({ title, description, remindAt, type }) => {
      if (!session) {
        alert('Inicia sesión con Google o Microsoft para agendar recordatorios.')
        return null
      }
      try {
        const response = await fetch(`${API_URL}/reminders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            description,
            remind_at: remindAt,
            type
          })
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'No se pudo crear el recordatorio. Inténtalo nuevamente.')
        }

        setReminders((prev) => [...prev, data])
        setStats((prev) => ({
          ...prev,
          upcoming_reminders: prev.upcoming_reminders + 1
        }))

        return data
      } catch (error) {
        console.error('Error creando recordatorio', error)
        alert(error.message || 'No se pudo crear el recordatorio. Inténtalo otra vez.')
        return null
      }
    },
    [setReminders, setStats]
  )

  const speakText = useCallback((text) => {
    if (!text) return
    if (!('speechSynthesis' in window)) {
      alert('Tu navegador no soporta la lectura en voz alta. Puedes copiar el texto manualmente.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }, [])

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  const handleLogin = useCallback(
    async ({ email, provider }) => {
      try {
        const displayName = email.split('@')[0].replace(/\./g, ' ')
        const response = await fetch(`${API_URL}/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            provider,
            display_name: displayName.trim().replace(/\s+/g, ' ')
          })
        })

        const data = await response.json()
        if (!response.ok) {
          return { success: false, error: data?.detail || 'No se pudo iniciar sesión.' }
        }

        setSession(data)
        setActiveTab('tasks')
        return { success: true }
      } catch (error) {
        console.error('Error al iniciar sesión', error)
        return { success: false, error: 'Ocurrió un problema al iniciar sesión.' }
      }
    },
    []
  )

  const handleLogout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/session`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Error al cerrar sesión', error)
    } finally {
      stopSpeaking()
      setSession(null)
    }
  }, [stopSpeaking])

  const handleSessionComplete = useCallback(() => {
    alert('¡Excelente! Tu sesión de enfoque ha terminado.')
  }, [])

  const handleQuickSuggestion = useCallback((prompt) => {
    setPresetSummaryText(prompt)
    setActiveTab('summary')
  }, [])

  const handlePresetConsumed = useCallback(() => {
    setPresetSummaryText('')
  }, [])

  const handleAddScheduleEntry = useCallback(
    async ({ title, day_of_week, start_time, end_time, location, description }) => {
      try {
        const response = await fetch(`${API_URL}/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: 0,
            title,
            day_of_week,
            start_time,
            end_time,
            location,
            description
          })
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'No se pudo registrar el horario. Intenta nuevamente.')
        }

        setScheduleEntries((prev) => [...prev, data])
        setActiveTab('calendar')
        return data
      } catch (error) {
        console.error('Error guardando horario', error)
        alert(error.message || 'Ocurrió un problema al guardar el bloque de horario.')
        return null
      }
    },
    []
  )

  const handleDeleteScheduleEntry = useCallback(async (entryId) => {
    try {
      const response = await fetch(`${API_URL}/schedule/${entryId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data?.detail || 'No se pudo eliminar el bloque del horario.')
      }

      setScheduleEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    } catch (error) {
      console.error('Error eliminando horario', error)
      alert(error.message || 'No se pudo eliminar el bloque seleccionado.')
    }
  }, [])

  return (
    <div className="app-shell">
      <HeaderGreeting stats={stats} session={session} />
      <nav className="tab-bar" role="tablist" aria-label="Secciones principales">
        {TABS.map((tab) => {
          const isDisabled = !session && tab.id !== 'login'
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              className={`tab-bar__button ${activeTab === tab.id ? 'is-active' : ''} ${
                isDisabled ? 'is-disabled' : ''
              }`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => {
                if (isDisabled) return
                setActiveTab(tab.id)
              }}
              disabled={isDisabled}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
      <main className="tab-panels">
        <section
          id="panel-login"
          role="tabpanel"
          aria-labelledby="tab-login"
          hidden={activeTab !== 'login'}
          className="tab-panel"
        >
          <AuthGateway session={session} onLogin={handleLogin} onLogout={handleLogout} isLoading={isSessionLoading} />
        </section>
        <section
          id="panel-tasks"
          role="tabpanel"
          aria-labelledby="tab-tasks"
          hidden={activeTab !== 'tasks'}
          className="tab-panel"
        >
          <TaskList tasks={tasks} onMarkComplete={handleMarkComplete} />
        </section>
        <section
          id="panel-timer"
          role="tabpanel"
          aria-labelledby="tab-timer"
          hidden={activeTab !== 'timer'}
          className="tab-panel"
        >
          <FocusTimer onSessionComplete={handleSessionComplete} />
        </section>
        <section
          id="panel-calendar"
          role="tabpanel"
          aria-labelledby="tab-calendar"
          hidden={activeTab !== 'calendar'}
          className="tab-panel"
        >
          <SchedulePlanner
            schedule={scheduleEntries}
            tasks={tasks}
            onAdd={handleAddScheduleEntry}
            onDelete={handleDeleteScheduleEntry}
          />
        </section>
        <section
          id="panel-reminders"
          role="tabpanel"
          aria-labelledby="tab-reminders"
          hidden={activeTab !== 'reminders'}
          className="tab-panel"
        >
          <ReminderList reminders={reminders} onAdd={handleAddReminder} session={session} />
        </section>
        <section
          id="panel-summary"
          role="tabpanel"
          aria-labelledby="tab-summary"
          hidden={activeTab !== 'summary'}
          className="tab-panel"
        >
          <SummaryAssistant
            onUpload={handleSummaryUpload}
            summary={summary}
            keywords={keywords}
            originalText={originalText}
            isLoading={isSummarizing}
            onSpeak={speakText}
            onStopSpeaking={stopSpeaking}
            presetText={presetSummaryText}
            onPresetConsumed={handlePresetConsumed}
          />
        </section>
        <section
          id="panel-ideas"
          role="tabpanel"
          aria-labelledby="tab-ideas"
          hidden={activeTab !== 'ideas'}
          className="tab-panel"
        >
          <QuickNotes onAdd={handleQuickSuggestion} />
        </section>
      </main>
    </div>
  )
}

export default App
