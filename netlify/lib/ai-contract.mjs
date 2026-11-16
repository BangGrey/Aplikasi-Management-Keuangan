import {categories} from '../../src/learning.mjs';
export const schema={type:'object',additionalProperties:false,properties:{kind:{type:'string',enum:['transaction','query','reply']},message:{type:'string'},type:{type:['string','null'],enum:['income','expense',null]},title:{type:['string','null']},amount:{type:['integer','null']},category:{type:['string','null'],enum:[...categories,null]},query_kind:{type:['string','null'],enum:['balance','income','expense','summary',null]},from:{type:['string','null']},to:{type:['string','null']}},required:['kind','message','type','title','amount','category','query_kind','from','to']};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function validateIntent(data,today){
 if(!data||!['transaction','query','reply'].includes(data.kind))throw Error('Invalid intent');
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
