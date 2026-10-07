'use strict';
const { getSupabase } = require('../../lib/server/supabase.cjs');
const { createHandler } = require('../../lib/server/mission-zero.cjs');
const { logInsertFailure } = require('../../lib/server/diagnostics.cjs');
module.exports = createHandler({
  insert: async row => {
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
  },
});
