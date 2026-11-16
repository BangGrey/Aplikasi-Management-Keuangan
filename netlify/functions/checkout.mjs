import {randomUUID} from 'node:crypto';
import {admin,json,production,authHeader} from '../lib/common.mjs';
import {findSubscriptionPlan} from '../../src/subscription-plans.mjs';
export function createCheckoutHandler({getAdmin=admin,request=fetch,isProduction=production,authorization=authHeader,siteUrl=()=>process.env.URL,newId=randomUUID}={}){return async function(event){
 if(event.httpMethod!=='POST')return json(405,{error:'Metode tidak diizinkan'});
 let body;try{body=event.body?JSON.parse(event.body):{}}catch{return json(400,{error:'Permintaan tidak valid.'})}
 if(!body||typeof body!=='object'||Array.isArray(body))return json(400,{error:'Permintaan tidak valid.'});
 // A legacy frontend without planId still purchases the original 30-day plan.
 const plan=findSubscriptionPlan(body.planId===undefined?'monthly':body.planId);
 if(!plan)return json(400,{error:'Paket langganan tidak valid.'});
 const token=event.headers?.authorization?.replace(/^Bearer /i,'');
 if(!token)return json(401,{error:'Silakan masuk terlebih dahulu.'});
 try{
  const db=getAdmin();
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user)return json(401,{error:'Sesi berakhir. Silakan masuk kembali.'});
  const orderId=`KT-${newId()}`,amount=plan.amount;
  const {error:insertError}=await db.from('orders').insert({id:orderId,user_id:user.id,amount,plan_id:plan.id,duration_months:plan.months,duration_days:plan.days,status:'pending'});
  if(insertError)throw insertError;
  const response=await request(`https://app.${isProduction()?'':'sandbox.'}midtrans.com/snap/v1/transactions`,{method:'POST',headers:{Authorization:authorization(),'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({transaction_details:{order_id:orderId,gross_amount:amount},customer_details:{email:user.email},item_details:[{id:`keuanganmu-${plan.id}`,price:amount,quantity:1,name:`Tabunganmu Plus ${plan.label}`}],callbacks:{finish:siteUrl()},expiry:{unit:'minutes',duration:60}})});
  const data=await response.json();
  if(!response.ok||!data.redirect_url)throw Error('Pembayaran belum tersedia');
  return json(200,{redirect_url:data.redirect_url});
 }catch{return json(500,{error:'Tidak dapat membuat pembayaran. Periksa konfigurasi atau coba lagi.'})}
};}
export const handler=createCheckoutHandler();
