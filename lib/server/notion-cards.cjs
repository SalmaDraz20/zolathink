'use strict';
// Notion-backed "before / after" cards.
// Cards live in a Notion database (one row = one card, Status = مفتوح/مقفول).
// Answers are written to a second Notion database, one row per student per card.
const NOTION_VERSION = '2022-06-28';
const OPEN = 'مفتوح';
const MAX_BODY = 16384;
const MAX_QUESTIONS = 6; // matches the A1..A6 columns in the responses database
const MAX_ANSWER = 300;
class CardError extends Error { constructor(status, code) { super(code || 'error'); this.status = status; this.code = code || 'error'; } }

// ---- text helpers ---------------------------------------------------------
function cleanText(value, max, min = 1) {
  if (typeof value !== 'string' || value.length > max * 2) throw new CardError(400, 'bad_text');
  value = value.replace(/[\t\r\n]+/g, ' '); // Enter / paste line breaks are fine, they become spaces
  if (/[\u0000-\u001f\u007f<>]/u.test(value)) throw new CardError(400, 'bad_text');
  const out = value.normalize('NFC').replace(/[​-‏‪-‮⁦-⁩﻿]/gu, '').trim().replace(/\s+/gu, ' ');
  if (out.length < min || out.length > max) throw new CardError(400, 'bad_text');
  return out;
}
function cleanCode(value) {
  const code = cleanText(typeof value === 'string' ? value : '', 20).toUpperCase();
  if (!/^[A-Z0-9٠-٩-]{1,20}$/u.test(code)) throw new CardError(400, 'bad_code');
  return code.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

// ---- question syntax ------------------------------------------------------
// One line = one question.
//   سؤال عادي                       -> free text
//   سؤال | خيار 1 | خيار 2           -> pick one
//   + سؤال | خيار 1 | خيار 2         -> pick several
//   # سؤال                           -> 1..5 confidence scale
const DEFAULTS = {
  before: [
    'أول حل هتختاره؟ (في سطر واحد)',
    'ليه اخترته؟',
    '+ إيه القيود اللي واخد بالك منها؟ | فلوس | وقت | مكان | ناس | أدوات | قواعد وشروط',
    '+ هتعرف إنه نجح إزاي؟ | قياس رقم | تجربة صغيرة | رأي الناس | مقارنة قبل وبعد | مش عارف',
    '# واثق قد إيه من حلك؟',
  ],
  after: [
    'حلك النهائي إيه؟ (في سطر واحد)',
    'ليه اخترته؟',
    'غيّرت حلك عن أول حل؟ لو آه، غيّرته ليه؟',
    'استخدمت إيه من اللي اتعلمته؟',
    '# واثق قد إيه من حلك؟',
  ],
};
function parseQuestionLine(line, i) {
  let raw = line.trim(), type = 'text';
  if (raw.startsWith('+')) { type = 'multi'; raw = raw.slice(1).trim(); }
  else if (raw.startsWith('#')) { type = 'scale'; raw = raw.slice(1).trim(); }
  const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
  const text = parts.shift();
  if (!text) return null;
  const q = { id: 'q' + (i + 1), text: text.slice(0, 200), type };
  if (type === 'multi' || (type === 'text' && parts.length)) { q.type = type === 'multi' ? 'multi' : 'single'; q.choices = parts.slice(0, 12).map(s => s.slice(0, 60)); }
  if ((q.type === 'multi' || q.type === 'single') && !q.choices.length) { q.type = 'text'; delete q.choices; }
  return q;
}
function buildQuestions(props) {
  const lines = [];
  if (props.decisionFlow) lines.push(...DEFAULTS[props.phase === 'after' ? 'after' : 'before']);
  lines.push(...String(props.questionsText || '').split(/\r?\n/));
  return lines.map(l => l.trim()).filter(Boolean).slice(0, MAX_QUESTIONS).map(parseQuestionLine).filter(Boolean).map((q, i) => ({ ...q, id: 'q' + (i + 1) }));
}

// ---- Notion property readers ---------------------------------------------
const plain = arr => (Array.isArray(arr) ? arr.map(x => x.plain_text || '').join('') : '');
function readCard(page) {
  const p = page.properties || {};
  const props = {
    id: page.id,
    title: plain(p.Name && p.Name.title),
    mission: p.Mission && typeof p.Mission.number === 'number' ? p.Mission.number : null,
    phase: (p.Phase && p.Phase.select && p.Phase.select.name === 'بعد') ? 'after' : 'before',
    status: p.Status && p.Status.select ? p.Status.select.name : '',
    intro: plain(p.Intro && p.Intro.rich_text),
    questionsText: plain(p.Questions && p.Questions.rich_text),
    decisionFlow: !!(p['Decision flow'] && p['Decision flow'].checkbox),
  };
  return { ...props, questions: buildQuestions(props) };
}
const publicCard = c => ({ id: c.id, title: c.title, mission: c.mission, phase: c.phase, intro: c.intro.slice(0, 300), questions: c.questions });

// ---- service --------------------------------------------------------------
function createService({ token, cardsDb, responsesDb, fetchImpl = globalThis.fetch, now = Date.now }) {
  const notion = async (path, method, body) => {
    if (!token || !cardsDb || !responsesDb) throw new CardError(503, 'not_configured');
    const r = await fetchImpl('https://api.notion.com/v1' + path, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new CardError(r.status === 404 ? 404 : 502, 'notion_' + r.status);
    return r.json();
  };

  async function getOpenCard() {
    const res = await notion(`/databases/${cardsDb}/query`, 'POST', {
      filter: { property: 'Status', select: { equals: OPEN } },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: 5,
    });
    for (const page of res.results || []) {
      const card = readCard(page);
      if (card.questions.length) return card;
    }
    return null;
  }
  async function getCard(id) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{32,36}$/i.test(id)) throw new CardError(400, 'bad_card');
    const page = await notion(`/pages/${id}`, 'GET');
    // The page must belong to the cards database (never trust a client-sent id blindly).
    const parent = page.parent && (page.parent.database_id || '').replace(/-/g, '');
    if (parent !== String(cardsDb).replace(/-/g, '') || page.archived) throw new CardError(404, 'bad_card');
    return readCard(page);
  }

  function validateAnswers(card, answers) {
    if (!Array.isArray(answers) || answers.length !== card.questions.length) throw new CardError(400, 'bad_answers');
    return card.questions.map((q, i) => {
      const a = answers[i];
      if (q.type === 'text') return cleanText(a, MAX_ANSWER);
      if (q.type === 'single') { if (typeof a !== 'string' || !q.choices.includes(a)) throw new CardError(400, 'bad_answers'); return a; }
      if (q.type === 'multi') {
        if (!Array.isArray(a) || !a.length || a.length > q.choices.length || a.some(x => typeof x !== 'string' || !q.choices.includes(x))) throw new CardError(400, 'bad_answers');
        return [...new Set(a)].join('، ');
      }
      const n = Number(a); if (!Number.isInteger(n) || n < 1 || n > 5) throw new CardError(400, 'bad_answers');
      return n + '/5';
    });
  }

  async function submit(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new CardError(400, 'bad_request');
    const code = cleanCode(payload.code);
    const card = await getCard(payload.cardId);          // live check, never cached
    if (card.status !== OPEN) throw new CardError(409, 'closed');
    const answers = validateAnswers(card, payload.answers);
    const dup = await notion(`/databases/${responsesDb}/query`, 'POST', {
      filter: { and: [
        { property: 'Code', rich_text: { equals: code } },
        { property: 'Card ID', rich_text: { equals: card.id } },
      ] },
      page_size: 1,
    });
    if ((dup.results || []).length) throw new CardError(409, 'duplicate');
    let seconds = Number(payload.seconds);
    seconds = Number.isFinite(seconds) ? Math.max(0, Math.min(7200, Math.round(seconds))) : null;
    const rt = text => [{ type: 'text', text: { content: text.slice(0, 1900) } }];
    const properties = {
      Name: { title: rt(`${code} · ${card.phase === 'after' ? 'بعد' : 'قبل'}${card.mission != null ? ' · M' + card.mission : ''}`) },
      Code: { rich_text: rt(code) },
      Phase: { select: { name: card.phase === 'after' ? 'بعد' : 'قبل' } },
      'Card ID': { rich_text: rt(card.id) },
    };
    answers.forEach((a, i) => { properties['A' + (i + 1)] = { rich_text: rt(a) }; });
    if (card.mission != null) properties.Mission = { number: card.mission };
    if (seconds != null) properties.Seconds = { number: seconds };
    const children = card.questions.map((q, i) => ({
      object: 'block', type: 'paragraph',
      paragraph: { rich_text: [
        { type: 'text', text: { content: q.text + '\n' }, annotations: { bold: true } },
        { type: 'text', text: { content: answers[i] } },
      ] },
    }));
    await notion('/pages', 'POST', { parent: { database_id: responsesDb }, properties, children });
    return { ok: true };
  }
  return { getOpenCard, submit, getCard };
}

// ---- HTTP handlers --------------------------------------------------------
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  const length = req.headers['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > MAX_BODY)) throw new CardError(413, 'too_large');
  if (req.body !== undefined) {
    const b = req.body;
    const raw = Buffer.isBuffer(b) ? b.toString('utf8') : typeof b === 'string' ? b : JSON.stringify(b);
    if (Buffer.byteLength(raw) > MAX_BODY) throw new CardError(413, 'too_large');
    try { return typeof b === 'object' && !Buffer.isBuffer(b) ? b : JSON.parse(raw); } catch { throw new CardError(400, 'bad_json'); }
  }
  const chunks = []; let size = 0;
  for await (const c of req) { size += Buffer.byteLength(c); if (size > MAX_BODY) throw new CardError(413, 'too_large'); chunks.push(Buffer.from(c)); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new CardError(400, 'bad_json'); }
}
const MESSAGES = {
  closed: 'الكارت اتقفل. كلّم المدرّبة.',
  duplicate: 'إجابتك اتسجّلت قبل كده. شكرًا!',
  bad_code: 'الكود مش مظبوط. اكتب الكود اللي المدرّبة إدّتهولك (أرقام وحروف بس).',
  bad_text: 'في إجابة فاضية، أو أطول من 300 حرف، أو فيها علامتي < أو >. عدّلها وجرّب تاني.',
  bad_answers: 'راجع إجاباتك وجرّب تاني.',
  not_configured: 'الكارت لسه مش متوصّل. كلّم المدرّبة.',
};
function createHandlers(service, { now = Date.now, ratePerMinute = 90 } = {}) {
  const rates = new Map(); let cache = null;
  const limit = (req, res) => {
    const t = now();
    for (const [k, v] of rates) if (v.expires <= t) rates.delete(k);
    const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
    const r = rates.get(ip) || { count: 0, expires: t + 60000 };
    if (++r.count > ratePerMinute || (rates.size >= 2000 && !rates.has(ip))) { res.setHeader('Retry-After', '60'); throw new CardError(429, 'rate'); }
    rates.set(ip, r);
  };
  const fail = (res, e) => {
    const status = e instanceof CardError ? e.status : 503;
    const code = e instanceof CardError ? e.code : 'error';
    send(res, status === 502 ? 503 : status, { ok: false, code, message: MESSAGES[code] || 'حصلت مشكلة. جرّب تاني بعد لحظة.' });
  };
  return {
    card: async (req, res) => {
      if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { ok: false }); }
      try {
        limit(req, res);
        const t = now();
        if (!cache || cache.expires <= t) cache = { expires: t + 4000, value: await service.getOpenCard() };
        send(res, 200, { ok: true, card: cache.value ? publicCard(cache.value) : null });
      } catch (e) { fail(res, e); }
    },
    submit: async (req, res) => {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false }); }
      try {
        if (String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw new CardError(415);
        if (req.headers['sec-fetch-site'] === 'cross-site') throw new CardError(403);
        if (req.headers.origin) {
          let o; try { o = new URL(req.headers.origin); } catch { throw new CardError(403); }
          if (!['https:', 'http:'].includes(o.protocol) || o.host !== req.headers.host) throw new CardError(403);
        }
        limit(req, res);
        const out = await service.submit(await readJson(req));
        send(res, 201, out);
      } catch (e) { fail(res, e); }
    },
  };
}
function fromEnv(env = process.env) {
  return createService({ token: env.NOTION_TOKEN, cardsDb: env.NOTION_CARDS_DB, responsesDb: env.NOTION_RESPONSES_DB });
}
module.exports = { createService, createHandlers, fromEnv, buildQuestions, parseQuestionLine, readCard, CardError, DEFAULTS };
