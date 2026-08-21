"""TTS Service — Text-to-Speech using gTTS (Google Text-to-Speech)."""
import logging
import tempfile
import os
import io

logger = logging.getLogger("agrisetu.tts")


def synthesize_speech(text: str, language: str = "hi") -> bytes:
    """
    Convert text to speech audio bytes.

    Args:
        text: Text to convert
        language: Language code (hi, en, mr, etc.)

    Returns:
        Audio bytes (MP3 format)
    """
    try:
        from gtts import gTTS

        # gTTS language mapping
        lang_map = {"hi": "hi", "en": "en", "mr": "mr", "pt": "pt", "zh": "zh-CN"}
        tts_lang = lang_map.get(language, "en")

        tts = gTTS(text=text, lang=tts_lang)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)

        audio_bytes = audio_buffer.read()
        logger.info(f"TTS generated: {len(audio_bytes)} bytes for language {language}")
        return audio_bytes

    except ImportError:
        logger.error("gTTS not installed. Run: pip install gTTS")
        return b""
    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}")
        return b""
