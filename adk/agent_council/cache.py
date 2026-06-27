"""Demo-safety cache.

A single known-good debate is stored on disk so the stage demo can replay
instantly even if the network or model stalls. Set COUNCIL_FORCE_CACHE=1 to
always replay it; otherwise it is only used as a last-resort fallback.
"""

from __future__ import annotations

import json
import os

from .schema import Beat, CouncilResult, Verdict

_CACHE_PATH = os.path.join(os.path.dirname(__file__), "demo_cache.json")


def force_cache() -> bool:
    return os.environ.get("COUNCIL_FORCE_CACHE", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }


def load_cached_result() -> CouncilResult | None:
    try:
        with open(_CACHE_PATH, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None

    beats = [
        Beat(
            label=str(b.get("label", "")),
            speaker=str(b.get("speaker", "")),
            text=str(b.get("text", "")),
        )
        for b in data.get("beats", [])
    ]
    verdict_raw = data.get("verdict", {})
    if not beats or not verdict_raw:
        return None

    verdict = Verdict(
        decision=str(verdict_raw.get("decision", "")),
        conditions=str(verdict_raw.get("conditions", "")),
        firstMove=str(verdict_raw.get("firstMove", "")),
    )
    return CouncilResult(beats=beats, verdict=verdict)
