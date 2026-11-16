import {createClient} from '@supabase/supabase-js';
import {createHmac,randomUUID} from 'node:crypto';
import {admin,json} from '../lib/common.mjs';
import {normalizeUsername,validUsername} from '../../src/username.mjs';
const invalid=()=>json(401,{error:'Username atau kata sandi salah, atau email belum dikonfirmasi.'});
export function createLoginHandler({getAdmin=admin,getAuth=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),hashSecret=()=>process.env.SUPABASE_SERVICE_ROLE_KEY}={}){
 return async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  let body;try{body=JSON.parse(event.body)}catch{return json(400,{error:'Permintaan tidak valid.'})}
  if(!body||!validUsername(body.username)||typeof body.password!=='string'||!body.password||body.password.length>1024)return invalid();
  try{
   const db=getAdmin(),username=normalizeUsername(body.username);
   const ip=event.headers?.['x-nf-client-connection-ip']||'unknown';
   for(const scope of [`ip:${ip}`,`username:${username}`]){
    const bucket=createHmac('sha256',hashSecret()).update(scope).digest('hex');
    const {data:allowed,error}=await db.rpc('consume_login_attempt',{bucket_hash_value:bucket});
    if(error)throw error;if(!allowed)return json(429,{error:'Terlalu banyak percobaan login. Coba kembali dalam 15 menit.'});
   }
   const {data:profile,error}=await db.from('profiles').select('id').eq('username',username).maybeSingle();
   if(error)throw error;
   let email=`${randomUUID()}@example.invalid`;
   if(profile){const result=await db.auth.admin.getUserById(profile.id);if(result.error)throw result.error;email=result.data.user?.email||email;}
   // Separate public-key client: password checking never uses an admin-created session.
   const result=await getAuth().auth.signInWithPassword({email,password:body.password});
   if(result.error||!result.data.session||!profile)return invalid();
   return json(200,{access_token:result.data.session.access_token,refresh_token:result.data.session.refresh_token});
  }catch{return json(503,{error:'Login username belum tersedia. Periksa konfigurasi server atau masuk menggunakan email.'})}
 };
}
export const handler=createLoginHandler();
