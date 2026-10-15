import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const hist=fs.readFileSync('history342.js','utf8');
const files=fs.readFileSync('import34.js','utf8');
const refScript=fs.readFileSync('references37.js','utf8');
assert.ok(js,'production HTML must contain app JS');
class Element {
 constructor(){this.value='';this.textContent='';this.style={};this.hidden=false;this.open=false;this.children=[];this.dataset={};this.files=[];this.disabled=false;this.onclick=null;this.listeners={};this.href='';this.download='';this.className='';this.parent=null;}
 append(...children){for(const x of children)this.appendChild(x)}
 appendChild(child){child.parent=this;this.children.push(child);return child}
 replaceChildren(...items){this.children=[];this.append(...items)}
 querySelectorAll(){return []}
 focus(){}select(){}setSelectionRange(){}scrollIntoView(){}
 addEventListener(n,fn){this.listeners[n]=fn}
 removeEventListener(n){delete this.listeners[n]}
 showModal(){this.open=true}
 close(){this.open=false}
 setAttribute(n){if(n==='open')this.open=true}
 removeAttribute(n){if(n==='open')this.open=false}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 click(){this.onclick?.()}
}
function app(seedPosts=[],seedHistory=[]){
 const el=new Map(),get=id=>{if(!el.has(id))el.set(id,new Element());return el.get(id)};
 const storage=new Map([['sns-post-manager-v1',JSON.stringify(seedPosts)],['sns-post-manager-history-v1',JSON.stringify(seedHistory)]]);
 const downloads=[],urls=new Map(),copies=[];
 const document={
  getElementById:get,
  createElement:tag=>{
   const e=new Element();
   if(tag==='a')e.click=()=>downloads.push({filename:e.download,blob:urls.get(e.href)});
   return e;
  },
  body:new Element(),
  addEventListener(){},
  execCommand:type=>{copies.push(type);return type==='copy'}
 };
 const ctx=vm.createContext({
  document,
  localStorage:{
   getItem:k=>storage.get(k)??null,
   setItem:(k,v)=>storage.set(k,String(v)),
   removeItem:k=>storage.delete(k)
  },
  window:{isSecureContext:true,open:()=>{}},
  navigator:{clipboard:{writeText:async()=>{}}},
  URL:{createObjectURL:blob=>{const id='blob:'+urls.size;urls.set(id,blob);return id},revokeObjectURL(){}},
  Blob,Date,Intl,console,setInterval:()=>0,setTimeout:()=>123,clearTimeout:()=>{}
 });
 vm.runInContext(js,ctx,{filename:'index.html'});
 vm.runInContext(hist,ctx,{filename:'history342.js'});
 vm.runInContext(files,ctx,{filename:'import34.js'});
 vm.runInContext(refScript,ctx,{filename:'references37.js'});
 get('weekstart').value='2026-10-26';get('destination').value='X';get('generationBatch').value='kai';
 const run=code=>vm.runInContext(code,ctx,{timeout:5000});
 const posts=()=>JSON.parse(storage.get('sns-post-manager-v1')||'[]');
 const history=()=>JSON.parse(storage.get('sns-post-manager-history-v1')||'[]');
 async function chooseDialog(yes=true){
  // Allows time for async file reads to reach the in-page dialog.
  for(let i=0;i<8&&!get('actionDialog35').open;i++)await Promise.resolve();
  assert.equal(get('actionDialog35').open,true,'application must show its own confirmation');
  (yes?get('actionOk35'):get('actionCancel35')).onclick();
 }
 return {ctx,get,storage,downloads,copies,run,posts,history,chooseDialog};
}
const accounts=['カイ','後輩くん','漫画・恋愛'];
function uniqueText(id){
 const chars='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
 let seed=(id+1)*71711;let body='';
 for(let i=0;i<115;i++){seed=(seed*16807)%2147483647;body+=chars[seed%chars.length]}
 return body;
}
function batch(account,platform,offset=0){
 return Array.from({length:14},(_,i)=>{
  const d=new Date('2026-10-26T12:00:00Z');d.setUTCDate(d.getUTCDate()+Math.floor(i/2));
  return {account,platform,date:d.toISOString().slice(0,10)+'T'+(i%2===0?'12:00':'20:00'),content:uniqueText(offset+i)};
 });
}
async function commitBatch(a,items,platform){
 a.get('destination').value=platform;a.get('jsonImport').value=JSON.stringify(items);
 a.run('importPosts()');
 assert.match(a.get('importStatus').textContent,/確認結果/);
 const action=a.run('finishImport()');
 await a.chooseDialog(true);
 await action;
}
async function loadBackup(a,content,accept=true){
 const input={files:[{name:'saved-backup.json',size:content.length,text:async()=>content}],value:'selected'};
 const pending=a.ctx.restoreBackup({target:input});
 await a.chooseDialog(accept);
 await pending;
 return input;
}

test('production candidate parses, retains original storage keys, and has no QA-only features',()=>{
 for(const chunk of [js,hist,files])assert.doesNotThrow(()=>new vm.Script(chunk));
 assert.match(html,/<title>SNS投稿管理 Ver\.3\.(?:6|7)<\/title>/);
 assert.match(html,/const key="sns-post-manager-v1"/);
 assert.match(html,/const historyKey="sns-post-manager-history-v1"/);
 assert.match(html,/id="generationBatch"/);
 assert.match(html,/id="editField35"/);
 assert.match(html,/id="copyToast357"/);
 assert.match(html,/id="chatLaunch357"/);
 assert.doesNotMatch(html,/fillTestPosts35|seedBackupTest358|fillPlatformHistoryQATest|テスト専用・サンプル投稿/);
 for(const chunk of [html,hist,files])assert.doesNotMatch(chunk,/\b(?:alert|confirm|prompt)\s*\(/);
});
test('loading prior-version storage does not overwrite, clear, or migrate it',()=>{
 const p={id:'existing',account:'カイ',platform:'X',date:'2026-10-10T12:00',content:'大切な既存の投稿',done:true};
 const h={account:'カイ',date:'2026-09-30',content:'過去の履歴（SNS不明）'};
 const a=app([p],[h]);
 assert.equal(a.storage.get('sns-post-manager-v1'),JSON.stringify([p]));
 assert.equal(a.storage.get('sns-post-manager-history-v1'),JSON.stringify([h]));
 assert.equal(a.posts()[0].done,true);
});
test('post copy and 14-post generation show acknowledgement and ChatGPT button',()=>{
 const p={id:'old',account:'カイ',platform:'X',date:'2026-10-10T12:00',content:'コピーしたい文章',done:false};
 const a=app([p]);
 a.run('copyPost("old")');
 assert.equal(a.get('copyToast357').hidden,false);
 assert.equal(a.get('copyField356').value,p.content);
 a.run('generatePrompt()');
 assert.match(a.get('copyField356').value,/次の14枠/);
 assert.equal(a.get('chatLaunch357').style.display,'block');
 assert.deepEqual(a.copies,['copy','copy']);
});
test('platform-isolated history supports X and Threads for the same text',async()=>{
 const a=app();
 a.get('pasteAccount342').value='カイ';
 const shared='同じ文章をXとThreadsに保存する操作';
 a.get('pasteHistory342').value=JSON.stringify([{account:'カイ',platform:'X',content:shared},{account:'カイ',platform:'Threads',content:shared}]);
 a.run('previewPastedHistory342()');
 assert.equal(a.run('pastePreview342.fresh.length'),2);
 const action=a.run('savePastedHistory342()');
 await a.chooseDialog(true);await action;
 assert.equal(a.history().length,2);
 assert.deepEqual(a.history().map(p=>p.platform).sort(),['Threads','X']);
});
test('legacy unknown-platform history remains intact after a new post is saved',()=>{
 const legacy={account:'カイ',content:'以前の登録で投稿先が不明',date:'2026-10-01'};
 const a=app([],[legacy]);
 a.get('account').value='カイ';a.get('platform').value='X';
 a.get('date').value='2026-10-26T12:00';a.get('content').value=legacy.content;
 a.run('savePost()');
 assert.equal(a.history().length,2);
 assert.deepEqual(a.history()[0],legacy);
});
test('three 14-post imports append without overwriting previous entries',async()=>{
 const old={id:'keep',account:'カイ',platform:'X',date:'2026-10-20T20:00',content:'公開済みの既存投稿',done:true};
 const a=app([old]);
 for(let i=0;i<3;i++)await commitBatch(a,batch(accounts[i],'X',i*50),'X');
 assert.equal(a.posts().length,43);
 assert.deepEqual(a.posts()[0],old);
 assert.equal(a.posts().filter(p=>p.done).length,1);
 assert.equal(a.posts().filter(p=>p.account==='後輩くん').length,14);
});
test('42-post import on another SNS adds all and preserves X history',async()=>{
 const a=app();
 const all=accounts.flatMap((n,i)=>batch(n,'Threads',i*45));
 await commitBatch(a,all,'Threads');
 assert.equal(a.posts().length,42);
 assert.equal(a.history().length,42);
 await commitBatch(a,all,'Threads').catch(()=>{});
 assert.equal(a.posts().length,42,'re-import does not double register');
});
test('malformed JSON and 13-item batches do not write to the browser',()=>{
 const a=app(),before=a.storage.get('sns-post-manager-v1');
 a.get('jsonImport').value='{bad';a.run('importPosts()');
 assert.match(a.get('importStatus').textContent,/JSON形式/);
 a.get('jsonImport').value=JSON.stringify(batch('カイ','X').slice(0,13));
 a.run('importPosts()');
 assert.match(a.get('importStatus').textContent,/14本・28本・42本/);
 assert.equal(a.storage.get('sns-post-manager-v1'),before);
});
test('backup export + restore restores deleted posted item; repeat restore adds zero',async()=>{
 const old={id:'old',account:'カイ',platform:'X',date:'2026-10-26T12:00',content:'復元する投稿A',done:true};
 const second={id:'second',account:'カイ',platform:'Threads',date:'2026-10-26T20:00',content:'復元する投稿A',done:false};
 const a=app([old,second]);
 a.run('exportBackup()');
 assert.equal(a.downloads.length,1);
 const data=JSON.parse(await a.downloads[0].blob.text());
 assert.equal(data.posts.length,2);
 assert.equal(data.posts[0].done,true);
 assert.ok(Array.isArray(data.history));
 const del=a.run('deletePost("old")');await a.chooseDialog(true);await del;
 assert.equal(a.posts().length,1);
 await loadBackup(a,JSON.stringify(data));
 assert.equal(a.posts().length,2);
 assert.equal(a.posts().find(x=>x.id==='old').done,true);
 await loadBackup(a,JSON.stringify(data));
 assert.equal(a.posts().length,2);
 assert.match(a.get('backupStatus').textContent,/投稿予定 0件、過去投稿履歴 0件/);
});
test('canceling restore and invalid JSON preserve existing bytes',async()=>{
 const p={id:'base',account:'カイ',platform:'X',date:'2026-10-26T12:00',content:'残すデータ',done:false};
 const a=app([p]);const before=a.storage.get('sns-post-manager-v1');
 await loadBackup(a,JSON.stringify({version:4,posts:[{...p,id:'new'}],history:[]}),false);
 assert.equal(a.storage.get('sns-post-manager-v1'),before);
 const file={target:{files:[{name:'broken.json',size:4,text:async()=>'{bad'}],value:'file'}};
 await a.ctx.restoreBackup(file);
 assert.equal(a.storage.get('sns-post-manager-v1'),before);
});
test('storage quota failure rolls back both production storage entries',()=>{
 const a=app();
 a.get('account').value='カイ';a.get('platform').value='X';a.get('content').value='失敗しても残らない新規文章';a.get('date').value='2026-10-26T12:00';
 const originalPosts=a.storage.get('sns-post-manager-v1'),originalHistory=a.storage.get('sns-post-manager-history-v1');
 const orig=a.ctx.localStorage.setItem;let fail=true;
 a.ctx.localStorage.setItem=(k,v)=>{if(k==='sns-post-manager-history-v1'&&fail){fail=false;throw Error('quota')}orig(k,v)};
 a.run('savePost()');
 assert.equal(a.storage.get('sns-post-manager-v1'),originalPosts);
 assert.equal(a.storage.get('sns-post-manager-history-v1'),originalHistory);
 assert.equal(a.run('posts.length'),0);
});
