'use strict';
// Saves a validated Mission 0 booking as a row in the Notion "Mission 0" database.
if (typeof window !== 'undefined') throw new Error('Server-only module');
const NOTION_VERSION = '2022-06-28';
const GRADE_NAMES = {
  grade_5_primary: 'الصف الخامس الابتدائي', grade_6_primary: 'الصف السادس الابتدائي',
  grade_1_prep: 'الصف الأول الإعدادي', grade_2_prep: 'الصف الثاني الإعدادي', grade_3_prep: 'الصف الثالث الإعدادي',
};
const { slotName } = require('./slots.cjs');
const SLOT_NAMES = { thursday_5pm: slotName('thursday_5pm'), friday_5pm: slotName('friday_5pm'), saturday_5pm: slotName('saturday_5pm') };
const rich = value => ({ rich_text: value ? [{ text: { content: String(value).slice(0, 1900) } }] : [] });

function toNotionProperties(row, source = 'الموقع') {
  const props = {
    Student: { title: [{ text: { content: row.student_name } }] },
    Parent: rich(row.parent_name),
    'Parent WhatsApp': { phone_number: row.parent_whatsapp },
    Grade: { select: { name: GRADE_NAMES[row.grade] } },
    'Preferred slot': { select: { name: slotName(row.preferred_slot) } },
    Interests: { multi_select: (row.interests || []).map(name => ({ name })) },
    'Dream career': rich(row.dream_profession),
    Status: { select: { name: 'جديد' } },
    Source: rich(source),
  };
  if (row.student_whatsapp) props['Student WhatsApp'] = { phone_number: row.student_whatsapp };
  return props;
}

function createNotionInsert({ token, database, fetchImpl = fetch }) {
  return async row => {
    const r = await fetchImpl('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent: { database_id: database }, properties: toNotionProperties(row) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`Notion insert failed (${r.status})`);
  };
}

// Writes to every configured store. Succeeds when at least one store saved the booking.
function combineInserts(inserts, onError = () => {}) {
  return async row => {
    if (!inserts.length) throw new Error('No booking store configured');
    const results = await Promise.allSettled(inserts.map(insert => insert(row)));
    results.forEach(r => r.status === 'rejected' && onError(r.reason));
    if (!results.some(r => r.status === 'fulfilled')) throw new Error('All booking stores failed');
  };
}

module.exports = { GRADE_NAMES, SLOT_NAMES, toNotionProperties, createNotionInsert, combineInserts };
