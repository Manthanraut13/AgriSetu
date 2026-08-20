"""Pydantic Schemas for BRICS Interoperability API."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class BRICSLocation(BaseModel):
    """BRICS shared location schema."""
    lat: float
    lon: float
    area_ha: float


class BRICSSoil(BaseModel):
    """BRICS shared soil schema."""
    N: float = 0
    P: float = 0
    K: float = 0
    pH: float = 0
    moisture_pct: float = 0


class BRICSWeather(BaseModel):
    """BRICS shared weather schema."""
    temp_c: float = 0
    humidity_pct: float = 0
    rainfall_mm: float = 0


class BRICSNdvi(BaseModel):
    """BRICS shared NDVI schema."""
    value: float = 0
    date: str
    source: str = "Sentinel-2"


class BRICSAdvisory(BaseModel):
    """BRICS shared advisory schema."""
    recommended_crop: str
    confidence: float
    sowing_window: str
    irrigation_days: int


class BRICSDiseaseReport(BaseModel):
    """BRICS shared disease report schema."""
    disease: str
    confidence: float
    date: str


class BRICSAdvisoryRequest(BaseModel):
    """Full BRICS advisory response."""
    schema_version: str = "1.0"
    country_code: str
    plot_id: str
    timestamp: str
    location: BRICSLocation
    soil: BRICSSoil
    weather: BRICSWeather
    ndvi: BRICSNdvi
    advisory: BRICSAdvisory
    disease_reports: List[BRICSDiseaseReport] = []
    regenerative_practices: List[str] = []


class BRICSDiseaseReportRequest(BaseModel):
    """BRICS disease report submission."""
    plot_id: Optional[str] = None
    country_code: str = "IN"
    disease_name: str
    confidence: float
    treatment: Optional[str] = None
    date: str = Field(default_factory=lambda: datetime.now().isoformat())


class BRICSAggregate(BaseModel):
    """BRICS aggregate stats."""
    schema_version: str = "1.0"
    country_code: str
    total_plots: int
    avg_ndvi: float
    disease_prevalence_pct: float
    regenerative_adoption_pct: float
    top_crops: List[dict] = []
    generated_at: str