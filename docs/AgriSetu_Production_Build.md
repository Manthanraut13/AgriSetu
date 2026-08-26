# AgriSetu — Production Build Document
### For AI Coding Agent | Post-Prototype Phase

---

## CONTEXT FOR AGENT

You are continuing development of AgriSetu — a BRICS agricultural advisory platform. A working prototype has already been built with the following completed:

**Prototype is DONE and working:**
- Farm onboarding with Leaflet map (draw plot boundary → PostGIS geometry stored)
- Real satellite NDVI + SoilGrids soil + NASA POWER weather data pipeline
- Disease CNN (MobileNetV3/EfficientNet-Lite, PlantVillage-trained, 5–10 classes)
- LLM chat advisor (Claude API + pgvector RAG + Bhashini translation, Hindi + Marathi)
- Voice pipeline (Bhashini ASR/TTS for Indian languages, Whisper fallback)
- WhatsApp sandbox bot (Twilio, handles text + image + voice)
- Farmer dashboard (status cards: crop health, water today, weather risk)
- FPO/Agronomist dashboard (Leaflet map with NDVI/disease overlays, plot side panel)
- BRICS Interoperability API stub (3 endpoints, shared JSON schema)

**Tech stack already in use (do not change core):**
- Backend: FastAPI (Python 3.11+), Uvicorn, Pydantic v2, httpx, APScheduler
- Frontend: React 18, Vite, Tailwind CSS, Leaflet, Recharts, react-i18next
- Database: Supabase (Postgres 15 + PostGIS + pgvector)
- ML: PyTorch (disease CNN), XGBoost (crop recommender), Anthropic Claude API
- Deployment: Vercel (frontend), Railway (backend), Supabase (DB + Storage)

**Your mission:** Evolve this prototype into a production-grade application. Read every section of this document before writing any code. Follow the implementation phases in order. Never break existing working prototype features.

---

## PART 1 — PRODUCT REQUIREMENTS (FULL APPLICATION)

### 1.1 Vision

AgriSetu is a multilingual, voice-first, AI-powered agricultural advisory platform and BRICS interoperability layer. It converts satellite, soil, and weather data into regenerative crop and disease advisories delivered to farmers in their language via chat, voice, WhatsApp, or SMS — and exposes that advisory through an open, shared data schema so any BRICS partner institution can plug in.

**The full application must serve:**
- 100,000+ farmers across BRICS nations
- FPOs, agronomists, and NGOs managing clusters of farmers
- Government agriculture departments as institutional API consumers
- BRICS partner institutions as data federation members

### 1.2 Full Module Requirements

#### Module 1 — Farm Onboarding (Extend Prototype)
- Multi-plot per farmer (prototype: one plot per farmer)
- Plot naming and tagging (season, crop cycle)
- Bulk FPO onboarding: CSV upload of farmer + plot list by agronomist
- Offline-capable onboarding via PWA (plot drawn offline, synced on reconnect)
- Auto-detect country and apply country-specific soil data source routing
- Plot history: archive old season data, start new crop cycle without losing history

#### Module 2 — Crop & Regenerative Advisory Engine (Extend + Replace)
- Replace XGBoost with a neural crop recommender using temporal sequences (NDVI trend + weather history + soil history → crop recommendation)
- Yield forecasting module: LSTM on historical yield + weather + NDVI per crop per region
- Market price integration: Agmarknet (India), CONAB (Brazil), similar per country
- Input dosage calculator: fertiliser quantity based on soil deficit + target yield + organic option
- Irrigation scheduling with soil moisture sensor integration (optional IoT path)
- Regenerative practice scoring: track adoption over seasons, show improvement in soil carbon

#### Module 3 — Disease Diagnostic Tool (Extend)
- Expand from 10 to 50+ disease classes covering BRICS crops: wheat, rice, sugarcane, maize, soybean, tomato, potato, cotton
- Continuous learning pipeline: verified field reports from FPO partners feed back into retraining
- Edge deployment: quantised TFLite/ONNX model runs on-device (Android, offline-capable)
- Pest identification in addition to disease (extend model output to include pest class)
- Disease alert system: if multiple reports of same disease in same region → trigger area alert to all farmers in that zone

#### Module 4 — Multilingual Voice + Chat Advisor (Extend)
- Full support for all 22 scheduled Indian languages via Bhashini
- Add: Portuguese (Brazil), Russian, Mandarin (Simplified), Zulu/Swahili (South Africa)
- Conversation memory: LLM remembers last 5 exchanges within a session; previous session summary stored in DB
- Proactive push advisory: if weather alert or disease outbreak detected → push WhatsApp/SMS message to affected farmers without them asking
- Fine-tuned retrieval: domain-specific embedding model trained on agronomy corpus (replace generic sentence-transformers)

#### Module 5 — WhatsApp + Channels (Upgrade)
- Verified WhatsApp Business API (move from sandbox to production number)
- IVR phone line: DTMF-based advisory for feature phone users (no WhatsApp)
- SMS fallback: plain-text advisory via SMS for zero-data users
- React Native mobile app: offline-capable, installable on Android (primary) and iOS
- USSD gateway: *123# style menu for absolute last-mile (no data, no smartphone)

#### Module 6 — Farmer Dashboard (Extend)
- Season timeline view: track crop through growth stages with NDVI overlays per stage
- Input log: farmer records what they applied (fertiliser, pesticide) — advisory adapts
- Market price widget: live commodity prices for farmer's crop
- Yield history: season-by-season yield records and trends
- Community feed: aggregated disease alerts from neighbouring plots (anonymised)
- Multilingual push notifications (PWA notifications or WhatsApp proactive messages)

#### Module 7 — FPO/Agronomist Dashboard (Extend)
- Multi-FPO management: one agronomist can manage multiple FPOs
- Bulk advisory: select 50 plots → generate and send advisory to all in one action
- Input procurement planning: aggregate input needs across all FPO plots → generate procurement list
- Loan and credit advisory: flag plots with stress indicators to linked microfinance partners
- Regenerative practice compliance tracker: which farmers adopted which practices, export for certification
- Reporting: generate PDF season report per farmer or per FPO

#### Module 8 — BRICS Interoperability Layer (Build Full)
- Publish BRICS Agri Data Model v1.0 as a formal open specification
- Working data federation: live connections to at least 2 country nodes
- Country node deployment: AgriSetu packaged as a Docker Compose stack any country can self-host
- Shared disease alert registry: cross-country disease outbreak reporting
- Data sovereignty compliance: all PII and geometry stays in-country; only anonymised aggregates cross borders
- Partner onboarding portal: government/NGO partners can request API keys, view docs, test sandbox

#### Module 9 — Analytics & Intelligence Layer (New)
- Regional crop health dashboard: NDVI + disease + weather aggregated at district/state/country level
- Climate risk scoring: per-plot climate resilience score based on historical weather variance
- Soil health trend: organic carbon, moisture trend per plot over seasons
- Predictive alerts: ML model predicting disease outbreak risk 7 days ahead based on weather + historical patterns

#### Module 10 — Admin & Operations (New)
- Admin portal: manage farmers, FPOs, API keys, disease model versions
- Model versioning: deploy new disease model without downtime (blue/green)
- Data pipeline monitoring: track satellite/weather pull job health, alert on failures
- Cost dashboard: track Anthropic API, Sentinel Hub, Bhashini API spend per day

---

## PART 2 — FULL ARCHITECTURE

### 2.1 Production Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      FARMER TOUCHPOINTS                           │
│  React Native App │ Web PWA │ WhatsApp │ IVR/SMS │ USSD          │
└──────────┬─────────────────────────────────────────────┬─────────┘
           │                                             │
           ▼                                             ▼
┌──────────────────────────┐             ┌──────────────────────────┐
│   API Gateway (Kong /    │             │  Twilio / Gupshup        │
│   AWS API Gateway)       │             │  WhatsApp Business API   │
│   - Auth                 │             │  IVR / SMS               │
│   - Rate limiting        │             └────────────┬─────────────┘
│   - Routing              │                          │
└────────────┬─────────────┘                          │
             └────────────────┬─────────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │    FastAPI Backend Cluster     │
              │    (Multiple workers / pods)   │
              │                               │
              │  Routers: onboarding,          │
              │  advisory, disease, chat,      │
              │  voice, whatsapp, dashboard,   │
              │  brics, analytics, admin       │
              └──────┬──────────────┬─────────┘
                     │              │
         ┌───────────▼──┐    ┌──────▼────────────┐
         │  ML Services  │    │  Message Queue     │
         │  (Separate    │    │  (SQS / RabbitMQ)  │
         │   GPU pods)   │    │  - Async jobs      │
         │  - Disease CNN│    │  - Push alerts     │
         │  - Crop LSTM  │    │  - Bulk advisory   │
         │  - Yield model│    └──────┬─────────────┘
         └───────────────┘           │
                                     ▼
              ┌───────────────────────────────┐
              │        DATA LAYER             │
              │  RDS Postgres (Multi-AZ)      │
              │  + PostGIS + pgvector         │
              │  + Read replicas              │
              │                               │
              │  Redis (ElastiCache)          │
              │  - API response cache         │
              │  - Rate limit counters        │
              │  - Session store              │
              │                               │
              │  S3 / Supabase Storage        │
              │  - Disease images             │
              │  - Model weights              │
              │  - Generated reports          │
              └──────┬────────────────────────┘
                     │
         ┌───────────▼──────────────────────────┐
         │         EXTERNAL DATA SOURCES         │
         │  Sentinel Hub │ NASA POWER            │
         │  SoilGrids    │ OpenWeatherMap         │
         │  Agmarknet    │ CONAB (Brazil)         │
         │  Bhashini     │ Country Govt APIs      │
         └───────────────────────────────────────┘
```

### 2.2 Production Folder Structure

```
agrisetu/
├── agrisetu-backend/
│   ├── main.py
│   ├── config.py
│   ├── middleware/
│   │   ├── auth.py              # JWT validation middleware
│   │   ├── rate_limit.py        # slowapi / Redis rate limiting
│   │   ├── logging.py           # Structured JSON logging
│   │   └── cors.py
│   ├── routers/
│   │   ├── onboarding.py
│   │   ├── advisory.py
│   │   ├── disease.py
│   │   ├── chat.py
│   │   ├── voice.py
│   │   ├── whatsapp.py
│   │   ├── sms.py               # NEW: SMS/IVR channel
│   │   ├── dashboard.py
│   │   ├── analytics.py         # NEW: regional analytics
│   │   ├── brics.py
│   │   ├── admin.py             # NEW: admin operations
│   │   └── notifications.py     # NEW: proactive push alerts
│   ├── services/
│   │   ├── satellite.py
│   │   ├── weather.py
│   │   ├── soil.py
│   │   ├── llm.py
│   │   ├── rag.py
│   │   ├── translation.py
│   │   ├── tts.py
│   │   ├── asr.py
│   │   ├── scheduler.py
│   │   ├── market_price.py      # NEW: commodity price feeds
│   │   ├── alert_engine.py      # NEW: disease outbreak detection
│   │   ├── report_generator.py  # NEW: PDF report generation
│   │   └── cache.py             # NEW: Redis cache layer
│   ├── models/
│   │   ├── disease_model/
│   │   │   ├── model.py         # Model class + inference
│   │   │   ├── trainer.py       # Training + fine-tuning pipeline
│   │   │   └── registry.py      # Model version management
│   │   ├── crop_model/
│   │   │   ├── recommender.py   # Neural temporal recommender
│   │   │   └── yield_lstm.py    # NEW: yield forecasting LSTM
│   │   └── alert_model/
│   │       └── outbreak_predictor.py  # NEW: disease alert ML
│   ├── schemas/
│   │   ├── farm.py
│   │   ├── advisory.py
│   │   ├── disease.py
│   │   ├── brics.py
│   │   ├── analytics.py         # NEW
│   │   └── notifications.py     # NEW
│   ├── db/
│   │   ├── client.py            # Async SQLAlchemy + asyncpg
│   │   ├── redis_client.py      # NEW: Redis client
│   │   └── migrations/          # Alembic migration files
│   ├── tasks/                   # NEW: async task workers
│   │   ├── data_pipeline.py     # Satellite/weather batch jobs
│   │   ├── model_retraining.py  # Continuous learning pipeline
│   │   ├── push_alerts.py       # Proactive alert sender
│   │   └── report_tasks.py      # Async PDF generation
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
│
├── agrisetu-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── OnboardingPage.jsx
│   │   │   ├── FarmerDashboard.jsx
│   │   │   ├── AgronomistDashboard.jsx
│   │   │   ├── AnalyticsDashboard.jsx   # NEW
│   │   │   ├── AdminPortal.jsx          # NEW
│   │   │   └── BRICSPartnerPortal.jsx   # NEW
│   │   ├── components/
│   │   │   ├── MapPlotSelector.jsx
│   │   │   ├── ChatWidget.jsx
│   │   │   ├── DiseaseUploader.jsx
│   │   │   ├── NDVIMap.jsx
│   │   │   ├── WeatherCard.jsx
│   │   │   ├── DiseaseHeatmap.jsx
│   │   │   ├── SeasonTimeline.jsx       # NEW
│   │   │   ├── MarketPriceWidget.jsx    # NEW
│   │   │   ├── BulkAdvisoryPanel.jsx    # NEW
│   │   │   └── RegionalAnalyticsMap.jsx # NEW
│   │   ├── api/agrisetu.js
│   │   ├── hooks/                       # NEW: custom React hooks
│   │   │   ├── useRealtime.js           # Supabase realtime subscriptions
│   │   │   └── useOffline.js            # PWA offline state
│   │   └── i18n/
│   │       ├── en.json, hi.json, mr.json
│   │       ├── pt.json                  # NEW: Portuguese
│   │       ├── ru.json                  # NEW: Russian
│   │       └── zh.json                  # NEW: Mandarin
│   └── public/
│       └── manifest.json               # PWA manifest
│
├── agrisetu-mobile/                    # NEW: React Native app
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   └── offline/                    # Offline-first logic
│   └── package.json
│
└── agrisetu-ml/                        # NEW: Standalone ML service
    ├── disease_api.py                  # FastAPI for disease inference
    ├── crop_api.py                     # FastAPI for crop/yield inference
    ├── train/
    │   ├── train_disease.py
    │   ├── train_crop_lstm.py
    │   └── train_outbreak.py
    └── Dockerfile.gpu
```

### 2.3 Full Database Schema (Production Extensions)

```sql
-- Existing prototype tables: farmers, plots, soil_data, weather_data,
-- ndvi_data, advisories, disease_reports (already deployed — do not recreate)

-- NEW: Multi-season crop cycles
CREATE TABLE crop_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id),
  season TEXT NOT NULL,           -- 'kharif_2026', 'rabi_2026'
  crop TEXT NOT NULL,
  sowing_date DATE,
  harvest_date DATE,
  actual_yield_kg FLOAT,
  status TEXT DEFAULT 'active',   -- 'active' | 'completed' | 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Input log (farmer records what they applied)
CREATE TABLE input_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id),
  cycle_id UUID REFERENCES crop_cycles(id),
  input_type TEXT NOT NULL,       -- 'fertiliser' | 'pesticide' | 'irrigation' | 'organic'
  product_name TEXT,
  quantity FLOAT,
  unit TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Market price records
CREATE TABLE market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity TEXT NOT NULL,
  market_name TEXT,
  country TEXT NOT NULL,
  price_per_kg FLOAT NOT NULL,
  currency TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Conversation history (LLM memory)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id),
  plot_id UUID REFERENCES plots(id),
  channel TEXT NOT NULL,           -- 'web' | 'whatsapp' | 'voice' | 'sms'
  role TEXT NOT NULL,              -- 'user' | 'assistant'
  content TEXT NOT NULL,
  language TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Push notifications log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id),
  plot_id UUID REFERENCES plots(id),
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  language TEXT,
  trigger_type TEXT,              -- 'weather_alert' | 'disease_outbreak' | 'sowing_window' | 'irrigation'
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Regional disease alerts
CREATE TABLE disease_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name TEXT NOT NULL,
  country TEXT NOT NULL,
  district TEXT,
  disease_name TEXT NOT NULL,
  crop TEXT NOT NULL,
  severity TEXT NOT NULL,         -- 'low' | 'medium' | 'high' | 'critical'
  report_count INT DEFAULT 1,
  first_reported_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- NEW: API keys for BRICS partners
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT UNIQUE NOT NULL,
  partner_name TEXT NOT NULL,
  country TEXT,
  contact_email TEXT,
  permissions JSONB DEFAULT '["read_advisory", "read_aggregate"]',
  daily_limit INT DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- NEW: Disease model versions
CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL,       -- 'disease_cnn' | 'crop_lstm' | 'outbreak_predictor'
  version TEXT NOT NULL,
  accuracy FLOAT,
  f1_score FLOAT,
  classes JSONB,
  weights_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Agronomy knowledge base (pgvector)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  category TEXT,                  -- 'irrigation' | 'disease' | 'pest' | 'regenerative' | 'crop'
  crop TEXT,
  country TEXT,
  embedding vector(384),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- NEW: Soil Health Card data (India-specific)
CREATE TABLE soil_health_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id),
  card_id TEXT,
  nitrogen_class TEXT,
  phosphorus_class TEXT,
  potassium_class TEXT,
  ph_class TEXT,
  organic_carbon_class TEXT,
  issued_date DATE,
  source TEXT DEFAULT 'soil_health_card'
);

-- Indexes for performance
CREATE INDEX idx_plots_farmer ON plots(farmer_id);
CREATE INDEX idx_plots_country ON plots(country);
CREATE INDEX idx_disease_reports_plot ON disease_reports(plot_id);
CREATE INDEX idx_disease_reports_disease ON disease_reports(disease_name);
CREATE INDEX idx_notifications_farmer ON notifications(farmer_id);
CREATE INDEX idx_conversations_farmer ON conversations(farmer_id, created_at DESC);
CREATE INDEX idx_market_prices_commodity ON market_prices(commodity, country, recorded_at DESC);
CREATE INDEX idx_ndvi_data_plot_date ON ndvi_data(plot_id, image_date DESC);
```

---

## PART 3 — APP FLOWS (PRODUCTION EXTENSIONS)

### Existing flows from prototype (do not break):
- Farm Onboarding, Crop Advisory, Disease Diagnosis, Chat Advisory, Voice Advisory, WhatsApp Bot, Farmer Dashboard, Agronomist Dashboard, BRICS API

### New Flows to Build:

#### Flow 9 — Proactive Push Alert
```
Trigger: Alert engine detects condition
  │
  ├── Weather alert: forecast shows frost/drought/excess rain in next 48h
  │     → Query all active plots in affected region
  │
  ├── Disease outbreak alert: 3+ disease reports of same disease
  │     in same district in last 7 days → alert all farmers in district
  │
  ├── Sowing window open: advisory model says optimal sowing starts tomorrow
  │     → Notify farmer to prepare
  │
  ├── For each affected farmer:
  │     ├── Generate personalised alert message in their language
  │     ├── Route by preferred channel:
  │     │     WhatsApp → send via Business API
  │     │     SMS → send via Twilio SMS
  │     │     PWA → send push notification
  │     └── Log in notifications table
  │
  └── Log alert in disease_alerts table; update severity if reports increase
```

#### Flow 10 — Bulk FPO Advisory
```
Agronomist selects 50 plots on map → clicks "Generate Advisory for All"
  │
  ├── Backend: async task queued for each plot (SQS / RabbitMQ)
  │
  ├── Workers process each plot:
  │     → Fetch latest soil/weather/NDVI
  │     → Run crop recommender
  │     → Generate advisory text in farmer's language
  │     → Store in advisories table
  │
  ├── Progress shown to agronomist in real time (Supabase Realtime / SSE)
  │
  ├── On completion:
  │     ├── Send WhatsApp/SMS to each farmer with their advisory
  │     └── Export summary PDF for agronomist download
  │
  └── FPO dashboard refreshes with updated advisory count
```

#### Flow 11 — Season Report Generation
```
Agronomist or farmer requests season report for a plot
  │
  ├── POST /api/v1/reports/season { plot_id, cycle_id }
  │
  ├── Async task: report_generator.py
  │     ├── Pull: full NDVI trend, soil health, input log, yield data
  │     ├── Pull: disease reports for the season
  │     ├── Pull: advisories issued during the season
  │     ├── Generate charts as base64 images (matplotlib)
  │     └── Compose PDF (WeasyPrint / reportlab)
  │
  ├── PDF saved to Supabase Storage
  │
  └── Download link returned + WhatsApp link sent to farmer
```

#### Flow 12 — Continuous Disease Model Learning
```
FPO agronomist reviews disease reports flagged as uncertain (< 70% confidence)
  │
  ├── Agronomist portal: review queue of uncertain predictions
  │     → View image, predicted disease, confirm or correct label
  │
  ├── Verified labels saved to disease_reports.verified_label
  │
  ├── Weekly: model_retraining.py task runs
  │     ├── Pull all verified reports from last 30 days
  │     ├── Download new labelled images from Supabase Storage
  │     ├── Fine-tune current active model on new data (PyTorch, 5 epochs)
  │     ├── Evaluate on holdout set → must beat current accuracy to deploy
  │     ├── Save new weights to Supabase Storage
  │     └── Insert new model_versions record (is_active=False)
  │
  └── Admin reviews metrics → approves deployment → set is_active=True
        → FastAPI reloads model weights without restart (hot-swap via model registry)
```

#### Flow 13 — BRICS Country Node Federation
```
Country node (e.g., Brazil) runs its own AgriSetu instance
  │
  ├── Brazilian node collects: soil, weather, disease reports for Brazilian plots
  │
  ├── Anonymisation layer strips all PII and plot geometry → replaces with region code
  │
  ├── Every 24h: pushes anonymised aggregate to BRICS shared registry
  │     POST https://brics.agrisetu.org/api/v1/federation/push
  │     { country, crop_stats, disease_prevalence, soil_health_index, ndvi_avg }
  │
  ├── India node pulls from BRICS registry:
  │     GET https://brics.agrisetu.org/api/v1/federation/pull?country=BR
  │
  ├── Cross-country disease alert:
  │     If wheat rust outbreak in Russia → Brazilian wheat farmers get alert
  │
  └── BRICS shared disease knowledge base:
        Disease treatment docs contributed by each country → merged into shared KB
        Available to all country nodes via GET /api/v1/brics/knowledge
```

---

## PART 4 — TECH STACK (PRODUCTION UPGRADES)

### 4.1 Infrastructure Changes from Prototype

| Component | Prototype | Production |
|-----------|-----------|------------|
| Backend hosting | Railway (single container) | AWS ECS Fargate or GCP Cloud Run (auto-scaling) |
| Database | Supabase free tier | RDS Postgres 15 Multi-AZ + PostGIS + read replicas |
| Cache | None | Redis (AWS ElastiCache or Upstash) |
| ML inference | In-process with FastAPI | Separate ML service (GPU-enabled pods) |
| File storage | Supabase Storage | S3 (or keep Supabase Storage, upgrade tier) |
| Message queue | None (sync APScheduler) | SQS (AWS) or CloudAMQP (RabbitMQ) |
| CDN | Vercel edge | Cloudflare (frontend + API caching layer) |
| Monitoring | None | Datadog or Grafana + Prometheus |
| Logging | print/logging module | Structured JSON logs → CloudWatch or Loki |
| Mobile | None | React Native (Expo) |

### 4.2 New Dependencies to Add

**Backend (`requirements.txt` additions):**
```
# Cache
redis==5.0.0
aioredis==2.0.1

# Async task queue
celery==5.3.0
kombu==5.3.0

# PDF generation
weasyprint==61.0
reportlab==4.1.0

# Market price scraping / APIs
beautifulsoup4==4.12.0
lxml==5.2.0

# Model versioning
mlflow==2.13.0          # optional — for tracking experiments

# Monitoring
opentelemetry-api==1.24.0
opentelemetry-sdk==1.24.0
prometheus-fastapi-instrumentator==7.0.0

# Enhanced image processing
albumentations==1.4.0   # for disease model data augmentation

# PDF / reporting
matplotlib==3.9.0        # chart generation for reports
pillow==10.3.0

# Security
slowapi==0.1.9
cryptography==42.0.0
```

**Frontend (`package.json` additions):**
```json
{
  "react-native": "0.74.0",
  "expo": "~51.0.0",
  "@react-native-async-storage/async-storage": "^1.23.0",
  "workbox-webpack-plugin": "^7.0.0",
  "socket.io-client": "^4.7.0",
  "react-pdf": "^7.7.0",
  "@tanstack/react-query": "^5.0.0"
}
```

### 4.3 New External APIs

| Service | Purpose | Integration |
|---------|---------|-------------|
| Agmarknet (India) | Live mandi commodity prices | Web scrape + cache 4h |
| CONAB (Brazil) | Brazilian commodity prices | REST API |
| Twilio SMS | SMS fallback channel | `twilio` Python package |
| Twilio Voice / IVR | IVR phone advisory | TwiML + Twilio Voice |
| WhatsApp Business API (Meta) | Production WhatsApp (replace sandbox) | Meta Cloud API |
| Firebase Cloud Messaging | PWA + mobile push notifications | `firebase-admin` package |
| Apple Push Notification Service | iOS push (via Expo) | Expo notification service |
| WeasyPrint / reportlab | PDF report generation | Local library |
| USSD Gateway (Africa's Talking) | USSD for South Africa/last-mile | REST API |

### 4.4 Environment Variables (Production Additions)

```env
# Redis
REDIS_URL=redis://your-redis-instance:6379

# AWS (if using ECS/S3/SQS)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
S3_BUCKET_NAME=agrisetu-storage
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/...

# WhatsApp Business API (Meta)
META_WHATSAPP_TOKEN=...
META_PHONE_NUMBER_ID=...
META_WEBHOOK_VERIFY_TOKEN=...

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Market price APIs
AGMARKNET_API_KEY=...       # if available; otherwise use scraper
CONAB_API_KEY=...           # Brazil commodity prices

# USSD (Africa's Talking)
AT_USERNAME=...
AT_API_KEY=...

# Monitoring
DATADOG_API_KEY=...         # or GRAFANA_API_KEY
SENTRY_DSN=...              # error tracking

# Email (for reports, agronomist alerts)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...

# BRICS Federation
BRICS_REGISTRY_URL=https://brics.agrisetu.org
BRICS_NODE_ID=IN            # this node's country code
BRICS_NODE_SECRET=...       # shared secret for inter-node auth
```

---

## PART 5 — SECURITY (PRODUCTION-GRADE)

### 5.1 Authentication Upgrades

**JWT + Refresh Token flow (replace Supabase-only):**
```python
# In production, validate JWTs in API Gateway before they reach FastAPI
# FastAPI only trusts requests that have already passed gateway auth
# This removes per-request JWT decoding overhead from application layer

# For service-to-service (ML service ↔ main backend):
# Use short-lived service tokens signed with a shared secret (not user JWTs)
```

**Multi-factor authentication for agronomists and admins:**
- TOTP (Google Authenticator) via Supabase MFA
- Required for all `agronomist` and `admin` roles

### 5.2 API Gateway Security Rules
- Rate limit: 100 req/min per authenticated user; 10 req/min unauthenticated
- DDoS protection: AWS Shield (Standard, free) or Cloudflare DDoS mitigation
- WAF rules: block SQL injection patterns, oversized payloads, known bad IPs
- IP allowlisting for BRICS partner API keys (optional but recommended)

### 5.3 Secrets Management (Production)
- Move from `.env` file to AWS Secrets Manager or GCP Secret Manager
- Rotate all API keys on a 90-day schedule (automated)
- Audit log: every secret access logged to CloudWatch/Datadog

### 5.4 Data Encryption
- At rest: Postgres data encrypted (RDS default, enabled)
- In transit: TLS 1.3 enforced everywhere; no HTTP allowed
- Disease images in S3: Server-side encryption (SSE-S3 or SSE-KMS)
- Farmer PII: additional column-level encryption for phone numbers using `pgcrypto`

```sql
-- Encrypt farmer phone numbers at rest
UPDATE farmers SET phone = pgp_sym_encrypt(phone, 'encryption_key')
WHERE phone IS NOT NULL;
-- Query with: pgp_sym_decrypt(phone::bytea, 'encryption_key')
```

### 5.5 Prompt Injection (Production Hardening)
```python
# Add content moderation layer before LLM call
BLOCKED_PATTERNS = [
    r"ignore.{0,20}(previous|above|all).{0,20}instruction",
    r"you are now",
    r"act as",
    r"disregard",
    r"reveal.{0,20}(prompt|key|secret)",
    r"system.{0,10}prompt"
]

def is_injection_attempt(text: str) -> bool:
    import re
    text_lower = text.lower()
    return any(re.search(p, text_lower) for p in BLOCKED_PATTERNS)

# In chat endpoint:
if is_injection_attempt(user_message):
    return {"response": "I can only help with farming questions.", "flagged": True}
```

### 5.6 GDPR / Data Sovereignty Compliance
- Farmer data stored only in the country where the farmer is located (use regional DB instances)
- Right to deletion: `DELETE /api/v1/farmer/me` anonymises PII, retains anonymised agricultural data
- Data export: `GET /api/v1/farmer/me/export` returns all of a farmer's data as JSON
- Consent: explicit opt-in for data sharing with BRICS partners (checkbox in onboarding)
- BRICS data sharing: only anonymised aggregates cross borders, never PII or plot geometry

---

## PART 6 — PRODUCTION IMPLEMENTATION PLAN

### Phase 1 — Infrastructure Hardening (Weeks 1–2)
**Goal:** Production-grade hosting, monitoring, CI/CD

**Tasks:**
1. Set up CI/CD pipeline (GitHub Actions)
   - On push to `dev`: run tests, lint, build Docker image
   - On merge to `main`: deploy to staging → run E2E tests → deploy to production
2. Containerise properly
   - Multi-stage Dockerfile: builder stage (install deps) + runtime stage (slim image)
   - `docker-compose.yml` for local dev with Postgres + Redis + backend + frontend
3. Set up Redis (Upstash for start; ElastiCache for scale)
   - Cache satellite/weather API responses with 6h TTL
   - Cache advisory responses per plot with 1h TTL
   - Session store for conversation history
4. Set up structured logging
   - JSON logs with: timestamp, request_id, user_id (anonymised), endpoint, duration, status
   - Log aggregation: CloudWatch or Grafana Loki
5. Set up error tracking: Sentry (free tier for start)
6. Set up uptime monitoring: Better Uptime or Grafana
7. Migrate database
   - Move from Supabase free tier to Supabase Pro OR AWS RDS
   - Enable automated daily backups with 30-day retention
   - Test restore procedure
8. Set up secrets management: AWS Secrets Manager or environment-based (Railway Pro)

**Deliverable:** All existing prototype features working on production infrastructure. Zero downtime from prototype deployment.

---

### Phase 2 — Disease Model Expansion (Weeks 2–3)
**Goal:** 50+ disease classes, continuous learning pipeline, disease alerts

**Tasks:**
1. Expand training dataset
   - Merge PlantVillage (38 classes) + PlantDoc + any field photos collected from FPOs
   - Target BRICS crops: add wheat rust, rice blast, sugarcane smut, soybean rust, cotton bollworm visual damage
   - Data augmentation: albumentations pipeline (rotation, crop, colour jitter, blur)
2. Upgrade model architecture
   - Fine-tune EfficientNet-B4 (replace MobileNetV3 for higher accuracy; still fast enough for CPU inference)
   - Train with class-weighted loss (handle imbalanced disease classes)
   - Target: top-1 accuracy > 88%, top-3 accuracy > 96%
3. Separate ML inference service
   - New `agrisetu-ml/` FastAPI service
   - GPU-enabled Docker container (deploy to Railway GPU or Fly.io GPU)
   - Main backend calls ML service via internal HTTP (not in-process)
   - This allows ML service to scale independently of main API
4. Model version management
   - `model_versions` table tracks all trained weights
   - Admin approves a version → `is_active=True` → ML service hot-swaps weights
   - No restart required for model updates
5. Disease alert engine
   - `services/alert_engine.py`: runs every hour via APScheduler
   - Query: `SELECT disease_name, district, COUNT(*) FROM disease_reports WHERE reported_at > NOW() - INTERVAL '7 days' GROUP BY disease_name, district HAVING COUNT(*) >= 3`
   - If new alert condition: insert into `disease_alerts` table + trigger push notifications to farmers in that district
6. Continuous learning pipeline
   - Agronomist review UI: queue of uncertain disease predictions (confidence < 70%)
   - Verified labels stored in `disease_reports.verified_label`
   - Weekly Celery task: pull verified reports → fine-tune model → evaluate → store as new version

**Deliverable:** Disease model covers 50+ classes. Alerts fire automatically. Agronomists can review and improve predictions.

---

### Phase 3 — LLM Advisor Upgrades + Full Language Support (Weeks 3–4)
**Goal:** Conversation memory, proactive alerts, all BRICS languages

**Tasks:**
1. Conversation memory
   - Store all messages in `conversations` table
   - In `services/llm.py`: on each new message, fetch last 5 exchanges from DB
   - Include summary of last session in system prompt context
   - Session summary generated by Claude at session end (when farmer stops responding for 30 min)
2. Full Bhashini integration (22 Indian languages)
   - Test and enable all available Bhashini language codes
   - Language auto-detection from first message if not set
   - Update language preference in farmer profile after detection
3. Add BRICS international languages
   - Portuguese (Brazil): Whisper ASR + Google Translate / Claude translation + Coqui TTS (Portuguese)
   - Russian: Whisper ASR + Claude translation + TTS
   - Mandarin Simplified: Whisper ASR + Claude translation + TTS
   - Zulu / Swahili (South Africa): Whisper ASR + Claude translation + TTS
4. Domain-specific RAG improvements
   - Expand agronomy knowledge base to 200+ documents
   - Add country-specific content: EMBRAPA docs (Brazil), ICAR docs (India), Chinese agri ministry docs
   - Re-embed with `paraphrase-multilingual-mpnet-base-v2` (better multilingual quality than MiniLM)
   - Evaluate retrieval quality: measure if relevant chunk is in top-3 for 50 test questions
5. Proactive push advisory system
   - `tasks/push_alerts.py`: Celery task, runs every 3 hours
   - Check: weather alerts, disease outbreaks, sowing windows opening, irrigation due
   - For each triggered condition: generate personalised message → route to farmer's preferred channel
   - Throttle: max 2 proactive messages per farmer per day
   - Track delivery in `notifications` table

**Deliverable:** Chat works in all target languages. Farmers receive proactive alerts without having to ask.

---

### Phase 4 — Advanced Advisory + Market Integration (Weeks 4–5)
**Goal:** Yield forecasting, market prices, neural crop recommender

**Tasks:**
1. Neural crop recommender
   - Replace XGBoost with temporal model
   - Input features: NDVI time series (last 12 weeks), soil history (4 seasons), weather forecast (14 days), previous crop sequence
   - Architecture: LSTM or Transformer encoder → classification head
   - Training data: combine Kaggle crop data + historical NDVI patterns for Indian crops
   - Target: outperform XGBoost on F1 score for top-3 crop recommendation
2. Yield forecasting LSTM
   - Input: crop type + NDVI at key growth stages + rainfall + temperature
   - Output: expected yield per hectare with confidence interval
   - Train on: ICRISAT data + state agriculture department data (publicly available)
   - Show yield forecast in farmer dashboard with historical comparison
3. Market price integration
   - `services/market_price.py`
   - India: scrape Agmarknet or use eNAM API (electronic National Agriculture Market)
   - Brazil: CONAB API (public)
   - Cache all prices in `market_prices` table with 4h refresh
   - `MarketPriceWidget.jsx`: show current mandi price for farmer's crop + trend (up/down)
   - Advisory integration: if market price is high for a crop and soil/weather is suitable → boost that crop's recommendation
4. Input dosage calculator
   - API endpoint: `POST /api/v1/advisory/input-dosage { plot_id, target_crop, target_yield }`
   - Calculate: N/P/K deficit from soil data vs. crop requirement → dosage recommendation
   - Return: chemical option + organic option + cost estimate
   - Show in advisory card as collapsible section
5. Regenerative practice scoring
   - Track which practices each farmer has adopted over time (from input_logs)
   - Score: 0–100 based on: cover crops used, tillage reduction, organic inputs ratio, intercropping
   - Show score in farmer dashboard with tips to improve
   - FPO dashboard: aggregate score across all plots → useful for certification programs

**Deliverable:** Advisory is now data-rich — includes yield forecast, market price, precise input dosage, and regenerative score.

---

### Phase 5 — WhatsApp Business + Channels Upgrade (Week 5)
**Goal:** Production WhatsApp, SMS/IVR fallback, PWA push notifications

**Tasks:**
1. WhatsApp Business API (Meta Cloud API)
   - Apply for WhatsApp Business verification (requires registered business)
   - Replace Twilio sandbox with Meta Cloud API direct integration
   - Update `routers/whatsapp.py` webhook handler for Meta webhook format (slightly different from Twilio)
   - Meta webhook verification endpoint (GET for token, POST for messages)
   - Test all 3 message types: text, image, voice
2. SMS channel
   - New `routers/sms.py`
   - Same logic as WhatsApp text handler
   - Route via Twilio SMS (no image, no voice — text only)
   - Compress advisory to 160 characters for single SMS; 480 chars for 3-part SMS
3. IVR / voice phone advisory
   - Twilio Voice webhook: farmer calls phone number → IVR menu
   - TwiML flow: `<Say>` welcome → `<Gather>` DTMF input → route to advisory function
   - Farm status: press 1 for weather, press 2 for crop advisory, press 3 for disease help
   - Disease help: farmer describes symptom verbally → Whisper transcribes → advisory returned via `<Say>`
4. PWA push notifications (web)
   - Add `manifest.json` and service worker to React frontend
   - Firebase Cloud Messaging for push
   - Request notification permission on first login
   - Send via `firebase-admin` from FastAPI on alert trigger
5. Mobile app (React Native / Expo)
   - Start with a thin shell around the web app (WebView) for fastest time to app store
   - Native features: camera access for disease photos, mic for voice, push notifications
   - Offline: cache last advisory and disease model results in AsyncStorage
   - Platform: Android first (primary market), iOS second

**Deliverable:** Farmers can receive advisories via WhatsApp (production), SMS, phone call, or push notification.

---

### Phase 6 — FPO Dashboard Upgrades (Week 6)
**Goal:** Bulk advisory, season reports, input procurement planning

**Tasks:**
1. Bulk advisory with async progress
   - FPO map: multi-select plots (shift+click or "Select all in region")
   - `POST /api/v1/advisory/bulk { plot_ids: [...] }` → returns task_id
   - Celery task processes each plot advisory asynchronously
   - Supabase Realtime or SSE: stream progress updates to agronomist UI
   - On complete: show summary + "Send to all farmers" button
2. Season PDF report generation
   - `POST /api/v1/reports/season { plot_id, cycle_id }`
   - Async task: collect all season data → generate charts (matplotlib) → compose PDF (WeasyPrint)
   - PDF includes: NDVI trend, soil health, disease history, input log, yield vs. forecast, advisory summary
   - Saved to S3/Storage → download link + WhatsApp link to farmer
3. Input procurement planning
   - FPO selects group of plots → `GET /api/v1/advisory/procurement { plot_ids }`
   - Aggregate: total N/P/K needed across all plots
   - Return: procurement list (kg of each input needed, estimated cost)
   - Export as CSV or PDF
4. Regenerative practice compliance export
   - `GET /api/v1/fpo/regenerative-report { fpo_id, season }`
   - Which farmers adopted which practices (from input_logs)
   - Export as CSV for certification bodies (organic, regenerative agriculture)
5. Agronomist mobile view
   - Responsive version of FPO dashboard for tablet (iPad, Android tablet)
   - Quick actions from field: view plot status, fire advisory, log disease report

**Deliverable:** Agronomists can manage 100s of farmers efficiently from one dashboard.

---

### Phase 7 — BRICS Federation + Analytics (Week 7)
**Goal:** Live BRICS federation, regional analytics, admin portal

**Tasks:**
1. BRICS Federation Registry
   - Deploy `brics.agrisetu.org` as a lightweight FastAPI service
   - Country nodes authenticate with `BRICS_NODE_SECRET`
   - `POST /federation/push`: accepts anonymised aggregate from any node
   - `GET /federation/pull`: returns all countries' aggregate data
   - Cross-country disease alert relay
2. Country node packaging
   - `docker-compose.yml` in repo root that deploys full AgriSetu with a single command
   - Environment-variable driven: change `BRICS_NODE_ID=BR` for Brazil deployment
   - Includes: FastAPI backend, frontend, Postgres (local), Redis, ML service
   - README in English + Portuguese + Mandarin on how to deploy
3. BRICS partner onboarding portal
   - Web page: `brics.agrisetu.org/partners`
   - Request API key form → stored in DB → admin approves
   - Auto-generated API docs (Swagger) with sandbox environment
   - Usage dashboard: partners see their own API call counts and quota
4. Regional analytics dashboard
   - New `pages/AnalyticsDashboard.jsx`
   - Aggregate NDVI by district/state: choropleth map (D3 or deck.gl)
   - Disease prevalence heatmap at regional level
   - Soil health index per region (average from all registered plots)
   - Season progress tracking: % of plots in sowing / growing / harvest stage
   - Available to: government agriculture departments, BRICS partner institutions
5. Admin portal
   - `pages/AdminPortal.jsx` (role: admin only)
   - Farmer management: search, view, soft-delete
   - Disease model version management: view versions, approve deployment
   - API key management: view all BRICS partner keys, revoke
   - System health: data pipeline job status, external API status
   - Cost dashboard: daily/weekly API spend (Anthropic, Sentinel Hub, Bhashini)

**Deliverable:** BRICS federation is live. Regional analytics available to partners. Admin can operate the platform.

---

### Phase 8 — Hardening, Performance, Scale Testing (Week 8)
**Goal:** Platform ready for 100k users

**Tasks:**
1. Load testing
   - Use Locust to simulate 1,000 concurrent users
   - Test all critical endpoints: `/chat/ask`, `/disease/predict`, `/advisory/{plot_id}`
   - Identify bottlenecks; target P95 latency: chat < 5s, disease < 5s, advisory < 2s
2. Caching audit
   - Ensure satellite/weather data cached in Redis (not re-fetched per request)
   - Ensure advisory responses cached per plot with 1h TTL
   - Ensure LLM responses for common questions cached (exact-match cache with Redis)
3. Database optimisation
   - Run EXPLAIN ANALYZE on all slow queries
   - Add missing indexes (review query patterns from load test)
   - Enable connection pooling via PgBouncer
   - Set up read replica routing: read-heavy endpoints (dashboard, analytics) use replica
4. Auto-scaling configuration
   - Backend: ECS Fargate with auto-scaling (scale out when CPU > 60%)
   - ML service: separate auto-scaling group (GPU instances — scale to 0 when idle, scale out within 60s)
   - Database: RDS Multi-AZ for failover; no auto-scaling (fixed capacity planning)
5. Security audit
   - Run OWASP ZAP scan against staging
   - Run `pip-audit` and `npm audit` — zero high/critical
   - Penetration test: attempt SQL injection, prompt injection, IDOR, file upload abuse
   - Fix all findings before production launch
6. Backup and disaster recovery
   - Daily automated DB backups (RDS snapshots, 30-day retention)
   - Test restore procedure: restore to a point 24h ago in a test environment
   - Document RPO (4 hours) and RTO (2 hours) targets

**Deliverable:** Platform handles 1,000 concurrent users. All security issues resolved. DR tested.

---

## PART 7 — AGENT RULES (DO'S AND DON'TS)

### Absolute Rules — Never Violate

**Code Quality**
- Write real, working code only — no `# TODO: implement` in any production path
- No hardcoded data in any endpoint — all values from real DB or real APIs
- All FastAPI route handlers must be `async def` — no sync blocking calls
- Use Pydantic v2 models for all request/response schemas — no raw `dict` passing
- Never log API keys, JWTs, farmer PII, or plot coordinates
- Never catch bare `Exception` — catch specific exceptions and log them
- Never use `requests` library in FastAPI — use `httpx` with `await`

**Architecture**
- One advisory logic path — WhatsApp, web, voice, SMS all call the same service functions
- One database — Supabase/RDS Postgres. Do not add SQLite, MongoDB, or any second DB
- Redis for caching only — not as a primary data store
- ML inference always via the ML service (separate process/pod) — never load GPU models in main FastAPI process
- All farmer-facing text through i18n translation layer — never hardcode English text in JSX

**Security**
- Never expose `SUPABASE_SERVICE_KEY` or any secret key to the frontend
- Twilio and Meta webhook signature verification is mandatory on every request
- RLS must be enabled on all tables containing farmer data
- Validate and sanitise all file uploads (type + size + magic bytes)
- Check for prompt injection before every Claude API call

**Existing Features**
- Never break any working prototype feature while adding new ones
- Run full E2E test suite before merging any feature branch to `main`
- Deploy to staging and verify before deploying to production

### Do's

- ✅ Read the relevant section of this document before building each module
- ✅ Build in the order specified in Part 6 (Phase 1 first, then 2, etc.)
- ✅ Commit after each fully working, tested feature
- ✅ Test every new endpoint in Swagger UI before connecting to frontend
- ✅ Test all mobile viewports (375px minimum) for any farmer-facing UI
- ✅ Log all external API calls with: endpoint, plot_id, duration, status_code
- ✅ Return structured error responses: `{ "error": "description", "code": "ERROR_CODE" }`
- ✅ Use Redis cache for all external API calls (satellite, weather, soil)
- ✅ Use background tasks / Celery for any operation taking > 2 seconds
- ✅ Stream progress for long operations (bulk advisory, PDF generation) via SSE or Supabase Realtime
- ✅ Write unit tests for all service functions (not just route handlers)
- ✅ Update `model_versions` table whenever a new disease model is trained and deployed
- ✅ Keep the agronomy knowledge base growing — add documents as you find relevant sources
- ✅ Check Redis cache before making any external API call

### Don'ts

- ❌ Do not add any no-code tool (n8n, Zapier, Make) — all logic in Python/FastAPI
- ❌ Do not introduce a new ML framework — stay with PyTorch + XGBoost
- ❌ Do not use OpenAI API — use Anthropic Claude API only
- ❌ Do not use OpenAI Whisper Cloud API — use local `openai-whisper` package
- ❌ Do not process disease images synchronously for files > 2MB — resize first or offload to background task
- ❌ Do not expose individual farmer data in BRICS API — only anonymised aggregates
- ❌ Do not send more than 2 proactive WhatsApp messages per farmer per day
- ❌ Do not deploy a new disease model without admin approval in `model_versions`
- ❌ Do not add new environment variables without updating `.env.example` and `Prerequisite.md`
- ❌ Do not pull satellite or weather data per request — always read from DB cache; let scheduler refresh

---

## PART 8 — SCALE TARGETS & MILESTONES

### Scale Milestones

| Milestone | Target | When |
|-----------|--------|------|
| **M1** — Infrastructure stable | 99.9% uptime, <500ms API P95 | End Phase 1 |
| **M2** — Disease model production | 50+ classes, 88%+ accuracy, continuous learning active | End Phase 2 |
| **M3** — Full language support | All BRICS languages working (text + voice) | End Phase 3 |
| **M4** — Advanced advisory | Yield forecast, market prices, input dosage live | End Phase 4 |
| **M5** — Production WhatsApp | Verified Business API, SMS, IVR active | End Phase 5 |
| **M6** — 1,000 active farmers | All channels active, FPO bulk tools working | End Phase 6 |
| **M7** — BRICS Federation live | 2+ country nodes active, real aggregate data flowing | End Phase 7 |
| **M8** — 100,000 farmers | Load test passed, auto-scaling confirmed, DR tested | End Phase 8 |

### Capacity Planning

| Resource | Current (Prototype) | 10k Farmers | 100k Farmers |
|----------|--------------------|--------------|--------------------|
| Backend instances | 1 container (Railway) | 3 pods | 10–20 pods (auto-scale) |
| DB connections | Supabase free (20 conn) | RDS db.t4g.large (300 conn) | RDS db.r6g.xlarge + PgBouncer |
| Redis | None | Upstash 256MB | ElastiCache r6g.large 13GB |
| Disease inference | In-process CPU | 1 GPU pod | 3 GPU pods (auto-scale) |
| Satellite API calls | On-demand | 10k plots × 1/day = cached | 100k × 1/day = batch + cache |
| Claude API calls | ~100/day | ~10k/day | ~100k/day (+ cache common Q's) |
| Bhashini API calls | ~50/day | ~5k/day | ~50k/day |

### Cost Estimates (100k Farmer Scale)

| Service | Monthly Cost (USD) |
|---------|-------------------|
| AWS ECS Fargate (10 pods) | ~$400 |
| RDS Postgres Multi-AZ | ~$300 |
| ElastiCache Redis | ~$150 |
| ML GPU pods (2× A10G) | ~$600 |
| S3 storage + data transfer | ~$100 |
| Anthropic Claude API (100k calls/day) | ~$3,000 |
| Sentinel Hub (production tier) | ~$300 |
| Bhashini API | Free (Govt of India) |
| WhatsApp Business API | ~$0.005/msg × 200k msgs = ~$1,000 |
| SMS (Twilio) | ~$0.01/SMS × 100k = ~$1,000 |
| Monitoring, CDN, misc | ~$200 |
| **Total** | **~$7,050/month** |

Revenue model to cover this: FPO SaaS subscriptions + government contracts + API licensing fees.

---

## PART 9 — DEFINITION OF DONE (EACH PHASE)

A phase is complete when all of the following are true:

**Functional:**
- [ ] Every new endpoint returns correct data (tested in Swagger UI)
- [ ] Every new UI component renders correctly at 375px and 1280px
- [ ] All new WhatsApp/SMS/voice flows tested end-to-end from a real device
- [ ] All existing prototype flows still working (regression test)

**Quality:**
- [ ] Unit tests written for all new service functions
- [ ] `pip-audit` and `npm audit` — zero high/critical vulnerabilities
- [ ] No hardcoded data in any user-facing path
- [ ] All new strings localised in at least English + Hindi

**Operational:**
- [ ] Feature deployed to staging and verified
- [ ] Deployed to production with zero downtime
- [ ] Monitoring alerts configured for any new critical path
- [ ] New environment variables documented in `.env.example`
- [ ] Phase checked off in this document

---

## PART 10 — BRICS ALIGNMENT (FOR EVERY FEATURE)

Every feature must map to at least one of these mechanisms from the Indore Declaration (July 2026). Include this mapping in feature PR descriptions and pitch materials.

| AgriSetu Feature | BRICS Mechanism |
|-----------------|-----------------|
| Crop & regenerative advisory engine | BRICS Network of Centres of Excellence on Agro-Ecology (ICAR-IIFSR) |
| Multilingual voice + chat advisor | BRICS Network on Digital Agriculture (IIT Delhi) |
| Disease diagnostic tool | BRICS AgriN — shared genetic/crop variety information |
| BRICS Interoperability API + Federation | BRICS Network on Digital Agriculture — data-driven advisory platform |
| BRICS aggregate analytics | BRICS AgriN — interoperability and shared data |
| Farmer rights + traditional knowledge (roadmap) | Global Forum on Farmers' Rights |

---

*Document version: 1.0 | For AI coding agent use — full context for post-prototype production build of AgriSetu*
