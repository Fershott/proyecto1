"""Utilities and helper scripts for maintaining CogniCore."""

from importlib import import_module
from typing import Any

__all__ = [
    "BranchUpdateError",
    "BranchUpdateResult",
    "GitRunner",
    "main",
    "parse_args",
    "update_branch",
]


def __getattr__(name: str) -> Any:  # pragma: no cover - trivial delegation
    if name in __all__:
        module = import_module(".update_branch", __name__)
        return getattr(module, name)
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
