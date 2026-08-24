# AgriSetu Deployment Guide

This document covers the complete deployment process for the AgriSetu prototype, from database setup through backend, frontend, and post-deployment verification.

---

## 1. Prerequisites

Before deploying, ensure you have the following accounts and credentials:

| Service | Purpose | Free Tier |
|---|---|---|
| Supabase | Database, auth, storage | 500MB, 50,000 monthly active users |
| Vercel | Frontend hosting | Unlimited static sites |
| Railway or Render | Backend hosting | Railway: $5 credit/month; Render: 750 hrs/month |
| Sentinel Hub | Satellite NDVI/NDMI | Free dev tier (10,000 processing units/month) |
| OpenWeatherMap | Weather data | 1,000 API calls/day |
| Google Gemini | LLM and Vision API | Free tier with rate limits |
| Twilio | WhatsApp sandbox, OTP SMS | Trial account with verified numbers |

See `docs/prerequisites.md` for detailed account setup instructions.

---

## 2. Database Setup (Supabase)

### 2.1 Create Project

1. Sign in to [supabase.com](https://supabase.com)
2. Create a new project in the **Asia South (Mumbai)** region
3. Note the project URL and API keys from Settings > API:
   - `Project URL` (format: `https://xxxxx.supabase.co`)
   - `anon` (public) key
   - `service_role` (secret) key

### 2.2 Enable Extensions

In the Supabase SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2.3 Run Migrations

Execute the migration files in `db/migrations/` in order (001 through 007) via the Supabase SQL Editor. Each file is self-contained with `IF NOT EXISTS` guards.

Key tables created:
- `farmers` -- farmer profiles with phone, language preference, and Supabase auth user_id
- `farm_plots` -- PostGIS geometry column for farm boundaries
- `soil_data`, `ndvi_snapshots`, `weather_cache` -- time-series telemetry per plot
- `advisories`, `disease_reports` -- generated outputs
- `knowledge_base` -- pgvector embeddings for RAG

### 2.4 Create Storage Bucket

In the Supabase Dashboard, go to Storage and create a bucket named `disease-images` (private).

### 2.5 Configure Phone Authentication

In the Supabase Dashboard, go to Authentication > Providers > Phone:
1. Enable the Phone provider
2. Select **Twilio Verify** as the SMS provider
3. Enter your Twilio Account SID and Auth Token
4. Enter your Twilio Message Service SID (optional but recommended)
5. Save

---

## 3. Backend Deployment (Railway)

### 3.1 Prepare the Application

The backend is a standard FastAPI application. Railway deploys via a `Dockerfile` or auto-detected Python buildpack.

Create `agrisetu-backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3.2 Deploy to Railway

1. Push your repository to GitHub
2. Sign in to [railway.app](https://railway.app) with your GitHub account
3. Click **New Project > Deploy from GitHub Repo**
4. Select the AgriSetu repository
5. Railway will detect the Python project and begin building
6. In the project settings, go to **Variables** and add all environment variables from `agrisetu-backend/.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `SENTINEL_HUB_CLIENT_ID`
   - `SENTINEL_HUB_CLIENT_SECRET`
   - `SENTINEL_HUB_INSTANCE_ID`
   - `OPENWEATHER_API_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_BACKUP_API_KEY` (optional)
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `TWILIO_WHATSAPP_TO`
   - `ENVIRONMENT` = `production`
   - `BACKEND_URL` = your Railway service URL (e.g., `https://agrisetu-backend.up.railway.app`)
   - `FRONTEND_URL` = your Vercel deployment URL
   - `SECRET_KEY` = a random 32+ character string

7. Railway will rebuild and deploy. Note the generated URL (e.g., `https://agrisetu-backend.up.railway.app`).

### 3.3 Alternative: Deploy to Render

1. Sign in to [render.com](https://render.com)
2. Create a new **Web Service** connected to your GitHub repository
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add the same environment variables as listed above
6. Deploy

---

## 4. Frontend Deployment (Vercel)

### 4.1 Configure Environment

Create `agrisetu-frontend/.env.production`:

```
VITE_BACKEND_URL=https://agrisetu-backend.up.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4.2 Deploy to Vercel

1. Sign in to [vercel.com](https://vercel.com) with your GitHub account
2. Click **Add New > Project**
3. Import the AgriSetu repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `agrisetu-frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add environment variables:
   - `VITE_BACKEND_URL` = your Railway/Render backend URL
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Deploy**

Vercel provides a unique URL (e.g., `https://agrisetu.vercel.app`). Custom domains can be added in the project settings.

### 4.3 Update Backend CORS

After deployment, update the backend's `FRONTEND_URL` environment variable to match your Vercel URL. This ensures CORS allows requests from the deployed frontend.

---

## 5. Knowledge Base Setup

The RAG knowledge base must be populated after deployment. This can be done via a one-time script or the FastAPI shell.

From a machine with the backend environment configured:

```python
import os
os.chdir("agrisetu-backend")

from services.rag import embed_and_store_documents
embed_and_store_documents()
```

This reads all 21 `.txt` files from `data/agronomy_kb/`, generates embeddings using the sentence-transformers model, and stores them in the `knowledge_base` table. The operation takes approximately 30-60 seconds.

---

## 6. Twilio WhatsApp Sandbox Configuration

### 6.1 Sandbox Setup

1. In the [Twilio Console](https://console.twilio.com), go to Messaging > Try it out > Send a WhatsApp message
2. Note the sandbox number (e.g., `+14155238886`)
3. Send a WhatsApp message "join" to this number from your verified phone

### 6.2 Configure Webhook

In Twilio Console > Messaging > Settings > WhatsApp sandbox configuration:
- **When a message comes in:** `POST` to `https://agrisetu-backend.up.railway.app/api/v1/whatsapp/webhook`
- **Status callback URL:** Leave empty (not required for prototype)

---

## 7. Post-Deployment Verification

After deployment, verify each component by running these checks:

### 7.1 Backend Health

```bash
curl https://agrisetu-backend.up.railway.app/api/v1/health
```

Expected response:
```json
{"status": "ok", "service": "AgriSetu Backend", "version": "1.0.0", "environment": "production"}
```

### 7.2 Frontend

Open your Vercel URL in a browser. The landing page should load with the language switcher and navigation buttons.

### 7.3 Authentication Flow

1. Click "Get Started" on the landing page
2. Enter a phone number and click "Send OTP"
3. Check that the OTP SMS arrives (Twilio trial accounts only deliver to verified numbers)
4. Enter the OTP and verify login redirects to the farmer dashboard

### 7.4 Plot Registration

1. Navigate to Profile from the dashboard navbar
2. Click "Register New Plot"
3. Click on the map to set a location (or use a known coordinate)
4. Enter district, state, and current crop
5. Submit and verify that NDVI, soil, and weather data populate

### 7.5 Disease Diagnosis

1. From the farmer dashboard, click "Diagnose Disease"
2. Upload a photo of a plant leaf
3. Verify the response includes disease name, confidence, severity, treatment, and organic remedy

### 7.6 Chat Advisor

1. Open the floating chat widget (bottom-right button)
2. Type or speak a farming question
3. Verify a response is generated in the selected language

### 7.7 Advisory

1. Click "Get Crop Advisory" on the farmer dashboard
2. Verify the response includes crop recommendations, sowing windows, irrigation schedules, and regenerative practices

### 7.8 BRICS API

```bash
curl https://agrisetu-backend.up.railway.app/api/v1/brics/aggregate?country=IN
```

Verify the response contains the BRICS schema with plot counts and aggregate statistics.

---

## 8. Troubleshooting

### Backend fails to start
- Check Railway/Render logs for missing environment variables
- Verify all required variables are set (see Section 3.2)
- Ensure `SUPABASE_URL` does not contain a trailing slash

### OTP not received
- Verify Twilio credentials in Supabase Dashboard > Authentication > Providers > Phone
- Check that the phone number is verified in Twilio Console (trial accounts)
- Review Supabase logs at Dashboard > Logs > Auth

### Disease prediction returns errors
- Verify `GEMINI_API_KEY` is valid and has quota remaining
- Check backend logs for Gemini API errors
- The system falls back to computer vision analysis when Gemini is unavailable

### Chat advisor returns empty responses
- Verify `GEMINI_API_KEY` is set
- Check that the knowledge base has been populated (Section 5)
- Review backend logs for RAG retrieval errors

### CORS errors in browser
- Ensure `FRONTEND_URL` on the backend matches your Vercel deployment URL exactly
- The URL must include `https://` and must not have a trailing slash

---

## 9. Environment Variable Reference

### Backend (.env)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (secret) |
| `SENTINEL_HUB_CLIENT_ID` | Yes | Sentinel Hub OAuth client ID |
| `SENTINEL_HUB_CLIENT_SECRET` | Yes | Sentinel Hub OAuth client secret |
| `SENTINEL_HUB_INSTANCE_ID` | Yes | Sentinel Hub processing instance ID |
| `OPENWEATHER_API_KEY` | Yes | OpenWeatherMap API key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_BACKUP_API_KEY` | No | Fallback Gemini key |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | Twilio sender phone number |
| `TWILIO_WHATSAPP_TO` | Yes | WhatsApp recipient (sandbox number) |
| `ENVIRONMENT` | No | `development` or `production` (default: development) |
| `BACKEND_URL` | No | Backend public URL (default: http://localhost:8000) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |
| `SECRET_KEY` | No | Application secret key (change in production) |

### Frontend (.env)

| Variable | Required | Description |
|---|---|---|
| `VITE_BACKEND_URL` | Yes | Backend API base URL |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |

---

## 10. Cost Estimate (Prototype)

| Service | Tier | Monthly Cost |
|---|---|---|
| Supabase | Free | $0 |
| Vercel | Hobby | $0 |
| Railway | Trial ($5 credit) | ~$0-5 |
| Sentinel Hub | Free dev | $0 |
| OpenWeatherMap | Free | $0 |
| Gemini API | Free tier | $0 |
| Twilio | Trial | $0 (SMS to verified numbers only) |
| **Total** | | **$0-5/month** |
