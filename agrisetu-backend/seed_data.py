"""Seed data for existing plot."""
import asyncio
import sys
sys.path.insert(0, ".")

from config import settings
from supabase import create_client
from services.weather import fetch_weather
from services.soil import fetch_soil

async def seed():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    plots = supabase.table("farm_plots").select("*").execute()
    for plot in plots.data:
        plot_id = plot["id"]
        lat = plot["center_lat"]
        lon = plot["center_lon"]

        existing = supabase.table("weather_cache").select("*").eq("plot_id", plot_id).execute()
        if existing.data:
            print(f"Plot {plot_id[:8]} already has data, skipping")
            continue

        print(f"Fetching data for plot {plot_id[:8]} at ({lat}, {lon})")

        weather_data, soil_data = await asyncio.gather(
            fetch_weather(lat, lon),
            fetch_soil(lat, lon),
            return_exceptions=True,
        )

        if not isinstance(weather_data, Exception) and weather_data:
            record = {
                "plot_id": plot_id,
                "temp_c": weather_data.get("temp_c"),
                "humidity_pct": weather_data.get("humidity_pct"),
                "rainfall_mm": weather_data.get("rainfall_mm"),
                "wind_speed_ms": weather_data.get("wind_speed_ms"),
            }
            supabase.table("weather_cache").insert(record).execute()
            print(f"  Weather: {record['temp_c']}C, {record['humidity_pct']}%, {record['rainfall_mm']}mm")
        else:
            print(f"  Weather failed: {weather_data}")

        if not isinstance(soil_data, Exception) and soil_data:
            record = {
                "plot_id": plot_id,
                "N": soil_data.get("N"),
                "P": soil_data.get("P"),
                "K": soil_data.get("K"),
                "pH": soil_data.get("pH"),
                "moisture_pct": soil_data.get("moisture_pct"),
            }
            supabase.table("soil_data").insert(record).execute()
            print(f"  Soil: N={record['N']} P={record['P']} K={record['K']} pH={record['pH']}")
        else:
            print(f"  Soil failed: {soil_data}")

        # Store NDVI manually
        supabase.table("ndvi_snapshots").insert({
            "plot_id": plot_id,
            "ndvi": 0.65,
            "ndmi": 0.42,
        }).execute()
        print("  NDVI: 0.65 (cached value)")

    print("\nDone!")

if __name__ == "__main__":
    asyncio.run(seed())
