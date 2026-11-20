import {json,production,midtransServerKey} from '../lib/common.mjs';
import {paymentConfiguration} from '../lib/payments.mjs';
export function createPaymentConfigHandler({serverKey=midtransServerKey,signatureSecret=()=>process.env.MIDTRANS_SIGNATURE_SECRET_KEY,isProduction=production}={}){
 return async event=>event.httpMethod==='GET'?json(200,paymentConfiguration(serverKey(),isProduction(),signatureSecret())):json(405,{error:'Method not allowed'});
}
export const handler=createPaymentConfigHandler();
