# AgriSetu

**BRICS Digital Agriculture Advisory Platform**

AgriSetu ("Agriculture Bridge" in Sanskrit) is a last-mile digital advisory delivery layer for BRICS farmers. It converts satellite imagery, soil data, and weather feeds into actionable crop recommendations, plant disease diagnosis, and regenerative practice guidance -- delivered in the farmer's own language via chat, voice, and WhatsApp.

Built for the BRICS Network on Digital Agriculture hackathon, aligned with the Indore Declaration (July 2026).

---

## Problem Statement

Smallholder farmers across BRICS nations face four compounding barriers:

1. **Information gap** -- satellite, soil, and weather data exist but do not reach farmers in actionable form.
2. **Late disease diagnosis** -- by the time visual symptoms are noticed, crop damage is often irreversible.
3. **Language and access barrier** -- existing advisory tools are English-only or require smartphone literacy that many farmers lack.
4. **No shared cross-border data layer** -- BRICS partner institutions have no interoperable standard for exchanging agricultural telemetry.

AgriSetu addresses all four through a single unified advisory gateway.

---

## Solution Overview

AgriSetu follows a three-layer architecture:

**Layer 1 -- Data Core.** Supabase (Postgres + PostGIS + pgvector) stores farm plots, soil measurements, NDVI snapshots, weather cache, disease reports, and RAG knowledge base embeddings. A background scheduler refreshes telemetry every 6 hours from Sentinel Hub (NDVI/NDMI), NASA POWER + OpenWeatherMap (weather), and SoilGrids (soil properties).

**Layer 2 -- Advisory Engines.** An XGBoost crop recommender (trained on N/P/K, temperature, humidity, pH, rainfall) produces top-3 crop suggestions with sowing windows and irrigation schedules. A rule-based regenerative agriculture layer adds practices such as cover cropping, reduced tillage, and soil liming based on NDVI, soil carbon, rainfall, and pH thresholds. A fine-tuned EfficientNet-Lite CNN classifies plant diseases across 38 classes; when the CNN is uncertain, Gemini Vision handles any plant species.

**Layer 3 -- Delivery.** All channels -- web chat, voice input, and WhatsApp -- route through a single FastAPI advisory gateway. User queries are translated to English, enriched with RAG retrieval from an agronomy knowledge base (pgvector cosine search), processed by Gemini LLM, and translated back to the farmer's language. Voice input is transcribed via Gemini Multimodal Audio with Whisper fallback; responses can be read aloud via browser SpeechSynthesis or gTTS.

---

## Features

### Farmer Experience
- Phone OTP authentication with automatic profile creation
- Interactive Leaflet map for farm plot registration with reverse geocoding
- Real-time telemetry dashboard: NDVI (Sentinel-2), soil NPK + pH + moisture (SoilGrids), temperature/humidity/rainfall (NASA POWER + OpenWeatherMap)
- Crop advisory with top-3 recommendations, sowing windows, and irrigation schedules
- Regenerative agriculture practices with priority ratings
- Plant disease diagnosis via camera upload with severity assessment, treatment, and organic remedy
- Floating AI chat advisor with voice input and read-aloud responses
- Full multilingual support: Hindi, Marathi, English

### Agronomist Experience
- GIS command center with NDVI-coloured map markers
- Plot directory with search and NDVI-based filtering (HIGH / WARN / CRIT)
- Telemetry drawer with vegetation index, soil moisture, and weather risk

### WhatsApp Bot
- Twilio sandbox integration for text and image messages
- Crop advisory, disease diagnosis from photo, and free-form Q&A via RAG pipeline
- Menu-driven interaction with automatic language detection

### BRICS Interoperability API
- `/api/v1/brics/advisory/{plot_id}` -- Advisory in shared BRICS Agri Data Model schema
- `/api/v1/brics/disease-report` -- Disease report submission
- `/api/v1/brics/aggregate` -- Anonymised country-level statistics

### Authentication and Security
- Three-tier authentication: Supabase Auth (phone OTP) -> Backend user linking -> Frontend route guards
- Protected routes for all authenticated pages; public landing page
- Profile management with farm plot registration under profile section

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Leaflet, react-i18next | SPA with MD3 design tokens, map picker, i18n |
| Backend | FastAPI (Python 3.11+), Uvicorn, httpx, APScheduler | Async API server, scheduled data refresh |
| Database | Supabase (Postgres 15, PostGIS, pgvector) | Relational data, spatial queries, vector search |
| ML - Crop | XGBoost | Crop recommendation from soil/weather features |
| ML - Disease | EfficientNet-Lite (PyTorch), Gemini Vision fallback | Plant disease classification, 38 classes |
| LLM | Gemini API (gemini-2.0-flash, gemini-1.5-pro) | Agricultural advisory generation |
| RAG | sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2) | 384-dim embeddings, pgvector cosine search |
| ASR | Gemini Multimodal Audio, Whisper fallback | Speech-to-text for voice queries |
| TTS | gTTS (Google Text-to-Speech) | Text-to-speech for advisory read-aloud |
| Translation | Gemini API (gemini-3.6-flash) | Multilingual translation layer |
| Auth | Supabase Auth (phone OTP via Twilio Verify) | User authentication and session management |
| WhatsApp | Twilio (sandbox) | WhatsApp Business messaging |
| Deployment | Vercel (frontend), Railway/Render (backend) | Static hosting, container deployment |

---

## Repository Structure

```
AgriSetu/
├── agrisetu-backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── config.py                # Pydantic settings from .env
│   ├── constants.py             # API URLs, model paths, language codes
│   ├── routers/
│   │   ├── auth.py              # User authentication endpoints
│   │   ├── onboarding.py        # Farmer and plot registration
│   │   ├── disease.py           # Plant disease prediction
│   │   ├── advisory.py          # Crop advisory and regenerative practices
│   │   ├── chat.py              # LLM + RAG chat advisor
│   │   ├── voice.py             # Voice input processing
│   │   ├── whatsapp.py          # Twilio WhatsApp webhook
│   │   ├── dashboard.py         # Dashboard data endpoints
│   │   └── brics.py             # BRICS interoperability API
│   ├── services/
│   │   ├── disease_model.py     # Gemini Vision + CNN hybrid inference
│   │   ├── crop_model.py        # XGBoost crop prediction + regenerative rules
│   │   ├── llm.py               # Gemini LLM advisory generation
│   │   ├── rag.py               # pgvector + file KB retrieval
│   │   ├── satellite.py         # Sentinel Hub NDVI/NDMI fetch
│   │   ├── weather.py           # NASA POWER + OpenWeatherMap
│   │   ├── soil.py              # SoilGrids ISRIC
│   │   ├── asr.py               # Speech-to-text (Gemini + Whisper)
│   │   ├── tts.py               # Text-to-speech (gTTS)
│   │   ├── translation.py       # Gemini-powered translation
│   │   └── scheduler.py         # APScheduler 6-hour data refresh
│   ├── schemas/                 # Pydantic request/response models
│   ├── models/                  # Trained model weights and class names
│   ├── data/
│   │   ├── treatments.json      # Disease treatment database
│   │   └── agronomy_kb/         # 21 agronomy knowledge base documents
│   └── requirements.txt
│
├── agrisetu-frontend/
│   ├── src/
│   │   ├── App.jsx              # Route definitions
│   │   ├── main.jsx             # Entry point with AuthProvider
│   │   ├── api/agrisetu.js      # Axios API client
│   │   ├── lib/supabase.js      # Supabase client
│   │   ├── contexts/AuthContext.jsx  # Authentication state
│   │   ├── components/
│   │   │   ├── ChatWidget.jsx   # Floating AI chat with voice
│   │   │   ├── DiseaseUploader.jsx  # Camera upload and result
│   │   │   ├── AdvisoryCard.jsx     # Crop advisory display
│   │   │   └── ProtectedRoute.jsx   # Auth guard
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Public landing page
│   │   │   ├── LoginPage.jsx        # Phone OTP login
│   │   │   ├── OnboardingPage.jsx   # Farm plot registration
│   │   │   ├── FarmerDashboard.jsx  # Farmer telemetry hub
│   │   │   ├── AgronomistDashboard.jsx  # GIS command center
│   │   │   └── ProfilePage.jsx      # Profile and farm management
│   │   ├── utils/langDetect.js  # Language detection (Devanagari/Latin)
│   │   ├── i18n/index.js        # i18next configuration
│   │   └── locales/             # en.json, hi.json, mr.json
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
├── db/
│   └── migrations/              # 7 SQL migration files
│       ├── 001_initial_schema.sql
│       ├── 002-006_column_fixes.sql
│       └── 007_add_auth_user_id.sql
│
├── ml/
│   ├── train_crop_xgboost.py    # XGBoost training script
│   └── train_disease_cnn.ipynb  # CNN training notebook
│
├── data/
│   └── agronomy_kb/             # 21 .txt knowledge base files
│
├── docs/                        # Project documentation
│   ├── prd.md                   # Product Requirements Document
│   ├── architecture.md          # System Architecture
│   ├── tech-stack.md            # Technology choices
│   ├── implementation.md        # Build schedule
│   ├── app-flow.md              # User flow diagrams
│   ├── design.md                # UI/UX specification
│   ├── security.md              # Threat model and security controls
│   ├── scaling.md               # Production scaling plan
│   ├── prerequisites.md         # Account and API key setup
│   ├── agent-guide.md           # AI coding agent instructions
│   ├── checklist.md             # Feature completion checklist
│   ├── project-spec.md          # Combined project specification
│   └── stitch-screens/          # HTML screen mockups
│
├── deployment.md                # Deployment guide
├── README.md                    # This file
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- npm or yarn
- A Supabase project (free tier)
- API keys for Sentinel Hub, OpenWeatherMap, Gemini, and Twilio

See `docs/prerequisites.md` for the complete account setup guide.

### Environment Variables

**Backend** -- create `agrisetu-backend/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

SENTINEL_HUB_CLIENT_ID=your-client-id
SENTINEL_HUB_CLIENT_SECRET=your-client-secret
SENTINEL_HUB_INSTANCE_ID=your-instance-id

OPENWEATHER_API_KEY=your-openweather-key

GEMINI_API_KEY=your-gemini-key
GEMINI_BACKUP_API_KEY=

TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_WHATSAPP_TO=whatsapp:+14155238886

ENVIRONMENT=development
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SECRET_KEY=change-this-in-production
```

**Frontend** -- create `agrisetu-frontend/.env`:

```
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Local Development

**1. Database setup**

Run all migration files in `db/migrations/` (in order) via the Supabase SQL Editor. Extensions required: `postgis`, `vector`.

**2. Backend**

```bash
cd agrisetu-backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API documentation is available at `http://localhost:8000/docs`.

**3. Frontend**

```bash
cd agrisetu-frontend
npm install
npm run dev
```

The application runs at `http://localhost:5173`.

**4. Knowledge base embedding**

From the backend directory with the Supabase service key configured:

```python
from services.rag import embed_and_store_documents
embed_and_store_documents()
```

This reads all `.txt` files from `data/agronomy_kb/`, generates 384-dimensional embeddings, and stores them in the `knowledge_base` table via pgvector.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/link` | Link Supabase user to farmer profile |
| GET | `/api/v1/auth/me` | Get farmer profile by user ID |

### Onboarding
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/onboarding/farmer` | Create or retrieve farmer by phone |
| POST | `/api/v1/onboarding/plot` | Register farm plot with telemetry fetch |
| GET | `/api/v1/onboarding/plot/{plot_id}` | Full plot summary (soil, weather, NDVI) |
| GET | `/api/v1/onboarding/farmer/by-phone/{phone}` | Look up farmer by phone number |
| PATCH | `/api/v1/onboarding/farmer/{farmer_id}` | Update farmer profile |
| PATCH | `/api/v1/onboarding/plot/{plot_id}` | Update plot details |

### Disease
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/disease/predict` | Upload image for disease diagnosis |

### Advisory
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/advisory/{plot_id}` | Full advisory (crops, regenerative practices, risk alerts) |
| POST | `/api/v1/advisory/{plot_id}/refresh` | Re-fetch satellite/soil/weather data |
| POST | `/api/v1/advisory/{plot_id}/regenerate` | Force re-generate advisory |

### Chat and Voice
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/chat/ask` | Text-based AI advisory query |
| POST | `/api/v1/voice/ask` | Voice-based AI advisory (audio upload) |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/dashboard/plots` | All registered plots |
| GET | `/api/v1/dashboard/plots/{farmer_id}` | Plots for a specific farmer |

### BRICS Interoperability
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/brics/advisory/{plot_id}` | Advisory in BRICS shared schema |
| POST | `/api/v1/brics/disease-report` | Submit disease report in BRICS schema |
| GET | `/api/v1/brics/aggregate` | Anonymised country-level statistics |

---

## Database Schema

The application uses 10 tables in Supabase Postgres:

| Table | Purpose |
|---|---|
| `farmers` | Farmer profiles (name, phone, language, Supabase user_id) |
| `farm_plots` | Farm plot geometry (PostGIS Polygon), crop, location |
| `soil_data` | NPK, pH, moisture from SoilGrids (time-series per plot) |
| `ndvi_snapshots` | NDVI/NDMI from Sentinel-2 (time-series per plot) |
| `weather_cache` | Temperature, humidity, rainfall, wind (time-series per plot) |
| `advisories` | Generated crop recommendations and regenerative practices |
| `disease_reports` | Disease diagnosis results with severity and treatment |
| `chat_sessions` | Chat message history per farmer |
| `knowledge_base` | RAG document embeddings (pgvector, 384-dim) |

Row Level Security (RLS) is enabled on all tables. During prototype, the backend uses the service role key which bypasses RLS. RLS policies are configured for production deployment with Supabase Auth JWT verification.

---

## Machine Learning Models

### Crop Recommendation (XGBoost)
- **Input:** N, P, K (soil nutrients), temperature, humidity, pH, rainfall
- **Output:** Top-3 crop predictions with confidence scores
- **Training data:** Kaggle Crop Recommendation Dataset
- **Model file:** `agrisetu-backend/models/crop_model/xgboost_crop.json`

### Plant Disease Classification (EfficientNet-Lite)
- **Architecture:** EfficientNet-Lite0 (pretrained, fine-tuned)
- **Classes:** 38 (14 plant species x disease combinations from PlantVillage)
- **Input:** 224x224 RGB image
- **Fallback:** Gemini Vision API for unknown plant species
- **Computer vision fallback:** Brown-spot pixel ratio analysis for edge cases
- **Training data:** PlantVillage augmented dataset (~54,000 images)

### RAG Knowledge Base
- **Embedding model:** sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384 dimensions)
- **Storage:** pgvector in Supabase with HNSW index
- **Retrieval:** Cosine similarity search via `match_knowledge_base` RPC function
- **Corpus:** 21 agronomy documents covering irrigation, fertiliser management, soil testing, intercropping, and crop-specific guides

---

## Security

- **Authentication:** Supabase Auth with phone OTP (Twilio Verify), three-tier architecture
- **Secrets:** All API keys in environment variables, never committed to repository
- **Input validation:** Pydantic models with field constraints on all endpoints
- **Image validation:** File type whitelist, 10MB size limit, magic-byte verification
- **Prompt injection defence:** System prompt isolation, user input never interpolated into system instructions
- **CORS:** Configurable origins (wildcard in development, restricted in production)
- **Rate limiting:** Configurable per-endpoint via slowapi (recommended for production)
- **RLS:** Supabase Row Level Security policies on all data tables

See `docs/security.md` for the complete threat model and security controls.

---

## Future Roadmap

### Phase 1 -- Production Hardening (0-3 months)
- Replace CORS wildcard with verified origin whitelist
- Implement Supabase Auth JWT verification middleware in FastAPI
- Enable full RLS enforcement (remove service role bypass)
- Add slowapi rate limiting to all public endpoints
- Implement Twilio webhook signature verification
- Add structured logging and error tracking (Sentry)
- End-to-end test suite with pytest
- CI/CD pipeline (GitHub Actions)

### Phase 2 -- Scale and Reliability (3-6 months)
- Migrate backend to containerised deployment (Docker + Railway/AWS ECS)
- Redis caching layer for frequently accessed advisories
- Dedicated GPU inference endpoint for disease model
- CDN for frontend assets
- Database read replicas for dashboard query offloading
- Nightly batch NDVI refresh via Airflow/Prefect
- WhatsApp Business API upgrade from sandbox

### Phase 3 -- Multi-Country Expansion (6-18 months)
- Multi-region deployment: India, South Africa, Brazil
- Additional languages: Portuguese, Russian, Mandarin, Swahili
- Expand disease model to 50+ crop-disease classes
- On-device TFLite/ONNX model for offline disease diagnosis
- Yield forecasting model (LSTM/Transformer on historical NDVI + weather)
- Market price prediction via Agmarknet integration
- React Native mobile application
- USSD interface for feature phones

### Phase 4 -- BRICS Interoperability Standard (18-36 months)
- Publish "BRICS Agri Data Model" as an open standard (comparable to HL7 FHIR for health)
- Federated per-country nodes with data sovereignty
- Live government API integrations (Brazil MAPA, ICAR India, SA DAFF)
- Apache 2.0 open-source release
- DPGA (Digital Public Goods Alliance) registry submission
- FPO SaaS subscription tier
- Insurance and credit advisory B2B API

---

## Project Documentation

Detailed documentation is available in the `docs/` directory:

| Document | Description |
|---|---|
| `docs/prd.md` | Product Requirements Document |
| `docs/architecture.md` | System architecture and design decisions |
| `docs/tech-stack.md` | Technology choices with justifications |
| `docs/implementation.md` | Day-by-day build schedule |
| `docs/app-flow.md` | User interaction flows |
| `docs/design.md` | UI/UX specification and design tokens |
| `docs/security.md` | Threat model and security controls |
| `docs/scaling.md` | Production scaling plan |
| `docs/prerequisites.md` | Account and API key setup guide |
| `docs/agent-guide.md` | AI coding agent instructions |

---

## Deployment

See `deployment.md` for complete deployment instructions covering backend, frontend, database, and post-deployment verification.

---

## Licence

This project was developed for the BRICS Network on Digital Agriculture hackathon (August 2026). Refer to the repository licence file for terms of use.
