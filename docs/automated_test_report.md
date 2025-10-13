# Informe de pruebas automatizadas

Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Se ejecutó el comando `./tools/run_full_checks.py`, que encadena:

- `pytest`
- `python backend/demo_summary.py`
- `python -m compileall backend/app`
- `python -m tools.update_branch --help`

Todas las verificaciones finalizaron correctamente.
