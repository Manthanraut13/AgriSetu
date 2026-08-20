"""Satellite NDVI/NDMI fetch service — Sentinel Hub API."""
import time
import logging
import httpx
from datetime import datetime, timedelta
from typing import Optional

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
    _token_cache["expires_at"] = now + expires_in - 60  # refresh 60s early

    logger.info("Sentinel Hub token obtained")
    return token


# NDVI evalscript
NDVI_EVALSCRIPT = (
    "//VERSION=3\n"
    "function setup() {\n"
    "  return { input: ['B04', 'B08'], output: { bands: 1 } };\n"
    "}\n"
    "function evaluatePixel(sample) {\n"
    "  return [(sample.B08 - sample.B04) / (sample.B08 + sample.B04)];\n"
    "}"
)

# NDMI evalscript
NDMI_EVALSCRIPT = (
    "//VERSION=3\n"
    "function setup() {\n"
    "  return { input: ['B08', 'B11'], output: { bands: 1 } };\n"
    "}\n"
    "function evaluatePixel(sample) {\n"
    "  return [(sample.B08 - sample.B11) / (sample.B08 + sample.B11)];\n"
    "}"
)


def _bbox_from_point(lat: float, lon: float, size_km: float = 2.0) -> list:
    """Create a bounding box around a point."""
    # Approximate degree offsets
    lat_offset = size_km / 111.0
    lon_offset = size_km / (111.0 * abs(__import__("math").cos(__import__("math").radians(lat))))
    return [
        lon - lon_offset,
        lat - lat_offset,
        lon + lon_offset,
        lat + lat_offset,
    ]


async def _process_sentinel_image(
    bbox: list,
    evalscript: str,
    time_from: str,
    time_to: str,
) -> Optional[float]:
    """Process a Sentinel image and return the mean pixel value."""
    token = await _get_access_token()

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
                    },
                }
            ],
        },
        "evalscript": evalscript,
        "output": {
            "width": 25,
            "height": 25,
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
                "https://services.sentinel-hub.com/api/v1/process",
                json=payload,
                headers=headers,
                timeout=60,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"Sentinel Hub process error: {e.response.status_code} - {e.response.text[:200]}")
            return None
        except Exception as e:
            logger.error(f"Sentinel Hub request failed: {e}")
            return None

    # Parse TIFF response — extract mean value
    # For simplicity, we'll approximate from the binary TIFF
    # In production, use rasterio; for prototype, use the content length as rough proxy
    # Actually, let's properly parse it
    try:
        import io
        from PIL import Image
        import numpy as np

        img = Image.open(io.BytesIO(resp.content))
        arr = np.array(img, dtype=np.float32)

        # Sentinel Hub returns scaled values (0-10000 range for L2A)
        # Divide by 10000 for actual reflectance, then compute index
        if arr.max() > 1.5:
            arr = arr / 10000.0

        # Mask invalid pixels
        arr = arr[arr > 0]
        if len(arr) == 0:
            return None

        mean_val = float(np.mean(arr))
        return round(mean_val, 4)

    except Exception as e:
        logger.warning(f"Failed to parse TIFF: {e}")
        # Fallback: return None
        return None


async def fetch_ndvi(
    lat: float,
    lon: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Optional[float]:
    """
    Fetch NDVI for a location using Sentinel Hub.

    Args:
        lat: Latitude
        lon: Longitude
        start_date: ISO format start date (default: 30 days ago)
        end_date: ISO format end date (default: today)

    Returns:
        NDVI value (float) or None if fetch fails
    """
    if end_date is None:
        end_date = datetime.utcnow().strftime("%Y-%m-%dT23:59:59Z")
    if start_date is None:
        start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00Z")

    # Ensure timezone format
    if not start_date.endswith("Z"):
        start_date += "T00:00:00Z"
    if not end_date.endswith("Z"):
        end_date += "T23:59:59Z"

    bbox = _bbox_from_point(lat, lon)
    logger.info(f"Fetching NDVI for ({lat}, {lon}) from {start_date} to {end_date}")

    ndvi = await _process_sentinel_image(bbox, NDVI_EVALSCRIPT, start_date, end_date)
    if ndvi is not None:
        logger.info(f"NDVI for ({lat}, {lon}): {ndvi}")
    else:
        logger.warning(f"Failed to fetch NDVI for ({lat}, {lon})")
    return ndvi


async def fetch_ndmi(
    lat: float,
    lon: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Optional[float]:
    """
    Fetch NDMI (Normalized Difference Moisture Index) for a location.

    Returns:
        NDMI value (float) or None if fetch fails
    """
    if end_date is None:
        end_date = datetime.utcnow().strftime("%Y-%m-%dT23:59:59Z")
    if start_date is None:
        start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00Z")

    if not start_date.endswith("Z"):
        start_date += "T00:00:00Z"
    if not end_date.endswith("Z"):
        end_date += "T23:59:59Z"

    bbox = _bbox_from_point(lat, lon)
    logger.info(f"Fetching NDMI for ({lat}, {lon})")

    ndmi = await _process_sentinel_image(bbox, NDMI_EVALSCRIPT, start_date, end_date)
    if ndmi is not None:
        logger.info(f"NDMI for ({lat}, {lon}): {ndmi}")
    return ndmi