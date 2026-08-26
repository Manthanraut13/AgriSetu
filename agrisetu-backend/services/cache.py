"""
Cache Service — Redis with in-memory fallback.

When REDIS_URL is set, uses Redis (async). When unset, uses a simple
in-memory dict with TTL. Same interface either way. Falls back to
in-memory silently if Redis becomes unreachable at runtime.

# ponytail: in-memory fallback is single-process only.
# Multi-worker/multi-pod requires Redis. Add per-account locks if throughput
# needs grow beyond a few hundred req/s.
"""
import json
import time
import logging
from typing import Any, Optional

logger = logging.getLogger("agrisetu.cache")

_redis_client = None
_memory_store: dict[str, tuple[float, Any]] = {}
_use_redis = False


def _now() -> float:
    return time.time()


class _MemoryTTL:
    """In-memory cache with per-entry TTL expiry."""

    @staticmethod
    def get(key: str) -> Any | None:
        entry = _memory_store.get(key)
        if entry is None:
            return None
        expires, value = entry
        if expires < _now():
            del _memory_store[key]
            return None
        return value

    @staticmethod
    def set(key: str, value: Any, ttl: int) -> None:
        _memory_store[key] = (_now() + ttl, value)

    @staticmethod
    def delete(key: str) -> None:
        _memory_store.pop(key, None)

    @staticmethod
    def healthy() -> bool:
        return True

    @staticmethod
    def keys_with_prefix(prefix: str) -> list[str]:
        result = []
        now = _now()
        expired = []
        for k, (exp, _) in _memory_store.items():
            if k.startswith(prefix):
                if exp < now:
                    expired.append(k)
                else:
                    result.append(k)
        for k in expired:
            del _memory_store[k]
        return result


async def initialise(redis_url: Optional[str] = None) -> None:
    """Initialise the cache backend. Call once at startup."""
    global _redis_client, _use_redis

    if not redis_url:
        logger.info("Cache: using in-memory backend (no REDIS_URL)")
        _use_redis = False
        return

    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(redis_url, decode_responses=True, socket_connect_timeout=3)
        await _redis_client.ping()
        _use_redis = True
        logger.info("Cache: connected to Redis")
    except Exception as e:
        logger.warning(f"Cache: Redis unavailable ({e}), falling back to in-memory")
        _redis_client = None
        _use_redis = False


async def close() -> None:
    """Close the cache backend. Call at shutdown."""
    global _redis_client
    if _redis_client:
        try:
            await _redis_client.close()
        except Exception:
            pass
        _redis_client = None


async def get_json(key: str) -> Any | None:
    """Get a cached JSON value by key. Returns None on miss or error."""
    if _use_redis and _redis_client:
        try:
            raw = await _redis_client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as e:
            logger.debug(f"Cache GET error for {key}: {e}")
            return None

    raw = _MemoryTTL.get(key)
    return raw


async def set_json(key: str, value: Any, ttl: int = 21600) -> None:
    """Set a JSON value with TTL in seconds (default 6 hours)."""
    if _use_redis and _redis_client:
        try:
            await _redis_client.set(key, json.dumps(value, default=str), ex=ttl)
        except Exception as e:
            logger.debug(f"Cache SET error for {key}: {e}")
        return

    _MemoryTTL.set(key, value, ttl)


async def delete(key: str) -> None:
    """Delete a cached key."""
    if _use_redis and _redis_client:
        try:
            await _redis_client.delete(key)
        except Exception:
            pass
        return

    _MemoryTTL.delete(key)


async def invalidate_prefix(prefix: str) -> int:
    """Delete all keys matching a prefix. Returns count deleted."""
    if _use_redis and _redis_client:
        try:
            keys = []
            async for k in _redis_client.scan_iter(match=f"{prefix}*"):
                keys.append(k)
            if keys:
                await _redis_client.delete(*keys)
            return len(keys)
        except Exception as e:
            logger.debug(f"Cache INVALIDATE error for {prefix}: {e}")
            return 0

    keys = _MemoryTTL.keys_with_prefix(prefix)
    for k in keys:
        _MemoryTTL.delete(k)
    return len(keys)


async def healthy() -> bool:
    """Check if the cache backend is reachable."""
    if _use_redis and _redis_client:
        try:
            await _redis_client.ping()
            return True
        except Exception:
            return False

    return True


def backend_name() -> str:
    """Return the name of the active cache backend."""
    if _use_redis:
        return "redis"
    return "memory"
