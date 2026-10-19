// Plays one round of 10 questions. Text modes: a card in the middle; pin mode: the big map.
// Every question has a 15-second timer; faster right answers give more points.
import { useCallback, useEffect, useRef, useState } from 'react'
import WorldMap from '../map/WorldMap'
import { capitalsOf, countryById, countryName, flagUrl, type Area } from '../data/countries'
import { useLang, useT } from '../i18n'
import {
  MAX_POINTS, MODE_ICON, ROUND_LENGTH, TIME_LIMIT_MS, checkTyped, scorePin, scoreTyped, summarizeRound,
  type Answer, type GameMode, type RoundResult,
} from './modes'
import { AnswerText } from './GameResult'

interface Props {
  mode: GameMode
  area: Area | null
  questions: string[]
  /** shown in the top bar, e.g. "Duel vs Anna" */
  label?: string
  onDone: (r: RoundResult) => void
  onExit: () => void
}

export default function GamePlay({ mode, area, questions, label, onDone, onExit }: Props) {
  const t = useT()
  const lang = useLang()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [input, setInput] = useState('')
  const [last, setLast] = useState<Answer | null>(null) // set = showing feedback for the current question
  const started = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const id = questions[index]
  const c = countryById.get(id)!
  const score = answers.reduce((n, a) => n + a.pts, 0)

  // only the first answer per question counts (e.g. not the timer firing a moment later)
  const answered = useRef(false)
  const record = useCallback((a: Answer) => {
    if (answered.current) return
    answered.current = true
    setLast(a)
    setAnswers((list) => [...list, a])
  }, [])

  // new question: restart the clock and the timer
  useEffect(() => {
    started.current = Date.now()
    answered.current = false
    inputRef.current?.focus()
    const timer = setTimeout(() => record({ id, ok: 0, pts: 0, ms: TIME_LIMIT_MS }), TIME_LIMIT_MS)
    return () => clearTimeout(timer)
  }, [index, id, record])

  // right answers go on by themselves; wrong ones wait for "Next" so you can read the solution
  useEffect(() => {
    if (!last) return
    if (last.ok === 2) {
      const timer = setTimeout(next, 1100)
      return () => clearTimeout(timer)
    }
    nextRef.current?.focus()
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const finished = useRef(false)
  function next() {
    if (!last || finished.current) return
    if (index + 1 >= questions.length) { finished.current = true; onDone(summarizeRound(answers)); return }
    setLast(null)
    setInput('')
    setIndex(index + 1)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (last) { next(); return }
    if (!input.trim() || mode === 'pin') return
    const ms = Date.now() - started.current
    record(scoreTyped(id, checkTyped(mode, input, c), ms, input.trim()))
  }

  // pin mode: clicking a country answers (refs keep the map's click handler stable)
  const lastRef = useRef(last)
  lastRef.current = last
  const idRef = useRef(id)
  idRef.current = id
  const onPickCountry = useCallback((clicked: string) => {
    if (lastRef.current) return
    record(scorePin(idRef.current, clicked, Date.now() - started.current))
  }, [record])

  const prompt =
    mode === 'capital' ? t.gamePromptCapital
    : mode === 'flag' ? t.gamePromptFlag
    : mode === 'reverse' ? t.gamePromptReverse
    : t.gamePromptPin

  const head = (
    <div className="g-head">
      <button className="pill" onClick={() => { if (confirm(t.confirmQuitGame)) onExit() }}>{t.exit}</button>
      <span className="g-title">{MODE_ICON[mode]} {label ?? t.gameMode[mode]}</span>
      <span className="g-score" aria-label={t.points}>{score}<small> / {MAX_POINTS * questions.length}</small></span>
    </div>
  )
  const progress = (
    <div className="g-progress">
      <span>{t.questionOf(index + 1, questions.length)}</span>
      <span className="g-timer" aria-hidden="true">
        {/* restarts with every question (key); stops when answered */}
        <span key={index} className={last ? 'stopped' : ''} style={{ animationDuration: `${TIME_LIMIT_MS}ms` }} />
      </span>
    </div>
  )
  const dots = (
    <div className="g-dots" aria-hidden="true">
      {Array.from({ length: Math.max(ROUND_LENGTH, questions.length) }, (_, i) => (
        <i key={i} className={i < answers.length ? ['bad', 'half', 'good'][answers[i].ok] : i === index ? 'now' : ''} />
      ))}
    </div>
  )
  const feedback = last && (
    <div className={'banner ' + ['bad', 'half', 'good'][last.ok]} role="status">
      <strong>{last.ok === 2 ? t.correct : last.ms >= TIME_LIMIT_MS && last.given === undefined ? t.timeUp : last.ok === 1 ? t.closeBy : t.notQuite}</strong>
      <span className="g-pts">+{last.pts}</span>
      {last.km !== undefined && last.km > 0 && <div>{t.kmOff(last.km)}</div>}
      {last.ok !== 2 && <div>{t.answerIs} <b><AnswerText mode={mode} id={id} /></b></div>}
    </div>
  )

  if (mode === 'pin') {
    const classFor = (cid: string) =>
      !last ? 'q-open' : cid === id ? 'q-solved' : cid === last.given ? 'q-missed' : 'q-open'
    return (
      <div className="quiz-stage game-pin">
        <div className="quiz-map">
          <WorldMap fill reserve={{ top: 150, left: 8, right: 8, bottom: last ? 140 : 8 }} continent={area} focusId={last ? id : null}
            onPickCountry={onPickCountry} classFor={classFor} colorKey={`${index}:${last ? 1 : 0}`} hideNames />
        </div>
        <div className="q-bar g-pin-bar">
          {head}
          <p className="g-pin-q">{prompt} <b>{countryName(c, lang)}</b></p>
          {progress}
        </div>
        {last && (
          <div className="q-bar g-pin-feedback">
            {feedback}
            {last.ok !== 2 && <button ref={nextRef} className="btn" onClick={next}>{t.next} <small>{t.enter}</small></button>}
          </div>
        )}
        {last && <KeyNext onNext={next} />}
      </div>
    )
  }

  return (
    <div className="game-stage">
      <div className="g-top card-surface">{head}{progress}{dots}</div>
      <article className={'card card-surface g-card' + (last && last.ok !== 2 ? ' shake' : '')} key={index}>
        {mode !== 'reverse' && <img className="flag" src={flagUrl(c)} alt={mode === 'flag' ? t.flagQuestion : t.flagOf(countryName(c, lang))} />}
        {mode === 'capital' && <h2>{countryName(c, lang)}</h2>}
        {mode === 'reverse' && <h2 className="g-capital">{capitalsOf(c, lang)[0]}</h2>}
        <p className="prompt">{prompt}</p>
        <form onSubmit={submit} className="answer">
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} readOnly={!!last}
            className={last ? (last.ok === 2 ? 'ok' : 'bad') : ''}
            placeholder={mode === 'capital' ? t.typeCapital : t.typeCountry} aria-label={prompt}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go" />
          {!last && <button className="btn" type="submit">{t.check}</button>}
          {last && last.ok !== 2 && <button ref={nextRef} className="btn" type="submit">{t.next}</button>}
        </form>
        {!last && <button className="q-link" onClick={() => record({ id, ok: 0, pts: 0, ms: Date.now() - started.current, given: '' })}>{t.dontKnow}</button>}
        {feedback}
      </article>
    </div>
  )
}

/** Enter = next question (pin mode has no text field that could take the Enter key). */
function KeyNext({ onNext }: { onNext: () => void }) {
  const ref = useRef(onNext)
  ref.current = onNext
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') ref.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}
