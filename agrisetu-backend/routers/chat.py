"""Chat Router — AI Farming Advisor with session & long-term memory."""
import logging
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
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
    message: str
    plot_id: Optional[str] = None
    language: str = "en"
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime


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
    
    context = {}
    
    if plot_id:
        # Get plot
        plot_res = supabase.table("farm_plots").select("*").eq("id", plot_id).execute()
        if plot_res.data:
            plot = plot_res.data[0]
            context["plot"] = plot
            
            # Get farmer
            farmer_res = supabase.table("farmers").select("*").eq("id", plot["farmer_id"]).execute()
            if farmer_res.data:
                context["farmer"] = farmer_res.data[0]
            
            # Get soil
            soil_res = supabase.table("soil_data").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
            if soil_res.data:
                context["soil"] = soil_res.data[0]
            
            # Get weather
            weather_res = supabase.table("weather_cache").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
            if weather_res.data:
                context["weather"] = weather_res.data[0]
            
            # Get NDVI
            ndvi_res = supabase.table("ndvi_snapshots").select("*").eq("plot_id", plot_id).order("fetched_at", desc=True).limit(1).execute()
            if ndvi_res.data:
                context["ndvi"] = ndvi_res.data[0]
            
            # Get disease reports
            disease_res = supabase.table("disease_reports").select("*").eq("plot_id", plot_id).order("reported_at", desc=True).limit(5).execute()
            if disease_res.data:
                context["disease_reports"] = disease_res.data
            
            # Get advisories
            advisory_res = supabase.table("advisories").select("*").eq("plot_id", plot_id).order("created_at", desc=True).limit(3).execute()
            if advisory_res.data:
                context["advisories"] = advisory_res.data
    
    return context


@router.post("/message", response_model=ChatResponse, tags=["Chat"])
async def chat_message(request: ChatRequest):
    """Send a message to the AI advisor with full context."""
    session_id = request.session_id or str(uuid.uuid4())
    
    # Get or create session memory
    if session_id not in _session_memory:
        _session_memory[session_id] = {
            "messages": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
    
    session = _session_memory[session_id]
    session["updated_at"] = datetime.utcnow()
    
    # Add user message to session
    session["messages"].append(ChatMessage(role="user", content=request.message))
    
    # Get farmer context (long-term memory)
    farmer_context = await _get_farmer_context(request.plot_id)
    
    # Build system prompt
    system_prompt = _get_system_prompt(request.language, farmer_context)
    
    # Build conversation history for Gemini
    # Include last 10 messages from session
    recent_messages = session["messages"][-10:]
    
    # Prepare content for Gemini
    contents = [system_prompt]
    for msg in recent_messages:
        role = "user" if msg.role == "user" else "model"
        contents.append({"role": role, "parts": [msg.content]})
    
    try:
        model = genai.GenerativeModel("gemini-3.6-flash")
        response = model.generate_content(contents)
        ai_response = response.text.strip()
        
        # Add AI response to session
        session["messages"].append(ChatMessage(role="assistant", content=ai_response))
        
        return ChatResponse(response=ai_response, session_id=session_id)
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(
            response="I apologize, but I'm having trouble processing your request. Please try again.",
            session_id=session_id
        )


@router.get("/history/{session_id}", response_model=ChatHistoryResponse, tags=["Chat"])
async def get_chat_history(session_id: str):
    """Get chat history for a session."""
    if session_id not in _session_memory:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = _session_memory[session_id]
    return ChatHistoryResponse(
        session_id=session_id,
        messages=session["messages"],
        created_at=session["created_at"],
        updated_at=session["updated_at"],
    )


@router.delete("/session/{session_id}", tags=["Chat"])
async def clear_session(session_id: str):
    """Clear a chat session."""
    if session_id in _session_memory:
        del _session_memory[session_id]
    return {"success": True}


@router.get("/farmer/{farmer_id}/plots", tags=["Chat"])
async def get_farmer_plots(farmer_id: str):
    """Get all plots for a farmer (for chat context switching)."""
    from supabase import create_client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    plots = supabase.table("farm_plots").select("*").eq("farmer_id", farmer_id).execute()
    return plots.data


# Cleanup old sessions periodically (run on startup)
def cleanup_old_sessions(max_age_hours: int = 24):
    """Remove sessions older than max_age_hours."""
    cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
    to_delete = [
        sid for sid, sess in _session_memory.items()
        if sess["updated_at"] < cutoff
    ]
    for sid in to_delete:
        del _session_memory[sid]
    logger.info(f"Cleaned up {len(to_delete)} old chat sessions")