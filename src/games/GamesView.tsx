// "Play" tab: quick rounds in four modes, and duels against friends (invite them or share a link).
import { useEffect, useState } from 'react'
import { CONTINENTS, REGIONS, type Area } from '../data/countries'
import { useT } from '../i18n'
import { loadDuel, submitDuel, useAccount, useMatches } from '../cloud/cloud'
import { matchState, opponents, outcome, ranking, type Match } from './duels'
import { GAME_MODES, MODE_ICON, bestKey, loadBest, pickQuestions, saveBest, type GameMode, type RoundResult } from './modes'
import GamePlay from './GamePlay'
import GameResult from './GameResult'
import '../quiz/quiz.css'
import './games.css'

interface Setup { mode: GameMode; area: Area | null; questions: string[] }
type Screen =
  | { kind: 'hub' }
  | (Setup & { kind: 'play'; matchId?: string; label?: string; preselect?: string[] })
  | (Setup & { kind: 'result'; mine?: RoundResult; matchId?: string; preselect?: string[]; record?: { old: number | null } | null })
  | { kind: 'invite'; match: Match }
  | (Setup & { kind: 'saving'; matchId: string; result: RoundResult; failed: boolean })

const SETUP_KEY = 'country-capitals:games:setup'
function loadSetup(): { mode: GameMode; area: Area | null } {
  try { return { mode: 'capital', area: null, ...JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') } } catch { return { mode: 'capital', area: null } }
}

interface Props {
  /** duel id from a shared link (?duel=...) */
  joinId: string | null
  onJoinHandled: () => void
  onOpenFriends: () => void
}

export default function GamesView({ joinId, onJoinHandled, onOpenFriends }: Props) {
  const t = useT()
  const account = useAccount()
  const [screen, setScreen] = useState<Screen>({ kind: 'hub' })
  const [{ mode, area }, setChoice] = useState(loadSetup)
  const [joinError, setJoinError] = useState(false)
  const me = account.status === 'signedIn' ? account.uid : ''

  useEffect(() => { try { localStorage.setItem(SETUP_KEY, JSON.stringify({ mode, area })) } catch { /* ignore */ } }, [mode, area])

  // opened a duel link: show the invitation (or the result, if already played)
  useEffect(() => {
    if (!joinId || account.status !== 'signedIn') return
    onJoinHandled()
    loadDuel(joinId).then((m) => {
      if (!m) { setJoinError(true); return }
      if (m.results[account.uid]) setScreen({ kind: 'result', mode: m.mode, area: m.area, questions: m.questions, matchId: m.id })
      else setScreen({ kind: 'invite', match: m })
    }, () => setJoinError(true))
  }, [joinId, account, onJoinHandled])

  const startSolo = (preselect?: string[]) =>
    setScreen({ kind: 'play', mode, area, questions: pickQuestions(area), preselect })
  const playMatch = (m: Match) =>
    setScreen({ kind: 'play', mode: m.mode, area: m.area, questions: m.questions, matchId: m.id, label: t.duelVs(opponents(m, me) || '…') })

  async function save(s: Setup & { matchId: string; result: RoundResult }) {
    setScreen({ ...s, kind: 'saving', failed: false })
    try {
      await submitDuel(s.matchId, s.result)
      setScreen({ kind: 'result', mode: s.mode, area: s.area, questions: s.questions, matchId: s.matchId })
    } catch {
      setScreen({ ...s, kind: 'saving', failed: true })
    }
  }

  if (screen.kind === 'play') {
    const s = screen
    return (
      <GamePlay key={s.questions.join()} mode={s.mode} area={s.area} questions={s.questions} label={s.label}
        onExit={() => setScreen({ kind: 'hub' })}
        onDone={(result) => {
          if (s.matchId) void save({ mode: s.mode, area: s.area, questions: s.questions, matchId: s.matchId, result })
          else setScreen({ kind: 'result', mode: s.mode, area: s.area, questions: s.questions, mine: result, preselect: s.preselect, record: { old: saveBest(s.mode, s.area, result.score) } })
        }} />
    )
  }

  if (screen.kind === 'saving') {
    return (
      <section className="settings">
        <div className="panel card-surface">
          <h3>{screen.failed ? t.duelError : t.saving}</h3>
          {screen.failed && <div className="row"><button className="btn" onClick={() => save(screen)}>{t.tryAgain}</button></div>}
        </div>
      </section>
    )
  }

  if (screen.kind === 'result') {
    const s = screen
    return (
      <GameResult key={s.matchId ?? 'solo'} mode={s.mode} area={s.area} questions={s.questions} mine={s.mine} matchId={s.matchId}
        preselect={s.preselect} record={s.record}
        onBack={() => setScreen({ kind: 'hub' })}
        onAgain={() => setScreen({ kind: 'play', mode: s.mode, area: s.area, questions: pickQuestions(s.area) })}
        onRematch={(invite) => setScreen({ kind: 'play', mode: s.mode, area: s.area, questions: pickQuestions(s.area), preselect: invite })} />
    )
  }

  if (screen.kind === 'invite') {
    const m = screen.match
    const from = m.names[m.createdBy] ?? '?'
    return (
      <section className="settings">
        <div className="panel card-surface g-invite">
          <div className="g-invite-icon" aria-hidden="true">{MODE_ICON[m.mode]}</div>
          <h2>{t.challengedBy(from)}</h2>
          <p>{t.gameMode[m.mode]} · {m.area ? t.continent(m.area) : t.wholeWorld} · {t.nQuestions(m.questions.length)}</p>
          <p className="muted">{t.inviteHint}</p>
          <div className="row">
            <button className="btn" onClick={() => playMatch(m)}>{t.playNow}</button>
            <button className="btn ghost" onClick={() => setScreen({ kind: 'hub' })}>{t.later}</button>
          </div>
        </div>
      </section>
    )
  }

  // ---- hub ----
  const best = loadBest()
  const record = best[bestKey(mode, area)]
  return (
    <section className="settings games">
      <div className="page-head"><h1 className="page-title">{t.play}</h1></div>
      <p className="muted g-lede">{t.playLede}</p>

      {joinId && account.status === 'signedOut' && (
        <div className="panel card-surface">
          <h3>{t.duelWaiting}</h3>
          <p>{t.signInForDuel}</p>
          <button className="btn" onClick={onOpenFriends}>{t.signIn}</button>
        </div>
      )}
      {joinError && <p className="msg err">{t.duelNotFound}</p>}

      <div className="g-modes" role="radiogroup" aria-label={t.gameModeLabel}>
        {GAME_MODES.map((m) => (
          <button key={m} role="radio" aria-checked={m === mode} className={'g-mode card-surface' + (m === mode ? ' on' : '')} onClick={() => setChoice({ mode: m, area })}>
            <span className="g-mode-icon" aria-hidden="true">{MODE_ICON[m]}</span>
            <b>{t.gameMode[m]}</b>
            <span className="muted">{t.gameModeDesc[m]}</span>
          </button>
        ))}
      </div>

      <div className="panel card-surface g-start">
        <label className="q-select">
          <span className="sr-only">{t.continentLabel}</span>
          <select value={area ?? ''} onChange={(e) => setChoice({ mode, area: (e.target.value || null) as Area | null })}>
            <option value="">{t.wholeWorld}</option>
            {CONTINENTS.map((c) => <option key={c} value={c}>{t.continent(c)}</option>)}
            <optgroup label={t.africaRegions}>
              {REGIONS.map((r) => <option key={r} value={r}>{t.continent(r)}</option>)}
            </optgroup>
          </select>
        </label>
        <button className="btn engage" onClick={() => startSolo()}>
          {t.startRound} <small>{record !== undefined ? t.recordIs(record) : t.tenQuestions}</small>
        </button>
      </div>

      {account.status === 'signedIn' ? <DuelList me={me} onPlay={playMatch} onOpen={(m) => setScreen({ kind: 'result', mode: m.mode, area: m.area, questions: m.questions, matchId: m.id })} />
        : account.status === 'signedOut' && !joinId && (
          <div className="panel card-surface">
            <h3>{t.duels}</h3>
            <p>{t.signInToDuel}</p>
            <button className="btn ghost" onClick={onOpenFriends}>{t.signIn}</button>
          </div>
        )}
    </section>
  )
}

function DuelList({ me, onPlay, onOpen }: { me: string; onPlay: (m: Match) => void; onOpen: (m: Match) => void }) {
  const t = useT()
  const matches = useMatches()
  if (!matches) return <p className="muted">{t.loading}</p>
  const groups = {
    yourTurn: matches.filter((m) => matchState(m, me) === 'yourTurn'),
    waiting: matches.filter((m) => matchState(m, me) === 'waiting'),
    done: matches.filter((m) => matchState(m, me) === 'done').slice(0, 20),
  }
  const wins = matches.filter((m) => outcome(m, me) === 'win').length
  const losses = matches.filter((m) => outcome(m, me) === 'loss').length

  return (
    <div className="panel card-surface g-duels">
      <div className="lb-head">
        <h3>{t.duels}</h3>
        {wins + losses > 0 && <span className="muted">{t.winLoss(wins, losses)}</span>}
      </div>
      {matches.length === 0 && <p>{t.noDuelsYet}</p>}
      {(['yourTurn', 'waiting', 'done'] as const).map((g) => groups[g].length > 0 && (
        <div key={g} className="g-group">
          <p className="eyebrow">{t.duelGroup[g]}</p>
          {groups[g].map((m) => {
            const o = outcome(m, me)
            const r = ranking(m)
            const mine = m.results[me]
            const best = r.find((p) => p.uid !== me)
            return (
              <button key={m.id} className={'g-duel' + (g === 'yourTurn' ? ' hot' : '')} onClick={() => (g === 'yourTurn' ? onPlay(m) : onOpen(m))}>
                <span className="g-duel-icon" aria-hidden="true">{MODE_ICON[m.mode]}</span>
                <span className="g-duel-main">
                  <b>{opponents(m, me) || t.linkOnly}</b>
                  <small className="muted">{t.gameMode[m.mode]} · {m.area ? t.continent(m.area) : t.wholeWorld}</small>
                </span>
                <span className={'g-duel-side ' + (o ?? '')}>
                  {g === 'yourTurn' ? t.playNow
                    : g === 'waiting' ? `${mine?.score ?? 0}`
                    : `${mine?.score ?? 0} : ${best?.result.score ?? 0}`}
                  {o && <small>{o === 'win' ? t.won : o === 'loss' ? t.lost : t.draw}</small>}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
