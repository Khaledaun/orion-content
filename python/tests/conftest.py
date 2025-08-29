import os
import sys
from pathlib import Path
import pytest

# Ensure ORION_CONSOLE_TOKEN exists for imports that validate config
os.environ.setdefault("ORION_CONSOLE_TOKEN", "test-token")

# Ensure package root ("python/") is on sys.path for absolute imports like `from orion...`
PY_ROOT = Path(__file__).resolve().parents[1]  # .../python
if str(PY_ROOT) not in sys.path:
    sys.path.insert(0, str(PY_ROOT))

@pytest.fixture(autouse=True)
def _no_network(monkeypatch):
    """
    Optional: prevent accidental live network during unit tests.
    Comment out if your tests rely on real HTTP.
    """
    import socket
    monkeypatch.setattr(socket, "getaddrinfo", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("No network in tests")))
