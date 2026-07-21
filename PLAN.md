# Morse Invaders — Morse Code Tutor

A mobile-first web app that teaches Morse code (Koch method) and drills it with
three arcade games. All input is by **keying Morse** with one or two on-screen
buttons — no keyboard required.

## Status
- [x] Phase 0 — Scaffold, Morse dictionary, audio engine, config panel
- [x] Phase 1 — Learn mode (Koch) + skill model + keyer + persistence
- [x] Phase 2 — Practice drills + modes (See→Key, Echo, Hard), ranges, sequencing
- [x] Phase 2.5 — PWA + Capacitor iOS packaging (GitHub Actions → unsigned .ipa)
- [x] Phase 3 — Game 1: Space Invaders (3 pylons) — key the invader's letter
- [x] Phase 4 — Game 2: Falling Letters — key each drop before it lands (3 lives)
- [x] Phase 5 — Game 3: Guitar Hero — key dots/dashes on the beat, combo scoring
- [ ] Phase 6 — Stats dashboard polish, adaptive tuning

## Dev server
`serve.py` (threaded, no-cache) serves `www/` on :8778 — used by preview_start
via `.claude/launch.json`. No-cache avoids the stale-JS problem during dev.
Games live in `www/js/games/{invaders,falling,rhythm}.js`, hosted by
`startGame()` in main.js (shared canvas/keyer/adaptive-pool harness).

## Stack
Static site in `www/`: vanilla JS (classic scripts, `window.MT` namespace), HTML5
Canvas, Web Audio API, localStorage. No build step for the web app. Wrapped with
**Capacitor** for iOS/Android; PWA manifest + service worker for install/offline.
See `BUILD_IPA.md` for producing the .ipa via GitHub Actions + Sideloadly.

## Layout
- `www/` — the web app (served directly, and Capacitor's webDir)
- `package.json`, `capacitor.config.json` — Capacitor project
- `.github/workflows/ios.yml` — cloud macOS build → unsigned .ipa artifact

## Input model (mobile-first)
- **Straight key (1 button):** tap = dot, hold past threshold = dash.
- **Paddle (2 buttons):** dot button + dash button.
- Every answer everywhere is given by keying Morse. Letter commits after a gap.
- Keyboard fallback for desktop: Space (straight); Z/X or ←/→ (paddle).

## Learning method — Koch
Letters introduced one at a time in Koch order, full character speed, Farnsworth
spacing. A letter unlocks the next once mastered (≥90% over enough reps).

## Adaptive difficulty
Per-letter weakness score (accuracy + streak). Games/practice weight spawns
toward weak letters via `progress.weightedPick()`.

## Files
```
www/index.html
www/manifest.webmanifest  PWA manifest
www/sw.js                 service worker (offline cache; bump CACHE ver on release)
www/icons/                app/PWA icons (PIL-generated; 1024 = Capacitor source)
www/css/styles.css
www/js/morse.js     dictionary + Koch order
www/js/audio.js     Web Audio tone engine + haptics (native Capacitor / web fallback)
www/js/config.js    settings + localStorage
www/js/progress.js  skill model + persistence + mastery rules
www/js/keyer.js     input decode (straight/paddle) -> letters
www/js/main.js      screen routing, drill modes, config UI
www/js/games/       invaders.js, falling.js, rhythm.js  (Phase 3-5)
```
