"""Advisory Router — crop recommendation + regenerative practices."""
import logging
from uuid import UUID
from fastapi import APIRouter, HTTPException

from schemas.advisory import (
    SoilSummary, WeatherSummary, NdviSummary,
    CropRecommendation, RegenerativePractice, FullAdvisory,
)
from services.crop_model import predict_crop, apply_regenerative_rules

logger = logging.getLogger("agrisetu.advisory")
router = APIRouter(prefix="/advisory")


@router.get("/{plot_id}", response_model=FullAdvisory, tags=["Advisory"])
async def get_advisory(plot_id: str):
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Get plot
    plot_res = supabase.table("farm_plots").select("*").eq("id", plot_id).execute()
    if not plot_res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    plot = plot_res.data[0]

    # Get latest soil
    soil_res = supabase.table("soil_data").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    soil = soil_res.data[0] if soil_res.data else {}

    # Get latest weather
    weather_res = supabase.table("weather_cache").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    weather = weather_res.data[0] if weather_res.data else {}

    # Get latest NDVI
    ndvi_res = supabase.table("ndvi_snapshots").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    ndvi = ndvi_res.data[0] if ndvi_res.data else {}

    # Normalize soil columns
    if soil:
        soil = {
            "N": soil.get("N") if soil.get("N") is not None else soil.get("n"),
            "P": soil.get("P") if soil.get("P") is not None else soil.get("p"),
            "K": soil.get("K") if soil.get("K") is not None else soil.get("k"),
            "pH": soil.get("pH") if soil.get("pH") is not None else soil.get("ph"),
            "moisture_pct": soil.get("moisture_pct"),
            "source": soil.get("source"),
        }

    # Normalize weather
    if weather and not weather.get("description"):
        forecast = weather.get("forecast_json")
        if forecast and isinstance(forecast, dict):
            weather["description"] = forecast.get("description", "")
    # Get soil/weather values with defaults
    N = soil.get("N") if soil.get("N") is not None else 50.0
    P = soil.get("P") if soil.get("P") is not None else 40.0
    K = soil.get("K") if soil.get("K") is not None else 45.0
    pH = soil.get("pH") if soil.get("pH") is not None else 6.5
    temp = weather.get("temp_c") if weather.get("temp_c") is not None else 25.0
    humidity = weather.get("humidity_pct") if weather.get("humidity_pct") is not None else 60.0
    rainfall = weather.get("rainfall_mm") if weather.get("rainfall_mm") is not None else 100.0
    ndvi_val = ndvi.get("ndvi") if ndvi.get("ndvi") is not None else 0.5

    # Run crop model
    crop_recs = predict_crop(N, P, K, temp, humidity, pH, rainfall)
    if not crop_recs:
        raise HTTPException(status_code=500, detail="Crop model prediction failed")

    # Build sowing window and irrigation based on top crop
    sowing_windows = {
        "rice": "June 15 - July 15",
        "wheat": "October 15 - November 30",
        "maize": "June 1 - July 15",
        "cotton": "May 15 - June 30",
        "sugarcane": "February - March",
        "chickpea": "October 15 - November 15",
        "kidneybeans": "June 15 - July 15",
        "pigeonpeas": "July 1 - August 15",
        "mothbeans": "June 15 - July 15",
        "mungbean": "July 15 - August 15",
        "blackgram": "June 15 - July 15",
        "mango": "February - March",
        "banana": "Year-round",
        "pomegranate": "January - February",
        "lentil": "November 1 - December 15",
        "grapes": "January - February",
        "apple": "January - February",
        "muskmelon": "February - March",
        "watermelon": "February - March",
        "orange": "January - February",
        "papaya": "Year-round",
        "coconut": "Year-round",
        "jute": "March - April",
        "coffee": "June - July",
        "soybean": "June - July",
        "groundnut": "June - July"
    }

    irrigation_days = {
        "rice": 3, "wheat": 7, "maize": 5, "cotton": 7,
        "sugarcane": 5, "chickpea": 10, "mango": 14, "grapes": 10,
        "soybean": 5, "groundnut": 7, "default": 7,
    }

    current_crop = (plot.get("current_crop") or "").strip().lower()
    recommendations = []
    if current_crop:
        recommendations.append(CropRecommendation(
            crop=current_crop.title(),
            confidence=0.95,
            sowing_window=sowing_windows.get(current_crop, "Consult local agricultural calendar"),
            irrigation_days=irrigation_days.get(current_crop, 7),
        ))

    for rec in crop_recs:
        crop = rec["crop"]
        if current_crop and crop.lower() == current_crop:
            continue
        recommendations.append(CropRecommendation(
            crop=crop.title(),
            confidence=rec["confidence"],
            sowing_window=sowing_windows.get(crop.lower(), "Consult local agricultural calendar"),
            irrigation_days=irrigation_days.get(crop.lower(), irrigation_days["default"]),
        ))

    # Apply regenerative rules
    regen_practices = apply_regenerative_rules(
        recommendations, soil, weather, ndvi_val, plot.get("last_crop")
    )

    # Build risk alerts
    risk_alerts = []
    if ndvi_val is not None and ndvi_val < 0.3:
        risk_alerts.append("Low NDVI indicates poor crop health. Consider soil testing.")
    if rainfall > 100:
        risk_alerts.append("Heavy rainfall detected. Watch for waterlogging.")
    if pH < 5.5 or pH > 8.0:
        risk_alerts.append("Soil pH is outside optimal range. Consider soil amendment.")

    # Build response
    advisory = FullAdvisory(
        plot_id=plot_id,
        soil=SoilSummary(**{k: v for k, v in soil.items() if k in SoilSummary.model_fields}) if soil else None,
        weather=WeatherSummary(**{k: v for k, v in weather.items() if k in WeatherSummary.model_fields}) if weather else None,
        ndvi=NdviSummary(ndvi=ndvi_val, ndmi=ndvi.get("ndmi"), image_date=ndvi.get("image_date")) if ndvi else None,
        recommendations=recommendations,
        regenerative_practices=[RegenerativePractice(**p) for p in regen_practices],
        risk_alerts=risk_alerts,
    )

    # Store advisory in DB
    try:
        supabase.table("advisories").insert({
            "plot_id": plot_id,
            "recommended_crop": recommendations[0].crop,
            "confidence": recommendations[0].confidence,
            "sowing_window": recommendations[0].sowing_window,
            "irrigation_schedule": f"Every {recommendations[0].irrigation_days} days",
            "regenerative_practices": [p["practice"] if isinstance(p, dict) else p.practice for p in regen_practices],
            "risk_alerts": risk_alerts,
            "raw_input_snapshot": {"soil": soil, "weather": weather, "ndvi": ndvi},
        }).execute()
        logger.info(f"Advisory stored for plot {plot_id}")
    except Exception as e:
        logger.error(f"Failed to store advisory: {e}")

    return advisory


@router.post("/{plot_id}/refresh", tags=["Advisory"])
async def refresh_plot_data(plot_id: str):
    """Refresh weather, soil, NDVI data for a plot."""
    from config import settings
    from supabase import create_client
    from services.satellite import fetch_ndvi, fetch_ndmi
    from services.weather import fetch_weather
    from services.soil import fetch_soil

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    plot_res = supabase.table("farm_plots").select("*").eq("id", plot_id).execute()
    if not plot_res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    plot = plot_res.data[0]
    lat, lon = plot["center_lat"], plot["center_lon"]

    import asyncio
    ndvi_val, ndmi_val, weather_data, soil_data = await asyncio.gather(
        fetch_ndvi(lat, lon),
        fetch_ndmi(lat, lon),
        fetch_weather(lat, lon),
        fetch_soil(lat, lon),
        return_exceptions=True,
    )

    results = {"ndvi": None, "weather": None, "soil": None}

    if not isinstance(ndvi_val, Exception) and ndvi_val is not None:
        supabase.table("ndvi_snapshots").insert({
            "plot_id": plot_id,
            "ndvi": ndvi_val,
            "ndmi": ndmi_val if not isinstance(ndmi_val, Exception) else None,
            "source": "Sentinel-2",
        }).execute()
        results["ndvi"] = ndvi_val

    if not isinstance(weather_data, Exception) and weather_data:
        supabase.table("weather_cache").insert({
            "plot_id": plot_id,
            "temp_c": weather_data.get("temp_c"),
            "humidity_pct": weather_data.get("humidity_pct"),
            "rainfall_mm": weather_data.get("rainfall_mm"),
            "wind_speed_ms": weather_data.get("wind_speed_ms"),
        }).execute()
        results["weather"] = weather_data

    if not isinstance(soil_data, Exception) and soil_data:
        supabase.table("soil_data").insert({
            "plot_id": plot_id,
            "n": soil_data.get("N"),
            "p": soil_data.get("P"),
            "k": soil_data.get("K"),
            "ph": soil_data.get("pH"),
            "moisture_pct": soil_data.get("moisture_pct"),
        }).execute()
        results["soil"] = soil_data

    return {"success": True, "results": results}


@router.post("/{plot_id}/regenerate", tags=["Advisory"])
async def regenerate_advisory(plot_id: str):
    """Force regenerate advisory for a plot after data refresh."""
    return await get_advisory(plot_id)