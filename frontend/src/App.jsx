import React, { useCallback, useEffect, useState } from 'react'
import HeaderGreeting from './components/HeaderGreeting'
import TaskList from './components/TaskList'
import ReminderList from './components/ReminderList'
import SummaryAssistant from './components/SummaryAssistant'
import FocusTimer from './components/FocusTimer'
import QuickNotes from './components/QuickNotes'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = [
  { id: 'plan', label: 'Planificador' },
  { id: 'reminders', label: 'Recordatorios' },
  { id: 'summary', label: 'Resúmenes' }
]

const App = () => {
  const [activeTab, setActiveTab] = useState('plan')
  const [stats, setStats] = useState({
    tasks_completed: 0,
    focus_hours: 0,
    milestones_completed: 0,
    upcoming_reminders: 0,
    streak_days: 0
  })
  const [tasks, setTasks] = useState([])
  const [reminders, setReminders] = useState([])
  const [summary, setSummary] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [keywords, setKeywords] = useState([])
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [presetSummaryText, setPresetSummaryText] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, tasksResponse, remindersResponse] = await Promise.all([
          fetch(`${API_URL}/dashboard`).then((res) => res.json()),
          fetch(`${API_URL}/tasks`).then((res) => res.json()),
          fetch(`${API_URL}/reminders`).then((res) => res.json())
        ])
        setStats(statsResponse)
        setTasks(tasksResponse)
        setReminders(remindersResponse)
      } catch (error) {
        console.error('Error cargando datos', error)
      }
    }

    fetchData()
  }, [])

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
      setSummary(data.summary)
      setKeywords(data.highlighted_keywords)
      setOriginalText(data.original_text)
      setActiveTab('summary')
    } catch (error) {
      console.error('Error generando resumen', error)
    } finally {
      setIsSummarizing(false)
    }
  }

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

  return (
    <div className="app-shell">
      <HeaderGreeting stats={stats} />
      <nav className="tab-bar" role="tablist" aria-label="Secciones principales">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            className={`tab-bar__button ${activeTab === tab.id ? 'is-active' : ''}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="tab-panels">
        <section
          id="panel-plan"
          role="tabpanel"
          aria-labelledby="tab-plan"
          hidden={activeTab !== 'plan'}
          className="tab-panel"
        >
          <div className="panel-grid panel-grid--planner">
            <TaskList tasks={tasks} onMarkComplete={handleMarkComplete} />
            <div className="panel-grid__column">
              <FocusTimer onSessionComplete={handleSessionComplete} />
              <QuickNotes onAdd={handleQuickSuggestion} />
            </div>
          </div>
        </section>
        <section
          id="panel-reminders"
          role="tabpanel"
          aria-labelledby="tab-reminders"
          hidden={activeTab !== 'reminders'}
          className="tab-panel"
        >
          <ReminderList reminders={reminders} />
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
      </main>
    </div>
  )
}

export default App
