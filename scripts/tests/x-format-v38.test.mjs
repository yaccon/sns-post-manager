import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('index.html','utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const xformat=fs.readFileSync('xformat38.js','utf8');
const refs=fs.readFileSync('references37.js','utf8');
const history=fs.readFileSync('history342.js','utf8');
const imported=fs.readFileSync('import34.js','utf8');
class El{
 constructor(){this.value='';this.textContent='';this.children=[];this.hidden=false;this.className='';this.style={};this.dataset={};this.listeners={};this.files=[];this.disabled=false;this.open=false;this.onclick=null;this.parent=null;}
 append(...kids){kids.forEach(x=>this.appendChild(x))}
 appendChild(x){x.parent=this;this.children.push(x);return x}
 replaceChildren(...kids){this.children=[];this.append(...kids)}
 querySelectorAll(){return []}
 focus(){}select(){}setSelectionRange(){}scrollIntoView(){}
 addEventListener(k,cb){this.listeners[k]=cb}
 removeEventListener(k){delete this.listeners[k]}
 showModal(){this.open=true}
 close(){this.open=false}
 setAttribute(k,v){if(k==='open')this.open=true}
 removeAttribute(k){if(k==='open')this.open=false}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 click(){this.onclick?.()}
}
function app(initialPosts=[],initialHistory=[]){
 const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id)};
 const data=new Map([['sns-post-manager-v1',JSON.stringify(initialPosts)],['sns-post-manager-history-v1',JSON.stringify(initialHistory)],['sns-post-manager-references-v1','[]']]);
 const blobs=new Map(),downloads=[];
 const document={getElementById:get,createElement:tag=>{const e=new El();if(tag==='a')e.click=()=>downloads.push({name:e.download,blob:blobs.get(e.href)});return e},body:new El(),addEventListener(){},execCommand:()=>true,hidden:false};
 const c=vm.createContext({document,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},URL:{createObjectURL(blob){const id='blob:'+blobs.size;blobs.set(id,blob);return id},revokeObjectURL(){}},navigator:{clipboard:{writeText:async()=>{}}},window:{isSecureContext:true,open(){}},Blob,Date,Intl,console,setInterval(){},setTimeout(){return 1},clearTimeout(){}});
 get('weekstart').value='2026-10-26';get('destination').value='X';
 get('generationBatch').value='kai';get('xFormat38').value='single';get('xBudget38').value='240';get('xParts38').value='3';
 get('refFilter37').value='すべて';
 get('listAccount').value='all';get('listPlatform').value='all';get('listPeriod').value='all';
 for(const [content,filename] of [[xformat,'xformat38.js'],[inline,'index.html'],[history,'history342.js'],[imported,'import34.js'],[refs,'references37.js']])vm.runInContext(content,c,{filename});
 get('weekstart').value='2026-10-26'; // App initialization sets next day; override after initialization for stable fixture dates.
 return {c,get,data,downloads,run:s=>vm.runInContext(s,c,{timeout:5000}),posts:()=>JSON.parse(data.get('sns-post-manager-v1')||'[]'),confirm:async(yes=true)=>{for(let i=0;i<7&&!get('actionDialog35').open;i++)await Promise.resolve();assert.equal(get('actionDialog35').open,true);get(yes?'actionOk35':'actionCancel35').onclick()}};
}
function batch(account='カイ',mode='single',count=14,platform='X',parts=3){
 const accounts=count===42?['カイ','後輩くん','漫画・恋愛']:[account];
 const out=[];
 let index=0;
 for(const ac of accounts)for(let day=0;day<7;day++)for(const hhmm of ['12:00','20:00']){
  index++;
  let seed=index*19173+17;let random='';
  const abc='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
  for(let k=0;k<45;k++){seed=(seed*16807)%2147483647;random+=abc[seed%abc.length]}
  const body='テストの文章'+index+'：'+random;
  const date=new Date('2026-10-26T12:00:00Z');date.setUTCDate(date.getUTCDate()+day);
  const row={account:ac,platform,date:date.toISOString().slice(0,10)+'T'+hhmm,content:body};
  if(mode==='thread')row.threadParts=Array.from({length:parts},(_,j)=>j===0?body:'続き'+(j+1)+'：'+random.slice(j*9,j*9+18)+'。番号'+index+'です。');
  out.push(row);
 }
 return out;
}
async function register(a,list){
 a.get('jsonImport').value=JSON.stringify(list);
 a.run('importPosts()');
 assert.match(a.get('importStatus38')?.textContent||a.get('importStatus').textContent,/確認結果/);
 const t=a.run('finishImport()');
 await a.confirm(true);await t;
}
test('v3.8 compiled HTML, safe standard browser keys, and independent QA page',()=>{
 for(const script of [inline,xformat,refs,history,imported])assert.doesNotThrow(()=>new vm.Script(script));
 assert.match(html,/SNS投稿管理 Ver\.3\.8/);
 assert.match(html,/const key="sns-post-manager-v1"/);
 assert.match(html,/const historyKey="sns-post-manager-history-v1"/);
 assert.match(html,/const referenceKey="sns-post-manager-references-v1"/);
 assert.match(html,/src="xformat38\.js\?v=38"/);
 const qa=fs.readFileSync('qa-x-format-v38.html','utf8');
 assert.match(qa,/sns-post-manager-test-format-v38/);
 assert.match(qa,/sns-post-manager-history-test-format-v38/);
 assert.match(qa,/sns-post-manager-references-test-format-v38/);
 assert.doesNotMatch(qa,/const key="sns-post-manager-v1"/);
 assert.match(qa,/xSampleJson38/);
});
test('X standard weighted length: Japanese 2, latin 1, emoji 2, https URL 23',()=>{
 const a=app();
 assert.equal(a.run('xWeightedLength38("あ")'),2);
 assert.equal(a.run('xWeightedLength38("abc")'),3);
 assert.equal(a.run('xWeightedLength38("あ".repeat(140))'),280);
 assert.equal(a.run('xWeightedLength38("あ".repeat(141))'),282);
 assert.equal(a.run('xWeightedLength38("https://example.com")'),23);
 assert.equal(a.run('xWeightedLength38("a😀")'),3);
});
test('UI selects single, thread 2–5 segments, and hides X format for Threads',()=>{
 const a=app();
 assert.match(a.get('xFormatSummary38').textContent,/単発投稿/);
 a.get('xFormat38').value='thread';a.get('xParts38').value='5';a.run('xUpdateFormat38()');
 assert.equal(a.get('xThreadRow38').hidden,false);
 assert.match(a.get('xFormatSummary38').textContent,/ツリー5投稿/);
 a.get('destination').value='Threads';a.run('xUpdateFormat38()');
 assert.equal(a.get('xFormatOptions38').hidden,true);
 assert.match(a.get('xFormatSummary38').textContent,/Threads/);
});
test('generation prompt clearly requests chosen single 200 and 3-part thread and keeps 14 slots',()=>{
 const a=app();
 a.get('xBudget38').value='200';
 a.run('generatePrompt()');
 let prompt=a.get('copyField356').value;
 assert.match(prompt,/次の14枠/);
 assert.match(prompt,/200ウェイト/);
 assert.match(prompt,/単発投稿1本/);
 assert.doesNotMatch(prompt,/threadPartsを必ず付け/);
 a.get('xFormat38').value='thread';a.get('xBudget38').value='240';a.get('xParts38').value='3';
 a.run('generatePrompt()');prompt=a.get('copyField356').value;
 assert.match(prompt,/ちょうど3個/);
 assert.match(prompt,/threadPartsを必ず付け/);
 assert.match(prompt,/240ウェイト/);
});
test('X single import accepts 14 posts below budget and keeps existing done post',async()=>{
 const old={id:'old',account:'カイ',platform:'X',date:'2026-10-14T12:00',content:'以前に投稿した内容',done:true};
 const a=app([old]);await register(a,batch());
 assert.equal(a.posts().length,15);
 assert.deepEqual(a.posts()[0],old);
 assert.equal(a.posts().slice(1).filter(p=>p.format38==='x-single').length,14);
});
test('single import fails long Japanese post without changing anything',()=>{
 const a=app(),entries=batch();
 entries[0].content='あ'.repeat(130); // 260 weighted chars vs 240 budget
 const original=a.data.get('sns-post-manager-v1');
 a.get('jsonImport').value=JSON.stringify(entries);
 a.run('importPosts()');
 assert.match(a.get('importStatus').textContent,/上限/);
 assert.equal(a.data.get('sns-post-manager-v1'),original);
});
test('thread format stores one schedule entry for each 3-part story',async()=>{
 const a=app();
 a.get('xFormat38').value='thread';
 await register(a,batch('カイ','thread',14,'X',3));
 assert.equal(a.posts().length,14);
 assert.equal(a.posts()[0].threadParts.length,3);
 assert.equal(a.posts()[0].format38,'x-thread');
 assert.equal(a.posts()[0].content,a.posts()[0].threadParts.join('\n\n'));
 assert.equal(a.posts()[0].done,false);
});
test('copy X thread segment individually, rather than full joined thread',async()=>{
 const a=app();a.get('xFormat38').value='thread';
 await register(a,batch('カイ','thread',14,'X',3));
 const id=a.posts()[0].id;
 a.run('xCopyPart38('+JSON.stringify(id)+',1)');
 assert.equal(a.get('copyField356').value,a.posts()[0].threadParts[1]);
 assert.match(a.get('copyTitle356').textContent,/2\/3/);
 a.run('render()');
 const list=a.get('posts');
 assert.ok(list.children.length>0);
 assert.ok(list.children[0].children.some(x=>x.className==='x-thread-list38'));
});
test('over-limit thread part rejected; wrong number of parts rejected, atomic storage',()=>{
 const a=app();a.get('xFormat38').value='thread';
 const original=a.data.get('sns-post-manager-v1');
 const large=batch('カイ','thread');
 large[0].threadParts[1]='あ'.repeat(140);
 a.get('jsonImport').value=JSON.stringify(large);a.run('importPosts()');
 assert.match(a.get('importStatus').textContent,/ツリー2投目/);
 assert.equal(a.data.get('sns-post-manager-v1'),original);
 const missing=batch('カイ','thread');
 missing[1].threadParts=['a'];
 a.get('jsonImport').value=JSON.stringify(missing);a.run('importPosts()');
 assert.match(a.get('importStatus').textContent,/3件/);
 assert.equal(a.data.get('sns-post-manager-v1'),original);
});
test('settings changes between preview and commit block registration',async()=>{
 const a=app();a.get('xFormat38').value='thread';
 a.get('jsonImport').value=JSON.stringify(batch('カイ','thread'));
 a.run('importPosts()');
 a.get('xParts38').value='4';
 await a.run('finishImport()');
 assert.match(a.get('importStatus').textContent,/入力が変更/);
 assert.equal(a.posts().length,0);
});
test('42 thread slots stay as 42 post records, not 126 standalone records',async()=>{
 const a=app();a.get('generationBatch').value='all';a.get('xFormat38').value='thread';
 await register(a,batch('カイ','thread',42));
 assert.equal(a.posts().length,42);
 assert.equal(a.posts().reduce((n,x)=>n+x.threadParts.length,0),126);
});
test('editing thread with delimiters preserves exactly 3 constrained parts',async()=>{
 const a=app();a.get('xFormat38').value='thread';
 await register(a,batch('カイ','thread'));
 const id=a.posts()[0].id;
 a.run('editPost('+JSON.stringify(id)+')');
 assert.match(a.get('editField35').value,/---/);
 a.get('editField35').value='あ'.repeat(130)+'\n\n---\n\n二番目\n\n---\n\n三番目';
 await a.run('saveEdit35()');
 assert.match(a.get('noticeMessage35').textContent,/上限超過/);
 assert.equal(a.posts()[0].threadParts[0].length<130,true);
});
test('legacy non-thread post remains editable and backed up in same JSON version',async()=>{
 const entry={id:'legacy',account:'カイ',platform:'X',date:'2026-10-18T12:00',content:'古い投稿データ',done:true};
 const a=app([entry]);
 a.run('editPost("legacy")');assert.equal(a.get('editField35').value,entry.content);
 a.run('exportBackup()');
 const json=JSON.parse(await a.downloads[0].blob.text());
 assert.equal(json.version,5);
 assert.equal(json.posts[0].done,true);
 assert.equal(json.posts[0].threadParts,undefined);
});
test('Threads input ignores X free-plan budget and continues ordinary 14 posts',async()=>{
 const a=app();a.get('destination').value='Threads';
 const items=batch('カイ','single',14,'Threads');items[0].content='あ'.repeat(300);
 await register(a,items);
 assert.equal(a.posts().length,14);
 assert.equal(a.posts()[0].format38,undefined);
});

test('sample 14 X thread JSON uses selected settings and imports as 14 scheduled stories',async()=>{
 const a=app();
 a.get('xFormat38').value='thread';a.get('xParts38').value='4';a.get('xBudget38').value='200';
 a.run('xSampleJson38()');
 const generated=JSON.parse(a.get('jsonImport').value);
 assert.equal(generated.length,14);
 assert.ok(generated.every(p=>p.threadParts.length===4&&p.platform==='X'));
 assert.equal(new Set(generated.map(p=>p.content)).size,14);
 await register(a,generated);
 assert.equal(a.posts().length,14);
 assert.ok(a.posts().every(p=>p.threadParts.length===4&&p.budget38===200));
});
test('sample 42 X single JSON imports as 42 existing slots with no duplicate overwrite',async()=>{
 const a=app();a.get('generationBatch').value='all';
 a.run('xSampleJson38()');
 const generated=JSON.parse(a.get('jsonImport').value);
 assert.equal(generated.length,42);
 assert.ok(generated.every(p=>!p.threadParts));
 await register(a,generated);
 assert.equal(a.posts().length,42);
 assert.equal(new Set(a.posts().map(p=>p.account+'|'+p.date)).size,42);
});
