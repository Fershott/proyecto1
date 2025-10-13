# Informe de pruebas automatizadas

Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Se ejecutó el comando `./tools/run_full_checks.py`, que encadena:

- `pytest`
- `python backend/demo_summary.py`
- `python -m compileall backend/app`
- `python -m tools.update_branch --help`

Todas las verificaciones finalizaron correctamente.

Para revisar rápidamente la interfaz tras las pruebas, también está disponible `./tools/run_preview_and_checks.py`, el cual ejecuta la misma secuencia y luego indica la ruta del archivo `frontend/preview/index.html` donde se visualiza el diseño.
