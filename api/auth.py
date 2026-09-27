import os
import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class NotebookHostMiddleware(BaseHTTPMiddleware):
    """Authenticate the App's local HTTP transport, never a Nimi identity."""
    async def dispatch(self, request, call_next):
        if request.url.path == "/health" or request.method == "OPTIONS":
            return await call_next(request)
        expected = os.environ.get("OPEN_NOTEBOOK_HOST_TOKEN", "")
        actual = request.headers.get("x-notebook-process", "")
        if not expected or not secrets.compare_digest(actual, expected):
            return JSONResponse({"detail": "Open this notebook through Nimi Desktop"}, status_code=401)
        return await call_next(request)
