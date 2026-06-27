import base64
import os

import uvicorn
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel

from agent_council import voices


AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(AGENT_DIR)

load_dotenv(os.path.join(PROJECT_DIR, ".env"))
load_dotenv(os.path.join(AGENT_DIR, ".env"))

SESSION_SERVICE_URI = os.environ.get(
    "SESSION_SERVICE_URI",
    "sqlite+aiosqlite:///./sessions.db",
)
ALLOW_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ADK_ALLOW_ORIGINS", "*").split(",")
    if origin.strip()
]

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=SESSION_SERVICE_URI,
    allow_origins=ALLOW_ORIGINS,
    web=False,
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


TRANSCRIBE_MODEL = os.environ.get("AGENT_COUNCIL_TRANSCRIBE_MODEL", "gemini-3.5-flash")


class TranscribeRequest(BaseModel):
    audioBase64: str
    mimeType: str = "audio/webm"
    question: str = ""


@app.post("/transcribe")
async def transcribe(req: TranscribeRequest) -> dict[str, str]:
    """Transcribe a short spoken answer server-side (no client API key needed)."""
    audio_bytes = base64.b64decode(req.audioBase64)
    instruction = (
        "You are an accurate speech-to-text transcriber. "
        f'The user is answering: "{req.question}". '
        "Transcribe only their spoken answer. Return ONLY the raw text, no quotes "
        "or commentary. If the audio is silent, return an empty string."
    )
    response = await voices.get_client().aio.models.generate_content(
        model=TRANSCRIBE_MODEL,
        contents=[
            instruction,
            types.Part.from_bytes(data=audio_bytes, mime_type=req.mimeType),
        ],
    )
    return {"text": (response.text or "").strip()}


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8080")),
    )
