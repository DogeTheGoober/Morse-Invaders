window.MT = window.MT || {};
MT.games = MT.games || {};

// Falling Letters: each drop plays its Morse on spawn. Key the code before it
// lands. Letter is shown only if Settings hints are on (else pure ear-training).
// Lose a life when a drop lands. 3 lives.
MT.games.falling = {
  start(api) {
    const { canvas, ctx, w: W, h: H } = api;
    const groundY = H - 24;
    let drops = [];
    let lives = 3, score = 0, level = 1, running = true, over = false, raf = 0;
    let last = performance.now(), spawnTimer = 0, spawnEvery = 2.6, flash = 0;

    const keyer = api.makeKeyer({
      onElement: (el, buf) => api.showBuffer(api.pretty(buf)),
      onLetter: (letter) => hit(letter)
    });

    function spawn() {
      const ch = api.pick();
      drops.push({ x: 26 + Math.random() * (W - 52), y: -10, letter: ch, speed: 26 + level * 6 });
      api.audio.playPattern(api.morse.encode(ch));
    }

    function hit(letter) {
      api.showBuffer('');
      if (over) return;
      let target = null;
      for (const d of drops) if (d.letter === letter && (!target || d.y > target.y)) target = d;
      if (target) {
        score += 10; api.setScore(score); api.record(letter, true);
        drops = drops.filter((d) => d !== target);
        if (score > 0 && score % 60 === 0) { level += 1; spawnEvery = Math.max(0.9, spawnEvery * 0.9); }
      } else {
        flash = 0.25;
      }
    }

    function step(dt) {
      spawnTimer += dt;
      if (spawnTimer >= spawnEvery) { spawnTimer = 0; spawn(); }
      for (const d of drops) d.y += d.speed * dt;
      for (const d of drops.slice()) {
        if (d.y >= groundY) {
          drops = drops.filter((x) => x !== d);
          lives -= 1; flash = 0.3; api.record(d.letter, false);
          if (lives <= 0) { over = true; running = false; }
        }
      }
      if (flash > 0) flash = Math.max(0, flash - dt);
    }

    function draw() {
      api.drawBg();
      const showLetter = api.cfg.get().showHints;
      // ground line
      ctx.strokeStyle = '#1f2733'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
      // drops
      drops.forEach((d) => {
        ctx.fillStyle = '#1f2733'; ctx.strokeStyle = '#38d39f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(d.x, d.y, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 19px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(showLetter ? d.letter : '?', d.x, d.y);
      });
      // HUD
      ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#8b98a9'; ctx.font = '12px system-ui';
      ctx.textAlign = 'left'; ctx.fillText('Lv ' + level, 10, 18);
      ctx.textAlign = 'right'; ctx.fillText('♥ '.repeat(Math.max(0, lives)).trim() || '—', W - 10, 18);
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
