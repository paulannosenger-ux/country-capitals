import { computeStats } from '../progress/stats'
import { store, useProgress } from '../progress/progress'

export default function Stats({ onBack }: { onBack: () => void }) {
  useProgress()
  const s = computeStats(store, Date.now())
  const maxDay = Math.max(1, ...s.last14.map((d) => d.count))

  return (
    <section className="settings stats">
      <div className="page-head">
        <button className="pill" onClick={onBack}>← Back</button>
        <h1 className="page-title">Stats</h1>
      </div>

      <div className="tiles">
        <div className="tile card-surface"><b>{s.learned}<small>/{s.total}</small></b><span>Countries learned</span></div>
        <div className="tile card-surface"><b>{s.mastered}</b><span>Mastered (21+ days)</span></div>
        <div className="tile card-surface">
          <b>{s.retention === null ? '–' : `${s.retention}%`}</b>
          <span>Retention{s.retentionSample > 0 && ` (${s.retentionSample} reviews)`}</span>
        </div>
        <div className="tile card-surface"><b>{s.streak} 🔥</b><span>Day streak (best {s.longestStreak})</span></div>
      </div>

      <div className="panel card-surface">
        <h3>Reviews · last 14 days</h3>
        <div className="chart" role="img" aria-label={`Reviews per day: ${s.last14.map((d) => d.count).join(', ')}`}>
          {s.last14.map((d, i) => (
            <div key={d.day} className="col" title={`${d.count} reviews`}>
              <div className={'bar-v' + (i === 13 ? ' today' : '')} style={{ height: `${(d.count / maxDay) * 100}%` }} />
            </div>
          ))}
        </div>
        <p className="muted">{s.reviewsToday} today · {s.totalReviews} in total</p>
      </div>

      <div className="panel card-surface">
        <h3>Progress per continent</h3>
        {s.perContinent.map((c) => (
          <div key={c.continent} className="cont-row">
            <div className="cont-head"><span>{c.continent}</span><span className="muted">{c.learned}/{c.total} learned</span></div>
            <div className="stack" role="img" aria-label={`${c.mastered} mastered, ${c.learning} learning, ${c.new} new`}>
              <span style={{ width: `${(c.mastered / c.total) * 100}%`, background: 'var(--c-mastered)' }} />
              <span style={{ width: `${(c.learning / c.total) * 100}%`, background: 'var(--c-learning)' }} />
            </div>
          </div>
        ))}
        <p className="muted legend-line">
          <i style={{ background: 'var(--c-mastered)' }} />mastered <i style={{ background: 'var(--c-learning)' }} />learning <i style={{ background: 'var(--line-strong)' }} />new
        </p>
      </div>
    </section>
  )
}
