'use strict';
const { createHmac, randomBytes } = require('node:crypto');
const GRADES = new Set(['grade_5_primary', 'grade_6_primary', 'grade_1_prep', 'grade_2_prep', 'grade_3_prep']);
const SLOTS = new Set(['friday_7pm', 'saturday_7pm']);
const INTERESTS = new Set(['التحديات والألغاز', 'التكنولوجيا والبرمجة', 'التصميم والإبداع', 'العلوم والتجارب', 'الأرقام والرياضيات', 'البيزنس والتفاوض', 'صناعة المحتوى', 'القيادة والعمل مع فريق', 'لسه بيكتشف اهتماماته']);
const MAX_BODY = 8192;
class RequestError extends Error { constructor(status) { super('Invalid request'); this.status = status; } }
function clean(value, max, required = true) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f<>]/u.test(value)) throw new RequestError(400);
  const result = value.normalize('NFC').replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu, '').trim().replace(/\s+/gu, ' ');
  if ((required && result.length < 2) || result.length > max) throw new RequestError(400);
  return result;
}
function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new RequestError(400);
  const student_name = clean(data.student_name, 80);
  const parent_name = clean(data.parent_name, 80);
  if (!GRADES.has(data.grade) || !SLOTS.has(data.preferred_slot)) throw new RequestError(400);
  let parent_whatsapp = clean(data.parent_whatsapp, 24)
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[\s()-]/g, '');
  if (!/^(01[0125]\d{8}|(?:\+|00)[1-9]\d{7,14})$/.test(parent_whatsapp)) throw new RequestError(400);
  if (parent_whatsapp.startsWith('01')) parent_whatsapp = '+20' + parent_whatsapp.slice(1);
  else if (parent_whatsapp.startsWith('00')) parent_whatsapp = '+' + parent_whatsapp.slice(2);
  if (!Array.isArray(data.interests) || data.interests.length > 9 || data.interests.some(value => typeof value !== 'string' || !INTERESTS.has(value))) throw new RequestError(400);
  const dream_profession = clean(data.dream_profession, 160, false) || null;
  return { student_name, grade: data.grade, parent_name, parent_whatsapp, preferred_slot: data.preferred_slot, interests: [...new Set(data.interests)], dream_profession, status: 'new' };
}
async function readBody(req) {
  const length = req.headers['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > MAX_BODY)) throw new RequestError(413);
  if (req.body !== undefined) {
    const body = req.body;
    const raw = Buffer.isBuffer(body) ? body.toString('utf8') : typeof body === 'string' ? body : JSON.stringify(body);
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY) throw new RequestError(413);
    try { return typeof body === 'object' && !Buffer.isBuffer(body) ? body : JSON.parse(raw); } catch { throw new RequestError(400); }
  }
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BODY) throw new RequestError(413);
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new RequestError(400); }
}
function createHandler({ insert, now = Date.now }) {
  // Best-effort protection per warm function instance, bounded and short-lived.
  const secret = randomBytes(32), rates = new Map(), duplicates = new Map();
  const key = value => createHmac('sha256', secret).update(value).digest('hex');
  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(JSON.stringify(body));
  };
  return async (req, res) => {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false }); }
    try {
      if (String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw new RequestError(415);
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new RequestError(403);
      if (req.headers.origin) {
        let origin; try { origin = new URL(req.headers.origin); } catch { throw new RequestError(403); }
        if (!['https:', 'http:'].includes(origin.protocol) || origin.host !== req.headers.host) throw new RequestError(403);
      }
      const time = now();
      for (const [k, v] of rates) if (v.expires <= time) rates.delete(k);
      for (const [k, v] of duplicates) if (v.expires <= time && !v.pending) duplicates.delete(k);
      const ip = key(String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0]);
      const rate = rates.get(ip) || { count: 0, expires: time + 60000 };
      if (++rate.count > 8) { res.setHeader('Retry-After', '60'); throw new RequestError(429); }
      if (rates.size >= 2000 && !rates.has(ip)) throw new RequestError(429);
      rates.set(ip, rate);
      const row = validate(await readBody(req));
      const fingerprint = key(JSON.stringify({ ...row, interests: [...row.interests].sort() }));
      const existing = duplicates.get(fingerprint);
      if (existing) { await existing.promise; return send(res, 200, { ok: true }); }
      if (duplicates.size >= 2000) throw new RequestError(429);
      const entry = { expires: time + 300000, pending: true };
      entry.promise = Promise.resolve().then(() => insert(row));
      duplicates.set(fingerprint, entry);
      try { await entry.promise; entry.pending = false; } catch (error) { duplicates.delete(fingerprint); throw error; }
      return send(res, 201, { ok: true });
    } catch (error) {
      return send(res, error instanceof RequestError ? error.status : 503, { ok: false, message: 'مقدرناش نحفظ الحجز دلوقتي. جرّب تاني بعد لحظة.' });
    }
  };
}
module.exports = { validate, readBody, createHandler };
