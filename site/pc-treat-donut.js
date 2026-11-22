/* Donut builder — "Sprinkle Some Joy".
 * Shape → dough → dip in glaze (interactive) → toppings → glaze pattern → box.
 * Reveal: donut floats in → dips into glaze → toppings fall → gentle spin → settles in its box. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, D = root.PeaceDesserts;
  const N = s => s; // marks English UI strings for translation extraction
  const INK = '#612335';
  const SHAPES = [['ring', N('Ring')], ['filled', N('Filled round')], ['heart', N('Heart')], ['twist', N('Twist cruller')]];
  const FLAVORS = [['classic', N('Classic'), '#f0c98a', '#d9a764'], ['chocolate', N('Chocolate'), '#a7765c', '#7d5240'], ['matcha', N('Matcha'), '#bcd194', '#93ad6a'], ['strawberry', N('Strawberry'), '#f3b8bd', '#de8f98']];
  const CREAM = '#fffdf8', COCOA = '#8a5a44';
  const GLAZES = [CREAM, ...D.COLORS, COCOA];
  const GLAZE_NAMES = [N('cream'), ...D.COLOR_NAMES, N('cocoa')];
  // aligned with GLAZES: cream, rose, honey, lemon, pistachio, mint, sky, lavender, lilac, cocoa
  const GLAZE_ING = [N('Vanilla cream glaze'), N('Rose glaze'), N('Honey glaze'), N('Lemon glaze'), N('Pistachio glaze'), N('Mint glaze'), N('Sky blue glaze'), N('Lavender glaze'), N('Lilac glaze'), N('Chocolate glaze')];
  const TOPPINGS = [['sprinkles', N('Rainbow sprinkles')], ['nuts', N('Crushed nuts')], ['coconut', N('Coconut flakes')], ['marshmallows', N('Mini marshmallows')], ['chips', N('Chocolate chips')]];
  const PATTERNS = [['none', N('No pattern')], ['drizzle', N('Drizzle stripes')], ['dots', N('Polka dots')], ['swirl', N('Swirl')]];
  const COUNTS = [[1, N('Just one')], [3, N('A box of three')], [6, N('A box of six')]];
  const DOUGH_ING = { classic: N('Classic dough'), chocolate: N('Chocolate dough'), matcha: N('Matcha dough'), strawberry: N('Strawberry dough') };
  const SHAPE_ING = { ring: N('Ring shape'), filled: N('Filled round shape'), heart: N('Heart shape'), twist: N('Twisted cruller shape') };
  const COUNT_ING = { 3: N('Box of three'), 6: N('Box of six') };
  const SPR = ['#e66f8b', '#f3b54a', '#7fb6d8', '#9fc77a', '#b48ad6'];
  const MALLOW = ['#fde3e8', CREAM, '#e6dcf3', '#d6e8f2'];
  const DIP_DEPTH = 118; // how far the donut lowers into the bowl (SVG units)
  const GOLDEN = 2.39996; // golden angle, spreads toppings evenly

  /* ---------- safe readers (customisations may come from saved or shared data) ---------- */
  const pickKey = (list, v) => list.find(x => x[0] === v) || list[0];
  const glazeOf = cfg => (GLAZES.includes(cfg.glaze) ? cfg.glaze : GLAZES[1]);
  const countOf = cfg => (COUNTS.some(c => c[0] === cfg.count) ? cfg.count : 1);
  const toppingsOf = cfg => (Array.isArray(cfg.toppings) ? cfg.toppings : []).filter(t => TOPPINGS.some(x => x[0] === t));
  const p = v => (+v).toFixed(1);
  let uid = 0;
  const nextId = () => `donut-clip-${(uid = (uid + 1) % 1e6)}`;

  /* ---------- geometry ---------- */
  function polarPath(cx, cy, rf, steps = 72) {
    let d = '';
    for (let i = 0; i < steps; i++) { const a = i / steps * Math.PI * 2, r = rf(a); d += `${i ? 'L' : 'M'}${p(cx + Math.cos(a) * r)} ${p(cy + Math.sin(a) * r)} `; }
    return d + 'Z';
  }
  const circlePath = (cx, cy, r) => `M${p(cx - r)} ${p(cy)} A${p(r)} ${p(r)} 0 1 0 ${p(cx + r)} ${p(cy)} A${p(r)} ${p(r)} 0 1 0 ${p(cx - r)} ${p(cy)} Z`;
  const heartPath = (cx, cy, r) => `M${p(cx)} ${p(cy + r * 0.85)} C${p(cx - r * 1.3)} ${p(cy + r * 0.05)} ${p(cx - r * 0.95)} ${p(cy - r * 1.05)} ${p(cx)} ${p(cy - r * 0.42)} C${p(cx + r * 0.95)} ${p(cy - r * 1.05)} ${p(cx + r * 1.3)} ${p(cy + r * 0.05)} ${p(cx)} ${p(cy + r * 0.85)} Z`;
  function outerPath(shape, cx, cy, r) {
    if (shape === 'heart') return heartPath(cx, cy, r);
    if (shape === 'twist') return polarPath(cx, cy, a => r * (0.94 + 0.06 * Math.cos(10 * a)));
    return circlePath(cx, cy, r);
  }
  function holePath(shape, cx, cy, r, grow = 1) {
    if (shape === 'filled') return '';
    if (shape === 'heart') return heartPath(cx, cy + r * 0.02, r * 0.26 * grow);
    return circlePath(cx, cy, r * 0.3 * grow);
  }
  function glazePath(shape, cx, cy, r) {
    if (shape === 'heart') return heartPath(cx, cy - r * 0.03, r * 0.84);
    if (shape === 'twist') return polarPath(cx, cy, a => r * (0.78 + 0.03 * Math.cos(10 * a) + 0.025 * Math.sin(7 * a)));
    return polarPath(cx, cy, a => r * (0.83 + 0.035 * Math.sin(7 * a) + 0.015 * Math.sin(13 * a)));
  }
  /** Evenly spread points on the glazed area, as [dx, dy] fractions of r. */
  function spots(shape, count, turn) {
    const out = [], holed = shape !== 'filled';
    for (let i = 0; i < count; i++) {
      const a = i * GOLDEN + turn, t = (i * 0.618034) % 1;
      const rad = (holed ? 0.5 + t * 0.26 : 0.1 + t * 0.62) * (shape === 'heart' ? 0.85 : 1);
      const dx = Math.cos(a) * rad, dy = Math.sin(a) * rad;
      if (shape === 'heart' && dy < -0.25 && Math.abs(dx) < 0.3) continue; // the heart's top dip
      out.push([dx, dy, i]);
    }
    return out;
  }
  function arcPath(cx, cy, rr, a1, a2) {
    const x1 = cx + Math.cos(a1) * rr, y1 = cy + Math.sin(a1) * rr, x2 = cx + Math.cos(a2) * rr, y2 = cy + Math.sin(a2) * rr;
    return `M${p(x1)} ${p(y1)} A${p(rr)} ${p(rr)} 0 0 1 ${p(x2)} ${p(y2)}`;
  }

  /* ---------- pieces ---------- */
  function topping(kind, x, y, s, i) {
    const at = inner => `<g class="pw-top"><g transform="translate(${p(x)} ${p(y)}) rotate(${(i * 47) % 180})">${inner}</g></g>`;
    const thin = p(Math.max(0.6, s * 0.01));
    switch (kind) {
      case 'sprinkles': return at(`<rect x="${p(-s * 0.07)}" y="${p(-s * 0.022)}" width="${p(s * 0.14)}" height="${p(s * 0.045)}" rx="${p(s * 0.022)}" fill="${SPR[i % 5]}"/>`);
      case 'nuts': return at(`<path d="M${p(-s * 0.05)} ${p(-s * 0.01)} L${p(-s * 0.015)} ${p(-s * 0.045)} L${p(s * 0.04)} ${p(-s * 0.03)} L${p(s * 0.045)} ${p(s * 0.025)} L${p(-s * 0.02)} ${p(s * 0.04)} Z" fill="#d9a764" stroke="#a7765c" stroke-width="${thin}" stroke-linejoin="round"/>`);
      case 'coconut': { const d = `M${p(-s * 0.06)} 0 Q0 ${p(-s * 0.05)} ${p(s * 0.06)} 0`; return at(`<path d="${d}" fill="none" stroke="#e3d6c8" stroke-width="${p(s * 0.04)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${CREAM}" stroke-width="${p(s * 0.024)}" stroke-linecap="round"/>`); }
      case 'marshmallows': return at(`<rect x="${p(-s * 0.045)}" y="${p(-s * 0.045)}" width="${p(s * 0.09)}" height="${p(s * 0.09)}" rx="${p(s * 0.025)}" fill="${MALLOW[i % 4]}" stroke="${INK}" stroke-width="${thin}"/>`);
      case 'chips': return at(`<path d="M0 ${p(-s * 0.05)} Q${p(s * 0.045)} ${p(s * 0.03)} 0 ${p(s * 0.035)} Q${p(-s * 0.045)} ${p(s * 0.03)} 0 ${p(-s * 0.05)} Z" fill="#5b3a2e"/>`);
      default: return '';
    }
  }
  function toppingsSVG(list, shape, cx, cy, r) {
    if (!list.length) return '';
    const items = spots(shape, 18, 0.4).map(([dx, dy, i], k) => topping(list[k % list.length], cx + dx * r, cy + dy * r, r, i)).join('');
    return `<g class="pw-donut-tops">${items}</g>`;
  }
  function patternSVG(pattern, shape, cx, cy, r, glaze, glazeD) {
    const pc = glaze === CREAM ? COCOA : CREAM, sw = p(r * 0.045);
    let inner = '';
    if (pattern === 'drizzle') {
      for (let k = -2; k <= 2; k++) {
        const y = cy + k * r * 0.3; let d = `M${p(cx - r)} ${p(y)}`;
        for (let j = 0; j < 8; j++) d += ` Q${p(cx - r + (j + 0.5) * r / 4)} ${p(y + (j % 2 ? -1 : 1) * r * 0.09)} ${p(cx - r + (j + 1) * r / 4)} ${p(y)}`;
        inner += `<path d="${d}" fill="none" stroke="${pc}" stroke-width="${sw}" stroke-linecap="round"/>`;
      }
    } else if (pattern === 'dots') {
      inner = spots(shape, 14, 1.3).map(([dx, dy]) => `<circle cx="${p(cx + dx * r)}" cy="${p(cy + dy * r)}" r="${p(r * 0.045)}" fill="${pc}"/>`).join('');
    } else if (pattern === 'swirl') {
      const holed = shape !== 'filled', r0 = holed ? 0.42 : 0.08, span = holed ? 0.38 : 0.72;
      let d = '';
      for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * Math.PI * 4.5, rr = r * (r0 + t * span); d += `${i ? 'L' : 'M'}${p(cx + Math.cos(a) * rr)} ${p(cy + Math.sin(a) * rr)} `; }
      inner = `<path d="${d}" fill="none" stroke="${pc}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else return '';
    const id = nextId();
    return `<defs><clipPath id="${id}"><path d="${glazeD}" clip-rule="evenodd"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`;
  }

  /** One donut. opts: { glazed (default cfg.dipped), tops (default true), pattern (default true) } */
  function donut(cfg, cx, cy, r, opts = {}) {
    const shape = pickKey(SHAPES, cfg.shape)[0], fl = pickKey(FLAVORS, cfg.flavor), glaze = glazeOf(cfg);
    const glazed = opts.glazed === undefined ? !!cfg.dipped : opts.glazed;
    const sw = p(Math.max(1.2, r * 0.028));
    const stroke = `stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"`;
    let out = `<g class="pw-donut">
      <path d="${outerPath(shape, cx, cy + r * 0.07, r)} ${holePath(shape, cx, cy + r * 0.07, r)}" fill="${fl[3]}" fill-rule="evenodd"/>
      <path d="${outerPath(shape, cx, cy, r)} ${holePath(shape, cx, cy, r)}" fill="${fl[2]}" fill-rule="evenodd" ${stroke}/>`;
    if (shape === 'twist') {
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5, pt = (ang, k) => `${p(cx + Math.cos(ang) * r * k)} ${p(cy + Math.sin(ang) * r * k)}`;
        out += `<path d="M${pt(a, 0.33)} Q${pt(a + 0.35, 0.62)} ${pt(a + 0.15, 0.9)}" fill="none" stroke="${fl[3]}" stroke-width="${p(r * 0.035)}" stroke-linecap="round"/>`;
      }
    }
    if (!glazed) out += `<path d="${arcPath(cx, cy, r * 0.74, 3.5, 4.3)}" fill="none" stroke="#fff" stroke-width="${p(r * 0.05)}" stroke-linecap="round" opacity=".45"/>`;
    if (glazed) {
      const gd = `${glazePath(shape, cx, cy, r)} ${holePath(shape, cx, cy, r, 1.4)}`;
      out += `<path class="pw-glaze" d="${gd}" fill="${glaze}" fill-rule="evenodd" ${stroke}/>`;
      if (opts.pattern !== false && cfg.pattern && cfg.pattern !== 'none') {
        out += patternSVG(cfg.pattern, shape, cx, cy, r, glaze, gd) + `<path d="${gd}" fill="none" fill-rule="evenodd" ${stroke}/>`;
      }
      out += `<path d="${arcPath(cx, cy, r * 0.66, 3.6, 4.2)}" fill="none" stroke="#fff" stroke-width="${p(r * 0.055)}" stroke-linecap="round" opacity=".6"/>`;
    }
    if (opts.tops !== false) out += toppingsSVG(toppingsOf(cfg), shape, cx, cy, r);
    return out + '</g>';
  }

  const BOX_BACK = `<rect x="40" y="34" width="240" height="70" rx="14" fill="#f3c6ce" stroke="${INK}" stroke-width="2.5" transform="rotate(-4 160 70)"/>
    <path d="M160 78 C150 70 146 62 152 58 C156 55 160 60 160 62 C160 60 164 55 168 58 C174 62 170 70 160 78 Z" fill="#fff9ee" stroke="${INK}" stroke-width="1.5" transform="rotate(-4 160 70)"/>
    <rect x="24" y="92" width="272" height="182" rx="18" fill="#f9dcc4" stroke="${INK}" stroke-width="2.5"/>
    <rect x="36" y="104" width="248" height="158" rx="12" fill="#fff4e6" stroke="#e9cfa5" stroke-width="1.5"/>`;
  const BOX_FRONT = `<path d="M24 246 H296 V258 Q296 274 280 274 H40 Q24 274 24 258 Z" fill="#f3c6ce" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const PLATE = '<ellipse cx="160" cy="272" rx="110" ry="16" fill="#e3d6c8"/>';
  const BOX_SPOTS = { 3: { r: 38, pts: [[82, 176], [160, 176], [238, 176]] }, 6: { r: 34, pts: [[86, 148], [160, 148], [234, 148], [86, 214], [160, 214], [234, 214]] } };
  const ariaLabel = cfg => esc(tr('A {flavor} donut', { flavor: tr(pickKey(FLAVORS, cfg.flavor)[1]) }));

  function draw(cfg) {
    const n = countOf(cfg);
    const body = n === 1 ? PLATE + donut(cfg, 160, 156, 102)
      : BOX_BACK + BOX_SPOTS[n].pts.map(([x, y]) => donut(cfg, x, y, BOX_SPOTS[n].r)).join('') + BOX_FRONT;
    return `<svg class="pw-treat-svg" viewBox="0 0 320 320" role="img" aria-label="${ariaLabel(cfg)}">${body}</svg>`;
  }

  /* ---------- dipping scene (used by the "Dip it!" step and the reveal) ---------- */
  function dipScene(cfg, withBowl) {
    const back = withBowl ? `<g class="pw-bowl"><ellipse cx="160" cy="232" rx="112" ry="22" fill="#bcd6e6" stroke="${INK}" stroke-width="2.5"/><ellipse class="pw-pool" cx="160" cy="234" rx="100" ry="16" fill="${glazeOf(cfg)}" style="transform-box:fill-box;transform-origin:center"/></g>` : '';
    const front = withBowl ? `<g class="pw-bowl"><path d="M48 232 A112 22 0 0 0 272 232 Q266 304 160 306 Q54 304 48 232 Z" fill="#d6e8f2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M84 262 q76 22 152 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/></g>` : '';
    return `<svg class="pw-treat-svg" viewBox="0 0 320 320" aria-hidden="true">${back}<g class="pw-dunk" style="transform-box:view-box;transform-origin:160px 104px"><g class="pw-plain">${donut(cfg, 160, 104, 64, { glazed: false, tops: false })}</g><g class="pw-glazed" opacity="0">${donut(cfg, 160, 104, 64, { glazed: true, tops: false, pattern: false })}</g></g>${front}</svg>`;
  }
  async function dunk(svg) {
    const el = svg.querySelector('.pw-dunk'), down = `translateY(${DIP_DEPTH}px) rotate(-6deg)`;
    await el.animate([{ transform: 'translateY(0) rotate(0deg)' }, { transform: down }], { duration: 450, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished;
    const pool = svg.querySelector('.pw-pool');
    if (pool) pool.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,1.35)' }, { transform: 'scale(1,1)' }], { duration: 420, easing: 'ease-out' });
    svg.querySelector('.pw-plain').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
    await svg.querySelector('.pw-glazed').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'forwards' }).finished;
    await el.animate([{ transform: down }, { transform: 'translateY(-8px) rotate(3deg)' }, { transform: 'translateY(0) rotate(0deg)' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished;
  }
  async function playDip(stage, cfg) {
    if (!stage || W.reduceMotion() || document.hidden) return;
    stage.innerHTML = dipScene(cfg, true);
    await dunk(stage.firstElementChild);
  }
  const previewOf = el => (el.closest('.pw-builder') || document).querySelector('.pw-treat-preview');

  /* ---------- steps ---------- */
  const chips = (name, list, value) => `<div class="pw-chips">${list.map(([v, l]) => `<label class="pw-chip-radio"><input type="radio" name="${name}" value="${v}" ${String(value) === String(v) ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`;
  const onRadio = (el, name, set, cast = v => v) => el.querySelectorAll(`input[name="${name}"]`).forEach(r => r.onchange = () => set({ [name]: cast(r.value) }));
  const swatches = (name, value) => `<div class="pw-swatches">${GLAZES.map((c, i) => `<label class="pw-swatch" style="--sw:${c}"><input type="radio" name="${name}" value="${c}" ${value === c ? 'checked' : ''}><span class="pw-visually-hidden">${tr(GLAZE_NAMES[i])}</span></label>`).join('')}</div>`;
  const steps = [
    { id: 'shape', label: N('Choose a shape'), render: cfg => `<p class="choice-description">${tr('Which shape feels like peace today?')}</p>${chips('shape', SHAPES, pickKey(SHAPES, cfg.shape)[0])}`, bind: (el, cfg, set) => onRadio(el, 'shape', set) },
    { id: 'dough', label: N('Pick your dough'), render: cfg => chips('flavor', FLAVORS, pickKey(FLAVORS, cfg.flavor)[0]), bind: (el, cfg, set) => onRadio(el, 'flavor', set) },
    { id: 'dip', label: N('Dip it in glaze'),
      render: cfg => `<p class="choice-description">${tr('Pick a glaze color, then give your donut a dip.')}</p>${swatches('glaze', glazeOf(cfg))}
        <div class="pw-actions"><button type="button" class="button" data-dip>${cfg.dipped ? tr('Dip it again') : tr('Dip it!')}</button></div>
        <p class="choice-description" role="status" aria-live="polite" data-dip-status>${cfg.dipped ? tr('Glazed and glossy!') : tr('Your donut is waiting for its glaze.')}</p>`,
      bind: (el, cfg, set) => {
        let cur = cfg; // st.cfg is replaced on every set(), so keep our own up-to-date copy
        const update = patch => { cur = { ...cur, ...patch }; set(patch); };
        onRadio(el, 'glaze', update);
        const btn = el.querySelector('[data-dip]'), status = el.querySelector('[data-dip-status]');
        btn.onclick = async () => {
          btn.disabled = true; status.textContent = tr('Dipping…');
          try { await playDip(previewOf(el), cur); } catch (e) { /* the animation is decoration; the glaze is still applied below */ }
          update({ dipped: true });
          btn.disabled = false; btn.textContent = tr('Dip it again'); status.textContent = tr('Glazed and glossy!');
        };
      } },
    { id: 'toppings', label: N('Add toppings'), render: cfg => `<p class="choice-description">${tr('Choose as many as you like.')}</p><div class="pw-chips">${TOPPINGS.map(([v, l]) => `<label class="pw-chip-radio"><input type="checkbox" name="toppings" value="${v}" ${toppingsOf(cfg).includes(v) ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`,
      bind: (el, cfg, set) => el.querySelectorAll('input[name=toppings]').forEach(c => c.onchange = () => set({ toppings: [...el.querySelectorAll('input[name=toppings]:checked')].map(x => x.value) })) },
    { id: 'pattern', label: N('Decorate the glaze'), render: cfg => `${cfg.dipped ? '' : `<p class="choice-description">${tr('Patterns show once your donut is glazed.')}</p>`}${chips('pattern', PATTERNS, pickKey(PATTERNS, cfg.pattern)[0])}`, bind: (el, cfg, set) => onRadio(el, 'pattern', set) },
    { id: 'box', label: N('Fill your box'), render: cfg => `<p class="choice-description">${tr('How many donuts go in the box?')}</p>${chips('count', COUNTS, countOf(cfg))}`, bind: (el, cfg, set) => onRadio(el, 'count', set, Number) }
  ];

  /* ---------- reveal: float in → dip → toppings fall → gentle spin → settle ---------- */
  async function reveal(stageEl, cfg) {
    if (W.reduceMotion() || document.hidden) { stageEl.innerHTML = draw(cfg); return; }
    const put = html => { stageEl.innerHTML = html; return stageEl.firstElementChild; };
    const single = { ...cfg, count: 1 };
    let svg = put(dipScene(single, !!cfg.dipped));
    const dunkEl = svg.querySelector('.pw-dunk');
    svg.querySelectorAll('.pw-bowl').forEach(b => b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 }));
    await dunkEl.animate([{ transform: 'translateY(-90px)', opacity: 0 }, { transform: 'translateY(6px)', opacity: 1, offset: 0.75 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 450, easing: 'ease-out' }).finished;
    if (cfg.dipped) await dunk(svg);
    svg.querySelectorAll('.pw-bowl').forEach(b => b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'forwards' }));
    await dunkEl.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(46px) scale(1.5625)' }], { duration: 340, easing: 'ease-in-out', fill: 'forwards' }).finished;

    svg = put(`<svg class="pw-treat-svg" viewBox="0 0 320 320" aria-hidden="true">${PLATE}<g class="pw-spin" style="transform-box:view-box;transform-origin:160px 150px">${donut(single, 160, 150, 100)}</g></svg>`);
    const tops = [...svg.querySelectorAll('.pw-top')];
    await Promise.all(tops.map((t, i) => t.animate([{ transform: 'translateY(-170px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, delay: i * 15, easing: 'cubic-bezier(.3,.6,.4,1.2)', fill: 'backwards' }).finished));
    await svg.querySelector('.pw-spin').animate([{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(200deg) scale(1.04)' }, { transform: 'rotate(360deg) scale(1)' }], { duration: 700, easing: 'cubic-bezier(.45,0,.25,1)' }).finished;

    svg = put(draw(cfg));
    await svg.animate([{ transform: 'scale(.94)', opacity: 0.6 }, { transform: 'scale(1.03)', opacity: 1 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }).finished;
  }

  const SUGGEST_FEEL = {
    calm: { shape: 'ring', flavor: 'matcha', toppings: ['coconut'], pattern: 'swirl' },
    cozy: { shape: 'filled', flavor: 'chocolate', toppings: ['nuts', 'chips'], pattern: 'drizzle' },
    bright: { shape: 'heart', flavor: 'strawberry', toppings: ['sprinkles'], pattern: 'dots' },
    free: { shape: 'twist', flavor: 'classic', toppings: ['marshmallows', 'sprinkles'], pattern: 'swirl' }
  };
  const NOUNS = {
    ring: [N('Glaze Ring'), N('Halo Donut')], filled: [N('Cloud Donut'), N('Pillow Donut')],
    heart: [N('Heart Donut'), N('Sweetheart Donut')], twist: [N('Twirl Cruller'), N('Ribbon Twist')]
  };

  D.register('donut', {
    finalize: cfg => ({ ...cfg, dipped: true }), // making the treat always glazes it
    holder: 'box',
    defaults: () => ({ shape: 'ring', flavor: 'classic', glaze: '#f4b2bf', dipped: false, toppings: ['sprinkles'], pattern: 'none', count: 1 }),
    steps, draw: cfg => draw(cfg), mini: cfg => draw({ ...cfg, count: 1 }), reveal,
    ingredients: cfg => [
      DOUGH_ING[pickKey(FLAVORS, cfg.flavor)[0]], SHAPE_ING[pickKey(SHAPES, cfg.shape)[0]],
      ...(cfg.dipped ? [GLAZE_ING[GLAZES.indexOf(glazeOf(cfg))]] : []),
      ...toppingsOf(cfg).map(t => pickKey(TOPPINGS, t)[1]),
      ...(cfg.dipped && cfg.pattern !== 'none' && PATTERNS.some(x => x[0] === cfg.pattern) ? [pickKey(PATTERNS, cfg.pattern)[1]] : []),
      ...(COUNT_ING[countOf(cfg)] ? [COUNT_ING[countOf(cfg)]] : [])
    ],
    suggest: a => ({
      ...(a.color && GLAZES.includes(a.color) ? { glaze: a.color } : {}),
      ...(SUGGEST_FEEL[a.feeling] || {}),
      ...(a.who ? { count: { family: 6, friends: 6, someone: 3, me: 1 }[a.who] || 1 } : {})
    }),
    nameWords: cfg => ({
      adj: [N('Dreamy'), N('Gentle'), N('Golden'), N('Sugar-Kissed'), N('Tender'), N('Happy')],
      noun: [...NOUNS[pickKey(SHAPES, cfg.shape)[0]], N('Little Donut')]
    })
  });
})(window);
