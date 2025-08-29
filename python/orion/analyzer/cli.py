#!/usr/bin/env python3
"""Clean CLI launcher to avoid RuntimeWarnings and support direct execution."""

from __future__ import annotations
import os, sys

# If run as a script (no package), add package root to sys.path and set package
if __package__ in (None, ""):
    PKG_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../orion
    sys.path.insert(0, os.path.dirname(PKG_ROOT))  # add python/ to path
    __package__ = "orion.analyzer"
    from orion.analyzer.run_analyzer import main
else:
    from .run_analyzer import main

if __name__ == "__main__":
    main()
