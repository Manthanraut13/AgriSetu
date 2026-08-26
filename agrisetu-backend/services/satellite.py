"""Satellite NDVI/NDMI fetch service — Sentinel Hub API (Process API with Instance ID)."""
import time
import logging
import httpx
from datetime import datetime, timedelta
from typing import Optional
import io
from PIL import Image
import numpy as np

from config import settings

logger = logging.getLogger("agrisetu.satellite")

# Sentinel Hub token cache
_token_cache: dict = {"token": None, "expires_at": 0}


async def _get_access_token() -> str:
    """Get OAuth2 access token from Sentinel Hub (cached for 1 hour)."""
    now = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] > now:
        return _token_cache["token"]

    logger.info("Requesting new Sentinel Hub OAuth2 token")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://services.sentinel-hub.com/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": settings.SENTINEL_HUB_CLIENT_ID,
                "client_secret": settings.SENTINEL_HUB_CLIENT_SECRET,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

    token = data["access_token"]
    expires_in = data.get("expires_in", 3600)
    _token_cache["token"] = token
    _token_cache["expires_at"] = now + expires_in - 60

    logger.info("Sentinel Hub token obtained")
    return token


# NDVI evalscript (Sentinel-2 L2A bands)
NDVI_EVALSCRIPT = (
    "//VERSION=3\n"
    "function setup() {\n"
    "  return { input: ['B04', 'B08', 'dataMask'], output: { bands: 1, sampleType: 'FLOAT32' } };\n"
    "}\n"
    "function evaluatePixel(sample) {\n"
    "  if (sample.dataMask === 0) return [NaN];\n"
    "  return [(sample.B08 - sample.B04) / (sample.B08 + sample.B04)];\n"
    "}"
)

# NDMI evalscript
NDMI_EVALSCRIPT = (
    "//VERSION=3\n"
    "function setup() {\n"
    "  return { input: ['B08', 'B11', 'dataMask'], output: { bands: 1, sampleType: 'FLOAT32' } };\n"
    "}\n"
    "function evaluatePixel(sample) {\n"
    "  if (sample.dataMask === 0) return [NaN];\n"
    "  return [(sample.B08 - sample.B11) / (sample.B08 + sample.B11)];\n"
    "}"
)


def _bbox_from_point(lat: float, lon: float, size_km: float = 2.0) -> list:
    """Create a bounding box around a point."""
    import math
    lat_offset = size_km / 111.0
    lon_offset = size_km / (111.0 * abs(math.cos(math.radians(lat))))
    return [
        lon - lon_offset,
        lat - lat_offset,
        lon + lon_offset,
        lat + lat_offset,
    ]


async def _process_sentinel_index(
    bbox: list,
    evalscript: str,
    time_from: str,
    time_to: str,
) -> Optional[float]:
    """Process a Sentinel index and return the mean pixel value."""
    token = await _get_access_token()

    # Use instance ID if provided
    base_url = "https://services.sentinel-hub.com/api/v1/process"
    if settings.SENTINEL_HUB_INSTANCE_ID:
        base_url = f"https://services.sentinel-hub.com/api/v1/process?instanceId={settings.SENTINEL_HUB_INSTANCE_ID}"

    payload = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {"from": time_from, "to": time_to},
                        "maxCloudCoverage": 30,
                        "mosaickingOrder": "mostRecent",
                    },
                }
            ],
        },
        "evalscript": evalscript,
        "output": {
            "width": 64,
            "height": 64,
            "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}],
        },
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "image/tiff",
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                base_url,
                json=payload,
                headers=headers,
                timeout=60,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"Sentinel Hub process error: {e.response.status_code} - {e.response.text[:500]}")
            return None
        except Exception as e:
            logger.error(f"Sentinel Hub request failed: {e}")
            return None

    try:
        img = Image.open(io.BytesIO(resp.content))
        arr = np.array(img, dtype=np.float32)

        # Handle NaN values
        arr = arr[~np.isnan(arr)]
        if len(arr) == 0:
            return None

        mean_val = float(np.mean(arr))
        return round(mean_val, 4)

    except Exception as e:
        logger.error(f"Failed to parse TIFF response: {e}")
        return None


async def fetch_ndvi(lat: float, lon: float) -> Optional[float]:
    """Fetch NDVI for a location from Sentinel-2 L2A. Cached for 6 hours."""
    from services.cache import get_json, set_json

    cache_key = f"ndvi:v1:{lat:.4f}:{lon:.4f}"
    cached = await get_json(cache_key)
    if cached is not None:
        return cached

    logger.info(f"Fetching NDVI for ({lat}, {lon})")
    
    end = datetime.utcnow()
    start = end - timedelta(days=30)  # Look back 30 days
    
    time_from = start.strftime("%Y-%m-%dT00:00:00Z")
    time_to = end.strftime("%Y-%m-%dT23:59:59Z")
    
    bbox = _bbox_from_point(lat, lon, size_km=1.0)
    
    result = await _process_sentinel_index(bbox, NDVI_EVALSCRIPT, time_from, time_to)
    if result is not None:
        await set_json(cache_key, result, ttl=21600)  # 6h
    return result


async def fetch_ndmi(lat: float, lon: float) -> Optional[float]:
    """Fetch NDMI for a location from Sentinel-2 L2A. Cached for 6 hours."""
    from services.cache import get_json, set_json

    cache_key = f"ndmi:v1:{lat:.4f}:{lon:.4f}"
    cached = await get_json(cache_key)
    if cached is not None:
        return cached

    logger.info(f"Fetching NDMI for ({lat}, {lon})")
    
    end = datetime.utcnow()
    start = end - timedelta(days=30)
    
    time_from = start.strftime("%Y-%m-%dT00:00:00Z")
    time_to = end.strftime("%Y-%m-%dT23:59:59Z")
    
    bbox = _bbox_from_point(lat, lon, size_km=1.0)
    
    result = await _process_sentinel_index(bbox, NDMI_EVALSCRIPT, time_from, time_to)
    if result is not None:
        await set_json(cache_key, result, ttl=21600)  # 6h
    return result


# For backward compatibility
from datetime import timedelta