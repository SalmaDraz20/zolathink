# Mission 0 Supabase integration

The unchanged modal sends JSON to `POST /api/mission-zero/register`. Server-only modules read `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. The browser never imports Supabase or receives a database key. Only approved frontend files enter `dist/`; API/server code, environment files and local records do not.

The API inserts into `mission_zero_registrations`, sets `status = new`, and leaves `id` and `created_at` to existing database defaults. It never selects/returns records. No RLS or database policies are created or weakened. Ensure your existing defaults generate id and timestamp.

Validation: application/json, 8 KB maximum, required names (2–80 characters), normalized guardian phone, exactly five grade codes and two slot codes, approved string-array interests (maximum nine), optional 160-character dream profession. Control characters and markup are rejected; arbitrary status/id/timestamp values are ignored.

Abuse protection is best-effort per warm Vercel instance: eight attempts per minute per platform IP, five-minute identical-payload/concurrent suppression, bounded maps, same-origin browser checks. Failures allow retries. It is not a distributed rate limiter or a cross-instance duplicate guarantee. No paid service is added.

## Manual deployment and safe test

1. Confirm `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set on the appropriate Vercel environments. Never prefix the secret with NEXT_PUBLIC_. Do not commit credentials.
2. Redeploy. Use framework preset Other and the committed `vercel.json` (npm build, `dist` output, Node API function). The legacy Python preview does not run this Vercel endpoint. For local integration use Vercel dev with ignored environment files.
3. On a Preview deployment, submit one clearly labeled test registration using your own WhatsApp number, an allowed grade/slot and an interest. Do not use real student information.
4. Verify one row in the Supabase dashboard: mapped fields, interests array, `status = new`, database-generated timestamp. Success only means registration saved, not seat confirmed. Delete that test row manually after verification.
5. GET/read/update/delete on the API must return 405. Network/database failure must retain the form data for retry. No database credentials or internal errors are returned.

Checks: `npm run check`, `npm test`, `npm run build`. Automated tests use mocked transport and never write to the live database. No WhatsApp messages are sent.
