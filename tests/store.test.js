// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, presetDate, localDate, KEY } = require('../pc-store.js');

function memoryStorage() {
  const m = {};
  return { data: m, getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
}
function setup(start = '2026-11-19T10:00:00Z') {
  let t = new Date(start);
  const storage = memoryStorage();
  const store = createStore(storage, () => t);
  return { store, storage, advance: ms => { t = new Date(t.getTime() + ms); }, setTime: iso => { t = new Date(iso); } };
}
const sample = { flavor: 5, toppings: [2, 7], flavorName: 'Kindness', description: 'It reminds me of my grandmother.', peaceMemory: 'Tea after rain.', countryCode: '392', countryName: 'Japan' };

test('saves a recipe privately by default and persists it to storage', () => {
  const { store, storage } = setup();
  const r = store.saveRecipe(sample);
  assert.equal(r.visibility, 'private');
  assert.equal(store.listMyRecipes().length, 1);
  assert.ok(JSON.parse(storage.data[KEY]).recipes[0].id === r.id);
  const reloaded = createStore(storage, () => new Date());
  assert.equal(reloaded.listMyRecipes()[0].flavorName, 'Kindness');
});

test('rejects invalid recipe input', () => {
  const { store } = setup();
  assert.throws(() => store.saveRecipe({ ...sample, flavor: 99 }));
  assert.throws(() => store.saveRecipe({ ...sample, toppings: [1, 2, 3] }));
  assert.throws(() => store.saveRecipe({ ...sample, flavorName: 'x'.repeat(61) }));
  assert.throws(() => store.saveRecipe({ ...sample, countryCode: '<script>' }));
});

test('rename, favorite and delete own recipes', () => {
  const { store } = setup();
  const r = store.saveRecipe(sample);
  assert.equal(store.renameRecipe(r.id, 'Moonlight Matcha').flavorName, 'Moonlight Matcha');
  assert.throws(() => store.renameRecipe(r.id, '   '));
  assert.equal(store.toggleFavorite(r.id), true);
  assert.equal(store.listMyRecipes('favorites').length, 1);
  assert.equal(store.toggleFavorite(r.id), false);
  store.deleteRecipe(r.id);
  assert.equal(store.listMyRecipes().length, 0);
});

test('private recipes never appear in the public map data', () => {
  const { store } = setup();
  store.saveRecipe(sample);
  assert.equal(store.listPublicRecipes().length, 0);
  assert.equal(store.publicStats().totalScoops, 0);
});

test('public recipes appear only in their chosen country, and only when the country is shown', () => {
  const { store } = setup();
  const r = store.saveRecipe(sample);
  store.publishRecipe(r.id, { showCountry: false });
  assert.equal(store.listPublicRecipes().length, 0);
  store.publishRecipe(r.id, { showCountry: true });
  assert.equal(store.listPublicRecipes({ countryCode: '392' }).length, 1);
  assert.equal(store.listPublicRecipes({ countryCode: '250' }).length, 0);
  assert.deepEqual(store.publicStats().byCountry, { 392: 1 });
});

test('public view hides the private memory unless explicitly shared', () => {
  const { store } = setup();
  const r = store.saveRecipe(sample);
  store.publishRecipe(r.id, { showCountry: true });
  const pub = store.listPublicRecipes()[0];
  assert.equal(pub.story, sample.description);
  assert.equal(pub.peaceMemory, undefined);
  assert.equal(pub.ownerId, undefined);
  store.publishRecipe(r.id, { showCountry: true, includeMemory: true });
  assert.equal(store.listPublicRecipes()[0].story, sample.peaceMemory);
});

test('unpublishing removes the recipe from the map', () => {
  const { store } = setup();
  const r = store.saveRecipe(sample);
  store.publishRecipe(r.id, { showCountry: true });
  store.unpublishRecipe(r.id);
  assert.equal(store.listPublicRecipes().length, 0);
});

test('passport stamps come only from public stories and are never duplicated', () => {
  const { store } = setup();
  const priv = store.saveRecipe(sample);
  assert.equal(store.recordDiscovery(priv.id), null);
  const a = store.saveRecipe(sample), b = store.saveRecipe(sample);
  store.publishRecipe(a.id, { showCountry: true });
  store.publishRecipe(b.id, { showCountry: true });
  assert.equal(store.recordDiscovery(a.id).isNewStamp, true);
  assert.equal(store.recordDiscovery(a.id).isNewStamp, false);
  assert.equal(store.recordDiscovery(b.id).isNewStamp, false);
  const p = store.passport();
  assert.equal(p.totalStamps, 1);
  assert.equal(p.storiesExplored, 2);
  assert.deepEqual(p.stamps[0].recipeIds.sort(), [a.id, b.id].sort());
});

test('time capsule hides its reflection until the unlock date', () => {
  const { store, advance } = setup();
  const c = store.createCapsule({ reflection: 'Quiet mornings.', unlockAt: '2026-11-26T00:00:00Z', mood: 'Calm' });
  assert.equal(c.reflection, undefined);
  assert.equal(store.listCapsules()[0].reflection, undefined);
  assert.throws(() => store.openCapsule(c.id), e => e.code === 'LOCKED');
  advance(7 * 86400000);
  const opened = store.openCapsule(c.id);
  assert.equal(opened.reflection, 'Quiet mornings.');
  assert.ok(opened.openedAt);
  assert.equal(store.listCapsules()[0].reflection, 'Quiet mornings.');
});

test('time capsule validation', () => {
  const { store } = setup();
  assert.throws(() => store.createCapsule({ reflection: '', unlockAt: '2027-01-01' }));
  assert.throws(() => store.createCapsule({ reflection: 'hi', unlockAt: '2020-01-01' }));
  assert.throws(() => store.createCapsule({ reflection: 'hi', unlockAt: '2027-01-01', mood: 'Angry' }));
  assert.throws(() => store.createCapsule({ reflection: 'hi', unlockAt: '2027-01-01', recipeId: 'nope' }));
});

test('deleting a recipe unlinks it from capsules', () => {
  const { store } = setup();
  const r = store.saveRecipe(sample);
  const c = store.createCapsule({ reflection: 'hi', unlockAt: '2027-01-01T00:00:00Z', recipeId: r.id });
  store.deleteRecipe(r.id);
  assert.equal(store.listCapsules().find(x => x.id === c.id).recipeId, null);
});

test('presets use the local calendar', () => {
  const from = new Date(2026, 0, 31, 15, 0);
  assert.equal(presetDate('week', from).getDate(), 7);
  assert.equal(presetDate('year', from).getFullYear(), 2027);
  assert.equal(localDate('2027-03-05').getMonth(), 2);
  assert.ok(isNaN(localDate('nope')));
});

test('corrupt storage starts fresh instead of crashing', () => {
  const storage = memoryStorage();
  storage.setItem(KEY, '{not json');
  const store = createStore(storage, () => new Date());
  assert.equal(store.listMyRecipes().length, 0);
});

test('clearEverything removes all saved data', () => {
  const { store, storage } = setup();
  store.saveRecipe(sample);
  store.clearEverything();
  assert.equal(storage.data[KEY], undefined);
  assert.equal(store.listMyRecipes().length, 0);
});

test('publishing can set a separate public story, validated for length', () => {
  const { store } = setup();
  const r = store.saveRecipe({ ...sample, description: '' });
  store.publishRecipe(r.id, { showCountry: true, description: 'Peace is a quiet walk.' });
  assert.equal(store.listPublicRecipes()[0].story, 'Peace is a quiet walk.');
  assert.throws(() => store.publishRecipe(r.id, { showCountry: true, description: 'x'.repeat(241) }));
  store.unpublishRecipe(r.id);
  store.publishRecipe(r.id, { showCountry: true });
  assert.equal(store.listPublicRecipes()[0].story, 'Peace is a quiet walk.');
});

test('saves other desserts with a dessert type, customisation and ingredients', () => {
  const { store } = setup();
  const c = store.saveRecipe({ dessertType: 'cookie', flavorName: 'Starry Hug', customization: { shape: 'star', icing: ['#fff', '#f3c6ce'], message: 'hi' }, ingredients: ['Vanilla dough', 'Pink icing'], peaceMemory: 'Baking with grandma' });
  assert.equal(c.dessertType, 'cookie');
  assert.equal(c.flavor, null);
  assert.deepEqual(c.customization.icing, ['#fff', '#f3c6ce']);
  assert.equal(store.listMyRecipes('all', 'recent', 'cookie').length, 1);
  assert.equal(store.listMyRecipes('all', 'recent', 'icecream').length, 0);
});

test('rejects unknown dessert types and unsafe customisation', () => {
  const { store } = setup();
  assert.throws(() => store.saveRecipe({ dessertType: 'pizza' }));
  assert.throws(() => store.saveRecipe({ dessertType: 'cake', customization: { '<b>': 1 } }));
  assert.throws(() => store.saveRecipe({ dessertType: 'cake', customization: { note: 'x'.repeat(61) } }));
  assert.throws(() => store.saveRecipe({ dessertType: 'cake', customization: { nested: { a: 1 } } }));
  assert.throws(() => store.saveRecipe({ dessertType: 'cake', customization: { list: Array(30).fill(1) } }));
});

test('older recipes without a dessert type are treated as ice cream', () => {
  const storage = memoryStorage();
  storage.setItem(KEY, JSON.stringify({ version: 1, profile: { id: 'me', nickname: '', createdAt: '2026-01-01T00:00:00Z' }, recipes: [{ id: 'old', ownerId: 'me', flavorName: 'Old', flavor: 1, toppings: [], visibility: 'private', createdAt: '2026-01-01T00:00:00Z' }], favorites: [], discoveries: [], savedDiscoveries: [], capsules: [] }));
  const store = createStore(storage, () => new Date());
  assert.equal(store.listMyRecipes()[0].dessertType, 'icecream');
  assert.equal(store.getRecipe('old').dessertType, 'icecream');
});

test('public desserts can be filtered by type and count toward passport badges', () => {
  const { store } = setup();
  const m = store.saveRecipe({ dessertType: 'mochi', flavorName: 'Soft', customization: { color: 'pink' }, countryCode: '410', countryName: 'South Korea' });
  store.publishRecipe(m.id, { showCountry: true, description: 'A soft moment' });
  assert.equal(store.listPublicRecipes({ dessertType: 'mochi' }).length, 1);
  assert.equal(store.listPublicRecipes({ dessertType: 'cake' }).length, 0);
  assert.equal(store.listPublicRecipes()[0].dessertType, 'mochi');
  store.recordDiscovery(m.id);
  assert.equal(store.passport().byType.mochi, 1);
});
