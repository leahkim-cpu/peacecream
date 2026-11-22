/* PeaceCream World Peace Map: illustrated map of real public scoops, tap-to-scoop animation, passport discoveries. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, S = root.PeaceStore.store;
  const DWELL_MS = 2500;          // time a story must stay open to count as "explored"
  const MAX_ZOOM = 8, MIN_ZOOM = 1;
  const RECENT_DAYS = 30;
  const MOBILE = () => root.matchMedia('(max-width: 700px)').matches;
  let ctx = null;                 // per-visit state, reset on leave
  /* Every country gets its own pastel scoop colour: [scoop, shade, light tint for the land]. */
  const COUNTRY_COLORS = [
    ['#f4b2bf', '#e48c9e', '#f9dbe1'], ['#cddfa9', '#a9c47e', '#e8f0d6'], ['#f8e58f', '#e8cd5c', '#fcf2c9'], ['#f8c08e', '#eb9d5f', '#fce0c8'],
    ['#b9bde9', '#9195d3', '#dfe1f6'], ['#a8dcd1', '#7cc0b2', '#d6f0ea'], ['#f9cd7d', '#ecb050', '#fde8c2'], ['#d9b8ec', '#b98fd6', '#eedff7'],
    ['#a9d3ef', '#7fb6d8', '#d8ebf8'], ['#f6a9c9', '#e47fa9', '#fbd8e6'], ['#bfe3a8', '#97c77a', '#e1f2d6'], ['#f2b8a2', '#e08f74', '#f9dcd1']
  ];
  const hashCode = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
  const countryColor = code => COUNTRY_COLORS[hashCode(code) % COUNTRY_COLORS.length];

  /* ---------- Data ---------- */
  function publicFor(filter, countryCode) {
    const opts = { pageSize: 500 };
    if (countryCode) opts.countryCode = countryCode;
    if (filter.startsWith('v')) opts.topping = +filter.slice(1);
    if (filter.startsWith('t:')) opts.dessertType = filter.slice(2);
    let list = S.listPublicRecipes(opts);
    if (filter === 'recent') list = list.filter(r => Date.now() - Date.parse(r.publishedAt) < RECENT_DAYS * 864e5);
    return list;
  }
  function countsByCountry(filter) {
    const m = {};
    publicFor(filter).forEach(r => { m[r.countryCode] = (m[r.countryCode] || 0) + 1; });
    return m;
  }
  function availableFilters() {
    const all = S.listPublicRecipes({ pageSize: 500 });
    const vals = [...new Set(all.flatMap(r => r.toppings))].sort((a, b) => a - b);
    const f = [['all', tr('All flavors')]];
    if (all.some(r => Date.now() - Date.parse(r.publishedAt) < RECENT_DAYS * 864e5)) f.push(['recent', tr('Recently shared')]);
    const types = S.DESSERT_TYPES.filter(t => all.some(r => r.dessertType === t));
    if (types.length > 1) types.forEach(t => f.push(['t:' + t, tr(TYPE_LABELS[t])]));
    return f.concat(vals.map(v => ['v' + v, toppings[v][0]]));
  }

  /* ---------- Page ---------- */
  async function render(restore) {
    leave();
    ctx = { filter: 'all', k: 1, x: 0, y: 0, busy: false, timers: [], raf: 0, aborted: false, selected: null, current: null, cone: [] };
    const myCtx = ctx;
    W.onLeave(leave);
    W.onLanguage(() => { const v = ctx && { filter: ctx.filter, k: ctx.k, x: ctx.x, y: ctx.y, selected: ctx.selected, currentId: ctx.current && ctx.current.id, open: !app.querySelector('.pw-country-panel')?.hidden }; render(v); });
    let world;
    try { world = await W.loadWorld(); } catch (e) {
      app.innerHTML = `<section class="pw-page pw-empty"><h1>${tr('The map couldn’t load.')}</h1><p>${tr('Please check your connection and try again.')}</p><button class="button" onclick="location.reload()">${tr('Try again')}</button></section>`;
      return;
    }
    if (myCtx !== ctx) return;
    ctx.world = world;
    try { await W.loadScript('pc-desserts.js'); } catch (e) { /* dessert icons are optional */ }
    if (myCtx !== ctx) return;
    ctx.byCode = Object.fromEntries(world.countries.map(c => [c.code, c]));
    const stats = S.publicStats();
    app.innerHTML = `<section class="pw-page pw-map-page">
      <div class="pw-head center"><div class="eyebrow">${tr('Explore')}</div><h1>${tr('The World, One Scoop at a Time')}</h1><p>${tr('Travel through little moments of peace, one flavor at a time.')}</p></div>
      <div class="pw-chips" role="group" aria-label="${tr('Filter scoops')}"></div>
      <div class="pw-map-stage">
        <div class="pw-map-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <svg class="pw-map" viewBox="0 0 ${world.width} ${world.height}" role="group" aria-label="${tr('Illustrated world map. Countries with shared scoops have little ice cream markers.')}">
          <g class="pw-zoom">
            <g class="pw-countries">${world.countries.map(c => `<path d="${c.d}" data-code="${esc(c.code)}"><title>${esc(PeaceI18n.country(c))}</title></path>`).join('')}</g>
            <g class="pw-markers"></g>
          </g>
        </svg>
        <div class="pw-map-tip" aria-hidden="true" hidden></div>
        <p class="pw-map-hint" aria-hidden="true">${tr('Pinch or ⌘/Ctrl + scroll to zoom · drag to explore')}</p><div class="pw-zoom-controls"><button data-zoom="1" aria-label="${tr('Zoom in')}">+</button><button data-zoom="-1" aria-label="${tr('Zoom out')}">−</button><button data-zoom="0" aria-label="${tr('Reset map')}">⟲</button></div>
        <div class="pw-cone" aria-hidden="true" data-holder="cone"><div class="pw-cone-balls"></div><div class="pw-holder-art">${coneSVG()}</div></div>
        <aside class="pw-country-panel" tabindex="-1" aria-live="polite" hidden></aside>
      </div>
      <div class="pw-map-tools">
        <label for="pw-country-pick">${tr('Or choose a country')}</label>
        <div class="pw-row">${W.countrySelect('pw-country-pick', '', world.countries).replace(tr('No country (optional)'), tr('Choose a country…'))}<button class="button" data-pick>${tr('Scoop it')} <span>✳</span></button></div>
      </div>
      <section class="pw-world-stats" aria-labelledby="pw-stats-title">
        <h2 id="pw-stats-title">${tr('Little Scoops Around the World')}</h2>
        ${stats.totalScoops ? `<div class="pw-stat-row"><div><b>${PeaceI18n.number(stats.totalScoops)}</b><span>${trn('public scoop', 'public scoops', stats.totalScoops)}</span></div><div><b>${PeaceI18n.number(stats.countries)}</b><span>${trn('country represented', 'countries represented', stats.countries)}</span></div><div><b>${PeaceI18n.number(stats.stories)}</b><span>${trn('public story shared', 'public stories shared', stats.stories)}</span></div></div>`
          : `<div class="pw-empty small"><div class="pw-empty-art">${W.scoopSVG(9, { size: 80 })}</div><p>${tr('The world is still waiting for its first shared scoop. When someone shares one, it will appear right here.')}</p><a class="button" href="#create">${tr('Create a scoop')} <span>↗</span></a></div>`}
        <p class="pw-local-note"><span aria-hidden="true">✳</span> ${tr('Preview version: these numbers are counted from scoops shared in this browser. Once the shared database is connected, the map will show scoops from everyone.')}</p>
      </section>
    </section>`;
    if (restore) Object.assign(ctx, { filter: restore.filter, k: restore.k, x: restore.x, y: restore.y });
    renderFilters();
    renderMarkers();
    bindMap();
    if (restore && restore.open && restore.selected) {
      const list = publicFor(ctx.filter, restore.selected);
      openCountry(restore.selected, list.find(r => r.id === restore.currentId) || null);
    }
  }
  function leave() {
    if (!ctx) return;
    ctx.aborted = true;
    if (ctx.unbind) ctx.unbind();
    ctx.timers.forEach(clearTimeout);
    cancelAnimationFrame(ctx.raf);
    document.querySelector('.pw-flight')?.remove();
    document.querySelector('.pw-sheet-backdrop')?.remove();
    ctx = null;
  }
  function renderFilters() {
    const box = app.querySelector('.pw-chips');
    const f = availableFilters();
    box.hidden = f.length < 2;
    box.innerHTML = f.map(([k, l]) => `<button class="pw-chip ${ctx.filter === k ? 'on' : ''}" data-filter="${k}" aria-pressed="${ctx.filter === k}">${esc(l)}</button>`).join('');
    box.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { ctx.filter = b.dataset.filter; renderFilters(); renderMarkers(); closePanel(); });
  }
  function renderMarkers() {
    const counts = countsByCountry(ctx.filter);
    ctx.counts = counts;
    app.querySelectorAll('.pw-countries path').forEach(p => { const on = !!counts[p.dataset.code]; p.classList.toggle('has-scoops', on); p.style.setProperty('--land', on ? countryColor(p.dataset.code)[2] : ''); p.style.setProperty('--land-hover', on ? countryColor(p.dataset.code)[0] : ''); });
    const s = markerScale();
    app.querySelector('.pw-markers').innerHTML = Object.keys(counts).map(code => {
      const c = ctx.byCode[code]; if (!c) return '';
      const top = publicFor(ctx.filter, code)[0];
      return `<g class="pw-marker" data-code="${esc(code)}" transform="translate(${c.cx} ${c.cy}) scale(${s})" tabindex="0" role="button" aria-label="${esc(trn('{country}: {n} scoop of peace', '{country}: {n} scoops of peace', counts[code], { country: PeaceI18n.country(c) }))}">
        <circle r="16" cy="-8" fill="transparent"/><g transform="translate(0 -12)"><g class="pw-marker-bob"><path d="M-6 -2 L0 12 L6 -2 Z" fill="#f3cf98" stroke="#612335" stroke-width="1.2"/><circle cx="0" cy="-7" r="8.5" fill="${countryColor(code)[0]}" stroke="#612335" stroke-width="1.2"/><circle cx="-3" cy="-10" r="2" fill="#fff" opacity=".7"/>
        ${counts[code] > 1 ? `<g transform="translate(9 -15)"><circle r="7" fill="#612335"/><text y="3" text-anchor="middle" font-size="8.5" fill="#fff9ee" font-family="DM Sans, sans-serif">${counts[code]}</text></g>` : ''}</g></g></g>`;
    }).join('');
  }

  /** Keeps markers about 26px on screen (a comfortable tap target), whatever the map size or zoom. */
  function markerScale() {
    const svg = app.querySelector('.pw-map');
    const pxPerUnit = svg.getBoundingClientRect().width / ctx.world.width || 1;
    return Math.min(4, Math.max(1, 26 / (20 * pxPerUnit))) / ctx.k;
  }

  /* ---------- Zoom & pan ---------- */
  function applyZoom() {
    const g = app.querySelector('.pw-zoom');
    if (!g) return;
    const { width, height } = ctx.world;
    ctx.x = Math.min(0, Math.max(width * (1 - ctx.k), ctx.x));
    ctx.y = Math.min(0, Math.max(height * (1 - ctx.k), ctx.y));
    g.setAttribute('transform', `translate(${ctx.x} ${ctx.y}) scale(${ctx.k})`);
    app.querySelectorAll('.pw-marker').forEach(m => m.setAttribute('transform', m.getAttribute('transform').replace(/scale\([^)]*\)/, `scale(${markerScale()})`)));
    app.querySelector('.pw-map').style.touchAction = ctx.k > 1 ? 'none' : 'pan-y';
    app.querySelector('.pw-countries').style.strokeWidth = (0.7 / ctx.k).toFixed(3);
  }
  function svgPoint(clientX, clientY) {
    const svg = app.querySelector('.pw-map'), pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function zoomAt(factor, clientX, clientY) {
    const p = svgPoint(clientX, clientY);
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, ctx.k * factor));
    ctx.x = p.x - (p.x - ctx.x) * (k / ctx.k);
    ctx.y = p.y - (p.y - ctx.y) * (k / ctx.k);
    ctx.k = k;
    applyZoom();
  }
  function bindMap() {
    const svg = app.querySelector('.pw-map'), tip = app.querySelector('.pw-map-tip'), stage = app.querySelector('.pw-map-stage');
    const pointers = new Map();
    let drag = null, moved = false, pinch = null;
    svg.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY); }, { passive: false });
    svg.addEventListener('pointerdown', e => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false;
      if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, ox: ctx.x, oy: ctx.y };
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: ctx.k }; drag = null; }
    });
    svg.addEventListener('pointermove', e => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt((pinch.k * d / pinch.d) / ctx.k, (a.x + b.x) / 2, (a.y + b.y) / 2);
        moved = true; return;
      }
      if (drag && ctx.k > 1 && (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 6)) {
        moved = true;
        const scale = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
        ctx.x = drag.ox + (e.clientX - drag.x) * scale; ctx.y = drag.oy + (e.clientY - drag.y) * scale;
        applyZoom();
      }
      hover(e, tip, stage);
    });
    const end = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) drag = null; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('pointerleave', e => { end(e); tip.hidden = true; svg.querySelector('.hover')?.classList.remove('hover'); });
    svg.addEventListener('click', e => {
      if (moved) { moved = false; return; }
      const el = e.target.closest('[data-code]');
      if (el) scoop(el.dataset.code, { x: e.clientX, y: e.clientY });
    });
    svg.addEventListener('keydown', e => {
      const m = e.target.closest('.pw-marker');
      if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); scoop(m.dataset.code); }
    });
    app.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => {
      const r = svg.getBoundingClientRect(), z = +b.dataset.zoom;
      if (!z) { ctx.k = 1; ctx.x = 0; ctx.y = 0; applyZoom(); return; }
      zoomAt(z > 0 ? 1.5 : 1 / 1.5, r.left + r.width / 2, r.top + r.height / 2);
    });
    app.querySelector('[data-pick]').onclick = () => {
      const code = app.querySelector('#pw-country-pick').value;
      if (!code) { toast(tr('Choose a country first.')); return; }
      scoop(code);
    };
    applyZoom();
    const onResize = () => { if (ctx) applyZoom(); };
    root.addEventListener('resize', onResize);
    ctx.unbind = () => root.removeEventListener('resize', onResize);
  }
  function hover(e, tip, stage) {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest('[data-code]');
    const svg = app.querySelector('.pw-map');
    const prev = svg.querySelector('.pw-countries .hover');
    if (!el) { prev?.classList.remove('hover'); tip.hidden = true; return; }
    const code = el.dataset.code, path = svg.querySelector(`.pw-countries [data-code="${CSS.escape(code)}"]`);
    if (prev !== path) { prev?.classList.remove('hover'); path?.classList.add('hover'); }
    const n = ctx.counts[code] || 0, c = ctx.byCode[code], top = n ? publicFor(ctx.filter, code)[0] : null;
    tip.innerHTML = `<span class="pw-tip-scoop">${W.scoopSVG(top ? top.flavor : 9, { size: 26 })}</span><span><b>${esc(PeaceI18n.country(c))}</b><small>${n ? trn('{n} scoop of peace · click to scoop', '{n} scoops of peace · click to scoop', n) : tr('No scoops here yet')}</small></span>`;
    const r = stage.getBoundingClientRect();
    tip.style.transform = `translate(${Math.min(e.clientX - r.left + 16, r.width - 220)}px, ${e.clientY - r.top + 18}px)`;
    tip.hidden = false;
  }

  /* ---------- Scoop! ---------- */
  function markerPoint(code) {
    const c = ctx.byCode[code], svg = app.querySelector('.pw-map'), pt = svg.createSVGPoint();
    pt.x = c.cx * ctx.k + ctx.x; pt.y = c.cy * ctx.k + ctx.y;
    const p = pt.matrixTransform(svg.getScreenCTM());
    return { x: p.x, y: p.y };
  }
  async function scoop(code, at) {
    if (!ctx || ctx.busy || !ctx.byCode[code]) return;
    ctx.busy = true;
    const myCtx = ctx;
    const list = publicFor(ctx.filter, code);
    const recipe = list.length ? list[Math.floor(Math.random() * list.length)] : null;
    app.querySelectorAll('.pw-countries .selected').forEach(p => p.classList.remove('selected'));
    app.querySelector(`.pw-countries [data-code="${CSS.escape(code)}"]`)?.classList.add('selected');
    const from = at || markerPoint(code);
    if (!at && !MOBILE()) app.querySelector('.pw-map-stage').scrollIntoView({ block: 'nearest', behavior: W.reduceMotion() ? 'auto' : 'smooth' });
    try { await collect(from, code, recipe); } catch (e) { /* animation is decorative */ }
    if (myCtx !== ctx || ctx.aborted) return;
    ctx.busy = false;
    openCountry(code, recipe);
  }
  const tween = (ms, fn) => new Promise(resolve => {
    const t0 = performance.now();
    const step = now => {
      if (!ctx || ctx.aborted) return resolve();
      const t = Math.min(1, (now - t0) / ms);
      fn(t);
      if (t < 1) ctx.raf = requestAnimationFrame(step); else resolve();
    };
    ctx.raf = requestAnimationFrame(step);
  });
  const ease = t => 1 - Math.pow(1 - t, 3), easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function ballEl(code, tops) {
    const b = document.createElement('div');
    b.className = 'pw-ball';
    b.style.setProperty('--c', countryColor(code)[0]); b.style.setProperty('--s', countryColor(code)[1]);
    b.innerHTML = Array.from({ length: 5 }, (_, i) => `<i style="--i:${i};background:${['#e66f8b', '#f3b54a', '#7fb6d8', '#9fc77a', '#b48ad6'][(tops[i % (tops.length || 1)] || i) % 5]}"></i>`).join('');
    return b;
  }
  async function flight(from, code, tops) {
    const cone = app.querySelector('.pw-cone');
    const cr = cone.getBoundingClientRect();
    const to = { x: cr.left + cr.width / 2, y: cr.top + cr.height * 0.36 - ctx.cone.length * 9 };
    const empty = code === null;
    if (W.reduceMotion() || document.hidden) { if (!empty) addToCone(code); return; }
    const layer = document.createElement('div');
    layer.className = 'pw-flight'; layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = scooperSVG();
    document.body.append(layer);
    const scooper = layer.firstElementChild;
    const ball = empty ? null : ballEl(code, tops);
    if (ball) layer.append(ball);
    const place = (el, x, y, extra) => { el.style.transform = `translate(${x}px, ${y}px) ${extra || ''}`; };
    // 1. scooper glides in on a little arc
    await tween(380, t => { const e = ease(t); place(scooper, from.x + 70 * (1 - e) - 8, from.y - 70 * (1 - e) - 46 + Math.sin(e * Math.PI) * -12, `rotate(${-35 + 40 * e}deg)`); });
    // 2. dig: tilt the scooper while the scoop rounds up
    await tween(460, t => {
      const e = easeInOut(t);
      place(scooper, from.x - 8 - 10 * e, from.y - 46 + 8 * Math.sin(e * Math.PI), `rotate(${5 - 50 * e}deg)`);
      if (ball) place(ball, from.x - 17, from.y - 22 - 6 * e, `scale(${0.2 + 0.8 * e}, ${0.15 + 0.85 * e})`);
    });
    if (!ball) {
      await tween(420, t => { place(scooper, from.x - 18, from.y - 46 - 30 * t, `rotate(${-45 + 20 * t}deg)`); scooper.style.opacity = 1 - t; });
      layer.remove(); return;
    }
    // 3. lift and fly along a curved path to the cone
    const start = { x: from.x - 17, y: from.y - 28 }, end = { x: to.x - 17, y: to.y - 17 };
    const ctrl = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 160 };
    await tween(820, t => {
      const e = easeInOut(t), u = 1 - e;
      const x = u * u * start.x + 2 * u * e * ctrl.x + e * e * end.x, y = u * u * start.y + 2 * u * e * ctrl.y + e * e * end.y;
      place(ball, x, y, `rotate(${e * 300}deg) scale(${1 - 0.15 * Math.sin(e * Math.PI)})`);
      place(scooper, from.x - 18, from.y - 46 - 40 * t, `rotate(${-45 + 25 * t}deg)`);
      scooper.style.opacity = String(1 - Math.min(1, t * 1.6));
    });
    // 4. land with a gentle bounce
    await tween(380, t => { const s = Math.sin(t * Math.PI); place(ball, end.x, end.y - 6 * Math.sin(t * Math.PI * 2) * (1 - t), `scale(${1 + 0.14 * s}, ${1 - 0.16 * s})`); });
    layer.remove();
    addToCone(code);
  }
  function addToCone(code) {
    ctx.cone = [...ctx.cone, code].slice(-3);
    const balls = app.querySelector('.pw-cone-balls');
    if (!balls) return;
    balls.innerHTML = ctx.cone.map((c, i) => `<span style="--c:${countryColor(c)[0]};--s:${countryColor(c)[1]};--i:${i}"></span>`).join('');
    app.querySelector('.pw-cone').classList.remove('bump'); void app.querySelector('.pw-cone').offsetWidth; app.querySelector('.pw-cone').classList.add('bump');
  }

  /* ---------- Country panel / bottom sheet ---------- */
  function openCountry(code, recipe) {
    const panel = app.querySelector('.pw-country-panel');
    const c = ctx.byCode[code];
    ctx.selected = code;
    ctx.timers.forEach(clearTimeout); ctx.timers = [];
    const list = publicFor(ctx.filter, code);
    const sheet = MOBILE();
    panel.classList.toggle('sheet', sheet);
    if (sheet && !document.querySelector('.pw-sheet-backdrop')) { const b = document.createElement('div'); b.className = 'pw-sheet-backdrop'; b.onclick = closePanel; document.body.append(b); }
    if (!recipe) {
      panel.innerHTML = `${panelTop(PeaceI18n.country(c), tr('No scoops yet'))}<div class="pw-empty small"><div class="pw-empty-art">${W.scoopSVG(9, { size: 80, cup: true })}</div><p>${tr('No scoops here yet. Maybe yours will be the first!')}</p><a class="button" href="#create">${tr('Create a scoop')} <span>↗</span></a></div>`;
    } else {
      ctx.current = recipe;
      const discovered = S.passport().stamps.some(s => s.recipeIds.includes(recipe.id));
      panel.innerHTML = `${panelTop(PeaceI18n.country(c), trn('{n} Scoop of Peace', '{n} Scoops of Peace', list.length))}
        ${typesIn(code)}
        <article class="pw-story">
          <div class="pw-story-art">${W.gelatoSlot(recipe, 360)}</div>
          <span class="pw-muted small">${recipe.isMine ? tr('Featured flavor · shared by you') : tr('Featured flavor')}</span>
          <h3>${esc(recipe.flavorName)}</h3>
          <p class="pw-ingredients">${esc(W.ingredients(recipe))}</p>
          ${recipe.story ? `<blockquote>${esc(recipe.story)}</blockquote>` : '<p class="pw-muted">' + tr('This scoop was shared without a story.') + '</p>'}
          <span class="pw-muted small">${tr('Shared {date}', { date: W.formatDate(recipe.publishedAt) })}</span>
        </article>
        <div class="pw-story-actions">
          ${list.length > 1 ? '<button class="button" data-another>' + tr('Discover Another Scoop') + ' <span>↻</span></button>' : ''}
          <button class="button secondary" data-passport ${discovered ? 'disabled' : ''}>${discovered ? tr('In your passport ✓') : tr('Save to Passport')}</button>
          ${list.length > 1 ? '<button class="button secondary" data-more>' + tr('Explore More') + '</button>' : ''}
        </div>
        <div class="pw-row pw-mini-actions">
          <button class="pw-fav ${S.isFavorite(recipe.id) ? 'on' : ''}" data-fav aria-pressed="${S.isFavorite(recipe.id)}">${S.isFavorite(recipe.id) ? '♥ Favorite' : '♡ Favorite'}</button>
          <button class="back" data-share>${tr('Share')}</button>
          ${recipe.isMine ? `<a class="back" href="#recipe/${recipe.id}">${tr('Open in my Recipe Book')}</a>` : '<button class="back" data-keep>' + tr('Keep in Saved Discoveries') + '</button>'}
        </div>
        <div class="pw-more" hidden></div>
        ${recipe.isMine ? '<p class="pw-local-note small"><span aria-hidden="true">✳</span> ' + tr('Preview version: your own shared scoops stand in for other people’s until the shared database is connected.') + '</p>' : ''}`;
      W.mountGelatos(panel);
      bindStory(panel, code, recipe, list);
      if (!discovered) ctx.timers.push(setTimeout(() => discover(recipe, panel), DWELL_MS));
    }
    panel.hidden = false;
    panel.classList.remove('open'); void panel.offsetWidth; panel.classList.add('open');
    panel.querySelector('[data-close]').onclick = closePanel;
    panel.focus({ preventScroll: true });
    panel.onkeydown = e => { if (e.key === 'Escape') closePanel(); };
  }
  function typesIn(code) {
    const all = S.listPublicRecipes({ countryCode: code, pageSize: 500 });
    const counts = {}; all.forEach(r => { counts[r.dessertType] = (counts[r.dessertType] || 0) + 1; });
    const kinds = Object.keys(counts);
    if (kinds.length < 2 && kinds[0] === 'icecream') return '';
    return `<ul class="pw-kinds" aria-label="${esc(tr('Treats shared here'))}">${kinds.map(k => `<li>${window.PeaceDesserts ? PeaceDesserts.icon(k, 26) : ''}<span>${esc(tr(TYPE_LABELS[k] || k))} · ${PeaceI18n.number(counts[k])}</span></li>`).join('')}</ul>`;
  }
  const panelTop = (name, sub) => `<div class="pw-panel-top"><span class="pw-sheet-handle" aria-hidden="true"></span><div><h2>${esc(name)}</h2><span>${sub}</span></div><button class="pw-close" data-close aria-label="${tr('Back to the map')}">×</button></div>`;
  function bindStory(panel, code, recipe, list) {
    panel.querySelector('[data-another]')?.addEventListener('click', async e => {
      const others = list.filter(r => r.id !== recipe.id);
      const next = others[Math.floor(Math.random() * others.length)];
      const r = e.currentTarget.getBoundingClientRect();
      ctx.busy = true;
      try { await collect({ x: r.left + 30, y: r.top }, code, next); } catch (err) { /* decorative */ }
      if (!ctx) return;
      ctx.busy = false;
      openCountry(code, next);
    });
    panel.querySelector('[data-passport]')?.addEventListener('click', () => discover(recipe, panel));
    panel.querySelector('[data-more]')?.addEventListener('click', e => {
      const more = panel.querySelector('.pw-more');
      more.hidden = !more.hidden;
      e.currentTarget.textContent = more.hidden ? tr('Explore More') : tr('Show less');
      more.innerHTML = `<h3>${tr('All scoops from {country}', { country: esc(PeaceI18n.country(ctx.byCode[code])) })}</h3><ul>${list.map(r => `<li><button data-open="${r.id}" ${r.id === recipe.id ? 'aria-current="true"' : ''}><span>${W.miniArt(r, 30)}</span><span><b>${esc(r.flavorName)}</b><small>${esc(r.story ? r.story.slice(0, 70) + (r.story.length > 70 ? '…' : '') : W.ingredients(r))}</small></span></button></li>`).join('')}</ul>`; W.mountTreats(more);
      more.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openCountry(code, list.find(r => r.id === b.dataset.open)));
    });
    panel.querySelector('[data-fav]').onclick = e => { const on = S.toggleFavorite(recipe.id); e.currentTarget.classList.toggle('on', on); e.currentTarget.textContent = on ? '♥ Favorite' : '♡ Favorite'; e.currentTarget.setAttribute('aria-pressed', on); };
    panel.querySelector('[data-share]').onclick = () => W.share(recipe.flavorName + ' · PeaceCream', tr('“{story}” A scoop of peace from {country} on PeaceCream.', { story: recipe.story || recipe.flavorName, country: W.countryLabel(recipe.countryCode, recipe.countryName) }));
    panel.querySelector('[data-keep]')?.addEventListener('click', e => { S.saveDiscovery(recipe.id); e.currentTarget.textContent = 'Saved ✓'; e.currentTarget.disabled = true; });
  }
  async function discover(recipe, panel) {
    if (!ctx || ctx.current !== recipe) return;
    const res = S.recordDiscovery(recipe.id);
    if (!res) return;
    const btn = panel.querySelector('[data-passport]');
    if (btn) { btn.textContent = tr('In your passport ✓'); btn.disabled = true; }
    if (res.isNewStamp) await W.stampCeremony(recipe.countryCode, W.countryLabel(recipe.countryCode, recipe.countryName));
  }
  function closePanel() {
    if (!ctx) return;
    ctx.timers.forEach(clearTimeout); ctx.timers = [];
    ctx.current = null;
    const panel = app.querySelector('.pw-country-panel');
    if (panel) { panel.hidden = true; panel.classList.remove('open'); }
    document.querySelector('.pw-sheet-backdrop')?.remove();
    app.querySelectorAll('.pw-countries .selected').forEach(p => p.classList.remove('selected'));
    const back = ctx.selected && app.querySelector(`.pw-marker[data-code="${CSS.escape(ctx.selected)}"]`);
    (back || app.querySelector('.pw-map-tools select'))?.focus({ preventScroll: true });
  }

  /* ---------- Art ---------- */
  /* ---------- Desserts: each kind is collected its own way ---------- */
  const N = s => s;
  const TYPE_LABELS = { icecream: N('Ice Cream'), cookie: N('Cookies'), cake: N('Cakes'), donut: N('Donuts'), macaron: N('Macarons'), mochi: N('Mochi'), cupcake: N('Cupcakes') };
  const HOLDER = { icecream: 'cone', cookie: 'tray', cake: 'slice', donut: 'box', macaron: 'box', mochi: 'plate', cupcake: 'gift' };
  /** Ice cream is scooped into the cone; other desserts are lifted, served or boxed. */
  async function collect(from, code, recipe) {
    if (!recipe || W.isIce(recipe)) { setHolder('cone'); return flight(from, recipe ? code : null, recipe ? recipe.toppings : []); }
    const type = recipe.dessertType;
    setHolder(HOLDER[type] || 'plate');
    let art = '';
    try { await W.loadScript('pc-desserts.js'); const def = await PeaceDesserts.loadDef(type); art = (def.mini || def.draw)({ ...def.defaults(), ...(recipe.customization || {}) }); }
    catch (e) { art = window.PeaceDesserts ? PeaceDesserts.icon(type, 60) : ''; }
    return flyTreat(from, type, art);
  }
  function setHolder(kind) {
    const cone = app.querySelector('.pw-cone');
    if (!cone || cone.dataset.holder === kind) return;
    cone.dataset.holder = kind;
    cone.querySelector('.pw-holder-art').innerHTML = kind === 'cone' ? coneSVG() : holderSVG(kind);
    cone.querySelector('.pw-cone-balls').innerHTML = '';
    if (kind !== 'cone') ctx.cone = [];
  }
  function holderSVG(kind) {
    const o = 'stroke="#612335" stroke-width="2" stroke-linejoin="round"';
    if (kind === 'tray') return `<svg viewBox="0 0 80 90" width="78" height="88"><rect x="4" y="62" width="72" height="14" rx="4" fill="#d9dde3" ${o}/><rect x="10" y="58" width="60" height="6" rx="3" fill="#eceff2" ${o}/></svg>`;
    if (kind === 'plate' || kind === 'slice') return `<svg viewBox="0 0 80 90" width="78" height="88"><ellipse cx="40" cy="72" rx="36" ry="10" fill="#fffdf8" ${o}/><ellipse cx="40" cy="70" rx="24" ry="5" fill="none" stroke="#f3c6ce" stroke-width="2"/>${kind === 'slice' ? `<path d="M40 80 V88 M28 88 H52" ${o}/>` : ''}</svg>`;
    if (kind === 'gift') return `<svg viewBox="0 0 80 90" width="78" height="88"><rect x="12" y="48" width="56" height="38" rx="4" fill="#f3c6ce" ${o}/><rect x="36" y="48" width="8" height="38" fill="#fff9ee"/><g class="pw-lid"><rect x="8" y="38" width="64" height="12" rx="3" fill="#f4b2bf" ${o}/><path d="M40 38 q-14 -14 -16 0 M40 38 q14 -14 16 0" fill="none" ${o}/></g></svg>`;
    return `<svg viewBox="0 0 80 90" width="78" height="88"><path d="M8 50 L72 50 L66 86 L14 86 Z" fill="#f9ecc4" ${o}/><path d="M8 50 L20 34 L60 34 L72 50" fill="#fff9ee" ${o}/><path d="M14 62 H66" stroke="#f3c6ce" stroke-width="4"/></svg>`;
  }
  async function flyTreat(from, type, art) {
    const cone = app.querySelector('.pw-cone'), cr = cone.getBoundingClientRect();
    const to = { x: cr.left + cr.width / 2, y: cr.top + cr.height * 0.55 };
    const land = () => {
      const b = cone.querySelector('.pw-cone-balls');
      if (b) b.innerHTML = `<span class="pw-held" style="--i:0">${art}</span>`;
      cone.classList.remove('bump'); void cone.offsetWidth; cone.classList.add('bump');
      if (type === 'cupcake' || type === 'donut' || type === 'macaron') cone.querySelector('.pw-lid')?.animate([{ transform: 'translateY(-14px) rotate(-12deg)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
    };
    if (W.reduceMotion() || document.hidden) { land(); return; }
    const layer = document.createElement('div');
    layer.className = 'pw-flight'; layer.setAttribute('aria-hidden', 'true');
    const item = document.createElement('div');
    item.className = 'pw-flying-treat'; item.innerHTML = art;
    layer.append(item); document.body.append(layer);
    const S0 = 56, place = (x, y, extra) => { item.style.transform = `translate(${x - S0 / 2}px, ${y - S0 / 2}px) ${extra || ''}`; };
    // 1. a little gesture that fits the dessert
    await tween(520, t => {
      const e = ease(t);
      if (type === 'cookie') place(from.x, from.y - 34 * e, `scale(${0.3 + 0.7 * e})`);                         // lifted from the tray
      else if (type === 'cake') place(from.x - 40 + 40 * e, from.y - 10 * e, `scale(${0.4 + 0.6 * e})`);        // a slice slides out to be served
      else if (type === 'donut') place(from.x + Math.sin(e * Math.PI * 2) * 8, from.y - 30 * e, `scale(${0.3 + 0.7 * e}) rotate(${e * 40}deg)`); // floats up
      else if (type === 'mochi') place(from.x, from.y - 22 * e, `scale(${0.4 + 0.6 * e}, ${0.3 + 0.7 * e * (1 + 0.2 * Math.sin(e * Math.PI))})`); // soft squish as it is lifted
      else place(from.x, from.y - 26 * e, `scale(${0.3 + 0.8 * Math.sin(e * Math.PI / 2)})`);                     // picked up
    });
    // 2. a curved journey to its plate, box or gift
    const start = { x: from.x, y: from.y - 30 }, ctrl = { x: (start.x + to.x) / 2, y: Math.min(start.y, to.y) - 150 };
    await tween(820, t => {
      const e = easeInOut(t), u = 1 - e;
      const x = u * u * start.x + 2 * u * e * ctrl.x + e * e * to.x, y = u * u * start.y + 2 * u * e * ctrl.y + e * e * to.y;
      const spin = type === 'donut' ? e * 360 : type === 'cookie' ? e * 20 : 0;
      place(x, y, `rotate(${spin}deg) scale(${1 - 0.25 * e})`);
    });
    layer.remove();
    land();
  }

  function coneSVG() {
    return `<svg viewBox="0 0 80 90" width="78" height="88"><path d="M14 30 L40 86 L66 30 Z" fill="#f3cf98" stroke="#612335" stroke-width="2" stroke-linejoin="round"/><path d="M20 36 L52 70 M32 32 L60 58 M60 36 L30 72 M46 32 L22 52" stroke="#d9a764" stroke-width="1.5"/><path d="M10 30 Q40 22 70 30" fill="none" stroke="#612335" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  function scooperSVG() {
    return `<svg class="pw-scooper" viewBox="0 0 90 60" width="90" height="60"><rect x="38" y="24" width="50" height="11" rx="5.5" fill="#f3c6ce" stroke="#612335" stroke-width="2" transform="rotate(-18 38 30)"/><path d="M4 30 A18 18 0 0 0 40 30 Z" fill="#e9e3dc" stroke="#612335" stroke-width="2"/><path d="M9 33 A13 13 0 0 0 30 38" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/></svg>`;
  }

  root.PeaceMap = { render };
})(window);
