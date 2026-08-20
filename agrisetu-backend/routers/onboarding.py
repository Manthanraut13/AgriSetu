"""Onboarding Router — farmer and plot registration."""
import logging
from uuid import UUID
from fastapi import APIRouter, HTTPException, BackgroundTasks

from schemas.farm import FarmerCreate, FarmerResponse, PlotCreate, PlotResponse, PlotSummary
from schemas.advisory import SoilSummary, WeatherSummary, NdviSummary
from services.satellite import fetch_ndvi, fetch_ndmi
from services.weather import fetch_weather
from services.soil import fetch_soil

logger = logging.getLogger("agrisetu.onboarding")
router = APIRouter(prefix="/onboarding")


async def _fetch_and_store_plot_data(plot_id: str, lat: float, lon: float):
    """Background task: fetch NDVI, soil, weather for a new plot and store in Supabase."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        # Fetch all data concurrently
        import asyncio
        ndvi_val, ndmi_val, weather, soil = await asyncio.gather(
            fetch_ndvi(lat, lon),
            fetch_ndmi(lat, lon),
            fetch_weather(lat, lon),
            fetch_soil(lat, lon),
            return_exceptions=True,
        )

        # Store NDVI
        if not isinstance(ndvi_val, Exception) and ndvi_val is not None:
            supabase.table("ndvi_snapshots").insert({
                "plot_id": plot_id,
                "ndvi": ndvi_val,
                "ndmi": ndmi_val if not isinstance(ndmi_val, Exception) else None,
                "source": "Sentinel-2",
            }).execute()
            logger.info(f"Stored NDVI {ndvi_val} for plot {plot_id}")

        # Store weather
        if not isinstance(weather, Exception) and weather:
            supabase.table("weather_cache").insert({
                "plot_id": plot_id,
                "temp_c": weather.get("temp_c"),
                "humidity_pct": weather.get("humidity_pct"),
                "rainfall_mm": weather.get("rainfall_mm"),
                "wind_speed_ms": weather.get("wind_speed_ms"),
            }).execute()
            logger.info(f"Stored weather for plot {plot_id}")

        # Store soil
        if not isinstance(soil, Exception) and soil:
            supabase.table("soil_data").insert({
                "plot_id": plot_id,
                "N": soil.get("N"),
                "P": soil.get("P"),
                "K": soil.get("K"),
                "pH": soil.get("pH"),
                "moisture_pct": soil.get("moisture_pct"),
                "organic_carbon_pct": soil.get("organic_carbon_pct"),
                "source": soil.get("source"),
            }).execute()
            logger.info(f"Stored soil data for plot {plot_id}")

    except Exception as e:
        logger.error(f"Failed to fetch/store data for plot {plot_id}: {e}")


@router.post("/farmer", response_model=FarmerResponse, tags=["Onboarding"])
async def create_farmer(body: FarmerCreate):
    """Create a new farmer record."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Check if farmer with this phone already exists
    existing = supabase.table("farmers").select("*").eq("phone", body.phone).execute()
    if existing.data:
        return FarmerResponse(**existing.data[0])

    result = supabase.table("farmers").insert(body.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create farmer")

    logger.info(f"Farmer created: {result.data[0]['id']}")
    return FarmerResponse(**result.data[0])


@router.post("/plot", response_model=PlotResponse, tags=["Onboarding"])
async def create_plot(body: PlotCreate, background_tasks: BackgroundTasks):
    """Create a new farm plot and trigger data fetch."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Verify farmer exists
    farmer = supabase.table("farmers").select("id").eq("id", str(body.farmer_id)).execute()
    if not farmer.data:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Insert plot — only columns that exist in the DB
    plot_data = {
        "farmer_id": str(body.farmer_id),
        "center_lat": body.center_lat,
        "center_lon": body.center_lon,
        "area_ha": body.area_ha,
        "district": body.district,
        "state": body.state,
        "country": body.country,
        "current_crop": body.current_crop,
        "last_crop": body.last_crop,
    }
    # Remove None values so Postgres defaults apply
    plot_data = {k: v for k, v in plot_data.items() if v is not None}

    result = supabase.table("farm_plots").insert(plot_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create plot")

    plot = result.data[0]
    plot_id = plot["id"]

    # Trigger background data fetch
    background_tasks.add_task(
        _fetch_and_store_plot_data, plot_id, body.center_lat, body.center_lon
    )

    logger.info(f"Plot created: {plot_id}, data fetch triggered")
    return PlotResponse(**plot)


@router.get("/plot/{plot_id}", response_model=PlotSummary, tags=["Onboarding"])
async def get_plot_summary(plot_id: str):
    """Get plot with latest soil/weather/NDVI summary."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Get plot
    plot_res = supabase.table("farm_plots").select("*").eq("id", plot_id).execute()
    if not plot_res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    plot = PlotResponse(**plot_res.data[0])

    # Get latest soil
    soil_res = (
        supabase.table("soil_data")
        .select("*")
        .eq("plot_id", plot_id)
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    soil = SoilSummary(**soil_res.data[0]) if soil_res.data else None

    # Get latest weather
    weather_res = (
        supabase.table("weather_cache")
        .select("*")
        .eq("plot_id", plot_id)
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    weather = WeatherSummary(**weather_res.data[0]) if weather_res.data else None

    # Get latest NDVI
    ndvi_res = (
        supabase.table("ndvi_snapshots")
        .select("*")
        .eq("plot_id", plot_id)
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    ndvi = NdviSummary(**ndvi_res.data[0]) if ndvi_res.data else None

    return PlotSummary(plot=plot, soil=soil, weather=weather, ndvi=ndvi)