#!/usr/bin/env python3
"""Asistente de línea de comandos para sincronizar ramas de CogniCore."""
from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from typing import Iterable, Optional


class BranchUpdateError(RuntimeError):
    """Señala un problema recuperable al actualizar la rama."""


@dataclass
class BranchUpdateResult:
    """Describe los resultados de una ejecución del actualizador."""

    updated_branch: str
    sync_branch: Optional[str]
    restored_branch: Optional[str]


def _merge_errors(existing: Optional[BranchUpdateError], message: str) -> BranchUpdateError:
    """Combina mensajes de error manteniendo el detalle anterior."""

    if existing is None:
        return BranchUpdateError(message)
    return BranchUpdateError(f"{existing}\nAdemás: {message}")


class GitRunner:
    """Capa delgada sobre los comandos ``git`` para facilitar las pruebas."""

    def run(
        self,
        args: Iterable[str],
        *,
        capture_output: bool = False,
        text: bool = True,
        check: bool = True,
    ) -> subprocess.CompletedProcess:
        command = ["git", *args]
        return subprocess.run(command, capture_output=capture_output, text=text, check=check)


def _ensure_git_repo(runner: GitRunner) -> None:
    """Verifica que estemos dentro de un repositorio de Git antes de continuar."""
    result = runner.run(["rev-parse", "--is-inside-work-tree"], capture_output=True)
    if result.stdout.strip() != "true":
        raise BranchUpdateError("Este script debe ejecutarse dentro de un repositorio de Git.")


def _working_tree_dirty(runner: GitRunner) -> bool:
    """Devuelve ``True`` si existen cambios sin confirmar en el árbol de trabajo."""
    status = runner.run(["status", "--porcelain"], capture_output=True)
    return bool(status.stdout.strip())


def _ensure_clean_tree(runner: GitRunner) -> None:
    """Impide continuar si el árbol de trabajo tiene cambios sin confirmar."""
    if _working_tree_dirty(runner):
        raise BranchUpdateError(
            "El árbol de trabajo tiene cambios sin comprometer. Confirma, descarta o guarda en 'stash' antes de continuar."
        )


def _get_current_branch(runner: GitRunner) -> Optional[str]:
    """Obtiene el nombre de la rama actual o ``None`` en modo detached HEAD."""
    result = runner.run(["rev-parse", "--abbrev-ref", "HEAD"], capture_output=True)
    branch = result.stdout.strip()
    return None if branch == "HEAD" else branch


def _branch_exists(runner: GitRunner, branch: str) -> bool:
    """Comprueba si una rama existe en el repositorio local."""
    try:
        runner.run(["rev-parse", "--verify", branch], capture_output=True)
    except subprocess.CalledProcessError:
        return False
    return True


def _switch_branch(runner: GitRunner, branch: str) -> None:
    """Cambia a la rama indicada usando ``git switch``."""
    runner.run(["switch", branch])


def _track_remote_branch(runner: GitRunner, remote: str, branch: str) -> None:
    """Crea una rama local que rastrea a su contraparte remota."""
    runner.run(["switch", "--track", f"{remote}/{branch}"])


def _fetch_remote(runner: GitRunner, remote: str) -> None:
    """Descarga las referencias más recientes del remoto indicado."""
    runner.run(["fetch", remote])


def _integrate_updates(runner: GitRunner, remote: str, branch: str, strategy: str) -> None:
    """Aplica los cambios del remoto ya sea mediante *merge* o *rebase*."""
    if strategy == "merge":
        runner.run(["merge", f"{remote}/{branch}"])
    else:
        runner.run(["pull", "--rebase", remote, branch])


def update_branch(
    branch: str = "main",
    *,
    remote: str = "origin",
    strategy: str = "merge",
    sync_branch: Optional[str] = None,
    allow_dirty: bool = False,
    auto_stash: bool = False,
    restore_original: bool = True,
    runner: Optional[GitRunner] = None,
) -> BranchUpdateResult:
    """Sincroniza ``branch`` con ``remote`` y opcionalmente mezcla en ``sync_branch``.

    Parameters
    ----------
    branch:
        Rama local que se desea actualizar.
    remote:
        Nombre del remoto que hospeda la rama.
    strategy:
        ``"merge"`` o ``"rebase"`` según la preferencia del equipo.
    sync_branch:
        Rama adicional que recibirá los cambios recién actualizados.
    allow_dirty:
        Omite la verificación de árbol limpio cuando es ``True``.
    auto_stash:
        Si es ``True`` guarda temporalmente los cambios locales (incluyendo archivos sin
        seguimiento) para poder ejecutar la actualización y los restaura al finalizar.
    restore_original:
        Si es ``True`` la herramienta vuelve a la rama original al finalizar.
    runner:
        Implementación personalizada de :class:`GitRunner` usada en pruebas.
    """

    if strategy not in {"merge", "rebase"}:
        raise BranchUpdateError("La estrategia debe ser 'merge' o 'rebase'.")

    git_runner = runner or GitRunner()

    repo_verified = False
    starting_branch: Optional[str] = None
    restored_branch: Optional[str] = None
    stashed_changes = False
    error: Optional[BranchUpdateError] = None

    try:
        _ensure_git_repo(git_runner)
        repo_verified = True

        dirty = _working_tree_dirty(git_runner)
        if dirty and auto_stash:
            git_runner.run(
                ["stash", "push", "--include-untracked", "--message", "CogniCore auto-stash"],
                capture_output=True,
            )
            stashed_changes = True
        elif dirty and not allow_dirty:
            raise BranchUpdateError(
                "El árbol de trabajo tiene cambios sin comprometer. Confirma, descarta o guarda en 'stash' antes de continuar."
            )

        starting_branch = _get_current_branch(git_runner)

        _fetch_remote(git_runner, remote)

        if _branch_exists(git_runner, branch):
            _switch_branch(git_runner, branch)
        else:
            _track_remote_branch(git_runner, remote, branch)

        _integrate_updates(git_runner, remote, branch, strategy)

        if sync_branch and sync_branch != branch:
            if not _branch_exists(git_runner, sync_branch):
                raise BranchUpdateError(
                    f"La rama secundaria '{sync_branch}' no existe. Créala antes de sincronizarla."
                )
            _switch_branch(git_runner, sync_branch)
            git_runner.run(["merge", branch])

    except BranchUpdateError as exc:
        error = exc
    except subprocess.CalledProcessError as exc:  # pragma: no cover - handled in tests via fake runner
        cmd = " ".join(str(part) for part in exc.cmd)
        error = BranchUpdateError(f"Error al ejecutar '{cmd}'. Código de salida: {exc.returncode}")

    finally:
        if repo_verified and restore_original:
            try:
                current_branch = _get_current_branch(git_runner)
            except subprocess.CalledProcessError:
                current_branch = None
                error = _merge_errors(
                    error,
                    "No se pudo determinar la rama actual al finalizar el proceso.",
                )

            if starting_branch and (current_branch is None or current_branch != starting_branch):
                try:
                    _switch_branch(git_runner, starting_branch)
                    current_branch = starting_branch
                except subprocess.CalledProcessError:
                    error = _merge_errors(
                        error,
                        f"No se pudo volver a la rama original '{starting_branch}'.",
                    )

            restored_branch = current_branch or starting_branch
        elif repo_verified:
            try:
                restored_branch = _get_current_branch(git_runner)
            except subprocess.CalledProcessError:
                restored_branch = None
        else:
            restored_branch = starting_branch

        if stashed_changes and repo_verified:
            pop_result = git_runner.run(["stash", "pop"], capture_output=True, check=False)
            if pop_result.returncode != 0:
                message = (
                    pop_result.stderr.strip()
                    or pop_result.stdout.strip()
                    or "No se pudo restaurar el stash creado automáticamente."
                )
                error = _merge_errors(error, message)
        elif stashed_changes and not repo_verified:
            error = _merge_errors(
                error,
                "No se pudo restaurar los cambios guardados en stash porque el repositorio no quedó verificado.",
            )

    if error is not None:
        raise error

    return BranchUpdateResult(updated_branch=branch, sync_branch=sync_branch, restored_branch=restored_branch)


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sincroniza una rama local con su remoto y opcionalmente actualiza tu rama de trabajo."
    )
    parser.add_argument("--branch", default="main", help="Nombre de la rama que quieres actualizar. (default: main)")
    parser.add_argument("--remote", default="origin", help="Nombre del remoto. (default: origin)")
    parser.add_argument(
        "--strategy",
        choices=("merge", "rebase"),
        default="merge",
        help="Cómo incorporar los cambios remotos. (default: merge)",
    )
    parser.add_argument(
        "--sync-branch",
        dest="sync_branch",
        help="Rama secundaria que debe recibir el merge desde la rama actualizada.",
    )
    parser.add_argument(
        "--allow-dirty",
        action="store_true",
        help="Permite ejecutar con cambios sin comprometer (no recomendado).",
    )
    parser.add_argument(
        "--auto-stash",
        action="store_true",
        help="Guarda temporalmente cambios locales para poder actualizar aunque el árbol esté sucio.",
    )
    parser.add_argument(
        "--no-restore",
        action="store_true",
        help="No volver a la rama original al final del proceso.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv)
    try:
        result = update_branch(
            args.branch,
            remote=args.remote,
            strategy=args.strategy,
            sync_branch=args.sync_branch,
            allow_dirty=args.allow_dirty,
            auto_stash=args.auto_stash,
            restore_original=not args.no_restore,
        )
    except BranchUpdateError as exc:
        print(f"[CogniCore] No se pudo completar la actualización: {exc}", file=sys.stderr)
        return 1

    message_parts = [f"La rama '{result.updated_branch}' quedó sincronizada con '{args.remote}'."]
    if result.sync_branch and result.sync_branch != result.updated_branch:
        message_parts.append(f"También se fusionó en '{result.sync_branch}'.")
    if result.restored_branch:
        message_parts.append(f"Contexto final: '{result.restored_branch}'.")
    print(" ".join(message_parts))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    sys.exit(main())
