// After a round: score, record, and either "challenge friends" (solo round) or the duel comparison.
import { useEffect, useState } from 'react'
import { capitalsOf, countryById, countryName, flagUrl, type Area } from '../data/countries'
import { useLang, useT } from '../i18n'
import { createDuel, duelLink, fetchPlayers, loadDuel, useAccount, useMatches, type PlayerCard } from '../cloud/cloud'
import { matchState, outcome, ranking, type Match } from './duels'
import { MAX_POINTS, MODE_ICON, type GameMode, type RoundResult } from './modes'

/** The right answer of a question, in the interface language. */
export function AnswerText({ mode, id }: { mode: GameMode; id: string }) {
  const lang = useLang()
  const c = countryById.get(id)!
  return <>{mode === 'capital' ? capitalsOf(c, lang).join(' · ') : countryName(c, lang)}</>
}

/** Share a duel link (phone: share sheet; computer: copy to clipboard). Returns true if it was copied. */
export async function shareDuel(id: string, text: string): Promise<boolean> {
  const url = duelLink(id)
  if (navigator.share) {
    try { await navigator.share({ title: 'Countries & Capitals', text, url }); return false } catch { /* closed or not allowed: copy instead */ }
  }
  try { await navigator.clipboard.writeText(url); return true } catch { prompt('Link', url); return false }
}

interface Props {
  mode: GameMode
  area: Area | null
  questions: string[]
  /** my round (solo) – for a duel it comes from the match */
  mine?: RoundResult
  matchId?: string
  /** friends to tick in the challenge list (rematch) */
  preselect?: string[]
  /** old record, if this solo round beat it (null = first round in this mode) */
  record?: { old: number | null } | null
  onAgain: () => void
  onRematch?: (invite: string[], names: Record<string, string>) => void
  onBack: () => void
}

export default function GameResult({ mode, area, questions, mine, matchId: initialId, preselect, record, onAgain, onRematch, onBack }: Props) {
  const t = useT()
  const account = useAccount()
  const matches = useMatches()
  const [matchId, setMatchId] = useState(initialId)
  const [loaded, setLoaded] = useState<Match | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const me = account.status === 'signedIn' ? account.uid : ''

  const live = matchId ? matches?.find((m) => m.id === matchId) ?? loaded : null
  // a match opened via link before it shows up in the live list
  useEffect(() => {
    if (matchId && !matches?.some((m) => m.id === matchId)) loadDuel(matchId).then(setLoaded, () => {})
  }, [matchId, matches])

  const result = live?.results[me] ?? mine
  const areaName = area ? t.continent(area) : t.wholeWorld
  const modeLine = `${MODE_ICON[mode]} ${t.gameMode[mode]} · ${areaName}`

  async function share(id: string) {
    const copied = await shareDuel(id, t.shareText(t.gameMode[mode], areaName, result?.score ?? 0))
    if (copied) setMessage({ ok: true, text: t.linkCopied })
  }

  let title = t.roundDone
  if (live) {
    const state = matchState(live, me)
    const o = outcome(live, me)
    const missing = live.participants.filter((u) => !live.results[u]).map((u) => live.names[u] ?? '?').join(', ')
    title = state === 'waiting' ? (missing ? t.waitingFor(missing) : t.waitingLink)
      : o === 'win' ? t.youWon : o === 'loss' ? t.youLost : o === 'draw' ? t.draw : t.roundDone
  }

  return (
    <section className="settings games-result">
      <div className="page-head">
        <button className="pill" onClick={onBack}>{t.back}</button>
        <h1 className="page-title">{title}</h1>
      </div>
      <p className="muted g-modeline">{modeLine}</p>

      {result && (
        <div className="tiles">
          <div className="tile card-surface"><b>{result.score}</b><span>{t.pointsOf(MAX_POINTS * questions.length)}</span></div>
          <div className="tile card-surface"><b>{result.correct}<small>/{questions.length}</small></b><span>{t.rightAnswers}</span></div>
          <div className="tile card-surface"><b>{(result.ms / 1000).toFixed(1)}<small> s</small></b><span>{t.totalTime}</span></div>
          {record !== undefined && record !== null && (
            <div className="tile card-surface">
              <b>{record.old === null || result.score > record.old ? '🏆' : record.old}</b>
              <span>{record.old === null ? t.firstRecord : result.score > record.old ? t.newRecord(record.old) : t.yourRecord}</span>
            </div>
          )}
        </div>
      )}

      {live && <Comparison match={live} me={me} mode={mode} />}
      {!live && result && <Comparison mine={result} mode={mode} questions={questions} />}

      {!live && result && account.status === 'signedIn' && (
        <Challenge me={me} preselect={preselect} onCreate={async (invite, names, alsoShare) => {
          try {
            const id = await createDuel({ mode, area, questions }, result, invite, names)
            setMatchId(id)
            setMessage({ ok: true, text: invite.length ? t.challengeSent : t.duelCreated })
            if (alsoShare) await share(id)
          } catch {
            setMessage({ ok: false, text: t.duelError })
          }
        }} />
      )}
      {!live && account.status === 'signedOut' && <p className="panel card-surface muted">{t.signInToDuel}</p>}

      <div className="row g-actions">
        <button className="btn" onClick={onAgain}>{t.playAgain}</button>
        {live && <button className="btn ghost" onClick={() => share(live.id)}>{t.shareLink}</button>}
        {live && onRematch && matchState(live, me) === 'done' && (
          <button className="btn ghost" onClick={() => onRematch(live.participants.filter((u) => u !== me), live.names)}>{t.rematch}</button>
        )}
      </div>
      {message && <p className={'msg ' + (message.ok ? 'ok' : 'err')} role="status">{message.text}</p>}
    </section>
  )
}

/** Pick friends to challenge, or just create a link. */
function Challenge({ me, preselect, onCreate }: { me: string; preselect?: string[]; onCreate: (invite: string[], names: Record<string, string>, share: boolean) => Promise<void> }) {
  const t = useT()
  const [players, setPlayers] = useState<(PlayerCard & { uid: string })[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set(preselect))
  const [busy, setBusy] = useState(false)
  useEffect(() => { fetchPlayers().then((p) => setPlayers(p.filter((x) => x.uid !== me)), () => setPlayers([])) }, [me])

  const toggle = (uid: string) => setPicked((s) => { const n = new Set(s); if (n.has(uid)) n.delete(uid); else n.add(uid); return n })
  async function go(share: boolean) {
    setBusy(true)
    const names = Object.fromEntries((players ?? []).filter((p) => picked.has(p.uid)).map((p) => [p.uid, p.name]))
    await onCreate([...picked], names, share)
    setBusy(false)
  }

  return (
    <div className="panel card-surface">
      <h3>{t.challengeFriends}</h3>
      <p>{t.challengeHint}</p>
      {!players && <p className="muted">{t.loading}</p>}
      {players && players.length === 0 && <p className="muted">{t.noFriendsYet}</p>}
      {players && players.length > 0 && (
        <div className="chips">
          {players.map((p) => (
            <button key={p.uid} className={'chip' + (picked.has(p.uid) ? ' on' : '')} aria-pressed={picked.has(p.uid)} onClick={() => toggle(p.uid)}>
              {picked.has(p.uid) ? '✓ ' : ''}{p.name}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn" disabled={busy || picked.size === 0} onClick={() => go(false)}>{t.challengeN(picked.size)}</button>
        <button className="btn ghost" disabled={busy} onClick={() => go(true)}>{t.shareLink}</button>
      </div>
    </div>
  )
}

/** Question by question: what everybody answered. */
function Comparison({ match, me, mine, questions, mode }: { match?: Match; me?: string; mine?: RoundResult; questions?: string[]; mode: GameMode }) {
  const t = useT()
  const lang = useLang()
  const players = match
    ? ranking(match)
    : [{ uid: 'me', name: t.you, result: mine! }]
  const qs = match?.questions ?? questions!
  return (
    <div className="panel card-surface">
      <h3>{t.questions}</h3>
      <div className="g-compare-wrap">
        <table className="lb g-compare">
          <thead>
            <tr>
              <th>{t.country}</th>
              {players.map((p, i) => (
                <th key={p.uid} className={'num' + (p.uid === me ? ' on' : '')}>
                  {match && i === 0 && players.length > 1 ? '👑 ' : ''}{p.name}<br /><b>{p.result.score}</b>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qs.map((id, qi) => {
              const c = countryById.get(id)!
              return (
                <tr key={id}>
                  <td className="g-q">
                    <img src={flagUrl(c)} alt="" />
                    <span>{countryName(c, lang)}{mode === 'capital' && <small> · {capitalsOf(c, lang)[0]}</small>}</span>
                  </td>
                  {players.map((p) => {
                    const a = p.result.answers[qi]
                    return (
                      <td key={p.uid} className={'num g-cell ' + (a ? ['bad', 'half', 'good'][a.ok] : '')}
                        title={a?.km ? t.kmOff(a.km) : a?.given || undefined}>
                        {a ? (a.ok === 2 ? '✓' : a.ok === 1 ? '≈' : '✗') : '–'} <small>{a?.pts ?? ''}</small>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
