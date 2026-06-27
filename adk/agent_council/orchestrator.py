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
    Alignment,
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


async def _safe_audio(beat: Beat, voice: str, delivery_style: str) -> Beat:
    """Attach TTS audio when possible without breaking text-only output."""
    if beat.audio_base64:
        return beat

    try:
        audio_base64, audio_mime_type = await voices.synthesize_speech(
            beat.text, voice, delivery_style
        )
    except Exception:
        return beat

    if audio_base64:
        beat.audio_base64 = audio_base64
        beat.audio_mime_type = audio_mime_type
        beat.voice = voice

    return beat


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

        result = await self.add_audio(result, request)

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

        # Wave 3: moderator verdict + per-voice alignment.
        verdict, chair_line, alignment = await self._verdict(
            request, full_transcript, names
        )
        verdict_beat = Beat(
            label=LABEL_VERDICT, speaker="Council chair", text=chair_line
        )

        beats = opening_beats + clash_beats + [verdict_beat]
        return CouncilResult(beats=beats, verdict=verdict, alignment=alignment)

    async def add_audio(
        self, result: CouncilResult, request: CouncilRequest
    ) -> CouncilResult:
        if not voices.tts_enabled():
            return result

        tone_by_name = {
            persona.safe_name.lower(): persona.tone for persona in request.personas
        }

        await asyncio.gather(
            *(
                _safe_audio(
                    beat,
                    *voices.voice_profile_for(
                        beat.speaker,
                        tone_by_name.get(beat.speaker.lower(), ""),
                    ),
                )
                for beat in result.beats
            )
        )
        return result

    async def _verdict(
        self, request: CouncilRequest, transcript: str, names: list[str]
    ) -> tuple[Verdict, str, list[Alignment]]:
        try:
            ruling = await asyncio.wait_for(
                voices.moderate(
                    personas.moderator_prompt(request, transcript, names)
                ),
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
        alignment = self._parse_alignment(ruling.get("alignment"), names)
        return verdict, chair_line, alignment

    @staticmethod
    def _parse_alignment(raw: object, names: list[str]) -> list[Alignment]:
        by_name: dict[str, Alignment] = {}
        if isinstance(raw, list):
            for item in raw:
                if not isinstance(item, dict):
                    continue
                agent = str(item.get("agent", "")).strip()
                if not agent:
                    continue
                try:
                    agreement = int(float(item.get("agreement", 50)))
                except (TypeError, ValueError):
                    agreement = 50
                agreement = max(0, min(100, agreement))
                by_name[agent.lower()] = Alignment(
                    agent=agent,
                    agreement=agreement,
                    keyConcerns=str(item.get("keyConcerns", "")).strip(),
                )

        # Ensure every council voice has an entry, in roster order. Match exactly
        # first, then fall back to fuzzy matching (the model sometimes shortens
        # names, e.g. "Buddy" for "Sarcastic buddy").
        result: list[Alignment] = []
        for name in names:
            key = name.lower()
            match = by_name.get(key)
            if match is None:
                for other_key, other in by_name.items():
                    if other_key in key or key in other_key:
                        match = Alignment(
                            agent=name,
                            agreement=other.agreement,
                            keyConcerns=other.keyConcerns,
                        )
                        break
            result.append(
                match
                if match is not None
                else Alignment(agent=name, agreement=50, keyConcerns="")
            )
        return result
