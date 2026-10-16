import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('qa-iphone-v356.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
class El {
 constructor(){this.value='';this.hidden=false;this.style={};this.textContent='';this.children=[];this.files=[];this.dataset={};}
 append(...x){this.children.push(...x)}
 appendChild(x){this.children.push(x);return x}
 replaceChildren(...x){this.children=x}
 focus(){}
 select(){}
 setSelectionRange(){}
 scrollIntoView(){}
 setAttribute(){}
 removeAttribute(){}
 addEventListener(){}
 querySelectorAll(){return []}
}
function setup(success=true){
 const dom=new Map(),get=id=>{if(!dom.has(id))dom.set(id,new El());return dom.get(id)};
 const data=new Map(),calls=[], written=[];
 const ctx=vm.createContext({
   document:{getElementById:get,createElement:()=>new El(),body:new El(),addEventListener:()=>{},execCommand:cmd=>{calls.push(cmd);return success}},
   localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},
   window:{isSecureContext:true,open:()=>{}},
   navigator:{clipboard:{writeText:v=>{written.push(v);return Promise.resolve()}}},
   Date,Intl,Blob,URL,console,setInterval:()=>{},setTimeout:()=>{}
 });
 vm.runInContext(js,ctx);
 get('weekstart').value='2026-10-19';
 get('generationBatch').value='kai';
 get('destination').value='X';
 return {ctx,get,data,calls,written,run:s=>vm.runInContext(s,ctx)};
}
test('No copy modal / browser-native dialog',()=>{
 assert.doesNotMatch(html,/id="copyDialog35"/);
 assert.doesNotMatch(html,/\b(?:alert|confirm|prompt)\s*\(/);
 assert.match(html,/Ver\.3\.5\.6/);
});
test('Post copy uses synchronous click-bound legacy copy',()=>{
 const s=setup();
 s.run('posts.push({id:"a",account:"カイ",platform:"X",date:"2026-10-19T12:00",content:"コピーしたい本文",done:false})');
 s.run('copyPost("a")');
 assert.deepEqual(s.calls,['copy']);
 assert.equal(s.get('copyField356').value,'コピーしたい本文');
 assert.equal(s.get('copyPanel356').hidden,true);
});
test('Generate 14 posts and copy immediately',()=>{
 const s=setup();
 s.run('generatePrompt()');
 assert.deepEqual(s.calls,['copy']);
 assert.match(s.get('copyField356').value,/次の14枠/);
 assert.match(s.get('copyField356').value,/カイ/);
 assert.equal(s.get('copyPanel356').hidden,true);
});
test('When execCommand fails, selectable fallback panel remains visible until async succeeds',async()=>{
 const s=setup(false);
 s.run('posts.push({id:"b",account:"カイ",platform:"Threads",date:"2026-10-19T20:00",content:"失敗した時の再試行",done:false})');
 s.run('copyPost("b")');
 assert.equal(s.get('copyPanel356').hidden,false);
 assert.equal(s.written.length,1);
 await Promise.resolve();await Promise.resolve();
 assert.equal(s.get('copyPanel356').hidden,true);
});
