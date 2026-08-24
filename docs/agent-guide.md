# AgriSetu — Agent Instructions (Coding Agent Guide)

You are the coding agent building the AgriSetu prototype. Read this document fully before writing a single line of code.

---

## 1. Your Mission

Build a working, demo-ready prototype of AgriSetu by 23 August 2026. Every feature you build must be clickable and testable by a judge. A working narrow prototype beats a described-but-broken broad one.

---

## 2. Project Context

- **Backend:** FastAPI (Python 3.11+), fully hand-coded — no workflow tools, no no-code platforms
- **Frontend:** React 18 + Tailwind CSS, deployed on Vercel
- **Database:** Supabase (Postgres + PostGIS)
- **ML:** PyTorch (disease CNN) + XGBoost (crop recommender) + Claude API (LLM advisor)
- **Read the full documents:** PRD.md, Architecture.md, AppFlow.md, Design.md, Techstack.md — these are your source of truth

---

## 3. Absolute Rules (Never Violate These)

### Code
- **Write real code only.** No placeholder comments like `# TODO: add real logic here` in production-path code.
- **No hardcoded sample data in demo flows.** All numbers shown to a user must come from a real API call or real DB query — never `ndvi = 0.72` as a constant.
- **No mock API responses.** Call the real APIs. If an API key is missing, throw a clear `ConfigurationError` with a message stating which key is needed.
- **Every endpoint must be tested before marking complete.** Use `curl` or the FastAPI `/docs` Swagger UI to verify each route returns the correct shape.
- **Use Pydantic models for all request/response schemas.** No raw `dict` passing between layers.
- **Async-first.** All FastAPI route handlers must be `async def`. All DB calls and external HTTP calls must use `await`.
- **Never commit secrets.** Use environment variables via `python-dotenv` for local and platform env vars for deployed. `.env` is in `.gitignore`.

### Architecture
- **One Advisory Gateway.** All farmer touchpoints (web chat, WhatsApp, voice) must route through the same FastAPI functions — no duplicate advisory logic per channel.
- **One database.** Supabase only. Do not introduce a second DB or local SQLite.
- **PostGIS for geometry.** Farm boundaries are stored as `GEOMETRY(Polygon, 4326)` — never as a JSON lat/lng array.
- **Vector store in pgvector.** RAG embeddings go in Supabase with the `pgvector` extension — not a separate Pinecone/Weaviate instance.

### ML Models
- **Disease model:** Fine-tune from pretrained weights (MobileNetV3 or EfficientNet-Lite). Do not train from scratch.
- **Crop model:** XGBoost only. Do not introduce PyTorch for this — it does not need a GPU and must be lightweight.
- **LLM:** Use Claude API (`claude-sonnet-4-6`). Do not attempt to run a local LLM — the prototype deadline does not allow it.
- **Model weights:** Save to Supabase Storage or HuggingFace Hub. Load into memory at FastAPI startup. Do not re-download per request.

---

## 4. Do's

### General
- ✅ Read the relevant document before starting each module
- ✅ Build in the exact order specified in `Implementation.md`
- ✅ Test each feature end-to-end before moving to the next
- ✅ Commit after each working feature (not after each file)
- ✅ Write clear docstrings on all route handlers and service functions
- ✅ Log every external API call with `logger.info(f"Calling Sentinel Hub for plot {plot_id}")`
- ✅ Return meaningful error messages in API responses `{ "error": "Bhashini API timeout", "fallback_used": true }`
- ✅ Use environment variables for all API keys, URLs, and credentials
- ✅ Keep the frontend and backend in separate folders in the same repo

### FastAPI Specific
- ✅ Use `APIRouter` for each module (onboarding, advisory, disease, chat, voice, whatsapp, dashboard, brics)
- ✅ Mount all routers in `main.py` with a consistent prefix (`/api/v1/...`)
- ✅ Enable CORS in `main.py` for the Vercel frontend URL
- ✅ Use `lifespan` context manager to load ML models once at startup
- ✅ Use `BackgroundTasks` for fire-and-forget operations (e.g. saving disease reports async)
- ✅ Return `HTTPException` with meaningful status codes (404 if plot not found, 422 if invalid input, 503 if external API down)

### React Specific
- ✅ Use `react-i18next` for all user-visible strings — never hardcode English text in JSX
- ✅ Put all API calls in `src/api/agrisetu.js` — never fetch directly inside components
- ✅ Use environment variable `VITE_BACKEND_URL` for the API base URL
- ✅ Handle loading and error states for every API call (show spinner, show error message)
- ✅ Use Tailwind classes only — no inline styles, no separate CSS files
- ✅ Make the farmer view mobile-first (test at 375px width)

### Database
- ✅ Run all schema changes as SQL migrations (save them in `db/migrations/`)
- ✅ Use UUIDs as primary keys (Supabase default)
- ✅ Index `plot_id` on all child tables
- ✅ Use Row Level Security (RLS) in Supabase — farmers can only read their own plots

---

## 5. Don'ts

### Code Quality
- ❌ Do not write `print()` for debugging — use Python's `logging` module
- ❌ Do not use `*` imports (`from module import *`)
- ❌ Do not catch bare `Exception` — catch specific exceptions and log them
- ❌ Do not return raw Supabase error responses to the client — wrap them
- ❌ Do not use synchronous `requests` library in FastAPI routes — use `httpx` async
- ❌ Do not load ML models inside route handlers — load once at startup via `lifespan`

### Architecture
- ❌ Do not create separate advisory logic for WhatsApp vs web — one function, multiple callers
- ❌ Do not store API keys in code, comments, or git history
- ❌ Do not use localStorage for sensitive data in the frontend
- ❌ Do not add features not listed in PRD.md Section 5 or 6 — scope creep kills hackathon projects
- ❌ Do not introduce any no-code tools (n8n, Zapier, Make) — the entire backend must be hand-coded FastAPI

### ML
- ❌ Do not run disease model inference synchronously on the main thread for images > 2MB — offload to a background task or resize first
- ❌ Do not expose raw model logits to the frontend — always return `{ disease_name, confidence_pct, treatment }`
- ❌ Do not use OpenAI API — use Anthropic Claude API

### Demo Readiness
- ❌ Do not demo with mock/hardcoded chart data — if real data isn't flowing, debug the pipeline
- ❌ Do not claim live WhatsApp Business number — always say "sandbox" in the UI and submission
- ❌ Do not leave broken routes in the deployed app — remove or return `501 Not Implemented` with a clear message

---

## 6. Code Style

- **Python:** Follow PEP 8. Use `ruff` for linting. Max line length 100.
- **JavaScript/JSX:** Use ESLint + Prettier. Single quotes. No semicolons.
- **File naming:** Snake_case for Python files, PascalCase for React components, kebab-case for JSON/config files.
- **Function naming:** Descriptive verbs — `fetch_ndvi_for_plot()`, `run_disease_inference()`, `translate_to_language()`
- **Constants:** UPPER_SNAKE_CASE in a dedicated `constants.py` file

---

## 7. Git Workflow

```
main          ← production-ready; deployed to Vercel/Railway
dev           ← integration branch; merge feature branches here
feature/xxx   ← one branch per feature (e.g. feature/disease-cnn, feature/chat-rag)
```

- Commit message format: `feat: add disease CNN endpoint` / `fix: sentinel hub token refresh` / `chore: add env var validation`
- Never force-push to `main`
- Merge `dev` → `main` only after end-to-end test passes

---

## 8. Priority Order (If Time Runs Out)

If you must cut scope, cut in this order (last to first):
1. ~~BRICS Interoperability API~~ (stub only)
2. ~~Voice pipeline for non-Indian languages~~ (show Whisper PoC only)
3. ~~FPO dashboard BRICS aggregate panel~~ (show placeholder)
4. ~~Regenerative practice model~~ (use rule-based only)
5. **Never cut:** Disease CNN, Chat advisor (Hindi), Farmer dashboard with real data, WhatsApp sandbox bot, Farm onboarding with map

---

## 9. Definition of "Done" for Each Feature

A feature is done when:
- [ ] The FastAPI endpoint returns correct data (verified in Swagger UI)
- [ ] The frontend displays the data correctly (tested in browser at 375px and 1280px)
- [ ] The WhatsApp path (if applicable) returns the same data
- [ ] Error states are handled (invalid input, API failure)
- [ ] The feature is committed and deployed to staging (Railway/Vercel)
- [ ] It is checked off in `Checklist.md`

---

## 10. When You're Stuck

1. Check the relevant document first (Architecture.md, AppFlow.md)
2. Check the Swagger UI at `/docs` for API shape mismatches
3. Check Supabase logs for DB errors
4. Check Railway/Render logs for backend errors
5. If an external API is failing: check API key, check rate limits, implement the fallback described in AppFlow.md
6. Do not invent new architecture — stay within the defined stack
