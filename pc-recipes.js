/* PeaceCream Recipe Book: save-after-create, scrapbook, recipe pages, explicit publishing. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, S = root.PeaceStore.store;
  const N = s => s; // marks English UI strings for translation extraction
  const FILTERS = [['all', 'All scoops'], ['favorites', 'Favorites'], ['recent', 'Most recent'], ['oldest', 'Oldest'], ['private', 'Private'], ['public', 'Public']];
  let filter = 'all';
  let typeFilter = 'all';
  let lastSaved = { sig: null, id: null };
  const sigOf = s => JSON.stringify([s.flavor, s.toppings, s.peace, s.why]);

  /* ---------- Save panel on the "Made by you" step ---------- */
  function mountSavePanel(state) {
    const col = document.querySelector('.options-column');
    if (!col || col.querySelector('.pw-save-panel')) return;
    const panel = document.createElement('div');
    panel.className = 'pw-save-panel';
    col.querySelector('.next-row')?.after(panel);
    const saved = lastSaved.sig === sigOf(state) && S.getRecipe(lastSaved.id);
    if (saved) return showSaved(panel, lastSaved.id);
    panel.innerHTML = `<div class="pw-save-head"><span class="pw-save-icon" aria-hidden="true">${W.scoopSVG(state.flavor, { size: 44, toppings: state.toppings })}</span><div><b>${tr('Keep this scoop?')}</b><small>${tr('Save it to your Recipe Book. It stays private unless you choose to share it.')}</small></div></div>
      <div class="pw-save-country" hidden><label for="pw-save-country">${tr('Connect it to a country <span>(optional, never detected automatically)</span>')}</label><div class="pw-select-slot">${tr('Loading countries…')}</div></div>
      <div class="pw-row"><button class="button" data-save>${tr('Save to My Recipe Book')} <span>✳</span></button><button class="back" data-country-toggle>${tr('Add a country')}</button></div>`;
    panel.querySelector('[data-country-toggle]').onclick = async e => {
      e.target.hidden = true;
      const box = panel.querySelector('.pw-save-country');
      box.hidden = false;
      try { const w = await W.loadWorld(); box.querySelector('.pw-select-slot').outerHTML = W.countrySelect('pw-save-country', '', w.countries); box.querySelector('select').focus(); }
      catch (err) { box.querySelector('.pw-select-slot').textContent = tr('Countries couldn’t load. You can add one later from your Recipe Book.'); }
    };
    panel.querySelector('[data-save]').onclick = async () => {
      const sel = panel.querySelector('#pw-save-country');
      let countryName = null;
      if (sel && sel.value) countryName = (W.countryByCode(sel.value) || {}).name || sel.options[sel.selectedIndex].text;
      try {
        const r = S.saveRecipe({ flavor: state.flavor, toppings: [...state.toppings], flavorName: state.peace || tr('A little joy'), peaceMemory: state.why, countryCode: sel ? sel.value : null, countryName });
        lastSaved = { sig: sigOf(state), id: r.id };
        showSaved(panel, r.id, true);
      } catch (err) { toast(err.message ? W.errText(err) : tr('Your scoop couldn’t be saved. Please try again.')); }
    };
  }
  function showSaved(panel, id, fresh) {
    panel.innerHTML = `<div class="pw-save-head saved" role="status"><span class="pw-save-icon" aria-hidden="true">✓</span><div><b>${tr('Saved to your Recipe Book')}</b><small>${tr('Private, on this device only.')}</small></div></div>
      <div class="pw-row"><a class="button" href="#recipe/${id}">${tr('Open my recipe')} <span>→</span></a><a class="text-link" href="#capsules/new" data-capsule>${tr('Put it in a time capsule')}</a></div>`;
    panel.querySelector('[data-capsule]').onclick = () => { W.pendingCapsuleRecipe = id; };
    if (fresh) { const r = panel.getBoundingClientRect(); W.sprinkleBurst(r.left + 30, r.top + 30, 16); }
  }

  /* ---------- Recipe Book ---------- */
  const TYPE_LABELS = { all: N('All treats'), icecream: N('Ice Cream'), cookie: N('Cookies'), cake: N('Cakes'), donut: N('Donuts'), macaron: N('Macarons'), mochi: N('Mochi'), cupcake: N('Cupcakes') };
  /** Dessert-type chips, only for types that are actually in the book. */
  function typeChips(all) {
    const present = ['all', ...S.DESSERT_TYPES.filter(t => all.some(r => r.dessertType === t))];
    if (present.length < 3) return '';
    return `<div class="pw-chips pw-type-chips" role="group" aria-label="${tr('Filter by treat')}">${present.map(t => `<button class="pw-chip ${typeFilter === t ? 'on' : ''}" data-type-filter="${t}" aria-pressed="${typeFilter === t}">${tr(TYPE_LABELS[t])}</button>`).join('')}</div>`;
  }
  function listFor(f) {
    if (f === 'favorites' || f === 'private' || f === 'public') return S.listMyRecipes(f, 'recent', typeFilter);
    return S.listMyRecipes('all', f === 'oldest' ? 'oldest' : 'recent', typeFilter);
  }
  function card(r, i) {
    const fav = S.isFavorite(r.id);
    const words = r.description || r.peaceMemory;
    return `<article class="pw-recipe-card tilt-${i % 4}">
      <span class="pw-tape" aria-hidden="true"></span>
      <a class="pw-recipe-link" href="#recipe/${r.id}" aria-label="${esc(tr('Open {name}', { name: r.flavorName }))}">${W.gelatoSlot(r, 300)}</a>
      <div class="pw-recipe-body">
        <div class="pw-recipe-top"><h3><a href="#recipe/${r.id}">${esc(r.flavorName)}</a></h3>
        <button class="pw-fav ${fav ? 'on' : ''}" data-fav="${r.id}" aria-pressed="${fav}" aria-label="${fav ? tr('Remove from favorites') : tr('Add to favorites')}">${fav ? '♥' : '♡'}</button></div>
        <p class="pw-ingredients">${esc(W.ingredients(r))}</p>
        ${words ? `<p class="pw-quote">“${esc(words.length > 110 ? words.slice(0, 108) + '…' : words)}”</p>` : ''}
        <div class="pw-recipe-meta"><span>${W.formatDate(r.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</span><span class="pw-badge ${r.visibility}">${r.visibility === 'public' ? tr('Shared') : tr('Private')}</span></div>
      </div></article>`;
  }
  function renderBook() {
    const all = S.listMyRecipes();
    if (typeFilter !== 'all' && !all.some(r => r.dessertType === typeFilter)) typeFilter = 'all';
    W.onLeave(() => photoUrls.splice(0).forEach(u => URL.revokeObjectURL(u)));
    const list = listFor(filter);
    const saved = S.listSavedDiscoveries().filter(r => !r.isMine);
    app.innerHTML = `<section class="pw-page pw-book">
      <div class="pw-head"><div class="eyebrow">${tr('My little world')}</div><h1>${tr('My Little Recipe Book')}</h1><p>${tr('A collection of all the little moments that taste like peace.')}</p></div>
      ${all.length ? `${typeChips(all)}<div class="pw-chips" role="group" aria-label="${tr('Filter recipes')}">${FILTERS.map(([k, l]) => `<button class="pw-chip ${filter === k ? 'on' : ''}" data-filter="${k}" aria-pressed="${filter === k}">${tr(l)}</button>`).join('')}</div>
      ${list.length ? `<div class="pw-scrapbook">${list.map(card).join('')}</div>` : `<div class="pw-empty small"><p>${tr('No scoops here yet. Try another page of your book.')}</p></div>`}`
      : `<div class="pw-empty"><div class="pw-empty-art">${W.scoopSVG(9, { size: 120, cup: true })}<span class="pw-empty-page" aria-hidden="true"></span></div><h2>${tr('Your recipe book is waiting for its first scoop.')}</h2><a class="button" href="#create">${tr('Create your first scoop')} <span>↗</span></a></div>`}
      ${saved.length ? `<h2 class="pw-subhead">${tr('Saved discoveries')}</h2><p class="pw-muted">${tr('Scoops other people shared that you kept. They stay theirs.')}</p><div class="pw-scrapbook">${saved.map((r, i) => `<article class="pw-recipe-card tilt-${i % 4}"><span class="pw-tape" aria-hidden="true"></span>${W.gelatoSlot(r, 300)}<div class="pw-recipe-body"><h3>${esc(r.flavorName)}</h3><p class="pw-ingredients">${esc(W.ingredients(r))}</p>${r.story ? `<p class="pw-quote">“${esc(r.story)}”</p>` : ''}<span class="pw-muted">${tr('From {country}', { country: esc(W.countryLabel(r.countryCode, r.countryName)) })}</span></div></article>`).join('')}</div>` : ''}
      <section class="pw-photo-shelf" hidden aria-labelledby="pw-photos-title"><h2 class="pw-subhead" id="pw-photos-title">${tr('My Scoop Photos')}</h2><p class="pw-muted">${tr('Branded photos you made with the PeaceCream Camera. They stay on this device and are never shared unless you share them.')}</p><div class="pw-photo-grid"></div></section>
      <div class="pw-book-foot">${W.localNotice()}${all.length ? '<button class="back" data-clear>' + tr('Delete everything saved on this device') + '</button>' : ''}</div>
    </section>`;
    W.mountGelatos(app);
    renderPhotos();
    app.querySelectorAll('[data-type-filter]').forEach(b => b.onclick = () => { typeFilter = b.dataset.typeFilter; renderBook(); app.querySelector(`[data-type-filter="${typeFilter}"]`)?.focus(); });
    app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; renderBook(); app.querySelector(`[data-filter="${filter}"]`).focus(); });
    app.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => {
      const on = S.toggleFavorite(b.dataset.fav);
      b.classList.toggle('on', on); b.textContent = on ? '♥' : '♡'; b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? tr('Remove from favorites') : tr('Add to favorites'));
      if (on) { const r = b.getBoundingClientRect(); W.sprinkleBurst(r.left + r.width / 2, r.top + r.height / 2, 10); }
      if (filter === 'favorites' && !on) renderBook();
    });
    app.querySelector('[data-clear]')?.addEventListener('click', async () => {
      if (!await W.confirmDialog(tr('Delete all your recipes, passport stamps and time capsules from this device? This can’t be undone.'), tr('Delete everything'))) return;
      S.clearEverything(); if (root.PeacePhotos) await PeacePhotos.clear().catch(() => {}); toast(tr('Everything saved on this device was deleted.')); renderBook();
    });
  }

  const photoUrls = [];
  async function renderPhotos() {
    const shelf = app.querySelector('.pw-photo-shelf');
    if (!shelf || !root.PeacePhotos) return;
    photoUrls.splice(0).forEach(u => URL.revokeObjectURL(u));
    let photos = [];
    try { photos = await PeacePhotos.list(); } catch (e) { return; }
    if (!photos.length || !shelf.isConnected) return;
    shelf.hidden = false;
    // a book with only photos should not say it is empty
    app.querySelector('.pw-book > .pw-empty')?.classList.add('pw-with-photos');
    shelf.querySelector('.pw-photo-grid').innerHTML = photos.map((p, i) => {
      const url = URL.createObjectURL(p.blob); photoUrls.push(url);
      return `<figure class="pw-photo tilt-${i % 4}"><img src="${url}" alt="${esc(p.caption || tr('A PeaceCream photo'))}" loading="lazy"><figcaption><span>${esc(p.caption || '')}</span><small>${W.formatDate(p.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
        <span class="pw-row"><a class="back" href="${url}" download="PeaceCream-photo.jpg">${tr('Download')}</a><button class="back danger" data-del-photo="${p.id}">${tr('Delete')}</button></span></figcaption></figure>`;
    }).join('');
    shelf.querySelectorAll('[data-del-photo]').forEach(b => b.onclick = async () => {
      if (!await W.confirmDialog(tr('Delete this photo from your Recipe Book? This can’t be undone.'), tr('Delete photo'))) return;
      await PeacePhotos.remove(b.dataset.delPhoto).catch(() => toast(tr('The photo couldn’t be deleted. Please try again.')));
      renderBook();
    });
  }

  /* ---------- Recipe page ---------- */
  async function renderDetail(id) {
    const r = S.getRecipe(id);
    if (!r || r.ownerId !== S.profile().id) {
      app.innerHTML = `<section class="pw-page pw-empty"><div class="pw-empty-art">${W.scoopSVG(0, { size: 110 })}</div><h1>${tr('This scoop has melted away.')}</h1><p>${tr('It may have been deleted, or it lives on another device.')}</p><a class="button" href="#recipes">${tr('Back to my Recipe Book')}</a></section>`;
      return;
    }
    const fav = S.isFavorite(r.id);
    app.innerHTML = `<section class="pw-page pw-detail">
      <div class="crumb"><a href="#recipes">${tr('My Recipe Book')}</a> / ${esc(r.flavorName)}</div>
      <div class="pw-detail-grid">
        <figure class="pw-detail-stage">${W.gelatoSlot(r, 700, W.isIce(r) && r.toppings.length ? tr('{flavor} gelato with {toppings}', { flavor: flavors[r.flavor], toppings: r.toppings.map(t => toppings[t][1]).join(tr(' and ')) }) : r.flavorName)}<figcaption>${W.formatDate(r.createdAt)}</figcaption></figure>
        <div class="pw-recipe-page">
          <span class="pw-badge ${r.visibility}">${r.visibility === 'public' ? (r.showCountry ? tr('Shared on the World Map') : tr('Shared')) : tr('Private')}</span>
          <div class="pw-title-row"><h1 id="pw-name">${esc(r.flavorName)}</h1><button class="back" data-rename>${tr('Edit name')}</button></div>
          <form class="pw-rename" hidden><label for="pw-rename-input">${tr('Flavor name')}</label><div class="pw-row"><input id="pw-rename-input" maxlength="${S.LIMITS.flavorName}" value="${esc(r.flavorName)}" autocomplete="off"><button class="button">${tr('Save')}</button><button class="back" type="button" data-cancel>${tr('Cancel')}</button></div></form>
          <h2>${tr('Ingredients')}</h2>
          <ul class="pw-ingredient-list">${W.isIce(r) ? `<li><b>${flavors[r.flavor]}</b><span>${tr('The base: a little joy you chose.')}</span></li>${r.toppings.map(t => `<li><b>${toppings[t][1]}</b><span>${toppings[t][0]}: ${toppings[t][2]}</span></li>`).join('')}` : (r.ingredients || []).map(x => `<li><b>${esc(tr(x))}</b></li>`).join('')}</ul>
          <h2>${tr('Peace story')}</h2>
          ${r.peaceMemory ? `<blockquote>${esc(r.peaceMemory)}</blockquote>` : '<p class="pw-muted">' + tr('No story written for this scoop.') + '</p>'}
          <div class="pw-field"><label for="pw-country">${tr('Country')}</label><div class="pw-select-slot">${tr('Loading countries…')}</div><small>${tr('Optional. PeaceCream never guesses your location.')}</small></div>
          <div class="pw-actions">
            <button class="pw-fav big ${fav ? 'on' : ''}" data-fav aria-pressed="${fav}">${fav ? '♥ Favorite' : '♡ Favorite'}</button>
            <button class="button secondary" data-share>${tr('Share My Recipe ♡')}</button>
            <button class="button secondary" data-card>${tr('Download Peace Card')}</button>
            ${r.visibility === 'public' ? '<button class="button secondary" data-unpublish>' + tr('Make private again') + '</button>' : '<button class="button" data-publish>' + tr('Share on the World Map') + ' <span>↗</span></button>'}
          </div>
          <div class="pw-row pw-detail-links"><a class="text-link" href="#capsules/new" data-capsule>${tr('Put this scoop in a time capsule')}</a><button class="back danger" data-delete>${tr('Delete recipe')}</button></div>
          ${W.localNotice()}
        </div>
      </div></section>`;
    W.mountGelatos(app);
    bindDetail(r);
    try {
      const w = await W.loadWorld();
      const slot = app.querySelector('.pw-detail .pw-select-slot');
      if (!slot) return;
      slot.outerHTML = W.countrySelect('pw-country', r.countryCode || '', w.countries);
      app.querySelector('#pw-country').onchange = async e => {
        const sel = e.target, name = sel.value ? (W.countryByCode(sel.value) || {}).name || sel.options[sel.selectedIndex].text : null, label = sel.value ? sel.options[sel.selectedIndex].text : null;
        S.setCountry(r.id, sel.value || null, name);
        const current = S.getRecipe(r.id);
        if (current.visibility === 'public' && sel.value && !current.showCountry) {
          // Already shared without a country: ask before putting it on the map.
          if (await W.confirmDialog(tr('Show this shared scoop on the World Map in {country}?', { country: label }), tr('Show it on the map'))) {
            S.publishRecipe(r.id, { showCountry: true, includeMemory: !!current.shareMemory });
            toast(tr('Your scoop is now on the World Map in {country}.', { country: label }));
          } else toast(tr('Country saved. Your scoop stays off the map.'));
        } else toast(sel.value ? tr('Country saved.') : tr('Country removed.'));
        if (current.visibility === 'public') renderDetail(r.id);
      };
    } catch (e) { const slot = app.querySelector('.pw-select-slot'); if (slot) slot.textContent = r.countryName || tr('Countries couldn’t load right now.'); }
  }
  function bindDetail(r) {
    const form = app.querySelector('.pw-rename');
    app.querySelector('[data-rename]').onclick = () => { form.hidden = false; form.querySelector('input').focus(); };
    app.querySelector('[data-cancel]').onclick = () => { form.hidden = true; };
    form.onsubmit = e => {
      e.preventDefault();
      try { S.renameRecipe(r.id, form.querySelector('input').value); toast(tr('Renamed.')); renderDetail(r.id); }
      catch (err) { toast(W.errText(err)); }
    };
    app.querySelector('[data-fav]').onclick = e => { const on = S.toggleFavorite(r.id); e.currentTarget.classList.toggle('on', on); e.currentTarget.textContent = on ? '♥ Favorite' : '♡ Favorite'; e.currentTarget.setAttribute('aria-pressed', on); };
    app.querySelector('[data-share]').onclick = () => ['pc-rewards-core.js', 'pc-catalog.js', 'pc-share.js'].reduce((p, f) => p.then(() => W.loadScript(f)), Promise.resolve())
      .then(() => PeaceShare.open({ kind: 'recipe', title: r.flavorName, subtitle: W.ingredients(r), flavor: W.isIce(r) ? r.flavor : undefined, toppings: r.toppings, personal: r.peaceMemory || r.description || '' }))
      .catch(() => toast(tr('Sharing couldn’t load. Please try again.')));
    app.querySelector('[data-card]').onclick = () => (W.isIce(r) ? download({ flavor: r.flavor, toppings: r.toppings, peace: r.flavorName, why: r.peaceMemory }) : W.loadScript('pc-desserts.js').then(() => PeaceDesserts.downloadRecipeCard(r)));
    app.querySelector('[data-capsule]').onclick = () => { W.pendingCapsuleRecipe = r.id; };
    app.querySelector('[data-unpublish]')?.addEventListener('click', () => { S.unpublishRecipe(r.id); toast(tr('Your scoop is private again.')); renderDetail(r.id); });
    app.querySelector('[data-publish]')?.addEventListener('click', () => publishDialog(r));
    app.querySelector('[data-delete]').onclick = async () => {
      if (!await W.confirmDialog(tr('Delete “{name}”? This can’t be undone.', { name: r.flavorName }), tr('Delete recipe'))) return;
      S.deleteRecipe(r.id); toast(tr('Recipe deleted.')); location.hash = '#recipes';
    };
  }

  /* ---------- Publish preview ---------- */
  async function publishDialog(r) {
    let countries = [];
    try { countries = (await W.loadWorld()).countries; } catch (e) { /* country picker falls back to the saved country */ }
    const d = document.createElement('dialog');
    d.className = 'pw-dialog pw-publish';
    d.setAttribute('aria-labelledby', 'pw-pub-title');
    d.innerHTML = `<form method="dialog">
      <h2 id="pw-pub-title">${tr('Share this scoop?')}</h2>
      <p class="pw-muted">${tr('Here is exactly what would become public. Nothing else is shared.')}</p>
      <div class="pw-field"><label for="pw-pub-story">${tr('A short public story <span>(optional)</span>')}</label><textarea id="pw-pub-story" maxlength="${S.LIMITS.description}" rows="3" placeholder="${tr('Peace tastes like…')}">${esc(r.description || '')}</textarea></div>
      ${r.peaceMemory ? `<label class="pw-check"><input type="checkbox" id="pw-pub-memory"> ${tr('Use my private peace story instead')}</label>` : ''}
      <div class="pw-field"><label for="pw-pub-country">${tr('Show it on the World Map in')}</label>${countries.length ? W.countrySelect('pw-pub-country', r.countryCode || '', countries) : `<input id="pw-pub-country" disabled value="${esc(W.countryLabel(r.countryCode, r.countryName) || tr('No country'))}">`}<small>${tr('Only the country name is shown. Never your city or exact location.')}</small></div>
      <div class="pw-preview" aria-live="polite"></div>
      <p class="pw-muted small">${tr('Not shared: your device, account details, or anything else in your Recipe Book.')}</p>
      <div class="pw-notice">${tr('In this preview version, shared scoops appear on the World Map <b>in this browser only</b>. They will reach other people once the shared database is connected.')}</div>
      <div class="pw-row"><button class="button secondary" value="cancel">${tr('Keep it private')}</button><button class="button" value="publish" data-go>${tr('Share my scoop')}</button></div></form>`;
    document.body.append(d);
    const story = d.querySelector('#pw-pub-story'), mem = d.querySelector('#pw-pub-memory'), country = d.querySelector('#pw-pub-country');
    const preview = () => {
      const text = mem && mem.checked ? r.peaceMemory : story.value.trim();
      const cName = country && country.value && country.options ? country.options[country.selectedIndex].text : W.countryLabel(r.countryCode, r.countryName);
      story.disabled = !!(mem && mem.checked);
      d.querySelector('.pw-preview').innerHTML = `<span class="pw-preview-label">${tr('Public preview')}</span><div class="pw-preview-card"><span class="pw-preview-scoop">${W.miniArt(r, 54)}</span><div><b>${esc(r.flavorName)}</b><small>${esc(W.ingredients(r))}</small>${text ? `<p>“${esc(text)}”</p>` : ''}<em>${cName ? tr('On the map in {country}', { country: esc(cName) }) : tr('Not on the map (no country chosen)')}</em></div></div>`; W.mountTreats(d);
      d.querySelector('[data-go]').textContent = cName ? tr('Share my scoop') : tr('Share without a country');
    };
    [story, mem, country].forEach(el => el && el.addEventListener(el.tagName === 'TEXTAREA' ? 'input' : 'change', preview));
    preview();
    d.addEventListener('close', () => {
      if (d.returnValue === 'publish') {
        try {
          if (country && country.options && country.value !== (r.countryCode || '')) S.setCountry(r.id, country.value || null, country.value ? (W.countryByCode(country.value) || {}).name || country.options[country.selectedIndex].text : null);
          const pub = S.publishRecipe(r.id, { showCountry: true, includeMemory: !!(mem && mem.checked), description: story.value });
          toast(pub.showCountry ? tr('Your scoop is now on the World Map in {country}.', { country: W.countryLabel(pub.countryCode, pub.countryName) }) : tr('Your scoop is shared, but without a country it won’t appear on the map.'));
          renderDetail(r.id);
        } catch (err) { toast(W.errText(err)); }
      }
      d.remove();
    });
    d.showModal();
  }

  root.PeaceRecipes = { mountSavePanel, renderBook, renderDetail };
})(window);
