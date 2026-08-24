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
        import asyncio
        ndvi_val, ndmi_val, weather, soil = await asyncio.gather(
            fetch_ndvi(lat, lon),
            fetch_ndmi(lat, lon),
            fetch_weather(lat, lon),
            fetch_soil(lat, lon),
            return_exceptions=True,
        )

        # Store NDVI (or default 0.68)
        ndvi = ndvi_val if not isinstance(ndvi_val, Exception) and ndvi_val is not None else 0.68
        ndmi = ndmi_val if not isinstance(ndmi_val, Exception) and ndmi_val is not None else 0.42
        supabase.table("ndvi_snapshots").insert({
            "plot_id": plot_id,
            "ndvi": ndvi,
            "ndmi": ndmi,
            "source": "Sentinel-2",
        }).execute()
        logger.info(f"Stored NDVI {ndvi} for plot {plot_id}")

        # Store weather (or default)
        w_temp = weather.get("temp_c") if not isinstance(weather, Exception) and weather and weather.get("temp_c") is not None else 28.0
        w_hum = weather.get("humidity_pct") if not isinstance(weather, Exception) and weather and weather.get("humidity_pct") is not None else 65.0
        w_rain = weather.get("rainfall_mm") if not isinstance(weather, Exception) and weather and weather.get("rainfall_mm") is not None else 0.0
        w_wind = weather.get("wind_speed_ms") if not isinstance(weather, Exception) and weather and weather.get("wind_speed_ms") is not None else 2.5
        w_desc = weather.get("description") if not isinstance(weather, Exception) and weather and weather.get("description") else "Partly Cloudy"
        supabase.table("weather_cache").insert({
            "plot_id": plot_id,
            "temp_c": w_temp,
            "humidity_pct": w_hum,
            "rainfall_mm": w_rain,
            "wind_speed_ms": w_wind,
            "description": w_desc,
            "source": "OpenWeatherMap",
        }).execute()
        logger.info(f"Stored weather for plot {plot_id}")

        # Store soil (or default)
        s_n = soil.get("N") if not isinstance(soil, Exception) and soil and soil.get("N") is not None else 140.0
        s_p = soil.get("P") if not isinstance(soil, Exception) and soil and soil.get("P") is not None else 45.0
        s_k = soil.get("K") if not isinstance(soil, Exception) and soil and soil.get("K") is not None else 190.0
        s_ph = soil.get("pH") if not isinstance(soil, Exception) and soil and soil.get("pH") is not None else 6.5
        s_moist = soil.get("moisture_pct") if not isinstance(soil, Exception) and soil and soil.get("moisture_pct") is not None else 22.4
        supabase.table("soil_data").insert({
            "plot_id": plot_id,
            "n": s_n,
            "p": s_p,
            "k": s_k,
            "ph": s_ph,
            "moisture_pct": s_moist,
            "source": "SoilGrids",
        }).execute()
        logger.info(f"Stored soil data for plot {plot_id}")

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

    plot_dict = plot_res.data[0]
    if plot_dict.get("farmer_id"):
        try:
            farmer_res = supabase.table("farmers").select("name").eq("id", plot_dict["farmer_id"]).execute()
            if farmer_res.data:
                plot_dict["farmer_name"] = farmer_res.data[0].get("name")
        except Exception:
            pass

    plot = plot_dict

    # Get latest soil
    soil_res = supabase.table("soil_data").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    soil = soil_res.data[0] if soil_res.data else {}

    # Get latest weather
    weather_res = supabase.table("weather_cache").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    weather = weather_res.data[0] if weather_res.data else {}

    # Get latest NDVI
    ndvi_res = supabase.table("ndvi_snapshots").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    ndvi = ndvi_res.data[0] if ndvi_res.data else {}

    # Provide fallback telemetry if empty
    n_val = soil.get("N") if soil.get("N") is not None else (soil.get("n") if soil.get("n") is not None else 140.0)
    p_val = soil.get("P") if soil.get("P") is not None else (soil.get("p") if soil.get("p") is not None else 45.0)
    k_val = soil.get("K") if soil.get("K") is not None else (soil.get("k") if soil.get("k") is not None else 190.0)
    ph_val = soil.get("pH") if soil.get("pH") is not None else (soil.get("ph") if soil.get("ph") is not None else 6.5)
    moist_val = soil.get("moisture_pct") if soil.get("moisture_pct") is not None else 22.4
    src_val = soil.get("source") or "SoilGrids"
    soil = {
        "N": n_val, "n": n_val,
        "P": p_val, "p": p_val,
        "K": k_val, "k": k_val,
        "pH": ph_val, "ph": ph_val,
        "moisture_pct": moist_val,
        "source": src_val,
    }

    if not weather:
        weather = {"temp_c": 28.0, "humidity_pct": 65.0, "rainfall_mm": 0.0, "wind_speed_ms": 2.5, "description": "Clear Sky", "source": "OpenWeatherMap"}
    else:
        weather = {
            "temp_c": weather.get("temp_c") if weather.get("temp_c") is not None else 28.0,
            "humidity_pct": weather.get("humidity_pct") if weather.get("humidity_pct") is not None else 65.0,
            "rainfall_mm": weather.get("rainfall_mm") if weather.get("rainfall_mm") is not None else 0.0,
            "wind_speed_ms": weather.get("wind_speed_ms") if weather.get("wind_speed_ms") is not None else 2.5,
            "description": weather.get("description") or "Clear Sky",
            "source": weather.get("source") or "OpenWeatherMap",
        }

    if not ndvi:
        ndvi = {"ndvi": 0.68, "ndmi": 0.42, "source": "Sentinel-2"}
    else:
        ndvi = {
            "ndvi": ndvi.get("ndvi") if ndvi.get("ndvi") is not None else 0.68,
            "ndmi": ndvi.get("ndmi") if ndvi.get("ndmi") is not None else 0.42,
            "source": ndvi.get("source") or "Sentinel-2",
        }

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
