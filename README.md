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
3. Copy `.env.example` to create your local environment file:
   ```bash
   cp .env.example .env.local
   ```
4. Add your configuration keys to `.env.local`:
   * **Direct Gemini Mode**:
     ```bash
     VITE_GEMINI_API_KEY=your_google_gemini_api_key
     ```
   * **ADK Server Mode**:
     ```bash
     VITE_ADK_API_URL=your_adk_server_api_url
     ```

### Scripts

* **`npm run dev`**: Spin up the local development server (Vite).
* **`npm run build`**: Type-check (TypeScript) and compile optimized production assets.
* **`npm run lint`**: Analyze code quality using Oxlint (0 warnings, 0 errors).
* **`npm run preview`**: Run a local server previewing the compiled production assets.
* **`npm run gcp:deploy:adk`**: Deploy the ADK backend to Cloud Run.
* **`npm run gcp:deploy:web`**: Deploy the Vite frontend to Cloud Run.

## ☁️ Cloud Run

The production frontend container bakes in the deployed ADK backend URL:

```text
https://agent-council-adk-zv6rjy4tva-uc.a.run.app
```

Deploy backend first, then frontend:

```bash
export GOOGLE_CLOUD_PROJECT=gen-lang-client-0569491900
export CLOUD_RUN_REGION=us-central1
export GOOGLE_CLOUD_LOCATION=global
export AGENT_COUNCIL_MODEL=gemini-3.5-flash

npm run gcp:deploy:adk
npm run gcp:deploy:web
```
