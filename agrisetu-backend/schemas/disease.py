"""Pydantic Schemas for Disease data."""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class DiseaseResult(BaseModel):
    """Result from disease CNN inference."""
    disease_name: str
    confidence_pct: float = Field(..., ge=0, le=100)
    severity: str = Field(default="unknown")
    treatment: str
    organic_remedy: str


class DiseaseReportCreate(BaseModel):
    """Schema for creating a disease report."""
    plot_id: Optional[UUID] = None
    disease_name: str
    confidence: float
    treatment: str
    organic_remedy: str
    severity: str = "unknown"
    image_url: Optional[str] = None


class DiseaseReportResponse(BaseModel):
    """Schema for disease report returned to client."""
    id: UUID
    plot_id: Optional[UUID]
    disease_name: str
    confidence: float
    treatment: str
    organic_remedy: str
    severity: str
    image_url: Optional[str]
    reported_at: datetime

    model_config = {"from_attributes": True}


class DiseaseReviewItem(DiseaseReportResponse):
    """Uncertain prediction awaiting agronomist review."""
    verified_label: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None


class DiseaseReviewUpdate(BaseModel):
    """Agronomist verdict on an uncertain prediction."""
    verified_label: str
    verified_by: str = "agronomist"