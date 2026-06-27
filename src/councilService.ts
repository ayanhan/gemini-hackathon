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
  audioBase64?: string
  audioMimeType?: string
  label: string
  speaker: string
  text: string
  voice?: string
}

export type Verdict = {
  decision: string
  conditions: string
  firstMove: string
  flipRisk?: string
}

export type AgentAlignment = {
  agent: string
  agreement: number
  keyConcerns: string
}

export type CouncilResult = {
  beats: DebateBeat[]
  verdict: Verdict
  alignment?: AgentAlignment[]
  source: 'adk' | 'gemini' | 'fallback'
}

export type UserContextAnswer = {
  question: string
  answer: string
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
    flipRisk:
      'Zero paid interest after real outreach, or runway dropping under four months, flips this to a clear no.',
  },
  alignment: [
    { agent: 'Mentor', agreement: 80, keyConcerns: 'Small reversible steps first' },
    { agent: 'Sarcastic buddy', agreement: 40, keyConcerns: 'Wait for actual paying customers' },
    { agent: '18-year-old you', agreement: 95, keyConcerns: 'Pushes for raw courage over comfort' },
    { agent: 'Failed future you', agreement: 50, keyConcerns: 'Warns about poor financial preparation' },
    { agent: 'Millionaire you', agreement: 90, keyConcerns: 'Wants to optimize learning rate and leverage' },
    { agent: 'Scared parents', agreement: 35, keyConcerns: 'Worries about losing healthcare and stability' }
  ]
}

const buildUserContext = (userContext: UserContextAnswer[]) => {
  const answeredContext = userContext.filter((item) => item.answer.trim())

  if (answeredContext.length === 0) {
    return 'No extra user context was provided.'
  }

  return answeredContext
    .map((item) => `- ${item.question}: ${item.answer.trim()}`)
    .join('\n')
}

const buildMemoryBlock = (memory: string) => {
  const trimmed = memory.trim()
  return trimmed ? trimmed : 'No saved memory about the user.'
}

const buildPrompt = (
  question: string,
  agents: CouncilAgent[],
  userContext: UserContextAnswer[],
  memory: string,
) => {
  const agentBrief = agents
    .map(
      (agent) =>
        `- ${agent.name}: seat=${agent.seat}; tone=${agent.tone}; protects=${agent.stance}`,
    )
    .join('\n')

  return `You are running venn, a fast debate between appointed voices.

Decision:
${question}

User context:
${buildUserContext(userContext)}

Saved memory about the user:
${buildMemoryBlock(memory)}

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
    "firstMove": "one concrete action within 24 hours, max 24 words",
    "flipRisk": "what would flip this to the opposite answer, max 26 words"
  },
  "alignment": [
    {
      "agent": "agent name",
      "agreement": 85,
      "keyConcerns": "short primary concern or stance reasoning, max 12 words"
    }
  ]
}

Rules:
- Make exactly 4 beats.
- Beat labels must be: Opening claim, Pressure test, Counterweight, Verdict.
- Speakers must come from the selected agents, except the final beat can be "Council chair".
- Let the agents disagree and react to each other.
- Keep the tone funny, direct, and useful.
- The verdict must match the user's actual decision, not generic advice.
- Calculate an alignment rating (agreement: 0-100) and a short key concern summary for every selected agent in the council.`
}

const buildCouncilPayload = (
  question: string,
  agents: CouncilAgent[],
  userContext: UserContextAnswer[],
  memory: string,
) =>
  JSON.stringify({
    question,
    memory: memory.trim(),
    userContext: userContext
      .filter((item) => item.answer.trim())
      .map((item) => ({
        question: item.question,
        answer: item.answer.trim(),
      })),
    agents: agents.map((agent) => ({
      name: agent.name,
      seat: agent.seat,
      tone: agent.tone,
      stance: agent.stance,
      line: agent.line,
    })),
  })

const stripJsonFences = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

const parseCouncilResult = (text: string): Omit<CouncilResult, 'source'> => {
  const parsed = JSON.parse(stripJsonFences(text)) as Partial<CouncilResult>

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

  const alignment = Array.isArray(parsed.alignment)
    ? parsed.alignment.map((align) => ({
        agent: String(align.agent),
        agreement: typeof align.agreement === 'number' ? align.agreement : parseInt(String(align.agreement)) || 50,
        keyConcerns: String(align.keyConcerns),
      }))
    : undefined

  return {
    beats: parsed.beats.map((beat) => ({
      audioBase64:
        typeof beat.audioBase64 === 'string' ? beat.audioBase64 : undefined,
      audioMimeType:
        typeof beat.audioMimeType === 'string' ? beat.audioMimeType : undefined,
      label: String(beat.label),
      speaker: String(beat.speaker),
      text: String(beat.text),
      voice: typeof beat.voice === 'string' ? beat.voice : undefined,
    })),
    verdict: {
      decision: String(parsed.verdict.decision),
      conditions: String(parsed.verdict.conditions),
      firstMove: String(parsed.verdict.firstMove),
      flipRisk: parsed.verdict.flipRisk ? String(parsed.verdict.flipRisk) : undefined,
    },
    alignment,
  }
}

const extractTextFromAdkResponse = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(extractTextFromAdkResponse).find(Boolean) ?? ''
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  const record = value as Record<string, unknown>

  if (typeof record.text === 'string') {
    return record.text
  }

  return [
    record.content,
    record.parts,
    record.candidates,
    record.events,
    record.response,
  ]
    .map(extractTextFromAdkResponse)
    .find(Boolean) ?? ''
}

const runCouncilWithAdk = async (
  question: string,
  agents: CouncilAgent[],
  userContext: UserContextAnswer[],
  memory: string,
  adkApiUrl: string,
): Promise<CouncilResult> => {
  const sessionId = `council-${crypto.randomUUID()}`
  const baseUrl = adkApiUrl.replace(/\/$/, '')
  const userId = 'agent-council-web'
  const sessionResponse = await fetch(
    `${baseUrl}/apps/agent_council/users/${userId}/sessions/${sessionId}`,
    {
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  )

  if (!sessionResponse.ok && sessionResponse.status !== 409) {
    throw new Error(`ADK session creation returned ${sessionResponse.status}.`)
  }

  const response = await fetch(`${baseUrl}/run`, {
    body: JSON.stringify({
      app_name: 'agent_council',
      user_id: userId,
      session_id: sessionId,
      new_message: {
        role: 'user',
        parts: [{ text: buildCouncilPayload(question, agents, userContext, memory) }],
      },
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`ADK server returned ${response.status}.`)
  }

  const payload: unknown = await response.json()
  const text = extractTextFromAdkResponse(payload)

  return {
    ...parseCouncilResult(text),
    source: 'adk',
  }
}

export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string,
  questionText: string,
): Promise<string> => {
  const adkApiUrl = import.meta.env.VITE_ADK_API_URL

  // Preferred: transcribe on the backend (no client-side API key required).
  if (adkApiUrl) {
    const response = await fetch(`${adkApiUrl.replace(/\/$/, '')}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64Audio,
        mimeType,
        question: questionText,
      }),
    })

    if (!response.ok) {
      throw new Error(`Transcription failed (${response.status}).`)
    }

    const data = (await response.json()) as { text?: string }
    return data.text?.trim() ?? ''
  }

  // Fallback: direct Gemini if a client key is configured.
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Transcription is unavailable: no backend URL or Gemini key configured.')
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        text: `You are an accurate speech-to-text transcribing helper.
The user is answering the context question: "${questionText}".
Please transcribe the user's spoken answer from the audio file.
Return ONLY the raw transcription text. Do not add any greeting, explanation, quotes, or conversational remarks. If the audio contains only silence or static, return an empty string.`,
      },
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
    ],
  })

  return response.text?.trim() ?? ''
}

export const runCouncil = async (
  question: string,
  agents: CouncilAgent[],
  userContext: UserContextAnswer[],
  memory: string = '',
): Promise<CouncilResult> => {
  const adkApiUrl = import.meta.env.VITE_ADK_API_URL
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (adkApiUrl) {
    return runCouncilWithAdk(question, agents, userContext, memory, adkApiUrl)
  }

  if (!apiKey) {
    return { ...fallbackResult, source: 'fallback' }
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: buildPrompt(question, agents, userContext, memory),
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
