"""Check actual columns in each table."""
import sys
sys.path.insert(0, ".")
from config import settings
from supabase import create_client

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

tables = ["weather_cache", "soil_data", "ndvi_snapshots", "disease_reports"]
for t in tables:
    result = supabase.table(t).select("*").limit(1).execute()
    if result.data:
        print(f"{t}: {list(result.data[0].keys())}")
    else:
        print(f"{t}: EMPTY (no rows)")
