# Morse Invaders

A mobile-first **Morse code tutor** with adaptive learning and four arcade games.
Learn the code the way real operators do (Koch method), then drill your weak
letters by blasting them out of the sky. Runs as a web app, an installable PWA,
or a native iOS/Android app — all from one codebase.

## Features

**Learn & practice**
- **Koch method** — new letters one at a time; the next unlocks once you've
  mastered the current set (configurable: *N times correct* or *X% accuracy*).
- **Learning orders** — Koch, A–Z, Random, or Easy→Hard (progress tracked per order).
- **Five modes** — Learn, Practice (adaptive), Hard (hear → tap the letter),
  See→Key (see letter → key its code, with an alphabet-chart intro), and Echo
  (hear → key it back). Learn can adopt the See→Key or Hard style.
- **Adaptive** — a per-letter weakness model weights everything toward the
  letters you struggle with.
- **Range selector** — drill any alphabetical A–Z span; Random or Sequential order.

**Games** (all keyed in Morse, drawing from the letters you've learned)
- **Space Invaders** — key an invader's letter to blast it; defend 3 pylons.
- **Falling Letters** — each drop plays its Morse; key it before it lands.
- **Guitar Hero** — key dots & dashes on the beat for combo multipliers.
- **Missile Command** — intercept incoming missiles; defend 4 cities.

**Input & feel**
- **On-screen key** — one-button straight key (tap = dot, hold = dash) or
  two-button paddle. Adjustable dot/dash threshold and "input spacing" for a
  slower, forgiving pace. Keyboard fallback on desktop (Space, or Z/X).
- **Web Audio** tone engine (adjustable WPM, tone, volume).
- **Vibrate mode** — feel the dots & dashes (native haptics on device).

**Theming**
- 6 presets (Dark, Light, **Claude**, Terminal, Amber, Ocean) + a build-your-own
  custom theme (background / text / accent).
- **Custom background image** upload with dim + blur controls; the games show it too.

## Install

### iOS (.ipa, sideload)
1. **Actions** tab → **Build iOS IPA (unsigned)** → open the latest run.
2. Download the **MorseInvaders-ipa** artifact, unzip → `MorseInvaders-unsigned.ipa`.
3. Sideload with [Sideloadly](https://sideloadly.io) / AltStore using your Apple ID.
   (Free Apple ID = re-install every ~7 days.)

### Android (APK)
1. **Actions** tab → **Build Android APK** → open the latest run.
2. Download the **MorseInvaders-apk** artifact, unzip → `app-debug.apk`.
3. Copy to your phone and install (enable "install unknown apps").

### PWA (no build)
Serve `www/` over HTTPS and use your browser's **Add to Home Screen** — fullscreen
+ offline, works on iOS and Android.

## Run locally

```bash
python serve.py        # threaded no-cache dev server on http://localhost:8778 (serves www/)
# or:  python -m http.server --directory www 8778
```

No build step for the web app — it's vanilla JS.

## Tech

- **Web app:** vanilla JS (`window.MT` namespace, classic scripts — no bundler),
  HTML5 Canvas (games), Web Audio API, `localStorage`.
- **Packaging:** [Capacitor](https://capacitorjs.com) for iOS/Android; PWA
  manifest + service worker for install/offline.
- **CI:** GitHub Actions build the iOS `.ipa` (macOS runner) and Android APK
  (Linux runner) on every push to `main`.

## Structure

```
www/                 the web app
  index.html
  css/styles.css
  js/                morse, audio, config, themes, progress, keyer, main
  js/games/          invaders, falling, rhythm, missile
capacitor.config.json, package.json
serve.py             no-cache dev server
.github/workflows/   ios.yml, android.yml
```

Built with [Claude Code](https://claude.com/claude-code).
