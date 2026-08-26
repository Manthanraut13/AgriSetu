"""Tests for the cache service (in-memory fallback path)."""
import asyncio
import pytest
from services import cache as _cache

# ── Helpers ──────────────────────────────────────────────────

def _reset_memory():
    """Clear all in-memory cache state between tests."""
    _cache._memory_store.clear()
    _cache._use_redis = False
    _cache._redis_client = None


@pytest.fixture(autouse=True)
def _clean_cache():
    _reset_memory()
    yield
    _reset_memory()


# ── Tests ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_set_and_get():
    await _cache.set_json("k1", {"a": 1}, ttl=60)
    result = await _cache.get_json("k1")
    assert result == {"a": 1}


@pytest.mark.asyncio
async def test_miss_returns_none():
    assert await _cache.get_json("no-such-key") is None


@pytest.mark.asyncio
async def test_delete_removes_entry():
    await _cache.set_json("k1", "hello", ttl=60)
    await _cache.delete("k1")
    assert await _cache.get_json("k1") is None


@pytest.mark.asyncio
async def test_ttl_expiry():
    await _cache.set_json("k1", "fast", ttl=0)
    # ttl=0 means already expired
    assert await _cache.get_json("k1") is None


@pytest.mark.asyncio
async def test_backend_name_memory():
    assert _cache.backend_name() == "memory"


@pytest.mark.asyncio
async def test_health_ok():
    assert await _cache.healthy() is True


@pytest.mark.asyncio
async def test_initialise_without_redis():
    await _cache.initialise(redis_url=None)
    assert _cache.backend_name() == "memory"
    assert await _cache.healthy() is True


@pytest.mark.asyncio
async def test_invalidate_prefix():
    await _cache.set_json("pref:1", "a", ttl=60)
    await _cache.set_json("pref:2", "b", ttl=60)
    await _cache.set_json("other:1", "c", ttl=60)
    deleted = await _cache.invalidate_prefix("pref:")
    assert deleted == 2
    assert await _cache.get_json("pref:1") is None
    assert await _cache.get_json("other:1") == "c"


@pytest.mark.asyncio
async def test_complex_nested_value():
    payload = {"plots": [{"id": "abc", "ndvi": 0.72}], "meta": {"count": 1}}
    await _cache.set_json("complex", payload, ttl=300)
    assert await _cache.get_json("complex") == payload
