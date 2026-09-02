"""Scheduled Data Pipeline — refresh NDVI/soil/weather for all plots every 6 hours."""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger("agrisetu.scheduler")


async def refresh_all_plot_data():
    """Fetch fresh data for every registered plot."""
    from config import settings
    from supabase import create_client
    from services.satellite import fetch_ndvi, fetch_ndmi
    from services.weather import fetch_weather
    from services.soil import fetch_soil

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        plots = supabase.table("farm_plots").select("id, center_lat, center_lon").execute()
    except Exception as e:
        logger.error(f"Failed to fetch plots: {e}")
        return

    if not plots.data:
        logger.info("No registered plots to refresh")
        return

    logger.info(f"Refreshing data for {len(plots.data)} plots")

    for plot in plots.data:
        plot_id = plot["id"]
        lat = plot["center_lat"]
        lon = plot["center_lon"]

        if lat is None or lon is None:
            logger.warning(f"Plot {plot_id} missing coordinates, skipping")
            continue

        try:
            ndvi_val = await fetch_ndvi(lat, lon)
            ndmi_val = await fetch_ndmi(lat, lon)
            weather = await fetch_weather(lat, lon)
            soil = await fetch_soil(lat, lon)

            if ndvi_val is not None:
                supabase.table("ndvi_snapshots").insert({
                    "plot_id": plot_id, "ndvi": ndvi_val, "ndmi": ndmi_val,
                    "source": "Sentinel-2"
                }).execute()

            if weather:
                supabase.table("weather_cache").insert({
                    "plot_id": plot_id,
                    "temp_c": weather.get("temp_c"),
                    "humidity_pct": weather.get("humidity_pct"),
                    "rainfall_mm": weather.get("rainfall_mm"),
                    "wind_speed_ms": weather.get("wind_speed_ms"),
                }).execute()

            if soil:
                supabase.table("soil_data").insert({
                    "plot_id": plot_id,
                    "N": soil.get("N"), "P": soil.get("P"), "K": soil.get("K"),
                    "pH": soil.get("pH"), "moisture_pct": soil.get("moisture_pct"),
                    "organic_carbon_pct": soil.get("organic_carbon_pct"),
                    "source": soil.get("source"),
                }).execute()

            logger.info(f"Refreshed data for plot {plot_id}")

        except Exception as e:
            logger.error(f"Failed to refresh plot {plot_id}: {e}")


async def check_disease_alerts():
    """Check for disease outbreak conditions (3+ reports in same district, 7 days)."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        result = supabase.rpc("check_disease_outbreaks").execute()

        if not result.data:
            logger.info("Disease alerts: no outbreak conditions found")
            return

        for alert in result.data:
            district = alert["district"]
            disease = alert["disease_name"]
            count = alert["report_count"]

            existing = supabase.table("disease_alerts").select("*").eq(
                "district", district
            ).eq("disease_name", disease).eq("is_active", True).execute()

            if existing.data:
                supabase.table("disease_alerts").update({
                    "report_count": count,
                    "last_updated_at": "now()",
                }).eq("id", existing.data[0]["id"]).execute()
            else:
                supabase.table("disease_alerts").insert({
                    "region_name": district,
                    "district": district,
                    "disease_name": disease,
                    "crop": alert.get("crop", "unknown"),
                    "severity": "high" if count >= 5 else "medium",
                    "report_count": count,
                }).execute()

        logger.info(f"Disease alerts: {len(result.data)} conditions checked")
    except Exception as e:
        logger.error(f"Disease alert check failed: {e}")


scheduler = AsyncIOScheduler()


def start_scheduler():
    """Start the APScheduler job."""
    scheduler.add_job(
        refresh_all_plot_data,
        trigger=IntervalTrigger(hours=6),
        id="refresh_plot_data",
        replace_existing=True,
    )
    scheduler.add_job(
        check_disease_alerts,
        trigger=IntervalTrigger(hours=6),
        id="check_disease_alerts",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — plot refresh + disease alerts every 6 hours")


def stop_scheduler():
    """Stop the scheduler."""
    scheduler.shutdown()
    logger.info("Scheduler stopped")