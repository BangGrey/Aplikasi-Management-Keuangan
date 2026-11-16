import {admin} from '../lib/common.mjs';
import {syncGoldPrices} from '../lib/gold-sync.mjs';
export default async ()=>{
 try{const result=await syncGoldPrices(admin());console.log('Gold sync:',JSON.stringify(result));return new Response(null,{status:204})}
 catch(error){console.error('Gold sync failed.',JSON.stringify({stage:error.stage||'configuration_or_collection',code:error.code||'UNKNOWN'}));return new Response(null,{status:500})}
};
export const config={schedule:'0 2,7 * * *'};
