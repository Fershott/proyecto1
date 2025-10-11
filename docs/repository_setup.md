# Checklist para preparar el repositorio

Esta guía rápida te ayuda a dejar el proyecto listo antes de publicarlo o compartirlo con tu equipo.

## 1. Verificación de dependencias

- **Python**: crea un entorno virtual y ejecuta `pip install -r backend/requirements.txt`.
- **Node.js**: desde `frontend/`, instala dependencias con `npm install`.
- Registra cualquier dependencia adicional que se necesite en los archivos correspondientes (`requirements.txt` o `package.json`).

## 2. Ejecutar pruebas y utilidades de control de calidad

- Corre la suite de pruebas automatizadas con `pytest`.
- Compila los módulos de Python para detectar errores de sintaxis con `python -m compileall backend/app`.
- Valida el motor de resúmenes sin levantar la API con `python backend/demo_summary.py`.
- (Opcional) Si habilitas herramientas adicionales, documenta los comandos para linters o formateadores.

## 3. Revisar la interfaz

- Levanta el frontend con `npm run dev` y revisa que las pestañas (Planificador, Recordatorios, Gestor de resúmenes) funcionen como en la vista previa.
- Abre `frontend/preview/index.html` directamente en el navegador para confirmar que la maqueta estática coincida con la versión interactiva.

## 4. Confirmar datos de ejemplo

- Revisa los archivos JSON en `backend/app/data/` para asegurarte de que contienen información de ejemplo coherente o bórralos si prefieres iniciar en blanco.
- Documenta cualquier dato sensible que no deba subir al repositorio y añade la regla correspondiente al `.gitignore` si es necesario.

## 5. Preparar la documentación

- Actualiza el `README.md` con instrucciones específicas de despliegue si tu equipo lo requiere.
- Añade capturas de pantalla o enlaces a maquetas adicionales en la carpeta `docs/` para futuras referencias.
- Verifica que la revisión de requisitos en `docs/requirements_review.md` siga vigente tras tus cambios.

## 6. Configurar el control de versiones

- Ejecuta `git status` para comprobar que sólo se versionan los archivos esperados.
- Realiza commits pequeños y descriptivos, y usa ramas para nuevas funcionalidades.
- Configura flujos de trabajo CI/CD o hooks de validación si el proyecto lo necesita.

## 7. Publicar y actualizar en GitHub

- Vincula el repositorio local a GitHub con `git remote add origin <url>` si aún no lo has hecho.
- Sube la rama principal con `git push -u origin main`.
- Para cambios posteriores:
  - Valida el estado del código con `pytest`, `python backend/demo_summary.py` y `python -m compileall backend/app`.
  - Revisa los archivos modificados con `git status` y `git diff`.
  - Realiza commits descriptivos y súbelos con `git push`.
  - Abre un pull request para revisar y fusionar los cambios cuando corresponda.

Siguiendo esta checklist tendrás un repositorio organizado, reproducible y listo para colaboración.
