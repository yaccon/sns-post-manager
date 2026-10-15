import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const library=fs.readFileSync('references37.js','utf8');
const historyJs=fs.readFileSync('history342.js','utf8');
const importerJs=fs.readFileSync('import34.js','utf8');
const xScript=fs.readFileSync('xformat38.js','utf8');
assert.ok(inline);

class El {
 constructor(){this.value='';this.textContent='';this.hidden=false;this.open=false;this.style={};this.children=[];this.dataset={};this.files=[];this.type='';this.disabled=false;this.className='';this.onclick=null;this.listeners={};this.parent=null;this.checked=false;this.href='';this.download='';}
 append(...xs){xs.forEach(x=>this.appendChild(x))}
 appendChild(x){x.parent=this;this.children.push(x);return x}
 replaceChildren(...xs){this.children=[];this.append(...xs)}
 querySelectorAll(){return []}
 focus(){}select(){}setSelectionRange(){}scrollIntoView(){}
 addEventListener(type,fn){this.listeners[type]=fn}
 removeEventListener(type){delete this.listeners[type]}
 setAttribute(name){if(name==='open')this.open=true}
 removeAttribute(name){if(name==='open')this.open=false}
 showModal(){this.open=true}
 close(){this.open=false}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 click(){if(this.onclick)this.onclick()}
}
function setup(initialPosts=[],initialHistory=[],initialRefs=[]){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new El());return elements.get(id)};
 const storage=new Map([
  ['sns-post-manager-v1',JSON.stringify(initialPosts)],
  ['sns-post-manager-history-v1',JSON.stringify(initialHistory)],
  ['sns-post-manager-references-v1',JSON.stringify(initialRefs)]
 ]);
 const downloads=[],blobs=new Map(),copyCalls=[];
 class MockURL extends URL {}
 MockURL.createObjectURL=blob=>{const key='blob:ref-'+blobs.size;blobs.set(key,blob);return key};
 MockURL.revokeObjectURL=()=>{};
 const doc={getElementById:get,createElement:tag=>{
  const el=new El();if(tag==='a')el.click=()=>downloads.push({name:el.download,blob:blobs.get(el.href)});
  return el;
 },body:new El(),addEventListener(){},execCommand:name=>{copyCalls.push(name);return true},hidden:false};
 const c=vm.createContext({
  document:doc,
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  window:{isSecureContext:true,open(){}},
  navigator:{clipboard:{writeText:async()=>{}}},
  Date,Intl,URL:MockURL,Blob,console,setInterval(){},setTimeout:()=>42,clearTimeout(){}
 });
 vm.runInContext(inline,c,{filename:'index.inline.js'});
 vm.runInContext(historyJs,c,{filename:'history342.js'});
 vm.runInContext(importerJs,c,{filename:'import34.js'});
 get('refFilter37').value='すべて';
 get('weekstart').value='2026-10-26';get('destination').value='X';get('generationBatch').value='kai';
 vm.runInContext(library,c,{filename:'references37.js'});
 get('xFormat38').value='single';get('xBudget38').value='240';get('xParts38').value='3';
 vm.runInContext(xScript,c,{filename:'xformat38.js'});
 const run=code=>vm.runInContext(code,c,{timeout:5000});
 return {c,get,run,storage,downloads,copyCalls,
  posts:()=>JSON.parse(storage.get('sns-post-manager-v1')||'[]'),
  history:()=>JSON.parse(storage.get('sns-post-manager-history-v1')||'[]'),
  refs:()=>JSON.parse(storage.get('sns-post-manager-references-v1')||'[]'),
  confirm:async(yes=true)=>{for(let i=0;i<8&&!get('actionDialog35').open;i++)await Promise.resolve();assert.equal(get('actionDialog35').open,true);(yes?get('actionOk35'):get('actionCancel35')).onclick()}
 };
}
function fill(a,{account='カイ',source='X',url='',content='参考投稿の本文',note='冒頭で読者の気持ちをつかんでいる'}={}){
 a.get('refAccount37').value=account;a.get('refSource37').value=source;
 a.get('refUrl37').value=url;a.get('refContent37').value=content;a.get('refNote37').value=note;
}
async function restore(a,obj,yes=true){
 const raw=typeof obj==='string'?obj:JSON.stringify(obj);
 const target={files:[{name:'backup.json',size:raw.length,text:async()=>raw}],value:'chosen'};
 const task=a.c.restoreBackup({target});
 if(typeof obj==='string'&&obj==='{broken'){await task;return}
 await a.confirm(yes);await task;
 return target;
}
test('v3.7 markup and scripts parse; existing post/history key names do not change',()=>{
 for(const code of [inline,library,historyJs,importerJs])assert.doesNotThrow(()=>new vm.Script(code));
 assert.match(html,/Ver\.3\.(?:7|8)/);
 assert.match(html,/const key="sns-post-manager-v1"/);
 assert.match(html,/const historyKey="sns-post-manager-history-v1"/);
 assert.match(html,/const referenceKey="sns-post-manager-references-v1"/);
 assert.match(html,/id="referenceLibrary37"/);
 assert.match(html,/src="references37\.js\?v=371"/);
 assert.doesNotMatch(html,/\b(?:alert|confirm|prompt)\s*\(/);
});
test('opening v3.7 with existing v3.6 data does not modify any saved bytes',()=>{
 const old={id:'old',account:'カイ',platform:'X',date:'2026-10-14T12:00',content:'元々の投稿',done:true};
 const past={account:'カイ',platform:'X',content:'過去に投稿した文章'};
 const a=setup([old],[past]);
 assert.equal(a.storage.get('sns-post-manager-v1'),JSON.stringify([old]));
 assert.equal(a.storage.get('sns-post-manager-history-v1'),JSON.stringify([past]));
 assert.equal(a.refs().length,0);
});
test('save and duplicate refusal do not change scheduled posts or past history',()=>{
 const old={id:'old',account:'カイ',platform:'X',date:'2026-10-14T12:00',content:'元の投稿',done:true};
 const a=setup([old],[]);
 fill(a,{source:'Threads',content:'似ている文章をどう扱うか考察している参考投稿',url:'https://www.threads.net/@someone/post/abc',note:'結論の置き方がいい'});
 a.run('saveReference37()');
 assert.equal(a.refs().length,1);
 assert.equal(a.refs()[0].source,'Threads');
 assert.equal(a.refs()[0].account,'カイ');
 assert.equal(a.refs()[0].note,'結論の置き方がいい');
 assert.deepEqual(a.posts(),[old]);
 fill(a,{source:'X',content:'似ている文章をどう扱うか考察している参考投稿'});
 a.run('saveReference37()');
 assert.equal(a.refs().length,1,'same account/body should be duplicate even across networks');
 assert.match(a.get('refStatus37').textContent,/重複/);
 fill(a,{account:'後輩くん',content:'似ている文章をどう扱うか考察している参考投稿'});
 a.run('saveReference37()');
 assert.equal(a.refs().length,2,'different account can reuse a useful reference');
});
test('invalid URLs and missing body are blocked, not fetched',()=>{
 const a=setup();
 fill(a,{url:'javascript:alert(1)',content:'参考投稿の本文'});
 a.run('saveReference37()');
 assert.equal(a.refs().length,0);
 assert.match(a.get('refStatus37').textContent,/URL/);
 fill(a,{url:'https://example.com/story',content:'   '});
 a.run('saveReference37()');
 assert.equal(a.refs().length,0);
 assert.match(a.get('refStatus37').textContent,/本文/);
});
test('favorite/selection flags and editing keep the same ID and update local storage',()=>{
 const a=setup();
 fill(a,{content:'元の参考本文'});
 a.run('saveReference37()');
 const id=a.refs()[0].id;
 a.run('toggleReference37('+JSON.stringify(id)+',"favorite")');
 a.run('toggleReference37('+JSON.stringify(id)+',"useForGeneration")');
 assert.equal(a.refs()[0].favorite,true);
 assert.equal(a.refs()[0].useForGeneration,true);
 a.run('editReference37('+JSON.stringify(id)+')');
 a.get('refContent37').value='編集した参考本文';
 a.get('refNote37').value='冒頭の読者への問いが良かった';
 a.run('saveReference37()');
 assert.equal(a.refs()[0].id,id);
 assert.equal(a.refs()[0].favorite,true);
 assert.equal(a.refs()[0].useForGeneration,true);
 assert.equal(a.refs()[0].content,'編集した参考本文');
 assert.match(a.get('refCount37').textContent,/保存中 1件/);
});
test('generation prompt uses only chosen refs per account and explicitly bans copying',()=>{
 const a=setup();
 for(const [account,content] of [
  ['カイ','独自のカイ用参考内容'],
  ['後輩くん','独自の後輩用参考内容'],
  ['共通','共通の読み手心理をつかむ文章']
 ]){
  fill(a,{account,content,note:account+'の参考ポイント'});
  a.run('saveReference37()');
 }
 assert.equal(a.refs().length,3);
 const ids=a.refs().map(x=>x.id);
 for(const id of ids)a.run('toggleReference37('+JSON.stringify(id)+',"useForGeneration")');
 a.get('generationBatch').value='kai';
 a.run('generatePrompt()');
 const kai=a.get('copyField356').value;
 assert.match(kai,/次の14枠/);
 assert.match(kai,/独自のカイ用参考内容/);
 assert.match(kai,/共通の読み手心理/);
 assert.doesNotMatch(kai,/独自の後輩用参考内容/);
 assert.match(kai,/本文を模倣しない/);
 assert.match(kai,/文章・言い回し/);
 a.get('generationBatch').value='all';
 a.run('generatePrompt()');
 const full=a.get('copyField356').value;
 assert.match(full,/次の42枠/);
 assert.match(full,/独自の後輩用参考内容/);
 assert.equal(a.get('chatLaunch357').style.display,'block');
});
test('unselected references do not alter generation prompt',()=>{
 const a=setup();
 fill(a,{account:'カイ',content:'保存しているだけの参考例'});
 a.run('saveReference37()');
 a.run('generatePrompt()');
 const copied=a.get('copyField356').value;
 assert.doesNotMatch(copied,/保存しているだけの参考例/);
 assert.doesNotMatch(copied,/参考投稿の活用/);
});
test('analysis action copies a critique prompt, not a reproduction order',()=>{
 const a=setup();
 fill(a,{content:'面白い投稿の原文',note:'観察したい部分',url:'https://x.com/someone/status/1'});
 a.run('saveReference37()');
 const id=a.refs()[0].id;
 a.run('referenceAnalysis37('+JSON.stringify(id)+')');
 assert.match(a.get('copyField356').value,/面白い投稿の原文/);
 assert.match(a.get('copyField356').value,/無断転載/);
 assert.match(a.get('copyField356').value,/観察したい部分/);
 assert.equal(a.get('copyToast357').hidden,false);
 assert.equal(a.get('refAnalysisHint37').textContent.includes('ChatGPT'),true);
});
test('reference deletion prompts and does not touch existing scheduled post/history',async()=>{
 const old={id:'keep',account:'カイ',platform:'X',date:'2026-10-22T12:00',content:'残しておく投稿',done:true};
 const past={account:'カイ',platform:'X',content:'残しておく履歴'};
 const a=setup([old],[past]);
 fill(a,{content:'消去したい参考投稿'});
 a.run('saveReference37()');const id=a.refs()[0].id;
 const expectedHistory=a.history();
 const cancel=a.run('deleteReference37('+JSON.stringify(id)+')');
 await a.confirm(false);await cancel;assert.equal(a.refs().length,1);
 const del=a.run('deleteReference37('+JSON.stringify(id)+')');
 await a.confirm(true);await del;assert.equal(a.refs().length,0);
 assert.deepEqual(a.posts(),[old]);
 assert.deepEqual(a.history(),expectedHistory);
});
test('export includes reference posts and correct 3-key storage estimates',async()=>{
 const a=setup();
 fill(a,{content:'バックアップ用の参考投稿',url:'https://x.com/abc/status/100'});
 a.run('saveReference37()');
 a.run('exportBackup()');
 assert.equal(a.downloads.length,1);
 assert.match(a.downloads[0].name,/sns-post-manager-backup/);
 const data=JSON.parse(await a.downloads[0].blob.text());
 assert.equal(data.version,5);
 assert.equal(data.references.length,1);
 assert.equal(data.references[0].content,'バックアップ用の参考投稿');
 assert.match(a.get('storageUsage342').textContent,/参考投稿/);
 assert.match(a.get('backupStatus').textContent,/参考投稿1件/);
});
test('restore references, avoid duplicates and accept v3.6 backup without references',async()=>{
 const a=setup();
 const one={id:'ref-1',account:'カイ',source:'X',content:'復元対象の参考投稿',note:'フックが良い',url:'',favorite:true,useForGeneration:true};
 await restore(a,{version:5,posts:[],history:[],references:[one]});
 assert.equal(a.refs().length,1);
 assert.equal(a.refs()[0].favorite,true);
 assert.equal(a.refs()[0].useForGeneration,true);
 await restore(a,{version:5,posts:[],history:[],references:[one]});
 assert.equal(a.refs().length,1);
 assert.match(a.get('backupStatus').textContent,/追加0件/);
 await restore(a,{version:4,posts:[],history:[]});
 assert.equal(a.refs().length,1);
});
test('restore cancel, corrupt references and storage quota error do not lose old data',async()=>{
 const p={id:'existing',account:'カイ',platform:'X',content:'投稿A',done:true,date:'2026-10-26T12:00'};
 const h={account:'カイ',platform:'X',content:'過去の履歴A'};
 const a=setup([p],[h]);
 fill(a,{content:'今の参考投稿'});a.run('saveReference37()');
 const original=[...['sns-post-manager-v1','sns-post-manager-history-v1','sns-post-manager-references-v1'].map(k=>a.storage.get(k))];
 await restore(a,{version:5,posts:[],history:[],references:[{account:'カイ',source:'X',content:'追加予定の参考投稿'}]},false);
 assert.deepEqual(['sns-post-manager-v1','sns-post-manager-history-v1','sns-post-manager-references-v1'].map(k=>a.storage.get(k)),original);
 await restore(a,'{broken');
 assert.deepEqual(['sns-post-manager-v1','sns-post-manager-history-v1','sns-post-manager-references-v1'].map(k=>a.storage.get(k)),original);
 const normalSet=a.c.localStorage.setItem;
 let fail=true;
 a.c.localStorage.setItem=(k,v)=>{if(k==='sns-post-manager-references-v1'&&fail){fail=false;throw Error('quota')}return normalSet(k,v)};
 fill(a,{content:'保存容量不足になる投稿'});
 a.run('saveReference37()');
 assert.deepEqual(['sns-post-manager-v1','sns-post-manager-history-v1','sns-post-manager-references-v1'].map(k=>a.storage.get(k)),original);
 assert.equal(a.refs().length,1);
});

test('the iPhone QA page has three isolated storage keys and fictional sample controls',()=>{
 const qa=fs.readFileSync('qa-references-v371.html','utf8');
 assert.match(qa,/sns-post-manager-test-reference-v37/);
 assert.match(qa,/sns-post-manager-history-test-reference-v37/);
 assert.match(qa,/sns-post-manager-references-test-v37/);
 assert.doesNotMatch(qa,/const key="sns-post-manager-v1"/);
 assert.doesNotMatch(qa,/const referenceKey="sns-post-manager-references-v1"/);
 assert.match(qa,/fillReferenceSample37\('kai'\)/);
 assert.match(qa,/src="references371-qa.js\?v=371"/);
 assert.match(qa,/Ver\.3\.7\.1/);
 assert.match(qa,/id="refAppliedPreview371"/);
 assert.match(qa,/id="refRestoreFile371"/);
 assert.match(qa,/id="refToast371"/);
 assert.match(qa,/src="history342-qa-v37.js\?v=37"/);
});
test('the isolated QA scripts match the validated production candidate scripts',()=>{
 assert.equal(fs.readFileSync('references371-qa.js','utf8'),library);
 assert.equal(fs.readFileSync('history342-qa-v37.js','utf8'),historyJs);
});

test('v3.7.1 toggle updates ON/OFF on same visible card, without resetting the page',()=>{
 const a=setup();
 fill(a,{content:'選択状態が見えるか確認する参考投稿'});
 a.run('saveReference37()');
 const id=a.refs()[0].id,expr=JSON.stringify(id);
 const card=a.run('referenceCards371.get('+expr+')');
 assert.match(card.state.textContent,/生成への反映：OFF/);
 assert.match(card.favorite.textContent,/☆ 通常/);
 a.run('toggleReference37('+expr+',"useForGeneration")');
 assert.equal(a.run('referenceCards371.get('+expr+').card'),card.card);
 assert.match(card.state.textContent,/生成への反映：ON/);
 assert.match(card.use.textContent,/ON/);
 assert.match(a.get('refToast371').textContent,/ON/);
 assert.equal(a.get('refToast371').hidden,false);
 assert.equal(a.refs()[0].useForGeneration,true);
 a.run('toggleReference37('+expr+',"favorite")');
 assert.equal(a.run('referenceCards371.get('+expr+').card'),card.card);
 assert.match(card.state.textContent,/★ 優先/);
 assert.match(card.favorite.textContent,/★ 優先/);
 assert.equal(a.refs()[0].favorite,true);
});
test('selected preview reflects the actual reference for the 14-post account and all 42',()=>{
 const a=setup();
 fill(a,{account:'カイ',content:'カイ固有の保存された参考投稿'});a.run('saveReference37()');
 fill(a,{account:'後輩くん',content:'後輩くん固有の保存された参考投稿'});a.run('saveReference37()');
 a.run('toggleReference37('+JSON.stringify(a.refs()[0].id)+',"useForGeneration")');
 const preview=()=>a.get('refAppliedPreview371').children.map(x=>x.textContent).join(' ');
 assert.match(preview(),/カイ固有の保存された参考投稿/);
 assert.doesNotMatch(preview(),/後輩くん固有の保存された参考投稿/);
 a.run('generatePrompt()');
 assert.match(a.get('copyField356').value,/カイ固有の保存された参考投稿/);
 a.get('generationBatch').value='kouhai';
 a.run('refreshReferencePreview371()');
 assert.match(preview(),/後輩くん：0件/);
 assert.doesNotMatch(preview(),/カイ固有の保存された参考投稿/);
 a.get('generationBatch').value='all';
 a.run('refreshReferencePreview371()');
 assert.match(preview(),/カイ固有の保存された参考投稿/);
 assert.match(preview(),/後輩くん：0件/);
});
test('reference-only JSON export contains no post/history and announces file save',async()=>{
 const post={id:'p',account:'カイ',platform:'X',content:'元の投稿',done:false,date:'2026-10-26T12:00'};
 const a=setup([post]);
 fill(a,{content:'参考だけバックアップしたい文章'});
 a.run('saveReference37()');
 const posts=JSON.stringify(a.posts()),history=JSON.stringify(a.history());
 a.run('referenceExport371()');
 assert.equal(a.downloads.length,1);
 assert.match(a.downloads[0].name,/sns-reference-library-\d{4}/);
 const data=JSON.parse(await a.downloads[0].blob.text());
 assert.equal(data.kind,'sns-reference-library');
 assert.equal(data.references.length,1);
 assert.equal(data.posts,undefined);
 assert.equal(JSON.stringify(a.posts()),posts);
 assert.equal(JSON.stringify(a.history()),history);
 assert.match(a.get('refBackupStatus371').textContent,/ファイル/);
});
test('two-step restore previews a reference JSON, restores it without touching posts and refuses duplicates',async()=>{
 const post={id:'p',account:'カイ',platform:'X',content:'消えない投稿',done:false,date:'2026-10-26T12:00'};
 const hist={account:'カイ',platform:'X',content:'消えない履歴'};
 const a=setup([post],[hist]);
 fill(a,{content:'参考だけを復元する文章'});
 a.run('saveReference37()');a.run('referenceExport371()');
 const file=a.downloads[0],raw=await file.blob.text(),id=a.refs()[0].id;
 const deletion=a.run('deleteReference37('+JSON.stringify(id)+')');
 await a.confirm(true);await deletion;
 assert.equal(a.refs().length,0);
 const posts=JSON.stringify(a.posts()),history=JSON.stringify(a.history());
 const source={name:file.name,size:raw.length,text:async()=>raw};
 const input={files:[source],value:'chosen'};
 await a.c.prepareReferenceRestore371({target:input});
 assert.equal(input.value,'');
 assert.match(a.get('refBackupStatus371').textContent,/新しく追加できる参考投稿：1件/);
 assert.equal(a.get('refCommitRestore371').hidden,false);
 assert.equal(a.refs().length,0,'preview must not modify data');
 a.run('commitReferenceRestore371()');
 assert.equal(a.refs().length,1);
 assert.equal(a.refs()[0].id,id);
 assert.equal(JSON.stringify(a.posts()),posts);
 assert.equal(JSON.stringify(a.history()),history);
 assert.match(a.get('refBackupStatus371').textContent,/参考投稿を1件復元しました/);
 assert.match(a.get('refToast371').textContent,/復元に成功/);
 await a.c.prepareReferenceRestore371({target:{files:[source],value:'chosen'}});
 assert.equal(a.get('refCommitRestore371').hidden,true);
 assert.match(a.get('refBackupStatus371').textContent,/追加0件/);
});
test('reference restore diagnoses invalid JSON and old v3.6 files and keeps data',async()=>{
 const a=setup();
 fill(a,{content:'保持したい参考'});a.run('saveReference37()');
 const before=JSON.stringify(a.refs());
 const open=async text=>a.c.prepareReferenceRestore371({target:{files:[{name:'chosen.json',size:text.length,text:async()=>text}],value:'file'}});
 await open('{broken');
 assert.match(a.get('refBackupStatus371').textContent,/JSON形式/);
 await open(JSON.stringify({version:4,posts:[],history:[]}));
 assert.match(a.get('refBackupStatus371').textContent,/Ver\.3\.6以前/);
 assert.equal(a.get('refCommitRestore371').hidden,true);
 assert.equal(JSON.stringify(a.refs()),before);
});
test('full backup restore rejects reference-only file and identifies the correct field',async()=>{
 const a=setup();
 const file={name:'ref-only.json',size:80,text:async()=>JSON.stringify({kind:'sns-reference-library',version:1,references:[]})};
 await a.c.restoreBackup({target:{files:[file],value:'chosen'}});
 assert.match(a.get('backupStatus').textContent,/参考投稿専用バックアップ/);
 assert.match(a.get('backupStatus').textContent,/参考投稿ライブラリ/);
});
