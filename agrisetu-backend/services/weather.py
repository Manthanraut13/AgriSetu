"""Weather data fetch service — NASA POWER + OpenWeatherMap."""
import logging
from typing import Optional
import httpx

from config import settings

logger = logging.getLogger("agrisetu.weather")

NASA_POWER_BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"
OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5/weather"


async def fetch_nasa_power(lat: float, lon: float) -> Optional[dict]:
    """
    Fetch weather data from NASA POWER API (historical + recent).

    Returns dict with temp_c, humidity_pct, rainfall_mm.
    """
    # NASA POWER uses YYYYMMDD format
    from datetime import datetime, timedelta

    end = datetime.utcnow()
    start = end - timedelta(days=7)

    params = {
        "parameters": "T2M,RH2M,PRECTOTCORR,WS2M",
        "community": "AG",
        "longitude": round(lon, 4),
        "latitude": round(lat, 4),
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "format": "JSON",
    }

    logger.info(f"Fetching NASA POWER weather for ({lat}, {lon})")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(NASA_POWER_BASE, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"NASA POWER API error: {e}")
            return None

    try:
        properties = data["properties"]["parameter"]

        # Get latest day's values
        dates = sorted(properties["T2M"].keys(), reverse=True)
        latest = dates[0] if dates else None

        if not latest:
            return None

        temp_c = properties["T2M"].get(latest)
        humidity = properties["RH2M"].get(latest)
        rainfall = properties["PRECTOTCORR"].get(latest)
        wind_speed = properties.get("WS2M", {}).get(latest)

        result = {
            "temp_c": float(temp_c) if temp_c is not None and temp_c > -900 else None,
            "humidity_pct": float(humidity) if humidity is not None and humidity > -900 else None,
            "rainfall_mm": float(rainfall) if rainfall is not None and rainfall > -900 else None,
            "wind_speed_ms": float(wind_speed) if wind_speed is not None and wind_speed > -900 else None,
            "source": "NASA POWER",
            "date": latest,
        }

        logger.info(f"NASA POWER data: temp={result['temp_c']}°C, humidity={result['humidity_pct']}%, rain={result['rainfall_mm']}mm")
        return result

    except (KeyError, IndexError) as e:
        logger.error(f"Failed to parse NASA POWER response: {e}")
        return None


async def fetch_openweather(lat: float, lon: float) -> Optional[dict]:
    """
    Fetch current weather from OpenWeatherMap API.

    Returns dict with temp_c, humidity_pct, rainfall_mm, description.
    """
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
    }

    logger.info(f"Fetching OpenWeatherMap for ({lat}, {lon})")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(OPENWEATHER_BASE, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"OpenWeatherMap API error: {e}")
            return None

    try:
        main = data.get("main", {})
        rain = data.get("rain", {})
        weather_desc = data.get("weather", [{}])[0].get("description", "")

        result = {
            "temp_c": round(main.get("temp", 0), 1),
            "humidity_pct": main.get("humidity"),
            "rainfall_mm": rain.get("1h", rain.get("3h", 0)),
            "wind_speed_ms": data.get("wind", {}).get("speed"),
            "description": weather_desc,
            "source": "OpenWeatherMap",
        }

        logger.info(f"OpenWeatherMap data: temp={result['temp_c']}°C, humidity={result['humidity_pct']}%, desc={result['description']}")
        return result

    except (KeyError, IndexError) as e:
        logger.error(f"Failed to parse OpenWeatherMap response: {e}")
        return None


async def fetch_weather(lat: float, lon: float) -> dict:
    """
    Fetch comprehensive weather data combining NASA POWER and OpenWeatherMap.

    Returns merged dict with best available data from both sources.
    """
    nasa_data = await fetch_nasa_power(lat, lon)
    ow_data = await fetch_openweather(lat, lon)

    # Merge: prefer OpenWeatherMap for current, NASA POWER for recent rainfall
    result = {
        "temp_c": None,
        "humidity_pct": None,
        "rainfall_mm": None,
        "wind_speed_ms": None,
        "description": None,
        "sources": [],
    }

    if ow_data:
        result["temp_c"] = ow_data.get("temp_c")
        result["humidity_pct"] = ow_data.get("humidity_pct")
        result["wind_speed_ms"] = ow_data.get("wind_speed_ms")
        result["description"] = ow_data.get("description")
        result["sources"].append("OpenWeatherMap")

    if nasa_data:
        # Use NASA POWER rainfall (more reliable for agriculture)
        if nasa_data.get("rainfall_mm") is not None:
            result["rainfall_mm"] = nasa_data["rainfall_mm"]
        # Fill missing fields from NASA
        if result["temp_c"] is None:
            result["temp_c"] = nasa_data.get("temp_c")
        if result["humidity_pct"] is None:
            result["humidity_pct"] = nasa_data.get("humidity_pct")
        if result["wind_speed_ms"] is None:
            result["wind_speed_ms"] = nasa_data.get("wind_speed_ms")
        result["sources"].append("NASA POWER")

    logger.info(f"Weather for ({lat}, {lon}): {result}")
    return result