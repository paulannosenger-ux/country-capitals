// Nature tab: the most important rivers, waters (seas, lakes) and mountain ranges of each continent.
// Explore = list of names, tap one to see it on the map with a short fact.
// Quiz = one shape lights up on the map, type its name (English or German). A wrong answer must be
// written out once and comes back a few items later in the same round (like "Practice all").
import { useEffect, useMemo, useRef, useState } from 'react'
import WorldMap, { geoPathD } from '../map/WorldMap'
import { CONTINENTS, type Continent } from '../data/countries'
import { useLang, useT } from '../i18n'
import { missed, passed, shuffle } from '../study/practice'
import geoRaw from '../../data/nature-geo.json'
import { KINDS, NATURE, checkNature, itemsFor, loadNature, natureName, otherNatureName, saveNature,
  type KindFilter, type NatureItem, type NatureStatus } from './nature'
import '../quiz/quiz.css'
import './nature.css'

const GEO = geoRaw as unknown as Record<string, { geo: unknown; at: [number, number] }>
const byId = new Map(NATURE.map((n) => [n.id, n]))
const pathCache = new Map<string, string>()
function pathOf(id: string) {
  if (!pathCache.has(id)) pathCache.set(id, geoPathD(GEO[id].geo))
  return pathCache.get(id)!
}
/** [west, south, east, north] around all items of a continent, so nothing is cut off at the edge */
function boundsOf(continent: Continent): [number, number, number, number] {
  let w = 180, s = 90, e = -180, n = -90
  const visit = (c: unknown): void => {
    if (typeof (c as number[])[0] === 'number') {
      const [x, y] = c as number[]
      w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y)
    } else (c as unknown[]).forEach(visit)
  }
  for (const item of itemsFor(continent, 'all')) visit((GEO[item.id].geo as { coordinates: unknown }).coordinates)
  return [w, s, e, n]
}
// mountains at the bottom, then seas and lakes, rivers on top
const LAYER: Record<NatureItem['kind'], number> = { mountains: 0, water: 1, river: 2 }

type Mode = 'explore' | 'quiz'

export default function NatureView({ initialContinent }: { initialContinent: Continent | null }) {
  const t = useT()
  const lang = useLang()
  const [continent, setContinent] = useState<Continent>(initialContinent ?? 'Europe')
  const [kind, setKind] = useState<KindFilter>('all')
  const [mode, setMode] = useState<Mode>('explore')
  const [selected, setSelected] = useState<string | null>(null) // explore: the item shown on the map
  const [quizFocus, setQuizFocus] = useState<string | null>(null) // quiz: the item being asked
  const [saved, setSaved] = useState(loadNature)
  useEffect(() => saveNature(saved), [saved])

  const items = useMemo(() => itemsFor(continent, kind), [continent, kind])
  const fitBox = useMemo(() => boundsOf(continent), [continent])
  const known = items.filter((n) => saved[n.id] === 'known').length
  const focusId = mode === 'explore' ? selected : quizFocus

  // On wide screens the panel floats over the right side of the map; keep the continent clear of it (same as StudyView).
  const [vw, setVw] = useState(window.innerWidth)
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const wide = vw >= 940
  const panelWidth = Math.min(460, Math.max(380, vw * 0.32))
  const reserve = wide ? { left: 24, right: panelWidth + 48, top: 24, bottom: 24 } : { left: 8, right: 8, top: 8, bottom: 8 }

  const overlay = useMemo(() => {
    const sorted = [...items].sort((a, b) => LAYER[a.kind] - LAYER[b.kind])
    const focus = focusId ? byId.get(focusId) : null
    return (
      <g className="nat-layer">
        {sorted.map((n) => <path key={n.id} className={'nat ' + n.kind} d={pathOf(n.id)} />)}
        {focus && <path key={'halo-' + focus.id} className={'nat-halo ' + focus.kind} d={pathOf(focus.id)} />}
        {focus && <path key={'on-' + focus.id} className={'nat on ' + focus.kind} d={pathOf(focus.id)} />}
      </g>
    )
  }, [items, focusId])

  function choose(patch: { continent?: Continent; kind?: KindFilter; mode?: Mode }) {
    if (patch.continent) setContinent(patch.continent)
    if (patch.kind) setKind(patch.kind)
    if (patch.mode) setMode(patch.mode)
    setSelected(null)
    setQuizFocus(null)
  }

  const record = (id: string, s: NatureStatus) => setSaved((v) => ({ ...v, [id]: s }))

  return (
    <div className="study-stage nature-stage">
      <div className="study-map">
        <WorldMap fill reserve={reserve} continent={continent} focusId={null} onPickCountry={() => {}} hideNames
          classFor={() => 'q-open'} colorKey="nature" overlay={overlay} fitBox={fitBox} targetLonLat={focusId ? GEO[focusId].at : null} />
        <div className="stage-title">{t.continent(continent)} · {t.natureKinds[kind]}</div>
      </div>

      <div className="study-main">
        <div className="study-top nat-controls">
          <label className="q-select">
            <span className="sr-only">{t.continentLabel}</span>
            <select value={continent} onChange={(e) => choose({ continent: e.target.value as Continent })}>
              {CONTINENTS.map((c) => <option key={c} value={c}>{t.continent(c)}</option>)}
            </select>
          </label>
          <div className="seg nat-kinds" role="group">
            {(['all', ...KINDS] as KindFilter[]).map((k) => (
              <button key={k} className={k === kind ? 'on' : ''} aria-pressed={k === kind} onClick={() => choose({ kind: k })}>{t.natureKinds[k]}</button>
            ))}
          </div>
          <div className="seg nat-mode" role="group">
            {(['explore', 'quiz'] as Mode[]).map((m) => (
              <button key={m} className={m === mode ? 'on' : ''} aria-pressed={m === mode} onClick={() => choose({ mode: m })}>{m === 'explore' ? t.explore : t.quiz}</button>
            ))}
          </div>
          <div className="q-progress"><span>{t.nKnown(known, items.length)}</span><span className="nat-credit">{t.natureCredit}</span></div>
          <span className="bar"><span style={{ width: `${items.length ? (known / items.length) * 100 : 0}%` }} /></span>
        </div>

        {mode === 'explore' ? (
          <section className="card-surface nat-list">
            <p className="muted nat-hint">{t.exploreHint}</p>
            {KINDS.filter((k) => kind === 'all' || kind === k).map((k) => {
              const list = items.filter((n) => n.kind === k)
              if (!list.length) return null
              return (
                <div key={k} className="nat-group">
                  {kind === 'all' && <h3 className={'nat-head ' + k}>{t.natureKinds[k]}</h3>}
                  {list.map((n) => {
                    const on = n.id === selected
                    return (
                      <div key={n.id} className={'nat-row' + (on ? ' on' : '')}>
                        <button onClick={() => setSelected(on ? null : n.id)} aria-expanded={on}>
                          <i className={'nat-dot ' + (saved[n.id] ?? 'open')} aria-hidden="true" />
                          <span className="nat-name">{natureName(n, lang)}</span>
                          {otherNatureName(n, lang) && <small>{otherNatureName(n, lang)}</small>}
                        </button>
                        {on && <p className="nat-fact">{n.fact[lang]}</p>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </section>
        ) : (
          <NatureQuiz key={continent + ':' + kind} items={items} onFocus={setQuizFocus} onResult={record} />
        )}
      </div>
    </div>
  )
}

type Phase = 'ask' | 'right' | 'wrong'

function NatureQuiz({ items, onFocus, onResult }: {
  items: NatureItem[]
  onFocus: (id: string | null) => void
  onResult: (id: string, s: NatureStatus) => void
}) {
  const t = useT()
  const lang = useLang()
  const [queue, setQueue] = useState(() => shuffle(items.map((n) => n.id)))
  const [missedIds, setMissedIds] = useState<Set<string>>(() => new Set())
  const [firstTry, setFirstTry] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [input, setInput] = useState('')
  const [typo, setTypo] = useState(false)
  const [wrongText, setWrongText] = useState('')
  const [copyMsg, setCopyMsg] = useState('')
  const [nudge, setNudge] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const current = queue.length ? byId.get(queue[0])! : null
  const total = items.length

  useEffect(() => { onFocus(current?.id ?? null) }, [current?.id, onFocus])
  useEffect(() => { if (phase !== 'right') inputRef.current?.focus() }, [phase, current?.id])

  function markWrong(typed: string) {
    setWrongText(typed)
    setInput('')
    setCopyMsg('')
    setPhase('wrong')
    setMissedIds((m) => new Set(m).add(current!.id))
    onResult(current!.id, 'missed')
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!current) return
    if (phase === 'ask') {
      const r = checkNature(input, current)
      if (r.kind === 'wrong') return markWrong(input.trim())
      setTypo(r.kind === 'typo')
      setPhase('right')
      if (!missedIds.has(current.id)) {
        setFirstTry((n) => n + 1)
        onResult(current.id, 'known')
      }
    } else if (phase === 'right') {
      next()
    } else {
      // after a wrong answer: write the name out once (English or German)
      if (checkNature(input, current).kind === 'correct') next()
      else {
        setCopyMsg(t.notSame(natureName(current, lang)))
        setNudge((n) => n + 1)
      }
    }
  }

  function next() {
    setQueue((q) => (phase === 'right' ? passed(q) : missed(q)))
    setPhase('ask')
    setInput('')
    setTypo(false)
    setWrongText('')
    setCopyMsg('')
  }

  function restart() {
    setQueue(shuffle(items.map((n) => n.id)))
    setMissedIds(new Set())
    setFirstTry(0)
    setPhase('ask')
    setInput('')
  }

  // Enter = next item after a right answer, even when the focus is not in the input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === 'right' && e.key === 'Enter' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!current) {
    return (
      <article className="card card-surface finished">
        <div className="done-badge" aria-hidden="true">✓</div>
        <h2>{t.roundComplete}</h2>
        <p>{t.natureSummary(total, firstTry, missedIds.size)}</p>
        <div className="finish-actions">
          <button className="btn" onClick={restart}>{t.practiceAgain}</button>
        </div>
      </article>
    )
  }

  const name = natureName(current, lang)
  return (
    <>
      <div className="study-top">
        <div className="study-head">
          <div className="counts">
            <span className="n new on">{queue.length}<small>{t.left}</small></span>
            <span className="n learning on">{missedIds.size}<small>{t.missed}</small></span>
            <span className="n due on">{total - queue.length}<small>{t.done}</small></span>
          </div>
          <span className="progress-text">{total - queue.length} / {total}</span>
        </div>
        <span className="bar big session-bar"><span style={{ width: `${((total - queue.length) / total) * 100}%` }} /></span>
      </div>

      <article className={'card card-surface' + (phase === 'wrong' ? ' shake' : '')} key={current.id + ':' + queue.length}>
        <span className={'nat-kind ' + current.kind}>{t.natureKinds[current.kind]}</span>
        <h2>{phase === 'ask' ? t.natureQuestion[current.kind] : name}</h2>
        {phase !== 'ask' && otherNatureName(current, lang) && <p className="de">{otherNatureName(current, lang)}</p>}

        <form onSubmit={submit} className={'answer' + (nudge === 0 ? '' : nudge % 2 ? ' nudge-a' : ' nudge-b')}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={phase === 'right'}
            className={phase === 'right' ? 'ok' : phase === 'wrong' ? 'copy' : ''}
            placeholder={phase === 'wrong' ? t.typeThe(name) : t.typeName}
            aria-label={t.typeName}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go"
          />
          {phase !== 'right' && <button className="btn" type="submit">{phase === 'wrong' ? t.continue : t.check}</button>}
        </form>
        {phase === 'ask' && <button className="link nat-dunno" onClick={() => markWrong('')}>{t.dontKnow}</button>}

        {phase !== 'ask' && (
          <div className={'banner ' + (phase === 'right' ? 'good' : 'bad')} role="status">
            {phase === 'right' ? (
              <><strong>{t.correct}</strong>{typo && <span>{t.watchSpelling}</span>}</>
            ) : (
              <>
                <strong>{t.notQuite}</strong>
                {wrongText && <div className="was">{t.youTyped} <s>{wrongText}</s></div>}
                <div>{t.answerIs} <b>{name}</b></div>
                <div className="must">{t.natureWriteOut}</div>
              </>
            )}
          </div>
        )}
        {phase === 'wrong' && copyMsg && <p className="copy-msg" role="alert">{copyMsg}</p>}
        {phase !== 'ask' && <p className="nat-fact">{current.fact[lang]}</p>}
        {phase === 'right' && <button className="btn next-btn" onClick={next} autoFocus>{t.next} <small>{t.enter}</small></button>}
      </article>
    </>
  )
}
