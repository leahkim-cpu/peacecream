/* Cookie builder — "Bake Your Peace".
 * Shape → flavor → icing → decorations → message → baking tray.
 * Reveal: dough appears → cookie cutter → baking → icing → final cookie. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, D = root.PeaceDesserts;
  const N = s => s; // marks English UI strings for translation extraction
  const SHAPES = [['heart', N('Heart')], ['star', N('Star')], ['flower', N('Flower')], ['circle', N('Circle')]];
  const FLAVORS = [['vanilla', N('Vanilla'), '#f0c98a', '#d9a764'], ['chocolate', N('Chocolate'), '#a7765c', '#7d5240'], ['matcha', N('Matcha'), '#bcd194', '#93ad6a'], ['strawberry', N('Strawberry'), '#f3b8bd', '#de8f98']];
  const ICING = ['#fffdf8', ...D.COLORS];
  const ICING_NAMES = [N('cream'), ...D.COLOR_NAMES];
  const STYLES = [['full', N('Smooth icing')], ['outline', N('Piped outline')], ['drizzle', N('Zigzag drizzle')]];
  const DECOR = [['sprinkles', N('Rainbow sprinkles')], ['pearls', N('Sugar pearls')], ['hearts', N('Tiny hearts')], ['stars', N('Little stars')]];
  const LAYOUTS = [['row', N('In a row')], ['circle', N('In a circle')], ['scatter', N('Scattered')]];
  const SPR = ['#e66f8b', '#f3b54a', '#7fb6d8', '#9fc77a', '#b48ad6'];
  const DOUGH = { vanilla: N('Vanilla dough'), chocolate: N('Chocolate dough'), matcha: N('Matcha dough'), strawberry: N('Strawberry dough') };
  const CUTTER = { heart: N('Heart cutter'), star: N('Star cutter'), flower: N('Flower cutter'), circle: N('Circle cutter') };
  const hex = (v, fb) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fb);
  const pickOf = (list, v) => (list.some(x => x[0] === v) ? v : list[0][0]);
  let clipSeq = 0;
  const flavorOf = cfg => FLAVORS.find(f => f[0] === cfg.flavor) || FLAVORS[0];

  function shapePath(shape, cx, cy, r) {
    if (shape === 'heart') return `M${cx} ${cy + r * 0.85} C${cx - r * 1.3} ${cy + r * 0.05} ${cx - r * 0.95} ${cy - r * 1.05} ${cx} ${cy - r * 0.42} C${cx + r * 0.95} ${cy - r * 1.05} ${cx + r * 1.3} ${cy + r * 0.05} ${cx} ${cy + r * 0.85} Z`;
    if (shape === 'star') { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.5 : r; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `; } return d + 'Z'; }
    if (shape === 'flower') { let d = ''; for (let i = 0; i < 6; i++) { const a0 = i * Math.PI / 3, a1 = a0 + Math.PI / 3, am = a0 + Math.PI / 6; const p = a => `${(cx + Math.cos(a) * r * 0.62).toFixed(1)} ${(cy + Math.sin(a) * r * 0.62).toFixed(1)}`; d += `${i ? '' : 'M' + p(a0)} Q${(cx + Math.cos(am) * r * 1.25).toFixed(1)} ${(cy + Math.sin(am) * r * 1.25).toFixed(1)} ${p(a1)} `; } return d + 'Z'; }
    return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }

  /** One cookie as SVG markup. stage: 'dough' | 'cut' | 'baked' | 'iced' | 'done' */
  function cookie(cfg, cx, cy, r, stage) {
    const f = flavorOf(cfg), s = stage || 'done';
    const id = 'ckclip' + (++clipSeq);
    cfg = { ...cfg, shape: pickOf(SHAPES, cfg.shape), style: pickOf(STYLES, cfg.style), decor: Array.isArray(cfg.decor) ? cfg.decor.filter(d => DECOR.some(x => x[0] === d)).slice(0, 3) : [] };
    const raw = s === 'dough' || s === 'cut';
    const base = raw ? '#f6e3c3' : f[2], edge = raw ? '#e9cfa5' : f[3];
    let out = `<g class="pw-cookie">
      <path d="${shapePath(cfg.shape, cx, cy + r * 0.06, r)}" fill="${edge}" opacity=".9"/>
      <path d="${shapePath(cfg.shape, cx, cy, r)}" fill="${base}" stroke="#612335" stroke-width="${Math.max(1.2, r * 0.025)}" stroke-linejoin="round"/>`;
    if (!raw) for (let i = 0; i < 7; i++) out += `<circle cx="${(cx + Math.cos(i * 2.3) * r * 0.55).toFixed(1)}" cy="${(cy + Math.sin(i * 2.3) * r * 0.5).toFixed(1)}" r="${(r * 0.03).toFixed(1)}" fill="${edge}"/>`;
    if (s === 'iced' || s === 'done') {
      const ic = hex(cfg.icing, ICING[0]), ic2 = hex(cfg.icing2, ic);
      if (cfg.style === 'outline') out += `<path class="pw-icing" d="${shapePath(cfg.shape, cx, cy, r * 0.84)}" fill="none" stroke="${ic}" stroke-width="${r * 0.07}" stroke-linejoin="round" stroke-linecap="round"/>`;
      else if (cfg.style === 'drizzle') {
        let z = ''; for (let i = 0; i <= 8; i++) z += `${i ? 'L' : 'M'}${(cx - r * 0.7 + i * r * 0.175).toFixed(1)} ${(cy + (i % 2 ? r * 0.45 : -r * 0.45)).toFixed(1)} `;
        out += `<defs><clipPath id="${id}"><path d="${shapePath(cfg.shape, cx, cy, r * 0.9)}"/></clipPath></defs><path class="pw-icing" clip-path="url(#${id})" d="${z}" fill="none" stroke="${ic}" stroke-width="${r * 0.08}" stroke-linecap="round" stroke-linejoin="round"/>`;
      } else out += `<path class="pw-icing" d="${shapePath(cfg.shape, cx, cy - r * 0.02, r * 0.82)}" fill="${ic}" stroke="${ic2}" stroke-width="${r * 0.05}"/>`;
    }
    if (s === 'done') {
      const dec = cfg.decor || [];
      const spots = [[-0.45, -0.25], [0.4, -0.35], [0.5, 0.2], [-0.3, 0.42], [0.05, 0.5], [-0.55, 0.12], [0.2, -0.55], [0.6, -0.05]];
      dec.forEach((d, di) => spots.forEach(([dx, dy], i) => {
        if ((i + di) % dec.length) return;
        const px = (cx + dx * r).toFixed(1), py = (cy + dy * r).toFixed(1);
        if (d === 'sprinkles') out += `<rect x="${px}" y="${py}" width="${r * 0.13}" height="${r * 0.045}" rx="${r * 0.02}" fill="${SPR[i % 5]}" transform="rotate(${i * 47} ${px} ${py})"/>`;
        if (d === 'pearls') out += `<circle cx="${px}" cy="${py}" r="${r * 0.05}" fill="#fff" stroke="#e3d6c8" stroke-width="1"/>`;
        if (d === 'hearts') out += `<path d="${shapePath('heart', +px, +py, r * 0.07)}" fill="#e66f8b"/>`;
        if (d === 'stars') out += `<path d="${shapePath('star', +px, +py, r * 0.08)}" fill="#f3b54a"/>`;
      }));
      if (cfg.message) out += `<text x="${cx}" y="${cy + r * 0.1}" text-anchor="middle" font-family="'Bradley Hand','Segoe Print','Hiragino Maru Gothic ProN','Yuanti SC',cursive" font-size="${(r * (cfg.message.length > 6 ? 0.22 : 0.3)).toFixed(1)}" fill="#612335">${esc(cfg.message)}</text>`;
    }
    return out + '</g>';
  }
  function trayPositions(cfg) {
    const n = Math.max(1, Math.min(6, cfg.count || 1)), pts = [];
    for (let i = 0; i < n; i++) {
      if (cfg.layout === 'circle') { const a = i / n * Math.PI * 2 - Math.PI / 2; pts.push([160 + Math.cos(a) * 70, 165 + Math.sin(a) * 52]); }
      else if (cfg.layout === 'scatter') pts.push([[95, 120], [215, 112], [160, 175], [90, 215], [225, 210], [160, 248]][i]);
      else pts.push([70 + (i % 3) * 90, n > 3 ? 125 + Math.floor(i / 3) * 90 : 170]);
    }
    return pts;
  }
  function draw(cfg, stage) {
    const n = cfg.count || 1;
    const tray = n > 1 ? `<rect x="22" y="62" width="276" height="226" rx="20" fill="#d9dde3" stroke="#612335" stroke-width="2"/><rect x="34" y="74" width="252" height="202" rx="14" fill="#eceff2"/>` : `<ellipse cx="160" cy="268" rx="110" ry="16" fill="#e3d6c8"/>`;
    const body = n > 1 ? trayPositions(cfg).map(([x, y]) => cookie(cfg, x, y, 36, stage)).join('') : cookie(cfg, 160, 160, 105, stage);
    return `<svg class="pw-treat-svg" viewBox="0 0 320 320" role="img" aria-label="${esc(tr('A {flavor} cookie', { flavor: tr(flavorOf(cfg)[1]) }))}">${tray}${body}</svg>`;
  }

  /* ---------- steps ---------- */
  const chips = (name, list, value) => `<div class="pw-chips">${list.map(([v, l]) => `<label class="pw-chip-radio"><input type="radio" name="${name}" value="${v}" ${value === v ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`;
  const onRadio = (el, name, set) => el.querySelectorAll(`input[name="${name}"]`).forEach(r => r.onchange = () => set({ [name]: r.value }));
  const swatches = (name, value) => `<div class="pw-swatches">${ICING.map((c, i) => `<label class="pw-swatch" style="--sw:${c}"><input type="radio" name="${name}" value="${c}" ${value === c ? 'checked' : ''}><span class="pw-visually-hidden">${tr(ICING_NAMES[i])}</span></label>`).join('')}</div>`;
  const steps = [
    { id: 'shape', label: N('Choose a cookie cutter'), render: cfg => `<p class="choice-description">${tr('Which shape holds your peace today?')}</p>${chips('shape', SHAPES, cfg.shape)}`, bind: (el, cfg, set) => onRadio(el, 'shape', set) },
    { id: 'flavor', label: N('Pick your dough'), render: cfg => chips('flavor', FLAVORS, cfg.flavor), bind: (el, cfg, set) => onRadio(el, 'flavor', set) },
    { id: 'icing', label: N('Add some icing'), render: cfg => `${chips('style', STYLES, cfg.style)}<p class="choice-description">${tr('Icing color')}</p>${swatches('icing', cfg.icing)}<p class="choice-description">${tr('Edge color')}</p>${swatches('icing2', cfg.icing2)}`,
      bind: (el, cfg, set) => { onRadio(el, 'style', set); onRadio(el, 'icing', set); onRadio(el, 'icing2', set); } },
    { id: 'decor', label: N('Sprinkle a little joy'), render: cfg => `<p class="choice-description">${tr('Choose up to three decorations.')}</p><div class="pw-chips">${DECOR.map(([v, l]) => `<label class="pw-chip-radio"><input type="checkbox" name="decor" value="${v}" ${(cfg.decor || []).includes(v) ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`,
      bind: (el, cfg, set) => el.querySelectorAll('input[name=decor]').forEach(c => c.onchange = () => {
        const chosen = [...el.querySelectorAll('input[name=decor]:checked')].map(x => x.value);
        if (chosen.length > 3) { c.checked = false; toast(tr('Three decorations is the limit. Remove one to choose another.')); return; }
        set({ decor: chosen });
      }) },
    { id: 'message', label: N('Write a little message'), render: cfg => `<div class="pw-field"><label for="pw-cookie-msg">${tr('A word or two, piped in icing')} <span>${tr('(optional)')}</span></label><input id="pw-cookie-msg" maxlength="10" value="${esc(cfg.message || '')}" placeholder="${tr('Peace')}" autocomplete="off"><span class="char-count">${(cfg.message || '').length} / 10</span></div>`,
      bind: (el, cfg, set) => { const i = el.querySelector('input'); i.oninput = () => { set({ message: i.value.slice(0, 10) }); el.querySelector('.char-count').textContent = `${i.value.length} / 10`; }; } },
    { id: 'tray', label: N('Arrange your baking tray'), render: cfg => `<div class="pw-field"><label for="pw-cookie-count">${tr('How many cookies?')}</label><input type="range" id="pw-cookie-count" min="1" max="6" step="1" value="${cfg.count || 1}"><span class="char-count" data-count>${cfg.count || 1}</span></div>${chips('layout', LAYOUTS, cfg.layout)}`,
      bind: (el, cfg, set) => { const r = el.querySelector('#pw-cookie-count'); r.oninput = () => { set({ count: +r.value }); el.querySelector('[data-count]').textContent = r.value; }; onRadio(el, 'layout', set); } }
  ];

  /* ---------- reveal: dough → cutter → bake → icing → done ---------- */
  async function reveal(stageEl, cfg) {
    if (W.reduceMotion() || document.hidden) { stageEl.innerHTML = draw(cfg); return; }
    const single = { ...cfg, count: 1 };
    const set = html => { stageEl.innerHTML = html; return stageEl.firstElementChild; };
    let svg = set(`<svg class="pw-treat-svg" viewBox="0 0 320 320" aria-hidden="true"><ellipse cx="160" cy="268" rx="110" ry="16" fill="#e3d6c8"/><ellipse class="pw-dough" cx="160" cy="170" rx="118" ry="86" fill="#f6e3c3" stroke="#612335" stroke-width="2.5"/></svg>`);
    await svg.querySelector('.pw-dough').animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1 }, { transform: 'scale(1)' }], { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }).finished;
    svg.insertAdjacentHTML('beforeend', `<path class="pw-cutter" d="${shapePath(cfg.shape, 160, 160, 105)}" fill="none" stroke="#9aa3ad" stroke-width="9" stroke-linejoin="round"/>`);
    await svg.querySelector('.pw-cutter').animate([{ transform: 'translateY(-200px)' }, { transform: 'translateY(6px)' }, { transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'both' }).finished;
    svg = set(draw(single, 'cut'));
    const oven = document.createElement('div'); oven.className = 'pw-oven-glow'; stageEl.append(oven);
    await oven.animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: 1000, easing: 'ease-in-out' }).finished;
    svg = set(draw(single, 'baked'));
    await svg.animate([{ filter: 'brightness(1.25) saturate(.6)' }, { filter: 'none' }], { duration: 450, fill: 'both' }).finished;
    svg = set(draw(single, 'iced'));
    const icing = svg.querySelector('.pw-icing');
    if (icing && icing.getTotalLength) { const len = icing.getTotalLength(); await icing.animate([{ strokeDasharray: `${len}`, strokeDashoffset: `${len}`, fillOpacity: 0 }, { strokeDasharray: `${len}`, strokeDashoffset: '0', fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 900, easing: 'ease-out', fill: 'both' }).finished; }
    svg = set(draw(cfg));
    await svg.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' }).finished;
  }

  D.register('cookie', {
    holder: 'tray',
    defaults: () => ({ shape: 'heart', flavor: 'vanilla', style: 'full', icing: '#f4b2bf', icing2: '#fffdf8', decor: ['sprinkles'], message: '', count: 1, layout: 'row' }),
    steps, draw: cfg => draw(cfg), mini: cfg => draw({ ...cfg, count: 1 }), reveal,
    ingredients: cfg => [DOUGH[cfg.flavor] || DOUGH.vanilla, CUTTER[cfg.shape] || CUTTER.heart, (STYLES.find(s => s[0] === cfg.style) || STYLES[0])[1], ...(cfg.decor || []).map(d => (DECOR.find(x => x[0] === d) || ['', d])[1])],
    suggest: a => ({
      ...(a.color ? { icing: a.color } : {}),
      ...(a.feeling ? { shape: { calm: 'circle', cozy: 'heart', bright: 'star', free: 'flower' }[a.feeling], flavor: { calm: 'matcha', cozy: 'chocolate', bright: 'vanilla', free: 'strawberry' }[a.feeling] } : {}),
      ...(a.who ? { count: { family: 4, friends: 6, someone: 2, me: 1 }[a.who], layout: a.who === 'friends' ? 'circle' : 'row' } : {})
    }),
    nameWords: cfg => ({ adj: [N('Warm'), N('Gentle'), N('Sweet'), N('Golden'), N('Little')], noun: [{ heart: N('Heart Cookie'), star: N('Star Cookie'), flower: N('Blossom Cookie'), circle: N('Moon Cookie') }[cfg.shape] || N('Cookie')] })
  });
})(window);
