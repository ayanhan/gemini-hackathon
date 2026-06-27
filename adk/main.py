import os

import uvicorn
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app


AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_SERVICE_URI = os.environ.get(
    "SESSION_SERVICE_URI",
    "sqlite+aiosqlite:///./sessions.db",
)
ALLOW_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ADK_ALLOW_ORIGINS", "*").split(",")
    if origin.strip()
]

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=SESSION_SERVICE_URI,
    allow_origins=ALLOW_ORIGINS,
    web=False,
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8080")),
    )
