"""Seed sample plots — run once: python scripts/seed_plots.py"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from supabase import create_client


def seed_plots():
    """Create 2 sample plots (Nashik, India + São Paulo, Brazil)."""
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Create sample farmer
    farmer_data = {
        "name": "Sample Farmer",
        "phone": "9999999999",
        "language_pref": "hi",
        "country_code": "IN",
    }

    existing = supabase.table("farmers").select("id").eq("phone", "9999999999").execute()
    if existing.data:
        farmer_id = existing.data[0]["id"]
        print(f"Farmer already exists: {farmer_id}")
    else:
        result = supabase.table("farmers").insert(farmer_data).execute()
        farmer_id = result.data[0]["id"]
        print(f"Created farmer: {farmer_id}")

    # Sample Plot 1: Nashik, Maharashtra, India
    nashik = {
        "farmer_id": farmer_id,
        "center_lat": 20.0,
        "center_lon": 73.8,
        "district": "Nashik",
        "state": "Maharashtra",
        "country": "India",
        "current_crop": "wheat",
        "last_crop": "chickpea",
        "area_ha": 2.5,
    }

    # Sample Plot 2: São Paulo, Brazil
    sao_paulo = {
        "farmer_id": farmer_id,
        "center_lat": -23.55,
        "center_lon": -46.63,
        "district": "Sao Paulo",
        "state": "Sao Paulo",
        "country": "Brazil",
        "current_crop": "soybean",
        "last_crop": "corn",
        "area_ha": 5.0,
    }

    for plot in [nashik, sao_paulo]:
        existing = supabase.table("farm_plots").select("id").eq(
            "center_lat", plot["center_lat"]
        ).eq("center_lon", plot["center_lon"]).execute()

        if existing.data:
            print(f"Plot already exists at ({plot['center_lat']}, {plot['center_lon']})")
            continue

        result = supabase.table("farm_plots").insert(plot).execute()
        plot_id = result.data[0]["id"]
        print(f"Created plot: {plot_id} at ({plot['center_lat']}, {plot['center_lon']})")

    print("\n✓ Sample plots seeded!")
    print("Run the scheduler or trigger data fetch to populate NDVI/weather/soil data.")


if __name__ == "__main__":
    seed_plots()