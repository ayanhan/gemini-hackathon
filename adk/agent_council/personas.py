"""Prompt builders for each council voice and the moderator.

Kept separate from the orchestration logic so the personalities can be tuned
independently. Every voice speaks in short, vivid, spoken lines so the debate
reads fast on stage and so per-line TTS stays snappy.
"""

from __future__ import annotations

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
    return (
        f"You are \"{persona.safe_name}\", a member of the user's decision council.\n"
        f"Seat: {persona.seat}\n"
        f"Tone: {persona.tone}\n"
        f"You protect: {persona.stance}\n"
        f"Signature stance: {persona.line or 'speak from your seat'}"
    )


def opening_prompt(persona: Persona, request: CouncilRequest) -> str:
    return f"""{_persona_card(persona)}

The decision on the table:
{request.question}

What you know about the user:
{context_block(request)}

Give your OPENING take on this decision from your seat. Plant your flag.
{_SHARED_RULES}"""


def clash_prompt(persona: Persona, request: CouncilRequest, transcript: str) -> str:
    return f"""{_persona_card(persona)}

The decision on the table:
{request.question}

What you know about the user:
{context_block(request)}

The council just opened. Here is what everyone said:
{transcript}

Now REACT. Push back on a voice you disagree with, or sharpen the strongest point.
Name who you are answering. Do not repeat your opening.
{_SHARED_RULES}"""


def moderator_prompt(request: CouncilRequest, transcript: str) -> str:
    return f"""You are the Council Chair for Venn. You are neutral but decisive.

The decision on the table:
{request.question}

What you know about the user:
{context_block(request)}

Full debate transcript:
{transcript}

Weigh the voices and deliver the council's unified ruling. Take a real position;
no fence-sitting. Ground it in the user's actual situation.

Return STRICT JSON only, no markdown, no extra keys, this exact shape:
{{
  "chairLine": "one spoken verdict line for the chair to say, max {MAX_LINE_WORDS} words",
  "decision": "clear unified decision, max 18 words",
  "conditions": "what must be true first, max 28 words",
  "firstMove": "one concrete action within 24 hours, max 24 words"
}}"""
