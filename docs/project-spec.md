# AgriSetu — Complete System Architecture & Next-Generation Professional UI/UX Master Specification

> **Project Title:** AgriSetu — Interoperable Digital Agriculture Network for BRICS Farmers  
> **Documentation Version:** 2.0 (Comprehensive Architectural & Next-Gen Professional UI Blueprint)  
> **Build Window:** August 2026 | **Alignment:** BRICS Indore Declaration (July 2026) & Digital Public Infrastructure (DPI)

---

## 1. Executive Vision & System Overview

### 1.1 Product Overview
**AgriSetu** (Sanskrit: *Setu* — Bridge) is an enterprise-grade digital agriculture network that bridges high-resolution satellite remote sensing, soil chemistry, hyper-local weather forecasting, and artificial intelligence into last-mile agronomic advisories. Delivered over Web, Voice, or WhatsApp in a farmer's local language, AgriSetu also exposes open REST endpoints implementing the **BRICS Agri Data Model 1.0** schema to enable cross-border agricultural data interoperability among BRICS member states.

### 1.2 Policy Alignment — The Indore Declaration (July 2026)
AgriSetu directly operationalizes the four core pillars of the BRICS agricultural framework:
1. **BRICS AgriN:** Shared open schema for genetic resources, soil health indices, and crop performance telemetry.
2. **BRICS Network on Digital Agriculture (IIT Delhi):** Geospatial satellite analytics, digital public infrastructure (DPI), and machine learning at scale.
3. **BRICS Network of Centres of Excellence on Agro-Ecology (ICAR-IIFSR):** AI-driven regenerative farming overlays (intercropping, cover cropping, reduced tillage, organic nutrient management).
4. **Global Forum on Farmers' Rights in Seed Systems:** Preservation of local seed varieties and traditional farming knowledge via RAG-indexed knowledge repositories.

### 1.3 Target Stakeholders & User Personas

| Stakeholder Persona | Profile & Operational Needs | UI/UX Interface Paradigm |
| :--- | :--- | :--- |
| **Smallholder Farmer** | Low literacy, mobile-first, native language speaker. Needs a clean, calm, zero-friction interface with color-coded metrics, large touch targets, and instant voice assistance. | **Farmer Telemetry Hub (Calm View)** & **WhatsApp Bot** (375px+ responsive mobile card layout) |
| **FPO Lead / Agronomist** | Data-literate professional managing hundreds of farm plots. Requires spatial maps, satellite layer toggles, disease heatmaps, filterable telemetry tables, and export capabilities. | **Agronomist Command Center (Analytical View)** (Desktop/Tablet split-pane with GIS canvas & data grids) |
| **BRICS Partner Institution** | Academic researcher or cross-border agency consuming/producing agricultural telemetry data. | **BRICS Interoperability Portal & OpenAPI Swagger Engine** |
| **Policy Maker / Government** | Executive requiring regional health overviews, drought warnings, and pest epidemic tracking. | **Executive Aggregate Dashboard** (High-level data charts & heatmaps) |

---

## 2. Full Technical System Architecture & Endpoints

### 2.1 Decoupled 3-Layer Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TOUCHPOINTS LAYER                                     │
│  Next-Gen Web SPA (React)  │  Voice Interface (ASR/TTS)  │  WhatsApp Bot (Twilio/Meta) │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTPS / REST / Webhook
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            ADVISORY GATEWAY (FastAPI Engine)                           │
│     Lifespan Async Model Loaders  │  CorsMiddleware  │  Pydantic Validation Layer    │
└───────────┬───────────────────────────────┬───────────────────────────────┬────────────┘
            │                               │                               │
            ▼                               ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐       ┌────────────────────────┐
│  DISEASE DIAGNOSTIC   │       │   CROP ADVISORY       │       │ VOICE & RAG PIPELINE   │
│  MobileNetV3 PyTorch  │       │   XGBoost Model       │       │ Bhashini / Whisper ASR │
│  + Gemini Flash 1.5   │       │   + Rule-Based        │       │ Supabase pgvector RAG  │
│  Vision Fallback      │       │     Regenerative Layer│       │ Claude / Gemini LLM    │
└───────────┬───────────┘       └───────────┬───────────┘       └───────────┬────────────┘
            │                               │                               │
            └───────────────────────────────┼───────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           DATA CORE (Supabase Cloud)                                   │
│    PostgreSQL 15  │  PostGIS (Spatial Polygon Geometry)  │  pgvector (HNSW Cosine RAG)  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL INTEGRATION NETWORK                                   │
│ Sentinel Hub (NDVI/NDMI) │ NASA POWER (Weather) │ OpenWeatherMap │ SoilGrids │ Bhashini  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 FastAPI Backend Routers & API Contracts

#### Router 1: System Health & Info (`routers/health.py`)
* `GET /api/v1/health`
  - **Description:** Verifies service uptime, environment configuration, and database connection.
  - **Response (200 OK):**
    ```json
    { "status": "ok", "service": "AgriSetu Backend", "version": "1.0.0", "environment": "production" }
    ```

#### Router 2: Onboarding & Plot Registration (`routers/onboarding.py`)
* `POST /api/v1/onboarding/farmer`
  - **Payload:** `{ "name": "Rajesh Kumar", "phone": "+919876543210", "language_pref": "hi", "country_code": "IN" }`
  - **Response (201 Created):** `{ "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "status": "created" }`
* `POST /api/v1/onboarding/plot`
  - **Payload:**
    ```json
    {
      "farmer_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "center_lat": 20.0055,
      "center_lon": 73.7850,
      "boundary_geojson": {
        "type": "Polygon",
        "coordinates": [[[73.784, 20.005], [73.786, 20.005], [73.786, 20.006], [73.784, 20.006], [73.784, 20.005]]]
      },
      "district": "Nashik",
      "state": "Maharashtra",
      "country": "India",
      "current_crop": "Wheat",
      "last_crop": "Chickpea"
    }
    ```
  - **Logic:** Saves spatial polygon in PostGIS via ST_GeomFromGeoJSON, calculates area in hectares, automatically triggers background data ingestion (Sentinel-2 satellite NDVI, SoilGrids NPK/pH, NASA POWER weather).
* `GET /api/v1/onboarding/plot/{plot_id}`
  - **Response (200 OK):** Complete consolidated telemetry object (farm plot metadata, latest soil readings, satellite NDVI snapshot, weather projections).
* `GET /api/v1/onboarding/plots`
  - **Response (200 OK):** Array of all registered farm plots for session.

#### Router 3: Plant Disease Diagnostics (`routers/disease.py`)
* `POST /api/v1/disease/diagnose`
  - **Content-Type:** `multipart/form-data` (Image File upload).
  - **Processing:** Passes image through PyTorch MobileNetV3 CNN model. If confidence < 60%, automatically escalates to Google Gemini 1.5 Flash Vision API.
  - **Response (200 OK):**
    ```json
    {
      "disease_name": "Tomato Late Blight",
      "confidence_pct": 88.4,
      "severity": "high",
      "source": "Gemini Vision",
      "description": "Fungal infection causing dark water-soaked spots on leaves and fruit.",
      "treatment": "Apply copper-based fungicide (Mancozeb 75% WP @ 2g/L water) immediately.",
      "organic_remedy": "Spray Neem oil solution (5ml/L) and remove infected lower leaves.",
      "reported_at": "2026-08-22T14:30:00Z"
    }
    ```

#### Router 4: Crop & Irrigation Advisory (`routers/advisory.py`)
* `GET /api/v1/advisory/{plot_id}`
  - **Processing:** Retrieves soil chemistry + weather forecast + NDVI metrics for plot, runs XGBoost Crop Recommendation model, applies rule-based agro-ecological post-processor.
  - **Response (200 OK):**
    ```json
    {
      "plot_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "recommendations": [
        { "crop": "Wheat", "confidence": 0.94, "sowing_window": "15 Oct - 30 Oct", "irrigation_days": 7 },
        { "crop": "Mustard", "confidence": 0.81, "sowing_window": "01 Oct - 15 Oct", "irrigation_days": 10 }
      ],
      "regenerative_practices": [
        { "practice": "Legume Intercropping", "priority": "high", "description": "Intercrop wheat with mustard or chickpea to fix atmospheric nitrogen." },
        { "practice": "Reduced Tillage", "priority": "medium", "description": "Retain crop residue to improve organic matter and soil moisture retention." }
      ],
      "risk_alerts": [
        "Low soil Nitrogen detected (N=45 mg/kg). Nitrogen boost required.",
        "Unseasonal rainfall projected in Week 3. Ensure proper drainage channels."
      ]
    }
    ```

#### Router 5: Multilingual Conversational Chat (`routers/chat.py`)
* `POST /api/v1/chat/ask`
  - **Payload:** `{ "message": "मेरी फसल में पानी कब देना चाहिए?", "language": "hi", "plot_id": "uuid" }`
  - **Processing:** Translates input query via Bhashini if needed -> Performs cosine vector search (`pgvector`) over agronomy knowledge base -> Injects live farm context (soil, weather, last disease report) into LLM system prompt -> Returns answer in user's language.

#### Router 6: Voice Pipeline (`routers/voice.py`)
* `POST /api/v1/voice/ask`
  - **Content-Type:** `multipart/form-data` (Audio file `voice.webm`).
  - **Processing:** Audio file -> Bhashini ASR / OpenAI Whisper -> Text query -> RAG Chat Pipeline -> Bhashini TTS / Coqui TTS -> Audio URL generation.
  - **Response (200 OK):** `{ "text_response": "...", "audio_url": "https://.../speech.mp3" }`

#### Router 7: WhatsApp Integration (`routers/whatsapp.py`)
* `POST /api/v1/whatsapp/webhook`
  - Webhook entrypoint handling Twilio / Meta Cloud API inbound payloads. Automatically handles incoming text questions, voice notes, and leaf photos.

#### Router 8: BRICS Interoperability API (`routers/brics.py`)
* `GET /api/v1/brics/advisory/{plot_id}` — Returns complete Agri Data Model 1.0 JSON schema.
* `POST /api/v1/brics/disease-report` — Accepts external disease reports from partner systems.
* `GET /api/v1/brics/plots/aggregate` — Delivers anonymized aggregate telemetry stats across regions.

---

## 3. Complete Database Schema & PostGIS Specifications

The database runs on **Supabase (PostgreSQL 15)** with `postgis` and `vector` extensions enabled.

```sql
-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Farmers Table
CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  language_pref TEXT DEFAULT 'hi',
  country_code TEXT DEFAULT 'IN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Farm Plots Table (PostGIS Geospatial Geometry)
CREATE TABLE farm_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  boundary GEOMETRY(POLYGON, 4326),
  center_lat FLOAT NOT NULL,
  center_lon FLOAT NOT NULL,
  area_ha FLOAT,
  district TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  current_crop TEXT,
  last_crop TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farm_plots_boundary ON farm_plots USING GIST (boundary);

-- 4. Soil Data Table
CREATE TABLE soil_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE CASCADE,
  N FLOAT, P FLOAT, K FLOAT, pH FLOAT,
  moisture_pct FLOAT,
  organic_carbon_pct FLOAT,
  source TEXT DEFAULT 'SoilGrids',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Satellite NDVI Snapshots Table
CREATE TABLE ndvi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE CASCADE,
  ndvi FLOAT,
  ndmi FLOAT,
  image_date DATE,
  source TEXT DEFAULT 'Sentinel-2',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Weather Cache Table
CREATE TABLE weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE CASCADE,
  temp_c FLOAT,
  humidity_pct FLOAT,
  rainfall_mm FLOAT,
  wind_speed_ms FLOAT,
  forecast_json JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Advisories Table
CREATE TABLE advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE CASCADE,
  recommended_crop TEXT,
  confidence FLOAT,
  sowing_window TEXT,
  irrigation_schedule TEXT,
  regenerative_practices TEXT[],
  risk_alerts TEXT[],
  raw_input_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Disease Reports Table (Heatmap Engine)
CREATE TABLE disease_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id) ON DELETE SET NULL,
  disease_name TEXT NOT NULL,
  confidence FLOAT,
  treatment TEXT,
  organic_remedy TEXT,
  severity TEXT DEFAULT 'Moderate',
  image_url TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Knowledge Base Table (pgvector HNSW Cosine Index)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(384),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_embedding ON knowledge_base
  USING hnsw (embedding vector_cosine_ops);

-- 10. Vector Similarity Search Function (RPC)
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(384),
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 4. Machine Learning Models, AI Vision & RAG Pipelines

### 4.1 PyTorch MobileNetV3 CNN + Gemini Vision Fallback
* **Dataset:** 54,000+ images from PlantVillage (38 disease classes) combined with PlantDoc real-field noisy images.
* **Architecture:** Transfer learning with MobileNetV3-Small backbone pretrained on ImageNet, unfreezing final convolutional blocks for fine-tuning.
* **Dual Inference Logic:**
  - Fast Inference: Local PyTorch CNN evaluates leaf image (< 300ms latency).
  - High-Confidence Path: If CNN confidence >= 60%, return prediction directly.
  - Multimodal Vision Fallback: If CNN confidence < 60%, escalate image to `Gemini 1.5 Flash Vision` API to inspect leaf lesion patterns and return authoritative diagnosis with detailed description.

### 4.2 XGBoost Crop Recommendation & Regenerative Rules Engine
* **Training Data:** Kaggle Crop Recommendation Dataset (2,200 samples covering N, P, K, pH, temperature, humidity, rainfall across 22 crop classes).
* **Predictive Pipeline:** Accepts live telemetry array `[N, P, K, temp_c, humidity_pct, pH, rainfall_mm]` -> Outputs top 3 ranked crops with probability scores.
* **Regenerative Overlay:** Rule-based algorithm overlays sustainable agro-ecological practices:
  - If `last_crop` == Legume -> Add +20 kg/ha N credit, reduce recommended synthetic nitrogen fertilizer.
  - If `ndvi` < 0.3 -> Mandate immediate cover crop (e.g., Sesbania / Cowpea) post-harvest.
  - If `soil_pH` < 6.0 -> Recommend agricultural lime application; if pH > 7.5 -> Recommend gypsum application.
  - If `rainfall_mm` > 100 mm in 7-day forecast -> Delay sowing window recommendation by 10 days.

### 4.3 Agronomy Knowledge Base & Vector RAG Pipeline
* **Knowledge Corpus:** 21 curated text documents in `data/agronomy_kb/`:
  `01_wheat_irrigation.txt`, `02_rice_cultivation.txt`, `03_common_diseases.txt`, `04_intercropping.txt`, `05_organic_farming.txt`, `06_cover_crops.txt`, `07_soil_ph_management.txt`, `08_reduced_tillage.txt`, `09_sugarcane_guide.txt`, `10_vegetable_tips.txt`, `11_ndvi_interpretation.txt`, `12_ipm_practices.txt`, `13_water_conservation.txt`, `14_climate_resilient.txt`, `15_maize_guide.txt`, `16_legume_rotation.txt`, `17_post_harvest.txt`, `18_fertilizer_management.txt`, `19_millet_cultivation.txt`, `20_soil_testing.txt`, `21_agroforestry.txt`.
* **Embedding Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensions, multilingual support).
* **Contextual RAG Retrieval:** Queries are embedded into 384-dim vectors, matched via `match_knowledge_base` RPC, and combined with farm context (soil NPK, weather, current crop, last disease alert) to generate non-hallucinated, highly localized agricultural advice.

---

## 5. Next-Generation Professional & Calm UI/UX Design System Specification

### 5.1 UI/UX Design Vision — "Calm Agritech Technology"
The new UI design abandons generic, crowded hackathon styling in favor of **Calm Agritech Engineering** — an ultra-clean, serene, organic, and executive aesthetic inspired by modern minimalist design, premium fintech apps (Linear, Stripe, Apple Health), and high-end GIS consoles.

#### Design Principles:
1. **Serene Visual Restraint:** Soft porcelain canvases, ample white space, elegant typography, subtle borders, zero harsh shadows.
2. **Organic Color Palette:** Soft sage greens, deep forest emeralds, oceanic slate blues, warm sandstone ambers, and clean crisp cards.
3. **Data Clarity & Ergonomics:** High contrast status indicators, beautiful ring gauges, clean sparklines, and intuitive spatial map overlays.
4. **Fluid Responsiveness:** Mobile-first layout for smallholder farmers (single-column cards, large tap targets) transitioning into a dual-pane command console on desktop for agronomists.

---

### 5.2 Next-Gen Color Tokens & Palette Matrix

```css
:root {
  /* Brand Core - Deep Forest & Serene Sage */
  --emerald-dark:     #132A13; /* Deepest Forest Emerald - Executive Header & Primary Typography */
  --emerald-primary:  #1F402B; /* Deep Pine Green - Primary Action CTAs & Active Elements */
  --sage-accent:      #3A5A40; /* Sage Leaf - Secondary Controls, Muted Badges */
  --sage-muted:       #588157; /* Soft Forest Green - Active Tab Indicators, Borders */
  --sage-light:       #A3B18A; /* Light Willow - Background Tints & Soft Highlights */
  --sage-canvas:      #DAD7CD; /* Warm Sandstone Neutral - Accent Borders & Muted Backgrounds */

  /* Surface & Canvas System */
  --canvas-bg:        #F4F6F4; /* Ultra-Calm Off-White Porcelain Page Background */
  --surface-card:     #FFFFFF; /* Pure Clean White Card Fill */
  --surface-glass:    rgba(255, 255, 255, 0.85); /* Glassmorphism Overlay Fill */
  --border-subtle:    #E2E8F0; /* Delicate Border Gray */

  /* Status & Indicator Spectrum */
  --status-good:      #2E7D32; /* Deep Serene Green - Optimal Health / NDVI >= 0.5 */
  --status-good-bg:   #E8F5E9; /* Soft Mint Surface */
  
  --status-watch:     #D97706; /* Warm Sand Amber - Caution Alert / NDVI 0.3-0.5 */
  --status-watch-bg:  #FEF3C7; /* Soft Warm Sand Surface */

  --status-danger:    #DC2626; /* Soft Crimson - Urgent Alert / Disease / NDVI < 0.3 */
  --status-danger-bg: #FEE2E2; /* Soft Blush Surface */

  --telemetry-blue:   #0D9488; /* Oceanic Teal - Hydration, Irrigation & Soil Moisture */
  --telemetry-blue-bg:#CCFBF1; /* Light Aqua Surface */
}
```

---

### 5.3 Typography Matrix (`Plus Jakarta Sans` / `Inter`)

| Type Role | Font Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Executive Brand**| `Plus Jakarta Sans`, sans-serif | 32px / 2rem | 800 (ExtraBold) | 1.2 | Main Navigation Logo & Hero Titles |
| **Section Header** | `Plus Jakarta Sans`, sans-serif | 22px / 1.375rem | 700 (Bold) | 1.3 | Dashboard Section Headers |
| **Card Title** | `Plus Jakarta Sans`, sans-serif | 16px / 1rem | 600 (SemiBold) | 1.4 | Telemetry & Advisory Card Headers |
| **Metric Display** | `Inter`, sans-serif | 28px / 1.75rem | 700 (Bold) | 1.1 | Telemetry Value Numbers (NDVI, Temp) |
| **Body Standard** | `Inter`, sans-serif | 14px / 0.875rem | 400 (Regular) | 1.5 | General Text, Chat Messages, Descriptions |
| **Data / Monospace**| `JetBrains Mono`, monospace | 12px / 0.75rem | 500 (Medium) | 1.4 | Lat/Lon Coordinates, Sensor Logs, GeoJSON |

---

### 5.4 Redesigned Page & Component Blueprints

#### 1. Serene Navigation Header (`Header.jsx`)
* **Design:** Fixed glassmorphism bar (`backdrop-blur-md bg-white/85`), height 64px, subtle bottom border (`#E2E8F0`).
* **Left Section:** Sleek brand mark — Deep Emerald leaf node icon + `AgriSetu` in `Plus Jakarta Sans` ExtraBold + subtle gold dot (`var(--brics-gold)`).
* **Center Section:** Quick Status Beacon — Pill showing live server connectivity (`🟢 System Online — Sentinel Hub Connected`).
* **Right Section:**
  - View Switcher Toggle: Minimalist segment control (`Farmer View` | `Agronomist Console`).
  - Language Picker: Elegant dropdown menu with country flags (`🇮🇳 हिंदी`, `🇮🇳 मराठी`, `🇬🇧 English`, `🇧🇷 Português`).

---

#### 2. Redesigned Farmer Telemetry Hub (`FarmerDashboard.jsx`)
* **Layout:** Single-column responsive canvas (`max-w-3xl mx-auto px-4 py-6 space-y-6`).

* **Greeting & Weather Hero Banner:**
  - Soft porcelain card with subtle emerald gradient accent.
  - Left: "Namaste, Rajesh Ji 🌾" (Bold 24px) + "Rampur Plot A — Nashik, Maharashtra".
  - Right: Live Weather Widget — Temperature `28°C` | Precipitation `0.0 mm` | Humidity `65%`.

* **4 Calm Telemetry Status Cards (2x2 Grid):**
  1. **Crop Vitality Gauge Card (NDVI Satellite Metric):**
     - Left: Circular SVG Progress Ring Chart showing live score (`0.72`). Ring turns Deep Green for Optimal, Amber for Watch, Crimson for Alert.
     - Right: Status Label `Optimal Growth` + `Sentinel-2 Image: Aug 20, 2026`.
  2. **Soil Hydration & Water Card:**
     - Left: Oceanic Teal Water Drop Icon (`💧`).
     - Right: Status Label `No Irrigation Needed Today` + `Soil Moisture: 22.4% (Optimal)`.
  3. **Weather Shield & Risk Card:**
     - Left: Serene Sun & Cloud Icon (`🌦`).
     - Right: Status Label `Low Weather Risk` + `Next projected rainfall in 5 days`.
  4. **Plant Protection Beacon Card:**
     - Left: Plant Shield Icon (`🛡️`).
     - Right: Status Label `Zero Active Disease Alerts` + `Last scan: Today`.

* **Quick Action Dock (Dual Primary Action Cards):**
  - **Tile 1: `🌾 Request AI Crop Advisory`:** Soft sage background, deep emerald icon, subtle arrow indicator (`→`). Opens `AdvisoryCard`.
  - **Tile 2: `📷 Diagnose Plant Disease`:** Soft porcelain card, crisp emerald border, camera aperture icon. Opens `DiseaseUploader`.

* **Interactive Soil Health Radar Grid:**
  - 6 Clean Glass Metric Tiles: `Nitrogen (N: 140 kg/ha)`, `Phosphorus (P: 45 kg/ha)`, `Potassium (K: 190 kg/ha)`, `Soil pH (6.5 — Neutral)`, `Moisture (22.4%)`, `Data Source (ISRIC SoilGrids)`.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🌾 AgriSetu  🟢 System Online              [Farmer View | FPO Console]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Namaste, Rajesh Ji 🌾                         ⛅ 28°C | Nashik   │  │
│  │ Rampur Plot A — Wheat Field                   Humidity: 65%      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ 🟢 ( 0.72 )  Crop Vitality    │  │ 💧  Hydration Status          │  │
│  │              Optimal Growth   │  │     No Water Needed Today     │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ 🌦  Weather Risk               │  │ 🛡️  Plant Protection          │  │
│  │     Low Risk — Rain in 5 days │  │     No Active Disease Alerts  │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                        │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ 🌾 Request AI Crop Advisory  →│  │ 📷 Diagnose Leaf Disease    →│  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  SOIL NUTRIENT TELEMETRY                                         │  │
│  │  [ N: 140 kg/ha ]  [ P: 45 kg/ha ]  [ K: 190 kg/ha ]              │  │
│  │  [ pH: 6.5 Neutral] [ Moisture: 22.4% ] [ Source: SoilGrids ]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│                                                                 [ 💬 ] │
└────────────────────────────────────────────────────────────────────────┘
```

---

#### 3. Redesigned Agronomist Command Center (`AgronomistDashboard.jsx`)
* **Layout:** Full-viewport desktop executive console (`h-screen flex flex-col bg-slate-900 text-slate-100`).

* **Header Console:** Executive Dark Slate Bar (`#0F172A`), Title `AgriSetu — FPO Command Center`, District Selector Dropdown (`Sangli District, MH`), Export Data Button (`📥 CSV Export`).

* **Left Telemetry Control Panel (Width: 320px):**
  - **Aggregate KPI Grid:** Total Registered Plots (`24`), Regional Avg NDVI (`0.68`), Active Disease Alerts (`3`).
  - **Filter Controls:** Search Plot by District/Farmer, Filter by NDVI Status (All, Optimal, Watch, Danger).
  - **Interactive Plot Directory:** Scrollable list with real-time health indicator lights, crop tags, and district coordinates.

* **Center/Right Spatial GIS Canvas (Leaflet/Mapbox Engine):**
  - Customized Dark CartoDB / Mapbox tile basemap.
  - Plot Boundary Visualization: Geodesic polygons with color-coded semi-transparent fills based on satellite NDVI scores.
  - Interactive Circle Nodes: Click node -> map smoothly pans and zooms (`flyTo`) -> opens detail drawer.
  - Dynamic Layer Control Window (Top-Right): Toggle layers (`Satellite NDVI Heatmap`, `Soil Moisture Overlay`, `Disease Outbreak Heatmap`).
  - Executive Glass Legend (Bottom-Right): NDVI Spectrum (`>0.7 Optimal`, `0.5-0.7 Good`, `0.3-0.5 Caution`, `<0.3 Danger`).

* **Sliding Bottom Telemetry Analytics Drawer:**
  - Displays selected plot's complete historical telemetry: Recharts line chart showing 30-day NDVI progression, soil nutrient bar chart, recent disease diagnostic logs, and one-click BRICS API JSON exporter.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AgriSetu — FPO Command Center  [Sangli District ▾]             [📥 Export CSV]  [Home]│
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ AGGREGATE SUMMARY │                                                                    │
│ Total Plots: 24   │                 [ GIS SPATIAL MAP CANVAS ]                         │
│ Avg NDVI: 0.68    │                                                                    │
│ Active Alerts: 3  │               🔴 Plot 04 (NDVI 0.28)                               │
│                   │                                      🟢 Plot 01 (NDVI 0.74)        │
│ FILTER PLOTS      │                                                                    │
│ [ Search...     ] │                                                                    │
│ [All | 🟢 | 🟡 | 🔴]│                                             ┌──────────────────────┐│
│                   │                                             │ LAYERS TOGGLE        ││
│ PLOT DIRECTORY    │                                             │ [x] NDVI Heatmap     ││
│ 🟢 Nashik Plot 01 │                                             │ [ ] Soil Moisture    ││
│    Wheat | 0.74   │                                             │ [ ] Disease Heatmap  ││
│ 🟡 Pune Plot 02   │                                             └──────────────────────┘│
│    Sugarcane| 0.48│                                                                    │
│ 🔴 Sangli Plot 04 │                                             ┌──────────────────────┐│
│    Maize | 0.28   │                                             │ NDVI SPECTRUM        ││
│                   │                                             │ 🟢 Optimal (>0.7)    ││
│                   │                                             │ 🔴 Danger (<0.3)     ││
│                   │                                             └──────────────────────┘│
├───────────────────┴────────────────────────────────────────────────────────────────────┤
│ SELECTED PLOT TELEMETRY: Nashik Plot 01 | Lat: 20.0055, Lon: 73.7850 | Area: 1.5 Ha    │
│ [ 30-Day NDVI Trend Sparkline ]  |  [ Soil NPK Chart ]  |  [ BRICS JSON Exporter ]     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### 4. Redesigned AI Disease Scanner (`DiseaseUploader.jsx`)
* **Container:** Modal / Slide-over drawer with glassmorphism backdrop (`backdrop-blur-md bg-black/40`).
* **Upload Dropzone:**
  - Soft porcelain card, subtle dashed emerald border, drag-and-drop animation guide.
  - Icon: Clean aperture camera SVG (`📷`).
  - Action Label: `Drop leaf image here, or tap to open camera`.
  - Supported Crops: `Tomato, Wheat, Rice, Sugarcane, Maize, Cotton, Mango, etc.`
* **Dual-Inference Result Card:**
  - **Header Row:** Disease Name (e.g., `Tomato Late Blight`) + AI Model Badge (`Gemini 1.5 Flash Vision`) + Confidence Score (`88.4%`).
  - **Severity Progress Bar:** Visual 3-stage bar (Low -> Moderate -> High).
  - **Tabbed Remedies Interface:**
    - **Tab 1: `🌿 Organic & Eco-Remedy`:** Spray Neem oil solution (5ml/L) + remove infected lower leaves + improve field aeration.
    - **Tab 2: `🧪 Chemical Treatment`:** Apply copper-based fungicide (Mancozeb 75% WP @ 2g/L water) every 7-10 days.

---

#### 5. Redesigned Crop Advisory Suite (`AdvisoryCard.jsx`)
* **Container:** Clean white card, rounded-2xl, soft drop shadow (`shadow-sm`).
* **Hero Recommendation Card:**
  - Soft mint surface (`#E8F5E9`), deep emerald border tag.
  - Recommended Crop: `🌾 Wheat` + High Match Badge (`94% Confidence`).
  - Optimal Sowing Calendar Window: `📅 Oct 15 – Oct 30`.
  - Irrigation Frequency: `💧 Water every 7 days`.
* **Regenerative Agro-Ecology Panel:**
  - Interactive cards highlighting recommended sustainable practices:
    1. **Legume Intercropping (High Priority):** Intercrop wheat with mustard or chickpea to naturally fix atmospheric nitrogen and reduce synthetic fertilizer cost by 30%.
    2. **Residue Cover Cropping (Medium Priority):** Retain previous crop residue to suppress weed growth and retain soil moisture.
* **Risk Mitigation Alert Box:** Warm sand surface (`#FEF3C7`), warning icon (`⚠️`), detailing low soil nitrogen detected & upcoming weather rain alerts.

---

#### 6. Redesigned Voice & Conversational Assistant (`ChatWidget.jsx`)
* **Trigger Floating Action Button:** Serene emerald floating button (`w-14 h-14 bg-emerald-800 text-white rounded-full shadow-xl hover:scale-105 transition-all fixed bottom-6 right-6 z-50 flex items-center justify-center`).
* **Drawer Panel:** 450px height floating panel on desktop, full-height slide-over drawer on mobile.
* **Header:** Deep emerald fill, white typography `AgriSetu AI Advisor`, close action.
* **Message Stream:**
  - User Bubbles: Right-aligned, solid deep emerald fill (`bg-emerald-800`), white typography.
  - Advisor Bubbles: Left-aligned, soft porcelain surface (`bg-slate-100`), clean slate typography, Markdown-formatted lists & bold callouts.
  - Animated Waveform Visualizer: Appears when recording voice via microphone. Pulsating red recording ring (`⏹`) -> triggers Bhashini/Whisper ASR -> plays synthetic audio response (`🔊`).

---

## 6. Directory Layout & Setup Guide

```
AgriSetu/
├── PRD.md                       # Product Requirements Document
├── Architecture.md              # System Architecture Specification
├── Techstack.md                 # Technical Stack Specification
├── Design.md                    # UX / UI Design Architecture
├── AppFlow.md                   # Complete User Flow Paths
├── Security.md                  # Security & Compliance Specification
├── Scale.md                     # Scalability & Infrastructure Roadmap
├── document.md                  # Master System & Redesigned UI Blueprint (This File)
│
├── agrisetu-backend/            # FastAPI Python Application
│   ├── main.py                  # FastAPI App Lifespan & Router Mounts
│   ├── config.py                # Pydantic BaseSettings Environment Loader
│   ├── constants.py             # System Constants & Defaults
│   ├── requirements.txt         # Dependencies (FastAPI, PyTorch, XGBoost, Supabase)
│   ├── routers/                 # API Endpoint Handlers
│   │   ├── onboarding.py
│   │   ├── disease.py
│   │   ├── advisory.py
│   │   ├── chat.py
│   │   ├── voice.py
│   │   ├── whatsapp.py
│   │   ├── dashboard.py
│   │   └── brics.py
│   ├── services/                # Backend Business Logic & External APIs
│   │   ├── satellite.py         # Sentinel Hub API Integration
│   │   ├── weather.py           # NASA POWER / OpenWeather Integration
│   │   ├── soil.py              # SoilGrids Integration
│   │   ├── disease_model.py     # PyTorch CNN + Gemini Vision Fallback
│   │   ├── crop_model.py        # XGBoost Crop Recommender Engine
│   │   ├── rag.py               # Supabase Vector Search & Prompt Engine
│   │   ├── llm.py               # Gemini / Claude API Service
│   │   ├── asr.py               # Bhashini & Whisper Audio Speech Recognition
│   │   ├── tts.py               # Bhashini Speech Synthesis
│   │   └── translation.py       # Bhashini Multilingual Translator
│   ├── models/                  # Trained ML Artefacts
│   │   ├── disease_model/
│   │   └── crop_model/
│   └── schemas/                 # Pydantic Validation Schemas
│
├── agrisetu-frontend/           # React + Vite Web Application
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # React Router Engine
│       ├── pages/               # Views
│       │   ├── LandingPage.jsx
│       │   ├── OnboardingPage.jsx
│       │   ├── FarmerDashboard.jsx
│       │   └── AgronomistDashboard.jsx
│       ├── components/          # Reusable UI Components
│       │   ├── AdvisoryCard.jsx
│       │   ├── ChatWidget.jsx
│       │   ├── DiseaseUploader.jsx
│       │   └── Header.jsx
│       ├── api/                 # Axios HTTP Gateway Client
│       └── locales/             # i18n Dictionary Files (en, hi)
│
├── data/                        # Curated Knowledge Repository
│   └── agronomy_kb/             # 21 Agronomy Reference Text Files
├── db/                          # Database Migrations
│   └── migrations/              # SQL Migration Scripts 001 - 004
└── ml/                          # Training Scripts & Notebooks
```

---

## 7. Execution & Local Installation Protocol

### 7.1 Backend Setup (FastAPI + Python 3.11)
```bash
cd agrisetu-backend

# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows PowerShell

# 2. Install backend dependencies
pip install -r requirements.txt

# 3. Launch FastAPI server with live reloading
uvicorn main:app --reload --port 8000
```

### 7.2 Frontend Setup (React + Vite + Tailwind)
```bash
cd agrisetu-frontend

# 1. Install Node modules
npm install

# 2. Start Vite development server
npm run dev
```

---

## 8. Summary of Project Capabilities & Strengths

1. **Complete Decoupled Architecture:** Single FastAPI Advisory Gateway serving Web, Voice, WhatsApp, and BRICS APIs with identical core logic.
2. **Real AI/ML & Vision Capabilities:** PyTorch MobileNetV3 CNN + Gemini Vision fallback for disease diagnostics, XGBoost for crop yield recommendations, and pgvector RAG context search over 21 agronomy manuals.
3. **True Public Good Integration:** Ingests live Sentinel-2 satellite NDVI imagery, NASA POWER weather forecasts, and SoilGrids global soil data.
4. **Calm & Professional Redesigned UI:** Modern, serene, organic, and executive aesthetic tailored specifically for both smallholder farmers and analytical FPO agronomists.
