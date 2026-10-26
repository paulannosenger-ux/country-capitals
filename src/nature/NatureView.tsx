// Nature tab: the most important rivers, waters (seas, lakes) and mountain ranges of each continent.
// Explore = list of names, tap one (or tap it on the map) to see it highlighted with its key figures.
// Quiz = one shape lights up, type its name (English or German). Tap any other shape on the map to answer
// that one instead. Named ones turn green and get their name on the map; the round is kept per continent + kind.
// A wrong answer must be written out once; the item stays open and comes back later.
import { useEffect, useMemo, useRef, useState } from 'react'
import WorldMap from '../map/WorldMap'
import { CONTINENTS, type Continent } from '../data/countries'
import { useLang, useT } from '../i18n'
import { GEO, boundsOf, pathOf } from './geo'
import NatureFactsView from './NatureFactsView'
import { EMPTY_ROUND, KINDS, NATURE, checkNature, itemsFor, loadNature, loadRounds, natureName, otherNatureName, pickNext,
  roundKeyOf, saveNature, saveRounds, type KindFilter, type NatureItem, type NatureRound, type NatureStatus } from './nature'
import '../quiz/quiz.css'
import './nature.css'

const byId = new Map(NATURE.map((n) => [n.id, n]))

// mountains at the bottom, then seas and lakes, rivers on top
const LAYER: Record<NatureItem['kind'], number> = { mountains: 0, water: 1, river: 2 }

type Mode = 'explore' | 'quiz'

export default function NatureView({ initialContinent }: { initialContinent: Continent | null }) {
  const t = useT()
  const lang = useLang()
  const [continent, setContinent] = useState<Continent>(initialContinent ?? 'Europe')
  const [kind, setKind] = useState<KindFilter>('all')
  const [mode, setMode] = useState<Mode>('explore')
  const [selected, setSelected] = useState<string | null>(null) // explore: the item shown
  const [saved, setSaved] = useState(loadNature) // known / missed, the last time each was asked
  useEffect(() => saveNature(saved), [saved])
  const [rounds, setRounds] = useState(loadRounds)
  useEffect(() => saveRounds(rounds), [rounds])

  const items = useMemo(() => itemsFor(continent, kind), [continent, kind])
  const ids = useMemo(() => items.map((n) => n.id), [items])
  const key = roundKeyOf(continent, kind)
  const round = rounds[key] ?? EMPTY_ROUND
  const [askId, setAskId] = useState<string | null>(() => pickNext(itemsFor(continent, kind).map((n) => n.id), round))
  const fitBox = useMemo(() => boundsOf(itemsFor(continent, 'all').map((n) => n.id)), [continent])
  const known = items.filter((n) => saved[n.id] === 'known').length
  const focusId = mode === 'explore' ? selected : askId

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

  /** Tap on a shape: explore = show it; quiz = answer that one now. */
  const pickRef = useRef<(id: string) => void>(() => {})
  pickRef.current = (id) => (mode === 'explore' ? setSelected((s) => (s === id ? null : id)) : setAskId(id))

  const solvedKey = round.solved.join(',')
  const overlay = useMemo(() => {
    const solved = new Set(mode === 'quiz' ? round.solved : [])
    const sorted = [...items].sort((a, b) => LAYER[a.kind] - LAYER[b.kind])
    const focus = focusId ? byId.get(focusId) : null
    return (
      <g className="nat-layer">
        {sorted.map((n) => <path key={n.id} className={'nat ' + n.kind + (solved.has(n.id) ? ' solved' : '')} d={pathOf(n.id)} />)}
        {focus && <path key={'halo-' + focus.id} className={'nat-halo ' + focus.kind} d={pathOf(focus.id)} />}
        {focus && <path key={'on-' + focus.id} className={'nat on ' + focus.kind + (solved.has(focus.id) ? ' solved' : '')} d={pathOf(focus.id)} />}
        {/* invisible, wider copies that catch taps (a river line is too thin to hit) */}
        {sorted.map((n) => <path key={'hit-' + n.id} data-id={n.id} className={'nat-hit ' + n.kind} d={pathOf(n.id)} onClick={() => pickRef.current(n.id)} />)}
      </g>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, focusId, mode, solvedKey])

  // names on the map: everything named in this quiz round, or the item opened in the list
  const labelIds = mode === 'quiz' ? round.solved.filter((id) => ids.includes(id)) : selected ? [selected] : []
  const freeLabels = labelIds.map((id) => ({ key: id, at: GEO[id].at, text: natureName(byId.get(id)!, lang), className: 'nat-label' }))

  function choose(patch: { continent?: Continent; kind?: KindFilter; mode?: Mode }) {
    const c = patch.continent ?? continent
    const k = patch.kind ?? kind
    setContinent(c)
    setKind(k)
    if (patch.mode) setMode(patch.mode)
    setSelected(null)
    setAskId(pickNext(itemsFor(c, k).map((n) => n.id), rounds[roundKeyOf(c, k)] ?? EMPTY_ROUND))
  }

  const updateRound = (fn: (r: NatureRound) => NatureRound) => setRounds((all) => ({ ...all, [key]: fn(all[key] ?? EMPTY_ROUND) }))
  const record = (id: string, s: NatureStatus) => setSaved((v) => ({ ...v, [id]: s }))

  function onRight(id: string) {
    const firstTry = !round.missed.includes(id)
    updateRound((r) => ({ ...r, solved: r.solved.includes(id) ? r.solved : [...r.solved, id] }))
    if (firstTry) record(id, 'known')
  }
  function onWrong(id: string) {
    updateRound((r) => ({ ...r, missed: r.missed.includes(id) ? r.missed : [...r.missed, id] }))
    record(id, 'missed')
  }
  /** after an answer: on to another open item (`round` is read fresh, because onRight may have just changed it) */
  function next(justSolved: string | null) {
    const r = justSolved ? { ...round, solved: [...round.solved, justSolved] } : round
    setAskId(pickNext(ids, r, askId))
  }
  function restart() {
    updateRound(() => EMPTY_ROUND)
    setAskId(pickNext(ids, EMPTY_ROUND))
  }

  const solvedHere = round.solved.filter((id) => ids.includes(id)).length
  const asked = askId ? byId.get(askId) ?? null : null

  return (
    <div className="study-stage nature-stage">
      <div className="study-map">
        <WorldMap fill reserve={reserve} continent={continent} focusId={null} onPickCountry={() => {}} hideNames
          classFor={() => 'q-open'} colorKey="nature" overlay={overlay} fitBox={fitBox} freeLabels={freeLabels}
          targetLonLat={focusId ? GEO[focusId].at : null} />
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
                        {on && <div className="nat-more"><NatureFactsView item={n} /></div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </section>
        ) : (
          <>
            <div className="study-top">
              <div className="study-head">
                <div className="counts">
                  <span className="n new on">{items.length - solvedHere}<small>{t.left}</small></span>
                  <span className="n learning on">{round.missed.filter((id) => ids.includes(id)).length}<small>{t.missed}</small></span>
                  <span className="n due on">{solvedHere}<small>{t.done}</small></span>
                </div>
                <button className="link" onClick={restart}>{t.restart}</button>
              </div>
              <span className="bar big session-bar"><span style={{ width: `${(solvedHere / items.length) * 100}%` }} /></span>
            </div>
            {asked ? (
              <QuizCard key={asked.id} item={asked} named={round.solved.includes(asked.id)}
                onRight={() => onRight(asked.id)} onWrong={() => onWrong(asked.id)} onNext={(solved) => next(solved ? asked.id : null)} />
            ) : (
              <article className="card card-surface finished">
                <div className="done-badge" aria-hidden="true">✓</div>
                <h2>{t.roundComplete}</h2>
                <p>{t.natureSummary(items.length, items.filter((n) => !round.missed.includes(n.id)).length, round.missed.filter((id) => ids.includes(id)).length)}</p>
                <div className="finish-actions"><button className="btn" onClick={restart}>{t.practiceAgain}</button></div>
              </article>
            )}
          </>
        )}
      </div>
    </div>
  )
}

type Phase = 'ask' | 'right' | 'wrong' | 'named'

/** One question. Remounted (key) for every item, so it always starts fresh. */
function QuizCard({ item, named, onRight, onWrong, onNext }: {
  item: NatureItem
  named: boolean // already named earlier in this round (tapped on the map again): just show it
  onRight: () => void
  onWrong: () => void
  onNext: (solved: boolean) => void
}) {
  const t = useT()
  const lang = useLang()
  const [phase, setPhase] = useState<Phase>(named ? 'named' : 'ask')
  const [input, setInput] = useState('')
  const [typo, setTypo] = useState(false)
  const [wrongText, setWrongText] = useState('')
  const [copyMsg, setCopyMsg] = useState('')
  const [nudge, setNudge] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const name = natureName(item, lang)

  useEffect(() => { if (phase === 'ask' || phase === 'wrong') inputRef.current?.focus() }, [phase])

  function markWrong(typed: string) {
    setWrongText(typed)
    setInput('')
    setPhase('wrong')
    onWrong()
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (phase === 'ask') {
      const r = checkNature(input, item)
      if (r.kind === 'wrong') return markWrong(input.trim())
      setTypo(r.kind === 'typo')
      setPhase('right')
      onRight()
    } else if (phase === 'right' || phase === 'named') {
      onNext(phase === 'right')
    } else if (checkNature(input, item).kind === 'correct') {
      onNext(false) // written out: on to the next one, this one stays open
    } else {
      setCopyMsg(t.notSame(name))
      setNudge((n) => n + 1)
    }
  }

  // Enter = next item after a right answer, even when the focus is not in the input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((phase === 'right' || phase === 'named') && e.key === 'Enter' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        onNext(phase === 'right')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const solved = phase === 'right' || phase === 'named'
  return (
    <article className={'card card-surface' + (phase === 'wrong' ? ' shake' : '')}>
      <span className={'nat-kind ' + item.kind}>{t.natureKinds[item.kind]}</span>
      <h2>{phase === 'ask' ? t.natureQuestion[item.kind] : name}</h2>
      {phase !== 'ask' && otherNatureName(item, lang) && <p className="de">{otherNatureName(item, lang)}</p>}

      {phase !== 'named' && (
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
      )}
      {phase === 'ask' && (
        <p className="nat-ask-foot">
          <button className="link nat-dunno" onClick={() => markWrong('')}>{t.dontKnow}</button>
          <span className="muted">{t.natureTapHint}</span>
        </p>
      )}

      {phase !== 'ask' && (
        <div className={'banner ' + (phase === 'wrong' ? 'bad' : 'good')} role="status">
          {phase === 'named' ? <strong>✓ {t.alreadyNamed}</strong>
            : phase === 'right' ? <><strong>{t.correct}</strong>{typo && <span>{t.watchSpelling}</span>}</>
            : (
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
      {phase !== 'ask' && <NatureFactsView item={item} />}
      {solved && <button className="btn next-btn" onClick={() => onNext(phase === 'right')} autoFocus>{t.next} <small>{t.enter}</small></button>}
    </article>
  )
}
