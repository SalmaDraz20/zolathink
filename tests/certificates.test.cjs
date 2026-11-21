'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { normalizeCode, readCertificate, createHandler } = require('../lib/server/certificates.cjs');
const rt = s => [{ plain_text: s }];
const page = { properties: {
  Name: { title: rt('Youssef Mohamed Draz') }, Code: { rich_text: rt('483') }, 'Certificate ID': { rich_text: rt('ZT-26-328367') },
  'Title (لقب)': { rich_text: rt('أفضل صاحب قرار') },
  'Skills acquired': { rich_text: rt('اتخاذ القرار، التفكير النقدي، العرض بثقة، البحث\nالعمل الجماعي') },
  'Certificate PDF': { files: [{ file: { url: 'https://files.notion.test/c.pdf' } }] },
  'M0 project': { rich_text: rt('خطة الرحلة | مخطّط رحلات') }, 'M1 project': { rich_text: rt('') },
  'M3 project': { rich_text: rt('لعبة السباق | مطوّر ألعاب | https://x.test/p.png') },
} };
const run = async (handler, url, method = 'GET') => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } }; await handler({ method, url }, res); return res; };
test('normalizes student codes', () => {
  assert.equal(normalizeCode(' z-٤٨٣ '), 'Z-483');
  for (const bad of ['483', 'Z-', 'Z-1', 'Z-12345678901234', 'Z-12<3', null]) assert.equal(normalizeCode(bad), null);
});
test('reads the Student Profiles table', () => {
  const c = readCertificate(page);
  assert.equal(c.code, 'Z-483'); assert.equal(c.certificateId, 'ZT-26-328367'); assert.equal(c.title, 'أفضل صاحب قرار');
  assert.deepEqual(c.topSkills, ['اتخاذ القرار', 'التفكير النقدي', 'العرض بثقة']);
  assert.deepEqual(c.skills, ['البحث', 'العمل الجماعي']);
  assert.equal(c.pdf, 'https://files.notion.test/c.pdf');
  assert.deepEqual(c.projects.map(p => p.mission), [0, 3]);
  assert.equal(c.projects[0].role, 'مخطّط رحلات'); assert.equal(c.projects[1].image, 'https://x.test/p.png');
});
test('rejects unsafe file urls', () => {
  const c = readCertificate({ properties: { Name: { title: rt('x') }, 'Certificate PDF': { files: [{ external: { url: 'javascript:alert(1)' } }] } } });
  assert.equal(c.pdf, null);
});
test('handler: bad code, not configured, not found, found', async () => {
  assert.equal((await run(createHandler({ token: 't', database: 'd' }), '/api/certificate?code=abc')).statusCode, 400);
  assert.equal((await run(createHandler({}), '/api/certificate?code=Z-483')).statusCode, 503);
  assert.equal((await run(createHandler({ token: 't', database: 'd' }), '/api/certificate', 'POST')).statusCode, 405);
  let sent;
  const fetchImpl = async (u, o) => { sent = JSON.parse(o.body); return { ok: true, json: async () => ({ results: sent.filter.or[0].rich_text.equals === '483' ? [page] : [] }) }; };
  const h = createHandler({ token: 't', database: 'd', fetchImpl });
  const ok = await run(h, '/api/certificate?code=z-483');
  assert.equal(ok.statusCode, 200); assert.equal(ok.body.certificate.name, 'Youssef Mohamed Draz');
  assert.equal(sent.filter.or[1].rich_text.equals, 'Z-483');
  assert.equal((await run(h, '/api/certificate?code=Z-999')).statusCode, 404);
});

test('certificate PDF is served through the site with a stable link', async () => {
  const { createHandler } = require('../lib/server/certificates.cjs');
  const row = { properties: { Name: { title: [{ plain_text: 'سارة' }] }, Code: { rich_text: [{ plain_text: '294' }] },
    'Certificate PDF': { files: [{ file: { url: 'https://files.notion.so/c.pdf' } }] } } };
  const pdfBytes = Buffer.from('%PDF-1.7 test');
  const fetchImpl = async url => url.includes('api.notion.com')
    ? { ok: true, json: async () => ({ results: [row] }) }
    : { ok: true, headers: new Map([['content-length', String(pdfBytes.length)]]), arrayBuffer: async () => pdfBytes };
  const h = createHandler({ token: 't', database: 'db', fetchImpl });
  const mk = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
  const res = mk();
  await h({ method: 'GET', url: '/api/certificate?code=Z-294' }, res);
  assert.strictEqual(JSON.parse(res.body).certificate.pdf, '/api/certificate?code=Z-294&file=pdf');
  const pdf = mk();
  await h({ method: 'GET', url: '/api/certificate?code=Z-294&file=pdf&download=1' }, pdf);
  assert.strictEqual(pdf.headers['Content-Type'], 'application/pdf');
  assert.match(pdf.headers['Content-Disposition'], /^attachment; filename="Zola-Certificate-Z-294.pdf"/);
  assert.ok(pdf.body.equals(pdfBytes));
});
