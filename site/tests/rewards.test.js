// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRewards, KEY, CODE_PATTERN, DISCOUNT_PERCENT } = require('../pc-rewards-core.js');

function memoryStorage() {
  const m = {};
  return { data: m, getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
}
let seed = 1;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function setup() {
  const storage = memoryStorage();
  const t = new Date('2026-11-19T10:00:00Z');
  return { storage, rewards: createRewards(storage, () => t, random) };
}

test('codes are 5% and look like SHAREPEACE5-XXXX', () => {
  const { rewards } = setup();
  const share = rewards.createShare('scoop');
  const r = rewards.verifyReferral(share.id);
  assert.equal(DISCOUNT_PERCENT, 5);
  assert.match(r.reward.code, CODE_PATTERN);
  assert.equal(r.reward.percent, 5);
  assert.equal(r.reward.demo, true);
});

test('clicking Share never unlocks a reward by itself', () => {
  const { rewards } = setup();
  for (let i = 0; i < 5; i++) rewards.createShare('scoop');
  assert.equal(rewards.listRewards().length, 0);
  assert.equal(rewards.pendingShares().length, 5);
});

test('a referral can only be rewarded once', () => {
  const { rewards } = setup();
  const s = rewards.createShare('passport');
  const first = rewards.verifyReferral(s.id);
  const second = rewards.verifyReferral(s.id);
  assert.equal(first.isNew, true);
  assert.equal(second.isNew, false);
  assert.equal(second.reward.code, first.reward.code);
  assert.equal(rewards.listRewards().length, 1);
});

test('unknown referral ids and bad share kinds are rejected', () => {
  const { rewards } = setup();
  assert.throws(() => rewards.verifyReferral('nope'));
  assert.throws(() => rewards.createShare('icecream-order'));
});

test('one reward per gift order', () => {
  const { rewards } = setup();
  const a = rewards.rewardGift('order-1');
  const b = rewards.rewardGift('order-1');
  assert.equal(a.isNew, true);
  assert.equal(b.isNew, false);
  assert.equal(rewards.listRewards().length, 1);
  assert.equal(rewards.listRewards()[0].source, 'gift');
});

test('codes validate case-insensitively and can be redeemed only once', () => {
  const { rewards } = setup();
  const { reward } = rewards.rewardGift('order-2');
  assert.equal(rewards.checkCode(reward.code.toLowerCase()).ok, true);
  assert.equal(rewards.redeem(reward.code, 'order-3').ok, true);
  const again = rewards.checkCode(reward.code);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'used');
  assert.equal(rewards.redeem(reward.code, 'order-4').ok, false);
  assert.equal(rewards.listRewards()[0].usedOn, 'order-3');
});

test('made-up or malformed codes are invalid', () => {
  const { rewards } = setup();
  assert.equal(rewards.checkCode('SHAREPEACE5-ABCD').reason, 'unknown');
  assert.equal(rewards.checkCode('<script>').reason, 'format');
  assert.equal(rewards.checkCode('').reason, 'format');
});

test('expired codes are refused', () => {
  const storage = memoryStorage();
  let t = new Date('2026-11-19T10:00:00Z');
  const rewards = createRewards(storage, () => t, random);
  const { reward } = rewards.rewardGift('order-5');
  t = new Date(Date.parse(reward.expiresAt) + 1000);
  assert.equal(rewards.checkCode(reward.code).reason, 'expired');
});

test('discount is 5% of the eligible subtotal, rounded to cents', () => {
  const { rewards } = setup();
  assert.equal(rewards.discountFor(18), 0.9);
  assert.equal(rewards.discountFor(7.5), 0.38);
  assert.equal(rewards.discountFor(0), 0);
});

test('rewards persist across reloads and survive corrupt storage', () => {
  const { storage, rewards } = setup();
  rewards.rewardGift('order-6');
  const again = createRewards(storage, () => new Date('2026-11-20T00:00:00Z'), random);
  assert.equal(again.listRewards().length, 1);
  storage.setItem(KEY, '{not json');
  const fresh = createRewards(storage, () => new Date(), random);
  assert.equal(fresh.listRewards().length, 0);
});

test('referral payloads round-trip and reject tampering', () => {
  const { rewards } = setup();
  const payload = { k: 'scoop', ref: 'abc123', n: 'Moon <b>Matcha</b>', f: 3, t: [1, 4], m: 'Tea after rain.' };
  const enc = rewards.encodeCard(payload);
  assert.match(enc, /^[A-Za-z0-9_-]+$/);
  const dec = rewards.decodeCard(enc);
  assert.equal(dec.n, payload.n);
  assert.deepEqual(dec.t, [1, 4]);
  assert.equal(rewards.decodeCard('!!!'), null);
  assert.equal(rewards.decodeCard(rewards.encodeCard({ k: 'evil' })), null);
  assert.equal(rewards.decodeCard(rewards.encodeCard({ k: 'scoop', n: 'x'.repeat(500) })).n.length, 60);
});

test('own shares are recognised so self-referrals do not count', () => {
  const { rewards } = setup();
  const s = rewards.createShare('recipe');
  assert.equal(rewards.isOwnShare(s.id), true);
  assert.equal(rewards.isOwnShare('someone-else'), false);
});

test('gift card payloads keep a safe product id and drop bad ones', () => {
  const { rewards } = setup();
  assert.equal(rewards.decodeCard(rewards.encodeCard({ k: 'gift', n: 'Mia', p: 'love-cake' })).p, 'love-cake');
  assert.equal(rewards.decodeCard(rewards.encodeCard({ k: 'gift', n: 'Mia', p: '"><img>' })).p, '');
  assert.throws(() => rewards.createShare('gift'));
});
