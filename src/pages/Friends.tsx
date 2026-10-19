// Friends: sign in / create an account, then compare progress with everyone else on the leaderboard.
import { useCallback, useEffect, useState } from 'react'
import { CONTINENTS, countries, countriesIn } from '../data/countries'
import { useT } from '../i18n'
import {
  authErrorCode, currentStreak, fetchPlayers, forgotPassword, signIn, signOutCloud, signUp, useAccount, type PlayerCard,
} from '../cloud/cloud'

type Player = PlayerCard & { uid: string }
type SortKey = 'learned' | 'mastered' | 'streak' | 'week'

export default function Friends({ onBack }: { onBack: () => void }) {
  const t = useT()
  const account = useAccount()
  return (
    <section className="settings friends">
      <div className="page-head">
        <button className="pill" onClick={onBack}>{t.back}</button>
        <h1 className="page-title">{t.friends}</h1>
      </div>
      {account.status === 'loading' && <p className="muted">{t.loading}</p>}
      {account.status === 'signedOut' && <AuthForm />}
      {account.status === 'signedIn' && <Leaderboard me={account.uid} name={account.name} email={account.email} sync={account.sync} />}
    </section>
  )
}

function AuthForm() {
  const t = useT()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      if (mode === 'register') await signUp(name.trim(), email.trim(), password)
      else await signIn(email.trim(), password)
    } catch (err) {
      setMessage({ ok: false, text: t.authError(authErrorCode(err)) })
    }
    setBusy(false)
  }

  async function forgot() {
    if (!email.trim()) { setMessage({ ok: false, text: t.enterEmailFirst }); return }
    try {
      await forgotPassword(email.trim())
      setMessage({ ok: true, text: t.resetMailSent })
    } catch (err) {
      setMessage({ ok: false, text: t.authError(authErrorCode(err)) })
    }
  }

  return (
    <div className="panel card-surface auth">
      <h3>{mode === 'login' ? t.signIn : t.createAccount}</h3>
      <p className="muted">{t.accountWhy}</p>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <label className="field">
            <span>{t.yourName}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={24} autoComplete="nickname" />
          </label>
        )}
        <label className="field">
          <span>{t.email}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span>{t.password}</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        <div className="row">
          <button className="btn" type="submit" disabled={busy}>{mode === 'login' ? t.signIn : t.createAccount}</button>
          {mode === 'login' && <button className="btn ghost" type="button" onClick={forgot}>{t.forgotPassword}</button>}
        </div>
      </form>
      {message && <p className={'msg ' + (message.ok ? 'ok' : 'err')} role="status">{message.text}</p>}
      <p className="muted switch-mode">
        {mode === 'login' ? t.noAccountYet : t.haveAccount}{' '}
        <button className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null) }}>
          {mode === 'login' ? t.createAccount : t.signIn}
        </button>
      </p>
    </div>
  )
}

function Leaderboard({ me, name, email, sync }: { me: string; name: string; email: string; sync: 'syncing' | 'saved' | 'offline' }) {
  const t = useT()
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [error, setError] = useState(false)
  const [sort, setSort] = useState<SortKey>('learned')
  const [open, setOpen] = useState<string | null>(null)
  const [signOutError, setSignOutError] = useState(false)

  const load = useCallback(() => {
    setError(false)
    fetchPlayers().then(setPlayers, () => setError(true))
  }, [])
  useEffect(load, [load])
  // reload once your own latest numbers are saved
  useEffect(() => { if (sync === 'saved') load() }, [sync, load])

  const value = (p: Player, k: SortKey) => (k === 'streak' ? currentStreak(p) : p[k])
  const sorted = players ? [...players].sort((a, b) => value(b, sort) - value(a, sort) || b.learned - a.learned) : []

  async function doSignOut() {
    if (!confirm(t.confirmSignOut)) return
    try { await signOutCloud() } catch { setSignOutError(true) }
  }

  const head = (k: SortKey, label: string) => (
    <th className={'num' + (sort === k ? ' on' : '')}><button onClick={() => setSort(k)} aria-pressed={sort === k}>{label}</button></th>
  )

  return (
    <>
      <div className="panel card-surface account-bar">
        <div>
          <b>{t.hello(name)}</b>
          <span className="muted"> · {email}</span>
          <p className={'sync ' + sync}>{t.syncState[sync]}</p>
        </div>
        <button className="btn ghost" onClick={doSignOut}>{t.signOut}</button>
        {signOutError && <p className="msg err" role="status">{t.signOutOffline}</p>}
      </div>

      <div className="panel card-surface">
        <div className="lb-head">
          <h3>{t.leaderboard}</h3>
          <button className="pill" onClick={load}>{t.refresh}</button>
        </div>
        <p className="muted">{t.leaderboardHint}</p>
        {error && <p className="msg err">{t.leaderboardError}</p>}
        {!players && !error && <p className="muted">{t.loading}</p>}
        {players && (
          <table className="lb">
            <thead>
              <tr>
                <th>#</th><th>{t.player}</th>
                {head('learned', t.learned)}{head('mastered', t.mastered)}{head('streak', t.streakShort)}{head('week', t.thisWeek)}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <PlayerRow key={p.uid} rank={i + 1} p={p} me={p.uid === me} open={open === p.uid}
                  onToggle={() => setOpen(open === p.uid ? null : p.uid)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function PlayerRow({ rank, p, me, open, onToggle }: { rank: number; p: Player; me: boolean; open: boolean; onToggle: () => void }) {
  const t = useT()
  return (
    <>
      <tr className={(me ? 'me ' : '') + 'clickable'} onClick={onToggle} aria-expanded={open}>
        <td className="rank">{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</td>
        <td className="who">{p.name}{me && <small> ({t.you})</small>}</td>
        <td className="num">{p.learned}<small>/{countries.length}</small></td>
        <td className="num">{p.mastered}</td>
        <td className="num">{currentStreak(p)}</td>
        <td className="num">{p.week}</td>
      </tr>
      {open && (
        <tr className="detail">
          <td colSpan={6}>
            <div className="lb-continents">
              {CONTINENTS.map((c) => {
                const n = countriesIn(c).length
                const l = p.perContinent?.[c] ?? 0
                return (
                  <div key={c}>
                    <span>{t.continent(c)}</span><span className="muted">{l}/{n}</span>
                    <span className="bar"><span style={{ width: `${(l / n) * 100}%` }} /></span>
                  </div>
                )
              })}
            </div>
            <p className="muted">
              {t.retention}: {p.retention === null ? '–' : `${p.retention}%`} · {t.streakBest(p.bestStreak)} · {t.totalAnswers(p.total)}
            </p>
          </td>
        </tr>
      )}
    </>
  )
}
