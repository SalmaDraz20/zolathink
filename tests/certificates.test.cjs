'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { normalizeCode, readCertificate, createHandler } = require('../lib/server/certificates.cjs');
const rt = s => [{ plain_text: s }];
const page = { properties: {
  Name: { title: rt('أحمد محمد') }, 'Name EN': { rich_text: rt('Ahmed Mohamed') }, Code: { rich_text: rt('Z-1234') },
  Journey: { select: { name: 'Journey 01' } }, Title: { rich_text: rt('أفضل صاحب قرار') }, 'Title EN': { rich_text: rt('Best decision maker') },
  'Top skills': { rich_text: rt('اتخاذ القرار، التفكير النقدي، العرض بثقة، زيادة') }, Skills: { multi_select: [{ name: 'البحث' }] },
  Issued: { date: { start: '2026-12-05' } }, PDF: { url: 'javascript:alert(1)' }, Image: { url: 'https://x.test/c.png' },
  Projects: { rich_text: rt('لعبة السباق | مطوّر ألعاب | https://x.test/p.png\nتقرير الزلزال | مهندس') },
} };
const run = async (handler, url, method = 'GET') => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } }; await handler({ method, url }, res); return res; };
test('normalizes student codes', () => {
  assert.equal(normalizeCode(' z-١٢٣٤ '), 'Z-1234');
  for (const bad of ['1234', 'Z-', 'Z-1', 'Z-12345678901234', 'Z-12<3', null]) assert.equal(normalizeCode(bad), null);
});
test('reads only public fields and rejects unsafe urls', () => {
  const c = readCertificate(page);
  assert.equal(c.name, 'أحمد محمد'); assert.equal(c.titleEn, 'BEST DECISION MAKER');
  assert.deepEqual(c.topSkills, ['اتخاذ القرار', 'التفكير النقدي', 'العرض بثقة']);
  assert.equal(c.issuedLabel, 'ديسمبر 2026'); assert.equal(c.issuedEn, 'Dec 2026');
  assert.equal(c.pdf, null); assert.equal(c.image, 'https://x.test/c.png');
  assert.equal(c.projects.length, 2); assert.equal(c.projects[1].image, null);
});
test('handler: bad code, not configured, not found, found', async () => {
  assert.equal((await run(createHandler({ token: 't', database: 'd' }), '/api/certificate?code=abc')).statusCode, 400);
  assert.equal((await run(createHandler({}), '/api/certificate?code=Z-1234')).statusCode, 503);
  assert.equal((await run(createHandler({ token: 't', database: 'd' }), '/api/certificate', 'POST')).statusCode, 405);
  let sent;
  const fetchImpl = async (u, o) => { sent = JSON.parse(o.body); return { ok: true, json: async () => ({ results: sent.filter.and[0].rich_text.equals === 'Z-1234' ? [page] : [] }) }; };
  const h = createHandler({ token: 't', database: 'd', fetchImpl });
  const ok = await run(h, '/api/certificate?code=z-1234');
  assert.equal(ok.statusCode, 200); assert.equal(ok.body.certificate.code, 'Z-1234');
  assert.equal(sent.filter.and[1].checkbox.equals, true);
  assert.equal((await run(h, '/api/certificate?code=Z-9999')).statusCode, 404);
});
