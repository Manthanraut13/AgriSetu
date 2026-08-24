# AgriSetu — Scale Document (Prototype → Full Application)

This document describes the plan for scaling AgriSetu from a hackathon prototype into a production-grade BRICS digital public good. Use this in the submission pitch to demonstrate long-term vision.

---

## 1. Prototype vs Production Comparison

| Dimension | Prototype (24 Aug 2026) | Production Target |
|-----------|------------------------|-------------------|
| **Users** | 2–3 sample plots (demo) | 100,000+ farmers across BRICS |
| **Countries** | India (+ 1 BRICS demo plot) | All BRICS+ nations |
| **Languages** | Hindi, Marathi + 1 PoC | 20+ languages (all BRICS official languages) |
| **WhatsApp** | Sandbox number | Verified WhatsApp Business API |
| **Hosting** | Vercel + Railway (free tier) | Multi-region cloud (AWS/GCP with India region) |
| **Database** | Supabase free tier (500 MB) | Managed Postgres cluster, multi-region read replicas |
| **Disease classes** | 5–10 (prototype demo) | 50+ classes across all BRICS-relevant crops |
| **Satellite data** | On-demand per plot | Batch-processed, pre-cached per grid cell |
| **Advisory latency** | < 10 seconds acceptable | < 2 seconds (P95) |
| **Uptime** | Best effort | 99.9% SLA |

---

## 2. Infrastructure Scaling Path

### Phase 1 — Prototype (Current)
```
Vercel (Frontend) → Railway (FastAPI) → Supabase (DB)
```

### Phase 2 — Early Production (0–6 months post-hackathon)
- Move backend to AWS ECS (Fargate) or GCP Cloud Run — container-based, auto-scales
- Upgrade Supabase to Pro tier or migrate to RDS Postgres with PostGIS
- Add Redis (Upstash or ElastiCache) for caching satellite/weather API responses
- Separate ML inference into a dedicated service (FastAPI worker + GPU instance)
- Add CDN (Cloudflare) in front of frontend assets and API

### Phase 3 — Scale to 100k+ farmers (6–18 months)
- Multi-region deployment: India (primary), South Africa, Brazil nodes
- Database: Multi-region read replicas + pgBouncer for connection pooling
- Satellite data: Pre-compute NDVI/NDMI for all registered plot regions nightly (batch job on Airflow/Prefect)
- Disease model: Deploy to AWS SageMaker or Vertex AI for managed GPU inference at scale
- LLM: Fine-tuned domain-specific model (or fine-tuned open-source, e.g. Llama-based) to reduce API costs at scale
- Message queue: SQS/PubSub for WhatsApp webhook processing (handles burst traffic)

### Phase 4 — BRICS Digital Public Good (18–36 months)
- Federated deployment: each BRICS country can run their own node with shared data schema
- Data sovereignty: soil + farmer data stays in-country; only anonymised aggregates cross borders
- Open-source release: full codebase published under Apache 2.0 / MIT for partner countries to self-host
- Government API integrations: live connections to Brazil MAPA, ICAR India, South Africa DAFF, China MARA

---

## 3. Data Scaling

### Satellite Data (Current: on-demand → Future: batch-cached)
```
Current: Per-request Sentinel Hub API call for each plot query
↓
Scale Step 1: Nightly batch job — pull NDVI for all registered plots, store in Supabase
Scale Step 2: Spatial pre-compute — tile all of India at 250m grid, cache NDVI/NDMI
Scale Step 3: Google Earth Engine batch export for full BRICS country coverage
Scale Step 4: Real-time satellite feeds via Planet Labs or commercial providers
```

### Soil Data (Current: SoilGrids API → Future: own dataset)
```
Current: On-demand SoilGrids REST API per plot
↓
Scale Step 1: Cache SoilGrids data in Supabase per 250m grid cell
Scale Step 2: Integrate India Soil Health Card API (when available)
Scale Step 3: Partner with ICAR / state agriculture departments for lab-verified soil data
Scale Step 4: Crowdsourced soil testing data from FPO partners → enriches the dataset
```

### Disease Model (Current: 10 classes → Future: 50+ classes)
```
Current: PlantVillage + PlantDoc, 10 demo classes
↓
Scale Step 1: Full 38-class PlantVillage fine-tune
Scale Step 2: Add BRICS-specific crops: sugarcane (Brazil), wheat (Russia/India), rice (China)
Scale Step 3: In-field data collection via partner FPOs → continuous learning pipeline
Scale Step 4: Edge deployment — quantised model (TFLite / ONNX) runs on-device, offline
```

---

## 4. Language Scaling

| Phase | Languages | Method |
|-------|-----------|--------|
| Prototype | Hindi, Marathi, English, 1 PoC (Portuguese) | Bhashini + Whisper + Claude |
| Phase 2 | All 22 scheduled Indian languages | Full Bhashini integration |
| Phase 3 | Portuguese (Brazil), Russian, Mandarin, Swahili (South Africa) | Whisper + multilingual TTS + LLM translation |
| Phase 4 | All BRICS+ official languages + regional dialects | Dedicated multilingual model or fine-tuned Bhashini-equivalent per country |

---

## 5. WhatsApp & Channel Scaling

| Phase | Channel | Status |
|-------|---------|--------|
| Prototype | WhatsApp sandbox (Twilio) | Demo only |
| Phase 2 | Verified WhatsApp Business API (single number) | Apply for WhatsApp Business verification post-hackathon |
| Phase 3 | Multi-number (per country), IVR phone line, SMS fallback | BRICS partner deployments |
| Phase 4 | Native mobile app (React Native, offline-capable) + USSD for feature phones | Last-mile access with no-smartphone fallback |

---

## 6. BRICS Interoperability Scaling

### Prototype: Stub API (2–3 endpoints, one-country data)
### Phase 2: Working API (full Agri Data Model schema, India data)
### Phase 3: Multi-country data federation
```
Each country runs their own AgriSetu node
↓
Shared REST API schema (BRICS Agri Data Model v1.0 spec)
↓
Country nodes expose anonymised aggregate data to the shared BRICS registry
↓
Any partner institution can query: crop advisories by country/region, disease prevalence, soil health trends
```
### Phase 4: Open standard
- Publish BRICS Agri Data Model as an open specification (like HL7 FHIR for health)
- Other agri-tech platforms can implement the standard and interoperate
- AgriSetu becomes the reference implementation

---

## 7. ML Model Roadmap

| Model | Prototype | 6 months | 18 months |
|-------|-----------|---------|-----------|
| Disease CNN | MobileNetV3, 10 classes | EfficientNet-B4, 38 classes | Custom BRICS crop model, 50+ classes, on-device |
| Crop Recommender | XGBoost, tabular features | XGBoost + satellite feature engineering | Neural recommender with temporal soil/weather sequences |
| LLM Advisor | Claude API, generic RAG | Claude API, domain fine-tuned retrieval | Fine-tuned open-source model (cost-effective at scale) |
| Yield Forecasting | Not in prototype | Rule-based yield estimate | LSTM/Transformer on historical yield + weather + NDVI |
| Market Price | Not in prototype | Agmarknet integration (India) | Multi-country commodity price prediction |

---

## 8. Business & Sustainability Model (Post-Hackathon)

| Revenue Stream | Description |
|---------------|-------------|
| **Government contracts** | State/national agriculture departments pay for FPO dashboard licences and farmer advisory services |
| **NGO partnerships** | CGIAR, FAO, BRICS AgriN fund deployment in specific regions |
| **FPO SaaS** | Farmer producer organisations pay subscription for the analytical dashboard |
| **API licensing** | Commercial agri-tech companies pay to access the BRICS Agri Data Model API |
| **Premium advisory** | AI-powered premium crop insurance + credit recommendations (B2B with insurers/banks) |

**Farmer access remains free — always.** Revenue comes from institutional layers, not from farmers.

---

## 9. Open Source & Digital Public Good Strategy

Post-hackathon actions to make AgriSetu a recognised Digital Public Good:
1. Submit to [Digital Public Goods Alliance (DPGA)](https://digitalpublicgoods.net) registry
2. Publish under Apache 2.0 license on GitHub
3. Partner with BRICS Network on Digital Agriculture (IIT Delhi) for co-development
4. Apply for ICAR / NABARD tech grant for Indian deployment scale-up
5. Engage with Bhashini team for deeper language integration partnership

---

## 10. Risk & Mitigation (Scale)

| Risk | Mitigation |
|------|-----------|
| Satellite API rate limits at scale | Pre-cache nightly; use Google Earth Engine for bulk export |
| LLM API cost at 100k users | Fine-tune smaller open-source model for common queries; Claude for complex only |
| WhatsApp policy changes | Maintain SMS + IVR fallback channels |
| Data sovereignty concerns in BRICS | Federated architecture — data stays in-country |
| Disease model accuracy in new geographies | Continuous learning pipeline from in-field partner data |
| Government API instability | Cache all govt data with 24h TTL; graceful degradation |
