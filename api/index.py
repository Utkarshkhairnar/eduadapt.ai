from backend.main import app

# Expose app for Vercel serverless function entrypoint
__all__ = ["app"]
