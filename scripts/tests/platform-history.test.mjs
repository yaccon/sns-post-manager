import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const previewHtml=fs.readFileSync('test-v35.html','utf8');
const previewJs=previewHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js&&previewJs,'inline app script');
const hist=fs.readFileSync('history342.js','utf8');
const imported=fs.readFileSync('import34.js','utf8');

class El {
 constructor(){this.value='';this.style={};this.dataset={};this.textContent='';this.children=[];this.files=[];this.hidden=false;this.className='';}
 append(...x){this.children.push(...x)}
 appendChild(x){this.children.push(x);return x}
 replaceChildren(...x){this.children=x}
 querySelectorAll(){return []}
 focus(){}
 select(){}
 click(){}
 setAttribute(){}
 removeAttribute(){}
 scrollIntoView(){}
}
function app(initialPosts=[],initialHistory=[],preview=false){
 const els=new Map(), alerts=[];
 const get=k=>{if(!els.has(k))els.set(k,new El());return els.get(k)};
 const store=new Map([['sns-post-manager-v1',JSON.stringify(initialPosts)],['sns-post-manager-history-v1',JSON.stringify(initialHistory)]]);
 const c=vm.createContext({
  document:{getElementById:get,createElement:()=>new El(),body:new El(),execCommand:()=>true,addEventListener:()=>{}},
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  window:{open:()=>{},isSecureContext:true},
  navigator:{clipboard:{writeText:async()=>true}},
  alert:v=>alerts.push(v),confirm:()=>true,prompt:()=>null,
  console,Date,Intl,Blob,URL,setInterval:()=>{},setTimeout:()=>{}
 });
 vm.runInContext(preview?previewJs:js,c);vm.runInContext(hist,c);vm.runInContext(imported,c);
 get('weekstart').value='2026-10-19';get('destination').value='X';
 const run=s=>vm.runInContext(s,c,{timeout:5000});
 return {get,run,store,alerts,posts:()=>JSON.parse(store.get('sns-post-manager-v1')||'[]'),
         history:()=>JSON.parse(store.get('sns-post-manager-history-v1')||'[]')};
}
function entry(platform,content='共通の投稿文です。二つのSNSで同じ内容を使うテスト',id='p'){
 return {id,account:'カイ',platform,date:'2026-10-18T12:00',content,done:true};
}
function save(s,platform,body){
 s.get('account').value='カイ';
 s.get('platform').value=platform;
 s.get('date').value='2026-10-19T12:00';
 s.get('content').value=body;
 s.run('savePost()');
}
test('X history never blocks identical Threads post, and separate history records exist',()=>{
 const x=entry('X');
 const s=app([x]);save(s,'Threads',x.content);
 assert.equal(s.posts().length,2);
 assert.equal(s.history().filter(h=>h.content===x.content).length,2);
 assert.deepEqual(s.history().filter(h=>h.content===x.content).map(h=>h.platform).sort(),['Threads','X']);
});
test('Threads history never blocks identical X post',()=>{
 const th=entry('Threads');
 const s=app([th]);save(s,'X',th.content);
 assert.equal(s.posts().length,2);
 assert.deepEqual(s.history().filter(h=>h.content===th.content).map(h=>h.platform).sort(),['Threads','X']);
});
test('same account + same platform + same text is still rejected',()=>{
 const x=entry('X');const s=app([x]);
 save(s,'X',x.content);
 assert.equal(s.posts().length,1);
 assert.ok(s.alerts.some(a=>String(a).includes('同じ本文')));
});
test('similarity warning must not apply to other platform',()=>{
 const x=entry('X','投稿管理が面倒なので同じテーマを毎日考えてしまう。試作してみた記録を書いています。');
 const s=app([x]);
 save(s,'Threads','投稿管理が面倒なので同じテーマを毎日考えてしまう。試作してみた記録を書いています！');
 assert.equal(s.posts().length,2);
});
test('pasted JSON archives allow same text on X and Threads, refuse duplicate within one',()=>{
 const s=app();
 const item={account:'カイ',content:'まったく同じ投稿文を複数SNSに保存',date:'2026-10-18T20:00'};
 const arr=[{...item,platform:'X'},{...item,platform:'Threads'},{...item,platform:'X'}];
 s.get('pasteAccount342').value='カイ';
 s.get('pasteHistory342').value=JSON.stringify(arr);
 s.run('previewPastedHistory342()');
 assert.ok(s.get('pasteStatus342').textContent.includes('内容を確認'));
 s.run('savePastedHistory342()');
 assert.equal(s.history().length,2);
 assert.deepEqual(s.history().map(p=>p.platform).sort(),['Threads','X']);
});
test('file history imports in both directions retain two platform-specific entries',()=>{
 const text='プラットフォーム横断のテスト履歴';
 for(const order of [['X','Threads'],['Threads','X']]){
  const s=app();
  for(const source of order){
   s.get('importAccount').value='カイ';s.get('importSource').value=source;
   s.run('import34Snapshot={account:"カイ",source:'+JSON.stringify(source)+',file:"fixture.txt"};import34Rows=[{content:'+JSON.stringify(text)+',date:"2026-10-18T12:00"}]');
   s.run('renderHistoryImport()');
   s.run('commitHistoryImport()');
  }
  assert.equal(s.history().length,2);
  assert.deepEqual(s.history().map(p=>p.platform).sort(),['Threads','X']);
 }
});
test('legacy entries without platform stay untouched and do not erase platform-specific history',()=>{
 const legacy={account:'カイ',content:'昔の履歴',date:'2026-09-01'};
 const s=app([],[legacy]);
 save(s,'X',legacy.content);
 assert.equal(s.history().length,2);
 assert.deepEqual(s.history()[0],legacy);
});
test('14 Threads posts import even if same account/X has identical body texts',()=>{
 const list=[];
 for(let i=0;i<7;i++)for(const [idx,time] of ['12:00','20:00'].entries()){
  const date=new Date('2026-10-19T12:00:00Z');date.setUTCDate(date.getUTCDate()+i);
  const day=date.toISOString().slice(0,10);
  let seed=(i*2+idx+1)*103831;
  const abc="あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
  let body="";
  for(let k=0;k<115;k++){seed=(seed*16807)%2147483647;body+=abc[seed%abc.length];}
  list.push({account:'カイ',platform:'Threads',date:day+'T'+time,content:body});
 }
 const s=app([],list.map((p,i)=>({...p,platform:'X',id:'history-'+i})),true);
 s.get('destination').value='Threads';
 s.get('jsonImport').value=JSON.stringify(list);
 s.run('importPosts()');
 assert.ok(s.get('importStatus').textContent.includes('新規'));
 s.run('finishImport()');
 assert.equal(s.posts().length,14);
 assert.equal(s.history().filter(x=>x.platform==='Threads').length,14);
 assert.equal(s.history().filter(x=>x.platform==='X').length,14);
});
