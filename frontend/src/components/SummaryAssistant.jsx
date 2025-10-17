/**
 * Asistente de resúmenes con soporte para archivos, texto y lectura en voz alta.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

// Componente que concentra el flujo de carga, resumen y reproducción por voz.
const SummaryAssistant = ({
  onUpload,
  summary,
  keywords,
  originalText,
  isLoading,
  onSpeak,
  onStopSpeaking,
}) => {
  const [text, setText] = useState('')
  const [sentences, setSentences] = useState(7)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [activeResultTab, setActiveResultTab] = useState('summary')
  const fileInputRef = useRef(null)

  // Cambia automáticamente la pestaña de resultado según lo disponible.
  useEffect(() => {
    if (summary) {
      setActiveResultTab('summary')
    } else if (originalText) {
      setActiveResultTab('original')
    }
  }, [summary, originalText])

  const summarySegments = useMemo(() => {
    if (!summary) return []
    return summary
      .split(/(?<=[.!?])\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
  }, [summary])

  // Valida que exista contenido y delega la petición de resumen al padre.
  const handleSubmit = (event) => {
    event.preventDefault()
    if (!text.trim() && !selectedFile) {
      alert('Escribe un texto o selecciona un archivo para generar el resumen.')
      return
    }
    const formData = new FormData()
    formData.append('sentences', sentences)
    if (text.trim()) {
      formData.append('text', text)
    }
    if (selectedFile) {
      formData.append('file', selectedFile)
    }
    onUpload(formData)
  }

  // Procesa la selección de archivos compatibles y almacena su nombre.
  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setSelectedFileName(file.name)
    event.target.value = ''
  }

  // Permite activar el selector de archivos usando teclado.
  const handleUploadKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileInputRef.current?.click()
    }
  }

  return (
    <section
      className="panel panel--with-sticker"
      aria-labelledby="summary-heading"
      data-sticker="Resumen exprés"
      data-icon="📝"
    >
      <header className="panel__header">
        <div>
          <h2 id="summary-heading" className="panel__title">
            Gestor de resúmenes
          </h2>
          <p className="panel__subtitle">
            Sube un documento PDF, Word, PowerPoint o TXT o pega tu texto. Podrás escuchar el resumen o el contenido
            completo.
          </p>
        </div>
      </header>
      <div className="summary">
        <form className="summary__form" onSubmit={handleSubmit}>
          <label htmlFor="summary-text" className="summary__label">
            Texto o notas
          </label>
          <textarea
            id="summary-text"
            name="text"
            rows={6}
            placeholder="Pega aquí el contenido que quieres resumir"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <label htmlFor="summary-sentences" className="summary__label">
            Longitud del resumen: {sentences} frase{sentences === 1 ? '' : 's'}
          </label>
          <input
            id="summary-sentences"
            type="range"
            min="1"
            max="10"
            value={sentences}
            onChange={(event) => setSentences(Number(event.target.value))}
          />
          <div className="summary__upload">
            <span className="summary__label">Subir archivo</span>
            <input
              ref={fileInputRef}
              id="summary-file"
              type="file"
              accept=".pdf,.doc,.docx,.pptx,.txt,.md,.rtf"
              onChange={handleFileChange}
              className="summary__file-input"
            />
            <label
              htmlFor="summary-file"
              className="summary__upload-sticker"
              role="button"
              tabIndex={0}
              onKeyDown={handleUploadKeyDown}
            >
              <span className="summary__upload-icon" aria-hidden="true">
                📎
              </span>
              <span className="summary__upload-copy">
                <span className="summary__upload-title">Cargar archivo</span>
                <span className="summary__upload-subtitle">PDF, Word, PowerPoint o TXT de tus materias</span>
              </span>
            </label>
            {selectedFileName && (
              <div className="summary__file-feedback">
                <p className="summary__file-name" aria-live="polite">
                  Archivo listo: {selectedFileName}
                </p>
                <button
                  type="button"
                  className="ghost-button summary__clear-file"
                  onClick={() => {
                    setSelectedFile(null)
                    setSelectedFileName('')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                      fileInputRef.current.focus()
                    }
                  }}
                >
                  Quitar archivo
                </button>
              </div>
            )}
          </div>
          <p className="summary__hint">Formatos compatibles: PDF, DOCX, PPTX, TXT.</p>
          <div className="summary-actions">
            <button type="submit" className="primary" disabled={isLoading}>
              {isLoading ? 'Resumiendo…' : 'Generar resumen'}
            </button>
            <button type="button" className="ghost-button" onClick={() => onSpeak(summary)} disabled={!summary}>
              Escuchar resumen
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onSpeak(originalText)}
              disabled={!originalText}
            >
              Escuchar texto completo
            </button>
            <button type="button" className="ghost-button" onClick={onStopSpeaking}>
              Detener voz
            </button>
          </div>
        </form>
        {(summary || originalText) && (
          <div className="summary__result">
            <div className="summary__result-header">
              <h3 className="summary__result-title">Resultados del asistente</h3>
              <div className="summary__result-tabs" role="tablist" aria-label="Contenido del resumen">
                {summary && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeResultTab === 'summary'}
                    className={`summary__result-tab ${activeResultTab === 'summary' ? 'is-active' : ''}`}
                    id="summary-result-tab"
                    onClick={() => setActiveResultTab('summary')}
                  >
                    Resumen
                  </button>
                )}
                {originalText && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeResultTab === 'original'}
                    className={`summary__result-tab ${activeResultTab === 'original' ? 'is-active' : ''}`}
                    id="summary-original-tab"
                    onClick={() => setActiveResultTab('original')}
                  >
                    Texto completo
                  </button>
                )}
              </div>
            </div>
            {keywords?.length > 0 && (
              <div className="chip-grid" aria-label="Palabras clave destacadas">
                {keywords.map((keyword) => (
                  <span key={keyword} className="chip">
                    {keyword}
                  </span>
                ))}
              </div>
            )}
            {activeResultTab === 'summary' && summary && (
              <div
                id="summary-result-panel"
                role="tabpanel"
                aria-labelledby="summary-result-tab"
                className="summary__result-panel"
              >
                <ol className="summary__bullets">
                  {summarySegments.map((segment, index) => (
                    <li key={`${segment}-${index}`} className="summary__bullet">
                      {segment}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {activeResultTab === 'original' && originalText && (
              <div
                id="summary-original-panel"
                role="tabpanel"
                aria-labelledby="summary-original-tab"
                className="summary__result-panel summary__result-panel--original"
              >
                <p className="summary__paragraph summary__paragraph--scrollable">{originalText}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default SummaryAssistant
