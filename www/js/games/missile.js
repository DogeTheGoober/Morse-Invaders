window.MT = window.MT || {};
MT.games = MT.games || {};

// Missile Command: enemy missiles streak down at angles toward your cities,
// each tagged with a letter. Key the letter's Morse code to intercept & blow it
// up. Lose when all 4 cities are destroyed.
MT.games.missile = {
  start(api) {
    const { canvas, ctx, w: W, h: H } = api;
    const groundY = H - 30;
    const batteryX = W / 2;
    let cities = [0.15, 0.37, 0.63, 0.85].map((f) => ({ x: W * f, alive: true }));
    let missiles = [], explosions = [], beams = [];
    let score = 0, level = 1, running = true, over = false, raf = 0;
    let last = performance.now(), spawnTimer = 0, spawnEvery = 2.0, flash = 0;

    const keyer = api.makeKeyer({
      onElement: (el, buf) => api.showBuffer(api.pretty(buf)),
      onLetter: (letter) => intercept(letter)
    });

    function spawn() {
      const alive = cities.filter((c) => c.alive);
      if (!alive.length) return;
      const target = alive[Math.floor(Math.random() * alive.length)];
      const sx = 20 + Math.random() * (W - 40), sy = -8;
      const tx = target.x + (Math.random() * 30 - 15), ty = groundY;
      const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1;
      const speed = 34 + level * 6;
      missiles.push({ sx, sy, x: sx, y: sy, vx: (dx / len) * speed, vy: (dy / len) * speed, letter: api.pick() });
    }

    function intercept(letter) {
      api.showBuffer('');
      if (over) return;
      let target = null;
      for (const m of missiles) if (m.letter === letter && (!target || m.y > target.y)) target = m;
      if (target) {
        score += 10; api.setScore(score); api.record(letter, true);
        explosions.push({ x: target.x, y: target.y, age: 0, dur: 0.45, maxR: 30 });
        beams.push({ x1: batteryX, y1: groundY - 12, x2: target.x, y2: target.y, age: 0, dur: 0.16 });
        missiles = missiles.filter((m) => m !== target);
        if (score > 0 && score % 60 === 0) { level += 1; spawnEvery = Math.max(0.75, spawnEvery * 0.88); }
      } else {
        flash = 0.22;
      }
    }

    function step(dt) {
      spawnTimer += dt;
      if (spawnTimer >= spawnEvery) { spawnTimer = 0; spawn(); }
      for (const m of missiles) { m.x += m.vx * dt; m.y += m.vy * dt; }
      for (const m of missiles.slice()) {
        if (m.y >= groundY) {
          missiles = missiles.filter((x) => x !== m);
          let hit = null, best = 1e9;
          for (const c of cities) if (c.alive) { const d = Math.abs(c.x - m.x); if (d < best) { best = d; hit = c; } }
          if (hit && best < 40) { hit.alive = false; }
          explosions.push({ x: m.x, y: groundY, age: 0, dur: 0.5, maxR: 34 });
          flash = 0.3; api.record(m.letter, false);
          if (cities.every((c) => !c.alive)) { over = true; running = false; }
        }
      }
      for (const e of explosions) e.age += dt;
      explosions = explosions.filter((e) => e.age < e.dur);
      for (const b of beams) b.age += dt;
      beams = beams.filter((b) => b.age < b.dur);
      if (flash > 0) flash = Math.max(0, flash - dt);
    }

    function draw() {
      api.drawBg();
      // ground
      ctx.strokeStyle = '#1f2733'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
      // cities
      cities.forEach((c) => {
        if (c.alive) { ctx.fillStyle = '#38d39f'; api.roundRect(c.x - 16, groundY + 4, 32, 14, 3); ctx.fill(); }
        else { ctx.fillStyle = '#3a2323'; ctx.fillRect(c.x - 16, groundY + 12, 32, 6); }
      });
      // battery
      ctx.fillStyle = '#4aa3ff';
      ctx.beginPath(); ctx.moveTo(batteryX - 12, groundY); ctx.lineTo(batteryX + 12, groundY); ctx.lineTo(batteryX, groundY - 16); ctx.closePath(); ctx.fill();
      // missiles (trail + head + letter)
      missiles.forEach((m) => {
        ctx.strokeStyle = 'rgba(255,93,93,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke();
        ctx.fillStyle = '#ff5d5d'; ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(m.letter, m.x, m.y - 16);
      });
      // interceptor beams
      beams.forEach((b) => {
        ctx.strokeStyle = 'rgba(56,211,159,' + (1 - b.age / b.dur) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      });
      // explosions
      explosions.forEach((e) => {
        const p = e.age / e.dur;
        const r = e.maxR * Math.min(1, p / 0.4);
        ctx.fillStyle = 'rgba(56,211,159,' + (1 - p) + ')';
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
      });
      // HUD
      ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#8b98a9'; ctx.font = '12px system-ui';
      ctx.textAlign = 'left'; ctx.fillText('Lv ' + level, 10, 18);
      ctx.textAlign = 'right'; ctx.fillText('Cities ' + cities.filter((c) => c.alive).length + '/4', W - 10, 18);
      if (flash > 0) { ctx.fillStyle = 'rgba(255,93,93,' + flash + ')'; ctx.fillRect(0, 0, W, H); }
      if (over) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 26px system-ui';
        ctx.fillText('Game Over', W / 2, H / 2 - 18);
        ctx.font = '18px system-ui'; ctx.fillText('Score ' + score, W / 2, H / 2 + 10);
        ctx.fillStyle = '#38d39f'; ctx.font = '15px system-ui';
        ctx.fillText('Tap to return to menu', W / 2, H / 2 + 42);
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (running) step(dt);
      draw();
      if (running || over) raf = requestAnimationFrame(frame);
    }

    function onTap() { if (over) api.exit(); }
    canvas.addEventListener('pointerdown', onTap);
    last = performance.now();
    raf = requestAnimationFrame(frame);

    return {
      stop() {
        running = false; over = false;
        cancelAnimationFrame(raf);
        canvas.removeEventListener('pointerdown', onTap);
        keyer.clear();
      }
    };
  }
};
