// Map quiz: the continent is shown blank; click any country and name it (hard mode: + its capital).
// A line connects the selected country with the answer box. "Tip" shows the flag.
// A wrong answer must be written out once; the country stays open and is asked again later.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import WorldMap from '../map/WorldMap'
import CountryFacts from '../study/CountryFacts'
import { CONTINENTS, countries, countriesIn, countryById, flagUrl, type Continent } from '../data/countries'
import { checkAnswer, checkCountryName, type AnswerResult } from '../study/matcher'
import { loadQuiz, pickNextOpen, roundKey, saveQuiz, summarize, type Mode, type QStatus, type QuizSave } from './quizState'
import './quiz.css'

type Field = 'name' | 'capital'
type Phase = 'ask' | 'wrong' | 'right'
interface FieldState { value: string; result: AnswerResult['kind'] | null; was: string; fixed: boolean }

const EMPTY: FieldState = { value: '', result: null, was: '', fixed: false }
const EMPTY_FIELDS: Record<Field, FieldState> = { name: EMPTY, capital: EMPTY }
const LABEL: Record<Field, string> = { name: 'Country', capital: 'Capital' }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export default function MapQuiz({ initialContinent }: { initialContinent: Continent | null }) {
  const [save, setSave] = useState<QuizSave>(() => {
    const s = loadQuiz()
    return initialContinent ? { ...s, continent: initialContinent } : s
  })
  useEffect(() => saveQuiz(save), [save])
  const { continent, mode } = save
  const key = roundKey(continent, mode)
  const round = useMemo(() => save.rounds[key] ?? {}, [save.rounds, key])
  const ids = useMemo(() => countriesIn(continent).map((c) => c.id), [continent])
  const sum = summarize(round, ids)
  const fieldList: Field[] = mode === 'hard' ? ['name', 'capital'] : ['name']

  const [selected, setSelected] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('ask')
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [tip, setTip] = useState(false) // flag visible
  const [copyMsg, setCopyMsg] = useState('')
  const [nudge, setNudge] = useState(0) // restarts the shake animation
  const inputs = { name: useRef<HTMLInputElement>(null), capital: useRef<HTMLInputElement>(null) }

  const sel = selected ? countryById.get(selected)! : null
  const selStatus: QStatus | undefined = selected ? round[selected] : undefined
  const alreadyNamed = phase === 'ask' && (selStatus === 'solved' || selStatus === 'helped')

  // refs for the (stable) map click handler
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const continentRef = useRef(continent)
  continentRef.current = continent

  function setStatus(id: string, status: QStatus) {
    setSave((s) => ({ ...s, rounds: { ...s.rounds, [key]: { ...(s.rounds[key] ?? {}), [id]: status } } }))
  }

  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const choose = useCallback((id: string | null) => {
    lastPoint.current = null // hide the box until the map reports where the new country is
    setSelected(id)
    setPhase('ask')
    setFields(EMPTY_FIELDS)
    setTip(false)
    setCopyMsg('')
  }, [])

  const onPickCountry = useCallback(
    (id: string) => {
      if (countryById.get(id)?.continent !== continentRef.current) return
      if (phaseRef.current === 'wrong') { setNudge((n) => n + 1); return } // write the answer out first
      choose(id)
    },
    [choose],
  )

  function goNext() {
    choose(pickNextOpen(round, ids, selected))
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!sel) return
    if (phase === 'right' || alreadyNamed) return goNext()

    if (phase === 'ask') {
      const result: Record<Field, AnswerResult['kind']> = {
        name: checkCountryName(fields.name.value, sel, countries).kind,
        capital: mode === 'hard' ? checkAnswer(fields.capital.value, sel, countries).kind : 'correct',
      }
      const wrong = fieldList.filter((f) => result[f] === 'wrong')
      setFields((fs) => {
        const next = { ...fs }
        for (const f of fieldList) next[f] = { value: result[f] === 'wrong' ? '' : fs[f].value, result: result[f], was: fs[f].value.trim(), fixed: false }
        return next
      })
      if (wrong.length) {
        setPhase('wrong')
        setStatus(sel.id, 'missed') // marked right away, so leaving the box doesn't skip the retry
        setNudge((n) => n + 1)
        requestAnimationFrame(() => inputs[wrong[0]].current?.focus())
      } else {
        setPhase('right')
        setStatus(sel.id, tip || selStatus === 'missed' ? 'helped' : 'solved')
      }
      return
    }

    // phase 'wrong': every wrong field must be typed out (spelled exactly, case and accents ignored)
    const next = { ...fields }
    let missing: Field | null = null
    for (const f of fieldList) {
      if (next[f].result !== 'wrong' || next[f].fixed) continue
      const r = f === 'name' ? checkCountryName(next[f].value, sel, countries) : checkAnswer(next[f].value, sel, countries)
      if (r.kind === 'correct') next[f] = { ...next[f], fixed: true }
      else missing ??= f
    }
    setFields(next)
    if (!missing) return goNext()
    const target = missing === 'name' ? sel.name.en : sel.capitals[0]
    setCopyMsg(`Not the same yet. Type: ${target}`)
    setNudge((n) => n + 1)
    inputs[missing].current?.focus()
  }

  // Focus the first field when a country is selected.
  useEffect(() => {
    if (selected && phase === 'ask' && !alreadyNamed) inputs.name.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // Esc closes the box (not while a wrong answer still has to be written out).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phaseRef.current !== 'wrong') choose(null)
      // Enter when the focus is not in the box: next country
      if (e.key === 'Enter' && (phaseRef.current === 'right' || alreadyNamed) && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- answer box + connector line, positioned next to the selected country ----
  const stageRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const endRef = useRef<SVGCircleElement>(null)

  const layout = useCallback(() => {
    const stage = stageRef.current, box = boxRef.current, line = lineRef.current, dot = dotRef.current, end = endRef.current
    if (!stage || !box || !line || !dot || !end) return
    const p = lastPoint.current
    if (!p) { box.style.visibility = 'hidden'; line.parentElement!.style.visibility = 'hidden'; return }
    const W = stage.clientWidth, H = stage.clientHeight, bw = box.offsetWidth, bh = box.offsetHeight
    let left: number, top: number
    if (W < 700) {
      box.style.maxHeight = ''
      // phones: the box sits at the bottom, the line goes up to the country
      left = (W - bw) / 2
      top = H - bh - 12
    } else {
      const toRight = p.x < W / 2 // open the box on the side with more room
      left = clamp(toRight ? p.x + 120 : p.x - 120 - bw, 16, W - bw - 16)
      // stay below the top bar where the two would overlap
      const bar = barRef.current
      const minTop = bar && left < bar.offsetLeft + bar.offsetWidth + 12 ? bar.offsetTop + bar.offsetHeight + 12 : 16
      box.style.maxHeight = `${H - minTop - 16}px` // a long box (facts) scrolls instead of running off the screen
      const h = box.offsetHeight
      top = clamp(p.y - h / 2, minTop, Math.max(minTop, H - h - 16))
    }
    // the line ends on the edge of the box that faces the country
    let ax: number, ay: number
    const boxH = box.offsetHeight
    if (W < 700) { ax = clamp(p.x, left + 24, left + bw - 24); ay = top }
    else { ax = p.x < left + bw / 2 ? left : left + bw; ay = clamp(p.y, top + 28, top + boxH - 28) }
    box.style.left = `${Math.round(left)}px` // left/top, not transform: the shake animation uses transform
    box.style.top = `${Math.round(top)}px`
    box.style.visibility = 'visible'
    line.parentElement!.style.visibility = 'visible'
    line.setAttribute('x1', String(p.x)); line.setAttribute('y1', String(p.y))
    line.setAttribute('x2', String(ax)); line.setAttribute('y2', String(ay))
    dot.setAttribute('cx', String(p.x)); dot.setAttribute('cy', String(p.y))
    end.setAttribute('cx', String(ax)); end.setAttribute('cy', String(ay))
  }, [])

  const onTargetMove = useCallback((p: { x: number; y: number } | null) => {
    lastPoint.current = p
    layout()
  }, [layout])

  useLayoutEffect(layout)
  useEffect(() => {
    const ro = new ResizeObserver(layout)
    if (stageRef.current) ro.observe(stageRef.current)
    if (boxRef.current) ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [layout, selected])

  // map colors: open / solved / helped / missed
  const classFor = useCallback((id: string) => 'q-' + (round[id] ?? 'open'), [round])
  const colorKey = key + JSON.stringify(round)
  // names of the countries already answered correctly are written on the map
  const named = useMemo(() => ids.filter((id) => round[id] === 'solved' || round[id] === 'helped'), [ids, round])

  const [vw, setVw] = useState(window.innerWidth)
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const reserve = vw >= 700 ? { left: 24, right: 24, top: 150, bottom: 40 } : { left: 8, right: 8, top: 150, bottom: 40 }

  const finished = sum.done === sum.total

  function changeRound(patch: Partial<Pick<QuizSave, 'continent' | 'mode'>>) {
    choose(null)
    setSave((s) => ({ ...s, ...patch }))
  }
  function restart() {
    if (!finished && sum.done + sum.missed > 0 && !window.confirm(`Start ${continent} (${mode}) from the beginning?`)) return
    choose(null)
    setSave((s) => ({ ...s, rounds: { ...s.rounds, [key]: {} } }))
  }

  const showFlag = tip || phase === 'right' || alreadyNamed

  return (
    <div className="quiz-stage" ref={stageRef}>
      <div className="quiz-map">
        <WorldMap fill reserve={reserve} continent={continent} focusId={selected} onPickCountry={onPickCountry}
          classFor={classFor} colorKey={colorKey} hideNames onTargetMove={onTargetMove} labelIds={named} />
      </div>

      <div className="q-bar" ref={barRef}>
        <div className="q-bar-row">
          <label className="q-select">
            <span className="sr-only">Continent</span>
            <select value={continent} onChange={(e) => changeRound({ continent: e.target.value as Continent })}>
              {CONTINENTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Difficulty">
            {(['easy', 'hard'] as Mode[]).map((m) => (
              <button key={m} className={m === mode ? 'on' : ''} aria-pressed={m === mode} onClick={() => m !== mode && changeRound({ mode: m })}>
                {m === 'easy' ? 'Easy' : 'Hard'}<small>{m === 'easy' ? 'Country' : 'Country + capital'}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="q-progress">
          <span><b>{sum.done}</b> / {sum.total} named{sum.missed > 0 && <em> · {sum.missed} to retry</em>}</span>
          <button className="q-link" onClick={restart}>Restart</button>
        </div>
        <span className="bar"><span style={{ width: `${(sum.done / sum.total) * 100}%` }} /></span>
        {!sel && !finished && (
          <div className="q-hint">
            <span>Click a country to name it{mode === 'hard' ? ' and its capital' : ''}.</span>
            <button className="pill" onClick={goNext}>Pick one for me</button>
          </div>
        )}
      </div>

      <div className="q-legend">
        <span><i className="sw q-open" />Open</span>
        <span><i className="sw q-solved" />Correct</span>
        <span><i className="sw q-helped" />With help</span>
        <span><i className="sw q-missed" />Try again</span>
      </div>

      {sel && (
        <>
          <svg className="q-connector" aria-hidden="true">
            <line ref={lineRef} />
            <circle ref={dotRef} r="4" className="q-dot" />
            <circle ref={endRef} r="3" className="q-end" />
          </svg>
          <div ref={boxRef} className={'q-pop' + (phase === 'right' || alreadyNamed ? ' with-facts' : '') + (nudge ? (nudge % 2 ? ' nudge-a' : ' nudge-b') : '')} role="dialog" aria-label="Name this country">
            <div className="q-pop-head">
              <span className="eyebrow">{alreadyNamed ? 'Already named' : phase === 'right' ? 'Correct' : mode === 'hard' ? 'Country & capital' : 'Which country is this?'}</span>
              <button className="q-close" onClick={() => phase !== 'wrong' ? choose(null) : setNudge((n) => n + 1)} aria-label="Close">✕</button>
            </div>

            {showFlag && <img className="q-flag" src={flagUrl(sel)} alt={phase === 'ask' && !alreadyNamed ? 'Flag (tip)' : `Flag of ${sel.name.en}`} />}

            {alreadyNamed ? (
              <div className="q-known">
                <h3>{sel.name.en}</h3>
                <p>Capital: <b>{sel.capitals.join(' · ')}</b></p>
                <button className="btn" onClick={goNext} disabled={finished}>Next country</button>
                <CountryFacts country={sel} />
              </div>
            ) : (
              <form onSubmit={submit} className="q-form">
                {fieldList.map((f) => {
                  const st = fields[f]
                  const retype = phase === 'wrong' && st.result === 'wrong' && !st.fixed
                  const target = f === 'name' ? sel.name.en : sel.capitals[0]
                  const locked = phase === 'right' || (phase === 'wrong' && !retype)
                  return (
                    <label key={f} className="q-field">
                      <span>{LABEL[f]}</span>
                      <input
                        ref={inputs[f]}
                        value={st.value}
                        onChange={(e) => setFields((fs) => ({ ...fs, [f]: { ...fs[f], value: e.target.value } }))}
                        readOnly={locked}
                        className={locked ? 'ok' : retype ? 'copy' : ''}
                        placeholder={retype ? `Type “${target}”` : f === 'name' ? 'Name of the country' : 'Its capital'}
                        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go"
                      />
                    </label>
                  )
                })}

                {phase === 'ask' && (
                  <div className="q-actions">
                    <button type="button" className="btn ghost q-tip" onClick={() => setTip(true)} disabled={tip}>
                      {tip ? 'Flag shown' : 'Tip: show flag'}
                    </button>
                    <button type="submit" className="btn">Check</button>
                  </div>
                )}
                {phase === 'wrong' && <button type="submit" className="btn q-wide">Continue</button>}
                {phase === 'right' && <button type="submit" className="btn q-wide" autoFocus>Next country <small>Enter</small></button>}
              </form>
            )}

            {phase === 'right' && (
              <div className="banner good" role="status">
                <strong>✓ {sel.name.en}</strong>
                {fieldList.some((f) => fields[f].result === 'typo') && <span className="muted">Watch the spelling. </span>}
                <div>Capital{sel.capitals.length > 1 ? 's' : ''}: <b>{sel.capitals.join(' · ')}</b></div>
              </div>
            )}
            {phase === 'right' && <CountryFacts country={sel} />}
            {phase === 'wrong' && (
              <div className="banner bad" role="status">
                <strong>Not quite</strong>
                {fieldList.filter((f) => fields[f].result === 'wrong').map((f) => (
                  <div key={f}>
                    {LABEL[f]}: <b>{f === 'name' ? sel.name.en : sel.capitals.join(' · ')}</b>
                    {fields[f].was && <span className="was"> · you typed <s>{fields[f].was}</s></span>}
                  </div>
                ))}
                <div className="must">Write it out once to continue. This country stays open and comes back.</div>
              </div>
            )}
            {phase === 'wrong' && copyMsg && <p className="copy-msg" role="alert">{copyMsg}</p>}
          </div>
        </>
      )}

      {finished && !sel && (
        <div className="q-finish card-surface">
          <div className="done-badge" aria-hidden="true">✓</div>
          <h2>{continent} complete</h2>
          <p>All {sum.total} countries named{mode === 'hard' ? ' with their capitals' : ''} · {sum.solved} right on the first try{sum.helped > 0 && <>, {sum.helped} with help</>}.</p>
          <div className="finish-actions">
            <button className="btn" onClick={restart}>Play again</button>
            {mode === 'easy' && <button className="btn ghost" onClick={() => changeRound({ mode: 'hard' })}>Try hard mode</button>}
          </div>
        </div>
      )}
    </div>
  )
}
