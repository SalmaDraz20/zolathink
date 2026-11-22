'use strict';
const { getSupabase } = require('../../lib/server/supabase.cjs');
const { createHandler } = require('../../lib/server/mission-zero.cjs');
const { createNotionInsert, combineInserts } = require('../../lib/server/mission-zero-notion.cjs');
const { logInsertFailure } = require('../../lib/server/diagnostics.cjs');
const { createSlots } = require('../../lib/server/slots.cjs');

// Bookings go to the Notion "Mission 0" table (NOTION_MISSION0_DB) and, while it is still configured, to Supabase too.
const inserts = [];
if (process.env.NOTION_TOKEN && process.env.NOTION_MISSION0_DB) {
  inserts.push(createNotionInsert({ token: process.env.NOTION_TOKEN, database: process.env.NOTION_MISSION0_DB }));
}
if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
  inserts.push(async row => {
    // No select(), record data, created_at, or client-controlled status is returned.
    let result;
    try {
      result = await getSupabase().from('mission_zero_registrations').insert(row);
    } catch (error) {
      logInsertFailure(error, row);
      throw new Error('Database insertion failed');
    }
    if (result.error) {
      logInsertFailure(result.error, row);
      throw new Error('Database insertion failed');
    }
  });
}

const store = combineInserts(inserts, error => console.error('[mission-zero] store failed:', error && error.message));
// Only slots that are shown in the form and not full can be booked (when the slots table is set up).
const slots = createSlots({ token: process.env.NOTION_TOKEN, slotsDb: process.env.NOTION_SLOTS_DB, bookingsDb: process.env.NOTION_MISSION0_DB });
async function insert(row) {
  if (process.env.NOTION_TOKEN && process.env.NOTION_SLOTS_DB) {
    const open = await slots.withCounts(await slots.list());
    const slot = open.find(s => s.key === row.preferred_slot);
    if (!slot || slot.full) throw new Error('Slot not available');
  }
  return store(row);
}

module.exports = createHandler({ insert });
