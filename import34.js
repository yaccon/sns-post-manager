/* Ver.3.4: read post history locally, without uploading archives. */
let import34Rows=[],import34Snapshot=null;
function import34Status(message,error=false){const el=document.getElementById("importStatus34");el.textContent=message;el.className="import-status"+(error?" error":"")}
function import34Date(value){
 if(!value)return "";
 const d=typeof value==="number"?new Date(value<1e12?value*1000:value):new Date(value);
 if(!Number.isFinite(d.getTime()))return "";
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")+"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}
function import34Entry(content,date){
 if(typeof content!=="string"||!content.trim()||content.length>10000)return null;
 return {content:content.trim(),date:import34Date(date)};
}
function import34X(data){
 const list=Array.isArray(data)?data:Array.isArray(data?.tweets)?data.tweets:null;
 if(!list)throw Error("Xの投稿配列が見つかりません");
 return list.map(record=>{
  const t=record?.tweet||record;
  if(!t||typeof t!=="object")return null;
  const content=t.full_text??t.fullText??t.text;
  if(typeof content!=="string"||/^RT @\w+:/i.test(content)||t.retweeted_status)return null;
  /* Replies to other people's posts are not imported as standalone posts. */
  if(t.in_reply_to_status_id||t.in_reply_to_user_id)return null;
  return import34Entry(content,t.created_at||t.createdAt);
 }).filter(Boolean);
}
function import34Threads(data){
 const results=[],seen=new Set();
 const add=(text,date)=>{
  const p=import34Entry(text,date);
  if(!p)return;
  const id=p.date+"|"+p.content;
  if(!seen.has(id)){seen.add(id);results.push(p)}
 };
 function visit(value,depth=0){
  if(!value||depth>10)return;
  if(Array.isArray(value)){value.forEach(v=>visit(v,depth+1));return}
  if(typeof value!=="object")return;
  const date=value.creation_timestamp??value.timestamp??value.created_at??value.taken_at??value.date;
  const direct=value.post_text??value.postText??value.caption??value.body??value.text??value.content;
  if(typeof direct==="string")add(direct,date);
  /* A Threads export can store the post as a media title. */
  if(Array.isArray(value.media))for(const media of value.media){
   if(media&&typeof media==="object")add(media.title??media.caption,media.creation_timestamp??date);
  }
  for(const [key,child] of Object.entries(value)){
   if(/^(?:inbox|messages?|conversations?|direct_messages?|contacts?|profile|likes?|followers?|following|comments?|reactions?|stories?|location|search_history)$/i.test(key))continue;
   if(child&&typeof child==="object")visit(child,depth+1);
  }
 }
 visit(data);
 return results;
}
function import34Csv(source){
 const rows=[],table=[];let field="",row=[],quoted=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(quoted){if(c==='"'&&source[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}
  else if(c==='"')quoted=true;
  else if(c===','){row.push(field);field=""}
  else if(c==='\n'){row.push(field);table.push(row);row=[];field=""}
  else if(c!=='\r')field+=c;
 }
 if(field||row.length){row.push(field);table.push(row)}
 const head=(table.shift()||[]).map(x=>x.trim().replace(/^\ufeff/,"").toLowerCase());
 const textColumn=head.findIndex(x=>["text","full_text","content","post_text","caption","本文","投稿文"].includes(x));
 const dateColumn=head.findIndex(x=>["created_at","date","timestamp","日時","投稿日"].includes(x));
 if(textColumn<0)throw Error("CSVの本文列（text、content等）が見つかりません");
 for(const r of table){const p=import34Entry(r[textColumn],dateColumn<0?"":r[dateColumn]);if(p)rows.push(p)}
 return rows;
}
function import34Parse(text,fileName,source){
 const name=fileName.toLowerCase();
 if(source==="Threads"&&/^(?:inbox|messages?|direct_messages?|conversations?|contacts?|likes?|followers?|following|comments?|stories?|profile)(?:[-_.]|$)/i.test(name.split("/").pop()))throw Error("投稿以外のファイルは読み込めません。Threadsの投稿履歴を選択してください");
 if(name.endsWith(".csv"))return import34Csv(text);
 if(name.endsWith(".txt"))return text.split(/\r?\n/).map(t=>import34Entry(t,"")).filter(Boolean);
 let raw=text.trim().replace(/^\ufeff/,"");
 if(name.endsWith(".js")){
  if(!/^window\.YTD\.(?:tweets?|tweet)\.part\d+\s*=\s*/i.test(raw))throw Error("X公式のtweets.jsを選んでください");
  raw=raw.replace(/^window\.YTD\.(?:tweets?|tweet)\.part\d+\s*=\s*/i,"").replace(/;\s*$/,"");
 }
 let data;try{data=JSON.parse(raw)}catch(e){throw Error("JSON形式として読み取れませんでした")}
 return source==="X"?import34X(data):import34Threads(data);
}
function import34ZipCandidate(path,source){
 const p=path.toLowerCase(),base=p.split("/").pop();
 if(/(?:^|\/)(?:inbox|direct_messages?|messages?|conversations?|contacts?|profile|likes?|followers?|following|comments?|stories?|instagram)\//.test(p))return false;
 if(source==="X")return /^tweets?(?:[-_.]\d+)?\.(?:js|json)$/.test(base);
 return /(threads?|posts?)(?:[-_.][\w-]+)?\.(?:json|csv)$/.test(base);
}
async function import34Unzip(file,source){
 let Zip=window.JSZip;
 if(!Zip){
  if(!window.import34Loading){
   window.import34Loading=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
    script.onload=()=>window.JSZip?resolve(window.JSZip):reject(Error("ZIP展開機能を読み込めません"));
    script.onerror=()=>reject(Error("ZIP展開機能を読み込めません。ファイルを解凍してtweets.jsなどを選んでください"));
    document.head.appendChild(script);
   }).catch(e=>{window.import34Loading=null;throw e});
  }
  Zip=await window.import34Loading;
 }
 const archive=await Zip.loadAsync(file);
 const paths=Object.keys(archive.files).filter(p=>!archive.files[p].dir&&import34ZipCandidate(p,source)).slice(0,25);
 if(!paths.length)throw Error("ZIP内に投稿ファイルがありません。解凍して対象のJS/JSONを選んでください");
 const rows=[];
 for(const path of paths){
  const member=archive.files[path];
  if(member._data?.uncompressedSize>25*1024*1024)throw Error("投稿ファイルが大きすぎます。ZIPを解凍して個別に選んでください");
  const raw=await member.async("string");
  try{rows.push(...import34Parse(raw,path,source))}catch(e){console.warn("ファイル形式を確認",path,e.message)}
  if(rows.length>=30000)break;
 }
 if(!rows.length)throw Error("投稿本文を抽出できませんでした。ZIPを解凍して対象ファイルを選んでください");
 return rows;
}
async function prepareHistoryImport(){
 const file=document.getElementById("importFile").files?.[0],preview=document.getElementById("importPreview34");
 preview.hidden=true;preview.replaceChildren();import34Rows=[];import34Snapshot=null;
 if(!file){import34Status("");return}
 const source=document.getElementById("importSource").value,account=document.getElementById("importAccount").value;
 try{
  if(file.size>120*1024*1024)throw Error("120MBを超えるファイルです。ZIPを解凍して投稿ファイルだけ選んでください");
  import34Status("ファイルを解析中です…");
  const parsed=/\.zip$/i.test(file.name)?await import34Unzip(file,source):import34Parse(await file.text(),file.name,source);
  const seen=new Set();
  import34Rows=parsed.filter(row=>{const id=norm(row.content);if(!id||seen.has(id))return false;seen.add(id);return true}).slice(0,15000);
  if(!import34Rows.length)throw Error("読み込める投稿がありませんでした。別のデータファイルを選んでください");
  import34Snapshot={source,account,file:file.name};
  import34Status("読み込みが完了しました。下で確認してから保存してください。");
  renderHistoryImport();
 }catch(e){import34Rows=[];import34Status("読み込みできません："+e.message,true)}
}
function renderHistoryImport(){
 const panel=document.getElementById("importPreview34");panel.hidden=false;panel.replaceChildren();
 const snap=import34Snapshot;
 const existing=new Set(history.filter(p=>p?.account===snap.account).map(p=>norm(p.content)));
 const fresh=import34Rows.filter(p=>!existing.has(norm(p.content)));
 const header=document.createElement("p");header.className="import-stats";
 header.textContent="選択ファイル："+snap.file+"\n企画："+snap.account+" ／ "+snap.source+"\n抽出："+import34Rows.length+"件、登録候補："+fresh.length+"件、履歴内の重複："+(import34Rows.length-fresh.length)+"件";
 const sub=document.createElement("p");sub.className="import-step";
 sub.textContent="内容の先頭10件を確認してください。取り込むのは投稿本文と日時だけです。投稿予定一覧には追加されません。";
 const sample=document.createElement("div");sample.className="import-scroll";
 for(const p of fresh.slice(0,10)){
  const div=document.createElement("div");div.className="import-line",date=document.createElement("span"),body=document.createElement("p");
  date.textContent=p.date?p.date.replace("T"," "):"日時未設定";
  body.textContent=p.content;
  div.append(date,body);sample.appendChild(div);
 }
 const buttons=document.createElement("div");buttons.className="import-buttons";
 const save=document.createElement("button");save.className="primary";save.textContent=fresh.length+"件を履歴に登録";save.disabled=!fresh.length;save.onclick=commitHistoryImport;
 const cancel=document.createElement("button");cancel.className="secondary";cancel.textContent="キャンセル";cancel.onclick=()=>{import34Rows=[];import34Snapshot=null;panel.hidden=true;import34Status("取り込みをキャンセルしました")};
 buttons.append(save,cancel);panel.append(header,sub,sample,buttons);
}
function commitHistoryImport(){
 if(!import34Snapshot||!import34Rows.length)return;
 const {account,source}=import34Snapshot;
 if(account!==document.getElementById("importAccount").value||source!==document.getElementById("importSource").value){
  import34Status("企画またはSNSの選択が変わりました。ファイルを選び直してください。",true);return;
 }
 const existing=new Set(history.filter(p=>p?.account===account).map(p=>norm(p.content)));
 const candidates=import34Rows.filter(p=>!existing.has(norm(p.content)));
 if(!candidates.length){import34Status("新規の投稿はありません");return}
 if(!confirm(account+"の過去投稿 "+candidates.length+"件を、重複防止用の履歴だけに保存しますか？"))return;
 /* Atomic localStorage update. Never modify scheduled posts. */
 const old=history;
 const incoming=candidates.map(p=>({account,platform:source,content:p.content,date:p.date}));
 const updated=history.slice(),seen=new Set(history.map(p=>p.account+"|"+norm(p.content)));
 for(const p of incoming){const key=p.account+"|"+norm(p.content);if(seen.has(key))continue;seen.add(key);updated.push(p)}
 try{
  localStorage.setItem(historyKey,JSON.stringify(updated));history=updated;
  if(typeof refreshBackupStatus==="function")refreshBackupStatus();
  if(typeof refreshStorageUsage342==="function")refreshStorageUsage342();
  import34Status("保存しました："+(updated.length-old.length)+"件。投稿予定一覧には追加されていません。バックアップを保存しておくと安心です。");
  document.getElementById("importPreview34").hidden=true;
  import34Rows=[];import34Snapshot=null;document.getElementById("importFile").value="";
 }catch(e){history=old;import34Status("端末内の保存に失敗しました。ブラウザ容量を確認してください。",true)}
}
