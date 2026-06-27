# 🏛️ venn

> **Put your hardest decision in front of every version of you.**  
> A premium, highly structured decision-making framework built for the **Gemini Tokyo Hackathon** (June 27, 2026).

---

## 💡 The Core Concept

Personal dilemmas and business decisions are rarely simple. We rarely have a single perspective; instead, we have an internal council of opposing voices. 

**venn** lets you put any hard choice (e.g., *"Should I quit my 9-to-5 and build a startup?"*) in front of a selected committee of AI agents representing different archetypal versions of yourself. The agents debate the issue from their assigned viewpoints, disagree with one another, challenge your cognitive biases, and synthesize a concrete, highly actionable verdict.

---

## 🚀 Key Features

* **Context Interview**: A 10-question pre-session interview covering financial runway, fears, constraints, and timing. This ensures the debate and final verdict are deeply personalized and grounded in your real-world situation.
* **Choosing the Voices**: Toggle active seats on your council from six predefined perspectives:
  * **Mentor** (Calm strategy: runway, timing, and small reversible steps)
  * **Sarcastic Buddy** (Social reality: calls out fantasies and laziness)
  * **18-Year-Old You** (Raw ambition: pushes for courage before comfort takes over)
  * **Failed Future You** (Risk memory: warns about sloppy preparation and isolation)
  * **Millionaire You** (Upside: optimizes for leverage, ownership, and learning)
  * **Scared Parents** (Care and fear: protects stability and safety)
* **The Wildcard (Custom Seats)**: Dynamically register custom personas (e.g., *Steve Jobs*, *An Aggressive VC*, *A Hardline Pragmatist*) with custom tones and stances to join the chamber.
* **Progressive Live Debate**: Watch arguments pop onto the screen sequentially with fluid CSS message animations, simulating a live discussion.
* **Unified Actionable Verdict**: The council returns a high-impact, three-part decision card:
  1. **The Decision**: A clear, unified direction (no fence-sitting).
  2. **The Conditions**: Crucial boundary conditions that must hold true.
  3. **The First Move**: A concrete action you can execute within the next **24 hours**.

---

## 🛠️ Google Technology Stack

This application utilizes cutting-edge tools from Google's AI ecosystem:

1. **Google Gemini 3.5 Flash (`gemini-3.5-flash`)**
   * Serves as the primary reasoning and generation engine.
   * Leverages native JSON Schema matching to ensure valid, parseable debates and structured verdicts.
   * Uses Vertex AI location `global` while the Cloud Run backend can still run in `us-central1`.
2. **Google GenAI JS SDK (`@google/genai`)**
   * Powering direct, low-latency, client-side model generation when a direct API key is supplied.
3. **Google Agent Development Kit (ADK)**
   * Orchestrates complex multi-agent interactions securely.
   * Handles user session registrations via `/sessions` and streams prompt routing via the `/run` gateway.

---

## 🎨 Premium Retro-Paper UI

Designed with a focus on visual excellence and rich aesthetics:
* A beautiful digital workspace styled with custom vanilla CSS grid coordinates.
* Uses custom HSL color variables (`--paper`, `--ink`, `--coral`, `--cyan`, `--green`) to create a warm, tactile retro-paper color palette.
* Linear grid backdrops and clean dashed guidelines that make the application feel highly interactive and alive.

---

## 🏃‍♂️ Running Locally

### Prerequisites

Make sure you have Node.js installed.

### Setup

1. Clone the repository and navigate to the project folder:
   ```bash
   cd gemini-hackathon
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. For local dev, copy `.env.example`:
   ```bash
   cp .env.example .env          # ADK backend reads this
   cp .env.example .env.local    # Vite frontend reads this
   ```
4. Configure one of these local modes:
   * **ADK Server Mode (recommended)** — set `VITE_ADK_API_URL=http://127.0.0.1:8000` in `.env.local` and `GOOGLE_API_KEY` (or Vertex + `GOOGLE_CLOUD_PROJECT`) in `.env`, then run `npm run adk:serve` in a second terminal.
   * **Direct Gemini Mode** — set `VITE_GEMINI_API_KEY` in `.env.local` (no backend needed; council only).

### Scripts

* **`npm run dev`**: Spin up the local development server (Vite).
* **`npm run build`**: Type-check (TypeScript) and compile optimized production assets.
* **`npm run lint`**: Analyze code quality using Oxlint (0 warnings, 0 errors).
* **`npm run preview`**: Run a local server previewing the compiled production assets.
* **`npm run gcp:setup`**: One-time GCP setup (APIs + Vertex IAM for Cloud Run).
* **`npm run gcp:deploy`**: Deploy backend and frontend; frontend auto-wires to the ADK URL.
* **`npm run gcp:deploy:adk`**: Deploy only the ADK backend.
* **`npm run gcp:deploy:web`**: Deploy only the frontend (resolves ADK URL from Cloud Run).

## ☁️ Cloud Run (production)

Live production uses **no `.env` files** and **no API keys in containers**. The backend authenticates to Gemini via Vertex AI and the Cloud Run service account. The frontend gets `VITE_ADK_API_URL` baked in at Docker build time.

### One-time setup

```bash
export GOOGLE_CLOUD_PROJECT=your-gcp-project-id
export CLOUD_RUN_REGION=us-central1   # optional

npm run gcp:setup    # enables APIs + grants Vertex AI to Cloud Run SA
npm run gcp:deploy   # deploys ADK, then web with the correct backend URL
```

You need `gcloud` authenticated (`gcloud auth login`) with permission to enable APIs and grant IAM on the project.

### Redeploying

```bash
export GOOGLE_CLOUD_PROJECT=your-gcp-project-id
npm run gcp:deploy          # both services
# or
npm run gcp:deploy:adk      # backend only
npm run gcp:deploy:web      # frontend only (auto-fetches ADK URL)
```

Optional overrides: `GOOGLE_CLOUD_LOCATION`, `AGENT_COUNCIL_MODEL`, `ADK_CLOUD_RUN_SERVICE`, `WEB_CLOUD_RUN_SERVICE`, or `VITE_ADK_API_URL` (skip auto-discovery).

## The team
![The Venn Team](presentation/versions_of_you.jpeg)
