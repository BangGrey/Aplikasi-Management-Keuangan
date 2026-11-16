import {categories} from '../../src/learning.mjs';
export const schema={type:'object',additionalProperties:false,properties:{kind:{type:'string',enum:['transaction','savings_deposit','savings_create','query','reply']},message:{type:'string'},type:{type:['string','null'],enum:['income','expense',null]},title:{type:['string','null']},amount:{type:['integer','null']},initial_saved:{type:['integer','null']},category:{type:['string','null'],enum:[...categories,null]},query_kind:{type:['string','null'],enum:['balance','income','expense','summary',null]},from:{type:['string','null']},to:{type:['string','null']}},required:['kind','message','type','title','amount','initial_saved','category','query_kind','from','to']};
export function validateGoalContext(draft){
 if(draft==null)return null;
 if(typeof draft!=='object'||typeof draft.title!=='string'||draft.title.length>100||draft.target!==null&&(!Number.isSafeInteger(draft.target)||draft.target<=0||draft.target>1e12)||!Number.isSafeInteger(draft.initialSaved)||draft.initialSaved<0||draft.initialSaved>1e12)throw Error('Invalid goal context');
 return {title:draft.title,target:draft.target,initialSaved:draft.initialSaved};
}
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function validateIntent(data,today){
 if(!data||!['transaction','savings_deposit','savings_create','query','reply'].includes(data.kind))throw Error('Invalid intent');
 if(data.kind==='savings_create'){
  if(data.title!==null&&(typeof data.title!=='string'||!data.title.trim()||data.title.length>100)||data.amount!==null&&(!Number.isSafeInteger(data.amount)||data.amount<=0||data.amount>1e12)||data.initial_saved!==null&&(!Number.isSafeInteger(data.initial_saved)||data.initial_saved<0||data.initial_saved>1e12)||data.type!=null||data.category!=null)throw Error('Invalid savings goal');
  return {kind:'savings_create',goal:{title:data.title?.trim()??null,target:data.amount,initialSaved:data.initial_saved}};
 }
 if(data.kind==='savings_deposit'){
  if(typeof data.title!=='string'||!data.title.trim()||data.title.length>100||!Number.isSafeInteger(data.amount)||data.amount<=0||data.amount>1000000000000||data.type!=null||data.category!=null)throw Error('Invalid savings deposit');
  return {kind:'savings_deposit',deposit:{target:data.title.trim(),amount:data.amount}};
 }
 if(data.kind==='transaction'){
  if(!['income','expense'].includes(data.type)||typeof data.title!=='string'||!data.title.trim()||data.title.length>100||!Number.isSafeInteger(data.amount)||data.amount<=0||data.amount>1000000000000||!categories.includes(data.category))throw Error('Invalid transaction');
  return {kind:'transaction',transaction:{type:data.type,title:data.title.trim(),amount:data.amount,category:data.category,date:today}};
 }
 if(data.kind==='query'){
  if(!['balance','income','expense','summary'].includes(data.query_kind)||!validDate(data.to)||data.from!==null&&(!validDate(data.from)||data.from>data.to))throw Error('Invalid period');
  return {kind:'query',query:{kind:data.query_kind,from:data.from,to:data.to,label:data.from?`${data.from} – ${data.to}`:`seluruh catatan sampai ${data.to}`}};
 }
 if(typeof data.message!=='string'||!data.message.trim()||data.message.length>1500)throw Error('Invalid reply');
 return {kind:'reply',message:data.message};
}
