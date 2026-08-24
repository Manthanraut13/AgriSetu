"""Chat Router — LLM + RAG agricultural advisory."""
import logging
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

logger = logging.getLogger("agrisetu.chat")
router = APIRouter(prefix="/chat")


class ChatRequest(BaseModel):
    """Chat request schema."""
    message: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="hi")
    plot_id: Optional[str] = Field(default="")
    session_id: Optional[str] = Field(default=None)


class ChatResponse(BaseModel):
    """Chat response schema."""
    response: str
    language: str
    plot_id: str
    session_id: str = ""


@router.post("/ask", response_model=ChatResponse, tags=["Chat"])
@router.post("/message", response_model=ChatResponse, tags=["Chat"])
def chat_ask(body: ChatRequest):
    """
    Ask the AI advisor a farming question.

    Full pipeline: fetch plot context -> RAG retrieval -> Gemini LLM -> translate -> respond
    """
    from config import settings
    from supabase import create_client
    from services.rag import retrieve_relevant_chunks
    from services.llm import generate_advisory
    from services.translation import translate_to_english, translate_from_english

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
