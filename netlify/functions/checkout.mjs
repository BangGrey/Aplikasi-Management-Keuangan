import {randomUUID} from 'node:crypto';
import {admin,json,production,authHeader,midtransServerKey} from '../lib/common.mjs';
import {findSubscriptionPlan} from '../../src/subscription-plans.mjs';
import {paymentConfiguration,paymentUrls} from '../lib/payments.mjs';
export function createCheckoutHandler({getAdmin=admin,request=fetch,isProduction=production,authorization=authHeader,serverKey=midtransServerKey,siteUrl=()=>process.env.URL,newId=randomUUID}={}){return async function(event){
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
  const mode=isProduction(),configuration=paymentConfiguration(serverKey(),mode);
  if(!configuration.ready)return json(503,{error:'Pembayaran belum dikonfigurasi untuk mode yang dipilih.'});
  const urls=paymentUrls(siteUrl());
  const orderId=`KT-${mode?'LIVE':'SB'}-${newId()}`,amount=plan.amount;
  urls.finish.searchParams.set('payment_order',orderId);
  const {error:insertError}=await db.from('orders').insert({id:orderId,user_id:user.id,amount,plan_id:plan.id,duration_months:plan.months,duration_days:plan.days,status:'pending'});
  if(insertError)throw insertError;
  const host=`app.${mode?'':'sandbox.'}midtrans.com`;
  const response=await request(`https://${host}/snap/v1/transactions`,{method:'POST',headers:{Authorization:authorization(),'Content-Type':'application/json','X-Override-Notification':urls.notification},signal:AbortSignal.timeout(20000),body:JSON.stringify({transaction_details:{order_id:orderId,gross_amount:amount},customer_details:{email:user.email},item_details:[{id:`keuanganmu-${plan.id}`,price:amount,quantity:1,name:`Tabunganmu Plus ${plan.label}`}],callbacks:{finish:urls.finish.href},expiry:{unit:'minutes',duration:60}})});
  if(response.status===401)return json(502,{error:'Kredensial pembayaran belum dapat digunakan. Hubungi bantuan layanan.',code:'midtrans_auth_failed'});
  if(response.status===403)return json(502,{error:'Izin pembayaran belum tersedia. Hubungi bantuan layanan.',code:'midtrans_permission_denied'});
  const data=await response.json();
  if(!response.ok||!data.redirect_url)throw Error('Pembayaran belum tersedia');
  const redirect=new URL(data.redirect_url);if(redirect.protocol!=='https:'||redirect.hostname!==host||redirect.username||redirect.password)throw Error('Unexpected checkout URL');
  return json(200,{redirect_url:data.redirect_url,orderId,environment:configuration.environment});
 }catch{return json(500,{error:'Tidak dapat membuat pembayaran. Periksa konfigurasi atau coba lagi.'})}
};}
export const handler=createCheckoutHandler();
