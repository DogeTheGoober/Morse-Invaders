window.MT = window.MT || {};

// Web Audio tone engine: continuous tone (for keying), fixed beeps, and
// scheduled playback of a full dot/dash pattern.
MT.audio = (function () {
  let ctx;

  function C() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function dotMs() { return 1200 / MT.config.get().wpm; }

  function osc(c) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = MT.config.get().tone;
    o.connect(g);
    g.connect(c.destination);
    return { o, g };
  }

  // Start a tone that plays until the returned stop() is called.
  function startTone() {
    const c = C();
    const { o, g } = osc(c);
    const v = MT.config.get().volume;
    const t = c.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    o.start(t);
    return function stop() {
      const tt = c.currentTime;
      g.gain.cancelScheduledValues(tt);
      g.gain.setValueAtTime(g.gain.value, tt);
      g.gain.linearRampToValueAtTime(0, tt + 0.006);
      o.stop(tt + 0.03);
    };
  }

  // Play a single element ('.' or '-') at its correct length.
  function beep(el) { toneFor((el === '-' ? 3 : 1) * dotMs()); }

  function toneFor(ms) {
    const c = C();
    const { o, g } = osc(c);
    const v = MT.config.get().volume;
    const t = c.currentTime;
    const dur = ms / 1000;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.setValueAtTime(v, t + dur - 0.006);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  // ---- Haptics ----
  // Native Capacitor Haptics when packaged as an app (works on iOS + Android);
  // falls back to the Web Vibration API in browsers (Android web only — iOS Safari
  // has no Web Vibration API).
  function nativeHaptics() {
    return (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics)
      ? window.Capacitor.Plugins.Haptics : null;
  }
  function webVibrate() { return (typeof navigator !== 'undefined' && navigator.vibrate) ? navigator.vibrate.bind(navigator) : null; }
  function canVibrate() { return MT.config.get().vibrate && (nativeHaptics() || webVibrate()); }

  // Buzz a single element ('.' or '-') for its correct length.
  function vibrateElement(el) {
    if (!canVibrate()) return;
    const ms = Math.round((el === '-' ? 3 : 1) * dotMs());
    const h = nativeHaptics();
    if (h) h.vibrate({ duration: ms }); else webVibrate()(ms);
  }

  // Buzz a whole pattern in sync with playback.
  function vibratePattern(pattern) {
    if (!canVibrate()) return;
    const u = dotMs();
    const h = nativeHaptics();
    if (!h) {
      // Web: single on/off array [dot|dash, gap, ...].
      const arr = [];
      for (let i = 0; i < pattern.length; i++) {
        arr.push(Math.round((pattern[i] === '-' ? 3 : 1) * u));
        if (i < pattern.length - 1) arr.push(Math.round(u));
      }
      webVibrate()(arr);
      return;
    }
    // Native: schedule one buzz per element (no pattern-array API).
    let t = 0;
    for (let i = 0; i < pattern.length; i++) {
      const on = (pattern[i] === '-' ? 3 : 1) * u;
      const at = t;
      setTimeout(() => h.vibrate({ duration: Math.round(on) }), at);
      t += on + u;
    }
  }

  // Schedule a whole pattern (e.g. '-.-'); cb fires when finished.
  function playPattern(pattern, cb) {
    vibratePattern(pattern);
    const c = C();
    const dot = dotMs() / 1000;
    const v = MT.config.get().volume;
    let t = c.currentTime + 0.05;
    for (const el of pattern) {
      const len = (el === '-' ? 3 : 1) * dot;
      const { o, g } = osc(c);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.006);
      g.gain.setValueAtTime(v, t + len - 0.006);
      g.gain.linearRampToValueAtTime(0, t + len);
      o.start(t);
      o.stop(t + len + 0.03);
      t += len + dot; // intra-character gap
    }
    const totalMs = (t - c.currentTime) * 1000;
    if (cb) setTimeout(cb, totalMs + 40);
    return totalMs;
  }

  return { startTone, beep, playPattern, vibrateElement, vibratePattern, resume: () => C() };
})();
