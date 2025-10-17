# CogniCore – Vista del diseño actual

Este documento resume cómo visualizar el diseño actual de CogniCore desde las maquetas estáticas incluidas en el repositorio.

## Maqueta del dashboard
- **Ruta:** `frontend/preview/index.html`
- **Descripción:** muestra las pestañas de Tareas, Pomodoro, Calendario semanal, Recordatorios y Resúmenes con la paleta estudiantil y los componentes responsivos que se ajustan a escritorio.

## Maqueta del login
- **Ruta:** `frontend/preview/login.html`
- **Descripción:** ilustra la pantalla inicial con tarjetas dedicadas a Google y Microsoft, destacando las opciones de iniciar sesión o crear cuenta y el aviso del saludo personalizado posterior al login.

## Cómo previsualizar
1. Ubícate en la carpeta `frontend/preview`.
2. Lanza un servidor local con `python -m http.server 8000`.
3. Abre el navegador en `http://localhost:8000/index.html` para el dashboard o `http://localhost:8000/login.html` para el login.

Ambas maquetas utilizan las mismas hojas de estilo que la aplicación React y permiten revisar rápidamente la estructura visual sin compilar el frontend completo.
