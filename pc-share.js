/* Sharing cards, referral links, the friend landing page (#hello/<payload>) and My Rewards (#rewards).
 * DEMO REFERRALS: without a server nobody can confirm that a friend on another device opened a link.
 * So sharing creates a *pending* referral, and the reward unlocks only through a clearly labelled
 * "simulate" button. Nothing pretends to be a real code. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, R = root.PeaceRewardsCore.rewards;
  const CARD = { w: 1080, h: 1350 };
  const THEMES = {
    scoop: { a: '#fde1e8', b: '#fff4ea', ink: '#612335', accent: '#ec7f9c' },
    recipe: { a: '#fff1d6', b: '#fde8ee', ink: '#612335', accent: '#e8a64b' },
    passport: { a: '#e9def7', b: '#fdf0f5', ink: '#4b2a5e', accent: '#a98bd6' },
    discovery: { a: '#dfeef6', b: '#fff6ea', ink: '#33475b', accent: '#6fa8cf' }
  };

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast(tr('Copied!')); }
    catch (e) { toast(tr('Copying isn’t available here. Please select the text and copy it.')); }
  }

  /* ---------- Card drawing ---------- */
  function rounded(x, cx, cy, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(cx, cy, w, h, r) : x.rect(cx, cy, w, h); }
  function heart(x, cx, cy, s, color) {
    x.save(); x.translate(cx, cy); x.scale(s / 100, s / 100); x.translate(-50, -45);
    x.fillStyle = color; x.fill(new Path2D(PeaceCatalog ? PeaceCatalog.heartPath : 'M50 86 C20 64 4 46 4 28 C4 14 15 4 28 4 C38 4 46 10 50 18 C54 10 62 4 72 4 C85 4 96 14 96 28 C96 46 80 64 50 86 Z')); x.restore();
  }
  function sparkle(x, cx, cy, r, color) {
    x.save(); x.fillStyle = color; x.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .35 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath(); x.fill(); x.restore();
  }
  function wrap(x, text, maxW) {
    const words = /[　-鿿]/.test(text) ? [...text] : text.split(' ');
    const sep = /[　-鿿]/.test(text) ? '' : ' ';
    const lines = []; let line = '';
    for (const w of words) { const t = line ? line + sep + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  const svgImage = svg => W.loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/var\(--paper\)/g, '#fff9ee').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')));

  /** Draws the branded sharing card. Returns the canvas. */
  async function drawCard(opts) {
    try { await document.fonts.load('600 64px Fraunces'); } catch (e) { /* system serif is fine */ }
    const th = THEMES[opts.kind] || THEMES.scoop;
    const c = document.createElement('canvas'); c.width = CARD.w; c.height = CARD.h;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, CARD.h); g.addColorStop(0, th.a); g.addColorStop(1, th.b);
    x.fillStyle = g; x.fillRect(0, 0, CARD.w, CARD.h);
    // frame
    x.setLineDash([14, 12]); x.lineWidth = 4; x.strokeStyle = th.accent; rounded(x, 40, 40, CARD.w - 80, CARD.h - 80, 56); x.stroke(); x.setLineDash([]);
    // tiny hearts & sparkles (fixed positions so every card looks tidy)
    [[120, 210, 40], [960, 260, 30], [930, 980, 46], [140, 1010, 28], [990, 640, 22], [90, 620, 24]].forEach(([a, b, s], i) => (i % 2 ? sparkle(x, a, b, s, '#fff') : heart(x, a, b, s, th.accent + 'aa')));
    // the original logo, unmodified, on a cream seal
    try {
      const logo = await W.loadImage(W.LOGO_SRC);
      x.save(); x.shadowColor = 'rgba(97,35,53,.18)'; x.shadowBlur = 18; x.fillStyle = '#fff9ee'; x.beginPath(); x.arc(170, 170, 92, 0, Math.PI * 2); x.fill(); x.restore();
      x.save(); x.beginPath(); x.arc(170, 170, 84, 0, Math.PI * 2); x.clip(); x.drawImage(logo, 86, 86, 168, 168); x.restore();
    } catch (e) { /* logo failed to load: card still works */ }
    x.fillStyle = th.ink; x.textAlign = 'right'; x.font = '600 26px "DM Sans", sans-serif';
    x.fillText(tr('CREATE YOUR PEACE. SHARE YOUR PEACE.'), CARD.w - 90, 150);
    // art window
    const art = { x: 190, y: 290, w: 700, h: 600 };
    x.save(); x.fillStyle = '#fffdf8'; x.shadowColor = 'rgba(97,35,53,.15)'; x.shadowBlur = 30; rounded(x, art.x, art.y, art.w, art.h, 300); x.fill(); x.restore();
    x.save(); rounded(x, art.x, art.y, art.w, art.h, 300); x.clip();
    if (opts.kind === 'passport') await drawStamps(x, art, opts.stamps || [], th);
    else if (opts.photo) { const ph = opts.photo; const s = Math.max(art.w / ph.width, art.h / ph.height); x.drawImage(ph, art.x + (art.w - ph.width * s) / 2, art.y + (art.h - ph.height * s) / 2, ph.width * s, ph.height * s); }
    else if (Number.isInteger(opts.flavor) && root.PeaceCreamRenderer) {
      const g2 = document.createElement('canvas'); g2.width = g2.height = 700;
      try { await PeaceCreamRenderer.draw(g2, opts.flavor, [...(opts.toppings || [])]); x.drawImage(g2, art.x, art.y - 50, 700, 700); }
      catch (e) { const img = await svgImage(W.scoopSVG(opts.flavor, { size: 400, toppings: opts.toppings })); x.drawImage(img, art.x + 150, art.y + 60, 400, 440); }
    }
    x.restore();
    // text
    x.textAlign = 'center'; x.fillStyle = th.ink;
    x.font = '600 64px Fraunces, Georgia, serif';
    wrap(x, opts.title || '', 880).slice(0, 2).forEach((l, i) => x.fillText(l, CARD.w / 2, 970 + i * 70));
    let y = opts.title && x.measureText(opts.title).width > 880 ? 1110 : 1040;
    if (opts.subtitle) { x.font = '500 30px "DM Sans", sans-serif'; x.fillStyle = th.ink + 'cc'; x.fillText(opts.subtitle, CARD.w / 2, y); y += 50; }
    if (opts.message) { x.font = 'italic 34px Fraunces, Georgia, serif'; x.fillStyle = th.ink; wrap(x, '“' + opts.message + '”', 860).slice(0, 2).forEach(l => { x.fillText(l, CARD.w / 2, y); y += 44; }); }
    x.font = '600 28px "DM Sans", sans-serif'; x.fillStyle = th.ink;
    x.fillText(opts.invite || tr('I created my own little piece of peace. What’s yours?'), CARD.w / 2, Math.max(y + 16, 1195));
    x.font = '500 24px "DM Sans", sans-serif'; x.fillStyle = th.ink + 'b3';
    x.fillText(opts.linkLabel || location.host + ' ♡ ' + tr('Create your own scoop'), CARD.w / 2, 1250);
    return c;
  }
  async function drawStamps(x, art, stamps, th) {
    x.fillStyle = '#fbf6ff'; x.fillRect(art.x, art.y, art.w, art.h);
    const list = stamps.slice(0, 6);
    if (!list.length) { const img = await svgImage(W.stampSVG('blank', tr('Your first stamp'), { locked: true })); x.drawImage(img, art.x + 200, art.y + 150, 300, 300); return; }
    const cols = list.length <= 2 ? list.length : 3, size = list.length <= 2 ? 280 : 200, rows = Math.ceil(list.length / cols);
    const gx = (art.w - cols * size) / (cols + 1), gy = (art.h - rows * size) / (rows + 1);
    for (let i = 0; i < list.length; i++) {
      const img = await svgImage(W.stampSVG(list[i].code, list[i].name));
      const cx = art.x + gx + (i % cols) * (size + gx), cy = art.y + gy + Math.floor(i / cols) * (size + gy);
      x.save(); x.translate(cx + size / 2, cy + size / 2); x.rotate(((i * 37) % 11 - 5) * Math.PI / 180); x.drawImage(img, -size / 2, -size / 2, size, size); x.restore();
    }
  }

  /* ---------- Share dialog ---------- */
  /**
   * @param {{kind:'scoop'|'recipe'|'passport', title:string, subtitle?:string, flavor?:number, toppings?:number[],
   *   personal?:string, stamps?:Array<{code:string,name:string}>, stats?:{stamps:number,countries:number}, photo?:HTMLImageElement}} opts
   */
  function open(opts) {
    let share = null, includePersonal = false, message = '', canvas = null, blob = null, seq = 0, pending = null;
    const d = document.createElement('dialog');
    d.className = 'pc-dialog pc-share-dialog';
    d.setAttribute('aria-labelledby', 'pc-share-title');
    const heading = { scoop: tr('Share My Peace ♡'), recipe: tr('Share My Recipe ♡'), passport: tr('Share My Peace Passport ♡') }[opts.kind];
    d.innerHTML = `<button class="pc-dialog-close" aria-label="${esc(tr('Close'))}">×</button>
      <h2 id="pc-share-title">${heading}</h2>
      ${opts.kind === 'passport' ? `<div class="pc-passport-intro" aria-hidden="true"><div class="pc-pp-book"><div class="pc-pp-cover">PEACECREAM<br><b>Passport</b></div><div class="pc-pp-page">${(opts.stamps || []).slice(0, 4).map(s => `<span>${W.stampSVG(s.code, s.name)}</span>`).join('')}</div></div><span class="pc-pp-heart">♡</span></div><p class="pc-lead center">${tr('Every little discovery brings us closer.')}</p>` : ''}
      <div class="pc-share-grid">
        <div class="pc-share-preview" aria-live="polite"><p class="pc-muted">${tr('Making your card…')}</p></div>
        <div class="pc-share-side">
          <p class="pc-muted">${tr('Preview your card before you share. Only what you see here is shared.')}</p>
          ${opts.personal ? `<label class="pc-check"><input type="checkbox" data-personal> <span>${tr('Include my personal meaning of peace')}<small>“${esc(opts.personal)}”</small></span></label>` : ''}
          <div class="pc-field"><label for="pc-share-msg">${tr('Short message on the card (optional)')}</label><input id="pc-share-msg" maxlength="80" placeholder="${esc(opts.kind === 'passport' ? tr('Come explore with me ♡') : tr('My Little Scoop of Peace ♡'))}"></div>
          <div class="pc-share-actions">
            <button class="button" data-act="native">${tr('Share…')}</button>
            <button class="button secondary" data-act="copy">${tr('Copy link')}</button>
            <button class="button secondary" data-act="download">${tr('Download image')}</button>
          </div>
          <div class="pc-referral" data-ref hidden></div>
          <p class="pc-muted small">${tr('Your link opens a welcome page for your friend. Private memories, your photos and anything in your Recipe Book are never included unless you add them here.')}</p>
        </div>
      </div>`;
    document.body.append(d);
    d.addEventListener('close', () => d.remove());
    d.querySelector('.pc-dialog-close').onclick = () => d.close();
    d.showModal();

    const preview = d.querySelector('.pc-share-preview');
    const ensureShare = () => {
      if (!share) { share = R.createShare(opts.kind); showReferral(); }
      return share;
    };
    const link = () => {
      const s = ensureShare();
      const payload = { k: opts.kind, ref: s.id, n: opts.title, m: [includePersonal ? opts.personal : '', message].filter(Boolean).join(' · ').slice(0, 200) };
      if (Number.isInteger(opts.flavor)) { payload.f = opts.flavor; payload.t = opts.toppings || []; }
      if (opts.stats) { payload.s = opts.stats.stamps; payload.ct = opts.stats.countries; }
      return location.origin + location.pathname + '#hello/' + R.encodeCard(payload);
    };
    function redraw() {
      const mine = ++seq;
      preview.innerHTML = `<p class="pc-muted">${tr('Making your card…')}</p>`;
      pending = drawCard({ ...opts, message: [includePersonal ? opts.personal : '', message].filter(Boolean).join(' · ') })
        .then(c => new Promise(res => c.toBlob(b => res([c, b]), 'image/png')))
        .then(([c, b]) => {
          if (mine !== seq) return; // a newer preview replaced this one
          canvas = c; blob = b;
          const img = new Image(); img.src = c.toDataURL('image/png'); img.alt = tr('Preview of your sharing card');
          preview.innerHTML = ''; preview.append(img);
        })
        .catch(() => { if (mine === seq) preview.innerHTML = `<p class="pc-muted">${tr('The preview couldn’t be drawn, but you can still copy your link.')}</p>`; });
      return pending;
    }
    function showReferral() {
      const box = d.querySelector('[data-ref]');
      box.hidden = false;
      box.innerHTML = `<b>🎁 ${tr('Reward pending')}</b><p>${tr('When a friend opens your link and creates their own scoop, you unlock 5% OFF ready-made desserts.')}</p>
        <p class="pc-demo-tag">${tr('Demo: there’s no server yet to confirm a friend’s visit, so you can simulate one to see what happens.')}</p>
        <button class="button secondary small" data-sim>${tr('Demo: simulate my friend’s visit')}</button><div data-reward></div>`;
      box.querySelector('[data-sim]').onclick = e => { e.target.remove(); const r = R.verifyReferral(share.id); revealReward(box.querySelector('[data-reward]'), r.reward, !r.isNew); };
    }
    if (opts.personal) d.querySelector('[data-personal]').onchange = e => { includePersonal = e.target.checked; redraw(); };
    let t = null;
    d.querySelector('#pc-share-msg').oninput = e => { message = e.target.value.trim(); clearTimeout(t); blob = null; t = setTimeout(redraw, 400); };
    const fileName = 'peacecream-' + opts.kind + '.png';
    function download() {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    d.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const act = b.dataset.act, url = link();
      if (act === 'copy') return copy(url);
      if (!blob) { toast(tr('The image isn’t ready yet.')); if (!pending || t) { clearTimeout(t); t = null; redraw(); } return; }
      if (act === 'download') return download();
      if (!navigator.share) { download(); copy(url); return; }
      // Call share() synchronously inside the click so Safari keeps the user gesture.
      const text = tr('I created my own little piece of peace. What’s yours?');
      const file = new File([blob], fileName, { type: 'image/png' });
      const data = navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], text: text + '\n' + url, title: 'PeaceCream' } : { title: 'PeaceCream', text, url };
      navigator.share(data).catch(e => { if (e.name !== 'AbortError') copy(url); });
    });
    if (opts.kind === 'passport' && !W.reduceMotion()) setTimeout(redraw, 2600); else redraw();
  }

  /* ---------- Reward reveal: like opening a little present ---------- */
  function revealReward(el, reward, already) {
    if (!el || !reward) return;
    el.innerHTML = `<div class="pc-present ${W.reduceMotion() ? 'open' : ''}" role="status">
      <div class="pc-present-box" aria-hidden="true"><span class="pc-present-lid"></span><span class="pc-present-body"></span><span class="pc-present-heart">♡</span></div>
      <div class="pc-present-text">
        <p>${already ? tr('You already unlocked this reward.') : tr('You shared a little peace. Here’s a little sweetness in return!')}</p>
        <h3>${tr('You’ve unlocked 5% OFF!')}</h3>
        <div class="pc-code-chip"><code>${esc(reward.code)}</code><button class="button small" data-copy-code>${tr('Copy code')}</button></div>
        <p class="pc-demo-tag">${tr('Demo code: works in this demo shop on this device only. Not valid for real purchases.')}</p>
      </div></div>`;
    el.querySelector('[data-copy-code]').onclick = () => copy(reward.code);
    if (!W.reduceMotion()) setTimeout(() => { const p = el.querySelector('.pc-present'); if (!p) return; p.classList.add('open'); const r = p.getBoundingClientRect(); W.sprinkleBurst(r.left + 50, r.top + 40, 20); }, 300);
  }

  /* ---------- Friend landing ---------- */
  function renderHello(payload) {
    const p = R.decodeCard(payload);
    if (!p || p.k === 'gift') {
      app.innerHTML = `<section class="pw-page pw-empty"><h1>${tr('This link looks incomplete.')}</h1><p>${tr('Ask your friend to copy the whole link again.')}</p><a class="button" href="#home">${tr('Explore PeaceCream')}</a></section>`;
      return;
    }
    const own = p.ref && R.isOwnShare(p.ref);
    const art = Number.isInteger(p.f) ? `<span data-gelato="${p.f}|${p.t.join(',')}|340" aria-label="${esc(tr('Your friend’s ice cream'))}"></span>` : p.k === 'passport' ? W.stampSVG('blank', tr('Peace Passport'), { locked: false }) : W.scoopSVG(0, { size: 200 });
    app.innerHTML = `<section class="pc-hello">
      <div class="pc-hello-card"><div class="eyebrow">${p.k === 'passport' ? tr('Your friend is on a peace journey') : tr('Your friend shared a little peace')}</div>
        <div class="pc-hello-art">${art}</div>
        <h1>${esc(p.n || tr('A little piece of peace'))}</h1>
        ${p.k === 'passport' ? `<p class="pc-lead">${tr('{stamps} stamps · {countries} countries discovered', { stamps: p.s, countries: p.ct })}</p><p>${tr('Every little discovery brings us closer.')}</p>` : ''}
        ${p.m ? `<blockquote>${esc(p.m)}</blockquote>` : ''}
        <p class="pc-lead">${p.k === 'passport' ? tr('Start Your Own Peace Journey') : tr('I created my own little piece of peace. What’s yours?')}</p>
        <div class="pw-row center"><a class="button" href="#create">${tr('Create my own scoop')} <span>↗</span></a>${p.k === 'passport' ? `<a class="button secondary" href="#map">${tr('Start my passport')}</a>` : `<a class="button secondary" href="#map">${tr('Explore the World Map')}</a>`}</div>
        ${own ? `<p class="pc-demo-tag">${tr('This is your own link. Rewards count only when a friend opens it.')}</p>` : ''}
      </div></section>`;
    W.mountGelatos(app);
    W.onLanguage(() => renderHello(payload));
  }

  /* ---------- My Rewards ---------- */
  function renderRewards() {
    const now = Date.now();
    const list = R.listRewards().slice().reverse();
    const status = r => (r.usedOn ? 'used' : Date.parse(r.expiresAt) < now ? 'expired' : 'available');
    const sourceLabel = s => ({ gift: tr('Sent a dessert gift'), 'referral:scoop': tr('Shared your ice cream'), 'referral:recipe': tr('Shared a recipe'), 'referral:passport': tr('Shared your passport'), 'referral:discovery': tr('Shared a discovery') }[s] || s);
    const pending = R.pendingShares();
    const card = r => `<li class="pc-reward ${status(r)}"><span class="pc-reward-ribbon" aria-hidden="true"></span>
      <div><b>${tr('5% OFF')}</b><code>${esc(r.code)}</code></div>
      <dl><div><dt>${tr('From')}</dt><dd>${sourceLabel(r.source)}</dd></div><div><dt>${tr('Status')}</dt><dd>${{ used: tr('Used'), expired: tr('Expired'), available: tr('Available') }[status(r)]}</dd></div><div><dt>${status(r) === 'used' ? tr('Used on') : tr('Expires')}</dt><dd>${W.formatDate(r.usedAt || r.expiresAt)}</dd></div></dl>
      ${status(r) === 'available' ? `<button class="button small" data-copy="${esc(r.code)}">${tr('Copy code')}</button>` : ''}</li>`;
    app.innerHTML = `<section class="pw-page pc-rewards">
      <div class="pw-page-head"><div class="eyebrow">${tr('Peace grows when we share it')}</div><h1>${tr('My Rewards')}</h1><p>${tr('Share your scoops, recipes or passport with friends, or send a dessert gift, to unlock little thank-you codes.')}</p></div>
      <div class="pc-demo-banner" role="note"><b>${tr('Demo rewards')}</b> ${tr('Codes are created and checked in this browser only. They work in the demo shop but not for real purchases. Real rewards need a server, which isn’t connected yet.')}</div>
      ${list.length ? `<ul class="pc-reward-list">${list.map(card).join('')}</ul>` : `<div class="pw-empty small"><div class="pw-empty-art"><span class="pc-big-heart" aria-hidden="true">🎁</span></div><p>${tr('No rewards yet. Share a little peace to unlock your first one!')}</p><div class="pw-row center"><a class="button" href="#create">${tr('Create and share a scoop')}</a><a class="button secondary" href="#collection">${tr('Send a dessert gift')}</a></div></div>`}
      ${pending.length ? `<h2 class="pw-subhead">${tr('Pending rewards')}</h2><p class="pw-muted">${trn('{n} shared link is waiting for a friend’s visit.', '{n} shared links are waiting for a friend’s visit.', pending.length)}</p>
        <ul class="pc-pending">${pending.slice(-5).reverse().map(s => `<li><span>${sourceLabel('referral:' + s.kind)} · ${W.formatDate(s.createdAt)}</span><button class="button secondary small" data-sim="${esc(s.id)}">${tr('Demo: simulate my friend’s visit')}</button></li>`).join('')}</ul>` : ''}
      <h2 class="pw-subhead">${tr('How it works')}</h2>
      <ol class="pc-how"><li>${tr('Share your scoop, recipe or passport with a link.')}</li><li>${tr('Your friend opens it and creates their own scoop.')}</li><li>${tr('A little heart glows and your 5% OFF code unlocks.')}</li><li>${tr('Use it once on any ready-made dessert gift.')}</li></ol>
      <p class="pw-muted small">${tr('One reward per shared link and per gift order. Clicking Share again doesn’t add more. Codes can be used once and expire after 90 days.')}</p>
    </section>`;
    app.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy));
    app.querySelectorAll('[data-sim]').forEach(b => b.onclick = () => { R.verifyReferral(b.dataset.sim); renderRewards(); toast(tr('You’ve unlocked 5% OFF!')); });
    W.onLanguage(renderRewards);
  }

  root.PeaceShare = { open, copy, drawCard, revealReward, renderHello, renderRewards };
})(window);
