/* PeaceCream little-world data layer (device-only "local" mode).
 * Everything here lives in this browser's localStorage. Nothing is sent anywhere.
 * The API is written so a shared backend (e.g. Supabase) can replace it later.
 * Melt Your Worries never touches this module. */
(function (root) {
  'use strict';
  const KEY = 'peacecream:little-world:v1';
  const MODE = 'local';
  const LIMITS = { flavorName: 60, description: 240, peaceMemory: 500, nickname: 30, capsuleTitle: 60, reflection: 1500 };
  const MOODS = ['Calm', 'Grateful', 'Hopeful', 'Nostalgic', 'Happy', 'Unsure'];
  const FLAVOR_COUNT = 10;
  const DESSERT_TYPES = ['icecream', 'cookie', 'cake', 'donut', 'macaron', 'mochi', 'cupcake'];
  const MAX_CUSTOM_CHARS = 3000;
  const TOPPING_COUNT = 10;
  const DAY = 86400000;

  function emptyDoc(now) {
    return { version: 1, profile: { id: uid(), nickname: '', createdAt: now.toISOString() }, recipes: [], favorites: [], discoveries: [], savedDiscoveries: [], capsules: [] };
  }
  function uid() {
    const c = root.crypto || (typeof globalThis !== 'undefined' && globalThis.crypto);
    if (c && c.randomUUID) return c.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function cleanText(value, max, field) {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') throw new TypeError('Please use plain text here.');
    const trimmed = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
    if (trimmed.length > max) { const e = new RangeError('This is a little too long. Please keep it to {max} characters or fewer.'); e.vars = { max }; e.field = field; throw e; }
    return trimmed;
  }
  function validIndex(n, count) { return Number.isInteger(n) && n >= 0 && n < count; }
  /** A dessert's customisation: a small, flat-ish JSON object of plain values (no HTML is ever rendered from it). */
  function cleanCustomization(c) {
    if (c === undefined || c === null) return {};
    if (typeof c !== 'object' || Array.isArray(c)) throw new RangeError('Something about this treat didn’t look right. Please try again.');
    const ok = v => (typeof v === 'string' ? v.length <= 60 : typeof v === 'number' ? Number.isFinite(v) : typeof v === 'boolean' || v === null);
    const out = {};
    for (const [k, v] of Object.entries(c)) {
      if (!/^[a-zA-Z][\w]{0,29}$/.test(k)) throw new RangeError('Something about this treat didn’t look right. Please try again.');
      if (Array.isArray(v)) { if (v.length > 24 || !v.every(ok)) throw new RangeError('Something about this treat didn’t look right. Please try again.'); out[k] = [...v]; }
      else if (ok(v)) out[k] = v;
      else throw new RangeError('Something about this treat didn’t look right. Please try again.');
    }
    if (JSON.stringify(out).length > MAX_CUSTOM_CHARS) throw new RangeError('Something about this treat didn’t look right. Please try again.');
    return out;
  }
  function cleanIngredients(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 14).map(x => cleanText(String(x), 60, 'Ingredient')).filter(Boolean);
  }
  /** Older saved recipes were all ice cream. */
  const normalise = r => (r && !r.dessertType ? { ...r, dessertType: 'icecream' } : r);
  function cleanCountry(code, name) {
    if (!code) return { countryCode: null, countryName: null };
    if (typeof code !== 'string' || !/^[A-Za-z0-9-]{1,40}$/.test(code)) throw new RangeError('Please choose a country from the list.');
    return { countryCode: code, countryName: cleanText(name || code, 80, 'Country name') };
  }

  /** @param {{getItem:Function,setItem:Function,removeItem:Function}} storage @param {()=>Date} clock */
  function createStore(storage, clock) {
    const now = () => (clock ? clock() : new Date());
    let cache = null;

    function load() {
      if (cache) return cache;
      let doc = null;
      try { doc = JSON.parse(storage.getItem(KEY)); } catch (e) { doc = null; }
      if (!doc || doc.version !== 1 || !Array.isArray(doc.recipes)) doc = emptyDoc(now());
      cache = doc;
      return cache;
    }
    function commit(next) {
      storage.setItem(KEY, JSON.stringify(next));
      cache = next;
      return next;
    }
    function update(fn) { return commit(fn(load())); }
    function ownerId() { return load().profile.id; }
    function findRecipe(id) { return normalise(load().recipes.find(r => r.id === id)) || null; }
    function requireOwn(id) {
      const r = findRecipe(id);
      if (!r || r.ownerId !== ownerId()) throw new Error('Recipe not found');
      return r;
    }

    /* ---------- Recipes ---------- */
    function saveRecipe(input) {
      const dessertType = input.dessertType || 'icecream';
      if (!DESSERT_TYPES.includes(dessertType)) throw new RangeError('Unknown treat');
      const isIce = dessertType === 'icecream';
      if (isIce && !validIndex(input.flavor, FLAVOR_COUNT)) throw new RangeError('Unknown flavor');
      const toppings = isIce && Array.isArray(input.toppings) ? input.toppings : [];
      if (toppings.length > 2 || !toppings.every(t => validIndex(t, TOPPING_COUNT))) throw new RangeError('Choose up to two toppings');
      const stamp = now().toISOString();
      const recipe = {
        id: uid(), ownerId: ownerId(),
        flavorName: cleanText(input.flavorName, LIMITS.flavorName, 'Flavor name') || 'A little joy',
        dessertType, flavor: isIce ? input.flavor : null, toppings: [...new Set(toppings)],
        customization: isIce ? {} : cleanCustomization(input.customization),
        ingredients: isIce ? [] : cleanIngredients(input.ingredients),
        description: cleanText(input.description, LIMITS.description, 'Description'),
        peaceMemory: cleanText(input.peaceMemory, LIMITS.peaceMemory, 'Peace memory'),
        ...cleanCountry(input.countryCode, input.countryName),
        visibility: 'private', showCountry: false, publishedAt: null,
        createdAt: stamp, updatedAt: stamp
      };
      update(d => ({ ...d, recipes: [...d.recipes, recipe] }));
      return recipe;
    }
    function listMyRecipes(filter, sort, type) {
      const d = load(), me = ownerId();
      let list = d.recipes.map(normalise).filter(r => r.ownerId === me);
      if (type && type !== 'all') list = list.filter(r => r.dessertType === type);
      if (filter === 'favorites') list = list.filter(r => d.favorites.includes(r.id));
      if (filter === 'private') list = list.filter(r => r.visibility === 'private');
      if (filter === 'public') list = list.filter(r => r.visibility === 'public');
      const dir = sort === 'oldest' ? 1 : -1;
      return [...list].sort((a, b) => dir * (Date.parse(a.createdAt) - Date.parse(b.createdAt)));
    }
    function getRecipe(id) {
      const r = findRecipe(id);
      if (!r) return null;
      if (r.ownerId === ownerId() || r.visibility === 'public') return r;
      return null;
    }
    function renameRecipe(id, name) {
      requireOwn(id);
      const flavorName = cleanText(name, LIMITS.flavorName, 'Flavor name');
      if (!flavorName) throw new RangeError('Please give your flavor a name');
      update(d => ({ ...d, recipes: d.recipes.map(r => r.id === id ? { ...r, flavorName, updatedAt: now().toISOString() } : r) }));
      return findRecipe(id);
    }
    function setCountry(id, code, name) {
      requireOwn(id);
      const c = cleanCountry(code, name);
      update(d => ({ ...d, recipes: d.recipes.map(r => r.id === id ? { ...r, ...c, showCountry: c.countryCode ? r.showCountry : false, updatedAt: now().toISOString() } : r) }));
      return findRecipe(id);
    }
    /** Publishing is always explicit. showCountry decides whether it appears on the map. */
    function publishRecipe(id, opts) {
      requireOwn(id);
      const showCountry = !!(opts && opts.showCountry) && !!findRecipe(id).countryCode;
      const includeMemory = !!(opts && opts.includeMemory);
      const description = opts && opts.description !== undefined ? cleanText(opts.description, LIMITS.description, 'Public story') : findRecipe(id).description;
      update(d => ({ ...d, recipes: d.recipes.map(r => r.id === id ? { ...r, description, visibility: 'public', showCountry, shareMemory: includeMemory, publishedAt: now().toISOString(), updatedAt: now().toISOString() } : r) }));
      return findRecipe(id);
    }
    function unpublishRecipe(id) {
      requireOwn(id);
      update(d => ({ ...d, recipes: d.recipes.map(r => r.id === id ? { ...r, visibility: 'private', showCountry: false, shareMemory: false, publishedAt: null, updatedAt: now().toISOString() } : r) }));
      return findRecipe(id);
    }
    function deleteRecipe(id) {
      requireOwn(id);
      update(d => ({
        ...d,
        recipes: d.recipes.filter(r => r.id !== id),
        favorites: d.favorites.filter(f => f !== id),
        savedDiscoveries: d.savedDiscoveries.filter(f => f !== id),
        capsules: d.capsules.map(c => c.recipeId === id ? { ...c, recipeId: null } : c)
      }));
    }
    function isFavorite(id) { return load().favorites.includes(id); }
    function toggleFavorite(id) {
      if (!getRecipe(id)) throw new Error('Recipe not found');
      const on = !isFavorite(id);
      update(d => ({ ...d, favorites: on ? [...d.favorites, id] : d.favorites.filter(f => f !== id) }));
      return on;
    }

    /* ---------- Public view (what the map may show) ---------- */
    /** Strips everything that was not explicitly chosen to be public. */
    function publicView(r) {
      return {
        id: r.id, dessertType: r.dessertType || 'icecream', flavorName: r.flavorName, flavor: r.flavor, toppings: r.toppings,
        customization: r.customization || {}, ingredients: r.ingredients || [],
        story: r.shareMemory && r.peaceMemory ? r.peaceMemory : r.description,
        countryCode: r.countryCode, countryName: r.countryName,
        publishedAt: r.publishedAt, isMine: r.ownerId === ownerId()
      };
    }
    function listPublicRecipes(opts) {
      const o = opts || {};
      let list = load().recipes.filter(r => r.visibility === 'public' && r.showCountry && r.countryCode);
      if (o.countryCode) list = list.filter(r => r.countryCode === o.countryCode);
      if (Number.isInteger(o.topping)) list = list.filter(r => r.toppings.includes(o.topping));
      if (o.dessertType) list = list.filter(r => (r.dessertType || 'icecream') === o.dessertType);
      list = [...list].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
      const page = Math.max(0, o.page || 0), size = o.pageSize || 50;
      return list.slice(page * size, page * size + size).map(publicView);
    }
    function publicStats() {
      const list = load().recipes.filter(r => r.visibility === 'public' && r.showCountry && r.countryCode);
      const byCountry = {};
      list.forEach(r => { byCountry[r.countryCode] = (byCountry[r.countryCode] || 0) + 1; });
      return { totalScoops: list.length, countries: Object.keys(byCountry).length, stories: list.filter(r => (r.shareMemory && r.peaceMemory) || r.description).length, byCountry };
    }

    /* ---------- Passport ---------- */
    /** Records a discovery of a real public story. Returns {isNewStamp, discovery} or null if not eligible. */
    function recordDiscovery(recipeId) {
      const r = findRecipe(recipeId);
      if (!r || r.visibility !== 'public' || !r.showCountry || !r.countryCode) return null;
      const d = load();
      const already = d.discoveries.find(x => x.recipeId === recipeId);
      if (already) return { isNewStamp: false, discovery: already };
      const isNewStamp = !d.discoveries.some(x => x.countryCode === r.countryCode);
      const discovery = { id: uid(), countryCode: r.countryCode, countryName: r.countryName, recipeId, dessertType: r.dessertType || 'icecream', discoveredAt: now().toISOString() };
      update(doc => ({ ...doc, discoveries: [...doc.discoveries, discovery] }));
      return { isNewStamp, discovery };
    }
    function passport() {
      const d = load();
      const stamps = {};
      d.discoveries.forEach(x => {
        const s = stamps[x.countryCode] || { countryCode: x.countryCode, countryName: x.countryName, unlockedAt: x.discoveredAt, recipeIds: [] };
        stamps[x.countryCode] = { ...s, unlockedAt: x.discoveredAt < s.unlockedAt ? x.discoveredAt : s.unlockedAt, recipeIds: [...s.recipeIds, x.recipeId] };
      });
      const first = d.discoveries.reduce((m, x) => (!m || x.discoveredAt < m ? x.discoveredAt : m), null);
      const byType = {};
      d.discoveries.forEach(x => { const r = findRecipe(x.recipeId); const t = (r && r.dessertType) || x.dessertType || 'icecream'; byType[t] = (byType[t] || 0) + 1; });
      return { byType, nickname: d.profile.nickname, stamps: Object.values(stamps), totalStamps: Object.keys(stamps).length, countries: Object.keys(stamps).length, storiesExplored: d.discoveries.length, firstDiscovery: first };
    }
    function setNickname(name) {
      const nickname = cleanText(name, LIMITS.nickname, 'Nickname');
      update(d => ({ ...d, profile: { ...d.profile, nickname } }));
      return nickname;
    }
    function saveDiscovery(recipeId) {
      if (!getRecipe(recipeId)) throw new Error('Recipe not found');
      update(d => ({ ...d, savedDiscoveries: d.savedDiscoveries.includes(recipeId) ? d.savedDiscoveries : [...d.savedDiscoveries, recipeId] }));
    }
    function listSavedDiscoveries() {
      return load().savedDiscoveries.map(id => getRecipe(id)).filter(r => r && r.visibility === 'public').map(publicView);
    }

    /* ---------- Time capsules ---------- */
    function createCapsule(input) {
      const reflection = cleanText(input.reflection, LIMITS.reflection, 'Reflection');
      if (!reflection) throw new RangeError('Please write a little reflection first');
      const unlock = new Date(input.unlockAt);
      if (isNaN(unlock)) throw new RangeError('Please choose an opening date');
      if (unlock.getTime() <= now().getTime()) throw new RangeError('The opening date must be in the future');
      if (input.mood && !MOODS.includes(input.mood)) throw new RangeError('Unknown mood');
      if (input.recipeId) requireOwn(input.recipeId);
      const capsule = {
        id: uid(), ownerId: ownerId(),
        title: cleanText(input.title, LIMITS.capsuleTitle, 'Capsule name') || 'A little moment of peace',
        reflection, mood: input.mood || null, recipeId: input.recipeId || null,
        createdAt: now().toISOString(), unlockAt: unlock.toISOString(), openedAt: null
      };
      update(d => ({ ...d, capsules: [...d.capsules, capsule] }));
      return summary(capsule);
    }
    function isUnlocked(c) { return now().getTime() >= Date.parse(c.unlockAt); }
    /** Locked capsules never include their reflection in what the UI receives. */
    function summary(c) {
      const unlocked = isUnlocked(c);
      const base = { id: c.id, title: c.title, mood: c.mood, recipeId: c.recipeId, createdAt: c.createdAt, unlockAt: c.unlockAt, openedAt: c.openedAt, unlocked };
      return unlocked && c.openedAt ? { ...base, reflection: c.reflection } : base;
    }
    function listCapsules() {
      return load().capsules.filter(c => c.ownerId === ownerId()).sort((a, b) => Date.parse(a.unlockAt) - Date.parse(b.unlockAt)).map(summary);
    }
    function openCapsule(id) {
      const c = load().capsules.find(x => x.id === id && x.ownerId === ownerId());
      if (!c) throw new Error('Capsule not found');
      if (!isUnlocked(c)) { const e = new Error('This capsule is still sleeping'); e.code = 'LOCKED'; throw e; }
      const openedAt = c.openedAt || now().toISOString();
      update(d => ({ ...d, capsules: d.capsules.map(x => x.id === id ? { ...x, openedAt } : x) }));
      return { ...summary({ ...c, openedAt }), reflection: c.reflection };
    }
    function deleteCapsule(id) {
      update(d => ({ ...d, capsules: d.capsules.filter(c => !(c.id === id && c.ownerId === ownerId())) }));
    }

    function clearEverything() { storage.removeItem(KEY); cache = null; }

    return {
      MODE, LIMITS, MOODS, DESSERT_TYPES,
      saveRecipe, listMyRecipes, getRecipe, renameRecipe, setCountry, publishRecipe, unpublishRecipe, deleteRecipe, isFavorite, toggleFavorite,
      listPublicRecipes, publicStats,
      recordDiscovery, passport, setNickname, saveDiscovery, listSavedDiscoveries,
      createCapsule, listCapsules, openCapsule, deleteCapsule,
      profile: () => ({ ...load().profile }), clearEverything
    };
  }

  /** Date helpers for capsule presets, using the person's local calendar. */
  function presetDate(preset, from) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    if (preset === 'week') d.setDate(d.getDate() + 7);
    else if (preset === 'month') d.setMonth(d.getMonth() + 1);
    else if (preset === 'half') d.setMonth(d.getMonth() + 6);
    else if (preset === 'year') d.setFullYear(d.getFullYear() + 1);
    else throw new RangeError('Unknown preset');
    return d;
  }
  /** "2027-01-05" -> local midnight Date */
  function localDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!m) return new Date(NaN);
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  const api = { createStore, presetDate, localDate, KEY, DAY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    let storage;
    try { storage = root.localStorage; storage.getItem(KEY); } catch (e) {
      const mem = {};
      storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
      api.storageUnavailable = true;
    }
    root.PeaceStore = { ...api, store: createStore(storage) };
  }
})(typeof window !== 'undefined' ? window : globalThis);
