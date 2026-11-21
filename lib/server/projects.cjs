'use strict';
// Student projects gallery. Rows live in the Notion table "Projects Gallery · Journey 1";
// only rows with "Show on site" ticked are returned, sorted by "Order".
// GET /api/projects -> { ok, projects: [{ title, by, mission, description, math, image, link }] }
if (typeof window !== 'undefined') throw new Error('Server-only module');
const NOTION_VERSION = '2022-06-28';
const MAX_PROJECTS = 24;

const plain = arr => (Array.isArray(arr) ? arr.map(x => x.plain_text || '').join('') : '').trim();
const text = v => (!v ? '' : v.title ? plain(v.title) : v.rich_text ? plain(v.rich_text) : v.select ? v.select.name : '');
const safeUrl = u => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : null);
const fileUrl = prop => {
  const f = prop && Array.isArray(prop.files) ? prop.files[0] : null;
  return f ? safeUrl((f.file && f.file.url) || (f.external && f.external.url)) : null;
};

// Only public fields. The "Student" relation is internal and never leaves the server.
function readProject(page) {
  const p = page.properties || {};
  return {
    title: text(p.Project || p.Name).slice(0, 90),
    by: text(p['Display name']).slice(0, 60),
    mission: text(p.Mission).slice(0, 20),
    description: text(p.Description).slice(0, 240),
    math: text(p['Math used']).slice(0, 60),
    image: fileUrl(p.Image),
    link: safeUrl(p.Link && p.Link.url),
  };
}

function createHandler({ token, database, fetchImpl = fetch }) {
  const send = (res, status, body, cache) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Notion file links expire after about an hour, so the edge cache stays well under that.
    res.setHeader('Cache-Control', cache || 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(JSON.stringify(body));
  };
  return async (req, res) => {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { ok: false }); }
    if (!token || !database) return send(res, 503, { ok: false, error: 'not_configured' });
    try {
      const r = await fetchImpl(`https://api.notion.com/v1/databases/${database}/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_size: MAX_PROJECTS,
          filter: { property: 'Show on site', checkbox: { equals: true } },
          sorts: [{ property: 'Order', direction: 'ascending' }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return send(res, 502, { ok: false, error: 'upstream' });
      const data = await r.json();
      const projects = (data.results || []).map(readProject).filter(x => x.title);
      return send(res, 200, { ok: true, projects }, 'public, s-maxage=600, stale-while-revalidate=600');
    } catch {
      return send(res, 502, { ok: false, error: 'upstream' });
    }
  };
}
const fromEnv = () => ({ token: process.env.NOTION_TOKEN, database: process.env.NOTION_PROJECTS_DB });
module.exports = { readProject, createHandler, fromEnv };
