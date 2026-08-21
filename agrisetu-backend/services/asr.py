"""ASR Service — Speech-to-Text using OpenAI Whisper (local)."""
import logging
import tempfile
import os

logger = logging.getLogger("agrisetu.asr")

_model = None


def _get_whisper_model():
    """Load Whisper model (lazy, cached)."""
    global _model
    if _model is None:
        try:
            import whisper
            logger.info("Loading Whisper model (base)...")
            _model = whisper.load_model("base")
            logger.info("Whisper model loaded")
        except ImportError:
            logger.error("openai-whisper not installed. Run: pip install openai-whisper")
            return None
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            return None
    return _model


def transcribe_audio(audio_bytes: bytes, language: str = "hi") -> dict:
    """
    Transcribe audio bytes using Whisper.

    Args:
        audio_bytes: Raw audio data
        language: Language code (hi, en, mr, etc.)

    Returns:
        dict with 'text' and 'language' keys
    """
    model = _get_whisper_model()
    if model is None:
        return {"text": "", "language": language, "error": "Whisper model not loaded"}

    try:
        # Write to temp file (Whisper needs a file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            result = model.transcribe(
                tmp_path,
                language=language if language != "auto" else None,
                fp16=False,
            )
            text = result.get("text", "").strip()
            detected_lang = result.get("language", language)
            logger.info(f"Whisper transcription: {text[:80]}... (lang: {detected_lang})")
            return {"text": text, "language": detected_lang}
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        return {"text": "", "language": language, "error": str(e)}
