import {collectGoldQuotes} from './gold-providers.mjs';
export async function syncGoldPrices(db,options={}){
 const now=options.now||new Date();const {quotes,failures}=await collectGoldQuotes({...options,now});
 const {data:existing,error}=await db.from('gold_quotes').select('*');if(error)throw error;
 const rows=[...quotes.map(q=>{const old=existing?.find(p=>p.source===q.source);return old?.source_date>q.source_date?{...old,last_attempt_at:now.toISOString(),status:'unavailable',message:'Sumber mengembalikan tanggal lebih lama; harga terakhir dipertahankan.'}:{...q,last_attempt_at:now.toISOString()}}),...failures.map(f=>({...existing?.find(q=>q.source===f.source),...f,status:'unavailable',last_attempt_at:now.toISOString()}))];
 // PostgREST bulk upserts need consistent columns, including never-seen failed sources.
 const payload=rows.map(q=>({source:q.source,price_per_gram:q.price_per_gram??null,source_date:q.source_date??null,observed_at:q.observed_at??null,last_attempt_at:q.last_attempt_at,status:q.status,message:q.message??null,metadata:q.metadata||{}}));
 const saved=await db.from('gold_quotes').upsert(payload,{onConflict:'source'});if(saved.error)throw saved.error;
 if(quotes.length){const history=await db.from('gold_quote_history').upsert(quotes.map(q=>({source:q.source,source_date:q.source_date,price_per_gram:q.price_per_gram,observed_at:q.observed_at})),{onConflict:'source,source_date'});if(history.error)throw history.error;}
 return {updated:quotes.map(q=>q.source),unavailable:failures.map(f=>f.source)};
}
