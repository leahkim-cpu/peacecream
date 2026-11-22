/* Cupcake builder — "A Little Celebration".
 * Base → frosting → pipe swirls → toppings → wrapper → tiny topper.
 * Reveal: the cake rises out of its wrapper → frosting swirls tier by tier → toppings appear → a small bounce. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, D = root.PeaceDesserts;
  const N = s => s; // marks English UI strings for translation extraction
  const INK = '#612335';
  const BASES = [['vanilla', N('Vanilla'), '#f0c98a', '#d9a764'], ['chocolate', N('Chocolate'), '#9a6a50', '#74493a'], ['redvelvet', N('Red velvet'), '#c4606a', '#9c4450'], ['matcha', N('Matcha'), '#b9cf8d', '#93ad6a']];
  const FROST_FLAVORS = [['vanilla', N('Vanilla buttercream')], ['strawberry', N('Strawberry cream')], ['chocolate', N('Chocolate frosting')], ['creamcheese', N('Cream cheese frosting')], ['honey', N('Honey whip')]];
  const FROST = ['#fffdf8', ...D.COLORS, '#b0816a'];
  const FROST_NAMES = [N('cream'), ...D.COLOR_NAMES, N('cocoa')];
  const TOPPINGS = [['sprinkles', N('Sprinkles')], ['cherry', N('A cherry')], ['star', N('A sugar star')], ['heart', N('A little heart')], ['flower', N('A frosting flower')], ['pearls', N('Sugar pearls')]];
  const PATTERNS = [['striped', N('Striped')], ['dots', N('Polka dot')], ['scalloped', N('Scalloped')], ['plain', N('Plain')]];
  const WRAP = ['#fffdf8', ...D.COLORS];
  const WRAP_NAMES = [N('cream'), ...D.COLOR_NAMES];
  const TOPPER_SHAPES = [['flag', N('A little flag')], ['pick', N('A round pick')]];
  const BASE_ING = { vanilla: N('Vanilla cupcake'), chocolate: N('Chocolate cupcake'), redvelvet: N('Red velvet cupcake'), matcha: N('Matcha cupcake') };
  const TIER_ING = [N('One frosting swirl'), N('Two frosting swirls'), N('Three frosting swirls'), N('Four frosting swirls')];
  const TOP_ING = { sprinkles: N('Rainbow sprinkles'), cherry: N('A cherry on top'), star: N('Sugar star'), heart: N('Sugar heart'), flower: N('Frosting flower'), pearls: N('Sugar pearls') };
  const WRAP_ING = { striped: N('Striped wrapper'), dots: N('Polka dot wrapper'), scalloped: N('Scalloped wrapper'), plain: N('Plain paper wrapper') };
  const TOPPER_ING = N('Tiny message topper');
  const SPR = ['#e66f8b', '#f3b54a', '#7fb6d8', '#9fc77a', '#b48ad6'];
  const FONT = `font-family="'Bradley Hand','Segoe Print','Hiragino Maru Gothic ProN','Yuanti SC',cursive"`;
  const TOPPER_MAX = 12, TIER_MAX = 4;

  /* ---------- customisation, always sanitised before drawing ---------- */
  const keyOf = (list, v) => (list.find(x => x[0] === v) || list[0])[0];
  const entry = (list, v) => list.find(x => x[0] === v) || list[0];
  const hex = (v, fb) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fb);
  const clampInt = (v, lo, hi, fb) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb; };
  function norm(cfg) {
    const c = cfg || {};
    return {
      base: keyOf(BASES, c.base), frostFlavor: keyOf(FROST_FLAVORS, c.frostFlavor), frost: hex(c.frost, FROST[0]),
      tiers: clampInt(c.tiers, 1, TIER_MAX, 2),
      toppings: Array.isArray(c.toppings) ? TOPPINGS.map(t => t[0]).filter(t => c.toppings.includes(t)) : [],
      pattern: keyOf(PATTERNS, c.pattern), wrap: hex(c.wrap, WRAP[0]),
      topper: typeof c.topper === 'string' ? c.topper.slice(0, TOPPER_MAX) : '', topperShape: keyOf(TOPPER_SHAPES, c.topperShape)
    };
  }

  /* ---------- geometry ---------- */
  const CX = 160, WT = 198, WB = 282, TW = 74, BW = 54;
  const TIER_W = [150, 124, 98, 70], TIER_H = 30, TIER_STEP = 25, TIER_BASE = 190;
  const f1 = n => n.toFixed(1);
  const O = w => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const rnd = i => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
  const tierBox = k => ({ w: TIER_W[k], yb: TIER_BASE - k * TIER_STEP, yt: TIER_BASE - k * TIER_STEP - TIER_H });
  const apexY = c => tierBox(c.tiers - 1).yt - 14;

  const shadow = `<ellipse cx="${CX}" cy="290" rx="72" ry="8" fill="#e3d6c8" opacity=".8"/>`;
  function dome(c) {
    const b = entry(BASES, c.base);
    const crumbs = [[-40, 188], [-12, 176], [22, 182], [48, 192], [-58, 196]].map(([dx, y]) => `<circle cx="${CX + dx}" cy="${y}" r="2" fill="${b[3]}"/>`).join('');
    return `<path d="M80 204 C72 148 248 148 240 204 Z" fill="${b[2]}" ${O(2.4)}/>${crumbs}`;
  }
  function wrapper(c) {
    const xt = i => CX - TW + i * (2 * TW / 7), xb = i => CX - BW + i * (2 * BW / 7);
    const top = c.pattern === 'scalloped'
      ? `M${CX - TW} ${WT}` + ' a10.57 8 0 0 1 21.14 0'.repeat(7)
      : `M${CX - TW} ${WT} Q${CX} ${WT + 9} ${CX + TW} ${WT}`;
    const ink = c.wrap === WRAP[0] ? '#f4b2bf' : '#fff';
    let deco = '';
    if (c.pattern === 'striped') for (let i = 0; i < 7; i += 2) deco += `<path d="M${f1(xt(i))} ${WT + 5} L${f1(xt(i + 1))} ${WT + 5} L${f1(xb(i + 1))} ${WB + 2} L${f1(xb(i))} ${WB + 2} Z" fill="${ink}" opacity=".5"/>`;
    if (c.pattern === 'dots') [214, 236, 258].forEach((y, r) => {
      const hw = TW - (y - WT) / (WB - WT) * (TW - BW) - 10;
      for (let x = CX - hw + (r % 2 ? 10 : 2); x <= CX + hw; x += 20) deco += `<circle cx="${f1(x)}" cy="${y}" r="3.6" fill="${ink}" opacity=".85"/>`;
    });
    if (c.pattern === 'scalloped') for (let i = 0; i < 7; i++) deco += `<circle cx="${f1(xt(i) + 10.57)}" cy="${WT + 4}" r="2" fill="${ink}"/>`;
    const pleats = [1, 2, 3, 4, 5, 6].map(i => `M${f1(xt(i))} ${WT + 5} L${f1(xb(i))} ${WB + 2}`).join(' ');
    return `<path d="${top} L${CX + BW} ${WB} Q${CX} ${WB + 9} ${CX - BW} ${WB} Z" fill="${c.wrap}" ${O(2.4)}/>${deco}<path d="${pleats}" stroke="${INK}" stroke-width="1.2" opacity=".35"/>`;
  }
  /** One frosting swirl tier; the last one gets the little curl on top. */
  function tier(c, k, extraStyle) {
    const { w, yb, yt } = tierBox(k), x0 = CX - w / 2, x1 = CX + w / 2;
    const d = `M${x0} ${yb} C${x0 - 10} ${f1(yb - TIER_H * 0.8)} ${f1(x0 + w * 0.15)} ${yt} ${CX} ${yt} C${f1(x1 - w * 0.15)} ${yt} ${x1 + 10} ${f1(yb - TIER_H * 0.8)} ${x1} ${yb} Q${CX} ${yb + 12} ${x0} ${yb} Z`;
    const tip = k === c.tiers - 1 ? `<path d="M${CX - 13} ${yt + 6} Q${CX - 8} ${yt - 14} ${CX + 6} ${yt - 18} Q${CX + 2} ${yt - 6} ${CX + 13} ${yt + 6} Z" fill="${c.frost}" ${O(2.2)}/>` : '';
    return `<g class="pw-cc-tier" data-tier="${k}" style="transform-box:fill-box;transform-origin:50% 100%${extraStyle ? ';' + extraStyle : ''}"><path d="${d}" fill="${c.frost}" ${O(2.4)}/><path d="M${x0 + 10} ${yb - 8} Q${CX} ${yt + 6} ${x1 - 14} ${yb - 12}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>${tip}</g>`;
  }
  const star = (cx, cy, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.5 : r; d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)} `; } return d + 'Z'; };
  const SOLO = {
    cherry: `<path d="M0 -17 Q2 -28 9 -33" fill="none" stroke="#7d5240" stroke-width="2.2" stroke-linecap="round"/><circle cx="0" cy="-9" r="10" fill="#e3536b" ${O(2)}/><ellipse cx="-3.5" cy="-12.5" rx="3" ry="2" fill="#fff" opacity=".7"/>`,
    star: `<path d="${star(0, -11, 12)}" fill="#f9cd7d" ${O(2)}/>`,
    heart: `<path d="M0 -1 C-14 -9 -10 -22 0 -16 C10 -22 14 -9 0 -1 Z" fill="#e66f8b" ${O(2)}/>`,
    flower: [0, 1, 2, 3, 4].map(k => { const a = -Math.PI / 2 + k * Math.PI * 0.4; return `<circle cx="${f1(Math.cos(a) * 6)}" cy="${f1(-9 + Math.sin(a) * 6)}" r="5" fill="#fffdf8" ${O(1.6)}/>`; }).join('') + `<circle cx="0" cy="-9" r="3.6" fill="#f9cd7d" ${O(1.4)}/>`
  };
  /** Each topping as its own group so the reveal can pop them in one by one. */
  function toppings(c) {
    const out = [], topK = c.tiers - 1;
    const scatter = (count, seed, mk) => {
      let s = '';
      for (let i = 0; i < count; i++) {
        const k = i % c.tiers, { w, yb } = tierBox(k);
        s += mk(CX + (rnd(i + seed) - 0.5) * w * 0.7, yb - TIER_H * (0.25 + rnd(i + seed + 40) * 0.45), i);
      }
      return s;
    };
    if (c.toppings.includes('sprinkles')) out.push(scatter(16, 1, (x, y, i) => `<rect x="${f1(x)}" y="${f1(y)}" width="7" height="2.6" rx="1.3" fill="${SPR[i % SPR.length]}" transform="rotate(${Math.round(rnd(i + 90) * 180)} ${f1(x)} ${f1(y)})"/>`));
    if (c.toppings.includes('pearls')) out.push(scatter(10, 200, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.2" fill="#fff" stroke="#e3d6c8" stroke-width="1"/>`));
    const slots = [[CX, apexY(c) + 6, 1]];
    for (let k = topK; k >= 0; k--) { const { w, yb } = tierBox(k); slots.push([CX - w * 0.3, yb - TIER_H * 0.45, 0.72], [CX + w * 0.3, yb - TIER_H * 0.5, 0.72]); }
    ['cherry', 'star', 'heart', 'flower'].filter(t => c.toppings.includes(t)).forEach((t, i) => {
      const [x, y, s] = slots[i] || [slots[0][0] + (i - slots.length + 1) * 16 - 8, slots[0][1] + 10, 0.85]; // more toppings than spots: tuck extras beside the top
      out.push(`<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${SOLO[t]}</g>`);
    });
    return out;
  }
  function topper(c) {
    const m = c.topper.trim();
    if (!m) return '';
    const tx = 218, ty = Math.max(60, apexY(c) + 6);
    const stick = `<path d="M198 ${TIER_BASE - 12} L${tx} ${f1(ty)}" stroke="#d9b48a" stroke-width="3" stroke-linecap="round"/>`;
    if (c.topperShape === 'pick') {
      const fs = Math.min(12, 40 / Math.max(1, m.length * 0.56));
      return `${stick}<circle cx="${tx}" cy="${f1(ty)}" r="24" fill="#fffdf8" ${O(2)}/><circle cx="${tx}" cy="${f1(ty)}" r="19" fill="none" stroke="${c.frost === FROST[0] ? '#f4b2bf' : c.frost}" stroke-width="2" stroke-dasharray="3 3"/><text x="${tx}" y="${f1(ty + fs * 0.35)}" text-anchor="middle" ${FONT} font-size="${f1(fs)}" fill="${INK}">${esc(m)}</text>`;
    }
    const fs = 11, w = Math.min(92, Math.max(34, m.length * fs * 0.58 + 16));
    return `${stick}<path d="M${tx} ${f1(ty)} h${f1(w)} l-8 11 l8 11 h${f1(-w)} Z" fill="#fffdf8" ${O(2)}/><text x="${f1(tx + (w - 8) / 2)}" y="${f1(ty + 15)}" text-anchor="middle" ${FONT} font-size="${fs}" fill="${INK}">${esc(m)}</text>`;
  }
  function compose(cfg) {
    const c = norm(cfg);
    return { c, dome: dome(c), wrapper: wrapper(c), tiers: Array.from({ length: c.tiers }, (_, k) => k), toppings: toppings(c), topper: topper(c) };
  }
  const ariaLabel = c => esc(tr('A {flavor} cupcake', { flavor: tr(entry(BASES, c.base)[1]) }));
  function draw(cfg) {
    const p = compose(cfg);
    return `<svg class="pw-treat-svg" viewBox="0 0 320 320" role="img" aria-label="${ariaLabel(p.c)}">${shadow}${p.dome}${p.wrapper}${p.tiers.map(k => tier(p.c, k)).join('')}${p.toppings.join('')}${p.topper}</svg>`;
  }

  /* ---------- steps ---------- */
  const chips = (name, list, value) => `<div class="pw-chips">${list.map(([v, l]) => `<label class="pw-chip-radio"><input type="radio" name="${name}" value="${v}" ${value === v ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`;
  const onRadio = (el, name, set) => el.querySelectorAll(`input[name="${name}"]`).forEach(r => r.onchange = () => set({ [name]: r.value }));
  const swatches = (name, value, colors, names) => `<div class="pw-swatches">${colors.map((c, i) => `<label class="pw-swatch" style="--sw:${c}"><input type="radio" name="${name}" value="${c}" ${value === c ? 'checked' : ''}><span class="pw-visually-hidden">${tr(names[i])}</span></label>`).join('')}</div>`;
  const tierStatus = n => tr('{count} of 4 swirls', { count: n });
  /** Short piping animation on the swirl that was just added to the live preview. */
  function animateTier(el, k) {
    if (W.reduceMotion() || document.hidden) return;
    const host = (el.closest && el.closest('.create-grid')) || document;
    const t = host.querySelector(`.pw-treat-preview .pw-cc-tier[data-tier="${k}"]`);
    if (t && t.animate) t.animate([{ transform: 'scale(.3,.12)', opacity: 0 }, { transform: 'scale(1.08,1.12)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  const steps = [
    { id: 'base', label: N('Choose your cupcake base'), render: cfg => `<p class="choice-description">${tr('Which little cake will hold your celebration?')}</p>${chips('base', BASES, norm(cfg).base)}`, bind: (el, cfg, set) => onRadio(el, 'base', set) },
    { id: 'frosting', label: N('Choose your frosting'),
      render: cfg => { const c = norm(cfg); return `${chips('frostFlavor', FROST_FLAVORS, c.frostFlavor)}<p class="choice-description">${tr('Frosting color')}</p>${swatches('frost', c.frost, FROST, FROST_NAMES)}`; },
      bind: (el, cfg, set) => { onRadio(el, 'frostFlavor', set); onRadio(el, 'frost', set); } },
    { id: 'pipe', label: N('Pipe your frosting'),
      render: cfg => { const n = norm(cfg).tiers; return `<p class="choice-description">${tr('Each press pipes one more swirl of frosting, up to four.')}</p>
        <div class="pw-actions"><button type="button" class="button" data-pipe aria-disabled="${n >= TIER_MAX}">${tr('Pipe a swirl')} <span>✳</span></button><button type="button" class="button secondary" data-reset>${tr('Start over')}</button></div>
        <p class="choice-description" data-tier-status role="status" aria-live="polite">${tierStatus(n)}</p>`; },
      bind: (el, cfg, set) => {
        let tiers = norm(cfg).tiers;
        const pipeBtn = el.querySelector('[data-pipe]'), status = el.querySelector('[data-tier-status]');
        const update = msg => { pipeBtn.setAttribute('aria-disabled', String(tiers >= TIER_MAX)); status.textContent = msg || tierStatus(tiers); };
        pipeBtn.onclick = () => {
          if (tiers >= TIER_MAX) { update(tr('That’s as tall as a swirl can go! Press “Start over” to pipe again.')); return; }
          tiers += 1; set({ tiers }); update(); animateTier(el, tiers - 1);
        };
        el.querySelector('[data-reset]').onclick = () => { tiers = 1; set({ tiers }); update(tr('Back to a single swirl. Pipe away!')); animateTier(el, 0); };
      } },
    { id: 'toppings', label: N('Add toppings'),
      render: cfg => { const c = norm(cfg); return `<p class="choice-description">${tr('Choose as many as you like.')}</p><div class="pw-chips">${TOPPINGS.map(([v, l]) => `<label class="pw-chip-radio"><input type="checkbox" name="toppings" value="${v}" ${c.toppings.includes(v) ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`; },
      bind: (el, cfg, set) => el.querySelectorAll('input[name=toppings]').forEach(b => b.onchange = () => set({ toppings: [...el.querySelectorAll('input[name=toppings]:checked')].map(x => x.value) })) },
    { id: 'wrapper', label: N('Wrap it up'),
      render: cfg => { const c = norm(cfg); return `${chips('pattern', PATTERNS, c.pattern)}<p class="choice-description">${tr('Wrapper color')}</p>${swatches('wrap', c.wrap, WRAP, WRAP_NAMES)}`; },
      bind: (el, cfg, set) => { onRadio(el, 'pattern', set); onRadio(el, 'wrap', set); } },
    { id: 'topper', label: N('Add a tiny topper'),
      render: cfg => { const c = norm(cfg); return `<div class="pw-field"><label for="pw-cupcake-topper">${tr('A tiny word on a little pick')} <span>${tr('(optional)')}</span></label><input id="pw-cupcake-topper" maxlength="${TOPPER_MAX}" value="${esc(c.topper)}" placeholder="${tr('Yay!')}" autocomplete="off"><span class="char-count">${c.topper.length} / ${TOPPER_MAX}</span></div>${chips('topperShape', TOPPER_SHAPES, c.topperShape)}`; },
      bind: (el, cfg, set) => {
        const i = el.querySelector('#pw-cupcake-topper');
        i.oninput = () => { const v = i.value.slice(0, TOPPER_MAX); set({ topper: v }); el.querySelector('.char-count').textContent = `${v.length} / ${TOPPER_MAX}`; };
        onRadio(el, 'topperShape', set);
      } }
  ];

  /* ---------- reveal: rise → swirl tier by tier → toppings → bounce ---------- */
  async function reveal(stageEl, cfg) {
    if (W.reduceMotion() || document.hidden) { stageEl.innerHTML = draw(cfg); return; }
    const p = compose(cfg);
    const hidden = (cls, inner) => `<g class="${cls}" style="opacity:0;transform-box:fill-box;transform-origin:50% 100%">${inner}</g>`;
    stageEl.innerHTML = `<svg class="pw-treat-svg" viewBox="0 0 320 320" aria-hidden="true">${shadow}<g class="pw-cc-rise" style="opacity:0;transform-box:view-box;transform-origin:${CX}px 204px">${p.dome}</g>${hidden('pw-cc-wrap', p.wrapper)}${p.tiers.map(k => tier(p.c, k, 'opacity:0')).join('')}${p.toppings.map(t => hidden('pw-cc-dec', t)).join('')}${p.topper ? hidden('pw-cc-dec', p.topper) : ''}</svg>`;
    const svg = stageEl.firstElementChild;
    const anim = (el, frames, opts) => el.animate(frames, { fill: 'both', ...opts }).finished;
    await anim(svg.querySelector('.pw-cc-wrap'), [{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 320, easing: 'ease-out' });
    await anim(svg.querySelector('.pw-cc-rise'), [{ transform: 'scaleY(.15)', opacity: 1 }, { transform: 'scaleY(1.08)', opacity: 1, offset: 0.75 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 750, easing: 'cubic-bezier(.3,.7,.4,1)' });
    for (const t of svg.querySelectorAll('.pw-cc-tier')) {
      await anim(t, [{ transform: 'scale(.3,.12)', opacity: 0 }, { transform: 'scale(1.08,1.12)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    const decs = [...svg.querySelectorAll('.pw-cc-dec')];
    await Promise.all(decs.map((d, i) => anim(d, [{ transform: 'translateY(-30px) scale(.6)', opacity: 0 }, { transform: 'translateY(3px) scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 450, delay: i * 120, easing: 'ease-out' })));
    stageEl.innerHTML = draw(cfg);
    const fin = stageEl.firstElementChild;
    fin.style.transformOrigin = '50% 90%';
    await fin.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.03,.97)', offset: 0.4 }, { transform: 'translateY(0) scale(1.04,.95)', offset: 0.7 }, { transform: 'translateY(0) scale(1)' }], { duration: 550, easing: 'ease-out' }).finished;
  }

  /* ---------- suggestions from the reflection ---------- */
  const FEEL = {
    calm: { base: 'matcha', frostFlavor: 'vanilla', toppings: ['pearls', 'flower'], pattern: 'plain' },
    cozy: { base: 'chocolate', frostFlavor: 'chocolate', frost: '#b0816a', toppings: ['cherry', 'sprinkles'], pattern: 'scalloped' },
    bright: { base: 'vanilla', frostFlavor: 'honey', toppings: ['star', 'sprinkles'], pattern: 'striped' },
    free: { base: 'redvelvet', frostFlavor: 'strawberry', toppings: ['heart', 'sprinkles'], pattern: 'dots' }
  };
  const WHO = { family: { tiers: 3, topperShape: 'pick' }, friends: { tiers: 4, topperShape: 'flag' }, someone: { tiers: 2, topperShape: 'pick' }, me: { tiers: 1, topperShape: 'flag' } };

  D.register('cupcake', {
    holder: 'gift',
    defaults: () => ({ base: 'vanilla', frostFlavor: 'vanilla', frost: '#f4b2bf', tiers: 2, toppings: ['sprinkles', 'cherry'], pattern: 'striped', wrap: '#a9d3ef', topper: '', topperShape: 'flag' }),
    steps, draw: cfg => draw(cfg), mini: cfg => draw(cfg), reveal,
    ingredients: cfg => {
      const c = norm(cfg);
      return [BASE_ING[c.base], entry(FROST_FLAVORS, c.frostFlavor)[1], TIER_ING[c.tiers - 1], ...c.toppings.map(t => TOP_ING[t]), WRAP_ING[c.pattern], ...(c.topper.trim() ? [TOPPER_ING] : [])];
    },
    suggest: a => {
      const i = D.COLORS.indexOf(a.color);
      return { ...(FEEL[a.feeling] || {}), ...(WHO[a.who] || {}), ...(i >= 0 ? { frost: a.color, wrap: D.COLORS[(i + 5) % D.COLORS.length] } : {}) };
    },
    nameWords: cfg => {
      const c = norm(cfg);
      const special = { vanilla: N('Sunshine Cupcake'), chocolate: N('Cocoa Cuddle'), redvelvet: N('Velvet Wish'), matcha: N('Garden Cupcake') }[c.base];
      return { adj: [N('Little'), N('Tiny'), N('Happy'), N('Sweet'), N('Cheerful'), N('Gentle')], noun: [N('Celebration Cupcake'), special, N('Swirl of Joy')] };
    }
  });
})(window);
