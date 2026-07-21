window.MT = window.MT || {};

// User settings, persisted to localStorage.
MT.config = (function () {
  const KEY = 'mt_cfg';
  const DEFAULTS = {
    wpm: 20,          // character speed (element timing): dot = 1200/wpm ms
    farnsworth: 12,   // effective speed for gaps between chars/words
    tone: 600,        // Hz
    volume: 0.4,      // 0..1
    input: 'straight',// 'straight' | 'paddle'
    dotThreshold: 150,// ms: press shorter than this = dot, longer = dash
    commitGap: 500,   // ms: wait after last tap before locking in the letter (raise for slower pace)
    theme: 'dark',    // preset id (see themes.js) or 'custom'
    customTheme: { bg: '#0e1116', fg: '#e6edf3', accent: '#38d39f' },
    bgDim: 0.45,      // 0..0.9 overlay tint over a custom background image (higher = darker/more readable)
    bgBlur: 0,        // 0..20 px blur applied to the background image
    vibrate: false,   // haptic feedback: buzz dots/dashes (Android only; iOS has no Web Vibration API)
    showHints: true,  // show the target letter / pattern as a hint
    learnOrder: 'koch',// 'koch' | 'alpha' | 'random' | 'easy'
    rangeFrom: null,  // Practice/Hard: first letter of the drill range (alphabetical)
    rangeTo: null,    // Practice/Hard: last letter of the drill range
    pickMode: 'random',// 'random' (adaptive, weak-letter weighted) | 'sequential' (A→Z through range)
    learnStyle: 'normal',// Learn mode style: 'normal' (hear→key) | 'see' (see→key) | 'hard' (hear→tap)
    masteryMode: 'count',// 'count' (N correct) | 'percent' (X% accuracy) to unlock next letter
    masteryCount: 3,   // correct answers needed (count mode)
    masteryPercent: 90 // accuracy % needed over ≥5 tries (percent mode)
  };

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
      const merged = Object.assign({}, DEFAULTS, stored);
      // Migrate old boolean learnSeeKey -> learnStyle.
      if (stored.learnSeeKey && !stored.learnStyle) merged.learnStyle = 'see';
      delete merged.learnSeeKey;
      return merged;
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  let cfg = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  return {
    get: () => cfg,
    set: (k, v) => { cfg[k] = v; save(); },
    reset: () => { cfg = Object.assign({}, DEFAULTS); save(); },
    DEFAULTS
  };
})();
