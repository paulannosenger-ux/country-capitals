// Everything that talks to Firebase. Loaded on demand by cloud.ts, so the Firebase code is only
// downloaded when accounts are switched on.
//
// Database layout (Firestore):
//   players/{uid}   public card for the leaderboard (name + numbers), readable by every signed-in player
//   progress/{uid}  the full progress as JSON text, only readable by its owner
//   matches/{id}    a duel: questions + everybody's result (see games/duels.ts)
import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, updateProfile, type User,
} from 'firebase/auth'
import {
  addDoc, arrayUnion, collection, doc, getDoc, getDocs, initializeFirestore, limit, onSnapshot, query, setDoc, updateDoc, where,
} from 'firebase/firestore'
import { firebaseConfig } from './config'
import type { PlayerCard } from './cloud'
import type { Match } from '../games/duels'
import type { RoundResult } from '../games/modes'

const app = initializeApp(firebaseConfig!)
const auth = getAuth(app)
const db = initializeFirestore(app, { ignoreUndefinedProperties: true })

export interface FbUser { uid: string; name: string; email: string }
const toUser = (u: User): FbUser => ({ uid: u.uid, name: u.displayName || u.email?.split('@')[0] || '?', email: u.email ?? '' })

export function watchUser(fn: (u: FbUser | null) => void) {
  return onAuthStateChanged(auth, (u) => fn(u ? toUser(u) : null))
}
export async function register(name: string, email: string, password: string): Promise<FbUser> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName: name })
  return toUser(user)
}
export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password)
}
export const logout = () => signOut(auth)
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

export async function loadProgress(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'progress', uid))
  return snap.exists() ? (snap.data().data as string) : null
}
export async function saveProgress(uid: string, json: string, card: PlayerCard) {
  await Promise.all([
    setDoc(doc(db, 'progress', uid), { data: json, updatedAt: Date.now() }),
    setDoc(doc(db, 'players', uid), card),
  ])
}
export async function loadPlayers(): Promise<(PlayerCard & { uid: string })[]> {
  const snap = await getDocs(query(collection(db, 'players'), limit(200)))
  return snap.docs.map((d) => ({ ...(d.data() as PlayerCard), uid: d.id }))
}

// ---- duels ----
export async function createMatch(m: Omit<Match, 'id'>): Promise<string> {
  return (await addDoc(collection(db, 'matches'), m)).id
}
export async function loadMatch(id: string): Promise<Match | null> {
  const snap = await getDoc(doc(db, 'matches', id))
  return snap.exists() ? ({ ...(snap.data() as Omit<Match, 'id'>), id: snap.id }) : null
}
/** Saves my round in a match (and adds me to it, if I came via a link). */
export async function submitResult(id: string, uid: string, name: string, result: RoundResult) {
  await updateDoc(doc(db, 'matches', id), {
    [`results.${uid}`]: result,
    [`names.${uid}`]: name,
    participants: arrayUnion(uid),
  })
}
/** Live list of all matches I take part in. */
export function watchMatches(uid: string, fn: (list: Match[]) => void, onError: () => void) {
  return onSnapshot(
    query(collection(db, 'matches'), where('participants', 'array-contains', uid), limit(100)),
    (snap) => fn(snap.docs.map((d) => ({ ...(d.data() as Omit<Match, 'id'>), id: d.id }))),
    onError,
  )
}
