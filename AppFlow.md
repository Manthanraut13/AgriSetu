# App Flow Document
## AgriSetu — User Flows & Interaction Design
**Version:** 1.0 | **Build Window:** 17–23 Aug 2026

---

## 1. Flow Overview Map

```
AgriSetu Entry Points
├── Web App (React)
│   ├── F1: Farmer Onboarding Flow
│   ├── F2: Crop Advisory Flow
│   ├── F3: Disease Diagnosis Flow (photo upload)
│   ├── F4: Chat Advisor Flow (text)
│   ├── F5: Voice Advisor Flow (mic)
│   └── F6: Dashboard View Flow
├── WhatsApp Bot
│   └── F7: WhatsApp Conversation Flow
└── BRICS API (Partner Access)
    └── F8: API Access Flow
```

---

## 2. F1 — Farmer Onboarding Flow

```
[Landing Page]
    │
    ▼
[Select Language] ──── Hindi / Marathi / English / Portuguese (demo)
    │
    ▼
[Enter Name + Phone Number]
    │
    ▼
[Register Farm Plot]
    ├── Option A: Draw boundary on Leaflet/Mapbox map
    └── Option B: Type village/district/state → auto-pin
    │
    ▼
[Enter Crop Info] ──── Last crop grown, plot size (auto-calculated from boundary)
    │
    ▼
[System Auto-Fetches] (background, 5–10 sec loading indicator)
    ├── Satellite NDVI from Sentinel Hub
    ├── Soil data from SoilGrids or Soil Health Card
    └── Weather forecast from NASA POWER + OpenWeatherMap
    │
    ▼
[Farm Profile Screen]
    ├── Plot boundary on map
    ├── NDVI value + interpretation (green/yellow/red)
    ├── Current soil health summary
    └── [Go to Dashboard] / [Get Advisory] / [Diagnose Disease]
```

**Key UX Notes:**
- Entire flow accessible in chosen language
- Phone number = unique farmer ID (no email required)
- Show a spinner/progress bar during auto-fetch with reassuring message in farmer's language

---

## 3. F2 — Crop Advisory Flow

```
[Farmer Dashboard or Chat Widget]
    │
    ▼
[Tap "Get Crop Advisory" / Type "कौनसी फसल लगाऊं?"]
    │
    ▼
[Backend: Advisory Engine]
    ├── Reads: current soil N/P/K, pH, moisture from DB
    ├── Reads: weather forecast (temp, rainfall next 30 days)
    ├── Reads: NDVI trend for the plot
    └── Runs: XGBoost model → Top 3 crop recommendations
    │
    ▼
[Advisory Response Card]
    ├── Recommended Crop #1 (with confidence %)
    ├── Recommended Crop #2 (alternative)
    ├── Sowing Window: "Best sow between [date range]"
    ├── Irrigation: "Water every X days; next recommended: [date]"
    ├── Regenerative Practice: "Consider intercropping with [crop]"
    └── Reasoning: "Your soil has low Nitrogen — legumes will help"
    │
    ▼
[Farmer can ask follow-up via Chat] → F4: Chat Advisor Flow
```

---

## 4. F3 — Disease Diagnosis Flow (Photo Upload)

```
[Farmer sees a sick plant]
    │
    ▼
[Opens AgriSetu Web App or WhatsApp]
    │
    ▼
[Tap "Diagnose Disease" / Send Photo on WhatsApp]
    │
    ▼
[Photo Upload UI]
    ├── Capture from camera (mobile)
    └── Upload from gallery
    │
    ▼
[Backend: POST /disease/diagnose]
    ├── Validates image (JPEG/PNG, < 10MB)
    ├── Runs CNN inference (MobileNetV3)
    └── Returns top prediction + confidence
    │
    ▼
[Result Screen / WhatsApp Reply]
    ├── 🔴 Disease Name: "Tomato Late Blight"
    ├── Confidence: 87%
    ├── Severity: Moderate
    ├── Treatment: "Apply copper-based fungicide"
    ├── Organic Remedy: "Neem oil spray, remove affected leaves"
    └── [Ask follow-up in Chat] → F4
    │
    ▼
[Disease report saved to DB with plot_id + timestamp]
    └── Appears on FPO Dashboard heatmap
```

**Edge Cases:**
- Low confidence (< 60%): Show "Uncertain — please consult an agronomist" + offer to connect to human expert
- Non-plant image: Show "Please upload a clear photo of the affected leaf or plant"
- No connectivity: Queue the image locally (future roadmap)

---

## 5. F4 — Chat Advisor Flow (Text)

```
[Chat Widget (Web) or WhatsApp Text]
    │
    ▼
[Farmer types message in their language]
    e.g., "मेरी मिट्टी में नाइट्रोजन कम है, क्या करूं?"
          ("My soil has low nitrogen, what should I do?")
    │
    ▼
[Backend: POST /gateway/message { type: "text", language: "hi" }]
    │
    ▼
[LLM + RAG Pipeline]
    ├── Detect language (auto)
    ├── Translate to English if needed (Bhashini)
    ├── Retrieve: farmer's current plot data (soil, NDVI, weather)
    ├── Retrieve: relevant agronomy knowledge chunks (pgvector similarity search)
    ├── Build prompt: "[Plot Context] + [Knowledge] + [Farmer Question]"
    ├── Call Claude/GPT API
    └── Get response in English
    │
    ▼
[Translate response back to farmer's language (Bhashini)]
    │
    ▼
[Display response in chat]
    ├── Answer in Hindi/Marathi/etc.
    ├── Related advisory card (if applicable)
    └── Option: "Hear this as voice" → F5
```

---

## 6. F5 — Voice Advisor Flow

```
[Farmer taps microphone icon in web app or sends voice note on WhatsApp]
    │
    ▼
[Record audio OR receive voice note bytes]
    │
    ▼
[Backend: POST /gateway/message { type: "voice", language: "hi" }]
    │
    ▼
[ASR - Speech to Text]
    ├── Indian languages → Bhashini ASR API
    └── Other languages → OpenAI Whisper
    │
    ▼
[Text extracted]  →  Same path as F4 Chat Advisor Flow
    │
    ▼
[Text response generated]
    │
    ▼
[TTS - Text to Speech]
    ├── Indian languages → Bhashini TTS API
    └── Other languages → Coqui TTS / Azure Speech
    │
    ▼
[Play audio response to farmer]
    └── Also display text (accessibility fallback)
```

---

## 7. F6 — Dashboard Views

### 7.1 Farmer View (Simple)
```
[Farmer Dashboard]
├── 🌱 Crop Status: [GREEN - Healthy / YELLOW - Watch / RED - Alert]
├── 💧 Water Today?: [YES — irrigate / NO — skip]
├── 🌦 Weather This Week: [risk summary in 1 line]
├── 🐛 Last Disease Alert: [None / "Late Blight detected 2 days ago"]
├── [Get Advisory Button]
├── [Diagnose Disease Button]
└── [Chat with Advisor Button]
```

### 7.2 FPO / Agronomist View (Analytical)
```
[FPO Dashboard]
├── Map Panel
│   ├── All registered plots (coloured by NDVI health)
│   ├── Toggle: NDVI overlay / Soil moisture overlay
│   └── Click any plot → plot detail popup
├── Disease Heatmap
│   └── County/district level colour density of disease reports
├── Regenerative Practice Adoption
│   └── Bar chart: % of farmers using intercropping / cover crops / reduced tillage
├── BRICS Partner Panel
│   ├── Total plots registered (India / other BRICS countries)
│   ├── Advisory requests in last 7 days
│   └── [Download Aggregate Data JSON] → triggers BRICS API GET /v1/plots/aggregate
└── Alerts Panel
    └── Farms needing attention (low NDVI + no recent advisory)
```

---

## 8. F7 — WhatsApp Conversation Flow

```
[Farmer sends first WhatsApp message to sandbox number]
    │
    ▼
BOT: "Welcome to AgriSetu! 🌾
      Reply with:
      1 → Get crop advisory
      2 → Diagnose a plant disease (send a photo)
      3 → Ask the farming advisor
      4 → View my farm status
      Or just type your question in your language!"
    │
    ├── Farmer sends "1" or "फसल सलाह"
    │       ▼ → Fetch advisory for farmer's registered plot → Send advisory card
    │
    ├── Farmer sends photo
    │       ▼ → Disease Diagnosis Flow → Send diagnosis result text
    │
    ├── Farmer sends voice note
    │       ▼ → Voice Pipeline → Send text + (optionally) voice reply
    │
    └── Farmer types any question
            ▼ → LLM + RAG Chat Flow → Send answer in farmer's language

[Session context stored for multi-turn conversation — up to 10 turns]
```

---

## 9. F8 — BRICS API Access Flow

```
[Partner Institution / Researcher]
    │
    ▼
[API Documentation Page (auto-generated by FastAPI /docs)]
    │
    ▼
[Request API Key] → email-based or simple token for prototype
    │
    ▼
[API Call]
    ├── GET /v1/advisory/{plot_id}
    │   └── Returns full advisory JSON in Agri Data Model schema
    │
    ├── POST /v1/disease-report
    │   └── Submit a disease detection from partner country
    │
    └── GET /v1/plots/aggregate?country=IN
        └── Returns anonymised aggregate stats
    │
    ▼
[Response in Agri Data Model JSON Schema]
    └── Partner institution can ingest into their own systems
```

---

## 10. Error & Edge Case Flows

| Scenario | Handling |
|---|---|
| No farm registered | Prompt onboarding before any advisory request |
| Satellite data unavailable for location | Fall back to SoilGrids global data; show "using global soil data" label |
| LLM API timeout | Return cached last advisory + "Live advisor unavailable, showing last update" |
| Disease CNN low confidence | Return "Uncertain — consult agronomist" with option to escalate |
| WhatsApp message not understood | BOT: "I didn't understand. Try typing your question or send a leaf photo." |
| Network error on data fetch | Retry 3 times with exponential backoff; cache last successful fetch in DB |
| Language not supported | Default to English; log for language expansion roadmap |
