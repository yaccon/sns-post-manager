import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const prod=fs.readFileSync("index.html","utf8");
const qa=fs.readFileSync("qa-free-ai-v40.html","utf8");
const client=fs.readFileSync("free-ai-v40/client.js","utf8");
const setup=fs.readFileSync("free-ai-v40-setup.html","utf8");
const formatter=fs.readFileSync("free-ai-v40/postformat40-qa.js","utf8");
const backend=fs.readFileSync("free-ai-v40/worker.mjs","utf8");
const dailyQuota=fs.readFileSync("free-ai-v40/quota.mjs","utf8");
const runtime=fs.readFileSync("free-ai-v40/runtime.mjs","utf8");
const config=JSON.parse(fs.readFileSync("free-ai-v40/wrangler.json","utf8"));

test("Ver3.8 production remains untouched in free AI prototype",()=>{
 assert.match(prod,/<title>SNS投稿管理 Ver\.3\.8<\/title>/);
 assert.doesNotMatch(prod,/free-ai-v40\/client\.js/);
 assert.doesNotMatch(prod,/freeAi40Generate/);
 assert.match(prod,/const key="sns-post-manager-v1"/);
 assert.match(prod,/const historyKey="sns-post-manager-history-v1"/);
 assert.match(prod,/const referenceKey="sns-post-manager-references-v1"/);
});
test("QA contains actual new AI controls, not a simulated Gemini output",()=>{
 assert.match(qa,/【独立テスト】SNS投稿管理 Ver\.4\.0 無料AI生成/);
 assert.match(qa,/id="freeAi40GenerateButton"/);
 assert.match(qa,/id="freeAi40Challenge"/);
 assert.match(qa,/id="freeAi40Consent"/);
 assert.match(qa,/free-ai-v40\/client\.js\?v=400/);
 assert.match(qa,/実際のAI生成はまだ使用できません/);
 assert.doesNotMatch(client,/function fakeAI|return dummyPosts|testPostSeeds/);
 assert.doesNotThrow(()=>new vm.Script(client));
});
test("Free AI QA holds all four localStorage keys apart from production and previous QA",()=>{
 assert.match(qa,/const key="sns-post-manager-qa-free-ai-v40"/);
 assert.match(qa,/const historyKey="sns-post-manager-history-qa-free-ai-v40"/);
 assert.match(qa,/const referenceKey="sns-post-manager-references-qa-free-ai-v40"/);
 assert.match(formatter,/const formatSettingsKey38="sns-post-manager-format-settings-qa-free-ai-v40"/);
 assert.ok(qa.indexOf('id="todaySection"')<qa.indexOf('id="freeAi40Panel"'));
});
test("Only public endpoint and captcha sitekey may be entered by QA; secrets stay on Worker",()=>{
 assert.doesNotMatch(client,/x-goog-api-key|GEMINI_API_KEY|TURNSTILE_SECRET/);
 assert.doesNotMatch(qa,/id="GeminiApiKey"|id="secretApiKey"/);
 assert.match(backend,/env\.GEMINI_API_KEY/);
 assert.match(backend,/env\.TURNSTILE_SECRET/);
 assert.equal(config.secrets.required.includes("GEMINI_API_KEY"),true);
 assert.equal(config.secrets.required.includes("TURNSTILE_SECRET"),true);
 assert.equal(config.ratelimits.length,2);
});
test("The generated posts must flow into existing review, never direct persist",()=>{
 assert.match(client,/input\.value=JSON\.stringify\(data\.posts\)/);
 assert.match(client,/importPosts\(\)/);
 assert.match(client,/if\(pendingImport===null\)/);
 assert.doesNotMatch(client,/localStorage\.setItem|persist\(\)|posts\.push\(/);
});
test("Free AI sends no user's old posts, history, or reference library upstream",()=>{
 const send=client.slice(client.indexOf('body:JSON.stringify({'),client.indexOf('signal:AbortSignal'));
 assert.doesNotMatch(send,/\bhistory\b|\breferences\b|\bposts\b/);
 assert.match(qa,/Googleのサービス改善/);
});

test("iPhone deployment workflow requires explicit manual consent and all four private secrets",()=>{
 const yml=fs.readFileSync(".github/workflows/free-ai-v40-manual-deploy.yml","utf8");
 const disabled=fs.readFileSync("free-ai-v40/bootstrap-disabled.mjs","utf8");
 const bootstrap=JSON.parse(fs.readFileSync("free-ai-v40/wrangler.bootstrap.json","utf8"));
 assert.match(yml,/workflow_dispatch:/);
 assert.doesNotMatch(yml,/\n  push:|\n  schedule:|\n  pull_request:/);
 assert.match(yml,/inputs\.approval == 'DEPLOY_FREE_BETA'/);
 for(const secret of ["CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID","GEMINI_API_KEY","TURNSTILE_SECRET"]){
  assert.match(yml,new RegExp("secrets\\."+secret));
  assert.match(yml,new RegExp("test -n.*"+secret));
 }
 assert.match(yml,/wrangler@4 deploy --config wrangler\.bootstrap\.json/);
 assert.match(yml,/wrangler@4 deploy --config wrangler\.json/);
 assert.match(disabled,/status:503/);
 assert.equal(bootstrap.main,"bootstrap-disabled.mjs");
 assert.equal(bootstrap.name,JSON.parse(fs.readFileSync("free-ai-v40/wrangler.json","utf8")).name);
 assert.doesNotMatch(disabled,/GEMINI_API_KEY|x-goog-api-key|generativelanguage\.googleapis/);
});

test("Operator setup is iPhone readable and never requests storing API secrets in the web app",()=>{
 assert.match(setup,/<meta name="viewport"/);
 assert.match(setup,/Google AI Studio/);
 assert.match(setup,/Cloudflare/);
 assert.match(setup,/Turnstile/);
 assert.match(setup,/18歳|無料/);
 assert.match(setup,/free-ai-v40\/wrangler\.json/);
 assert.match(setup,/sns-post-manager-free-ai-v40-onboarding-checks/);
 assert.match(setup,/qa-free-ai-v40\.html\?v=401/);
 assert.doesNotMatch(setup,/<input[^>]+(?:GEMINI_API_KEY|TURNSTILE_SECRET)/);
 assert.doesNotMatch(setup,/localStorage\.setItem\([^,]+,\s*(?:apiKey|secret)/);
});
test("iPhone QA remembers public endpoint and sitekey only, and can forget them",()=>{
 assert.match(client,/freeAi40PublicConfigKey="sns-post-manager-free-ai-v40-qa-public-config"/);
 assert.match(client,/freeAi40LoadPublicConfig/);
 assert.match(client,/freeAi40ClearPublicConfig/);
 assert.match(qa,/onclick="freeAi40ClearPublicConfig\(\)"/);
 assert.match(qa,/free-ai-v40-setup\.html/);
 assert.doesNotMatch(client,/localStorage\.setItem\([^,]+,\s*(?:env|apiKey|secretKey)/);
});

test("Cloudflare config must have globally durable, free SQLite quota not a region-only rate limiter",()=>{
 assert.equal(config.main,"runtime.mjs");
 assert.deepEqual(config.durable_objects.bindings,[{name:"DAILY_BUDGET",class_name:"GlobalDailyBudget"}]);
 assert.deepEqual(config.exports.GlobalDailyBudget,{type:"durable-object",storage:"sqlite"});
 assert.match(runtime,/extends DurableObject/);
 assert.match(runtime,/reserveDailyQuota\(this\.ctx\.storage\)/);
 assert.match(backend,/DAILY_BUDGET\.getByName\("free-ai-global-daily-v40"\)\.reserve\(\)/);
 assert.match(backend,/budget\.allowed!==true/);
 assert.match(dailyQuota,/MAX_PUBLIC_DAILY_GENERATIONS = 12/);
 assert.match(backend,/gemini-3\.5-flash-lite/);
 assert.match(backend,/gemini-3\.1-flash-lite/);
});

test("iPhone connection confirmation checks Worker health without sending texts or charging free AI quota",()=>{
 assert.match(client,/async function freeAi40Connect\(/);
 assert.match(client,/new URL\("\/health",url\)/);
 assert.match(client,/data\.ready!==true/);
 assert.match(backend,/path==="\/health"&&request\.method==="GET"/);
 assert.match(backend,/ready,freeOnly:true,dailyLimit:12/);
 const between=backend.slice(backend.indexOf('if(path==="/health"'),backend.indexOf('if(path!=="/generate"'));
 assert.doesNotMatch(between,/generativelanguage\.googleapis\.com|GEMINI_API_KEY\]/);
});
