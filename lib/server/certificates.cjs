'use strict';
// Certificates are rows in a Notion database (one row = one student's Journey certificate).
// GET /api/certificate?code=Z-1234 returns only the public fields of a published row.
if (typeof window !== 'undefined') throw new Error('Server-only module');
const NOTION_VERSION = '2022-06-28';
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function normalizeCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase().replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  return /^Z-[A-Z0-9]{2,12}$/.test(code) ? code : null;
}
const plain = arr => (Array.isArray(arr) ? arr.map(x => x.plain_text || '').join('') : '').trim();
const text = (p, name) => { const v = p[name]; if (!v) return ''; if (v.title) return plain(v.title); if (v.rich_text) return plain(v.rich_text); if (v.select) return v.select ? v.select.name : ''; return ''; };
const safeUrl = u => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : null);
const splitList = s => String(s || '').split(/[,،\n]/).map(x => x.trim()).filter(Boolean).slice(0, 20);

function readCertificate(page) {
  const p = page.properties || {};
  const journey = text(p, 'Journey') || 'Journey 01';
  const issued = p.Issued && p.Issued.date && p.Issued.date.start ? new Date(p.Issued.date.start + 'T12:00:00Z') : null;
  const projects = String(text(p, 'Projects')).split(/\r?\n/).map(line => line.split('|').map(s => s.trim())).filter(parts => parts[0])
    .slice(0, 8).map(([title, role, image]) => ({ title: title.slice(0, 80), role: (role || '').slice(0, 80), image: safeUrl(image) }));
  return {
    code: text(p, 'Code'),
    name: text(p, 'Name'),
    nameEn: text(p, 'Name EN') || text(p, 'Name'),
    journey,
    journeyUpper: journey.toUpperCase(),
    title: text(p, 'Title'),
    titleEn: text(p, 'Title EN').toUpperCase(),
    titleReason: text(p, 'Title reason'),
    topSkills: splitList(text(p, 'Top skills')).slice(0, 3),
    skills: p.Skills && Array.isArray(p.Skills.multi_select) ? p.Skills.multi_select.map(s => s.name).slice(0, 30) : splitList(text(p, 'Skills')),
    issuedLabel: issued ? `${AR_MONTHS[issued.getUTCMonth()]} ${issued.getUTCFullYear()}` : '',
    issuedEn: issued ? `${EN_MONTHS[issued.getUTCMonth()]} ${issued.getUTCFullYear()}` : '',
    pdf: safeUrl(p.PDF && p.PDF.url),
    image: safeUrl(p.Image && p.Image.url),
    projects,
  };
}

function createHandler({ token, database, fetchImpl = fetch }) {
  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(JSON.stringify(body));
  };
  return async (req, res) => {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { ok: false }); }
    const url = new URL(req.url, 'http://local');
    const code = normalizeCode(url.searchParams.get('code'));
    if (!code) return send(res, 400, { ok: false, error: 'bad_code' });
    if (!token || !database) return send(res, 503, { ok: false, error: 'not_configured' });
    try {
      const r = await fetchImpl(`https://api.notion.com/v1/databases/${database}/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_size: 1, filter: { and: [{ property: 'Code', rich_text: { equals: code } }, { property: 'Published', checkbox: { equals: true } }] } }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return send(res, 502, { ok: false, error: 'upstream' });
      const data = await r.json();
      const page = data.results && data.results[0];
      if (!page) return send(res, 404, { ok: false, error: 'not_found' });
      return send(res, 200, { ok: true, certificate: readCertificate(page) });
    } catch {
      return send(res, 502, { ok: false, error: 'upstream' });
    }
  };
}
const fromEnv = () => ({ token: process.env.NOTION_TOKEN, database: process.env.NOTION_CERTS_DB });
module.exports = { normalizeCode, readCertificate, createHandler, fromEnv };
