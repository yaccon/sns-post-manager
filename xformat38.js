/* SNS投稿管理 Ver.3.8: X free-plan length / thread format.
 * Count is a conservative approximation of X's weighted text length.
 * Always verify in X before posting. No automated platform posting.
 */
function xWeightedLength38(value){
 const text=String(value||"").normalize("NFC");
 let total=0,at=0;
 const urls=/https?:\/\/[^\s<>"'「」]+/gi;
 const segmenter=typeof Intl!=="undefined"&&typeof Intl.Segmenter==="function"?new Intl.Segmenter("ja",{granularity:"grapheme"}):null;
 const weight=chunk=>{
  let sum=0;
  const chunks=segmenter?[...segmenter.segment(chunk)].map(s=>s.segment):Array.from(chunk);
  for(const ch of chunks){
   if(/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(ch)||ch.includes("\u20e3")){sum+=2;continue}
   for(const char of ch){
    const p=char.codePointAt(0);
    sum+=p<=0x10ff||(p>=0x2000&&p<=0x200d)||(p>=0x2010&&p<=0x201f)||(p>=0x2032&&p<=0x2037)?1:2;
   }
  }
  return sum;
 };
 for(const m of text.matchAll(urls)){
  total+=weight(text.slice(at,m.index));
  total+=23;
  at=m.index+m[0].length;
 }
 return total+weight(text.slice(at));
}
function xGenerationSettings38(){
 const platform=document.getElementById("destination").value;
 const mode=document.getElementById("xFormat38").value==="thread"?"thread":"single";
 const budget=Number(document.getElementById("xBudget38").value);
 const parts=Number(document.getElementById("xParts38").value);
 if(![200,240,280].includes(budget))throw Error("文字数の指定が不正です。");
 if(![2,3,4,5].includes(parts))throw Error("ツリーの投稿数が不正です。");
 return {platform,mode,budget,parts};
}
function xFormatLabel38(config){
 if(config.platform!=="X")return "Threadsは既存の通常投稿形式で生成";
 return config.mode==="thread"
  ?"X無料版／ツリー"+config.parts+"投稿／各パート上限"+config.budget+"ウェイト"
  :"X無料版／単発投稿／上限"+config.budget+"ウェイト";
}
function xUpdateFormat38(){
 const isX=document.getElementById("destination").value==="X";
 const panel=document.getElementById("xFormatOptions38");
 panel.hidden=!isX;
 const thread=document.getElementById("xFormat38").value==="thread";
 document.getElementById("xThreadRow38").hidden=!thread;
 const summary=document.getElementById("xFormatSummary38");
 const cfg=xGenerationSettings38();
 summary.textContent=xFormatLabel38(cfg)+(isX?"。日本語の目安："+Math.floor(cfg.budget/2)+"文字／パート。英数字・絵文字・URLが入ると変わるため、Xで投稿前に再確認してください。":"");
}
function xFormatInstruction38(platform){
 if(platform!=="X")return "投稿先Threads向けに、従来どおり各スロットを通常投稿1本として作成してください。";
 const cfg=xGenerationSettings38();
 const limit="X無料アカウント用。X標準の上限280ウェイト（日本語・全角は通常2、英数字は通常1、URLは通常23）を前提に、各文章を"+cfg.budget+"ウェイト以下（日本語だけなら目安約"+Math.floor(cfg.budget/2)+"文字以下）にしてください。長さはX側の最終チェックが必要。";
 if(cfg.mode==="single")return limit+"1枠につき単発投稿1本。threadPartsは付けず、contentに完成本文を記入。複数投稿への続き物にしない。";
 return limit+"1枠を連続する"+cfg.parts+"投稿のツリー（スレッド）として作成してください。返答JSONの各スロットにはaccount,platform,date,contentに加えthreadPartsを必ず付け、threadPartsはちょうど"+cfg.parts+"個の本文文字列配列。contentはthreadParts[0]と同じ文章にしてください。各threadPartsをそれぞれ"+cfg.budget+"ウェイト以下に。1投目には続きを読みたくなる導入、途中は自然な展開、最終投は独立した結論。数字表記やURLも文字数計算に含める。投稿用文字列内に「1/3」の番号を追加する場合はその文字数も含めてください。同じ企画の1枠は投稿予定1件として管理し、ツリーの途中を別の日付枠にしない。";
}
function xValidateImport38(item,setting){
 const raw=String(item.content||"").trim();
 if(setting.platform!=="X"){
  if(Array.isArray(item.threadParts))throw Error("Threads向けの生成ではツリー用threadPartsを含めないでください。");
  return {content:raw};
 }
 if(setting.mode==="single"){
  if(item.threadParts!==undefined)throw Error("単発投稿モードです。JSONにthreadPartsを入れないでください。");
  const length=xWeightedLength38(raw);
  if(length>setting.budget)throw Error("Xの文字数が設定上限を超えています（"+length+"/"+setting.budget+"ウェイト）。単発投稿を短くしてください。");
  return {content:raw,format38:"x-single",budget38:setting.budget};
 }
 if(!Array.isArray(item.threadParts)||item.threadParts.length!==setting.parts)throw Error("ツリーはthreadPartsを"+setting.parts+"件の配列で入力してください。");
 const parts=item.threadParts.map((x,i)=>{
  if(typeof x!=="string"||!x.trim())throw Error("ツリー"+(i+1)+"投目の本文がありません。");
  const text=x.trim();
  const n=xWeightedLength38(text);
  if(n>setting.budget)throw Error("ツリー"+(i+1)+"投目は"+n+"ウェイトです。設定上限"+setting.budget+"を超えています。");
  return text;
 });
 if(!raw)throw Error("contentはツリー1投目の本文を入れてください。");
 return {content:parts.join("\n\n"),threadParts:parts,format38:"x-thread",budget38:setting.budget};
}
function xPostParts38(p){
 return p&&p.platform==="X"&&Array.isArray(p.threadParts)&&p.threadParts.length>=2?p.threadParts:null;
}
function xCopyPart38(id,index){
 const p=posts.find(x=>String(x.id)===String(id));
 const parts=xPostParts38(p);if(!parts||!parts[index])return;
 doCopy356(parts[index],"Xツリー "+(index+1)+"/"+parts.length+" をコピー",false);
}
function xRenderExtraParts38(p,container){
 const parts=xPostParts38(p);if(!parts)return;
 const wrap=document.createElement("div");
 wrap.className="x-thread-list38";
 const note=document.createElement("p");
 note.textContent="Xのツリー "+parts.length+"投稿。上から順番にコピー → Xで「＋」から投稿を追加し、全部投稿したら「投稿済み」にしてください。";
 note.className="x-thread-note38";
 wrap.appendChild(note);
 parts.forEach((piece,index)=>{
  const row=document.createElement("div");row.className="x-thread-segment38";
  const heading=document.createElement("span");
  heading.textContent=(index+1)+"/"+parts.length+"　X換算 約"+xWeightedLength38(piece)+" / "+(p.budget38||280);
  const b=document.createElement("button");b.type="button";
  b.className=index===0?"x-primary-segment38":"secondary";
  b.textContent=index===0?"① 1投目をコピー":(index+1)+"投目をコピー";
  b.onclick=()=>xCopyPart38(p.id,index);
  const preview=document.createElement("p");preview.textContent=piece;preview.className="x-thread-preview38";
  row.append(heading,b,preview);wrap.appendChild(row);
 });
 container.appendChild(wrap);
}
function xEditText38(p){
 const parts=xPostParts38(p);
 return parts?parts.join("\n\n---\n\n"):p.content;
}
function xEditValidate38(p,newText){
 const parts=xPostParts38(p);
 if(!parts)return {content:newText.trim()};
 const segments=newText.split(/\n\s*---\s*\n/).map(x=>x.trim());
 if(segments.length!==parts.length||segments.some(x=>!x))throw Error("ツリーの編集は「---」区切りで"+parts.length+"投稿を維持してください。");
 const budget=p.budget38||280;
 for(let i=0;i<segments.length;i++){
  const n=xWeightedLength38(segments[i]);
  if(n>budget)throw Error((i+1)+"投目が上限超過です（"+n+"/"+budget+"ウェイト）。");
 }
 return {content:segments.join("\n\n"),threadParts:segments};
}
function xSampleJson38(){
 const s=xGenerationSettings38();
 const start=document.getElementById("weekstart").value;
 if(!start){uiInfo35("投稿開始日を選んでください");return}
 const batch=document.getElementById("generationBatch").value;
 const acc={kai:["カイ"],kouhai:["後輩くん"],manga:["漫画・恋愛"],all:["カイ","後輩くん","漫画・恋愛"]}[batch];
 const stamp=Date.now();
 let n=0;
 const list=[];
 for(const account of acc){
  for(let day=0;day<7;day++)for(const time of ["12:00","20:00"]){
   n++;
   const id="試験投稿"+stamp+"-"+n;
   const lead=id+"："+account+"の発信について、読者が今日から試せる小さな工夫を紹介します。";
   const item={account,platform:s.platform,date:localDay(start,day)+"T"+time,content:lead};
   if(s.platform==="X"&&s.mode==="thread"){
    item.threadParts=Array.from({length:s.parts},(_,j)=>j===0?lead:("続き"+(j+1)+"："+id+"。"+(j+1)+"つ目の視点から新しい気づきを説明します。"));
   }
   list.push(item);
  }
 }
 document.getElementById("jsonImport").value=JSON.stringify(list,null,2);
 document.getElementById("importStatus").textContent="架空のサンプル"+list.length+"枠を入力しました。X単発・ツリーなど今の選択に合わせてあります。下の「③ 内容を確認して一括登録」でテストしてください。";
 document.getElementById("jsonImport").scrollIntoView({behavior:"smooth",block:"center"});
}
xUpdateFormat38();
