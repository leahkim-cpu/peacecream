/* PeaceCream Melt Your Worries.
 * PRIVACY: the worry text lives only in the `worry` variable and on-screen DOM while it melts.
 * It is never stored (no localStorage/sessionStorage/cookies/URL), never sent, never logged,
 * and is cleared when the melt ends, is skipped, or the person leaves this page. */
(function (root) {
  'use strict';
  const W = root.PeaceWorld;
  const MAX = 500;
  const T = { wobble: 1300, melt: 3900, fade: 1800 }; // ~7 seconds in total
  let worry = '';
  let run = null;

  function forget() {
    worry = '';
    if (run) { run.cancelled = true; cancelAnimationFrame(run.raf); run = null; }
    document.querySelector('.pw-melt-words')?.remove();
    const ta = document.querySelector('#pw-worry');
    if (ta) ta.value = '';
  }

  function render() {
    forget();
    W.onLeave(forget);
    W.onLanguage(() => {
      if (run) return;                                   // mid-melt: let it finish undisturbed
      if (app.querySelector('.pw-melt-close')) return closing();
      const keep = worry;                               // memory only, never stored
      render();
      const ta = app.querySelector('#pw-worry');
      if (ta && keep) { ta.value = keep; ta.dispatchEvent(new Event('input')); }
    });
    app.innerHTML = `<section class="pw-page pw-melt-page">
      <div class="pw-head center"><div class="eyebrow">${tr('A moment for you')}</div><h1>${tr('Melt Your Worries')}</h1><p>${tr('Some things are easier to let go of, one scoop at a time.')}</p></div>
      <div class="pw-melt-stage">${meltSVG()}</div>
      <form class="pw-melt-form" autocomplete="off">
        <label for="pw-worry">${tr('What’s been on your mind lately?')}</label>
        <textarea id="pw-worry" name="pw-worry-nosave" rows="4" maxlength="${MAX}" placeholder="${tr('Something I’ve been worrying about is...')}" spellcheck="false" autocomplete="off" autocorrect="off" data-lpignore="true" data-1p-ignore></textarea>
        <span class="char-count" data-count>0 / ${MAX}</span>
        <button class="button" disabled>${tr('Let it melt 🍦')}</button>
        <p class="pw-promise"><span aria-hidden="true">🔒</span> ${tr('Your worries are never saved or shared. What you write stays on this screen only while it melts, then it’s gone.')}</p>
        <p class="pw-muted small">${tr('This is a gentle ritual, not a replacement for support. If things feel heavy, please reach out to someone you trust.')}</p>
      </form>
    </section>`;
    const form = app.querySelector('.pw-melt-form'), ta = form.querySelector('textarea'), btn = form.querySelector('button');
    ta.addEventListener('input', () => {
      worry = ta.value.slice(0, MAX);
      btn.disabled = !worry.trim();
      form.querySelector('[data-count]').textContent = `${worry.length} / ${MAX}`;
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!worry.trim()) return;
      ta.value = '';
      melt();
    });
  }

  /* ---------- The melt ---------- */
  async function melt() {
    const page = app.querySelector('.pw-melt-page');
    page.querySelector('.pw-melt-form').remove();
    page.querySelector('.pw-head p').textContent = tr('Watch it soften and slip away.');
    const stage = page.querySelector('.pw-melt-stage');
    const words = document.createElement('p');
    words.className = 'pw-melt-words';
    words.textContent = worry; // textContent: never interpreted as HTML
    stage.append(words);
    worry = '';                // the only copy now is the melting words on screen
    const skip = document.createElement('button');
    skip.className = 'back pw-skip';
    skip.textContent = tr('Skip');
    page.append(skip);
    skip.focus({ preventScroll: true });
    const status = document.createElement('p');
    status.className = 'pw-visually-hidden'; status.setAttribute('role', 'status');
    status.textContent = tr('Your worry is melting away.');
    page.append(status);
    run = { cancelled: false, raf: 0 };
    const myRun = run;
    skip.onclick = () => { myRun.cancelled = true; cancelAnimationFrame(myRun.raf); done(); };
    if (document.hidden) words.remove(); // nobody is watching: skip straight to the gentle message
    else if (W.reduceMotion()) await gentleFade(stage, words, myRun);
    else await animate(stage, words, myRun);
    if (!myRun.cancelled) done();
  }
  function done() {
    forget();
    closing();
  }
  function frameLoop(ms, myRun, fn) {
    return new Promise(resolve => {
      const t0 = performance.now();
      const step = now => {
        if (myRun.cancelled) return resolve();
        const t = Math.min(1, (now - t0) / ms);
        fn(t);
        if (t < 1) myRun.raf = requestAnimationFrame(step); else resolve();
      };
      myRun.raf = requestAnimationFrame(step);
    });
  }
  const DRIPS = [[-62, 1.0, .0], [-30, 1.5, .15], [4, .8, .3], [36, 1.3, .1], [66, .9, .25]];
  function shape(svg, m, wob, dripGrow) {
    const dome = svg.querySelector('.pw-dome');
    const rx = 82 + 70 * m, ry = 78 * (1 - 0.82 * m), cy = 196 - ry * 0.55;
    dome.setAttribute('rx', rx.toFixed(1)); dome.setAttribute('ry', ry.toFixed(1)); dome.setAttribute('cy', cy.toFixed(1));
    dome.setAttribute('transform', `rotate(${wob.toFixed(2)} 150 200)`);
    svg.querySelectorAll('.pw-drip').forEach((d, i) => {
      const [dx, speed, delay] = DRIPS[i];
      const g = Math.max(0, Math.min(1, (dripGrow - delay) / (1 - delay)));
      const len = 8 + g * 60 * speed;
      const x = 150 + dx * (1 + 0.6 * m);
      d.querySelector('rect').setAttribute('x', (x - 7).toFixed(1));
      d.querySelector('rect').setAttribute('y', (190).toFixed(1));
      d.querySelector('rect').setAttribute('height', len.toFixed(1));
      const drop = d.querySelector('circle');
      drop.setAttribute('cx', x.toFixed(1));
      drop.setAttribute('cy', (190 + len + 4 * g).toFixed(1));
      drop.setAttribute('r', (6 + 4 * g).toFixed(1));
    });
    const pud = svg.querySelector('.pw-puddle');
    pud.setAttribute('rx', (40 + 120 * Math.min(1, m * 1.1)).toFixed(1));
    pud.setAttribute('ry', (8 + 18 * m).toFixed(1));
    svg.querySelector('.pw-shine').style.opacity = String(Math.max(0, 0.7 - m));
    svg.querySelector('.pw-sprinkles').style.opacity = String(Math.max(0, 1 - m * 1.4));
    svg.querySelector('.pw-sprinkles').setAttribute('transform', `translate(0 ${(m * 40).toFixed(1)})`);
  }
  async function animate(stage, words, myRun) {
    const svg = stage.querySelector('svg');
    // 1. wobble, little droplets form at the edges
    await frameLoop(T.wobble, myRun, t => shape(svg, 0, Math.sin(t * Math.PI * 6) * 3 * (1 - t * 0.4), t * 0.12));
    // 2. the scoop melts, the words soften and slide away with it
    await frameLoop(T.melt, myRun, t => {
      const m = t * t * (3 - 2 * t);
      shape(svg, m, Math.sin(t * Math.PI * 3) * (1 - t), 0.12 + 0.88 * t);
      words.style.opacity = String(Math.max(0, 1 - t * 1.25));
      words.style.filter = `blur(${(t * 5).toFixed(2)}px)`;
      words.style.transform = `translate(-50%, ${(t * 70).toFixed(1)}px) scaleY(${(1 - 0.35 * t).toFixed(3)})`;
    });
    words.remove();
    // 3. only a small pastel puddle is left, and it slowly disappears
    await frameLoop(T.fade, myRun, t => {
      svg.querySelector('.pw-melting').style.opacity = String(1 - t);
      svg.querySelector('.pw-melting').style.transform = `scale(${1 - 0.25 * t})`;
    });
  }
  async function gentleFade(stage, words, myRun) {
    const svg = stage.querySelector('svg');
    shape(svg, 0, 0, 0);
    await frameLoop(2500, myRun, t => { words.style.opacity = String(1 - t); svg.querySelector('.pw-melting').style.opacity = String(1 - t); });
    words.remove();
  }

  /* ---------- Closing ---------- */
  function closing() {
    if (!location.hash.startsWith('#melt')) return;
    W.onLanguage(() => closing());
    app.innerHTML = `<section class="pw-page pw-melt-page pw-melt-close">
      <div class="pw-breath" aria-hidden="true"><span></span><i>${tr('breathe in · breathe out')}</i></div>
      <h1 tabindex="-1">${tr('You don’t have to carry everything at once.')}</h1>
      <p class="pw-lede">${tr('Take a little sweetness with you.')}</p>
      <div class="pw-row center"><a class="button" href="#create">${tr('Make a peaceful scoop')} <span>↗</span></a><button class="button secondary" data-again>${tr('Melt another worry')}</button></div>
      <p class="pw-promise small"><span aria-hidden="true">🔒</span> ${tr('What you wrote is gone. It was never saved or shared.')}</p>
    </section>`;
    app.querySelector('[data-again]').onclick = () => { render(); app.querySelector('#pw-worry')?.focus(); };
    app.querySelector('h1').focus({ preventScroll: true });
  }

  function meltSVG() {
    return `<svg viewBox="0 0 300 280" width="300" height="280" aria-hidden="true" focusable="false">
      <defs>
        <filter id="pw-goo"><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter>
        <radialGradient id="pw-melt-fill" cx=".4" cy=".25" r=".9"><stop offset="0" stop-color="#fde3e8"/><stop offset=".6" stop-color="#f4b2bf"/><stop offset="1" stop-color="#e48c9e"/></radialGradient>
      </defs>
      <ellipse cx="150" cy="252" rx="130" ry="14" fill="#efe2d3"/>
      <g class="pw-melting" style="transform-origin:150px 250px">
        <g filter="url(#pw-goo)" fill="url(#pw-melt-fill)">
          <ellipse class="pw-puddle" cx="150" cy="246" rx="40" ry="8"/>
          ${DRIPS.map(() => '<g class="pw-drip"><rect width="14" rx="7" x="143" y="190" height="8"/><circle cx="150" cy="200" r="6"/></g>').join('')}
          <ellipse class="pw-dome" cx="150" cy="153" rx="82" ry="78"/>
        </g>
        <ellipse class="pw-shine" cx="118" cy="112" rx="18" ry="9" fill="#fff" opacity=".7" transform="rotate(-28 118 112)"/>
        <g class="pw-sprinkles">${[[110, 140, '#7fb6d8'], [140, 108, '#f3b54a'], [178, 124, '#9fc77a'], [196, 158, '#b48ad6'], [126, 176, '#f08a5d'], [168, 170, '#e66f8b']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="10" height="3.4" rx="1.7" fill="${c}" transform="rotate(${i * 50} ${x + 5} ${y + 1.7})"/>`).join('')}</g>
      </g>
    </svg>`;
  }

  root.PeaceMelt = { render };
})(window);
