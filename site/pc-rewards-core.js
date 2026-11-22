/* PeaceCream rewards — DEMONSTRATION engine (no backend is configured).
 * Rules it enforces on this device:
 *  - Sharing only creates a *pending* referral. A reward unlocks once that referral is verified.
 *  - One reward per referral and per gift order (no duplicates from repeated clicks).
 *  - Codes are random (crypto when available), single-use, case-insensitive and expire after 90 days.
 * Real rewards need server-side issuing and validation; until then every code is flagged demo:true
 * and the UI labels it "Demo — not valid for real purchases". */
(function (root) {
  'use strict';
  const KEY = 'peacecream:rewards:v1';
  const DISCOUNT_PERCENT = 5;
  const VALID_DAYS = 90;
  const DAY = 86400000;
  const CODE_PREFIX = 'SHAREPEACE5-';
  const CODE_PATTERN = /^SHAREPEACE5-[A-HJ-NP-Z2-9]{4}$/;
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  const SHARE_KINDS = ['scoop', 'recipe', 'passport', 'discovery'];
  const CARD_KINDS = [...SHARE_KINDS, 'gift'];
  const MAX_TEXT = { n: 60, m: 200, c: 80 };

  function defaultRandom() {
    const c = root.crypto;
    if (c && c.getRandomValues) { const a = new Uint32Array(1); c.getRandomValues(a); return a[0] / 4294967296; }
    return Math.random();
  }
  const empty = () => ({ version: 1, shares: [], rewards: [], orders: [] });

  /**
   * @param {{getItem:Function,setItem:Function}|null} storage
   * @param {() => Date} [clock]
   * @param {() => number} [random]
   */
  function createRewards(storage, clock, random) {
    const now = clock || (() => new Date());
    const rnd = random || defaultRandom;
    let doc = load();

    function load() {
      try {
        const raw = storage && storage.getItem(KEY);
        const d = raw ? JSON.parse(raw) : null;
        if (d && Array.isArray(d.shares) && Array.isArray(d.rewards)) return { ...empty(), ...d };
      } catch (e) { /* corrupt or blocked storage: start fresh */ }
      return empty();
    }
    function save(next) {
      doc = next;
      try { storage && storage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* storage full or blocked */ }
    }
    const token = n => Array.from({ length: n }, () => ALPHABET[Math.floor(rnd() * ALPHABET.length)]).join('');
    function newCode() {
      let code;
      do { code = CODE_PREFIX + token(4); } while (doc.rewards.some(r => r.code === code));
      return code;
    }
    function issue(source, sourceId) {
      const existing = doc.rewards.find(r => r.source === source && r.sourceId === sourceId);
      if (existing) return { isNew: false, reward: existing };
      const t = now();
      const reward = { code: newCode(), percent: DISCOUNT_PERCENT, source, sourceId, createdAt: t.toISOString(), expiresAt: new Date(t.getTime() + VALID_DAYS * DAY).toISOString(), usedOn: null, usedAt: null, demo: true };
      save({ ...doc, rewards: [...doc.rewards, reward] });
      return { isNew: true, reward };
    }

    /** Creates a referral share. It stays pending until verifyReferral. */
    function createShare(kind) {
      if (!SHARE_KINDS.includes(kind)) throw new Error('Unknown share kind');
      const share = { id: token(10).toLowerCase(), kind, createdAt: now().toISOString(), verifiedAt: null };
      save({ ...doc, shares: [...doc.shares, share] });
      return share;
    }
    function verifyReferral(shareId) {
      const share = doc.shares.find(s => s.id === shareId);
      if (!share) throw new Error('Unknown referral');
      if (!share.verifiedAt) save({ ...doc, shares: doc.shares.map(s => (s.id === shareId ? { ...s, verifiedAt: now().toISOString() } : s)) });
      return issue('referral:' + share.kind, shareId);
    }
    function rewardGift(orderId) {
      if (!orderId) throw new Error('Missing order');
      return issue('gift', String(orderId));
    }
    const normal = code => String(code || '').trim().toUpperCase();
    function checkCode(code) {
      const c = normal(code);
      if (!CODE_PATTERN.test(c)) return { ok: false, reason: 'format' };
      const r = doc.rewards.find(x => x.code === c);
      if (!r) return { ok: false, reason: 'unknown' };
      if (r.usedOn) return { ok: false, reason: 'used', reward: r };
      if (Date.parse(r.expiresAt) < now().getTime()) return { ok: false, reason: 'expired', reward: r };
      return { ok: true, reward: r };
    }
    function redeem(code, orderId) {
      const check = checkCode(code);
      if (!check.ok) return check;
      const used = { ...check.reward, usedOn: String(orderId), usedAt: now().toISOString() };
      save({ ...doc, rewards: doc.rewards.map(r => (r.code === used.code ? used : r)) });
      return { ok: true, reward: used };
    }
    const discountFor = subtotal => Math.round(subtotal * DISCOUNT_PERCENT) / 100;
    function recordOrder(order) {
      save({ ...doc, orders: [...doc.orders, order] });
      return order;
    }

    /* Share-card payloads travel inside the link itself (no server). Everything is validated on the way back in. */
    function encodeCard(p) {
      const json = JSON.stringify(p);
      const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64');
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function decodeCard(s) {
      try {
        if (!/^[A-Za-z0-9_-]{1,4000}$/.test(s)) return null;
        const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
        const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
        const p = JSON.parse(json);
        if (!p || !CARD_KINDS.includes(p.k)) return null;
        const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '');
        const int = (v, max) => (Number.isInteger(v) && v >= 0 && v < max ? v : null);
        return {
          k: p.k,
          ref: typeof p.ref === 'string' && /^[a-z0-9]{1,20}$/.test(p.ref) ? p.ref : '',
          n: text(p.n, MAX_TEXT.n), m: text(p.m, MAX_TEXT.m), c: text(p.c, MAX_TEXT.c),
          f: int(p.f, 10),
          t: Array.isArray(p.t) ? p.t.map(x => int(x, 10)).filter(x => x !== null).slice(0, 2) : [],
          s: int(p.s, 1000) || 0, ct: int(p.ct, 300) || 0,
          p: typeof p.p === 'string' && /^[a-z-]{1,40}$/.test(p.p) ? p.p : ''
        };
      } catch (e) { return null; }
    }

    return {
      createShare, verifyReferral, rewardGift, checkCode, redeem, discountFor, recordOrder, encodeCard, decodeCard,
      isOwnShare: id => doc.shares.some(s => s.id === id),
      pendingShares: () => doc.shares.filter(s => !s.verifiedAt),
      listShares: () => [...doc.shares],
      listRewards: () => [...doc.rewards],
      listOrders: () => [...doc.orders],
      clearAll: () => save(empty())
    };
  }

  const api = { createRewards, KEY, CODE_PATTERN, DISCOUNT_PERCENT, VALID_DAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    let storage = null;
    try { storage = root.localStorage; storage.getItem(KEY); } catch (e) { storage = null; }
    root.PeaceRewardsCore = { ...api, rewards: createRewards(storage) };
  }
})(typeof window !== 'undefined' ? window : globalThis);
