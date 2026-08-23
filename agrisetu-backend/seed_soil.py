"""Directly seed soil data for the existing plot."""
import sys
sys.path.insert(0, ".")
from config import settings
from supabase import create_client

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

plots = supabase.table("farm_plots").select("id").execute()
plot_id = plots.data[0]["id"]

existing = supabase.table("soil_data").select("*").eq("plot_id", plot_id).execute()
if not existing.data:
    supabase.table("soil_data").insert({
        "plot_id": plot_id,
        "N": 52.0,
        "P": 38.5,
        "K": 44.0,
        "pH": 6.8,
        "moisture_pct": 12.4,
    }).execute()
    print(f"Seeded soil data for {plot_id[:8]}")
else:
    print("Soil data already exists")

# Verify all data
print("\n=== Verification ===")
for table in ["ndvi_snapshots", "weather_cache", "soil_data"]:
    rows = supabase.table(table).select("*").eq("plot_id", plot_id).execute()
    print(f"{table}: {len(rows.data)} rows")
    if rows.data:
        for r in rows.data:
            print(f"  {r}")
