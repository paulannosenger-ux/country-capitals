// Quiz duel screens: the list on the Play tab, choosing a friend, the board (6 rounds), choosing a category, playing.
// Flow on my turn: first answer the round the other one chose (if any), then choose + play the next round.
import { useEffect, useState } from 'react'
import { createQuizDuel, fetchPlayers, saveQuizDuel, useQuizDuels, type PlayerCard } from '../cloud/cloud'
import { useLang, useT } from '../i18n'
import QuizDuelPlay, { optionLabel, questionLabel } from './QuizDuelPlay'
import {
  QD_CATEGORIES, QD_ICON, QD_ROUNDS, chooserOf, makeQuestions, myTasks, qdOutcome, scoresOf, turnOf, usedIds,
  type QdAnswers, type QdRound, type QuizDuel,
} from './quizduel'

const other = (d: Pick<QuizDuel, 'players'>, me: string) => d.players.find((p) => p !== me)!
const answerCount = (rounds: QdRound[]) => rounds.reduce((n, r) => n + Object.keys(r.ans).length, 0)

/** The quiz-duel panel on the Play tab: start a new one, and all running / finished ones. */
export function QuizDuelList({ me, onOpen, onNew }: { me: string; onOpen: (id: string) => void; onNew: () => void }) {
  const t = useT()
  const duels = useQuizDuels()
  const groups = {
    yourTurn: (duels ?? []).filter((d) => d.turn === me),
    waiting: (duels ?? []).filter((d) => d.turn !== null && d.turn !== me),
    done: (duels ?? []).filter((d) => d.turn === null).slice(0, 20),
  }
  return (
    <div className="panel card-surface g-duels qd-list">
      <div className="lb-head">
        <h3>⚔️ {t.quizDuel}</h3>
        <button className="btn" onClick={onNew}>{t.qdNew}</button>
      </div>
      <p className="muted">{t.qdLede}</p>
      {!duels && <p className="muted">{t.loading}</p>}
      {duels && duels.length === 0 && <p>{t.qdNoDuels}</p>}
      {(['yourTurn', 'waiting', 'done'] as const).map((g) => groups[g].length > 0 && (
        <div key={g} className="g-group">
          <p className="eyebrow">{g === 'waiting' ? t.duelGroup.waiting : t.duelGroup[g]}</p>
          {groups[g].map((d) => {
            const s = scoresOf(d)
            const o = qdOutcome(d, me)
            const played = d.rounds.filter((r) => r.ans[me]).length
            return (
              <button key={d.id} className={'g-duel' + (g === 'yourTurn' ? ' hot' : '')} onClick={() => onOpen(d.id)}>
                <span className="g-duel-icon" aria-hidden="true">⚔️</span>
                <span className="g-duel-main">
                  <b>{d.names[other(d, me)] ?? '?'}</b>
                  <small className="muted">{d.turn === null ? t.qdOver : t.qdRoundOf(Math.min(QD_ROUNDS, played + (g === 'yourTurn' ? 1 : 0)), QD_ROUNDS)}</small>
                </span>
                <span className={'g-duel-side ' + (o ?? '')}>
                  {t.qdResultLine(s[me].pts, s[other(d, me)].pts)}
                  {g === 'yourTurn' ? <small>{t.playNow}</small> : o && <small>{o === 'win' ? t.won : o === 'loss' ? t.lost : t.draw}</small>}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

type Step =
  | { kind: 'friend' }
  | { kind: 'board' }
  | { kind: 'choose'; index: number }
  | { kind: 'play'; index: number; round: Pick<QdRound, 'cat' | 'qs'>; isNew: boolean }
  | { kind: 'saving'; failed: boolean; retry: () => void }

/** A whole quiz duel. id = null: start a new one (choose a friend first). */
export function QuizDuelScreen({ id: startId, me, myName, onBack }: { id: string | null; me: string; myName: string; onBack: () => void }) {
  const t = useT()
  const duels = useQuizDuels()
  const [id, setId] = useState(startId)
  const [opponent, setOpponent] = useState<{ uid: string; name: string } | null>(null)
  const [step, setStep] = useState<Step>(startId ? { kind: 'board' } : { kind: 'friend' })
  // rounds as I just played them, until the live copy from the database has caught up
  const [local, setLocal] = useState<QdRound[] | null>(null)
  const live = id ? duels?.find((d) => d.id === id) ?? null : null
  const duel: QuizDuel | null = !live ? null
    : local && answerCount(local) > answerCount(live.rounds) ? { ...live, rounds: local, turn: turnOf(local, live.players) } : live
  const players = duel?.players ?? [me, opponent?.uid ?? '']
  const rounds = duel?.rounds ?? []
  const names = duel?.names ?? { [me]: myName, ...(opponent ? { [opponent.uid]: opponent.name } : {}) }
  const them = players.find((p) => p !== me) ?? ''

  /** Save (or create) after a played round; then on to whatever is next. */
  async function finishRound(index: number, round: Pick<QdRound, 'cat' | 'qs'>, mine: QdAnswers, isNew: boolean) {
    const updated: QdRound[] = isNew
      ? [...rounds, { ...round, ans: { [me]: mine } }]
      : rounds.map((r, i) => (i === index ? { ...r, ans: { ...r.ans, [me]: mine } } : r))
    const save = async () => {
      setStep({ kind: 'saving', failed: false, retry: save })
      try {
        if (!id) {
          const newId = await createQuizDuel(opponent!, updated[0])
          setId(newId)
        } else {
          await saveQuizDuel({ ...(duel as QuizDuel), id }, updated)
        }
        setLocal(updated)
        // answered the other one's round and it's my turn to choose: straight on
        const tasks = myTasks({ rounds: updated, players }, me)
        setStep(!isNew && tasks.choose ? { kind: 'choose', index: updated.length } : { kind: 'board' })
      } catch {
        setStep({ kind: 'saving', failed: true, retry: save })
      }
    }
    await save()
  }

  if (step.kind === 'friend') {
    return <FriendPicker me={me} onBack={onBack} onPick={(p) => { setOpponent(p); setStep({ kind: 'choose', index: 0 }) }} />
  }

  if (step.kind === 'choose') {
    const done = new Set(rounds.map((r) => r.cat))
    return (
      <section className="settings games">
        <div className="page-head">
          <button className="pill" onClick={() => (id ? setStep({ kind: 'board' }) : onBack())}>{t.back}</button>
          <h1 className="page-title">{t.qdChoose(step.index + 1)}</h1>
        </div>
        <p className="muted g-lede">{t.duelVs(names[them] ?? '?')}</p>
        <div className="g-modes qd-cats" role="list">
          {QD_CATEGORIES.map((cat) => (
            <button key={cat} className="g-mode card-surface" onClick={() =>
              setStep({ kind: 'play', index: step.index, isNew: true, round: { cat, qs: makeQuestions(cat, usedIds(rounds)) } })}>
              <span className="g-mode-icon" aria-hidden="true">{QD_ICON[cat]}</span>
              <b>{t.qdCat[cat]}</b>
              <span className="muted">{t.qdCatDesc[cat]}{done.has(cat) ? ` · ${t.qdPlayedAlready}` : ''}</span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  if (step.kind === 'play') {
    return (
      <QuizDuelPlay key={step.index + ':' + step.round.qs.map((q) => q.id).join()} round={step.round}
        label={`${t.qdRound(step.index + 1)} · ${names[them] ?? ''}`}
        onExit={() => setStep(id ? { kind: 'board' } : { kind: 'choose', index: 0 })}
        onDone={(a) => void finishRound(step.index, step.round, a, step.isNew)} />
    )
  }

  if (step.kind === 'saving') {
    return (
      <section className="settings">
        <div className="panel card-surface">
          <h3>{step.failed ? t.duelError : t.saving}</h3>
          {step.failed && <div className="row"><button className="btn" onClick={step.retry}>{t.tryAgain}</button></div>}
        </div>
      </section>
    )
  }

  // ---- board ----
  if (!duel) return <section className="settings"><p className="muted">{t.loading}</p></section>
  const s = scoresOf(duel)
  const tasks = duel.turn === me ? myTasks(duel, me) : { answer: null, choose: false }
  const o = qdOutcome(duel, me)
  function play() {
    if (tasks.answer !== null) setStep({ kind: 'play', index: tasks.answer, isNew: false, round: rounds[tasks.answer] })
    else if (tasks.choose) setStep({ kind: 'choose', index: rounds.length })
  }

  return (
    <section className="settings games qd-board-page">
      <div className="page-head">
        <button className="pill" onClick={onBack}>{t.back}</button>
        <h1 className="page-title">{t.quizDuel}</h1>
      </div>
      <div className="panel card-surface qd-board">
        <div className="qd-score">
          <div><span className="muted">{t.qdYou}</span><b>{s[me].pts}</b></div>
          <span className="qd-vs">:</span>
          <div><span className="muted">{names[them] ?? '?'}</span><b>{s[them].pts}</b></div>
        </div>
        <p className={'qd-status ' + (o ?? '')}>
          {o ? `${t.qdOver} · ${o === 'win' ? t.won : o === 'loss' ? t.lost : t.draw}` : duel.turn === me ? t.duelGroup.yourTurn : t.qdWaitingFor(names[them] ?? '?')}
        </p>
        {duel.turn === me && (
          <button className="btn engage" onClick={play}>
            {tasks.answer !== null ? t.qdPlay(tasks.answer + 1) : t.qdChooseNext(rounds.length + 1)}
            {tasks.answer !== null && tasks.choose && <small>{t.qdThenChoose}</small>}
          </button>
        )}
        <div className="qd-rounds">
          {Array.from({ length: QD_ROUNDS }, (_, i) => <RoundRow key={i} index={i} round={rounds[i]} me={me} them={them}
            chooser={names[chooserOf(players, i)] ?? '?'} />)}
        </div>
      </div>
    </section>
  )
}

/** One line of the board: my 3 answers · round + category · their 3 answers. Tap to see the questions. */
function RoundRow({ index, round, me, them, chooser }: { index: number; round?: QdRound; me: string; them: string; chooser: string }) {
  const t = useT()
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const mine = round?.ans[me]
  const theirs = round?.ans[them]
  const showTheirs = !!mine // their answers stay hidden until I played the round myself
  const dots = (a: QdAnswers | undefined, visible: boolean) => (
    <span className="qd-dots">
      {[0, 1, 2].map((i) => {
        const cls = !a ? '' : !visible ? 'hidden' : a.picks[i] === round!.qs[i].id ? 'good' : 'bad'
        return <i key={i} className={cls} />
      })}
    </span>
  )
  return (
    <div className={'qd-round' + (open ? ' open' : '')}>
      <button className="qd-round-line" disabled={!round || !mine} onClick={() => setOpen(!open)} aria-expanded={open}>
        {dots(mine, true)}
        <span className="qd-round-mid">
          <small className="muted">{t.qdRound(index + 1)}</small>
          {round ? <b>{QD_ICON[round.cat]} {t.qdCat[round.cat]}</b> : <b className="muted">–</b>}
          {round && <small className="muted">{t.qdChosenBy(chooser)}</small>}
        </span>
        {dots(theirs, showTheirs)}
      </button>
      {open && round && mine && (
        <ul className="qd-answers">
          {round.qs.map((q, i) => (
            <li key={q.id}>
              <span className={mine.picks[i] === q.id ? 'good' : 'bad'}>{mine.picks[i] === q.id ? '✓' : '✗'}</span>
              <span>
                {round.cat === 'capital' ? `${questionLabel(round.cat, q.id, lang)} → ` : ''}<b>{optionLabel(round.cat, q.id, lang)}</b>
                {mine.picks[i] !== q.id && mine.picks[i] && <small className="muted"> ({optionLabel(round.cat, mine.picks[i], lang)})</small>}
              </span>
              {theirs && <span className={theirs.picks[i] === q.id ? 'good' : 'bad'}>{theirs.picks[i] === q.id ? '✓' : '✗'}</span>}
            </li>
          ))}
          {!theirs && <li className="muted">{t.qdHidden}</li>}
        </ul>
      )}
    </div>
  )
}

/** Choose the friend to play against (everybody with an account). */
function FriendPicker({ me, onPick, onBack }: { me: string; onPick: (p: { uid: string; name: string }) => void; onBack: () => void }) {
  const t = useT()
  const [players, setPlayers] = useState<(PlayerCard & { uid: string })[] | null>(null)
  useEffect(() => { fetchPlayers().then((p) => setPlayers(p.filter((x) => x.uid !== me)), () => setPlayers([])) }, [me])
  return (
    <section className="settings games">
      <div className="page-head">
        <button className="pill" onClick={onBack}>{t.back}</button>
        <h1 className="page-title">{t.qdNew}</h1>
      </div>
      <div className="panel card-surface">
        <h3>{t.qdPickFriend}</h3>
        {!players && <p className="muted">{t.loading}</p>}
        {players && players.length === 0 && <p className="muted">{t.qdNoFriends}</p>}
        {players && players.length > 0 && (
          <div className="chips">
            {players.map((p) => <button key={p.uid} className="chip" onClick={() => onPick({ uid: p.uid, name: p.name })}>{p.name}</button>)}
          </div>
        )}
      </div>
    </section>
  )
}

