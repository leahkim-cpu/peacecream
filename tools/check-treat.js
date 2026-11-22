// Headless sanity check for a dessert builder: node tools/check-treat.js cookie
// Stubs the browser globals, loads pc-desserts.js + pc-treat-<type>.js and exercises every part of the definition.
const fs = require('fs'), path = require('path'), vm = require('vm');
const type = process.argv[2];
if (!type) { console.error('usage: node tools/check-treat.js <type>'); process.exit(2); }
const root = path.join(__dirname, '..');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const window = {
  PeaceWorld: { scoopSVG: () => '<svg></svg>', reduceMotion: () => true, loadScript: () => Promise.resolve(), onLanguage() {}, countrySelect: () => '' },
  PeaceStore: { store: { LIMITS: { flavorName: 60, description: 240 } } },
  matchMedia: () => ({ matches: true })
};
const ctx = vm.createContext({ window, esc, tr: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : s), toast() {}, document: { hidden: true }, console, Math, JSON });
vm.runInContext(fs.readFileSync(path.join(root, 'pc-desserts.js'), 'utf8').replace(/\}\)\(window\);\s*$/, '})(window);'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, `pc-treat-${type}.js`), 'utf8'), ctx);
const D = window.PeaceDesserts, def = D.get(type);
const fail = m => { console.error('FAIL:', m); process.exitCode = 1; };
if (!def) { fail('builder did not register as ' + type); process.exit(1); }
['holder', 'defaults', 'steps', 'draw', 'reveal', 'ingredients', 'suggest', 'nameWords'].forEach(k => def[k] === undefined && fail('missing ' + k));
if (!['tray', 'plate', 'box', 'gift', 'slice', 'cone'].includes(def.holder)) fail('holder must be tray|plate|box|gift|slice');
const KEY = /^[a-zA-Z]\w{0,29}$/;
function checkCfg(cfg, label) {
  for (const [k, v] of Object.entries(cfg)) {
    if (!KEY.test(k)) fail(`${label}: bad key ${k}`);
    const ok = x => (typeof x === 'string' ? x.length <= 60 : typeof x === 'number' ? Number.isFinite(x) : typeof x === 'boolean' || x === null);
    if (Array.isArray(v)) { if (v.length > 24 || !v.every(ok)) fail(`${label}: bad array ${k}`); }
    else if (!ok(v)) fail(`${label}: bad value ${k} (objects/long strings are not allowed)`);
  }
  if (JSON.stringify(cfg).length > 3000) fail(label + ': customization too large');
}
const cfg0 = def.defaults();
checkCfg(cfg0, 'defaults');
const svg = def.draw(cfg0);
if (typeof svg !== 'string' || !svg.trim().startsWith('<svg')) fail('draw() must return an <svg> string');
if (/<script|on\w+=/i.test(svg)) fail('draw() must not output scripts or event handlers');
if (def.steps.length < 3) fail('needs at least 3 steps');
def.steps.forEach((s, i) => {
  if (!s.id || !s.label || typeof s.render !== 'function' || typeof s.bind !== 'function') fail(`step ${i} needs id, label, render, bind`);
  const html = s.render(cfg0);
  if (typeof html !== 'string' || !html.length) fail(`step ${s.id} render() returned nothing`);
});
const feelings = [null, 'calm', 'cozy', 'bright', 'free'], whos = [null, 'family', 'friends', 'someone', 'me'];
for (const f of feelings) for (const w of whos) for (const c of [null, ...D.COLORS]) {
  const merged = { ...cfg0, ...def.suggest({ feeling: f, who: w, color: c, memory: '' }) };
  checkCfg(merged, `suggest(${f},${w},${c})`);
  if (!def.draw(merged).startsWith('<svg')) fail('draw failed for suggestion');
}
const hostile = { ...cfg0 };
Object.keys(hostile).forEach(k => { if (typeof hostile[k] === 'string') hostile[k] = '"/><img src=x onerror=alert(1)>'; else if (Array.isArray(hostile[k])) hostile[k] = hostile[k].map(v => (typeof v === 'string' ? '"/><img src=x onerror=alert(1)>' : v)); });
['message', 'name', 'text', 'topper', 'note'].forEach(k => { if (k in hostile) hostile[k] = '<img src=x onerror=alert(1)>'; });
if (/<img/i.test(def.draw(hostile))) fail('user text in draw() must be escaped with esc()');
const ing = def.ingredients(cfg0);
if (!Array.isArray(ing) || !ing.length || !ing.every(x => typeof x === 'string' && x.length <= 60)) fail('ingredients() must return short English strings');
const nw = def.nameWords(cfg0);
if (!nw || !nw.adj || !nw.noun || !nw.adj.length || !nw.noun.length) fail('nameWords() must return {adj:[], noun:[]}');
const src = fs.readFileSync(path.join(root, `pc-treat-${type}.js`), 'utf8');
if (!/reduceMotion\(\)/.test(src)) fail('reveal() must respect W.reduceMotion()');
if (/innerHTML\s*=\s*[^;]*\$\{(?!esc\()[^}]*message/i.test(src)) fail('possible unescaped message in innerHTML');
console.log(process.exitCode ? 'checks failed' : `OK: ${type} — ${def.steps.length} steps, ${ing.length} ingredients, holder ${def.holder}`);
