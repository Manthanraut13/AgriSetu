"""Disease Prediction Router — photo upload → CNN/Gemini → result."""
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Form

from schemas.disease import DiseaseResult
from services.disease_model import predict_disease
from constants import ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES

logger = logging.getLogger("agrisetu.disease")
router = APIRouter(prefix="/disease")


def _validate_image(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Only JPEG, PNG, and WebP images are accepted. Got: {file.content_type}"
        )


@router.post("/predict", response_model=DiseaseResult, tags=["Disease"])
async def predict_disease_endpoint(
    file: UploadFile = File(...),
    plot_id: Optional[str] = Form(None),
):
    _validate_image(file)

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 10MB")

    result = predict_disease(content)
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

    # Save to DB
    try:
        from config import settings
        from supabase import create_client
        from uuid import uuid4

        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        supabase.table("disease_reports").insert({
            "plot_id": plot_id if plot_id else str(uuid4()),
            "disease_name": disease_result.disease_name,
            "confidence": disease_result.confidence_pct / 100,
            "treatment": disease_result.treatment,
            "organic_remedy": disease_result.organic_remedy,
            "severity": disease_result.severity,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to save disease report: {e}")

    return disease_result
