"""Pruebas para el asistente de actualización de ramas."""
from __future__ import annotations

import subprocess

import pytest

from tools.update_branch import BranchUpdateError, BranchUpdateResult, GitRunner, update_branch


class FakeGitRunner(GitRunner):
    """Simulates git responses so we can validate orchestration logic."""

    def __init__(
        self,
        *,
        current_branch: str = "feature/conicore",
        existing_branches: set[str] | None = None,
        remote_branches: set[str] | None = None,
        dirty: bool = False,
    ) -> None:
        self.current_branch = current_branch
        self.existing_branches = existing_branches or {"main", current_branch}
        self.remote_branches = remote_branches or {"origin/main"}
        self.dirty = dirty
        self.stash_stack: list[bool] = []
        self.commands: list[tuple[tuple[str, ...], bool]] = []

    def run(
        self,
        args,
        *,
        capture_output: bool = False,
        text: bool = True,
        check: bool = True,
    ) -> subprocess.CompletedProcess:
        command = tuple(args)
        self.commands.append((command, capture_output))

        if command == ("rev-parse", "--is-inside-work-tree"):
            return subprocess.CompletedProcess(command, 0, stdout="true\n")
        if command == ("status", "--porcelain"):
            stdout = "M README.md\n" if self.dirty else ""
            return subprocess.CompletedProcess(command, 0, stdout=stdout)
        if command == ("rev-parse", "--abbrev-ref", "HEAD"):
            return subprocess.CompletedProcess(command, 0, stdout=f"{self.current_branch}\n")
        if command[:2] == ("rev-parse", "--verify"):
            branch = command[2]
            if branch in self.existing_branches:
                return subprocess.CompletedProcess(command, 0, stdout=f"{branch}\n")
            raise subprocess.CalledProcessError(1, ("git", *command))
        if command[:1] == ("fetch",):
            return subprocess.CompletedProcess(command, 0, stdout="")
        if command[:1] == ("switch",):
            if "--track" in command:
                remote_ref = command[-1]
                if remote_ref not in self.remote_branches:
                    raise subprocess.CalledProcessError(1, ("git", *command))
                branch_name = remote_ref.split("/", 1)[1]
                self.existing_branches.add(branch_name)
                self.current_branch = branch_name
            else:
                branch_name = command[1]
                if branch_name not in self.existing_branches:
                    raise subprocess.CalledProcessError(1, ("git", *command))
                self.current_branch = branch_name
            return subprocess.CompletedProcess(command, 0, stdout="")
        if command[:1] == ("merge",):
            return subprocess.CompletedProcess(command, 0, stdout="")
        if command[:2] == ("pull", "--rebase"):
            return subprocess.CompletedProcess(command, 0, stdout="")
        if command[:2] == ("stash", "push"):
            if self.dirty:
                self.stash_stack.append(True)
                self.dirty = False
                return subprocess.CompletedProcess(command, 0, stdout="Saved working directory\n")
            return subprocess.CompletedProcess(command, 0, stdout="No local changes to save\n")
        if command[:2] == ("stash", "pop"):
            if self.stash_stack:
                self.stash_stack.pop()
                self.dirty = True
                return subprocess.CompletedProcess(command, 0, stdout="Restored stash\n")
            return subprocess.CompletedProcess(command, 1, stdout="", stderr="No stash entries found.\n")

        raise AssertionError(f"Unexpected git command: {command}")


def test_updates_branch_and_restores_context():
    runner = FakeGitRunner()
    result = update_branch(
        "main",
        remote="origin",
        strategy="merge",
        sync_branch="feature/conicore",
        runner=runner,
    )

    assert isinstance(result, BranchUpdateResult)
    assert result.updated_branch == "main"
    assert result.sync_branch == "feature/conicore"
    assert result.restored_branch == "feature/conicore"

    commands = [cmd for cmd, _ in runner.commands]
    assert ("fetch", "origin") in commands
    assert ("switch", "main") in commands
    assert ("merge", "origin/main") in commands
    assert ("merge", "main") in commands


def test_requires_clean_tree_by_default():
    runner = FakeGitRunner(dirty=True)
    with pytest.raises(BranchUpdateError):
        update_branch("main", runner=runner)


def test_tracks_branch_when_missing_locally():
    runner = FakeGitRunner(existing_branches={"feature/conicore"})
    result = update_branch("main", runner=runner)

    assert result.updated_branch == "main"
    commands = [cmd for cmd, _ in runner.commands]
    assert ("switch", "--track", "origin/main") in commands


def test_allows_rebase_strategy():
    runner = FakeGitRunner()
    result = update_branch("main", strategy="rebase", runner=runner)

    assert result.updated_branch == "main"
    commands = [cmd for cmd, _ in runner.commands]
    assert ("pull", "--rebase", "origin", "main") in commands


def test_auto_stash_temporarily_cleans_tree():
    runner = FakeGitRunner(dirty=True)
    result = update_branch("main", runner=runner, auto_stash=True)

    assert result.updated_branch == "main"
    assert result.restored_branch == "feature/conicore"

    commands = [cmd for cmd, _ in runner.commands]
    assert ("stash", "push", "--include-untracked", "--message", "CogniCore auto-stash") in commands
    assert ("stash", "pop") in commands
    assert commands.index(("switch", "feature/conicore")) < commands.index(("stash", "pop"))
    assert runner.dirty is True


def test_restores_branch_even_when_sync_branch_missing():
    runner = FakeGitRunner()

    with pytest.raises(BranchUpdateError):
        update_branch("main", runner=runner, sync_branch="feature/missing")

    commands = [cmd for cmd, _ in runner.commands]
    assert commands.count(("switch", "main")) == 1
    # El proceso debe volver al contexto original aunque falle la sincronización.
    assert commands[-1] == ("switch", "feature/conicore")


def test_auto_stash_restores_changes_even_when_error_occurs():
    runner = FakeGitRunner(dirty=True)

    with pytest.raises(BranchUpdateError):
        update_branch("main", runner=runner, auto_stash=True, sync_branch="feature/missing")

    commands = [cmd for cmd, _ in runner.commands]
    assert ("stash", "push", "--include-untracked", "--message", "CogniCore auto-stash") in commands
    assert commands[-2] == ("switch", "feature/conicore")
    assert commands[-1] == ("stash", "pop")
    assert runner.dirty is True
