# Agent Council

Hackathon base for Gemini Tokyo, 27.06.2026.

Agent Council lets a user put one hard decision in front of a small group of
appointed agents: mentor, sarcastic buddy, younger self, future self, scared
parents, and other useful voices. The app can generate a live council debate
with Gemini, then reveals the messages one by one and ends with a unified
verdict. Before the council runs, the app asks 10 short context questions so
the agents can debate the real situation instead of giving generic advice.

## Run locally

```bash
npm install
npm run dev
```

The frontend works by itself. Without keys or ADK, it uses a local fallback
debate.

## Run with Google ADK

ADK is the preferred agent runtime path for the council. For the hackathon, use
Google Cloud Vertex AI through ADK so the agent runs through Google Cloud instead
of a browser API key.

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
GOOGLE_GENAI_USE_VERTEXAI=True
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# .env.local, used by Vite
VITE_ADK_API_URL=http://127.0.0.1:8000
```

Authenticate and enable Vertex AI:

```bash
gcloud auth application-default login
gcloud config set project your-google-cloud-project-id
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

Run both servers in separate terminals:

```bash
npm run adk:serve
npm run dev
```

`npm run adk:server` still runs the raw ADK CLI server. `npm run adk:serve`
runs the Cloud Run-compatible FastAPI entrypoint from `adk/main.py`.

## Deploy ADK to Cloud Run

Set the same Google Cloud values in your shell:

```bash
export GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
export GOOGLE_GENAI_USE_VERTEXAI=True
```

Deploy the ADK backend:

```bash
npm run gcp:deploy:adk
```

If Cloud Run uses the default compute service account, make sure that service
account can call Vertex AI in your project.

After deploy, Cloud Run prints a service URL. Put that URL in `.env.local`:

```bash
VITE_ADK_API_URL=https://your-cloud-run-service-url
```

Then rebuild or redeploy the frontend so it calls the Cloud Run ADK backend.

## Scripts

```bash
npm run adk:install # install Python ADK dependency
npm run adk:server  # start ADK API server on port 8000
npm run adk:serve   # start Cloud Run-compatible ADK FastAPI server
npm run gcp:deploy:adk # deploy ADK backend to Cloud Run
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
GOOGLE_GENAI_USE_VERTEXAI=True
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

Frontend env values are visible to users in the browser. The preferred path is
ADK + Google Cloud Vertex AI because the browser only sees `VITE_ADK_API_URL`,
not the model credentials.

If no key is present, the app uses a local fallback debate so the demo still
works.

## Agent flow

The council runtime logic lives in `src/councilService.ts`.

1. If `VITE_ADK_API_URL` is set, sends the decision to the ADK agent at
   `adk/agent_council`.
2. If ADK is not configured, sends the decision directly to Gemini with
   `@google/genai`.
3. Includes the user's 10-question context interview and selected council seats.
4. Parses the verdict into Decision, Conditions, and First 24-hour move.
5. The UI animates the returned messages sequentially.

ADK endpoint used by the frontend:

```text
POST http://127.0.0.1:8000/apps/agent_council/run
```
