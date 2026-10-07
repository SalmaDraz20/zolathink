'use strict';
// Imported only by the Vercel function; never copied into the public build.
if (typeof window !== 'undefined') throw new Error('Server-only module');
console.info('Mission 0 Supabase configuration', {
  hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
  hasSupabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
});
const { createClient } = require('@supabase/supabase-js');
let client;
function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error('Registration service is not configured');
  }
  if (!client) client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) },
  });
  return client;
}
module.exports = { getSupabase };
