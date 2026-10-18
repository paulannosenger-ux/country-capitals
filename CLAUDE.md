# Countries & Capitals: notes for Claude

Student project (owner is a beginner, speaks German). UI in English or German (`src/i18n.ts`: all texts, `useT()`/`useLang()`, saved in localStorage `country-capitals:lang`, first visit follows the browser language). German data per country in `countries.json` → `de` (capitals from Wikidata labels, government from Wikidata P122 or `overrides.json` → `governmentDe`, summary from de.wikipedia, languages/currencies via Intl.DisplayNames). Capital answers accept English and German names. Flashcard web app: learn all 198 countries and their capitals, Anki-style. Read README.md first for architecture, data sources, continent decisions and deploy steps.

## Facts worth knowing
- Run: Desktop file `Countries-and-Capitals.command` (symlink to `start-app.command`: builds, serves `vite preview` on http://localhost:4173, opens the browser). Dev: `npm run dev`. Tests: `npm test` (vitest, 43 tests). `npm run build` also runs the data completeness check.
- Stack: Vite + TypeScript + React, d3-geo/d3-zoom map, vite-plugin-pwa, Inter font bundled. No backend; progress lives in the browser's localStorage (key `country-capitals:v1`), export/import in Settings.
- Data: `data/countries.json` is generated (`npm run data:fetch`); manual fixes only in `data/overrides.json`; country list in `data/config.ts`.
- Scheduler: own Anki-style SM-2 in `src/progress/scheduler.ts`; queue + daily limits in `src/progress/store.ts`. New cards per day default = 250 (no limit: play whole continent).
- Design: clean Apple/BCG-like look, tokens in `src/index.css`. (An earlier "Iron Man HUD" design was replaced on purpose.)
- Study screen: map fills the page (`WorldMap` with `fill` + `reserve`), card floats on the right, the asked country is always highlighted; Oceania wraps the Pacific strip west of the date line.
- Two tabs in the nav: Learn (flashcards) and Map quiz (`src/quiz/`: blank continent, click a country, answer box linked by a line; easy = country name, hard = + capital; flag tip; quiz progress in its own localStorage key `country-capitals:quiz:v1`). Correctly named countries get a name label on the map (`WorldMap` prop `labelIds`, shown only when the country is wide enough on screen) and the box shows `CountryFacts`.
- "Practice all N": a session through every country of a continent regardless of what is due (`StudyView` with `practice`); does NOT touch the SRS schedule.
- Country-name answers use `checkCountryName` (en/de name + `nameAliases` from the dataset's official name/altSpellings + `overrides.json` → `nameAliases`).
- The service worker is registered in `main.tsx` with auto-reload, so a rebuilt version shows up immediately.
- After a wrong answer the learner must re-type the correct capital (exact match) before the next card; the card counts as Again.
- Launcher always kills an old server on port 4173 and starts fresh after rebuilding.
- Gotchas: tsconfig has `erasableSyntaxOnly` (no constructor parameter properties); `sed -i` fails on this Mac in some commands, use python for edits; remember to kill stray `vite preview` processes (port 4173) after testing.
- Deployed: repo https://github.com/paulannosenger-ux/country-capitals (public), live at https://paulannosenger-ux.github.io/country-capitals/ via the GitHub Action on every push to main. Commits use the GitHub noreply email (never the owner's gmail). Publishing/pushing to the public repo is blocked for Claude by the auto-mode classifier: give the owner the command to run in the VS Code terminal.
