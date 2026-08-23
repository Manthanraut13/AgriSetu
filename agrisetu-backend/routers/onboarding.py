"""Onboarding Router — farmer and plot registration with inline data fetch."""
import logging
import asyncio
from uuid import UUID
from fastapi import APIRouter, HTTPException, BackgroundTasks

from schemas.farm import FarmerCreate, FarmerResponse, PlotCreate, PlotResponse
from services.satellite import fetch_ndvi, fetch_ndmi
from services.weather import fetch_weather
from services.soil import fetch_soil

logger = logging.getLogger("agrisetu.onboarding")
router = APIRouter(prefix="/onboarding")


@router.post("/farmer", response_model=FarmerResponse, tags=["Onboarding"])
async def create_farmer(body: FarmerCreate):
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    existing = supabase.table("farmers").select("*").eq("phone", body.phone).execute()
    if existing.data:
        return FarmerResponse(**existing.data[0])

    result = supabase.table("farmers").insert(body.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create farmer")
    logger.info(f"Farmer created: {result.data[0]['id']}")
    return FarmerResponse(**result.data[0])


@router.post("/plot", response_model=PlotResponse, tags=["Onboarding"])
async def create_plot(body: PlotCreate):
    """Create a new farm plot and fetch satellite/soil/weather data inline."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    farmer = supabase.table("farmers").select("id").eq("id", str(body.farmer_id)).execute()
    if not farmer.data:
        raise HTTPException(status_code=404, detail="Farmer not found")

    plot_data = {
        "farmer_id": str(body.farmer_id),
        "center_lat": body.center_lat,
        "center_lon": body.center_lon,
        "district": body.district,
        "state": body.state,
        "country": body.country,
        "current_crop": body.current_crop,
        "last_crop": body.last_crop,
    }
    plot_data = {k: v for k, v in plot_data.items() if v is not None}

    result = supabase.table("farm_plots").insert(plot_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create plot")

    plot_id = result.data[0]["id"]
    logger.info(f"Plot created: {plot_id}")

    # Fetch data INLINE so dashboard has data immediately
    lat, lon = body.center_lat, body.center_lon
    try:
        ndvi_val, ndmi_val, weather_data, soil_data = await asyncio.gather(
            fetch_ndvi(lat, lon),
            fetch_ndmi(lat, lon),
            fetch_weather(lat, lon),
            fetch_soil(lat, lon),
            return_exceptions=True,
        )

        if not isinstance(ndvi_val, Exception) and ndvi_val is not None:
            supabase.table("ndvi_snapshots").insert({
                "plot_id": plot_id,
                "ndvi": ndvi_val,
                "ndmi": ndmi_val if not isinstance(ndmi_val, Exception) else None,
                "source": "Sentinel-2",
            }).execute()
            logger.info(f"Stored NDVI {ndvi_val} for plot {plot_id}")

        if not isinstance(weather_data, Exception) and weather_data:
            weather_record = {
                "plot_id": plot_id,
                "temp_c": weather_data.get("temp_c"),
                "humidity_pct": weather_data.get("humidity_pct"),
                "rainfall_mm": weather_data.get("rainfall_mm"),
                "wind_speed_ms": weather_data.get("wind_speed_ms"),
                "source": weather_data.get("source", "NASA POWER"),
            }
            supabase.table("weather_cache").insert(weather_record).execute()
            logger.info(f"Stored weather for plot {plot_id}")

        if not isinstance(soil_data, Exception) and soil_data:
            soil_record = {
                "plot_id": plot_id,
                "n": soil_data.get("N"),
                "p": soil_data.get("P"),
                "k": soil_data.get("K"),
                "ph": soil_data.get("pH"),
                "moisture_pct": soil_data.get("moisture_pct"),
            }
            supabase.table("soil_data").insert(soil_record).execute()
            logger.info(f"Stored soil for plot {plot_id}")

    except Exception as e:
        logger.error(f"Data fetch failed for plot {plot_id}: {e}")

    return result.data[0]


@router.get("/plot/{plot_id}", tags=["Onboarding"])
async def get_plot_summary(plot_id: str):
    """Get full plot summary with soil, weather, NDVI data."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    plot_res = supabase.table("farm_plots").select("*").eq("id", plot_id).execute()
    if not plot_res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    plot = plot_res.data[0]

    soil_res = supabase.table("soil_data").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    soil = soil_res.data[0] if soil_res.data else {}

    weather_res = supabase.table("weather_cache").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    weather = weather_res.data[0] if weather_res.data else {}

    ndvi_res = supabase.table("ndvi_snapshots").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    ndvi = ndvi_res.data[0] if ndvi_res.data else {}

    # Normalize soil column names (DB uses lowercase, frontend expects uppercase)
    if soil:
        soil = {
            "N": soil.get("n"),
            "P": soil.get("p"),
            "K": soil.get("k"),
            "pH": soil.get("ph"),
            "moisture_pct": soil.get("moisture_pct"),
            "source": soil.get("source"),
        }

    # Normalize weather (add description from forecast if available)
    if weather and not weather.get("description"):
        # Try to extract description from forecast_json
        forecast = weather.get("forecast_json")
        if forecast and isinstance(forecast, dict):
            weather["description"] = forecast.get("description", "")

    return {
        "plot": plot,
        "soil": soil,
        "weather": weather,
        "ndvi": ndvi,
    }


@router.get("/farmer/by-phone/{phone}", tags=["Onboarding"])
async def get_farmer_by_phone(phone: str):
    """Get farmer by phone number for login."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    result = supabase.table("farmers").select("*").eq("phone", phone).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return result.data


@router.get("/farmer/{farmer_id}", tags=["Onboarding"])
async def get_farmer(farmer_id: str):
    """Get farmer by ID."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    result = supabase.table("farmers").select("*").eq("id", farmer_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return result.data[0]


@router.patch("/farmer/{farmer_id}", tags=["Onboarding"])
async def update_farmer(farmer_id: str, updates: dict):
    """Update farmer profile."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    result = supabase.table("farmers").update(updates).eq("id", farmer_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update farmer")
    return result.data[0]


@router.patch("/plot/{plot_id}", tags=["Onboarding"])
async def update_plot(plot_id: str, updates: dict):
    """Update plot details (area, crop, etc)."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    result = supabase.table("farm_plots").update(updates).eq("id", plot_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update plot")
    return result.data[0]
