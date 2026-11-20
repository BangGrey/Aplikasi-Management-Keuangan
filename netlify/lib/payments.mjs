export function paymentConfiguration(key,isProduction=false){
 const environment=isProduction?'production':'sandbox';
 const ready=typeof key==='string'&&key.trim().startsWith(isProduction?'Mid-server-':'SB-Mid-server-');
 return {environment,ready};
}
export function paymentUrls(site){
 const url=new URL(site);
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid payment site URL');
 return {finish:new URL('/langganan',url),notification:new URL('/.netlify/functions/midtrans-webhook',url).href};
}
export function paymentError(statusCode,message){return Object.assign(Error(message),{statusCode})}
export async function verifyAndActivatePayment({db,order,request,authorization,isProduction}){
 const environment=isProduction?'production':'sandbox';
 if(order.status==='paid')return {paid:true,transactionStatus:'paid',environment:order.id.startsWith('KT-SB-')?'sandbox':order.id.startsWith('KT-LIVE-')?'production':environment};
 if(order.id.startsWith('KT-SB-')&&isProduction||order.id.startsWith('KT-LIVE-')&&!isProduction)throw paymentError(409,'Payment environment changed');
 const response=await request(`https://api.${isProduction?'':'sandbox.'}midtrans.com/v2/${encodeURIComponent(order.id)}/status`,{headers:{Authorization:authorization},signal:AbortSignal.timeout(20000)});
 if(response.status===404)return {paid:false,transactionStatus:'pending',environment};
 if(!response.ok)throw Error('Cannot verify payment status');
 const status=await response.json();
 if(status?.status_code==='404')return {paid:false,transactionStatus:'pending',environment};
 if(!status||Number(status.gross_amount)!==Number(order.amount)||status.order_id!==order.id||status.currency&&status.currency!=='IDR')throw paymentError(400,'Order mismatch');
 const paid=String(status.status_code)==='200'&&
  (status.transaction_status==='settlement'||status.transaction_status==='capture'&&status.fraud_status==='accept')&&
  (!status.fraud_status||status.fraud_status==='accept');
 if(paid){const {error}=await db.rpc('activate_subscription',{payment_order_id:order.id});if(error)throw error;}
 return {paid,transactionStatus:status.transaction_status||'pending',environment};
}
