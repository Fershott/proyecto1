# CogniCore

CogniCore es una plataforma web inclusiva para la organización académica universitaria con énfasis en estudiantes con TDAH u otras neurodivergencias. El proyecto combina una API en Python (FastAPI) y una interfaz React pensada para guiar paso a paso al usuario con un estilo estudiantil, colorido y accesible.

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
      schedule.json
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
      SchedulePlanner.jsx
      SummaryAssistant.jsx
      FocusTimer.jsx
      QuickNotes.jsx
      WeeklyCalendar.jsx
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

## Actualizar el repositorio en GitHub

Cuando realices cambios adicionales en CogniCore, sigue estos pasos para mantener el repositorio remoto sincronizado:

1. Asegúrate de estar en la rama correcta (por ejemplo, `main` o una rama de feature) con `git status -sb`.
2. Ejecuta las pruebas y utilidades clave para validar el estado actual:
   - `pytest`
   - `python backend/demo_summary.py`
   - `python -m compileall backend/app`
3. Revisa los cambios con `git status` y `git diff` y agrégalos al commit con `git add ...`.
4. Crea un commit descriptivo: `git commit -m "Describe brevemente el cambio"`.
5. Si trabajas en una rama de feature, súbela con `git push origin nombre-de-rama`. Luego abre un pull request y solicita revisión.
6. Una vez aprobado, fusiona la rama en `main` y publica los cambios definitivos con `git push origin main`.
7. Opcional: etiqueta versiones relevantes con `git tag vX.Y.Z` y súbelas con `git push origin --tags`.

Este flujo garantiza que GitHub refleje siempre la versión más actualizada y probada de CogniCore.

### Verificación integral en un solo comando

Cuando quieras asegurarte de que todo funciona antes de compartir cambios, ejecuta el asistente `tools/run_full_checks.py`:

```bash
./tools/run_full_checks.py
```

El script reúne las ejecuciones de `pytest`, la demo de resúmenes y la compilación del backend. Añade la comprobación del
actualizador de ramas para verificar que el CLI auxiliar siga disponible. Si en algún contexto no quieres lanzar ese último paso,
puedes hacerlo con:

```bash
./tools/run_full_checks.py --skip-update-helper
```

### Automatizar la actualización de ramas

Si quieres ejecutar todos los pasos de sincronización con un solo comando, utiliza el asistente incluido en `tools/update_branch.py`:

```bash
./tools/update_branch.py --branch main --sync-branch mi-rama
```

El script descargará los cambios de `origin`, actualizará `main` y devolverá la vista a tu rama original (`mi-rama` en el ejemplo). También puedes lanzarlo como módulo con `python -m tools.update_branch` si prefieres mantener el intérprete explícito. Personaliza el remoto con `--remote`, elige `--strategy rebase` o permite ejecutar con cambios sin confirmar usando `--allow-dirty`.

> 📚 Si necesitas una guía paso a paso para traer commits del remoto y actualizar tus ramas locales, consulta [`docs/update_branch.md`](docs/update_branch.md).

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

La interfaz se servirá en `http://localhost:5173`. El proxy de desarrollo redirige las peticiones `/api` hacia el backend. El 
dashboard abre directamente en la pestaña de **Tareas**, listo para consultar métricas, pomodoros, calendario y recordatorios sin pasos adicionales.

### Vista previa estática del diseño estudiantil

Si solo necesitas revisar la propuesta visual sin compilar la app de React, abre el archivo
`frontend/preview/index.html` en tu navegador. La maqueta refleja el estilo estudiantil y
colorido de CogniCore, con pestañas dedicadas para tareas, Pomodoro, calendario semanal,
recordatorios, resúmenes y un tablero de ideas rápidas.

## Funcionalidades principales

- **Pestañas por flujo**: tareas, Pomodoro, calendario semanal, recordatorios, resúmenes e ideas rápidas para evitar sobrecarga.
- **Organizador semanal estilo Outlook** para crear, listar y eliminar bloques de horario estudiantil junto a las tareas con fecha.
- **Gestión de tareas y recordatorios** con datos persistidos en archivos JSON y actualizaciones en tiempo real.
- **Generador de resúmenes** a partir de texto pegado o archivos PDF/DOCX/PPTX/TXT, con pestañas para leer el resumen y el texto original completo.
- **Palabras clave destacadas** para ayudar a la memorización.
- **Temporizador de enfoque** con notificación al completar la sesión.
- **Lectura en voz alta** usando la API de síntesis de voz del navegador.
- **Interfaz colorida e inclusiva**, con lenguaje amable, jerarquía visual clara y accesibilidad básica.

## Notas sobre accesibilidad

- Controles con `aria-label` y mensajes descriptivos.
- Botones y campos con estados de foco visibles.
- Posibilidad de escuchar resúmenes directamente desde el navegador.

## Endpoints relevantes

- `GET /tasks`, `POST /tasks`, `PATCH /tasks/{id}/status`
- `GET /reminders`, `POST /reminders`
- `GET /schedule`, `POST /schedule`, `DELETE /schedule/{id}`
- `GET /focus-sessions`, `POST /focus-sessions`
- `POST /summary` (archivo o texto)
- `POST /summary/text` (solo texto)
- `GET /dashboard`

## Licencia

Uso educativo.
