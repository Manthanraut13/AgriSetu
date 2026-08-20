"""Dashboard Router — serves plot data for dashboard views."""
import logging
from fastapi import APIRouter, HTTPException

logger = logging.getLogger("agrisetu.dashboard")
router = APIRouter(prefix="/dashboard")


@router.get("/plots", tags=["Dashboard"])
async def get_all_plots():
    """Get all registered plots with their latest data."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    plots = supabase.table("farm_plots").select("*").execute()
    return plots.data


@router.get("/plots/{farmer_id}", tags=["Dashboard"])
async def get_farmer_plots(farmer_id: str):
    """Get all plots for a specific farmer."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    plots = supabase.table("farm_plots").select("*").eq("farmer_id", farmer_id).execute()
    return plots.data