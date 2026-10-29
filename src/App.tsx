import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import WorldMap from './map/WorldMap'
import Settings from './pages/Settings'
import Stats from './pages/Stats'
import Friends from './pages/Friends'
import { cloudEnabled, useAccount, useMatches, useQuizDuels } from './cloud/cloud'
import GamesView from './games/GamesView'
import { matchState } from './games/duels'
import StudyView from './study/StudyView'
import MapQuiz from './quiz/MapQuiz'
// loaded only when the tab is opened (it brings ~360 KB of river/lake/mountain shapes)
const NatureView = lazy(() => import('./nature/NatureView'))
import { CONTINENTS, REGIONS, countries, countriesInArea, countryById, displayName, type Area, type Continent, type Region } from './data/countries'
import { setLang, useLang, useT } from './i18n'
import { countsFor, learnedCount, setDirection, type Direction, store, useDirection, useProgress } from './progress/progress'
import { computeStats } from './progress/stats'
import { currentTheme, setTheme } from './theme'
import { useDevice } from './device'

type View = 'home' | 'quiz' | 'nature' | 'games' | 'settings' | 'stats' | 'friends'

/** A shared duel link (?duel=ID) opens the Play tab with that duel. */
function duelFromUrl(): string | null {
  return new URLSearchParams(location.search).get('duel')
}

export default function App() {
  const [joinId, setJoinId] = useState(duelFromUrl)
  const [view, setView] = useState<View>(() => (joinId ? 'games' : 'home'))
  const onJoinHandled = useCallback(() => {
    setJoinId(null)
    history.replaceState(null, '', location.pathname) // remove ?duel=... from the address
  }, [])
  const account = useAccount()
  const matches = useMatches()
  const quizDuels = useQuizDuels()
  const myTurn = account.status === 'signedIn'
    ? (matches ?? []).filter((m) => matchState(m, account.uid) === 'yourTurn').length + (quizDuels ?? []).filter((d) => d.turn === account.uid).length
    : 0
  const [continent, setContinent] = useState<Continent | null>(null)
  // Africa can be split into regions (North / West / East / South); null = the whole continent
  const [region, setRegion] = useState<Region | null>(null)
  const scope: Area | null = region ?? continent
  const [focusId, setFocusId] = useState<string | null>(null)
  // studying: null = not studying; otherwise the scope (a continent, or null = all continents mixed)
  // practice = one full round through every country of the scope, ignoring what is due
  const [studying, setStudying] = useState<{ scope: Area | null; practice: boolean } | null>(null)
  const [theme, setThemeState] = useState(currentTheme)
  const version = useProgress() // re-render when progress changes
  const direction = useDirection() // country -> capital, or capital -> country (separate decks)
  const t = useT()
  const lang = useLang()
  const device = useDevice() // desktop, or phone/tablet (own layout, tab bar at the bottom)

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
    setRegion(null)
    setFocusId(null)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => computeStats(store, Date.now(), direction), [version, direction])

  let page: React.ReactNode
  if (studying) {
    page = (
      <StudyView
        key={`${studying.scope}:${studying.practice}:${direction}`} // fresh session when switching to practice
        continent={studying.scope}
        practice={studying.practice}
        direction={direction}
        onPractice={() => setStudying({ scope: studying.scope, practice: true })}
        onExit={() => setStudying(null)}
      />
    )
  } else if (view === 'quiz') {
    page = <MapQuiz initialContinent={scope} />
  } else if (view === 'nature') {
    page = <Suspense fallback={null}><NatureView initialContinent={continent} /></Suspense>
  } else if (view === 'settings') {
    page = <Settings onBack={() => setView('home')} />
  } else if (view === 'stats') {
    page = <Stats onBack={() => setView('home')} />
  } else if (view === 'games') {
    page = <GamesView joinId={joinId} onJoinHandled={onJoinHandled} onOpenFriends={() => setView('friends')} />
  } else if (view === 'friends') {
    page = <Friends onBack={() => setView('home')} />
  } else {
    const focus = focusId ? countryById.get(focusId) : null
    const counts = countsFor(scope)
    const all = countsFor(null)
    const due = all.due + all.learning
    const total = scope ? countriesInArea(scope).length : 0
    const learned = scope ? learnedCount(scope) : 0
    // the building blocks of the start page; desktop and mobile arrange them differently
    const figures = (
      <dl className="figures">
        <div><dd>{stats.learned}<small>/{stats.total}</small></dd><dt>{t.learned}</dt></div>
        <div><dd>{stats.mastered}</dd><dt>{t.mastered}</dt></div>
        <div><dd>{stats.streak}</dd><dt>{t.dayStreak}</dt></div>
        <div><dd className={due > 0 ? 'accent' : ''}>{due}</dd><dt>{t.dueToday}</dt></div>
      </dl>
    )
    const mapContent = (
      <>
        <WorldMap fill globe continent={scope} focusId={focusId} onPickCountry={onPickCountry} />
        {continent && <button className="pill back" onClick={() => chooseContinent(null)}>{t.world}</button>}
        {focus && <div className="target-label">{displayName(focus, lang)}</div>}
        <div className="legend">
          <span><i className="sw new" />{t.statusNew}</span>
          <span><i className="sw learning" />{t.statusLearning}</span>
          <span><i className="sw mastered" />{t.statusMastered}</span>
        </div>
      </>
    )
    const continentCards = (
      <section className="continents" aria-label={t.continentLabel}>
        {CONTINENTS.map((c) => {
          const n = countriesInArea(c).length
          const l = learnedCount(c)
          const k = countsFor(c)
          return (
            <button key={c} className={'cont card-surface' + (c === continent ? ' active' : '')} onClick={() => chooseContinent(c)}>
              <span className="cont-name">{t.continent(c)}</span>
              <span className="cont-meta">{l} / {n}{k.due + k.learning > 0 && <em> · {t.nDue(k.due + k.learning)}</em>}</span>
              <span className="bar"><span style={{ width: `${(l / n) * 100}%` }} /></span>
            </button>
          )
        })}
      </section>
    )
    // desktop: the continents sit inside the panel (phones/tablets have their own swipe row)
    const continentsInPanel = device === 'desktop' ? continentCards : null
    const chooseWords = t.chooseContinent.split(' ')
    const mission = (
      <section className="mission card-surface">
        {continent ? (
          <>
            <p className="eyebrow">{t.selected}</p>
            <h2 className="picked">{t.continent(scope!)}</h2>
            <DirectionSwitch />
            {continentsInPanel}
            {continent === 'Africa' && (
              <div className="region-pick" role="group" aria-label={t.africaRegions}>
                <button className={region === null ? 'on' : ''} aria-pressed={region === null} onClick={() => { setRegion(null); setFocusId(null) }}>
                  {t.allOfAfrica}<small>{countriesInArea('Africa').length}</small>
                </button>
                {REGIONS.map((r) => (
                  <button key={r} className={region === r ? 'on' : ''} aria-pressed={region === r} onClick={() => { setRegion(r); setFocusId(null) }}>
                    {t.regionShort[r]}<small>{learnedCount(r)}/{countriesInArea(r).length}</small>
                  </button>
                ))}
              </div>
            )}
            {continent === 'Africa' && region === null && <p className="muted region-hint">{t.regionsHint}</p>}
            <p className="muted">{t.learnedOf(learned, total)}</p>
            <span className="bar big"><span style={{ width: `${(learned / total) * 100}%` }} /></span>
            <div className="counts">
              <span className="n new">{counts.new}<small>{t.countNew}</small></span>
              <span className="n learning">{counts.learning}<small>{t.countLearning}</small></span>
              <span className="n due">{counts.due}<small>{t.countDue}</small></span>
            </div>
            <button className="btn engage" onClick={() => setStudying({ scope, practice: false })}>
              {t.startStudying} <small>{counts.new + counts.learning + counts.due > 0 ? t.cardsForToday(counts.new + counts.learning + counts.due) : t.nothingDue}</small>
            </button>
            <button className="btn ghost engage" onClick={() => setStudying({ scope, practice: true })}>
              {t.practiceAll(total)} <small>{t.practiceAllSub}</small>
            </button>
            <button className="btn ghost engage" onClick={() => setView('quiz')}>
              {t.mapQuiz} <small>{t.mapQuizSub}</small>
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">{t.getStarted}</p>
            {/* the last word ("continent") in green */}
            <h2>{chooseWords.slice(0, -1).join(' ')} <em>{chooseWords[chooseWords.length - 1]}</em></h2>
            <p className="muted">{t.chooseHint}</p>
            <DirectionSwitch />
            {continentsInPanel}
            <button className="btn ghost" onClick={() => setStudying({ scope: null, practice: false })}>
              {t.mixedReview} <small>{t.mixedSub(Math.min(countries.length, all.new + all.learning + all.due))}</small>
            </button>
          </>
        )}
      </section>
    )
    page = device === 'desktop' ? (
      <>
        {/* compact header strip, then the big map; on the right one tall panel (with the continents in it) */}
        <section className="hero">
          <div className="hero-text">
            <h1>{t.heroLine1} {t.heroLine2}</h1>
            <p className="lede">{t.lede}</p>
          </div>
          {figures}
        </section>
        <div className="home">
          <div className="map-card card-surface">{mapContent}</div>
          <aside className="side"><div className="side-inner">{mission}</div></aside>
        </div>
      </>
    ) : (
      // phones + tablets: the map edge to edge, then figures, a swipeable row of continents, the panel
      <div className={'m-home' + (continent ? ' zoomed' : '')}>
        <div className="m-map">{mapContent}</div>
        <div className="m-body">
          {figures}
          {continentCards}
          {mission}
        </div>
        {/* phones: the panel is further down, so "start" also floats above the tab bar */}
        {continent && (
          <button className="btn m-start" onClick={() => setStudying({ scope, practice: false })}>
            {t.startStudying} · {t.continent(scope!)}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <button className="wordmark" onClick={() => { setStudying(null); setView('home') }} aria-label={t.home}>
            <svg className="logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" /><ellipse cx="12" cy="12" rx="4" ry="9.5" /><path d="M2.5 12h19" />
            </svg>
            <span className="wm-text">{t.brand}</span>
          </button>
          {device === 'desktop' && <nav className="tabs" aria-label={t.learn + " / " + t.mapQuiz}>
            <button className={'tab' + (!['quiz', 'nature', 'games'].includes(view) || studying ? ' on' : '')} onClick={() => { setStudying(null); setView('home') }}
              aria-current={!['quiz', 'nature', 'games'].includes(view) || studying ? 'page' : undefined}>{t.learn}</button>
            <button className={'tab' + (view === 'quiz' && !studying ? ' on' : '')} onClick={() => { setStudying(null); setView('quiz') }}
              aria-current={view === 'quiz' && !studying ? 'page' : undefined}>
              <span className="tab-long">{t.mapQuiz}</span><span className="tab-short">{t.mapQuizShort}</span>
            </button>
            <button className={'tab' + (view === 'nature' && !studying ? ' on' : '')} onClick={() => { setStudying(null); setView('nature') }}
              aria-current={view === 'nature' && !studying ? 'page' : undefined}>{t.nature}</button>
            <button className={'tab' + (view === 'games' && !studying ? ' on' : '')} onClick={() => { setStudying(null); setView('games') }}
              aria-current={view === 'games' && !studying ? 'page' : undefined}>
              {t.play}{myTurn > 0 && <span className="badge" aria-label={t.duelGroup.yourTurn}>{myTurn}</span>}
            </button>
          </nav>}
          <nav className="nav-actions">
            {/* on phones the text buttons become icons */}
            {cloudEnabled && (
              <button className="nav-btn nb-friends" onClick={() => { setStudying(null); setView('friends') }} aria-label={t.friends} title={t.friends}>
                <span className="nb-text">{t.friends}</span>
                <svg className="nb-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.8 3 2.6 3.5 5.2" /></svg>
              </button>
            )}
            <button className="nav-btn nb-stats" onClick={() => { setStudying(null); setView('stats') }} aria-label={t.stats} title={t.stats}>
              <span className="nb-text">{t.stats}</span>
              <svg className="nb-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-6" /></svg>
            </button>
            <button className="nav-btn nb-settings" onClick={() => { setStudying(null); setView('settings') }} aria-label={t.settings} title={t.settings}>
              <span className="nb-text">{t.settings}</span>
              <svg className="nb-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
            </button>
            <button className="nav-btn lang-btn" onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              aria-label={t.language + ': ' + (lang === 'de' ? 'English' : 'Deutsch')} title={lang === 'de' ? 'Switch to English' : 'Auf Deutsch umschalten'}>
              {lang === 'de' ? 'EN' : 'DE'}
            </button>
            <button className="nav-btn icon" aria-label={t.toggleDark} title={t.toggleDark}
              onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); setThemeState(next) }}>{theme === 'dark' ? '☀︎' : '☾'}</button>
          </nav>
        </div>
      </header>
      <main className={studying || view === 'nature' ? 'app-study' : view === 'quiz' ? 'app-quiz' : view === 'home' ? (device === 'desktop' ? 'app app-home' : 'app-mhome') : 'app'}>{page}</main>
      {/* phones + tablets: the tabs sit at the bottom like in an app (hidden while studying cards: the keyboard needs the space) */}
      {device === 'mobile' && !studying && (
        <nav className="tabbar" aria-label={t.learn + ' / ' + t.mapQuiz}>
          {([
            ['home', t.learn, <path key="i" d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13zM7 8h1.5M16 8h1.5" />],
            ['quiz', t.mapQuizShort, <path key="i" d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />],
            ['nature', t.nature, <path key="i" d="M2.5 19.5 9 8l4 7 2.5-4 6 8.5zM9 8l1.6 2.8M3 5c2-1.4 4-1.4 6 0s4 1.4 6 0" />],
            ['games', t.play, <path key="i" d="M7 8h10a4 4 0 0 1 4 4v1a3.5 3.5 0 0 1-6.3 2.1L14 14h-4l-.7 1.1A3.5 3.5 0 0 1 3 13v-1a4 4 0 0 1 4-4zM7.5 10.5v3M6 12h3M15.5 11.5h.01M17.5 13h.01" />],
          ] as [View, string, React.ReactNode][]).map(([v, label, icon]) => {
            const on = v === 'home' ? !['quiz', 'nature', 'games'].includes(view) : view === v
            return (
              <button key={v} className={'tb-item' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined} onClick={() => setView(v)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
                <span>{label}</span>
                {v === 'games' && myTurn > 0 && <span className="badge" aria-label={t.duelGroup.yourTurn}>{myTurn}</span>}
              </button>
            )
          })}
        </nav>
      )}
    </>
  )
}

/** Which way round the flashcards ask: country -> capital or capital -> country. Each has its own progress. */
function DirectionSwitch() {
  const direction = useDirection()
  const t = useT()
  const options: [Direction, string][] = [['capital', t.dirCapital], ['country', t.dirCountry]]
  return (
    <div className="dir-switch" role="group" aria-label={t.direction}>
      {options.map(([d, label]) => (
        <button key={d} className={d === direction ? 'on' : ''} aria-pressed={d === direction} onClick={() => setDirection(d)}>{label}</button>
      ))}
    </div>
  )
}
