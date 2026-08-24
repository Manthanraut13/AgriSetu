# AgriSetu — Implementation Plan

**Build Window:** 17–23 August 2026 | **Submit:** 23 August (treat as hard deadline)

---

## Day 0 (Before 17 Aug) — Setup & Prerequisites

**Complete all items in `Prerequisite.md` before coding starts.**

- [ ] All accounts created (Supabase, Sentinel Hub, Bhashini, Twilio, etc.)
- [ ] All API keys collected and placed in `.env`
- [ ] Datasets downloaded (PlantVillage, PlantDoc, Crop Recommendation CSV)
- [ ] Supabase project created with PostGIS + pgvector enabled
- [ ] Verification checklist in `Prerequisite.md` Section 10 — all green
- [ ] GitHub repo created; `main` and `dev` branches set up
- [ ] CNN training started on Colab (runs unattended — start early)

---

## Day 1 — Monday 17 Aug: Foundation

**Goal:** Runnable FastAPI + DB schema + project scaffold + data pipeline skeleton

### Morning (09:00–13:00)
**Task 1.1 — Project Scaffold**
- Create `agrisetu-backend/` with folder structure from `Architecture.md` Section 3
- `main.py` with FastAPI app, CORS, lifespan, all routers mounted (empty stubs)
- `config.py` loading all env vars with validation at startup
- `requirements.txt` from `Techstack.md`
- Health check endpoint: `GET /api/v1/health` → `{ "status": "ok", "timestamp": ... }`
- Create `agrisetu-frontend/` with Vite + React + Tailwind
- Verify both start locally without errors

**Task 1.2 — Database Setup**
- Run full schema SQL from `Architecture.md` Section 5 in Supabase SQL editor
- Enable RLS on `plots` and `farmers` tables
- Create Storage bucket `disease-images`
- Test connection from FastAPI using Supabase Python client

### Afternoon (14:00–19:00)
**Task 1.3 — External API Verification**
- `services/satellite.py`: function `fetch_ndvi(lat, lon, start_date, end_date)` → calls Sentinel Hub, returns float NDVI value
- `services/weather.py`: function `fetch_weather(lat, lon)` → calls NASA POWER + OpenWeatherMap, returns structured dict
- `services/soil.py`: function `fetch_soil(lat, lon)` → calls SoilGrids API, returns NPK/pH/moisture
- Test each function in isolation with a hardcoded Nashik, Maharashtra coordinate
- All three must return real data before end of day

**Task 1.4 — Lock Data Schema**
- Confirm `schemas/` Pydantic models for: `FarmPlot`, `SoilData`, `WeatherData`, `NDVIData`, `Advisory`, `DiseaseReport`
- These must not change after today — downstream code depends on them

**Day 1 Definition of Done:**
- [ ] FastAPI runs on localhost:8000, `/docs` loads, `/api/v1/health` returns 200
- [ ] React runs on localhost:5173
- [ ] Supabase schema deployed; all tables exist
- [ ] NDVI, weather, and soil functions return real data for a test coordinate
- [ ] All schemas defined and committed

---

## Day 2 — Tuesday 18 Aug: Farm Onboarding + Data Pipeline

**Goal:** A farmer can register a plot on a map and the system fetches real data for it

### Morning (09:00–13:00)
**Task 2.1 — Farm Onboarding Backend**
- `routers/onboarding.py`:
  - `POST /api/v1/onboarding/farmer` → create farmer record in Supabase
  - `POST /api/v1/onboarding/plot` → receive GeoJSON polygon → save to PostGIS → trigger data fetch
  - `GET /api/v1/onboarding/plot/{plot_id}` → return plot with latest soil/weather/NDVI summary
- After plot creation, automatically call all three data fetch services and store results

**Task 2.2 — Farm Onboarding Frontend**
- `pages/OnboardingPage.jsx`
- Leaflet map with `leaflet-draw` plugin: draw polygon or place marker
- Form: farmer name, phone, language, current crop, previous crop
- On submit: call `POST /api/v1/onboarding/plot` → show loading → show success with data summary
- Language: render in chosen language via react-i18next

### Afternoon (14:00–19:00)
**Task 2.3 — Scheduled Data Pipeline**
- `services/scheduler.py`: APScheduler job runs every 6 hours
- Fetches fresh NDVI + weather + soil for every registered plot
- Stores results in respective tables
- Add 2 sample plots manually (1 in Nashik, Maharashtra; 1 in São Paulo, Brazil — using SoilGrids + NASA POWER which are global)

**Task 2.4 — CNN Training (Parallel — Colab)**
- Launch PlantVillage fine-tuning on Colab T4 GPU (runs unattended overnight)
- Use transfer learning: load pretrained MobileNetV3 → freeze base → train classifier head on PlantVillage → then unfreeze last 2 blocks for full fine-tune
- Train for 10–15 epochs; target validation accuracy > 85%

**Day 2 Definition of Done:**
- [ ] Farmer + plot onboarding flow works end-to-end in browser
- [ ] After plot creation, real NDVI/soil/weather data appears in Supabase
- [ ] 2 sample plots exist in DB with real data
- [ ] CNN training job running on Colab (can check loss/accuracy)

---

## Day 3 — Wednesday 19 Aug: Disease Diagnosis + Crop Advisory

**Goal:** Disease photo → result; crop data → recommendation

### Morning (09:00–13:00)
**Task 3.1 — Disease Diagnosis Endpoint**
- Download fine-tuned CNN weights from Colab (if ready) OR use a pretrained EfficientNet-Lite for interim testing
- `routers/disease.py`:
  - `POST /api/v1/disease/predict` → accepts image file (multipart) → returns `{ disease_name, confidence_pct, treatment, organic_remedy }`
- Load model in `lifespan` context (once at startup)
- Build treatment lookup dict (JSON file): disease name → treatment + organic remedy text
- Test with 5 real leaf photos (download from PlantVillage test set)

**Task 3.2 — Disease UI**
- `components/DiseaseUploader.jsx`: camera capture + file upload
- Display result card: disease name, confidence bar, treatment text
- Localise all UI strings

### Afternoon (14:00–19:00)
**Task 3.3 — Crop & Irrigation Advisory Model**
- Train XGBoost on Kaggle Crop Recommendation Dataset (N, P, K, temperature, humidity, pH, rainfall → crop label)
- Add rule-based regenerative layer on top of XGBoost output:
  - If previous crop = legume → nitrogen credit → recommend less N input
  - If NDVI < 0.3 → recommend cover crop after harvest
  - If soil organic carbon < 0.5% → recommend reduced tillage + green manure
  - If rainfall forecast > 100mm/week → delay sowing recommendation
- `routers/advisory.py`:
  - `GET /api/v1/advisory/{plot_id}` → fetch plot context → run model → return full advisory

**Task 3.4 — Advisory Card UI**
- `components/AdvisoryCard.jsx`: top crop recommendation, sowing window, irrigation schedule, regenerative practices
- Read from `GET /api/v1/advisory/{plot_id}` using real data from sample plots

**Day 3 Definition of Done:**
- [ ] Upload a leaf photo → disease name + confidence + treatment returned in < 5 seconds
- [ ] Disease result stored in DB (disease_reports table)
- [ ] `GET /api/v1/advisory/{plot_id}` returns real advisory for both sample plots
- [ ] Advisory displayed in frontend with localised text

---

## Day 4 — Thursday 20 Aug: LLM Chat Advisor

**Goal:** Farmer can type a question in Hindi/English and get a contextual advisory reply

### Morning (09:00–13:00)
**Task 4.1 — Agronomy Knowledge Base**
- Create `data/agronomy_kb/` with 20–30 short agronomy text documents covering:
  - Irrigation guidelines for wheat, rice, tomato, sugarcane, maize
  - Pest management basics
  - Regenerative practices (intercropping, mulching, reduced tillage)
  - Common disease treatments
- Embed all documents using `sentence-transformers` (model: `paraphrase-multilingual-MiniLM-L12-v2`)
- Store embeddings in Supabase pgvector table `knowledge_base`
- Build `services/rag.py`: `retrieve_relevant_chunks(query_text, top_k=3)` → cosine similarity search

**Task 4.2 — LLM Chat Endpoint**
- `routers/chat.py`:
  - `POST /api/v1/chat/ask` → `{ message, language, plot_id }` → `{ response, language }`
- `services/llm.py`:
  - Fetch plot context (soil, weather, NDVI, last advisory, active crop) from Supabase
  - Retrieve top-3 KB chunks via RAG
  - Call Claude API with system prompt: "You are an agricultural advisor for BRICS farmers. Answer ONLY from the provided farm context and knowledge base. Be concise and practical."
  - Return response

### Afternoon (14:00–19:00)
**Task 4.3 — Language Translation**
- `services/translation.py`:
  - `translate_to_english(text, source_lang)` → Bhashini API
  - `translate_from_english(text, target_lang)` → Bhashini API
  - Fallback: if Bhashini fails, ask Claude to translate (wrap in system prompt)
- Wire translation into chat endpoint: detect if `language != 'en'` → translate in → get response → translate back

**Task 4.4 — Chat Widget UI**
- `components/ChatWidget.jsx`: message history, input box, send button, loading state
- Show response in farmer's language
- Add "voice" microphone button (wired up on Day 5)

**Day 4 Definition of Done:**
- [ ] Farmer types "Meri fasal mein kya problem hai?" in Hindi → receives relevant advisory in Hindi
- [ ] Response uses real plot data (soil, weather) and relevant KB chunks
- [ ] Chat history persists in session (React state, not DB — prototype)
- [ ] Translation works Hindi ↔ English

---

## Day 5 — Friday 21 Aug: Voice + WhatsApp Bot

**Goal:** Voice input works; WhatsApp sandbox bot handles text + photo + voice

### Morning (09:00–13:00)
**Task 5.1 — Voice Pipeline**
- Install `openai-whisper` as local fallback ASR
- `routers/voice.py`:
  - `POST /api/v1/voice/ask` → accepts audio file → returns `{ text_response, audio_url }`
- `services/asr.py`:
  - `transcribe_audio(audio_file, language)` → Bhashini (Indian) or Whisper (other)
- `services/tts.py`:
  - `synthesize_speech(text, language)` → Bhashini TTS (Indian) → save audio file to Supabase Storage → return URL
  - Fallback for non-Indian: Coqui TTS or Azure Speech
- Test voice flow: record "Aaj mujhe paani kab dena chahiye?" in Hindi → get voice response

### Afternoon (14:00–19:00)
**Task 5.2 — WhatsApp Webhook**
- Install `twilio` Python package
- `routers/whatsapp.py`:
  - `POST /api/v1/whatsapp/webhook` → parse incoming Twilio payload → route by message type
  - Text → chat handler
  - Image → download media URL → disease handler → reply with result
  - Voice note → download media → ASR → chat handler → reply with text
- Add greeting flow for new/unknown senders
- Deploy backend to Railway (needed for webhook URL)
- Configure Twilio webhook → Railway URL
- Test complete flow: WhatsApp → text → advisory reply, photo → disease reply

**Task 5.3 — Wire Voice Button in Chat UI**
- Connect mic button in `ChatWidget.jsx` to record audio → call `POST /api/v1/voice/ask` → play audio response

**Day 5 Definition of Done:**
- [ ] Hindi voice question → Hindi voice answer, end-to-end in < 10 seconds
- [ ] Portuguese/Mandarin voice question → English/translated text response (PoC)
- [ ] WhatsApp sandbox: send text → get advisory; send photo → get disease diagnosis
- [ ] Backend deployed on Railway and responding to webhook

---

## Day 6 — Saturday 22 Aug: Dashboard + BRICS API

**Goal:** Both dashboard views show real data; BRICS API stub is live

### Morning (09:00–13:00)
**Task 6.1 — Farmer Dashboard**
- `pages/FarmerDashboard.jsx`
- Fetch data from `GET /api/v1/advisory/{plot_id}` and weather endpoint
- Render: crop health status card (green/yellow/red NDVI), water today card, weather risk card, disease check button
- Language: full i18n
- Mobile-first: test at 375px

**Task 6.2 — FPO/Agronomist Dashboard**
- `pages/AgronomistDashboard.jsx`
- Leaflet map: show all registered plots as polygons
- Colour plots by NDVI value (red → green gradient)
- Disease heatmap toggle (circle at plot centroid = disease report count)
- Bottom panel tabs: Plots (table), Disease Reports (table), Advisories (table), BRICS Aggregate (stats)
- Plot click → side panel: all plot details + NDVI chart (Recharts LineChart) + soil summary

### Afternoon (14:00–19:00)
**Task 6.3 — BRICS Interoperability API**
- `routers/brics.py`:
  - `GET /api/v1/brics/advisory/{plot_id}` → returns advisory in BRICS Agri Data Model schema
  - `POST /api/v1/brics/disease-report` → accepts disease report in shared schema → stores
  - `GET /api/v1/brics/aggregate` → returns anonymised stats: avg NDVI by crop, disease prevalence %, regenerative adoption %
- `schemas/brics.py`: define the shared JSON schema (include schema URL / `$schema` field)
- Verify all 3 endpoints in Swagger UI `/docs`
- Deploy updated backend to Railway

**Task 6.4 — Frontend Deployment**
- Connect frontend repo to Vercel
- Set env vars in Vercel dashboard
- Deploy and verify all pages load with real data

**Day 6 Definition of Done:**
- [ ] Farmer dashboard shows real NDVI/weather/advisory data for both sample plots
- [ ] Agronomist dashboard map shows plot polygons with NDVI colour coding
- [ ] Disease heatmap appears for any reports filed
- [ ] BRICS API: all 3 endpoints return correct data via Swagger UI
- [ ] Frontend live on Vercel; backend live on Railway

---

## Day 7 — Sunday 23 Aug: Test, Fix, Submit

**Goal:** Every demo flow works end-to-end; submission packaged

### Morning (09:00–13:00) — End-to-End Testing
Run every flow from `AppFlow.md` in order. Use the following test script:

**Flow 1 — Onboarding:** Register new farmer → draw plot on map → confirm soil/weather/NDVI populated in DB and shown in UI
**Flow 2 — Advisory:** Check crop recommendation for both sample plots — verify real data, not defaults
**Flow 3 — Disease:** Upload 5 leaf photos → check each returns correct disease + treatment
**Flow 4 — Chat (Hindi):** Type "Meri fasal mein paani kab dena chahiye?" → verify Hindi response with plot context
**Flow 5 — Chat (Portuguese):** Type "Quando devo plantar?" → verify response
**Flow 6 — Voice:** Record Hindi question → verify Hindi voice response
**Flow 7 — WhatsApp:** Send text, send disease photo, send voice note → verify all three paths return correct responses
**Flow 8 — Farmer Dashboard:** All 3 status cards correct; data not hardcoded
**Flow 9 — Agronomist Dashboard:** Map loads with plots; click plot → side panel; disease heatmap works
**Flow 10 — BRICS API:** Call all 3 endpoints via Swagger UI → correct responses

### Afternoon (14:00–20:00) — Fix + Submit

- [ ] Fix only broken flows from morning test — **no new features**
- [ ] Record demo video (max 3 minutes): show all 7 demo-critical flows from PRD.md Section 6
  - Screen record: web onboarding, disease diagnosis, Hindi chat, agronomist dashboard
  - Phone screen: WhatsApp bot flow (text + disease photo)
- [ ] Final submission package:
  - This document set (all 12 docs)
  - GitHub repo link
  - Live app URL (Vercel)
  - Demo video
  - Pitch deck (tie every section to an Indore Declaration mechanism)
  - Explicitly state: WhatsApp sandbox limitation, regenerative rules-based approach
- [ ] Submit before 23:59 IST on 23 August

---

## Critical Path (Things That Block Everything Else)

```
Supabase setup (Day 0)
    └── Farm onboarding (Day 2) ──────────────────────────────────────────┐
            └── Data pipeline (Day 2)                                     │
                    └── Advisory engine (Day 3)                           │
                            └── Chat RAG (Day 4)                          │
                                    └── Voice (Day 5)                     │
CNN training (Day 1–2, Colab)                                             │
    └── Disease endpoint (Day 3) ─────────────────────────────────────────┤
                                                                          │
WhatsApp webhook (Day 5) ─────────────────────────────────────────────────┤
                                                                          ▼
                                                              Dashboard (Day 6)
                                                              BRICS API (Day 6)
                                                              Submit (Day 7)
```

**If CNN training is still running on Day 3 morning:** Use a pre-fine-tuned EfficientNet-Lite from HuggingFace (`nateraw/plant-disease-efficientnet-lite`) as a temporary substitute while your Colab job finishes. Swap in your own weights when ready.
