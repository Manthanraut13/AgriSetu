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
    from services.asr import transcribe_audio, is_hallucination
    transcription = transcribe_audio(audio_bytes, language)
    question_text = (transcription.get("text") or "").strip()
    if not question_text or is_hallucination(question_text):
        raise HTTPException(
            status_code=422,
            detail="Could not hear clear speech in audio recording. Please speak closer to your microphone and try again."
        )

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
                    N = s.get("N") if s.get("N") is not None else s.get("n")
                    P = s.get("P") if s.get("P") is not None else s.get("p")
                    K = s.get("K") if s.get("K") is not None else s.get("k")
                    pH = s.get("pH") if s.get("pH") is not None else s.get("ph")
                    plot_context["soil"] = {"N": N, "P": P, "K": K, "pH": pH}
        except Exception as e:
            logger.error(f"Failed to fetch plot context: {e}")

    # 4. Detect language from transcribed question & translate to English if needed for KB lookup
    from services.llm import detect_language_from_text
    detected_lang = detect_language_from_text(question_text, fallback_lang=language)

    question_en = question_text
    if detected_lang != "en":
        try:
            question_en = translate_to_english(question_text, detected_lang)
        except Exception:
            pass

    # 5. RAG + LLM
    kb_chunks = retrieve_relevant_chunks(question_en, top_k=3)
    response_final = generate_advisory(plot_context, kb_chunks, question_text, detected_lang)
    if not response_final:
        raise HTTPException(status_code=500, detail="AI advisor unavailable")

    # 6. Generate speech
    audio_response = synthesize_speech(response_final, detected_lang)

    return {
        "text_response": response_final,
        "transcribed_question": question_text,
        "language": detected_lang,
        "has_audio": len(audio_response) > 0,
    }
