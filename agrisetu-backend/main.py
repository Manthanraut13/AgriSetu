"""AgriSetu — Main FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings, validate_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("agrisetu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("=" * 60)
    logger.info("AgriSetu Backend Starting")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Backend URL: {settings.BACKEND_URL}")
    logger.info("=" * 60)

    # Validate config
    validate_config()

    # Load ML models (lazy import to avoid circular deps)
    from services.disease_model import load_disease_model
    from services.crop_model import load_crop_model

    try:
        load_disease_model()
        logger.info("✓ Disease CNN model loaded")
    except Exception as e:
        logger.warning(f"Disease model load failed: {e}")

    try:
        load_crop_model()
        logger.info("✓ Crop XGBoost model loaded")
    except Exception as e:
        logger.warning(f"Crop model load failed: {e}")

    logger.info("AgriSetu Backend Ready")
    yield

    logger.info("AgriSetu Backend Shutting Down")


# Create FastAPI app
app = FastAPI(
    title="AgriSetu — BRICS Digital Agriculture API",
    description="Advisory Gateway for BRICS Farmers",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)

# ── Health Check ────────────────────────────────────────────
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "AgriSetu Backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


# ── Root ────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "service": "AgriSetu — BRICS Digital Agriculture API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


# ── Mount Routers ───────────────────────────────────────────
# These are mounted as they become available during build days.

# Day 2: Onboarding
try:
    from routers.onboarding import router as onboarding_router
    app.include_router(onboarding_router, prefix="/api/v1", tags=["Onboarding"])
    logger.info("✓ Onboarding router mounted")
except ImportError as e:
    logger.debug(f"Onboarding router not yet available: {e}")

# Day 3: Disease + Advisory
try:
    from routers.disease import router as disease_router
    app.include_router(disease_router, prefix="/api/v1", tags=["Disease"])
    logger.info("✓ Disease router mounted")
except ImportError as e:
    logger.debug(f"Disease router not yet available: {e}")

try:
    from routers.advisory import router as advisory_router
    app.include_router(advisory_router, prefix="/api/v1", tags=["Advisory"])
    logger.info("✓ Advisory router mounted")
except ImportError as e:
    logger.debug(f"Advisory router not yet available: {e}")

# Day 4: Chat
try:
    from routers.chat import router as chat_router
    app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
    logger.info("✓ Chat router mounted")
except ImportError as e:
    logger.debug(f"Chat router not yet available: {e}")

# Day 5: Voice
try:
    from routers.voice import router as voice_router
    app.include_router(voice_router, prefix="/api/v1", tags=["Voice"])
    logger.info("✓ Voice router mounted")
except ImportError as e:
    logger.debug(f"Voice router not yet available: {e}")

# Day 5: WhatsApp
try:
    from routers.whatsapp import router as whatsapp_router
    app.include_router(whatsapp_router, prefix="/api/v1", tags=["WhatsApp"])
    logger.info("✓ WhatsApp router mounted")
except ImportError as e:
    logger.debug(f"WhatsApp router not yet available: {e}")

# Day 6: Dashboard
try:
    from routers.dashboard import router as dashboard_router
    app.include_router(dashboard_router, prefix="/api/v1", tags=["Dashboard"])
    logger.info("✓ Dashboard router mounted")
except ImportError as e:
    logger.debug(f"Dashboard router not yet available: {e}")

# Day 6: BRICS API
try:
    from routers.brics import router as brics_router
    app.include_router(brics_router, prefix="/api/v1", tags=["BRICS API"])
    logger.info("✓ BRICS API router mounted")
except ImportError as e:
    logger.debug(f"BRICS API router not yet available: {e}")


# ── Global Error Handler ────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Catch-all exception handler."""
    logger.error(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc) if settings.ENVIRONMENT != "production" else None},
    )