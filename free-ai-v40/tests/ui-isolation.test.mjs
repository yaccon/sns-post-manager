import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const prod=fs.readFileSync("index.html","utf8");
const qa=fs.readFileSync("qa-free-ai-v40.html","utf8");
const client=fs.readFileSync("free-ai-v40/client.js","utf8");
const formatter=fs.readFileSync("free-ai-v40/postformat40-qa.js","utf8");
const backend=fs.readFileSync("free-ai-v40/worker.mjs","utf8");
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
