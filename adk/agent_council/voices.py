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

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client()
    return _client


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
