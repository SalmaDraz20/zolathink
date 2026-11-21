'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createService, readQuestionPage } = require('../lib/server/notion-cards.cjs');

const rt = s => [{ plain_text: s }];
const qPage = (title, type, extra = {}) => ({ properties: { 'السؤال': { title: rt(title) }, 'النوع': { select: { name: type } }, ...extra } });

test('question type comes from the النوع select', () => {
  assert.strictEqual(readQuestionPage(qPage('كام؟', '🔢 رقم')).q.type, 'number');
  const s = readQuestionPage(qPage('اختار', '☝️ اختيار واحد', { 'الاختيارات': { rich_text: rt('أ\nب\nمش عارف') } })).q;
  assert.deepStrictEqual([s.type, s.choices], ['single', ['أ', 'ب', 'مش عارف']]);
  const y = readQuestionPage(qPage('فكرت؟', '👍 آه ولا لأ', { 'لو آه اسأل': { rich_text: rt('إيه هو؟') } })).q;
  assert.deepStrictEqual([y.type, y.followUp], ['yesno', 'إيه هو؟']);
  // A choice question without choices falls back to free text
  assert.strictEqual(readQuestionPage(qPage('x', '✅ أكتر من اختيار')).q.type, 'text');
});

test('card loads typed questions and validates each type on submit', async () => {
  const cardPage = { id: 'aaaaaaaabbbbccccddddeeeeeeeeeeee', parent: { database_id: 'cards' }, properties: {
    Name: { title: rt('M3 قبل') }, Phase: { select: { name: 'قبل' } }, Status: { select: { name: 'مفتوح' } }, Mission: { number: 3 },
    'الأسئلة': { relation: [{ id: 'q1' }] } } };
  const questions = [
    qPage('كام؟', '🔢 رقم', { 'الترتيب': { number: 1 } }),
    qPage('فكرت؟', '👍 آه ولا لأ', { 'الترتيب': { number: 2 }, 'لو آه اسأل': { rich_text: rt('إيه هو؟') } }),
    qPage('ملاحظة', '✍️ كتابة', { 'الترتيب': { number: 3 }, 'اختياري': { checkbox: true } }),
  ];
  let saved;
  const fetchImpl = async (url, opts) => {
    const body = opts.body ? JSON.parse(opts.body) : null;
    const ok = j => ({ ok: true, json: async () => j });
    if (url.includes('/databases/cards/query')) return ok({ results: [cardPage] });
    if (url.includes('/databases/questions/query')) return ok({ results: questions });
    if (url.includes('/pages/')) return ok(cardPage);
    if (url.includes('/databases/resp/query')) return ok({ results: [] });
    if (url.endsWith('/pages')) { saved = body; return ok({}); }
    throw new Error(url);
  };
  const svc = createService({ token: 't', cardsDb: 'cards', responsesDb: 'resp', questionsDb: 'questions', fetchImpl });
  const card = await svc.getOpenCard();
  assert.deepStrictEqual(card.questions.map(q => q.type), ['number', 'yesno', 'text']);
  await svc.submit({ code: 'Z-123', cardId: cardPage.id, answers: ['٤٥', { value: 'yes', why: 'متوسط' }, ''] });
  assert.strictEqual(saved.properties.A1.rich_text[0].text.content, '45');
  assert.strictEqual(saved.properties.A2.rich_text[0].text.content, 'آه — متوسط');
  assert.strictEqual(saved.properties.A3.rich_text[0].text.content, '—');
  await assert.rejects(svc.submit({ code: 'Z-124', cardId: cardPage.id, answers: ['كتير', { value: 'no' }, ''] }), e => e.code === 'bad_number');
});
