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
    """
    Get crop advisory for a registered plot.

    Fetches plot context (soil, weather, NDVI), runs XGBoost model,
    applies regenerative rules, and returns full advisory.
    """
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

    # Get soil/weather values with defaults
    N = soil.get("N", 50)
    P = soil.get("P", 40)
    K = soil.get("K", 45)
    pH = soil.get("pH", 6.5)
    temp = weather.get("temp_c", 25)
    humidity = weather.get("humidity_pct", 60)
    rainfall = weather.get("rainfall_mm", 100)
    ndvi_val = ndvi.get("ndvi", 0.5)

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
        "cotton": "May - June",
        "jute": "March - April",
        "coffee": "June - July",
        "soybean": "June - July",
        "groundnut": "June - July",
    }

    irrigation_days = {
        "rice": 3, "wheat": 7, "maize": 5, "cotton": 7,
        "sugarcane": 5, "chickpea": 10, "mango": 14, "grapes": 10,
        "soybean": 5, "groundnut": 7, "default": 7,
    }

    recommendations = []
    for rec in crop_recs:
        crop = rec["crop"]
        recommendations.append(CropRecommendation(
            crop=crop,
            confidence=rec["confidence"],
            sowing_window=sowing_windows.get(crop, "Consult local agricultural calendar"),
            irrigation_days=irrigation_days.get(crop, irrigation_days["default"]),
        ))

    # Apply regenerative rules
    regen_practices = apply_regenerative_rules(
        recommendations, soil, weather, ndvi_val, plot.get("last_crop")
    )

    # Build risk alerts
    risk_alerts = []
    if ndvi_val is not None and ndvi_val < 0.3:
        risk_alerts.append("Low NDVI indicates poor crop health. Consider soil testing.")
    if weather.get("rainfall_mm", 0) > 100:
        risk_alerts.append("Heavy rainfall detected. Watch for waterlogging.")
    if soil.get("pH", 7) < 5.5 or soil.get("pH", 7) > 8.0:
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