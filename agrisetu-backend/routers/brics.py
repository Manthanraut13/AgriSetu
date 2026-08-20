"""BRICS Interoperability API Router."""
import logging
from fastapi import APIRouter, HTTPException

from schemas.brics import BRICSAdvisoryRequest, BRICSDiseaseReportRequest, BRICSAggregate

logger = logging.getLogger("agrisetu.brics")
router = APIRouter(prefix="/brics")


@router.get("/advisory/{plot_id}", tags=["BRICS API"])
async def get_brics_advisory(plot_id: str):
    """Get advisory in BRICS Agri Data Model schema."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    plot_res = supabase.table("farm_plots").select("*").eq("id", plot_id).execute()
    if not plot_res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    plot = plot_res.data[0]

    # Get latest data
    soil_res = supabase.table("soil_data").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    weather_res = supabase.table("weather_cache").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
    ndvi_res = supabase.table("ndvi_snapshots").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()

    soil = soil_res.data[0] if soil_res.data else {}
    weather = weather_res.data[0] if weather_res.data else {}
    ndvi = ndvi_res.data[0] if ndvi_res.data else {}

    from datetime import datetime
    return {
        "schema_version": "1.0",
        "country_code": "IN" if plot.get("country") == "India" else "BR",
        "plot_id": plot_id,
        "timestamp": datetime.now().isoformat(),
        "location": {
            "lat": plot.get("center_lat", 0),
            "lon": plot.get("center_lon", 0),
            "area_ha": plot.get("area_ha", 0),
        },
        "soil": {
            "N": soil.get("N", 0),
            "P": soil.get("P", 0),
            "K": soil.get("K", 0),
            "pH": soil.get("pH", 0),
            "moisture_pct": soil.get("moisture_pct", 0),
        },
        "weather": {
            "temp_c": weather.get("temp_c", 0),
            "humidity_pct": weather.get("humidity_pct", 0),
            "rainfall_mm": weather.get("rainfall_mm", 0),
        },
        "ndvi": {
            "value": ndvi.get("ndvi", 0),
            "date": ndvi.get("image_date", ""),
            "source": "Sentinel-2",
        },
        "advisory": {
            "recommended_crop": plot.get("current_crop", ""),
            "confidence": 0.0,
            "sowing_window": "",
            "irrigation_days": 7,
        },
        "disease_reports": [],
        "regenerative_practices": [],
    }


@router.post("/disease-report", tags=["BRICS API"])
async def submit_brics_disease_report(body: BRICSDiseaseReportRequest):
    """Submit a disease report in BRICS shared schema."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    supabase.table("disease_reports").insert({
        "plot_id": body.plot_id,
        "disease_name": body.disease_name,
        "confidence": body.confidence,
        "treatment": body.treatment or "",
    }).execute()
    return {"status": "ok", "message": "Disease report submitted"}


@router.get("/aggregate", tags=["BRICS API"])
async def get_brics_aggregate(country: str = "IN"):
    """Get anonymised aggregate stats for a country."""
    from config import settings
    from supabase import create_client
    from datetime import datetime

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    plots = supabase.table("farm_plots").select("id, current_crop").execute()
    ndvi_data = supabase.table("ndvi_snapshots").select("ndvi").execute()
    disease_data = supabase.table("disease_reports").select("id").execute()
    advisory_data = supabase.table("advisories").select("regenerative_practices").execute()

    total = len(plots.data) if plots.data else 0
    avg_ndvi = 0
    if ndvi_data.data:
        values = [d["ndvi"] for d in ndvi_data.data if d.get("ndvi")]
        avg_ndvi = sum(values) / len(values) if values else 0

    disease_count = len(disease_data.data) if disease_data.data else 0
    disease_pct = (disease_count / total * 100) if total > 0 else 0

    regen_count = len([a for a in (advisory_data.data or []) if a.get("regenerative_practices")])
    regen_pct = (regen_count / total * 100) if total > 0 else 0

    # Top crops
    crop_counts = {}
    for p in (plots.data or []):
        crop = p.get("current_crop", "unknown")
        crop_counts[crop] = crop_counts.get(crop, 0) + 1
    top_crops = [{"crop": k, "count": v} for k, v in sorted(crop_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

    return {
        "schema_version": "1.0",
        "country_code": country,
        "total_plots": total,
        "avg_ndvi": round(avg_ndvi, 4),
        "disease_prevalence_pct": round(disease_pct, 2),
        "regenerative_adoption_pct": round(regen_pct, 2),
        "top_crops": top_crops,
        "generated_at": datetime.now().isoformat(),
    }