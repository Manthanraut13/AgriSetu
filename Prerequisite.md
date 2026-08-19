# AgriSetu — Prerequisites & Setup Guide

Complete every item in this document **before writing any application code**. Incomplete setup causes random failures mid-build that waste hours.

---

## 1. Accounts to Create (Do This First)

| Service | URL | Action | Notes |
|---------|-----|--------|-------|
| GitHub | github.com | Create repo `agrisetu` | Private or public; set up `.gitignore` (Python + Node) |
| Supabase | supabase.com | Create project `agrisetu` | Choose region closest to India (Asia South); note Project URL and keys |
| Vercel | vercel.com | Connect GitHub account | Auto-deploy from `main` branch |
| Railway **or** Render | railway.app **or** render.com | Create account | For FastAPI backend hosting |
| Sentinel Hub | sentinel-hub.com | Sign up for free tier | Copernicus browser account → create OAuth app |
| OpenWeatherMap | openweathermap.org | Sign up → generate API key | Free tier, no credit card |
| Anthropic | console.anthropic.com | Get API key | Requires billing setup; use pay-as-you-go for prototype |
| Bhashini | bhashini.gov.in / bhashini.ai | Developer registration | Govt of India; free for developers; may take 1–2 days for approval — **do this first** |
| Twilio | twilio.com | Create account | Get WhatsApp Sandbox number from console → Messaging → Try WhatsApp |
| Google Colab | colab.research.google.com | Sign in with Google | For CNN training (free T4 GPU) |
| Kaggle | kaggle.com | Create account | For dataset download; enable GPU in notebook settings |

---

## 2. API Keys to Collect

Create a `.env` file at the root of your backend project. Fill in each value as you collect them.

```env
# ── SUPABASE ──────────────────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...      # Only used server-side, never in frontend

# ── SENTINEL HUB ──────────────────────────────────────────
SENTINEL_HUB_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SENTINEL_HUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENTINEL_HUB_INSTANCE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # From Configuration Utility

# ── OPENWEATHERMAP ────────────────────────────────────────
OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── ANTHROPIC ─────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── BHASHINI ──────────────────────────────────────────────
BHASHINI_USER_ID=xxxxxxxx
BHASHINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BHASHINI_PIPELINE_ID=64392f96daac500b55c543cd   # ASR + Translation + TTS pipeline

# ── TWILIO (WhatsApp Sandbox) ─────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886     # Twilio sandbox number

# ── APP CONFIG ────────────────────────────────────────────
ENVIRONMENT=development
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SECRET_KEY=generate-a-random-64-char-string-here
```

**Frontend `.env` file (`agrisetu-frontend/.env`):**
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 3. Sentinel Hub Setup (Detailed)

1. Sign up at sentinel-hub.com → create a free account
2. Go to **Dashboard → User Settings → OAuth Clients** → create new OAuth client
3. Note down `Client ID` and `Client Secret`
4. Go to **Configuration Utility** → create a new configuration → note the `Instance ID`
5. Test with this curl:
   ```bash
   curl -X POST https://services.sentinel-hub.com/oauth/token \
     -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_SECRET"
   ```
6. You should receive an access token. If not, recheck your OAuth client settings.

**NDVI request body (save as `test_ndvi.json`):**
```json
{
  "input": {
    "bounds": {
      "bbox": [73.7, 19.9, 73.9, 20.1],
      "properties": { "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84" }
    },
    "data": [{ "type": "sentinel-2-l2a", "dataFilter": { "timeRange": {
      "from": "2026-07-01T00:00:00Z", "to": "2026-08-01T00:00:00Z"
    }}}]
  },
  "evalscript": "//VERSION=3\nfunction setup(){return{input:['B04','B08'],output:{bands:1}}}\nfunction evaluatePixel(s){return[(s.B08-s.B04)/(s.B08+s.B04)]}",
  "output": { "width": 10, "height": 10, "responses": [{ "identifier": "default", "format": { "type": "image/tiff" } }] }
}
```

---

## 4. Bhashini API Setup (Detailed)

Bhashini sometimes has slow approval. Start this on **Day 0 (before Day 1)**.

1. Go to bhashini.gov.in → click "Developers" → register
2. After approval, get `userId` and `ulcaApiKey` from your dashboard
3. Test ASR (Hindi):
   ```python
   import requests, base64
   audio = open("test_hindi.mp3", "rb").read()
   payload = {
       "pipelineTasks": [{"taskType": "asr", "config": {"language": {"sourceLanguage": "hi"}}}],
       "inputData": {"audio": [{"audioContent": base64.b64encode(audio).decode()}]}
   }
   headers = {"userID": "YOUR_USER_ID", "ulcaApiKey": "YOUR_KEY",
              "Content-Type": "application/json"}
   r = requests.post("https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
                     json=payload, headers=headers)
   print(r.json())
   ```
4. **Fallback plan:** If Bhashini approval takes too long, use `openai-whisper` (local inference) for Hindi as a fallback for the prototype.

---

## 5. Supabase Setup (Detailed)

1. Create project → choose **Asia South (Mumbai)** region
2. Go to **SQL Editor** → run the full schema from `Architecture.md` Section 5
3. Enable the **pgvector** extension: SQL Editor → `CREATE EXTENSION IF NOT EXISTS vector;`
4. Enable the **PostGIS** extension: SQL Editor → `CREATE EXTENSION IF NOT EXISTS postgis;`
5. Set up **Row Level Security (RLS):**
   ```sql
   ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Farmers can only see their own plots"
   ON plots FOR ALL
   USING (farmer_id = auth.uid());
   ```
6. Create a **Storage bucket** named `disease-images` (public read, authenticated write)
7. Get keys from: Project Settings → API → `URL`, `anon public`, `service_role`

---

## 6. Datasets to Download (Before Day 2)

Download all datasets before Day 2 to avoid bandwidth issues during build.

| Dataset | Source | Download Link | Size | Use |
|---------|--------|--------------|------|-----|
| PlantVillage | Kaggle | kaggle.com/datasets/vipoooool/new-plant-diseases-dataset | ~1.5 GB | Disease CNN training |
| PlantDoc | GitHub | github.com/pratikkayal/PlantDoc-Dataset | ~250 MB | Disease CNN fine-tuning |
| Crop Recommendation | Kaggle | kaggle.com/datasets/atharvaingle/crop-recommendation-dataset | ~500 KB | XGBoost training |

**Download instructions:**
```bash
# Install Kaggle CLI
pip install kaggle
# Place kaggle.json (from kaggle.com/account) at ~/.kaggle/kaggle.json
chmod 600 ~/.kaggle/kaggle.json

# Download datasets
kaggle datasets download -d vipoooool/new-plant-diseases-dataset -p ./data/plantvillage
kaggle datasets download -d atharvaingle/crop-recommendation-dataset -p ./data/crop
unzip ./data/plantvillage/new-plant-diseases-dataset.zip -d ./data/plantvillage/
```

---

## 7. Local Development Environment

### Python (Backend)
```bash
# Install Python 3.11+
python --version  # Verify ≥ 3.11

# Create virtual environment
cd agrisetu-backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
# .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp .env.example .env
# Fill in values

# Start backend
uvicorn main:app --reload --port 8000
# Visit http://localhost:8000/docs
```

### Node (Frontend)
```bash
# Install Node 20+
node --version  # Verify ≥ 20

cd agrisetu-frontend
npm install

# Copy env file
cp .env.example .env
# Fill in values

# Start frontend
npm run dev
# Visit http://localhost:5173
```

---

## 8. Twilio WhatsApp Sandbox Setup

1. Sign into console.twilio.com → Messaging → Try it out → Send a WhatsApp message
2. Note the sandbox number: `+1 415 523 8886`
3. Configure the webhook URL (after backend is deployed):
   - Console → Messaging → Settings → WhatsApp Sandbox Settings
   - **When a message comes in:** `https://your-railway-url.railway.app/api/v1/whatsapp/webhook`
   - Method: HTTP POST
4. To test locally before deployment, use **ngrok:**
   ```bash
   brew install ngrok  # or download from ngrok.com
   ngrok http 8000
   # Copy the https://xxxx.ngrok.io URL as your webhook
   ```
5. Test by texting "join <sandbox-keyword>" from your personal WhatsApp to the sandbox number

---

## 9. Google Colab Setup for CNN Training

1. Upload this notebook to Colab: (will be created in `ml/train_disease_cnn.ipynb`)
2. Go to Runtime → Change runtime type → **T4 GPU**
3. Mount Google Drive:
   ```python
   from google.colab import drive
   drive.mount('/content/drive')
   ```
4. Upload PlantVillage dataset to Drive or Kaggle, then pull with Kaggle CLI inside Colab
5. After training, save model weights:
   ```python
   torch.save(model.state_dict(), '/content/drive/MyDrive/agrisetu/disease_model.pth')
   ```
6. Download weights and place in `agrisetu-backend/models/disease_model/`

---

## 10. Pre-Build Verification Checklist

Before starting Day 1 coding, verify every item below works:

- [ ] `curl https://services.sentinel-hub.com/oauth/token` returns an access token
- [ ] `curl https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=AG&longitude=73.8&latitude=20.0&start=20260801&end=20260810&format=JSON` returns weather data
- [ ] `curl https://rest.isric.org/soilgrids/v2.0/properties/query?lon=73.8&lat=20.0` returns soil data
- [ ] Supabase SQL editor: `SELECT PostGIS_version();` returns a version string
- [ ] Supabase SQL editor: `SELECT * FROM pg_extension WHERE extname = 'vector';` returns a row
- [ ] FastAPI starts locally and `/docs` loads without errors
- [ ] React app starts locally and renders the home page
- [ ] Twilio sandbox: send a WhatsApp message to the sandbox number and receive the test reply
- [ ] Anthropic API: test with `curl` or Python — returns a completion
- [ ] Bhashini API: test ASR call returns transcription (or fallback Whisper works)

**Do not start coding until all checkboxes above are ticked.**
