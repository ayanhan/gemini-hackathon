"""Low-level model calls for a single council voice and the moderator.

Each call is one independent Gemini invocation, which lets the orchestrator fan
them out in parallel. Kept thin so the orchestrator owns the control flow.
"""

from __future__ import annotations

import json
import os
import re

from google import genai
from google.genai import types

MODEL = os.environ.get("AGENT_COUNCIL_MODEL", "gemini-3.5-flash")
TTS_MODEL = os.environ.get("AGENT_COUNCIL_TTS_MODEL", "gemini-3.1-flash-tts-preview")
TTS_TIMEOUT_S = float(os.environ.get("AGENT_COUNCIL_TTS_TIMEOUT_S", "20"))

VOICE_PROFILES_BY_NAME = {
    "mentor": ("Kore", "calm, grounded, warm mentor"),
    "sarcastic buddy": ("Puck", "fast, dry, sarcastic friend"),
    "buddy": ("Puck", "fast, dry, sarcastic friend"),
    "18-year-old you": ("Zephyr", "young, bright, impatient, energetic"),
    "failed future you": ("Charon", "low, regretful, cautionary future self"),
    "millionaire you": ("Orus", "confident, crisp, boardroom executive"),
    "scared parents": ("Leda", "worried, protective, emotionally tense parent"),
    "parents": ("Leda", "worried, protective, emotionally tense parent"),
    "council chair": ("Kore", "neutral, decisive, clear moderator"),
}
VOICE_PROFILES_BY_TONE = {
    "calm": ("Kore", "calm and reassuring"),
    "warm": ("Kore", "warm and steady"),
    "funny": ("Puck", "playful and quick"),
    "sharp": ("Puck", "sharp and direct"),
    "sarcastic": ("Puck", "dry and sarcastic"),
    "worried": ("Leda", "worried and protective"),
    "scared": ("Leda", "anxious and protective"),
    "confident": ("Orus", "confident and polished"),
    "aggressive": ("Fenrir", "intense and forceful"),
    "angry": ("Fenrir", "angry but controlled"),
    "creative": ("Aoede", "expressive and imaginative"),
}

_client: genai.Client | None = None


def get_client() -> genai.Client:
    """Return a cached genai client.

    On Vertex (local ADC or Agent Engine) we pin the model endpoint to a fixed
    location (default ``global``) so calls work even when the deployment region
    differs from where the model is served.
    """
    global _client
    if _client is None:
        project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in {
            "true",
            "1",
            "yes",
        }
        if project and use_vertex:
            location = os.environ.get("AGENT_COUNCIL_VERTEX_LOCATION", "global")
            _client = genai.Client(vertexai=True, project=project, location=location)
        else:
            _client = genai.Client()
    return _client


def tts_enabled() -> bool:
    return os.environ.get("AGENT_COUNCIL_TTS_ENABLED", "true").lower() in {
        "true",
        "1",
        "yes",
    }


def voice_profile_for(speaker: str, tone: str = "") -> tuple[str, str]:
    speaker_key = speaker.lower().strip()
    if speaker_key in VOICE_PROFILES_BY_NAME:
        return VOICE_PROFILES_BY_NAME[speaker_key]

    tone_key = tone.lower()
    for marker, profile in VOICE_PROFILES_BY_TONE.items():
        if marker in tone_key:
            return profile

    return "Kore", "natural conversational tone"


def voice_for(speaker: str, tone: str = "") -> str:
    return voice_profile_for(speaker, tone)[0]


def _clean_line(text: str) -> str:
    line = (text or "").strip()
    line = line.strip('"').strip("'").strip()
    # Collapse accidental multi-line output into a single spoken line.
    line = " ".join(part.strip() for part in line.splitlines() if part.strip())
    return line


async def speak(prompt: str, *, temperature: float = 0.95) -> str:
    """Generate one spoken line for a persona.

    Persona lines are short and punchy, so we keep thinking shallow to stay fast
    enough for a live demo.
    """
    response = await get_client().aio.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=256,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )
    return _clean_line(response.text or "")


def _extract_json(text: str) -> dict:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?", "", raw).strip()
        raw = re.sub(r"```$", "", raw).strip()
    return json.loads(raw)


async def moderate(prompt: str) -> dict:
    """Generate the chair's verdict as a structured dict."""
    response = await get_client().aio.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.6,
            response_mime_type="application/json",
            max_output_tokens=512,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )
    return _extract_json(response.text or "")


async def synthesize_speech(
    text: str, voice: str, delivery_style: str = "natural conversational tone"
) -> tuple[str, str]:
    """Return base64 WAV audio + MIME type for a spoken beat."""
    if not text.strip() or not tts_enabled():
        return "", ""

    interaction = await get_client().aio.interactions.create(
        model=TTS_MODEL,
        input=f"Say in a {delivery_style}: {text.strip()}",
        response_format={"type": "audio"},
        generation_config={"speech_config": [{"voice": voice}]},
        timeout=TTS_TIMEOUT_S,
    )
    audio = getattr(interaction, "output_audio", None)
    data = getattr(audio, "data", "") if audio else ""
    mime_type = getattr(audio, "mime_type", "") if audio else ""

    return data or "", mime_type or "audio/wav"
