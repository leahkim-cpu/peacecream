/* PeaceCream dessert universe: shared framework for every treat builder.
 * Each dessert lives in its own file (pc-treat-<type>.js) and registers a definition:
 *   { title, cta, holder, defaults(), steps:[{id,label,render(cfg),bind(el,cfg,set)}], draw(cfg),
 *     reveal(stageEl, cfg) -> Promise, ingredients(cfg) -> [English], suggest(answers) -> partial cfg,
 *     nameWords(cfg) -> {adj:[English], noun:[English]} }
 * The framework owns reflection questions, navigation, naming, saving, sharing and the downloadable card. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, S = root.PeaceStore.store;
  const defs = {};
  const N = s => s; // marks English UI strings for translation extraction
  const TYPES = [
    // [type, title, call to action, accent colour]
    ['icecream', N('Ice Cream'), N('Create Your Scoop'), '#f3c6ce'],
    ['cookie', N('Cookies'), N('Bake Your Peace'), '#f9dcc4'],
    ['cake', N('Cakes'), N('Layer Your Happiness'), '#e6dcf3'],
    ['donut', N('Donuts'), N('Sprinkle Some Joy'), '#f9ecc4'],
    ['macaron', N('Macarons'), N('Mix Your Memories'), '#d6e8f2'],
    ['mochi', N('Mochi'), N('A Soft Moment'), '#e8ecd9'],
    ['cupcake', N('Cupcakes'), N('A Little Celebration'), '#fde3e8']
  ];
  const FEELINGS = [['calm', N('Calm, like a quiet morning')], ['cozy', N('Cozy, like a warm blanket')], ['bright', N('Bright, like sunshine')], ['free', N('Free, like a breeze')]];
  const WHO = [['family', N('My family')], ['friends', N('My friends')], ['someone', N('Someone I’d like to understand')], ['me', N('Just me')]];
  const COLORS = ['#f4b2bf', '#f9cd7d', '#f8e58f', '#cddfa9', '#a8dcd1', '#a9d3ef', '#b9bde9', '#d9b8ec'];
  const COLOR_NAMES = [N('rose'), N('honey'), N('lemon'), N('pistachio'), N('mint'), N('sky'), N('lavender'), N('lilac')];

  function register(type, def) { defs[type] = { type, ...def }; }
  const loadDef = type => (defs[type] ? Promise.resolve(defs[type]) : W.loadScript(`pc-treat-${type}.js`).then(() => { if (!defs[type]) throw new Error('missing builder ' + type); return defs[type]; }));
  const info = type => TYPES.find(t => t[0] === type);

  /* ---------- Static card icons (kept here so the home page needs no builder code) ---------- */
  function icon(type, size) {
    const s = size || 110;
    const wrap = inner => `<svg viewBox="0 0 120 120" width="${s}" height="${s}" aria-hidden="true" focusable="false">${inner}</svg>`;
    const o = 'stroke="#612335" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
    switch (type) {
      case 'icecream': return W.scoopSVG(0, { size: s * 0.9 });
      case 'cookie': return wrap(`<path d="M60 18 L71 46 L101 47 L77 65 L86 95 L60 78 L34 95 L43 65 L19 47 L49 46 Z" fill="#e9b979" ${o}/><path d="M60 30 L68 50 L88 51 L72 63 L78 83 L60 72 L42 83 L48 63 L32 51 L52 50 Z" fill="#fde3e8"/><circle cx="56" cy="56" r="3" fill="#7fb6d8"/><circle cx="66" cy="64" r="3" fill="#9fc77a"/>`);
      case 'cake': return wrap(`<rect x="24" y="58" width="72" height="40" rx="8" fill="#fbe7c6" ${o}/><rect x="30" y="34" width="60" height="28" rx="8" fill="#f4b2bf" ${o}/><path d="M30 46 q8 8 15 0 q8 8 15 0 q8 8 15 0 q8 8 15 0" fill="none" stroke="#fff" stroke-width="4"/><path d="M60 34 V20" ${o}/><path d="M60 12 q5 5 0 9 q-5 -4 0 -9" fill="#f9cd7d" ${o}/><circle cx="44" cy="78" r="4" fill="#e66f8b"/><circle cx="76" cy="78" r="4" fill="#9fc77a"/>`);
      case 'donut': return wrap(`<circle cx="60" cy="62" r="38" fill="#e9b979" ${o}/><path d="M26 58 q4 -26 34 -28 q30 2 34 28 q-6 8 -12 2 q-6 10 -12 2 q-6 10 -12 2 q-6 10 -12 2 q-6 10 -12 2 q-6 6 -8 -10Z" fill="#f4b2bf" ${o}/><circle cx="60" cy="62" r="12" fill="#fff9ee" ${o}/><g stroke-width="4" stroke-linecap="round"><path d="M40 46 l6 -3" stroke="#7fb6d8"/><path d="M74 42 l5 4" stroke="#f3b54a"/><path d="M50 36 l2 5" stroke="#9fc77a"/><path d="M80 58 l-4 4" stroke="#b48ad6"/></g>`);
      case 'macaron': return wrap(`<path d="M22 54 q38 -36 76 0 Z" fill="#a9d3ef" ${o}/><rect x="22" y="54" width="76" height="12" rx="6" fill="#fff4dc" ${o}/><path d="M22 66 q38 30 76 0 Z" fill="#a9d3ef" ${o}/><path d="M26 54 h68" stroke="#7fb6d8" stroke-width="3"/>`);
      case 'mochi': return wrap(`<ellipse cx="60" cy="96" rx="44" ry="8" fill="#e3d6c8"/><path d="M18 88 q0 -54 42 -54 q42 0 42 54 q-42 10 -84 0Z" fill="#fde3e8" ${o}/><ellipse cx="46" cy="70" rx="5" ry="3" fill="#f4b2bf"/><ellipse cx="74" cy="70" rx="5" ry="3" fill="#f4b2bf"/><path d="M54 76 q6 5 12 0" fill="none" ${o}/><path d="M60 34 q-2 -10 8 -12" fill="none" stroke="#9fc77a" stroke-width="4" stroke-linecap="round"/>`);
      case 'cupcake': return wrap(`<path d="M30 66 L38 104 H82 L90 66 Z" fill="#a9d3ef" ${o}/><path d="M42 70 L46 102 M60 70 V102 M78 70 L74 102" stroke="#7fb6d8" stroke-width="2"/><path d="M26 66 q-4 -20 18 -22 q2 -18 16 -20 q14 2 16 20 q22 2 18 22 Z" fill="#fde3e8" ${o}/><circle cx="60" cy="22" r="7" fill="#e66f8b" ${o}/>`);
      default: return '';
    }
  }

  /* ---------- "Choose Your Little Treat" ---------- */
  function picker() {
    return `<section class="pw-treats" aria-labelledby="pw-treats-title">
      <div class="section-head"><h2 id="pw-treats-title">${tr('Choose Your Little Treat')}</h2><p>${tr('Every feeling has a flavor. What will you create today?')}</p></div>
      <div class="pw-treat-grid">${TYPES.map(([type, title, cta, color], i) => `<a class="pw-treat-card ${i === 0 ? 'signature' : ''}" href="${type === 'icecream' ? '#create' : '#treat/' + type}" style="--treat:${color}">
        <span class="pw-treat-art">${icon(type, i === 0 ? 150 : 104)}</span><b>${tr(title)}</b><span>${tr(cta)}</span>${i === 0 ? `<em>${tr('Our signature')}</em>` : ''}</a>`).join('')}</div>
    </section>`;
  }
  function renderPicker() {
    app.innerHTML = `<section class="pw-page">${picker()}</section>`;
    W.onLanguage(renderPicker);
  }
  /** Fills the placeholder on the home page once this file is loaded. */
  function mountHome() { const slot = document.querySelector('[data-treat-picker]'); if (slot) slot.outerHTML = picker(); }

  /* ---------- Builder shell ---------- */
  let st = null;
  function freshState(type, def) {
    return { type, step: -1, answers: { feeling: null, who: null, memory: '', color: null }, cfg: def.defaults(), suggested: false, name: '', description: '', nameTouched: false, countryCode: '', countryName: '', saved: null, revealed: false };
  }
  async function renderBuilder(type) {
    if (!info(type) || type === 'icecream') { location.hash = '#create'; return; }
    let def;
    try { def = await loadDef(type); } catch (e) { app.innerHTML = `<section class="pw-page pw-empty"><h1>${tr('This little corner couldn’t load.')}</h1><button class="button" onclick="location.reload()">${tr('Try again')}</button></section>`; return; }
    if (!st || st.type !== type) st = freshState(type, def);
    W.onLanguage(() => draw(def));
    draw(def);
  }
  function draw(def) {
    if (location.hash !== '#treat/' + st.type) return;
    const [, title, cta, color] = info(st.type);
    const steps = def.steps;
    const labels = [tr('A little reflection'), ...steps.map(s => tr(s.label)), tr('Name & share')];
    const idx = st.step + 1;
    app.innerHTML = `<section class="creator pw-builder" style="--treat:${color}">
      <div class="crumb"><a href="#treats">${tr('Choose Your Little Treat')}</a> / ${tr(title)}</div>
      <div class="creator-heading"><div><h1>${tr(cta)}</h1><p>${tr('Every feeling has a flavor. What will you create today?')}</p></div></div>
      <div class="steps pw-steps" aria-label="${tr('Creation steps')}">${labels.map((l, i) => `<button class="step ${i === idx ? 'active' : ''}" data-goto="${i - 1}" ${i === idx ? 'aria-current="step"' : ''}><span>${i < idx ? '✓' : i + 1}</span>${esc(l)}</button>`).join('')}</div>
      <div class="create-grid">
        <div class="preview-column"><figure class="cup-stage pw-treat-stage"><span class="stage-label">${tr('A LITTLE TREAT OF YOU')}</span><div class="pw-treat-preview">${def.draw(st.cfg)}</div><figcaption class="cup-footer">${esc(st.name || tr(title))}</figcaption></figure></div>
        <div class="options-column">${stepBody(def)}</div>
      </div></section>`;
    bindShell(def);
  }
  function refreshPreview(def) {
    const p = app.querySelector('.pw-treat-preview');
    if (p) p.innerHTML = def.draw(st.cfg);
  }
  function stepBody(def) {
    if (st.step === -1) return reflection();
    if (st.step < def.steps.length) {
      const s = def.steps[st.step];
      return `<div class="choice-top"><h2>${tr(s.label)}</h2><span>${String(st.step + 2).padStart(2, '0')} / ${String(def.steps.length + 2).padStart(2, '0')}</span></div>
        ${st.suggested && st.step === 0 ? `<p class="pw-suggest-note">✳ ${tr('We picked a few things from your answers. Change anything you like.')}</p>` : ''}
        <div class="pw-step-body">${s.render(st.cfg)}</div>
        <div class="next-row"><button class="back" data-back>← ${tr('Back')}</button><button class="button" data-next>${tr('Next')} <span>→</span></button></div>`;
    }
    return finishStep(def);
  }
  function reflection() {
    const a = st.answers;
    const radios = (name, list) => list.map(([v, l]) => `<label class="pw-chip-radio"><input type="radio" name="${name}" value="${v}" ${a[name] === v ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('');
    return `<div class="choice-top"><h2>${tr('A little reflection')}</h2><span>01</span></div>
      <p class="choice-description">${tr('A few gentle questions. Your answers suggest colors and flavors, and you can change everything afterwards.')}</p>
      <fieldset class="pw-field"><legend>${tr('What does peace feel like to you today?')}</legend><div class="pw-chips">${radios('feeling', FEELINGS)}</div></fieldset>
      <fieldset class="pw-field"><legend>${tr('Who would you share this treat with?')}</legend><div class="pw-chips">${radios('who', WHO)}</div></fieldset>
      <div class="pw-field"><label for="pw-memory">${tr('Which memory makes you feel safe and happy?')} <span>${tr('(optional)')}</span></label><textarea id="pw-memory" rows="3" maxlength="240" placeholder="${tr('It reminds me of…')}">${esc(a.memory)}</textarea></div>
      <fieldset class="pw-field"><legend>${tr('What color reminds you of a peaceful moment?')}</legend><div class="pw-swatches">${COLORS.map((c, i) => `<label class="pw-swatch" style="--sw:${c}"><input type="radio" name="color" value="${c}" ${a.color === c ? 'checked' : ''}><span class="pw-visually-hidden">${tr(COLOR_NAMES[i])}</span></label>`).join('')}</div></fieldset>
      <div class="next-row"><button class="back" data-skip>${tr('Skip the questions')}</button><button class="button" data-next>${tr('Start creating')} <span>→</span></button></div>`;
  }
  function finishStep(def) {
    if (!st.nameTouched) { st.name = generateName(def); st.description = generateDescription(def); }
    const saved = st.saved && S.getRecipe(st.saved);
    return `<div class="choice-top"><h2>${tr('Name & share')}</h2></div>
      <div class="pw-field"><label for="pw-treat-name">${tr('Your treat’s name')}</label><div class="pw-row pw-name-row"><input id="pw-treat-name" maxlength="${S.LIMITS.flavorName}" value="${esc(st.name)}"><button class="pw-chip" data-rename>${tr('Another name')}</button></div></div>
      <div class="pw-field"><label for="pw-treat-desc">${tr('A short description')}</label><textarea id="pw-treat-desc" rows="2" maxlength="${S.LIMITS.description}">${esc(st.description)}</textarea></div>
      <div class="card-summary"><h3>${tr('Ingredients')}</h3><p>${def.ingredients(st.cfg).map(x => esc(tr(x))).join(' · ')}</p>${st.answers.memory ? `<p class="pw-quote">“${esc(st.answers.memory)}”</p>` : ''}</div>
      <div class="pw-field"><label for="pw-treat-country">${tr('Connect it to a country')} <span>${tr('(optional, never detected automatically)')}</span></label><div class="pw-select-slot">${tr('Loading countries…')}</div></div>
      <div class="pw-actions">
        ${st.revealed ? '' : `<button class="button" data-make>${tr('Make my treat!')} <span>✳</span></button>`}
        ${st.revealed ? (saved ? `<a class="button" href="#recipe/${saved.id}">${tr('Open my recipe')} <span>→</span></a>` : `<button class="button" data-save>${tr('Save to My Recipe Book')} <span>✳</span></button>`) : ''}
        ${st.revealed ? `<button class="button secondary" data-card>${tr('Download my treat card')}</button><button class="button secondary" data-share>${tr('Share with a friend')}</button>` : ''}
      </div>
      <div class="next-row"><button class="back" data-back>← ${tr('Back')}</button>${st.revealed ? `<button class="back" data-again>${tr('Make another treat')}</button>` : ''}</div>
      <p class="privacy">${tr('Your treat is private. Nothing is published unless you choose to share it.')}</p>`;
  }
  function bindShell(def) {
    const col = app.querySelector('.options-column');
    app.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { st.step = +b.dataset.goto; draw(def); });
    col.querySelector('[data-next]')?.addEventListener('click', () => { if (st.step === -1) applySuggestions(def); st.step++; draw(def); });
    col.querySelector('[data-back]')?.addEventListener('click', () => { st.step--; draw(def); });
    col.querySelector('[data-skip]')?.addEventListener('click', () => { st.step = 0; draw(def); });
    if (st.step === -1) {
      col.querySelectorAll('input[type=radio]').forEach(r => r.onchange = () => { st.answers = { ...st.answers, [r.name]: r.value }; });
      col.querySelector('#pw-memory').oninput = e => { st.answers = { ...st.answers, memory: e.target.value }; };
      return;
    }
    if (st.step < def.steps.length) {
      const set = patch => { st.cfg = { ...st.cfg, ...patch }; st.revealed = false; st.saved = null; refreshPreview(def); };
      def.steps[st.step].bind(col.querySelector('.pw-step-body'), st.cfg, set, () => draw(def));
      return;
    }
    bindFinish(def, col);
  }
  function applySuggestions(def) {
    const a = st.answers;
    if (!a.feeling && !a.who && !a.color) return;
    st.cfg = { ...st.cfg, ...(def.suggest ? def.suggest(a) : {}) };
    st.suggested = true;
  }
  async function bindFinish(def, col) {
    const name = col.querySelector('#pw-treat-name'), desc = col.querySelector('#pw-treat-desc');
    name.oninput = () => { st.name = name.value; st.nameTouched = true; const f = app.querySelector('.pw-treat-stage figcaption'); if (f) f.textContent = name.value; };
    desc.oninput = () => { st.description = desc.value; st.nameTouched = true; };
    col.querySelector('[data-rename]').onclick = () => { st.nameTouched = false; st.seed = (st.seed || 0) + 1; draw(def); };
    col.querySelector('[data-make]')?.addEventListener('click', async () => {
      col.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const stage = app.querySelector('.pw-treat-preview');
      if (def.finalize) st.cfg = def.finalize(st.cfg);
      try { await def.reveal(stage, st.cfg); } catch (e) { /* the treat is still made */ }
      st.revealed = true;
      if (st && location.hash === '#treat/' + st.type) { draw(def); const r = app.querySelector('.pw-treat-stage').getBoundingClientRect(); W.sprinkleBurst(r.left + r.width / 2, r.top + r.height / 2, 22); }
    });
    col.querySelector('[data-save]')?.addEventListener('click', () => {
      try {
        const r = S.saveRecipe({ dessertType: st.type, flavorName: st.name || tr(info(st.type)[1]), description: st.description, peaceMemory: st.answers.memory, customization: st.cfg, ingredients: def.ingredients(st.cfg), countryCode: st.countryCode || null, countryName: st.countryName || null });
        st.saved = r.id; toast(tr('Saved to your Recipe Book. It stays private.')); draw(def);
      } catch (err) { toast(W.errText(err)); }
    });
    col.querySelector('[data-card]')?.addEventListener('click', () => downloadCard(def));
    col.querySelector('[data-share]')?.addEventListener('click', () => shareTreat(def));
    col.querySelector('[data-again]')?.addEventListener('click', () => { st = freshState(st.type, def); draw(def); window.scrollTo(0, 0); });
    try {
      const w = await W.loadWorld();
      const slot = col.querySelector('.pw-select-slot'); if (!slot) return;
      slot.outerHTML = W.countrySelect('pw-treat-country', st.countryCode, w.countries);
      col.querySelector('#pw-treat-country').onchange = e => { st.countryCode = e.target.value; st.countryName = e.target.value ? (W.countryByCode(e.target.value) || {}).name : ''; };
    } catch (e) { const slot = col.querySelector('.pw-select-slot'); if (slot) slot.textContent = tr('Countries couldn’t load right now.'); }
  }

  /* ---------- Names & descriptions ---------- */
  function pick(list, n) { return list[Math.abs(n) % list.length]; }
  function generateName(def) {
    const w = def.nameWords(st.cfg);
    const n = (st.seed || 0) + (st.answers.feeling || '').length * 3 + (st.answers.color ? COLORS.indexOf(st.answers.color) : 0);
    const feel = { calm: N('Quiet'), cozy: N('Cozy'), bright: N('Sunny'), free: N('Breezy') }[st.answers.feeling];
    const adj = n % 2 && feel ? feel : pick(w.adj, n);
    return tr('{adj} {noun}', { adj: tr(adj), noun: tr(pick(w.noun, n + 1)) });
  }
  function generateDescription(def) {
    const who = { family: N('my family'), friends: N('my friends'), someone: N('someone I’d like to understand'), me: N('a quiet moment just for me') }[st.answers.who] || N('someone I care about');
    const feel = { calm: N('calm'), cozy: N('warmth'), bright: N('sunshine'), free: N('freedom') }[st.answers.feeling] || N('kindness');
    return tr('Made for {who}, with a little {feeling} in every bite.', { who: tr(who), feeling: tr(feel) });
  }

  /* ---------- Card & sharing ---------- */
  /** Card for a recipe saved in the Recipe Book (reuses the builder's own illustration). */
  async function downloadRecipeCard(r) {
    try {
      const def = await loadDef(r.dessertType);
      const prev = st;
      let c;
      st = { type: r.dessertType, cfg: { ...def.defaults(), ...(r.customization || {}) }, name: r.flavorName, description: r.description || '' };
      try { c = await treatCanvas(def, r.ingredients); } finally { st = prev; }
      const a = document.createElement('a'); a.download = `PeaceCream-${r.dessertType}.png`; a.href = c.toDataURL('image/png'); a.hidden = true; document.body.append(a); a.click(); a.remove();
      toast(tr('Your treat card is ready.'));
    } catch (e) { toast(tr('Your card couldn’t save. Please try again.')); }
  }
  async function treatCanvas(def, ingredientList) {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const x = c.getContext('2d');
    await document.fonts.ready;
    x.fillStyle = '#fff9ee'; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = info(st.type)[3]; x.beginPath(); x.roundRect ? x.roundRect(90, 150, 900, 760, [380, 380, 30, 30]) : x.rect(90, 150, 900, 760); x.fill();
    x.fillStyle = '#612335'; for (let i = 0; i < 1080; i += 90) x.fillRect(i, 0, 45, 18);
    const svg = def.draw(st.cfg).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const img = await W.loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    x.drawImage(img, 240, 230, 600, 600);
    const logo = await W.logoCanvas(512); x.drawImage(logo, 860, 40, 170, 170);
    x.textAlign = 'center'; x.fillStyle = '#612335';
    x.font = '500 64px Fraunces, Georgia, "Hiragino Mincho ProN", "Songti SC", serif'; x.fillText(st.name, 540, 1010, 960);
    x.font = '28px "DM Sans", "Hiragino Sans", "PingFang SC", sans-serif'; x.fillText((ingredientList || def.ingredients(st.cfg)).map(s => tr(s)).join(' · '), 540, 1070, 960);
    x.font = 'italic 32px Fraunces, Georgia, "Hiragino Mincho ProN", "Songti SC", serif'; x.fillText(st.description, 540, 1150, 960);
    x.font = '24px "DM Sans", "Hiragino Sans", "PingFang SC", sans-serif'; x.fillText(tr('What does peace taste like?') + ' · PeaceCream', 540, 1290);
    return c;
  }
  async function downloadCard(def) {
    try {
      const c = await treatCanvas(def);
      const a = document.createElement('a'); a.download = `PeaceCream-${st.type}.png`; a.href = c.toDataURL('image/png'); a.hidden = true; document.body.append(a); a.click(); a.remove();
      toast(tr('Your treat card is ready.'));
    } catch (e) { toast(tr('Your card couldn’t save. Please try again.')); }
  }
  async function shareTreat(def) {
    const text = tr('I made my own PeaceCream! 🍦 Want to discover what peace tastes like to you?');
    try {
      const c = await treatCanvas(def);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const file = new File([blob], `PeaceCream-${st.type}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    W.share('PeaceCream', text + ' — ' + st.name);
  }

  root.PeaceDesserts = { downloadRecipeCard, register, loadDef, icon, TYPES, info, renderPicker, renderBuilder, mountHome, COLORS, COLOR_NAMES, get: type => defs[type] };
})(window);
