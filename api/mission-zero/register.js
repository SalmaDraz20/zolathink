'use strict';
const { getSupabase } = require('../../lib/server/supabase.cjs');
const { createHandler } = require('../../lib/server/mission-zero.cjs');
module.exports = createHandler({
  insert: async row => {
    // No select(), record data, created_at, or client-controlled status is returned.
    const { error } = await getSupabase().from('mission_zero_registrations').insert(row);
    if (error) throw new Error('Database insertion failed');
  },
});
