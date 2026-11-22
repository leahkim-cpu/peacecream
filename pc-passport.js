/* PeaceCream Peace Passport: stamps earned by exploring real public stories on the World Map. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, S = root.PeaceStore.store;

  async function render() {
    try { await W.loadScript('pc-desserts.js'); } catch (e) { /* badge icons are optional */ }
    const p = S.passport();
    let names = {};
    try { names = Object.fromEntries((await W.loadWorld()).countries.map(c => [c.code, PeaceI18n.country(c)])); } catch (e) { /* stamps carry their own names */ }
    if (location.hash !== '#passport') return; // the person moved on while the map data loaded
    const stats = S.publicStats();
    const unlocked = new Set(p.stamps.map(s => s.countryCode));
    const locked = Object.keys(stats.byCountry).filter(code => !unlocked.has(code));
    const nick = p.nickname;
    const label = s => names[s.countryCode] || s.countryName;
    W.onLanguage(() => render());
    app.innerHTML = `<section class="pw-page pw-passport-page">
      <div class="pw-head center"><div class="eyebrow">${tr('Explore')}</div><h1>${tr('My Peace Passport')}</h1><p>${tr('Every scoop tells a story. Where will yours take you?')}</p></div>
      <div class="pw-passport">
        <div class="pw-passport-cover">
          <span class="pw-cover-emblem" aria-hidden="true">${W.scoopSVG(0, { size: 70 })}</span>
          <span class="pw-cover-title">${tr('PEACECREAM')}<br><b>${tr('Passport')}</b></span>
          <form class="pw-nick"><label for="pw-nick">${tr('Passport holder')}</label><div class="pw-row"><input id="pw-nick" maxlength="${S.LIMITS.nickname}" placeholder="${tr('Your nickname')}" value="${esc(nick)}" autocomplete="off"><button class="pw-nick-save" aria-label="${tr('Save nickname')}">✓</button></div></form>
          <dl class="pw-passport-stats">
            <div><dt>${tr('Stamps collected')}</dt><dd>${p.totalStamps}</dd></div>
            <div><dt>${tr('Countries discovered')}</dt><dd>${p.countries}</dd></div>
            <div><dt>${tr('Stories explored')}</dt><dd>${p.storiesExplored}</dd></div>
            <div><dt>${tr('First discovery')}</dt><dd class="small">${p.firstDiscovery ? W.formatDate(p.firstDiscovery) : '—'}</dd></div>
          </dl>
          <button class="button pc-pp-share" data-share-passport>${tr('Share My Peace Passport ♡')}</button>
        </div>
        <div class="pw-passport-pages">
          <h2>${tr('Stamps')}</h2>
          ${p.stamps.length || locked.length ? `<ul class="pw-stamps">
            ${p.stamps.map(s => `<li><button class="pw-stamp" data-stamp="${esc(s.countryCode)}" style="--tilt:${W.stampTheme(s.countryCode).tilt}deg" aria-label="${esc(trn('{country} stamp, {n} story, unlocked {date}', '{country} stamp, {n} stories, unlocked {date}', s.recipeIds.length, { country: label(s), date: W.formatDate(s.unlockedAt) }))}">${W.stampSVG(s.countryCode, label(s))}<span class="pw-stamp-date">${W.formatDate(s.unlockedAt, { month: 'short', day: 'numeric', year: 'numeric' })} · ${trn('{n} story', '{n} stories', s.recipeIds.length)}</span></button></li>`).join('')}
            ${locked.map(code => `<li><a class="pw-stamp locked" href="#map" aria-label="${esc(trn('{country}: not stamped yet. {n} story waiting on the map', '{country}: not stamped yet. {n} stories waiting on the map', stats.byCountry[code], { country: names[code] || code }))}">${W.stampSVG(code, names[code] || code, { locked: true })}<span class="pw-stamp-date">${trn('{n} story waits on the map', '{n} stories wait on the map', stats.byCountry[code])}</span></a></li>`).join('')}
          </ul>` : `<div class="pw-empty small"><div class="pw-empty-art">${W.stampSVG('blank', tr('Your first stamp'), { locked: true })}</div><p>${tr('Your passport is still blank. Stamps appear when you read a shared story on the World Map.')}</p><a class="button" href="#map">${tr('Open the World Peace Map')} <span>↗</span></a></div>`}
          <div class="pw-stamp-detail" hidden tabindex="-1"></div>
          ${badges(p)}
        </div>
      </div>
      <p class="pw-muted center small">${tr('Stamp names are playful decorations, not claims about what peace means to anyone in that country.')}</p>
      ${W.localNotice(tr('Your passport is saved only in this browser on this device. It isn’t synced to other devices, and clearing your browser data erases it.'))}
    </section>`;
    app.querySelector('.pw-nick').onsubmit = e => {
      e.preventDefault();
      try { S.setNickname(app.querySelector('#pw-nick').value); toast(tr('Nickname saved.')); } catch (err) { toast(W.errText(err)); }
    };
    app.querySelector('[data-share-passport]').onclick = () => ['pc-rewards-core.js', 'pc-catalog.js', 'pc-share.js'].reduce((q, f) => q.then(() => W.loadScript(f)), Promise.resolve())
      .then(() => PeaceShare.open({ kind: 'passport', title: nick ? tr('{name}’s Peace Passport', { name: nick }) : tr('My Peace Passport'), subtitle: tr('{stamps} stamps · {countries} countries discovered', { stamps: p.totalStamps, countries: p.countries }), stats: { stamps: p.totalStamps, countries: p.countries }, stamps: p.stamps.map(s => ({ code: s.countryCode, name: label(s) })), invite: tr('Every little discovery brings us closer.'), linkLabel: location.host + ' ♡ ' + tr('Start Your Own Peace Journey') }))
      .catch(() => toast(tr('Sharing couldn’t load. Please try again.')));
    app.querySelectorAll('[data-stamp]').forEach(b => b.onclick = () => showStamp(p.stamps.find(s => s.countryCode === b.dataset.stamp)));
  }
  const N = s => s;
  const BADGES = [
    ['icecream', N('Scoop Seeker'), N('Discover a shared ice cream')], ['cookie', N('Cookie Explorer'), N('Discover a shared cookie')],
    ['cake', N('Cake Collector'), N('Discover a shared cake')], ['donut', N('Donut Dreamer'), N('Discover a shared donut')],
    ['macaron', N('Macaron Finder'), N('Discover a shared macaron')], ['mochi', N('Mochi Discoverer'), N('Discover a shared mochi')],
    ['cupcake', N('Cupcake Celebrator'), N('Discover a shared cupcake')]
  ];
  /** Dessert discovery badges, earned only from real public stories explored on the map. */
  function badges(p) {
    const by = p.byType || {}, kinds = Object.keys(by).length;
    const icon = t => (window.PeaceDesserts ? PeaceDesserts.icon(t, 44) : '');
    const item = (earned, art, name, how) => `<li class="pw-badge-item ${earned ? 'earned' : ''}"><span class="pw-badge-art">${art}</span><b>${tr(name)}</b><small>${earned ? tr('Earned') : tr(how)}</small></li>`;
    return `<h2 class="pw-badges-title">${tr('Dessert badges')}</h2><ul class="pw-badges">${BADGES.map(([t, name, how]) => item(!!by[t], icon(t), name, how)).join('')}
      ${item(kinds >= 3, '<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="#d6e8f2" stroke="#612335" stroke-width="2"/><path d="M6 22h32M22 4c6 6 6 30 0 36M22 4c-6 6-6 30 0 36" fill="none" stroke="#612335" stroke-width="1.6"/></svg>', N('Sweet World Traveler'), N('Discover three different kinds of treats'))}</ul>`;
  }
  function showStamp(stamp) {
    const box = app.querySelector('.pw-stamp-detail');
    const stories = stamp.recipeIds.map(id => S.getRecipe(id)).filter(r => r && r.visibility === 'public');
    const publicStories = S.listPublicRecipes({ countryCode: stamp.countryCode, pageSize: 500 }).filter(r => stamp.recipeIds.includes(r.id));
    box.innerHTML = `<div class="pw-panel-top"><div><h3>${esc(W.countryLabel(stamp.countryCode, stamp.countryName))}</h3><span>${esc(tr('{stamp} · unlocked {date}', { stamp: W.stampTheme(stamp.countryCode).name, date: W.formatDate(stamp.unlockedAt) }))}</span></div><button class="pw-close" data-close aria-label="${tr('Close')}">×</button></div>
      ${publicStories.length ? `<ul class="pw-explored">${publicStories.map(r => `<li><span>${W.miniArt(r, 36)}</span><div><b>${esc(r.flavorName)}</b><small>${esc(W.ingredients(r))}</small>${r.story ? `<p>“${esc(r.story)}”</p>` : ''}</div></li>`).join('')}</ul>` : '<p class="pw-muted">' + tr('The stories behind this stamp are no longer shared. Your stamp stays.') + '</p>'}
      ${stories.length > publicStories.length ? '<p class="pw-muted small">' + tr('Some stories you explored are no longer public.') + '</p>' : ''}`;
    W.mountTreats(box);
    box.hidden = false;
    box.querySelector('[data-close]').onclick = () => { box.hidden = true; };
    box.focus();
  }

  root.PeacePassport = { render };
})(window);
