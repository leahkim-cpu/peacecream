/* PeaceCream Time Capsules: private letters to your future self, opened on or after a chosen date. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, S = root.PeaceStore.store, P = root.PeaceStore;
  const PRESETS = [['week', 'One week'], ['month', 'One month'], ['half', 'Six months'], ['year', 'One year'], ['custom', 'Custom date']];
  const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function render(isNew) {
    const capsules = S.listCapsules();
    if (isNew || !capsules.length) return renderCreate(capsules.length > 0);
    renderShelf();
  }

  /* ---------- Create ---------- */
  function renderCreate(hasShelf) {
    const recipes = S.listMyRecipes();
    const pre = W.pendingCapsuleRecipe && recipes.some(r => r.id === W.pendingCapsuleRecipe) ? W.pendingCapsuleRecipe : '';
    W.pendingCapsuleRecipe = null;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    app.innerHTML = `<section class="pw-page pw-capsule-page">
      <div class="pw-head center"><div class="eyebrow">${tr('My little world')}</div><h1>${tr('Time Capsule')}</h1><p>${tr('Save a little piece of today’s peace for your future self.')}</p></div>
      <div class="pw-capsule-grid">
        <div class="pw-freezer" aria-hidden="true">${freezerSVG()}</div>
        <form class="pw-capsule-form" novalidate>
          <div class="pw-field"><label for="pw-reflection">${tr('What does peace feel like to you today?')}</label><textarea id="pw-reflection" rows="5" maxlength="${S.LIMITS.reflection}" placeholder="${tr('Today, peace feels like…')}" required></textarea><span class="char-count" data-count>0 / ${S.LIMITS.reflection}</span></div>
          <fieldset class="pw-field"><legend>${tr('How are you feeling?')} <span>${tr('(optional)')}</span></legend><div class="pw-chips">${S.MOODS.map(m => `<label class="pw-chip-radio"><input type="radio" name="mood" value="${m}"><span>${tr(m)}</span></label>`).join('')}</div></fieldset>
          <div class="pw-field"><label for="pw-cap-scoop">${tr('Add a scoop from your Recipe Book <span>(optional)</span>')}</label>
            ${recipes.length ? `<select id="pw-cap-scoop"><option value="">${tr('No scoop')}</option>${recipes.map(r => `<option value="${r.id}" ${r.id === pre ? 'selected' : ''}>${esc(r.flavorName)} · ${esc(flavors[r.flavor])}</option>`).join('')}</select>` : `<p class="pw-muted small">${tr('No saved scoops yet. <a class="text-link" href="#create">Make one first</a> if you like.')}</p>`}</div>
          <div class="pw-field"><label for="pw-cap-title">${tr('Name your capsule <span>(optional)</span>')}</label><input id="pw-cap-title" maxlength="${S.LIMITS.capsuleTitle}" placeholder="${tr('A little moment of peace')}" autocomplete="off"></div>
          <fieldset class="pw-field"><legend>${tr('When should it open?')}</legend><div class="pw-chips">${PRESETS.map(([k, l], i) => `<label class="pw-chip-radio"><input type="radio" name="when" value="${k}" ${i === 1 ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>
            <div class="pw-custom-date" hidden><label for="pw-cap-date">${tr('Opening date')}</label><input type="date" id="pw-cap-date" min="${isoDay(tomorrow)}"></div>
            <small class="pw-muted" data-when-label></small></fieldset>
          <p class="pw-form-error" role="alert"></p>
          <div class="pw-row"><button class="button">${tr('Seal my capsule')} <span>✳</span></button>${hasShelf ? '<a class="text-link" href="#capsules">' + tr('See my capsules') + '</a>' : ''}</div>
          ${W.localNotice(tr('Your capsules are private and stay only in this browser on this device. If you clear your browser data or change devices, they will be lost. PeaceCream can’t send reminders, so remember to come back!'))}
        </form>
      </div></section>`;
    const form = app.querySelector('.pw-capsule-form');
    const refl = form.querySelector('#pw-reflection');
    refl.oninput = () => { form.querySelector('[data-count]').textContent = `${refl.value.length} / ${S.LIMITS.reflection}`; };
    const whenLabel = () => {
      const d = chosenDate(form);
      form.querySelector('.pw-custom-date').hidden = form.when.value !== 'custom';
      form.querySelector('[data-when-label]').textContent = d && !isNaN(d) ? tr('Opens on {date}, your local time.', { date: W.formatDate(d, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }) : tr('Choose a date after today.');
    };
    form.querySelectorAll('[name=when]').forEach(r => r.onchange = whenLabel);
    form.querySelector('#pw-cap-date').oninput = whenLabel;
    whenLabel();
    form.onsubmit = e => {
      e.preventDefault();
      const err = form.querySelector('.pw-form-error');
      try {
        const capsule = S.createCapsule({ reflection: refl.value, mood: form.mood.value || null, recipeId: form.querySelector('#pw-cap-scoop')?.value || null, title: form.querySelector('#pw-cap-title').value || tr('A little moment of peace'), unlockAt: chosenDate(form) });
        refl.value = '';
        seal(capsule);
      } catch (ex) { err.textContent = W.errText(ex); }
    };
  }
  function chosenDate(form) {
    const v = form.when.value;
    if (v === 'custom') return P.localDate(form.querySelector('#pw-cap-date').value);
    return P.presetDate(v, new Date());
  }

  /* ---------- Seal ---------- */
  async function seal(capsule, still) {
    W.onLanguage(() => seal(capsule, true));
    const recipe = capsule.recipeId ? S.getRecipe(capsule.recipeId) : null;
    app.innerHTML = `<section class="pw-page pw-seal ${still || W.reduceMotion() ? 'still' : ''}" aria-live="polite">
      <div class="pw-seal-stage" aria-hidden="true"><div class="pw-letter"><span></span><span></span><span></span></div><div class="pw-jar">${jarSVG(recipe ? recipe.flavor : 9)}</div><div class="pw-shelf-line"></div></div>
      <h1 class="pw-seal-msg">${tr('Your little moment of peace is waiting for you.')}</h1>
      <p class="pw-muted">${tr('It will open on {date}.', { date: W.formatDate(capsule.unlockAt) })}</p>
      <div class="pw-row center"><a class="button" href="#capsules">${tr('See my capsule shelf')} <span>→</span></a><a class="text-link" href="#capsules/new">${tr('Make another')}</a></div>
    </section>`;
    sameRouteLinks();
    const stage = app.querySelector('.pw-seal-stage');
    if (!still && !W.reduceMotion()) { await W.wait(2300); if (!stage.isConnected) return; const r = stage.getBoundingClientRect(); W.sprinkleBurst(r.left + r.width / 2, r.top + r.height / 2, 22); }
  }

  /* ---------- Shelf ---------- */
  function renderShelf() {
    const caps = S.listCapsules();
    app.innerHTML = `<section class="pw-page pw-capsule-page">
      <div class="pw-head center"><div class="eyebrow">${tr('My little world')}</div><h1>${tr('My Capsules')}</h1><p>${tr('Little moments of peace, waiting on the shelf.')}</p></div>
      <div class="pw-row center"><a class="button" href="#capsules/new">${tr('Make a new capsule')} <span>✳</span></a></div>
      <ul class="pw-shelf">${caps.map(c => { const r = c.recipeId ? S.getRecipe(c.recipeId) : null; return `<li class="pw-capsule ${c.unlocked ? 'ready' : 'locked'}">
        <div class="pw-capsule-jar">${jarSVG(r ? r.flavor : 9, !c.openedAt)}</div>
        <h3>${esc(c.title)}</h3>
        <p class="small">${tr('Made {date}', { date: W.formatDate(c.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }) })}</p>
        <p class="small"><b>${c.unlocked ? (c.openedAt ? tr('Opened') : tr('Ready to open')) : tr('Opens {date}', { date: W.formatDate(c.unlockAt, { month: 'short', day: 'numeric', year: 'numeric' }) })}</b></p>
        ${c.unlocked ? `<button class="button" data-open="${c.id}" aria-label="${esc(tr(c.openedAt ? 'Read again: {title}' : 'Open: {title}', { title: c.title }))}">${c.openedAt ? tr('Read again') : tr('Open capsule')}</button>` : `<span class="pw-lock" aria-label="${esc(tr('Locked until {date}', { date: W.formatDate(c.unlockAt) }))}">${tr('🔒 Still sleeping')}</span>`}
        <button class="back danger small" data-del="${c.id}" aria-label="${esc(tr('Delete capsule: {title}', { title: c.title }))}">${tr('Delete')}</button></li>`; }).join('')}<li class="pw-shelf-board" aria-hidden="true"></li></ul>
      ${W.localNotice(tr('Capsules are private and live only in this browser on this device. Clearing browser data or changing devices will erase them. There are no email reminders.'))}
    </section>`;
    W.mountGelatos(app);
    app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => open(b.dataset.open));
    app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!await W.confirmDialog(tr('Delete this capsule forever? It can’t be recovered.'), tr('Delete capsule'))) return;
      S.deleteCapsule(b.dataset.del); renderShelf();
    });
  }

  /* ---------- Open ---------- */
  function open(id, still) {
    let c;
    try { c = S.openCapsule(id); } catch (e) { toast(e.code === 'LOCKED' ? tr('This capsule is still sleeping. Come back on its opening day.') : tr('This capsule couldn’t be found.')); return renderShelf(); }
    const r = c.recipeId ? S.getRecipe(c.recipeId) : null;
    app.innerHTML = `<section class="pw-page pw-open ${still || W.reduceMotion() ? 'still' : ''}">
      <div class="pw-open-stage" aria-hidden="true"><div class="pw-open-jar">${jarSVG(r ? r.flavor : 9, true)}</div><div class="pw-glow"></div></div>
      <div class="pw-open-reveal">
        <div class="eyebrow">${esc(c.title)}</div>
        <h1>${tr('This was your peace on {date}.', { date: W.formatDate(c.createdAt) })}</h1>
        <div class="pw-open-content">
          <blockquote class="pw-letter-paper">${esc(c.reflection).replace(/\n/g, '<br>')}${c.mood ? `<footer>${tr('Feeling: {mood}', { mood: esc(tr(c.mood)) })}</footer>` : ''}</blockquote>
          ${r ? `<figure class="pw-open-scoop">${W.gelatoSlot(r, 360)}<figcaption><b>${esc(r.flavorName)}</b><small>${esc(W.ingredients(r))}</small></figcaption></figure>` : ''}
        </div>
        <div class="pw-row center"><a class="button" href="#capsules">${tr('Back to my shelf')}</a><a class="text-link" href="#capsules/new">${tr('Write a new capsule')}</a></div>
      </div></section>`;
    W.mountGelatos(app);
    sameRouteLinks();
    W.onLanguage(() => open(id, true));
    app.querySelector('h1').setAttribute('tabindex', '-1');
    setTimeout(() => app.querySelector('.pw-open h1')?.focus({ preventScroll: true }), W.reduceMotion() ? 0 : 2400);
  }

  /** Links to #capsules or #capsules/new while already on that address would not fire hashchange. */
  function sameRouteLinks() {
    app.querySelectorAll('a[href="#capsules"], a[href="#capsules/new"]').forEach(a => a.addEventListener('click', e => {
      if (location.hash !== a.getAttribute('href')) return;
      e.preventDefault();
      if (a.getAttribute('href') === '#capsules') renderShelf(); else renderCreate(true);
      window.scrollTo(0, 0);
    }));
  }

  /* ---------- Art ---------- */
  function jarSVG(flavor, ribbon) {
    const fill = W.FLAVOR_COLORS[flavor];
    return `<svg viewBox="0 0 120 130" width="120" height="130" aria-hidden="true"><g class="pw-jar-lid"><rect x="22" y="14" width="76" height="16" rx="7" fill="#f3c6ce" stroke="#612335" stroke-width="2"/><circle cx="60" cy="10" r="6" fill="#d7e0b4" stroke="#612335" stroke-width="2"/></g>
      <path d="M26 30 H94 L88 118 Q60 126 32 118 Z" fill="#fff9ee" stroke="#612335" stroke-width="2"/><path d="M31 70 Q60 58 89 70 L87 104 Q60 112 33 104 Z" fill="${fill}" opacity=".9"/>
      <rect x="44" y="40" width="32" height="20" rx="3" fill="#fff" stroke="#c9bdb0"/><path d="M48 46 H72 M48 51 H68" stroke="#c9bdb0" stroke-width="1.5"/>
      ${ribbon ? '<g class="pw-ribbon"><path d="M27 52 H93" stroke="#a85564" stroke-width="5"/><path d="M60 52 q-14 -14 -16 2 q4 6 16 -2 q14 -14 16 2 q-4 6 -16 -2" fill="#f3c6ce" stroke="#a85564" stroke-width="2"/></g>' : ''}</svg>`;
  }
  function freezerSVG() {
    return `<svg viewBox="0 0 220 260" width="220" height="260"><rect x="20" y="30" width="180" height="220" rx="26" fill="#d9e9f2" stroke="#612335" stroke-width="2.5"/><rect x="34" y="46" width="152" height="130" rx="14" fill="#fff9ee" stroke="#612335" stroke-width="2"/><path d="M44 150 H176" stroke="#e3d6c8" stroke-width="3"/>
      <g transform="translate(52 72) scale(.55)">${jarSVG(0, true).replace(/<\/?svg[^>]*>/g, '')}</g><g transform="translate(112 72) scale(.55)">${jarSVG(1, true).replace(/<\/?svg[^>]*>/g, '')}</g>
      <rect x="34" y="188" width="152" height="46" rx="12" fill="#f3c6ce" stroke="#612335" stroke-width="2"/><rect x="92" y="204" width="36" height="8" rx="4" fill="#612335"/><text x="110" y="24" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="15" fill="#612335">${tr('little freezer')}</text>
      <g class="pw-snow" fill="#fff"><circle cx="60" cy="58" r="2"/><circle cx="160" cy="64" r="2.5"/><circle cx="120" cy="54" r="1.6"/></g></svg>`;
  }

  root.PeaceCapsules = { render };
})(window);
