'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { inflateRawSync } = require('node:zlib');
const { createHandler, makeToken, checkToken, passwordMatches, readBooking } = require('../lib/server/admin.cjs');
const { isKey, makeKey, slotName, slotShort } = require('../lib/server/slots.cjs');
const { toXlsx } = require('../lib/server/xlsx.cjs');

const env = { ADMIN_PASSWORD: 'test-pass-123', NOTION_TOKEN: 't' };
function call(handler, { method = 'GET', url, body, cookie, headers = {} }) {
  return new Promise(resolve => {
    const res = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { resolve({ status: this.statusCode, headers: this.headers, body: Buffer.isBuffer(b) ? b : JSON.parse(b) }); } };
    handler({ method, url, body, headers: { host: 'x.test', 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, socket: {} }, res);
  });
}

test('slot keys and names', () => {
  assert.ok(isKey('thursday_5pm'));
  assert.ok(!isKey('thursday_13pm') && !isKey('funday_5pm') && !isKey(''));
  assert.equal(makeKey('friday', 7, 'pm'), 'friday_7pm');
  assert.equal(slotName('thursday_5pm'), 'الخميس — 5 مساءً');
  assert.equal(slotShort('saturday_10am'), 'السبت · 10 ص');
});

test('session token', () => {
  const t = makeToken(env, Date.now());
  assert.ok(checkToken(env, t, Date.now()));
  assert.ok(!checkToken({ ...env, ADMIN_PASSWORD: 'other' }, t, Date.now()), 'changing the password ends old sessions');
  assert.ok(!checkToken(env, t, Date.now() + 8 * 86400000), 'expires after 7 days');
  assert.ok(!checkToken(env, t.replace(/.$/, c => (c === 'a' ? 'b' : 'a')), Date.now()));
  assert.ok(passwordMatches(env, 'test-pass-123') && !passwordMatches(env, 'test-pass-124') && !passwordMatches({}, ''));
});

test('login, protected actions, and rate limit', async () => {
  const admin = { listCards: async () => [{ id: 'c1' }] };
  const h = createHandler({ env, admin });
  assert.equal((await call(h, { url: '/api/admin?action=cards' })).status, 401);
  const bad = await call(h, { method: 'POST', url: '/api/admin?action=login', body: { password: 'nope' } });
  assert.equal(bad.status, 401);
  const ok = await call(h, { method: 'POST', url: '/api/admin?action=login', body: { password: 'test-pass-123' } });
  assert.equal(ok.status, 200);
  const cookie = ok.headers['set-cookie'].split(';')[0];
  assert.match(ok.headers['set-cookie'], /HttpOnly; Secure; SameSite=Strict/);
  const cards = await call(h, { url: '/api/admin?action=cards', cookie });
  assert.deepEqual(cards.body, { ok: true, cards: [{ id: 'c1' }] });
  assert.equal((await call(h, { url: '/api/admin?action=nope', cookie })).status, 404);
  // cross-site posts are refused even with a cookie
  assert.equal((await call(h, { method: 'POST', url: '/api/admin?action=card-status', body: {}, cookie, headers: { origin: 'https://evil.test' } })).status, 403);
  const h2 = createHandler({ env, admin });
  for (let i = 0; i < 8; i++) await call(h2, { method: 'POST', url: '/api/admin?action=login', body: { password: 'x' } });
  assert.equal((await call(h2, { method: 'POST', url: '/api/admin?action=login', body: { password: 'test-pass-123' } })).status, 429);
});

test('no password configured means no way in', async () => {
  const h = createHandler({ env: { NOTION_TOKEN: 't' }, admin: {} });
  const r = await call(h, { method: 'POST', url: '/api/admin?action=login', body: { password: '' } });
  assert.equal(r.status, 503);
});

test('booking rows read from Notion', () => {
  const b = readBooking({ id: 'p1', created_time: '2026-11-22T10:00:00.000Z', properties: {
    Student: { title: [{ plain_text: 'يوسف' }] }, Parent: { rich_text: [{ plain_text: 'أحمد' }] },
    'Parent WhatsApp': { phone_number: '+201012345678' }, Grade: { select: { name: 'الصف الثاني الإعدادي' } },
    'Preferred slot': { select: { name: 'السبت — 5 مساءً' } }, Status: { select: null }, Interests: { multi_select: [{ name: 'التصميم والإبداع' }] },
  } });
  assert.equal(b.student, 'يوسف'); assert.equal(b.status, 'جديد'); assert.equal(b.slot, 'السبت — 5 مساءً'); assert.deepEqual(b.interests, ['التصميم والإبداع']);
});

test('xlsx file is a valid zip with the rows', () => {
  const buf = toXlsx([['الطالب', 'العدد'], ['يوسف & <مريم>', 3]], { sheet: 'حجوزات' });
  assert.equal(buf.readUInt32LE(0), 0x04034b50);
  assert.equal(buf.readUInt32LE(buf.length - 22), 0x06054b50);
  const text = buf.toString('utf8');
  assert.ok(text.includes('يوسف &amp; &lt;مريم&gt;') && text.includes('<v>3</v>') && text.includes('rightToLeft="1"'));
  assert.ok(typeof inflateRawSync === 'function');
});

test('Notion calls: open one card, add a question, add a slot', async () => {
  const CARDS = 'cardsdb000000000000000000000000a', QS = 'qsdb0000000000000000000000000000b', SLOTS = 'slotsdb0000000000000000000000000c';
  const id = n => `0000000${n}-0000-0000-0000-000000000000`;
  const calls = [];
  const pages = {
    [id(1)]: { id: id(1), parent: { database_id: CARDS }, properties: { Name: { title: [] }, Mission: { number: 2 }, Phase: { select: { name: 'قبل' } }, Status: { select: { name: 'مقفول' } }, 'الأسئلة': { relation: [] } } },
    [id(2)]: { id: id(2), parent: { database_id: CARDS }, properties: { Name: { title: [] }, Mission: { number: 3 }, Phase: { select: { name: 'بعد' } }, Status: { select: { name: 'مفتوح' } }, 'الأسئلة': { relation: [] } } },
  };
  const fetchImpl = async (url, opts) => {
    const path = url.replace('https://api.notion.com/v1', ''), body = opts.body ? JSON.parse(opts.body) : null;
    calls.push([opts.method, path, body]);
    const json = v => ({ ok: true, json: async () => v });
    if (opts.method === 'GET' && path.startsWith('/pages/')) return json(pages[path.slice(7)]);
    if (path === `/databases/${CARDS}/query`) return json({ results: body.filter ? [pages[id(2)]] : Object.values(pages) });
    if (path === `/databases/${QS}/query`) return json({ results: [] });
    if (path === `/databases/${SLOTS}/query`) return json({ results: [] });
    return json({});
  };
  const { createAdmin } = require('../lib/server/admin.cjs');
  const admin = createAdmin({ NOTION_TOKEN: 't', NOTION_CARDS_DB: CARDS, NOTION_QUESTIONS_DB: QS, NOTION_SLOTS_DB: SLOTS }, { fetchImpl });
  await admin.setCardOpen({ id: id(1), open: true });
  const patches = calls.filter(c => c[0] === 'PATCH');
  assert.deepEqual(patches.map(c => [c[1], c[2].properties.Status.select.name]), [[`/pages/${id(2)}`, 'مقفول'], [`/pages/${id(1)}`, 'مفتوح']]);
  calls.length = 0;
  await admin.saveQuestion({ cardId: id(1), text: 'إيه القيود؟', type: 'multi', choices: ['وقت', 'فلوس', 'وقت'] });
  const create = calls.find(c => c[0] === 'POST' && c[1] === '/pages')[2];
  assert.equal(create.parent.database_id, QS);
  assert.equal(create.properties['النوع'].select.name, '✅ أكتر من اختيار');
  assert.equal(create.properties['الاختيارات'].rich_text[0].text.content, 'وقت\nفلوس');
  assert.deepEqual(create.properties['الكارت'].relation, [{ id: id(1) }]);
  await assert.rejects(admin.saveQuestion({ cardId: id(1), text: 'x', type: 'single', choices: ['واحد'] }), /bad_choices/);
  await assert.rejects(admin.setCardOpen({ id: 'not-an-id', open: true }), /bad_id/);
  calls.length = 0;
  await admin.saveSlot({ day: 'thursday', hour: 5, period: 'pm', capacity: 12 });
  const slot = calls.find(c => c[0] === 'POST' && c[1] === '/pages')[2];
  assert.equal(slot.properties.Key.rich_text[0].text.content, 'thursday_5pm');
  assert.equal(slot.properties['الميعاد'].title[0].text.content, 'الخميس — 5 مساءً');
  await assert.rejects(admin.saveSlot({ day: 'thursday', hour: 13, period: 'pm', capacity: 12 }), /bad_slot/);
});
