/**
 * Aplicación principal de CogniCore en el frontend.
 * Coordina el estado global, las pestañas y las llamadas al backend.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import HeaderGreeting from './components/HeaderGreeting'
import TaskList from './components/TaskList'
import ReminderList from './components/ReminderList'
import SummaryAssistant from './components/SummaryAssistant'
import FocusTimer from './components/FocusTimer'
import SchedulePlanner from './components/SchedulePlanner'
import AuthGateway from './components/AuthGateway'
import DisplayNamePrompt from './components/DisplayNamePrompt'

const DEFAULT_STATS = {
  tasks_completed: 0,
  focus_hours: 0,
  milestones_completed: 0,
  upcoming_reminders: 0,
  streak_days: 0
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const FALLBACK_SESSION = {
  id: 0,
  email: 'offline@cognicore.app',
  display_name: 'Modo sin conexión',
  provider: 'google',
  isMock: true
}

const FALLBACK_STATS = { ...DEFAULT_STATS }

const FALLBACK_TASKS = []

const FALLBACK_REMINDERS = []

const FALLBACK_SCHEDULE = []

const FALLBACK_SUMMARY = ''

const FALLBACK_ORIGINAL_TEXT = ''

const FALLBACK_KEYWORDS = []

const LOGIN_TAB = { id: 'login', label: 'Acceso' }

const DASHBOARD_TABS = [
  { id: 'tasks', label: 'Tareas' },
  { id: 'timer', label: 'Pomodoro' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'reminders', label: 'Recordatorios' },
  { id: 'summary', label: 'Resúmenes' }
]

const deriveFallbackName = (email) => {
  if (!email) return ''
  const prefix = email.split('@', 1)[0]
  return prefix
    .replace(/[-_.]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// Componente raíz que muestra la navegación y cada pestaña funcional.
const App = () => {
  const [activeTab, setActiveTab] = useState('login')
  const [session, setSession] = useState(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isBackendReachable, setIsBackendReachable] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem('cognicore.darkMode')
    if (stored === '1') return true
    if (stored === '0') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  const [stats, setStats] = useState(() => ({ ...DEFAULT_STATS }))
  const [tasks, setTasks] = useState([])
  const [scheduleEntries, setScheduleEntries] = useState([])
  const [reminders, setReminders] = useState([])
  const [summary, setSummary] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [keywords, setKeywords] = useState([])
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false)

  const fallbackData = useMemo(
    () => ({
      session: FALLBACK_SESSION,
      stats: FALLBACK_STATS,
      tasks: FALLBACK_TASKS,
      reminders: FALLBACK_REMINDERS,
      schedule: FALLBACK_SCHEDULE
    }),
    []
  )

  const activateOfflineExperience = useCallback(
    (overrides = {}) => {
      const offlineSession = { ...fallbackData.session, ...overrides }
      setIsOfflineMode(true)
      setSession(offlineSession)
      setStats({ ...fallbackData.stats })
      setTasks([...fallbackData.tasks])
      setReminders([...fallbackData.reminders])
      setScheduleEntries([...fallbackData.schedule])
      setSummary(FALLBACK_SUMMARY)
      setOriginalText(FALLBACK_ORIGINAL_TEXT)
      setKeywords([...FALLBACK_KEYWORDS])
      setActiveTab('tasks')
      const fallbackName = deriveFallbackName(offlineSession.email)
      const shouldPrompt =
        !offlineSession.display_name ||
        offlineSession.display_name.toLowerCase() === fallbackName.toLowerCase()
      setIsNamePromptOpen(shouldPrompt)
      return offlineSession
    },
    [fallbackData]
  )

  // Activa datos demostrativos cuando la API no responde.
  const applyFallbackData = useCallback(() => {
    activateOfflineExperience()
  }, [activateOfflineExperience])

  // Restaura los valores iniciales antes de sincronizar con el backend.
  const resetCollections = useCallback(() => {
    setStats({ ...DEFAULT_STATS })
    setTasks([])
    setReminders([])
    setScheduleEntries([])
    setSummary('')
    setOriginalText('')
    setKeywords([])
  }, [])

  // Mantiene sincronizado el modo oscuro con el DOM y el almacenamiento local.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('theme-dark', Boolean(isDarkMode))
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cognicore.darkMode', isDarkMode ? '1' : '0')
    }
  }, [isDarkMode])

  // Recupera la sesión activa al inicializar la aplicación.
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${API_URL}/session`)
        if (!response.ok) {
          setIsBackendReachable(true)
          return
        }
        const data = await response.json()
        if (data) {
          setIsBackendReachable(true)
          setIsOfflineMode(false)
          setSession(data)
          setActiveTab('tasks')
        }
      } catch (error) {
        console.error('No se pudo obtener la sesión', error)
        setIsBackendReachable(false)
        applyFallbackData()
        setActiveTab('tasks')
      } finally {
        setIsSessionLoading(false)
      }
    }

    fetchSession()
  }, [applyFallbackData])

  useEffect(() => {
    if (!session) {
      setIsNamePromptOpen(false)
      return
    }
    const fallbackName = deriveFallbackName(session.email)
    const shouldPrompt =
      Boolean(session.display_name) && session.display_name.toLowerCase() === fallbackName.toLowerCase()
    setIsNamePromptOpen(shouldPrompt)
  }, [session])

  useEffect(() => {
    if (!session) {
      resetCollections()
      if (!isSessionLoading) {
        setActiveTab('login')
      }
      return
    }

    if (isOfflineMode || session?.isMock) {
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
        setIsBackendReachable(false)
        applyFallbackData()
      }
    }

    fetchData()
  }, [session, isSessionLoading, resetCollections, isOfflineMode, applyFallbackData])

  // Marca una tarea como completada y ajusta la estadística de logros.
  const handleMarkComplete = async (taskId) => {
    if (isOfflineMode) {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: 'completed' } : task))
      )
      setStats((prev) => ({
        ...prev,
        tasks_completed: prev.tasks_completed + 1
      }))
      return
    }
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

  // Registra una tarea nueva en el backend o en modo sin conexión.
  const handleAddTask = useCallback(
    async ({ title, course, dueDate, notes }) => {
      const normalizedCourse = course.trim() || 'General'
      const normalizedNotes = notes.trim() ? notes.trim() : null

      if (isOfflineMode) {
        const newTask = {
          id: Date.now(),
          title,
          course: normalizedCourse,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          status: 'pending',
          notes: normalizedNotes,
          tags: []
        }
        setTasks((prev) => [...prev, newTask])
        return newTask
      }

      try {
        const response = await fetch(`${API_URL}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: 0,
            title,
            course: normalizedCourse,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            status: 'pending',
            notes: normalizedNotes,
            tags: []
          })
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'No se pudo crear la tarea. Inténtalo nuevamente.')
        }
        setTasks((prev) => [...prev, data])
        return data
      } catch (error) {
        console.error('Error creando tarea', error)
        alert(error.message || 'No se pudo crear la tarea. Inténtalo nuevamente.')
        return null
      }
    },
    [isOfflineMode]
  )

  // Persiste el nombre preferido una vez completado el inicio de sesión.
  const handleDisplayNameSubmit = useCallback(
    async (displayName) => {
      if (!session) return

      if (isOfflineMode || session.isMock) {
        setSession((prev) => (prev ? { ...prev, display_name: displayName } : prev))
        setIsNamePromptOpen(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/session/display-name`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ display_name: displayName })
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'No se pudo guardar tu nombre preferido.')
        }
        setSession(data)
        setIsNamePromptOpen(false)
      } catch (error) {
        console.error('Error actualizando el nombre para mostrar', error)
        alert(error.message || 'No se pudo guardar tu nombre preferido. Intenta nuevamente.')
      }
    },
    [session, isOfflineMode]
  )

  const handleDismissNamePrompt = useCallback(() => {
    setIsNamePromptOpen(false)
  }, [])

  // Gestiona el envío de archivos o texto al servicio de resúmenes.
  const handleSummaryUpload = async (payload) => {
    setIsSummarizing(true)
    if (isOfflineMode) {
      setSummary(FALLBACK_SUMMARY)
      setKeywords(FALLBACK_KEYWORDS)
      setOriginalText(FALLBACK_ORIGINAL_TEXT)
      setActiveTab('summary')
      setIsSummarizing(false)
      return
    }
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
      setIsBackendReachable(true)
      setSummary(data.summary)
      setKeywords(data.highlighted_keywords)
      setOriginalText(data.original_text)
      setActiveTab('summary')
    } catch (error) {
      console.error('Error generando resumen', error)
      setIsBackendReachable(false)
      setIsOfflineMode(true)
      alert('Ocurrió un problema al generar el resumen. Activamos el modo demostración para que puedas seguir trabajando mientras reconectas el backend.')
    } finally {
      setIsSummarizing(false)
    }
  }

  // Crea recordatorios y sincroniza el estado local.
  const handleAddReminder = useCallback(
    async ({ title, description, remindAt, type }) => {
      if (!session) {
        alert('Inicia sesión con Google o Microsoft para agendar recordatorios.')
        return null
      }
      if (isOfflineMode) {
        const newReminder = {
          id: Date.now(),
          title,
          description,
          remind_at: remindAt,
          type,
          delivery_provider: session.provider
        }
        setReminders((prev) => [...prev, newReminder])
        setStats((prev) => ({
          ...prev,
          upcoming_reminders: prev.upcoming_reminders + 1
        }))
        return newReminder
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
    [session, isOfflineMode, setReminders, setStats]
  )

  // Ajusta un recordatorio existente preservando el proveedor activo.
  const handleUpdateReminder = useCallback(
    async (reminderId, { title, description, remindAt, type }) => {
      if (!session) {
        alert('Inicia sesión para editar tus recordatorios sincronizados.')
        return null
      }

      if (isOfflineMode) {
        const updatedReminder = {
          id: reminderId,
          title,
          description,
          remind_at: remindAt,
          type,
          delivery_provider: session.provider
        }
        setReminders((prev) =>
          prev.map((reminder) => (reminder.id === reminderId ? updatedReminder : reminder))
        )
        return updatedReminder
      }

      try {
        const response = await fetch(`${API_URL}/reminders/${reminderId}`, {
          method: 'PATCH',
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

        const data = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(data?.detail || 'No se pudo actualizar el recordatorio.')
        }

        setReminders((prev) =>
          prev.map((reminder) => (reminder.id === reminderId ? data : reminder))
        )
        return data
      } catch (error) {
        console.error('Error actualizando recordatorio', error)
        alert(error.message || 'No se pudo guardar el cambio del recordatorio.')
        return null
      }
    },
    [session, isOfflineMode]
  )

  // Activa la lectura en voz alta del resumen o texto original.
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

  // Detiene la narración por voz cuando la persona lo solicita.
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  // Cierra la sesión y limpia el estado compartido.
  const handleLogout = useCallback(async () => {
    if (!isBackendReachable || isOfflineMode) {
      stopSpeaking()
      setSession(null)
      setIsOfflineMode(false)
      resetCollections()
      setActiveTab('login')
      return
    }

    try {
      await fetch(`${API_URL}/session`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Error al cerrar sesión', error)
    } finally {
      stopSpeaking()
      setSession(null)
      setIsNamePromptOpen(false)
    }
  }, [isBackendReachable, isOfflineMode, resetCollections, stopSpeaking])

  // Alterna entre el modo claro y oscuro del tablero.
  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev)
  }, [])

  // Notifica cuando termina un ciclo de enfoque.
  const handleSessionComplete = useCallback(() => {
    alert('¡Excelente! Tu sesión de enfoque ha terminado.')
  }, [])

  // Permite autenticar en modo demostración cuando el backend está desconectado.
  const handleOfflineAuth = useCallback(
    ({ email, provider, displayName }) => {
      const normalizedEmail = email || FALLBACK_SESSION.email
      activateOfflineExperience({
        email: normalizedEmail,
        provider: provider || FALLBACK_SESSION.provider,
        display_name: displayName || deriveFallbackName(normalizedEmail)
      })
    },
    [activateOfflineExperience]
  )

  // Crea un bloque del calendario semanal y lo muestra en la pestaña correspondiente.
  const handleAddScheduleEntry = useCallback(
    async ({ title, day_of_week, start_time, end_time, location, description }) => {
      if (isOfflineMode) {
        const newEntry = {
          id: Date.now(),
          title,
          day_of_week,
          start_time,
          end_time,
          location,
          description
        }
        setScheduleEntries((prev) => [...prev, newEntry])
        setActiveTab('calendar')
        return newEntry
      }

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
    [isOfflineMode]
  )

  // Quita un bloque de horario del calendario.
  const handleDeleteScheduleEntry = useCallback(
    async (entryId) => {
      if (isOfflineMode) {
        setScheduleEntries((prev) => prev.filter((entry) => entry.id !== entryId))
        return
      }

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
    },
    [isOfflineMode]
  )

  const tabs = session ? DASHBOARD_TABS : [LOGIN_TAB]

  return (
    <div className="app-shell">
      <HeaderGreeting
        stats={stats}
        session={session}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />
      <nav className="tab-bar" role="tablist" aria-label="Secciones principales">
        {tabs.map((tab) => {
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
          <AuthGateway
            isLoading={isSessionLoading}
            isBackendReachable={isBackendReachable}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            apiBaseUrl={API_URL}
            onOfflineAuth={handleOfflineAuth}
          />
        </section>
        <section
          id="panel-tasks"
          role="tabpanel"
          aria-labelledby="tab-tasks"
          hidden={activeTab !== 'tasks'}
          className="tab-panel"
        >
          <TaskList
            tasks={tasks}
            onMarkComplete={handleMarkComplete}
            onAdd={handleAddTask}
            isSessionActive={Boolean(session)}
          />
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
          <ReminderList
            reminders={reminders}
            onAdd={handleAddReminder}
            onUpdate={handleUpdateReminder}
            session={session}
          />
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
          />
        </section>
      </main>
      <DisplayNamePrompt
        isOpen={isNamePromptOpen}
        onClose={handleDismissNamePrompt}
        onSubmit={handleDisplayNameSubmit}
        suggestedName={session ? deriveFallbackName(session.email) : ''}
      />
    </div>
  )
}

export default App
