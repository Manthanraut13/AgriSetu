"""Disease Prediction Router — photo upload → CNN/Gemini → result."""
import json
import logging
import os
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Depends

from schemas.disease import DiseaseResult, DiseaseReviewItem, DiseaseReviewUpdate
from services.disease_model import predict_disease
from constants import ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES

logger = logging.getLogger("agrisetu.disease")
router = APIRouter(prefix="/disease")


def _validate_image(file: UploadFile) -> None:
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()
    is_valid_type = content_type in ALLOWED_IMAGE_TYPES or content_type.startswith("image/")
    is_valid_ext = any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".jfif"])
    if not (is_valid_type or is_valid_ext):
        raise HTTPException(
            status_code=400,
            detail=f"Only JPEG, PNG, and WebP images are accepted. Got: {file.content_type}"
        )


@router.post("/predict", response_model=DiseaseResult, tags=["Disease"])
def predict_disease_endpoint(
    file: UploadFile = File(...),
    plot_id: Optional[str] = Form(None),
    language: Optional[str] = Form("hi"),
):
    _validate_image(file)

    content = file.file.read()
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 10MB")

    lang_code = language or "hi"
    result = predict_disease(content, language=lang_code)
    if result is None:
        raise HTTPException(status_code=500, detail="Could not analyze the image. Please try a clearer photo.")

    # Check for Gemini error (e.g., not a leaf)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    # Use model's own treatment if available, else fallback
    treatment = result.get("treatment", "Consult a local agronomist.")
    organic = result.get("organic_remedy", "Remove affected plant parts.")

    # Try to enrich with our local treatments.json (for CNN-identified diseases)
    if result.get("source") == "CNN":
        treatments_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "treatments.json")
        if os.path.exists(treatments_path):
            with open(treatments_path) as f:
                treatments = json.load(f)
            raw_name = result["disease_name"]
            for key in treatments:
                if key.lower().replace("_", " ") in raw_name.lower() or raw_name.lower().replace(" ", "_") in key.lower():
                    treatment = treatments[key].get("treatment", treatment)
                    organic = treatments[key].get("organic_remedy", organic)
                    break

    disease_result = DiseaseResult(
        disease_name=result["disease_name"],
        confidence_pct=result["confidence_pct"],
        severity=result["severity"],
        treatment=treatment,
        organic_remedy=organic,
    )

    # Save to DB + store image in Supabase Storage
    try:
        from config import settings
        from supabase import create_client
        from uuid import uuid4

        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

        # Store image in Supabase Storage (disease-reports bucket)
        image_url = None
        try:
            from uuid import uuid4 as _uuid
            ext = (file.filename or "photo.jpg").rsplit(".", 1)[-1]
            img_path = f"reports/{_uuid()}.{ext}"
            supabase.storage.from_("disease-reports").upload(
                img_path, content, {"content-type": file.content_type or "image/jpeg"}
            )
            image_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/disease-reports/{img_path}"
        except Exception as img_err:
            logger.warning(f"Image upload failed (non-critical): {img_err}")

        report_data = {
            "disease_name": disease_result.disease_name,
            "confidence": disease_result.confidence_pct / 100,
            "treatment": disease_result.treatment,
            "organic_remedy": disease_result.organic_remedy,
            "severity": disease_result.severity,
        }
        if plot_id:
            report_data["plot_id"] = plot_id
        if image_url:
            report_data["image_url"] = image_url
        supabase.table("disease_reports").insert(report_data).execute()
    except Exception as e:
        logger.error(f"Failed to save disease report: {e}")

    return disease_result


# ─── Review Endpoints ───────────────────────────────────────

@router.get("/review", response_model=list[DiseaseReviewItem], tags=["Disease"])
async def get_uncertain_predictions(limit: int = 20):
    """List low-confidence predictions awaiting agronomist review."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    res = supabase.table("disease_reports").select("*").lt(
        "confidence", 0.70
    ).is_(
        "verified_label", "null"
    ).order("reported_at", desc=True).limit(limit).execute()

    return [DiseaseReviewItem(**row) for row in res.data]


@router.post("/review/{report_id}", response_model=DiseaseReviewItem, tags=["Disease"])
async def verify_report(report_id: str, update: DiseaseReviewUpdate):
    """Agronomist verdict on an uncertain prediction — sets verified_label."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    res = supabase.table("disease_reports").select("*").eq("id", report_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Report not found")

    supabase.table("disease_reports").update({
        "verified_label": update.verified_label,
        "verified_by": update.verified_by,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", report_id).execute()

    updated = supabase.table("disease_reports").select("*").eq("id", report_id).execute()
    return DiseaseReviewItem(**updated.data[0])
