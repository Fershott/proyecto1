import React, { useEffect, useRef, useState } from 'react'

const SummaryAssistant = ({
  onUpload,
  summary,
  keywords,
  originalText,
  isLoading,
  onSpeak,
  onStopSpeaking,
  presetText,
  onPresetConsumed
}) => {
  const [text, setText] = useState('')
  const [sentences, setSentences] = useState(5)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (presetText) {
      setText(presetText)
      setSelectedFile(null)
      setSelectedFileName('')
      onPresetConsumed?.()
    }
  }, [presetText, onPresetConsumed])

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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setSelectedFileName(file.name)
    event.target.value = ''
  }

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
            max="8"
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
        {summary && (
          <div className="summary__result">
            <h3 className="summary__result-title">Resumen generado</h3>
            <p className="summary__paragraph">{summary}</p>
            {keywords?.length > 0 && (
              <div className="chip-grid" aria-label="Palabras clave destacadas">
                {keywords.map((keyword) => (
                  <span key={keyword} className="chip">
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default SummaryAssistant
