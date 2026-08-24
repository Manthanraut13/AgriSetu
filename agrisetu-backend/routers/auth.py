"""Auth Router — links Supabase Auth users to farmer profiles."""
import logging
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel

logger = logging.getLogger("agrisetu.auth")
router = APIRouter(prefix="/auth")


class LinkUserRequest(BaseModel):
    user_id: str
    phone: str


@router.post("/link", tags=["Auth"])
async def link_user_to_farmer(body: LinkUserRequest):
    """
    Link a Supabase Auth user_id to an existing farmer record (matched by phone).
    If no farmer exists for the phone, creates one with default values.
    """
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Normalize phone (strip + prefix for DB lookup since existing records may not have +)
    phone_clean = body.phone.replace("+", "").strip()

    # Try to find farmer by phone (with or without + prefix)
    existing = supabase.table("farmers").select("*").eq("phone", phone_clean).execute()
    if not existing.data:
        existing = supabase.table("farmers").select("*").eq("phone", f"+{phone_clean}").execute()
    if not existing.data:
        existing = supabase.table("farmers").select("*").eq("phone", body.phone).execute()

    if existing.data:
        farmer = existing.data[0]
        # Update user_id if not already linked
        if not farmer.get("user_id"):
            supabase.table("farmers").update({"user_id": body.user_id}).eq("id", farmer["id"]).execute()
            farmer["user_id"] = body.user_id
        return {"farmer": farmer, "created": False}

    # No farmer found — create one
    result = supabase.table("farmers").insert({
        "name": "Farmer",
        "phone": body.phone,
        "user_id": body.user_id,
        "language_pref": "hi",
        "country_code": "IN",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create farmer profile")

    logger.info(f"Created farmer profile for user {body.user_id}")
    return {"farmer": result.data[0], "created": True}


@router.get("/me", tags=["Auth"])
async def get_current_farmer(user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Get farmer profile by Supabase Auth user_id."""
    if not user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")

    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    result = supabase.table("farmers").select("*").eq("user_id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    return result.data[0]
