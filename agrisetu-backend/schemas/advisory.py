"""Pydantic Schemas for Advisory data."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class SoilSummary(BaseModel):
    """Summary of soil data for display."""
    N: Optional[float] = None
    P: Optional[float] = None
    K: Optional[float] = None
    pH: Optional[float] = None
    moisture_pct: Optional[float] = None
    organic_carbon_pct: Optional[float] = None
    source: Optional[str] = None


class WeatherSummary(BaseModel):
    """Summary of weather data for display."""
    temp_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    rainfall_mm: Optional[float] = None
    wind_speed_ms: Optional[float] = None


class NdviSummary(BaseModel):
    """Summary of NDVI data for display."""
    ndvi: Optional[float] = None
    ndmi: Optional[float] = None
    image_date: Optional[str] = None


class CropRecommendation(BaseModel):
    """Single crop recommendation."""
    crop: str
    confidence: float = Field(..., ge=0, le=1)
    sowing_window: str
    irrigation_days: int


class RegenerativePractice(BaseModel):
    """Regenerative agriculture suggestion."""
    practice: str
    description: str
    priority: str  # "high", "medium", "low"


class AdvisoryCreate(BaseModel):
    """Schema for creating an advisory."""
    plot_id: UUID
    recommended_crop: str
    confidence: float
    sowing_window: str
    irrigation_schedule: str
    regenerative_practices: List[str] = []
    risk_alerts: List[str] = []
    raw_input_snapshot: Optional[dict] = None


class AdvisoryResponse(BaseModel):
    """Schema for advisory returned to client."""
    id: UUID
    plot_id: UUID
    recommended_crop: str
    confidence: float
    sowing_window: str
    irrigation_schedule: str
    regenerative_practices: List[str]
    risk_alerts: List[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AdvisorySummary(BaseModel):
    """Brief advisory summary for plot view."""
    recommended_crop: str
    confidence: float
    sowing_window: str
    irrigation_schedule: str


class FullAdvisory(BaseModel):
    """Complete advisory response with all context."""
    plot_id: UUID
    soil: Optional[SoilSummary] = None
    weather: Optional[WeatherSummary] = None
    ndvi: Optional[NdviSummary] = None
    recommendations: List[CropRecommendation] = []
    regenerative_practices: List[RegenerativePractice] = []
    risk_alerts: List[str] = []