/* SNS投稿管理 Free AI Backend (Ver.4.0 development candidate)
 * Cloudflare Workers Free + Gemini API Free Tier (Japan, adults only).
 * This is intentionally NOT a public unauthenticated Gemini proxy.
 *
 * Secret bindings (Cloudflare dashboard, never GitHub):
 *   GEMINI_API_KEY, TURNSTILE_SECRET
 * Rate limit bindings: USER_LIMITER, GLOBAL_LIMITER and strictly global DAILY_BUDGET.
 *
 * No upstream provider requests if a required secret, Turnstile, rate limiter,
 * origin, residency check or explicit processing consent is missing.
 */
export const ORIGIN = "https://yaccon.github.io";
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const ACCOUNTS = ["カイ","後輩くん","漫画・恋愛"];
const TIMINGS = ["12:00","20:00"];
const MAX_BODY_BYTES = 4096;
function response(body,status=200,origin=ORIGIN){
 const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin","x-content-type-options":"nosniff"};
 if(origin===ORIGIN)headers["access-control-allow-origin"]=ORIGIN;
 return new Response(JSON.stringify(body),{status,headers});
}
function reject(message,status=400){return response({ok:false,error:message},status)}
function validDate(value){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+"T00:00:00Z");
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function nextDay(date,offset){
 const time=new Date(date+"T00:00:00Z").getTime();
 return new Date(time+offset*86400000).toISOString().slice(0,10);
}
export function makeSlots({account,platform,startDate}){
 if(!ACCOUNTS.includes(account)||!["X","Threads"].includes(platform)||!validDate(startDate))throw Error("invalid slot parameters");
 return Array.from({length:14},(_,i)=>({
  account,platform,date:nextDay(startDate,Math.floor(i/2))+"T"+TIMINGS[i%2]
 }));
}
export function validateSettings(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const account=raw.account,platform=raw.platform,startDate=raw.startDate;
 if(!ACCOUNTS.includes(account)||!["X","Threads"].includes(platform)||!validDate(startDate))return null;
 const xFormat=raw.xFormat||"single";
 const xTarget=String(raw.xTarget||"120");
 const premiumTarget=String(raw.premiumTarget||"800");
 const threadsTarget=String(raw.threadsTarget||"200");
 const threadCount=Number(raw.threadCount??3);
 if(!["single","thread","premium"].includes(xFormat))return null;
 if(!["100","120","140","auto"].includes(xTarget))return null;
 if(!["300","800","1500","3000"].includes(premiumTarget))return null;
 if(!["100","150","200","300","400","450","500","auto"].includes(threadsTarget))return null;
 if(!Number.isInteger(threadCount)||threadCount<2||threadCount>5)return null;
 const mode=platform==="Threads"?"single":xFormat;
 // A full 14 x 3,000-char batch exceeds a reliable free-trial response budget.
 // Preserve the selected mode, but fail visibly rather than silently truncating.
 if(mode==="premium"&&Number(premiumTarget)>800)return {error:"無料AI試作では長文300・800文字まで対応します。1,500・3,000文字は従来のChatGPT生成を利用してください。"};
 return {account,platform,startDate,mode,xTarget,threadsTarget,threadCount,premiumTarget};
}
const ACCOUNT_GUIDE={
 "カイ":"AI副業の初心者・迷子へ。14投稿のうち実用/共感8、後輩くんの物語紹介4、無料SNS投稿管理アプリの開発や自然な案内2を目安に。架空のURL、売上、実績は作らない。未公開機能を公開済みと断定しない。",
 "後輩くん":"AI副業初心者が成長するフィクション連載。初めての980円売上は物語内の設定であり、実際の収益として書かない。LINEスタンプ制作の過程を扱い、時系列と人物設定を守る。",
 "漫画・恋愛":"『着せ恋』『ホリミヤ』『お隣の天使様』など漫画・アニメの人物の言動から恋愛心理を考察する。具体的な場面や台詞、公式設定を創作して事実として断定しない。"
};
export function buildPrompt(settings){
 const slots=makeSlots(settings);
 const fmt=settings.platform==="Threads"
  ? "Threads通常投稿1本。"+(settings.threadsTarget==="auto"?"読みやすい長さ":settings.threadsTarget+"文字程度")+"。500文字以内。"
  :settings.mode==="thread"
   ? "X無料版のスレッド。各枠"+settings.threadCount+"投稿で各140字程度以下、各パート280加重カウント以内。threadParts配列を必ず"+settings.threadCount+"件。contentに先頭パートを入れる。"
   :settings.mode==="premium"
    ? "X Premiumの長文1本。日本語"+settings.premiumTarget+"字程度を目指す。最大25,000加重カウント以内。"
    :"X無料版の通常投稿1本。"+(settings.xTarget==="auto"?"140字以内を目安":settings.xTarget+"字程度")+"。加重280カウント以内。";
 return "あなたは日本語のSNS編集者です。以下の14枠の投稿文を、JSON配列のみで返してください。前置き・コードフェンス・注釈不要。\n"+
  "形式:"+fmt+"\n"+ACCOUNT_GUIDE[settings.account]+"\n"+
  "昼12:00は共感・実用・気づき。夜20:00は物語・深い考察・自然な導線。14投稿すべてで題材、主張、具体例、冒頭のフックを変え、互いに似せない。"+
  "ユーザーが個別提供した過去履歴は含まれていないので実績や体験を捏造しない。AI生成の本文は後でユーザー自身が確認する。\n"+
  "各要素はaccount,platform,date,contentを必ず持ち、指定したaccount/platform/date文字列を変更しない。"+
  (settings.mode==="thread"&&settings.platform==="X"?'さらにpostFormat:"thread"とthreadPartsを含める。':"")+
  "\n厳密な予定枠（14件）:"+JSON.stringify(slots);
}
function xWeightedLength(text){
 let count=0;for(const cp of String(text)){const n=cp.codePointAt(0);count+=(n>=0x1100?2:1)}
 return count;
}
export function validateGenerated(raw,settings){
 if(!Array.isArray(raw)||raw.length!==14)return null;
 const slots=makeSlots(settings);
 // Models occasionally reorder JSON items. Match by the exact expected slot
 // rather than rejecting safe results simply because order changed.
 const bySlot=new Map();
 for(const post of raw){
  if(!post||typeof post!=="object"||Array.isArray(post)||typeof post.date!=="string"||bySlot.has(post.date))return null;
  bySlot.set(post.date,post);
 }
 const result=[];
 for(let i=0;i<slots.length;i++){
  const e=slots[i],p=bySlot.get(e.date);
  if(!p||p.account!==e.account||p.platform!==e.platform||p.date!==e.date||typeof p.content!=="string"||!p.content.trim())return null;
  const content=p.content.trim();
  if(settings.platform==="Threads"){
   if(p.threadParts!==undefined||content.length>500)return null;
   result.push({...e,content});continue;
  }
  if(settings.mode==="thread"){
   if(!Array.isArray(p.threadParts)||p.threadParts.length!==settings.threadCount)return null;
   const parts=p.threadParts.map(x=>typeof x==="string"?x.trim():"");
   if(parts.some(x=>!x||xWeightedLength(x)>280))return null;
   result.push({...e,content:parts[0],postFormat:"thread",threadParts:parts});continue;
  }
  if(p.threadParts!==undefined)return null;
  if(xWeightedLength(content)>(settings.mode==="premium"?25000:280))return null;
  result.push({...e,content,...(settings.mode==="premium"?{postFormat:"premium"}:{})});
 }
 return result;
}
export function buildResponseSchema(settings){
 // Keep a small JSON Schema: this directs the model to return a reliably
 // parseable array, but runtime validation below remains authoritative.
 const properties={
  account:{type:"string",enum:[settings.account]},
  platform:{type:"string",enum:[settings.platform]},
  date:{type:"string"},
  content:{type:"string"}
 };
 const required=["account","platform","date","content"];
 if(settings.mode==="thread"&&settings.platform==="X"){
  properties.postFormat={type:"string",enum:["thread"]};
  properties.threadParts={type:"array",minItems:settings.threadCount,maxItems:settings.threadCount,items:{type:"string"}};
  required.push("postFormat","threadParts");
 }else if(settings.mode==="premium"&&settings.platform==="X"){
  properties.postFormat={type:"string",enum:["premium"]};
  required.push("postFormat");
 }
 return {type:"array",minItems:14,maxItems:14,items:{type:"object",properties,required}};
}
async function verifyTurnstile(token,secret,ip,networkFetch){
 if(typeof token!=="string"||token.length<10||token.length>2048)return false;
 const form=new URLSearchParams({secret,response:token,remoteip:ip});
 const res=await networkFetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
  method:"POST",body:form,signal:AbortSignal.timeout(10000)
 });
 if(!res.ok)return false;
 const parsed=await res.json();
 return parsed.success===true&&parsed.hostname==="yaccon.github.io";
}
export default {
 async fetch(request,env){
  const origin=request.headers.get("Origin");
  if(origin!==ORIGIN)return reject("許可されていないアクセスです。",403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{
   "access-control-allow-origin":ORIGIN,"access-control-allow-methods":"POST, OPTIONS",
   "access-control-allow-headers":"Content-Type","access-control-max-age":"600","vary":"Origin"
  }});
  const path=new URL(request.url).pathname;
  // Safe readiness check, no Gemini request, quota consumption or secret values.
  if(path==="/health"&&request.method==="GET"){
   const ready=Boolean(env?.GEMINI_API_KEY&&env?.TURNSTILE_SECRET&&
    env?.USER_LIMITER?.limit&&env?.GLOBAL_LIMITER?.limit&&env?.DAILY_BUDGET?.getByName);
   return response({ok:true,ready,freeOnly:true,dailyLimit:12});
  }
  if(path!=="/generate"||request.method!=="POST")return reject("対象外の操作です。",404);
  if(request.cf?.country!=="JP")return reject("この試作版は日本国内向けです。",403);
  if(!env?.GEMINI_API_KEY||!env?.TURNSTILE_SECRET||!env?.USER_LIMITER?.limit||!env?.GLOBAL_LIMITER?.limit||!env?.DAILY_BUDGET?.getByName)
   return reject("無料AI接続の準備が完了していません。",503);
  if(Number(request.headers.get("Content-Length"))>MAX_BODY_BYTES)return reject("送信データが大きすぎます。",413);
  let payload;
  try{
   const text=await request.text();
   if(text.length>MAX_BODY_BYTES)return reject("送信データが大きすぎます。",413);
   payload=JSON.parse(text);
  }catch{return reject("設定データを読み取れません。")}
  if(payload?.confirmAdult!==true||payload?.consentToFreeTierProcessing!==true)
   return reject("18歳以上であることと、無料枠へのデータ送信への同意が必要です。",403);
  const validated=validateSettings(payload);
  if(!validated)return reject("投稿開始日や設定値を確認してください。",422);
  if(validated.error)return reject(validated.error,422);
  const ip=request.headers.get("CF-Connecting-IP");
  if(!ip||ip.length>100)return reject("接続元を確認できません。",403);
  try{
   if(!await verifyTurnstile(payload.challengeToken,env.TURNSTILE_SECRET,ip,fetch))
    return reject("安全確認の有効期限が切れました。再度お試しください。",403);
   const [perUser,global]=await Promise.all([
    env.USER_LIMITER.limit({key:ip}),
    env.GLOBAL_LIMITER.limit({key:"global-free-api"})
   ]);
   if(!perUser.success||!global.success)return reject("無料枠を公平に使うため少し時間を空けてください。",429);
   const model=env.GEMINI_MODEL||DEFAULT_MODEL;
   // Fail closed: only documented free models can be used.
   if(!["gemini-3.5-flash-lite","gemini-3.1-flash-lite"].includes(model))
    return reject("無料AIモデル以外は使用できません。設定を確認してください。",503);
   // Regional Cloudflare rate-limit bindings alone are not a global budget.
   // Reserve a globally consistent UTC-day quota BEFORE every provider request.
   const budget=await env.DAILY_BUDGET.getByName("free-ai-global-daily-v40").reserve();
   if(!budget||budget.allowed!==true)return reject("無料AIの本日分の生成上限に達しました。課金せずに停止します。",429);
   const prompt=buildPrompt(validated);
   const provider=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
    method:"POST",
    headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
    body:JSON.stringify({
     contents:[{role:"user",parts:[{text:prompt}]}],
     generationConfig:{responseMimeType:"application/json",responseJsonSchema:buildResponseSchema(validated),temperature:0.75,maxOutputTokens:16000}
    }),
    signal:AbortSignal.timeout(55000)
   });
   if(provider.status===429)return reject("Geminiの無料利用上限に達しました。課金せず、利用可能になるまで生成を停止します。",429);
   if(!provider.ok)return reject("Geminiの無料AIに接続できません。対応モデルと無料枠を確認してください。",502);
   const data=await provider.json();
   const output=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
   let parsed;try{parsed=JSON.parse(output)}catch{return reject("AIの回答が途中で切れました。再生成してください。",502)}
   const posts=validateGenerated(parsed,validated);
   if(!posts)return reject("生成した14件に日時・文字数・形式の不一致がありました。再生成してください。",502);
   return response({ok:true,posts});
  }catch{
   return reject("AIとの通信を完了できませんでした。接続状況を確認してください。",502);
  }
 }
};
