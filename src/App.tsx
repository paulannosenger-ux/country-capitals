import { useCallback, useMemo, useState } from 'react'
import WorldMap from './map/WorldMap'
import Settings from './pages/Settings'
import Stats from './pages/Stats'
import StudyView from './study/StudyView'
import MapQuiz from './quiz/MapQuiz'
import { CONTINENTS, countries, countriesIn, countryById, displayName, type Continent } from './data/countries'
import { countsFor, learnedCount, store, useProgress } from './progress/progress'
import { computeStats } from './progress/stats'
import { currentTheme, setTheme } from './theme'

type View = 'home' | 'quiz' | 'settings' | 'stats'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [continent, setContinent] = useState<Continent | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  // studying: null = not studying; otherwise the scope (a continent, or null = all continents mixed)
  // practice = one full round through every country of the scope, ignoring what is due
  const [studying, setStudying] = useState<{ scope: Continent | null; practice: boolean } | null>(null)
  const [theme, setThemeState] = useState(currentTheme)
  const version = useProgress() // re-render when progress changes

  // Tap on a country: on the world view it selects the country's continent;
  // inside a continent it just highlights the country.
  const onPickCountry = useCallback(
    (id: string) => {
      const c = countryById.get(id)!
      if (!continent) setContinent(c.continent)
      setFocusId(id)
    },
    [continent],
  )

  const chooseContinent = (c: Continent | null) => {
    setContinent(c)
    setFocusId(null)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => computeStats(store, Date.now()), [version])

  let page: React.ReactNode
  if (studying) {
    page = (
      <StudyView
        key={`${studying.scope}:${studying.practice}`} // fresh session when switching to practice
        continent={studying.scope}
        practice={studying.practice}
        onPractice={() => setStudying({ scope: studying.scope, practice: true })}
        onExit={() => setStudying(null)}
      />
    )
  } else if (view === 'quiz') {
    page = <MapQuiz initialContinent={continent} />
  } else if (view === 'settings') {
    page = <Settings onBack={() => setView('home')} />
  } else if (view === 'stats') {
    page = <Stats onBack={() => setView('home')} />
  } else {
    const focus = focusId ? countryById.get(focusId) : null
    const counts = countsFor(continent)
    const all = countsFor(null)
    const due = all.due + all.learning
    const total = continent ? countriesIn(continent).length : 0
    const learned = continent ? learnedCount(continent) : 0
    page = (
      <>
        <section className="hero">
          <h1>Every country.<br />Every capital.</h1>
          <p className="lede">Learn the world one continent at a time, with spaced repetition that remembers what you don’t.</p>
          <dl className="figures">
            <div><dd>{stats.learned}<small>/{stats.total}</small></dd><dt>Learned</dt></div>
            <div><dd>{stats.mastered}</dd><dt>Mastered</dt></div>
            <div><dd>{stats.streak}</dd><dt>Day streak</dt></div>
            <div><dd className={due > 0 ? 'accent' : ''}>{due}</dd><dt>Due today</dt></div>
          </dl>
        </section>

        <div className="home">
          <div className="map-card card-surface">
            <WorldMap continent={continent} focusId={focusId} onPickCountry={onPickCountry} />
            {continent && <button className="pill back" onClick={() => chooseContinent(null)}>← World</button>}
            {focus && <div className="target-label">{displayName(focus)}</div>}
            <div className="legend">
              <span><i className="sw new" />New</span>
              <span><i className="sw learning" />Learning</span>
              <span><i className="sw mastered" />Mastered</span>
            </div>
          </div>

          <section className="continents" aria-label="Continents">
            {CONTINENTS.map((c) => {
              const n = countriesIn(c).length
              const l = learnedCount(c)
              const k = countsFor(c)
              return (
                <button key={c} className={'cont card-surface' + (c === continent ? ' active' : '')} onClick={() => chooseContinent(c)}>
                  <span className="cont-name">{c}</span>
                  <span className="cont-meta">{l} / {n}{k.due + k.learning > 0 && <em> · {k.due + k.learning} due</em>}</span>
                  <span className="bar"><span style={{ width: `${(l / n) * 100}%` }} /></span>
                </button>
              )
            })}
          </section>

          <aside className="side">
            <section className="mission card-surface">
              {continent ? (
                <>
                  <p className="eyebrow">Selected</p>
                  <h2>{continent}</h2>
                  <p className="muted">{learned} of {total} learned</p>
                  <span className="bar big"><span style={{ width: `${(learned / total) * 100}%` }} /></span>
                  <div className="counts">
                    <span className="n new">{counts.new}<small>New</small></span>
                    <span className="n learning">{counts.learning}<small>Learning</small></span>
                    <span className="n due">{counts.due}<small>Due</small></span>
                  </div>
                  <button className="btn engage" onClick={() => setStudying({ scope: continent, practice: false })}>
                    Start studying <small>{counts.new + counts.learning + counts.due > 0 ? `${counts.new + counts.learning + counts.due} cards for today` : 'Nothing due right now'}</small>
                  </button>
                  <button className="btn ghost engage" onClick={() => setStudying({ scope: continent, practice: true })}>
                    Practice all {total} <small>One full round, any time</small>
                  </button>
                  <button className="btn ghost engage" onClick={() => setView('quiz')}>
                    Map quiz <small>Find every country on a blank map</small>
                  </button>
                </>
              ) : (
                <>
                  <p className="eyebrow">Get started</p>
                  <h2>Choose a continent</h2>
                  <p className="muted">Tap one on the map or in the list, then start studying.</p>
                  <button className="btn ghost" onClick={() => setStudying({ scope: null, practice: false })}>
                    Mixed review <small>{Math.min(countries.length, all.new + all.learning + all.due)} cards across all continents</small>
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <button className="wordmark" onClick={() => { setStudying(null); setView('home') }} aria-label="Home">
            <svg className="logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" /><ellipse cx="12" cy="12" rx="4" ry="9.5" /><path d="M2.5 12h19" />
            </svg>
            <span className="wm-text">Capitals</span>
          </button>
          <nav className="tabs" aria-label="Mode">
            <button className={'tab' + (view !== 'quiz' || studying ? ' on' : '')} onClick={() => { setStudying(null); setView('home') }}
              aria-current={view !== 'quiz' || studying ? 'page' : undefined}>Learn</button>
            <button className={'tab' + (view === 'quiz' && !studying ? ' on' : '')} onClick={() => { setStudying(null); setView('quiz') }}
              aria-current={view === 'quiz' && !studying ? 'page' : undefined}>Map quiz</button>
          </nav>
          <nav className="nav-actions">
            <button className="nav-btn" onClick={() => { setStudying(null); setView('stats') }} aria-label="Stats">Stats</button>
            <button className="nav-btn" onClick={() => { setStudying(null); setView('settings') }} aria-label="Settings">Settings</button>
            <button className="nav-btn icon" aria-label="Toggle dark mode" title="Toggle dark mode"
              onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); setThemeState(t) }}>{theme === 'dark' ? '☀︎' : '☾'}</button>
          </nav>
        </div>
      </header>
      <main className={studying ? 'app-study' : view === 'quiz' ? 'app-quiz' : 'app'}>{page}</main>
    </>
  )
}
