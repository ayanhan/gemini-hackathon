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

## Scripts

```bash
npm run dev      # start local dev server
npm run build    # type-check and build production assets
npm run lint     # run oxlint
npm run preview  # preview production build
```

## Environment

Copy `.env.example` to `.env.local` to connect Gemini.

```bash
VITE_GEMINI_API_KEY=your_key_here
```

Frontend env values are visible to users in the browser. For a serious version,
prefer a small backend/API route that keeps the Gemini key server-side.

If no key is present, the app uses a local fallback debate so the demo still
works.

## Gemini flow

The Gemini logic lives in `src/councilService.ts`.

1. Sends the user's decision and selected agents to Gemini with `@google/genai`.
2. Requests strict JSON with four debate beats.
3. Parses the verdict into Decision, Conditions, and First 24-hour move.
4. The UI animates the returned messages sequentially.
