#!/usr/bin/env python3
"""Ejecuta en secuencia las validaciones principales del proyecto.

Este asistente agrupa los comandos que solemos usar para verificar que
CogniCore funciona correctamente antes de compartir cambios. Replica los
pasos manuales de nuestras listas de verificación tipo CI y ofrece un punto
de entrada único para validar el repositorio localmente.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DEFAULT_COMMANDS = [
    [sys.executable, "-m", "pytest"],
    [sys.executable, "backend/demo_summary.py"],
    [sys.executable, "-m", "compileall", "backend/app"],
]

UPDATE_HELPER_COMMAND = [sys.executable, "-m", "tools.update_branch", "--help"]


def run_command(command: list[str]) -> int:
    """Execute a command relative to the project root."""
    print(f"→ Ejecutando: {' '.join(command)}", flush=True)
    result = subprocess.run(command, cwd=ROOT)
    if result.returncode != 0:
        print(
            f"✖️  El comando {' '.join(command)} finalizó con código {result.returncode}.",
            file=sys.stderr,
        )
        return result.returncode
    print(f"✓ Listo: {' '.join(command)}\n", flush=True)
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ejecuta la batería de comprobaciones de CogniCore en una sola orden.",
    )
    parser.add_argument(
        "--skip-update-helper",
        action="store_true",
        help="Omitir la verificación del asistente de actualización de ramas.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    for command in DEFAULT_COMMANDS:
        code = run_command(command)
        if code != 0:
            return code

    if not args.skip_update_helper:
        code = run_command(UPDATE_HELPER_COMMAND)
        if code != 0:
            return code

    print("Todas las comprobaciones se ejecutaron correctamente.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
