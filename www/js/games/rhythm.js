window.MT = window.MT || {};
MT.games = MT.games || {};

// Guitar Hero: dots & dashes scroll right→left toward the hit line. Key each
// element (dot/dash) as it crosses the line. Timing builds a combo multiplier.
// Endless — leave via the Back button. Uses learned letters as the "song".
MT.games.rhythm = {
  start(api) {
    const { canvas, ctx, w: W, h: H } = api;
    const hitX = 66;
    const speed = 130; // px/s
    const laneY = H / 2;
    let notes = [], queue = [];
    let score = 0, combo = 0, best = 0, running = true, raf = 0;
    let last = performance.now(), genTimer = 0, genEvery = 0.62, flash = 0, flashColor = '#38d39f';

    // rhythm cares about raw elements, not decoded letters.
    const keyer = api.makeKeyer({ onElement: (el) => press(el) });

    function refill() {
      const ch = api.pick();
      for (const el of api.morse.encode(ch)) queue.push(el);
      queue.push(' '); // rest between letters
    }
    function spawn() {
      if (!queue.length) refill();
      const el = queue.shift();
      if (el === ' ') { notes.push({ rest: true, x: W + 10 }); return; }
      notes.push({ el, x: W + 10, judged: false, hitAt: 0 });
    }

    function press(el) {
      let target = null, bd = 1e9;
      for (const n of notes) {
        if (n.rest || n.judged) continue;
        const d = Math.abs(n.x - hitX);
        if (d < bd) { bd = d; target = n; }
      }
      if (target && bd < 46 && target.el === el) {
        target.judged = true; target.hitAt = 0.25;
        combo += 1; best = Math.max(best, combo);
        score += 10 * (1 + Math.floor(combo / 5));
        api.setScore(score);
        flash = 0.15; flashColor = '#38d39f';
      } else {
        combo = 0; flash = 0.2; flashColor = '#ff5d5d';
        if (target && bd < 46) target.judged = true;
      }
    }

    function step(dt) {
      genTimer += dt;
      if (genTimer >= genEvery) { genTimer = 0; spawn(); }
      for (const n of notes) n.x -= speed * dt;
      for (const n of notes.slice()) {
        if (!n.rest && !n.judged && n.x < hitX - 46) { n.judged = true; combo = 0; }
        if (n.hitAt > 0) n.hitAt = Math.max(0, n.hitAt - dt);
        if (n.x < -30) notes = notes.filter((x) => x !== n);
      }
      if (flash > 0) flash = Math.max(0, flash - dt);
    }

    function draw() {
      api.drawBg();
      // hit line
      ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hitX, laneY - 46); ctx.lineTo(hitX, laneY + 46); ctx.stroke();
      ctx.strokeStyle = 'rgba(74,163,255,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, laneY); ctx.lineTo(W, laneY); ctx.stroke();
      // notes
      notes.forEach((n) => {
        if (n.rest) return;
        const near = Math.abs(n.x - hitX) < 46;
        ctx.fillStyle = n.judged ? (n.hitAt > 0 ? '#38d39f' : '#3a4250') : (near ? '#e6edf3' : '#8b98a9');
        if (n.el === '.') {
          ctx.beginPath(); ctx.arc(n.x, laneY, 13, 0, Math.PI * 2); ctx.fill();
        } else {
          api.roundRect(n.x - 22, laneY - 11, 44, 22, 8); ctx.fill();
        }
      });
      // HUD
      ctx.fillStyle = '#8b98a9'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('Best x' + best, 10, 18);
      ctx.textAlign = 'right'; ctx.fillText('Combo x' + combo, W - 10, 18);
      ctx.textAlign = 'center'; ctx.fillStyle = '#8b98a9'; ctx.font = '12px system-ui';
      ctx.fillText('key each dot/dash as it hits the line', W / 2, H - 12);
      if (flash > 0) {
        ctx.fillStyle = (flashColor === '#38d39f' ? 'rgba(56,211,159,' : 'rgba(255,93,93,') + flash + ')';
        ctx.fillRect(0, 0, W, H);
      }
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); draw();
      raf = requestAnimationFrame(frame);
    }

    last = performance.now();
    raf = requestAnimationFrame(frame);

    return {
      stop() { running = false; cancelAnimationFrame(raf); keyer.clear(); }
    };
  }
};
