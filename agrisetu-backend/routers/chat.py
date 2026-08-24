"""Chat Router — AI Farming Advisor with session & long-term memory."""
import logging
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from supabase import create_client
import google.generativeai as genai

logger = logging.getLogger("agrisetu.chat")
router = APIRouter(prefix="/chat")

genai.configure(api_key=settings.GEMINI_API_KEY)

# In-memory session store (for short-term/session memory)
# In production, use Redis
_session_memory: dict = {}


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    """Chat request schema."""
    message: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="hi")
    plot_id: Optional[str] = Field(default="")
    session_id: Optional[str] = Field(default=None)


class ChatResponse(BaseModel):
    response: str
    language: str
    plot_id: str
    session_id: str = ""


@router.post("/ask", response_model=ChatResponse, tags=["Chat"])
@router.post("/message", response_model=ChatResponse, tags=["Chat"])
def chat_ask(body: ChatRequest):
    """
    Ask the AI advisor a farming question.


def _get_system_prompt(language: str, farmer_context: dict) -> str:
    """Build system prompt with farmer context."""
    lang_names = {"en": "English", "hi": "Hindi", "mr": "Marathi"}
    lang = lang_names.get(language, "English")
    
    context_parts = [
        f"You are an expert AI farming advisor. Respond in {lang}.",
        "You have access to the farmer's real-time data and history.",
        "Provide specific, actionable advice based on their actual farm conditions.",
    ]
    
    if farmer_context:
        context_parts.append("\n--- FARMER CONTEXT ---")
        if farmer_context.get("farmer"):
            f = farmer_context["farmer"]
            context_parts.append(f"Farmer: {f.get('name', 'Unknown')}")
            context_parts.append(f"Phone: {f.get('phone', 'N/A')}")
            context_parts.append(f"Preferred Language: {f.get('language_pref', 'en')}")
        
        if farmer_context.get("plot"):
            p = farmer_context["plot"]
            context_parts.append(f"\nPlot: {p.get('district', '')}, {p.get('state', '')}")
            context_parts.append(f"Location: {p.get('center_lat', 0):.4f}, {p.get('center_lon', 0):.4f}")
            context_parts.append(f"Current Crop: {p.get('current_crop', 'Not set')}")
            context_parts.append(f"Previous Crop: {p.get('last_crop', 'Not set')}")
            context_parts.append(f"Area: {p.get('area_ha', 'Not set')} hectares")
        
        if farmer_context.get("soil"):
            s = farmer_context["soil"]
            context_parts.append(f"\nSoil (latest):")
            context_parts.append(f"  N: {s.get('N', s.get('n', 'N/A'))}")
            context_parts.append(f"  P: {s.get('P', s.get('p', 'N/A'))}")
            context_parts.append(f"  K: {s.get('K', s.get('k', 'N/A'))}")
            context_parts.append(f"  pH: {s.get('pH', s.get('ph', 'N/A'))}")
            context_parts.append(f"  Moisture: {s.get('moisture_pct', 'N/A')}%")
            context_parts.append(f"  Source: {s.get('source', 'N/A')}")
        
        if farmer_context.get("weather"):
            w = farmer_context["weather"]
            context_parts.append(f"\nWeather (latest):")
            context_parts.append(f"  Temperature: {w.get('temp_c', 'N/A')}°C")
            context_parts.append(f"  Humidity: {w.get('humidity_pct', 'N/A')}%")
            context_parts.append(f"  Rainfall: {w.get('rainfall_mm', 'N/A')} mm")
            context_parts.append(f"  Wind: {w.get('wind_speed_ms', 'N/A')} m/s")
            context_parts.append(f"  Description: {w.get('description', 'N/A')}")
        
        if farmer_context.get("ndvi"):
            n = farmer_context["ndvi"]
            context_parts.append(f"\nSatellite (latest):")
            context_parts.append(f"  NDVI: {n.get('ndvi', 'N/A')}")
            context_parts.append(f"  NDMI: {n.get('ndmi', 'N/A')}")
            context_parts.append(f"  Image Date: {n.get('image_date', 'N/A')}")
            context_parts.append(f"  Source: {n.get('source', 'N/A')}")
        
        if farmer_context.get("disease_reports"):
            context_parts.append(f"\nRecent Disease Reports:")
            for d in farmer_context["disease_reports"][-3:]:
                context_parts.append(f"  - {d.get('disease_name', 'N/A')} (confidence: {d.get('confidence', 'N/A')}%)")
        
        if farmer_context.get("advisories"):
            context_parts.append(f"\nRecent Advisories:")
            for a in farmer_context["advisories"][-2:]:
                context_parts.append(f"  - Recommended: {a.get('recommended_crop', 'N/A')} ({a.get('confidence', 0)*100:.0f}%)")
    
    context_parts.append("\n--- GUIDELINES ---")
    context_parts.append("1. Always use the farmer's actual data when answering")
    context_parts.append("2. Be specific to their crop, soil, and weather conditions")
    context_parts.append("3. Give practical, actionable advice")
    context_parts.append("4. If you don't know, say so and suggest next steps")
    context_parts.append("5. Keep responses concise but complete")
    
    return "\n".join(context_parts)


async def _get_farmer_context(plot_id: Optional[str]) -> dict:
    """Fetch all relevant farmer data for context."""
    from supabase import create_client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    plot_id_str = body.plot_id or ""

    # 1. Get plot context
    plot_context = {}
    if plot_id_str and plot_id_str != "00000000-0000-0000-0000-000000000000":
        try:
            plot_res = supabase.table("farm_plots").select("*").eq("id", plot_id_str).execute()
            if plot_res.data:
                plot = plot_res.data[0]
                plot_context = {
                    "location": {"lat": plot.get("center_lat"), "lon": plot.get("center_lon")},
                    "crop": plot.get("current_crop"),
                    "last_crop": plot.get("last_crop"),
                }

                # Get latest soil
                soil_res = supabase.table("soil_data").select("*").eq("plot_id", plot_id_str).order("fetched_at", desc=True).limit(1).execute()
                if soil_res.data:
                    s = soil_res.data[0]
                    N = s.get("N") if s.get("N") is not None else s.get("n")
                    P = s.get("P") if s.get("P") is not None else s.get("p")
                    K = s.get("K") if s.get("K") is not None else s.get("k")
                    pH = s.get("pH") if s.get("pH") is not None else s.get("ph")
                    plot_context["soil"] = {
                        "N": N, "P": P, "K": K,
                        "pH": pH, "moisture": s.get("moisture_pct"),
                    }

                # Get latest weather
                weather_res = supabase.table("weather_cache").select("*").eq("plot_id", plot_id_str).order("fetched_at", desc=True).limit(1).execute()
                if weather_res.data:
                    w = weather_res.data[0]
                    plot_context["weather"] = {
                        "temp_c": w.get("temp_c"), "humidity": w.get("humidity_pct"),
                        "rainfall_mm": w.get("rainfall_mm"),
                    }

                # Get latest NDVI
                ndvi_res = supabase.table("ndvi_snapshots").select("ndvi").eq("plot_id", plot_id_str).order("fetched_at", desc=True).limit(1).execute()
                if ndvi_res.data:
                    plot_context["ndvi"] = ndvi_res.data[0].get("ndvi")
        except Exception as e:
            logger.error(f"Failed to fetch plot context: {e}")

    # 2. Detect language from user input message
    from services.llm import detect_language_from_text
    detected_lang = detect_language_from_text(body.message, fallback_lang=body.language)

    # 3. Translate query to English for KB lookup if non-English
    query_en = body.message
    if detected_lang != "en":
        try:
            query_en = translate_to_english(body.message, detected_lang)
        except Exception as te:
            logger.debug(f"Query translation fallback: {te}")

    # 4. RAG retrieval using translated English query
    kb_chunks = retrieve_relevant_chunks(query_en, top_k=3)

    # 5. Generate advisory with Gemini matching input query language
    response_final = generate_advisory(plot_context, kb_chunks, body.message, detected_lang)
    if not response_final:
        raise HTTPException(status_code=500, detail="AI advisor is temporarily unavailable. Please try again.")

    return ChatResponse(
        response=response_final,
        language=detected_lang,
        plot_id=plot_id_str,
        session_id=body.session_id or "",
    )