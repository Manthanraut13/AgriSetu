"""WhatsApp Bot Router — Twilio webhook for incoming WhatsApp messages."""
import logging
import httpx
import urllib.parse
from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

logger = logging.getLogger("agrisetu.whatsapp")
router = APIRouter(prefix="/whatsapp")


def _twiml_response(message: str) -> PlainTextResponse:
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'    <Message>{message}</Message>\n'
        '</Response>'
    )
    return PlainTextResponse(content=xml, media_type="application/xml")


def _parse_form(form_data):
    body = form_data.get("Body", "").strip() if isinstance(form_data.get("Body"), str) else ""
    sender = form_data.get("From", "") if isinstance(form_data.get("From"), str) else ""
    num_media = int(form_data.get("NumMedia", 0) or 0)
    media_url = form_data.get("MediaUrl0", "") if isinstance(form_data.get("MediaUrl0"), str) else ""
    return body, sender, num_media, media_url


async def _get_farmer_plot(sender_phone: str):
    from config import settings
    from supabase import create_client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    phone = sender_phone.replace("whatsapp:", "").replace("+", "")
    farmer = supabase.table("farmers").select("id").eq("phone", phone).execute()
    if not farmer.data:
        return None, None, None
    plots = supabase.table("farm_plots").select("id").eq("farmer_id", farmer.data[0]["id"]).execute()
    if not plots.data:
        return farmer.data[0]["id"], None, None
    plot_id = plots.data[0]["id"]
    plot = supabase.table("farm_plots").select("*").eq("id", plot_id).execute()
    plot_data = plot.data[0] if plot.data else None
    return farmer.data[0]["id"], plot_id, plot_data


def _advisory_text(plot_data: dict, soil: dict) -> str:
    from services.crop_model import predict_crop
    crop_recs = predict_crop(
        soil.get("N", 50), soil.get("P", 40), soil.get("K", 45),
        25, 60, soil.get("pH", 6.5), 100
    )
    if not crop_recs:
        return "Could not generate advisory."
    top = crop_recs[0]
    return (
        f"AgriSetu Advisory:\n"
        f"Recommended crop: {top['crop']} ({top['confidence']*100:.0f}%)\n"
        f"Soil: N={soil.get('N','?')}, P={soil.get('P','?')}, K={soil.get('K','?')}, pH={soil.get('pH','?')}\n"
        f"Current crop: {plot_data.get('current_crop', 'N/A')}\n"
        f"Location: {plot_data.get('district','?')}, {plot_data.get('state','?')}"
    )


async def _chat_reply(text: str, sender: str, language: str = "hi") -> str:
    from config import settings
    from supabase import create_client
    from services.rag import retrieve_relevant_chunks
    from services.llm import generate_advisory
    from services.translation import translate_to_english, translate_from_english
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    phone = sender.replace("whatsapp:", "").replace("+", "")
    farmer = supabase.table("farmers").select("id").eq("phone", phone).execute()
    plot_context = {}
    if farmer.data:
        plots = supabase.table("farm_plots").select("*").eq("farmer_id", farmer.data[0]["id"]).execute()
        if plots.data:
            p = plots.data[0]
            plot_context = {"crop": p.get("current_crop"), "location": {"lat": p.get("center_lat"), "lon": p.get("center_lon")}}
    question_en = text
    if language != "en":
        try:
            question_en = translate_to_english(text, language)
        except Exception:
            pass
    kb_chunks = retrieve_relevant_chunks(question_en, top_k=3)
    response_en = generate_advisory(plot_context, kb_chunks, question_en, language)
    if not response_en:
        return "Sorry, I could not process your question."
    if language != "en":
        try:
            return translate_from_english(response_en, language)
        except Exception:
            pass
    return response_en


async def _diagnose_from_url(media_url: str) -> str:
    async with httpx.AsyncClient() as client:
        img_resp = await client.get(media_url, timeout=15)
    if img_resp.status_code != 200:
        return "Could not download image."
    from services.disease_model import predict_disease
    import json, os
    result = predict_disease(img_resp.content)
    if not result:
        return "Could not diagnose disease from this image."
    treatments_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "treatments.json")
    treatments = {}
    if os.path.exists(treatments_path):
        with open(treatments_path) as f:
            treatments = json.load(f)
    key = result["disease_name"]
    t = treatments.get(key, {"treatment": "Consult an agronomist.", "organic_remedy": "Remove affected parts."})
    return (
        f"Disease Detected: {result['disease_name']}\n"
        f"Confidence: {result['confidence_pct']:.1f}%\n"
        f"Severity: {result['severity']}\n\n"
        f"Treatment: {t['treatment']}\n"
        f"Organic: {t['organic_remedy']}"
    )


@router.post("/webhook", tags=["WhatsApp"])
async def whatsapp_webhook(request: Request):
    try:
        form = await request.form()
        fd = {k: v for k, v in form.items()}
    except Exception:
        body_bytes = await request.body()
        fd = urllib.parse.parse_qs(body_bytes.decode())
        fd = {k: v[0] if isinstance(v, list) else v for k, v in fd.items()}

    body, sender, num_media, media_url = _parse_form(fd)
    logger.info(f"WhatsApp from {sender}: '{body[:80]}' media={num_media}")

    if body.lower() in ("hi", "hello", "start", "help", "\u092e\u0926\u0926"):
        return _twiml_response(
            "Welcome to AgriSetu!\n\n"
            "Reply with:\n"
            "1 - Get crop advisory\n"
            "2 - Send a photo for disease diagnosis\n"
            "3 - Ask a farming question\n\n"
            "Or just type your question in any language!"
        )

    if num_media > 0 and media_url:
        try:
            reply = await _diagnose_from_url(media_url)
            return _twiml_response(reply)
        except Exception as e:
            logger.error(f"Diagnosis failed: {e}")
            return _twiml_response("Could not diagnose. Please try a clearer photo.")

    if body == "1":
        try:
            _, plot_id, plot_data = await _get_farmer_plot(sender)
            if not plot_id or not plot_data:
                return _twiml_response("No farm found. Please register on the web app first.")
            from config import settings
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            soil_res = supabase.table("soil_data").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
            soil = soil_res.data[0] if soil_res.data else {}
            return _twiml_response(_advisory_text(plot_data, soil))
        except Exception as e:
            logger.error(f"Advisory failed: {e}")
            return _twiml_response("Could not generate advisory.")

    if body == "3":
        return _twiml_response("Please type your farming question and I will answer it!")

    if body:
        try:
            reply = await _chat_reply(body, sender)
            return _twiml_response(reply)
        except Exception as e:
            logger.error(f"Chat failed: {e}")
            return _twiml_response("Sorry, I encountered an error. Please try again.")

    return _twiml_response("I didn't understand. Send a photo, type a question, or reply 1 for advisory.")
