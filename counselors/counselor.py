"""Compose a council voice from one persona and one thinking hat."""

from enum import Enum
from functools import lru_cache
from pathlib import Path

_ROOT = Path(__file__).parent
_PERSONAS_DIR = _ROOT / "personas"
_HATS_DIR = _ROOT / "hats"


class Persona(str, Enum):
    MENTOR = "mentor"
    BUDDY = "buddy"
    EIGHTEEN = "eighteen"
    FAILED = "failed"
    MILLIONAIRE = "millionaire"
    PARENTS = "parents"


class Hat(str, Enum):
    WHITE = "white"
    RED = "red"
    BLACK = "black"
    YELLOW = "yellow"
    GREEN = "green"
    BLUE = "blue"


@lru_cache(maxsize=None)
def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def get_counselor(hat: Hat, persona: Persona) -> str:
    """Return the composed system prompt for `persona` thinking through `hat`."""
    persona_text = _read(_PERSONAS_DIR / f"{Persona(persona).value}.md")
    hat_text = _read(_HATS_DIR / f"{Hat(hat).value}.md")
    return f"{persona_text}\n\n---\n\n{hat_text}"
