# 🌍 Countries & Capitals

Learn all 198 countries of the world and their capitals, Anki-style. Start from an interactive world map, pick a continent, type the capital, and let spaced repetition schedule your reviews.

- Clean, minimal design (light and dark) in the spirit of Apple / consulting-firm websites: big typography, lots of white space, one green accent
- Works offline once loaded (PWA), installable on your phone
- No login, no backend: progress is stored in your browser
- English UI, German country names shown next to the English ones

> ⚠️ **Your progress lives only in your browser (localStorage).** Clearing browser data, using a private window, or switching browser/device deletes or hides it. Use **⚙ Settings → Export progress** now and then, and **Import progress** to move to another device.

---

## 1. Run it locally

**Easiest:** double-click **Countries-and-Capitals.command** on your Desktop. It builds the app and opens it at <http://localhost:4173>. Close the Terminal window to stop it. (First time only: right-click → Open, to get past the macOS warning.)

The launcher rebuilds the app on every start, so it always shows the latest version. If the app is already running it just opens the browser.

**With the terminal** (needs Node.js, `brew install node`):

```bash
cd ~/country-capitals
npm install        # first time only
npm run dev        # live-reload development server
npm run build      # validate data + production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (matcher, scheduler, queue, stats)
```

To try it on your phone while developing: `npm run dev -- --host`, then open the "Network" address on the same Wi-Fi.

## 2. How it works

| Part | What it does |
|---|---|
| **Map** | Natural Earth 50m via `world-atlas`, drawn with `d3-geo`; zoom/pan/pinch with `d3-zoom`. Tiny countries (and Tuvalu, which has no polygon) get tappable circle markers. |
| **Study screen** | The continent map fills the whole page (on phones it is pinned at the top) and the card with flag and question floats on it. The country being asked is always highlighted on the map. Oceania shows the Pacific islands west of the date line (Tonga, Samoa) at the right edge. |
| **Card** | Flag, English + German name. You type the capital; the answer checker ignores case, accents and punctuation, accepts alternative spellings and small typos (more for longer words), and never accepts another country's capital. Details (population, area, government, languages, currency, Wikipedia summary) appear only after a correct answer. |
| **Practice all** | Button on the home screen (and on the "All done" screen): one round through *every* country of the continent in random order, any time, even when nothing is due. Missed countries come back a few cards later in the same round. It does not change your review schedule. |
| **Map quiz** (2nd tab) | The continent is shown as a blank map. Click any country: it is highlighted, a line connects it to an answer box. **Easy** = type the country's name, **Hard** = country + capital. **Tip** shows the flag (counts as "with help"). After a correct answer the box shows the same facts as the flashcards (population, area, government, languages, currency, Wikipedia summary), and the country's name is written on the map (small countries get their label once you zoom in far enough). A wrong answer must be written out once; the country turns red and stays open until you get it right. Names accept English, German and common alternatives (USA, Czech Republic, Ivory Coast, ...). Progress per continent + mode is saved in the browser (key `country-capitals:quiz:v1`, separate from the flashcards and not part of export/import). |
| **Wrong answers** | You see the correct capital, then you must type it out once (spelled exactly, case and accents ignored) before you can continue. The card counts as "Again" and comes back soon. |
| **Scheduler** | My own Anki-style SM-2 (`src/progress/scheduler.ts`): learning steps 1 min → 10 min, graduating interval 1 day, easy interval 4 days, ease 2.5 (−0.15 Hard, −0.20 Again, +0.15 Easy, min 1.3), relearning step 10 min after a lapse, late-review bonus. No random "fuzz". Day rolls over at 4 am. |
| **Daily limits** | By default **no limit on new cards** (250/day), so you can play a whole continent through in one go; 500 reviews/day. Both can be changed in Settings (e.g. set new cards to 10 for a slow pace). |
| **Status colors** | new = never studied · learning = in learning/relearning or interval < 21 days · mastered = interval ≥ 21 days. "Learned" = graduated from the learning steps at least once. |
| **Keyboard** | Enter = check answer (and "Next" after a wrong answer) · 1–4 = Again / Hard / Good / Easy. |
| **Stats** | Cards learned, mastered, retention (share of review answers that weren't "Again"), streak, last 14 days, per-continent progress. |

Tech: Vite + TypeScript + React (the card flow, map and stats share state, which React keeps simple), `vite-plugin-pwa`, `vitest`. Fonts (Orbitron, Rajdhani) are bundled via `@fontsource`, so they work offline.

**Design:** all colors, fonts and shadows are tokens at the top of `src/index.css` (light theme by default, dark theme follows the system or the ☾/☀︎ toggle). The Inter font is bundled via `@fontsource-variable/inter`, so it works offline. Layout and components are in `src/App.css`, the study screen in `src/study/study.css`. Animations are subtle and switch off for people who enabled "reduce motion".

### Folder structure

```
data/            countries.json (generated), overrides.json (manual fixes + sources), config.ts (country list)
scripts/         fetch-data.ts (download + build JSON), validate-data.ts (completeness check)
public/          flags/*.svg, icons
src/map/         WorldMap.tsx (zoomable map, focus ring)
src/components/  CountUp (animated numbers)
src/study/       StudyView.tsx, CountryFacts.tsx (facts block, shared with the map quiz), matcher.ts (answer checking), practice.ts (practice-all queue)
src/quiz/        MapQuiz.tsx (map quiz tab), quizState.ts (rounds + saving), quiz.css
src/progress/    scheduler.ts, store.ts (queue + limits), storage.ts (storage interface), stats.ts
src/pages/       Settings.tsx, Stats.tsx
.github/workflows/  deploy.yml, refresh-data.yml
```

## 3. Data

### Sources

| Data | Source |
|---|---|
| Names, German names, capitals, area, languages, currencies, coordinates | [mledoze/countries](https://github.com/mledoze/countries) (ODbL). *REST Countries v3.1 is deprecated and v5 needs an API key, so I used the open dataset it was built on.* |
| Population (+ year) | [Wikidata](https://www.wikidata.org) (P1082) and the [World Bank API](https://data.worldbank.org) (SP.POP.TOTL). The newer figure wins. Shown as approximate, with the year. |
| Government type | Wikipedia infobox (`government_type`); Wikidata (P122 / instance of) as fallback |
| Summary text | [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) page summaries (CC BY-SA; every card links to the article) |
| Flags | [flag-icons](https://github.com/lipis/flag-icons) (MIT) |
| Map | [Natural Earth](https://www.naturalearthdata.com) via [`world-atlas`](https://github.com/topojson/world-atlas) (public domain / ISC) |

### Refresh the data

```bash
npm run data:refresh    # re-download everything and rebuild data/countries.json (~3 min)
npm run data:validate   # print the validation report
```

`npm run data:fetch` reuses cached downloads (`scripts/.cache/`, not committed). `data/countries.json` stores a `lastUpdated` date. The optional GitHub Action `refresh-data.yml` does this on the 1st of every month and opens a pull request.

### Completeness check

`npm run build` (which the GitHub deploy also runs) first runs `scripts/validate-data.ts`. The build **fails** if any country lacks a continent, capital, flag or map entry, if a continent is invalid, or if there aren't exactly 193 UN members. It also prints warnings (missing population/government/summary, suspicious values).

### Manual fixes: `data/overrides.json`

Every manual decision lives here, with a note or source, and is re-applied after each refresh: continents, name changes, multiple capitals, accepted alternative spellings (capitals and, in `nameAliases`, country names for the map quiz), and per-field fixes (e.g. Austria → German, Micronesia → USD, Cyprus government).

### Adding a country or territory

Add one line to `EXTRA_TERRITORIES` in `data/config.ts` (e.g. Western Sahara `EH`, Hong Kong `HK` are already there, commented out), choose a `status`, then run `npm run data:fetch`. Add a continent override if its default is wrong.

### Continent decisions

Every country has exactly one continent (checked by the validator).

- **Your rules:** Turkey → Europe, Russia → Asia, Egypt → Africa.
- **My calls (most common convention):** Cyprus → Europe (EU member), Georgia, Armenia, Azerbaijan → Asia (UN geoscheme: Western Asia), Kazakhstan → Asia, Greenland → North America.
- **Everything else:** the dataset's region; "Americas" is split into South America vs. North America (incl. Central America and the Caribbean).
- **Result:** Africa 54, Asia 48, Europe 46, North America 24, Oceania 14, South America 12 = 198.

### Country list

193 UN members + Vatican City, Palestine, Taiwan, Kosovo, Greenland = 198. (The source dataset flags the Vatican as a UN member; it's only an observer, so it's excluded from the automatic "UN member" list and added explicitly.)

### Known data caveats

- Government types are Wikipedia's own wording (e.g. "federal semi-presidential republic" for Austria).
- Several countries have more than one capital (South Africa, Bolivia, Eswatini, Palestine, Sri Lanka); all are shown, any is accepted. Some extra answers (e.g. The Hague for the Netherlands) are accepted silently.
- Samoa, Tonga and Niue lie just west of the map's 180° edge, so they appear at the far left of the world map (still tappable from the world view).

## 4. Deploy to GitHub Pages (optional, step by step)

You don't need this to use the app on your computer. It gives you a link you can open on your phone anywhere.

1. **Create an account** at <https://github.com> (or log in).
2. **Create a repository:** click **+ → New repository**. Name it `country-capitals`, keep it **Public**, do *not* add a README, click **Create repository**.
3. **Push the code** (in the VS Code terminal, inside `~/country-capitals`). Replace `YOUR-NAME`:
   ```bash
   git add .
   git commit -m "Countries & Capitals app"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/country-capitals.git
   git push -u origin main
   ```
   If it asks you to sign in, choose the browser/GitHub sign-in option.
4. **Turn on Pages:** in the repo, **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. **Wait** 1–2 minutes: the **Actions** tab shows the "Deploy to GitHub Pages" run. When it's green, your app is at `https://YOUR-NAME.github.io/country-capitals/`.
6. Every later `git push` redeploys automatically. The build runs the completeness check first, so incomplete data can't be published.

**Monthly data refresh (optional):** Settings → Actions → General → tick *Allow GitHub Actions to create and approve pull requests*. You can also run it any time from the Actions tab → "Refresh country data" → *Run workflow*.

### Install on your phone

Open the deployed link, then: **iPhone** Safari → Share → *Add to Home Screen*. **Android** Chrome → menu → *Install app*. After the first load it works offline. Progress is stored per browser/installed app, so export/import to move it.

## 5. Later ideas (not built)

Reverse direction (capital → country), flag-only quiz, cloud sync (implement the `ProgressStorage` interface in `src/progress/storage.ts`), more languages, a Pacific-centred Oceania view.
