import {admin,json} from '../lib/common.mjs';
export function createGoldPricesHandler({getAdmin=admin}={}){return async event=>{
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
 try{const db=getAdmin();const [quotes,history]=await Promise.all([db.from('gold_quotes').select('*'),db.from('gold_quote_history').select('source,source_date,price_per_gram').order('source_date',{ascending:false}).limit(300)]);if(quotes.error||history.error)throw Error('Unavailable');return {...json(200,{quotes:quotes.data,history:history.data}),headers:{'Content-Type':'application/json','Cache-Control':quotes.data.length?'public,max-age=60':'no-store'}}}
 catch{return json(503,{error:'Harga belum tersedia. Periksa migrasi gold.sql dan jalankan gold-price-sync dari dashboard Netlify.'})}
};}
export const handler=createGoldPricesHandler();
