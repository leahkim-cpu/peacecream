// Lists every English UI string that needs a translation, and which ones each language is missing.
// Usage: node tools/i18n-extract.js            -> prints counts of missing keys per language
//        node tools/i18n-extract.js --missing ja -> prints the missing keys for one language as JSON
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const keys = new Set();
const add = s => { if (typeof s === 'string' && /[A-Za-z]/.test(s)) keys.add(s); };
const unesc = s => s.replace(/\\(.)/g, '$1');

// 1) tr('…') and trn('…', '…') calls in every script
const scripts = fs.readdirSync(root).filter(f => f.endsWith('.js'));
const lit = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
for (const f of scripts) {
  const src = read(f);
  const fn = f === 'pc-i18n.js' ? String.raw`\b(?:t|tr|trn)\(` : String.raw`\b(?:trn?|N)\(`;
  for (const m of src.matchAll(new RegExp(String.raw`${fn}\s*(?:${lit})(?:\s*,\s*(?:${lit}))?`, 'g'))) {
    [m[1], m[2], m[3], m[4]].forEach(x => x !== undefined && add(unesc(x)));
  }
  // conditional keys: tr(cond ? 'a' : 'b', …)
  for (const m of src.matchAll(new RegExp(String.raw`\btr\([^'"()]*\?\s*(?:${lit})\s*:\s*(?:${lit})`, 'g'))) {
    [m[1], m[2], m[3], m[4]].forEach(x => x !== undefined && add(unesc(x)));
  }
}

// 2) data packs that are localised in place or translated at render time
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(read('quiz-en.js'), sandbox);
const C = sandbox.window.PeaceQuizContent;
sandbox.PeaceQuizContent = C;
sandbox.root = sandbox;
vm.runInNewContext(read('quiz-engine.js').replace('(globalThis)', '(this)'), Object.assign(sandbox, { PeaceQuizContent: C }));
C.stages.forEach(add);
C.flavors.forEach(f => { add(f.name); add(f.quality); });
Object.values(C.lenses).forEach(l => { add(l.name); add(l.description); add(l.action); });
C.questions.forEach(q => { add(q.text); (q.choices || []).forEach(c => add(c[0])); });
C.values.forEach(v => { add(v.name); add(v.topping); add(v.description); });
Object.values(C.ui).forEach(add);
(sandbox.PeaceQuizEngine.actions || []).forEach(a => add(a.text));

const arrays = [
  [read('app.js'), /const flavors=(\[[^\]]*\])/],
  [read('app.js'), /const toppings=(\[[\s\S]*?\]\]);/],
  [read('app.js'), /\$\{(\['Kindness'[^\]]*\])/],
  [read('app.js'), /\$\{(\['Your flavor'[^\]]*\])/],
  [read('pc-ui.js'), /const MENU = (\[[\s\S]*?\]\]\]\s*\]);/],
  [read('pc-ui.js'), /const STAMP_THEMES = (\{[^}]*\});/],
  [read('pc-ui.js'), /const GENERIC = (\[[^\]]*\]);/],
  [read('pc-recipes.js'), /const FILTERS = (\[[\s\S]*?\]\]);/],
  [read('pc-capsules.js'), /const PRESETS = (\[[\s\S]*?\]\]);/],
  [read('pc-store.js'), /const MOODS = (\[[^\]]*\]);/]
];
const flat = v => (Array.isArray(v) ? v.flatMap(flat) : v && typeof v === 'object' ? Object.values(v).flatMap(flat) : [v]);
for (const [src, re] of arrays) {
  const m = re.exec(src);
  if (!m) { console.error('pattern not found:', re); continue; }
  flat(vm.runInNewContext('(' + m[1] + ')')).forEach(s => typeof s === 'string' && !/^#|^[a-z]+$/.test(s) && add(s));
}
// store error messages
for (const m of read('pc-store.js').matchAll(/new (?:Range|Type)?Error\('((?:[^'\\]|\\.)*)'\)/g)) add(unesc(m[1]));
// 3) static HTML
const html = read('index.html');
for (const m of html.matchAll(/<a [^>]*data-i18n>([\s\S]*?)<\/a>/g)) add(m[1].trim());
for (const m of html.matchAll(/<span data-i18n>([\s\S]*?)<\/span>/g)) add(m[1].trim());
for (const m of html.matchAll(/aria-label="([^"]+)"[^>]*data-i18n-label/g)) add(m[1]);

const all = [...keys].sort();
const langs = ['ja', 'zh-CN'];
const loaded = {};
for (const l of langs) {
  const file = path.join(root, 'i18n', l + '.js');
  loaded[l] = {};
  if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), { PeaceI18n: { add: (_, e) => Object.assign(loaded[l], e) } });
}
const arg = process.argv.indexOf('--missing');
if (arg > -1) {
  const l = process.argv[arg + 1];
  console.log(JSON.stringify(all.filter(k => !(k in loaded[l])), null, 1));
} else if (process.argv.includes('--all')) {
  console.log(JSON.stringify(all, null, 1));
} else {
  console.log(`${all.length} English strings`);
  langs.forEach(l => {
    const missing = all.filter(k => !(k in loaded[l]));
    const extra = Object.keys(loaded[l]).filter(k => !keys.has(k));
    console.log(`${l}: ${missing.length} missing, ${extra.length} unused`);
  });
}
