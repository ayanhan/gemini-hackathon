# Agent Council

Hackathon base for Gemini Tokyo, 27.06.2026.

Agent Council lets a user put one hard decision in front of a small group of
appointed agents: mentor, sarcastic buddy, younger self, future self, scared
parents, and other useful voices. The app can generate a live council debate
with Gemini, then reveals the messages one by one and ends with a unified
verdict.

## Run locally

```bash
npm install
npm run dev
```

The frontend works by itself. Without keys or ADK, it uses a local fallback
debate.

## Run with Google ADK

ADK is the preferred agent runtime path for the council. It keeps the Gemini key
on the local server instead of exposing it to the browser.

```bash
python3 -m venv .venv
source .venv/bin/activate
npm run adk:install
```

Create `.env` for the ADK server and `.env.local` for Vite:

```bash
cp .env.example .env
cp .env.example .env.local
```

Set these values:

```bash
# .env, used by ADK
GOOGLE_API_KEY=your_key_here
GOOGLE_GENAI_USE_VERTEXAI=False

# .env.local, used by Vite
VITE_ADK_API_URL=http://127.0.0.1:8000
```

Run both servers in separate terminals:

```bash
npm run adk:server
npm run dev
```

## Scripts

```bash
npm run adk:install # install Python ADK dependency
npm run adk:server  # start ADK API server on port 8000
npm run dev      # start local dev server
npm run build    # type-check and build production assets
npm run lint     # run oxlint
npm run preview  # preview production build
```

## Environment

Copy `.env.example` to `.env.local` to connect Gemini.

```bash
VITE_GEMINI_API_KEY=your_key_here
VITE_ADK_API_URL=http://127.0.0.1:8000
```

Frontend env values are visible to users in the browser. For a serious version,
prefer ADK or a small backend/API route that keeps the Gemini key server-side.

If no key is present, the app uses a local fallback debate so the demo still
works.

## Agent flow

The council runtime logic lives in `src/councilService.ts`.

1. If `VITE_ADK_API_URL` is set, sends the decision to the ADK agent at
   `adk/agent_council`.
2. If ADK is not configured, sends the decision directly to Gemini with
   `@google/genai`.
3. Parses the verdict into Decision, Conditions, and First 24-hour move.
4. The UI animates the returned messages sequentially.

ADK endpoint used by the frontend:

```text
POST http://127.0.0.1:8000/apps/agent_council/run
```
