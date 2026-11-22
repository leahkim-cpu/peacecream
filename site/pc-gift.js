/* Gift a ready-made dessert (#gift/<productId>) and open a received gift card (#giftcard/<payload>).
 * DEMO: no payment provider or delivery service is connected. The flow is complete and honest about that:
 * nothing is charged or shipped, and the reward code it unlocks is a labelled demo code.
 * Privacy: recipient details stay in memory while the form is open. Only the recipient's first name is kept
 * with the demo order receipt in this browser. The gift card link carries the message the sender chose to share. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, C = root.PeaceCatalog, R = root.PeaceRewardsCore.rewards;
  const LIMIT = { name: 40, message: 200 };
  let st = null; // { productId, step, to, from, message, code, discount, agreed }

  const steps = () => [tr('Dessert'), tr('Recipient'), tr('Message'), tr('Preview'), tr('Checkout')];
  function fresh(productId) { return { productId, step: 0, to: '', from: '', message: '', code: '', discount: 0, agreed: false, codeNote: '' }; }

  function render(productId) {
    const p = C.byId[productId];
    if (!p) { location.hash = '#collection'; return; }
    if (!st || st.productId !== productId || st.step > 4) st = fresh(productId);
    draw();
    W.onLanguage(draw);
  }
  const product = () => C.byId[st.productId];
  const money = n => PeaceShop.money(n);
  const total = () => Math.max(0, product().price - st.discount);

  function draw() {
    if (!st || st.step > 4) return;
    const p = product();
    app.innerHTML = `<section class="pc-gift">
      <div class="crumb"><a href="#collection">${tr('Gift collection')}</a> / ${tr('Send a gift')}</div>
      <h1>${tr('A Little Piece of Peace, Just for You.')}</h1>
      <div class="pc-demo-banner" role="note"><b>${tr('Demo shop')}</b> ${tr('Online ordering isn’t open yet. You can try the whole gift experience, but no payment is taken and nothing is delivered.')}</div>
      <ol class="pc-steps">${steps().map((s, i) => `<li class="${i === st.step ? 'active' : i < st.step ? 'done' : ''}" ${i === st.step ? 'aria-current="step"' : ''}><span>${i < st.step ? '✓' : i + 1}</span>${s}</li>`).join('')}</ol>
      <div class="pc-gift-grid">
        <aside class="pc-gift-summary" aria-label="${esc(tr('Your gift'))}">${PeaceShop.picture(p, 220)}<h2>${tr(p.name)}</h2><p>${tr(p.flavor)} · ${tr(p.unit)}</p><span class="pc-meaning">♡ ${tr(p.meaning)}</span><b class="pc-price">${money(p.price)}</b></aside>
        <div class="pc-gift-step" tabindex="-1">${[stepDessert, stepRecipient, stepMessage, stepPreview, stepCheckout][st.step](p)}</div>
      </div>
    </section>`;
    bind();
  }
  const nav = (back, nextLabel, disabled) => `<div class="next-row">${back ? `<button class="back" data-back>${tr('Back')}</button>` : '<span></span>'}<button class="button" data-next ${disabled ? 'disabled' : ''}>${nextLabel || tr('Continue')} <span aria-hidden="true">→</span></button></div>`;

  function stepDessert(p) {
    return `<h2>${tr('Your chosen dessert')}</h2>
      <p class="pc-line">“${tr(p.line)}”</p>
      <p class="pc-muted">${tr('This dessert has a fixed flavor and look. You can personalize the gift message in the next steps.')}</p>
      <a class="text-link" href="#collection">${tr('Choose a different dessert')}</a>${nav(false)}`;
  }
  function stepRecipient() {
    return `<h2>${tr('Who is this little peace for?')}</h2>
      <div class="pc-field"><label for="pc-to">${tr('Recipient’s first name')}</label><input id="pc-to" maxlength="${LIMIT.name}" autocomplete="off" value="${esc(st.to)}" required></div>
      <div class="pc-field"><label for="pc-from">${tr('Your name (as it appears on the card)')}</label><input id="pc-from" maxlength="${LIMIT.name}" autocomplete="nickname" value="${esc(st.from)}" required></div>
      <fieldset class="pc-field"><legend>${tr('How will it reach them?')}</legend>
        <label class="pc-radio"><input type="radio" name="pc-delivery" checked> <span><b>${tr('Digital gift card link')}</b><small>${tr('You get a link to send in any message app. Works in this demo.')}</small></span></label>
        <label class="pc-radio disabled"><input type="radio" name="pc-delivery" disabled> <span><b>${tr('Home delivery')}</b><small>${tr('Coming when real ordering opens. Needs a delivery partner.')}</small></span></label>
      </fieldset>
      <p class="pc-muted small">${tr('We never ask for their address or contact details in this demo.')}</p>${nav(true)}`;
  }
  function stepMessage() {
    const ideas = [tr('Thank you for always being there.'), tr('A little sweetness for a big heart.'), tr('Thinking of you today.')];
    return `<h2>${tr('Add your message')}</h2>
      <div class="pc-field"><label for="pc-msg">${tr('Gift message')}</label><textarea id="pc-msg" maxlength="${LIMIT.message}" rows="4">${esc(st.message)}</textarea><span class="char-count" aria-live="polite"><span data-count>${st.message.length}</span>/${LIMIT.message}</span></div>
      <div class="suggestions">${ideas.map(i => `<button type="button" data-idea="${esc(i)}">${esc(i)}</button>`).join('')}</div>${nav(true)}`;
  }
  function giftCard(p, data) {
    return `<div class="pc-giftcard"><div class="pc-giftcard-top"><img src="${esc(root.PEACE_LOGO_URL || W.LOGO_SRC)}" alt="PeaceCream" width="60" height="60"><span>${tr('A little piece of peace')}</span></div>
      <div class="pc-giftcard-art">${C.dessertSVG(p, { size: 150 })}</div>
      <p class="pc-giftcard-to">${tr('For {name}', { name: esc(data.to) })}</p>
      <h3>${tr(p.name)}</h3><span class="pc-meaning">♡ ${tr(p.meaning)}</span>
      ${data.message ? `<blockquote>${esc(data.message)}</blockquote>` : ''}
      <p class="pc-giftcard-from">${tr('With love, {name}', { name: esc(data.from) })}</p><div class="pc-heart-slot" aria-hidden="true"></div></div>`;
  }
  function stepPreview(p) {
    return `<h2>${tr('Preview your gift')}</h2>${giftCard(p, st)}${nav(true, tr('Looks lovely'))}`;
  }
  function stepCheckout(p) {
    return `<h2>${tr('Checkout')}</h2>
      <dl class="pc-bill"><div><dt>${tr(p.name)} · ${tr(p.unit)}</dt><dd>${money(p.price)}</dd></div>
        ${st.discount ? `<div class="pc-discount"><dt>${tr('Reward code {code} (5% off)', { code: esc(st.code) })}</dt><dd>−${money(st.discount)}</dd></div>` : ''}
        <div class="pc-total"><dt>${tr('Total')}</dt><dd>${money(total())}</dd></div></dl>
      <form class="pc-code" novalidate><label for="pc-code">${tr('Reward code (optional)')}</label><div class="pw-row"><input id="pc-code" placeholder="SHAREPEACE5-XXXX" autocomplete="off" value="${esc(st.code)}" ${st.discount ? 'disabled' : ''}><button class="button secondary small" ${st.discount ? 'disabled' : ''}>${tr('Apply')}</button></div><p class="pc-code-note" aria-live="polite">${st.codeNote}</p></form>
      <label class="pc-check"><input type="checkbox" id="pc-agree" ${st.agreed ? 'checked' : ''}> <span>${tr('I understand this is a demo: no payment is taken and nothing is delivered.')}</span></label>
      ${nav(true, tr('Place demo order'), !st.agreed)}`;
  }

  function bind() {
    const q = s => app.querySelector(s);
    const focusStep = () => q('.pc-gift-step').focus({ preventScroll: true });
    q('[data-back]') && (q('[data-back]').onclick = () => { st = { ...st, step: st.step - 1 }; draw(); focusStep(); });
    const next = q('[data-next]');
    const go = () => { st = { ...st, step: st.step + 1 }; draw(); focusStep(); };
    if (st.step === 1) {
      next.onclick = () => {
        const to = q('#pc-to').value.trim(), from = q('#pc-from').value.trim();
        if (!to || !from) { toast(tr('Please add both names.')); (to ? q('#pc-from') : q('#pc-to')).focus(); return; }
        st = { ...st, to, from }; go();
      };
    } else if (st.step === 2) {
      const ta = q('#pc-msg');
      ta.oninput = () => { q('[data-count]').textContent = ta.value.length; };
      app.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => { ta.value = b.dataset.idea; ta.oninput(); });
      next.onclick = () => { st = { ...st, message: ta.value.trim().slice(0, LIMIT.message) }; go(); };
    } else if (st.step === 4) {
      q('#pc-agree').onchange = e => { st = { ...st, agreed: e.target.checked }; next.disabled = !st.agreed; };
      q('.pc-code').onsubmit = e => { e.preventDefault(); applyCode(q('#pc-code').value); };
      next.onclick = placeOrder;
    } else next.onclick = go;
  }
  function applyCode(value) {
    const res = R.checkCode(value);
    const reasons = { format: tr('That doesn’t look like a PeaceCream reward code.'), unknown: tr('We couldn’t find that code on this device.'), used: tr('This code has already been used.'), expired: tr('This code has expired.') };
    st = res.ok ? { ...st, code: res.reward.code, discount: R.discountFor(product().price), codeNote: tr('5% off applied. (Demo code)') } : { ...st, code: String(value).slice(0, 20), discount: 0, codeNote: reasons[res.reason] };
    draw();
    const field = app.querySelector(st.discount ? '#pc-agree' : '#pc-code');
    if (field) field.focus({ preventScroll: true });
  }

  async function placeOrder() {
    if (!st || st.step > 4) return; // already placing this order
    const p = product();
    const orderId = 'demo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if (st.discount) {
      const r = R.redeem(st.code, orderId);
      if (!r.ok) { st = { ...st, discount: 0, code: '', codeNote: tr('This code can’t be used any more.') }; draw(); return; }
    }
    R.recordOrder({ id: orderId, productId: p.id, price: p.price, discount: st.discount, total: total(), toName: st.to, createdAt: new Date().toISOString(), demo: true });
    const link = location.origin + location.pathname + '#giftcard/' + R.encodeCard({ k: 'gift', n: st.to, c: st.from, m: st.message, p: p.id });
    const data = { ...st };
    const reward = R.rewardGift(orderId); // issued with the order, so leaving mid-animation never loses it
    const here = location.hash;
    st = { ...st, step: 99 };
    await heartAnimation(p, data);
    if (location.hash !== here) { st = null; return; } // the visitor moved on; don't overwrite their new page
    confirmation(p, data, link, reward.reward);
  }

  /* ---------- Heart transformation ---------- */
  function heartAnimation(p, data) {
    return new Promise(resolve => {
      const o = document.createElement('div');
      o.className = 'pc-anim' + (W.reduceMotion() ? ' still' : '');
      o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', tr('Sending your gift'));
      o.innerHTML = `<div class="pc-anim-stage"><div class="pc-anim-dessert pc-anim-${p.type}">${C.dessertSVG(p, { size: 240 })}</div>
        <svg class="pc-anim-heart" viewBox="0 0 100 90" aria-hidden="true"><defs><radialGradient id="pcHeartGlow" cx=".4" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#ff9fb8"/><stop offset="1" stop-color="#ec5f86"/></radialGradient></defs><path d="${C.heartPath}" fill="url(#pcHeartGlow)" stroke="#fff" stroke-width="3"/></svg>
        <div class="pc-anim-card">${giftCard(p, data)}</div></div>
        <p class="pc-anim-msg" aria-live="polite"></p><button class="button secondary pc-anim-skip">${tr('Skip animation')}</button>`;
      const prev = document.activeElement;
      const bg = [...document.querySelectorAll('header, main, footer')];
      bg.forEach(el => { el.inert = true; });
      document.body.append(o);
      const msg = o.querySelector('.pc-anim-msg');
      let done = false;
      let closed = false;
      const close = () => { if (closed) return; closed = true; o.remove(); bg.forEach(el => { el.inert = false; }); if (prev && prev.isConnected) prev.focus({ preventScroll: true }); resolve(); };
      const finish = () => { if (done) return; done = true; o.classList.add('done'); msg.innerHTML = `<b>${tr('A little piece of your peace is on its way.')}</b><span>${tr('Peace tastes sweeter when shared.')}</span>`; setTimeout(close, W.reduceMotion() ? 1800 : 2600); };
      o.querySelector('.pc-anim-skip').onclick = () => { done = true; close(); };
      o.addEventListener('keydown', e => { if (e.key === 'Escape') { done = true; close(); } if (e.key === 'Tab') { e.preventDefault(); o.querySelector('.pc-anim-skip').focus(); } });
      o.querySelector('.pc-anim-skip').focus({ preventScroll: true });
      if (W.reduceMotion()) { finish(); return; }
      runSequence(o).then(finish).catch(finish);
    });
  }
  async function runSequence(o) {
    const piece = o.querySelector('.pc-piece'), heart = o.querySelector('.pc-anim-heart'), card = o.querySelector('.pc-anim-card'), slot = o.querySelector('.pc-heart-slot');
    const stage = o.querySelector('.pc-anim-stage').getBoundingClientRect();
    await W.wait(700);
    // 2–3: the piece separates and floats upward (mochi stretches first)
    const stretch = o.querySelector('.pc-anim-mochi') ? [{ transform: 'translate(0,0) scale(1,1)' }, { transform: 'translate(0,-10px) scale(.9,1.25)', offset: .35 }] : [{ transform: 'translate(0,0) rotate(0)' }];
    await piece.animate([...stretch, { transform: 'translate(6px,-70px) rotate(-8deg) scale(1)', offset: .8 }, { transform: 'translate(0,-90px) rotate(0) scale(.9)' }], { duration: 1300, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished;
    // 4: sparkles
    const pr = piece.getBoundingClientRect();
    W.sprinkleBurst(pr.left + pr.width / 2, pr.top + pr.height / 2, 22);
    // 5: piece becomes a glowing heart
    heart.style.left = (pr.left + pr.width / 2 - stage.left - 40) + 'px';
    heart.style.top = (pr.top + pr.height / 2 - stage.top - 36) + 'px';
    piece.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(4px)' }], { duration: 600, fill: 'forwards' });
    await heart.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.15)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 700, easing: 'ease-out', fill: 'forwards' }).finished;
    heart.classList.add('glow');
    // 6–7: the card appears and the heart travels along a curve into it
    card.classList.add('show');
    await W.wait(500);
    const sr = slot.getBoundingClientRect(), hr = heart.getBoundingClientRect();
    const dx = sr.left + sr.width / 2 - (hr.left + hr.width / 2), dy = sr.top + sr.height / 2 - (hr.top + hr.height / 2);
    const curve = Array.from({ length: 9 }, (_, i) => { const t = i / 8; const lift = Math.sin(Math.PI * t) * -90; return { transform: `translate(${dx * t}px, ${dy * t + lift}px) scale(${1 - .55 * t})`, offset: t }; });
    await heart.animate(curve, { duration: 1400, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' }).finished;
    // 8: settle with a gentle bounce
    slot.classList.add('filled');
    heart.style.opacity = 0;
    const r2 = slot.getBoundingClientRect();
    W.sprinkleBurst(r2.left + r2.width / 2, r2.top + r2.height / 2, 14);
    await W.wait(500);
  }

  function confirmation(p, data, link, reward) {
    app.innerHTML = `<section class="pc-gift pc-gift-done">
      <div class="pc-done-head"><span class="pc-done-heart" aria-hidden="true">♡</span><h1 tabindex="-1">${tr('A little piece of your peace is on its way.')}</h1><p class="pc-lead">${tr('Peace tastes sweeter when shared.')}</p></div>
      <div class="pc-demo-banner" role="note"><b>${tr('Demo order')}</b> ${tr('No payment was taken and nothing will be delivered. Your gift card link below works, so you can still send the message.')}</div>
      <div class="pc-gift-grid">${giftCard(p, data).replace('pc-heart-slot', 'pc-heart-slot filled')}
        <div><h2>${tr('Send the gift card')}</h2><p class="pc-muted">${tr('Send this link to {name} in any message app. It shows your card and message. Only people with the link can see it.', { name: esc(data.to) })}</p>
          <div class="pc-link-box"><input readonly value="${esc(link)}" aria-label="${esc(tr('Gift card link'))}"><button class="button small" data-copy>${tr('Copy link')}</button></div>
          ${navigator.share ? `<button class="button secondary" data-share>${tr('Share…')}</button>` : ''}
          <div class="pc-reward-mini" data-reward></div>
          <div class="pw-row"><a class="button secondary" href="#collection">${tr('Back to the collection')}</a><a class="text-link" href="#rewards">${tr('My Rewards')}</a></div>
        </div></div></section>`;
    app.querySelector('[data-copy]').onclick = () => PeaceShare.copy(link);
    const sh = app.querySelector('[data-share]');
    if (sh) sh.onclick = () => navigator.share({ title: 'PeaceCream', text: tr('A little piece of peace, just for you ♡'), url: link }).catch(() => {});
    PeaceShare.revealReward(app.querySelector('[data-reward]'), reward);
    st = null;
    W.onLanguage(() => confirmation(p, data, link, reward));
    app.querySelector('.pc-done-head h1').focus({ preventScroll: true });
  }

  /* ---------- Received gift card ---------- */
  function renderCard(payload) {
    const raw = R.decodeCard(payload);
    const p = raw && raw.k === 'gift' ? C.byId[raw.p] : null;
    if (!p) {
      app.innerHTML = `<section class="pw-page pw-empty"><h1>${tr('This gift card link looks incomplete.')}</h1><p>${tr('Ask the sender to copy the whole link again.')}</p><a class="button" href="#collection">${tr('Explore PeaceCream')}</a></section>`;
      return;
    }
    app.innerHTML = `<section class="pc-gift pc-received"><div class="eyebrow">${tr('Someone sent you a little peace')}</div>
      ${giftCard(p, { to: raw.n, from: raw.c, message: raw.m }).replace('pc-heart-slot', 'pc-heart-slot filled')}
      <p class="pc-muted center">${tr('This is a demo gift card. Real desserts can’t be ordered yet.')}</p>
      <div class="pw-row center"><a class="button" href="#create">${tr('Create your own scoop')} <span>↗</span></a><a class="button secondary" href="#collection">${tr('See the collection')}</a></div></section>`;
    W.onLanguage(() => renderCard(payload));
  }

  root.PeaceGift = { render, renderCard, heartAnimation };
})(window);
