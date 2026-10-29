# 🌍 Countries & Capitals

Learn all 198 countries of the world and their capitals, Anki-style. Start from an interactive world map, pick a continent, type the capital, and let spaced repetition schedule your reviews.

- Clean, minimal design (light and dark) in the spirit of Apple / consulting-firm websites: big typography, lots of white space, one green accent
- Works offline once loaded (PWA), installable on your phone
- No backend of its own: progress is stored in your browser. Optional free accounts (Firebase) sync progress across devices and add a friends leaderboard (section 5)
- English or German: switch on the start page (or EN/DE in the top bar). In German, country names, capitals, government, languages, currencies and the Wikipedia summary are German; answers are accepted in both languages ("Wien" and "Vienna")

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
| **Desktop / mobile** | Two versions of the interface (`src/device.ts`, sets `<html data-device>`): **desktop** (mouse + window ≥ 1000 px) and **mobile** (any touch screen, or a narrow window). Mobile works like an app: the tabs are a bar at the bottom (hidden while studying cards), the start page has the map from edge to edge, the figures as small tiles, a swipeable row of continents (tablets: grid next to the panel) and a floating “Start studying” button on phones. Maps on touch screens have no +/− buttons (pinch instead). Switches live when the window is resized or a tablet is rotated. |
| **Home layout** (desktop) | Fills exactly one screen, edge to edge: a slim strip (title + figures) on top; below it the big interactive map (all the remaining height) and on the right one tall panel (same height as the map): heading ("Choose a **continent**", or the chosen continent in green), Country → Capital switch, the six continents (2 × 3), then Mixed review / the study buttons. The content always fills the panel: the continent tiles take the spare height and their text grows with them (container query units). Compact on laptops; scrolls inside on very small screens. On big screens everything grows with the screen (`html[data-device='desktop']` font size scales with the width, sizes are in rem). On phones: map (4:3), continents, panel stacked. |
| **Sharp satellite pictures** | When you zoom in, the satellite view (flat map and globe) loads detailed tiles from [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) (free with attribution, shown at the bottom of the map). The globe uses them directly; the flat map redraws the visible area after every zoom/pan by bending the Mercator tiles into its own projection, pixel by pixel (`src/map/satDetail.ts`). Without internet the coarse NASA picture stays. Tiles seen before are cached for offline use (up to 800). |
| **3D globe** | On the home page and in the flashcards the map look button goes one step further: 🗺️ normal → 🛰️ satellite → 🌍 **3D globe** (`src/map/GlobeMap.tsx`, [globe.gl](https://github.com/vasturiano/globe.gl) on three.js). Drag to turn it, scroll/pinch to zoom; it turns to the chosen continent and flies to the country after a right answer (with its cities); it only moves when you turn it. Around it: space with sharp star points (three.js `Points`, drawn in screen pixels) and a faint Milky Way. Country colours use fine triangles (`polygonCapCurvatureResolution(1.5)`, the default left holes in big countries) and the satellite tiles switch to the next detail level earlier than globe.gl's default. Texture `public/earth.jpg` (same NASA photo, plain lon/lat, 4096 × 2048). The globe code (~530 KB zipped) is a separate chunk, only downloaded when someone switches the globe on (not precached by the PWA). Maps that can't be a globe (map quiz, nature, play) show the satellite photo while the globe is chosen. |
| **Satellite view** | The 🛰️ button under the zoom buttons switches every map (learn, map quiz, nature, play) between the normal map and a satellite photo; 🗺️ switches back. The choice is remembered (localStorage `country-capitals:mapstyle`). The photo is NASA's "Blue Marble: Next Generation" (July, public domain), bent into the map's own projection by `npm run data:satellite` → `public/satellite.jpg` (4800 × 2500, ~1.1 MB; only downloaded when switched on, then cached for offline use). Countries then only keep a light tint of their colour and white borders; other continents are darkened. |
| **Biggest cities** | After a right answer (flashcards and map quiz) the country's capital (red diamond) and its biggest cities (white dots) are written on the map, and listed under "Biggest cities" in the facts. In the flashcards the map also zooms in on the country, and back out for the next card. Data: Natural Earth populated places (public domain), up to 5 per country, built by `npm run data:cities` → `data/cities.json`. Ranked by the city's own population (at least a quarter of its urban area, because a few big cities have broken numbers in the file); the numbers themselves are not exact enough to show. Suburbs right next to a bigger city are left out. |
| **Study screen** | The continent map fills the whole page (on phones it is pinned at the top) and the card with flag and question floats on it. The country being asked is always highlighted on the map. Oceania shows the Pacific islands west of the date line (Tonga, Samoa) at the right edge. |
| **Card** | Flag, English + German name. You type the capital; the answer checker ignores case, accents and punctuation, accepts alternative spellings and small typos (more for longer words), and never accepts another country's capital. Details (population, area, government, languages, currency, Wikipedia summary) appear only after a correct answer. |
| **Africa regions** | Africa (54 countries) can be split into North (10), West (17), East (14) and Southern Africa (13): pick Africa, then a region. Studying, practice and the map quiz then use only that region (the map zooms in). Rough split by compass direction, Central Africa shared out; the list is in `src/data/countries.ts` (`REGION_IDS`). Learning progress is shared: a country learned in "West Africa" also counts for Africa. |
| **Capital → Country** | Switch in the side panel of the Learn tab: "Country → Capital" (the original) or "Capital → Country" (the capital is shown, you type the country; English, German and common names like "USA" count). Each direction has its own deck and schedule; reverse cards are saved as `r:<id>` in the same progress, so backup and account sync work unchanged. Flag, map highlight and hover names stay hidden until you answered. The choice is remembered in localStorage `country-capitals:direction`. The friends leaderboard always counts the Country → Capital deck. |
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
firestore.rules  database rules for the accounts (paste into the Firebase console)
data/            countries.json (generated), overrides.json (manual fixes + sources), config.ts (country list)
scripts/         fetch-data.ts (download + build JSON), validate-data.ts (completeness check),
                 fetch-nature.ts, fetch-cities.ts, fetch-satellite.ts (map extras, see section 2)
public/          flags/*.svg, icons
src/map/         WorldMap.tsx (zoomable map, focus ring, cities, satellite), GlobeMap.tsx (3D globe), projection.ts (shared with the satellite script), mapStyle.ts
src/components/  CountUp (animated numbers)
src/study/       StudyView.tsx, CountryFacts.tsx (facts block, shared with the map quiz), matcher.ts (answer checking), practice.ts (practice-all queue)
src/games/       GamesView.tsx (Play tab), GamePlay.tsx (a round), GameResult.tsx (result, challenge, comparison), modes.ts (questions + points), duels.ts
src/quiz/        MapQuiz.tsx (map quiz tab), quizState.ts (rounds + saving), quiz.css
src/nature/      NatureView.tsx (Nature tab: rivers, waters, mountains), nature.ts (answer check + saving), nature.css
src/progress/    scheduler.ts, store.ts (queue + limits), storage.ts (storage interface), stats.ts
src/pages/       Settings.tsx, Stats.tsx, Friends.tsx (sign in + leaderboard)
src/cloud/       config.ts (Firebase project), cloud.ts (account + sync), firebase.ts (Firebase calls)
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
| Biggest cities | Natural Earth 1:10m populated places (public domain) |
| Satellite photo | [NASA Visible Earth, Blue Marble: Next Generation](https://visibleearth.nasa.gov/collection/1484/blue-marble) (public domain); zoomed in: Esri World Imagery tiles (Esri, Maxar, Earthstar Geographics; attribution required) |

### Refresh the data

```bash
npm run data:refresh    # re-download everything and rebuild data/countries.json (~3 min)
npm run data:validate   # print the validation report
```

`npm run data:fetch` reuses cached downloads (`scripts/.cache/`, not committed). `data/countries.json` stores a `lastUpdated` date. The optional GitHub Action `refresh-data.yml` does this on the 1st of every month and opens a pull request.

### Completeness check

`npm run build` (which the GitHub deploy also runs) first runs `scripts/validate-data.ts`. The build **fails** if any country lacks a continent, capital, flag or map entry, if a continent is invalid, or if there aren't exactly 193 UN members. It also prints warnings (missing population/government/summary, suspicious values).

### Manual fixes: `data/overrides.json`

Every manual decision lives here (also `capitalsDe` and `governmentDe` for the German texts), with a note or source, and is re-applied after each refresh: continents, name changes, multiple capitals, accepted alternative spellings (capitals and, in `nameAliases`, country names for the map quiz), and per-field fixes (e.g. Austria → German, Micronesia → USD, Cyprus government).

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

## 5. Accounts + friends leaderboard (optional, free)

The app has no server of its own. For accounts it uses **Firebase** (by Google) on the free **Spark** plan: no credit card, and for a group of friends you never get near the limits (50,000 reads and 20,000 writes per day). Until a Firebase project is filled in, the app works exactly as before, without login.

**What it does:** a **Friends** button appears in the top bar. You create an account (name, email, password). Your progress is then saved in your account and is the same on every device you sign in on (progress already in the browser is merged in, nothing is lost). The leaderboard shows everyone with an account: countries learned, mastered, current streak, answers in the last 7 days; tap a name for the per-continent progress. Signing out removes the progress from that browser (it stays in the account). Map-quiz progress is not synced yet.

**Set it up once (about 10 minutes):**

1. Go to <https://console.firebase.google.com>, sign in with a Google account, **Create a project** (name e.g. `country-capitals`; Google Analytics: off).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. **Build → Firestore Database → Create database** → pick a location in Europe (e.g. `eur3` or `europe-west3`) → *Start in production mode*.
4. Still in Firestore: tab **Rules** → replace everything with the contents of `firestore.rules` from this folder → **Publish**.
5. Project overview (⚙ next to *Project Overview*) → **Project settings → Your apps → Web (`</>`)** → nickname `web` → **Register app**. It shows a `firebaseConfig = { apiKey: ..., ... }` block.
6. Copy those values into `src/cloud/config.ts` (replace `null` with the object). They are not secret: every web app sends them to the browser; the rules from step 4 protect the data.
7. Authentication → **Settings → Authorized domains** → *Add domain* → `paulannosenger-ux.github.io` (localhost is already there).
8. Commit + push; after the deploy, send your friends the link.

**How syncing works** (`src/cloud/`): the browser copy stays the main copy, so the app is fast and works offline. After signing in and a few seconds after answering, the browser copy is merged with the account copy (`src/progress/merge.ts`: per country the more-practised card wins, review logs are joined) and uploaded. Reset and Import in Settings overwrite the account copy. Database: `players/{uid}` = leaderboard card (readable by all signed-in players), `progress/{uid}` = full progress as JSON (only you). Anyone who has the link can create an account and appears on the leaderboard.

## 6. Play tab: game modes + duels

Quick rounds of **10 questions, 15 seconds each**. A right answer gives 100 points plus up to 100 for speed (max. 2,000 per round). Modes (`src/games/modes.ts`):

| Mode | Question | Answer |
|---|---|---|
| 🏙️ Capital sprint | flag + country | type the capital |
| 🚩 Flag flash | only the flag | type the country (Chad/Romania and Monaco/Indonesia: both count) |
| 🔄 Reverse | the capital | type the country |
| 📍 Pin it | country name | click it on the map; the wrong country still gives up to 99 points the closer it is (0 from 2,500 km) |

Each can be played on the whole world, a continent or an African region. Your best score per mode + area is kept in the browser.

**Duels** (needs an account): after a round, tick friends from the leaderboard and press *Challenge*, or *Share link* (phone share sheet / copied link `…/?duel=ID`). They play exactly the same questions whenever they like (no need to be online at the same time); the Play tab shows a red number when it's your turn. Most points win, on a tie the faster total time. Afterwards: comparison question by question, and *Rematch*. A link can be opened by several friends (group duel, up to 20). Stored in Firestore `matches/{id}`; the rules let everyone add only their own result, once.

**Quiz duel** (needs an account; `src/games/quizduel.ts`, `QuizDuelView.tsx`, `QuizDuelPlay.tsx`): like the "Quizduell" app. 1 against 1 with a friend, **6 rounds of 3 multiple-choice questions** (4 choices, 20 s each). The players take turns choosing the category of a round: 🏙️ capitals (country → capital), 🚩 countries (flag → country), 🌊 rivers, ⛰️ mountains, 💧 lakes & seas (the shape lights up on a small map). Both answer the same questions; on your turn you first play the round your friend chose, then choose and play the next one. The board shows ✓/✗ per question (the friend's answers stay hidden until you played that round; tap a round to see the questions and answers). 1 point per right answer, most points win (a tie is a draw). Wrong choices come from the same continent, and no question repeats within a duel. Stored in Firestore `quizduels/{id}` (`turn` = whose turn, for the lists and the red number on the Play tab); the rules only let the player whose turn it is save.

**After changing `firestore.rules`** paste them into the Firebase console again (Firestore → Rules → Publish).

## 7. Nature tab: rivers, waters, mountains

The most important **rivers**, **waters** (seas, lakes, the Suez and Panama canals) and **mountain ranges** of each continent, about 150 in total.

- **Explore**: list of names; tap one (in the list or on the map) to see it highlighted with its key figures: length / area / greatest depth / highest peak, source and mouth, all countries it flows through or borders (with flags), and a short fact.
- **Quiz**: one shape lights up (blue / brown), type its name (English or German, small typos are fine, "der/die/das/the" optional). **Tap any other shape on the map to answer that one instead.** Named ones turn green and get their name written on the map; the round is kept per continent + kind (localStorage `country-capitals:nature:rounds:v1`, "Restart" clears it). A wrong answer has to be written out once; the item stays open. "Known" (green dot) / "missed" (red) in the list: `country-capitals:nature:v1`.
- **Key figures** are hand-made in `data/nature-facts.ts` (countries as ISO codes; a test checks every item has them and every code exists).
- **The list** is hand-made in `data/nature.ts` (names, aliases, fact in both languages, which Natural Earth features form the shape). Some items belong to two continents (Mediterranean: Europe + Africa; Urals, Caucasus, Caspian Sea: Europe + Asia).
- **The shapes** come from Natural Earth (public domain, 1:50m; a few rivers from 1:10m). After changing the list run `npm run data:nature`: it writes `data/nature-geo.json` (~360 KB, loaded only when the tab is opened) and lists any name it could not find.
- Not built yet: deserts (Sahara, Gobi, …) are in the same Natural Earth file and could be added as a fourth kind.

## 8. Later ideas (not built)

Live duels (both at the same time), survival mode (until the first mistake), duel wins on the leaderboard, syncing map-quiz progress, friend groups (separate leaderboards), more languages, a Pacific-centred Oceania view.
