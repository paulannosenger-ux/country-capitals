// Space tab: the 8 planets as 3D balls (PlanetScene), with a panel on the right (phones: below).
// Explore: the whole solar system (Sun, orbits, names); tap a planet there or in the row of the panel: the camera flies
// to it and the panel shows its key figures. "Whole solar system" goes back to the overview.
// Quiz: a planet appears without its name, type it (English or German). Tip = its position from the Sun
// (counts as "with help"). A wrong answer has to be written out once. The round is saved (planets.ts).
import { useEffect, useRef, useState } from 'react'
import PlanetScene, { type SceneView } from './PlanetScene'
import {
  EMPTY_SPACE_ROUND, PLANETS, checkPlanet, loadSpaceRound, otherPlanetName, pickNextPlanet, planetName, saveSpaceRound, textureUrl,
  type Planet, type SpaceRound,
} from './planets'
import { useLang, useT } from '../i18n'
import { useDevice } from '../device'
import type { AnswerResult } from '../study/matcher'
import './space.css'

type Mode = 'explore' | 'quiz'
type Phase = 'ask' | 'right' | 'wrong'

export default function SpaceView() {
  const t = useT()
  const lang = useLang()
  const device = useDevice()
  const [mode, setMode] = useState<Mode>('explore')
  const [selected, setSelected] = useState<Planet | null>(null) // explore: null = the whole solar system

  // quiz state
  const [round, setRound] = useState<SpaceRound>(loadSpaceRound)
  useEffect(() => saveSpaceRound(round), [round])
  const [asked, setAsked] = useState<Planet | null>(() => pickNextPlanet(loadSpaceRound(), null))
  const [phase, setPhase] = useState<Phase>('ask')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<AnswerResult['kind'] | null>(null)
  const [was, setWas] = useState('')
  const [tip, setTip] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')
  const [nudge, setNudge] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (mode === 'quiz' && phase !== 'right') inputRef.current?.focus() }, [mode, phase, asked])

  function nextQuestion(r = round) {
    setAsked(pickNextPlanet(r, asked?.id ?? null))
    setPhase('ask'); setInput(''); setResult(null); setWas(''); setTip(false); setCopyMsg('')
  }
  function mark(id: string, solved: boolean) {
    setRound((r) => ({
      solved: solved ? [...new Set([...r.solved, id])] : r.solved.filter((x) => x !== id),
      missed: solved ? r.missed.filter((x) => x !== id) : [...new Set([...r.missed, id])],
    }))
  }
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!asked) return
    if (phase === 'right') return nextQuestion()
    const r = checkPlanet(input, asked)
    if (phase === 'ask') {
      setResult(r.kind)
      if (r.kind === 'wrong') { setWas(input.trim()); setInput(''); setPhase('wrong'); setNudge((n) => n + 1); mark(asked.id, false) }
      else { setPhase('right'); mark(asked.id, true) }
      return
    }
    if (r.kind === 'correct') return nextQuestion()
    setCopyMsg(t.notSame(planetName(asked, lang)))
    setNudge((n) => n + 1)
  }
  function restart() {
    setRound(EMPTY_SPACE_ROUND)
    setAsked(pickNextPlanet(EMPTY_SPACE_ROUND, null))
    setPhase('ask'); setInput(''); setResult(null); setWas(''); setTip(false); setCopyMsg('')
  }
  // Enter on a right answer: next planet
  useEffect(() => {
    if (mode !== 'quiz' || phase !== 'right') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); nextQuestion() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const view: SceneView = mode === 'explore' || !asked ? { kind: 'system', focus: mode === 'explore' ? selected : null } : { kind: 'solo', planet: asked }
  const names = Object.fromEntries(PLANETS.map((p) => [p.id, planetName(p, lang)]))
  const reserveRight = device === 'desktop' ? Math.min(520, Math.max(380, window.innerWidth * 0.28)) + 40 : 0
  const named = round.solved.length

  return (
    <div className="space-stage">
      <div className="space-scene">
        <PlanetScene view={view} names={names} reserveRight={reserveRight} onPick={(p) => mode === 'explore' && setSelected(p)} />
        {mode === 'explore' && selected && <button className="pill space-back" onClick={() => setSelected(null)}>{t.wholeSystem}</button>}
        <p className="space-hint">{t.dragToTurn}</p>
        <p className="space-credit">{t.planetCredit}</p>
      </div>

      <aside className="space-panel">
        <div className="space-card card-surface">
          <div className="seg space-modes" role="group">
            {(['explore', 'quiz'] as Mode[]).map((m) => (
              <button key={m} className={m === mode ? 'on' : ''} aria-pressed={m === mode} onClick={() => setMode(m)}>{m === 'explore' ? t.explore : t.quiz}</button>
            ))}
          </div>

          {mode === 'explore' ? (
            <>
              <p className="eyebrow">{t.spaceEyebrow}</p>
              <h2>{t.planetsTitle[0]}<em>{t.planetsTitle[1]}</em></h2>
              {/* the planets in a row, in their order from the Sun */}
              <div className="planet-row" role="listbox" aria-label={t.planetsTitle.join('')}>
                {PLANETS.map((p) => (
                  <button key={p.id} role="option" aria-selected={p === selected} className={'planet-pick' + (p === selected ? ' on' : '')} onClick={() => setSelected(p)}
                    title={planetName(p, lang)}>
                    <span className={'planet-ball ' + p.id} style={{ backgroundImage: `url(${textureUrl(p)})` }} />
                    <small>{p.order}</small>
                  </button>
                ))}
              </div>
              {selected ? (
                <>
                  <PlanetFacts planet={selected} />
                  <button className="btn ghost" onClick={() => setSelected(null)}>{t.wholeSystem}</button>
                </>
              ) : (
                <p className="muted">{t.systemHint}</p>
              )}
            </>
          ) : !asked ? (
            <div className="space-done">
              <div className="done-badge" aria-hidden="true">✓</div>
              <h2>{t.allPlanetsNamed}</h2>
              <p className="muted">{t.allPlanetsSub}</p>
              <button className="btn" onClick={restart}>{t.restart}</button>
            </div>
          ) : (
            <>
              <div className="q-progress">
                <span><b>{named}</b> / {PLANETS.length} {t.namedWord}{round.missed.length > 0 && <em>{t.toRetry(round.missed.length)}</em>}</span>
                <button className="q-link" onClick={restart}>{t.restart}</button>
              </div>
              <span className="bar"><span style={{ width: `${(named / PLANETS.length) * 100}%` }} /></span>
              <p className="eyebrow">{t.planetQuestion}</p>
              {phase === 'right' ? (
                <>
                  <div className="banner good" role="status">
                    <strong>✓ {planetName(asked, lang)}</strong>
                    {result === 'typo' && <span className="muted"> · {t.watchSpellingQuiz}</span>}
                  </div>
                  <PlanetFacts planet={asked} />
                  <button className="btn" onClick={() => nextQuestion()} autoFocus>{t.nextPlanet} <small>{t.enter}</small></button>
                </>
              ) : (
                <form onSubmit={submit} className={'space-form' + (nudge ? (nudge % 2 ? ' nudge-a' : ' nudge-b') : '')}>
                  {tip && <p className="space-tip">{t.planetTipShown(asked.order)}</p>}
                  <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} className={phase === 'wrong' ? 'copy' : ''}
                    placeholder={phase === 'wrong' ? t.typeThe(planetName(asked, lang)) : t.typeName} aria-label={t.planetQuestion}
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go" />
                  <div className="q-actions">
                    {phase === 'ask' && (
                      <button type="button" className="btn ghost" onClick={() => setTip(true)} disabled={tip}>{t.planetTip}</button>
                    )}
                    <button type="submit" className="btn">{phase === 'wrong' ? t.continue : t.check}</button>
                  </div>
                  {phase === 'wrong' && (
                    <div className="banner bad" role="status">
                      <strong>{t.notQuite}</strong>
                      <div>{t.answerIs} <b>{planetName(asked, lang)}</b>{was && <span className="was"> · {t.youTypedLower} <s>{was}</s></span>}</div>
                      <div className="must">{t.writeOutPlanet}</div>
                    </div>
                  )}
                  {phase === 'wrong' && copyMsg && <p className="copy-msg" role="alert">{copyMsg}</p>}
                </form>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

/** Name, position and key figures of a planet. */
function PlanetFacts({ planet: p }: { planet: Planet }) {
  const t = useT()
  const lang = useLang()
  const de = lang === 'de' ? 1 : 0
  return (
    <div className="planet-facts">
      <h3>{planetName(p, lang)}{otherPlanetName(p, lang) && <small> · {otherPlanetName(p, lang)}</small>}</h3>
      <p className="muted">{t.nthFromSun(p.order)} · {t.pKind[p.kind]}</p>
      <dl className="facts">
        <div><dt>{t.pDiameter}</dt><dd>{t.fmtNum(p.diameterKm)} km</dd></div>
        <div><dt>{t.pDistance}</dt><dd>{t.millionKm(t.fmtNum(p.distanceMkm))}</dd></div>
        <div><dt>{t.pDay}</dt><dd>{p.day[de]}</dd></div>
        <div><dt>{t.pYear}</dt><dd>{p.year[de]}</dd></div>
        <div><dt>{t.pMoons}</dt><dd>{p.moons}</dd></div>
      </dl>
      <p className="summary">{p.fact[lang]}</p>
    </div>
  )
}
