import {randomUUID} from 'node:crypto';
import {admin,json,production,authHeader} from '../lib/common.mjs';
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{error:'Metode tidak diizinkan'});
 try{
  const db=admin(),token=event.headers.authorization?.replace(/^Bearer /i,'');
  if(!token)return json(401,{error:'Silakan masuk terlebih dahulu.'});
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user)return json(401,{error:'Sesi berakhir. Silakan masuk kembali.'});
  const orderId=`KT-${randomUUID()}`,amount=29000;
  const {error:insertError}=await db.from('orders').insert({id:orderId,user_id:user.id,amount,status:'pending'});
  if(insertError)throw insertError;
  const response=await fetch(`https://app.${production()?'':'sandbox.'}midtrans.com/snap/v1/transactions`,{method:'POST',headers:{Authorization:authHeader(),'Content-Type':'application/json'},body:JSON.stringify({transaction_details:{order_id:orderId,gross_amount:amount},customer_details:{email:user.email},item_details:[{id:'kantong-30',price:amount,quantity:1,name:'Keuanganmu Plus 30 hari'}],callbacks:{finish:process.env.URL},expiry:{unit:'minutes',duration:60}})});
  const data=await response.json();
  if(!response.ok||!data.redirect_url)throw Error('Pembayaran belum tersedia');
  return json(200,{redirect_url:data.redirect_url});
 }catch(error){console.error('Checkout failed:',error.message);return json(500,{error:'Tidak dapat membuat pembayaran. Periksa konfigurasi atau coba lagi.'})}
}
