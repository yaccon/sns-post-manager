import test from "node:test";
import assert from "node:assert/strict";
import {reserveDailyQuota,MAX_PUBLIC_DAILY_GENERATIONS} from "../../free-ai-v40/quota.mjs";
function storage(){
 const kv=new Map();
 return {kv,async get(k){return kv.get(k)},async put(k,v){kv.set(k,v)}};
}
const utcDay=t=>new Date(t);
test("Daily quota is globally limited to 12 real Gemini attempts, not a regional suggestion",async()=>{
 const s=storage();
 assert.equal(MAX_PUBLIC_DAILY_GENERATIONS,12);
 for(let i=1;i<=12;i++){
  const q=await reserveDailyQuota(s,utcDay("2026-10-17T23:59:00Z"));
  assert.deepEqual(q,{allowed:true,used:i,limit:12,day:"2026-10-17"});
 }
 const denied=await reserveDailyQuota(s,utcDay("2026-10-17T23:59:30Z"));
 assert.deepEqual(denied,{allowed:false,used:12,limit:12,day:"2026-10-17"});
 assert.equal(s.kv.get("daily-budget").used,12);
});
test("UTC new day resets the same durable record (does not grow unlimited storage)",async()=>{
 const s=storage();
 for(let i=0;i<12;i++)await reserveDailyQuota(s,utcDay("2026-10-17T12:00:00Z"));
 assert.equal((await reserveDailyQuota(s,utcDay("2026-10-18T00:00:01Z"))).used,1);
 assert.equal(s.kv.size,1);
 assert.equal(s.kv.get("daily-budget").day,"2026-10-18");
});
test("Lower daily cap can be selected; higher cap cannot bypass hard public limit",async()=>{
 const s=storage();
 const a=await reserveDailyQuota(s,utcDay("2026-10-17T05:00:00Z"),1);
 assert.equal(a.allowed,true);
 const b=await reserveDailyQuota(s,utcDay("2026-10-17T06:00:00Z"),1);
 assert.equal(b.allowed,false);
 const c=await reserveDailyQuota(s,utcDay("2026-10-17T06:00:00Z"),1000000);
 assert.equal(c.limit,MAX_PUBLIC_DAILY_GENERATIONS);
});
test("Invalid budget configuration fails rather than allowing Gemini calls",async()=>{
 const s=storage();
 await assert.rejects(()=>reserveDailyQuota(s,utcDay("2026-10-17T12:00:00Z"),0),/Invalid daily quota/);
 await assert.rejects(()=>reserveDailyQuota(s,utcDay("2026-10-17T12:00:00Z"),NaN),/Invalid daily quota/);
 assert.equal(s.kv.size,0);
});
test("No personally identifiable information is persisted in global budget store",async()=>{
 const s=storage();
 await reserveDailyQuota(s,utcDay("2026-10-17T12:00:00Z"));
 assert.deepEqual(Object.keys(s.kv.get("daily-budget")).sort(),["day","used"]);
 assert.equal(JSON.stringify([...s.kv]).includes("203.0.113"),false);
});
