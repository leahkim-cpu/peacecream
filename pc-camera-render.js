/* PeaceCream Camera: drawing engine (templates, logo styles, sprinkles, captions, photo-to-logo morph).
 * Everything runs locally on <canvas>. No photo ever leaves the device.
 * The official logo (assets/logo/peacetreats-logo.jpg) is drawn unchanged; only a transparent
 * in-memory copy (same line art, paper removed) is used so it sits on coloured backgrounds. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld;
  const FORMATS = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] };
  const PALETTE = { paper: '#fff9ee', ink: '#612335', pink: '#f3c6ce', green: '#d7e0b4', lavender: '#e6dcf3', peach: '#f9dcc4', sky: '#d6e8f2', butter: '#f9ecc4' };
  const SPRINKLES = ['#e66f8b', '#f3b54a', '#7fb6d8', '#9fc77a', '#b48ad6', '#f08a5d'];
  const SERIF = 'Fraunces, Georgia, "Hiragino Mincho ProN", "Songti SC", serif';
  const SANS = '"DM Sans", "Hiragino Sans", "PingFang SC", sans-serif';
  const HAND = '"Bradley Hand", "Segoe Print", "Comic Sans MS", "Hiragino Maru Gothic ProN", "Yuanti SC", cursive';

  /* ---------- small helpers ---------- */
  function seeded(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(X, Y, w, h, r) : x.rect(X, Y, w, h); }
  function star(x, cx, cy, r, color) {
    x.save(); x.translate(cx, cy); x.fillStyle = color; x.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    x.closePath(); x.fill(); x.restore();
  }
  function sprinkle(x, cx, cy, len, rot, color) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.fillStyle = color;
    roundRect(x, -len / 2, -len * 0.18, len, len * 0.36, len * 0.18); x.fill(); x.restore();
  }
  function wrapLines(x, text, maxWidth, maxLines) {
    const words = /[　-鿿]/.test(text) ? Array.from(text) : text.split(/(\s+)/);
    const lines = []; let line = '';
    for (const w of words) {
      if (x.measureText(line + w).width > maxWidth && line.trim()) { lines.push(line.trim()); line = w.trimStart(); if (lines.length === maxLines) break; }
      else line += w;
    }
    if (lines.length < maxLines && line.trim()) lines.push(line.trim());
    return lines;
  }
  /** Draws the user's photo into a window, honouring zoom, rotation and drag offset. */
  function drawPhoto(x, photo, win, adj) {
    const { zoom = 1, rotate = 0, dx = 0, dy = 0 } = adj || {};
    const rad = rotate * Math.PI / 180;
    const rw = Math.abs(photo.width * Math.cos(rad)) + Math.abs(photo.height * Math.sin(rad));
    const rh = Math.abs(photo.width * Math.sin(rad)) + Math.abs(photo.height * Math.cos(rad));
    const cover = Math.max(win.w / rw, win.h / rh) * zoom;
    x.save();
    if (win.r !== undefined) { roundRect(x, win.x, win.y, win.w, win.h, win.r); x.clip(); }
    x.translate(win.x + win.w / 2 + dx * win.w, win.y + win.h / 2 + dy * win.h);
    x.rotate(rad);
    x.drawImage(photo, -photo.width * cover / 2, -photo.height * cover / 2, photo.width * cover, photo.height * cover);
    x.restore();
  }
  const svgCache = {};
  async function svgImage(markup) {
    if (svgCache[markup]) return svgCache[markup];
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    svgCache[markup] = W.loadImage(src);
    return svgCache[markup];
  }

  /* ---------- logo placement ---------- */
  function placementPoint(place, win, size) {
    const m = size * 0.15;
    switch (place) {
      case 'top-left': return [win.x - m, win.y - m];
      case 'bottom-left': return [win.x - m, win.y + win.h - size + m];
      case 'bottom-right': return [win.x + win.w - size + m, win.y + win.h - size + m];
      case 'center': return [win.x + (win.w - size) / 2, win.y + win.h - size * 0.8];
      default: return [win.x + win.w - size + m, win.y - m];
    }
  }
  function drawSticker(x, logo, cx, cy, size, tilt) {
    x.save(); x.translate(cx + size / 2, cy + size / 2); x.rotate(tilt);
    x.shadowColor = 'rgba(97,35,53,.22)'; x.shadowBlur = size * 0.08; x.shadowOffsetY = size * 0.03;
    x.fillStyle = '#fffdf8'; x.beginPath(); x.arc(0, 0, size / 2, 0, Math.PI * 2); x.fill();
    x.shadowColor = 'transparent';
    x.strokeStyle = PALETTE.pink; x.lineWidth = size * 0.035; x.setLineDash([size * 0.04, size * 0.03]);
    x.beginPath(); x.arc(0, 0, size / 2 - size * 0.05, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    const s = size * 0.82; x.drawImage(logo, -s / 2, -s / 2, s, s);
    x.restore();
  }

  /* ---------- templates ---------- */
  function background(x, W_, H, tpl, rand) {
    if (tpl === 'classic') { x.fillStyle = PALETTE.paper; x.fillRect(0, 0, W_, H); return; }
    if (tpl === 'memories') { x.fillStyle = PALETTE.butter; x.fillRect(0, 0, W_, H); x.fillStyle = 'rgba(97,35,53,.05)'; for (let i = 0; i < 400; i++) x.fillRect(rand() * W_, rand() * H, 2, 2); return; }
    const g = x.createLinearGradient(0, 0, W_ * 0.3, H);
    if (tpl === 'dreamy') { g.addColorStop(0, '#fde3e8'); g.addColorStop(0.5, PALETTE.lavender); g.addColorStop(1, PALETTE.sky); }
    else { g.addColorStop(0, '#fbe4d6'); g.addColorStop(0.55, '#f6d3dc'); g.addColorStop(1, '#e6dcf3'); }
    x.fillStyle = g; x.fillRect(0, 0, W_, H);
  }
  function photoWindow(W_, H, tpl, logoStyle) {
    const pad = W_ * 0.09;
    if (logoStyle === 'card') { const w = W_ - pad * 2.4; return { x: (W_ - w) / 2, y: H * 0.13, w, h: Math.min(w * 1.05, H * 0.58), r: 18 }; }
    if (tpl === 'memories') { const w = W_ * 0.74; return { x: (W_ - w) / 2, y: H * 0.11, w, h: Math.min(w, H * 0.62), r: 0, polaroid: true }; }
    if (tpl === 'story') { const w = W_ * 0.8; const h = Math.min(H * 0.52, w * 1.3); return { x: (W_ - w) / 2, y: H * 0.15, w, h, r: w / 2.2, arch: true }; }
    if (tpl === 'dreamy') { const w = W_ - pad * 1.6; return { x: (W_ - w) / 2, y: pad * 0.8, w, h: H - pad * 3.4, r: 46 }; }
    const w = W_ - pad * 2; return { x: pad, y: pad, w, h: H - pad * 2 - H * 0.12, r: 30 };
  }
  async function compose(canvas, photo, opts) {
    const o = { template: 'classic', logoStyle: 'sticker', place: 'top-right', sprinkles: true, caption: '', adj: {}, date: new Date(), ...opts };
    const [Wd, Ht] = [canvas.width, canvas.height];
    const x = canvas.getContext('2d');
    const rand = seeded(o.seed || 7);
    const logo = await W.logoCanvas(1254).catch(() => W.loadImage(W.LOGO_SRC));
    x.save(); x.clearRect(0, 0, Wd, Ht);
    background(x, Wd, Ht, o.template, rand);
    const win = photoWindow(Wd, Ht, o.template, o.logoStyle);

    // decorative layer behind the photo
    if (o.template === 'dreamy' || o.template === 'story') {
      for (let i = 0; i < 26; i++) star(x, rand() * Wd, rand() * Ht, 6 + rand() * 12, `rgba(255,255,255,${0.5 + rand() * 0.4})`);
    }
    if (o.template === 'story') {
      const scoops = await Promise.all([0, 4, 6].map(f => (svgCache['scoop' + f] = svgCache['scoop' + f] || svgImage(W.scoopSVG(f, { size: 120 })))));
      scoops.forEach((img, i) => { const s = Wd * 0.15; x.drawImage(img, [Wd * 0.04, Wd * 0.81, Wd * 0.05][i], [Ht * 0.04, Ht * 0.05, Ht * 0.8][i], s, s * 1.1); });
    }

    // the card or polaroid behind the photo
    if (o.logoStyle === 'card') {
      x.save(); x.shadowColor = 'rgba(97,35,53,.18)'; x.shadowBlur = 40; x.shadowOffsetY = 14;
      x.fillStyle = '#fffdf8'; roundRect(x, win.x - 34, win.y - 34, win.w + 68, Ht - win.y - Ht * 0.06 + 34, 34); x.fill(); x.restore();
      x.strokeStyle = PALETTE.pink; x.lineWidth = 6; x.setLineDash([16, 12]); roundRect(x, win.x - 18, win.y - 18, win.w + 36, Ht - win.y - Ht * 0.06 + 2, 24); x.stroke(); x.setLineDash([]);
    } else if (win.polaroid) {
      x.save(); x.translate(Wd / 2, win.y + win.h / 2); x.rotate(-0.025); x.translate(-Wd / 2, -(win.y + win.h / 2));
      x.shadowColor = 'rgba(97,35,53,.2)'; x.shadowBlur = 36; x.shadowOffsetY = 14; x.fillStyle = '#fff';
      x.fillRect(win.x - 30, win.y - 30, win.w + 60, win.h + Ht * 0.17); x.restore();
    } else if (o.template === 'classic') {
      x.strokeStyle = PALETTE.pink; x.lineWidth = 22; roundRect(x, win.x - 14, win.y - 14, win.w + 28, win.h + 28, 40); x.stroke();
    }

    if (win.arch) { x.save(); x.beginPath(); x.moveTo(win.x, win.y + win.h); x.lineTo(win.x, win.y + win.w / 2); x.arc(win.x + win.w / 2, win.y + win.w / 2, win.w / 2, Math.PI, 0); x.lineTo(win.x + win.w, win.y + win.h); x.closePath(); x.clip(); drawPhoto(x, photo, { ...win, r: undefined }, o.adj); x.restore(); }
    else drawPhoto(x, photo, win, o.adj);

    // sprinkles drift around the edges, never over the middle of the ice cream
    if (o.sprinkles) {
      for (let i = 0; i < 46; i++) {
        let px, py; do { px = rand() * Wd; py = rand() * Ht; } while (o.logoStyle === 'card' ? (px > win.x - 40 && px < win.x + win.w + 40 && py > win.y - 40 && py < Ht * 0.95) : (px > win.x + win.w * 0.12 && px < win.x + win.w * 0.88 && py > win.y + win.h * 0.12 && py < win.y + win.h * 0.88));
        sprinkle(x, px, py, 16 + rand() * 18, rand() * Math.PI, SPRINKLES[i % SPRINKLES.length]);
      }
    }

    // caption
    const caption = (o.caption || '').trim();
    if (win.polaroid) {
      x.fillStyle = PALETTE.ink; x.textAlign = 'center'; x.font = `${Math.round(Wd * 0.05)}px ${HAND}`;
      if (caption) wrapLines(x, caption, win.w - 40, 2).forEach((l, i) => x.fillText(l, Wd / 2, win.y + win.h + Ht * 0.07 + i * Wd * 0.055));
      // date stamp
      x.font = `600 ${Math.round(Wd * 0.03)}px "Courier New", monospace`; x.fillStyle = '#f08a5d'; x.textAlign = 'right';
      x.fillText(o.date.toLocaleDateString(PeaceI18n.lang, { year: '2-digit', month: '2-digit', day: '2-digit' }), win.x + win.w - 20, win.y + win.h - 22);
    } else if (caption) {
      x.fillStyle = PALETTE.ink; x.textAlign = 'center'; x.font = `500 ${Math.round(Wd * 0.052)}px ${SERIF}`;
      const baseY = o.logoStyle === 'card' ? win.y + win.h + Ht * 0.07 : o.template === 'story' ? win.y + win.h + Ht * 0.055 : Ht - Ht * 0.055;
      const narrow = o.template === 'dreamy' && o.logoStyle !== 'card';
      wrapLines(x, caption, Wd * (narrow ? 0.66 : 0.8), 2).forEach((l, i) => x.fillText(l, narrow ? Wd * 0.43 : Wd / 2, baseY + i * Wd * 0.062 - (narrow && caption.length > 28 ? Wd * 0.05 : 0)));
    }

    // logo
    if (o.logoStyle === 'card') {
      const s = Wd * 0.2; x.drawImage(logo, win.x - 10, Ht - Ht * 0.06 - s - 6, s, s);
      x.fillStyle = PALETTE.ink; x.textAlign = 'right'; x.font = `500 ${Math.round(Wd * 0.03)}px ${SANS}`;
      x.fillText(tr('What does peace taste like?'), win.x + win.w, Ht - Ht * 0.06 - s * 0.35);
    } else if (o.template === 'story') {
      const s = Wd * 0.26; x.drawImage(logo, (Wd - s) / 2, Ht - s - Ht * 0.025, s, s);
    } else if (o.template === 'dreamy' || o.template === 'memories') {
      const s = Wd * (o.template === 'dreamy' ? 0.15 : 0.13);
      if (o.logoStyle === 'sticker' && o.template === 'memories') drawSticker(x, logo, ...placementPoint(o.place, win, Wd * 0.2), Wd * 0.2, -0.12);
      else x.drawImage(logo, Wd - s - Wd * 0.04, Ht - s - Wd * 0.03, s, s);
    } else {
      const size = Wd * 0.24;
      drawSticker(x, logo, ...placementPoint(o.place, win, size), size, -0.14);
    }
    x.restore();
    return canvas;
  }

  /* ---------- auto-detect the ice cream (no AI: colour contrast against the photo's edges) ---------- */
  function detectSubject(photo) {
    const S = 96, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(photo, 0, 0, S, S);
    const p = x.getImageData(0, 0, S, S).data;
    const border = [];
    for (let i = 0; i < S; i++) [[i, 0], [i, S - 1], [0, i], [S - 1, i]].forEach(([a, b]) => { const k = (b * S + a) * 4; border.push([p[k], p[k + 1], p[k + 2]]); });
    const med = [0, 1, 2].map(ch => border.map(b => b[ch]).sort((m, n) => m - n)[border.length >> 1]);
    let minX = S, minY = S, maxX = 0, maxY = 0, n = 0;
    for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
      const k = (y * S + xx) * 4;
      const d = Math.hypot(p[k] - med[0], p[k + 1] - med[1], p[k + 2] - med[2]);
      const central = Math.hypot(xx / S - 0.5, y / S - 0.5) < 0.45;
      if (d > 60 && central) { n++; minX = Math.min(minX, xx); maxX = Math.max(maxX, xx); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    const confident = n > S * S * 0.04 && n < S * S * 0.85;
    if (!confident) return { cx: 0.5, cy: 0.45, rx: 0.3, ry: 0.36, auto: false };
    return { cx: (minX + maxX) / 2 / S, cy: (minY + maxY) / 2 / S, rx: Math.max(0.12, (maxX - minX) / 2 / S), ry: Math.max(0.12, (maxY - minY) / 2 / S), auto: true };
  }

  /* ---------- logo silhouette (the outline of the official logo, filled) ---------- */
  let silhouettePromise = null;
  function logoSilhouette() {
    if (!silhouettePromise) silhouettePromise = W.logoCanvas(256).then(src => {
      const S = 256, x = src.getContext('2d', { willReadFrequently: true });
      const a = x.getImageData(0, 0, S, S).data;
      const outside = new Uint8Array(S * S), stack = [];
      for (let i = 0; i < S; i++) stack.push(i, (S - 1) * S + i, i * S, i * S + S - 1);
      while (stack.length) {
        const k = stack.pop();
        if (outside[k] || a[k * 4 + 3] > 60) continue;
        outside[k] = 1;
        const xx = k % S, y = (k / S) | 0;
        if (xx > 0) stack.push(k - 1); if (xx < S - 1) stack.push(k + 1); if (y > 0) stack.push(k - S); if (y < S - 1) stack.push(k + S);
      }
      const c = document.createElement('canvas'); c.width = c.height = S;
      const cx = c.getContext('2d'), img = cx.createImageData(S, S);
      for (let k = 0; k < S * S; k++) { img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = 255; img.data[k * 4 + 3] = outside[k] ? 0 : 255; }
      cx.putImageData(img, 0, 0);
      return c;
    });
    return silhouettePromise;
  }

  /* ---------- photo-to-logo transformation ---------- */
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const phase = (t, a, b) => clamp01((t - a) / (b - a));
  const TRANSFORM_MS = 3600;

  /** Prepares everything the morph needs; returns a frame(t) function (t in 0..1). */
  async function prepareMorph(canvas, photo, sel, opts) {
    const [Wd, Ht] = [canvas.width, canvas.height];
    const x = canvas.getContext('2d');
    const logo = await W.logoCanvas(1254);
    const sil = await logoSilhouette();
    const M = 200; // mask resolution
    const mask = document.createElement('canvas'); mask.width = mask.height = M;
    const mx = mask.getContext('2d', { willReadFrequently: true });
    const layer = document.createElement('canvas'); layer.width = Wd; layer.height = Ht;
    const lx = layer.getContext('2d');
    const canBlur = 'filter' in mx;
    const rand = seeded(11);
    const bits = Array.from({ length: 40 }, (_, i) => ({ a: rand() * Math.PI * 2, r: 0.32 + rand() * 0.22, s: 10 + rand() * 16, sp: 0.4 + rand() * 0.8, c: SPRINKLES[i % SPRINKLES.length], star: i % 4 === 0 }));
    const logoSize = Math.min(Wd, Ht) * 0.68, logoBox = { x: (Wd - logoSize) / 2 + Wd * 0.06, y: (Ht - logoSize) / 2 - Ht * 0.06, w: logoSize, h: logoSize };
    // where the ice cream sits in canvas coordinates when the photo covers the canvas
    const cover = Math.max(Wd / photo.width, Ht / photo.height);
    const pw = photo.width * cover, ph = photo.height * cover, ox = (Wd - pw) / 2, oy = (Ht - ph) / 2;
    const subj = { x: ox + (sel.cx - sel.rx) * pw, y: oy + (sel.cy - sel.ry) * ph, w: sel.rx * 2 * pw, h: sel.ry * 2 * ph };
    const bg = x.createLinearGradient(0, 0, Wd * 0.3, Ht);
    bg.addColorStop(0, '#fde3e8'); bg.addColorStop(0.55, PALETTE.lavender); bg.addColorStop(1, PALETTE.sky);

    function morphMask(m) {
      mx.clearRect(0, 0, M, M);
      mx.save();
      if (canBlur) mx.filter = `blur(${(4 + 6 * Math.sin(m * Math.PI)).toFixed(1)}px)`;
      // ellipse of the ice cream, interpolated towards the logo's silhouette box
      const sbx = lerpBox(subj, logoBox, m);
      mx.globalAlpha = 1 - m;
      mx.fillStyle = '#fff'; mx.beginPath();
      mx.ellipse((sbx.x + sbx.w / 2) / Wd * M, (sbx.y + sbx.h / 2) / Ht * M, sbx.w / 2 / Wd * M, sbx.h / 2 / Ht * M, 0, 0, Math.PI * 2); mx.fill();
      mx.globalAlpha = m;
      const lb = lerpBox(subj, logoBox, Math.min(1, m * 1.15));
      mx.drawImage(sil, lb.x / Wd * M, lb.y / Ht * M, lb.w / Wd * M, lb.h / Ht * M);
      mx.restore();
      // threshold: turns the blurred blend into one crisp, liquid shape
      const d = mx.getImageData(0, 0, M, M), p = d.data;
      for (let i = 3; i < p.length; i += 4) { const v = p[i] / 255; p[i] = v < 0.38 ? 0 : v > 0.52 ? 255 : Math.round((v - 0.38) / 0.14 * 255); }
      mx.putImageData(d, 0, 0);
    }
    function lerpBox(a, b, m) { return { x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m, w: a.w + (b.w - a.w) * m, h: a.h + (b.h - a.h) * m }; }

    function frame(t) {
      x.save(); x.clearRect(0, 0, Wd, Ht);
      // 1. the original photograph, then a gentle wash into pastel
      x.drawImage(photo, ox, oy, pw, ph);
      x.globalAlpha = ease(phase(t, 0.2, 0.55)); x.fillStyle = bg; x.fillRect(0, 0, Wd, Ht); x.globalAlpha = 1;
      // 4. the photographed ice cream, reshaping towards the logo's silhouette
      const m = ease(phase(t, 0.28, 0.72));
      morphMask(m);
      lx.clearRect(0, 0, Wd, Ht);
      const box = lerpBox(subj, logoBox, m);
      const k = box.w / subj.w;
      lx.drawImage(photo, box.x - (subj.x - ox) * k, box.y - (subj.y - oy) * (box.h / subj.h), pw * k, ph * (box.h / subj.h));
      lx.globalCompositeOperation = 'destination-in';
      lx.drawImage(mask, 0, 0, Wd, Ht);
      lx.globalCompositeOperation = 'source-over';
      const reveal = ease(phase(t, 0.66, 0.84));
      x.globalAlpha = 1 - reveal; x.drawImage(layer, 0, 0); x.globalAlpha = 1;
      // 3. a swirl of pastel cream travelling around it
      const sw = phase(t, 0.14, 0.7);
      if (sw > 0 && sw < 1) {
        const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.max(box.w, box.h) * 0.62;
        x.lineCap = 'round';
        [['#fde3e8', 0], ['#f3c6ce', 0.7], ['#e6dcf3', 1.4], ['#d7e0b4', 2.1]].forEach(([col, off], i) => {
          x.strokeStyle = col; x.globalAlpha = Math.sin(sw * Math.PI) * 0.9; x.lineWidth = Wd * (0.05 - i * 0.008);
          x.beginPath(); x.arc(cx, cy, R * (0.9 + i * 0.07), sw * Math.PI * 4 + off, sw * Math.PI * 4 + off + Math.PI * 0.9); x.stroke();
        });
        x.globalAlpha = 1;
      }
      // 5. the exact official logo appears, with a soft bounce
      if (reveal > 0) {
        const bt = phase(t, 0.84, 1), bounce = 1 + Math.sin(bt * Math.PI) * 0.06 * (1 - bt);
        const s = logoBox.w * (0.94 + 0.06 * reveal) * bounce;
        x.globalAlpha = reveal; x.drawImage(logo, logoBox.x + (logoBox.w - s) / 2, logoBox.y + (logoBox.h - s) / 2, s, s); x.globalAlpha = 1;
      }
      // the original photograph stays part of the final picture, as a little polaroid
      if (reveal > 0) {
        const tw = Math.min(Wd, Ht) * 0.25, th = tw * 1.18, tx = Wd * 0.05, ty = Ht - th - Ht * 0.05;
        x.save(); x.globalAlpha = reveal; x.translate(tx + tw / 2, ty + th / 2); x.rotate(-0.12);
        x.shadowColor = 'rgba(97,35,53,.25)'; x.shadowBlur = Wd * 0.02; x.shadowOffsetY = Wd * 0.008;
        x.fillStyle = '#fff'; x.fillRect(-tw / 2, -th / 2, tw, th); x.shadowColor = 'transparent';
        drawPhoto(x, photo, { x: -tw / 2 + tw * 0.07, y: -th / 2 + tw * 0.07, w: tw * 0.86, h: tw * 0.86, r: 2 }, {});
        x.restore();
      }
      // 2. sprinkles and sparkles floating around
      const sp = phase(t, 0.05, 1);
      bits.forEach(b => {
        const a = b.a + sp * b.sp * Math.PI * 2, r = b.r * Math.min(Wd, Ht) * (1 + 0.1 * Math.sin(sp * 6 + b.a));
        const px = Wd / 2 + Math.cos(a) * r, py = Ht / 2 + Math.sin(a) * r * 0.9;
        x.globalAlpha = Math.min(1, sp * 4) * (0.6 + 0.4 * Math.sin(sp * 9 + b.a));
        if (b.star) star(x, px, py, b.s * 0.7, '#fff'); else sprinkle(x, px, py, b.s, a, b.c);
      });
      x.globalAlpha = 1;
      // caption, settling in at the end
      const cap = (opts.caption || '').trim();
      if (cap) {
        x.globalAlpha = phase(t, 0.85, 1); x.fillStyle = PALETTE.ink; x.textAlign = 'center'; x.font = `500 ${Math.round(Wd * 0.05)}px ${SERIF}`;
        wrapLines(x, cap, Wd * 0.58, 2).forEach((l, i) => x.fillText(l, Wd * 0.64, Ht - Ht * 0.09 + i * Wd * 0.058 - (cap.length > 22 ? Wd * 0.03 : 0)));
        x.globalAlpha = 1;
      }
      x.restore();
    }
    return { frame, duration: TRANSFORM_MS, usesBlur: canBlur };
  }

  /* ---------- the "Make it PeaceCream" reveal for branded photos ---------- */
  async function prepareReveal(canvas, photo, opts) {
    const final = document.createElement('canvas'); final.width = canvas.width; final.height = canvas.height;
    await compose(final, photo, opts);
    const logo = await W.logoCanvas(1254);
    const x = canvas.getContext('2d'), [Wd, Ht] = [canvas.width, canvas.height];
    const cover = Math.max(Wd / photo.width, Ht / photo.height);
    const rand = seeded(5);
    const bits = Array.from({ length: 34 }, (_, i) => ({ x: rand(), y: rand(), s: 10 + rand() * 16, c: SPRINKLES[i % 6], v: 0.3 + rand() * 0.6 }));
    function frame(t) {
      x.save(); x.clearRect(0, 0, Wd, Ht);
      // 1. the photo in the centre
      x.drawImage(photo, (Wd - photo.width * cover) / 2, (Ht - photo.height * cover) / 2, photo.width * cover, photo.height * cover);
      // 6. the finished design fades in behind a swirl of cream
      const reveal = ease(phase(t, 0.45, 0.9));
      x.globalAlpha = reveal; x.drawImage(final, 0, 0); x.globalAlpha = 1;
      // 3. swirl crossing the photo
      const sw = phase(t, 0.15, 0.7);
      if (sw > 0 && sw < 1) {
        x.lineCap = 'round';
        ['#fde3e8', '#f3c6ce', '#e6dcf3'].forEach((col, i) => {
          x.strokeStyle = col; x.globalAlpha = Math.sin(sw * Math.PI) * 0.85; x.lineWidth = Wd * (0.09 - i * 0.02);
          x.beginPath();
          for (let k = 0; k <= 40; k++) { const u = k / 40, px = (sw * 1.8 - 0.4 + u * 0.5) * Wd, py = Ht * (0.25 + i * 0.2) + Math.sin(u * 6 + sw * 8) * Ht * 0.08; k ? x.lineTo(px, py) : x.moveTo(px, py); }
          x.stroke();
        });
        x.globalAlpha = 1;
      }
      // 4. the logo pops in, then settles into the design
      const lp = phase(t, 0.3, 0.55), lf = 1 - phase(t, 0.72, 0.92);
      if (lp > 0 && lf > 0) {
        const s = Math.min(Wd, Ht) * 0.42 * (0.7 + 0.3 * ease(lp));
        x.globalAlpha = Math.min(lp * 2, lf); x.fillStyle = 'rgba(255,253,248,.92)';
        x.beginPath(); x.arc(Wd / 2, Ht / 2, s * 0.55, 0, Math.PI * 2); x.fill();
        x.drawImage(logo, (Wd - s) / 2, (Ht - s) / 2, s, s); x.globalAlpha = 1;
      }
      // 2. sprinkles floating upwards
      bits.forEach(b => { x.globalAlpha = Math.sin(Math.min(1, t * 1.2) * Math.PI) * 0.9; sprinkle(x, b.x * Wd, ((b.y - t * b.v) % 1 + 1) % 1 * Ht, b.s, b.x * 6, b.c); });
      x.restore();
    }
    return { frame, duration: 2800, final };
  }

  root.PeaceCameraRender = { FORMATS, compose, detectSubject, prepareMorph, prepareReveal, drawPhoto };
})(window);
