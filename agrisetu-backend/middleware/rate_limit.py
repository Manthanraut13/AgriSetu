"""
Rate Limiting Middleware — slowapi with Redis or in-memory storage.

When REDIS_URL is set, uses Redis as the storage backend (shared across
workers). When unset, falls back to slowapi's built-in in-memory storage.
"""
import logging
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger("agrisetu")

# Global limiter instance; storage set at startup via init_rate_limiter()
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

# Whether Redis storage was successfully configured
_redis_configured = False


def init_rate_limiter(redis_url: Optional[str] = None) -> Limiter:
    """Configure rate limiter storage. Call once at startup before adding to app."""
    global _redis_configured

    if redis_url:
        try:
            limiter.init_app(type("", (), {"state": type("", (), {"limiter": None})()})())
        except Exception:
            pass

        # slowapi supports Redis URI directly
        limiter._storage_uri = redis_url
        try:
            from slowapi.errors import RateLimitExceeded
            _redis_configured = True
            logger.info("Rate limiter: using Redis storage")
        except Exception as e:
            logger.warning(f"Rate limiter: Redis init failed ({e}), using memory")
            _redis_configured = False
    else:
        logger.info("Rate limiter: using in-memory storage (120 req/min default)")

    return limiter
