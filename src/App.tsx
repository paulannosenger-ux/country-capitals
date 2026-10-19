import { useCallback, useMemo, useState } from 'react'
import WorldMap from './map/WorldMap'
import Settings from './pages/Settings'
import Stats from './pages/Stats'
import Friends from './pages/Friends'
import { cloudEnabled, useAccount, useMatches } from './cloud/cloud'
import GamesView from './games/GamesView'
import { matchState } from './games/duels'
import StudyView from './study/StudyView'
import MapQuiz from './quiz/MapQuiz'
import { CONTINENTS, REGIONS, countries, countriesInArea, countryById, displayName, type Area, type Continent, type Region } from './data/countries'
import { setLang, useLang, useT, type Lang } from './i18n'
import { countsFor, learnedCount, store, useProgress } from './progress/progress'
import { computeStats } from './progress/stats'
import { currentTheme, setTheme } from './theme'

type View = 'home' | 'quiz' | 'games' | 'settings' | 'stats' | 'friends'

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
  const myTurn = account.status === 'signedIn' && matches ? matches.filter((m) => matchState(m, account.uid) === 'yourTurn').length : 0
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
  const t = useT()
  const lang = useLang()

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
    page = <MapQuiz initialContinent={scope} />
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
    page = (
      <>
        <section className="hero">
          <LanguageSwitch />
          <h1>{t.heroLine1}<br />{t.heroLine2}</h1>
          <p className="lede">{t.lede}</p>
          <dl className="figures">
            <div><dd>{stats.learned}<small>/{stats.total}</small></dd><dt>{t.learned}</dt></div>
            <div><dd>{stats.mastered}</dd><dt>{t.mastered}</dt></div>
            <div><dd>{stats.streak}</dd><dt>{t.dayStreak}</dt></div>
            <div><dd className={due > 0 ? 'accent' : ''}>{due}</dd><dt>{t.dueToday}</dt></div>
          </dl>
        </section>

        <div className="home">
          <div className="map-card card-surface">
            <WorldMap continent={scope} focusId={focusId} onPickCountry={onPickCountry} />
            {continent && <button className="pill back" onClick={() => chooseContinent(null)}>{t.world}</button>}
            {focus && <div className="target-label">{displayName(focus, lang)}</div>}
            <div className="legend">
              <span><i className="sw new" />{t.statusNew}</span>
              <span><i className="sw learning" />{t.statusLearning}</span>
              <span><i className="sw mastered" />{t.statusMastered}</span>
            </div>
          </div>

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

          <aside className="side">
            <section className="mission card-surface">
              {continent ? (
                <>
                  <p className="eyebrow">{t.selected}</p>
                  <h2>{t.continent(scope!)}</h2>
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
                  <h2>{t.chooseContinent}</h2>
                  <p className="muted">{t.chooseHint}</p>
                  <button className="btn ghost" onClick={() => setStudying({ scope: null, practice: false })}>
                    {t.mixedReview} <small>{t.mixedSub(Math.min(countries.length, all.new + all.learning + all.due))}</small>
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
          <button className="wordmark" onClick={() => { setStudying(null); setView('home') }} aria-label={t.home}>
            <svg className="logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" /><ellipse cx="12" cy="12" rx="4" ry="9.5" /><path d="M2.5 12h19" />
            </svg>
            <span className="wm-text">{t.brand}</span>
          </button>
          <nav className="tabs" aria-label={t.learn + " / " + t.mapQuiz}>
            <button className={'tab' + (!['quiz', 'games'].includes(view) || studying ? ' on' : '')} onClick={() => { setStudying(null); setView('home') }}
              aria-current={!['quiz', 'games'].includes(view) || studying ? 'page' : undefined}>{t.learn}</button>
            <button className={'tab' + (view === 'quiz' && !studying ? ' on' : '')} onClick={() => { setStudying(null); setView('quiz') }}
              aria-current={view === 'quiz' && !studying ? 'page' : undefined}>
              <span className="tab-long">{t.mapQuiz}</span><span className="tab-short">{t.mapQuizShort}</span>
            </button>
            <button className={'tab' + (view === 'games' && !studying ? ' on' : '')} onClick={() => { setStudying(null); setView('games') }}
              aria-current={view === 'games' && !studying ? 'page' : undefined}>
              {t.play}{myTurn > 0 && <span className="badge" aria-label={t.duelGroup.yourTurn}>{myTurn}</span>}
            </button>
          </nav>
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
      <main className={studying ? 'app-study' : view === 'quiz' ? 'app-quiz' : 'app'}>{page}</main>
    </>
  )
}

/** English / Deutsch switch at the top of the start page. */
function LanguageSwitch() {
  const lang = useLang()
  const t = useT()
  const options: [Lang, string][] = [['en', 'English'], ['de', 'Deutsch']]
  return (
    <div className="lang-switch" role="group" aria-label={t.language}>
      {options.map(([l, label]) => (
        <button key={l} className={l === lang ? 'on' : ''} aria-pressed={l === lang} onClick={() => setLang(l)}>{label}</button>
      ))}
    </div>
  )
}
