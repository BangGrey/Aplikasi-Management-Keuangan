import {createHash,timingSafeEqual} from 'node:crypto';
import {admin,json,production,authHeader} from '../lib/common.mjs';
import {verifyAndActivatePayment} from '../lib/payments.mjs';
export function validSignature(body,key){if(!body||typeof body.order_id!=='string'||typeof body.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(body.signature_key))return false;const expected=createHash('sha512').update(`${body.order_id}${body.status_code}${body.gross_amount}${key}`).digest();return timingSafeEqual(Buffer.from(body.signature_key,'hex'),expected)}
export function createWebhookHandler({getAdmin=admin,request=fetch,isProduction=production,authorization=authHeader,serverKey=()=>process.env.MIDTRANS_SERVER_KEY}={}){return async function(event){
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 let body;try{body=JSON.parse(event.body)}catch{return json(400,{error:'Invalid JSON'})}
 if(!serverKey())return json(503,{error:'Payment not configured'});
 if(!validSignature(body,serverKey()))return json(401,{error:'Invalid signature'});
 try{
  const db=getAdmin();const {data:order,error}=await db.from('orders').select('*').eq('id',body.order_id).single();
  if(error||!order)return json(404,{error:'Unknown order'});
  await verifyAndActivatePayment({db,order,request,authorization:authorization(),isProduction:isProduction()});
  return json(200,{received:true});
 }catch(error){return json(error.statusCode||500,{error:error.statusCode===400?'Order mismatch':'Retry notification later'})}
};}
export const handler=createWebhookHandler();
