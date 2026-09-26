import os
import sys

# Ensure repository root is in sys.path when invoked in Vercel serverless environment
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

from backend.main import app

# Expose app for Vercel serverless function entrypoint
__all__ = ["app"]
