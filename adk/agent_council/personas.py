"""Prompt builders for each council voice and the moderator.

Built-in voices use the rich persona library in ``counselors/`` as the single
source of truth, overlaid with a De Bono thinking hat per round (White facts for
openings, Black critique for the clash). Wildcard voices fall back to the fields
supplied in the request. Every voice speaks in short, vivid, spoken lines so the
debate reads fast on stage and per-line TTS stays snappy.
"""

from __future__ import annotations

from .counselors.counselor import (
    Hat,
    get_hat,
    get_persona,
    persona_for_name,
)
from .schema import CouncilRequest, Persona, context_block

MAX_LINE_WORDS = 24

_SHARED_RULES = f"""
Hard rules:
- Speak in ONE spoken line, max {MAX_LINE_WORDS} words.
- Stay fully in character. First person. No stage directions, no quotes, no emoji.
- Be specific to THIS user's situation, not generic advice.
- Funny, sharp, and human is good. Filler is not.
- Output only the spoken line, nothing else.
"""


def _persona_card(persona: Persona) -> str:
    """Voice description for a wildcard (no library entry)."""
    return (
        f"You are \"{persona.safe_name}\", a member of the user's decision council.\n"
        f"Seat: {persona.seat}\n"
        f"Tone: {persona.tone}\n"
        f"You protect: {persona.stance}\n"
        f"Signature stance: {persona.line or 'speak from your seat'}"
    )


def _voice_card(persona: Persona) -> str:
    """Rich library persona if it is a built-in voice, else the wildcard card."""
    builtin = persona_for_name(persona.safe_name)
    if builtin is not None:
        return get_persona(builtin)
    return _persona_card(persona)


def _compose(persona: Persona, hat: Hat, body: str) -> str:
    return f"""{_voice_card(persona)}

---

{get_hat(hat)}

---

{body}
{_SHARED_RULES}"""


def opening_prompt(persona: Persona, request: CouncilRequest) -> str:
    body = f"""The decision on the table:
{request.question}

What you know about the user:
{context_block(request)}

Give your OPENING take on this decision from your seat. Plant your flag."""
    return _compose(persona, Hat.WHITE, body)


def clash_prompt(persona: Persona, request: CouncilRequest, transcript: str) -> str:
    body = f"""The decision on the table:
{request.question}

What you know about the user:
{context_block(request)}

The council just opened. Here is what everyone said:
{transcript}

Now REACT. Push back on a voice you disagree with, or sharpen the strongest point.
Name who you are answering. Do not repeat your opening."""
    return _compose(persona, Hat.BLACK, body)


def moderator_prompt(
    request: CouncilRequest, transcript: str, speakers: list[str]
) -> str:
    roster = ", ".join(speakers) if speakers else "the council"
    return f"""You are the Council Chair for Venn. You are neutral but decisive.

The decision on the table:
{request.question}

What you know about the user:
{context_block(request)}

Full debate transcript:
{transcript}

Weigh the voices and deliver the council's unified ruling. Take a real position;
no fence-sitting. Ground it in the user's actual situation.

Then rate, for EACH of these voices ({roster}), how much they agree with the
final decision on a 0-100 scale, and summarise their single biggest concern.

Return STRICT JSON only, no markdown, no extra keys, this exact shape:
{{
  "chairLine": "one spoken verdict line for the chair to say, max {MAX_LINE_WORDS} words",
  "decision": "clear unified decision, max 18 words",
  "conditions": "what must be true first, max 28 words",
  "firstMove": "one concrete action within 24 hours, max 24 words",
  "alignment": [
    {{"agent": "exact voice name", "agreement": 0-100, "keyConcerns": "their main concern, max 12 words"}}
  ]
}}"""
