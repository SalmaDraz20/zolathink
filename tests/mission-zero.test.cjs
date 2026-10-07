const test=require('node:test');
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {validate,createHandler}=require('../lib/server/mission-zero.cjs');
const valid=()=>({student_name:'طالب اختبار',grade:'grade_5_primary',parent_name:'ولي اختبار',parent_whatsapp:'٠١٠١٢٣٤٥٦٧٨',preferred_slot:'friday_7pm',interests:['التكنولوجيا والبرمجة'],dream_profession:''});
const req=(body=valid(),headers={},method='POST')=>({body,method,headers:{'content-type':'application/json',host:'zola.test',origin:'https://zola.test',...headers},socket:{remoteAddress:'test'}});
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=JSON.parse(body)}});
test('maps allowed columns, sanitizes, normalizes and ignores injected status/id/timestamp',()=>{
 const row=validate({...valid(),student_name:'  طالب   اختبار ',status:'confirmed',id:'injected',created_at:'fake',interests:['التكنولوجيا والبرمجة','التكنولوجيا والبرمجة']});
 assert.equal(row.student_name,'طالب اختبار');assert.equal(row.parent_whatsapp,'+201012345678');assert.equal(row.status,'new');assert.equal(row.dream_profession,null);assert.equal(row.interests.length,1);assert.ok(!('id'in row));assert.ok(!('created_at'in row));
});
test('accepts exactly five grade codes and two slot codes',()=>{
 for(const grade of ['grade_5_primary','grade_6_primary','grade_1_prep','grade_2_prep','grade_3_prep'])for(const preferred_slot of ['friday_7pm','saturday_7pm'])assert.equal(validate({...valid(),grade,preferred_slot}).grade,grade);
});
test('rejects missing required fields, invalid choices, unsafe/long input and interests',()=>{
 for(const field of ['student_name','parent_name','parent_whatsapp','grade','preferred_slot','interests']){const body=valid();delete body[field];assert.throws(()=>validate(body));}
 for(const body of [null,[],'text',{...valid(),grade:'grade_7'},{...valid(),preferred_slot:'sunday'},{...valid(),student_name:'x'.repeat(81)},{...valid(),dream_profession:'x'.repeat(161)},{...valid(),student_name:'<script>'},{...valid(),parent_name:'bad\u0000name'},{...valid(),parent_whatsapp:'123'},{...valid(),interests:'AI'},{...valid(),interests:['fake']},{...valid(),interests:Array(10).fill('التكنولوجيا والبرمجة')}])assert.throws(()=>validate(body));
});
test('success follows insert and returns no record data',async()=>{
 const rows=[];const handler=createHandler({insert:async row=>rows.push(row)});const response=res();await handler(req(),response);assert.equal(response.statusCode,201);assert.deepEqual(response.body,{ok:true});assert.equal(rows[0].status,'new');
});
test('concurrent identical requests insert once; failed insert can be retried',async()=>{
 let count=0,release;const waiting=new Promise(r=>release=r);const handler=createHandler({insert:async()=>{count++;await waiting}});const a=res(),b=res();const p=handler(req(),a),q=handler(req(),b);await new Promise(r=>setImmediate(r));release();await Promise.all([p,q]);assert.equal(count,1);assert.ok(a.body.ok&&b.body.ok);
 let attempts=0;const retry=createHandler({insert:async()=>{if(++attempts===1)throw Error('sensitive error')}});const failed=res();await retry(req(),failed);assert.equal(failed.statusCode,503);assert.ok(!JSON.stringify(failed.body).includes('sensitive'));const success=res();await retry(req(),success);assert.equal(success.statusCode,201);
});
test('rejects unsupported methods, cross-origin, wrong type, oversized and broken bodies',async()=>{
 let calls=0;const handler=createHandler({insert:async()=>calls++});
 for(const [request,status]of [[req(valid(),{},'GET'),405],[req(valid(),{},'DELETE'),405],[req(valid(),{'content-type':'text/plain'}),415],[req(valid(),{origin:'https://other.test'}),403],[req(valid(),{'sec-fetch-site':'cross-site'}),403],[req(valid(),{'content-length':'9000'}),413],[req('x'.repeat(9000)),413],[req('{broken'),400]]){const response=res();await handler(request,response);assert.equal(response.statusCode,status);}assert.equal(calls,0);
});
test('rate limiter expires and raw streams have the same size/JSON limits',async()=>{
 let time=0;const handler=createHandler({insert:async()=>{},now:()=>time});for(let i=0;i<8;i++)await handler(req(),res());const limited=res();await handler(req(),limited);assert.equal(limited.statusCode,429);time=61000;const allowed=res();await handler(req(),allowed);assert.equal(allowed.statusCode,200);
 const streams=createHandler({insert:async()=>{}});for(const[text,status]of [['{broken',400],['x'.repeat(9000),413],[JSON.stringify(valid()),201]]){const request=Readable.from([Buffer.from(text)]);request.method='POST';request.headers={'content-type':'application/json'};request.socket={remoteAddress:'stream'};const response=res();await streams(request,response);assert.equal(response.statusCode,status);}
});
test('Supabase transport uses only insert on the target table',async()=>{
 const savedFetch=global.fetch,savedUrl=process.env.SUPABASE_URL,savedKey=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SECRET_KEY='test-placeholder';let actual;
 global.fetch=async(url,options)=>{actual={url:String(url),options};return new Response(null,{status:201})};
 try{const {getSupabase}=require('../lib/server/supabase.cjs');const result=await getSupabase().from('mission_zero_registrations').insert(validate(valid()));assert.equal(result.error,null);assert.ok(actual.url.includes('/rest/v1/mission_zero_registrations'));assert.ok(!actual.url.includes('select='));assert.equal(actual.options.method,'POST');assert.equal(JSON.parse(actual.options.body).status,'new');}
 finally{global.fetch=savedFetch;if(savedUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=savedUrl;if(savedKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=savedKey;}
});
