# Building & sideloading the iOS app (.ipa)

This project is a **Capacitor** wrapper around the web app in `www/`. The `.ipa`
is compiled by a **free GitHub Actions macOS runner** — you don't need a Mac. You
then sign + install it with **Sideloadly** (or AltStore) using your free Apple ID.

> Note: sideloading with a *free* Apple ID means the app must be re-installed every
> ~7 days (the cert expires). Sideloadly/AltStore can automate the refresh.

## One-time: put the project on GitHub
From `C:\Users\Doge\morse-invaders` (Git Bash or PowerShell):

```bash
git init
git add .
git commit -m "Morse Invaders: web app + Capacitor iOS build"
git branch -M main
# Create an empty repo at https://github.com/new (name it morse-invaders), then:
git remote add origin https://github.com/<YOUR_USER>/morse-invaders.git
git push -u origin main
```

The push triggers the **Build iOS IPA (unsigned)** workflow automatically. You can
also run it any time from the repo's **Actions** tab → "Build iOS IPA (unsigned)"
→ **Run workflow**.

## Get the .ipa
1. Open the repo → **Actions** tab → click the latest run.
2. Wait for it to finish (~5–10 min the first time).
3. Under **Artifacts**, download **MorseInvaders-ipa** (a zip containing
   `MorseInvaders-unsigned.ipa`). Unzip it.

## Install on your iPhone (Sideloadly)
1. Install **Sideloadly** on Windows (sideloadly.io) + iTunes/Apple Devices driver.
2. Plug in your iPhone, open Sideloadly.
3. Drag `MorseInvaders-unsigned.ipa` in, enter your Apple ID, click **Start**.
4. On the iPhone: Settings → General → VPN & Device Management → trust your Apple ID.
5. Launch **Morse Invaders**. 🎉 (Native vibration works here, unlike the web version.)

## Updating the app later
Edit files in `www/`, commit, and `git push` → a new `.ipa` builds automatically.
Re-run Sideloadly with the new `.ipa`.

## Android (optional, no Mac needed)
Same repo works for Android. Locally (needs Node + Android Studio):
```bash
npm install
npx cap add android
npx cap sync android
npx cap open android   # build APK from Android Studio
```

## Just want it on your phone with zero build?
The `www/` folder is also a full **PWA**. Host it on any HTTPS static host
(GitHub Pages, Netlify, etc.) and use Safari/Chrome → Share → **Add to Home
Screen**. Fullscreen + offline, no build, no expiry — only downside vs the .ipa
is no vibration on iOS.
