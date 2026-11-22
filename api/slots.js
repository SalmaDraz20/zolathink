'use strict';
// Public list of the Mission 0 slots shown in the booking form (with a "full" flag).
const { createSlots, defaultSlots } = require('../lib/server/slots.cjs');
let cache = null;
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end('{"ok":false}'); }
  const env = process.env;
  const service = createSlots({ token: env.NOTION_TOKEN, slotsDb: env.NOTION_SLOTS_DB, bookingsDb: env.NOTION_MISSION0_DB });
  try {
    const now = Date.now();
    if (!cache || cache.expires < now) cache = { expires: now + 20000, value: await service.withCounts(await service.list()) };
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=20, stale-while-revalidate=60');
    res.end(JSON.stringify({ ok: true, slots: cache.value.map(s => ({ key: s.key, short: s.short, full: s.full })) }));
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ ok: true, slots: defaultSlots().map(s => ({ key: s.key, short: s.short, full: false })) }));
  }
};
