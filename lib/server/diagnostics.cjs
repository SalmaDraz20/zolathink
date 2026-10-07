'use strict';

function safeText(value, row) {
  if (typeof value !== 'string') return undefined;
  // Postgres details can include the complete failing row. Never emit it.
  let text = value.replace(/Failing row contains[\s\S]*/gi, '[redacted failing row]');
  const sensitive = [row?.student_name, row?.parent_name, row?.parent_whatsapp,
    row?.dream_profession, process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_URL];
  for (const item of sensitive) {
    if (typeof item !== 'string' || !item) continue;
    for (const representation of [item, encodeURIComponent(item), JSON.stringify(item).slice(1, -1)]) {
      text = text.split(representation).join('[redacted]');
    }
  }
  return text.replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted URL]')
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, '[redacted number]')
    .slice(0, 1000);
}

function logInsertFailure(error, row) {
  console.error('Mission 0 Supabase insert failed', {
    code: safeText(error?.code, row),
    message: safeText(error?.message, row),
    details: safeText(error?.details, row),
    hint: safeText(error?.hint, row),
  });
}

module.exports = { logInsertFailure };
