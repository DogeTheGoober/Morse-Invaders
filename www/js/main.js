(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = MT.config;
  const prog = MT.progress;

  // ---------- Screen routing ----------
  const TITLES = {
    menu: 'Morse Invaders', learn: 'Learn', practice: 'Practice', hard: 'Hard Mode',
    see: 'See → Key', echo: 'Echo',
    stats: 'Stats', config: 'Settings',
    'game-invaders': 'Space Invaders', 'game-falling': 'Falling Letters',
    'game-rhythm': 'Guitar Hero', 'game-missile': 'Missile Command'
  };

  // Drill mode table. prompt: hear=play audio, showLetter/showPattern: true |
  // false | 'hint' (only when Settings hints are on). respond: 'key' (Morse
  // keypad) or 'tap' (letter grid). gated: advances Koch unlock on mastery.
  const SPEC = {
    learn:    { label: 'Learn',    hear: true,  showLetter: true,   showPattern: true,   respond: 'key', gated: true, sub: 'Listen, then key it back' },
    practice: { label: 'Practice', hear: true,  showLetter: 'hint', showPattern: 'hint', respond: 'key', sub: 'Key the letter you hear' },
    hard:     { label: 'Hard',     hear: true,  showLetter: false,  showPattern: false,  respond: 'tap', sub: 'Listen — tap the letter you hear' },
    see:      { label: 'See→Key',  hear: false, showLetter: true,   showPattern: false,  respond: 'key', intro: true, sub: 'Key this letter in Morse' },
    echo:     { label: 'Echo',     hear: true,  showLetter: false,  showPattern: false,  respond: 'key', sub: 'Hear it, then key it back' }
  };
  const pretty = (p) => p.replace(/\./g, '·').replace(/-/g, '–');
  let current = 'menu';
  let activeDrill = null;

  function show(screenId) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(screenId).classList.add('active');
  }

  function go(where) {
    if (activeDrill) { activeDrill.stop(); activeDrill = null; }
    current = where;
    $('title').textContent = TITLES[where] || 'Morse Invaders';
    $('backBtn').style.display = where === 'menu' ? 'none' : '';
    updateUnlockedInfo();

    if (where === 'menu') { show('screen-menu'); return; }
    if (where === 'learn') { show('screen-drill'); startDrill('learn'); return; }
    if (where === 'practice') { show('screen-drill'); startDrill('practice'); return; }
    if (where === 'hard') { show('screen-drill'); startDrill('hard'); return; }
    if (where === 'see') { show('screen-drill'); startDrill('see'); return; }
    if (where === 'echo') { show('screen-drill'); startDrill('echo'); return; }
    if (where === 'stats') { show('screen-stats'); renderStats(); return; }
    if (where === 'config') { show('screen-config'); renderConfig(); return; }
    if (where.startsWith('game-')) { show('screen-game'); startGame(where.slice(5)); return; }
  }

  function updateUnlockedInfo() {
    const total = prog.orderArray().length;
    const label = MT.morse.ORDER_LABELS[prog.orderName()] || 'Koch';
    $('unlockedInfo').textContent = label + ' ' + prog.unlockedCount() + '/' + total;
  }

  document.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => { MT.audio.resume(); go(b.dataset.go); }));
  $('backBtn').addEventListener('click', () => go('menu'));

  // ---------- Keypad (shared builder) ----------
  // Builds buttons into a container and wires them to a keyer.
  function buildKeypad(container, keyer) {
    container.innerHTML = '';
    const mode = cfg.get().input;
    if (mode === 'straight') {
      const b = document.createElement('button');
      b.className = 'key-btn wide';
      b.textContent = 'TAP = dot · HOLD = dash';
      bindHold(b, keyer.keyDown, keyer.keyUp);
      container.appendChild(b);
    } else {
      const dot = document.createElement('button');
      dot.className = 'key-btn'; dot.textContent = '· dot';
      bindTap(dot, keyer.dot);
      const dash = document.createElement('button');
      dash.className = 'key-btn dash'; dash.textContent = '– dash';
      bindTap(dash, keyer.dash);
      container.appendChild(dot); container.appendChild(dash);
    }
  }

  function bindHold(el, down, up) {
    let active = false;
    const start = (e) => { e.preventDefault(); if (active) return; active = true; down(); };
    const end = (e) => { e.preventDefault(); if (!active) return; active = false; up(); };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('pointercancel', end);
  }
  function bindTap(el, fn) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  }

  // Keyboard fallback (desktop).
  let kbKeyer = null;
  let spaceDown = false;
  window.addEventListener('keydown', (e) => {
    if (!kbKeyer) return;
    if (cfg.get().input === 'straight') {
      if (e.code === 'Space' && !spaceDown) { e.preventDefault(); spaceDown = true; kbKeyer.keyDown(); }
    } else {
      if (e.code === 'KeyZ' || e.code === 'ArrowLeft') { e.preventDefault(); kbKeyer.dot(); }
      if (e.code === 'KeyX' || e.code === 'ArrowRight') { e.preventDefault(); kbKeyer.dash(); }
    }
  });
  window.addEventListener('keyup', (e) => {
    if (!kbKeyer) return;
    if (cfg.get().input === 'straight' && e.code === 'Space') { e.preventDefault(); spaceDown = false; kbKeyer.keyUp(); }
  });

  // ---------- Learn / Practice drill ----------
  function setupOrderPicker(mode) {
    const seg = $('orderSeg');
    const reshuffle = $('reshuffleBtn');
    if (mode !== 'learn') { seg.style.display = 'none'; reshuffle.style.display = 'none'; return; }
    seg.style.display = '';
    const cur = prog.orderName();
    seg.querySelectorAll('.seg').forEach((el) =>
      el.classList.toggle('on', el.dataset.order === cur));
    reshuffle.style.display = cur === 'random' ? '' : 'none';
    seg.querySelectorAll('.seg').forEach((el) => {
      el.onclick = () => {
        cfg.set('learnOrder', el.dataset.order);
        updateUnlockedInfo();
        startDrill('learn'); // restart with the new order
      };
    });
    reshuffle.onclick = () => { prog.reshuffleRandom(); updateUnlockedInfo(); startDrill('learn'); };
  }

  // Range picker (Practice + Hard): choose any From→To slice of the current order,
  // including letters past where Koch has unlocked (for the "already familiar" case).
  let rangeChanged = null;
  function setupRangeBar(mode) {
    const bar = $('rangeBar');
    if (mode === 'learn') { bar.style.display = 'none'; return; }
    bar.style.display = '';
    const alpha = MT.morse.ORDERS.alpha; // fixed A–Z … 0–9 … punctuation order
    const idx = (ch) => alpha.indexOf(ch);
    const fromSel = $('rangeFrom'), toSel = $('rangeTo');
    const opts = alpha.map((ch) => '<option value="' + ch + '">' + ch + '  ' + pretty(MT.morse.encode(ch)) + '</option>').join('');
    fromSel.innerHTML = opts; toSel.innerHTML = opts;
    // Default range is the full alphabet A–Z; user narrows it to what they know.
    const c = cfg.get();
    const fromVal = idx(c.rangeFrom) >= 0 ? c.rangeFrom : 'A';
    const toVal = idx(c.rangeTo) >= 0 ? c.rangeTo : 'Z';
    fromSel.value = fromVal; toSel.value = toVal;
    cfg.set('rangeFrom', fromVal); cfg.set('rangeTo', toVal);
    fromSel.onchange = () => {
      cfg.set('rangeFrom', fromSel.value);
      if (idx(toSel.value) < idx(fromSel.value)) { toSel.value = fromSel.value; cfg.set('rangeTo', toSel.value); }
      if (rangeChanged) rangeChanged();
    };
    toSel.onchange = () => {
      cfg.set('rangeTo', toSel.value);
      if (idx(toSel.value) < idx(fromSel.value)) { fromSel.value = toSel.value; cfg.set('rangeFrom', fromSel.value); }
      if (rangeChanged) rangeChanged();
    };
  }

  function startDrill(mode) {
    let spec = SPEC[mode] || SPEC.practice;
    // Learn style overlay: Learn keeps its A–Z progression + unlock gating, but can
    // adopt See→Key (see letter, key code) or Hard (hear, tap letter) presentation.
    if (mode === 'learn') {
      const style = cfg.get().learnStyle || 'normal';
      if (style === 'see') {
        spec = Object.assign({}, spec, { hear: false, showPattern: false, intro: true, sub: 'Key this letter in Morse' });
      } else if (style === 'hard') {
        spec = Object.assign({}, spec, { showLetter: false, showPattern: false, respond: 'tap', intro: true, sub: 'Listen — tap the letter you hear' });
      }
    }
    const isTap = spec.respond === 'tap';
    $('drillMode').textContent = spec.label;
    setupOrderPicker(mode);
    setupRangeBar(mode);

    // Toggle between the intro (alphabet chart) and the playing UI. tap modes
    // use the letter grid; key modes use the Morse keypad + live buffer.
    function showPlaying(on) {
      $('drillIntro').style.display = on ? 'none' : '';
      $('promptCard').style.display = on ? '' : 'none';
      $('replayRow').style.display = on ? '' : 'none';
      $('keypad').style.display = (on && !isTap) ? '' : 'none';
      $('liveBuffer').style.display = (on && !isTap) ? '' : 'none';
      $('alphaGrid').style.display = (on && isTap) ? '' : 'none';
    }

    let score = 0, streak = 0, target = null, awaiting = false;

    const keyer = MT.makeKeyer({
      onElement: (el, buf) => { $('liveBuffer').textContent = pretty(buf); },
      onLetter: (letter) => { check(letter); }
    });
    kbKeyer = isTap ? null : keyer; // keyboard fallback only when keying
    if (!isTap) buildKeypad($('keypad'), keyer);

    function drillPool() {
      if (mode === 'learn') return prog.activeLetters();
      const alpha = MT.morse.ORDERS.alpha; // range is alphabetical, independent of learning order
      const c = cfg.get();
      let fi = alpha.indexOf(c.rangeFrom);
      let ti = alpha.indexOf(c.rangeTo);
      if (fi < 0) fi = 0;
      if (ti < 0) ti = alpha.length - 1;
      if (ti < fi) ti = fi;
      return alpha.slice(fi, ti + 1);
    }

    let lastTarget = null, seqIndex = 0;
    function pickOnce() {
      const pool = drillPool();
      if (mode === 'learn' && (pool.length < 2 || Math.random() < 0.5)) return pool[pool.length - 1];
      const w = pool.map(prog.weakness);
      const total = w.reduce((a, b) => a + b, 0) || 1;
      let r = Math.random() * total;
      for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
      return pool[pool.length - 1];
    }
    function pickTarget() {
      const pool = drillPool();
      // Sequential order (A→Z through the range) for non-learn modes when chosen.
      if (mode !== 'learn' && cfg.get().pickMode === 'sequential') {
        if (seqIndex >= pool.length) seqIndex = 0;
        const choice = pool[seqIndex];
        seqIndex += 1;
        lastTarget = choice;
        return choice;
      }
      let choice = pickOnce();
      for (let i = 0; i < 8 && pool.length > 1 && choice === lastTarget; i++) choice = pickOnce();
      lastTarget = choice;
      return choice;
    }

    function setupSeq() {
      const seg = $('seqSeg');
      if (mode === 'learn') { seg.style.display = 'none'; return; }
      seg.style.display = '';
      const cur = cfg.get().pickMode || 'random';
      seg.querySelectorAll('.seg').forEach((el) => {
        el.classList.toggle('on', el.dataset.seq === cur);
        el.onclick = () => {
          cfg.set('pickMode', el.dataset.seq);
          seqIndex = 0;
          setupSeq();
          if ($('drillIntro').style.display === 'none') present(); // refresh target if already drilling
        };
      });
    }

    function buildAlphaGrid() {
      const g = $('alphaGrid');
      g.innerHTML = '';
      drillPool().forEach((ch) => {
        const b = document.createElement('button');
        b.textContent = ch;
        b.addEventListener('click', () => { if (awaiting) check(ch); });
        g.appendChild(b);
      });
    }

    function present() {
      awaiting = true;
      target = pickTarget();
      const pat = MT.morse.encode(target);
      const hintOn = cfg.get().showHints;
      const showLetter = spec.showLetter === true || (spec.showLetter === 'hint' && hintOn);
      const showPattern = spec.showPattern === true || (spec.showPattern === 'hint' && hintOn);
      $('promptLetter').textContent = showLetter ? target : '?';
      $('promptPattern').textContent = showPattern ? pretty(pat) : '';
      $('promptSub').textContent = spec.sub;
      $('drillFeedback').textContent = '';
      $('liveBuffer').textContent = '';
      if (!isTap) keyer.clear();
      if (spec.hear) MT.audio.playPattern(pat);
    }

    function check(letter) {
      if (!awaiting) return;
      awaiting = false;
      const ok = letter === target;
      prog.record(target, ok);
      if (ok) {
        score += 10; streak += 1;
        $('drillFeedback').textContent = '✓ ' + target;
        $('drillFeedback').className = 'feedback good';
      } else {
        streak = 0;
        $('drillFeedback').textContent = '✗ that was ' + target + ' (' + pretty(MT.morse.encode(target)) + ')';
        $('drillFeedback').className = 'feedback bad';
        // In visual (no-audio) modes, play the correct code so a miss still teaches the sound.
        if (!spec.hear) MT.audio.playPattern(MT.morse.encode(target));
      }
      $('drillScore').textContent = score;
      $('drillStreak').textContent = streak;

      if (spec.gated) {
        const unlocked = prog.maybeUnlock();
        if (unlocked) {
          $('drillFeedback').textContent = '🎉 New letter unlocked: ' + unlocked;
          updateUnlockedInfo();
        }
      }
      setTimeout(present, ok ? 700 : 1400);
    }

    function renderIntro() {
      const chart = $('codeChart');
      chart.innerHTML = '';
      drillPool().forEach((ch) => {
        const it = document.createElement('div');
        it.className = 'item';
        it.innerHTML = '<b>' + ch + '</b><span>' + pretty(MT.morse.encode(ch)) + '</span>';
        it.addEventListener('click', () => MT.audio.playPattern(MT.morse.encode(ch)));
        chart.appendChild(it);
      });
    }

    function startPlaying() {
      showPlaying(true);
      if (isTap) buildAlphaGrid();
      present();
    }

    $('replayBtn').onclick = () => { if (target) MT.audio.playPattern(MT.morse.encode(target)); };
    rangeChanged = () => {
      seqIndex = 0;
      if (isTap) buildAlphaGrid();
      if (spec.intro && $('drillIntro').style.display !== 'none') renderIntro();
    };

    setupSeq();
    if (spec.intro) {
      // Show the alphabet chart first; drills start on Continue.
      renderIntro();
      showPlaying(false);
      $('continueBtn').onclick = startPlaying;
    } else {
      startPlaying();
    }
    activeDrill = { stop: () => { keyer.clear(); kbKeyer = null; rangeChanged = null; } };
  }

  // ---------- Game host (shared harness for all three games) ----------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Letters a game draws from: what you've learned (min 5 so it's playable early).
  function gamePool() {
    let p = prog.activeLetters();
    if (p.length < 5) p = MT.morse.KOCH.slice(0, 5);
    return p;
  }
  function gamePick() {
    const p = gamePool();
    const w = p.map(prog.weakness);
    const total = w.reduce((a, b) => a + b, 0) || 1;
    let r = Math.random() * total;
    for (let i = 0; i < p.length; i++) { r -= w[i]; if (r <= 0) return p[i]; }
    return p[p.length - 1];
  }

  function startGame(which) {
    const canvas = $('gameCanvas');
    $('gameName').textContent = TITLES['game-' + which];
    $('gameScore').textContent = '0';
    $('gameBuffer').textContent = '';
    $('gameKeypad').innerHTML = '';
    MT.audio.resume();

    // Size the canvas to its box, crisp on high-DPI.
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth || 320;
    const ch = canvas.clientHeight || 400;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Preload the custom background image (if any) so games can show it too.
    let bgImg = null;
    const bgData = MT.bg.data();
    if (bgData) { bgImg = new Image(); bgImg.src = bgData; }

    let keyerRef = null;
    const api = {
      canvas, ctx, w: cw, h: ch,
      audio: MT.audio, morse: MT.morse, cfg: MT.config,
      pretty, roundRect: (x, y, w, h, r) => roundRect(ctx, x, y, w, h, r),
      pool: gamePool,
      pick: gamePick,
      record: (chr, ok) => prog.record(chr, ok),
      setScore: (n) => { $('gameScore').textContent = n; },
      showBuffer: (t) => { $('gameBuffer').textContent = t; },
      // Paint the game backdrop: the custom image (cover + dim for readability)
      // if one is set, otherwise the solid arcade colour.
      drawBg: () => {
        if (bgImg && bgImg.complete && bgImg.naturalWidth) {
          const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
          const s = Math.max(cw / iw, ch / ih);
          const dw = iw * s, dh = ih * s;
          ctx.drawImage(bgImg, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
          const dim = Math.max(0.4, (typeof cfg.get().bgDim === 'number' ? cfg.get().bgDim : 0.45));
          ctx.fillStyle = 'rgba(5,7,11,' + dim + ')';
          ctx.fillRect(0, 0, cw, ch);
        } else {
          ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, cw, ch);
        }
      },
      makeKeyer: (handlers) => {
        const k = MT.makeKeyer(handlers);
        keyerRef = k;
        buildKeypad($('gameKeypad'), k);
        kbKeyer = k;
        return k;
      },
      exit: () => go('menu')
    };

    const game = MT.games && MT.games[which];
    let handle = null;
    if (game) {
      handle = game.start(api);
    } else {
      ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#8b98a9'; ctx.font = '16px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Game not found: ' + which, cw / 2, ch / 2);
    }

    activeDrill = {
      stop: () => {
        if (handle && handle.stop) handle.stop();
        if (keyerRef) keyerRef.clear();
        kbKeyer = null;
        $('gameKeypad').innerHTML = '';
      }
    };
  }

  // ---------- Stats ----------
  function renderStats() {
    const order = prog.orderArray();
    const unlocked = prog.unlockedCount();
    const label = MT.morse.ORDER_LABELS[prog.orderName()] || 'Koch';
    $('statsSummary').textContent =
      label + ' order — unlocked ' + unlocked + ' of ' + order.length + ' letters. ' +
      'Green = strong, red = needs work.';
    const heat = $('heat');
    heat.innerHTML = '';
    order.forEach((ch, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const unlocked = i < prog.unlockedCount();
      if (!unlocked) cell.classList.add('locked');
      cell.textContent = ch;
      const s = prog.data.letters[ch];
      if (unlocked && s && s.seen) {
        const acc = prog.accuracy(ch);
        const hue = Math.round(acc * 130); // 0=red -> 130=green
        cell.style.background = 'hsl(' + hue + ',55%,32%)';
        const small = document.createElement('small');
        small.textContent = Math.round(acc * 100) + '%';
        cell.appendChild(small);
      }
      heat.appendChild(cell);
    });
  }
  $('resetProgress').addEventListener('click', () => {
    if (confirm('Reset all learning progress? This cannot be undone.')) {
      prog.reset(); updateUnlockedInfo(); renderStats();
    }
  });

  // ---------- Config ----------
  function seg(groupSelector, attr, value) {
    document.querySelectorAll(groupSelector + ' .seg').forEach((el) =>
      el.classList.toggle('on', el.dataset[attr] === value));
  }
  function renderConfig() {
    const c = cfg.get();
    // input
    document.querySelectorAll('#inputSeg .seg').forEach((el) =>
      el.classList.toggle('on', el.dataset.input === c.input));
    $('thresholdRow').style.display = c.input === 'straight' ? '' : 'none';
    $('cfgThreshold').value = c.dotThreshold; $('cfgThresholdVal').textContent = c.dotThreshold + 'ms';
    $('cfgGap').value = c.commitGap; $('cfgGapVal').textContent = (c.commitGap / 1000).toFixed(2) + 's';
    $('cfgWpm').value = c.wpm; $('cfgWpmVal').textContent = c.wpm;
    $('cfgTone').value = c.tone; $('cfgToneVal').textContent = c.tone;
    $('cfgVol').value = c.volume; $('cfgVolVal').textContent = Math.round(c.volume * 100) + '%';
    $('hintsOn').classList.toggle('on', c.showHints);
    $('hintsOff').classList.toggle('on', !c.showHints);
    buildThemeGrid();
    const hasBg = !!MT.bg.data();
    $('bgControls').style.display = hasBg ? '' : 'none';
    $('bgUpload').textContent = hasBg ? 'Replace image' : 'Upload image';
    $('bgDim').value = c.bgDim; $('bgDimVal').textContent = Math.round(c.bgDim * 100) + '%';
    $('bgBlur').value = c.bgBlur; $('bgBlurVal').textContent = (c.bgBlur || 0) + 'px';
    $('cfgVibrate').checked = !!c.vibrate;
    const lStyle = c.learnStyle || 'normal';
    document.querySelectorAll('#learnStyleSeg .seg').forEach((el) => el.classList.toggle('on', el.dataset.style === lStyle));
    $('learnStyleHint').textContent = {
      normal: 'Hear the code and key it back (shows letter + pattern).',
      see: 'See the letter and key its code — no audio prompt. Chart intro first.',
      hard: 'Hear the code and tap the letter — no hints. Chart intro first.'
    }[lStyle];
    const mMode = c.masteryMode || 'count';
    document.querySelectorAll('#masterySeg .seg').forEach((el) => el.classList.toggle('on', el.dataset.mastery === mMode));
    $('masteryCountRow').style.display = mMode === 'count' ? '' : 'none';
    $('masteryPercentRow').style.display = mMode === 'percent' ? '' : 'none';
    $('cfgMasteryCount').value = c.masteryCount; $('cfgMasteryCountVal').textContent = c.masteryCount + '×';
    $('cfgMasteryPercent').value = c.masteryPercent; $('cfgMasteryPercentVal').textContent = c.masteryPercent + '%';
  }

  document.querySelectorAll('#inputSeg .seg').forEach((el) =>
    el.addEventListener('click', () => { cfg.set('input', el.dataset.input); renderConfig(); }));
  $('cfgThreshold').addEventListener('input', (e) => { cfg.set('dotThreshold', +e.target.value); $('cfgThresholdVal').textContent = e.target.value + 'ms'; });
  $('cfgGap').addEventListener('input', (e) => { cfg.set('commitGap', +e.target.value); $('cfgGapVal').textContent = (e.target.value / 1000).toFixed(2) + 's'; });
  $('cfgWpm').addEventListener('input', (e) => { cfg.set('wpm', +e.target.value); $('cfgWpmVal').textContent = e.target.value; });
  $('cfgTone').addEventListener('input', (e) => { cfg.set('tone', +e.target.value); $('cfgToneVal').textContent = e.target.value; });
  $('cfgVol').addEventListener('input', (e) => { cfg.set('volume', +e.target.value); $('cfgVolVal').textContent = Math.round(e.target.value * 100) + '%'; });
  $('hintsOn').addEventListener('click', () => { cfg.set('showHints', true); renderConfig(); });
  $('hintsOff').addEventListener('click', () => { cfg.set('showHints', false); renderConfig(); });
  function onCustomColor() {
    cfg.set('customTheme', { bg: $('customBg').value, fg: $('customFg').value, accent: $('customAccent').value });
    cfg.set('theme', 'custom');
    applyTheme();
    buildThemeGrid();
  }
  ['customBg', 'customFg', 'customAccent'].forEach((id) => $(id).addEventListener('input', onCustomColor));

  // Background image upload (downscale to keep it within storage limits).
  function loadBgImage(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const im = new Image();
      im.onload = () => {
        const max = 1280;
        let w = im.width, h = im.height;
        const scale = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        const dataUrl = cv.toDataURL('image/jpeg', 0.82);
        if (!MT.bg.save(dataUrl)) { alert('That image is too large to store. Try a smaller one.'); return; }
        MT.applyBg(); renderConfig();
      };
      im.onerror = () => alert('Could not read that image file.');
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  $('bgUpload').addEventListener('click', () => $('bgFile').click());
  $('bgFile').addEventListener('change', (e) => { if (e.target.files && e.target.files[0]) loadBgImage(e.target.files[0]); e.target.value = ''; });
  $('bgDim').addEventListener('input', (e) => { cfg.set('bgDim', +e.target.value); $('bgDimVal').textContent = Math.round(e.target.value * 100) + '%'; MT.applyBg(); });
  $('bgBlur').addEventListener('input', (e) => { cfg.set('bgBlur', +e.target.value); $('bgBlurVal').textContent = e.target.value + 'px'; MT.applyBg(); });
  $('bgRemove').addEventListener('click', () => { MT.bg.clear(); MT.applyBg(); renderConfig(); });
  document.querySelectorAll('#learnStyleSeg .seg').forEach((el) =>
    el.addEventListener('click', () => { cfg.set('learnStyle', el.dataset.style); renderConfig(); }));
  document.querySelectorAll('#masterySeg .seg').forEach((el) =>
    el.addEventListener('click', () => { cfg.set('masteryMode', el.dataset.mastery); renderConfig(); }));
  $('cfgMasteryCount').addEventListener('input', (e) => { cfg.set('masteryCount', +e.target.value); $('cfgMasteryCountVal').textContent = e.target.value + '×'; });
  $('cfgMasteryPercent').addEventListener('input', (e) => { cfg.set('masteryPercent', +e.target.value); $('cfgMasteryPercentVal').textContent = e.target.value + '%'; });
  $('cfgVibrate').addEventListener('change', (e) => { cfg.set('vibrate', e.target.checked); });
  $('testTone').addEventListener('click', () => { MT.audio.resume(); MT.audio.playPattern('...---...'); });

  function applyTheme() { MT.applyTheme(); }

  function buildThemeGrid() {
    const grid = $('themeGrid');
    if (!grid) return;
    const cur = cfg.get().theme || 'dark';
    grid.innerHTML = '';
    MT.THEME_META.forEach((m) => {
      const vars = m.id === 'custom' ? MT.deriveCustom(cfg.get().customTheme) : MT.THEMES[m.id];
      const b = document.createElement('button');
      b.className = 'theme-swatch' + (m.id === cur ? ' on' : '');
      b.innerHTML =
        '<div class="prev" style="background:' + vars['--bg'] + ';color:' + vars['--fg'] + '">Aa' +
        '<span class="dot" style="background:' + vars['--accent'] + '"></span></div>' +
        '<div class="name">' + m.name + '</div>';
      b.onclick = () => { cfg.set('theme', m.id); applyTheme(); renderConfig(); };
      grid.appendChild(b);
    });
    $('customThemeRow').style.display = cur === 'custom' ? '' : 'none';
    const ct = cfg.get().customTheme || {};
    $('customBg').value = ct.bg || '#0e1116';
    $('customFg').value = ct.fg || '#e6edf3';
    $('customAccent').value = ct.accent || '#38d39f';
  }

  // ---------- init ----------
  applyTheme();
  updateUnlockedInfo();
  go('menu');
})();
