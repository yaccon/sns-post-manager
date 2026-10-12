/* SNS投稿管理 Ver.3.2: ローカル投稿履歴と登録前の重複チェック */
const v32Key="sns-post-manager-history-v1";
let v32History=[];
let v32Review=[];
let v32Skipped={date:0,text:0};
try{
 const saved=JSON.parse(localStorage.getItem(v32Key)||"[]");
 if(Array.isArray(saved))v32History=saved.filter(p=>p&&typeof p.account==="string"&&typeof p.content==="string");
}catch(e){console.warn("履歴の読み込みに失敗",e)}
function v32Count(){
 const el=document.getElementById("v32-history-count");
 if(el)el.textContent="重複防止用の投稿履歴："+v32History.length+"件（このiPhoneのブラウザ内）";
}
function v32Remember(entries){
 const seen=new Set(v32History.map(p=>p.account+"|"+norm(p.content)));
 const next=v32History.slice();
 for(const p of entries){
  if(!p||typeof p.account!=="string"||typeof p.content!=="string"||!p.content.trim())continue;
  const key=p.account+"|"+norm(p.content);
  if(seen.has(key))continue;
  seen.add(key);
  next.push({account:p.account,platform:p.platform||"",date:p.date||"",content:p.content,rememberedAt:new Date().toISOString()});
 }
 if(next.length===v32History.length){v32Count();return true}
 try{
  localStorage.setItem(v32Key,JSON.stringify(next));v32History=next;v32Count();return true;
 }catch(e){alert("過去投稿の履歴を保存できません。ブラウザの空き容量を確認してください。");return false}
}
if(posts.length&&!v32Remember(posts))console.warn("既存投稿の履歴記録に失敗");
v32Count();
function v32Similarity(left,right){
 const a=norm(left),b=norm(right);
 if(a.length<20||b.length<20)return 0;
 if(a===b)return 1;
 const grams=t=>{const m=new Map();for(let i=0;i<t.length-1;i++){const g=t.slice(i,i+2);m.set(g,(m.get(g)||0)+1)}return m};
 const A=grams(a),B=grams(b);let intersection=0;
 for(const [g,n] of A)intersection+=Math.min(n,B.get(g)||0);
 return 2*intersection/(a.length+b.length-2);
}
function v32Closest(p,candidates){
 let score=0,other=null;
 for(const c of candidates){
  if(c.account!==p.account)continue;
  const value=v32Similarity(p.content,c.content);
  if(value>score){score=value;other=c}
 }
 return score>=0.58?{score,other}:null;
}
/* 既存の投稿保存・編集・削除を保持したまま履歴を維持 */
const v32OldSave=savePost;
savePost=function(){
 const content=document.getElementById("content").value.trim();
 if(content&&!v32Remember([{account:document.getElementById("account").value,platform:document.getElementById("platform").value,date:document.getElementById("date").value,content}]))return;
 v32OldSave();
};
const v32OldEdit=editPost;
editPost=function(id){
 const previous=posts.find(p=>p.id===id);
 if(previous&&!v32Remember([previous]))return;
 v32OldEdit(id);
 const current=posts.find(p=>p.id===id);
 if(current)v32Remember([current]);
};
const v32OldDelete=deletePost;
deletePost=function(id){const p=posts.find(p=>p.id===id);if(p&&!v32Remember([p]))return;v32OldDelete(id)};
const v32OldBulkDelete=bulkDelete;
bulkDelete=function(){if(!v32Remember(posts.filter(p=>selected.has(String(p.id)))))return;v32OldBulkDelete()};
const v32OldClear=clearAll;
clearAll=function(){if(!v32Remember(posts))return;v32OldClear()};
const v32OldCopyText=copyText;
copyText=function(text){
 /* 42本生成ボタンが呼ぶ共通コピー処理に過去投稿を必ず追記 */
 const recent=v32History.slice(-150).map(p=>({account:p.account,content:p.content}));
 return v32OldCopyText(text+"\n過去投稿履歴（直近最大150件。似た題材や主張も避ける）:"+JSON.stringify(recent));
};
function importPosts(){
 const status=document.getElementById("importStatus"),panel=document.getElementById("v32-review");
 panel.hidden=true;panel.replaceChildren();v32Review=[];
 let raw=document.getElementById("jsonImport").value.trim();
 raw=raw.replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"");
 let items;try{items=JSON.parse(raw)}catch(e){status.textContent="JSON形式を確認してください。";return}
 if(!Array.isArray(items)||items.length!==42){status.textContent="42本ちょうど必要です。現在："+(Array.isArray(items)?items.length:"配列ではありません")+"本";return}
 const accounts=["カイ","後輩くん","漫画・恋愛"];
 const start=document.getElementById("weekstart").value,platform=document.getElementById("destination").value;
 if(!start){status.textContent="開始日を指定してください";return}
 const expected=new Set();
 for(const a of accounts)for(let d=0;d<7;d++)for(const t of ["12:00","20:00"])expected.add(a+"|"+localDay(start,d)+"T"+t);
 const usedSlots=new Set();
 for(const p of items){
  if(!p||!accounts.includes(p.account)||p.platform!==platform||typeof p.date!=="string"||typeof p.content!=="string"||!p.content.trim()){
   status.textContent="アカウント・投稿先・日付・本文の形式を確認してください";return
  }
  const slot=p.account+"|"+p.date;
  if(!expected.has(slot)||usedSlots.has(slot)){status.textContent="日時・アカウントの重複や指定外の値があります";return}
  usedSlots.add(slot);
 }
 const existingSlots=new Set(posts.map(p=>p.account+"|"+p.platform+"|"+p.date));
 const texts=new Set([...v32History,...posts].map(p=>norm(p.content)));
 const comparisons=[...v32History,...posts];v32Skipped={date:0,text:0};
 for(const p of items){
  const slot=p.account+"|"+p.platform+"|"+p.date;
  if(existingSlots.has(slot)){v32Skipped.date++;continue}
  if(texts.has(norm(p.content))){v32Skipped.text++;continue}
  const candidate={post:{account:p.account,platform:p.platform,date:p.date,content:p.content.trim()},similar:v32Closest(p,comparisons),selected:true};
  candidate.selected=!candidate.similar;
  v32Review.push(candidate);
  comparisons.push(candidate.post);texts.add(norm(p.content));
 }
 if(!v32Review.length){status.textContent="新しく登録できる投稿はありません（本文重複："+v32Skipped.text+"本、日時重複："+v32Skipped.date+"本）";return}
 v32RenderReview();
}
function v32RenderReview(){
 const panel=document.getElementById("v32-review");panel.hidden=false;panel.replaceChildren();
 const headline=document.createElement("strong");headline.textContent="登録する投稿を確認（"+v32Review.length+"本）";
 const note=document.createElement("p");note.className="help";
 note.textContent="本文の完全一致 "+v32Skipped.text+"本・日時重複 "+v32Skipped.date+"本を除外。文章が似ていると判定した "+v32Review.filter(x=>x.similar).length+"本は選択を外しています。選んだ投稿のみ登録します。";
 const list=document.createElement("div");list.className="v32-scroll";
 v32Review.forEach(item=>{
  const div=document.createElement("div");div.className="v32-line";
  const label=document.createElement("label"),box=document.createElement("input");box.type="checkbox";box.checked=item.selected;
  box.onchange=()=>{item.selected=box.checked;v32UpdateSelected()};
  const title=document.createElement("strong");title.textContent=item.post.account+" ／ "+item.post.date.replace("T"," ");
  label.append(box,title);div.appendChild(label);
  const content=document.createElement("p");content.textContent=item.post.content;div.appendChild(content);
  if(item.similar){
   const warning=document.createElement("div");warning.className="v32-warn";
   warning.textContent="文章が似ています（文字一致度 "+Math.round(item.similar.score*100)+"%）："+item.similar.other.content.slice(0,100);
   div.appendChild(warning);
  }
  list.appendChild(div);
 });
 const tally=document.createElement("p");tally.id="v32-selected";tally.className="status";
 const buttons=document.createElement("div");buttons.className="row";
 const confirmButton=document.createElement("button");confirmButton.className="primary";confirmButton.textContent="選択した投稿を登録";confirmButton.onclick=v32CommitReview;
 const cancel=document.createElement("button");cancel.className="secondary";cancel.textContent="キャンセル";cancel.onclick=()=>{v32Review=[];panel.hidden=true};
 buttons.append(confirmButton,cancel);panel.append(headline,note,list,tally,buttons);v32UpdateSelected();
 panel.scrollIntoView({behavior:"smooth",block:"start"});
}
function v32UpdateSelected(){
 const label=document.getElementById("v32-selected");
 if(label)label.textContent="登録対象："+v32Review.filter(v=>v.selected).length+"本";
}
function v32CommitReview(){
 const desired=v32Review.filter(v=>v.selected).map(v=>v.post);
 if(!desired.length){alert("登録する投稿を選択してください");return}
 const activeSlots=new Set(posts.map(p=>p.account+"|"+p.platform+"|"+p.date));
 const activeTexts=new Set([...v32History,...posts].map(p=>norm(p.content)));
 const fresh=[];
 for(const p of desired){
  const slot=p.account+"|"+p.platform+"|"+p.date;
  if(activeSlots.has(slot)||activeTexts.has(norm(p.content)))continue;
  activeSlots.add(slot);activeTexts.add(norm(p.content));
  fresh.push({...p,id:Date.now()+"-"+Math.random(),done:false});
 }
 if(!fresh.length){alert("新たに登録できる投稿はありません");return}
 if(!confirm(fresh.length+"本を登録しますか？"))return;
 if(!v32Remember(fresh))return;
 posts.push(...fresh);
 if(!persist()){posts.splice(posts.length-fresh.length,fresh.length);return}
 document.getElementById("importStatus").textContent=fresh.length+"本を登録しました（完全重複 "+v32Skipped.text+"本、日時重複 "+v32Skipped.date+"本を除外）";
 document.getElementById("jsonImport").value="";
 document.getElementById("v32-review").hidden=true;
 v32Review=[];render();
}
function exportBackup(){
 if(!v32Remember(posts))return;
 const blob=new Blob([JSON.stringify({version:4,posts,history:v32History},null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="sns-posts-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function restoreBackup(e){
 const file=e.target.files[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text()),entries=Array.isArray(data)?data:data.posts;
  if(!Array.isArray(entries)||!entries.every(p=>p&&typeof p.content==="string"&&typeof p.account==="string"&&typeof p.platform==="string"))throw Error("投稿データの形式が違います");
  const history=Array.isArray(data.history)?data.history.filter(p=>p&&typeof p.content==="string"&&typeof p.account==="string"):[];
  if(!confirm(entries.length+"件の投稿と"+history.length+"件の履歴を追加しますか？"))return;
  if(!v32Remember([...entries,...history]))return;
  const original=posts.slice(),ids=new Set(posts.map(p=>String(p.id)));
  for(const p of entries){
   if(ids.has(String(p.id)))continue;
   const id=p.id||Date.now()+"-"+Math.random();
   posts.push({...p,id});ids.add(String(id));
  }
  if(!persist())posts=original;
  render();
 }catch(err){alert("復元できません："+err.message)}
 finally{e.target.value=""}
}
