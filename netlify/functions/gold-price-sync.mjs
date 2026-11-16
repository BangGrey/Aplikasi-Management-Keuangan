import {admin} from '../lib/common.mjs';
import {syncGoldPrices} from '../lib/gold-sync.mjs';
export default async ()=>{
 try{const result=await syncGoldPrices(admin());console.log('Gold sync:',JSON.stringify(result));return new Response(null,{status:204})}
 catch{console.error('Gold sync failed. Check Supabase configuration and gold.sql migration.');return new Response(null,{status:500})}
};
export const config={schedule:'0 2,7 * * *'};
