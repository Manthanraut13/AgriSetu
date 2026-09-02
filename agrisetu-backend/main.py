"""AgriSetu — Main FastAPI Application (Production-ready Phase 1)."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware as BuiltinCORSMiddleware
from fastapi.responses import JSONResponse

from config import settings, validate_config
from middleware.logging import setup_logging, RequestLoggingMiddleware
from slowapi.errors import RateLimitExceeded
from middleware.rate_limit import limiter
from middleware.sentry import init_sentry
from services import cache as cache

logger = logging.getLogger("agrisetu")  # configured in lifespan after logging setup

# ── Lifespan ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    _scheduler_running = False

    # 1. Structured logging (must run before anything logs)
    setup_logging(
        log_level=settings.LOG_LEVEL,
        log_format=settings.LOG_FORMAT,
    )
    global logger
    logger = logging.getLogger("agrisetu")

    logger.info("=" * 60)
    logger.info("AgriSetu Backend Starting")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Backend URL: {settings.BACKEND_URL}")
    logger.info(f"Log format: {settings.LOG_FORMAT}")
    logger.info("=" * 60)

    # 2. Validate secrets
    validate_config()

    # 3. Initialise cache (Redis or in-memory fallback)
    await cache.initialise(settings.REDIS_URL or None)

    # 4. Load ML models (XGBoost only; CNN lazy-loads on first disease request)
    from services.crop_model import load_crop_model
    try:
        load_crop_model()
        logger.info("Crop XGBoost model loaded")
    except Exception as e:
        logger.warning(f"Crop model load failed: {e}")

    # 5. Start background scheduler (plot refresh + disease alerts every 6h)
    if settings.ENVIRONMENT == "production":
        from services.scheduler import start_scheduler, stop_scheduler
        try:
            start_scheduler()
            _scheduler_running = True
        except Exception as e:
            logger.warning(f"Scheduler failed to start: {e}")

    logger.info("AgriSetu Backend Ready")
    yield

    # Shutdown
    if _scheduler_running:
        stop_scheduler()
    await cache.close()
    logger.info("AgriSetu Backend Shutting Down")


# ── App ──────────────────────────────────────────────────────
app = FastAPI(
    title="AgriSetu — BRICS Digital Agriculture API",
    description="Advisory Gateway for BRICS Farmers",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────
# Production: honour CORS_ORIGINS if set, else restrict to FRONTEND_URL.
# Development: allow all origins (mirrors legacy behaviour).
_cors_origins: list[str] = (
    [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    if settings.CORS_ORIGINS
    else ["*"] if not settings.is_production
    else [settings.FRONTEND_URL, settings.BACKEND_URL]
)

app.add_middleware(
    BuiltinCORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request logging (request ID + timing) ────────────────────
app.add_middleware(RequestLoggingMiddleware)

# ── Sentry (optional) ───────────────────────────────────────
init_sentry(settings.SENTRY_DSN or None, settings.ENVIRONMENT)

# ── Rate limiting ────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: JSONResponse(
        status_code=429,
        content={"error": "Rate limit exceeded", "detail": str(exc.detail)},
    ),
)


# ── Health ───────────────────────────────────────────────────
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check with component status."""
    cache_ok = await cache.healthy()
    return {
        "status": "ok" if cache_ok else "degraded",
        "service": "AgriSetu Backend",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
        "cache": {"backend": cache.backend_name(), "healthy": cache_ok},
    }


# ── Root ─────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "AgriSetu — BRICS Digital Agriculture API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


# ── Mount Routers ───────────────────────────────────────────
for module_path, prefix, tag, label in [
    ("routers.onboarding",  "/api/v1", "Onboarding",  "Onboarding"),
    ("routers.disease",     "/api/v1", "Disease",     "Disease"),
    ("routers.advisory",    "/api/v1", "Advisory",    "Advisory"),
    ("routers.chat",        "/api/v1", "Chat",        "Chat"),
    ("routers.voice",       "/api/v1", "Voice",       "Voice"),
    ("routers.whatsapp",    "/api/v1", "WhatsApp",    "WhatsApp"),
    ("routers.dashboard",   "/api/v1", "Dashboard",   "Dashboard"),
    ("routers.brics",       "/api/v1", "BRICS API",   "BRICS API"),
    ("routers.auth",        "/api/v1", "Auth",        "Auth"),
]:
    try:
        from importlib import import_module
        _mod = import_module(module_path)
        app.include_router(_mod.router, prefix=prefix, tags=[tag])
        logger.info(f"Router mounted: {label}")
    except ImportError as e:
        import logging as _logging
        _logging.getLogger("agrisetu").debug(f"Router not available: {label} ({e})")


# ── Global Error Handler ────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    req_id = getattr(getattr(request, "state", None), "request_id", "?")
    logger.error("Unhandled exception on %s: %s [req=%s]", request.url.path, exc, req_id)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if not settings.is_production else None,
            "request_id": req_id,
        },
    )
