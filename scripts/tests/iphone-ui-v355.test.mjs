import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('qa-platform.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const historyJs=fs.readFileSync('history342-qa-platform.js','utf8');
const importJs=fs.readFileSync('import34-qa-platform.js','utf8');

class FakeElement {
 constructor(){this.value='';this.hidden=false;this.open=false;this.disabled=false;this.textContent='';this.style={};this.dataset={};this.children=[];this.files=[];this.className='';this.events={};this.onclick=null;}
 append(...els){this.children.push(...els)}
 appendChild(el){this.children.push(el);return el}
 replaceChildren(...els){this.children=els}
 querySelectorAll(){return []}
 focus(){}
 select(){}
 setSelectionRange(){}
 scrollIntoView(){}
 addEventListener(type,callback){this.events[type]=callback}
 removeEventListener(type){delete this.events[type]}
 setAttribute(name,value){if(name==='open')this.open=true}
 removeAttribute(name){if(name==='open')this.open=false}
 showModal(){this.open=true}
 close(){this.open=false}
 click(){if(this.onclick)this.onclick()}
}
function createApp(posts=[],history=[]){
 const els=new Map();
 const el=id=>{if(!els.has(id))els.set(id,new FakeElement());return els.get(id)};
 const data=new Map([
  ['sns-post-manager-test-v35-platform',JSON.stringify(posts)],
  ['sns-post-manager-history-test-v35-platform',JSON.stringify(history)]
 ]);
 const ctx=vm.createContext({
   document:{getElementById:el,createElement:()=>new FakeElement(),body:new FakeElement(),addEventListener:()=>{}},
   localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},
   window:{isSecureContext:true,open:()=>{}},
   navigator:{clipboard:{writeText:async()=>{},readText:async()=>''}},
   Date,Intl,Blob,URL,console,setInterval:()=>0,setTimeout:()=>0,
 });
 vm.runInContext(js,ctx,{filename:'qa-inline.js'});
 vm.runInContext(historyJs,ctx,{filename:'history-qa.js'});
 vm.runInContext(importJs,ctx,{filename:'import-qa.js'});
 el('weekstart').value='2026-10-19';
 el('destination').value='X';
 return {el,ctx,data,run:s=>vm.runInContext(s,ctx),
  posts:()=>JSON.parse(data.get('sns-post-manager-test-v35-platform')||'[]'),
  history:()=>JSON.parse(data.get('sns-post-manager-history-test-v35-platform')||'[]')};
}
test('all QA source scripts parse without error',()=>{
 for(const script of [js,historyJs,importJs])assert.doesNotThrow(()=>new vm.Script(script));
 assert.match(html,/Ver\.3\.5\.5/);
});
test('there are no browser-native alert/confirm/prompt calls',()=>{
 for(const src of [html,historyJs,importJs])
  assert.doesNotMatch(src,/\b(?:alert|confirm|prompt)\s*\(/);
 assert.match(html,/id="editField35"/);
 assert.match(html,/id="actionDialog35"/);
});
test('same text: X and Threads both new when there is no prior history',()=>{
 const a=createApp(),text='両SNSに投稿したテストの文章';
 a.el('pasteAccount342').value='カイ';
 a.el('pasteHistory342').value=JSON.stringify([
  {account:'カイ',platform:'X',content:text},
  {account:'カイ',platform:'Threads',content:text}
 ]);
 a.run('previewPastedHistory342()');
 assert.match(a.el('pasteStatus342').textContent,/内容を確認/);
 assert.equal(a.run('pastePreview342.fresh.length'),2);
 const task=a.run('savePastedHistory342()');
 assert.equal(a.el('actionDialog35').open,true);
 a.el('actionOk35').onclick();
 return task.then(()=>{
  assert.equal(a.history().length,2);
  a.run('previewPastedHistory342()');
  assert.equal(a.run('pastePreview342.fresh.length'),0);
 });
});
test('if X already exists, show one new Threads record and explain it',()=>{
 const text='片方が登録済みの場合の表示テスト';
 const a=createApp([],[{account:'カイ',platform:'X',content:text}]);
 a.el('pasteAccount342').value='カイ';
 a.el('pasteHistory342').value=JSON.stringify([
  {account:'カイ',platform:'X',content:text},
  {account:'カイ',platform:'Threads',content:text}
 ]);
 a.run('previewPastedHistory342()');
 assert.equal(a.run('pastePreview342.fresh.length'),1);
 assert.equal(a.run('pastePreview342.states[0].kind'),'登録済み／重複');
 assert.equal(a.run('pastePreview342.states[1].kind'),'新規');
 const rows=a.el('pastePreview342').children;
 const texts=rows.flatMap(x=>x.children||[]).map(x=>x.textContent);
 assert.ok(texts.some(t=>String(t).includes('X：登録済み／重複')&&String(t).includes('Threads：新規')));
});
test('editing uses multiline textarea and preserves line breaks',async()=>{
 const p={id:'p1',account:'カイ',platform:'X',date:'2026-10-19T12:00',content:'最初の文章',done:false};
 const a=createApp([p]);
 a.run('editPost("p1")');
 assert.equal(a.el('editDialog35').open,true);
 assert.equal(a.el('editField35').value,p.content);
 a.el('editField35').value='改行を含む本文\n2行目の内容\n3行目です';
 await a.run('saveEdit35()');
 assert.equal(a.posts()[0].content,'改行を含む本文\n2行目の内容\n3行目です');
 assert.equal(a.el('editDialog35').open,false);
});
test('cancel is safe and delete requires explicit in-app approval',async()=>{
 const p={id:'p1',account:'カイ',platform:'X',date:'2026-10-19T12:00',content:'消去前のテスト投稿',done:false};
 const a=createApp([p]);
 const first=a.run('deletePost("p1")');
 assert.equal(a.el('actionDialog35').open,true);
 a.el('actionCancel35').onclick();
 await first;assert.equal(a.posts().length,1);
 const second=a.run('deletePost("p1")');
 a.el('actionOk35').onclick();
 await second;assert.equal(a.posts().length,0);
});
test('test sample creates unique X/Threads pair while keeping text identical across platforms',()=>{
 const a=createApp();
 a.run('fillPlatformHistoryQATest()');
 const rows=JSON.parse(a.el('pasteHistory342').value);
 assert.equal(rows.length,2);
 assert.equal(rows[0].content,rows[1].content);
 assert.equal(rows[0].platform,'X');
 assert.equal(rows[1].platform,'Threads');
});
