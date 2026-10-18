// Interface language (English / German). Saved per browser; the first visit follows the phone's language.
// All texts of the app live here: `en` is the reference, `de` must have the same keys.
import { useSyncExternalStore } from 'react'
import type { Continent } from './data/countries'

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

const CONTINENT_DE: Record<Continent, string> = {
  Europe: 'Europa', Asia: 'Asien', Africa: 'Afrika', 'North America': 'Nordamerika', 'South America': 'Südamerika', Oceania: 'Ozeanien',
}

const en = {
  continent: (c: Continent) => c as string,
  // nav
  brand: 'Capitals', home: 'Home', learn: 'Learn', mapQuiz: 'Map quiz', stats: 'Stats', settings: 'Settings', toggleDark: 'Toggle dark mode', language: 'Language',
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
}

const de: typeof en = {
  continent: (c: Continent) => CONTINENT_DE[c],
  brand: 'Hauptstädte', home: 'Start', learn: 'Lernen', mapQuiz: 'Karten-Quiz', stats: 'Statistik', settings: 'Einstellungen', toggleDark: 'Dunkelmodus umschalten', language: 'Sprache',
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
}

export const TEXTS: Record<Lang, typeof en> = { en, de }
