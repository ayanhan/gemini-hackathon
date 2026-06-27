import './Landing.css'

const seats = [
  { letter: 'M', color: 'var(--mentor)' },
  { letter: 'S', color: 'var(--buddy)' },
  { letter: '18', color: 'var(--eighteen)' },
  { letter: 'F', color: 'var(--failed)' },
  { letter: '$', color: 'var(--millionaire)' },
  { letter: 'P', color: 'var(--parents)' },
]

function Landing({ onEnter }: { onEnter: () => void }) {
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
          Put your hardest decision in front of{' '}
          <span className="landing-accent">every version of you.</span>
        </h1>

        <p className="landing-sub">
          venn convenes a council of your inner voices. They debate from opposing
          viewpoints, challenge your blind spots, and return one practical
          verdict — in about two minutes.
        </p>

        <button className="landing-cta" type="button" onClick={onEnter}>
          Convene your council <span className="landing-cta-arrow">→</span>
        </button>

        <div className="landing-seats" aria-hidden="true">
          {seats.map((seat) => (
            <span
              key={seat.letter}
              className="landing-seat"
              style={{ backgroundColor: seat.color }}
            >
              {seat.letter}
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
