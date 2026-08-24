"""Check exact columns by inserting minimal record."""
import sys
sys.path.insert(0, ".")
from config import settings
from supabase import create_client

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# Try to get column info from existing rows (won't work if empty)
# Let's try inserting with only known columns from schema
# Schema: plot_id, N, P, pH, moisture_pct, fetched_at
# No K column!
print("Trying known columns from schema...")
try:
    result = supabase.table("soil_data").insert({
        "plot_id": "4880977a-3a87-47d1-9fef-9f1f609ebbd1",
        "N": 52.0,
        "P": 38.5,
        "pH": 6.8,
        "moisture_pct": 12.4,
    }).execute()
    print(f"Success! {result.data}")
except Exception as e:
    print(f"Failed: {e}")
    # Try with just plot_id and pH
    try:
        result = supabase.table("soil_data").insert({
            "plot_id": "4880977a-3a87-47d1-9fef-9f1f609ebbd1",
            "pH": 6.8,
        }).execute()
        print(f"Minimal insert worked: {result.data}")
    except Exception as e2:
        print(f"Minimal also failed: {e2}")

# Check weather_cache columns
print("\nChecking weather_cache columns...")
try:
    result = supabase.table("weather_cache").select("*").limit(1).execute()
    if result.data:
        print(f"weather_cache columns: {list(result.data[0].keys())}")
    else:
        print("weather_cache is empty")
except Exception as e:
    print(f"Error: {e}")

# Check ndvi_snapshots columns
print("\nChecking ndvi_snapshots columns...")
try:
    result = supabase.table("ndvi_snapshots").select("*").limit(1).execute()
    if result.data:
        print(f"ndvi_snapshots columns: {list(result.data[0].keys())}")
    else:
        print("ndvi_snapshots is empty")
except Exception as e:
    print(f"Error: {e}")
