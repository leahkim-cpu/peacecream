/* Cake builder — "Layer Your Happiness".
 * Shape → sponge → layers → frosting → decorations → message.
 * Reveal: layers stack one by one → frosting spreads → decorations drop in → turntable turn. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, D = root.PeaceDesserts;
  const N = s => s; // marks English UI strings for translation extraction
  const INK = '#612335';
  const SHAPES = [['round', N('Round')], ['heart', N('Heart')], ['square', N('Square')]];
  const SPONGES = [['vanilla', N('Vanilla'), '#f6dca4', '#dcb878'], ['chocolate', N('Chocolate'), '#a7765c', '#7d5240'], ['matcha', N('Matcha'), '#c6d89c', '#93ad6a'], ['strawberry', N('Strawberry'), '#f6c1c6', '#de8f98'], ['lemon', N('Lemon'), '#f8e58f', '#dcc45a']];
  const FROST_FLAVORS = [['buttercream', N('Vanilla buttercream')], ['creamcheese', N('Cream cheese frosting')], ['ganache', N('Chocolate ganache')], ['whipped', N('Whipped cream')], ['berry', N('Berry cream')]];
  const FROST = ['#fffdf8', ...D.COLORS, '#b0816a'];
  const FROST_NAMES = [N('cream'), ...D.COLOR_NAMES, N('cocoa')];
  const STYLES = [['smooth', N('Smooth')], ['ruffled', N('Ruffled')], ['drip', N('Drip')]];
  const DECOR = [['fruit', N('Fresh fruit')], ['flowers', N('Sugar flowers')], ['stars', N('Little stars')], ['candles', N('Candles')]];
  const PLACES = [['top', N('Written on top')], ['plaque', N('On a little plaque')]];
  const LAYER_NAMES = [N('One layer'), N('Two layers'), N('Three layers'), N('Four layers')];
  const SPONGE_ING = { vanilla: N('Vanilla sponge'), chocolate: N('Chocolate sponge'), matcha: N('Matcha sponge'), strawberry: N('Strawberry sponge'), lemon: N('Lemon sponge') };
  const TIN_ING = { round: N('Round cake tin'), heart: N('Heart cake tin'), square: N('Square cake tin') };
  const STYLE_ING = { smooth: N('Smooth frosting'), ruffled: N('Ruffled frosting'), drip: N('Frosting drip') };
  const DECOR_ING = { fruit: N('Fresh berries'), flowers: N('Sugar flowers'), stars: N('Golden stars'), candles: N('Birthday candles') };
  const CANDLE_COLORS = ['#a9d3ef', '#f4b2bf', '#cddfa9', '#d9b8ec', '#f9cd7d'];
  const FONT = `font-family="'Bradley Hand','Segoe Print','Hiragino Maru Gothic ProN','Yuanti SC',cursive"`;
  const MSG_MAX = 20, CANDLE_MAX = 8, LAYER_MAX = 4;

  /* ---------- customisation, always sanitised before drawing ---------- */
  const keyOf = (list, v) => (list.find(x => x[0] === v) || list[0])[0];
  const entry = (list, v) => list.find(x => x[0] === v) || list[0];
  const hex = (v, fb) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fb);
  const clampInt = (v, lo, hi, fb) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb; };
  function norm(cfg) {
    const c = cfg || {};
    const decor = Array.isArray(c.decor) ? DECOR.map(d => d[0]).filter(d => c.decor.includes(d)) : [];
    return {
      shape: keyOf(SHAPES, c.shape), sponge: keyOf(SPONGES, c.sponge), layers: clampInt(c.layers, 1, LAYER_MAX, 2),
      frostFlavor: keyOf(FROST_FLAVORS, c.frostFlavor), frost: hex(c.frost, FROST[0]), style: keyOf(STYLES, c.style),
      decor, candles: clampInt(c.candles, 0, CANDLE_MAX, 0),
      message: typeof c.message === 'string' ? c.message.slice(0, MSG_MAX) : '', place: keyOf(PLACES, c.place)
    };
  }

  /* ---------- three-quarter geometry ---------- */
  const K = 0.36, CX = 160, R = 96, SEG = 48;
  const LAYER_H = [0, 50, 38, 31, 27];
  const f1 = n => n.toFixed(1);
  const O = w => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const FOOT = {};
  /** Top-view outline of the tin as [x, z] points (z > 0 is towards the viewer), split into front and back chains. */
  function footprint(shape) {
    if (FOOT[shape]) return FOOT[shape];
    const pts = [];
    for (let i = 0; i < SEG; i++) {
      const t = i / SEG * Math.PI * 2;
      if (shape === 'heart') {
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push([Math.sin(t) ** 3, -(hy + 2.5) / 14.5]);
      } else if (shape === 'square') {
        const sx = Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** 0.3, sz = Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** 0.3, a = 0.45;
        pts.push([(sx * Math.cos(a) - sz * Math.sin(a)) * 0.74, (sx * Math.sin(a) + sz * Math.cos(a)) * 0.74]);
      } else pts.push([Math.cos(t), Math.sin(t)]);
    }
    const xs = pts.map(p => p[0]);
    const left = xs.indexOf(Math.min(...xs)), right = xs.indexOf(Math.max(...xs));
    const walk = (a, b) => { const out = []; for (let i = a; ; i = (i + 1) % SEG) { out.push(pts[i]); if (i === b) break; } return out; };
    const arcA = walk(left, right), arcB = walk(right, left);
    const avgZ = arr => arr.reduce((s, p) => s + p[1], 0) / arr.length;
    const aFront = avgZ(arcA) >= avgZ(arcB);
    const front = aFront ? arcA : arcB.slice().reverse(); // left → right
    const back = aFront ? arcB : arcA.slice().reverse(); // right → left
    FOOT[shape] = { pts, front, back };
    return FOOT[shape];
  }
  const P = (p, y, s) => [CX + p[0] * R * (s || 1), y + p[1] * R * K * (s || 1)];
  const line = (arr, y, s) => arr.map((p, i) => { const [x, yy] = P(p, y, s); return `${i ? 'L' : 'M'}${f1(x)} ${f1(yy)}`; }).join(' ');
  const face = (fp, y, s) => line(fp.pts, y, s) + ' Z';
  const side = (fp, yTop, yBot) => `${line(fp.front, yBot)} ${line(fp.back, yTop).replace(/^M/, 'L')} Z`;
  function geo(c) {
    const lh = LAYER_H[c.layers], total = lh * c.layers, base = 195 + total / 2;
    return { fp: footprint(c.shape), lh, base, top: base - total };
  }

  /* ---------- parts ---------- */
  function plate(g) {
    const y = g.base + 6, rx = R * 1.24, ry = rx * K;
    return `<ellipse cx="${CX}" cy="${f1(y + 13)}" rx="${f1(rx * 0.92)}" ry="${f1(ry * 0.62)}" fill="#e3d6c8" opacity=".6"/>
      <ellipse cx="${CX}" cy="${f1(y + 5)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#e6dcf3" ${O(2)}/>
      <ellipse cx="${CX}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#fffdf8" ${O(2)}/>`;
  }
  const seam = (fp, y) => `<path d="${line(fp.front, y)}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="${line(fp.front, y)}" fill="none" stroke="#fffaf0" stroke-width="5.5" stroke-linecap="round"/>`;
  function layers(c, g) {
    const s = entry(SPONGES, c.sponge), out = [];
    for (let i = 0; i < c.layers; i++) {
      const yb = g.base - i * g.lh, yt = yb - g.lh;
      const crumbs = [0.18, 0.42, 0.66, 0.86].map((t, j) => {
        const [x, y] = P(g.fp.front[Math.floor(t * (g.fp.front.length - 1))], yb - g.lh * (j % 2 ? 0.62 : 0.38));
        return `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.9" fill="${s[3]}"/>`;
      }).join('');
      out.push(`<path d="${side(g.fp, yt, yb)}" fill="${s[2]}" ${O(2.4)}/>${crumbs}${i > 0 ? seam(g.fp, yb) : ''}`);
    }
    return out;
  }
  function frosting(c, g) {
    const yt = g.top, ft = c.frost;
    const blobs = (arr, y, r) => arr.filter((p, i) => i % 2 === 0).map(p => { const [x, yy] = P(p, y); return `<circle cx="${f1(x)}" cy="${f1(yy)}" r="${r}" fill="${ft}" ${O(1.8)}/>`; }).join('');
    let drips = '', rim = '', border = '';
    if (c.style === 'drip') {
      const d = g.fp.front.filter((p, i) => i % 3 === 1).map((p, i) => {
        const [x, y] = P(p, yt);
        return `M${f1(x)} ${f1(y)} V${f1(y + 14 + Math.abs(Math.sin(i * 2.7)) * Math.min(24, g.lh * 0.7))}`;
      }).join(' ');
      drips = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${ft}" stroke-width="7" stroke-linecap="round"/>`;
    }
    if (c.style === 'ruffled') {
      rim = blobs(g.fp.back, yt - 5, 5.5) + blobs(g.fp.front, yt - 3, 6.5);
      border = blobs(g.fp.front, g.base, 6.5);
    }
    const shine = `<path d="${line(g.fp.front.slice(4, -4), yt - 5, 0.78)}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`;
    const cap = `<path d="${side(g.fp, yt - 5, yt + 7)}" fill="${ft}" ${O(2.4)}/><path d="${face(g.fp, yt - 5)}" fill="${ft}" ${O(2.4)}/>${shine}${rim}`;
    return { drips, cap, border };
  }

  const star = (cx, cy, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.5 : r; d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)} `; } return d + 'Z'; };
  function decoItem(type, x, y, i) {
    let inner = '';
    if (type === 'fruit') inner = i % 2
      ? `<circle cx="0" cy="-5" r="5.5" fill="#8f9fe0" ${O(1.6)}/><path d="M-1.5 -8.5 h3" stroke="${INK}" stroke-width="1.2"/>`
      : `<path d="M-7 -12 Q0 -16 7 -12 Q7 0 0 4 Q-7 0 -7 -12 Z" fill="#e66f8b" ${O(1.6)}/><path d="M-5 -13 L-2 -17 L0 -13 L2 -17 L5 -13" fill="#9fc77a" ${O(1.2)}/><circle cx="-2.5" cy="-6" r=".9" fill="#fff6c9"/><circle cx="2.5" cy="-4" r=".9" fill="#fff6c9"/><circle cx="0" cy="-9" r=".9" fill="#fff6c9"/>`;
    if (type === 'flowers') {
      const col = ['#f4b2bf', '#fffdf8', '#d9b8ec'][i % 3];
      inner = [0, 1, 2, 3, 4].map(k => { const a = -Math.PI / 2 + k * Math.PI * 0.4; return `<circle cx="${f1(Math.cos(a) * 4.6)}" cy="${f1(-5 + Math.sin(a) * 3.6)}" r="3.6" fill="${col}" ${O(1.2)}/>`; }).join('') + `<circle cx="0" cy="-5" r="2.4" fill="#f9cd7d" ${O(1)}/>`;
    }
    if (type === 'stars') inner = `<path d="M0 0 V-12" stroke="#d9b48a" stroke-width="2" stroke-linecap="round"/><path d="${star(0, -17, 8)}" fill="#f9cd7d" ${O(1.4)}/>`;
    return `<g transform="translate(${f1(x)} ${f1(y)})">${inner}</g>`;
  }
  function candle(x, y, i) {
    return `<g transform="translate(${f1(x)} ${f1(y)})"><rect x="-3.5" y="-30" width="7" height="30" rx="2" fill="${CANDLE_COLORS[i % CANDLE_COLORS.length]}" ${O(1.6)}/><path d="M-2.6 -22 L2.6 -25 M-2.6 -13 L2.6 -16 M-2.6 -4 L2.6 -7" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M0 -30 V-34" stroke="${INK}" stroke-width="1.4"/><path d="M0 -46 Q6 -38 0 -34 Q-6 -38 0 -46 Z" fill="#f9cd7d" ${O(1.4)}/><path d="M0 -41 Q2 -37 0 -36 Q-2 -37 0 -41 Z" fill="#fff3c4"/></g>`;
  }
  function messageItem(c, g) {
    const m = c.message.trim();
    if (!m) return null;
    const y0 = g.top - 5;
    if (c.place === 'plaque') {
      // stands at the back, tall enough to float above candle flames; painted last so nothing hides the words
      const fs = 13, w = Math.min(176, Math.max(56, m.length * fs * 0.56 + 22)), y = y0 - 0.3 * R * K, by = y0 - 46;
      return { z: 9, svg: `<g><path d="M${CX - 14} ${f1(y)} V${f1(by)} M${CX + 14} ${f1(y)} V${f1(by)}" stroke="#d9b48a" stroke-width="3" stroke-linecap="round"/><rect x="${f1(CX - w / 2)}" y="${f1(by - 28)}" width="${f1(w)}" height="28" rx="10" fill="#fffdf8" ${O(2)}/><text x="${CX}" y="${f1(by - 9.5)}" text-anchor="middle" ${FONT} font-size="${fs}" fill="${INK}">${esc(m)}</text></g>` };
    }
    const fs = Math.min(22, 170 / Math.max(1, m.length * 0.56));
    return { z: 9, svg: `<text transform="translate(${CX} ${f1(y0 + 0.05 * R * K + fs * 0.22)}) scale(1 .62)" text-anchor="middle" ${FONT} font-size="${f1(fs)}" fill="${INK}">${esc(m)}</text>` };
  }
  /** Everything that sits on the top face, each with a depth so we can paint back → front. */
  function topItems(c, g) {
    const y0 = g.top - 5, heart = c.shape === 'heart', zOff = heart ? -0.12 : 0, zs = heart ? 0.8 : 1;
    const at = (x, z) => [CX + x * R, y0 + z * R * K];
    const items = [];
    const deco = c.decor.filter(d => d !== 'candles');
    const msgTop = c.place === 'top' && c.message.trim(), slots = msgTop ? 12 : 8;
    if (deco.length) for (let i = 0; i < slots; i++) {
      const a = i / slots * Math.PI * 2 + (msgTop ? 0.26 : 0.35), rr = heart ? 0.52 : 0.62;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr * zs + zOff;
      if (heart && Math.abs(x) < 0.25 && z < 0) continue; // the heart's notch
      if (msgTop && Math.abs(Math.sin(a)) < 0.73) continue; // keep the written message clear
      items.push({ z, svg: decoItem(deco[i % deco.length], ...at(x, z), i) });
    }
    const n = c.decor.includes('candles') ? c.candles : 0;
    const msg = c.message.trim() ? c.place : '';
    for (let i = 0; i < n; i++) {
      let x = 0, z = zOff;
      if (n > 1 || msg) {
        const [a0, a1] = msg === 'top' ? [Math.PI + 0.35, Math.PI * 2 - 0.35] : msg === 'plaque' ? [0.35, Math.PI - 0.35] : [0.2, 0.2 + Math.PI * 2 * (n - 1) / n];
        const a = a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1)), rr = msg ? 0.42 : 0.34;
        x = Math.cos(a) * rr; z = Math.sin(a) * rr * zs + zOff;
      }
      items.push({ z, svg: candle(...at(x, z), i) });
    }
    const m = messageItem(c, g);
    if (m) items.push(m);
    return [...items].sort((a, b) => a.z - b.z).map(it => it.svg);
  }
  function compose(cfg) {
    const c = norm(cfg), g = geo(c), fr = frosting(c, g);
    return { c, g, plate: plate(g), layers: layers(c, g), drips: fr.drips, cap: fr.cap, border: fr.border, items: topItems(c, g) };
  }
  const ariaLabel = c => esc(tr('A {flavor} cake with {layers} layers', { flavor: tr(entry(SPONGES, c.sponge)[1]), layers: c.layers }));
  function draw(cfg) {
    const p = compose(cfg);
    return `<svg class="pw-treat-svg" viewBox="0 0 320 320" role="img" aria-label="${ariaLabel(p.c)}">${p.plate}${p.layers.join('')}${p.drips}${p.cap}${p.border}${p.items.join('')}</svg>`;
  }

  /* ---------- steps ---------- */
  const chips = (name, list, value) => `<div class="pw-chips">${list.map(([v, l]) => `<label class="pw-chip-radio"><input type="radio" name="${name}" value="${v}" ${value === v ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`;
  const onRadio = (el, name, set) => el.querySelectorAll(`input[name="${name}"]`).forEach(r => r.onchange = () => set({ [name]: r.value }));
  const swatches = (name, value) => `<div class="pw-swatches">${FROST.map((c, i) => `<label class="pw-swatch" style="--sw:${c}"><input type="radio" name="${name}" value="${c}" ${value === c ? 'checked' : ''}><span class="pw-visually-hidden">${tr(FROST_NAMES[i])}</span></label>`).join('')}</div>`;
  const steps = [
    { id: 'shape', label: N('Choose your cake shape'), render: cfg => `<p class="choice-description">${tr('Which shape feels like peace today?')}</p>${chips('shape', SHAPES, norm(cfg).shape)}`, bind: (el, cfg, set) => onRadio(el, 'shape', set) },
    { id: 'sponge', label: N('Pick your sponge'), render: cfg => `<p class="choice-description">${tr('Every layer is baked with this flavor.')}</p>${chips('sponge', SPONGES, norm(cfg).sponge)}`, bind: (el, cfg, set) => onRadio(el, 'sponge', set) },
    { id: 'layers', label: N('Stack your layers'),
      render: cfg => { const n = norm(cfg).layers; return `<div class="pw-field"><label for="pw-cake-layers">${tr('How many layers?')}</label><input type="range" id="pw-cake-layers" min="1" max="${LAYER_MAX}" step="1" value="${n}"><span class="char-count" data-count>${tr(LAYER_NAMES[n - 1])}</span></div><p class="choice-description">${tr('A soft cream filling goes between every layer.')}</p>`; },
      bind: (el, cfg, set) => { const r = el.querySelector('#pw-cake-layers'); r.oninput = () => { const n = clampInt(r.value, 1, LAYER_MAX, 2); set({ layers: n }); el.querySelector('[data-count]').textContent = tr(LAYER_NAMES[n - 1]); }; } },
    { id: 'frosting', label: N('Spread the frosting'),
      render: cfg => { const c = norm(cfg); return `${chips('frostFlavor', FROST_FLAVORS, c.frostFlavor)}<p class="choice-description">${tr('Frosting color')}</p>${swatches('frost', c.frost)}<p class="choice-description">${tr('Frosting style')}</p>${chips('style', STYLES, c.style)}`; },
      bind: (el, cfg, set) => { onRadio(el, 'frostFlavor', set); onRadio(el, 'frost', set); onRadio(el, 'style', set); } },
    { id: 'decor', label: N('Decorate your cake'),
      render: cfg => { const c = norm(cfg); return `<p class="choice-description">${tr('Choose as many as you like.')}</p><div class="pw-chips">${DECOR.map(([v, l]) => `<label class="pw-chip-radio"><input type="checkbox" name="decor" value="${v}" ${c.decor.includes(v) ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>
        <div class="pw-field"><label for="pw-cake-candles">${tr('How many candles?')}</label><input type="range" id="pw-cake-candles" min="0" max="${CANDLE_MAX}" step="1" value="${c.decor.includes('candles') ? c.candles : 0}"><span class="char-count" data-count>${c.decor.includes('candles') ? c.candles : 0}</span></div>`; },
      bind: (el, cfg, set) => {
        const boxes = [...el.querySelectorAll('input[name=decor]')], range = el.querySelector('#pw-cake-candles'), out = el.querySelector('[data-count]');
        const candleBox = boxes.find(b => b.value === 'candles');
        const push = () => set({ decor: boxes.filter(b => b.checked).map(b => b.value), candles: clampInt(range.value, 0, CANDLE_MAX, 0) });
        boxes.forEach(b => b.onchange = () => {
          if (b === candleBox) { range.value = b.checked ? (+range.value || 3) : 0; out.textContent = range.value; }
          push();
        });
        range.oninput = () => { out.textContent = range.value; candleBox.checked = +range.value > 0; push(); };
      } },
    { id: 'message', label: N('Write a cake message'),
      render: cfg => { const c = norm(cfg); return `<div class="pw-field"><label for="pw-cake-msg">${tr('A few words for your cake')} <span>${tr('(optional)')}</span></label><input id="pw-cake-msg" maxlength="${MSG_MAX}" value="${esc(c.message)}" placeholder="${tr('Peace & love')}" autocomplete="off"><span class="char-count">${c.message.length} / ${MSG_MAX}</span></div>${chips('place', PLACES, c.place)}`; },
      bind: (el, cfg, set) => {
        const i = el.querySelector('#pw-cake-msg');
        i.oninput = () => { const v = i.value.slice(0, MSG_MAX); set({ message: v }); el.querySelector('.char-count').textContent = `${v.length} / ${MSG_MAX}`; };
        onRadio(el, 'place', set);
      } }
  ];

  /* ---------- reveal: layers stack → frosting spreads → decorations drop → turntable turn ---------- */
  async function reveal(stageEl, cfg) {
    if (W.reduceMotion() || document.hidden) { stageEl.innerHTML = draw(cfg); return; }
    const p = compose(cfg), top = p.g.top;
    const origin = `transform-box:view-box;transform-origin:${CX}px ${f1(top)}px`;
    const g = (cls, inner, style) => `<g class="${cls}" style="${style}">${inner}</g>`;
    stageEl.innerHTML = `<svg class="pw-treat-svg" viewBox="0 0 320 320" aria-hidden="true">${p.plate}${p.layers.map(l => g('pw-cake-layer', l, 'opacity:0;transform-box:fill-box;transform-origin:50% 100%')).join('')}${g('pw-cake-drips', p.drips, 'opacity:0;' + origin)}${g('pw-cake-frost', p.cap + p.border, 'opacity:0;' + origin)}${p.items.map(s => g('pw-cake-drop', s, 'opacity:0;transform-box:fill-box;transform-origin:50% 100%')).join('')}</svg>`;
    const svg = stageEl.firstElementChild;
    const anim = (el, frames, opts) => el.animate(frames, { fill: 'both', ...opts }).finished;
    const layerEls = [...svg.querySelectorAll('.pw-cake-layer')];
    for (const layer of layerEls) {
      await anim(layer, [{ transform: 'translateY(-150px)', opacity: 0 }, { transform: 'translateY(4px)', opacity: 1, offset: 0.75 }, { transform: 'translateY(0)', opacity: 1 }], { duration: Math.min(360, 1000 / layerEls.length), easing: 'cubic-bezier(.3,.7,.4,1)' });
    }
    svg.insertAdjacentHTML('beforeend', `<path class="pw-cake-pipe" d="${face(p.g.fp, top - 5)}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>`);
    const pipe = svg.querySelector('.pw-cake-pipe'), len = pipe.getTotalLength ? pipe.getTotalLength() : 600;
    await Promise.all([
      anim(svg.querySelector('.pw-cake-frost'), [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 650, easing: 'ease-out' }),
      anim(pipe, [{ strokeDasharray: `${len}`, strokeDashoffset: `${len}` }, { strokeDasharray: `${len}`, strokeDashoffset: '0' }], { duration: 700, easing: 'ease-in-out' })
    ]);
    pipe.remove();
    if (p.drips) await anim(svg.querySelector('.pw-cake-drips'), [{ transform: 'scaleY(0)', opacity: 1 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 380, easing: 'ease-out' });
    const drops = [...svg.querySelectorAll('.pw-cake-drop')], gap = Math.min(90, 500 / Math.max(1, drops.length));
    await Promise.all(drops.map((d, i) => anim(d, [{ transform: 'translateY(-70px)', opacity: 0 }, { transform: 'translateY(5px)', opacity: 1, offset: 0.7 }, { transform: 'translateY(-2px)', opacity: 1, offset: 0.85 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 600, delay: i * gap, easing: 'ease-in' })));
    stageEl.innerHTML = draw(cfg);
    const fin = stageEl.firstElementChild;
    fin.style.transformOrigin = '50% 60%';
    await fin.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(.78) translateX(-4px)', offset: 0.3 }, { transform: 'scaleX(1.03)', offset: 0.6 }, { transform: 'scaleX(.95) translateX(2px)', offset: 0.8 }, { transform: 'scaleX(1)' }], { duration: 900, easing: 'ease-in-out' }).finished;
  }

  /* ---------- suggestions from the reflection ---------- */
  const FEEL = {
    calm: { sponge: 'matcha', frostFlavor: 'whipped', style: 'smooth', decor: ['flowers'] },
    cozy: { sponge: 'chocolate', frostFlavor: 'ganache', frost: '#b0816a', style: 'drip', decor: ['fruit'] },
    bright: { sponge: 'lemon', frostFlavor: 'buttercream', style: 'ruffled', decor: ['stars'] },
    free: { sponge: 'strawberry', frostFlavor: 'berry', style: 'ruffled', decor: ['flowers', 'fruit'] }
  };
  const WHO = { family: { layers: 3, candles: 5, shape: 'round' }, friends: { layers: 4, candles: 8, shape: 'square' }, someone: { layers: 2, candles: 2, shape: 'heart' }, me: { layers: 1, candles: 1, shape: 'round' } };

  D.register('cake', {
    holder: 'slice',
    defaults: () => ({ shape: 'round', sponge: 'vanilla', layers: 2, frostFlavor: 'buttercream', frost: '#f4b2bf', style: 'ruffled', decor: ['fruit', 'candles'], candles: 3, message: '', place: 'top' }),
    steps, draw: cfg => draw(cfg), mini: cfg => draw(cfg), reveal,
    ingredients: cfg => {
      const c = norm(cfg);
      return [SPONGE_ING[c.sponge], LAYER_NAMES[c.layers - 1], TIN_ING[c.shape], entry(FROST_FLAVORS, c.frostFlavor)[1], STYLE_ING[c.style], ...c.decor.filter(d => d !== 'candles' || c.candles > 0).map(d => DECOR_ING[d])];
    },
    suggest: a => {
      const feel = FEEL[a.feeling] || {}, who = WHO[a.who] || {};
      const decor = a.who ? [...(feel.decor || ['fruit']), 'candles'] : feel.decor;
      return { ...feel, ...who, ...(decor ? { decor } : {}), ...(a.color && D.COLORS.includes(a.color) ? { frost: a.color } : {}) };
    },
    nameWords: cfg => {
      const c = norm(cfg);
      const nouns = c.layers >= 3 ? [N('Hug'), N('Tower of Kindness'), N('Celebration Cake')] : { heart: [N('Heart Cake'), N('Love Note Cake')], square: [N('Picnic Cake'), N('Gathering Cake')], round: [N('Hug'), N('Sunday Cake')] }[c.shape];
      return { adj: [N('Layered'), N('Gentle'), N('Warm'), N('Sweet'), N('Dreamy'), N('Soft')], noun: nouns };
    }
  });
})(window);
