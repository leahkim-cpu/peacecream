/* Collection: the ready-made gift desserts (#collection). Fixed products only — nothing here is customizable. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, C = root.PeaceCatalog;
  let filter = 'all';

  function money(n) {
    try { return new Intl.NumberFormat(PeaceI18n.lang, { style: 'currency', currency: C.CURRENCY }).format(n); }
    catch (e) { return '$' + n.toFixed(2); }
  }
  /** Product picture: the real photo when one has been added, otherwise the illustration with an honest label. */
  function picture(p, size) {
    const label = tr('{name}: {flavor}', { name: tr(p.name), flavor: tr(p.flavor) });
    if (p.photo) return `<img class="pc-photo" src="${esc(p.photo)}" alt="${esc(tr('Photo of {name}', { name: label }))}" loading="${size ? 'eager' : 'lazy'}" decoding="async" width="${p.photoSize[0]}" height="${p.photoSize[1]}">`;
    return `<div class="pc-illus" role="img" aria-label="${esc(label)}" style="--bg:${C.typeOf(p.type).bg}">${C.dessertSVG(p, { size: size || 200 })}<span class="pc-photo-soon">${tr('Photo coming soon')}</span></div>`;
  }
  function card(p) {
    return `<article class="pc-card${p.signature ? ' signature' : ''}" style="--bg:${C.typeOf(p.type).bg}">
      <div class="pc-card-art">${picture(p)}${p.signature ? `<span class="pc-ribbon">${tr('Signature')}</span>` : ''}</div>
      <div class="pc-card-body">
        <span class="pc-kicker">${tr(C.typeOf(p.type).name)} · ${tr('Fixed flavor')}</span>
        <h3>${tr(p.name)}</h3>
        <p class="pc-flavor">${tr(p.flavor)}</p>
        <span class="pc-meaning"><span aria-hidden="true">♡</span> ${tr('Meaning: {meaning}', { meaning: tr(p.meaning) })}</span>
        <p class="pc-line">“${tr(p.line)}”</p>
        <div class="pc-price-row"><b class="pc-price">${money(p.price)}</b><small>${tr(p.unit)}</small></div>
        <div class="pc-card-actions">
          <button class="button secondary small" data-detail="${p.id}" aria-label="${esc(tr('View details: {name}', { name: tr(p.name) }))}">${tr('View details')}</button>
          <a class="button small" href="#gift/${p.id}" aria-label="${esc(tr('Send as a gift: {name}', { name: tr(p.name) }))}">${tr('Send as gift')} <span aria-hidden="true">♡</span></a>
        </div>
      </div>
    </article>`;
  }

  function render(giftMode) {
    const list = C.PRODUCTS.filter(p => filter === 'all' || p.type === filter);
    const groups = C.TYPES.filter(t => list.some(p => p.type === t.id));
    app.innerHTML = `<section class="pc-shop">
      <div class="pc-shop-hero">
        <div>
          <div class="eyebrow">${giftMode ? tr('A Little Piece of Peace, Just for You.') : tr('Share your peace')}</div>
          <h1>${giftMode ? tr('Send a little<br><em>sweetness.</em>') : tr('A little gift.<br><em>A thoughtful flavor.</em>')}</h1>
          <p>${tr('Six dessert collections, each with a fixed recipe and its own meaning of peace. Choose one, add a message, and share a little happiness with someone you love.')}</p>
          <p class="pc-fixed-note"><span aria-hidden="true">✳</span> ${tr('These desserts can’t be customized. Want a flavor that’s entirely yours?')} <a class="text-link" href="#create">${tr('Create your own ice cream')}</a></p>
        </div>
        <div class="pc-shop-hero-art"><img src="assets/peace-cookie.jpg" alt="${esc(tr('A hand holding a chocolate chip cookie with a doodled smiling face on a lavender background'))}" width="1086" height="1448" loading="lazy"><span class="pc-float-heart" aria-hidden="true">♡</span></div>
      </div>
      <div class="pc-demo-banner" role="note"><b>${tr('Demo shop')}</b> ${tr('Online ordering isn’t open yet. You can try the whole gift experience, but no payment is taken and nothing is delivered.')}</div>
      <div class="pc-filters" role="group" aria-label="${esc(tr('Filter desserts'))}">
        <button data-filter="all" aria-pressed="${filter === 'all'}">${tr('All treats')}</button>
        ${C.TYPES.map(t => `<button data-filter="${t.id}" aria-pressed="${filter === t.id}" style="--bg:${t.bg}">${C.dessertSVG(t.id, { size: 26 })}${tr(t.name)}</button>`).join('')}
      </div>
      ${groups.map(t => `<section class="pc-group" aria-labelledby="pc-g-${t.id}"><div class="pc-group-head"><h2 id="pc-g-${t.id}">${tr(t.name)}</h2><span>${tr(t.tagline)}</span></div>
        <div class="pc-grid">${list.filter(p => p.type === t.id).map(card).join('')}</div></section>`).join('')}
      <aside class="pc-own"><div>${W.scoopSVG(0, { size: 90 })}</div><div><div class="eyebrow">${tr('A flavor that’s entirely yours')}</div><h2>${tr('Your scoop. Your imagination.')}</h2><p>${tr('Ice cream is the only PeaceCream you can design yourself. It isn’t sold or sent as a gift. Create it, capture it, and share it digitally with friends.')}</p><a class="button" href="#create">${tr('Create my PeaceCream')} <span>↗</span></a></div></aside>
      <a class="pc-rewards-link" href="#rewards"><span aria-hidden="true">🎁</span> ${tr('My Rewards')}</a>
    </section>
    <dialog class="pc-dialog" aria-labelledby="pc-detail-title"></dialog>`;
    app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; render(giftMode); app.querySelector(`[data-filter="${filter}"]`).focus({ preventScroll: true }); });
    app.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => detail(C.byId[b.dataset.detail]));
    W.onLanguage(() => render(giftMode));
  }

  function detail(p) {
    const d = app.querySelector('.pc-dialog');
    const t = C.typeOf(p.type);
    d.innerHTML = `<button class="pc-dialog-close" aria-label="${esc(tr('Close'))}">×</button>
      <div class="pc-detail">
        <div class="pc-detail-art">${picture(p, 260)}</div>
        <div>
          <span class="pc-kicker">${tr(t.name)} · ${tr(t.tagline)}</span>
          <h2 id="pc-detail-title">${tr(p.name)}</h2>
          <dl class="pc-facts"><div><dt>${tr('Flavor')}</dt><dd>${tr(p.flavor)}</dd></div><div><dt>${tr('Meaning of peace')}</dt><dd>${tr(p.meaning)}</dd></div><div><dt>${tr('Size')}</dt><dd>${tr(p.unit)}</dd></div><div><dt>${tr('Price')}</dt><dd>${money(p.price)}</dd></div></dl>
          <blockquote>“${tr(p.line)}”</blockquote>
          <p class="pc-muted">${tr('This dessert has its own signature recipe. Its flavor, ingredients and look are already chosen, so you can give it just as it is. You only add your message.')}</p>
          <div class="pw-row"><a class="button" href="#gift/${p.id}">${tr('Send as gift')} <span aria-hidden="true">♡</span></a><button class="button secondary" data-close>${tr('Back to the collection')}</button></div>
        </div>
      </div>`;
    const close = () => d.close();
    d.querySelector('.pc-dialog-close').onclick = close;
    d.querySelector('[data-close]').onclick = close;
    d.onclick = e => { if (e.target === d) close(); };
    d.showModal();
  }

  root.PeaceShop = { render, money, picture, detail };
})(window);
