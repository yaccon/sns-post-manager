import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('qa-iphone-v357.html','utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline);
class Element {
 constructor(){this.value='';this.hidden=false;this.style={display:''};this.textContent='';this.children=[];this.dataset={};this.files=[];}
 append(...xs){this.children.push(...xs)}
 appendChild(x){this.children.push(x)}
 replaceChildren(...xs){this.children=xs}
 focus(){}select(){}setSelectionRange(){}scrollIntoView(){}
 setAttribute(){}removeAttribute(){}addEventListener(){}querySelectorAll(){return []}
}
function app(legacyCopy=true){
 const all=new Map(),get=id=>{if(!all.has(id))all.set(id,new Element());return all.get(id)};
 const storage=new Map(),calls=[],clipboard=[];
 const ctx=vm.createContext({
  document:{getElementById:get,createElement:()=>new Element(),body:new Element(),addEventListener(){},execCommand:name=>{calls.push(name);return legacyCopy}},
  window:{isSecureContext:true,open(){}},
  navigator:{clipboard:{writeText:v=>{clipboard.push(v);return Promise.resolve()}}},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  setInterval(){},setTimeout:()=>123,clearTimeout(){},Date,Intl,Blob,URL,console
 });
 vm.runInContext(inline,ctx,{filename:'v357.js'});
 get('weekstart').value='2026-10-19';get('generationBatch').value='kai';get('destination').value='X';
 return {ctx,get,calls,clipboard,run:s=>vm.runInContext(s,ctx)};
}
test('Scripts parse and native system dialogs are absent',()=>{
 assert.doesNotThrow(()=>new vm.Script(inline));
 assert.match(html,/Ver\.3\.5\.7/);
 assert.doesNotMatch(html,/\b(?:alert|confirm|prompt)\s*\(/);
 assert.match(html,/id="chatLaunch357"/);
});
test('Post copy shows green success feedback but not ChatGPT launch',()=>{
 const a=app();
 a.run('posts.push({id:"a",account:"カイ",platform:"X",date:"2026-10-19T12:00",content:"コピー表示の確認",done:false})');
 a.run('copyPost("a")');
 assert.deepEqual(a.calls,['copy']);
 assert.equal(a.get('copyToast357').hidden,false);
 assert.match(a.get('copyToast357').textContent,/コピーしました/);
 assert.notEqual(a.get('chatLaunch357').style.display,'block');
});
test('Generated prompt copies 14 slots and exposes ChatGPT link',()=>{
 const a=app();
 a.run('generatePrompt()');
 assert.deepEqual(a.calls,['copy']);
 assert.match(a.get('copyField356').value,/次の14枠/);
 assert.equal(a.get('copyToast357').hidden,false);
 assert.equal(a.get('chatLaunch357').style.display,'block');
 assert.match(a.get('chatHelp357').textContent,/ChatGPTを開く/);
 assert.match(html,/id="chatLaunch357" href="https:\/\/chatgpt.com\/"/);
});
test('Async clipboard success also displays toast and launch link',async()=>{
 const a=app(false);
 a.run('generatePrompt()');
 assert.equal(a.get('chatLaunch357').style.display,'none');
 await Promise.resolve();await Promise.resolve();
 assert.equal(a.get('copyToast357').hidden,false);
 assert.equal(a.get('chatLaunch357').style.display,'block');
 assert.equal(a.clipboard.length,1);
});
