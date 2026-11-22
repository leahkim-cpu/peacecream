/* PeaceCream little-world shared UI: routing hooks, navigation, illustrations, celebrations.
 * Loaded before app.js. Uses app.js globals (flavors, toppings, esc, toast, app) only inside functions. */
(function (root) {
  'use strict';
  const FLAVOR_COLORS = ['#f4b2bf', '#cddfa9', '#f8e58f', '#f8c08e', '#b9bde9', '#b3cf98', '#f9cd7d', '#f3ede1', '#a77767', '#f8edcc'];
  const FLAVOR_SHADE = ['#e48c9e', '#a9c47e', '#e8cd5c', '#eb9d5f', '#9195d3', '#8fb06f', '#ecb050', '#ddd3c0', '#82554a', '#e8d6a2'];
  const SPRINKLES = ['#e66f8b', '#f3b54a', '#7fb6d8', '#9fc77a', '#b48ad6', '#f08a5d', '#ffffff', '#c64d68', '#d8a45c', '#6fae6a'];
  const reduceMotion = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Lazy route modules ---------- */
  const ROUTES = [
    { match: /^#(?:world|little-world)$/, script: [], render: () => renderWorld() },
    { match: /^#map$/, script: 'pc-map.js', render: () => root.PeaceMap.render() },
    { match: /^#passport$/, script: 'pc-passport.js', render: () => root.PeacePassport.render() },
    // Ready-made desserts are fixed products now; the old customizers redirect to the Collection.
    { match: /^#treats?(?:\/\w+)?$/, script: [], render: () => { location.replace('#collection'); } },
    { match: /^#(collection|gift)$/, script: ['pc-rewards-core.js', 'pc-catalog.js', 'pc-shop.js', 'pc-share.js'], render: m => root.PeaceShop.render(m[1] === 'gift') },
    { match: /^#gift\/([a-z-]+)$/, script: [...['pc-rewards-core.js', 'pc-catalog.js', 'pc-shop.js', 'pc-share.js'], 'pc-gift.js'], render: m => root.PeaceGift.render(m[1]) },
    { match: /^#giftcard\/([\w-]+)$/, script: [...['pc-rewards-core.js', 'pc-catalog.js', 'pc-shop.js', 'pc-share.js'], 'pc-gift.js'], render: m => root.PeaceGift.renderCard(m[1]) },
    { match: /^#hello\/([\w-]+)$/, script: ['pc-rewards-core.js', 'pc-catalog.js', 'pc-share.js'], render: m => root.PeaceShare.renderHello(m[1]) },
    { match: /^#rewards$/, script: ['pc-rewards-core.js', 'pc-catalog.js', 'pc-share.js'], render: () => root.PeaceShare.renderRewards() },
    { match: /^#camera$/, script: ['pc-photos.js', 'pc-camera-render.js', 'pc-camera.js'], render: () => root.PeaceCamera.render() },
    { match: /^#recipes$/, script: ['pc-photos.js', 'pc-recipes.js'], render: () => root.PeaceRecipes.renderBook() },
    { match: /^#recipe\/([\w-]+)$/, script: 'pc-recipes.js', render: m => root.PeaceRecipes.renderDetail(m[1]) },
    { match: /^#capsules(?:\/new)?$/, script: 'pc-capsules.js', render: m => root.PeaceCapsules.render(m[0] === '#capsules/new') },
    { match: /^#melt$/, script: 'pc-melt.js', render: () => root.PeaceMelt.render() }
  ];
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src + '?v=' + (root.PEACE_WORLD_VERSION || '1');
        s.onload = resolve;
        s.onerror = () => { delete loaded[src]; reject(new Error('Could not load ' + src)); };
        document.body.append(s);
      });
    }
    return loaded[src];
  }
  let teardown = null;
  let langHandler = null;
  let lastRender = null;
  /** Register a cleanup for the current page (runs when the route changes). */
  function onLeave(fn) { teardown = fn; }
  /** A page can handle language changes itself (e.g. to keep an animation running). */
  function onLanguage(fn) { langHandler = fn; }
  /** Re-render the current page in a new language without losing what the person typed or where they were. */
  function rerender(renderFn) {
    rebuildMenu();
    if (langHandler) { const snap = snapshotForm(); try { const r = langHandler(); Promise.resolve(r).then(() => restoreForm(snap)); } catch (e) { /* fall through to a normal render */ } return; }
    const snap = snapshotForm(), y = root.scrollY;
    lastRender = null;
    renderFn();
    Promise.resolve(lastRender).then(() => { restoreForm(snap); root.scrollTo(0, y); });
  }
  function snapshotForm() {
    return [...app.querySelectorAll('input, textarea, select')].filter(el => el.type !== 'file' && (el.id || el.name)).map(el => ({ id: el.id, name: el.name, type: el.type, value: el.value, checked: el.checked }));
  }
  function restoreForm(snap) {
    snap.forEach(f => {
      const el = f.type === 'radio' ? app.querySelector(`input[name="${CSS.escape(f.name)}"][value="${CSS.escape(f.value)}"]`) : (f.id ? app.querySelector('#' + CSS.escape(f.id)) : null);
      if (!el) return;
      if (f.type === 'radio' || f.type === 'checkbox') { if (el.checked !== f.checked) { el.checked = f.checked; if (f.checked) el.dispatchEvent(new Event('change', { bubbles: true })); } return; }
      if (el.value === f.value) return;
      el.value = f.value;
      if (el.tagName !== 'SELECT') el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  function rebuildMenu() {
    const old = document.querySelector('.pw-menu-wrap');
    if (old) old.remove();
    buildMenu();
    markActive(location.hash || '#home');
  }
  /** User-facing text for an error thrown by the data layer. */
  function errText(err) { return tr((err && err.message) || 'Something went wrong. Please try again.', err && err.vars); }
  /** Called from app.js render(). Returns true if this module handled the route. */
  function route(hash) {
    if (teardown) { try { teardown(); } catch (e) { /* cleanup must never block navigation */ } teardown = null; }
    langHandler = null;
    closeMenu();
    document.querySelector('.pw-ceremony')?.remove();
    document.querySelectorAll('.pc-anim, .pc-share-dialog').forEach(el => el.remove());
    markActive(hash);
    for (const r of ROUTES) {
      const m = r.match.exec(hash);
      if (!m) continue;
      app.innerHTML = '<section class="pw-page pw-loading" aria-busy="true"><div class="pw-loader" aria-hidden="true"><img src="' + (root.PEACE_LOGO_URL || 'assets/logo/peacetreats-logo.jpg') + '" alt="" width="120" height="120"></div><p>' + tr('Scooping…') + '</p></section>';
      lastRender = [].concat(r.script).reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve()).then(() => { if (location.hash === hash || (!location.hash && hash === '#home')) return r.render(m); })
        .catch(() => { app.innerHTML = '<section class="pw-page pw-empty"><h1>' + tr('This little corner couldn’t load.') + '</h1><p>' + tr('Please check your connection and try again.') + '</p><a class="button" href="' + esc(hash) + '" onclick="location.reload()">' + tr('Try again') + '</a></section>'; });
      return true;
    }
    return false;
  }

  /* ---------- Navigation ---------- */
  const MENU = [
    ['Explore', [['#map', 'World Peace Map', 'Scoop a little peace from anywhere'], ['#passport', 'My Peace Passport', 'Stamps from stories you discover']]],
    ['My Little World', [['#recipes', 'My Little Recipe Book', 'Every treat you have saved'], ['#camera', 'Capture Your Scoop', 'Turn a real treat into PeaceCream'], ['#capsules', 'Time Capsules', 'A letter to your future self']]],
    ['Share Your Peace', [['#collection', 'Gift Collection', 'Ready-made desserts to give'], ['#rewards', 'My Rewards', 'Little thank-yous for sharing']]],
    ['A Moment for You', [['#melt', 'Melt Your Worries', 'Let something go, one scoop at a time']]]
  ];
  /** Little world is a permanent page: every feature has a visible, direct link. */
  function renderWorld() {
    const sections = [...MENU, ['PeaceCream', [
      ['#create', 'Create my PeaceCream', 'A little imagination. A sprinkle of meaning. Your own flavor of peace.'],
      ['#discover', 'Discover my PeaceCream', 'Twelve thoughtful questions. A little curiosity. A PeaceCream that begins with you.'],
      ['#about', 'Our little story', 'Everyone has their own flavor of peace.']
    ]]];
    app.innerHTML = `<section class="pw-page pw-world-page">
      <div class="pw-head"><div class="eyebrow">PeaceCream</div><h1>${tr('Little world')}</h1>
        <p>${tr('A little joy. A little connection. A little more peace.')}</p></div>
      ${sections.map(([group, items], i) => `<section class="pw-world-section" aria-labelledby="pw-world-group-${i}">
        <h2 id="pw-world-group-${i}">${tr(group)}</h2>
        <div class="pw-world-grid">${items.map(([href, label, sub]) => `<a class="pw-world-card" href="${href}">
          <h3>${tr(label)}</h3><p>${tr(sub)}</p></a>`).join('')}</div>
      </section>`).join('')}
    </section>`;
  }
  function buildMenu() {
    const header = document.querySelector('header');
    if (!header || header.querySelector('.pw-menu-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pw-menu-wrap';
    wrap.innerHTML = `<a class="pw-menu-button" href="#world">${tr('Little world')} <span aria-hidden="true">✳</span></a>`;
    header.querySelector('nav').after(wrap);
  }
  function closeMenu() {
    // Older open menus can remain briefly during a hot reload.
    const menu = document.querySelector('#pw-menu');
    if (menu) menu.hidden = true;
  }
  function markActive(hash) {
    const base = hash.startsWith('#recipe') ? '#recipes' : hash.startsWith('#gift') ? '#collection' : hash.replace(/\/.*$/, '');
    document.querySelectorAll('[data-pw-nav]').forEach(a => a.classList.toggle('active', a.dataset.pwNav === base));
    document.querySelector('.pw-menu-button')?.classList.toggle('active', base === '#world' || base === '#little-world' || MENU.some(g => g[1].some(i => i[0] === base)));
  }

  /* ---------- Illustrations ---------- */
  let svgId = 0;
  /** Hand-drawn style SVG scoop on a cone or in a cup. */
  function scoopSVG(flavor, opts) {
    const o = opts || {}, size = o.size || 120, id = 'pws' + (++svgId);
    const fill = FLAVOR_COLORS[flavor] || FLAVOR_COLORS[0], shade = FLAVOR_SHADE[flavor] || FLAVOR_SHADE[0];
    const tops = (o.toppings || []).map(t => SPRINKLES[t % SPRINKLES.length]);
    const dots = [[38, 40], [58, 30], [74, 44], [47, 55], [66, 58], [30, 54], [80, 33]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="7" height="2.6" rx="1.3" fill="${tops.length ? tops[i % tops.length] : SPRINKLES[(i + flavor) % 10]}" transform="rotate(${(i * 47) % 180} ${x + 3} ${y + 1})"/>`).join('');
    const holder = o.cup
      ? `<path d="M22 72 L98 72 L88 116 Q60 122 32 116 Z" fill="#fff9ee" stroke="#612335" stroke-width="2.2"/><path d="M26 86 H94 M29 100 H91" stroke="#f3c6ce" stroke-width="6"/>`
      : `<path d="M30 74 L60 128 L90 74 Z" fill="#f3cf98" stroke="#612335" stroke-width="2.2" stroke-linejoin="round"/><path d="M38 80 L72 112 M52 76 L80 100 M82 80 L50 112 M68 76 L42 98" stroke="#d9a764" stroke-width="1.6"/>`;
    return `<svg class="pw-scoop" viewBox="0 0 120 132" width="${size}" height="${size * 1.1}" aria-hidden="true" focusable="false">
      <defs><radialGradient id="${id}" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".35" stop-color="${fill}"/><stop offset="1" stop-color="${shade}"/></radialGradient></defs>
      ${holder}
      <g class="pw-scoop-ball"><path d="M22 74 C14 52 30 18 60 18 C90 18 106 52 98 74 C94 82 88 76 84 84 C80 92 74 80 70 86 C64 94 58 80 52 86 C46 92 42 78 36 84 C30 88 26 80 22 74 Z" fill="url(#${id})" stroke="#612335" stroke-width="2.2" stroke-linejoin="round"/>${dots}<ellipse cx="44" cy="34" rx="9" ry="5" fill="#fff" opacity=".55" transform="rotate(-25 44 34)"/></g>
    </svg>`;
  }
  /** Photo-real gelato from the existing renderer, so saved recipes look like Create. */
  function gelatoFigure(recipe, size, label) {
    const holder = document.createElement('div');
    holder.className = 'pw-gelato';
    holder.setAttribute('role', 'img');
    holder.setAttribute('aria-label', label || `${flavors[recipe.flavor]} gelato`);
    holder.innerHTML = `<div class="cup-sprite" style="background-position:${pos(recipe.flavor)}" aria-hidden="true"></div>`;
    const c = document.createElement('canvas');
    c.width = c.height = size; c.setAttribute('aria-hidden', 'true');
    holder.append(c);
    if (root.PeaceCreamRenderer) PeaceCreamRenderer.draw(c, recipe.flavor, [...recipe.toppings]).then(() => holder.classList.add('drawn')).catch(() => {});
    return holder;
  }
  function mountGelatos(scope) {
    mountTreats(scope);
    (scope || document).querySelectorAll('[data-gelato]').forEach(el => {
      const [flavor, tops, size] = el.dataset.gelato.split('|');
      el.replaceWith(gelatoFigure({ flavor: +flavor, toppings: tops ? tops.split(',').map(Number) : [] }, +size || 300, el.getAttribute('aria-label')));
    });
  }
  const isIce = r => !r.dessertType || r.dessertType === 'icecream';
  /** Placeholder for any treat's illustration: real gelato photo-render for ice cream, the builder's SVG for other desserts. */
  const gelatoSlot = (r, size, label) => isIce(r)
    ? `<span data-gelato="${r.flavor}|${(r.toppings || []).join(',')}|${size}" aria-label="${esc(label || tr('{flavor} gelato', { flavor: flavors[r.flavor] }))}"></span>`
    : `<span class="pw-treat-slot" role="img" aria-label="${esc(label || r.flavorName || '')}" data-treat-type="${esc(r.dessertType)}" data-treat-cfg="${esc(JSON.stringify(r.customization || {}))}"></span>`;
  const ingredients = r => (isIce(r) ? [flavors[r.flavor], ...r.toppings.map(t => toppings[t][1])] : (r.ingredients || []).map(x => tr(x))).join(' + ');
  /** Small illustration for lists and previews: a scoop for ice cream, the real dessert drawing otherwise (call mountTreats after inserting). */
  const miniArt = (r, size) => (isIce(r) ? scoopSVG(r.flavor, { size, toppings: r.toppings }) : `<span class="pw-mini-treat" style="width:${size}px;height:${size}px">${gelatoSlot(r, size)}</span>`);
  /** Draws saved desserts into their placeholders once the builder code has loaded. */
  function mountTreats(scope) {
    const slots = (scope || document).querySelectorAll('[data-treat-type]');
    if (!slots.length) return;
    if (!root.PeaceDesserts) { loadScript('pc-desserts.js').then(() => mountTreats(scope)).catch(() => {}); return; }
    slots.forEach(el => {
      const type = el.dataset.treatType;
      PeaceDesserts.loadDef(type).then(def => {
        let cfg = {};
        try { cfg = { ...def.defaults(), ...JSON.parse(el.dataset.treatCfg || '{}') }; } catch (e) { cfg = def.defaults(); }
        el.innerHTML = (def.mini || def.draw)(cfg);
        el.removeAttribute('data-treat-type');
      }).catch(() => { el.innerHTML = PeaceDesserts.icon(type, 120); });
    });
  }
  const values = r => r.toppings.map(t => toppings[t][0]);

  /* ---------- Passport stamps ---------- */
  const STAMP_THEMES = { 392: 'Sakura Scoop', 250: 'Lavender Dream', '076': 'Sunshine Scoop', 410: 'Moonlight Scoop', 380: 'Gelato Garden' };
  const GENERIC = ['Honey Breeze', 'Rainbow Swirl', 'Cloud Cone', 'Starlight Scoop', 'Petal Swirl', 'Morning Dew', 'Peach Glow', 'Mint Meadow', 'Cocoa Hug', 'Berry Lullaby'];
  const STAMP_COLORS = ['#f3c6ce', '#d7e0b4', '#d9cdee', '#f9ddb8', '#c9e2ee', '#f6e4a6'];
  const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function stampTheme(code) {
    const h = hash(code);
    return { name: tr('{theme} Stamp', { theme: tr(STAMP_THEMES[code] || GENERIC[h % GENERIC.length]) }), color: STAMP_COLORS[h % STAMP_COLORS.length], flavor: h % 10, tilt: (h % 9) - 4 };
  }
  function stampSVG(code, countryName, opts) {
    const t = stampTheme(code), locked = opts && opts.locked;
    const teeth = Array.from({ length: 36 }, (_, i) => { const a = i / 36 * Math.PI * 2; return `<circle cx="${(80 + Math.cos(a) * 76).toFixed(1)}" cy="${(80 + Math.sin(a) * 76).toFixed(1)}" r="4.2" fill="var(--paper)"/>`; }).join('');
    return `<svg class="pw-stamp-svg ${locked ? 'locked' : ''}" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <circle cx="80" cy="80" r="76" fill="${locked ? '#efe7dc' : t.color}"/>${teeth}
      <circle cx="80" cy="80" r="62" fill="none" stroke="${locked ? '#c9bdb0' : '#612335'}" stroke-width="1.5" stroke-dasharray="4 4"/>
      <g transform="translate(52 34) scale(.47)" opacity="${locked ? .35 : 1}">${scoopSVG(t.flavor, { size: 120 }).replace(/<\/?svg[^>]*>/g, '')}</g>
      <text x="80" y="112" text-anchor="middle" font-family="Fraunces, Georgia, Hiragino Mincho ProN, Songti SC, serif" font-size="13" fill="${locked ? '#9b8b80' : '#612335'}">${esc(countryName.length > 16 ? countryName.slice(0, 15) + '…' : countryName)}</text>
      <text x="80" y="127" text-anchor="middle" font-family="DM Sans, Hiragino Sans, PingFang SC, sans-serif" font-size="7" letter-spacing=".6" textLength="96" lengthAdjust="spacingAndGlyphs" fill="${locked ? '#9b8b80' : '#612335'}">${locked ? tr('NOT YET STAMPED') : esc(t.name.toUpperCase())}</text>
    </svg>`;
  }

  /* ---------- Celebrations ---------- */
  function sprinkleBurst(x, y, count) {
    if (reduceMotion()) return;
    const layer = document.createElement('div');
    layer.className = 'pw-burst'; layer.setAttribute('aria-hidden', 'true');
    layer.style.left = x + 'px'; layer.style.top = y + 'px';
    for (let i = 0; i < (count || 18); i++) {
      const s = document.createElement('i');
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 70;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg');
      s.style.background = SPRINKLES[i % SPRINKLES.length];
      layer.append(s);
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 1300);
  }
  /** Full stamping ceremony overlay. Resolves when dismissed. */
  function stampCeremony(code, countryName) {
    return new Promise(resolve => {
      const prev = document.activeElement;
      const o = document.createElement('div');
      o.className = 'pw-ceremony' + (reduceMotion() ? ' still' : '');
      o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'pw-ceremony-title');
      o.innerHTML = `<div class="pw-ceremony-card"><div class="pw-ceremony-page"><div class="pw-ceremony-stamp">${stampSVG(code, countryName)}</div><span class="pw-ink" aria-hidden="true"></span></div>
        <h2 id="pw-ceremony-title">${tr('New stamp unlocked!')}</h2><p>${tr('You discovered a little peace from {country}!', { country: esc(countryName) })}</p>
        <div class="pw-row"><a class="button" href="#passport">${tr('View My Passport')} <span>→</span></a><button class="button secondary" data-close>${tr('Keep exploring')}</button></div></div>`;
      document.body.append(o);
      const close = () => { o.remove(); prev && prev.focus && prev.focus({ preventScroll: true }); resolve(); };
      o.querySelector('[data-close]').onclick = close;
      o.querySelector('a').onclick = () => { o.remove(); resolve(); };
      o.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const f = [...o.querySelectorAll('a,button')]; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } } });
      o.addEventListener('click', e => { if (e.target === o) close(); });
      o.querySelector('[data-close]').focus({ preventScroll: true });
      setTimeout(() => { if (!o.isConnected) return; const r = o.querySelector('.pw-ceremony-stamp').getBoundingClientRect(); sprinkleBurst(r.left + r.width / 2, r.top + r.height / 2, 26); }, reduceMotion() ? 0 : 900);
    });
  }

  function formatDate(iso, opts) {
    return PeaceI18n.date(iso, opts);
  }
  function localNotice(text) {
    return `<p class="pw-local-note"><span aria-hidden="true">✳</span> ${text || tr('Saved only in this browser on this device. It isn’t backed up, and clearing your browser data will erase it.')}${root.PeaceStore && PeaceStore.storageUnavailable ? ' <b>' + tr('Your browser is blocking storage right now, so nothing will be kept after you leave.') + '</b>' : ''}</p>`;
  }
  function confirmDialog(message, okLabel) {
    return new Promise(resolve => {
      const d = document.createElement('dialog');
      d.className = 'pw-dialog';
      d.innerHTML = `<form method="dialog"><p>${esc(message)}</p><div class="pw-row"><button class="button secondary" value="no">${tr('Cancel')}</button><button class="button" value="yes">${esc(okLabel || tr('Yes'))}</button></div></form>`;
      document.body.append(d);
      d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
      d.showModal();
    });
  }
  async function share(title, text) {
    const url = location.origin + location.pathname + '#map';
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(text + '\n' + url);
      toast(tr('Copied, ready to share.'));
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast(tr('Sharing isn’t available here. You can copy the text instead.'));
    }
  }

  let worldPromise = null;
  /** Real country boundaries (Natural Earth), projected at build time. Fetched only when needed. */
  let worldByCode = null;
  /** World entry for a country code, once the map data has loaded (null before). */
  function countryByCode(code) { return worldByCode && code ? worldByCode[code] || null : null; }
  /** Country name in the current language, falling back to the stored English name. */
  function countryLabel(code, fallback) { const c = countryByCode(code); return c ? PeaceI18n.country(c) : (fallback || ''); }
  function loadWorld() {
    if (!worldPromise) worldPromise = fetch('data/world-paths.json?v=' + (root.PEACE_WORLD_VERSION || '1')).then(r => { if (!r.ok) throw new Error('map ' + r.status); return r.json(); }).then(w => { worldByCode = Object.fromEntries(w.countries.map(c => [c.code, c])); return w; }).catch(e => { worldPromise = null; throw e; });
    return worldPromise;
  }
  function countrySelect(id, selected, countries) {
    return `<select id="${id}"><option value="">${tr('No country (optional)')}</option>${[...countries].sort((a, b) => PeaceI18n.country(a).localeCompare(PeaceI18n.country(b), PeaceI18n.lang)).map(c => `<option value="${esc(c.code)}" ${c.code === selected ? 'selected' : ''}>${esc(PeaceI18n.country(c))}</option>`).join('')}</select>`;
  }

  /* ---------- Official logo ----------
   * assets/logo/peacetreats-logo.jpg is the approved artwork and is never modified.
   * For placing it on coloured backgrounds we derive, in memory, a transparent copy:
   * the black line art keeps its exact shape and colour; only the cream paper becomes transparent. */
  const LOGO_SRC = 'assets/logo/peacetreats-logo.jpg';
  const logoCache = {};
  function loadImage(src) {
    return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('image')); i.src = src; });
  }
  /** Transparent canvas of the official logo at the given pixel size (square). */
  function logoCanvas(size) {
    if (!logoCache[size]) {
      logoCache[size] = loadImage(LOGO_SRC).then(img => {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.imageSmoothingQuality = 'high';
        x.drawImage(img, 0, 0, size, size);
        const d = x.getImageData(0, 0, size, size), p = d.data;
        const PAPER = 246; // lightest tone of the artwork's paper
        for (let i = 0; i < p.length; i += 4) {
          const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
          const a = Math.max(0, Math.min(1, (PAPER - lum) / (PAPER - 20)));
          p[i] = p[i + 1] = p[i + 2] = 0; p[i + 3] = Math.round(a * 255);
        }
        x.putImageData(d, 0, 0);
        return c;
      });
      logoCache[size].catch(() => { delete logoCache[size]; });
    }
    return logoCache[size];
  }
  function useTransparentLogo() {
    logoCanvas(512).then(c => {
      const url = c.toDataURL('image/png');
      document.querySelectorAll('.brand-logo img, .pw-loader img').forEach(img => { img.src = url; img.classList.add('clear'); });
      root.PEACE_LOGO_URL = url;
    }).catch(() => { /* the original JPEG stays visible */ });
  }

  root.PeaceWorld = { miniArt, isIce, mountTreats, logoCanvas, LOGO_SRC, loadImage, rebuildMenu, countryByCode, countryLabel, onLanguage, rerender, errText, loadWorld, countrySelect, route, onLeave, loadScript, scoopSVG, gelatoFigure, mountGelatos, gelatoSlot, ingredients, values, stampTheme, stampSVG, stampCeremony, sprinkleBurst, formatDate, localNotice, confirmDialog, share, reduceMotion, wait, FLAVOR_COLORS, FLAVOR_SHADE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { buildMenu(); useTransparentLogo(); }); else { buildMenu(); useTransparentLogo(); }
})(window);
