# CogniCore

Plataforma web inclusiva para organización académica universitaria con énfasis en estudiantes con TDAH u otras neurodivergencias. El proyecto incluye una API en Python (FastAPI) y una interfaz React centrada en la accesibilidad y la reducción de la sobrecarga cognitiva.

## Estructura del proyecto

```
backend/
  app/
    main.py
    models.py
    summarizer.py
    storage.py
    data/
      tasks.json
      reminders.json
      focus_sessions.json
      stats.json
  requirements.txt
frontend/
  index.html
  package.json
  vite.config.js
  src/
    main.jsx
    App.jsx
    components/
      HeaderGreeting.jsx
      TaskList.jsx
      ReminderList.jsx
      SummaryAssistant.jsx
      FocusTimer.jsx
      QuickNotes.jsx
    styles.css
```

## Requisitos previos

- Python 3.11+
- Node.js 18+

## Preparar el repositorio para publicarlo

1. Crea un repositorio nuevo en tu proveedor favorito (GitHub, GitLab, etc.).
2. Verifica que las rutas `backend/` y `frontend/` existan en el commit inicial ejecutando `tree -L 2` o consultando la sección [Estructura del proyecto](#estructura-del-proyecto).
3. Ejecuta la checklist descrita en [`docs/repository_setup.md`](docs/repository_setup.md) para asegurarte de que las dependencias, pruebas y vistas previas funcionen antes de subir los cambios.
4. Confirma que los archivos sensibles (por ejemplo, `.venv/` y `node_modules/`) siguen ignorados gracias al `.gitignore` incluido.
5. Inicializa el repositorio local con `git init`, agrega todos los archivos (`git add .`), realiza el primer commit y luego vincúlalo al repositorio remoto (`git remote add origin ...`).
6. Sube el commit principal con `git push -u origin main` (o el nombre de rama que prefieras) y habilita la protección de ramas o flujos de trabajo CI/CD si tu organización lo requiere.

## Puesta en marcha del backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

La API estará disponible en `http://localhost:8000`.

### Ejecutar una demo rápida sin dependencias externas

Si no puedes instalar las dependencias (por ejemplo, en entornos con acceso restringido a
internet), ejecuta el motor de resúmenes directamente desde la línea de comandos:

```bash
python backend/demo_summary.py
```

El script imprimirá un resumen breve y las palabras clave detectadas sobre un texto de
ejemplo, útil para validar el algoritmo de procesamiento sin levantar todo el backend.

## Pruebas automatizadas

Se añadieron pruebas unitarias para el motor de resúmenes. Si aún no tienes las
dependencias de prueba instaladas, ejecútalas con `pip install pytest` dentro de tu entorno
virtual. Luego corre toda la suite con:

```bash
pytest
```

Las pruebas validan la generación de resúmenes y palabras clave tanto desde texto como
desde archivos simulados.

## Puesta en marcha del frontend

```bash
cd frontend
npm install
npm run dev
```

La interfaz se servirá en `http://localhost:5173`. El proxy de desarrollo redirige las peticiones `/api` hacia el backend.

### Vista previa estática del nuevo diseño minimalista

Si solo necesitas revisar la propuesta visual sin compilar la app de React, abre el archivo
`frontend/preview/index.html` en tu navegador. Incluye las mismas tipografías y estilos
modernos que la aplicación real (planificador con Pomodoro ajustable, recordatorios y gestor
de resúmenes con lectura en voz), pero renderizados de forma estática para facilitar la
revisión del layout.

## Funcionalidades principales

- **Gestión de tareas y recordatorios** con datos persistidos en archivos JSON.
- **Generador de resúmenes** a partir de texto pegado o archivos PDF/DOCX/TXT.
- **Palabras clave destacadas** para ayudar a la memorización.
- **Temporizador de enfoque** con notificación al completar la sesión.
- **Lectura en voz alta** usando la API de síntesis de voz del navegador.
- **Interfaz guiada e inclusiva**, con lenguaje amable, jerarquía visual clara y accesibilidad básica.

## Notas sobre accesibilidad

- Controles con `aria-label` y mensajes descriptivos.
- Botones y campos con estados de foco visibles.
- Posibilidad de escuchar resúmenes directamente desde el navegador.

## Endpoints relevantes

- `GET /tasks`, `POST /tasks`, `PATCH /tasks/{id}/status`
- `GET /reminders`, `POST /reminders`
- `GET /focus-sessions`, `POST /focus-sessions`
- `POST /summary` (archivo o texto)
- `POST /summary/text` (solo texto)
- `GET /dashboard`

## Licencia

Uso educativo.
