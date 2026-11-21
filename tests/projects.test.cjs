'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { readProject, createHandler } = require('../lib/server/projects.cjs');

const rt = s => [{ plain_text: s }];
const row = {
  properties: {
    Project: { title: rt('خريطة المدرسة') },
    'Display name': { rich_text: rt('فريق النسور') },
    Student: { relation: [{ id: 'secret' }] },
    Mission: { select: { name: 'Mission 2' } },
    Description: { rich_text: rt('وصف') },
    'Math used': { rich_text: rt('مقياس الرسم') },
    Image: { files: [{ file: { url: 'https://files.notion.so/a.png' } }] },
    Link: { url: 'javascript:alert(1)' },
  },
};
function fakeRes() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } };
}

test('readProject returns only public fields', () => {
  const p = readProject(row);
  assert.deepStrictEqual(p, { title: 'خريطة المدرسة', by: 'فريق النسور', mission: 'Mission 2', description: 'وصف', math: 'مقياس الرسم', image: 'https://files.notion.so/a.png', link: null });
  assert.ok(!JSON.stringify(p).includes('secret'));
});

test('handler asks Notion only for rows marked Show on site, sorted by Order', async () => {
  let sent;
  const h = createHandler({ token: 't', database: 'db', fetchImpl: async (url, opts) => { sent = JSON.parse(opts.body); return { ok: true, json: async () => ({ results: [row] }) }; } });
  const res = fakeRes();
  await h({ method: 'GET', url: '/api/projects' }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.projects.length, 1);
  assert.deepStrictEqual(sent.filter, { property: 'Show on site', checkbox: { equals: true } });
  assert.strictEqual(sent.sorts[0].property, 'Order');
});

test('handler reports not_configured without env', async () => {
  const res = fakeRes();
  await createHandler({})({ method: 'GET', url: '/api/projects' }, res);
  assert.strictEqual(res.statusCode, 503);
});
