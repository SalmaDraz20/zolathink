const test = require('node:test');
const assert = require('node:assert/strict');
const { logInsertFailure } = require('../lib/server/diagnostics.cjs');

test('logs only diagnostic fields and redacts personal/configuration data', () => {
  const previousLog = console.error;
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  const previousUrl = process.env.SUPABASE_URL;
  let captured;
  process.env.SUPABASE_SECRET_KEY = 'test-secret-never-log';
  process.env.SUPABASE_URL = 'https://private.example.test';
  console.error = (...args) => { captured = args; };
  try {
    const row = {student_name:'طالب سري',parent_name:'ولي سري',parent_whatsapp:'+201012345678',dream_profession:'اختيار سري'};
    logInsertFailure({code:'23502',message:'null value in column status violates not-null constraint',details:'Failing row contains (طالب سري, ولي سري, +201012345678).',hint:'test-secret-never-log https://private.example.test ولي سري',stack:'never log stack',body:row},row);
    assert.equal(captured[0],'Mission 0 Supabase insert failed');
    assert.deepEqual(Object.keys(captured[1]),['code','message','details','hint']);
    const serialized=JSON.stringify(captured);
    for (const value of [...Object.values(row),'test-secret-never-log','https://private.example.test','never log stack']) assert.ok(!serialized.includes(value));
    assert.equal(captured[1].code,'23502');
    assert.ok(captured[1].message.includes('not-null constraint'));
  } finally {
    console.error=previousLog;
    if(previousKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previousKey;
    if(previousUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previousUrl;
  }
});
