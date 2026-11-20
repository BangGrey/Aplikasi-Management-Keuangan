import {admin,json,production,authHeader} from '../lib/common.mjs';
import {verifyAndActivatePayment} from '../lib/payments.mjs';
export function createPaymentStatusHandler({getAdmin=admin,request=fetch,isProduction=production,authorization=authHeader}={}){
 return async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Metode tidak diizinkan.'});
  const token=event.headers?.authorization?.replace(/^Bearer /i,'');
  if(!token)return json(401,{error:'Silakan masuk terlebih dahulu.'});
  let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Permintaan tidak valid.'})}
  if(!body||typeof body!=='object'||Array.isArray(body)||body.orderId!==undefined&&(typeof body.orderId!=='string'||!/^KT-[A-Za-z0-9-]{1,90}$/.test(body.orderId)))return json(400,{error:'Pesanan tidak valid.'});
  try{
   const db=getAdmin(),{data:{user},error}=await db.auth.getUser(token);
   if(error||!user)return json(401,{error:'Sesi berakhir. Silakan masuk kembali.'});
   let query=db.from('orders').select('*').eq('user_id',user.id);
   query=body.orderId?query.eq('id',body.orderId):query.order('created_at',{ascending:false}).limit(1);
   const {data:order,error:lookupError}=await query.maybeSingle();
   if(lookupError)throw lookupError;
   if(!order)return body.orderId?json(404,{error:'Pesanan tidak ditemukan.'}):json(200,{paid:false,transactionStatus:'none'});
   const result=await verifyAndActivatePayment({db,order,request,authorization:authorization(),isProduction:isProduction()});
   return json(200,{...result,orderId:order.id});
  }catch(error){return json(error.statusCode||502,{error:error.statusCode===409?'Mode pembayaran telah berubah. Hubungi bantuan layanan untuk pesanan ini.':'Status pembayaran belum dapat diperiksa. Silakan coba lagi.'})}
 };
}
export const handler=createPaymentStatusHandler();
