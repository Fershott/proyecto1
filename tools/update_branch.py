#!/usr/bin/env python3
"""Command-line helper to keep CogniCore branches in sync with a remote."""
from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from typing import Iterable, Optional


class BranchUpdateError(RuntimeError):
    """Raised when the branch updater encounters a recoverable problem."""


@dataclass
class BranchUpdateResult:
    """Information about what the updater touched during execution."""

    updated_branch: str
    sync_branch: Optional[str]
    restored_branch: Optional[str]


class GitRunner:
    """Thin wrapper around ``git`` commands to simplify testing."""

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
    result = runner.run(["rev-parse", "--is-inside-work-tree"], capture_output=True)
    if result.stdout.strip() != "true":
        raise BranchUpdateError("Este script debe ejecutarse dentro de un repositorio de Git.")


def _ensure_clean_tree(runner: GitRunner) -> None:
    status = runner.run(["status", "--porcelain"], capture_output=True)
    if status.stdout.strip():
        raise BranchUpdateError(
            "El árbol de trabajo tiene cambios sin comprometer. Confirma, descarta o guarda en 'stash' antes de continuar."
        )


def _get_current_branch(runner: GitRunner) -> Optional[str]:
    result = runner.run(["rev-parse", "--abbrev-ref", "HEAD"], capture_output=True)
    branch = result.stdout.strip()
    return None if branch == "HEAD" else branch


def _branch_exists(runner: GitRunner, branch: str) -> bool:
    try:
        runner.run(["rev-parse", "--verify", branch], capture_output=True)
    except subprocess.CalledProcessError:
        return False
    return True


def _switch_branch(runner: GitRunner, branch: str) -> None:
    runner.run(["switch", branch])


def _track_remote_branch(runner: GitRunner, remote: str, branch: str) -> None:
    runner.run(["switch", "--track", f"{remote}/{branch}"])


def _fetch_remote(runner: GitRunner, remote: str) -> None:
    runner.run(["fetch", remote])


def _integrate_updates(runner: GitRunner, remote: str, branch: str, strategy: str) -> None:
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
    restore_original: bool = True,
    runner: Optional[GitRunner] = None,
) -> BranchUpdateResult:
    """Synchronize ``branch`` with ``remote`` and optionally merge it into ``sync_branch``.

    Parameters
    ----------
    branch:
        Local branch to update.
    remote:
        Remote name that hosts the branch.
    strategy:
        Either ``"merge"`` or ``"rebase"``.
    sync_branch:
        Optional secondary branch that should receive the freshly updated ``branch``.
    allow_dirty:
        Skip the clean-tree check when ``True``.
    restore_original:
        When ``True`` the updater switches de vuelta a la rama original al terminar.
    runner:
        Custom :class:`GitRunner` implementation used for testing.
    """

    if strategy not in {"merge", "rebase"}:
        raise BranchUpdateError("La estrategia debe ser 'merge' o 'rebase'.")

    git_runner = runner or GitRunner()

    try:
        _ensure_git_repo(git_runner)
        if not allow_dirty:
            _ensure_clean_tree(git_runner)
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

        restored_branch: Optional[str] = None
        if restore_original:
            current_branch = _get_current_branch(git_runner)
            if starting_branch and current_branch != starting_branch:
                _switch_branch(git_runner, starting_branch)
                restored_branch = starting_branch
            else:
                restored_branch = current_branch
        else:
            restored_branch = _get_current_branch(git_runner)

    except subprocess.CalledProcessError as exc:  # pragma: no cover - handled in tests via fake runner
        cmd = " ".join(str(part) for part in exc.cmd)
        raise BranchUpdateError(f"Error al ejecutar '{cmd}'. Código de salida: {exc.returncode}") from exc

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
