/* SNS投稿管理 Ver.3.8
 * Explicit X formats: free single, free thread, Premium long post.
 * User settings persist separately from existing post and history records.
 * No background posting or paid API required.
 */
const formatSettingsKey38="sns-post-manager-format-settings-v1";
const defaultFormatSettings38={xFormat:"single",xTarget:"120",threadCount:3,premiumTarget:"800",threadsTarget:"200"};
function normalizeFormatSettings38(raw){
 const obj=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
 const xFormat=["single","thread","premium"].includes(obj.xFormat)?obj.xFormat:"single";
 const xTarget=["100","120","140","auto"].includes(String(obj.xTarget))?String(obj.xTarget):"120";
 const num=Number(obj.threadCount);
 const threadCount=Number.isInteger(num)&&num>=2&&num<=5?num:3;
 const premiumTarget=["300","800","1500","3000"].includes(String(obj.premiumTarget))?String(obj.premiumTarget):"800";
 const threadsTarget=["100","150","200","300","400","450","500","auto"].includes(String(obj.threadsTarget))?String(obj.threadsTarget):"200";
 return {xFormat,xTarget,threadCount,premiumTarget,threadsTarget};
}
function loadFormatSettings38(){
 try{return normalizeFormatSettings38(JSON.parse(localStorage.getItem(formatSettingsKey38)||"{}"))}
 catch(e){return {...defaultFormatSettings38}}
}
let formatSettings38=loadFormatSettings38();
function formatSignature38(){
 return JSON.stringify(formatSettings38);
}
function formatLabel38(post){
 if(post?.platform!=="X")return "通常投稿";
 if(Array.isArray(post.threadParts)&&post.threadParts.length>1)return "スレッド "+post.threadParts.length+"本";
 if(post.postFormat==="premium")return "X Premium 長文";
 return "通常投稿";
}
function formatConfigurationSummary38(){
 const s=formatSettings38;
 return s.xFormat==="thread"
  ?"無料X・スレッド"+s.threadCount+"本（各投稿、日本語"+(s.xTarget==="auto"?"上限内":s.xTarget+"文字目安")+"）"
  :s.xFormat==="premium"?"X Premium・長文（日本語"+s.premiumTarget+"文字目安）"
  :"無料X・通常1本（日本語"+(s.xTarget==="auto"?"上限内":s.xTarget+"文字目安")+"）";
}
function formatInit38(){
 const ids=[["xFormat38","xFormat"],["xTarget38","xTarget"],["threadCount38","threadCount"],["premiumTarget38","premiumTarget"],["threadsTarget38","threadsTarget"]];
 for(const [id,key] of ids){
  const el=document.getElementById(id);
  if(el)el.value=String(formatSettings38[key]);
 }
 refreshFormatUi38();
}
function formatSelectionChanged38(){
 const values={
  xFormat:document.getElementById("xFormat38").value,
  xTarget:document.getElementById("xTarget38").value,
  threadCount:Number(document.getElementById("threadCount38").value),
  premiumTarget:document.getElementById("premiumTarget38").value,
  threadsTarget:document.getElementById("threadsTarget38").value
 };
 const previous=formatSettings38;
 const next=normalizeFormatSettings38(values);
 try{
  localStorage.setItem(formatSettingsKey38,JSON.stringify(next));
  formatSettings38=next;
  const status=document.getElementById("formatStatus38");
  if(status)status.textContent="✓ この設定を保存しました。次回アプリを開いても引き継がれます。";
 }catch(e){
  formatSettings38=previous;
  const status=document.getElementById("formatStatus38");
  if(status)status.textContent="設定を保存できませんでした。空き容量やブラウザ設定を確認してください。";
  for(const [id,key] of [["xFormat38","xFormat"],["xTarget38","xTarget"],["threadCount38","threadCount"],["premiumTarget38","premiumTarget"],["threadsTarget38","threadsTarget"]]){
   document.getElementById(id).value=String(previous[key]);
  }
 }
 refreshFormatUi38();
}
function refreshFormatUi38(){
 const s=formatSettings38;
 const destination=document.getElementById("destination")?.value||"X";
 const xPanel=document.getElementById("xFormatPanel38");
 if(xPanel)xPanel.hidden=destination!=="X";
 const threadsPanel=document.getElementById("threadsTargetPanel38");
 if(threadsPanel)threadsPanel.hidden=destination!=="Threads";
 const parts=document.getElementById("threadCountGroup38");
 if(parts)parts.hidden=s.xFormat!=="thread";
 const length=document.getElementById("xTargetGroup38");
 if(length)length.hidden=s.xFormat==="premium";
 const premium=document.getElementById("premiumTargetGroup38");
 if(premium)premium.hidden=s.xFormat!=="premium";
 const summary=document.getElementById("formatSummary38");
 if(summary)summary.textContent=destination==="X"?formatConfigurationSummary38():"Threads：通常投稿1本・日本語"+(s.threadsTarget==="auto"?"500文字以内で自動調整":s.threadsTarget+"文字目安")+"。Xの設定は保持します。";
 refreshManualThread38();
}
function formatTargetRule38(){
 const s=formatSettings38;
 if(s.xTarget==="auto")return "Xの文字数上限280（日本語は原則1文字2カウント）を必ず守り、各投稿は無理に上限まで使わないこと。";
 return "各投稿は日本語で約"+s.xTarget+"文字を目標とし、Xの加重文字数280以内を厳守。日本語は原則1文字2カウントで、URLは通常23カウントとする。";
}
function formatGenerationInstruction38(platform){
 if(platform!=="X")return "\n【Threads投稿形式：通常投稿1本】\nThreadsの通常投稿1本を各予定枠に作成。"+
  (formatSettings38.threadsTarget==="auto"?"500文字以内で読みやすく調整する。":"各投稿は日本語で約"+formatSettings38.threadsTarget+"文字を目標とする。")+
  "本文は日本語・記号・改行を含め通常投稿500文字以内を厳守する。10,000文字の長文添付は別機能なので利用しない。"+
  "JSONは従来どおりaccount,platform,date,contentを含め、threadPartsは含めない。Xの加重280カウントを適用しない。";
 const s=formatSettings38;
 if(s.xFormat==="thread")return "\n【X投稿形式：無料アカウント向けスレッド】\n"+
  "各予定枠は1つのスレッドとして作り、各枠"+s.threadCount+"投稿分の本文を生成してください（予定枠の数は増やさない）。各投稿は"+formatTargetRule38()+
  "各スレッドは冒頭のフック、独立した解説、余韻や結論で自然につながること。番号（1/"+s.threadCount+"など）は本文には入れず、アプリ画面側で表示します。"+
  "JSON各要素には既存のaccount,platform,dateに加え、postFormat:\"thread\", threadParts:[各投稿の本文を"+s.threadCount+"本], content:threadParts[0] を必ず含める。"+
  "コピー元の参考投稿から文章、事例、物語を流用しない。";
 if(s.xFormat==="premium")return "\n【X投稿形式：X Premium向け長文】\n"+
  "各予定枠につき長文1投稿、日本語で約"+s.premiumTarget+"文字を目標とする（X Premiumの長文投稿機能が必要）。"+
  "最大25,000文字の上限を超えないこと。JSON各要素はaccount,platform,date,contentに加えpostFormat:\"premium\"を含め、threadPartsは含めない。";
 return "\n【X投稿形式：無料アカウント向け通常投稿】\n"+
  "各予定枠につき通常投稿1本。"+formatTargetRule38()+
  "JSON各要素はaccount,platform,date,contentを含め、threadPartsは含めない。";
}
/* Conservative estimate: ordinary ASCII/Latin-1 counts as 1; CJK as 2; emojis as
 * a single 2-weight grapheme cluster; http(s) links as 23. Actual X composer owns
 * the authoritative final count, so we warn users to verify before publishing. */
function xWeightedLength38(value){
 const s=String(value||"");
 const urlPattern=/https?:\/\/[^\s]+/giu;
 let result=0,prev=0;
 const countText=text=>{
  if(!text)return 0;
  const segmenter=typeof Intl.Segmenter==="function"?new Intl.Segmenter("ja",{granularity:"grapheme"}):null;
  const chunks=segmenter?Array.from(segmenter.segment(text),v=>v.segment):Array.from(text);
  let sum=0;
  for(const segment of chunks){
   const cp=segment.codePointAt(0);
   if(cp<=4351||(cp>=8192&&cp<=8205)||(cp>=8208&&cp<=8223)||(cp>=8242&&cp<=8247))sum+=1;
   else sum+=2;
  }
  return sum;
 };
 for(const m of s.matchAll(urlPattern)){
  result+=countText(s.slice(prev,m.index));
  result+=23;prev=m.index+m[0].length;
 }
 return result+countText(s.slice(prev));
}
/* UTF-16 code units are a deliberately conservative approximate limit for Threads;
 * emoji sequences may count differently in the native composer. */
function threadsTextLength38(value){return String(value||"").length}
function validateGeneratedFormat38(item,platform="X"){
 if(platform!=="X"){
  if(Array.isArray(item.threadParts))return {error:"Threadsは通常1本です。スレッド配列を取り込むことはできません。"};
  const content=String(item.content||"").trim();
  const length=threadsTextLength38(content);
  if(length>500)return {error:"Threads通常投稿の500文字を超えています（概算"+length+"文字）。短く修正してください。長文テキスト添付は別操作です。"};
  return {content,postFormat:"single"};
 }
 const mode=formatSettings38.xFormat;
 if(mode==="thread"){
  if(!Array.isArray(item.threadParts)||item.threadParts.length!==formatSettings38.threadCount)return {error:"スレッドは"+formatSettings38.threadCount+"本のthreadParts配列が必要です。ChatGPTで再生成してください。"};
  if(!item.threadParts.every(v=>typeof v==="string"&&v.trim()))return {error:"スレッドの各本文は空欄にできません。"};
  const parts=item.threadParts.map(v=>v.trim());
  const invalid=parts.findIndex(t=>xWeightedLength38(t)>280);
  if(invalid>=0)return {error:"スレッド"+(invalid+1)+"本目がXの上限280カウントを超えています（概算"+xWeightedLength38(parts[invalid])+"）。短く修正してください。"};
  return {content:parts.join("\n\n"),postFormat:"thread",threadParts:parts,threadCopied:parts.map(()=>false)};
 }
 if(item.threadParts!==undefined)return {error:"現在は"+(mode==="premium"?"長文":"通常1本")+"の設定です。スレッドJSONを取り込む場合は形式を切り替えてください。"};
 const content=String(item.content||"").trim();
 const len=xWeightedLength38(content);
 if(mode==="single"&&len>280)return {error:"X無料版の280カウントを超えています（概算"+len+"）。短く修正するか形式を変更してください。"};
 if(mode==="premium"&&len>25000)return {error:"X Premiumの上限25,000カウントを超えています。"};
 return {content,postFormat:mode};
}
function formatOutput38(item){
 const prepared=validateGeneratedFormat38(item,item.platform);
 if(prepared.error)throw Error(prepared.error);
 return {account:item.account,platform:item.platform,date:item.date,...prepared};
}
function refreshManualThread38(){
 const manual=document.getElementById("manualThread38");
 if(!manual)return;
 const show=document.getElementById("platform")?.value==="X"&&formatSettings38.xFormat==="thread";
 manual.hidden=!show;
 const area=document.getElementById("content");
 if(area)area.hidden=show;
 const manualLabel=document.getElementById("manualContentLabel38");
 if(manualLabel)manualLabel.hidden=show;
 const wrap=document.getElementById("manualThreadParts38");
 if(!wrap)return;
 if(show){
  const present=wrap.querySelectorAll("textarea");
  if(present.length===formatSettings38.threadCount)return;
  const existing=Array.from(present,e=>e.value);
  wrap.replaceChildren();
  for(let i=0;i<formatSettings38.threadCount;i++){
   const label=document.createElement("label");label.textContent="スレッド "+(i+1)+"/"+formatSettings38.threadCount;
   const input=document.createElement("textarea");input.rows=3;input.placeholder="この投稿の本文を入力（X 280カウント以内）";
   input.value=existing[i]||"";input.className="manual-part38";
   const meter=document.createElement("p");meter.className="format-meter38";meter.textContent="0/280";
   input.oninput=()=>{const n=xWeightedLength38(input.value);meter.textContent=n+"/280（概算）";meter.className="format-meter38"+(n>280?" format-over38":"")};
   label.append(input,meter);wrap.appendChild(label);
  }
 }
}
function collectManualFormat38(platform,content){
 const base={content:String(content||"").trim()};
 if(platform!=="X")return base;
 if(formatSettings38.xFormat==="thread"){
  const inputs=Array.from(document.getElementById("manualThreadParts38").querySelectorAll("textarea"));
  const threadParts=inputs.map(i=>i.value.trim());
  return {content:threadParts[0]||"",threadParts};
 }
 return base;
}
function clearManualFormat38(){
 const area=document.getElementById("manualThreadParts38");
 if(area)for(const input of area.querySelectorAll("textarea")){input.value="";if(input.oninput)input.oninput()}
}
function getThreadParts38(post){
 return post?.platform==="X"&&Array.isArray(post.threadParts)&&post.threadParts.length>1?post.threadParts:null;
}
function markThreadPartCopied38(id,index){
 const post=posts.find(p=>p.id===id);
 const parts=getThreadParts38(post);
 if(!parts||index<0||index>=parts.length)return;
 const previous=post.threadCopied;
 const next=Array.isArray(previous)?previous.slice():parts.map(()=>false);
 next[index]=true;
 post.threadCopied=next;
 if(!persist())post.threadCopied=previous;
 render();
}
function copyThreadPart38(id,index){
 const post=posts.find(p=>p.id===id),parts=getThreadParts38(post);
 if(!parts||index<0||index>=parts.length)return;
 doCopy356(parts[index],"スレッド "+(index+1)+"/"+parts.length+" をコピー",false,()=>markThreadPartCopied38(id,index));
}
function buildThreadUi38(post){
 const parts=getThreadParts38(post);
 if(!parts)return null;
 const root=document.createElement("div");root.className="thread-parts38";
 const hint=document.createElement("p");hint.className="format-help38";
 hint.textContent="スレッド "+parts.length+"本 ／ 1本ずつコピー → Xで「＋」を使ってつなぎ、最後にまとめて投稿してください。コピー済みは投稿済みとは異なります。";
 root.appendChild(hint);
 for(let i=0;i<parts.length;i++){
  const row=document.createElement("div");row.className="thread-part38";
  const top=document.createElement("div");top.className="thread-part-top38";
  const title=document.createElement("strong");title.textContent=(i+1)+"/"+parts.length;
  const state=document.createElement("span");state.className="thread-copied38";
  state.textContent=post.threadCopied?.[i]?"✓ コピー済み":"未コピー";
  top.append(title,state);
  const body=document.createElement("p");body.className="thread-body38";body.textContent=parts[i];
  const meter=document.createElement("p");meter.className="format-meter38";
  meter.textContent="Xカウント概算："+xWeightedLength38(parts[i])+"/280";
  if(xWeightedLength38(parts[i])>280)meter.className+=" format-over38";
  const copy=document.createElement("button");copy.type="button";copy.className="thread-copy38";
  copy.textContent=(i+1)+"/"+parts.length+" をコピー";
  copy.onclick=()=>copyThreadPart38(post.id,i);
  row.append(top,body,meter,copy);root.appendChild(row);
 }
 return root;
}
function formatPostDisplay38(post){
 const parts=getThreadParts38(post);
 if(parts)return buildThreadUi38(post);
 const body=document.createElement("div");body.className="today-body";
 body.textContent=post.content||"";
 if(post.platform==="X"){
  const meter=document.createElement("p");meter.className="format-meter38";
  meter.textContent=formatLabel38(post)+" ／ Xカウント概算："+xWeightedLength38(post.content)+"/"+(post.postFormat==="premium"?"25,000":"280");
  if(xWeightedLength38(post.content)>(post.postFormat==="premium"?25000:280))meter.className+=" format-over38";
  body.appendChild(meter);
 }else if(post.platform==="Threads"){
  const meter=document.createElement("p");meter.className="format-meter38";
  const count=threadsTextLength38(post.content);
  meter.textContent="Threads文字数（概算）："+count+"/500";
  if(count>500)meter.className+=" format-over38";
  body.appendChild(meter);
 }
 return body;
}
formatInit38();
render();
