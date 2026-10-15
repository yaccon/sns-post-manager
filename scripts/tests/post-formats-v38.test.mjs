import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync("index.html","utf8");
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const formatScript=fs.readFileSync("postformat38.js","utf8");
const historyScript=fs.readFileSync("history342.js","utf8");
const importScript=fs.readFileSync("import34.js","utf8");
const refScript=fs.readFileSync("references37.js","utf8");
assert.ok(inline,"index.html inline script must exist");

class MockEl {
 constructor(tag="div"){
  this.tagName=tag.toLowerCase();this.value="";this.textContent="";this.hidden=false;this.open=false;
  this.children=[];this.parent=null;this.style={};this.dataset={};this.disabled=false;
  this.className="";this.onclick=null;this.files=[];this.checked=false;this.listeners={};
  this.href="";this.download="";this.rows=0;this.type="";
 }
 append(...items){for(const item of items)this.appendChild(item)}
 appendChild(el){el.parent=this;this.children.push(el);return el}
 replaceChildren(...items){this.children=[];this.append(...items)}
 querySelectorAll(selector){
  const matches=[];
  for(const child of this.children){
   if(selector==="textarea"&&child.tagName==="textarea")matches.push(child);
   matches.push(...child.querySelectorAll(selector));
  }
  return matches;
 }
 setAttribute(name,v){if(name==="open")this.open=true;else this[name]=v}
 removeAttribute(name){if(name==="open")this.open=false;else delete this[name]}
 focus(){}select(){}scrollIntoView(){}setSelectionRange(){}
 addEventListener(name,fn){this.listeners[name]=fn}
 removeEventListener(name){delete this.listeners[name]}
 showModal(){this.open=true}close(){this.open=false}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 click(){this.onclick?.()}
}
function boot(storage=new Map(),options={}){
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,new MockEl());return elements.get(id)};
 for(const [key] of [["sns-post-manager-v1"],["sns-post-manager-history-v1"],["sns-post-manager-references-v1"]]){
  if(!storage.has(key))storage.set(key,"[]");
 }
 const downloads=[],blobs=new Map();
 class TestURL extends URL {}
 TestURL.createObjectURL=blob=>{const id="blob:"+blobs.size;blobs.set(id,blob);return id};
 TestURL.revokeObjectURL=()=>{};
 const document={
  getElementById:get,
  createElement:tag=>{const el=new MockEl(tag);if(tag==="a")el.click=()=>downloads.push({name:el.download,blob:blobs.get(el.href)});return el},
  body:new MockEl("body"),hidden:false,addEventListener(){},
  execCommand:name=>name==="copy"&&options.copyFailure!==true
 };
 const ctx=vm.createContext({
  document,
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  window:{isSecureContext:options.copyFailure!==true,open(){}},
  navigator:{clipboard:{writeText:options.copyFailure?async()=>{throw Error("denied")}:async()=>{}}},
  Date,Intl,URL:TestURL,Blob,console,setInterval(){},setTimeout(){return 1},clearTimeout(){}
 });
 vm.runInContext(inline,ctx,{filename:"index.html"});
 // In the browser, format module runs before the older history and references scripts.
 vm.runInContext(formatScript,ctx,{filename:"postformat38.js"});
 vm.runInContext(historyScript,ctx,{filename:"history342.js"});
 vm.runInContext(importScript,ctx,{filename:"import34.js"});
 get("refFilter37").value="すべて";
 vm.runInContext(refScript,ctx,{filename:"references37.js"});
 get("destination").value="X";get("generationBatch").value="kai";get("platform").value="X";
 get("weekstart").value="2026-10-26";
 const run=expression=>vm.runInContext(expression,ctx,{timeout:10000});
 const posts=()=>JSON.parse(storage.get("sns-post-manager-v1")||"[]");
 const prefs=()=>JSON.parse(storage.get("sns-post-manager-format-settings-v1")||"{}");
 const confirm=async ok=>{
  for(let i=0;i<9&&!get("actionDialog35").open;i++)await Promise.resolve();
  assert.equal(get("actionDialog35").open,true,"must display the in-app confirmation");
  (ok===false?get("actionCancel35"):get("actionOk35")).onclick();
 };
 const seed=(arr)=>{storage.set("sns-post-manager-v1",JSON.stringify(arr))};
 return {ctx,run,get,posts,prefs,storage,downloads,confirm,seed};
}
function apply(a,changes){
 for(const [key,value]of Object.entries(changes))a.get(key).value=String(value);
 a.run("formatSelectionChanged38()");
}
function slots(account="カイ"){
 return Array.from({length:14},(_,i)=>{
  const d=new Date("2026-10-26T12:00:00.000Z");d.setUTCDate(d.getUTCDate()+Math.floor(i/2));
  return {account,platform:"X",date:d.toISOString().slice(0,10)+"T"+(i%2?"20:00":"12:00")};
 });
}
function threadBatch(count=3){
 return slots().map((slot,i)=>{
  const parts=Array.from({length:count},(_,j)=>"題材"+String(i+1)+"の"+String(j+1)+"本目："+String.fromCodePoint(0x4e00+i*87+j*3).repeat(28));
  return {...slot,postFormat:"thread",content:parts[0],threadParts:parts};
 });
}
async function importBatch(a,arr){
 a.get("jsonImport").value=JSON.stringify(arr);
 a.run("importPosts()");
 assert.match(a.get("importStatus").textContent,/確認結果：/);
 const op=a.run("finishImport()");
 await a.confirm(true);
 await op;
}

test("v3.8 files parse, current Today card is first and production keys are unchanged",()=>{
 for(const s of [inline,formatScript,historyScript,refScript,importScript])assert.doesNotThrow(()=>new vm.Script(s));
 assert.match(html,/SNS投稿管理 Ver\.3\.8/);
 assert.ok(html.indexOf('id="todaySection"')<html.indexOf('id="xFormatPanel38"'));
 assert.ok(html.indexOf('id="todaySection"')<html.indexOf('id="referenceLibrary37"'));
 assert.match(html,/const key="sns-post-manager-v1"/);
 assert.match(html,/const historyKey="sns-post-manager-history-v1"/);
 assert.match(html,/const referenceKey="sns-post-manager-references-v1"/);
 assert.match(html,/postformat38\.js\?v=38/);
 assert.doesNotMatch(html,/fillReferenceSample37\(/);
});
test("settings persist until changed; reload never alters existing post statuses or history",()=>{
 const data=[
  {id:"old",account:"カイ",platform:"X",date:"2026-10-26T12:00",content:"既存の投稿文",done:true},
  {id:"old2",account:"漫画・恋愛",platform:"Threads",date:"2026-10-26T20:00",content:"別の投稿",done:false}
 ];
 const history=[{account:"カイ",platform:"X",content:"過去の投稿文"}];
 const store=new Map([["sns-post-manager-v1",JSON.stringify(data)],["sns-post-manager-history-v1",JSON.stringify(history)]]);
 const a=boot(store);
 const beforePosts=store.get("sns-post-manager-v1"),beforeHist=store.get("sns-post-manager-history-v1");
 assert.equal(a.get("xFormat38").value,"single");
 assert.equal(a.get("xTarget38").value,"120");
 apply(a,{xFormat38:"thread",xTarget38:"100",threadCount38:"4"});
 assert.equal(a.prefs().xFormat,"thread");
 assert.equal(a.prefs().threadCount,4);
 const b=boot(store);
 assert.equal(b.get("xFormat38").value,"thread");
 assert.equal(b.get("xTarget38").value,"100");
 assert.equal(b.get("threadCount38").value,"4");
 assert.equal(b.get("threadCountGroup38").hidden,false);
 assert.equal(store.get("sns-post-manager-v1"),beforePosts);
 assert.equal(store.get("sns-post-manager-history-v1"),beforeHist);
 assert.equal(b.posts()[0].done,true);
});
test("Threads shows its own previous single behavior without destroying X settings",()=>{
 const a=boot();
 apply(a,{xFormat38:"premium",premiumTarget38:"1500"});
 a.get("destination").value="Threads";
 a.run("refreshFormatUi38()");
 assert.equal(a.get("xFormatPanel38").hidden,true);
 a.run("generatePrompt()");
 assert.match(a.get("copyField356").value,/Threadsの通常投稿1本/);
 a.get("destination").value="X";a.run("refreshFormatUi38()");
 assert.equal(a.get("xFormatPanel38").hidden,false);
 assert.equal(a.get("xFormat38").value,"premium");
});
test("weighted length recognizes 280 limit, Japanese, Latin, URL and joined emoji",()=>{
 const a=boot();
 assert.equal(a.run("xWeightedLength38('あ'.repeat(140))"),280);
 assert.equal(a.run("xWeightedLength38('あ'.repeat(141))"),282);
 assert.equal(a.run("xWeightedLength38('a'.repeat(280))"),280);
 assert.equal(a.run("xWeightedLength38('https://example.com/')"),23);
 assert.equal(a.run("xWeightedLength38('👨‍👩‍👧‍👦')"),2);
 assert.equal(a.run("xWeightedLength38('こんにちは')"),10);
 assert.equal(a.run("xWeightedLength38('αβγ')"),3);
});
test("single mode generates 14-slot instruction with target, no thread array",()=>{
 const a=boot();
 a.run("generatePrompt()");
 const text=a.get("copyField356").value;
 assert.match(text,/次の14枠/);
 assert.match(text,/日本語で約120文字/);
 assert.match(text,/280以内/);
 assert.match(text,/threadPartsは含めない/);
 assert.equal(a.get("todayPosts").children.length,1,"still shows today's blank state");
});
test("thread mode generates a 14-slot instruction requesting exact parts but not extra scheduled slots",()=>{
 const a=boot();
 apply(a,{xFormat38:"thread",threadCount38:"3"});
 a.run("generatePrompt()");
 const text=a.get("copyField356").value;
 assert.match(text,/次の14枠/);
 assert.match(text,/各枠3投稿分/);
 assert.match(text,/threadParts/);
 assert.match(text,/content:threadParts\[0\]/);
});
test("Premium mode requests longer text and preserves Premium mode after another reload",()=>{
 const store=new Map(),a=boot(store);
 apply(a,{xFormat38:"premium",premiumTarget38:"800"});
 a.run("generatePrompt()");
 assert.match(a.get("copyField356").value,/X Premium向け長文/);
 assert.match(a.get("copyField356").value,/800文字/);
 assert.equal(boot(store).get("xFormat38").value,"premium");
});
test("single/long/thread import rejects invalid format, oversized parts or mismatched count",()=>{
 const a=boot();
 const base=slots()[0];
 a.get("jsonImport").value=JSON.stringify(slots().map((s,i)=>({...s,content:"あ".repeat(141)+i})));
 a.run("importPosts()");
 assert.match(a.get("importStatus").textContent,/280カウント/);
 assert.equal(a.posts().length,0);
 apply(a,{xFormat38:"thread",threadCount38:"3"});
 a.get("jsonImport").value=JSON.stringify(slots().map((s,i)=>({...s,content:"一段目"+i,threadParts:["一段目","二段目"]})));
 a.run("importPosts()");
 assert.match(a.get("importStatus").textContent,/3本/);
 const batch=threadBatch();
 batch[0].threadParts[2]="あ".repeat(141);
 a.get("jsonImport").value=JSON.stringify(batch);
 a.run("importPosts()");
 assert.match(a.get("importStatus").textContent,/3本目がXの上限/);
 assert.equal(a.posts().length,0);
});
test("14 scheduled slots hold 3 thread posts apiece and copy each part separately",async()=>{
 const a=boot();
 apply(a,{xFormat38:"thread",threadCount38:"3"});
 const batch=threadBatch();
 await importBatch(a,batch);
 assert.equal(a.posts().length,14);
 const first=a.posts()[0];
 assert.equal(first.threadParts.length,3);
 assert.equal(first.postFormat,"thread");
 assert.equal(first.done,false);
 assert.ok(Array.isArray(first.threadCopied));
 assert.equal(first.threadCopied.filter(Boolean).length,0);
 a.run("copyThreadPart38("+JSON.stringify(first.id)+",1)");
 const after=a.posts().find(p=>p.id===first.id);
 assert.equal(after.threadCopied[0],false);
 assert.equal(after.threadCopied[1],true);
 assert.equal(after.threadCopied[2],false);
 a.run("toggleDone("+JSON.stringify(first.id)+")");
 assert.equal(a.posts().find(p=>p.id===first.id).done,true);
 assert.equal(a.posts().length,14,"marking thread done does not expand the scheduled count");
});
test("X thread drafts can be entered manually as separate parts with 280 validation",async()=>{
 const a=boot();
 apply(a,{xFormat38:"thread",threadCount38:"3"});
 a.get("platform").value="X";a.run("refreshManualThread38()");
 const list=a.get("manualThreadParts38").querySelectorAll("textarea");
 assert.equal(list.length,3);
 list[0].value="スレッド一段目の投稿本文";
 list[1].value="スレッド二段目の投稿本文";
 list[2].value="スレッド三段目の投稿本文";
 a.get("account").value="カイ";a.get("date").value="2026-10-23T12:00";
 await a.run("savePost()");
 assert.equal(a.posts().length,1);
 assert.deepEqual(a.posts()[0].threadParts,list.map((_,i)=>["スレッド一段目の投稿本文","スレッド二段目の投稿本文","スレッド三段目の投稿本文"][i]));
 assert.equal(list.every(x=>!x.value),true);
});
test("thread edit preserves number of parts, validates, resets copied progress",async()=>{
 const stored={id:"thread-old",account:"カイ",platform:"X",date:"2026-10-26T12:00",done:false,postFormat:"thread",
  content:"一回目\n\n二回目\n\n三回目",threadParts:["一回目","二回目","三回目"],threadCopied:[true,true,true]};
 const a=boot(new Map([["sns-post-manager-v1",JSON.stringify([stored])]]));
 a.run('editPost("thread-old")');
 assert.match(a.get("editField35").value,/===/);
 a.get("editField35").value="修正した一回目\n===\n修正した二回目\n===\n修正した三回目";
 await a.run("saveEdit35()");
 assert.equal(a.posts()[0].threadParts[1],"修正した二回目");
 assert.equal(a.posts()[0].threadCopied.filter(Boolean).length,0);
});
test("initial load renders previously saved thread cards and keeps Today first",()=>{
 const a0=boot();const today=a0.run("v33LocalToday()");
 const post={id:"today-thread",account:"カイ",platform:"X",date:today+"T12:00",content:"一\n\n二\n\n三",postFormat:"thread",threadParts:["一","二","三"],threadCopied:[true,false,false],done:false};
 const a=boot(new Map([["sns-post-manager-v1",JSON.stringify([post])]]));
 assert.equal(a.get("todayPosts").children.length,1);
 const card=a.get("todayPosts").children[0];
 assert.equal(card.className,"today-post");
 const thread=card.children.find(c=>c.className==="thread-parts38");
 assert.ok(thread);
 assert.equal(thread.children.filter(c=>c.className==="thread-part38").length,3);
 assert.match(thread.children[1].children[0].children[1].textContent,/コピー済み/);
});
test("full backup v6 includes preferences and imported thread data",async()=>{
 const a=boot();
 apply(a,{xFormat38:"thread",threadCount38:"3"});
 const p={id:"thread3",account:"カイ",platform:"X",date:"2026-10-26T12:00",content:"あ\n\nい\n\nう",threadParts:["あ","い","う"],threadCopied:[true,false,true],postFormat:"thread",done:false};
 const beforePosts=a.storage.get("sns-post-manager-v1");
 a.run("posts.push("+JSON.stringify(p)+");persist()");
 a.run("exportBackup()");
 const backup=JSON.parse(await a.downloads[0].blob.text());
 assert.equal(backup.version,6);
 assert.equal(backup.formatSettings.xFormat,"thread");
 assert.equal(backup.formatSettings.threadCount,3);
 assert.equal(backup.posts[0].threadCopied[0],true);
 const restoreTarget=boot();
 const content=JSON.stringify(backup);
 const work=restoreTarget.ctx.restoreBackup({target:{files:[{name:"backup.json",size:content.length,text:async()=>content}],value:"x"}});
 await restoreTarget.confirm(true);await work;
 assert.equal(restoreTarget.get("xFormat38").value,"thread");
 assert.equal(restoreTarget.posts()[0].threadParts.length,3);
 assert.equal(restoreTarget.posts()[0].threadCopied[2],true);
 assert.equal(a.storage.get("sns-post-manager-v1")!==beforePosts,true);
});
test("old v3.7 backup does not erase the currently selected posting format",async()=>{
 const a=boot();
 apply(a,{xFormat38:"premium",premiumTarget38:"3000"});
 const content=JSON.stringify({version:5,posts:[],history:[],references:[]});
 const work=a.ctx.restoreBackup({target:{files:[{name:"old.json",size:content.length,text:async()=>content}],value:"old"}});
 await a.confirm(true);await work;
 assert.equal(a.get("xFormat38").value,"premium");
 assert.equal(a.prefs().premiumTarget,"3000");
});
test("isolated iPhone QA page has its own four storage keys, samples, and Today first",()=>{
 const qa=fs.readFileSync("qa-post-format-v38.html","utf8");
 const helper=fs.readFileSync("postformat38-qa.js","utf8");
 assert.match(qa,/SNS投稿管理 Ver\.3\.8 テスト版/);
 assert.ok(qa.indexOf('id="todaySection"')<qa.indexOf('id="xFormatPanel38"'));
 assert.match(qa,/const key="sns-post-manager-qa-v38"/);
 assert.match(qa,/const historyKey="sns-post-manager-history-qa-v38"/);
 assert.match(qa,/const referenceKey="sns-post-manager-references-test-qa-v38"/);
 assert.match(helper,/const formatSettingsKey38="sns-post-manager-format-settings-qa-v38"/);
 assert.match(qa,/qaSeedToday38/);
 assert.match(qa,/postformat38-qa\.js\?v=381/);
 assert.doesNotMatch(qa,/const key="sns-post-manager-v1"/);
 assert.match(qa,/id="threadsTargetPanel38"/);
 assert.match(qa,/id="threadsTarget38"/);
 assert.match(qa,/id="manualThreadsCount38"/);
 assert.equal(helper.replace("sns-post-manager-format-settings-qa-v38","sns-post-manager-format-settings-v1"),formatScript);
});

test("Threads target defaults to 200 and persists independently from X across page reload",()=>{
 const store=new Map(),a=boot(store);
 assert.equal(a.prefs().threadsTarget,"200");
 apply(a,{xFormat38:"thread",xTarget38:"100",threadCount38:4});
 a.get("destination").value="Threads";
 a.run("refreshFormatUi38()");
 assert.equal(a.get("threadsTargetPanel38").hidden,false);
 assert.equal(a.get("xFormatPanel38").hidden,true);
 apply(a,{threadsTarget38:"450"});
 assert.equal(a.prefs().threadsTarget,"450");
 assert.equal(a.prefs().xTarget,"100");
 const b=boot(store);
 assert.equal(b.get("threadsTarget38").value,"450");
 assert.equal(b.get("xFormat38").value,"thread");
 assert.equal(b.get("threadCount38").value,"4");
 assert.equal(b.prefs().xTarget,"100");
 b.get("destination").value="Threads";
 b.run("refreshFormatUi38()");
 assert.equal(b.get("threadsTargetPanel38").hidden,false);
 b.run("generatePrompt()");
 assert.match(b.get("copyField356").value,/約450文字/);
 assert.match(b.get("copyField356").value,/500文字以内/);
 assert.match(b.get("copyField356").value,/10,000文字の長文添付は別機能/);
 assert.doesNotMatch(b.get("copyField356").value,/Xの加重280カウントを適用する/);
});
test("Threads normal post counts Japanese without X double-weight, rejects above 500 characters",()=>{
 const a=boot();
 assert.equal(a.run("threadsTextLength38('日本語'.repeat(10))"),30);
 assert.equal(a.run("threadsTextLength38('あ'.repeat(500))"),500);
 assert.equal(a.run("threadsTextLength38('あ'.repeat(501))"),501);
 assert.equal(a.run('validateGeneratedFormat38({content:"あ".repeat(500)},"Threads").error'),undefined);
 assert.match(a.run('validateGeneratedFormat38({content:"あ".repeat(501)},"Threads").error'),/500文字/);
 assert.equal(a.run("validateGeneratedFormat38({content:'😊'},'Threads').postFormat"),"single");
});
test("Threads batch import refuses 501-character posts and preserves old scheduled posts",()=>{
 const existing={id:"existing",account:"カイ",platform:"Threads",date:"2026-10-19T12:00",content:"旧Threads本文",done:true};
 const a=boot(new Map([["sns-post-manager-v1",JSON.stringify([existing])]]));
 a.get("destination").value="Threads";
 const arr=slots().map((x,i)=>({...x,platform:"Threads",content:"日".repeat(501)+i}));
 a.get("jsonImport").value=JSON.stringify(arr);
 a.run("importPosts()");
 assert.match(a.get("importStatus").textContent,/Threads通常投稿の500文字/);
 assert.equal(a.posts().length,1);
 assert.equal(a.posts()[0].done,true);
});
test("Threads manual editor shows 500 counter and blocks oversize text",async()=>{
 const a=boot();
 a.get("platform").value="Threads";a.run("refreshManualThread38()");
 a.get("content").value="あ".repeat(500);
 a.run("refreshManualTextCount38()");
 assert.match(a.get("manualThreadsCount38").textContent,/500\/500/);
 assert.equal(a.get("manualThreadsCount38").hidden,false);
 a.get("content").value="あ".repeat(501);
 a.run("refreshManualTextCount38()");
 assert.match(a.get("manualThreadsCount38").className,/format-over38/);
 a.get("account").value="カイ";a.get("date").value="2026-10-26T12:00";
 await a.run("savePost()");
 assert.equal(a.posts().length,0);
 assert.match(a.get("noticeMessage35").textContent,/500文字/);
});
test("Threads edit cannot exceed 500 and preserves current saved post",async()=>{
 const previous={id:"threads-edit-1",account:"後輩くん",platform:"Threads",date:"2026-10-20T12:00",content:"元の短文",done:false};
 const a=boot(new Map([["sns-post-manager-v1",JSON.stringify([previous])]]));
 a.run('editPost("threads-edit-1")');
 a.get("editField35").value="あ".repeat(501);
 await a.run("saveEdit35()");
 assert.equal(a.posts()[0].content,"元の短文");
 assert.match(a.get("noticeMessage35").textContent,/Threads通常投稿の500文字/);
});
test("Threads selection is retained in full JSON backup and restored with X settings",async()=>{
 const a=boot();
 apply(a,{xFormat38:"premium",premiumTarget38:"800",threadsTarget38:"300"});
 a.run("exportBackup()");
 const backup=JSON.parse(await a.downloads[0].blob.text());
 assert.equal(backup.formatSettings.threadsTarget,"300");
 assert.equal(backup.formatSettings.xFormat,"premium");
 const b=boot();
 const data=JSON.stringify(backup);
 const pending=b.ctx.restoreBackup({target:{files:[{name:"backup.json",size:data.length,text:async()=>data}],value:"chosen"}});
 await b.confirm(true);await pending;
 assert.equal(b.prefs().threadsTarget,"300");
 assert.equal(b.prefs().xFormat,"premium");
});
