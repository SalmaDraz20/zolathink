'use strict';
// Mission 0 time slots. They live in the Notion table "مواعيد Mission 0" (NOTION_SLOTS_DB) and
// are edited from /admin. Without that table the three default slots below are used.
if (typeof window !== 'undefined') throw new Error('Server-only module');
const NOTION_VERSION = '2022-06-28';

const DAYS = {
  saturday: 'السبت', sunday: 'الأحد', monday: 'الاتنين', tuesday: 'التلات',
  wednesday: 'الأربع', thursday: 'الخميس', friday: 'الجمعة',
};
const DAY_ORDER = Object.keys(DAYS);
const KEY_RE = /^(saturday|sunday|monday|tuesday|wednesday|thursday|friday)_(1[0-2]|[1-9])(am|pm)$/;
const DEFAULT_KEYS = ['thursday_5pm', 'friday_5pm', 'saturday_5pm'];
const DEFAULT_CAPACITY = 12;

const isKey = key => typeof key === 'string' && KEY_RE.test(key);
function makeKey(day, hour, period) {
  const key = `${day}_${Number(hour)}${period}`;
  if (!isKey(key)) throw new Error('bad_slot');
  return key;
}
function parts(key) {
  const m = KEY_RE.exec(key);
  return m ? { day: m[1], hour: Number(m[2]), period: m[3] } : null;
}
// The full name is what gets stored in the booking's "Preferred slot" column in Notion.
function slotName(key) {
  const p = parts(key);
  if (!p) return '';
  return `${DAYS[p.day]} — ${p.hour} ${p.period === 'pm' ? 'مساءً' : 'صباحاً'}`;
}
// The short name is what the booking form shows on the button.
function slotShort(key) {
  const p = parts(key);
  return p ? `${DAYS[p.day]} · ${p.hour} ${p.period === 'pm' ? 'م' : 'ص'}` : '';
}
function sortValue(key) {
  const p = parts(key);
  const h24 = (p.hour % 12) + (p.period === 'pm' ? 12 : 0);
  return DAY_ORDER.indexOf(p.day) * 100 + h24;
}
const defaultSlots = () => DEFAULT_KEYS.map(key => ({
  id: null, key, name: slotName(key), short: slotShort(key), capacity: DEFAULT_CAPACITY, visible: true,
}));

const plain = arr => (Array.isArray(arr) ? arr.map(x => x.plain_text || '').join('') : '');
function readSlot(page) {
  const p = page.properties || {};
  const key = plain(p.Key && p.Key.rich_text).trim();
  if (!isKey(key)) return null;
  const capacity = p['الأماكن'] && typeof p['الأماكن'].number === 'number' ? p['الأماكن'].number : DEFAULT_CAPACITY;
  return {
    id: page.id, key, name: slotName(key), short: slotShort(key),
    capacity: Math.max(0, Math.round(capacity)), visible: !!(p['ظاهر'] && p['ظاهر'].checkbox),
  };
}

function createSlots({ token, slotsDb, bookingsDb, fetchImpl = globalThis.fetch }) {
  const notion = async (path, method, body) => {
    const r = await fetchImpl('https://api.notion.com/v1' + path, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) { const e = new Error('notion_' + r.status); e.status = r.status; throw e; }
    return r.json();
  };
  async function queryAll(db, body = {}) {
    const out = []; let cursor;
    for (let i = 0; i < 20; i++) {
      const res = await notion(`/databases/${db}/query`, 'POST', { ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
      out.push(...(res.results || []));
      if (!res.has_more) break;
      cursor = res.next_cursor;
    }
    return out;
  }
  async function list({ all = false } = {}) {
    if (!token || !slotsDb) return defaultSlots();
    const pages = await queryAll(slotsDb);
    const slots = pages.filter(p => !p.archived).map(readSlot).filter(Boolean)
      .sort((a, b) => sortValue(a.key) - sortValue(b.key));
    return all ? slots : slots.filter(s => s.visible);
  }
  // How many bookings each slot already has, by slot name.
  async function counts() {
    if (!token || !bookingsDb) return {};
    const pages = await queryAll(bookingsDb);
    const out = {};
    for (const p of pages) {
      const s = p.properties && p.properties['Preferred slot'] && p.properties['Preferred slot'].select;
      if (s && s.name) out[s.name] = (out[s.name] || 0) + 1;
    }
    return out;
  }
  async function withCounts(slots) {
    const c = await counts();
    return slots.map(s => ({ ...s, booked: c[s.name] || 0, full: s.capacity > 0 && (c[s.name] || 0) >= s.capacity }));
  }
  return { list, counts, withCounts, notion, queryAll };
}

module.exports = { DAYS, isKey, makeKey, parts, slotName, slotShort, sortValue, defaultSlots, readSlot, createSlots, DEFAULT_CAPACITY };
