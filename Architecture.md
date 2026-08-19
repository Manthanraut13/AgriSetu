# Architecture Document
## AgriSetu — System Architecture
**Version:** 1.0 | **Build Window:** 17–23 Aug 2026

---

## 1. Architecture Overview

AgriSetu is built on a **three-layer architecture** with a single unified FastAPI backend. Every farmer touchpoint routes through one Advisory Gateway — there is no separate logic per channel.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FARMER TOUCHPOINTS                           │
│   Web Chat Widget │ WhatsApp Bot (sandbox) │ Voice Input (mic/note) │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ADVISORY GATEWAY (FastAPI Router)                 │
│  Routes: disease photo → CNN inference                              │
│          text/voice query → LLM + RAG                              │
│          new farm registration → Onboarding flow                    │
│          WhatsApp webhook → same handlers above                     │
└──────────┬──────────────────────────┬────────────────────┬──────────┘
           │                          │                    │
           ▼                          ▼                    ▼
┌──────────────────┐   ┌─────────────────────────┐  ┌────────────────┐
│  DISEASE ENGINE  │   │  ADVISORY ENGINE         │  │  VOICE PIPELINE│
│  CNN Inference   │   │  XGBoost/LightGBM        │  │  Bhashini ASR  │
│  (MobileNetV3    │   │  + Rule-based Regen      │  │  Whisper ASR   │
│   EfficientNet)  │   │  Layer                   │  │  LLM+RAG       │
│  FastAPI served  │   │  LLM (Claude/GPT) + RAG  │  │  Bhashini TTS  │
└────────┬─────────┘   └────────────┬────────────┘  └───────┬────────┘
         │                          │                        │
         └──────────────────────────▼────────────────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │    DATA CORE (Supabase)       │
                     │  PostgreSQL + PostGIS          │
                     │  - farm_plots (geometry)       │
                     │  - soil_data                   │
                     │  - weather_cache               │
                     │  - ndvi_snapshots              │
                     │  - advisories                  │
                     │  - disease_reports             │
                     └──────────────┬────────────────┘
                                    │
           ┌────────────────────────▼────────────────────────┐
           │              EXTERNAL DATA SOURCES               │
           │  Sentinel Hub (NDVI)  │  NASA POWER (weather)   │
           │  SoilGrids (ISRIC)    │  OpenWeatherMap          │
           │  Soil Health Card     │  Bhashini API            │
           │  (soilhealth.dac.gov) │  Kaggle datasets         │
           └──────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vercel)                    │
│   Farmer Dashboard (Simple View) │ FPO/Agronomist Dashboard (Maps)  │
│   Chat Widget │ Map Plot Selector │ Photo Upload                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   BRICS INTEROPERABILITY API                        │
│   REST endpoints with shared Agri Data Model JSON schema            │
│   GET /v1/advisory/{plot_id}                                        │
│   POST /v1/disease-report                                           │
│   GET /v1/plots/aggregate                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer 1 — Data & Intelligence Core

### 2.1 Data Ingestion (Scheduled Jobs)
- **Trigger:** Cron job every 6 hours per registered plot
- **Satellite (NDVI):** Sentinel Hub API → fetch latest Sentinel-2 NDVI and NDMI for plot bounding box
- **Weather:** NASA POWER API (historical + 7-day forecast) + OpenWeatherMap (short-term alerts)
- **Soil (India):** Soil Health Card portal + Bhuvan (ISRO) soil layers
- **Soil (Global):** SoilGrids (ISRIC) at 250m resolution for non-India plots
- **Storage:** All ingested values written to Supabase with timestamp and plot_id FK

### 2.2 Disease Detection Engine
- **Model:** MobileNetV3 / EfficientNet-Lite fine-tuned on PlantVillage + PlantDoc
- **Serving:** FastAPI `/disease/diagnose` endpoint accepts multipart image upload
- **Output:** `{ disease_name, confidence, treatment, organic_remedy, severity }`
- **Training:** Google Colab / Kaggle GPU (runs in parallel during build days 2–3)

### 2.3 Crop & Regenerative Advisory Engine
- **Model:** XGBoost/LightGBM classifier
- **Inputs:** N, P, K (soil), temperature, humidity, pH, rainfall (weather), current NDVI
- **Outputs:** Top-3 recommended crops with confidence, sowing window, irrigation schedule
- **Regenerative Layer:** Rule-based post-processor adds intercropping, cover crop, and tillage suggestions based on soil health score
- **Serving:** FastAPI `/advisory/crop` endpoint

---

## 3. Layer 2 — Interoperability Layer

### 3.1 Agri Data Model (Shared JSON Schema)
```json
{
  "schema_version": "1.0",
  "country_code": "IN",
  "plot_id": "uuid",
  "timestamp": "ISO8601",
  "location": { "lat": 0.0, "lon": 0.0, "area_ha": 0.0 },
  "soil": { "N": 0, "P": 0, "K": 0, "pH": 0.0, "moisture_pct": 0.0 },
  "weather": { "temp_c": 0.0, "humidity_pct": 0.0, "rainfall_mm": 0.0 },
  "ndvi": { "value": 0.0, "date": "ISO8601", "source": "Sentinel-2" },
  "advisory": { "recommended_crop": "", "confidence": 0.0, "sowing_window": "", "irrigation_days": 0 },
  "disease_reports": [ { "disease": "", "confidence": 0.0, "date": "ISO8601" } ],
  "regenerative_practices": [ "" ]
}
```

### 3.2 BRICS API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/advisory/{plot_id}` | Full advisory for a registered plot |
| POST | `/v1/disease-report` | Submit a disease detection result |
| GET | `/v1/plots/aggregate` | Anonymised aggregate stats (for partner institutions) |
| GET | `/v1/schema` | Returns the Agri Data Model JSON Schema |

---

## 4. Layer 3 — Delivery / Advisor Layer

### 4.1 Advisory Gateway (Single FastAPI Router)
All inbound messages from all channels arrive at `/gateway/message`:

```
POST /gateway/message
{
  "channel": "web_chat" | "whatsapp" | "voice",
  "farmer_id": "uuid",
  "message_type": "text" | "voice" | "image",
  "content": "...",  // text, base64 audio, or base64 image
  "language": "hi" | "mr" | "en" | "pt" | ...
}
```

**Routing Logic:**
1. `message_type == "image"` → Disease Engine
2. `message_type == "voice"` → ASR Pipeline → LLM+RAG → TTS Pipeline
3. `message_type == "text"` → LLM+RAG → Text Response

### 4.2 LLM + RAG Advisory
- **LLM:** Claude API (claude-sonnet-4-6) or GPT-4o
- **Retrieval:** Vector store (Supabase pgvector) over:
  - Farmer's current plot data (soil, weather, last advisory)
  - Curated agronomy knowledge base (ICAR guidelines, regenerative farming notes)
- **Prompt Strategy:** Inject plot context + retrieved knowledge chunks → LLM answers specifically, not generically

### 4.3 Voice Pipeline
```
Voice Input
    │
    ▼
Bhashini ASR (Hindi/Marathi) OR Whisper (other languages)
    │
    ▼
Bhashini Translation → English
    │
    ▼
LLM + RAG (English processing)
    │
    ▼
Bhashini Translation → Target Language
    │
    ▼
Bhashini TTS (Indian) OR Coqui TTS (International)
    │
    ▼
Audio Response
```

### 4.4 WhatsApp Bot Flow
```
Incoming WhatsApp Message (Twilio/Gupshup webhook)
    │
    ▼
POST /gateway/whatsapp/webhook
    │ (parses message type)
    ├── Text → Advisory Gateway
    ├── Image → Disease Engine
    └── Voice Note → Voice Pipeline
    │
    ▼
Response sent back via Twilio/Gupshup API
```

---

## 5. Database Schema (Supabase / PostgreSQL + PostGIS)

```sql
-- Core tables

CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT UNIQUE,
  language_pref TEXT DEFAULT 'hi',
  country_code TEXT DEFAULT 'IN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE farm_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id),
  boundary GEOMETRY(POLYGON, 4326),   -- PostGIS polygon
  area_ha FLOAT,
  district TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  last_crop TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE soil_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id),
  N FLOAT, P FLOAT, K FLOAT, pH FLOAT,
  moisture_pct FLOAT,
  source TEXT,  -- 'SoilGrids' | 'SoilHealthCard'
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ndvi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id),
  ndvi FLOAT,
  ndmi FLOAT,
  image_date DATE,
  source TEXT DEFAULT 'Sentinel-2',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id),
  temp_c FLOAT,
  humidity_pct FLOAT,
  rainfall_mm FLOAT,
  forecast_json JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id),
  recommended_crop TEXT,
  confidence FLOAT,
  sowing_window TEXT,
  irrigation_schedule TEXT,
  regenerative_practices TEXT[],
  raw_input_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE disease_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES farm_plots(id),
  disease_name TEXT,
  confidence FLOAT,
  treatment TEXT,
  organic_remedy TEXT,
  image_url TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id),
  channel TEXT,
  messages JSONB[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Deployment Architecture

```
┌────────────────┐    ┌────────────────────┐    ┌─────────────────┐
│  Vercel        │    │  Railway / Render   │    │  Supabase       │
│  (Frontend)    │◄──►│  (FastAPI Backend)  │◄──►│  (DB + Storage) │
│  React + TW    │    │  + ML Model Files   │    │  PostGIS        │
│  CDN global    │    │  + Scheduled Jobs   │    │  pgvector       │
└────────────────┘    └────────────────────┘    └─────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  External APIs       │
                    │  Sentinel Hub        │
                    │  NASA POWER          │
                    │  SoilGrids           │
                    │  Bhashini            │
                    │  Twilio/Gupshup      │
                    │  Claude/OpenAI       │
                    └─────────────────────┘
```

---

## 7. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Single Backend | FastAPI (Python) | One codebase, same functions serve web/WhatsApp/voice; easy to debug/demo |
| No Workflow Automation Tool | Hand-coded | Full control, defensible line-by-line to judges |
| Database | Supabase + PostGIS | Free tier, built-in auth, geospatial support for farm boundaries |
| LLM | API call (not trained) | Realistic for deadline; RAG keeps answers accurate |
| Disease Model | Fine-tuned lightweight CNN | Fast inference, realistic to train in 2 days on free GPU |
| WhatsApp | Sandbox provider | Honest about production limitation; still demonstrates full flow |
