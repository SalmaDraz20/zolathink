'use strict';
// Certificates are rows in a Notion database (one row = one student's Journey certificate).
// GET /api/certificate?code=Z-1234 returns only the public fields of a published row.
if (typeof window !== 'undefined') throw new Error('Server-only module');
const NOTION_VERSION = '2022-06-28';
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Codes in Notion are stored as plain numbers ("294"); the website shows them as "Z-294".
function normalizeCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase().replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  return /^Z-[A-Z0-9]{2,12}$/.test(code) ? code : null;
}
const plain = arr => (Array.isArray(arr) ? arr.map(x => x.plain_text || '').join('') : '').trim();
// Read a text-like property by the first name that exists (lets the table grow without breaking the site).
const text = (p, ...names) => {
  for (const name of names) {
    const v = p[name]; if (!v) continue;
    const out = v.title ? plain(v.title) : v.rich_text ? plain(v.rich_text) : v.select ? v.select.name : v.type === 'number' && v.number != null ? String(v.number) : '';
    if (out) return out;
  }
  return '';
};
const safeUrl = u => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : null);
const splitList = s => String(s || '').split(/[,،\n؛;]|\s+-\s+|•/).map(x => x.trim()).filter(Boolean).slice(0, 30);
const fileUrl = prop => {
  const f = prop && Array.isArray(prop.files) ? prop.files[0] : null;
  return f ? safeUrl((f.file && f.file.url) || (f.external && f.external.url)) : null;
};

// Matches the "Student Profiles · Batch 1" table: Name, Code, Certificate ID, Certificate PDF,
// Title (لقب), Skills acquired, M0–M4 project. Optional extras: Name EN, Title EN, Title reason, Issued, Journey.
function readCertificate(page) {
  const p = page.properties || {};
  const journey = text(p, 'Journey') || 'Journey 01';
  const issuedRaw = p.Issued && p.Issued.date && p.Issued.date.start;
  const issued = issuedRaw ? new Date(issuedRaw.slice(0, 10) + 'T12:00:00Z') : null;
  const skills = splitList(text(p, 'Skills acquired', 'Skills'));
  const projects = [0, 1, 2, 3, 4].map(i => {
    const raw = text(p, `M${i} project`); if (!raw) return null;
    const [title, role, image] = raw.split('|').map(x => x.trim());
    return { mission: i, title: title.slice(0, 90), role: (role || '').slice(0, 80), image: safeUrl(image) };
  }).filter(Boolean);
  const name = text(p, 'Name');
  const code = text(p, 'Code');
  return {
    code: code ? 'Z-' + code.replace(/^Z-/i, '') : '',
    certificateId: text(p, 'Certificate ID'),
    name,
    nameEn: text(p, 'Name EN') || name,
    journey,
    journeyUpper: journey.toUpperCase(),
    title: text(p, 'Title (لقب)', 'Title'),
    titleEn: text(p, 'Title EN').toUpperCase(),
    titleReason: text(p, 'Title reason'),
    topSkills: skills.slice(0, 3),
    skills: skills.slice(3),
    issuedLabel: issued ? `${AR_MONTHS[issued.getUTCMonth()]} ${issued.getUTCFullYear()}` : '',
    issuedEn: issued ? `${EN_MONTHS[issued.getUTCMonth()]} ${issued.getUTCFullYear()}` : '',
    pdf: fileUrl(p['Certificate PDF']) || safeUrl(p.PDF && p.PDF.url),
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
        // The table stores "294"; accept either form in case some rows were typed as "Z-294".
        body: JSON.stringify({ page_size: 1, filter: { or: [{ property: 'Code', rich_text: { equals: code.slice(2) } }, { property: 'Code', rich_text: { equals: code } }] } }),
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
