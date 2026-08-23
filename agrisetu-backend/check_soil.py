"""Get soil_data columns by trying each possible column name."""
import sys
sys.path.insert(0, ".")
from config import settings
from supabase import create_client

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# Try select * with empty result to see columns
# Let's use RPC to get table info
result = supabase.rpc("get_soil_columns").execute()
print(result)
