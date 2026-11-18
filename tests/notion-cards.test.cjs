const test = require('node:test');
const assert = require('node:assert/strict');
const { createService, createHandlers, buildQuestions } = require('../lib/server/notion-cards.cjs');
const CARDS = 'aaaaaaaaaaaa4aaaaaaaaaaaaaaaaaaa', RESP = 'bbbbbbbbbbbb4bbbbbbbbbbbbbbbbbbb', CARD_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const rt = t => [{ plain_text: t }];
const page = (over = {}) => ({ id: CARD_ID, archived: false, parent: { database_id: CARDS }, properties: {
  Name: { title: rt('M3 قبل') }, Mission: { number: 3 }, Phase: { select: { name: 'قبل' } }, Status: { select: { name: 'مفتوح' } },
  Intro: { rich_text: rt('مقدمة') }, Questions: { rich_text: rt('سؤال حر\nاختار؟ | أ | ب\n+ متعدد | س | ص\n# ثقة') }, 'Decision flow': { checkbox: false }, ...over } });
function mock({ card = page(), dups = [] } = {}) {
  const calls = [];
  const fetchImpl = async (url, o) => {
    const body = o.body ? JSON.parse(o.body) : null; calls.push({ url, method: o.method, body, auth: o.headers.Authorization });
    const json = d => ({ ok: true, status: 200, json: async () => d });
    if (url.endsWith(`/databases/${CARDS}/query`)) return json({ results: card ? [card] : [] });
    if (url.includes('/pages/') && o.method === 'GET') return card ? json(card) : { ok: false, status: 404, json: async () => ({}) };
    if (url.endsWith(`/databases/${RESP}/query`)) return json({ results: dups });
    if (url.endsWith('/pages') && o.method === 'POST') return json({ id: 'new' });
    throw new Error('unexpected ' + url);
  };
  return { calls, service: createService({ token: 'tok', cardsDb: CARDS, responsesDb: RESP, fetchImpl }) };
}
const ok = () => ({ code: ' s07 ', cardId: CARD_ID, seconds: 42, answers: ['حل', 'أ', ['س'], 4] });

test('parses question syntax and decision-flow defaults', () => {
  const qs = buildQuestions({ phase: 'before', decisionFlow: false, questionsText: 'سؤال\nاختار؟ | أ | ب\n+ متعدد | س | ص\n# ثقة' });
  assert.deepEqual(qs.map(q => q.type), ['text', 'single', 'multi', 'scale']);
  assert.deepEqual(qs[1].choices, ['أ', 'ب']);
  assert.ok(buildQuestions({ phase: 'after', decisionFlow: true, questionsText: '' }).length >= 4);
});
test('returns the open card, or null when none', async () => {
  assert.equal((await mock().service.getOpenCard()).questions.length, 4);
  assert.equal(await mock({ card: null }).service.getOpenCard(), null);
});
test('submit writes one row with answers and uppercased code', async () => {
  const m = mock(); await m.service.submit(ok());
  const w = m.calls.at(-1); assert.equal(w.url, 'https://api.notion.com/v1/pages'); assert.equal(w.auth, 'Bearer tok');
  assert.equal(w.body.properties.Code.rich_text[0].text.content, 'S07');
  assert.equal(w.body.properties.Seconds.number, 42);
  assert.equal(w.body.properties.A1.rich_text[0].text.content, 'حل');
  assert.equal(w.body.properties.A3.rich_text[0].text.content, 'س');
  assert.equal(w.body.properties.A4.rich_text[0].text.content, '4/5');
  assert.ok(!('A5' in w.body.properties) && !('Answers' in w.body.properties));
});
test('line breaks in text answers are accepted (become spaces)', async () => {
  const m = mock(); await m.service.submit({ ...ok(), answers: ['سطر 1\nسطر 2', 'أ', ['س'], 4] });
  assert.equal(m.calls.at(-1).body.properties.A1.rich_text[0].text.content, 'سطر 1 سطر 2');
});
test('closed card, duplicate, foreign page and bad answers are rejected without writing', async () => {
  const closed = mock({ card: page({ Status: { select: { name: 'مقفول' } } }) });
  await assert.rejects(closed.service.submit(ok()), { status: 409, code: 'closed' });
  await assert.rejects(mock({ dups: [{}] }).service.submit(ok()), { code: 'duplicate' });
  const foreign = mock({ card: { ...page(), parent: { database_id: 'zzzz' } } });
  await assert.rejects(foreign.service.submit(ok()), { status: 404 });
  const m = mock();
  for (const bad of [{ ...ok(), answers: ['حل'] }, { ...ok(), answers: ['حل', 'غلط', ['س'], 4] }, { ...ok(), answers: ['<b>', 'أ', ['س'], 4] }, { ...ok(), answers: ['حل', 'أ', ['س'], 9] }, { ...ok(), code: '!!' }, { ...ok(), cardId: 'x' }])
    await assert.rejects(m.service.submit(bad));
  assert.ok(!m.calls.some(c => c.url.endsWith('/pages') && c.method === 'POST'));
});
test('handlers: card endpoint, method/type/origin checks, no token leak', async () => {
  const res = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } });
  const h = createHandlers(mock().service);
  const r1 = res(); await h.card({ method: 'GET', headers: {}, socket: {} }, r1);
  assert.equal(r1.statusCode, 200); assert.equal(r1.body.card.questions.length, 4); assert.ok(!JSON.stringify(r1.body).includes('tok'));
  const r2 = res(); await h.submit({ method: 'GET', headers: {}, socket: {} }, r2); assert.equal(r2.statusCode, 405);
  const base = { method: 'POST', body: ok(), socket: {}, headers: { 'content-type': 'application/json', host: 'z.test', origin: 'https://z.test' } };
  const r3 = res(); await h.submit(base, r3); assert.equal(r3.statusCode, 201);
  const r4 = res(); await h.submit({ ...base, headers: { ...base.headers, origin: 'https://evil.test' } }, r4); assert.equal(r4.statusCode, 403);
  const r5 = res(); await h.submit({ ...base, headers: { ...base.headers, 'content-type': 'text/plain' } }, r5); assert.equal(r5.statusCode, 415);
});
test('missing config returns a safe 503', async () => {
  const s = createService({ token: '', cardsDb: '', responsesDb: '' });
  await assert.rejects(s.getOpenCard(), { status: 503 });
});
