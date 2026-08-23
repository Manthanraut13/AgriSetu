"""Voice Router — audio in → text advisory → audio response."""
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response

logger = logging.getLogger("agrisetu.voice")
router = APIRouter(prefix="/voice")


@router.post("/ask", tags=["Voice"])
def voice_ask(
    audio: UploadFile = File(...),
    language: str = Form("hi"),
    plot_id: str = Form(""),
):
    """
    Voice advisory endpoint.

    Accepts audio file → transcribes → generates advisory → returns audio + text.
    """
    from services.asr import transcribe_audio
    from services.tts import synthesize_speech
    from services.translation import translate_to_english, translate_from_english
    from services.llm import generate_advisory
    from services.rag import retrieve_relevant_chunks
    from config import settings
    from supabase import create_client

    # 1. Read audio
    audio_bytes = audio.file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # 2. Transcribe
    transcription = transcribe_audio(audio_bytes, language)
    if not transcription.get("text"):
        raise HTTPException(status_code=422, detail="Could not transcribe audio. Please try speaking clearly.")

    question_text = transcription["text"]

    # 3. Get plot context
    plot_context = {}
    if plot_id:
        try:
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            plot_res = supabase.table("farm_plots").select("*").eq("id", plot_id).execute()
            if plot_res.data:
                plot = plot_res.data[0]
                plot_context = {
                    "location": {"lat": plot.get("center_lat"), "lon": plot.get("center_lon")},
                    "crop": plot.get("current_crop"),
                }
                soil_res = supabase.table("soil_data").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
                if soil_res.data:
                    s = soil_res.data[0]
                    plot_context["soil"] = {"N": s.get("N"), "P": s.get("P"), "K": s.get("K"), "pH": s.get("pH")}
        except Exception as e:
            logger.error(f"Failed to fetch plot context: {e}")

    # 4. Translate to English if needed
    question_en = question_text
    if language != "en":
        try:
            question_en = translate_to_english(question_text, language)
        except Exception:
            pass

    # 5. RAG + LLM
    kb_chunks = retrieve_relevant_chunks(question_en, top_k=3)
    response_en = generate_advisory(plot_context, kb_chunks, question_en, language)
    if not response_en:
        raise HTTPException(status_code=500, detail="AI advisor unavailable")

    # 6. Translate response back
    response_final = response_en
    if language != "en":
        try:
            response_final = translate_from_english(response_en, language)
        except Exception:
            pass

    # 7. Generate speech
    audio_response = synthesize_speech(response_final, language)

    return {
        "text_response": response_final,
        "transcribed_question": question_text,
        "language": language,
        "has_audio": len(audio_response) > 0,
    }
