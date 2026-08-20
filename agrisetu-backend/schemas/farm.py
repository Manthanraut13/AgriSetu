"""Pydantic Schemas for Farm-related data."""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class FarmerCreate(BaseModel):
    """Schema for creating a new farmer."""
    name: str = Field(..., min_length=1, max_length=100, strip_whitespace=True)
    phone: str = Field(..., min_length=10, max_length=15, strip_whitespace=True)
    language_pref: str = Field(default="hi", pattern="^[a-z]{2}$")
    country_code: str = Field(default="IN", pattern="^[A-Z]{2}$")


class FarmerResponse(BaseModel):
    """Schema for farmer data returned to client."""
    id: UUID
    name: str
    phone: str
    language_pref: str
    country_code: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PlotCreate(BaseModel):
    """Schema for creating a new farm plot."""
    farmer_id: UUID
    name: str = Field(default="", max_length=100)
    center_lat: float = Field(..., ge=-90, le=90)
    center_lon: float = Field(..., ge=-180, le=180)
    boundary: Optional[dict] = None  # GeoJSON Polygon
    area_ha: Optional[float] = Field(default=None, ge=0)
    district: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    country: str = Field(default="India", max_length=100)
    current_crop: Optional[str] = Field(default=None, max_length=100)
    last_crop: Optional[str] = Field(default=None, max_length=100)


class PlotResponse(BaseModel):
    """Schema for plot data returned to client."""
    id: UUID
    farmer_id: UUID
    center_lat: float
    center_lon: float
    area_ha: Optional[float]
    district: Optional[str]
    state: Optional[str]
    country: str
    current_crop: Optional[str]
    last_crop: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PlotSummary(BaseModel):
    """Full plot summary including fetched data."""
    plot: PlotResponse
    soil: Optional["SoilSummary"] = None
    weather: Optional["WeatherSummary"] = None
    ndvi: Optional["NdviSummary"] = None
    advisory: Optional["AdvisorySummary"] = None

# Resolve forward references
from schemas.advisory import SoilSummary, WeatherSummary, NdviSummary, AdvisorySummary
PlotSummary.model_rebuild()