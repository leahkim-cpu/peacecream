/* PeaceCream Camera — "Capture Your Scoop".
 * Take or upload a photo, frame it, choose a template and logo style, then either
 *  A) "Make It PeaceCream": a branded photo, or
 *  B) "Turn My Scoop Into PeaceCream": the photographed treat morphs into the official logo.
 * PRIVACY: photos are decoded and edited only in this browser. Nothing is uploaded, and
 * nothing here uses AI — the transformation is a hand-made photo effect (masks + morphing). */
(function (root) {
  'use strict';
  const W = root.PeaceWorld, R = root.PeaceCameraRender;
  const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_BYTES = 20 * 1024 * 1024;
  const MAX_SIDE = 2000;
  const PREVIEW_W = 540;
  const TEMPLATES = [['classic', 'The Classic Scoop'], ['memories', 'Sweet Memories'], ['dreamy', 'My Little Peace'], ['story', 'PeaceCream Story']];
  const FORMAT_LABELS = [['square', 'Square · 1080 × 1080'], ['portrait', 'Portrait · 1080 × 1350'], ['story', 'Story · 1080 × 1920']];
  const PLACES = [['top-right', 'Top right'], ['top-left', 'Top left'], ['bottom-right', 'Bottom right'], ['bottom-left', 'Bottom left'], ['center', 'Bottom centre']];

  // Module state lives only in memory (survives language switches, cleared on "New photo").
  let st = null;
  const fresh = () => ({ photo: null, step: 'pick', mode: 'branded', format: 'square', template: 'classic', logoStyle: 'sticker', place: 'top-right', sprinkles: true, caption: '', adj: { zoom: 1, rotate: 0, dx: 0, dy: 0 }, sel: null, result: null, anim: null });

  function render() {
    if (!st) st = fresh();
    W.onLanguage(() => { if (st.anim) return; render(); });
    W.onLeave(() => stopAnim());
    if (!st.photo) return renderPick();
    if (st.step === 'result' && st.result) return renderResult();
    renderEdit();
  }
  let recording = null;
  function stopAnim() { if (recording) recording.aborted = true; if (st && st.anim) { st.anim.cancelled = true; cancelAnimationFrame(st.anim.raf); st.anim = null; } }

  /* ---------- Step 1: take or upload ---------- */
  function renderPick(error) {
    app.innerHTML = `<section class="pw-page pw-camera">
      <div class="pw-head center"><div class="eyebrow">${tr('PeaceCream Camera')}</div><h1>${tr('Capture Your Scoop')}</h1><p>${tr('Every scoop deserves a little magic.')}</p></div>
      <div class="pw-cam-pick">
        <div class="pw-cam-art" aria-hidden="true"><img src="${root.PEACE_LOGO_URL || W.LOGO_SRC}" alt="" width="200" height="200"></div>
        <div class="pw-cam-buttons">
          <label class="button pw-file"><input type="file" id="pw-cam-take" accept="image/*" capture="environment">${tr('Take a Photo')} <span aria-hidden="true">📷</span></label>
          <label class="button secondary pw-file"><input type="file" id="pw-cam-upload" accept="image/jpeg,image/png,image/webp">${tr('Upload from Gallery')}</label>
          <p class="pw-muted small">${tr('JPEG, PNG or WebP, up to 20 MB. Ice cream, cookies, cakes… any treat works.')}</p>
          <p class="pw-form-error" role="alert">${error ? esc(error) : ''}</p>
        </div>
      </div>
      <p class="pw-promise"><span aria-hidden="true">🔒</span> ${tr('Your photo stays on this device. It is edited right here in your browser and is never uploaded.')}</p>
    </section>`;
    ['#pw-cam-take', '#pw-cam-upload'].forEach(id => app.querySelector(id).addEventListener('change', e => handleFile(e.target.files && e.target.files[0])));
  }
  async function handleFile(file) {
    if (!file) return;
    if (!TYPES.includes(file.type) && !(file.type === '' && /\.(jpe?g|png|webp)$/i.test(file.name))) return renderPick(tr('Please choose a JPEG, PNG or WebP image.'));
    if (file.size > MAX_BYTES) return renderPick(tr('This photo is larger than 20 MB. Please choose a smaller one.'));
    app.querySelector('.pw-form-error').textContent = tr('Opening your photo…');
    try {
      const photo = await decode(file);
      if (location.hash !== '#camera' || !st) return; // the person moved on while the photo opened
      st.photo = photo;
      st.sel = R.detectSubject(st.photo);
      st.step = 'edit';
      render();
    } catch (e) {
      renderPick(tr('This photo couldn’t be opened. Please try another one.'));
    }
  }
  async function decode(file) {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { const url = URL.createObjectURL(file); try { src = await W.loadImage(url); } finally { URL.revokeObjectURL(url); } }
    const scale = Math.min(1, MAX_SIDE / Math.max(src.width, src.height));
    const c = document.createElement('canvas');
    c.width = Math.round(src.width * scale); c.height = Math.round(src.height * scale);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    if (src.close) src.close();
    return c;
  }

  /* ---------- Step 2: edit ---------- */
  function previewSize() { const [w, h] = R.FORMATS[st.mode === 'transform' ? 'square' : st.format]; return [PREVIEW_W, Math.round(PREVIEW_W * h / w)]; }
  const radios = (name, list, value) => list.map(([v, l]) => `<label class="pw-chip-radio"><input type="radio" name="${name}" value="${v}" ${v === value ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('');
  function renderEdit() {
    const [pw, ph] = previewSize();
    const branded = st.mode === 'branded';
    app.innerHTML = `<section class="pw-page pw-camera">
      <div class="pw-head center"><div class="eyebrow">${tr('PeaceCream Camera')}</div><h1>${tr('Capture Your Scoop')}</h1></div>
      <div class="pw-tabs" role="tablist" aria-label="${tr('Choose a style')}">
        <button role="tab" aria-selected="${branded}" data-mode="branded">${tr('Branded Photo')}</button>
        <button role="tab" aria-selected="${!branded}" data-mode="transform">${tr('Logo Transformation')}</button>
      </div>
      <div class="pw-cam-grid">
        <div class="pw-cam-stage">
          <canvas class="pw-cam-canvas" width="${pw}" height="${ph}" role="img" aria-label="${tr('Preview of your PeaceCream photo')}"></canvas>
          <p class="pw-muted small center">${branded ? tr('Drag the photo to reposition it.') : tr('Drag the dotted circle onto your treat.')}</p>
        </div>
        <form class="pw-cam-controls" autocomplete="off">
          ${branded ? brandedControls() : transformControls()}
          <div class="pw-field"><label for="pw-cam-caption">${tr('Short caption')} <span>${tr('(optional)')}</span></label><input id="pw-cam-caption" maxlength="60" value="${esc(st.caption)}" placeholder="${tr('Peace tastes like…')}"></div>
          <div class="pw-row">
            <button type="button" class="button" data-go>${branded ? tr('Make It PeaceCream') : tr('Turn My Scoop Into PeaceCream')} <span>✳</span></button>
            <button type="button" class="back" data-new>${tr('Choose another photo')}</button>
          </div>
          <p class="pw-muted small">${tr('This is a photo effect made in your browser with masks and overlays. It is not AI, and your photo is never uploaded.')}</p>
        </form>
      </div>
    </section>`;
    bindEdit();
    drawPreview();
  }
  function brandedControls() {
    return `<fieldset class="pw-field"><legend>${tr('Size')}</legend><div class="pw-chips">${radios('format', FORMAT_LABELS, st.format)}</div></fieldset>
      <fieldset class="pw-field"><legend>${tr('Template')}</legend><div class="pw-chips">${radios('template', TEMPLATES, st.template)}</div></fieldset>
      <fieldset class="pw-field"><legend>${tr('Logo style')}</legend><div class="pw-chips">${radios('logoStyle', [['sticker', 'Logo sticker'], ['card', 'PeaceCream card']], st.logoStyle)}</div></fieldset>
      <div class="pw-field" ${st.logoStyle === 'card' || !['classic', 'memories'].includes(st.template) ? 'hidden' : ''}><label for="pw-cam-place">${tr('Logo placement')}</label><select id="pw-cam-place">${PLACES.map(([v, l]) => `<option value="${v}" ${v === st.place ? 'selected' : ''}>${tr(l)}</option>`).join('')}</select></div>
      <div class="pw-field"><label for="pw-cam-zoom">${tr('Zoom')}</label><input type="range" id="pw-cam-zoom" min="1" max="3" step="0.01" value="${st.adj.zoom}"></div>
      <div class="pw-field"><label for="pw-cam-rot">${tr('Straighten')}</label><input type="range" id="pw-cam-rot" min="-20" max="20" step="0.5" value="${((st.adj.rotate % 90) + 90) % 90 > 45 ? (st.adj.rotate % 90) - 90 : st.adj.rotate % 90}">
        <div class="pw-row"><button type="button" class="pw-chip" data-rot="-90">${tr('↺ Rotate left')}</button><button type="button" class="pw-chip" data-rot="90">${tr('Rotate right ↻')}</button><button type="button" class="pw-chip" data-reset>${tr('Reset')}</button></div></div>
      <label class="pw-check"><input type="checkbox" id="pw-cam-sprinkles" ${st.sprinkles ? 'checked' : ''}> ${tr('Add decorative sprinkles')}</label>`;
  }
  function transformControls() {
    return `<p class="pw-muted">${st.sel && st.sel.auto ? tr('We found what looks like your treat. Adjust the circle if it isn’t quite right.') : tr('We couldn’t find the treat automatically. Drag the circle onto it and adjust the size.')}</p>
      <div class="pw-field"><label for="pw-cam-sel">${tr('Circle size')}</label><input type="range" id="pw-cam-sel" min="0.1" max="0.5" step="0.005" value="${Math.max(st.sel.rx, st.sel.ry).toFixed(3)}"></div>
      <div class="pw-row"><button type="button" class="pw-chip" data-auto>${tr('Find my treat again')}</button></div>`;
  }
  function bindEdit() {
    const form = app.querySelector('.pw-cam-controls'), canvas = app.querySelector('.pw-cam-canvas');
    app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; renderEdit(); });
    form.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'format' || t.name === 'template' || t.name === 'logoStyle') { st[t.name] = t.value; if (t.name === 'template' && t.value === 'story') st.format = 'story'; renderEdit(); return; }
      if (t.id === 'pw-cam-place') st.place = t.value;
      if (t.id === 'pw-cam-sprinkles') st.sprinkles = t.checked;
      drawPreview();
    });
    form.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'pw-cam-zoom') st.adj = { ...st.adj, zoom: +t.value };
      if (t.id === 'pw-cam-rot') st.adj = { ...st.adj, rotate: Math.round(st.adj.rotate / 90) * 90 + +t.value };
      if (t.id === 'pw-cam-caption') st.caption = t.value;
      if (t.id === 'pw-cam-sel') { const r = +t.value, k = st.sel.ry / st.sel.rx; st.sel = { ...st.sel, rx: k > 1 ? r / k : r, ry: k > 1 ? r : r * k }; }
      drawPreview();
    });
    form.querySelectorAll('[data-rot]').forEach(b => b.onclick = () => { st.adj = { ...st.adj, rotate: st.adj.rotate + +b.dataset.rot }; drawPreview(); });
    form.querySelector('[data-reset]')?.addEventListener('click', () => { st.adj = { zoom: 1, rotate: 0, dx: 0, dy: 0 }; renderEdit(); });
    form.querySelector('[data-auto]')?.addEventListener('click', () => { st.sel = R.detectSubject(st.photo); renderEdit(); });
    form.querySelector('[data-new]').onclick = () => { stopAnim(); st = fresh(); render(); };
    form.querySelector('[data-go]').onclick = () => (st.mode === 'branded' ? makeBranded() : makeTransform());
    // drag to reposition (branded) or to move the selection circle (transform)
    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, adj: { ...st.adj }, sel: { ...st.sel } }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      const r = canvas.getBoundingClientRect(), fx = (e.clientX - drag.x) / r.width, fy = (e.clientY - drag.y) / r.height;
      if (st.mode === 'branded') st.adj = { ...drag.adj, dx: clamp(drag.adj.dx + fx, -1, 1), dy: clamp(drag.adj.dy + fy, -1, 1) };
      else st.sel = { ...drag.sel, cx: clamp(drag.sel.cx + fx * coverRatio().x, 0.05, 0.95), cy: clamp(drag.sel.cy + fy * coverRatio().y, 0.05, 0.95) };
      drawPreview();
    });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /** Fraction of the photo visible in the square transform preview (it is cropped to cover). */
  function coverRatio() {
    const p = st.photo, s = Math.max(1 / p.width, 1 / p.height);
    return { x: 1 / (p.width * s), y: 1 / (p.height * s) };
  }
  let previewQueued = false;
  function drawPreview() {
    if (previewQueued) return;
    previewQueued = true;
    requestAnimationFrame(async () => {
      previewQueued = false;
      const canvas = app.querySelector('.pw-cam-canvas');
      if (!canvas || !st || !st.photo) return;
      if (st.mode === 'branded') { await R.compose(canvas, st.photo, options()); return; }
      const x = canvas.getContext('2d'), p = st.photo, [Wd, Ht] = [canvas.width, canvas.height];
      const cover = Math.max(Wd / p.width, Ht / p.height), pw = p.width * cover, ph = p.height * cover, ox = (Wd - pw) / 2, oy = (Ht - ph) / 2;
      x.clearRect(0, 0, Wd, Ht); x.drawImage(p, ox, oy, pw, ph);
      x.save(); x.fillStyle = 'rgba(255,249,238,.55)'; x.beginPath(); x.rect(0, 0, Wd, Ht);
      x.ellipse(ox + st.sel.cx * pw, oy + st.sel.cy * ph, st.sel.rx * pw, st.sel.ry * ph, 0, 0, Math.PI * 2, true); x.fill('evenodd');
      x.strokeStyle = '#612335'; x.lineWidth = 3; x.setLineDash([10, 8]); x.beginPath();
      x.ellipse(ox + st.sel.cx * pw, oy + st.sel.cy * ph, st.sel.rx * pw, st.sel.ry * ph, 0, 0, Math.PI * 2); x.stroke(); x.restore();
    });
  }
  const options = () => ({ template: st.template, logoStyle: st.logoStyle, place: st.place, sprinkles: st.sprinkles, caption: st.caption, adj: st.adj, date: new Date() });

  /* ---------- Animations ---------- */
  function play(canvas, prep) {
    return new Promise(resolve => {
      const anim = { cancelled: false, raf: 0 };
      st.anim = anim;
      const skip = document.createElement('button');
      skip.className = 'back pw-skip'; skip.textContent = tr('Skip');
      canvas.after(skip); skip.focus({ preventScroll: true });
      const finish = () => { skip.remove(); if (st && st.anim === anim) st.anim = null; resolve(); };
      skip.onclick = () => { anim.cancelled = true; cancelAnimationFrame(anim.raf); prep.frame(1); finish(); };
      if (W.reduceMotion() || document.hidden) { prep.frame(1); return finish(); }
      const t0 = performance.now();
      const step = now => {
        if (anim.cancelled) return;
        const t = Math.min(1, (now - t0) / prep.duration);
        prep.frame(t);
        if (t < 1) anim.raf = requestAnimationFrame(step); else finish();
      };
      anim.raf = requestAnimationFrame(step);
    });
  }
  async function makeBranded() {
    const canvas = app.querySelector('.pw-cam-canvas');
    lockControls(true);
    try {
      const prep = await R.prepareReveal(canvas, st.photo, options());
      await play(canvas, prep);
      st.result = { mode: 'branded', format: st.format };
      st.step = 'result'; renderResult();
    } catch (e) { lockControls(false); toast(tr('Something went wrong while making your image. Please try again.')); }
  }
  async function makeTransform() {
    const canvas = app.querySelector('.pw-cam-canvas');
    lockControls(true);
    try {
      const prep = await R.prepareMorph(canvas, st.photo, st.sel, { caption: st.caption });
      await play(canvas, prep);
      st.result = { mode: 'transform', format: 'square' };
      st.step = 'result'; renderResult();
    } catch (e) { lockControls(false); toast(tr('Something went wrong while making your image. Please try again.')); }
  }
  function lockControls(on) { app.querySelectorAll('.pw-cam-controls button, .pw-cam-controls input, .pw-cam-controls select, .pw-tabs button').forEach(el => { el.disabled = on; }); }

  /* ---------- Step 3: result, export, share ---------- */
  async function exportCanvas() {
    const [w, h] = R.FORMATS[st.result.format];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    if (st.result.mode === 'branded') await R.compose(c, st.photo, options());
    else { const prep = await R.prepareMorph(c, st.photo, st.sel, { caption: st.caption }); prep.frame(1); }
    return c;
  }
  const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('export'))), type, q));
  async function renderResult() {
    const [w, h] = R.FORMATS[st.result.format];
    const videoOk = st.result.mode === 'transform' && typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream && videoType();
    app.innerHTML = `<section class="pw-page pw-camera">
      <div class="pw-head center"><div class="eyebrow">${tr('PeaceCream Camera')}</div><h1>${tr('Your scoop, made PeaceCream')}</h1></div>
      <div class="pw-cam-result"><canvas class="pw-cam-final" width="${w}" height="${h}" role="img" aria-label="${tr('Your finished PeaceCream image')}"></canvas>
        <div class="pw-cam-actions">
          <p class="pw-muted small">${tr('{w} × {h} pixels', { w, h })}</p>
          <button class="button" data-download>${tr('Download My Scoop')} <span>↓</span></button>
          <button class="button secondary" data-share>${tr('Share My Scoop')}</button>
          <button class="button secondary" data-save>${tr('Save to My Recipe Book')}</button>
          ${videoOk ? `<button class="button secondary" data-video>${tr('Save the transformation as a video')}</button>` : st.result.mode === 'transform' ? `<p class="pw-muted small">${tr('Video export isn’t supported in this browser, so you can save the final picture instead.')}</p>` : ''}
          <p class="pw-status" role="status"></p>
          <div class="pw-row"><button class="back" data-edit>${tr('Edit again')}</button><button class="back" data-new>${tr('Choose another photo')}</button></div>
          <p class="pw-promise small"><span aria-hidden="true">🔒</span> ${tr('Your photo is private. It is only shared if you choose to share it, and it never appears on the World Map.')}</p>
        </div></div></section>`;
    const final = app.querySelector('.pw-cam-final'), status = app.querySelector('.pw-status');
    try { const c = await exportCanvas(); final.getContext('2d').drawImage(c, 0, 0); }
    catch (e) { status.textContent = tr('Something went wrong while making your image. Please try again.'); }
    if (!final.isConnected) return; // the page changed while exporting
    const fileName = () => `PeaceCream-${st.result.mode === 'transform' ? 'transformation' : st.template}-${w}x${h}.png`;
    app.querySelector('[data-download]').onclick = async () => {
      try { const b = await toBlob(final, 'image/png'); downloadBlob(b, fileName()); status.textContent = tr('Saved to your downloads.'); }
      catch (e) { status.textContent = tr('Your image couldn’t be saved. Please try again.'); }
    };
    app.querySelector('[data-share]').onclick = async () => {
      try {
        const b = await toBlob(final, 'image/png'), file = new File([b], fileName(), { type: 'image/png' });
        const text = tr('I made my own PeaceCream! 🍦 Want to discover what peace tastes like to you?');
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'PeaceCream' }); return; }
        downloadBlob(b, fileName());
        status.textContent = tr('Sharing photos isn’t supported here, so the image was downloaded. You can share it from your gallery.');
      } catch (e) { if (e && e.name !== 'AbortError') status.textContent = tr('Sharing didn’t work this time. You can download the image instead.'); }
    };
    app.querySelector('[data-save]').onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true;
      try {
        const b = await toBlob(final, 'image/jpeg', 0.88);
        await PeacePhotos.save({ blob: b, caption: st.caption, template: st.template, format: st.result.format, mode: st.result.mode });
        btn.textContent = tr('Saved to your Recipe Book ✓');
        status.innerHTML = `${tr('Saved on this device only.')} <a class="text-link" href="#recipes">${tr('Open my Recipe Book')}</a>`;
      } catch (err) { btn.disabled = false; status.textContent = tr('Your image couldn’t be saved on this device. Your browser may be out of space.'); }
    };
    app.querySelector('[data-video]')?.addEventListener('click', e => recordVideo(e.currentTarget, status));
    app.querySelector('[data-edit]').onclick = () => { st.step = 'edit'; render(); };
    app.querySelector('[data-new]').onclick = () => { st = fresh(); render(); };
  }
  function downloadBlob(blob, name) {
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; a.hidden = true; document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function videoType() {
    return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  }
  async function recordVideo(btn, status) {
    btn.disabled = true; status.textContent = tr('Recording your transformation… please keep this tab open.');
    try {
      const c = document.createElement('canvas'); c.width = c.height = 1080;
      const prep = await R.prepareMorph(c, st.photo, st.sel, { caption: st.caption });
      prep.frame(0);
      const type = videoType(), stream = c.captureStream(30), rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6e6 });
      const chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      const done = new Promise(res => { rec.onstop = res; });
      rec.start();
      const t0 = performance.now(), total = prep.duration + 900, job = (recording = { aborted: false });
      await new Promise(res => { const step = now => { if (job.aborted) return res(); const t = (now - t0) / prep.duration; prep.frame(Math.min(1, t)); if (now - t0 < total) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
      rec.stop(); await done;
      stream.getTracks().forEach(tk => tk.stop());
      if (job.aborted) return; // left the page: no surprise download
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      downloadBlob(new Blob(chunks, { type: type.split(';')[0] }), `PeaceCream-transformation.${ext}`);
      status.textContent = tr('Your video was saved to your downloads.');
    } catch (e) { status.textContent = tr('The video couldn’t be recorded here. You can still save the final picture.'); }
    btn.disabled = false;
  }

  root.PeaceCamera = { render, _state: () => st };
})(window);
