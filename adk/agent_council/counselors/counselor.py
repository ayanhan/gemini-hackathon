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
    return f"{get_persona(persona)}\n\n---\n\n{get_hat(hat)}"


def get_persona(persona: Persona) -> str:
    """Return the rich persona system prompt."""
    return _read(_PERSONAS_DIR / f"{Persona(persona).value}.md")


def get_hat(hat: Hat) -> str:
    """Return the thinking-hat overlay instructions."""
    return _read(_HATS_DIR / f"{Hat(hat).value}.md")


# Maps the council display names sent by the client to library personas.
_DISPLAY_TO_PERSONA = {
    "mentor": Persona.MENTOR,
    "sarcastic buddy": Persona.BUDDY,
    "18-year-old you": Persona.EIGHTEEN,
    "failed future you": Persona.FAILED,
    "millionaire you": Persona.MILLIONAIRE,
    "scared parents": Persona.PARENTS,
}


def persona_for_name(name: str) -> Persona | None:
    """Resolve a built-in persona from a display name, or None for wildcards."""
    return _DISPLAY_TO_PERSONA.get((name or "").strip().lower())
