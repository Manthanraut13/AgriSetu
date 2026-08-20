"""Disease Prediction Router — photo upload → CNN inference → result."""
import json
import logging
import os
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, File, UploadFile, HTTPException, Form

from schemas.disease import DiseaseResult, DiseaseReportCreate
from services.disease_model import predict_disease
from constants import ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES

logger = logging.getLogger("agrisetu.disease")
router = APIRouter(prefix="/disease")

# Load treatment lookup
TREATMENTS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "treatments.json")
_treatments = {}
if os.path.exists(TREATMENTS_PATH):
    with open(TREATMENTS_PATH, "r") as f:
        _treatments = json.load(f)


def _get_treatment(disease_name: str) -> dict:
    """Look up treatment for a disease."""
    # Try exact match first
    if disease_name in _treatments:
        return _treatments[disease_name]

    # Try partial match
    for key, val in _treatments.items():
        if disease_name.lower() in key.lower() or key.lower() in disease_name.lower():
            return val

    return {
        "treatment": "Consult a local agronomist for specific treatment advice.",
        "organic_remedy": "Remove affected plant parts and improve air circulation.",
    }


def _validate_image(file: UploadFile) -> None:
    """Validate uploaded image."""
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
    """
    Predict plant disease from an uploaded image.

    Accepts: JPEG, PNG, WebP (max 10MB)
    Returns: disease name, confidence, severity, treatment, organic remedy
    """
    # Validate
    _validate_image(file)

    # Read image bytes
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 10MB")

    # Run inference
    result = predict_disease(content)
    if result is None:
        raise HTTPException(status_code=500, detail="Disease prediction failed. Please try again.")

    # Look up treatment
    treatment_info = _get_treatment(result["disease_name"])

    # Build response
    disease_result = DiseaseResult(
        disease_name=result["disease_name"],
        confidence_pct=result["confidence_pct"],
        severity=result["severity"],
        treatment=treatment_info["treatment"],
        organic_remedy=treatment_info["organic_remedy"],
    )

    # Save report to DB in background
    try:
        from config import settings
        from supabase import create_client

        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        report = DiseaseReportCreate(
            plot_id=plot_id,
            disease_name=disease_result.disease_name,
            confidence=disease_result.confidence_pct / 100,
            treatment=disease_result.treatment,
            organic_remedy=disease_result.organic_remedy,
            severity=disease_result.severity,
        )
        supabase.table("disease_reports").insert(report.model_dump(mode="json")).execute()
        logger.info(f"Disease report saved: {disease_result.disease_name}")
    except Exception as e:
        logger.error(f"Failed to save disease report: {e}")

    return disease_result