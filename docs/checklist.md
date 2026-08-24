# AgriSetu — Build Checklist

Track every item below. Check off only when fully working and deployed — not when "coded locally."

---

## Phase 0 — Prerequisites (Before Day 1)

### Accounts & Access
- [ ] GitHub repo `agrisetu` created with `main` and `dev` branches
- [ ] Supabase project created (Asia South / Mumbai region)
- [ ] Vercel account connected to GitHub
- [ ] Railway or Render account created
- [ ] Sentinel Hub account created + OAuth client created
- [ ] OpenWeatherMap API key generated
- [ ] Gemnini APi Key
- [ ] Bhashini developer account registered (approval pending/received)
- [ ] Twilio account created + WhatsApp sandbox number obtained
- [ ] Google Colab access verified (T4 GPU available)
- [ ] Kaggle account created + `kaggle.json` placed at `~/.kaggle/`

### API Keys & Environment
- [ ] `.env` file created with all keys from `Prerequisite.md` Section 2
- [ ] `.env` added to `.gitignore`
- [ ] All keys validated — no placeholder values remaining

### Database
- [ ] Supabase schema deployed (all 7 tables from `Architecture.md`)
- [ ] PostGIS extension enabled (`SELECT PostGIS_version();` returns value)
- [ ] pgvector extension enabled (`SELECT * FROM pg_extension WHERE extname = 'vector';`)
- [ ] RLS enabled on `plots` and `farmers` tables
- [ ] Supabase Storage bucket `disease-images` created

### Datasets
- [ ] PlantVillage dataset downloaded (~1.5 GB)
- [ ] Kaggle Crop Recommendation CSV downloaded

### API Verification (All must pass before Day 1)
- [ ] Sentinel Hub OAuth token call returns access token
- [ ] NASA POWER API returns weather data for test coordinate
- [ ] SoilGrids API returns soil data for test coordinate
- [ ] Anthropic Claude API returns a completion
- [ ] Bhashini ASR call returns transcription (or Whisper fallback confirmed working)

---

## Phase 1 — Day 1: Foundation (17 Aug)

### Backend Scaffold
- [ ] `agrisetu-backend/` created with full folder structure
- [ ] `main.py` — FastAPI app, CORS enabled, all routers mounted (stubs OK)
- [ ] `config.py` — all env vars loaded and validated at startup
- [ ] `GET /api/v1/health` → returns `{ "status": "ok" }`
- [ ] FastAPI starts locally: `uvicorn main:app --reload` — no errors
- [ ] `/docs` (Swagger UI) loads and shows all router stubs

### Frontend Scaffold
- [ ] `agrisetu-frontend/` created with Vite + React + Tailwind
- [ ] `npm run dev` starts without errors
- [ ] Home page renders at `localhost:5173`
- [ ] Tailwind classes applying correctly (test with a coloured div)
- [ ] `react-i18next` configured with `en.json`, `hi.json`, `mr.json` files

### External API Services
- [ ] `services/satellite.py` — `fetch_ndvi(lat, lon, start, end)` returns real NDVI float
- [ ] `services/weather.py` — `fetch_weather(lat, lon)` returns real weather dict
- [ ] `services/soil.py` — `fetch_soil(lat, lon)` returns real NPK/pH/moisture dict
- [ ] All three tested with Nashik, Maharashtra coordinates (lat: 20.0, lon: 73.8)
- [ ] Supabase client connects from FastAPI — test write + read on a temp table

### Schemas
- [ ] `schemas/farm.py` — `FarmPlot`, `FarmerCreate` Pydantic models
- [ ] `schemas/advisory.py` — `Advisory`, `IrrigationSchedule` Pydantic models
- [ ] `schemas/disease.py` — `DiseaseResult`, `DiseaseReport` Pydantic models
- [ ] `schemas/brics.py` — `BRICSAdvisory`, `BRICSAggregate` Pydantic models

### CNN Training (Colab — started Day 1)
- [ ] Colab notebook opened, T4 GPU runtime enabled
- [ ] PlantVillage dataset loaded into Colab
- [ ] MobileNetV3/EfficientNet-Lite training job started (running unattended)

**Phase 1 Sign-off:** All boxes above checked AND both servers start locally without errors.

---

## Phase 2 — Day 2: Farm Onboarding + Data Pipeline (18 Aug)

### Onboarding Backend
- [ ] `POST /api/v1/onboarding/farmer` — creates farmer in Supabase, returns farmer_id
- [ ] `POST /api/v1/onboarding/plot` — accepts GeoJSON polygon, saves to PostGIS, triggers data fetch
- [ ] `GET /api/v1/onboarding/plot/{plot_id}` — returns plot with soil/weather/NDVI summary
- [ ] After plot creation: soil, weather, NDVI all auto-fetched and stored in respective tables
- [ ] Verified in Supabase dashboard: new rows appear in `plots`, `soil_data`, `weather_data`, `ndvi_data`

### Onboarding Frontend
- [ ] `pages/OnboardingPage.jsx` renders correctly
- [ ] Leaflet map loads (base tile layer visible)
- [ ] `leaflet-draw` controls: polygon draw tool working
- [ ] Form: farmer name, phone, language, current crop — all fields functional
- [ ] On submit: calls `POST /api/v1/onboarding/plot` → shows loading spinner → shows success
- [ ] Success screen shows: soil NPK summary, NDVI value, weather risk level
- [ ] UI renders in Hindi (switch language toggle → test)

### Sample Plots
- [ ] Sample Plot 1 created: Nashik, Maharashtra, India — real data flowing
- [ ] Sample Plot 2 created: São Paulo state, Brazil — real data flowing (SoilGrids + NASA POWER)
- [ ] Both plots visible in Supabase `plots` table with geometry stored correctly

### Data Pipeline
- [ ] APScheduler job configured: runs `fetch_all_plots_data()` every 6 hours
- [ ] Scheduler starts with FastAPI app (no startup errors)
- [ ] Manual trigger tested: job runs, updates data for both sample plots

**Phase 2 Sign-off:** Complete farm onboarding in browser → check Supabase → all 4 data tables have new rows.

---

## Phase 3 — Day 3: Disease Diagnosis + Crop Advisory (19 Aug)

### Disease Diagnosis Backend
- [ ] CNN model weights available (Colab fine-tuned OR HuggingFace pretrained fallback)
- [ ] Model loaded at FastAPI startup via `lifespan` — no per-request loading
- [ ] `POST /api/v1/disease/predict` — accepts multipart image upload
- [ ] Image saved to Supabase Storage (`disease-images` bucket)
- [ ] Inference returns top prediction in < 5 seconds for a 1MB JPEG
- [ ] Response schema: `{ disease_name, confidence_pct, treatment, organic_remedy }`
- [ ] Disease report saved to `disease_reports` table in Supabase
- [ ] Tested with 5 different leaf photos — at least 4 return correct diagnosis

### Disease Diagnosis Frontend
- [ ] `components/DiseaseUploader.jsx` — file picker + camera capture working
- [ ] Shows loading state during inference
- [ ] Result card: disease name, confidence percentage bar, treatment text, organic remedy
- [ ] All text localised (i18n)
- [ ] Error state shown if upload fails or model returns low confidence (< 50%)

### Crop Advisory Backend
- [ ] XGBoost model trained on Crop Recommendation CSV — validation accuracy > 80%
- [ ] `routers/advisory.py`: `GET /api/v1/advisory/{plot_id}` — fetches plot context, runs model
- [ ] Rule-based regenerative layer applied on top of XGBoost output
- [ ] Advisory stored in `advisories` table in Supabase
- [ ] Response includes: recommended_crop, sowing_window, irrigation_schedule, regenerative_practices, risk_alerts
- [ ] Tested for both sample plots — returns different advisories (data-driven, not identical)

### Advisory Frontend
- [ ] `components/AdvisoryCard.jsx` renders recommendation, sowing window, irrigation schedule
- [ ] Regenerative practices shown as separate section
- [ ] Risk alerts shown as coloured banner (green/yellow/red)
- [ ] Localised in Hindi and English

**Phase 3 Sign-off:** Upload leaf photo → diagnosis in < 5s. Call advisory endpoint for both sample plots → different, real recommendations returned.

---

## Phase 4 — Day 4: LLM Chat Advisor (20 Aug)

### Knowledge Base
- [ ] 20+ agronomy text documents created in `data/agronomy_kb/`
- [ ] Documents cover: irrigation, pest management, regenerative practices, disease treatments
- [ ] All documents embedded with `sentence-transformers` model
- [ ] Embeddings stored in Supabase pgvector `knowledge_base` table
- [ ] `services/rag.py` — `retrieve_relevant_chunks(query, top_k=3)` returns relevant chunks via cosine similarity

### LLM Chat Backend
- [ ] `services/llm.py` — `generate_advisory(plot_context, kb_chunks, question)` calls Claude API
- [ ] System prompt enforces: use only provided context, be concise, practical, farmer-appropriate
- [ ] `POST /api/v1/chat/ask` — full pipeline: fetch plot context → RAG retrieval → Claude → response
- [ ] Response includes plot-specific details (not generic advice)
- [ ] Tested: "When should I irrigate my wheat?" → response cites plot's soil moisture and weather forecast

### Translation Pipeline
- [ ] `services/translation.py` — `translate_to_english(text, lang)` works via Bhashini or Claude fallback
- [ ] `services/translation.py` — `translate_from_english(text, lang)` works
- [ ] Hindi → English → Hindi round-trip preserves meaning
- [ ] Fallback to Claude translation if Bhashini times out (tested by disconnecting Bhashini key temporarily)

### Chat Frontend
- [ ] `components/ChatWidget.jsx` — message history, input, send button all functional
- [ ] Hindi question → Hindi response displayed correctly (Devanagari renders)
- [ ] Loading indicator shown during API call
- [ ] Error state handled (API failure → friendly message)
- [ ] Conversation history maintained in session state (React)

**Phase 4 Sign-off:** Type "Meri fasal mein paani kab dena chahiye?" in Hindi → receive contextual Hindi response referencing actual plot weather data within 10 seconds.

---

## Phase 5 — Day 5: Voice + WhatsApp (21 Aug)

### Voice Pipeline
- [ ] `services/asr.py` — Bhashini ASR working for Hindi audio file
- [ ] `services/asr.py` — Whisper fallback working for Portuguese/other audio
- [ ] `services/tts.py` — Bhashini TTS generates audio file for Hindi response
- [ ] `services/tts.py` — Coqui or Azure TTS fallback for non-Indian languages
- [ ] `POST /api/v1/voice/ask` — audio in → text advisory → audio response out
- [ ] Audio response saved to Supabase Storage → URL returned
- [ ] Full Hindi voice round-trip tested: record → transcribe → advise → synthesise → play

### Voice Frontend
- [ ] Mic button in `ChatWidget.jsx` — triggers MediaRecorder API
- [ ] Audio recorded and sent to `POST /api/v1/voice/ask`
- [ ] Audio response URL played back in browser
- [ ] Works on mobile Chrome (tested at 375px)

### WhatsApp Webhook
- [ ] Backend deployed to Railway (stable URL, not localhost)
- [ ] `POST /api/v1/whatsapp/webhook` — Twilio signature verified
- [ ] Text message handling: routes to chat handler → sends reply
- [ ] Image message handling: downloads media → disease inference → sends diagnosis reply
- [ ] Voice note handling: downloads audio → ASR → chat → sends text reply
- [ ] Greeting flow: new sender receives welcome message in their language
- [ ] Twilio dashboard webhook URL set to Railway URL
- [ ] End-to-end test from real WhatsApp (personal number joined sandbox):
  - [ ] Text "What crop should I grow?" → receives advisory
  - [ ] Send leaf disease photo → receives diagnosis
  - [ ] Send voice note in Hindi → receives text response in Hindi

**Phase 5 Sign-off:** Complete WhatsApp demo — text, image, voice — all working from a real phone to the sandbox number.

---

## Phase 6 — Day 6: Dashboard + BRICS API (22 Aug)

### Farmer Dashboard
- [ ] `pages/FarmerDashboard.jsx` — loads real data for logged-in farmer's plot
- [ ] Crop health card — NDVI-based green/yellow/red status (not hardcoded)
- [ ] "Water today?" card — based on soil moisture + weather forecast (not hardcoded)
- [ ] Weather risk card — based on OpenWeatherMap forecast (not hardcoded)
- [ ] Disease check button → opens DiseaseUploader
- [ ] Fully localised in Hindi and English
- [ ] Mobile-first: tested and functional at 375px viewport

### Agronomist Dashboard
- [ ] `pages/AgronomistDashboard.jsx` — loads correctly
- [ ] Leaflet map: both sample plots appear as polygon outlines
- [ ] NDVI colour coding: plots coloured by NDVI value (red→green gradient)
- [ ] NDVI legend visible on map
- [ ] Disease heatmap toggle: circles appear at plot centroids (sized by report count)
- [ ] Soil moisture overlay toggle functional
- [ ] Click a plot → side panel slides in with:
  - [ ] Farmer name, current crop, plot location
  - [ ] NDVI trend line chart (Recharts, real data)
  - [ ] Soil NPK + pH summary table
  - [ ] Latest advisory text
  - [ ] Disease report history list
- [ ] Bottom tabs all functional:
  - [ ] Plots tab: table of all registered plots
  - [ ] Disease Reports tab: recent disease reports across all plots
  - [ ] Advisories tab: all generated advisories
  - [ ] BRICS Aggregate tab: anonymised stats panel

### BRICS Interoperability API
- [ ] `GET /api/v1/brics/advisory/{plot_id}` — returns advisory in BRICS Agri Data Model JSON schema
- [ ] `POST /api/v1/brics/disease-report` — accepts and stores disease report in shared schema
- [ ] `GET /api/v1/brics/aggregate` — returns anonymised country-level stats
- [ ] All 3 endpoints return correct data in Swagger UI (`/docs`)
- [ ] `$schema` field present in BRICS response (marks it as a formal data model)
- [ ] OpenAPI spec (`/openapi.json`) downloadable and valid

### Deployment
- [ ] Frontend deployed on Vercel — all pages load from public URL
- [ ] Backend deployed on Railway — all endpoints reachable from Vercel frontend
- [ ] CORS configured correctly (Vercel URL whitelisted in FastAPI)
- [ ] WhatsApp webhook still working after Railway redeploy
- [ ] No `.env` values or secrets visible in frontend build or browser devtools

**Phase 6 Sign-off:** Visit Vercel URL → complete all 10 demo flows from AppFlow.md — all show real data.

---

## Phase 7 — Day 7: Test + Submit (23 Aug)

### End-to-End Test (Morning)
- [ ] Flow 1 — Farm Onboarding: register new farmer + draw plot → data auto-fetched ✓
- [ ] Flow 2 — Crop Advisory: advisory generated with real data for both sample plots ✓
- [ ] Flow 3 — Disease Diagnosis: 5 leaf photos → correct diagnosis ✓
- [ ] Flow 4 — Hindi Chat: question → contextual Hindi response ✓
- [ ] Flow 5 — Voice: Hindi voice question → Hindi voice response ✓
- [ ] Flow 6 — Portuguese/Mandarin PoC: one non-Indian language produces response ✓
- [ ] Flow 7 — WhatsApp: text + photo + voice from real phone ✓
- [ ] Flow 8 — Farmer Dashboard: all 3 cards show real, non-hardcoded data ✓
- [ ] Flow 9 — Agronomist Dashboard: map, disease heatmap, plot side panel all functional ✓
- [ ] Flow 10 — BRICS API: all 3 endpoints return correct data ✓

### Submission Package
- [ ] Demo video recorded (max 3 min): all 7 demo-critical flows visible
- [ ] GitHub repo clean: no `.env` files, no debug print statements, README complete
- [ ] Pitch deck finalised: every section tied to an Indore Declaration mechanism
- [ ] All 12 project documents included in submission
- [ ] WhatsApp sandbox limitation explicitly stated in submission text
- [ ] Live Vercel URL tested one final time from an incognito browser
- [ ] Submission form filled and submitted before 23:59 IST on 23 August ✓

---

## Quick Reference — Demo-Critical Features (Must Work)

| Feature | Endpoint / Page | Status |
|---------|----------------|--------|
| Farm onboarding with map | `/onboarding` | ⬜ |
| Real NDVI + weather + soil data | `/api/v1/onboarding/plot` | ⬜ |
| Disease diagnosis (5+ classes) | `/api/v1/disease/predict` | ⬜ |
| Chat in Hindi | `/api/v1/chat/ask` | ⬜ |
| Chat in 2nd language | `/api/v1/chat/ask` | ⬜ |
| Voice in Hindi | `/api/v1/voice/ask` | ⬜ |
| WhatsApp text advisory | `/api/v1/whatsapp/webhook` | ⬜ |
| WhatsApp disease diagnosis | `/api/v1/whatsapp/webhook` | ⬜ |
| Farmer dashboard (real data) | `/dashboard/farmer` | ⬜ |
| Agronomist map dashboard | `/dashboard/agronomist` | ⬜ |
| BRICS API (3 endpoints) | `/api/v1/brics/` | ⬜ |
