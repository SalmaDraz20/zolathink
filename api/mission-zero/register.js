'use strict';
const { getSupabase } = require('../../lib/server/supabase.cjs');
const { createHandler } = require('../../lib/server/mission-zero.cjs');
const { createNotionInsert, combineInserts } = require('../../lib/server/mission-zero-notion.cjs');
const { logInsertFailure } = require('../../lib/server/diagnostics.cjs');

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

module.exports = createHandler({ insert: combineInserts(inserts, error => console.error('[mission-zero] store failed:', error && error.message)) });
