"""ASR Service — Speech-to-Text using Gemini Multimodal Audio + Whisper fallback."""
import logging
import tempfile
import os

from config import settings

logger = logging.getLogger("agrisetu.asr")

_whisper_model = None

HALLUCINATION_PATTERNS = [
    "get out to the field",
    "get out into the field",
    "crop might be ripe",
    "ready for the harvest",
    "subtitles by",
    "thank you for watching",
    "thanks for watching",
    "amara.org",
    "translated by",
    "subscribe to",
    "like and subscribe",
    "silence",
    "silent audio",
    "no speech",
    "unclear speech",
    "thank you",
]


def is_hallucination(text: str) -> bool:
    """Check if transcribed text matches known Whisper/Gemini silence hallucinations."""
    if not text or not text.strip():
        return True
    t_lower = text.lower().strip()
    for pattern in HALLUCINATION_PATTERNS:
        if pattern in t_lower:
            return True
    return False


def _transcribe_with_gemini(audio_bytes: bytes, language: str = "hi") -> dict:
    """Transcribe audio using Google Gemini Multimodal Audio API."""
    import google.generativeai as genai

    if len(audio_bytes) < 1200:
        logger.warning(f"Audio payload too small ({len(audio_bytes)} bytes), skipping Gemini ASR.")
        return {"text": "", "language": language}

    api_keys = [settings.GEMINI_API_KEY]
    if settings.GEMINI_BACKUP_API_KEY:
        api_keys.append(settings.GEMINI_BACKUP_API_KEY)

    lang_names = {"hi": "Hindi", "mr": "Marathi", "en": "English", "pt": "Portuguese"}
    target_lang = lang_names.get(language, "Hindi or Marathi or English")

    prompt = (
        "You are a strict verbatim speech-to-text audio transcriber. "
        f"Listen to the audio and transcribe ONLY the exact human words spoken in {target_lang}. "
        "Strict Rules:\n"
        "1. Output ONLY the literal words spoken in the audio.\n"
        "2. If the audio is silent, background static, quiet, or has no clear human speech, return NOTHING.\n"
        "3. DO NOT invent quotes, sentences about farming/harvesting, or subtitles.\n"
        "4. Keep the transcription in the spoken language (Hindi, Marathi, or English)."
    )

    for key in api_keys:
        if not key:
            continue
        try:
            genai.configure(api_key=key)
            for m_name in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]:
                try:
                    m = genai.GenerativeModel(m_name)
                    audio_part = {
                        "mime_type": "audio/webm",
                        "data": audio_bytes
                    }
                    res = m.generate_content([prompt, audio_part])
                    if res and res.text:
                        text = res.text.strip().strip('"').strip("'")
                        if is_hallucination(text):
                            logger.info(f"Filtered hallucinated ASR text from Gemini ({m_name}): '{text}'")
                            continue
                        logger.info(f"Gemini audio transcription ({m_name}): {text}")
                        return {"text": text, "language": language}
                except Exception as mod_err:
                    logger.warning(f"Gemini audio model '{m_name}' failed: {mod_err}")
        except Exception as k_err:
            logger.warning(f"Gemini key failed: {k_err}")

    return {"text": "", "language": language, "error": "Gemini audio transcription unavailable"}


def transcribe_audio(audio_bytes: bytes, language: str = "hi") -> dict:
    """
    Transcribe audio bytes using Gemini API (primary) or local Whisper.
    """
    if len(audio_bytes) < 1200:
        return {"text": "", "language": language}

    # 1. Try Gemini Multimodal Audio
    res = _transcribe_with_gemini(audio_bytes, language)
    if res.get("text") and not is_hallucination(res.get("text")):
        return res

    # 2. Try Whisper if installed
    try:
        import whisper
        global _whisper_model
        if _whisper_model is None:
            _whisper_model = whisper.load_model("base")
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            w_res = _whisper_model.transcribe(tmp_path, language=language if language != "auto" else None, fp16=False)
            text = w_res.get("text", "").strip()
            if is_hallucination(text):
                logger.info(f"Filtered hallucinated ASR text from Whisper: '{text}'")
                text = ""
            return {"text": text, "language": w_res.get("language", language)}
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        logger.debug(f"Whisper fallback not active: {e}")

    return {"text": "", "language": language}


