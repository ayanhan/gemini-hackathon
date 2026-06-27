import { GoogleGenAI } from '@google/genai'

export type CouncilAgent = {
  id: string
  name: string
  seat: string
  tone: string
  stance: string
  line: string
}

export type DebateBeat = {
  label: string
  speaker: string
  text: string
}

export type Verdict = {
  decision: string
  conditions: string
  firstMove: string
}

export type CouncilResult = {
  beats: DebateBeat[]
  verdict: Verdict
  source: 'gemini' | 'fallback'
}

const fallbackResult: Omit<CouncilResult, 'source'> = {
  beats: [
    {
      label: 'Opening claim',
      speaker: 'Mentor',
      text: 'Name the real decision. Is this about quitting today, or proving the startup deserves more time?',
    },
    {
      label: 'Pressure test',
      speaker: 'Sarcastic buddy',
      text: 'If nobody pays this month, the council votes for nights and weekends, not heroic unemployment.',
    },
    {
      label: 'Counterweight',
      speaker: '18-year-old you',
      text: 'Waiting for perfect safety is still a decision. It just lets fear choose for you.',
    },
    {
      label: 'Verdict',
      speaker: 'Council chair',
      text: 'Run a 30-day proof sprint. Quit only when traction, runway, and personal energy all pass the bar.',
    },
  ],
  verdict: {
    decision: 'Run a 30-day proof sprint before quitting.',
    conditions:
      'You need visible demand, a clear money runway, and a plan that does not depend on panic motivation.',
    firstMove:
      'Write one paid offer tonight and send it to five real potential customers tomorrow.',
  },
}

const buildPrompt = (question: string, agents: CouncilAgent[]) => {
  const agentBrief = agents
    .map(
      (agent) =>
        `- ${agent.name}: seat=${agent.seat}; tone=${agent.tone}; protects=${agent.stance}`,
    )
    .join('\n')

  return `You are running Agent Council, a fast debate between appointed voices.

Decision:
${question}

Selected agents:
${agentBrief}

Return strict JSON only. No markdown. No extra keys.
Use this exact shape:
{
  "beats": [
    {
      "label": "Opening claim",
      "speaker": "agent name",
      "text": "one vivid spoken message, max 24 words"
    }
  ],
  "verdict": {
    "decision": "clear unified decision, max 18 words",
    "conditions": "what must be true first, max 28 words",
    "firstMove": "one concrete action within 24 hours, max 24 words"
  }
}

Rules:
- Make exactly 4 beats.
- Beat labels must be: Opening claim, Pressure test, Counterweight, Verdict.
- Speakers must come from the selected agents, except the final beat can be "Council chair".
- Let the agents disagree and react to each other.
- Keep the tone funny, direct, and useful.
- The verdict must match the user's actual decision, not generic advice.`
}

const parseCouncilResult = (text: string): Omit<CouncilResult, 'source'> => {
  const parsed = JSON.parse(text) as Partial<CouncilResult>

  if (!Array.isArray(parsed.beats) || parsed.beats.length === 0) {
    throw new Error('Gemini response did not include debate beats.')
  }

  if (
    !parsed.verdict?.decision ||
    !parsed.verdict.conditions ||
    !parsed.verdict.firstMove
  ) {
    throw new Error('Gemini response did not include a complete verdict.')
  }

  return {
    beats: parsed.beats.map((beat) => ({
      label: String(beat.label),
      speaker: String(beat.speaker),
      text: String(beat.text),
    })),
    verdict: {
      decision: String(parsed.verdict.decision),
      conditions: String(parsed.verdict.conditions),
      firstMove: String(parsed.verdict.firstMove),
    },
  }
}

export const runCouncil = async (
  question: string,
  agents: CouncilAgent[],
): Promise<CouncilResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    return { ...fallbackResult, source: 'fallback' }
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: buildPrompt(question, agents),
    config: {
      responseMimeType: 'application/json',
      temperature: 0.9,
    },
  })

  return {
    ...parseCouncilResult(response.text ?? ''),
    source: 'gemini',
  }
}

export const fallbackCouncilResult: CouncilResult = {
  ...fallbackResult,
  source: 'fallback',
}
