# Product Requirements Document (PRD)
## AgriSetu — Interoperable Digital Agriculture Network for BRICS Farmers
**Version:** 1.0 | **Build Window:** 17–23 Aug 2026 | **Deadline:** 24 Aug 2026

---

## 1. Product Overview

AgriSetu is a working prototype of the last-mile delivery layer for BRICS AgriN and the BRICS Network on Digital Agriculture. It converts satellite, soil, and weather data into regenerative crop and disease advisories in a farmer's own language — delivered over chat, voice, or WhatsApp — and exposes that advisory through an open shared data schema so any BRICS partner institution can plug in.

### 1.1 Problem Statement

| # | Sub-Problem | Impact |
|---|---|---|
| 1 | Information Gap | Small farmers make decisions from memory, not soil/weather/satellite signals |
| 2 | Disease & Pest Loss | Crop disease diagnosed too late, after yield is damaged |
| 3 | Language & Access Barrier | Agri-advisory tools are English/text/app-based; farmers need voice-first, local-language access |
| 4 | No Shared Cross-Border Layer | BRICS countries run separate agri-data silos with no common schema or API layer |

### 1.2 BRICS Alignment

AgriSetu maps directly onto the four mechanisms from the **Indore Declaration (July 2026)**:
- **BRICS AgriN** — shared crop variety, genetic resources, and input information
- **BRICS Network on Digital Agriculture** (IIT Delhi) — AI, geospatial, digital public infrastructure
- **BRICS Network of Centres of Excellence on Agro-Ecology** (ICAR-IIFSR) — regenerative, climate-resilient practices
- **Global Forum on Farmers' Rights in Seed Systems** — farmer seed and traditional knowledge rights

---

## 2. Target Users

| User Type | Description | Primary Interface |
|---|---|---|
| Small/Marginal Farmer | Primary beneficiary; low literacy, local language | WhatsApp Bot, Voice, Mobile Chat Widget |
| FPO (Farmer Producer Org) | Manages groups of farmers | Web Dashboard (Analytical View) |
| Agronomist / NGO Partner | Monitors and advises many farmers | Web Dashboard (Analytical View) |
| BRICS Partner Institution | Cross-border data consumer/producer | REST API |
| Government / Policy Maker | Macro-level insight | Dashboard (Aggregate View) |

---

## 3. Core Modules & Requirements

### Module 1 — Farm Onboarding
**Priority:** MUST (demo-critical)

| Requirement | Details |
|---|---|
| Plot Registration | Farmer draws farm boundary on map OR enters village/district name |
| Auto-fetch | System auto-fetches GPS coordinates, soil zone, and last known crop |
| Sample Plots | At minimum 2–3 sample plots — one in India, one in another BRICS country |
| Data Storage | Farm boundary stored as PostGIS geometry in Supabase |

### Module 2 — Crop & Regenerative Advisory Engine
**Priority:** MUST (demo-critical)

| Requirement | Details |
|---|---|
| Inputs | Satellite NDVI, soil moisture, soil health data, weather forecast |
| Outputs | Crop recommendation, sowing window, irrigation schedule, regenerative practice suggestions |
| Model | XGBoost/LightGBM trained on Kaggle Crop Recommendation Dataset + ICAR data |
| Regenerative Layer | Rule-based overlay for intercropping, cover crops, reduced tillage |
| Explainability | Advisory must include reasoning (e.g., "Low N-P-K detected → recommend legume") |

### Module 3 — Crop Disease Diagnostic Tool
**Priority:** MUST (demo-critical)

| Requirement | Details |
|---|---|
| Input | Photo uploaded via app, WhatsApp, or web interface |
| Output | Disease name, confidence score, treatment + organic remedy suggestion |
| Model | Fine-tuned MobileNetV3 or EfficientNet-Lite |
| Training Data | PlantVillage (54k images, 38 classes) + PlantDoc (2.6k real-field images) |
| Minimum Classes | At least 5–10 disease classes working live for demo |

### Module 4 — Multilingual Voice + Chat Advisor
**Priority:** MUST (demo-critical)

| Requirement | Details |
|---|---|
| Languages (prototype) | Hindi + Marathi (full pipeline), one non-Indian language (Portuguese or Mandarin as demo) |
| Input | Text OR voice note |
| Pipeline | ASR → Translation → LLM+RAG → Translation → TTS |
| ASR (Indian) | Bhashini API (Government of India) |
| ASR (International) | OpenAI Whisper (open-source) |
| LLM | Claude API or GPT API with RAG over agronomy knowledge base |
| TTS (Indian) | Bhashini TTS |
| TTS (International) | Coqui TTS or Azure Speech |
| Context | Retrieval includes farmer's own plot data (soil, weather, last advisory) |

### Module 5 — WhatsApp Bot
**Priority:** MUST (demo-critical, with stated limitations)

| Requirement | Details |
|---|---|
| Provider | Twilio / Gupshup / Meta Cloud API (sandbox/test number) |
| Minimum Flow | Greet → ask crop/photo → return real diagnosis or advisory |
| Shared Backend | Same FastAPI Advisory Gateway as web chat (not a separate system) |
| Limitation Statement | Must explicitly state: "sandbox test number; production requires verified WhatsApp Business account" |

### Module 6 — Dashboard
**Priority:** MUST (demo-critical)

**Farmer View (Simple):**
- Large icons, colour-coded status: crop health, water today, weather risk
- Minimal text, farmer's language

**FPO / Agronomist View (Analytical):**
- Map of all registered plots with NDVI + soil moisture overlay
- Disease-report heatmap by region
- Regenerative practice adoption trend chart
- BRICS-partner panel with anonymised aggregate stats
- Real data from Supabase — no mock charts

### Module 7 — BRICS Interoperability API
**Priority:** PARTIAL (stub with documentation)

| Requirement | Details |
|---|---|
| Minimum Endpoints | GET /advisory/{plot_id}, POST /disease-report, GET /plots (aggregate) |
| Schema | Shared JSON schema — Agri Data Model |
| Documentation | Fully documented with example request/response |
| Purpose | Demonstrates "digital public good" concept to judges |

---

## 4. Functional Requirements Summary

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-01 | Farm plot registration with real map | MUST | Build |
| FR-02 | Live satellite NDVI fetch for sample plots | MUST | Build |
| FR-03 | Live weather data fetch | MUST | Build |
| FR-04 | Live soil data fetch | MUST | Build |
| FR-05 | Disease diagnosis from photo upload | MUST | Build |
| FR-06 | Chat advisor in English + Hindi (minimum) | MUST | Build |
| FR-07 | Voice input/output in Hindi (minimum) | MUST | Build |
| FR-08 | WhatsApp bot (sandbox) end-to-end | MUST | Build |
| FR-09 | Dashboard with real data | MUST | Build |
| FR-10 | BRICS API (2–3 documented endpoints) | PARTIAL | Build stub |
| FR-11 | Regenerative practice recommendations | PARTIAL | Rule-based |
| FR-12 | Marathi language support | SHOULD | Build if time |
| FR-13 | Second non-Indian language demo | SHOULD | Build if time |

---

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Response Time (Chat) | < 5 seconds end-to-end |
| Disease Diagnosis Latency | < 10 seconds for photo upload + result |
| Availability (Demo period) | 99% — hosted on Vercel + Railway/Render |
| Supported Devices | Web (desktop + mobile browser), WhatsApp |
| Data Privacy | No PII stored without consent; farm data anonymised in BRICS API |
| Language Support | UI labels in user's chosen language |

---

## 6. Out of Scope (Prototype)

- Full multi-country live government API integrations (Brazil, Russia, China, SA)
- Verified production WhatsApp Business number
- Offline/edge disease-detection on-device
- Seed-genetics / traditional knowledge module
- Real-time IoT sensor integration
- Payment / credit / insurance modules

---

## 7. Success Criteria for Demo

- [ ] Judge can register a farm plot on a real map
- [ ] Dashboard shows real NDVI, soil, and weather data (not hardcoded)
- [ ] Photo upload returns a real disease diagnosis
- [ ] Chat advisor answers a question in Hindi with real plot context
- [ ] WhatsApp sandbox bot completes a full advisory flow
- [ ] BRICS API endpoint returns a documented JSON response
