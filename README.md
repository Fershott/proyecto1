# CogniCore

CogniCore es una plataforma web inclusiva para la organización académica universitaria con énfasis en estudiantes con TDAH u otras neurodivergencias. El proyecto combina una API en Python (FastAPI) y una interfaz React pensada para guiar paso a paso al usuario con un estilo estudiantil, colorido y accesible. La sesión se inicia desde un portal dedicado de Google o Microsoft (con vista previa en `frontend/preview/login.html`) y, tras autenticarse, el tablero muestra pestañas independientes para tareas, pomodoro, calendario, recordatorios, resúmenes e ideas rápidas con la burbuja de perfil y el selector de modo oscuro siempre visibles.

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
      sessions.json
      users.json
      outbox/
  requirements.txt
frontend/
  index.html
  package.json
  vite.config.js
  src/
    main.jsx
    App.jsx
    components/
      AuthGateway.jsx
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

Si también quieres abrir rápidamente la maqueta estática después de las pruebas, ejecuta el asistente combinado:

```bash
./tools/run_preview_and_checks.py
```

El script lanzará las mismas comprobaciones automáticas y, al finalizar, te indicará la ruta exacta del archivo `frontend/preview/index.html` para que puedas revisar el diseño de CogniCore en tu navegador.

### Automatizar la actualización de ramas

Si quieres ejecutar todos los pasos de sincronización con un solo comando, utiliza el asistente incluido en `tools/update_branch.py`:

```bash
./tools/update_branch.py --branch main --sync-branch mi-rama
```

El script descargará los cambios de `origin`, actualizará `main` y devolverá la vista a tu rama original (`mi-rama` en el ejemplo), incluso si ocurre algún error durante la sincronización. También puedes lanzarlo como módulo con `python -m tools.update_branch` si prefieres mantener el intérprete explícito. Personaliza el remoto con `--remote`, elige `--strategy rebase`, permite ejecutar con cambios sin confirmar usando `--allow-dirty` o guarda todo temporalmente con `--auto-stash`, que ahora restaura la rama inicial antes de aplicar el `stash` para evitar que los cambios vuelvan a la rama equivocada.

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

### Configurar el envío de correos de bienvenida y recordatorios

Cuando un estudiante se registra por primera vez, CogniCore envía un correo de confirmación y cada recordatorio programado o
actualizado genera un aviso adicional por correo. De forma predeterminada los mensajes se guardan en
`backend/app/data/outbox/` para que puedas revisarlos sin credenciales externas. Si quieres enviar los correos reales desde
Gmail u Outlook, define estas variables de entorno antes de arrancar FastAPI:

```bash
export COGNICORE_SMTP_HOST="smtp.gmail.com"
export COGNICORE_SMTP_PORT="587"
export COGNICORE_SMTP_USER="tu_correo@dominio.com"
export COGNICORE_SMTP_PASSWORD="tu_contraseña_o_token"
export COGNICORE_EMAIL_FROM="notificaciones@cognicore.app"  # Opcional
```

Con esa configuración los endpoints de registro y recordatorios enviarán los correos usando TLS. Si no defines
`COGNICORE_SMTP_HOST`, los mensajes seguirán apareciendo en la carpeta `outbox` para desarrollo local.

### Autenticación con Google y Microsoft

CogniCore utiliza los portales oficiales de Google y Microsoft mediante OAuth 2.0. Para habilitar el flujo completo define las
siguientes variables de entorno antes de iniciar la API:

```bash
export COGNICORE_FRONTEND_URL="http://localhost:5173"  # URL a la que se redirige tras iniciar sesión
export COGNICORE_GOOGLE_CLIENT_ID="tu_client_id_de_google"
export COGNICORE_GOOGLE_CLIENT_SECRET="tu_client_secret_de_google"
export COGNICORE_GOOGLE_REDIRECT_URI="http://localhost:8000/auth/google/callback"
export COGNICORE_MICROSOFT_CLIENT_ID="tu_client_id_de_microsoft"
export COGNICORE_MICROSOFT_CLIENT_SECRET="tu_client_secret_de_microsoft"
export COGNICORE_MICROSOFT_REDIRECT_URI="http://localhost:8000/auth/microsoft/callback"
```

Con la configuración anterior, los botones de la pestaña “Acceso” redirigen a los endpoints `/auth/<proveedor>/start`, que
envían al usuario al consentimiento oficial. Tras autenticarse, los proveedores regresan a `/auth/<proveedor>/callback`, donde
CogniCore valida el dominio del correo, crea o recupera la sesión, envía el correo de bienvenida y redirige al frontend con el
estado `auth=registered` o `auth=signed-in`. El modo de pruebas puede activarse estableciendo `COGNICORE_OAUTH_MODE=stub` para
evitar llamadas externas (se usa en la suite de tests).

Los endpoints REST tradicionales (`/auth/<proveedor>/register`, `/auth/<proveedor>/login` y `/register`) se mantienen para
compatibilidad con clientes anteriores y con integraciones no basadas en el navegador.

### Recordatorios editables con avisos por correo

- Cada tarjeta de recordatorio puede editarse desde la interfaz y el backend expone `PATCH /reminders/{id}` para modificar
  título, notas, hora o tipo. El proveedor (`delivery_provider`) siempre coincide con la sesión activa para mantener la
  sincronización con Gmail u Outlook.
- Cada creación o actualización genera un correo en el `outbox` (o en tu SMTP configurado) con la información del recordatorio.

### Pomodoro con alarma accesible

El componente `FocusTimer` ahora emite un sonido breve al finalizar cada ciclo y muestra un aviso visual. El audio se genera
con la Web Audio API después de que la persona usuaria pulse “Iniciar”, asegurando compatibilidad con las restricciones de
reproducción automática del navegador.

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

La interfaz se servirá en `http://localhost:5173`. El proxy de desarrollo redirige las peticiones `/api` hacia el backend. La aplicación abre en la pestaña de **Acceso**, donde puedes registrarte por primera vez con Google o Microsoft: se enviará un correo de bienvenida, se habilitarán las pestañas de tareas, pomodoro, calendario, recordatorios y resúmenes, y verás la burbuja de perfil para cerrar sesión o activar el modo oscuro.

> **¿Y si el backend no responde?** CogniCore detecta la desconexión y activa un modo de demostración accesible que mantiene visible el diseño completo. Podrás explorar las pestañas, crear recordatorios y horarios a nivel local y generar un resumen de ejemplo mientras restableces el servidor.

### Vista previa estática del diseño estudiantil

Si solo necesitas revisar la propuesta visual sin compilar la app de React, abre el archivo
`frontend/preview/index.html` en tu navegador. La maqueta refleja el estilo estudiantil y
colorido de CogniCore, incluyendo la pestaña de acceso para Google/Microsoft y las vistas
dedicadas a tareas, Pomodoro, calendario semanal, recordatorios, resúmenes y un tablero de ideas rápidas.

Si solo deseas revisar la pantalla de acceso en alta fidelidad, abre
`frontend/preview/login.html`. Esta maqueta aislada destaca la tarjeta de proveedores de
Google y Microsoft, los mensajes sobre las notificaciones por correo y el relato visual
que orienta al estudiante antes de entrar al dashboard.

## Funcionalidades principales

- **Pestañas por flujo**: tareas, Pomodoro, calendario semanal, recordatorios, resúmenes e ideas rápidas para evitar sobrecarga.
- **Acceso con Google o Microsoft** para registrarse, recibir un correo de confirmación, activar las notificaciones vía Gmail u Outlook y gestionar la burbuja de perfil con cierre de sesión y modo oscuro (con modo demo cuando el backend no responde).
- **Organizador semanal estructurado** para crear, listar y eliminar bloques de horario estudiantil junto a las tareas con fecha.
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
