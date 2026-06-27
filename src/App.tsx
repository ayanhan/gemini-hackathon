import {
  Brain,
  Clock3,
  Loader2,
  Mic2,
  Plus,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import councilHero from './assets/council-hero.png'
import {
  type CouncilAgent,
  type CouncilResult,
  type UserContextAnswer,
  fallbackCouncilResult,
  runCouncil,
} from './councilService'
import './App.css'

const councilAgents: CouncilAgent[] = [
  {
    id: 'mentor',
    name: 'Mentor',
    seat: 'calm strategy',
    tone: 'warm, precise',
    stance: 'asks for runway, timing, and the smallest reversible step',
    line: 'Do not quit to escape. Quit only if the next move has shape.',
  },
  {
    id: 'buddy',
    name: 'Sarcastic buddy',
    seat: 'social reality',
    tone: 'funny, sharp',
    stance: 'calls out fantasy, laziness, and dramatic main-character logic',
    line: 'A startup is not a personality upgrade. Show me customers.',
  },
  {
    id: 'eighteen',
    name: '18-year-old you',
    seat: 'raw ambition',
    tone: 'hungry, impatient',
    stance: 'pushes for courage before comfort becomes permanent',
    line: 'You said you did not want a safe life. Was that true or just merch?',
  },
  {
    id: 'failed',
    name: 'Failed future you',
    seat: 'risk memory',
    tone: 'honest, bruised',
    stance: 'warns about sloppy money, vague markets, and lonely execution',
    line: 'The dream did not fail. My preparation failed first.',
  },
  {
    id: 'millionaire',
    name: 'Millionaire you',
    seat: 'upside',
    tone: 'direct, calm',
    stance: 'optimizes for leverage, ownership, and long-term learning rate',
    line: 'The point is not quitting. The point is buying back your attention.',
  },
  {
    id: 'parents',
    name: 'Scared parents',
    seat: 'care and fear',
    tone: 'protective, emotional',
    stance: 'defends stability, health insurance, and not burning bridges',
    line: 'We are not against your dream. We are against you falling alone.',
  },
]

const interviewQuestions = [
  'What outcome do you want most from this decision?',
  'What are you afraid will happen if you choose wrong?',
  'How much money runway do you have?',
  'Who depends on you or will be affected?',
  'What deadline or timing pressure exists?',
  'What have you already tried?',
  'What evidence would make this a clear yes?',
  'What evidence would make this a clear no?',
  'What personal value should the council protect?',
  'What is one constraint the council must respect?',
]

const STORAGE_KEY = 'agent-council-state-v1'

type StoredCouncilState = {
  councilResult?: CouncilResult
  customAgents?: CouncilAgent[]
  question?: string
  selectedAgentIds?: string[]
  userContext?: UserContextAnswer[]
}

type CouncilPreset = {
  answers: string[]
  agentIds: string[]
  label: string
  question: string
}

const defaultQuestion = 'Should I quit my 9-to-5 and build a startup?'

const defaultUserContext = interviewQuestions.map((interviewQuestion) => ({
  question: interviewQuestion,
  answer: '',
}))

const loadStoredState = (): StoredCouncilState => {
  try {
    const storedState = window.localStorage.getItem(STORAGE_KEY)

    if (!storedState) {
      return {}
    }

    return JSON.parse(storedState) as StoredCouncilState
  } catch {
    return {}
  }
}

const storedState = loadStoredState()

const mergeStoredContext = (
  storedContext: UserContextAnswer[] | undefined,
) =>
  defaultUserContext.map((defaultAnswer) => {
    const savedAnswer = storedContext?.find(
      (item) => item.question === defaultAnswer.question,
    )

    return savedAnswer
      ? { ...defaultAnswer, answer: savedAnswer.answer }
      : defaultAnswer
  })

const councilPresets: CouncilPreset[] = [
  {
    label: 'Startup decision',
    question: 'Should I quit my job and build a startup full-time?',
    agentIds: ['mentor', 'buddy', 'failed', 'millionaire', 'parents'],
    answers: [
      'Build something real without losing momentum.',
      'Quitting too early and running out of money.',
      'About 6 months if I cut expenses.',
      'My family and current team will feel the impact.',
      'I want to decide within the next 30 days.',
      'I have built a rough prototype and talked to a few users.',
      'Paying customers or strong weekly user growth.',
      'No one cares enough to use or pay for it.',
      'Courage with financial discipline.',
      'Do not burn bridges with my current job.',
    ],
  },
  {
    label: 'Relationship decision',
    question: 'Should I stay in this relationship or move on?',
    agentIds: ['mentor', 'buddy', 'eighteen', 'parents'],
    answers: [
      'Clarity without being cruel or avoidant.',
      'Wasting more time or hurting someone unnecessarily.',
      'Money is not the main constraint.',
      'My partner, close friends, and my emotional health.',
      'I need to decide before another big commitment.',
      'I have tried honest talks, space, and changing routines.',
      'Consistent trust, effort, and calm communication.',
      'Repeated avoidance, resentment, or incompatible futures.',
      'Honesty and emotional safety.',
      'Do not make the decision from one bad week.',
    ],
  },
  {
    label: 'Career move',
    question: 'Should I take the new job or stay where I am?',
    agentIds: ['mentor', 'buddy', 'failed', 'millionaire', 'parents'],
    answers: [
      'A better learning curve and stronger long-term options.',
      'Choosing prestige over actual growth.',
      'Enough savings to handle a transition.',
      'My family, manager, and future self.',
      'The offer deadline is soon.',
      'I compared role scope, compensation, team, and growth.',
      'Clear ownership, better mentorship, and fair compensation.',
      'Vague role, weak manager, or values mismatch.',
      'Learning rate and integrity.',
      'Do not ignore health or burnout signals.',
    ],
  },
  {
    label: 'Money/risk decision',
    question: 'Should I take this financial risk right now?',
    agentIds: ['mentor', 'buddy', 'failed', 'parents'],
    answers: [
      'Upside without destroying stability.',
      'Overconfidence, debt, or a hidden downside.',
      'Emergency fund covers around 4 months.',
      'My family and future obligations.',
      'The opportunity window may close this month.',
      'I have checked basic numbers but not worst-case scenarios.',
      'Downside is capped and upside is meaningful.',
      'Loss would force bad decisions or debt.',
      'Security and optionality.',
      'Keep an emergency reserve untouched.',
    ],
  },
  {
    label: 'Creative project',
    question: 'Should I commit seriously to this creative project?',
    agentIds: ['mentor', 'buddy', 'eighteen', 'failed', 'millionaire'],
    answers: [
      'Make something original and finish it.',
      'Spending months polishing something nobody sees.',
      'I can fund a small version myself.',
      'My collaborators, audience, and future portfolio.',
      'I want a finished version within 8 weeks.',
      'I have sketches, notes, or a partial prototype.',
      'A small audience reacts strongly and asks for more.',
      'I avoid shipping or cannot explain why it matters.',
      'Taste, courage, and completion.',
      'Scope must stay small enough to finish.',
    ],
  },
]

function App() {
  const [question, setQuestion] = useState(
    storedState.question ?? defaultQuestion,
  )
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(
    storedState.selectedAgentIds ?? councilAgents.map((agent) => agent.id),
  )
  const [customAgents, setCustomAgents] = useState<CouncilAgent[]>(
    storedState.customAgents ?? [],
  )
  const [wildcardName, setWildcardName] = useState('')
  const [wildcardTone, setWildcardTone] = useState('')
  const [wildcardProtects, setWildcardProtects] = useState('')
  const [userContext, setUserContext] = useState<UserContextAnswer[]>(
    mergeStoredContext(storedState.userContext),
  )
  const [sessionStarted, setSessionStarted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [visibleBeatCount, setVisibleBeatCount] = useState(
    storedState.councilResult?.beats.length ?? fallbackCouncilResult.beats.length,
  )
  const [councilResult, setCouncilResult] =
    useState<CouncilResult>(storedState.councilResult ?? fallbackCouncilResult)
  const [statusMessage, setStatusMessage] = useState(
    'Preview uses local fallback until ADK or Gemini is configured.',
  )

  const allAgents = useMemo(
    () => [...councilAgents, ...customAgents],
    [customAgents],
  )

  const selectedAgents = useMemo(
    () =>
      allAgents.filter((agent) => selectedAgentIds.includes(agent.id)),
    [allAgents, selectedAgentIds],
  )

  useEffect(() => {
    setSelectedAgentIds((currentIds) => {
      const validIds = currentIds.filter((id) =>
        allAgents.some((agent) => agent.id === id),
      )

      return validIds.length === currentIds.length ? currentIds : validIds
    })
  }, [allAgents])

  useEffect(() => {
    const nextStoredState: StoredCouncilState = {
      councilResult,
      customAgents,
      question,
      selectedAgentIds,
      userContext,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStoredState))
  }, [councilResult, customAgents, question, selectedAgentIds, userContext])

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((currentIds) => {
      if (currentIds.includes(agentId)) {
        return currentIds.length === 1
          ? currentIds
          : currentIds.filter((id) => id !== agentId)
      }

      return [...currentIds, agentId]
    })
  }

  const addWildcardAgent = () => {
    const name = wildcardName.trim()
    const tone = wildcardTone.trim()
    const protects = wildcardProtects.trim()

    if (!name || !tone || !protects) {
      return
    }

    const newAgent: CouncilAgent = {
      id: `wildcard-${crypto.randomUUID()}`,
      name,
      seat: 'wildcard perspective',
      tone,
      stance: protects,
      line: `${name} protects ${protects}.`,
    }

    setCustomAgents((currentAgents) => [...currentAgents, newAgent])
    setSelectedAgentIds((currentIds) => [...currentIds, newAgent.id])
    setWildcardName('')
    setWildcardTone('')
    setWildcardProtects('')
  }

  const applyPreset = (preset: CouncilPreset) => {
    const customAgentIds = customAgents.map((agent) => agent.id)

    setQuestion(preset.question)
    setUserContext(
      defaultUserContext.map((item, index) => ({
        ...item,
        answer: preset.answers[index] ?? '',
      })),
    )
    setSelectedAgentIds([...preset.agentIds, ...customAgentIds])
    setSessionStarted(false)
    setVisibleBeatCount(fallbackCouncilResult.beats.length)
    setCouncilResult(fallbackCouncilResult)
    setStatusMessage('Preset loaded. Adjust details, then start the council.')
  }

  const updateContextAnswer = (index: number, answer: string) => {
    setUserContext((currentAnswers) =>
      currentAnswers.map((item, itemIndex) =>
        itemIndex === index ? { ...item, answer } : item,
      ),
    )
  }

  useEffect(() => {
    if (!sessionStarted || isGenerating) {
      return
    }

    setVisibleBeatCount(0)
    const timers = councilResult.beats.map((_, index) =>
      window.setTimeout(() => {
        setVisibleBeatCount(index + 1)
      }, 420 * (index + 1)),
    )

    return () => {
      timers.forEach(window.clearTimeout)
    }
  }, [councilResult, isGenerating, sessionStarted])

  const startCouncil = async () => {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isGenerating) {
      return
    }

    setSessionStarted(true)
    setIsGenerating(true)
    setVisibleBeatCount(0)
    setStatusMessage('Council is forming arguments...')

    try {
      const result = await runCouncil(
        trimmedQuestion,
        selectedAgents,
        userContext,
      )
      setCouncilResult(result)
      setStatusMessage(
        result.source === 'adk'
          ? 'Generated through the Google ADK council agent.'
          : result.source === 'gemini'
            ? 'Generated live with Gemini.'
            : 'Using local fallback because no Gemini key is configured.',
      )
    } catch (error) {
      setCouncilResult(fallbackCouncilResult)
      setStatusMessage(
        error instanceof Error
          ? `Council failed, showing fallback: ${error.message}`
          : 'Council failed, showing fallback.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Project header">
        <a href="https://luma.com/geminitokyo" rel="noreferrer" target="_blank">
          Gemini Tokyo
        </a>
        <span>27.06.2026</span>
        <a
          href="http://tinyurl.com/geminisubmit"
          rel="noreferrer"
          target="_blank"
        >
          Submission
        </a>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Agent Council</p>
          <h1>Put your hardest decision in front of every version of you.</h1>
          <p className="hero-text">
            A fast council room where appointed agents debate a dilemma,
            challenge each other, and return a practical verdict before the
            timer runs out.
          </p>

          <div className="question-panel" aria-label="Council question">
            <label htmlFor="question">Decision to debate</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
            />
            <div className="preset-row" aria-label="Council presets">
              {councilPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="question-actions">
              <button
                disabled={isGenerating || !question.trim()}
                type="button"
                onClick={startCouncil}
              >
                {isGenerating ? (
                  <Loader2 className="spin" size={18} aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {isGenerating ? 'Summoning council' : 'Start council'}
              </button>
              <span>
                <Clock3 size={16} aria-hidden="true" />
                2 min format
              </span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-label="AI council chamber preview">
          <img src={councilHero} alt="" />
        </div>
      </section>

      <section className="workspace-grid" aria-label="Council workspace">
        <section className="panel interview-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Context interview</p>
              <h2>Answer before the council votes</h2>
            </div>
            <span className="agent-count">
              {userContext.filter((item) => item.answer.trim()).length}/10
            </span>
          </div>

          <div className="interview-grid">
            {userContext.map((item, index) => (
              <label className="interview-question" key={item.question}>
                <span>
                  {index + 1}. {item.question}
                </span>
                <input
                  onChange={(event) =>
                    updateContextAnswer(index, event.target.value)
                  }
                  placeholder="Short answer"
                  value={item.answer}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="panel agent-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Council seats</p>
              <h2>Choose the voices</h2>
            </div>
            <span className="agent-count">
              <UsersRound size={16} aria-hidden="true" />
              {selectedAgents.length}
            </span>
          </div>

          <div className="agent-list">
            {allAgents.map((agent) => {
              const isSelected = selectedAgentIds.includes(agent.id)

              return (
                <button
                  className="agent-card"
                  data-selected={isSelected}
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  type="button"
                >
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-seat">{agent.seat}</span>
                  <span className="agent-tone">{agent.tone}</span>
                </button>
              )
            })}
          </div>

          <div className="wildcard-form" aria-label="Add custom council seat">
            <p className="eyebrow">The Wildcard</p>
            <label htmlFor="wildcard-name">Agent name</label>
            <input
              id="wildcard-name"
              onChange={(event) => setWildcardName(event.target.value)}
              placeholder="Steve Jobs"
              value={wildcardName}
            />

            <label htmlFor="wildcard-tone">Tone</label>
            <input
              id="wildcard-tone"
              onChange={(event) => setWildcardTone(event.target.value)}
              placeholder="intense, product-obsessed"
              value={wildcardTone}
            />

            <label htmlFor="wildcard-protects">What they protect</label>
            <input
              id="wildcard-protects"
              onChange={(event) => setWildcardProtects(event.target.value)}
              placeholder="focus, taste, brutal simplicity"
              value={wildcardProtects}
            />

            <button
              disabled={
                !wildcardName.trim() ||
                !wildcardTone.trim() ||
                !wildcardProtects.trim()
              }
              onClick={addWildcardAgent}
              type="button"
            >
              <Plus size={16} aria-hidden="true" />
              Add seat
            </button>
          </div>
        </section>

        <section className="panel debate-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live debate</p>
              <h2>
                {isGenerating
                  ? 'Council is thinking'
                  : sessionStarted
                    ? 'Council in session'
                    : 'Preview mode'}
              </h2>
            </div>
            <span className="voice-pill">
              <Mic2 size={16} aria-hidden="true" />
              {councilResult.source === 'adk'
                ? 'adk-agent'
                : councilResult.source === 'gemini'
                  ? 'gemini-live'
                  : 'fallback'}
            </span>
          </div>

          <div className="topic-strip">
            <Brain size={18} aria-hidden="true" />
            <p>{question}</p>
          </div>

          <p className="status-line" aria-live="polite">
            {statusMessage}
          </p>

          <ol className="debate-list">
            {councilResult.beats.slice(0, visibleBeatCount).map((beat) => (
              <li className="message-pop" key={`${beat.label}-${beat.speaker}`}>
                <span>{beat.label}</span>
                <strong>{beat.speaker}</strong>
                <p>{beat.text}</p>
              </li>
            ))}
            {isGenerating ? (
              <li className="thinking-message">
                <span>Listening</span>
                <strong>Council room</strong>
                <p>Agents are preparing arguments from their assigned seats.</p>
              </li>
            ) : null}
          </ol>
        </section>

        <section className="panel verdict-panel">
          <p className="eyebrow">Council memory</p>
          <h2>What each voice protects</h2>

          <div className="stance-list">
            {selectedAgents.slice(0, 4).map((agent) => (
              <article key={agent.id}>
                <h3>{agent.name}</h3>
                <p>{agent.stance}</p>
                <blockquote>{agent.line}</blockquote>
              </article>
            ))}
          </div>
        </section>

        <section className="panel outcome-panel">
          <p className="eyebrow">Verdict shape</p>
          <h2>Unified response</h2>
          <ul>
            <li>
              <span>Decision</span>
              <strong>{councilResult.verdict.decision}</strong>
            </li>
            <li>
              <span>Conditions</span>
              <strong>{councilResult.verdict.conditions}</strong>
            </li>
            <li>
              <span>First 24-hour move</span>
              <strong>{councilResult.verdict.firstMove}</strong>
            </li>
          </ul>
        </section>
      </section>
    </main>
  )
}

export default App
