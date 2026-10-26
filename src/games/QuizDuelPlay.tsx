// Plays one quiz-duel round: 3 multiple-choice questions, 20 seconds each.
// Right answers go on by themselves; after a wrong one you see the solution and press "Next".
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { capitalsOf, countryById, countryName, flagUrl } from '../data/countries'
import { useLang, useT, type Lang } from '../i18n'
import { NATURE } from '../../data/nature'
import { natureName } from '../nature/nature'
import { QD_ICON, QD_TIME_MS, type QdAnswers, type QdCategory, type QdRound } from './quizduel'

// the map with the river / mountains (brings the shapes, so only loaded when needed)
const NatureShape = lazy(() => import('../nature/NatureShape'))
const natureById = new Map(NATURE.map((n) => [n.id, n]))

/** The text on an answer button (and in the round overview). */
export function optionLabel(cat: QdCategory, id: string, lang: Lang): string {
  if (cat === 'capital') return capitalsOf(countryById.get(id)!, lang)[0]
  if (cat === 'country') return countryName(countryById.get(id)!, lang)
  return natureName(natureById.get(id)!, lang)
}
/** What was asked, as text (for the round overview): the country, or the river's name. */
export function questionLabel(cat: QdCategory, id: string, lang: Lang): string {
  return cat === 'capital' || cat === 'country' ? countryName(countryById.get(id)!, lang) : natureName(natureById.get(id)!, lang)
}

interface Props {
  round: Pick<QdRound, 'cat' | 'qs'>
  label: string // e.g. "Round 2 of 6 · vs Anna"
  onDone: (a: QdAnswers) => void
  onExit: () => void
}

export default function QuizDuelPlay({ round, label, onDone, onExit }: Props) {
  const t = useT()
  const lang = useLang()
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<string[]>([])
  const [ms, setMs] = useState(0)
  const started = useRef(Date.now())
  const nextRef = useRef<HTMLButtonElement>(null)
  const q = round.qs[index]
  const picked = picks.length > index ? picks[index] : null // set = showing the solution
  const cat = round.cat

  function answer(id: string) {
    if (picks.length > index) return // only the first answer counts (not the timer a moment later)
    setPicks((p) => [...p, id])
    setMs((m) => m + Math.min(QD_TIME_MS, Date.now() - started.current))
  }

  // new question: restart clock + timer ('' = time up)
  useEffect(() => {
    started.current = Date.now()
    const timer = setTimeout(() => answer(''), QD_TIME_MS)
    return () => clearTimeout(timer)
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  const done = useRef(false)
  function next() {
    if (picked === null || done.current) return
    if (index + 1 >= round.qs.length) { done.current = true; onDone({ picks, ms }); return }
    setIndex(index + 1)
  }
  // right: go on after a moment; wrong: wait for "Next"
  useEffect(() => {
    if (picked === null) return
    if (picked === q.id) {
      const timer = setTimeout(next, 1100)
      return () => clearTimeout(timer)
    }
    nextRef.current?.focus()
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const c = cat === 'capital' || cat === 'country' ? countryById.get(q.id)! : null
  const prompt = cat === 'capital' ? t.qdWhatCapitalOf : cat === 'country' ? t.qdWhichFlag : t.natureQuestion[cat]

  return (
    <div className="game-stage qd-stage">
      <div className="g-top card-surface">
        <div className="g-head">
          <button className="pill" onClick={() => { if (confirm(t.confirmQuitGame)) onExit() }}>{t.exit}</button>
          <span className="g-title">{QD_ICON[cat]} {t.qdCat[cat]}</span>
          <span className="g-score">{label}</span>
        </div>
        <div className="g-progress">
          <span>{t.qdQuestionOf(index + 1, round.qs.length)}</span>
          <span className="g-timer" aria-hidden="true">
            <span key={index} className={picked !== null ? 'stopped' : ''} style={{ animationDuration: `${QD_TIME_MS}ms` }} />
          </span>
        </div>
      </div>

      <article className="card card-surface g-card qd-card" key={index}>
        {c && <img className="flag" src={flagUrl(c)} alt={cat === 'country' ? t.flagQuestion : t.flagOf(countryName(c, lang))} />}
        {cat === 'capital' && c && <h2>{countryName(c, lang)}</h2>}
        {!c && <Suspense fallback={<div className="qd-map" />}><NatureShape id={q.id} /></Suspense>}
        <p className="prompt">{prompt}</p>

        <div className="qd-options" role="group" aria-label={prompt}>
          {q.opts.map((o) => {
            const state = picked === null ? '' : o === q.id ? ' right' : o === picked ? ' wrong' : ' dim'
            return (
              <button key={o} className={'qd-opt' + state} disabled={picked !== null} onClick={() => answer(o)}>
                {optionLabel(cat, o, lang)}
              </button>
            )
          })}
        </div>

        {picked !== null && picked !== q.id && (
          <>
            <div className="banner bad" role="status"><strong>{picked === '' ? t.timeUp : t.notQuite}</strong></div>
            <button ref={nextRef} className="btn next-btn" onClick={next}>{t.next}</button>
          </>
        )}
        {picked === q.id && <div className="banner good" role="status"><strong>{t.correct}</strong></div>}
      </article>
    </div>
  )
}
