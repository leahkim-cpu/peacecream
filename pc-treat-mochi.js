/* Mochi builder — "A Soft Moment".
 * Colour → filling → fruit → decorations → mochi set on a little wooden board.
 * Reveal: dough sheet stretches → filling (and fruit) lands → dough wraps around → squishy bounce. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, D = root.PeaceDesserts;
  const N = s => s; // marks English UI strings for translation extraction
  const INK = '#612335';
  const WHITE = '#fdfaf4';
  const MAX_SET = 5;
  const MOCHI_COLORS = [WHITE, ...D.COLORS];
  const MOCHI_COLOR_NAMES = [N('snow white'), ...D.COLOR_NAMES];
  const DOUGH = [N('Snow-white mochi dough'), N('Rose mochi dough'), N('Honey mochi dough'), N('Lemon mochi dough'), N('Pistachio mochi dough'), N('Mint mochi dough'), N('Sky mochi dough'), N('Lavender mochi dough'), N('Lilac mochi dough')];
  // [value, label, ingredient, colour, speckle colour]
  const FILLINGS = [
    ['redbean', N('Sweet red bean'), N('Sweet red bean filling'), '#8e4f52', '#6e3539'],
    ['whitebean', N('White bean'), N('White bean filling'), '#f3ead8', '#e2d3b8'],
    ['matcha', N('Matcha cream'), N('Matcha cream filling'), '#b9cf8f', '#98b26c'],
    ['custard', N('Custard'), N('Vanilla custard filling'), '#f8db8e', '#efc566'],
    ['chocolate', N('Chocolate'), N('Chocolate filling'), '#86584a', '#6a4236'],
    ['icecream', N('Ice cream'), N('Vanilla ice cream filling'), '#fff3dc', '#f1e0bf']
  ];
  const FRUITS = [['strawberry', N('A whole strawberry'), N('A whole strawberry')], ['mango', N('Mango'), N('Ripe mango pieces')], ['orange', N('Orange segment'), N('An orange segment')], ['blueberry', N('Blueberries'), N('Fresh blueberries')], ['none', N('No fruit'), '']];
  const DECOR = [
    ['kinako', N('Kinako dusting'), N('Roasted kinako dusting')], ['sugar', N('Sugar dusting'), N('Powdered sugar dusting')],
    ['petal', N('Cherry-blossom petal'), N('A cherry-blossom petal')], ['leaf', N('Little leaf'), N('A little sakura leaf')],
    ['face', N('Little happy face'), N('A little happy face')], ['sesame', N('Sesame seeds'), N('Black sesame seeds')]
  ];
  const POWDERS = ['kinako', 'sugar'];
  const MAX_DECOR = 3;
  const DEFAULT_SET = ['#f4b2bf', WHITE, '#cddfa9', '#f9cd7d', '#d9b8ec'];
  const NOUNS = {
    strawberry: N('Strawberry Daifuku'), mango: N('Sunrise Daifuku'), orange: N('Little Sun Mochi'), blueberry: N('Twilight Mochi'),
    redbean: N('Red Bean Daifuku'), whitebean: N('Snowfall Daifuku'), matcha: N('Tea Garden Mochi'), custard: N('Moonlight Mochi'), chocolate: N('Cocoa Hug Mochi'), icecream: N('Snow Cloud Mochi')
  };
  let editing = 0; // which mochi of the set is being coloured (UI state only, never saved)

  /* ---------- helpers ---------- */
  const f1 = n => +n.toFixed(1);
  const safeColor = c => (MOCHI_COLORS.includes(c) ? c : WHITE);
  const countOf = cfg => Math.max(1, Math.min(MAX_SET, Math.round(+cfg.count) || 1));
  const fillingOf = cfg => FILLINGS.find(x => x[0] === cfg.filling) || FILLINGS[0];
  const fruitOf = cfg => (FRUITS.find(x => x[0] === cfg.fruit) || FRUITS[FRUITS.length - 1])[0];
  const decorOf = cfg => (Array.isArray(cfg.decor) ? cfg.decor : []).filter(d => DECOR.some(x => x[0] === d));
  const setColorsOf = cfg => Array.from({ length: MAX_SET }, (_, i) => safeColor(i === 0 ? cfg.color : (Array.isArray(cfg.setColors) ? cfg.setColors[i] : null) || DEFAULT_SET[i]));
  /** Mochi dough is a softer, milkier version of the chosen colour. */
  function soften(hex) {
    const c = safeColor(hex), mix = (a, b) => Math.round(a + (b - a) * 0.38);
    const rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).map(v => mix(v, 255));
    return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const outline = w => `stroke="${INK}" stroke-width="${f1(w)}" stroke-linejoin="round" stroke-linecap="round"`;

  /* ---------- drawing ---------- */
  function domePath(cx, by, w, h) {
    const top = by - h, l = cx - w * 0.44, r = cx + w * 0.44;
    return `M${f1(l)} ${f1(by)} C${f1(cx - w * 0.58)} ${f1(by - h * 0.3)} ${f1(cx - w * 0.4)} ${f1(top)} ${f1(cx)} ${f1(top)} C${f1(cx + w * 0.4)} ${f1(top)} ${f1(cx + w * 0.58)} ${f1(by - h * 0.3)} ${f1(r)} ${f1(by)} Q${f1(cx)} ${f1(by + h * 0.1)} ${f1(l)} ${f1(by)} Z`;
  }
  /** Fruit peeking out of the top of a mochi (drawn before the dough so the dough hides its lower half). */
  function fruitPeek(fruit, cx, top, s) {
    const o = outline(2.2 * Math.max(0.6, s));
    const p = (x, y) => `${f1(cx + x * s)} ${f1(top + y * s)}`;
    if (fruit === 'strawberry') {
      const seeds = [[-8, -8], [6, -14], [-2, -22], [9, -2], [-12, 2]].map(([x, y]) => `<ellipse cx="${f1(cx + x * s)}" cy="${f1(top + y * s)}" rx="${f1(1.4 * s)}" ry="${f1(2.2 * s)}" fill="#fbe3a1"/>`).join('');
      return `<path d="M${p(-22, 14)} Q${p(-25, -18)} ${p(0, -38)} Q${p(25, -18)} ${p(22, 14)} Z" fill="#e8616f" ${o}/>${seeds}`;
    }
    if (fruit === 'mango') return `<rect x="${f1(cx - 17 * s)}" y="${f1(top - 26 * s)}" width="${f1(34 * s)}" height="${f1(40 * s)}" rx="${f1(7 * s)}" fill="#f7b955" ${o} transform="rotate(-8 ${f1(cx)} ${f1(top)})"/><path d="M${p(-8, -18)} Q${p(-2, -22)} ${p(6, -18)}" fill="none" stroke="#fde3a6" stroke-width="${f1(3 * s)}" stroke-linecap="round"/>`;
    if (fruit === 'orange') return `<path d="M${p(-28, 8)} Q${p(0, -44)} ${p(28, 8)} Q${p(0, -8)} ${p(-28, 8)} Z" fill="#f9a65a" ${o}/><path d="M${p(-10, -12)} L${p(-6, -2)} M${p(0, -17)} L${p(0, -5)} M${p(10, -12)} L${p(6, -2)}" stroke="#fcd3a4" stroke-width="${f1(2 * s)}" stroke-linecap="round"/>`;
    if (fruit === 'blueberry') return [[-12, -2], [12, -2], [0, -16]].map(([x, y]) => `<circle cx="${f1(cx + x * s)}" cy="${f1(top + y * s)}" r="${f1(10 * s)}" fill="#6f7fc4" ${o}/><circle cx="${f1(cx + (x - 3) * s)}" cy="${f1(top + (y - 4) * s)}" r="${f1(2.2 * s)}" fill="#c8d0f0"/>`).join('');
    return '';
  }
  /** Fruit seen in a cut cross-section. */
  function fruitSection(fruit, cx, cy, s) {
    const o = outline(1.6 * s);
    const p = (x, y) => `${f1(cx + x * s)} ${f1(cy + y * s)}`;
    if (fruit === 'strawberry') return `<path d="M${p(0, -16)} Q${p(15, -3)} ${p(10, 11)} Q${p(0, 17)} ${p(-10, 11)} Q${p(-15, -3)} ${p(0, -16)} Z" fill="#e8616f" ${o}/><path d="M${p(0, -9)} Q${p(7, -1)} ${p(5, 7)} Q${p(0, 10)} ${p(-5, 7)} Q${p(-7, -1)} ${p(0, -9)} Z" fill="#f7b6bc"/>`;
    if (fruit === 'mango') return `<rect x="${f1(cx - 12 * s)}" y="${f1(cy - 12 * s)}" width="${f1(24 * s)}" height="${f1(24 * s)}" rx="${f1(5 * s)}" fill="#f7b955" ${o}/>`;
    if (fruit === 'orange') return `<path d="M${p(-17, 7)} Q${p(0, -26)} ${p(17, 7)} Q${p(0, -4)} ${p(-17, 7)} Z" fill="#f9a65a" ${o}/>`;
    if (fruit === 'blueberry') return [[-8, 4], [8, 4], [0, -8]].map(([x, y]) => `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s)}" r="${f1(7 * s)}" fill="#6f7fc4" ${o}/>`).join('');
    return '';
  }
  /** Dusting points spread over the upper part of the dome. */
  function dustPoints(cx, by, w, h, count) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const u = ((i * 37) % 100) / 100, v = 0.07 + (((i * 53) % 100) / 100) * 0.5;
      const half = w * 0.42 * Math.sqrt(Math.min(1, v * 1.7));
      pts.push([f1(cx + (u * 2 - 1) * half * 0.85), f1(by - h + v * h)]);
    }
    return pts;
  }
  function decorations(decor, cx, by, w, h) {
    const s = w / 200, top = by - h;
    let out = '';
    if (decor.includes('kinako')) out += dustPoints(cx, by, w, h, 26).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${f1(1.6 * s + 0.4)}" fill="#cf9f5f" opacity=".85"/>`).join('');
    if (decor.includes('sugar')) out += `<ellipse cx="${f1(cx)}" cy="${f1(top + h * 0.28)}" rx="${f1(w * 0.3)}" ry="${f1(h * 0.18)}" fill="#ffffff" opacity=".45"/>` + dustPoints(cx, by, w, h, 26).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${f1(1.8 * s + 0.4)}" fill="#ffffff" stroke="#e8d9c6" stroke-width=".5"/>`).join('');
    if (decor.includes('sesame')) out += dustPoints(cx, by, w, h, 9).map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${f1(2.6 * s + 0.5)}" ry="${f1(1.3 * s + 0.3)}" fill="#3b2a2e" transform="rotate(${(i * 47) % 180} ${x} ${y})"/>`).join('');
    if (decor.includes('leaf')) {
      const x = f1(cx - w * 0.22), y = f1(top + h * 0.2);
      out += `<g transform="translate(${x} ${y}) rotate(-28) scale(${f1(s * 1.2)})"><path d="M-16 0 Q0 -11 16 0 Q0 11 -16 0 Z" fill="#a9c97f" ${outline(1.8)}/><path d="M-12 0 H12" stroke="#7f9f5a" stroke-width="1.4" stroke-linecap="round"/></g>`;
    }
    if (decor.includes('petal')) {
      const x = f1(cx + w * 0.2), y = f1(top + h * 0.2);
      out += `<g transform="translate(${x} ${y}) rotate(24) scale(${f1(s * 1.2)})"><path d="M0 11 C-10 5 -9 -8 -3.5 -11 L0 -6.5 L3.5 -11 C9 -8 10 5 0 11 Z" fill="#f7b7c6" ${outline(1.8)}/><path d="M0 7 V-2" stroke="#e98aa1" stroke-width="1.2" stroke-linecap="round"/></g>`;
    }
    if (decor.includes('face')) {
      const ey = by - h * 0.4, ex = w * 0.14, sw = Math.max(1.4, 3 * s);
      const eye = x => `<path d="M${f1(x - 6 * s)} ${f1(ey)} Q${f1(x)} ${f1(ey - 7 * s)} ${f1(x + 6 * s)} ${f1(ey)}" fill="none" stroke="${INK}" stroke-width="${f1(sw)}" stroke-linecap="round"/>`;
      out += eye(cx - ex) + eye(cx + ex) +
        `<ellipse cx="${f1(cx - w * 0.24)}" cy="${f1(ey + 9 * s)}" rx="${f1(8 * s)}" ry="${f1(4.5 * s)}" fill="#f4a3b4" opacity=".75"/><ellipse cx="${f1(cx + w * 0.24)}" cy="${f1(ey + 9 * s)}" rx="${f1(8 * s)}" ry="${f1(4.5 * s)}" fill="#f4a3b4" opacity=".75"/>` +
        `<path d="M${f1(cx - 5 * s)} ${f1(ey + 8 * s)} Q${f1(cx)} ${f1(ey + 13 * s)} ${f1(cx + 5 * s)} ${f1(ey + 8 * s)}" fill="none" stroke="${INK}" stroke-width="${f1(sw * 0.8)}" stroke-linecap="round"/>`;
    }
    return out;
  }
  /** One whole mochi sitting on a surface. by = base line, w/h = width and height. */
  function mochi(cfg, color, cx, by, w, h) {
    const s = w / 200, fill = soften(color), top = by - h;
    return `<g class="mochi-one" style="transform-box:fill-box;transform-origin:50% 100%">
      <ellipse cx="${f1(cx)}" cy="${f1(by + 3 * s)}" rx="${f1(w * 0.47)}" ry="${f1(h * 0.08)}" fill="${INK}" opacity=".12"/>
      ${fruitPeek(fruitOf(cfg), cx, top + 6 * s, s)}
      <path d="${domePath(cx, by, w, h)}" fill="${fill}" ${outline(Math.max(1.6, 2.6 * s))}/>
      <ellipse cx="${f1(cx - w * 0.2)}" cy="${f1(top + h * 0.3)}" rx="${f1(w * 0.11)}" ry="${f1(h * 0.07)}" fill="#ffffff" opacity=".6" transform="rotate(-24 ${f1(cx - w * 0.2)} ${f1(top + h * 0.3)})"/>
      ${decorations(decorOf(cfg), cx, by, w, h)}
    </g>`;
  }
  /** A cut half in front of the big mochi, showing the filling and the fruit inside. */
  function slice(cfg, cx, by, w, h) {
    const [value, , , fc, speck] = fillingOf(cfg), s = w / 100;
    const inner = domePath(cx, by - h * 0.1, w * 0.74, h * 0.72);
    const dots = (value === 'redbean' || value === 'icecream' || value === 'matcha')
      ? [[-14, -22], [10, -30], [16, -14], [-18, -10], [2, -40]].map(([x, y]) => `<circle cx="${f1(cx + x * s)}" cy="${f1(by + y * s)}" r="${f1(1.6 * s)}" fill="${speck}"/>`).join('') : '';
    return `<g class="mochi-slice">
      <ellipse cx="${f1(cx)}" cy="${f1(by + 3)}" rx="${f1(w * 0.47)}" ry="${f1(h * 0.08)}" fill="${INK}" opacity=".12"/>
      <path d="${domePath(cx, by, w, h)}" fill="${soften(cfg.color)}" ${outline(2.2)}/>
      <path d="${inner}" fill="${fc}" stroke="${speck}" stroke-width="1.5"/>${dots}
      ${fruitSection(fruitOf(cfg), cx, by - h * 0.42, s * 1.15)}
    </g>`;
  }
  const PLATE = `<ellipse cx="160" cy="262" rx="142" ry="32" fill="#fffdf8" ${outline(2.4)}/><ellipse cx="160" cy="259" rx="112" ry="21" fill="none" stroke="#efe3d3" stroke-width="2"/>`;
  const BOARD = `<rect x="16" y="160" width="288" height="134" rx="20" fill="#c99a6b" ${outline(2.4)}/><rect x="16" y="150" width="288" height="134" rx="20" fill="#e8c497" ${outline(2.4)}/>` +
    `<path d="M40 182 Q120 176 200 184 T284 180 M36 222 Q110 216 180 226 T286 220 M44 262 Q130 256 210 264 T282 260" fill="none" stroke="#d3a774" stroke-width="2" stroke-linecap="round"/>`;
  // [cx, baseline, width, height] for each set size
  const LAYOUT = {
    2: [[105, 252, 106, 80], [215, 252, 106, 80]],
    3: [[70, 252, 84, 64], [160, 252, 84, 64], [250, 252, 84, 64]],
    4: [[110, 206, 84, 64], [210, 206, 84, 64], [110, 274, 84, 64], [210, 274, 84, 64]],
    5: [[110, 204, 80, 62], [210, 204, 80, 62], [60, 274, 80, 62], [160, 274, 80, 62], [260, 274, 80, 62]]
  };
  function label(cfg) {
    const n = countOf(cfg);
    if (n > 1) return tr('A set of {count} mochi on a little wooden board', { count: n });
    const ci = MOCHI_COLORS.indexOf(safeColor(cfg.color));
    return tr('A soft {color} mochi filled with {filling}', { color: tr(MOCHI_COLOR_NAMES[ci]), filling: tr(fillingOf(cfg)[1]) });
  }
  function draw(cfg) {
    const n = countOf(cfg);
    let body;
    if (n > 1) {
      const colors = setColorsOf(cfg);
      body = BOARD + LAYOUT[n].map(([x, y, w, h], i) => mochi(cfg, colors[i], x, y, w, h)).join('');
    } else {
      body = PLATE + mochi(cfg, safeColor(cfg.color), 138, 258, 196, 148) + slice(cfg, 250, 272, 88, 68);
    }
    return `<svg class="pw-treat-svg" viewBox="0 0 320 320" role="img" aria-label="${esc(label(cfg))}">${body}</svg>`;
  }

  /* ---------- steps ---------- */
  const chips = (name, list, value) => `<div class="pw-chips">${list.map(([v, l]) => `<label class="pw-chip-radio"><input type="radio" name="${name}" value="${v}" ${value === v ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`;
  const onRadio = (el, name, fn) => el.querySelectorAll(`input[name="${name}"]`).forEach(r => r.onchange = () => fn(r.value));
  const swatches = (name, value) => `<div class="pw-swatches">${MOCHI_COLORS.map((c, i) => `<label class="pw-swatch" style="--sw:${c}"><input type="radio" name="${name}" value="${c}" ${value === c ? 'checked' : ''}><span class="pw-visually-hidden">${tr(MOCHI_COLOR_NAMES[i])}</span></label>`).join('')}</div>`;

  function bindDecor(el, set) {
    el.querySelectorAll('input[name=decor]').forEach(c => c.onchange = () => {
      if (c.checked && POWDERS.includes(c.value)) el.querySelectorAll('input[name=decor]').forEach(o => { if (o !== c && POWDERS.includes(o.value)) o.checked = false; });
      const chosen = [...el.querySelectorAll('input[name=decor]:checked')].map(x => x.value);
      if (chosen.length > MAX_DECOR) { c.checked = false; toast(tr('Three decorations is the limit. Remove one to choose another.')); return; }
      set({ decor: chosen });
    });
  }
  function renderSet(cfg) {
    const n = countOf(cfg), idx = Math.min(editing, n - 1), colors = setColorsOf(cfg);
    const picker = n > 1
      ? `<fieldset class="pw-field"><legend>${tr('Which mochi would you like to colour?')}</legend><div class="pw-chips">${Array.from({ length: n }, (_, i) => `<label class="pw-chip-radio"><input type="radio" name="editMochi" value="${i}" ${i === idx ? 'checked' : ''}><span>${tr('Mochi {n}', { n: i + 1 })}</span></label>`).join('')}</div></fieldset>
        <p class="choice-description">${tr('Colour for mochi {n}', { n: idx + 1 })}</p>${swatches('setColor', colors[idx])}`
      : `<p class="choice-description">${tr('Add a second mochi to give each one its own colour.')}</p>`;
    return `<p class="choice-description">${tr('One big mochi for a quiet moment, or a little set to share.')}</p>
      <div class="pw-field"><label for="pw-mochi-count">${tr('How many mochi on the board?')}</label><input type="range" id="pw-mochi-count" min="1" max="${MAX_SET}" step="1" value="${n}"><span class="char-count" data-count>${n}</span></div>${picker}`;
  }
  function bindSet(el, cfg, set, redraw) {
    let colors = setColorsOf(cfg);
    const r = el.querySelector('#pw-mochi-count');
    r.oninput = () => { set({ count: +r.value }); el.querySelector('[data-count]').textContent = r.value; };
    r.onchange = () => redraw();
    onRadio(el, 'editMochi', v => { editing = +v; redraw(); });
    const idx = Math.min(editing, countOf(cfg) - 1);
    onRadio(el, 'setColor', c => {
      colors = colors.map((x, i) => (i === idx ? c : x));
      set({ setColors: colors, ...(idx === 0 ? { color: c } : {}) });
    });
  }
  function bindColor(el, cfg, set) {
    let colors = setColorsOf(cfg);
    onRadio(el, 'color', c => { colors = [c, ...colors.slice(1)]; set({ color: c, setColors: colors }); });
  }
  const steps = [
    { id: 'color', label: N('Choose your mochi colour'), render: cfg => `<p class="choice-description">${tr('Soft and pillowy. Which colour feels peaceful today?')}</p>${swatches('color', safeColor(cfg.color))}`, bind: bindColor },
    { id: 'filling', label: N('Pick a filling'), render: cfg => `<p class="choice-description">${tr('What would you like to find inside?')}</p>${chips('filling', FILLINGS, fillingOf(cfg)[0])}`, bind: (el, cfg, set) => onRadio(el, 'filling', v => set({ filling: v })) },
    { id: 'fruit', label: N('Tuck in some fruit'), render: cfg => `<p class="choice-description">${tr('A whole strawberry makes a classic strawberry daifuku.')}</p>${chips('fruit', FRUITS, fruitOf(cfg))}`, bind: (el, cfg, set) => onRadio(el, 'fruit', v => set({ fruit: v })) },
    { id: 'decor', label: N('Add a gentle touch'), render: cfg => `<p class="choice-description">${tr('Choose up to three decorations.')}</p><div class="pw-chips">${DECOR.map(([v, l]) => `<label class="pw-chip-radio"><input type="checkbox" name="decor" value="${v}" ${decorOf(cfg).includes(v) ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`, bind: (el, cfg, set) => bindDecor(el, set) },
    { id: 'set', label: N('Make a mochi set'), render: renderSet, bind: bindSet }
  ];

  /* ---------- reveal: stretch → fill → wrap → bounce ---------- */
  const anim = (el, frames, opts) => el.animate(frames, { fill: 'both', ...opts }).finished;
  async function reveal(stageEl, cfg) {
    if (W.reduceMotion() || document.hidden) { stageEl.innerHTML = draw(cfg); return; }
    const dough = soften(cfg.color), [, , , fc] = fillingOf(cfg);
    const box = 'transform-box:fill-box;transform-origin:50% 50%';
    stageEl.innerHTML = `<svg class="pw-treat-svg" viewBox="0 0 320 320" aria-hidden="true">${PLATE}
      <ellipse class="mochi-sheet" cx="160" cy="236" rx="112" ry="30" fill="${dough}" ${outline(2.5)} style="${box}"/></svg>`;
    const svg = stageEl.firstElementChild, sheet = svg.querySelector('.mochi-sheet');
    // 1. the dough sheet stretches out, squashes and settles
    await anim(sheet, [{ transform: 'scale(.15)', opacity: 0 }, { transform: 'scale(1.25,.55)', opacity: 1, offset: 0.4 }, { transform: 'scale(.85,1.3)', offset: 0.65 }, { transform: 'scale(1.06,.92)', offset: 0.85 }, { transform: 'scale(1)' }], { duration: 1000, easing: 'ease-in-out' });
    // 2. the filling (and fruit) drops onto the dough
    svg.insertAdjacentHTML('beforeend', `<g class="mochi-fill" style="transform-box:fill-box;transform-origin:50% 100%">${fruitPeek(fruitOf(cfg), 160, 204, 0.9)}<ellipse cx="160" cy="218" rx="46" ry="30" fill="${fc}" ${outline(2.4)}/></g>`);
    const filling = svg.querySelector('.mochi-fill');
    await anim(filling, [{ transform: 'translateY(-190px)', opacity: 0 }, { transform: 'translateY(0) scale(1.1,.88)', opacity: 1, offset: 0.75 }, { transform: 'translateY(0) scale(1)' }], { duration: 750, easing: 'cubic-bezier(.5,0,.4,1)' });
    await anim(sheet, [{ transform: 'scale(1.06,.9)' }, { transform: 'scale(1)' }], { duration: 220 });
    await wait(150);
    // 3. the dough wraps around: both sides fold up and meet in the middle
    const half = d => `<path d="${d}" fill="${dough}" ${outline(2.5)}/>`;
    svg.insertAdjacentHTML('beforeend', `<g class="mochi-left" style="transform-box:fill-box;transform-origin:0% 100%">${half('M62 246 C50 200 100 150 160 150 L160 246 Z')}</g><g class="mochi-right" style="transform-box:fill-box;transform-origin:100% 100%">${half('M258 246 C270 200 220 150 160 150 L160 246 Z')}</g>`);
    const wrap = { duration: 850, easing: 'cubic-bezier(.45,0,.25,1)' };
    await Promise.all([
      anim(svg.querySelector('.mochi-left'), [{ transform: 'rotate(-80deg)', opacity: 0.4 }, { transform: 'rotate(0deg)', opacity: 1 }], wrap),
      anim(svg.querySelector('.mochi-right'), [{ transform: 'rotate(80deg)', opacity: 0.4 }, { transform: 'rotate(0deg)', opacity: 1 }], wrap),
      anim(sheet, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.6,.8)', opacity: 0 }], wrap)
    ]);
    // 4. the finished mochi appears with a soft, squishy bounce
    stageEl.innerHTML = draw(cfg);
    const ones = [...stageEl.querySelectorAll('.mochi-one')];
    await Promise.all(ones.map((g, i) => g.animate([{ transform: 'scale(1.14,.82)' }, { transform: 'scale(.93,1.09)', offset: 0.45 }, { transform: 'scale(1.03,.98)', offset: 0.75 }, { transform: 'scale(1)' }], { duration: 700, delay: i * 110, easing: 'ease-out', fill: 'backwards' }).finished));
  }

  /* ---------- registration ---------- */
  function ingredients(cfg) {
    const fruit = FRUITS.find(x => x[0] === fruitOf(cfg));
    return [
      DOUGH[MOCHI_COLORS.indexOf(safeColor(cfg.color))],
      fillingOf(cfg)[2],
      ...(fruit && fruit[2] ? [fruit[2]] : []),
      ...decorOf(cfg).map(d => DECOR.find(x => x[0] === d)[2]),
      ...(countOf(cfg) > 1 ? [N('A little wooden serving board')] : [])
    ];
  }
  function suggest(a) {
    const palette = D.COLORS.filter(c => c !== a.color);
    return {
      ...(a.color ? { color: a.color, setColors: [a.color, WHITE, ...palette.slice(0, MAX_SET - 2)] } : {}),
      ...(a.feeling ? {
        filling: { calm: 'matcha', cozy: 'redbean', bright: 'custard', free: 'icecream' }[a.feeling],
        fruit: { calm: 'none', cozy: 'strawberry', bright: 'mango', free: 'blueberry' }[a.feeling]
      } : {}),
      ...(a.who ? { count: { family: 4, friends: 5, someone: 2, me: 1 }[a.who] } : {})
    };
  }
  function nameWords(cfg) {
    const fruit = fruitOf(cfg);
    const special = NOUNS[fruit] || NOUNS[fillingOf(cfg)[0]];
    return {
      adj: [N('Soft'), N('Hushed'), N('Gentle'), N('Tender'), N('Quiet'), N('Warm'), N('Little')],
      noun: [special, N('Cloud Mochi'), N('Moment Daifuku'), countOf(cfg) > 1 ? N('Mochi Circle') : N('Pillow Mochi')]
    };
  }

  D.register('mochi', {
    holder: 'plate',
    defaults: () => ({ color: '#f4b2bf', filling: 'redbean', fruit: 'strawberry', decor: ['sugar'], count: 1, setColors: DEFAULT_SET.slice() }),
    steps, draw: cfg => draw(cfg), mini: cfg => draw({ ...cfg, count: 1 }), reveal,
    ingredients, suggest, nameWords
  });
})(window);
