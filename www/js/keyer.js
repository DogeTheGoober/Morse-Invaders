window.MT = window.MT || {};

// Turns raw button/key input into dots, dashes, and committed letters.
// Straight-key mode: one input, tap = dot, hold = dash.
// Paddle mode: separate dot and dash inputs.
//
// handlers: { onElement(el, buffer), onLetter(letter, buffer) }
MT.makeKeyer = function (handlers) {
  handlers = handlers || {};
  let buffer = '';
  let pressStart = 0;
  let toneStop = null;
  let gapTimer = null;

  const cfg = () => MT.config.get();
  const dotMs = () => 1200 / cfg().wpm;

  function scheduleCommit() {
    clearTimeout(gapTimer);
    // User-set "input spacing" governs how long to wait before locking in a
    // letter. Floor at 2 dot-lengths so fast characters don't commit mid-letter.
    const userGap = cfg().commitGap || 500;
    const gap = Math.max(userGap, dotMs() * 2);
    gapTimer = setTimeout(commit, gap);
  }

  function commit() {
    clearTimeout(gapTimer);
    if (!buffer) return;
    const letter = MT.morse.decode(buffer);
    const b = buffer;
    buffer = '';
    if (handlers.onLetter) handlers.onLetter(letter, b);
  }

  function addElement(el) {
    buffer += el;
    MT.audio.vibrateElement(el);
    if (handlers.onElement) handlers.onElement(el, buffer);
    scheduleCommit();
  }

  // ---- Straight key ----
  function keyDown() {
    if (cfg().input !== 'straight') return;
    clearTimeout(gapTimer);
    pressStart = performance.now();
    if (!toneStop) toneStop = MT.audio.startTone();
  }

  function keyUp() {
    if (cfg().input !== 'straight') return;
    if (toneStop) { toneStop(); toneStop = null; }
    const dur = performance.now() - pressStart;
    addElement(dur < cfg().dotThreshold ? '.' : '-');
  }

  // ---- Paddle ----
  function dot() { if (cfg().input === 'paddle') { MT.audio.beep('.'); addElement('.'); } }
  function dash() { if (cfg().input === 'paddle') { MT.audio.beep('-'); addElement('-'); } }

  function clear() { clearTimeout(gapTimer); buffer = ''; if (toneStop) { toneStop(); toneStop = null; } }

  return { keyDown, keyUp, dot, dash, commit, clear, getBuffer: () => buffer };
};
