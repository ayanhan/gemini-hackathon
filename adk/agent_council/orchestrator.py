"""Venn council orchestrator: a custom multi-agent ADK agent.

Flow (parallel fan-out, three waves):
  1. Opening  - every selected persona speaks at once.
  2. Clash    - every persona reacts after reading all openings (parallel).
  3. Verdict  - the moderator synthesises a unified ruling.

This keeps latency at ~3 model "waves" regardless of council size, while still
being genuine multi-agent orchestration (independent persona invocations plus a
moderator). Output is the shared {beats, verdict} contract.
"""

from __future__ import annotations

import asyncio
from typing import AsyncGenerator

from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.genai import types

from . import cache, personas, voices
from .schema import (
    Beat,
    CouncilRequest,
    CouncilResult,
    Persona,
    Verdict,
    parse_request,
)

LABEL_OPENING = "Opening"
LABEL_CLASH = "Rebuttal"
LABEL_VERDICT = "Verdict"

LINE_TIMEOUT_S = 25.0
MODERATOR_TIMEOUT_S = 30.0
MAX_COUNCIL = 6

_DEFAULT_PERSONAS = [
    Persona(
        name="Mentor",
        seat="calm strategy",
        tone="warm, precise",
        stance="runway, timing, and the smallest reversible step",
        line="Do not quit to escape. Quit only if the next move has shape.",
    ),
    Persona(
        name="Sarcastic buddy",
        seat="social reality",
        tone="funny, sharp",
        stance="calls out fantasy and main-character logic",
        line="A startup is not a personality upgrade. Show me customers.",
    ),
]


def _user_text(ctx: InvocationContext) -> str:
    content = ctx.user_content
    if not content or not content.parts:
        return ""
    for part in content.parts:
        if getattr(part, "text", None):
            return part.text
    return ""


def _transcript(beats: list[Beat]) -> str:
    return "\n".join(f"{b.speaker}: {b.text}" for b in beats if b.text)


async def _safe_speak(persona: Persona, prompt: str) -> str:
    """Generate one line, never raising: a single slow/failed voice is skipped."""
    try:
        line = await asyncio.wait_for(voices.speak(prompt), timeout=LINE_TIMEOUT_S)
        return line or ""
    except Exception:
        return persona.line or ""


def _dedupe_name(name: str, used: dict[str, int]) -> str:
    """Keep speaker names stable + unique so the UI and TTS can key off them."""
    base = name.strip() or "Council member"
    count = used.get(base, 0)
    used[base] = count + 1
    return base if count == 0 else f"{base} ({count + 1})"


class CouncilOrchestrator(BaseAgent):
    """Runs the council debate as parallel persona waves + a moderator."""

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        request = parse_request(_user_text(ctx))

        if cache.force_cache():
            cached = cache.load_cached_result()
            if cached is not None:
                result = cached
            else:
                result = await self.deliberate(request)
        else:
            try:
                result = await self.deliberate(request)
            except Exception:
                result = cache.load_cached_result() or CouncilResult(
                    beats=[
                        Beat(
                            label=LABEL_VERDICT,
                            speaker="Council chair",
                            text="The council hit a snag. Try again in a moment.",
                        )
                    ],
                    verdict=Verdict(
                        decision="The council could not convene just now.",
                        conditions="Re-run once the connection settles.",
                        firstMove="Press start again to reconvene the council.",
                    ),
                )

        yield Event(
            author=self.name,
            invocation_id=ctx.invocation_id,
            branch=ctx.branch,
            content=types.Content(
                role="model",
                parts=[types.Part(text=result.to_json())],
            ),
        )

    async def deliberate(self, request: CouncilRequest) -> CouncilResult:
        council = (request.personas or _DEFAULT_PERSONAS)[:MAX_COUNCIL]

        # Stable, unique display names shared across waves (and later TTS).
        used: dict[str, int] = {}
        names = [_dedupe_name(p.safe_name, used) for p in council]

        # Wave 1: openings, in parallel.
        opening_lines = await asyncio.gather(
            *(_safe_speak(p, personas.opening_prompt(p, request)) for p in council)
        )
        opening_beats = [
            Beat(label=LABEL_OPENING, speaker=name, text=line)
            for name, line in zip(names, opening_lines)
            if line
        ]

        opening_transcript = _transcript(opening_beats)

        # Wave 2: rebuttals, in parallel, each having read every opening.
        clash_lines = await asyncio.gather(
            *(
                _safe_speak(p, personas.clash_prompt(p, request, opening_transcript))
                for p in council
            )
        )
        clash_beats = [
            Beat(label=LABEL_CLASH, speaker=name, text=line)
            for name, line in zip(names, clash_lines)
            if line
        ]

        full_transcript = _transcript(opening_beats + clash_beats)

        # Wave 3: moderator verdict.
        verdict, chair_line = await self._verdict(request, full_transcript)
        verdict_beat = Beat(
            label=LABEL_VERDICT, speaker="Council chair", text=chair_line
        )

        beats = opening_beats + clash_beats + [verdict_beat]
        return CouncilResult(beats=beats, verdict=verdict)

    async def _verdict(
        self, request: CouncilRequest, transcript: str
    ) -> tuple[Verdict, str]:
        try:
            ruling = await asyncio.wait_for(
                voices.moderate(personas.moderator_prompt(request, transcript)),
                timeout=MODERATOR_TIMEOUT_S,
            )
        except Exception:
            ruling = {}

        decision = str(ruling.get("decision", "")).strip()
        chair_line = str(
            ruling.get("chairLine") or decision or "The council is split; you decide."
        ).strip()
        verdict = Verdict(
            decision=decision or "The council could not reach a clean verdict in time.",
            conditions=str(ruling.get("conditions", "")).strip()
            or "Revisit with clearer constraints and more context.",
            firstMove=str(ruling.get("firstMove", "")).strip()
            or "Write down the single fact that would most change this decision.",
        )
        return verdict, chair_line
