import {json,production} from '../lib/common.mjs';
import {paymentConfiguration} from '../lib/payments.mjs';
export function createPaymentConfigHandler({serverKey=()=>process.env.MIDTRANS_SERVER_KEY,isProduction=production}={}){
 return async event=>event.httpMethod==='GET'?json(200,paymentConfiguration(serverKey(),isProduction())):json(405,{error:'Method not allowed'});
}
export const handler=createPaymentConfigHandler();
