import {createClient} from '@supabase/supabase-js';
export const admin=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export const json=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
export const production=()=>process.env.MIDTRANS_IS_PRODUCTION==='true';
export const midtransServerKey=()=>typeof process.env.MIDTRANS_SERVER_KEY==='string'?process.env.MIDTRANS_SERVER_KEY.trim():'';
export const authHeader=()=>`Basic ${Buffer.from(midtransServerKey()+':').toString('base64')}`;
