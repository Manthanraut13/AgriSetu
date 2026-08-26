"""
Structured Logging Middleware — JSON logs with request IDs.

Logs one JSON line per request: method, path, status, duration, request_id.
When LOG_FORMAT=pretty (default), uses human-readable colour logging instead.
"""
import json
import time
import logging
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("agrisetu")


class JsonRequestFormatter(logging.Formatter):
    """One-line JSON log formatter."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        return json.dumps(log_entry, default=str)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Attach request ID and log each request as one structured line."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:12]
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        response.headers["X-Request-ID"] = request_id

        logger.info(
            "%s %s %d %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={"request_id": request_id},
        )
        return response


def setup_logging(log_level: str = "INFO", log_format: str = "pretty") -> None:
    """Configure application-wide logging at startup."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    if log_format == "json":
        handler = logging.StreamHandler()
        handler.setFormatter(JsonRequestFormatter())
    else:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)-8s %(name)s  %(message)s",
            datefmt="%H:%M:%S",
        ))

    logging.root.handlers = [handler]
    logging.root.setLevel(numeric_level)

    # Quiet noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("supabase").setLevel(logging.WARNING)
    logging.getLogger("postgrest").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
