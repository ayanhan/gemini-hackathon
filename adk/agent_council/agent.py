import os

from .orchestrator import CouncilOrchestrator

if os.environ.get("GOOGLE_CLOUD_PROJECT"):
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")
    os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")


root_agent = CouncilOrchestrator(
    name="agent_council",
    description="A council of opinionated agents that debate a user's decision.",
)
