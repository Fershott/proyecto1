#!/usr/bin/env python3
"""Ejecuta verificaciones automáticas y recuerda la ruta de la maqueta."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREVIEW_PATH = ROOT / "frontend" / "preview" / "index.html"


def main() -> int:
    command = [sys.executable, "-m", "tools.run_full_checks"]
    print("Iniciando comprobaciones automáticas de CogniCore...", flush=True)
    result = subprocess.run(command, cwd=ROOT)
    if result.returncode != 0:
        return result.returncode

    print(
        "\nEl diseño está listo para verse en la maqueta estática:\n"
        f"  {PREVIEW_PATH}\n"
        "Abre ese archivo en tu navegador para inspeccionar cada pestaña.",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
