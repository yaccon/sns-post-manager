#!/usr/bin/env node
/**
 * AI会社 / SNS42枠の定期準備 Ver.0.1
 * 本文生成・SNS投稿・iPhoneアプリへの登録は行わない。
 * 生成するのは公開可能な「空の予定枠」のみ。
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ACCOUNTS=['カイ','後輩くん','漫画・恋愛'];
const TIMES=['12:00','20:00'];
export function isDate(s){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+'T12:00:00Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;
}
export function plusDays(s,n){
 if(!isDate(s))throw Error('日付が不正: '+s);
 const d=new Date(s+'T12:00:00Z');
 d.setUTCDate(d.getUTCDate()+n);
 return d.toISOString().slice(0,10);
}
export function upcomingMonday(today){
 if(!isDate(today))throw Error('日付が不正: '+today);
 const day=new Date(today+'T12:00:00Z').getUTCDay();
 return plusDays(today,(8-day)%7||7);
}
export function makeSlots(monday,platform='X'){
 if(!isDate(monday))throw Error('開始日をYYYY-MM-DDで指定');
 if(!['X','Threads'].includes(platform))throw Error('投稿先はXまたはThreads');
 const slots=[];
 for(const account of ACCOUNTS)
  for(let d=0;d<7;d++)
   for(const time of TIMES)
    slots.push({account,platform,date:plusDays(monday,d)+'T'+time,content:''});
 return slots;
}
export function checkSlots(slots){
 if(!Array.isArray(slots)||slots.length!==42)throw Error('42枠必要です');
 const keys=new Set(),counts=new Map();
 for(const s of slots){
  if(!ACCOUNTS.includes(s.account)||!['X','Threads'].includes(s.platform)
   ||!/^\d{4}-\d{2}-\d{2}T(12:00|20:00)$/.test(s.date)
   ||!isDate(s.date.slice(0,10)))throw Error('枠が不正');
  if(s.content!=='')throw Error('テンプレートに本文は含めません');
  const key=s.account+'|'+s.platform+'|'+s.date;
  if(keys.has(key))throw Error('重複枠: '+key);
  keys.add(key);
  const dt=s.date.slice(0,10);counts.set(dt,(counts.get(dt)||0)+1);
 }
 if(counts.size!==7||![...counts.values()].every(n=>n===6))throw Error('7日×6枠ではありません');
 return true;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  const opt=(name,def)=>{const i=args.indexOf(name);return i<0?def:args[i+1]};
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const start=opt('--start',upcomingMonday(today));
  const platform=opt('--platform','X');
  const output=opt('--out',path.join(process.cwd(),'weekly-slots.json'));
  const slots=makeSlots(start,platform);checkSlots(slots);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({status:'TEMPLATE_ONLY',note:'本文生成・アプリ登録・SNS投稿は未実行',start,platform,slots},null,2)+'\n');
  console.log('OK: 42枠を準備 '+start+' -> '+output);
 }catch(e){console.error('ERROR:',e.message);process.exitCode=1}
}
