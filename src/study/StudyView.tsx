// One study session (one continent, or all continents mixed): map on top, flashcard below.
// Flow: type the capital -> Verify -> right/wrong feedback -> (if right) details + map target -> rate 1-4.
// Practice mode: every country of the scope once, in random order, without touching the review schedule.
// Direction "country": the capital is shown and you type the country (own deck; flag and map highlight only after answering).
import { useEffect, useRef, useState } from 'react'
import WorldMap from '../map/WorldMap'
import CountryFacts from './CountryFacts'
import { capitalsOf, countries, countryById, countryName, flagUrl, inArea, otherName, type Area, type Country } from '../data/countries'
import { useLang, useT } from '../i18n'
import { RATINGS, store, useProgress, type Direction, type Rating } from '../progress/progress'
import { checkAnswer, checkCountryName } from './matcher'
import { missed, passed, shuffle } from './practice'

type Phase = 'ask' | 'right' | 'wrong'

interface Props {
  continent: Area | null // a continent or a region (e.g. West Africa)
  /** practice = go through ALL countries of the scope once (ignores what is due; doesn't change the schedule) */
  practice?: boolean
  /** capital = country shown, type the capital; country = capital shown, type the country */
  direction?: Direction
  onPractice: () => void
  onExit: () => void
}

const idsIn = (area: Area | null) => countries.filter((c) => inArea(c, area)).map((c) => c.id)

export default function StudyView({ continent, practice = false, direction = 'capital', onPractice, onExit }: Props) {
  useProgress() // re-render when the numbers change
  const t = useT()
  const lang = useLang()
  // Review mode: the store decides which card comes next (due reviews, learning cards, new cards within the daily limit).
  const [reviewNext, setReviewNext] = useState(() => (practice ? null : store.pickNext(continent, direction)))
  // Practice mode: our own queue; the first id is the current card.
  const [queue, setQueue] = useState(() => (practice ? shuffle(idsIn(continent)) : []))
  const [missedIds, setMissedIds] = useState<Set<string>>(() => new Set())
  const next = practice ? (queue.length ? { id: queue[0], kind: 'new' as const } : null) : reviewNext
  const [phase, setPhase] = useState<Phase>('ask')
  const [input, setInput] = useState('')
  const [typo, setTypo] = useState(false)
  const [wrongText, setWrongText] = useState('') // what you typed when you were wrong
  const [copyMsg, setCopyMsg] = useState('') // hint while you re-type the correct answer
  const [nudge, setNudge] = useState(0) // restarts the shake animation on a wrong re-type
  const [stats, setStats] = useState({ reviews: 0, firstTry: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const current = next ? countryById.get(next.id)! : null
  const counts = store.counts(continent, direction)
  const total = idsIn(continent).length
  const secured = practice ? total - queue.length : store.learned(continent, direction)

  // Focus the input whenever a new question appears (opens the on-screen keyboard on phones).
  useEffect(() => {
    if (phase === 'ask' || phase === 'wrong') inputRef.current?.focus()
  }, [phase, current?.id])

  const reverse = direction === 'country'
  const check = (text: string, c: Country) => (reverse ? checkCountryName : checkAnswer)(text, c, countries)
  /** what the learner has to type out after a wrong answer */
  const answerOf = (c: Country) => (reverse ? countryName(c, lang) : capitalsOf(c, lang)[0])

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!current) return

    if (phase === 'ask') {
      const result = check(input, current)
      setTypo(result.kind === 'typo')
      if (result.kind === 'wrong') {
        // Wrong: show the answer, then the learner has to write it out once before moving on.
        setWrongText(input.trim())
        setInput('')
        setCopyMsg('')
        setPhase('wrong')
      } else {
        setPhase('right')
      }
    } else if (phase === 'right' && practice) {
      nextPractice() // Enter = next card
    } else if (phase === 'wrong') {
      const result = check(input, current)
      if (result.kind === 'correct') {
        if (practice) nextPractice()
        else finishCard('again') // counts as "Again": the card comes back soon
      } else {
        const target = answerOf(current)
        setCopyMsg(result.kind === 'typo' ? t.almost(target) : t.notSame(target))
        setNudge((n) => n + 1)
      }
    }
  }

  function resetCard() {
    setCopyMsg('')
    setWrongText('')
    setPhase('ask')
    setInput('')
  }

  function finishCard(rating: Rating) {
    if (!current || phase === 'ask' || practice) return
    store.review(current.id, rating, direction)
    setStats((s) => ({ reviews: s.reviews + 1, firstTry: s.firstTry + (rating !== 'again' ? 1 : 0) }))
    setReviewNext(store.pickNext(continent, direction)) // after the review, so the card gets its new due time first
    resetCard()
  }

  /** Practice: right -> the card is done; wrong -> it comes back a few cards later. */
  function nextPractice() {
    if (!current || phase === 'ask') return
    const ok = phase === 'right'
    if (!ok) setMissedIds((m) => new Set(m).add(current.id))
    const firstTry = ok && !missedIds.has(current.id)
    setStats((s) => ({ reviews: s.reviews + 1, firstTry: s.firstTry + (firstTry ? 1 : 0) }))
    setQueue((q) => (ok ? passed(q) : missed(q)))
    resetCard()
  }

  function restartPractice() {
    setQueue(shuffle(idsIn(continent)))
    setMissedIds(new Set())
    setStats({ reviews: 0, firstTry: 0 })
    resetCard()
  }

  // Keyboard: 1-4 rates after a correct answer. (After a wrong answer you must type the answer out; Enter submits it.)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // preventDefault: otherwise the key would also be typed into the NEXT card's input box
      if (practice) {
        // Enter in the answer box is handled by the form; this catches Enter when the focus is elsewhere
        if (phase === 'right' && e.key === 'Enter' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault()
          nextPractice()
        }
        return
      }
      if (phase === 'right' && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        finishCard(RATINGS[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // On wide screens the card panel floats over the right side of the map; keep the continent clear of it.
  const [vw, setVw] = useState(window.innerWidth)
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const wide = vw >= 940
  const panelWidth = Math.min(460, Math.max(380, vw * 0.32))
  const reserve = wide ? { left: 24, right: panelWidth + 48, top: 24, bottom: 24 } : { left: 8, right: 8, top: 8, bottom: 8 }

  const labels = current && !practice ? store.previewLabels(current.id, direction) : null
  const waitMin = store.minutesUntilNextLearning(continent, direction)
  // reverse: the highlight would give the answer away, so it only appears after answering
  const mapFocus = current && (!reverse || phase !== 'ask') ? current.id : null
  // right answer: zoom in on the country and show its biggest cities
  const cityFocus = current && phase === 'right' ? current.id : null

  return (
    <div className="study-stage">
      <div className="study-map">
        {/* the country being asked is highlighted on the map (capital -> country: after answering) */}
        <WorldMap fill reserve={reserve} continent={continent} focusId={mapFocus} onPickCountry={() => {}} hideNames={reverse}
          cities={cityFocus} zoomTo={cityFocus} globe />
        <div className="stage-title">{continent ? t.continent(continent) : t.allContinents}{practice && <span className="mode-tag">{t.practiceTag}</span>}{reverse && <span className="mode-tag">{t.dirCountry}</span>}</div>
      </div>

      <div className="study-main">
        <div className="study-top">
          <div className="study-head">
            <button className="pill" onClick={onExit}>{t.exit}</button>
            {practice ? (
              <div className="counts" aria-label={t.practiceRound}>
                <span className="n new on">{queue.length}<small>{t.left}</small></span>
                <span className="n learning on">{missedIds.size}<small>{t.missed}</small></span>
                <span className="n due on">{total - queue.length}<small>{t.done}</small></span>
              </div>
            ) : (
              <div className="counts" aria-label={t.cardsLeft}>
                <span className={'n new' + (next?.kind === 'new' ? ' on' : '')}>{counts.new}<small>{t.countNew}</small></span>
                <span className={'n learning' + (next?.kind === 'learning' ? ' on' : '')}>{counts.learning}<small>{t.countLearning}</small></span>
                <span className={'n due' + (next?.kind === 'review' ? ' on' : '')}>{counts.due}<small>{t.countDue}</small></span>
              </div>
            )}
            <span className="progress-text">{secured} / {total}</span>
          </div>
          <span className="bar big session-bar"><span style={{ width: `${(secured / total) * 100}%` }} /></span>
        </div>

        {!current && practice ? (
          <article className="card card-surface finished">
            <div className="done-badge" aria-hidden="true">✓</div>
            <h2>{t.roundComplete}</h2>
            <p>{t.roundSummary(total, stats.firstTry, missedIds.size)}</p>
            <div className="finish-actions">
              <button className="btn" onClick={restartPractice}>{t.practiceAgain}</button>
              <button className="btn ghost" onClick={onExit}>Back to the map</button>
            </div>
          </article>
        ) : !current ? (
          <article className="card card-surface finished">
            <div className="done-badge" aria-hidden="true">✓</div>
            <h2>{t.allDone}</h2>
            <p>
              {t.reviewedSummary(stats.reviews, stats.firstTry)}
              {waitMin !== null && t.nextDueIn(waitMin)}
              {waitMin === null && counts.new === 0 && t.comeBackTomorrow}
            </p>
            <div className="finish-actions">
              <button className="btn" onClick={onPractice}>
                {t.practiceAllCountries(total)} <small>{t.practiceAllCountriesSub}</small>
              </button>
              <button className="btn ghost" onClick={onExit}>Back to the map</button>
            </div>
          </article>
        ) : (
          <article className={'card card-surface' + (phase === 'wrong' ? ' shake' : '')} key={current.id + ':' + stats.reviews}>
            {reverse ? (
              <>
                {phase !== 'ask' && <img className="flag" src={flagUrl(current)} alt={t.flagOf(countryName(current, lang))} />}
                <h2>{capitalsOf(current, lang).join(' · ')}</h2>
                <p className="prompt">{t.countryOfCapital}</p>
              </>
            ) : (
              <>
                <img className="flag" src={flagUrl(current)} alt={t.flagOf(countryName(current, lang))} />
                <h2>{countryName(current, lang)}</h2>
                {otherName(current, lang) && <p className="de">{otherName(current, lang)}</p>}
                <p className="prompt">{t.whatCapital}</p>
              </>
            )}

            <form onSubmit={submit} className={'answer' + (nudge === 0 ? '' : nudge % 2 ? ' nudge-a' : ' nudge-b')}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                readOnly={phase === 'right'}
                className={phase === 'right' ? 'ok' : phase === 'wrong' ? 'copy' : ''}
                placeholder={phase === 'wrong' ? t.typeThe(answerOf(current)) : reverse ? t.typeCountry : t.typeCapital}
                aria-label={reverse ? t.country : t.capital}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go"
              />
              {phase !== 'right' && <button className="btn" type="submit">{phase === 'wrong' ? t.continue : t.check}</button>}
            </form>

            {phase !== 'ask' && (
              <div className={'banner ' + (phase === 'right' ? 'good' : 'bad')} role="status">
                {phase === 'right' ? (
                  <>
                    <strong>{t.correct}</strong>
                    {typo && <span>{t.watchSpelling}</span>}
                    {reverse
                      ? <div>{t.country}: <b>{countryName(current, lang)}</b></div>
                      : <div>{current.capitals.length > 1 ? t.capitals : t.capital}: <b>{capitalsOf(current, lang).join(' · ')}</b></div>}
                  </>
                ) : (
                  <>
                    <strong>{t.notQuite}</strong>
                    {wrongText && <div className="was">{t.youTyped} <s>{wrongText}</s></div>}
                    <div>{t.answerIs} <b>{reverse ? countryName(current, lang) : capitalsOf(current, lang).join(' · ')}</b></div>
                    <div className="must">{practice ? t.writeOutPractice : t.writeOutCard}</div>
                  </>
                )}
              </div>
            )}

            {phase === 'wrong' && copyMsg && <p className="copy-msg" role="alert">{copyMsg}</p>}

            {phase === 'right' && (
              <>
                <CountryFacts country={current} />
                {practice ? (
                  <button className="btn next-btn" onClick={nextPractice} autoFocus>{t.next} <small>{t.enter}</small></button>
                ) : (
                <div className="ratings" role="group" aria-label={t.howWell}>
                  {RATINGS.map((r, i) => (
                    <button key={r} className={'rate ' + r} onClick={() => finishCard(r)}>
                      <span className="rl">{t.rating[r]}</span>
                      <span className="ri">{t.interval(labels![r])}</span>
                      <kbd>{i + 1}</kbd>
                    </button>
                  ))}
                </div>
                )}
              </>
            )}
          </article>
        )}
      </div>
    </div>
  )
}

export type { Country }
