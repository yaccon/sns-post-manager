/* Ver.3.9: JSON-hidden import UI for iPhone. The AI request is still made in ChatGPT.
 * Clipboard is accessed only from the user's explicit tap, and only copied text
 * that passes the existing Ver.3.8 14/28/42-post validation can be registered.
 * No API keys, no new storage keys, no automatic publishing or silent import. */
async function readClipboardAndReview39(){
 const button=document.getElementById("clipboardReview39");
 const notice=document.getElementById("clipboardStatus39");
 const manual=document.getElementById("importManual39");
 const input=document.getElementById("jsonImport");
 const review=document.getElementById("importReview");
 if(!button||!notice||!manual||!input||!review)return;
 if(button.disabled)return;
 button.disabled=true;
 const openFallback=(msg)=>{
  manual.open=true;
  notice.textContent=msg;
 };
 try{
  if(typeof navigator.clipboard?.readText!=="function")throw new Error("clipboard-unavailable");
  const copied=await navigator.clipboard.readText();
  if(!copied||!copied.trim()){
   openFallback("コピーした投稿が見つかりません。ChatGPTの回答をコピーしてください。手動貼り付けもできます。");
   return;
  }
  if(copied.length>250000){
   openFallback("コピー内容が大きすぎます。14本ずつに分けて生成するか、文章を確認してください。");
   return;
  }
  input.value=copied;
  importPosts();
  if(pendingImport!==null&&review.children.length>0){
   manual.open=false;
   const total=pendingImport.candidates.length;
   notice.textContent="✓ コピー内容を確認しました。候補"+total+"本を下に表示しています。重複・類似の結果を見てから登録してください。";
   if(typeof review.scrollIntoView==="function")review.scrollIntoView({behavior:"smooth",block:"start"});
  }else{
   openFallback("コピー内容を取り込みましたが、登録条件に合いません。下のエラーを確認し、必要なら内容を修正してください。");
  }
 }catch(err){
  openFallback("自動読み取りが許可されていません。下の欄を長押しして「ペースト」→「内容を確認」を押してください。");
 }finally{
  button.disabled=false;
 }
}
function openManualImport39(){
 const manual=document.getElementById("importManual39");
 if(manual)manual.open=true;
 const input=document.getElementById("jsonImport");
 if(input)input.focus();
}
