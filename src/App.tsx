import {
  Loader2,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, useRef } from 'react'
import {
  type CouncilAgent,
  type CouncilResult,
  type UserContextAnswer,
  fallbackCouncilResult,
  runCouncil,
  transcribeAudio,
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

const stripCouncilAudio = (result: CouncilResult): CouncilResult => ({
  ...result,
  beats: result.beats.map((beat) => ({
    label: beat.label,
    speaker: beat.speaker,
    text: beat.text,
    voice: beat.voice,
  })),
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

const agentMeta: Record<string, { bg: string, letter: string }> = {
  mentor: { bg: '#1F9C8B', letter: 'M' },
  buddy: { bg: '#C8881C', letter: 'S' },
  eighteen: { bg: '#E0603C', letter: '18' },
  failed: { bg: '#5B61C9', letter: 'F' },
  millionaire: { bg: '#3E9B57', letter: '$' },
  parents: { bg: '#CE5680', letter: 'P' },
}

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

  const [currentStep, setCurrentStep] = useState(0)
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null)
  const [transcribingIndex, setTranscribingIndex] = useState<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const councilAudioRef = useRef<HTMLAudioElement | null>(null)

  const [screen, setScreen] = useState<'input' | 'assembly' | 'deliberating' | 'verdict'>(
    storedState.councilResult ? 'verdict' : 'input'
  )
  const [category, setCategory] = useState('Startup')
  const [debateViewMode, setDebateViewMode] = useState<'threaded' | 'roundtable'>('threaded')

  const averageAgreement = useMemo(() => {
    if (!councilResult.alignment || councilResult.alignment.length === 0) {
      return null
    }
    const sum = councilResult.alignment.reduce((acc, curr) => acc + curr.agreement, 0)
    return Math.round(sum / councilResult.alignment.length)
  }, [councilResult])

  const voteCounts = useMemo(() => {
    let go = 0, cond = 0, hold = 0
    if (councilResult.alignment) {
      councilResult.alignment.forEach((a) => {
        if (a.agreement >= 75) go++
        else if (a.agreement >= 45) cond++
        else hold++
      })
    } else {
      go = 1
      cond = 3
      hold = 2
    }
    return { go, cond, hold }
  }, [councilResult])

  const startRecording = async (index: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setTranscribingIndex(index)
        try {
          const reader = new FileReader()
          reader.readAsDataURL(audioBlob)
          reader.onloadend = async () => {
            try {
              const base64data = (reader.result as string).split(',')[1]
              const transcription = await transcribeAudio(
                base64data,
                'audio/webm',
                interviewQuestions[index]
              )
              if (transcription) {
                updateContextAnswer(index, transcription)
              }
            } catch (err) {
              console.error('Transcription error:', err)
              alert('Transcription failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
            } finally {
              setTranscribingIndex(null)
            }
          }
        } catch (error) {
          console.error('FileReader error:', error)
          setTranscribingIndex(null)
        }

        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setRecordingIndex(index)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setRecordingIndex(null)
    }
  }

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
      councilResult: stripCouncilAudio(councilResult),
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
    if (!sessionStarted || isGenerating || screen !== 'deliberating') {
      return
    }

    setVisibleBeatCount(0)
    const timers = councilResult.beats.map((_, index) =>
      window.setTimeout(() => {
        setVisibleBeatCount(index + 1)
      }, 3000 * (index + 1))
    )

    const finalTimer = window.setTimeout(() => {
      setScreen('verdict')
    }, 3000 * (councilResult.beats.length + 1))

    return () => {
      timers.forEach(window.clearTimeout)
      window.clearTimeout(finalTimer)
    }
  }, [councilResult, isGenerating, sessionStarted, screen])

  useEffect(() => {
    if (screen !== 'deliberating' || visibleBeatCount === 0) {
      councilAudioRef.current?.pause()
      return
    }

    const beat = councilResult.beats[visibleBeatCount - 1]

    if (!beat?.audioBase64) {
      return
    }

    const audio = councilAudioRef.current ?? new Audio()
    councilAudioRef.current = audio
    audio.pause()
    audio.currentTime = 0
    audio.src = `data:${beat.audioMimeType ?? 'audio/wav'};base64,${beat.audioBase64}`
    void audio.play().catch(() => undefined)
  }, [councilResult, screen, visibleBeatCount])

  const startCouncil = async () => {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isGenerating) {
      return
    }

    setScreen('deliberating')
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
      <header className="main-header" aria-label="Redesigned project header">
        <div className="header-left">
          <div className="header-logo-circle">
            <div className="header-logo-inner">
              <div className="header-logo-dot"></div>
            </div>
          </div>
          <span className="header-brand">venn</span>
        </div>
        <div className="header-right">
          {screen === 'input' && (
            <>
              <button className="header-nav-btn active" type="button">New council</button>
              <button 
                className="header-nav-btn" 
                onClick={() => storedState.councilResult && setScreen('verdict')}
                type="button"
              >
                History
              </button>
            </>
          )}
          {screen === 'assembly' && (
            <button className="header-nav-btn" onClick={() => setScreen('input')} type="button">
              ← Back to input
            </button>
          )}
          {screen === 'deliberating' && (
            <div className="live-council-badge">
              <div className="live-pulse-dot"></div>
              <span>LIVE COUNCIL</span>
            </div>
          )}
          {screen === 'verdict' && (
            <div className="verdict-ready-badge">
              <div className="verdict-check-icon">✓</div>
              <span>VERDICT READY</span>
            </div>
          )}
        </div>
      </header>

      {/* Screen 1: Input Page */}
      {screen === 'input' && (
        <section className="screen-input-layout" aria-label="Input screen">
          <div className="input-hero-copy">
            <span className="mono-label">The decision chamber</span>
            <h1 className="hero-title">
              Put your hardest decision in front of <span className="gradient-text">every version of you.</span>
            </h1>
            <p className="hero-description">
              Convene a council of your inner voices. They debate from opposing viewpoints, challenge your blind spots, and return one practical verdict — in about two minutes.
            </p>

            <div className="input-card-panel" aria-label="Decision input card">
              <div className="card-header-row">
                <span className="card-heading">What are you deciding?</span>
                <span className="card-char-count">{question.length} / 240</span>
              </div>
              <textarea
                className="decision-textarea"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Should I quit my 9-to-5 and build a startup?"
                maxLength={240}
                rows={3}
              />
              <div className="category-pills-row" aria-label="Preset categories">
                {['Startup', 'Career move', 'Relationship', 'Money & risk', 'Creative project'].map((cat) => (
                  <button
                    key={cat}
                    className={`category-pill ${category === cat ? 'active' : ''}`}
                    onClick={() => {
                      setCategory(cat)
                      const preset = councilPresets.find(p => p.label.toLowerCase() === cat.toLowerCase())
                      if (preset) {
                        applyPreset(preset)
                      }
                    }}
                    type="button"
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="card-footer-row">
                <span className="card-footer-info">6 voices · ~2 min · 3 rounds</span>
                <button 
                  className="btn-convene" 
                  disabled={!question.trim()} 
                  onClick={() => setScreen('assembly')}
                  type="button"
                >
                  Convene the council <span className="arrow">→</span>
                </button>
              </div>
            </div>

            <div className="input-bottom-row">
              <span className="privacy-badge">🔒 Private by default — nothing is saved without you</span>
              <span className="divider-dot"></span>
              <span className="power-badge">Powered by a multi-agent reasoning model</span>
            </div>
          </div>

          <div className="input-hero-visual" aria-label="AI council chamber orbits preview">
            <div className="radial-blur-glow"></div>
            <div className="visual-circle-orbit">
              <div className="orbit-gradient-ring"></div>
              <div className="orbit-inner-bg"></div>
              <div className="orbit-dashed-ring"></div>
              <div className="orbit-center-call">
                <div className="center-call-icon">
                  <div className="center-call-dot"></div>
                </div>
                <span className="center-call-label">YOUR CALL</span>
              </div>
              <div className="orbit-agent bubble-m">M</div>
              <div className="orbit-agent bubble-s">S</div>
              <div className="orbit-agent bubble-18">18</div>
              <div className="orbit-agent bubble-f">F</div>
              <div className="orbit-agent bubble-mil">$</div>
              <div className="orbit-agent bubble-p">P</div>
            </div>
            <div className="orbit-labels-panel">
              <span className="labels-heading">Your council · {selectedAgentIds.length} voices</span>
              <div className="labels-grid">
                {allAgents.map((agent) => {
                  const meta = agentMeta[agent.id] || { bg: '#7A5AF0', letter: agent.name[0] }
                  const isSelected = selectedAgentIds.includes(agent.id)
                  return (
                    <div key={agent.id} className="label-item" style={{ opacity: isSelected ? 1 : 0.4 }}>
                      <div className="label-color-dot" style={{ backgroundColor: meta.bg }}></div>
                      <span className="label-name">{agent.name}</span>
                      <span className="label-seat">{agent.seat}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Screen 2: Assembly & Context Wizard */}
      {screen === 'assembly' && (
        <section className="screen-assembly-layout" aria-label="Assembly screen">
          <div className="assembly-left-panel">
            <div className="panel-heading">
              <div>
                <span className="mono-label">02 · Assembly</span>
                <h2>Choose the council voices</h2>
              </div>
              <span className="agent-count">
                <UsersRound size={16} aria-hidden="true" />
                {selectedAgents.length} Seats
              </span>
            </div>

            <div className="agent-selection-grid" aria-label="Agent selection grid">
              {allAgents.map((agent) => {
                const meta = agentMeta[agent.id] || { bg: '#7A5AF0', letter: agent.name[0] }
                const isSelected = selectedAgentIds.includes(agent.id)
                return (
                  <button
                    key={agent.id}
                    className="agent-select-card"
                    data-selected={isSelected}
                    onClick={() => toggleAgent(agent.id)}
                    type="button"
                  >
                    <div className="agent-select-avatar" style={{ backgroundColor: meta.bg }}>
                      {meta.letter}
                    </div>
                    <div className="agent-select-info">
                      <span className="agent-name">{agent.name}</span>
                      <span className="agent-seat">{agent.seat}</span>
                      <span className="agent-tone">{agent.tone}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="wildcard-form" aria-label="Custom agent form">
              <p className="mono-label">The Wildcard (Custom Seat)</p>
              <div className="wildcard-inputs-row">
                <input
                  value={wildcardName}
                  onChange={(e) => setWildcardName(e.target.value)}
                  placeholder="Steve Jobs"
                  aria-label="Custom agent name"
                />
                <input
                  value={wildcardTone}
                  onChange={(e) => setWildcardTone(e.target.value)}
                  placeholder="intense, taste-obsessed"
                  aria-label="Custom agent tone"
                />
                <input
                  value={wildcardProtects}
                  onChange={(e) => setWildcardProtects(e.target.value)}
                  placeholder="taste & brutal simplicity"
                  aria-label="Custom agent protects value"
                />
              </div>
              <button
                disabled={!wildcardName.trim() || !wildcardTone.trim() || !wildcardProtects.trim()}
                onClick={addWildcardAgent}
                className="btn-add-wildcard"
                type="button"
              >
                + Add Custom Seat
              </button>
            </div>
          </div>

          <div className="assembly-right-panel">
            <div className="stepper-wizard-card" aria-label="Context interview wizard">
              <div className="panel-heading">
                <div>
                  <span className="mono-label">Context interview</span>
                  <h2>Answer before the council votes</h2>
                </div>
                <div className="stepper-header-actions">
                  <button
                    type="button"
                    className="btn-text-only"
                    onClick={() => setCurrentStep(currentStep === 10 ? 0 : 10)}
                  >
                    {currentStep === 10 ? 'Go to Step 1' : 'Review Answers'}
                  </button>
                </div>
              </div>

              {currentStep < 10 ? (
                <div className="wizard-container">
                  <div className="wizard-progress-bar">
                    <div 
                      className="wizard-progress-fill" 
                      style={{ width: `${((currentStep + 1) / 10) * 100}%` }}
                    />
                  </div>

                  <div className="wizard-step-card">
                    <span className="wizard-step-indicator">Question {currentStep + 1} of 10</span>
                    <h3 className="wizard-question-text">{interviewQuestions[currentStep]}</h3>
                    
                    <div className="wizard-input-container">
                      <input
                        onChange={(event) =>
                          updateContextAnswer(currentStep, event.target.value)
                        }
                        placeholder="Type response or click record..."
                        value={userContext[currentStep]?.answer || ''}
                        disabled={transcribingIndex === currentStep}
                        className="wizard-input"
                      />
                      
                      <div className="wizard-audio-controls">
                        {transcribingIndex === currentStep ? (
                          <button type="button" className="btn-recording loading" disabled>
                            <Loader2 className="spin" size={18} aria-hidden="true" />
                            Transcribing...
                          </button>
                        ) : recordingIndex === currentStep ? (
                          <button type="button" className="btn-recording pulse" onClick={stopRecording}>
                            <MicOff size={18} aria-hidden="true" />
                            Stop Recording
                          </button>
                        ) : (
                          <button type="button" className="btn-mic" onClick={() => startRecording(currentStep)}>
                            <Mic size={18} aria-hidden="true" />
                            Record Answer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="wizard-navigation">
                    <button
                      type="button"
                      disabled={currentStep === 0}
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="btn-secondary"
                    >
                      <ChevronLeft size={16} aria-hidden="true" />
                      Back
                    </button>
                    <div className="wizard-nav-right">
                      <button
                        type="button"
                        onClick={() => {
                          updateContextAnswer(currentStep, '')
                          setCurrentStep(Math.min(10, currentStep + 1))
                        }}
                        className="btn-secondary btn-skip"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(currentStep + 1)}
                        className="btn-primary"
                      >
                        {currentStep === 9 ? 'Review Answers' : 'Next'}
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="review-container">
                  <div className="review-grid">
                    {userContext.map((item, index) => (
                      <div className="review-item" key={item.question}>
                        <div className="review-item-header">
                          <span>{index + 1}. {item.question}</span>
                          <div className="review-mic-wrap">
                            {transcribingIndex === index ? (
                              <Loader2 className="spin" size={14} aria-hidden="true" />
                            ) : recordingIndex === index ? (
                              <button type="button" className="btn-review-mic recording" onClick={stopRecording} title="Stop recording">
                                <MicOff size={14} aria-hidden="true" />
                              </button>
                            ) : (
                              <button type="button" className="btn-review-mic" onClick={() => startRecording(index)} title="Record audio">
                                <Mic size={14} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          onChange={(event) =>
                            updateContextAnswer(index, event.target.value)
                          }
                          placeholder="Unanswered (infer/ignore)"
                          value={item.answer}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="assembly-action-row">
                    <button 
                      className="btn-start-debate" 
                      disabled={isGenerating} 
                      onClick={startCouncil}
                      type="button"
                    >
                      {isGenerating ? 'Summoning Council...' : 'Start Council Debate →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Screen 3: Deliberation - Live Debate */}
      {screen === 'deliberating' && (
        <section className="screen-deliberation-layout" aria-label="Deliberation screen">
          <div className="deliberation-subheader">
            <div className="subheader-left">
              <span className="mono-label">On the table</span>
              <h2>{question}</h2>
            </div>
            <div className="subheader-right">
              <div className="progress-bars-group">
                <div className={`bar-step ${visibleBeatCount >= 1 ? 'active' : ''}`}></div>
                <div className={`bar-step ${visibleBeatCount >= 2 ? 'active' : ''}`}></div>
                <div className={`bar-step ${visibleBeatCount >= 3 ? 'active' : ''}`}></div>
              </div>
              <span className="round-indicator">
                Round {Math.min(3, Math.max(1, Math.ceil(visibleBeatCount / 1.5)))} / 3 · {isGenerating ? 'Summoning...' : `00:${(30 - (visibleBeatCount * 6)).toString().padStart(2, '0')}`}
              </span>
              <button className="btn-skip-verdict" onClick={() => setScreen('verdict')} type="button">
                Skip to verdict →
              </button>
            </div>
          </div>

          <div className="deliberation-mode-toggle">
            <button 
              className={`mode-btn ${debateViewMode === 'threaded' ? 'active' : ''}`}
              onClick={() => setDebateViewMode('threaded')}
              type="button"
            >
              Threaded Debate
            </button>
            <button 
              className={`mode-btn ${debateViewMode === 'roundtable' ? 'active' : ''}`}
              onClick={() => setDebateViewMode('roundtable')}
              type="button"
            >
              Round Table
            </button>
          </div>

          {debateViewMode === 'threaded' ? (
            <div className="deliberation-threaded-grid" aria-label="Threaded debate board">
              {/* Column 1: Voices Status */}
              <div className="voices-status-col">
                <span className="mono-label">The table · {selectedAgents.length} voices</span>
                <div className="voices-status-list">
                  {selectedAgents.map((agent) => {
                    const meta = agentMeta[agent.id] || { bg: '#7A5AF0', letter: agent.name[0] }
                    const activeBeat = visibleBeatCount > 0 ? councilResult.beats[visibleBeatCount - 1] : null
                    const isSpeaking = activeBeat?.speaker.toLowerCase() === agent.name.toLowerCase() ||
                                       activeBeat?.speaker.toLowerCase().includes(agent.name.toLowerCase())
                    const hasSpoken = visibleBeatCount > 0 && 
                      councilResult.beats.slice(0, visibleBeatCount - 1).some(b => 
                        b.speaker.toLowerCase() === agent.name.toLowerCase() ||
                        b.speaker.toLowerCase().includes(agent.name.toLowerCase())
                      )
                    
                    return (
                      <div key={agent.id} className={`voice-status-item ${isSpeaking ? 'speaking' : ''}`}>
                        <div className="voice-status-avatar" style={{ backgroundColor: meta.bg }}>
                          {meta.letter}
                        </div>
                        <div className="voice-status-info">
                          <span className="voice-name">{agent.name}</span>
                          <span className="voice-seat">{agent.seat}</span>
                        </div>
                        {isSpeaking ? (
                          <div className="speaking-audio-wave" aria-label="speaking animations">
                            <div className="wave-bar"></div>
                            <div className="wave-bar"></div>
                            <div className="wave-bar"></div>
                          </div>
                        ) : hasSpoken ? (
                          <span className="voice-status-badge spoke">SPOKE</span>
                        ) : (
                          <span className="voice-status-badge next">NEXT</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                <div className="tension-card">
                  <div className="tension-header">
                    <span className="mono-label">Disagreement</span>
                    <span className="tension-badge">High</span>
                  </div>
                  <div className="tension-progress-bar">
                    <div className="tension-progress-fill" style={{ width: '78%' }}></div>
                  </div>
                  <p className="tension-desc">Strong tension is good — it means the bet is being stress-tested from both sides.</p>
                </div>
              </div>

              {/* Column 2: Debate Bubble chain */}
              <div className="debate-bubbles-col">
                {councilResult.beats.slice(0, visibleBeatCount).map((beat, index) => {
                  const agentDetails = allAgents.find(
                    (a) => a.name.toLowerCase() === beat.speaker.toLowerCase() ||
                          a.name.toLowerCase().includes(beat.speaker.toLowerCase())
                  )
                  const meta = agentDetails ? agentMeta[agentDetails.id] : { bg: '#7A5AF0', letter: beat.speaker[0] }
                  
                  return (
                    <div key={index} className="debate-bubble-wrap message-pop">
                      <div className="debate-bubble-avatar" style={{ backgroundColor: meta.bg }}>
                        {meta.letter}
                      </div>
                      <div className="debate-bubble-body" style={{ borderLeftColor: meta.bg }}>
                        <div className="bubble-body-header">
                          <div className="bubble-header-left">
                            <span className="bubble-speaker">{beat.speaker}</span>
                            <span className="bubble-beat-label" style={{ color: meta.bg }}>{beat.label}</span>
                          </div>
                          <span className="bubble-time">0:{(index * 15).toString().padStart(2, '0')}</span>
                        </div>
                        <p className="bubble-text">{beat.text}</p>
                      </div>
                    </div>
                  )
                })}
                {isGenerating && (
                  <div className="debate-bubble-wrap thinking">
                    <div className="debate-bubble-avatar" style={{ backgroundColor: 'var(--muted)' }}>
                      ...
                    </div>
                    <div className="debate-bubble-body">
                      <p className="bubble-text">Listening... Council is preparing stances...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 3: Claims and tension points */}
              <div className="claims-tension-col">
                <span className="mono-label">Claims on table</span>
                <div className="claims-list">
                  {councilResult.beats.slice(0, visibleBeatCount).map((beat, index) => {
                    const agentDetails = allAgents.find(a => a.name.toLowerCase() === beat.speaker.toLowerCase() || a.name.toLowerCase().includes(beat.speaker.toLowerCase()))
                    const meta = agentDetails ? agentMeta[agentDetails.id] : { bg: '#7A5AF0', letter: beat.speaker[0] }
                    return (
                      <div key={index} className="claim-item-card message-pop">
                        <p className="claim-text">"{beat.text.slice(0, 45)}..."</p>
                        <div className="claim-speaker-row">
                          <div className="claim-dot" style={{ backgroundColor: meta.bg }}></div>
                          <span>{beat.speaker}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <span className="mono-label" style={{ marginTop: '1.5rem' }}>Points of tension</span>
                <div className="tension-points-list">
                  {visibleBeatCount >= 2 && (
                    <div className="tension-point-item message-pop">
                      <span className="tension-point-title">Quit now vs. test first</span>
                      <div className="tension-point-orbit-bar" aria-label="orbit graphics">
                        <span className="orbit-name">18-yo</span>
                        <div className="orbit-dashed-line"></div>
                        <span className="orbit-name">Mentor</span>
                      </div>
                    </div>
                  )}
                  {visibleBeatCount >= 4 && (
                    <div className="tension-point-item message-pop">
                      <span className="tension-point-title">Savings vs. safety net</span>
                      <div className="tension-point-orbit-bar" aria-label="orbit graphics">
                        <span className="orbit-name">Millionaire</span>
                        <div className="orbit-dashed-line"></div>
                        <span className="orbit-name">Parents</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* roundtable alternate view */
            <div className="deliberation-roundtable-layout" aria-label="Round table debate board">
              <div className="roundtable-diagram-container">
                <div className="roundtable-outer-ring"></div>
                <div className="roundtable-inner-dashed"></div>
                
                <div className="roundtable-center-dial">
                  <div className="center-dial-pulse"></div>
                  <span className="center-dial-delib">DELIBERATING</span>
                  <span className="center-dial-time">00:12</span>
                  <span className="center-dial-round">Round 2 of 3</span>
                </div>

                {selectedAgents.map((agent, i) => {
                  const meta = agentMeta[agent.id] || { bg: '#7A5AF0', letter: agent.name[0] }
                  const angle = (i * 360) / selectedAgents.length
                  const activeBeat = visibleBeatCount > 0 ? councilResult.beats[visibleBeatCount - 1] : null
                  const isSpeaking = activeBeat?.speaker.toLowerCase() === agent.name.toLowerCase() ||
                                     activeBeat?.speaker.toLowerCase().includes(agent.name.toLowerCase())
                  
                  return (
                    <div 
                      key={agent.id} 
                      className={`roundtable-node ${isSpeaking ? 'active' : ''}`}
                      style={{
                        transform: `rotate(${angle}deg) translate(180px) rotate(-${angle}deg)`,
                        backgroundColor: meta.bg
                      }}
                    >
                      {meta.letter}
                    </div>
                  )
                })}
              </div>

              {visibleBeatCount > 0 && (
                <div className="roundtable-floating-quote message-pop">
                  <div className="floating-quote-header">
                    <div className="floating-quote-avatar" style={{ 
                      backgroundColor: (allAgents.find(a => a.name.toLowerCase() === councilResult.beats[visibleBeatCount - 1].speaker.toLowerCase() || a.name.toLowerCase().includes(councilResult.beats[visibleBeatCount - 1].speaker.toLowerCase()))?.id ? agentMeta[allAgents.find(a => a.name.toLowerCase() === councilResult.beats[visibleBeatCount - 1].speaker.toLowerCase() || a.name.toLowerCase().includes(councilResult.beats[visibleBeatCount - 1].speaker.toLowerCase()))!.id]?.bg : 'var(--purple)')
                    }}>
                      {councilResult.beats[visibleBeatCount - 1].speaker[0]}
                    </div>
                    <div className="floating-quote-info">
                      <div className="floating-speaker-name">
                        <span>{councilResult.beats[visibleBeatCount - 1].speaker}</span>
                        <span className="speaking-badge-pill">SPEAKING</span>
                      </div>
                      <span className="floating-beat-label">{councilResult.beats[visibleBeatCount - 1].label}</span>
                    </div>
                  </div>
                  <p className="floating-quote-text">"{councilResult.beats[visibleBeatCount - 1].text}"</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Screen 4: Verdict Page */}
      {screen === 'verdict' && (
        <section className="screen-verdict-layout" aria-label="Verdict screen">
          <div className="verdict-top-banner">
            <div className="verdict-banner-left">
              <div className="verdict-banner-header">
                <span className="mono-label">The council has decided</span>
                <span className="verdict-decision-badge">
                  {averageAgreement && averageAgreement >= 70 ? 'CONDITIONAL GO' : 'HOLD / RE-EVALUATE'}
                </span>
              </div>
              <h2 className="verdict-title-text">{councilResult.verdict.decision}</h2>
              <div className="verdict-sub-info">
                On: <strong>{question}</strong> · {selectedAgents.length} voices · 3 rounds · ~2 min
              </div>
            </div>
            <div className="verdict-banner-right">
              <span className="mono-label">Confidence</span>
              <div className="confidence-score-value">
                {averageAgreement && averageAgreement >= 75 ? 'High' : averageAgreement && averageAgreement >= 50 ? 'Medium-high' : 'Low'}
              </div>
              <div className="confidence-dots-row">
                <div className={`conf-dot ${averageAgreement && averageAgreement >= 20 ? 'active' : ''}`}></div>
                <div className={`conf-dot ${averageAgreement && averageAgreement >= 45 ? 'active' : ''}`}></div>
                <div className={`conf-dot ${averageAgreement && averageAgreement >= 65 ? 'active' : ''}`}></div>
                <div className={`conf-dot ${averageAgreement && averageAgreement >= 80 ? 'active' : ''}`}></div>
                <div className={`conf-dot ${averageAgreement && averageAgreement >= 90 ? 'active' : ''}`}></div>
              </div>
              <p className="confidence-explanation">
                {averageAgreement && averageAgreement >= 70 
                  ? 'Strong agreement on the path; proceed under conditions.' 
                  : 'Split council; evaluate concerns before proceeding.'}
              </p>
            </div>
          </div>

          <div className="verdict-bottom-grid">
            {/* Left Side: Detail Cards & Checklist */}
            <div className="verdict-left-detail-col">
              <div className="verdict-details-grid">
                <div className="detail-card cond-card">
                  <span className="mono-label">Conditions to meet</span>
                  <p className="detail-card-text">{councilResult.verdict.conditions}</p>
                </div>
                <div className="detail-card move-card">
                  <span className="mono-label">First 24-hour move</span>
                  <p className="detail-card-text">{councilResult.verdict.firstMove}</p>
                </div>
              </div>

              <span className="mono-label" style={{ marginTop: '1.5rem', display: 'block' }}>
                The 30-day proof sprint timeline
              </span>
              <div className="sprint-timeline-checklist">
                <div className="sprint-step">
                  <div className="sprint-step-number" style={{ background: 'linear-gradient(135deg, #4F7CF7, #7A5AF0)' }}>1</div>
                  <div className="sprint-step-content">
                    <span className="step-days">DAYS 1–3</span>
                    <h4 className="step-title">Put a real price on it</h4>
                    <p className="step-desc">Write one concrete paid offer and send it to five real prospects. Chase a yes, not feedback.</p>
                  </div>
                </div>
                <div className="sprint-step">
                  <div className="sprint-step-number" style={{ background: 'linear-gradient(135deg, #7A5AF0, #C66AC9)' }}>2</div>
                  <div className="sprint-step-content">
                    <span className="step-days">DAYS 4–21</span>
                    <h4 className="step-title">Get to three buying conversations</h4>
                    <p className="step-desc">Run it on nights and weekends. Keep the salary; spend evenings, not savings.</p>
                  </div>
                </div>
                <div className="sprint-step">
                  <div className="sprint-step-number" style={{ background: 'linear-gradient(135deg, #C66AC9, #E26AC9)' }}>3</div>
                  <div className="sprint-step-content">
                    <span className="step-days">DAY 30 · THE BAR TO QUIT</span>
                    <h4 className="step-title">Decide on evidence, not mood</h4>
                    <p className="step-desc">Quit only if you have 5 paid signups or 2 signed pilots — and at least 6 months of runway left.</p>
                  </div>
                </div>
              </div>

              <div className="verdict-flip-card">
                <div className="flip-warning-avatar">!</div>
                <div className="flip-content">
                  <span className="flip-title">WHAT WOULD FLIP THIS TO A NO</span>
                  <p className="flip-desc">
                    Zero paid interest after outreach, runway under 4 months, or the plan only works if you quit first. Then stay, and build on the side.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side: Voting stats & Quote cards */}
            <div className="verdict-right-voting-col">
              <span className="mono-label">How the council voted</span>
              
              <div className="vote-segment-bar">
                <div className="vote-fill-segment" style={{ flex: voteCounts.go || 1, backgroundColor: 'var(--green)' }}></div>
                <div className="vote-fill-segment" style={{ flex: voteCounts.cond || 1, background: 'linear-gradient(90deg, var(--yellow), var(--purple))' }}></div>
                <div className="vote-fill-segment" style={{ flex: voteCounts.hold || 1, backgroundColor: 'var(--parents)' }}></div>
              </div>

              <div className="vote-labels-row">
                <span><b style={{ color: 'var(--green)' }}>{voteCounts.go}</b> go now</span>
                <span><b style={{ color: 'var(--yellow)' }}>{voteCounts.cond}</b> conditional</span>
                <span><b style={{ color: 'var(--parents)' }}>{voteCounts.hold}</b> hold</span>
              </div>

              <div className="agent-verdict-quotes-list">
                {councilResult.alignment ? (
                  councilResult.alignment.map((align) => {
                    const agentDetails = allAgents.find(
                      (a) => a.name.toLowerCase() === align.agent.toLowerCase() ||
                             a.name.toLowerCase().includes(align.agent.toLowerCase())
                    )
                    const meta = agentDetails ? agentMeta[agentDetails.id] : { bg: '#7A5AF0', letter: align.agent[0] }
                    const voteLabel = align.agreement >= 75 ? 'GO' : align.agreement >= 45 ? 'COND.' : 'HOLD'
                    const voteClass = align.agreement >= 75 ? 'go' : align.agreement >= 45 ? 'cond' : 'hold'
                    
                    return (
                      <div key={align.agent} className="agent-quote-card">
                        <div className="quote-card-avatar" style={{ backgroundColor: meta.bg }}>
                          {meta.letter}
                        </div>
                        <div className="quote-card-main">
                          <div className="quote-card-header">
                            <span className="quote-agent-name">{align.agent}</span>
                            <span className={`quote-vote-pill ${voteClass}`}>{voteLabel}</span>
                          </div>
                          <p className="quote-card-phrase">"{align.keyConcerns}"</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  selectedAgents.slice(0, 4).map((agent) => {
                    const meta = agentMeta[agent.id] || { bg: '#7A5AF0', letter: agent.name[0] }
                    return (
                      <div key={agent.id} className="agent-quote-card">
                        <div className="quote-card-avatar" style={{ backgroundColor: meta.bg }}>
                          {meta.letter}
                        </div>
                        <div className="quote-card-main">
                          <div className="quote-card-header">
                            <span className="quote-agent-name">{agent.name}</span>
                            <span className="quote-vote-pill cond">COND.</span>
                          </div>
                          <p className="quote-card-phrase">"{agent.stance}"</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="verdict-action-group">
                <div className="verdict-save-row">
                  <button 
                    className="btn-save-verdict" 
                    onClick={() => alert('Verdict saved to history local storage.')}
                    type="button"
                  >
                    Save verdict
                  </button>
                  <button 
                    className="btn-share-icon" 
                    onClick={() => alert('Copied verdict link to clipboard.')}
                    type="button"
                  >
                    ↗
                  </button>
                </div>
                <button 
                  className="btn-run-again" 
                  onClick={() => setScreen('input')}
                  type="button"
                >
                  ↺ Run again with new context
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
      <footer className="app-footer" style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', padding: '24px 0 40px' }}>
        <span>{statusMessage}</span>
      </footer>
    </main>
  )
}

export default App;
