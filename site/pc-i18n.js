/* PeaceCream internationalisation: English source strings, Japanese and Simplified Chinese packs.
 * - tr('English text', {vars}) looks up the active language and falls back to English.
 * - Dictionaries live in i18n/<lang>.js and are loaded only when needed.
 * - Data packs (quiz content, flavor and topping names) are localised in place so that
 *   modules holding references to them keep working and no progress is lost.
 * Only the language preference is stored (localStorage), never any personal content. */
(function (root) {
  'use strict';
  const SUPPORTED = ['en', 'ja', 'zh-CN'];
  const LABELS = { en: 'English', ja: '日本語', 'zh-CN': '简体中文' };
  const SHORT = { en: 'EN', ja: '日本語', 'zh-CN': '中文' };
  const PREF_KEY = 'peacecream:lang';
  const dict = { en: {} };
  const masters = [];            // [{ target, master, translate }]
  const listeners = [];
  let lang = 'en';

  function detect() {
    try { const saved = root.localStorage.getItem(PREF_KEY); if (SUPPORTED.includes(saved)) return saved; } catch (e) { /* storage blocked */ }
    const fromUrl = new URLSearchParams(root.location.search).get('lang');
    if (SUPPORTED.includes(fromUrl)) return fromUrl;
    for (const l of root.navigator.languages || [root.navigator.language || 'en']) {
      const low = String(l).toLowerCase();
      if (low.startsWith('ja')) return 'ja';
      if (low.startsWith('zh')) return 'zh-CN';
      if (low.startsWith('en')) return 'en';
    }
    return 'en';
  }

  function format(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? (typeof vars[k] === 'number' ? number(vars[k]) : vars[k]) : m));
  }
  /** Translate an English UI string. Unknown strings fall back to English. */
  function t(english, vars) {
    const table = dict[lang] || {};
    const hit = Object.prototype.hasOwnProperty.call(table, english) ? table[english] : english;
    return format(hit, vars);
  }
  /** Plural-aware: English picks one/other by n; ja/zh use their own entry for the chosen English key. */
  function tn(one, other, n, vars) { return t(n === 1 ? one : other, { n, ...(vars || {}) }); }
  function number(n) { try { return new Intl.NumberFormat(lang).format(n); } catch (e) { return String(n); } }
  function date(value, opts) {
    try { return new Date(value).toLocaleDateString(lang, opts || { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return new Date(value).toDateString(); }
  }
  /** Country name for a world-paths entry ({names:{en,ja,zh}}). */
  function country(c) {
    if (!c) return '';
    const n = c.names || {};
    return (lang === 'ja' ? n.ja : lang === 'zh-CN' ? n.zh : n.en) || c.name || '';
  }

  /** Register a data object whose string fields should follow the language. translateFn(master, live) mutates live. */
  function localise(target, translate) {
    const master = JSON.parse(JSON.stringify(target));
    masters.push({ target, master, translate });
    translate(master, target);
  }

  const loading = {};
  let requestSeq = 0;
  function loadDict(l) {
    if (l === 'en' || dict[l]) return Promise.resolve();
    if (loading[l]) return loading[l];
    return (loading[l] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `i18n/${l}.js?v=${root.PEACE_WORLD_VERSION || '1'}`;
      s.onload = () => resolve();
      s.onerror = () => { delete loading[l]; s.remove(); reject(new Error('Could not load language ' + l)); };
      document.head.append(s);
    }));
  }
  function add(l, entries) { dict[l] = { ...(dict[l] || {}), ...entries }; }

  function applyDocument() {
    document.documentElement.lang = lang;
    document.title = t('PeaceCream — What does peace taste like?');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = t('Create your own PeaceCream and discover what peace tastes like to you.');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18nSource || (el.dataset.i18nSource = el.innerHTML.trim())); });
    document.querySelectorAll('[data-i18n-label]').forEach(el => { const src = el.dataset.i18nLabelSource || (el.dataset.i18nLabelSource = el.getAttribute('aria-label')); el.setAttribute('aria-label', t(src)); });
    masters.forEach(m => m.translate(m.master, m.target));
    syncSelector();
  }

  async function setLanguage(next, opts) {
    if (!SUPPORTED.includes(next)) next = 'en';
    const seq = ++requestSeq;
    try { await loadDict(next); } catch (e) { if (root.toast) root.toast('This language couldn’t load. Please check your connection.'); return false; }
    if (seq !== requestSeq) return false; // a newer choice was made while this one loaded
    const changed = next !== lang;
    lang = next;
    if (!(opts && opts.silent)) { try { root.localStorage.setItem(PREF_KEY, next); } catch (e) { /* preference not kept */ } }
    applyDocument();
    if (changed) listeners.forEach(fn => { try { fn(lang); } catch (e) { /* one listener must not break others */ } });
    return true;
  }
  function onChange(fn) { listeners.push(fn); }

  /* ---------- Header selector ---------- */
  function buildSelector() {
    const header = document.querySelector('header');
    if (!header || header.querySelector('.pw-lang')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pw-lang';
    wrap.innerHTML = `<div class="pw-lang-inline" role="group" aria-label="Language">${SUPPORTED.map(l => `<button type="button" data-lang="${l}" lang="${l}">${LABELS[l]}</button>`).join('<span aria-hidden="true">|</span>')}</div>
      <label class="pw-lang-compact"><span class="pw-visually-hidden">Language</span><select lang="${lang}">${SUPPORTED.map(l => `<option value="${l}" lang="${l}" aria-label="${LABELS[l]}">${SHORT[l]}</option>`).join('')}</select></label>`;
    header.append(wrap);
    wrap.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => setLanguage(b.dataset.lang));
    wrap.querySelector('select').onchange = e => setLanguage(e.target.value);
    syncSelector();
  }
  function syncSelector() {
    document.querySelectorAll('.pw-lang [data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const sel = document.querySelector('.pw-lang select');
    if (sel) sel.value = lang;
    document.querySelectorAll('.pw-lang [role=group], .pw-lang-compact .pw-visually-hidden').forEach(el => {
      if (el.matches('[role=group]')) el.setAttribute('aria-label', t('Language')); else el.textContent = t('Language');
    });
  }

  const initial = detect();
  const ready = loadDict(initial).catch(() => null).then(() => { lang = dict[initial] || initial === 'en' ? initial : 'en'; });

  /** Sentence-ending full stop for joined sentences. */
  function stop() { return lang === 'en' ? '.' : '。'; }
  root.PeaceI18n = { stop, SUPPORTED, LABELS, t, tn, number, date, country, add, localise, setLanguage, onChange, buildSelector, applyDocument, ready, get lang() { return lang; } };
  root.tr = t;   // short global used in templates (named tr to avoid clashing with loop variables called t)
  root.trn = tn;
})(window);
