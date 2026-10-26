// Accounts + cloud sync + leaderboard, on top of the normal (browser) progress store.
//
// How syncing works: the browser copy stays the main copy (so the app is fast and works offline).
// After signing in, and a few seconds after every answer, the browser copy is merged with the
// account copy (merge.ts: nothing learned on any device is lost) and uploaded, together with a
// small "player card" (name + numbers) that friends see on the leaderboard.
import { useSyncExternalStore } from 'react'
import type { Continent } from '../data/countries'
import { mergeAppData } from '../progress/merge'
import { dayNumber } from '../progress/scheduler'
import { computeStats } from '../progress/stats'
import { emptyData, parseAppData, type AppData } from '../progress/storage'
import { store } from '../progress/store'
import { firebaseConfig } from './config'
import type { Match } from '../games/duels'
import { turnOf, type QdRound, type QuizDuel } from '../games/quizduel'
import type { RoundResult } from '../games/modes'

/** True once a Firebase project is filled in in config.ts. */
export const cloudEnabled = firebaseConfig !== null

/** What friends see about you. Saved in players/{uid}. */
export interface PlayerCard {
  name: string
  learned: number
  mastered: number
  streak: number
  bestStreak: number
  lastDay: number // day number of the last answer (an old streak counts as 0)
  week: number // answers in the last 7 days
  total: number // answers ever
  retention: number | null
  perContinent: Record<Continent, number> // countries learned
  updatedAt: number
}

export type SyncState = 'syncing' | 'saved' | 'offline'
export type Account =
  | { status: 'off' } // no Firebase project configured
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; uid: string; name: string; email: string; sync: SyncState }

let account: Account = cloudEnabled ? { status: 'loading' } : { status: 'off' }
const listeners = new Set<() => void>()
function setAccount(a: Account) {
  account = a
  listeners.forEach((fn) => fn())
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
/** The current account; the component re-renders when it changes. */
export const useAccount = () => useSyncExternalStore(subscribe, () => account)
function setSync(sync: SyncState) {
  if (account.status === 'signedIn') setAccount({ ...account, sync })
}

type Fb = typeof import('./firebase')
let fbPromise: Promise<Fb> | null = null
const fb = () => (fbPromise ??= import('./firebase'))

// Whose progress is in this browser (so a different person signing in doesn't get it merged in).
const OWNER_KEY = 'country-capitals:owner'
function getOwner(): string | null {
  try { return localStorage.getItem(OWNER_KEY) } catch { return null }
}
function setOwner(uid: string | null) {
  try { if (uid) localStorage.setItem(OWNER_KEY, uid); else localStorage.removeItem(OWNER_KEY) } catch { /* ignore */ }
}

let uid: string | null = null
let pendingName: string | null = null // name typed when creating the account (the profile may not be saved yet)
let unsubStore: (() => void) | null = null
let applyingRemote = false
let timer: ReturnType<typeof setTimeout> | undefined
let lastSync = 0
let queue: Promise<void> = Promise.resolve()

/** Call once at startup. */
export function startCloud() {
  if (!cloudEnabled) return
  fb()
    .then((f) => f.watchUser((u) => {
      if (u) void onSignedIn(u)
      else { uid = null; setAccount({ status: 'signedOut' }) }
    }))
    .catch(() => setAccount({ status: 'signedOut' }))
  document.addEventListener('visibilitychange', () => {
    if (!uid) return
    if (document.visibilityState === 'hidden') flush()
    else if (Date.now() - lastSync > 30_000) void sync('merge') // pick up what you did on another device
  })
}

async function onSignedIn(u: { uid: string; name: string; email: string }) {
  uid = u.uid
  setAccount({ status: 'signedIn', uid: u.uid, name: pendingName ?? u.name, email: u.email, sync: 'syncing' })
  pendingName = null
  await sync('merge')
  void startMatches(u.uid)
  void startQuizDuels(u.uid)
  unsubStore ??= store.subscribe(() => {
    if (applyingRemote) return
    clearTimeout(timer)
    timer = setTimeout(() => void sync('merge'), 4000) // wait until a few answers are together
  })
}

function flush() {
  if (timer === undefined) return
  clearTimeout(timer)
  timer = undefined
  void sync('merge')
}

/**
 * 'merge': combine browser + account, save the result in both places.
 * 'overwrite': the browser copy replaces the account copy (after Reset or Import in Settings).
 * Runs one after the other, never two at once.
 */
function sync(mode: 'merge' | 'overwrite'): Promise<void> {
  queue = queue.then(() => doSync(mode))
  return queue
}

async function doSync(mode: 'merge' | 'overwrite') {
  const me = uid
  if (!me || account.status !== 'signedIn') return
  timer = undefined
  setSync('syncing')
  try {
    const f = await fb()
    const owner = getOwner()
    const local = owner === null || owner === me ? store.snapshot() : emptyData()
    let result: AppData = local
    if (mode === 'merge') {
      const remoteText = await f.loadProgress(me)
      if (remoteText) result = mergeAppData(local, parseAppData(JSON.parse(remoteText)))
    }
    if (uid !== me) return // signed out in the meantime
    setOwner(me)
    if (result !== store.snapshot()) {
      applyingRemote = true
      try { store.replace(result) } finally { applyingRemote = false }
    }
    await f.saveProgress(me, cloudJson(store.snapshot()), playerCard(account.name))
    lastSync = Date.now()
    setSync('saved')
  } catch {
    setSync('offline') // no internet or Firebase not reachable: next answer tries again
  }
}

/** Firestore documents can hold up to 1 MB: if the review log gets that big, the oldest entries are left out. */
function cloudJson(data: AppData): string {
  let json = JSON.stringify(data)
  while (json.length > 900_000 && data.log.length > 0) {
    data = { ...data, log: data.log.slice(Math.ceil(data.log.length / 4)) }
    json = JSON.stringify(data)
  }
  return json
}

function playerCard(name: string): PlayerCard {
  const now = Date.now()
  const s = computeStats(store, now)
  const log = store.log
  return {
    name,
    learned: s.learned,
    mastered: s.mastered,
    streak: s.streak,
    bestStreak: s.longestStreak,
    lastDay: log.length ? dayNumber(log[log.length - 1].t) : 0,
    week: s.last14.slice(-7).reduce((n, d) => n + d.count, 0),
    total: s.totalReviews,
    retention: s.retention,
    perContinent: Object.fromEntries(s.perContinent.map((c) => [c.continent, c.learned])) as Record<Continent, number>,
    updatedAt: now,
  }
}

/** A streak only counts if the player studied today or yesterday. */
export const currentStreak = (p: PlayerCard) => (p.lastDay >= dayNumber(Date.now()) - 1 ? p.streak : 0)

// ---- actions for the UI (errors are thrown; use authErrorCode to show a message) ----

export async function signUp(name: string, email: string, password: string) {
  pendingName = name
  const f = await fb()
  try {
    await f.register(name, email, password)
  } catch (e) {
    pendingName = null
    throw e
  }
  if (account.status === 'signedIn') { setAccount({ ...account, name }); void sync('merge') }
}
export async function signIn(email: string, password: string) {
  await (await fb()).login(email, password)
}
export async function forgotPassword(email: string) {
  await (await fb()).resetPassword(email)
}
/** Saves one last time, signs out and removes the progress from this browser (it stays in the account). */
export async function signOutCloud() {
  clearTimeout(timer)
  await sync('merge')
  if (account.status === 'signedIn' && account.sync === 'offline') throw new Error('offline')
  const f = await fb()
  unsubStore?.()
  unsubStore = null
  stopMatches()
  stopQuizDuels()
  uid = null
  await f.logout()
  store.reset()
  setOwner(null)
}
/** After Reset or Import in Settings: the account gets exactly the browser's progress. */
export function pushOverwrite() {
  if (uid) void sync('overwrite')
}
export async function fetchPlayers() {
  return (await fb()).loadPlayers()
}
/** Firebase error code such as "auth/wrong-password" (or "offline"). */
export const authErrorCode = (e: unknown) => ((e as { code?: string })?.code ?? (e as Error)?.message ?? 'unknown')

// ---- duels (games/duels.ts) ----

let matches: Match[] | null = null // null = not loaded yet
let unsubMatches: (() => void) | null = null
const matchListeners = new Set<() => void>()
function setMatches(list: Match[] | null) {
  matches = list ? [...list].sort((a, b) => b.createdAt - a.createdAt) : null
  matchListeners.forEach((fn) => fn())
}
const subscribeMatches = (fn: () => void) => { matchListeners.add(fn); return () => { matchListeners.delete(fn) } }
/** All my matches, newest first (live); null while loading or signed out. */
export const useMatches = () => useSyncExternalStore(subscribeMatches, () => matches)

async function startMatches(me: string) {
  if (unsubMatches) return
  const f = await fb()
  if (uid !== me) return
  unsubMatches = f.watchMatches(me, setMatches, () => setMatches([]))
}
function stopMatches() {
  unsubMatches?.()
  unsubMatches = null
  setMatches(null)
}

function me() {
  if (account.status !== 'signedIn') throw new Error('not signed in')
  return account
}
/** Starts a duel with my finished round; `invite` = uids of friends to challenge (can be empty: share the link). */
export async function createDuel(m: Pick<Match, 'mode' | 'area' | 'questions'>, result: RoundResult, invite: string[], inviteNames: Record<string, string>) {
  const a = me()
  return (await fb()).createMatch({
    ...m,
    createdBy: a.uid,
    createdAt: Date.now(),
    participants: [a.uid, ...invite.filter((id) => id !== a.uid)],
    names: { ...inviteNames, [a.uid]: a.name },
    results: { [a.uid]: result },
  })
}
export async function submitDuel(id: string, result: RoundResult) {
  const a = me()
  await (await fb()).submitResult(id, a.uid, a.name, result)
}
export async function loadDuel(id: string) {
  return (await fb()).loadMatch(id)
}
/** Link that opens the duel in the app. */
export const duelLink = (id: string) => `${location.origin}${location.pathname}?duel=${id}`

// ---- quiz duels (games/quizduel.ts) ----

let quizDuels: QuizDuel[] | null = null // null = not loaded yet
let unsubQuizDuels: (() => void) | null = null
const qdListeners = new Set<() => void>()
function setQuizDuels(list: QuizDuel[] | null) {
  quizDuels = list ? [...list].sort((a, b) => b.updatedAt - a.updatedAt) : null
  qdListeners.forEach((fn) => fn())
}
const subscribeQuizDuels = (fn: () => void) => { qdListeners.add(fn); return () => { qdListeners.delete(fn) } }
/** All my quiz duels, last changed first (live); null while loading or signed out. */
export const useQuizDuels = () => useSyncExternalStore(subscribeQuizDuels, () => quizDuels)

async function startQuizDuels(me: string) {
  if (unsubQuizDuels) return
  const f = await fb()
  if (uid !== me) return
  unsubQuizDuels = f.watchQuizDuels(me, setQuizDuels, () => setQuizDuels([]))
}
function stopQuizDuels() {
  unsubQuizDuels?.()
  unsubQuizDuels = null
  setQuizDuels(null)
}

/** Starts a quiz duel against a friend with my first round already played. Returns its id. */
export async function createQuizDuel(opponent: { uid: string; name: string }, first: QdRound) {
  const a = me()
  const players = [a.uid, opponent.uid]
  const now = Date.now()
  return (await fb()).createQuizDuel({
    players, names: { [a.uid]: a.name, [opponent.uid]: opponent.name },
    createdAt: now, updatedAt: now, rounds: [first], turn: turnOf([first], players),
  })
}
/** Saves the rounds after I played (whose turn it is next is worked out here). */
export async function saveQuizDuel(d: QuizDuel, rounds: QdRound[]) {
  me()
  await (await fb()).saveQuizDuel(d.id, rounds, turnOf(rounds, d.players))
}
