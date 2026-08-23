"""Seed all missing data for existing plot."""
import sys
sys.path.insert(0, ".")
from config import settings
from supabase import create_client

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

plot_id = "4880977a-3a87-47d1-9fef-9f1f609ebbd1"

# Delete test rows (where n is null)
import postgrest
soil = supabase.table("soil_data").select("*").eq("plot_id", plot_id).execute()
for row in soil.data:
    if row.get("n") is None:
        supabase.table("soil_data").delete().eq("id", row["id"]).execute()

# Check existing soil
soil = supabase.table("soil_data").select("*").eq("plot_id", plot_id).execute()
if not soil.data:
    supabase.table("soil_data").insert({
        "plot_id": plot_id,
        "n": 52.0,
        "p": 38.5,
        "k": 44.0,
        "ph": 6.8,
        "moisture_pct": 12.4,
        "source": "SoilGrids",
    }).execute()
    print("Soil data seeded")
else:
    print("Soil data already exists")

# Check NDVI
ndvi = supabase.table("ndvi_snapshots").select("*").eq("plot_id", plot_id).execute()
print(f"NDVI: {len(ndvi.data)} rows")
if ndvi.data:
    print(f"  Latest: ndvi={ndvi.data[0].get('ndvi')}, ndmi={ndvi.data[0].get('ndmi')}")

# Check weather
weather = supabase.table("weather_cache").select("*").eq("plot_id", plot_id).execute()
print(f"Weather: {len(weather.data)} rows")
if weather.data:
    w = weather.data[0]
    print(f"  Latest: temp={w.get('temp_c')}C humidity={w.get('humidity_pct')}% rain={w.get('rainfall_mm')}mm wind={w.get('wind_speed_ms')}m/s")

# Check soil
soil = supabase.table("soil_data").select("*").eq("plot_id", plot_id).execute()
print(f"Soil: {len(soil.data)} rows")
if soil.data:
    s = soil.data[0]
    print(f"  Latest: N={s.get('n')} P={s.get('p')} K={s.get('k')} pH={s.get('ph')} moisture={s.get('moisture_pct')}%")
