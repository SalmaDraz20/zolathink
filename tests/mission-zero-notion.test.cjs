'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { validate } = require('../lib/server/mission-zero.cjs');
const { toNotionProperties, createNotionInsert, combineInserts } = require('../lib/server/mission-zero-notion.cjs');
const row = () => validate({ student_name: 'يوسف أحمد', parent_name: 'أحمد علي', grade: 'grade_2_prep', parent_whatsapp: '01012345678', student_whatsapp: '01123456789', preferred_slot: 'saturday_5pm', interests: [], dream_profession: '' });
test('maps a booking to the Notion Mission 0 columns', () => {
  const p = toNotionProperties(row());
  assert.equal(p.Student.title[0].text.content, 'يوسف أحمد');
  assert.equal(p.Parent.rich_text[0].text.content, 'أحمد علي');
  assert.equal(p['Parent WhatsApp'].phone_number, '+201012345678');
  assert.equal(p['Student WhatsApp'].phone_number, '+201123456789');
  assert.equal(p.Grade.select.name, 'الصف الثاني الإعدادي');
  assert.equal(p['Preferred slot'].select.name, 'السبت — 5 مساءً');
  assert.equal(p.Status.select.name, 'جديد');
  assert.deepEqual(p['Dream career'].rich_text, []);
  const { student_whatsapp, ...without } = row();
  assert.equal('Student WhatsApp' in toNotionProperties(without), false);
});
test('posts to the Notion pages API with the database as parent', async () => {
  let call; await createNotionInsert({ token: 'secret', database: 'db1', fetchImpl: async (u, o) => { call = { u, o }; return { ok: true }; } })(row());
  assert.equal(call.u, 'https://api.notion.com/v1/pages'); assert.equal(JSON.parse(call.o.body).parent.database_id, 'db1');
  await assert.rejects(createNotionInsert({ token: 't', database: 'd', fetchImpl: async () => ({ ok: false, status: 400 }) })(row()));
});
test('combined stores succeed if any store saves, fail if none', async () => {
  const errors = [];
  await combineInserts([async () => { throw Error('a'); }, async () => {}], e => errors.push(e))(row());
  assert.equal(errors.length, 1);
  await assert.rejects(combineInserts([async () => { throw Error('a'); }])(row()));
  await assert.rejects(combineInserts([])(row()));
});
