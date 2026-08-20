"""AgriSetu — Constants"""

# ── API Base URLs ───────────────────────────────────────────
SENTINEL_HUB_OAUTH_URL = "https://services.sentinel-hub.com/oauth/token"
SENTINEL_HUB_PROCESSING_URL = "https://services.sentinel-hub.com/api/v1/process"
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent"

# ── File Upload ─────────────────────────────────────────────
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# ── Disease Model ───────────────────────────────────────────
DISEASE_MODEL_PATH = "models/disease_model/disease_model_best.pth"
DISEASE_CLASS_NAMES_PATH = "models/disease_model/class_names.json"
DISEASE_MODEL_INPUT_SIZE = 224

# ── Crop Model ──────────────────────────────────────────────
CROP_MODEL_PATH = "models/crop_model/xgboost_crop.json"
CROP_FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

# ── Scheduler ───────────────────────────────────────────────
SCHEDULER_INTERVAL_HOURS = 6

# ── RAG ─────────────────────────────────────────────────────
RAG_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
RAG_EMBEDDING_DIM = 384
RAG_TOP_K = 3

# ── Supported Languages ─────────────────────────────────────
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "pt": "Portuguese",
    "zh": "Mandarin",
}

# ── Twilio ──────────────────────────────────────────────────
TWILIO_WEBHOOK_PATH = "/api/v1/whatsapp/webhook"

# ── Sample Plots ────────────────────────────────────────────
SAMPLE_PLOT_NASHIK = {
    "name": "Nashik Plot",
    "lat": 20.0,
    "lon": 73.8,
    "district": "Nashik",
    "state": "Maharashtra",
    "country": "India",
    "current_crop": "wheat",
    "last_crop": "chickpea",
}

SAMPLE_PLOT_SAO_PAULO = {
    "name": "Sao Paulo Plot",
    "lat": -23.55,
    "lon": -46.63,
    "district": "Sao Paulo",
    "state": "Sao Paulo",
    "country": "Brazil",
    "current_crop": "soybean",
    "last_crop": "corn",
}