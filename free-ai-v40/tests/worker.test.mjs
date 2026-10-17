import test from "node:test";
import assert from "node:assert/strict";
import worker,{makeSlots,validateSettings,buildPrompt,buildResponseSchema,validateGenerated,DEFAULT_MODEL,ORIGIN} from "../../free-ai-v40/worker.mjs";

const params={account:"カイ",platform:"X",startDate:"2026-10-19",xFormat:"single",xTarget:"120",premiumTarget:"800",threadsTarget:"200",threadCount:3,confirmAdult:true,consentToFreeTierProcessing:true,challengeToken:"test-token-human-verification"};
function req(payload=params,{origin=ORIGIN,country="JP",ip="203.0.113.21",path="/generate",method="POST"}={}){
 const r=new Request("https://example.workers.dev"+path,{method,headers:{
  Origin:origin,"Content-Type":"application/json","CF-Connecting-IP":ip
 },...(method!=="GET"?{body:JSON.stringify(payload)}:{})});
 Object.defineProperty(r,"cf",{value:{country}});
 return r;
}
function env(opts={}){
 const store={turnstile:0,model:0,limit:0};
 return {store,
  GEMINI_API_KEY:"secret-never-leak",
  TURNSTILE_SECRET:"secret-for-turnstile",
  GEMINI_MODEL:DEFAULT_MODEL,
  USER_LIMITER:{limit:async()=>{store.limit++;return {success:true}}},
  GLOBAL_LIMITER:{limit:async()=>({success:true})},
  DAILY_BUDGET:{getByName:(name)=>({reserve:async()=>({allowed:true,used:1,limit:12,day:"2026-10-17"})})},
  ...opts
 };
}
function result(items,config={}){
 return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(items)}]}}]}),{status:config.status||200});
}
async function withFakeFetch(mock,fn){
 const old=globalThis.fetch;
 globalThis.fetch=mock;
 try{return await fn()}finally{globalThis.fetch=old}
}
function batch(settings=params){
 return makeSlots(settings).map((p,i)=>({...p,content:"AI副業の初心者へ。今日の視点"+(i+1)+"。身の回りの小さな選択を具体的に考える。"}));
}
test("Trusted slot schedule is exactly seven days x twice and stable in Japan-local notation",()=>{
 const slots=makeSlots(params);
 assert.equal(slots.length,14);
 assert.equal(slots[0].date,"2026-10-19T12:00");
 assert.equal(slots[1].date,"2026-10-19T20:00");
 assert.equal(slots.at(-1).date,"2026-10-25T20:00");
 assert.equal(slots.every(s=>s.account==="カイ"&&s.platform==="X"),true);
});
test("Validation rejects malformed dates, unsupported accounts and user-controlled model strings",()=>{
 assert.equal(validateSettings({...params,account:"unknown"}),null);
 assert.equal(validateSettings({...params,startDate:"2026-02-30"}),null);
 assert.equal(validateSettings({...params,threadCount:9999}),null);
 assert.match(validateSettings({...params,xFormat:"premium",premiumTarget:"3000"}).error,/無料AI試作/);
 assert.equal(buildPrompt(validateSettings(params)).includes("14件"),true);
});
test("Output must contain all exact dated slots, no extra output, no missing content",()=>{
 const settings=validateSettings(params),good=batch(settings);
 assert.equal(validateGenerated(good,settings).length,14);
 assert.equal(validateGenerated(good.slice(0,13),settings),null);
 assert.equal(validateGenerated(good.map((v,i)=>i===2?{...v,date:"wrong"}:v),settings),null);
 assert.equal(validateGenerated(good.map((v,i)=>i===2?{...v,content:""}:v),settings),null);
});
test("X thread and Threads 500 are validated independently",()=>{
 const x=validateSettings({...params,xFormat:"thread",threadCount:3}),slots=makeSlots(x);
 const thread=slots.map((s,i)=>({...s,content:"冒頭"+i,threadParts:["冒頭"+i,"中盤"+i,"結論"+i]}));
 assert.equal(validateGenerated(thread,x).length,14);
 assert.equal(validateGenerated(thread.map((v,i)=>i===0?{...v,threadParts:["短文","続き"]}:v),x),null);
 const ts=validateSettings({...params,platform:"Threads"});
 const good=batch(ts);
 assert.equal(validateGenerated(good,ts).length,14);
 assert.equal(validateGenerated(good.map((v,i)=>i===4?{...v,content:"あ".repeat(501)}:v),ts),null);
});
test("Rejects origin, country, age and missing secrets without any paid API network access",async()=>{
 const calls=[];
 await withFakeFetch(async (...args)=>{calls.push(args);throw Error("outbound unexpectedly used")},async()=>{
  const e=env();
  assert.equal((await worker.fetch(req(params,{origin:"https://evil.example"}),e)).status,403);
  assert.equal((await worker.fetch(req(params,{country:"GB"}),e)).status,403);
  assert.equal((await worker.fetch(req({...params,confirmAdult:false}),e)).status,403);
  assert.equal((await worker.fetch(req({...params,consentToFreeTierProcessing:false}),e)).status,403);
  assert.equal((await worker.fetch(req(params),{...e,GEMINI_API_KEY:null})).status,503);
  assert.equal((await worker.fetch(req(params),{...e,USER_LIMITER:null})).status,503);
  assert.equal((await worker.fetch(req(params),{...e,DAILY_BUDGET:null})).status,503);
  assert.equal((await worker.fetch(req({...params,startDate:"bad"}),e)).status,422);
 });
 assert.equal(calls.length,0);
});
test("Turnstile failure and per-user rate limit block Gemini calls",async()=>{
 let modelCalls=0;
 await withFakeFetch(async(url,opts)=>{
  if(url.toString().includes("siteverify"))return new Response(JSON.stringify({success:false}));
  modelCalls++;return result(batch());
 },async()=>{
  const r=await worker.fetch(req(params),env());
  assert.equal(r.status,403);
 });
 assert.equal(modelCalls,0);
 await withFakeFetch(async(url,opts)=>{
  if(url.toString().includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"yaccon.github.io"}));
  modelCalls++;return result(batch());
 },async()=>{
  const e=env({USER_LIMITER:{limit:async()=>({success:false})}});
  const r=await worker.fetch(req(params),e);
  assert.equal(r.status,429);
 });
 assert.equal(modelCalls,0);
});
test("Successful Gemini 14-post JSON remains unregistered until frontend reviews it; secrets stay server-only",async()=>{
 const calls=[];
 await withFakeFetch(async(url,opts)=>{
  calls.push({url:String(url),opts});
  if(String(url).includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"yaccon.github.io"}));
  return result(batch());
 },async()=>{
  const resp=await worker.fetch(req(params),env());
  assert.equal(resp.status,200);
  const json=await resp.json();
  assert.equal(json.ok,true);
  assert.equal(json.posts.length,14);
  assert.equal(json.posts[0].date,"2026-10-19T12:00");
  assert.equal(JSON.stringify(json).includes("secret-never-leak"),false);
  assert.equal(resp.headers.get("access-control-allow-origin"),ORIGIN);
  assert.equal(resp.headers.get("cache-control"),"no-store");
 });
 assert.equal(calls.length,2);
 assert.match(calls[1].url,/gemini-3\.5-flash-lite:generateContent/);
 assert.equal(calls[1].opts.headers["x-goog-api-key"],"secret-never-leak");
 const body=JSON.parse(calls[1].opts.body);
 assert.equal(body.generationConfig.responseMimeType,"application/json");
 assert.equal(body.generationConfig.responseJsonSchema.minItems,14);
 assert.equal(body.generationConfig.responseJsonSchema.maxItems,14);
 assert.equal(body.contents[0].parts[0].text.includes("スロット"),false);
 assert.equal(body.contents[0].parts[0].text.includes("厳密な予定枠"),true);
});
test("Gemini free cap 429 halts generation with no automatic payment fallback or retries",async()=>{
 let calls=0;
 await withFakeFetch(async(url,opts)=>{
  calls++;
  if(String(url).includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"yaccon.github.io"}));
  return new Response('{"error":"RESOURCE_EXHAUSTED"}',{status:429});
 },async()=>{
  const r=await worker.fetch(req(params),env());
  assert.equal(r.status,429);
  const json=await r.json();
  assert.match(json.error,/課金せず/);
 });
 assert.equal(calls,2);
});
test("Gemini incomplete or malformed response fails closed and never saves",async()=>{
 for(const items of [batch().slice(0,13),batch().map((p,i)=>i===0?{...p,content:""}:p)]){
  await withFakeFetch(async(url)=>{
   if(String(url).includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"yaccon.github.io"}));
   return result(items);
  },async()=>{
   const r=await worker.fetch(req(params),env());
   assert.equal(r.status,502);
   const output=await r.json();
   assert.equal(output.posts,undefined);
  });
 }
});
test("Paid, unknown, or future model config is refused before reaching Gemini",async()=>{
 const calls=[];
 await withFakeFetch(async(url,opts)=>{
  calls.push(String(url));
  if(String(url).includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"yaccon.github.io"}));
  throw Error("Must never use a non-free API model");
 },async()=>{
  for(const id of ["gemini-3.8-pro","gemini-3.5-flash","gemini-3.6-flash"]){
   const r=await worker.fetch(req(params),env({GEMINI_MODEL:id}));
   assert.equal(r.status,503);
   assert.match((await r.json()).error,/無料AIモデル以外/);
  }
 });
 assert.equal(calls.filter(x=>x.includes("generativelanguage.googleapis.com")).length,0);
});
test("CORS preflight responds only to allowed origin",async()=>{
 const request=new Request("https://example.workers.dev/generate",{method:"OPTIONS",headers:{Origin:ORIGIN}});
 const response=await worker.fetch(request,{});
 assert.equal(response.status,204);
 assert.equal(response.headers.get("access-control-allow-methods"),"POST, OPTIONS");
});

test("Strict JSON response schema matches free X thread and Threads formats",()=>{
 const thread=validateSettings({...params,xFormat:"thread",threadCount:4});
 const structure=buildResponseSchema(thread);
 assert.equal(structure.type,"array");
 assert.equal(structure.minItems,14);
 assert.equal(structure.maxItems,14);
 assert.deepEqual(structure.items.properties.account.enum,["カイ"]);
 assert.equal(structure.items.properties.threadParts.minItems,4);
 assert.ok(structure.items.required.includes("threadParts"));
 const threads=buildResponseSchema(validateSettings({...params,platform:"Threads"}));
 assert.equal(threads.items.properties.threadParts,undefined);
 assert.deepEqual(threads.items.properties.platform.enum,["Threads"]);
});
test("14 results can be returned in arbitrary order but exact duplicate/missing dates still fail",()=>{
 const cfg=validateSettings(params),arr=batch(cfg);
 assert.equal(validateGenerated([...arr].reverse(),cfg).length,14);
 assert.equal(validateGenerated([...arr].reverse(),cfg)[0].date,arr[0].date);
 const duplicate=[...arr];duplicate[3]={...duplicate[3],date:duplicate[2].date};
 assert.equal(validateGenerated(duplicate,cfg),null);
 const unknown=[...arr];unknown[3]={...unknown[3],date:"2027-01-01T12:00"};
 assert.equal(validateGenerated(unknown,cfg),null);
});

test("Global daily budget denies all Gemini calls independently of regional limiters",async()=>{
 let modelCalls=0,quotaCalls=0;
 await withFakeFetch(async(url)=>{
  if(String(url).includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"yaccon.github.io"}));
  modelCalls++;
  return result(batch());
 },async()=>{
  const e=env({DAILY_BUDGET:{getByName:(name)=>{
   assert.equal(name,"free-ai-global-daily-v40");
   return {reserve:async()=>{quotaCalls++;return {allowed:false,used:12,limit:12}}};
  }}});
  const r=await worker.fetch(req(params),e);
  assert.equal(r.status,429);
  assert.match((await r.json()).error,/本日分の生成上限/);
 });
 assert.equal(quotaCalls,1);
 assert.equal(modelCalls,0);
});
test("Global budget binding failure never calls Gemini",async()=>{
 let modelCalls=0;
 await withFakeFetch(async(url)=>{
  if(String(url).includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"yaccon.github.io"}));
  modelCalls++;
  return result(batch());
 },async()=>{
  const e=env({DAILY_BUDGET:{getByName:()=>({reserve:async()=>{throw Error("Storage offline")}})}});
  const r=await worker.fetch(req(params),e);
  assert.equal(r.status,502);
 });
 assert.equal(modelCalls,0);
});
test("Alternative explicitly free Gemini 3.1 model is accepted without enabling paid models",async()=>{
 await withFakeFetch(async(url,opts)=>{
  if(String(url).includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"yaccon.github.io"}));
  assert.match(String(url),/gemini-3\.1-flash-lite:generateContent/);
  return result(batch());
 },async()=>{
  const r=await worker.fetch(req(params),env({GEMINI_MODEL:"gemini-3.1-flash-lite"}));
  assert.equal(r.status,200);
 });
});

test("iPhone no-charge /health reveals readiness only and never uses provider or secret keys",async()=>{
 const calls=[];
 await withFakeFetch(async (...args)=>{calls.push(args);throw Error("health must stay offline")},async()=>{
  const configured=env();
  const ready=await worker.fetch(req(params,{method:"GET",path:"/health"}),configured);
  assert.equal(ready.status,200);
  const json=await ready.json();
  assert.deepEqual(json,{ok:true,ready:true,freeOnly:true,dailyLimit:12});
  assert.equal(JSON.stringify(json).includes("secret-never-leak"),false);
  assert.equal(JSON.stringify(json).includes("secret-for-turnstile"),false);
  const missing=await worker.fetch(req(params,{method:"GET",path:"/health"}),env({DAILY_BUDGET:null}));
  assert.equal(missing.status,200);
  assert.equal((await missing.json()).ready,false);
  assert.equal((await worker.fetch(req(params,{method:"GET",path:"/health",origin:"https://evil.example"}),configured)).status,403);
 });
 assert.equal(calls.length,0);
});
