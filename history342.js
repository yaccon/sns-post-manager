/* Ver.3.4.2: paste past ChatGPT drafts into the deduplication history only. */
let pastePreview342=null;

function parsePastedHistory342(raw, selectedAccount){
  const text=String(raw||"").trim();
  if(!text)throw Error("投稿文またはJSONを貼り付けてください。");
  if(text.length>1500000)throw Error("1回の貼り付けは約150万文字までです。分けて取り込んでください。");
  let entries;
  try{
    const parsed=JSON.parse(text.replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,""));
    if(Array.isArray(parsed))entries=parsed;
    else if(parsed && typeof parsed==="object" && Array.isArray(parsed.history))entries=parsed.history;
    else if(parsed && typeof parsed==="object" && Array.isArray(parsed.posts))entries=parsed.posts;
    else if(parsed && typeof parsed==="object" && Array.isArray(parsed.items))entries=parsed.items;
    else if(parsed && typeof parsed==="object" && typeof(parsed.content??parsed.text)==="string")entries=[parsed];
    else if(typeof parsed==="string")entries=[parsed];
    else throw Error("JSON内に投稿の配列がありません。");
  }catch(error){
    if(/^[\[{]/.test(text) || /^(\x60{3})/.test(text))throw Error("JSONの形式を確認してください。"+error.message);
    entries=[text]; // One ordinary prose draft, not line splitting
  }
  if(!entries.length)throw Error("投稿が0件です。");
  if(entries.length>5000)throw Error("一度に取り込めるのは5,000件までです。分割してください。");
  const permitted=["カイ","後輩くん","漫画・恋愛"];
  const result=[];
  for(let i=0;i<entries.length;i++){
    const value=entries[i];
    const item=typeof value==="string"?{content:value}:value;
    if(!item || typeof item!=="object" || Array.isArray(item))throw Error((i+1)+"件目が投稿文の形式ではありません。");
    const content=item.content??item.text;
    if(typeof content!=="string" || !content.trim() || content.trim().length>10000)throw Error((i+1)+"件目の本文が空、または長すぎます。");
    const account=(item.account??selectedAccount);
    if(!permitted.includes(account))throw Error((i+1)+"件目のアカウント名が未対応です："+String(account));
    result.push({
      account,
      content:content.trim(),
      date:typeof item.date==="string"?item.date:"",
      platform:["X","Threads"].includes(item.platform)?item.platform:"ChatGPT原稿"
    });
  }
  return result;
}
function computeHistoryPreview342(raw,account){
 const parsed=parsePastedHistory342(raw,account);
 const exists=new Set(history.filter(h=>h&&typeof h.account==="string"&&typeof h.content==="string").map(historyIdentity));
 const seen=new Set(),fresh=[],states=[];
 let duplicateCount=0;
 for(const p of parsed){
   const normalized=norm(p.content),id=historyIdentity(p);
   if(!normalized || seen.has(id) || exists.has(id)){duplicateCount++;states.push({post:p,kind:"登録済み／重複"});continue}
   seen.add(id);fresh.push(p);states.push({post:p,kind:"新規"});
 }
 return {raw,account,total:parsed.length,duplicates:duplicateCount,fresh,states};
}
function previewPastedHistory342(){
 const raw=document.getElementById("pasteHistory342").value;
 const account=document.getElementById("pasteAccount342").value;
 const status=document.getElementById("pasteStatus342"), panel=document.getElementById("pastePreview342");
 status.textContent="";panel.hidden=true;panel.replaceChildren();pastePreview342=null;
 try{
  const preview=computeHistoryPreview342(raw,account);
  pastePreview342=preview;
  const p=document.createElement("p");
  p.className="help";
  p.textContent="読み取り："+preview.total+"件　／　新規："+preview.fresh.length+"件　／　重複："+preview.duplicates+"件";
  panel.appendChild(p);
  const detail=document.createElement("p");detail.className="help";
  detail.textContent=preview.states.slice(0,30).map((x,i)=>(i+1)+". "+x.post.platform+"："+x.kind).join(" ／ ");
  panel.appendChild(detail);
  const names=["カイ","後輩くん","漫画・恋愛"];
  const summary=document.createElement("p");
  summary.className="help";
  summary.textContent=names.map(name=>name+"："+preview.fresh.filter(x=>x.account===name).length+"件").join("　");
  panel.appendChild(summary);
  const list=document.createElement("div");
  list.className="paste-samples342";
  for(const item of preview.fresh.slice(0,5)){
    const entry=document.createElement("div");entry.className="paste-entry342";
    const title=document.createElement("strong");title.textContent=item.account+" ／ "+item.platform+(item.date?" ／ "+item.date.replace("T"," "):"")+" ／ 過去原稿";
    const body=document.createElement("p");body.textContent=item.content;
    entry.append(title,body);list.appendChild(entry);
  }
  panel.appendChild(list);
  const actions=document.createElement("div");actions.className="row";
  const save=document.createElement("button");save.className="primary";
  save.textContent=preview.fresh.length+"件を履歴に追加";save.disabled=!preview.fresh.length;save.onclick=savePastedHistory342;
  const cancel=document.createElement("button");cancel.className="secondary";
  cancel.textContent="キャンセル";cancel.onclick=()=>{pastePreview342=null;panel.hidden=true;status.textContent="取り込みをキャンセルしました。"};
  actions.append(save,cancel);panel.appendChild(actions);
  panel.hidden=false;
  status.textContent=preview.fresh.length?"内容を確認し、問題がなければ履歴に追加してください。":"すべて登録済みです。新しい履歴はありません。";
 }catch(e){
  status.textContent="読み取りできません："+e.message;
  status.className="status paste-error342";
 }
}
async function savePastedHistory342(){
 const status=document.getElementById("pasteStatus342"),panel=document.getElementById("pastePreview342");
 if(!pastePreview342)return;
 const raw=document.getElementById("pasteHistory342").value;
 const account=document.getElementById("pasteAccount342").value;
 if(raw!==pastePreview342.raw || account!==pastePreview342.account){
  status.textContent="入力が変わりました。もう一度「内容を確認」を押してください。";
  pastePreview342=null;panel.hidden=true;return;
 }
 let updated;
 try{updated=computeHistoryPreview342(raw,account)}catch(e){status.textContent=e.message;return}
 if(!updated.fresh.length){status.textContent="追加対象がありません。";panel.hidden=true;return}
 if(!await uiConfirm35("過去投稿 "+updated.fresh.length+"件を重複防止履歴だけに追加しますか？ 投稿予定には追加しません。"))return;
 // Calculate the complete next archive and store before changing in-memory history.
 const newHistory=history.concat(updated.fresh);
 try{
   localStorage.setItem(historyKey,JSON.stringify(newHistory));
 }catch(e){
   status.textContent="保存できませんでした。データの空き容量やブラウザの設定を確認してください。";
   return;
 }
 history=newHistory;
 pastePreview342=null;
 panel.hidden=true;
 document.getElementById("pasteHistory342").value="";
 status.className="status";
 status.textContent="登録完了："+updated.fresh.length+"件を過去投稿履歴に追加しました。投稿予定は変更していません。履歴合計："+history.length+"件。";
 if(typeof refreshBackupStatus==="function")refreshBackupStatus();
 refreshStorageUsage342();
}
async function pasteClipboardHistory342(){
 const field=document.getElementById("pasteHistory342");
 try{
   if(!navigator.clipboard || typeof navigator.clipboard.readText!=="function")throw Error("unsupported");
   const copied=await navigator.clipboard.readText();
   if(!copied.trim()){field.focus();document.getElementById("pasteStatus342").textContent="コピーした文章がありません。";return}
   field.value=copied;
   document.getElementById("pasteStatus342").textContent="貼り付けました。「①内容を確認」を押してください。";
   field.focus();
 }catch(e){
   field.focus();
   document.getElementById("pasteStatus342").textContent="自動貼り付けができません。入力欄を長押しして「ペースト」を選んでください。";
 }
}
function formatBytes342(bytes){
 if(bytes<1024)return bytes+" B";
 if(bytes<1024*1024)return (bytes/1024).toFixed(1)+" KB";
 return (bytes/1024/1024).toFixed(2)+" MB";
}
function utf8Bytes342(text){return new Blob([String(text)]).size}
function refreshStorageUsage342(){
 const view=document.getElementById("storageUsage342");
 if(!view)return;
 try{
   const scheduled=localStorage.getItem(key)||"[]";
   const archived=localStorage.getItem(historyKey)||"[]";
   const postsBytes=utf8Bytes342(scheduled);
   const historyBytes=utf8Bytes342(archived);
   const total=postsBytes+historyBytes;
   let text="投稿予定："+formatBytes342(postsBytes)+" ／ 過去履歴："+formatBytes342(historyBytes)+" ／ 合計："+formatBytes342(total);
   const accounts=["カイ","後輩くん","漫画・恋愛"];
   const grouped=accounts.map(a=>a+" "+history.filter(h=>h?.account===a).length+"件").join("・");
   text+="\n履歴の内訳："+grouped;
   if(total>3.5*1024*1024)text+="\n容量が増えています。先にバックアップを保存してください。";
   else text+="\n※このアプリの2つの保存領域の概算です。iPhone全体の使用量や空き容量ではありません。";
   view.textContent=text;
 }catch(e){view.textContent="保存容量を測定できません。"}
}
refreshStorageUsage342();
