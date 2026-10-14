import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const filename=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../index.html');
const html=fs.readFileSync(filename,'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Inline script was not found');

class FakeEl {
  constructor(){this.value='';this.textContent='';this.className='';this.hidden=false;this.style={};this.children=[];this.dataset={};this.files=[];}
  append(...children){this.children.push(...children);}
  appendChild(child){this.children.push(child);}
  replaceChildren(...children){this.children=children;}
  querySelectorAll(){return [];}
  focus(){}
}
function setup(seed=[]){
 const el=new Map();
 const get=id=>{if(!el.has(id))el.set(id,new FakeEl());return el.get(id);};
 const storage=new Map([['sns-post-manager-v1',JSON.stringify(seed)]]);
 const ctx=vm.createContext({
   localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},
   document:{getElementById:get,createElement:()=>new FakeEl(),execCommand:()=>true,body:new FakeEl()},
   window:{isSecureContext:true,open:()=>{}},
   navigator:{clipboard:{writeText:async()=>{}}},
   alert:()=>{},confirm:()=>true,prompt:()=>null,
   setInterval:()=>{},Date,Intl,Blob,URL,console,
 });
 vm.runInContext(script,ctx,{filename:'index.html',timeout:5000});
 get('weekstart').value='2026-10-19';
 get('destination').value='X';
 vm.runInContext('copyText = async function (v) {globalThis.__copied = v; return true;}',ctx);
 return {get,ctx,storage,run:expression=>vm.runInContext(expression,ctx,{timeout:5000})};
}
const names=['カイ','後輩くん','漫画・恋愛'];
const weekdays=Array.from({length:7},(_,n)=>{
 const d=new Date('2026-10-19T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);
});
function textFor(i){
 let n=(i+1)*11781,s='';
 const abc='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもらりるれろやゆよわをん';
 for(let j=0;j<90;j++){n=(n*16807)%2147483647;s+=abc[n%abc.length];}
 return s;
}
function postsFor(account){
 const a=names.indexOf(account);
 return weekdays.flatMap((day,j)=>['12:00','20:00'].map((time,k)=>({
  account,platform:'X',date:day+'T'+time,content:textFor(a*14+j*2+k)
 })));
}
test('HTML keeps old storage key and new batch control',()=>{
 assert.match(html,/sns-post-manager-v1/);
 assert.match(html,/id="generationBatch"/);
 assert.match(html,/Ver\.3\.5/);
 assert.match(html,/\[14,28,42\]/);
});
test('Generation prompt selects 14 or 42 slots by account',()=>{
 const s=setup();
 for(const [selection,expected,account] of [['kai',14,'カイ'],['kouhai',14,'後輩くん'],['manga',14,'漫画・恋愛'],['all',42,null]]){
  s.get('generationBatch').value=selection;
  s.run('generatePrompt()');
  const p=s.run('globalThis.__copied');
  assert.match(p,new RegExp('次の'+expected+'枠'));
  const m=p.match(/スロット:(\[[^\n]*\])/);
  assert.ok(m,'Slot JSON missing');
  const slots=JSON.parse(m[1]);assert.equal(slots.length,expected);
  assert.equal(new Set(slots.map(x=>x.account)).size,account?1:3);
  if(account)assert.ok(slots.every(x=>x.account===account));
 }
});
test('Three imports of 14 produce 42 without overwriting existing posts',()=>{
 const existing={id:'existing-1',account:'カイ',platform:'X',date:'2026-10-01T12:00',content:'過去に保存した大切な投稿',done:true};
 const s=setup([existing]);
 for(let index=0;index<3;index++){
  const batch=postsFor(names[index]);
  s.get('jsonImport').value=JSON.stringify(batch);
  s.run('importPosts()');
  assert.match(s.get('importStatus').textContent,/確認結果/);
  s.run('finishImport()');
  const saved=JSON.parse(s.storage.get('sns-post-manager-v1'));
  assert.equal(saved.length,1+(index+1)*14);
  assert.deepEqual(saved[0],existing);
 }
 const saved=JSON.parse(s.storage.get('sns-post-manager-v1'));
 assert.equal(new Set(saved.slice(1).map(p=>p.account+'|'+p.date)).size,42);
 assert.equal(saved.slice(1).filter(p=>p.done).length,0);
});
test('42-post import still works',()=>{
 const s=setup(),all=names.flatMap(postsFor);
 s.get('jsonImport').value=JSON.stringify(all);
 s.run('importPosts()');s.run('finishImport()');
 assert.equal(JSON.parse(s.storage.get('sns-post-manager-v1')).length,42);
});
test('Invalid batch sizes and malformed group cannot change storage',()=>{
 const s=setup(),initial=s.storage.get('sns-post-manager-v1');
 s.get('jsonImport').value=JSON.stringify(postsFor('カイ').slice(0,13));
 s.run('importPosts()');
 assert.match(s.get('importStatus').textContent,/14本・28本・42本/);
 assert.equal(s.storage.get('sns-post-manager-v1'),initial);
 const invalid=[...postsFor('カイ').slice(0,7),...postsFor('後輩くん').slice(0,7)];
 s.get('jsonImport').value=JSON.stringify(invalid);
 s.run('importPosts()');
 assert.match(s.get('importStatus').textContent,/アカウントごとに14本/);
 assert.equal(s.storage.get('sns-post-manager-v1'),initial);
});
