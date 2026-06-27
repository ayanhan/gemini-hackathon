"""Low-level model calls for a single council voice and the moderator.

Each call is one independent Gemini invocation, which lets the orchestrator fan
them out in parallel. Kept thin so the orchestrator owns the control flow.
"""

from __future__ import annotations

import json
import os
import re
import base64
import io
import wave

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


def _audio_bytes(data: bytes | str) -> bytes:
    if isinstance(data, bytes):
        return data
    return base64.b64decode(data)


def _wav_base64(pcm: bytes, mime_type: str) -> str:
    rate_match = re.search(r"rate=(\d+)", mime_type)
    sample_rate = int(rate_match.group(1)) if rate_match else 24000
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm)

    return base64.b64encode(buffer.getvalue()).decode("ascii")


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
    # Decode only the first JSON object; the model occasionally appends trailing
    # text after a valid object (json.loads would raise "Extra data").
    start = raw.find("{")
    if start == -1:
        return json.loads(raw)
    obj, _ = json.JSONDecoder().raw_decode(raw[start:])
    return obj


async def moderate(prompt: str, *, attempts: int = 2) -> dict:
    """Generate the chair's verdict as a structured dict, retrying once on failure."""
    last_error: Exception | None = None
    for _ in range(max(1, attempts)):
        try:
            response = await get_client().aio.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.6,
                    response_mime_type="application/json",
                    max_output_tokens=1536,
                    thinking_config=types.ThinkingConfig(thinking_budget=0),
                ),
            )
            return _extract_json(response.text or "")
        except Exception as error:  # noqa: BLE001 - retry on any transient failure
            last_error = error
    raise last_error if last_error else RuntimeError("moderate failed")


async def synthesize_speech(
    text: str, voice: str, delivery_style: str = "natural conversational tone"
) -> tuple[str, str]:
    """Return base64 WAV audio + MIME type for a spoken beat."""
    if not text.strip() or not tts_enabled():
        return "", ""

    response = await get_client().aio.models.generate_content(
        model=TTS_MODEL,
        contents=f"Say in a {delivery_style}: {text.strip()}",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice,
                    ),
                ),
            ),
        ),
    )

    candidates = response.candidates or []
    for candidate in candidates:
        content = candidate.content
        for part in content.parts or []:
            inline_data = getattr(part, "inline_data", None)
            if not inline_data or not inline_data.data:
                continue

            mime_type = inline_data.mime_type or "audio/wav"
            audio = _audio_bytes(inline_data.data)
            if mime_type.lower().startswith("audio/l16"):
                return _wav_base64(audio, mime_type), "audio/wav"

            return base64.b64encode(audio).decode("ascii"), mime_type

    return "", ""
