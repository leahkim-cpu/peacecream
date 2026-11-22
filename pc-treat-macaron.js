/* Macaron builder — "Mix Your Memories".
 * Shell colours → filling → top-shell decoration → put the shells together (interactive) → little box.
 * Reveal: shells drift together → filling appears → shells close → the macaron gently bounces. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, D = root.PeaceDesserts;
  const N = s => s; // marks English UI strings for translation extraction
  const INK = '#612335', CREAM = '#fdf3e1', WHITE = '#fffdf8', COCOA = '#8a5a44', ROSE = '#f4b2bf';
  const SHELLS = [CREAM, ...D.COLORS];
  const SHELL_NAMES = [N('cream'), ...D.COLOR_NAMES];
  // aligned with SHELLS: cream, rose, honey, lemon, pistachio, mint, sky, lavender, lilac
  const SHELL_ING = [N('Cream almond shell'), N('Rose almond shell'), N('Honey almond shell'), N('Lemon almond shell'), N('Pistachio almond shell'), N('Mint almond shell'), N('Sky almond shell'), N('Lavender almond shell'), N('Lilac almond shell')];
  const FILLINGS = [['vanilla', N('Vanilla buttercream'), '#fff4dc'], ['strawberry', N('Strawberry jam'), '#e66f8b'], ['matcha', N('Matcha ganache'), '#a9c47f'], ['chocolate', N('Chocolate ganache'), COCOA], ['lemon', N('Lemon curd'), '#f8dc6c'], ['rose', N('Rose cream'), ROSE]];
  const PATTERNS = [['none', N('Plain and simple')], ['gold', N('Gold dust')], ['drizzle', N('Drizzle')], ['hearts', N('Tiny hearts')], ['halfdip', N('Half-dipped')]];
  const PATTERN_ING = { gold: N('Edible gold dust'), hearts: N('Tiny sugar hearts'), halfdip: N('Dark chocolate dip') };
  const COUNTS = [[1, N('Just one')], [3, N('A little tower of three')], [6, N('A box of six')]];
  const COUNT_ING = { 3: N('Tower of three'), 6: N('Box of six') };
  const SINGLE = { cx: 160, cy: 185, a: 102 }; // one macaron, apart or together, so the two views line up
  const GAP = 0.7; // how far the top shell floats above the filling when apart, as a fraction of a
  const DOME = 0.62, FOOT = 0.13, FILL = 0.22;

  /* ---------- safe readers (customisations may come from saved or shared data) ---------- */
  const pickKey = (list, v) => list.find(x => x[0] === v) || list[0];
  const shellOf = v => (SHELLS.includes(v) ? v : SHELLS[6]);
  const countOf = cfg => (COUNTS.some(c => c[0] === cfg.count) ? cfg.count : 1);
  const p = v => (+v).toFixed(1);
  const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
  let uid = 0;
  const nextId = () => `macaron-clip-${(uid = (uid + 1) % 1e6)}`;
  const heartPath = (cx, cy, r) => `M${p(cx)} ${p(cy + r * 0.85)} C${p(cx - r * 1.3)} ${p(cy + r * 0.05)} ${p(cx - r * 0.95)} ${p(cy - r * 1.05)} ${p(cx)} ${p(cy - r * 0.42)} C${p(cx + r * 0.95)} ${p(cy - r * 1.05)} ${p(cx + r * 1.3)} ${p(cy + r * 0.05)} ${p(cx)} ${p(cy + r * 0.85)} Z`;

  /* ---------- shell pieces ---------- */
  const domePath = (cx, yb, a, dir) => `M${p(cx - a)} ${p(yb)} C${p(cx - a)} ${p(yb + dir * a * DOME)} ${p(cx + a)} ${p(yb + dir * a * DOME)} ${p(cx + a)} ${p(yb)} Z`;
  /** The ruffled "foot" of a shell. dir = 1 hangs below yb (top shell), -1 rises above yb (bottom shell). */
  function footPath(cx, yb, a, dir) {
    const fh = a * FOOT, w = a * 1.9 / 12, edge = yb + dir * fh;
    let d = `M${p(cx - a * 0.95)} ${p(yb)} L${p(cx + a * 0.95)} ${p(yb)} L${p(cx + a * 0.95)} ${p(edge)}`;
    for (let i = 0; i < 12; i++) { const x = cx + a * 0.95 - i * w; d += ` Q${p(x - w / 2)} ${p(edge + dir * fh * 0.35)} ${p(x - w)} ${p(edge)}`; }
    return d + ' Z';
  }
  function foot(cx, yb, a, dir, color, sw) {
    let ticks = '';
    for (let i = 1; i < 12; i += 2) { const x = cx - a * 0.85 + i * a * 0.155; ticks += `<path d="M${p(x)} ${p(yb + dir * a * 0.03)} v${p(dir * a * 0.07)}" stroke="${mix(color, INK, 0.25)}" stroke-width="${p(a * 0.02)}" stroke-linecap="round"/>`; }
    return `<path d="${footPath(cx, yb, a, dir)}" fill="${mix(color, '#ffffff', 0.18)}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>${ticks}`;
  }
  function decoration(pattern, cx, yb, a, color) {
    const peak = yb - a * DOME * 0.75;
    if (pattern === 'gold') {
      let seed = 7, out = '';
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 22; i++) out += `<circle cx="${p(cx - a * 0.85 + rnd() * a * 1.7)}" cy="${p(peak + rnd() * (yb - peak))}" r="${p(a * (0.012 + rnd() * 0.016))}" fill="${i % 2 ? '#e2b04a' : '#f6d77a'}"/>`;
      return out;
    }
    if (pattern === 'drizzle') {
      let d = '';
      for (let i = 0; i <= 9; i++) d += `${i ? 'L' : 'M'}${p(cx - a + i * a * 0.222)} ${p(i % 2 ? peak + a * 0.06 : yb - a * 0.05)} `;
      return `<path d="${d}" fill="none" stroke="${color === CREAM ? COCOA : WHITE}" stroke-width="${p(a * 0.045)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (pattern === 'hearts') {
      const fill = color === ROSE ? WHITE : '#e66f8b';
      return [[-0.52, 0.16], [-0.18, 0.32], [0.18, 0.27], [0.52, 0.15], [0.0, 0.12]].map(([dx, dy]) => `<path d="${heartPath(cx + dx * a, yb - dy * a, a * 0.07)}" fill="${fill}"/>`).join('');
    }
    if (pattern === 'halfdip') return `<path d="M${p(cx + a * 0.05)} ${p(yb + 2)} L${p(cx + a * 0.32)} ${p(peak - 4)} L${p(cx + a + 4)} ${p(peak - 4)} L${p(cx + a + 4)} ${p(yb + 2)} Z" fill="${COCOA}"/>`;
    return '';
  }
  function topShell(cfg, cx, yb, a, sw) {
    const color = shellOf(cfg.shellTop), dome = domePath(cx, yb, a, -1);
    const pattern = pickKey(PATTERNS, cfg.pattern)[0];
    let out = foot(cx, yb, a, 1, color, sw) + `<path d="${dome}" fill="${color}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    if (pattern !== 'none') {
      const id = nextId();
      out += `<defs><clipPath id="${id}"><path d="${dome}"/></clipPath></defs><g clip-path="url(#${id})">${decoration(pattern, cx, yb, a, color)}</g><path d="${dome}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    }
    return out + `<path d="M${p(cx - a * 0.62)} ${p(yb - a * 0.14)} Q${p(cx - a * 0.48)} ${p(yb - a * 0.36)} ${p(cx - a * 0.16)} ${p(yb - a * 0.42)}" fill="none" stroke="#fff" stroke-width="${p(a * 0.05)}" stroke-linecap="round" opacity=".5"/>`;
  }
  function bottomShell(cfg, cx, yb, a, sw) {
    const color = shellOf(cfg.shellBottom);
    return `<path d="${domePath(cx, yb, a, 1)}" fill="${color}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>` + foot(cx, yb, a, -1, color, sw);
  }
  function filling(cfg, cx, cy, a, sw) {
    const [kind, , color] = pickKey(FILLINGS, cfg.filling), h = a * FILL;
    let out = `<rect x="${p(cx - a * 0.92)}" y="${p(cy - h / 2)}" width="${p(a * 1.84)}" height="${p(h)}" rx="${p(h / 2)}" fill="${color}" stroke="${INK}" stroke-width="${sw}"/>`;
    if (kind === 'vanilla' || kind === 'strawberry') {
      const dot = kind === 'vanilla' ? '#7d5240' : '#fde3e8';
      for (let i = 0; i < 9; i++) out += `<circle cx="${p(cx - a * 0.72 + i * a * 0.18)}" cy="${p(cy + (i % 2 ? -h * 0.15 : h * 0.15))}" r="${p(a * 0.013)}" fill="${dot}"/>`;
    } else out += `<path d="M${p(cx - a * 0.6)} ${p(cy - h * 0.18)} H${p(cx - a * 0.1)}" stroke="#fff" stroke-width="${p(a * 0.03)}" stroke-linecap="round" opacity=".55"/>`;
    return out;
  }

  /** One macaron, side view. opts: { apart: static gap between shells, anim: add transform-origin styles for animating } */
  function macaron(cfg, cx, cy, a, opts = {}) {
    const sw = p(Math.max(1.2, a * 0.025));
    const ybTop = cy - a * FILL / 2 - a * FOOT, ybBot = cy + a * FILL / 2 + a * FOOT;
    const midTop = (ybTop - a * DOME * 0.75 + ybTop + a * FOOT) / 2;
    const animStyle = origin => (opts.anim ? ` style="transform-box:fill-box;transform-origin:${origin}"` : '');
    const topAttr = opts.apart && !opts.anim ? ` transform="translate(0 ${p(-a * GAP)}) rotate(-6 ${p(cx)} ${p(midTop)})"` : '';
    return `<g class="pw-mac"${animStyle('center bottom')}>
      <g class="pw-mac-bot"${animStyle('center')}>${bottomShell(cfg, cx, ybBot, a, sw)}</g>
      <g class="pw-mac-fill"${animStyle('center')}>${filling(cfg, cx, cy, a, sw)}</g>
      <g class="pw-mac-top"${animStyle('center')}${topAttr}>${topShell(cfg, cx, ybTop, a, sw)}</g></g>`;
  }

  const plate = (cy, rx) => `<ellipse cx="160" cy="${cy}" rx="${rx}" ry="15" fill="#e3d6c8"/>`;
  const BOX_BACK = `<rect x="40" y="34" width="240" height="70" rx="14" fill="#d6e8f2" stroke="${INK}" stroke-width="2.5" transform="rotate(-4 160 70)"/>
    <path d="M160 78 C150 70 146 62 152 58 C156 55 160 60 160 62 C160 60 164 55 168 58 C174 62 170 70 160 78 Z" fill="#fff9ee" stroke="${INK}" stroke-width="1.5" transform="rotate(-4 160 70)"/>
    <rect x="24" y="92" width="272" height="182" rx="18" fill="#e6dcf3" stroke="${INK}" stroke-width="2.5"/>
    <rect x="36" y="104" width="248" height="158" rx="12" fill="#fff9ee" stroke="#d9c8ea" stroke-width="1.5"/>`;
  const BOX_FRONT = `<path d="M24 246 H296 V258 Q296 274 280 274 H40 Q24 274 24 258 Z" fill="#d6e8f2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const ariaLabel = cfg => esc(tr('A macaron with {filling}', { filling: tr(pickKey(FILLINGS, cfg.filling)[1]) }));
  const singleScene = (cfg, opts) => plate(276, 104) + macaron(cfg, SINGLE.cx, SINGLE.cy, SINGLE.a, opts);

  function draw(cfg) {
    const n = countOf(cfg);
    let body;
    if (!cfg.combined) body = singleScene(cfg, { apart: true });
    else if (n === 1) body = singleScene(cfg);
    else if (n === 3) body = plate(284, 92) + [[156, 236], [164, 158], [160, 80]].map(([x, y]) => macaron(cfg, x, y, 58)).join('');
    else body = BOX_BACK + [[86, 152], [160, 152], [234, 152], [86, 214], [160, 214], [234, 214]].map(([x, y]) => macaron(cfg, x, y, 36)).join('') + BOX_FRONT;
    return `<svg class="pw-treat-svg" viewBox="0 0 320 320" role="img" aria-label="${ariaLabel(cfg)}">${body}</svg>`;
  }
  const animScene = cfg => `<svg class="pw-treat-svg" viewBox="0 0 320 320" aria-hidden="true">${singleScene(cfg, { anim: true })}</svg>`;

  /* ---------- shared animation pieces ---------- */
  const gapPx = () => `translateY(${p(-SINGLE.a * GAP)}px) rotate(-6deg)`;
  const bounce = el => el.animate([
    { transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.06,.92)', offset: 0.2 },
    { transform: 'translateY(-16px) scale(.97,1.04)', offset: 0.5 }, { transform: 'translateY(0) scale(1.03,.97)', offset: 0.72 },
    { transform: 'translateY(-4px) scale(1,1)', offset: 0.86 }, { transform: 'translateY(0) scale(1,1)' }
  ], { duration: 720, easing: 'ease-in-out' }).finished;
  async function playCombine(stage, cfg) {
    if (!stage || W.reduceMotion() || document.hidden) return;
    stage.innerHTML = animScene(cfg);
    const svg = stage.firstElementChild;
    await svg.querySelector('.pw-mac-top').animate([{ transform: gapPx() }, { transform: 'translateY(4px) rotate(0deg)', offset: 0.75 }, { transform: 'translateY(0) rotate(0deg)' }], { duration: 650, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
    await bounce(svg.querySelector('.pw-mac'));
  }
  const previewOf = el => (el.closest('.pw-builder') || document).querySelector('.pw-treat-preview');

  /* ---------- steps ---------- */
  const chips = (name, list, value) => `<div class="pw-chips">${list.map(([v, l]) => `<label class="pw-chip-radio"><input type="radio" name="${name}" value="${v}" ${String(value) === String(v) ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`;
  const onRadio = (el, name, set, cast = v => v) => el.querySelectorAll(`input[name="${name}"]`).forEach(r => r.onchange = () => set({ [name]: cast(r.value) }));
  const swatches = (name, value) => `<div class="pw-swatches">${SHELLS.map((c, i) => `<label class="pw-swatch" style="--sw:${c}"><input type="radio" name="${name}" value="${c}" ${value === c ? 'checked' : ''}><span class="pw-visually-hidden">${tr(SHELL_NAMES[i])}</span></label>`).join('')}</div>`;
  const steps = [
    { id: 'shells', label: N('Color your shells'),
      render: cfg => `<p class="choice-description">${tr('Top shell')}</p>${swatches('shellTop', shellOf(cfg.shellTop))}<p class="choice-description">${tr('Bottom shell')}</p>${swatches('shellBottom', shellOf(cfg.shellBottom))}`,
      bind: (el, cfg, set) => { onRadio(el, 'shellTop', set); onRadio(el, 'shellBottom', set); } },
    { id: 'filling', label: N('Choose a filling'), render: cfg => `<p class="choice-description">${tr('What sweet memory goes in the middle?')}</p>${chips('filling', FILLINGS, pickKey(FILLINGS, cfg.filling)[0])}`, bind: (el, cfg, set) => onRadio(el, 'filling', set) },
    { id: 'pattern', label: N('Decorate the top shell'), render: cfg => chips('pattern', PATTERNS, pickKey(PATTERNS, cfg.pattern)[0]), bind: (el, cfg, set) => onRadio(el, 'pattern', set) },
    { id: 'combine', label: N('Put the shells together'),
      render: cfg => `<p class="choice-description">${tr('Your shells are ready. Bring them together over the filling.')}</p>
        <div class="pw-actions"><button type="button" class="button" data-combine>${cfg.combined ? tr('Put them together again') : tr('Put them together')}</button></div>
        <p class="choice-description" role="status" aria-live="polite" data-combine-status>${cfg.combined ? tr('Snug together. Perfect!') : tr('Your shells are waiting, a little apart.')}</p>`,
      bind: (el, cfg, set) => {
        let cur = cfg; // st.cfg is replaced on every set(), so keep our own up-to-date copy
        const btn = el.querySelector('[data-combine]'), status = el.querySelector('[data-combine-status]');
        btn.onclick = async () => {
          btn.disabled = true; status.textContent = tr('Closing the shells…');
          try { await playCombine(previewOf(el), cur); } catch (e) { /* the animation is decoration; the shells are still joined below */ }
          cur = { ...cur, combined: true }; set({ combined: true });
          btn.disabled = false; btn.textContent = tr('Put them together again'); status.textContent = tr('Snug together. Perfect!');
        };
      } },
    { id: 'box', label: N('Fill your little box'),
      render: cfg => `${cfg.combined ? '' : `<p class="choice-description">${tr('Your shells are still apart. Put them together in the step before to fill the box.')}</p>`}<p class="choice-description">${tr('How many macarons go in the box?')}</p>${chips('count', COUNTS, countOf(cfg))}`,
      bind: (el, cfg, set) => onRadio(el, 'count', set, Number) }
  ];

  /* ---------- reveal: shells move together → filling appears → shells close → gentle bounce ---------- */
  async function reveal(stageEl, cfg) {
    if (W.reduceMotion() || document.hidden) { stageEl.innerHTML = draw(cfg); return; }
    const put = html => { stageEl.innerHTML = html; return stageEl.firstElementChild; };
    let svg = put(animScene(cfg));
    const top = svg.querySelector('.pw-mac-top'), bot = svg.querySelector('.pw-mac-bot'), fill = svg.querySelector('.pw-mac-fill');
    const near = cfg.combined ? 'translateY(-46px) rotate(-4deg)' : gapPx();
    const fillAnim = fill.animate([{ opacity: 0, transform: 'scale(.2,.4)' }, { opacity: 1, transform: 'scale(1.08,1.1)', offset: 0.7 }, { opacity: 1, transform: 'scale(1,1)' }], { duration: 550, delay: 900, easing: 'ease-out', fill: 'both' });
    await Promise.all([
      top.animate([{ transform: 'translateY(-150px) rotate(-12deg)', opacity: 0 }, { transform: near, opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished,
      bot.animate([{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished
    ]);
    await fillAnim.finished;
    if (cfg.combined) {
      await top.animate([{ transform: near }, { transform: 'translateY(4px) rotate(0deg)', offset: 0.75 }, { transform: 'translateY(0) rotate(0deg)' }], { duration: 500, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
      await bounce(svg.querySelector('.pw-mac'));
    } else {
      // the shells were never joined in the builder, so they stay apart and simply float
      await top.animate([{ transform: near }, { transform: `translateY(${p(-SINGLE.a * GAP - 8)}px) rotate(-6deg)` }, { transform: near }], { duration: 700, easing: 'ease-in-out' }).finished;
    }
    if (countOf(cfg) === 1 || !cfg.combined) { put(draw(cfg)); return; }
    svg = put(draw(cfg));
    await svg.animate([{ transform: 'scale(.94)', opacity: 0.6 }, { transform: 'scale(1.03)', opacity: 1 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }).finished;
  }

  const NOUNS = {
    vanilla: N('Cloud Macaron'), strawberry: N('Berry Kiss'), matcha: N('Garden Macaron'),
    chocolate: N('Velvet Macaron'), lemon: N('Sunbeam Macaron'), rose: N('Petal Macaron')
  };

  D.register('macaron', {
    finalize: cfg => ({ ...cfg, combined: true }), // making the treat always closes the shells
    holder: 'box',
    defaults: () => ({ shellTop: '#a9d3ef', shellBottom: '#a9d3ef', filling: 'vanilla', pattern: 'none', combined: false, count: 1 }),
    steps, draw: cfg => draw(cfg), mini: cfg => draw({ ...cfg, count: 1 }), reveal,
    ingredients: cfg => {
      const shells = [...new Set([shellOf(cfg.shellTop), shellOf(cfg.shellBottom)])].map(c => SHELL_ING[SHELLS.indexOf(c)]);
      const pattern = pickKey(PATTERNS, cfg.pattern)[0];
      const deco = pattern === 'drizzle' ? (shellOf(cfg.shellTop) === CREAM ? N('Chocolate drizzle') : N('White chocolate drizzle')) : PATTERN_ING[pattern];
      return [...shells, pickKey(FILLINGS, cfg.filling)[1], ...(deco ? [deco] : []), ...(cfg.combined && COUNT_ING[countOf(cfg)] ? [COUNT_ING[countOf(cfg)]] : [])];
    },
    suggest: a => ({
      ...(a.color && SHELLS.includes(a.color) ? { shellTop: a.color, shellBottom: a.color } : {}),
      ...(a.feeling ? { filling: { calm: 'matcha', cozy: 'chocolate', bright: 'lemon', free: 'rose' }[a.feeling], pattern: { calm: 'none', cozy: 'drizzle', bright: 'gold', free: 'hearts' }[a.feeling] } : {}),
      ...(a.who ? { count: { family: 6, friends: 6, someone: 3, me: 1 }[a.who] || 1 } : {})
    }),
    nameWords: cfg => ({
      adj: [N('Whispering'), N('Dreamy'), N('Tender'), N('Blushing'), N('Starlit'), N('Moonlit'), N('Gentle')],
      noun: [NOUNS[pickKey(FILLINGS, cfg.filling)[0]], N('Macaron'), N('Little Macaron')]
    })
  });
})(window);
