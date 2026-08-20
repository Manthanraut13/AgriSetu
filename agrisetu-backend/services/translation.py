"""Translation Service — Gemini-powered translation (Bhashini unavailable)."""
import logging
from typing import Optional

import google.generativeai as genai

from config import settings

logger = logging.getLogger("agrisetu.translation")

genai.configure(api_key=settings.GEMINI_API_KEY)


def translate_to_english(text: str, source_lang: str = "hi") -> str:
    """
    Translate text to English using Gemini.
    """
    if source_lang == "en":
        return text

    lang_names = {"hi": "Hindi", "mr": "Marathi", "pt": "Portuguese", "zh": "Chinese"}
    source_name = lang_names.get(source_lang, source_lang)

    try:
        model = genai.GenerativeModel("gemini-3.6-flash")
        response = model.generate_content(
            f"Translate the following {source_name} text to English. "
            f"Only return the translation, nothing else:\n\n{text}"
        )
        if response.text:
            return response.text.strip()
        return text
    except Exception as e:
        logger.error(f"Translation to English failed: {e}")
        return text


def translate_from_english(text: str, target_lang: str = "hi") -> str:
    """
    Translate English text to target language using Gemini.
    """
    if target_lang == "en":
        return text

    lang_names = {"hi": "Hindi", "mr": "Marathi", "pt": "Portuguese", "zh": "Chinese"}
    target_name = lang_names.get(target_lang, target_lang)

    try:
        model = genai.GenerativeModel("gemini-3.6-flash")
        response = model.generate_content(
            f"Translate the following English text to {target_name}. "
            f"Only return the translation, nothing else:\n\n{text}"
        )
        if response.text:
            return response.text.strip()
        return text
    except Exception as e:
        logger.error(f"Translation from English failed: {e}")
        return text