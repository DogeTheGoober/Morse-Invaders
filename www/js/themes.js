window.MT = window.MT || {};

// Preset palettes. Each theme is a full set of CSS custom properties applied to
// :root at runtime, so switching a theme restyles the whole app instantly.
MT.THEMES = {
  dark:     { '--bg': '#0e1116', '--panel': '#171c24', '--panel2': '#1f2733', '--fg': '#e6edf3', '--muted': '#8b98a9', '--accent': '#38d39f', '--accent2': '#4aa3ff', '--on-accent': '#04120d', '--good': '#38d39f', '--bad': '#ff5d5d' },
  light:    { '--bg': '#f4f6f9', '--panel': '#ffffff', '--panel2': '#eef1f6', '--fg': '#10151c', '--muted': '#5b6675', '--accent': '#12a97b', '--accent2': '#2b7fe0', '--on-accent': '#ffffff', '--good': '#12a97b', '--bad': '#d64545' },
  // Claude design: warm cream paper, ink text, book-cloth coral accent.
  claude:   { '--bg': '#f0eee6', '--panel': '#faf9f5', '--panel2': '#e8e4d8', '--fg': '#1f1e1d', '--muted': '#73706a', '--accent': '#cc785c', '--accent2': '#6e8b8a', '--on-accent': '#ffffff', '--good': '#3e7d5a', '--bad': '#be4b3b' },
  // Green telegraph/CRT — very on-theme for Morse.
  terminal: { '--bg': '#001008', '--panel': '#04180e', '--panel2': '#0b2917', '--fg': '#4dff88', '--muted': '#2f9d5b', '--accent': '#33ff66', '--accent2': '#8affb6', '--on-accent': '#001008', '--good': '#33ff66', '--bad': '#ff5555' },
  amber:    { '--bg': '#120a00', '--panel': '#1e1305', '--panel2': '#2b1c08', '--fg': '#ffc233', '--muted': '#a3771a', '--accent': '#ffb000', '--accent2': '#ff8c1a', '--on-accent': '#120a00', '--good': '#33d17a', '--bad': '#ff5555' },
  ocean:    { '--bg': '#0a1622', '--panel': '#10202f', '--panel2': '#17303f', '--fg': '#dbeafe', '--muted': '#7a93ab', '--accent': '#38bdf8', '--accent2': '#34d399', '--on-accent': '#04121a', '--good': '#34d399', '--bad': '#fb7185' }
};

MT.THEME_META = [
  { id: 'dark', name: 'Dark' },
  { id: 'light', name: 'Light' },
  { id: 'claude', name: 'Claude' },
  { id: 'terminal', name: 'Terminal' },
  { id: 'amber', name: 'Amber' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'custom', name: 'Custom' }
];

(function () {
  function clampHex(h) {
    h = String(h || '').trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(h)) return null;
    return h[0] === '#' ? h : '#' + h;
  }
  function toRgb(h) { h = clampHex(h) || '#000000'; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function toHex(rgb) { return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const x = toRgb(a), y = toRgb(b); return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
  function lum(h) { const c = toRgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

  // Build a full palette from just background / text / accent (custom theme):
  // panels + muted are derived by blending bg toward text.
  MT.deriveCustom = function (ct) {
    ct = ct || {};
    const bg = clampHex(ct.bg) || '#0e1116';
    const fg = clampHex(ct.fg) || '#e6edf3';
    const accent = clampHex(ct.accent) || '#38d39f';
    return {
      '--bg': bg,
      '--panel': mix(bg, fg, 0.05),
      '--panel2': mix(bg, fg, 0.12),
      '--fg': fg,
      '--muted': mix(fg, bg, 0.45),
      '--accent': accent,
      '--accent2': accent,
      '--on-accent': lum(accent) > 0.62 ? '#0d0d0d' : '#ffffff',
      '--good': '#38d39f',
      '--bad': '#ff5d5d'
    };
  };

  MT.themeVars = function () {
    const c = MT.config.get();
    const id = c.theme || 'dark';
    if (id === 'custom') return MT.deriveCustom(c.customTheme);
    return MT.THEMES[id] || MT.THEMES.dark;
  };

  // ---- Custom background image (stored separately from config; can be large) ----
  const BG_KEY = 'mt_bg';
  MT.bg = {
    data() { try { return localStorage.getItem(BG_KEY) || null; } catch (e) { return null; } },
    save(dataUrl) { try { localStorage.setItem(BG_KEY, dataUrl); return true; } catch (e) { return false; } },
    clear() { try { localStorage.removeItem(BG_KEY); } catch (e) {} }
  };

  function applyBg() {
    const root = document.documentElement;
    let layer = document.getElementById('bgLayer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'bgLayer';
      document.body.insertBefore(layer, document.body.firstChild);
    }
    const img = MT.bg.data();
    if (!img) {
      root.classList.remove('has-bg');
      layer.style.backgroundImage = 'none';
      layer.style.filter = 'none';
      layer.style.transform = 'none';
      return;
    }
    const c = MT.config.get();
    const dim = (typeof c.bgDim === 'number') ? c.bgDim : 0.45;
    const blur = (typeof c.bgBlur === 'number') ? c.bgBlur : 0;
    const rgb = toRgb(MT.themeVars()['--bg']);
    const ov = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + dim + ')';
    layer.style.backgroundImage = 'linear-gradient(' + ov + ',' + ov + '), url("' + img + '")';
    // Blur pulls in transparent edges; scale up slightly so no gaps show.
    layer.style.filter = blur ? 'blur(' + blur + 'px)' : 'none';
    layer.style.transform = blur ? 'scale(' + (1 + blur * 0.012) + ')' : 'none';
    root.classList.add('has-bg');
  }
  MT.applyBg = applyBg;

  MT.applyTheme = function () {
    const vars = MT.themeVars();
    const root = document.documentElement;
    Object.keys(vars).forEach((k) => root.style.setProperty(k, vars[k]));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', vars['--bg']);
    applyBg(); // overlay tint tracks the theme bg
  };
})();
