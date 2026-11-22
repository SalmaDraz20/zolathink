'use strict';
// /admin backend: one serverless function, routed by ?action=.
// Everything is stored in Notion; this only reads and edits the same tables the site uses.
if (typeof window !== 'undefined') throw new Error('Server-only module');
const { createHmac, createHash, timingSafeEqual } = require('node:crypto');
const { createSlots, makeKey, isKey, slotName, slotShort, DAYS } = require('./slots.cjs');
const { readCard, readQuestionPage, createService } = require('./notion-cards.cjs');
const { toXlsx } = require('./xlsx.cjs');

const NOTION_VERSION = '2022-06-28';
const COOKIE = 'zt_admin';
const SESSION_DAYS = 7;
const MAX_BODY = 32768;
const OPEN = 'مفتوح', CLOSED = 'مقفول';
const TYPE_NAMES = { text: '✍️ كتابة', number: '🔢 رقم', single: '☝️ اختيار واحد', multi: '✅ أكتر من اختيار', yesno: '👍 آه ولا لأ', scale: '😀 مقياس ثقة' };
const BOOKING_STATUSES = ['جديد', 'اتواصلنا', 'حجز مؤكد', 'دفع عربون', 'حضر', 'مش مهتم'];
const MAX_QUESTIONS = 10;

class AdminError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
const plain = arr => (Array.isArray(arr) ? arr.map(x => x.plain_text || '').join('') : '');
const rt = s => [{ type: 'text', text: { content: String(s).slice(0, 1900) } }];
const sameId = (a, b) => String(a || '').replace(/-/g, '') === String(b || '').replace(/-/g, '');
const isId = id => typeof id === 'string' && /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(id);

function cleanText(v, max, { min = 1, multiline = false } = {}) {
  if (typeof v !== 'string') throw new AdminError(400, 'bad_text');
  let s = v.normalize('NFC').replace(/[​-‏‪-‮⁦-⁩﻿]/g, '');
  s = multiline ? s.replace(/\r/g, '') : s.replace(/\s+/g, ' ');
  s = s.trim();
  if (/[\u0000-\u0008\u000b-\u001f\u007f<>]/.test(s) || s.length < min || s.length > max) throw new AdminError(400, 'bad_text');
  return s;
}

// ---- session cookie ---------------------------------------------------------
function sessionKey(env) {
  return createHash('sha256').update(`zola-admin|${env.ADMIN_PASSWORD}|${env.ADMIN_SECRET || env.NOTION_TOKEN || ''}`).digest();
}
function makeToken(env, now) {
  const exp = String(Math.floor(now / 1000) + SESSION_DAYS * 86400);
  return exp + '.' + createHmac('sha256', sessionKey(env)).update(exp).digest('base64url');
}
function checkToken(env, token, now) {
  if (!env.ADMIN_PASSWORD || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!/^\d{9,11}$/.test(exp || '') || !sig || Number(exp) * 1000 < now) return false;
  const want = Buffer.from(createHmac('sha256', sessionKey(env)).update(exp).digest('base64url'));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
function passwordMatches(env, given) {
  if (!env.ADMIN_PASSWORD || typeof given !== 'string' || given.length > 200) return false;
  const a = createHash('sha256').update(given).digest(), b = createHash('sha256').update(String(env.ADMIN_PASSWORD)).digest();
  return timingSafeEqual(a, b);
}
const readCookie = (req, name) => {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
};
const cookieHeader = (value, maxAge) => `${COOKIE}=${value}; Path=/api/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

// ---- Notion ---------------------------------------------------------------
function createNotion(token, fetchImpl) {
  const notion = async (path, method, body) => {
    if (!token) throw new AdminError(503, 'not_configured');
    const r = await fetchImpl('https://api.notion.com/v1' + path, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new AdminError(r.status === 404 ? 404 : 502, 'notion_' + r.status);
    return r.json();
  };
  const queryAll = async (db, body = {}) => {
    const out = []; let cursor;
    for (let i = 0; i < 30; i++) {
      const res = await notion(`/databases/${db}/query`, 'POST', { ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
      out.push(...(res.results || []));
      if (!res.has_more) break;
      cursor = res.next_cursor;
    }
    return out.filter(p => !p.archived);
  };
  // Never edit a page just because the browser sent its id: it must belong to the expected table.
  const pageIn = async (id, db) => {
    if (!isId(id)) throw new AdminError(400, 'bad_id');
    const page = await notion(`/pages/${id}`, 'GET');
    if (!sameId(page.parent && page.parent.database_id, db) || page.archived) throw new AdminError(404, 'not_found');
    return page;
  };
  return { notion, queryAll, pageIn };
}

// ---- readers --------------------------------------------------------------
function readAdminQuestion(page) {
  const p = page.properties || {};
  const r = readQuestionPage(page);
  if (!r) return null;
  return {
    id: page.id,
    text: r.q.text,
    type: r.q.type,
    choices: (r.q.type === 'single' || r.q.type === 'multi') ? r.q.choices : String(plain(p['الاختيارات'] && p['الاختيارات'].rich_text)).split(/\r?\n|[،,|]/).map(s => s.trim()).filter(Boolean),
    hint: plain(p['توضيح'] && p['توضيح'].rich_text),
    optional: !!(p['اختياري'] && p['اختياري'].checkbox),
    followUp: plain(p['لو آه اسأل'] && p['لو آه اسأل'].rich_text),
    order: r.order === 1e9 ? null : r.order,
  };
}
function readBooking(page) {
  const p = page.properties || {};
  const sel = k => (p[k] && p[k].select && p[k].select.name) || '';
  return {
    id: page.id,
    student: plain(p.Student && p.Student.title),
    parent: plain(p.Parent && p.Parent.rich_text),
    parentPhone: (p['Parent WhatsApp'] && p['Parent WhatsApp'].phone_number) || '',
    studentPhone: (p['Student WhatsApp'] && p['Student WhatsApp'].phone_number) || '',
    grade: sel('Grade'),
    slot: sel('Preferred slot'),
    status: sel('Status') || 'جديد',
    interests: ((p.Interests && p.Interests.multi_select) || []).map(x => x.name),
    dream: plain(p['Dream career'] && p['Dream career'].rich_text),
    source: plain(p.Source && p.Source.rich_text),
    created: page.created_time,
  };
}
const cardOrder = c => (c.mission == null ? 999 : c.mission) * 10 + (c.phase === 'after' ? 1 : 0);

// ---- service --------------------------------------------------------------
function createAdmin(env = process.env, { fetchImpl = globalThis.fetch } = {}) {
  const { notion, queryAll, pageIn } = createNotion(env.NOTION_TOKEN, fetchImpl);
  const cardsDb = env.NOTION_CARDS_DB, questionsDb = env.NOTION_QUESTIONS_DB, slotsDb = env.NOTION_SLOTS_DB, bookingsDb = env.NOTION_MISSION0_DB;
  const need = (...names) => {
    const missing = ['NOTION_TOKEN', ...names].filter(n => !env[n]);
    if (missing.length) { const e = new AdminError(503, 'not_configured'); e.detail = missing.join('، '); throw e; }
  };

  const slots = createSlots({ token: env.NOTION_TOKEN, slotsDb, bookingsDb, fetchImpl });
  const cards = createService({ token: env.NOTION_TOKEN, cardsDb, responsesDb: env.NOTION_RESPONSES_DB || 'x', questionsDb, fetchImpl });

  async function listCards() {
    need('NOTION_CARDS_DB');
    return (await queryAll(cardsDb)).map(readCard)
      .map(c => ({ id: c.id, title: c.title, mission: c.mission, phase: c.phase, open: c.status === OPEN, questionCount: c.questionIds.length || c.questions.length }))
      .sort((a, b) => cardOrder(a) - cardOrder(b));
  }
  async function setCardOpen({ id, open }) {
    need('NOTION_CARDS_DB');
    await pageIn(id, cardsDb);
    if (open) {
      // Only one card is open at a time: close the others first.
      const others = await queryAll(cardsDb, { filter: { property: 'Status', select: { equals: OPEN } } });
      for (const p of others) if (!sameId(p.id, id)) await notion(`/pages/${p.id}`, 'PATCH', { properties: { Status: { select: { name: CLOSED } } } });
    }
    await notion(`/pages/${id}`, 'PATCH', { properties: { Status: { select: { name: open ? OPEN : CLOSED } } } });
    return listCards();
  }
  async function listQuestions(cardId) {
    need('NOTION_CARDS_DB', 'NOTION_QUESTIONS_DB');
    const card = readCard(await pageIn(cardId, cardsDb));
    const rows = (await queryAll(questionsDb, { filter: { property: 'الكارت', relation: { contains: card.id } } }))
      .map(readAdminQuestion).filter(Boolean)
      .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
    return { card: { id: card.id, title: card.title, mission: card.mission, phase: card.phase, open: card.status === OPEN }, questions: rows, max: MAX_QUESTIONS };
  }
  function questionProps(input) {
    const type = Object.prototype.hasOwnProperty.call(TYPE_NAMES, input.type) ? input.type : null;
    if (!type) throw new AdminError(400, 'bad_type');
    const props = {
      'السؤال': { title: rt(cleanText(input.text, 400)) },
      'النوع': { select: { name: TYPE_NAMES[type] } },
      'توضيح': { rich_text: input.hint ? rt(cleanText(input.hint, 300)) : [] },
      'اختياري': { checkbox: !!input.optional },
      'لو آه اسأل': { rich_text: type === 'yesno' && input.followUp ? rt(cleanText(input.followUp, 200)) : [] },
      'الاختيارات': { rich_text: [] },
    };
    if (type === 'single' || type === 'multi') {
      if (!Array.isArray(input.choices)) throw new AdminError(400, 'bad_choices');
      const choices = [...new Set(input.choices.map(c => cleanText(c, 60)).filter(Boolean))];
      if (choices.length < 2 || choices.length > 12) throw new AdminError(400, 'bad_choices');
      props['الاختيارات'] = { rich_text: rt(choices.join('\n')) };
    }
    return props;
  }
  async function saveQuestion(input) {
    need('NOTION_CARDS_DB', 'NOTION_QUESTIONS_DB');
    if (!input || typeof input !== 'object') throw new AdminError(400, 'bad_request');
    const props = questionProps(input);
    if (input.id) {
      await pageIn(input.id, questionsDb);
      await notion(`/pages/${input.id}`, 'PATCH', { properties: props });
    } else {
      const { questions } = await listQuestions(input.cardId);
      if (questions.length >= MAX_QUESTIONS) throw new AdminError(409, 'too_many');
      const order = questions.reduce((m, q) => Math.max(m, q.order || 0), 0) + 1;
      await notion('/pages', 'POST', { parent: { database_id: questionsDb }, properties: { ...props, 'الكارت': { relation: [{ id: input.cardId }] }, 'الترتيب': { number: order } } });
    }
    return listQuestions(input.cardId);
  }
  async function deleteQuestion({ id, cardId }) {
    need('NOTION_QUESTIONS_DB');
    await pageIn(id, questionsDb);
    await notion(`/pages/${id}`, 'PATCH', { archived: true });
    return listQuestions(cardId);
  }
  async function orderQuestions({ cardId, ids }) {
    need('NOTION_QUESTIONS_DB');
    if (!Array.isArray(ids) || ids.length > MAX_QUESTIONS * 2) throw new AdminError(400, 'bad_request');
    const { questions } = await listQuestions(cardId);
    const known = new Set(questions.map(q => q.id.replace(/-/g, '')));
    if (ids.some(id => !isId(id) || !known.has(id.replace(/-/g, '')))) throw new AdminError(400, 'bad_request');
    for (let i = 0; i < ids.length; i++) await notion(`/pages/${ids[i]}`, 'PATCH', { properties: { 'الترتيب': { number: i + 1 } } });
    return listQuestions(cardId);
  }
  async function previewCard(id) {
    need('NOTION_CARDS_DB');
    const c = await cards.getCard(id);
    return { id: c.id, title: c.title, mission: c.mission, phase: c.phase, intro: (c.intro || '').slice(0, 300), questions: c.questions };
  }

  async function listSlots() {
    need('NOTION_SLOTS_DB');
    return slots.withCounts(await slots.list({ all: true }));
  }
  async function saveSlot({ day, hour, period, capacity }) {
    need('NOTION_SLOTS_DB');
    if (!Object.prototype.hasOwnProperty.call(DAYS, day) || !['am', 'pm'].includes(period)) throw new AdminError(400, 'bad_slot');
    let key; try { key = makeKey(day, hour, period); } catch { throw new AdminError(400, 'bad_slot'); }
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 200) throw new AdminError(400, 'bad_capacity');
    const existing = (await slots.list({ all: true })).find(s => s.key === key);
    if (existing) throw new AdminError(409, 'slot_exists');
    await notion('/pages', 'POST', { parent: { database_id: slotsDb }, properties: {
      'الميعاد': { title: rt(slotName(key)) }, Key: { rich_text: rt(key) }, 'الأماكن': { number: cap }, 'ظاهر': { checkbox: true },
    } });
    return listSlots();
  }
  async function updateSlot({ id, visible, capacity }) {
    need('NOTION_SLOTS_DB');
    await pageIn(id, slotsDb);
    const props = {};
    if (typeof visible === 'boolean') props['ظاهر'] = { checkbox: visible };
    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (!Number.isInteger(cap) || cap < 1 || cap > 200) throw new AdminError(400, 'bad_capacity');
      props['الأماكن'] = { number: cap };
    }
    if (!Object.keys(props).length) throw new AdminError(400, 'bad_request');
    await notion(`/pages/${id}`, 'PATCH', { properties: props });
    return listSlots();
  }
  async function deleteSlot({ id }) {
    need('NOTION_SLOTS_DB');
    await pageIn(id, slotsDb);
    await notion(`/pages/${id}`, 'PATCH', { archived: true });
    return listSlots();
  }

  async function listBookings() {
    need('NOTION_MISSION0_DB');
    const rows = (await queryAll(bookingsDb, { sorts: [{ timestamp: 'created_time', direction: 'descending' }] })).map(readBooking);
    return { bookings: rows, statuses: BOOKING_STATUSES };
  }
  async function setBookingStatus({ id, status }) {
    need('NOTION_MISSION0_DB');
    if (!BOOKING_STATUSES.includes(status)) throw new AdminError(400, 'bad_status');
    await pageIn(id, bookingsDb);
    await notion(`/pages/${id}`, 'PATCH', { properties: { Status: { select: { name: status } } } });
    return { ok: true };
  }
  async function exportBookings({ slot, q }) {
    let { bookings } = await listBookings();
    if (slot) bookings = bookings.filter(b => b.slot === slot);
    if (q) { const s = String(q).trim().toLowerCase(); bookings = bookings.filter(b => [b.student, b.parent, b.parentPhone, b.studentPhone].some(v => String(v).toLowerCase().includes(s))); }
    const date = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-GB', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); };
    const rows = [['الطالب', 'الصف', 'ولي الأمر', 'واتساب ولي الأمر', 'واتساب الطالب', 'الميعاد', 'الحالة', 'الاهتمامات', 'نفسه يبقى إيه', 'المصدر', 'اتحجز']];
    for (const b of bookings) rows.push([b.student, b.grade, b.parent, b.parentPhone, b.studentPhone, b.slot, b.status, b.interests.join('، '), b.dream, b.source, date(b.created)]);
    return toXlsx(rows, { sheet: 'حجوزات Mission 0', widths: [22, 20, 22, 18, 18, 18, 14, 34, 24, 16, 18] });
  }

  return { listCards, setCardOpen, listQuestions, saveQuestion, deleteQuestion, orderQuestions, previewCard, listSlots, saveSlot, updateSlot, deleteSlot, listBookings, setBookingStatus, exportBookings };
}

// ---- HTTP -----------------------------------------------------------------
function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  const length = req.headers['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > MAX_BODY)) throw new AdminError(413, 'too_large');
  if (req.body !== undefined) {
    const b = req.body;
    if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
    try { return JSON.parse(Buffer.isBuffer(b) ? b.toString('utf8') : String(b || '{}')); } catch { throw new AdminError(400, 'bad_json'); }
  }
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > MAX_BODY) throw new AdminError(413, 'too_large'); chunks.push(Buffer.from(c)); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new AdminError(400, 'bad_json'); }
}
const MESSAGES = {
  bad_password: 'الباسوورد مش صح، جربي تاني',
  rate: 'محاولات كتير.. استني دقيقة وجربي تاني',
  not_configured: 'في إعداد ناقص في Vercel للنسخة دي',
  no_password: 'لسه مفيش باسوورد للوحة. ضيفي ADMIN_PASSWORD في إعدادات Vercel',
  too_many: 'الكارت فيه 10 أسئلة، ده أقصى عدد',
  slot_exists: 'الميعاد ده موجود قبل كده',
  bad_choices: 'محتاجة اختيارين على الأقل (ومش أكتر من 12)',
  bad_text: 'في خانة فاضية أو طويلة أوي، أو فيها علامتي < >',
  bad_capacity: 'عدد الأماكن لازم يكون رقم من 1 لـ 200',
  unauthorized: 'لازم تدخلي الأول',
};

function createHandler({ env = process.env, admin = createAdmin(env), now = Date.now } = {}) {
  const attempts = new Map();
  const ipOf = req => String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
  const GET = {
    me: () => ({ ok: true }),
    cards: async () => ({ ok: true, cards: await admin.listCards() }),
    questions: async q => ({ ok: true, ...(await admin.listQuestions(q.card)) }),
    preview: async q => ({ ok: true, card: await admin.previewCard(q.card) }),
    slots: async () => ({ ok: true, slots: await admin.listSlots(), days: DAYS }),
    bookings: async () => ({ ok: true, ...(await admin.listBookings()) }),
  };
  const POST = {
    'card-status': async b => ({ ok: true, cards: await admin.setCardOpen({ id: b.id, open: !!b.open }) }),
    'question-save': async b => ({ ok: true, ...(await admin.saveQuestion(b)) }),
    'question-delete': async b => ({ ok: true, ...(await admin.deleteQuestion(b)) }),
    'question-order': async b => ({ ok: true, ...(await admin.orderQuestions(b)) }),
    'slot-save': async b => ({ ok: true, slots: await admin.saveSlot(b) }),
    'slot-update': async b => ({ ok: true, slots: await admin.updateSlot(b) }),
    'slot-delete': async b => ({ ok: true, slots: await admin.deleteSlot(b) }),
    'booking-status': async b => admin.setBookingStatus(b),
  };
  return async (req, res) => {
    let url; try { url = new URL(req.url, 'http://x'); } catch { return send(res, 400, { ok: false }); }
    const q = Object.fromEntries(url.searchParams);
    const action = q.action || '';
    try {
      if (req.method === 'POST') {
        if (String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw new AdminError(415, 'bad_request');
        if (req.headers['sec-fetch-site'] === 'cross-site') throw new AdminError(403, 'forbidden');
        if (req.headers.origin) {
          let o; try { o = new URL(req.headers.origin); } catch { throw new AdminError(403, 'forbidden'); }
          if (o.host !== req.headers.host) throw new AdminError(403, 'forbidden');
        }
      }
      if (action === 'login' && req.method === 'POST') {
        if (!env.ADMIN_PASSWORD) throw new AdminError(503, 'no_password');
        const t = now(), ip = ipOf(req);
        for (const [k, v] of attempts) if (v.until < t) attempts.delete(k);
        const a = attempts.get(ip) || { n: 0, until: t + 10 * 60000 };
        if (a.n >= 8) throw new AdminError(429, 'rate');
        const body = await readJson(req);
        if (!passwordMatches(env, body.password)) { a.n++; attempts.set(ip, a); throw new AdminError(401, 'bad_password'); }
        attempts.delete(ip);
        return send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader(makeToken(env, t), SESSION_DAYS * 86400) });
      }
      if (action === 'logout' && req.method === 'POST') return send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader('', 0) });
      if (!checkToken(env, readCookie(req, COOKIE), now())) throw new AdminError(401, 'unauthorized');
      if (req.method === 'GET' && action === 'export') {
        const buf = await admin.exportBookings({ slot: q.slot, q: q.q });
        const day = new Date(now()).toISOString().slice(0, 10);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="mission0-bookings-${day}.xlsx"`);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.end(buf);
      }
      const table = req.method === 'GET' ? GET : req.method === 'POST' ? POST : null;
      const fn = table && Object.prototype.hasOwnProperty.call(table, action) ? table[action] : null;
      if (!fn) throw new AdminError(404, 'not_found');
      const out = await fn(req.method === 'POST' ? await readJson(req) : q);
      return send(res, 200, out);
    } catch (e) {
      const status = e instanceof AdminError ? e.status : 503;
      const code = e instanceof AdminError ? e.code : 'error';
      if (!(e instanceof AdminError)) console.error('[admin]', e && e.message);
      const message = (MESSAGES[code] || 'حصلت مشكلة. جربي تاني بعد لحظة') + (e && e.detail ? ` — ناقص: ${e.detail}` : '');
      return send(res, status === 502 ? 503 : status, { ok: false, code, message });
    }
  };
}

module.exports = { createHandler, createAdmin, makeToken, checkToken, passwordMatches, readBooking, readAdminQuestion, TYPE_NAMES, BOOKING_STATUSES, AdminError, isKey, slotShort };
