import { computeStats } from '../progress/stats'
import { store, useProgress } from '../progress/progress'
import { useT } from '../i18n'

export default function Stats({ onBack }: { onBack: () => void }) {
  useProgress()
  const t = useT()
  const s = computeStats(store, Date.now())
  const maxDay = Math.max(1, ...s.last14.map((d) => d.count))

  return (
    <section className="settings stats">
      <div className="page-head">
        <button className="pill" onClick={onBack}>{t.back}</button>
        <h1 className="page-title">{t.stats}</h1>
      </div>

      <div className="tiles">
        <div className="tile card-surface"><b>{s.learned}<small>/{s.total}</small></b><span>{t.countriesLearned}</span></div>
        <div className="tile card-surface"><b>{s.mastered}</b><span>{t.masteredDays}</span></div>
        <div className="tile card-surface">
          <b>{s.retention === null ? '–' : `${s.retention}%`}</b>
          <span>{t.retention}{s.retentionSample > 0 && t.nReviews(s.retentionSample)}</span>
        </div>
        <div className="tile card-surface"><b>{s.streak} 🔥</b><span>{t.streakBest(s.longestStreak)}</span></div>
      </div>

      <div className="panel card-surface">
        <h3>{t.last14}</h3>
        <div className="chart" role="img" aria-label={`${t.reviewsPerDayAria}: ${s.last14.map((d) => d.count).join(', ')}`}>
          {s.last14.map((d, i) => (
            <div key={d.day} className="col" title={String(d.count)}>
              <div className={'bar-v' + (i === 13 ? ' today' : '')} style={{ height: `${(d.count / maxDay) * 100}%` }} />
            </div>
          ))}
        </div>
        <p className="muted">{t.todayTotal(s.reviewsToday, s.totalReviews)}</p>
      </div>

      <div className="panel card-surface">
        <h3>{t.perContinent}</h3>
        {s.perContinent.map((c) => (
          <div key={c.continent} className="cont-row">
            <div className="cont-head"><span>{t.continent(c.continent)}</span><span className="muted">{t.learnedSlash(c.learned, c.total)}</span></div>
            <div className="stack" role="img" aria-label={`${c.mastered} ${t.legendMastered}, ${c.learning} ${t.legendLearning}, ${c.new} ${t.legendNew}`}>
              <span style={{ width: `${(c.mastered / c.total) * 100}%`, background: 'var(--c-mastered)' }} />
              <span style={{ width: `${(c.learning / c.total) * 100}%`, background: 'var(--c-learning)' }} />
            </div>
          </div>
        ))}
        <p className="muted legend-line">
          <i style={{ background: 'var(--c-mastered)' }} />{t.legendMastered} <i style={{ background: 'var(--c-learning)' }} />{t.legendLearning} <i style={{ background: 'var(--line-strong)' }} />{t.legendNew}
        </p>
      </div>
    </section>
  )
}
