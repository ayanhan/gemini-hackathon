import { useEffect, useState } from 'react'
import './Landing.css'
import mentorImg from './assets/personas/mentor.jpg'
import buddyImg from './assets/personas/buddy.jpg'
import eighteenImg from './assets/personas/eighteen.jpg'
import failedImg from './assets/personas/failed.jpg'
import millionaireImg from './assets/personas/millionaire.jpg'
import parentsImg from './assets/personas/parents.jpg'

const accentPhrases = [
  'every version of you.',
  'your scared parents.',
  'your sarcastic buddy.',
  'your mentor.',
  'your 18-year-old self.',
  'your millionaire self.',
]

const seats = [
  { name: 'Mentor', image: mentorImg },
  { name: 'Sarcastic buddy', image: buddyImg },
  { name: '18-year-old you', image: eighteenImg },
  { name: 'Failed future you', image: failedImg },
  { name: 'Millionaire you', image: millionaireImg },
  { name: 'Scared parents', image: parentsImg },
]

function Landing({ onEnter }: { onEnter: () => void }) {
  const [accentIndex, setAccentIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAccentIndex((current) => (current + 1) % accentPhrases.length)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main className="landing">
      <div className="landing-content">
        <div className="landing-mark" aria-hidden="true">
          <div className="landing-mark-inner">
            <div className="landing-mark-dot" />
          </div>
        </div>

        <span className="landing-eyebrow">Six voices · One verdict</span>

        <h1 className="landing-title">
          Put your hardest decision in front of
          <span className="landing-rotator">
            <span key={accentIndex} className="landing-accent">
              {accentPhrases[accentIndex]}
            </span>
          </span>
        </h1>

        <p className="landing-sub">
          venn convenes a council of your inner voices. They debate from opposing
          viewpoints, challenge your blind spots, and return one practical
          verdict — in about two minutes.
        </p>

        <button className="landing-cta" type="button" onClick={onEnter}>
          Convene your council <span className="landing-cta-arrow">→</span>
        </button>

        <div className="landing-seats">
          {seats.map((seat) => (
            <span key={seat.name} className="landing-seat">
              <img className="landing-seat-img" src={seat.image} alt={seat.name} />
            </span>
          ))}
        </div>

        <p className="landing-foot">
          Private by default · Powered by a multi-agent reasoning model
        </p>
      </div>
    </main>
  )
}

export default Landing
