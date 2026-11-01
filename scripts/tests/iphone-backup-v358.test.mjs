import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('qa-iphone-backup-v358.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js,'app inline JS should exist');

class Element {
 constructor(){this.value='';this.textContent='';this.dataset={};this.style={};this.hidden=false;this.open=false;this.children=[];this.files=[];this.onclick=null;this.disabled=false;this.href='';this.download='';this.className='';this.listeners={};this.parent=null;}
 append(...items){this.children.push(...items)}
 appendChild(el){el.parent=this;this.children.push(el);return el}
 replaceChildren(...items){this.children=items}
 querySelectorAll(){return []}
 focus(){} select(){} setSelectionRange(){} scrollIntoView(){}
 click(){this.onclick?.()}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 setAttribute(name){if(name==='open')this.open=true}
 removeAttribute(name){if(name==='open')this.open=false}
 addEventListener(name,fn){this.listeners[name]=fn}
 removeEventListener(name){delete this.listeners[name]}
 showModal(){this.open=true}
 close(){this.open=false}
}
function app(){
 const elems=new Map();const byId=id=>{if(!elems.has(id))elems.set(id,new Element());return elems.get(id)};
 const store=new Map(), downloads=[],urls=new Map();
 const api={
   createObjectURL(blob){const key='blob:backup-'+urls.size;urls.set(key,blob);return key},
   revokeObjectURL(){},
 };
 const document={getElementById:byId,createElement(tag){
  const e=new Element();if(tag==='a')e.click=()=>downloads.push({download:e.download,blob:urls.get(e.href)});return e;
 },body:new Element(),addEventListener(){},execCommand(){return true}};
 const c=vm.createContext({document,localStorage:{
  getItem:k=>store.get(k)??null,
  setItem:(k,v)=>store.set(k,String(v)),
  removeItem:k=>store.delete(k)},
  window:{isSecureContext:true,open(){}},navigator:{clipboard:{writeText:async()=>{}}},
  Blob,URL:api,Date,Intl,console,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0
 });
 vm.runInContext(js,c);
 const run=str=>vm.runInContext(str,c,{timeout:5000});
 const posts=()=>JSON.parse(store.get('sns-post-manager-test-backup-v358')||'[]');
 const history=()=>JSON.parse(store.get('sns-post-manager-history-test-backup-v358')||'[]');
 const performRestore=async(payload,accept=true,name='qa-backup.json')=>{
  const fakeFile={name,size:payload.length,text:async()=>payload};
  const target={files:[fakeFile],value:'chosen'};
  const promise=c.restoreBackup({target});
  // file.text awaits a microtask before opening custom confirmation
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  if(byId('actionDialog35').open){
   (accept?byId('actionOk35'):byId('actionCancel35')).onclick();
  }
  await promise;
  return target;
 };
 return {c,run,byId,store,downloads,urls,posts,history,performRestore};
}
test('backup QA page parses and stays isolated from existing production/testing data',()=>{
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(html,/Ver\.3\.5\.8/);
 assert.match(html,/sns-post-manager-test-backup-v358/);
 assert.doesNotMatch(html,/const key="sns-post-manager-v1"/);
 assert.doesNotMatch(html,/\b(?:alert|confirm|prompt)\s*\(/);
});
test('seeding creates two unposted and one posted, including identical cross-platform text',()=>{
 const a=app();a.run('seedBackupTest358()');
 assert.equal(a.posts().length,3);
 assert.equal(a.history().length,3);
 assert.equal(a.posts().filter(p=>p.done).length,1);
 assert.equal(a.posts()[0].content,a.posts()[1].content);
 assert.deepEqual(a.posts().map(p=>p.platform),['X','Threads','X']);
 a.run('seedBackupTest358()');
 assert.equal(a.posts().length,3,'repeat seed cannot overwrite');
});
test('export JSON includes all posts, history, done flags, and download starts',async()=>{
 const a=app();a.run('seedBackupTest358()');
 a.run('exportBackup()');
 assert.equal(a.downloads.length,1);
 assert.match(a.downloads[0].download,/^sns-QA-v358-backup-\d{4}-\d\d-\d\d\.json$/);
 const json=JSON.parse(await a.downloads[0].blob.text());
 assert.equal(json.version,4);
 assert.equal(json.posts.length,3);
 assert.equal(json.history.length,3);
 assert.equal(json.posts.filter(p=>p.done).length,1);
 assert.match(a.byId('backupStatus').textContent,/ファイル/);
});
test('deleting a post and restoring backup recovers it and prevents repeat duplicates',async()=>{
 const a=app();a.run('seedBackupTest358()');a.run('exportBackup()');
 const raw=await a.downloads[0].blob.text();
 const deletedId=a.posts()[1].id;
 const deletion=a.c.deletePost(deletedId);
 assert.equal(a.byId('actionDialog35').open,true);
 a.byId('actionOk35').onclick();await deletion;
 assert.equal(a.posts().length,2);
 assert.equal(a.history().length,3,'deletion intentionally retains history');
 const fileInput=await a.performRestore(raw);
 assert.equal(fileInput.value,'','allows selecting the same JSON again');
 assert.equal(a.posts().length,3);
 assert.equal(a.history().length,3);
 assert.equal(a.posts().find(p=>p.id===deletedId).done,true,'restores posted status');
 assert.match(a.byId('backupStatus').textContent,/投稿予定 1件/);
 await a.performRestore(raw);
 assert.equal(a.posts().length,3);
 assert.equal(a.history().length,3);
 assert.match(a.byId('backupStatus').textContent,/投稿予定 0件、過去投稿履歴 0件/);
});
test('restore cancel and malformed JSON do not alter existing data',async()=>{
 const a=app();a.run('seedBackupTest358()');a.run('exportBackup()');
 const raw=await a.downloads[0].blob.text();
 const oldPost=JSON.stringify(a.posts()),oldHistory=JSON.stringify(a.history());
 await a.performRestore(raw,false);
 assert.equal(JSON.stringify(a.posts()),oldPost);
 await a.performRestore('{not valid json');
 assert.equal(JSON.stringify(a.posts()),oldPost);
 assert.equal(JSON.stringify(a.history()),oldHistory);
 assert.match(a.byId('backupStatus').textContent,/復元できません/);
});
test('backup export and restore preserve compatibility with older version 4 file',async()=>{
 const a=app();a.run('seedBackupTest358()');
 const old={version:4,posts:a.posts(),history:a.history()};
 await a.performRestore(JSON.stringify(old));
 assert.equal(a.posts().length,3);
 assert.equal(a.history().length,3);
});
