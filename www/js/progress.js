window.MT = window.MT || {};

// Skill model: per-letter stats, adaptive weighting, per-order unlocking.
MT.progress = (function () {
  const KEY = 'mt_prog';

  function fresh() {
    return { unlockedBy: { koch: 2, alpha: 2, random: 2, easy: 2 }, randomOrder: null, letters: {} };
  }

  function load() {
    let d;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
    if (!d) return fresh();
    // Migrate old shape: { unlocked: N, letters }.
    if (!d.unlockedBy) {
      const n = typeof d.unlocked === 'number' ? d.unlocked : 2;
      d.unlockedBy = { koch: n, alpha: 2, random: 2, easy: 2 };
    }
    if (!d.letters) d.letters = {};
    if (!('randomOrder' in d)) d.randomOrder = null;
    return d;
  }

  let data = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  // ---- Learning order (driven by config.learnOrder) ----
  function orderName() { return MT.config.get().learnOrder || 'koch'; }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function orderArray() {
    const n = orderName();
    if (n === 'random') {
      if (!data.randomOrder) { data.randomOrder = shuffle(MT.morse.ORDERS.koch); save(); }
      return data.randomOrder;
    }
    return MT.morse.ORDERS[n] || MT.morse.ORDERS.koch;
  }

  function reshuffleRandom() { data.randomOrder = shuffle(MT.morse.ORDERS.koch); data.unlockedBy.random = 2; save(); }

  function unlockedCount() {
    const n = orderName();
    if (!data.unlockedBy) data.unlockedBy = {};
    if (data.unlockedBy[n] == null) data.unlockedBy[n] = 2;
    return data.unlockedBy[n];
  }
  function setUnlocked(v) { data.unlockedBy[orderName()] = v; save(); }

  // ---- Per-letter stats (shared across all orders) ----
  function stat(ch) {
    if (!data.letters[ch]) data.letters[ch] = { seen: 0, correct: 0, streak: 0 };
    return data.letters[ch];
  }

  function record(ch, ok) {
    const s = stat(ch);
    s.seen += 1;
    if (ok) { s.correct += 1; s.streak += 1; } else { s.streak = 0; }
    save();
  }

  function accuracy(ch) {
    const s = stat(ch);
    return s.seen ? s.correct / s.seen : 0;
  }

  function weakness(ch) {
    const s = stat(ch);
    if (s.seen < 3) return 1.2;
    return (1 - accuracy(ch)) + 0.1;
  }

  function isMastered(ch) {
    const s = stat(ch);
    const c = MT.config.get();
    if ((c.masteryMode || 'count') === 'percent') {
      return s.seen >= 5 && accuracy(ch) >= ((c.masteryPercent || 90) / 100);
    }
    return s.correct >= (c.masteryCount || 3);
  }

  function activeLetters() {
    return orderArray().slice(0, Math.max(2, unlockedCount()));
  }

  // Unlock the next letter in the current order once all active ones are mastered.
  function maybeUnlock() {
    const arr = orderArray();
    const cnt = unlockedCount();
    if (activeLetters().every(isMastered) && cnt < arr.length) {
      setUnlocked(cnt + 1);
      return arr[cnt]; // newly unlocked (0-indexed)
    }
    return null;
  }

  function weightedPick() {
    const active = activeLetters();
    const w = active.map(weakness);
    const total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < active.length; i++) {
      r -= w[i];
      if (r <= 0) return active[i];
    }
    return active[active.length - 1];
  }

  return {
    get data() { return data; },
    save, record, accuracy, weakness, isMastered,
    orderName, orderArray, reshuffleRandom, unlockedCount,
    activeLetters, maybeUnlock, weightedPick,
    reset: () => { data = fresh(); save(); }
  };
})();
