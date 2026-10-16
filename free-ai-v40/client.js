/* Ver.4.0 free AI generation client. Does not contain or request an API key.
 * Only the Cloudflare Worker endpoint and public Turnstile sitekey are configured.
 * Users never interact with JSON, and no AI output is saved before existing review.
 */
const freeAi40PublicConfigKey="sns-post-manager-free-ai-v40-qa-public-config";
function freeAi40LoadPublicConfig(){
 // Only a public Worker URL and public Turnstile sitekey, never credentials.
 try{
  const obj=JSON.parse(localStorage.getItem(freeAi40PublicConfigKey)||"{}");
  if(typeof obj.endpoint==="string"&&obj.endpoint.length<=250){
   const el=document.getElementById("freeAi40Endpoint");if(el)el.value=obj.endpoint;
  }
  if(typeof obj.sitekey==="string"&&obj.sitekey.length<=180){
   const el=document.getElementById("freeAi40Sitekey");if(el)el.value=obj.sitekey;
  }
 }catch{}
}
function freeAi40ClearPublicConfig(){
 try{localStorage.removeItem(freeAi40PublicConfigKey)}catch{}
 for(const id of ["freeAi40Endpoint","freeAi40Sitekey"]){const el=document.getElementById(id);if(el)el.value="";}
 if(window.turnstile&&freeAi40ChallengeId!==null){try{window.turnstile.remove(freeAi40ChallengeId)}catch{}}
 freeAi40ChallengeId=null;freeAi40ChallengeToken="";
 freeAi40Status("公開接続情報を消去しました。秘密キーはアプリに保存していません。");
}
let freeAi40ChallengeToken="";
let freeAi40ChallengeId=null;
let freeAi40Busy=false;
function freeAi40Config(){
 const endpoint=document.getElementById("freeAi40Endpoint")?.value.trim()||"";
 const sitekey=document.getElementById("freeAi40Sitekey")?.value.trim()||"";
 return {endpoint,sitekey};
}
function freeAi40Status(message){
 const el=document.getElementById("freeAi40Status");
 if(el)el.textContent=message;
}
function freeAi40Connect(){
 const {endpoint,sitekey}=freeAi40Config();
 if(!endpoint||!sitekey){
  freeAi40Status("実AI接続はまだ設定されていません。無料Worker公開後、公開URLとTurnstileの公開サイトキーを登録して接続します。");
  return;
 }
 let url;
 try{url=new URL(endpoint)}catch{freeAi40Status("WorkerのURLを確認してください。");return}
 if(url.protocol!=="https:"||url.pathname!=="/generate"||url.username||url.password){
  freeAi40Status("接続URLはHTTPSの /generate で終わる公開Worker URLを指定してください。");
  return;
 }
 if(!window.turnstile||typeof window.turnstile.render!=="function"){
  freeAi40Status("安全確認の読み込みがまだです。通信状況を確認して接続を押し直してください。");
  return;
 }
 try{
  // Persist only information that is publicly visible on the website.
  try{localStorage.setItem(freeAi40PublicConfigKey,JSON.stringify({endpoint:url.href,sitekey}))}catch{}
  if(freeAi40ChallengeId!==null)window.turnstile.remove(freeAi40ChallengeId);
  freeAi40ChallengeId=window.turnstile.render("#freeAi40Challenge",{
   sitekey,
   callback:token=>{freeAi40ChallengeToken=token;freeAi40Status("安全確認が完了しました。生成ボタンを押せます。")},
   "expired-callback":()=>{freeAi40ChallengeToken="";freeAi40Status("安全確認の有効期限が切れました。再度確認してください。")},
   "error-callback":()=>{freeAi40ChallengeToken="";freeAi40Status("安全確認を完了できません。接続環境を確認してください。")}
  });
  freeAi40Status("安全確認を完了すると、14本の投稿をアプリ内で生成できます。");
 }catch(e){freeAi40Status("安全確認を開始できません。公開サイトキーを確認してください。")}
}
async function freeAi40Generate(){
 if(freeAi40Busy)return;
 const {endpoint,sitekey}=freeAi40Config();
 if(!endpoint||!sitekey){freeAi40Status("AI接続が未設定です。これは実際のAI生成であり、ダミーの文章は表示しません。");return}
 if(!document.getElementById("freeAi40Consent")?.checked){
  freeAi40Status("18歳以上であることと、Google無料AIへの送信条件を確認し同意してください。");return
 }
 const batch=document.getElementById("generationBatch")?.value;
 const account={kai:"カイ",kouhai:"後輩くん",manga:"漫画・恋愛"}[batch];
 if(!account){freeAi40Status("試作段階ではアカウントを1つ選んで14本ずつ生成します。");return}
 const startDate=document.getElementById("weekstart")?.value||"";
 const platform=document.getElementById("destination")?.value;
 if(!startDate||!["X","Threads"].includes(platform)){
  freeAi40Status("投稿開始日・投稿先を指定してください。");return
 }
 if(!freeAi40ChallengeToken){freeAi40Status("安全確認を完了してください。");return}
 let url;
 try{url=new URL(endpoint);if(url.protocol!=="https:"||url.pathname!=="/generate")throw Error("invalid")}
 catch{freeAi40Status("接続先のURLが無効です。");return}
 freeAi40Busy=true;
 const btn=document.getElementById("freeAi40GenerateButton");
 if(btn)btn.disabled=true;
 const token=freeAi40ChallengeToken;
 freeAi40ChallengeToken="";
 freeAi40Status("Geminiの無料枠で14本を生成しています。既存の投稿は変更しません。");
 try{
  const res=await fetch(url.href,{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
    account,platform,startDate,
    xFormat:formatSettings38.xFormat,xTarget:formatSettings38.xTarget,
    premiumTarget:formatSettings38.premiumTarget,threadCount:formatSettings38.threadCount,
    threadsTarget:formatSettings38.threadsTarget,
    confirmAdult:true,consentToFreeTierProcessing:true,challengeToken:token
   }),
   signal:AbortSignal.timeout(65000)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.ok!==true||!Array.isArray(data.posts)){
   freeAi40Status(data.error||"AI生成に失敗しました。無料枠の制限や接続を確認してください。");return
  }
  if(data.posts.length!==14){freeAi40Status("AIが14本を返さなかったため登録前に停止しました。");return}
  // Reuse the current exact 14/28/42 import validation and user review.
  const input=document.getElementById("jsonImport");
  const old=input.value;
  input.value=JSON.stringify(data.posts);
  importPosts();
  if(pendingImport===null){
   input.value=old;
   freeAi40Status("生成内容の安全確認に失敗しました。投稿データは保存していません。下の取り込み理由を確認してください。");return;
  }
  freeAi40Status("14本を生成しました。下の重複確認を見てから、必要な投稿だけ登録してください。登録前に保存されることはありません。");
  const panel=document.getElementById("importReview");
  if(panel?.scrollIntoView)panel.scrollIntoView({block:"start",behavior:"smooth"});
 }catch{
  freeAi40Status("通信を完了できません。ネットワークと無料AI接続を確認してください。投稿データは変更されていません。");
 }finally{
  freeAi40Busy=false;
  if(btn)btn.disabled=false;
  if(window.turnstile&&freeAi40ChallengeId!==null){
   try{window.turnstile.reset(freeAi40ChallengeId)}catch{}
  }
 }
}

freeAi40LoadPublicConfig();
