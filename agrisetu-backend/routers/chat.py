"""Chat Router — LLM + RAG agricultural advisory."""
import logging
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

logger = logging.getLogger("agrisetu.chat")
router = APIRouter(prefix="/chat")


class ChatRequest(BaseModel):
    """Chat request schema."""
    message: str = Field(..., min_length=1, max_length=500)
    language: str = Field(default="hi", pattern="^[a-z]{2}$")
    plot_id: str = Field(..., description="UUID of the farmer's plot")


class ChatResponse(BaseModel):
    """Chat response schema."""
    response: str
    language: str
    plot_id: str


@router.post("/ask", response_model=ChatResponse, tags=["Chat"])
async def chat_ask(body: ChatRequest):
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

    # 1. Get plot context
    plot_context = {}
    try:
        plot_res = supabase.table("farm_plots").select("*").eq("id", body.plot_id).execute()
        if plot_res.data:
            plot = plot_res.data[0]
            plot_context = {
                "location": {"lat": plot.get("center_lat"), "lon": plot.get("center_lon")},
                "crop": plot.get("current_crop"),
                "last_crop": plot.get("last_crop"),
            }

            # Get latest soil
            soil_res = supabase.table("soil_data").select("*").eq("plot_id", body.plot_id).order("fetched_at", desc=True).limit(1).execute()
            if soil_res.data:
                s = soil_res.data[0]
                plot_context["soil"] = {
                    "N": s.get("N"), "P": s.get("P"), "K": s.get("K"),
                    "pH": s.get("pH"), "moisture": s.get("moisture_pct"),
                }

            # Get latest weather
            weather_res = supabase.table("weather_cache").select("*").eq("plot_id", body.plot_id).order("fetched_at", desc=True).limit(1).execute()
            if weather_res.data:
                w = weather_res.data[0]
                plot_context["weather"] = {
                    "temp_c": w.get("temp_c"), "humidity": w.get("humidity_pct"),
                    "rainfall_mm": w.get("rainfall_mm"),
                }

            # Get latest NDVI
            ndvi_res = supabase.table("ndvi_snapshots").select("ndvi").eq("plot_id", body.plot_id).order("fetched_at", desc=True).limit(1).execute()
            if ndvi_res.data:
                plot_context["ndvi"] = ndvi_res.data[0].get("ndvi")
    except Exception as e:
        logger.error(f"Failed to fetch plot context: {e}")

    # 2. Translate question to English (if not English)
    question_en = body.message
    if body.language != "en":
        try:
            question_en = translate_to_english(body.message, body.language)
            logger.info(f"Translated question: {question_en[:80]}")
        except Exception as e:
            logger.warning(f"Translation failed, using original: {e}")

    # 3. RAG retrieval
    kb_chunks = retrieve_relevant_chunks(question_en, top_k=3)

    # 4. Generate advisory with Gemini
    response_en = generate_advisory(plot_context, kb_chunks, question_en, body.language)
    if not response_en:
        raise HTTPException(status_code=500, detail="AI advisor is temporarily unavailable. Please try again.")

    # 5. Translate response back to farmer's language
    response_final = response_en
    if body.language != "en":
        try:
            response_final = translate_from_english(response_en, body.language)
        except Exception as e:
            logger.warning(f"Translation back failed: {e}")

    return ChatResponse(
        response=response_final,
        language=body.language,
        plot_id=body.plot_id,
    )