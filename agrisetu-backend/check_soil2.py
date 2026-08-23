"""Brute-force find soil_data columns."""
import sys
sys.path.insert(0, ".")
from config import settings
from supabase import create_client

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# Try minimal insert with just plot_id
try:
    result = supabase.table("soil_data").insert({
        "plot_id": "4880977a-3a87-47d1-9fef-9f1f609ebbd1",
    }).execute()
    print(f"plot_id only: OK! Columns in row: {list(result.data[0].keys())}")
except Exception as e:
    print(f"plot_id only failed: {e}")
