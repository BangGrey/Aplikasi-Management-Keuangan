import {createHash,timingSafeEqual} from 'node:crypto';
import {admin,json,production,authHeader} from '../lib/common.mjs';
export function validSignature(body,key){if(!body||typeof body.order_id!=='string'||typeof body.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(body.signature_key))return false;const expected=createHash('sha512').update(`${body.order_id}${body.status_code}${body.gross_amount}${key}`).digest();return timingSafeEqual(Buffer.from(body.signature_key,'hex'),expected)}
export function createWebhookHandler({getAdmin=admin,request=fetch,isProduction=production,authorization=authHeader,serverKey=()=>process.env.MIDTRANS_SERVER_KEY}={}){return async function(event){
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 let body;try{body=JSON.parse(event.body)}catch{return json(400,{error:'Invalid JSON'})}
 if(!serverKey())return json(503,{error:'Payment not configured'});
 if(!validSignature(body,serverKey()))return json(401,{error:'Invalid signature'});
 try{
  const db=getAdmin();const {data:order,error}=await db.from('orders').select('*').eq('id',body.order_id).single();
  if(error||!order)return json(404,{error:'Unknown order'});
  const res=await request(`https://api.${isProduction()?'':'sandbox.'}midtrans.com/v2/${encodeURIComponent(order.id)}/status`,{headers:{Authorization:authorization()},signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error('Cannot verify status');
  const status=await res.json();
  if(Number(status.gross_amount)!==Number(order.amount)||status.order_id!==order.id||status.currency&&status.currency!=='IDR')return json(400,{error:'Order mismatch'});
  const paid=status.transaction_status==='settlement'||status.transaction_status==='capture'&&status.fraud_status==='accept';
  if(paid){const {error:applyError}=await db.rpc('activate_subscription',{payment_order_id:order.id});if(applyError)throw applyError;}
  return json(200,{received:true});
 }catch{return json(500,{error:'Retry notification later'})}
};}
export const handler=createWebhookHandler();
