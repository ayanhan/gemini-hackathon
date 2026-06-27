"""Shared data contract for the Venn council orchestrator.

The frontend and backend agree on this exact JSON shape:

    {
      "beats": [
        {
          "label": str,
          "speaker": str,
          "text": str,
          "audioBase64": str | None,
          "audioMimeType": str | None,
          "voice": str | None,
        },
        ...
      ],
      "verdict": {"decision": str, "conditions": str, "firstMove": str}
    }

Beats are dynamic length (one opening + one clash per persona, plus a chair
verdict beat), so the frontend must render them without assuming a fixed count.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field


@dataclass
class Persona:
    name: str
    seat: str = "council seat"
    tone: str = "direct"
    stance: str = "protects the user's best interest"
    line: str = ""

    @property
    def safe_name(self) -> str:
        return self.name.strip() or "Council member"


@dataclass
class ContextItem:
    question: str
    answer: str


@dataclass
class CouncilRequest:
    question: str
    personas: list[Persona] = field(default_factory=list)
    context: list[ContextItem] = field(default_factory=list)
    memory: str = ""


@dataclass
class Beat:
    label: str
    speaker: str
    text: str
    audio_base64: str = ""
    audio_mime_type: str = ""
    voice: str = ""


@dataclass
class Verdict:
    decision: str
    conditions: str
    firstMove: str


@dataclass
class Alignment:
    agent: str
    agreement: int
    keyConcerns: str


@dataclass
class CouncilResult:
    beats: list[Beat]
    verdict: Verdict
    alignment: list[Alignment] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps(
            {
                "beats": [
                    {
                        "label": b.label,
                        "speaker": b.speaker,
                        "text": b.text,
                        **(
                            {
                                "audioBase64": b.audio_base64,
                                "audioMimeType": b.audio_mime_type,
                                "voice": b.voice,
                            }
                            if b.audio_base64
                            else {}
                        ),
                    }
                    for b in self.beats
                ],
                "verdict": {
                    "decision": self.verdict.decision,
                    "conditions": self.verdict.conditions,
                    "firstMove": self.verdict.firstMove,
                },
                "alignment": [
                    {
                        "agent": a.agent,
                        "agreement": a.agreement,
                        "keyConcerns": a.keyConcerns,
                    }
                    for a in self.alignment
                ],
            },
            ensure_ascii=False,
        )


def _coerce_str(value: object, fallback: str = "") -> str:
    if value is None:
        return fallback
    return str(value).strip() or fallback


def parse_request(raw: str) -> CouncilRequest:
    """Parse the user message payload into a CouncilRequest.

    Accepts the structured JSON the web client sends. Falls back to treating the
    whole string as the question if it is not valid JSON.
    """
    raw = (raw or "").strip()
    if not raw:
        return CouncilRequest(question="")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return CouncilRequest(question=raw)

    if not isinstance(data, dict):
        return CouncilRequest(question=raw)

    personas: list[Persona] = []
    for item in data.get("agents", []) or []:
        if not isinstance(item, dict):
            continue
        personas.append(
            Persona(
                name=_coerce_str(item.get("name"), "Council member"),
                seat=_coerce_str(item.get("seat"), "council seat"),
                tone=_coerce_str(item.get("tone"), "direct"),
                stance=_coerce_str(
                    item.get("stance"), "protects the user's best interest"
                ),
                line=_coerce_str(item.get("line")),
            )
        )

    context: list[ContextItem] = []
    for item in data.get("userContext", []) or []:
        if not isinstance(item, dict):
            continue
        answer = _coerce_str(item.get("answer"))
        if not answer:
            continue
        context.append(
            ContextItem(
                question=_coerce_str(item.get("question"), "context"),
                answer=answer,
            )
        )

    memory_raw = data.get("memory")
    if isinstance(memory_raw, list):
        memory = "\n".join(_coerce_str(m) for m in memory_raw if _coerce_str(m))
    else:
        memory = _coerce_str(memory_raw)

    return CouncilRequest(
        question=_coerce_str(data.get("question")),
        personas=personas,
        context=context,
        memory=memory,
    )


def context_block(request: CouncilRequest) -> str:
    """Render the user's interview answers + memory as prompt evidence."""
    lines: list[str] = []
    for item in request.context:
        lines.append(f"- {item.question}: {item.answer}")
    if request.memory:
        lines.append(f"- Personal memory/context: {request.memory}")
    if not lines:
        return "No extra user context was provided."
    return "\n".join(lines)
