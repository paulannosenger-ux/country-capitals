// Interface language (English / German). Saved per browser; the first visit follows the phone's language.
// All texts of the app live here: `en` is the reference, `de` must have the same keys.
import { useSyncExternalStore } from 'react'
import type { Area, Region } from './data/countries'

export type Lang = 'en' | 'de'
const KEY = 'country-capitals:lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'de') return saved
  } catch { /* storage blocked */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

let lang: Lang = initialLang()
const listeners = new Set<() => void>()
if (typeof document !== 'undefined') document.documentElement.lang = lang

export function getLang(): Lang { return lang }
export function setLang(l: Lang): void {
  lang = l
  try { localStorage.setItem(KEY, l) } catch { /* not remembered */ }
  document.documentElement.lang = l
  listeners.forEach((fn) => fn())
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
/** Current language; the component re-renders when it changes. */
export const useLang = () => useSyncExternalStore(subscribe, getLang)
/** Texts in the current language. */
export const useT = () => TEXTS[useLang()]

const CONTINENT_DE: Record<Area, string> = {
  'North Africa': 'Nordafrika', 'West Africa': 'Westafrika', 'East Africa': 'Ostafrika', 'Southern Africa': 'Südliches Afrika',
  Europe: 'Europa', Asia: 'Asien', Africa: 'Afrika', 'North America': 'Nordamerika', 'South America': 'Südamerika', Oceania: 'Ozeanien',
}

const en = {
  continent: (c: Area) => c as string,
  allOfAfrica: 'All', regionShort: { 'North Africa': 'North', 'West Africa': 'West', 'East Africa': 'East', 'Southern Africa': 'South' } as Record<Region, string>,
  regionsHint: 'Smaller steps: learn one region at a time.', africaRegions: 'Africa – regions',
  // nav
  brand: 'Capitals', home: 'Home', learn: 'Learn', mapQuiz: 'Map quiz', mapQuizShort: 'Map', stats: 'Stats', settings: 'Settings', toggleDark: 'Toggle dark mode', language: 'Language',
  // home
  heroLine1: 'Every country.', heroLine2: 'Every capital.',
  lede: 'Learn the world one continent at a time, with spaced repetition that remembers what you don’t.',
  learned: 'Learned', mastered: 'Mastered', dayStreak: 'Day streak', dueToday: 'Due today',
  world: '← World', statusNew: 'New', statusLearning: 'Learning', statusMastered: 'Mastered',
  nDue: (n: number) => `${n} due`,
  selected: 'Selected', learnedOf: (l: number, n: number) => `${l} of ${n} learned`,
  countNew: 'New', countLearning: 'Learning', countDue: 'Due',
  startStudying: 'Start studying', cardsForToday: (n: number) => `${n} cards for today`, nothingDue: 'Nothing due right now',
  practiceAll: (n: number) => `Practice all ${n}`, practiceAllSub: 'One full round, any time',
  mapQuizSub: 'Find every country on a blank map',
  getStarted: 'Get started', chooseContinent: 'Choose a continent', chooseHint: 'Tap one on the map or in the list, then start studying.',
  mixedReview: 'Mixed review', mixedSub: (n: number) => `${n} cards across all continents`,
  // study
  allContinents: 'All continents', practiceTag: 'Practice', exit: '✕ Exit',
  left: 'Left', missed: 'Missed', done: 'Done', cardsLeft: 'Cards left', practiceRound: 'Practice round',
  roundComplete: 'Round complete',
  roundSummary: (total: number, first: number, missed: number) =>
    `All ${total} countries done · ${first} right on the first try${missed ? `, ${missed} needed a second go` : ''}.`,
  practiceAgain: 'Practice again', backToMap: 'Back to the map',
  allDone: 'All done for now', reviewedSummary: (r: number, f: number) => `${r} cards reviewed · ${f} without “Again”.`,
  nextDueIn: (m: number) => ` Next card due in ${m} min.`, comeBackTomorrow: ' Come back tomorrow for the next reviews.',
  practiceAllCountries: (n: number) => `Practice all ${n} countries`, practiceAllCountriesSub: 'One full round, doesn’t change your schedule',
  flagOf: (name: string) => `Flag of ${name}`,
  whatCapital: 'What is the capital?', capital: 'Capital', capitals: 'Capitals',
  typeThe: (x: string) => `Type “${x}”`, typeCapital: 'Type the capital',
  almost: (x: string) => `Almost. Type it exactly: ${x}`, notSame: (x: string) => `Not the same yet. Type: ${x}`,
  continue: 'Continue', check: 'Check', next: 'Next', enter: 'Enter',
  correct: '✓ Correct', watchSpelling: ' · watch the spelling', notQuite: 'Not quite', youTyped: 'You typed:', answerIs: 'The answer is',
  writeOutCard: 'Write it out once to continue. This card will come back.',
  writeOutPractice: 'Write it out once to continue. This country comes back later in this round.',
  howWell: 'How well did you know it?',
  rating: { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' },
  interval: (s: string) => s,
  // facts
  population: 'Population', area: 'Area', government: 'Government', languages: 'Languages', currency: 'Currency',
  fmtPopulation: (n: number) => `≈ ${n >= 1e6 ? `${(n / 1e6).toFixed(n < 1e7 ? 2 : 1)} million` : Math.round(n).toLocaleString('en-US')}`,
  fmtArea: (n: number, target: number) => `${target < 100 ? n.toFixed(target % 1 ? 2 : 0) : Math.round(n).toLocaleString('en-US')} km²`,
  // map quiz
  continentLabel: 'Continent', difficulty: 'Difficulty', easy: 'Easy', hard: 'Hard', country: 'Country', countryCapital: 'Country + capital',
  namedWord: 'named', toRetry: (m: number) => ` · ${m} to retry`, restart: 'Restart',
  clickHint: (hard: boolean) => `Click a country to name it${hard ? ' and its capital' : ''}.`, pickForMe: 'Pick one for me',
  open: 'Open', correctPlain: 'Correct', withHelp: 'With help', tryAgain: 'Try again',
  alreadyNamed: 'Already named', countryAndCapital: 'Country & capital', whichCountry: 'Which country is this?',
  close: 'Close', flagTip: 'Flag (tip)', nextCountry: 'Next country', nameOfCountry: 'Name of the country', itsCapital: 'Its capital',
  flagShown: 'Flag shown', tipShowFlag: 'Tip: show flag', watchSpellingQuiz: 'Watch the spelling. ', youTypedLower: 'you typed',
  writeOutQuiz: 'Write it out once to continue. This country stays open and comes back.',
  confirmRestart: (cont: string, hard: boolean) => `Start ${cont} (${hard ? 'hard' : 'easy'}) from the beginning?`,
  complete: (cont: string) => `${cont} complete`,
  quizSummary: (t: number, hard: boolean, s: number, h: number) =>
    `All ${t} countries named${hard ? ' with their capitals' : ''} · ${s} right on the first try${h ? `, ${h} with help` : ''}.`,
  playAgain: 'Play again', tryHard: 'Try hard mode', nameThisCountry: 'Name this country',
  // map
  worldMap: 'World map', zoomIn: 'Zoom in', zoomOut: 'Zoom out', resetView: 'Reset view',
  // settings
  back: '← Back', dailyLimits: 'Daily limits', dailyLimitsHint: '250 or more = no limit: a whole continent is played through in one go.',
  newPerDay: 'New cards per day', reviewsPerDay: 'Maximum reviews per day', backup: 'Backup',
  backupText1: 'Your progress is stored ', backupOnly: 'only in this browser',
  backupText2: '. Clearing browser data deletes it, so export a backup now and then. Use export/import to move progress between phone and laptop.',
  exportProgress: 'Export progress', importProgress: 'Import progress…', backupDownloaded: 'Backup downloaded. Keep the file somewhere safe.',
  confirmImport: 'Importing replaces ALL current progress on this device with the file. Continue?', imported: 'Progress imported.',
  reset: 'Reset', resetAll: 'Reset all progress', confirmReset: 'Delete ALL progress on this device? This cannot be undone (export a backup first!).',
  wasReset: 'All progress was reset.',
  // stats
  countriesLearned: 'Countries learned', masteredDays: 'Mastered (21+ days)', retention: 'Retention', nReviews: (n: number) => ` (${n} reviews)`,
  streakBest: (b: number) => `Day streak (best ${b})`, last14: 'Reviews · last 14 days', reviewsPerDayAria: 'Reviews per day',
  todayTotal: (t: number, all: number) => `${t} today · ${all} in total`, perContinent: 'Progress per continent',
  learnedSlash: (l: number, t: number) => `${l}/${t} learned`, legendMastered: 'mastered', legendLearning: 'learning', legendNew: 'new',
  // friends / accounts
  friends: 'Friends', loading: 'Loading…', signIn: 'Sign in', createAccount: 'Create account', signOut: 'Sign out',
  accountWhy: 'With an account your progress is saved online (on every device) and you can compare yourself with your friends.',
  yourName: 'Your name (friends see it)', email: 'Email', password: 'Password (at least 6 characters)',
  forgotPassword: 'Forgot password?', enterEmailFirst: 'Type your email first.', resetMailSent: 'Email sent: follow the link to choose a new password.',
  noAccountYet: 'No account yet?', haveAccount: 'Already have an account?',
  authError: (code: string) => ({
    'auth/invalid-credential': 'Email or password is wrong.', 'auth/wrong-password': 'Email or password is wrong.', 'auth/user-not-found': 'Email or password is wrong.',
    'auth/email-already-in-use': 'There already is an account with this email. Sign in instead.',
    'auth/weak-password': 'The password needs at least 6 characters.', 'auth/invalid-email': 'This email address looks wrong.',
    'auth/network-request-failed': 'No internet connection.', 'auth/too-many-requests': 'Too many tries. Wait a moment and try again.',
  } as Record<string, string>)[code] ?? `Something went wrong (${code}).`,
  hello: (name: string) => `Hi ${name}`, syncState: { syncing: 'Saving…', saved: '✓ Progress saved in your account', offline: 'Offline: will be saved when you are back online' },
  confirmSignOut: 'Sign out? Your progress stays in your account and is removed from this device.',
  signOutOffline: 'You are offline, so the latest progress could not be saved yet. Try again with internet.',
  leaderboard: 'Leaderboard', refresh: 'Refresh', leaderboardHint: 'Everyone with an account. Tap a column to sort, tap a name for details.',
  leaderboardError: 'Could not load the leaderboard (offline?).', player: 'Player', you: 'you', streakShort: 'Streak', thisWeek: '7 days',
  totalAnswers: (n: number) => `${n} answers in total`,
  backupSynced: 'You are signed in: your progress is saved in your account automatically. A backup file is still a good extra.',
  // play / duels
  play: 'Play', playLede: 'Quick rounds of 10 questions. Fast and right = more points. Then challenge your friends to beat you on the very same questions.',
  gameModeLabel: 'Game mode',
  gameMode: { capital: 'Capital sprint', flag: 'Flag flash', reverse: 'Reverse', pin: 'Pin it' } as Record<'capital' | 'flag' | 'reverse' | 'pin', string>,
  gameModeDesc: {
    capital: 'Country shown, type the capital.', flag: 'Only the flag: which country?',
    reverse: 'Capital shown, type the country.', pin: 'Find the country on the map. Close by still scores.',
  } as Record<'capital' | 'flag' | 'reverse' | 'pin', string>,
  wholeWorld: 'Whole world', startRound: 'Start round', tenQuestions: '10 questions · 15 s each', recordIs: (n: number) => `Your record: ${n} points`,
  gamePromptCapital: 'What is the capital?', gamePromptFlag: 'Which country has this flag?', gamePromptReverse: 'This is the capital of …', gamePromptPin: 'Where is',
  typeCountry: 'Type the country', dontKnow: 'I don’t know', flagQuestion: 'Flag of the country you are asked about',
  confirmQuitGame: 'Stop this round? It will not count.', points: 'Points', questionOf: (i: number, n: number) => `Question ${i} of ${n}`,
  timeUp: '⏱ Time is up', closeBy: 'Close!', kmOff: (km: number) => `${km.toLocaleString('en-US')} km away`,
  roundDone: 'Round complete', pointsOf: (max: number) => `points (max ${max})`, rightAnswers: 'right', totalTime: 'total time',
  firstRecord: 'First round in this mode', newRecord: (old: number) => `New record! (before: ${old})`, yourRecord: 'your record',
  questions: 'Questions',
  duels: 'Duels', duelVs: (names: string) => `Duel vs ${names}`, noDuelsYet: 'No duels yet. Play a round, then challenge a friend.',
  duelGroup: { yourTurn: 'Your turn', waiting: 'Waiting for the others', done: 'Finished' },
  winLoss: (w: number, l: number) => `${w} won · ${l} lost`, won: 'won', lost: 'lost', draw: 'Draw', linkOnly: 'Shared link',
  challengeFriends: 'Challenge friends', challengeHint: 'They get exactly the same 10 questions. Best score wins (time breaks a tie).',
  noFriendsYet: 'Nobody else has an account yet. Share the link instead.',
  challengeN: (n: number) => (n ? `Challenge ${n}` : 'Pick friends above'), shareLink: 'Share link',
  challengeSent: 'Challenge sent! It shows up in their “Play” tab.', duelCreated: 'Duel created. Anyone with the link can play it.',
  linkCopied: 'Link copied. Paste it into a chat.', duelError: 'Could not save the duel (offline?).', saving: 'Saving…',
  shareText: (mode: string, area: string, score: number) => `${mode} (${area}): I scored ${score} points. Can you beat me?`,
  signInToDuel: 'Sign in (Friends) to challenge your friends and play duels.',
  waitingFor: (names: string) => `Waiting for ${names}`, waitingLink: 'Waiting for someone to open your link',
  youWon: 'You won! 🎉', youLost: 'You lost', rematch: 'Rematch',
  challengedBy: (name: string) => `${name} challenges you!`, nQuestions: (n: number) => `${n} questions`,
  inviteHint: 'Same questions as your friend. You see their answers after your round.', playNow: 'Play', later: 'Later',
  duelWaiting: 'A duel is waiting for you', signInForDuel: 'Sign in or create an account first, then come back to this tab.',
  duelNotFound: 'This duel link does not work (deleted or mistyped).',
}

const de: typeof en = {
  continent: (c: Area) => CONTINENT_DE[c],
  allOfAfrica: 'Alle', regionShort: { 'North Africa': 'Nord', 'West Africa': 'West', 'East Africa': 'Ost', 'Southern Africa': 'Süd' },
  regionsHint: 'In kleineren Schritten: eine Region nach der anderen lernen.', africaRegions: 'Afrika – Regionen',
  brand: 'Hauptstädte', home: 'Start', learn: 'Lernen', mapQuiz: 'Karten-Quiz', mapQuizShort: 'Karte', stats: 'Statistik', settings: 'Einstellungen', toggleDark: 'Dunkelmodus umschalten', language: 'Sprache',
  heroLine1: 'Jedes Land.', heroLine2: 'Jede Hauptstadt.',
  lede: 'Lerne die Welt Kontinent für Kontinent – mit einer Wiederholungsmethode, die sich merkt, was du noch nicht weißt.',
  learned: 'Gelernt', mastered: 'Sicher', dayStreak: 'Tage in Folge', dueToday: 'Heute fällig',
  world: '← Welt', statusNew: 'Neu', statusLearning: 'Am Lernen', statusMastered: 'Sicher',
  nDue: (n) => `${n} fällig`,
  selected: 'Ausgewählt', learnedOf: (l, n) => `${l} von ${n} gelernt`,
  countNew: 'Neu', countLearning: 'Lernen', countDue: 'Fällig',
  startStudying: 'Lernen starten', cardsForToday: (n) => `${n} Karten für heute`, nothingDue: 'Gerade nichts fällig',
  practiceAll: (n) => `Alle ${n} üben`, practiceAllSub: 'Eine ganze Runde, jederzeit',
  mapQuizSub: 'Finde jedes Land auf einer leeren Karte',
  getStarted: 'Los geht’s', chooseContinent: 'Wähle einen Kontinent', chooseHint: 'Tippe einen auf der Karte oder in der Liste an und fang an zu lernen.',
  mixedReview: 'Gemischt wiederholen', mixedSub: (n) => `${n} Karten aus allen Kontinenten`,
  allContinents: 'Alle Kontinente', practiceTag: 'Üben', exit: '✕ Beenden',
  left: 'Offen', missed: 'Falsch', done: 'Fertig', cardsLeft: 'Verbleibende Karten', practiceRound: 'Übungsrunde',
  roundComplete: 'Runde geschafft',
  roundSummary: (total, first, missed) =>
    `Alle ${total} Länder geschafft · ${first} beim ersten Versuch richtig${missed ? `, ${missed} brauchten einen zweiten Anlauf` : ''}.`,
  practiceAgain: 'Nochmal üben', backToMap: 'Zurück zur Karte',
  allDone: 'Fürs Erste fertig', reviewedSummary: (r, f) => `${r} Karten wiederholt · ${f} ohne „Nochmal“.`,
  nextDueIn: (m) => ` Nächste Karte in ${m} Min. fällig.`, comeBackTomorrow: ' Morgen geht’s mit den nächsten Wiederholungen weiter.',
  practiceAllCountries: (n) => `Alle ${n} Länder üben`, practiceAllCountriesSub: 'Eine ganze Runde, ändert deinen Lernplan nicht',
  flagOf: (name) => `Flagge: ${name}`,
  whatCapital: 'Wie heißt die Hauptstadt?', capital: 'Hauptstadt', capitals: 'Hauptstädte',
  typeThe: (x) => `Schreib „${x}“`, typeCapital: 'Hauptstadt eingeben',
  almost: (x) => `Fast. Schreib es genau so: ${x}`, notSame: (x) => `Noch nicht gleich. Schreib: ${x}`,
  continue: 'Weiter', check: 'Prüfen', next: 'Weiter', enter: 'Enter',
  correct: '✓ Richtig', watchSpelling: ' · achte auf die Schreibweise', notQuite: 'Leider falsch', youTyped: 'Du hast geschrieben:', answerIs: 'Richtig ist',
  writeOutCard: 'Schreib es einmal ab, um weiterzumachen. Diese Karte kommt wieder.',
  writeOutPractice: 'Schreib es einmal ab, um weiterzumachen. Dieses Land kommt in dieser Runde nochmal.',
  howWell: 'Wie gut wusstest du es?',
  rating: { again: 'Nochmal', hard: 'Schwer', good: 'Gut', easy: 'Leicht' },
  // "10m" -> "10 Min.", "4d" -> "4 T.", "1.5mo" -> "1,5 Mon."
  interval: (s) => s.replace('.', ',').replace(/mo$/, ' Mon.').replace(/m$/, ' Min.').replace(/h$/, ' Std.').replace(/d$/, ' T.').replace(/y$/, ' J.'),
  population: 'Einwohner', area: 'Fläche', government: 'Regierungsform', languages: 'Sprachen', currency: 'Währung',
  fmtPopulation: (n) => `≈ ${n >= 1e6 ? `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: n < 1e7 ? 2 : 1, minimumFractionDigits: n < 1e7 ? 2 : 1 })} Mio.` : Math.round(n).toLocaleString('de-DE')}`,
  fmtArea: (n, target) => `${target < 100 ? n.toLocaleString('de-DE', { maximumFractionDigits: target % 1 ? 2 : 0 }) : Math.round(n).toLocaleString('de-DE')} km²`,
  continentLabel: 'Kontinent', difficulty: 'Schwierigkeit', easy: 'Leicht', hard: 'Schwer', country: 'Land', countryCapital: 'Land + Hauptstadt',
  namedWord: 'benannt', toRetry: (m) => ` · ${m} nochmal`, restart: 'Neu starten',
  clickHint: (hard) => `Klicke ein Land an und nenne es${hard ? ' samt Hauptstadt' : ''}.`, pickForMe: 'Such mir eins aus',
  open: 'Offen', correctPlain: 'Richtig', withHelp: 'Mit Hilfe', tryAgain: 'Nochmal',
  alreadyNamed: 'Schon benannt', countryAndCapital: 'Land & Hauptstadt', whichCountry: 'Welches Land ist das?',
  close: 'Schließen', flagTip: 'Flagge (Tipp)', nextCountry: 'Nächstes Land', nameOfCountry: 'Name des Landes', itsCapital: 'Seine Hauptstadt',
  flagShown: 'Flagge angezeigt', tipShowFlag: 'Tipp: Flagge zeigen', watchSpellingQuiz: 'Achte auf die Schreibweise. ', youTypedLower: 'du hast geschrieben',
  writeOutQuiz: 'Schreib es einmal ab, um weiterzumachen. Das Land bleibt offen und kommt wieder.',
  confirmRestart: (cont, hard) => `${cont} (${hard ? 'schwer' : 'leicht'}) von vorne beginnen?`,
  complete: (cont) => `${cont} geschafft`,
  quizSummary: (t, hard, s, h) =>
    `Alle ${t} Länder benannt${hard ? ', mit Hauptstadt' : ''} · ${s} beim ersten Versuch richtig${h ? `, ${h} mit Hilfe` : ''}.`,
  playAgain: 'Nochmal spielen', tryHard: 'Schwer ausprobieren', nameThisCountry: 'Benenne dieses Land',
  worldMap: 'Weltkarte', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', resetView: 'Ansicht zurücksetzen',
  back: '← Zurück', dailyLimits: 'Tageslimits', dailyLimitsHint: '250 oder mehr = kein Limit: Ein ganzer Kontinent wird in einem Durchgang gespielt.',
  newPerDay: 'Neue Karten pro Tag', reviewsPerDay: 'Höchstens Wiederholungen pro Tag', backup: 'Sicherung',
  backupText1: 'Dein Fortschritt ist ', backupOnly: 'nur in diesem Browser',
  backupText2: ' gespeichert. Wenn die Browserdaten gelöscht werden, ist er weg – exportiere also ab und zu eine Sicherung. Mit Export/Import kannst du den Fortschritt auch zwischen Handy und Laptop übertragen.',
  exportProgress: 'Fortschritt exportieren', importProgress: 'Fortschritt importieren…', backupDownloaded: 'Sicherung heruntergeladen. Bewahre die Datei gut auf.',
  confirmImport: 'Der Import ersetzt den GESAMTEN Fortschritt auf diesem Gerät durch die Datei. Fortfahren?', imported: 'Fortschritt importiert.',
  reset: 'Zurücksetzen', resetAll: 'Gesamten Fortschritt löschen', confirmReset: 'GESAMTEN Fortschritt auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden (vorher eine Sicherung exportieren!).',
  wasReset: 'Der gesamte Fortschritt wurde gelöscht.',
  countriesLearned: 'Länder gelernt', masteredDays: 'Sicher (21+ Tage)', retention: 'Behalten', nReviews: (n) => ` (${n} Wiederholungen)`,
  streakBest: (b) => `Tage in Folge (Rekord ${b})`, last14: 'Wiederholungen · letzte 14 Tage', reviewsPerDayAria: 'Wiederholungen pro Tag',
  todayTotal: (t, all) => `${t} heute · ${all} insgesamt`, perContinent: 'Fortschritt pro Kontinent',
  learnedSlash: (l, t) => `${l}/${t} gelernt`, legendMastered: 'sicher', legendLearning: 'am Lernen', legendNew: 'neu',
  friends: 'Freunde', loading: 'Lädt…', signIn: 'Anmelden', createAccount: 'Konto erstellen', signOut: 'Abmelden',
  accountWhy: 'Mit einem Konto wird dein Fortschritt online gespeichert (auf jedem Gerät) und du kannst dich mit deinen Freunden vergleichen.',
  yourName: 'Dein Name (sehen deine Freunde)', email: 'E-Mail', password: 'Passwort (mindestens 6 Zeichen)',
  forgotPassword: 'Passwort vergessen?', enterEmailFirst: 'Gib zuerst deine E-Mail ein.', resetMailSent: 'E-Mail verschickt: Über den Link kannst du ein neues Passwort wählen.',
  noAccountYet: 'Noch kein Konto?', haveAccount: 'Schon ein Konto?',
  authError: (code) => ({
    'auth/invalid-credential': 'E-Mail oder Passwort ist falsch.', 'auth/wrong-password': 'E-Mail oder Passwort ist falsch.', 'auth/user-not-found': 'E-Mail oder Passwort ist falsch.',
    'auth/email-already-in-use': 'Mit dieser E-Mail gibt es schon ein Konto. Melde dich stattdessen an.',
    'auth/weak-password': 'Das Passwort braucht mindestens 6 Zeichen.', 'auth/invalid-email': 'Diese E-Mail-Adresse sieht falsch aus.',
    'auth/network-request-failed': 'Keine Internetverbindung.', 'auth/too-many-requests': 'Zu viele Versuche. Warte kurz und versuch es nochmal.',
  } as Record<string, string>)[code] ?? `Etwas ist schiefgelaufen (${code}).`,
  hello: (name) => `Hallo ${name}`, syncState: { syncing: 'Speichert…', saved: '✓ Fortschritt in deinem Konto gespeichert', offline: 'Offline: wird gespeichert, sobald du wieder online bist' },
  confirmSignOut: 'Abmelden? Dein Fortschritt bleibt in deinem Konto und wird von diesem Gerät entfernt.',
  signOutOffline: 'Du bist offline, darum konnte der neueste Fortschritt noch nicht gespeichert werden. Versuch es mit Internet nochmal.',
  leaderboard: 'Rangliste', refresh: 'Aktualisieren', leaderboardHint: 'Alle mit Konto. Tippe auf eine Spalte zum Sortieren, auf einen Namen für Details.',
  leaderboardError: 'Rangliste konnte nicht geladen werden (offline?).', player: 'Spieler', you: 'du', streakShort: 'Serie', thisWeek: '7 Tage',
  totalAnswers: (n) => `${n} Antworten insgesamt`,
  backupSynced: 'Du bist angemeldet: Dein Fortschritt wird automatisch in deinem Konto gespeichert. Eine Sicherungsdatei schadet trotzdem nicht.',
  play: 'Spielen', playLede: 'Schnelle Runden mit 10 Fragen. Schnell und richtig = mehr Punkte. Dann fordere deine Freunde heraus, dich mit genau denselben Fragen zu schlagen.',
  gameModeLabel: 'Spielmodus',
  gameMode: { capital: 'Hauptstadt-Sprint', flag: 'Flaggen-Blitz', reverse: 'Umgekehrt', pin: 'Pin it' },
  gameModeDesc: {
    capital: 'Land wird gezeigt, tippe die Hauptstadt.', flag: 'Nur die Flagge: Welches Land?',
    reverse: 'Hauptstadt wird gezeigt, tippe das Land.', pin: 'Finde das Land auf der Karte. Knapp daneben gibt auch Punkte.',
  },
  wholeWorld: 'Ganze Welt', startRound: 'Runde starten', tenQuestions: '10 Fragen · je 15 s', recordIs: (n) => `Dein Rekord: ${n} Punkte`,
  gamePromptCapital: 'Wie heißt die Hauptstadt?', gamePromptFlag: 'Zu welchem Land gehört die Flagge?', gamePromptReverse: 'Das ist die Hauptstadt von …', gamePromptPin: 'Wo liegt',
  typeCountry: 'Land eingeben', dontKnow: 'Weiß ich nicht', flagQuestion: 'Flagge des gesuchten Landes',
  confirmQuitGame: 'Runde abbrechen? Sie zählt dann nicht.', points: 'Punkte', questionOf: (i, n) => `Frage ${i} von ${n}`,
  timeUp: '⏱ Zeit abgelaufen', closeBy: 'Knapp!', kmOff: (km) => `${km.toLocaleString('de-DE')} km daneben`,
  roundDone: 'Runde geschafft', pointsOf: (max) => `Punkte (max. ${max})`, rightAnswers: 'richtig', totalTime: 'Gesamtzeit',
  firstRecord: 'Erste Runde in diesem Modus', newRecord: (old) => `Neuer Rekord! (vorher: ${old})`, yourRecord: 'dein Rekord',
  questions: 'Fragen',
  duels: 'Duelle', duelVs: (names) => `Duell gegen ${names}`, noDuelsYet: 'Noch keine Duelle. Spiel eine Runde und fordere dann einen Freund heraus.',
  duelGroup: { yourTurn: 'Du bist dran', waiting: 'Warten auf die anderen', done: 'Beendet' },
  winLoss: (w, l) => `${w} gewonnen · ${l} verloren`, won: 'gewonnen', lost: 'verloren', draw: 'Unentschieden', linkOnly: 'Geteilter Link',
  challengeFriends: 'Freunde herausfordern', challengeHint: 'Sie bekommen genau dieselben 10 Fragen. Die meisten Punkte gewinnen (bei Gleichstand die schnellere Zeit).',
  noFriendsYet: 'Außer dir hat noch niemand ein Konto. Teile stattdessen den Link.',
  challengeN: (n) => (n ? `${n} herausfordern` : 'Oben Freunde auswählen'), shareLink: 'Link teilen',
  challengeSent: 'Herausforderung verschickt! Sie erscheint bei deinen Freunden im Tab „Spielen“.', duelCreated: 'Duell erstellt. Jeder mit dem Link kann mitspielen.',
  linkCopied: 'Link kopiert. Füge ihn in einen Chat ein.', duelError: 'Duell konnte nicht gespeichert werden (offline?).', saving: 'Speichert…',
  shareText: (mode, area, score) => `${mode} (${area}): Ich habe ${score} Punkte. Schaffst du mehr?`,
  signInToDuel: 'Melde dich an (Freunde), um deine Freunde herauszufordern und Duelle zu spielen.',
  waitingFor: (names) => `Warten auf ${names}`, waitingLink: 'Warten, bis jemand deinen Link öffnet',
  youWon: 'Gewonnen! 🎉', youLost: 'Verloren', rematch: 'Revanche',
  challengedBy: (name) => `${name} fordert dich heraus!`, nQuestions: (n) => `${n} Fragen`,
  inviteHint: 'Dieselben Fragen wie dein Freund. Seine Antworten siehst du nach deiner Runde.', playNow: 'Spielen', later: 'Später',
  duelWaiting: 'Ein Duell wartet auf dich', signInForDuel: 'Melde dich zuerst an oder erstelle ein Konto und komm dann zu diesem Tab zurück.',
  duelNotFound: 'Dieser Duell-Link funktioniert nicht (gelöscht oder falsch kopiert).',
}

export const TEXTS: Record<Lang, typeof en> = { en, de }
