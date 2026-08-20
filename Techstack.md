# AgriSetu — Tech Stack Document

---

## 1. Stack Decisions Summary

All choices optimised for: (a) fastest path to a working, demo-able prototype by 23 Aug 2026, (b) full code ownership — no no-code black boxes, (c) free or sandbox tiers only, (d) defensible to hackathon judges line-by-line.

---

## 2. Frontend

| Item | Choice | Version | Justification |
|------|--------|---------|---------------|
| Framework | React | 18.x | Fastest for component-based UI; large ecosystem |
| Styling | Tailwind CSS | 3.x | Utility-first, no CSS files to manage, Vercel-compatible |
| Routing | React Router | 6.x | SPA routing for dashboard pages |
| Maps | Leaflet + react-leaflet | 4.x | Open-source, no API key needed for base map; draw plugin for plot boundary |
| Charts | Recharts | 2.x | React-native, no D3 learning curve |
| i18n | react-i18next | 13.x | Industry standard; JSON translation files |
| HTTP client | Axios | 1.x | Clean interceptors for auth headers |
| State | React Context + useState | built-in | Simple enough for prototype; no Redux needed |
| Build | Vite | 5.x | Fast HMR; faster than CRA |
| Deployment | Vercel | — | Free tier; auto-deploy from GitHub; custom domain |

---

## 3. Backend

| Item | Choice | Version | Justification |
|------|--------|---------|---------------|
| Framework | FastAPI | 0.111+ | Python-native; async; auto-generates OpenAPI/Swagger; same language as ML |
| Language | Python | 3.11+ | One language for backend + ML — no context switching |
| ASGI server | Uvicorn | 0.29+ | Production-ready with Gunicorn for Railway/Render |
| Task scheduler | APScheduler | 3.x | Schedule satellite/weather data pulls without separate workers |
| Auth | Supabase Auth (JWT) | — | JWT tokens verified in FastAPI middleware |
| File storage | Supabase Storage | — | Disease photo uploads; model weight hosting |
| Validation | Pydantic | 2.x | Bundled with FastAPI; strict schema validation |
| HTTP client | httpx | 0.27+ | Async-compatible; used for external API calls |
| Deployment | Railway or Render | — | Docker container; free tier; env var management |

---

## 4. Database

| Item | Choice | Notes |
|------|--------|-------|
| Database | Supabase (Postgres 15) | Managed, free tier (500MB), built-in auth |
| Spatial extension | PostGIS | Enabled on Supabase by default; needed for farm boundary geometry queries |
| ORM | SQLAlchemy (async) + asyncpg | Or direct Supabase Python client for simpler queries |
| Migrations | Supabase Dashboard / Alembic | Run schema migrations via Supabase SQL editor for prototype speed |
| Vector store (RAG) | pgvector (Supabase extension) | Store agronomy KB embeddings in Postgres — no separate vector DB |

---

## 5. ML / AI Stack

| Component | Tool | Notes |
|-----------|------|-------|
| Disease CNN | PyTorch + torchvision | Fine-tune MobileNetV3 or EfficientNet-Lite |
| Training environment | Google Colab / Kaggle Notebooks | Free GPU; runs unattended |
| Model serving | FastAPI endpoint | Load model into memory at startup; inference per request |
| Crop recommender | XGBoost / LightGBM | Scikit-learn compatible; lightweight; no GPU needed |
| LLM (conversational advisor) | Gemini API Key  | RAG via retrieved context; not fine-tuned |
| RAG retrieval | pgvector (Supabase) + sentence-transformers | Embed agronomy KB chunks; cosine similarity search |
| Indian language ASR | Bhashini API (Digital India) | Free developer access; covers Hindi, Marathi, 20+ Indian languages |
| International ASR | OpenAI Whisper (open-source, local) | `openai-whisper` Python package; run inference on CPU/GPU |
| TTS (Indian) | Bhashini TTS API | Same API as ASR |
| TTS (International) | Coqui TTS (open-source) or Azure Speech (free tier 500k chars/month) | Fallback for non-Indian languages |

---

## 6. Data & External APIs

| Data Type | Source | Access Method | Cost |
|-----------|--------|--------------|------|
| Satellite NDVI + NDMI | Sentinel Hub (Copernicus/ESA) | REST API + OAuth2 | Free developer tier |
| Satellite alt | Google Earth Engine | Python `earthengine-api` | Free (requires signup) |
| Weather (historical + forecast) | NASA POWER | REST API, no auth | Free, open |
| Weather (short-term alerts) | OpenWeatherMap | REST API, API key | Free tier (1,000 calls/day) |
| Soil data (India) | Soil Health Card (soilhealth.dac.gov.in) | Web scrape or CSV download | Open government data |
| Soil data (global/BRICS) | SoilGrids (ISRIC) | REST API, no auth | Free, open, 250m global grid |
| Crop recommendation training data | Kaggle "Crop Recommendation Dataset" | CSV download | Public / open |
| Disease training images | PlantVillage + PlantDoc | Download from Kaggle / GitHub | Free, research-licensed |
| Language services | Bhashini (Digital India) | REST API, API key | Free developer tier |

---

## 7. WhatsApp Integration

| Item | Choice | Notes |
|------|--------|-------|
| Provider | Twilio WhatsApp Sandbox **or** Gupshup Sandbox **or** Meta Cloud API Sandbox | Use exactly one; pick whichever issues sandbox number fastest |
| Webhook | FastAPI `/api/v1/whatsapp/webhook` | Receives POST on incoming message |
| Media handling | Download media URL → store in Supabase Storage | Twilio/Gupshup provide a temp media URL per message |
| Limitation | **Sandbox only** — disclosed explicitly in submission | Production requires WhatsApp Business verification (not achievable in this window) |

**Recommended provider for speed:** Twilio — fastest sandbox setup, excellent Python SDK (`twilio` package).

---

## 8. Development Tools

| Tool | Purpose |
|------|---------|
| GitHub | Version control; Vercel auto-deploys from main |
| VS Code / Cursor | IDE |
| Postman / Bruno | API testing |
| Supabase Dashboard | DB management, SQL editor, auth setup |
| Google Colab | CNN fine-tuning (free T4 GPU) |
| Kaggle Notebooks | Alternative training environment (free GPU) |
| Docker | Containerise FastAPI backend for Railway/Render |
| python-dotenv | Local `.env` management |

---

## 9. Environment Variables (Required)

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Sentinel Hub
SENTINEL_HUB_CLIENT_ID=...
SENTINEL_HUB_CLIENT_SECRET=...

# OpenWeatherMap
OPENWEATHER_API_KEY=...

# Anthropic (Claude)
ANTHROPIC_API_KEY=...

# Bhashini
BHASHINI_API_KEY=...
BHASHINI_USER_ID=...

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# App
ENVIRONMENT=development
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

---

## 10. Package Manifests (Key Dependencies)

### Backend (`requirements.txt`)
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
httpx==0.27.0
pydantic==2.7.0
supabase==2.4.0
sqlalchemy[asyncio]==2.0.0
asyncpg==0.29.0
apscheduler==3.10.0
torch==2.3.0
torchvision==0.18.0
xgboost==2.0.0
scikit-learn==1.5.0
sentence-transformers==3.0.0
openai-whisper==20231117
pillow==10.3.0
twilio==9.0.0
python-dotenv==1.0.0
python-multipart==0.0.9
anthropic==0.28.0
```

### Frontend (`package.json` key deps)
```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-router-dom": "^6.23.0",
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4",
  "leaflet-draw": "^1.0.4",
  "recharts": "^2.12.0",
  "react-i18next": "^14.0.0",
  "i18next": "^23.11.0",
  "axios": "^1.7.0",
  "tailwindcss": "^3.4.0",
  "@tailwindcss/forms": "^0.5.7"
}
```
