import {test} from 'node:test';
import assert from 'node:assert/strict';
import {valueHolding,validateHolding,totalGrams,jakartaDay,automaticHolding,valueAtSource,remainingGold} from '../src/gold.mjs';
import {parseGaleri24,worldQuote,partnerQuotes,TROY_OUNCE_GRAMS} from '../netlify/lib/gold-providers.mjs';
import {syncGoldPrices} from '../netlify/lib/gold-sync.mjs';
const now=new Date('2026-11-16T04:00:00Z');
const holding={label:'Emas pribadi',grams:3,source:'galeri24',price_mode:'auto'};
const quote={source:'galeri24',price_per_gram:2000000,source_date:'2026-11-16',status:'ok'};
test('gold sales subtract exact fractional grams without allowing a negative balance',()=>{
 assert.equal(remainingGold(3,1),2);
 assert.equal(remainingGold(3,3),0);
 assert.equal(remainingGold(0.3,0.1),0.2);
 assert.equal(remainingGold(0.0002,0.0001),0.0001);
 for(const sold of [0,-1,4,0.00001,NaN,Infinity,''])assert.throws(()=>remainingGold(3,sold));
 assert.throws(()=>remainingGold(0,0.0001));
 assert.equal(valueAtSource({...holding,grams:remainingGold(3,1)},'galeri24',[quote],now).value,4000000);
});
test('gram-only input creates an automatic holding; selected source recalculates without manual prices',()=>{
 const row=automaticHolding('3','galeri24');assert.equal(validateHolding(row),true);assert.equal(row.price_mode,'auto');assert.equal(row.manual_price,null);assert.equal(row.grams,3);
 const quotes=[quote,{...quote,source:'antam-galeri24',price_per_gram:2100000}];
 assert.equal(valueAtSource(row,'galeri24',quotes,now).value,6000000);
 assert.equal(valueAtSource(row,'antam-galeri24',quotes,now).value,6300000);
 const old={...row,price_mode:'manual',manual_price:1,manual_date:'2026-11-16'};
 assert.equal(valueAtSource(old,'galeri24',quotes,now).value,6000000);
 assert.equal(valueAtSource(old,'pegadaian',quotes,now).value,null);
 assert.equal(validateHolding(automaticHolding('0','galeri24')),false);
});
test('gold valuation uses gram units, distinguishes manual/world, and never guesses missing price',()=>{
 assert.equal(valueHolding(holding,[quote],now).value,6000000);
 assert.equal(valueHolding(holding,[],now).value,null);
 assert.equal(valueHolding(holding,[{...quote,price_per_gram:0}],now).value,null);
 assert.equal(valueHolding(holding,[{...quote,source_date:'2026-11-17'}],now).value,null);
 assert.equal(valueHolding(holding,[{...quote,source_date:'2026-11-15'}],now).old,true);
 assert.equal(valueHolding(holding,[{...quote,status:'unavailable'}],now).failed,true);
 assert.equal(valueHolding({...holding,source:'world'},[{...quote,source:'world'}],now).reference,true);
 const manual=valueHolding({...holding,price_mode:'manual',manual_price:1000000,manual_date:'2026-11-15'},[quote],now);
 assert.equal(manual.value,3000000);assert.equal(manual.manual,true);assert.equal(manual.old,true);
 assert.equal(totalGrams([{grams:0.1},{grams:0.2}]),0.3);
 assert.equal(jakartaDay(new Date('2026-11-15T18:00:00Z')),'2026-11-16');
});
test('holding validation accepts fractional grams and rejects malformed amounts',()=>{
 assert.equal(validateHolding(holding),true);
 assert.equal(validateHolding({...holding,grams:0.0001}),true);
 for(const changes of [{grams:0},{grams:-1},{grams:0.00001},{grams:Infinity},{source:'fake'},{price_mode:'manual',manual_price:1,manual_date:'2026-02-30'}])assert.equal(validateHolding({...holding,...changes}),false);
});
function section(brand,sale,buyback){return `<div id="${brand}"><div>Diperbarui Senin, 16 November 2026</div><div>Harga Jual Harga Buyback</div><div class="grid-cols-5"><div>1</div><div>Rp${sale}</div><div>Rp${buyback}</div></div></div>`}
const html=section('GALERI 24','2.500.000','2.000.000')+section('ANTAM','2.600.000','2.100.000');
test('official table parser selects buyback, correct brand and source date, not sale price',()=>{
 const quotes=parseGaleri24(html,now);
 assert.equal(quotes[0].price_per_gram,2000000);assert.equal(quotes[1].source,'antam-galeri24');assert.equal(quotes[1].price_per_gram,2100000);
 assert.equal(quotes[0].source_date,'2026-11-16');assert.throws(()=>parseGaleri24('<div>Harga tidak ada</div>',now));
 assert.throws(()=>parseGaleri24(html.replaceAll('16 November','17 November'),now));
});
test('world price converts troy ounces to grams with dated IDR exchange rate',()=>{
 const gold={symbol:'XAU',currency:'USD',price:TROY_OUNCE_GRAMS*100,updatedAt:now.toISOString()},fx={base:'USD',quote:'IDR',rate:15000,date:'2026-11-13'};
 const q=worldQuote(gold,fx,now);assert.equal(q.price_per_gram,1500000);assert.equal(q.source_date,'2026-11-13');
 assert.throws(()=>worldQuote({...gold,currency:'IDR'},fx,now));
 assert.throws(()=>worldQuote(gold,{...fx,rate:-1},now));
 assert.throws(()=>worldQuote(gold,{...fx,date:'2026-11-17'},now));
});
test('partner feed must explicitly contain IDR buyback per gram',()=>{
 const valid={source:'antam',kind:'buyback',currency:'IDR',unit:'gram',price_per_gram:2000000,source_date:'2026-11-16'};
 assert.equal(partnerQuotes({quotes:[valid]},now)[0].source,'antam');
 for(const override of [{kind:'sale'},{unit:'ounce'},{currency:'USD'},{source:'world'},{price_per_gram:NaN}])assert.throws(()=>partnerQuotes({quotes:[{...valid,...override}]},now));
});
test('failed updates keep the last successful price and never stamp it as current',async()=>{
 const writes=[];const db={from:table=>({select:async()=>({data:[{...quote,source_date:'2026-11-10'}],error:null}),upsert:async rows=>{writes.push({table,rows});return {error:null}}})};
 await syncGoldPrices(db,{now,partnerUrl:null,request:async()=>{throw Error('offline')}});
 const cached=writes[0].rows.find(q=>q.source==='galeri24');assert.equal(cached.price_per_gram,2000000);assert.equal(cached.source_date,'2026-11-10');assert.equal(cached.status,'unavailable');assert.equal(cached.last_attempt_at,now.toISOString());
 const unavailable=writes[0].rows.find(q=>q.source==='antam');assert.equal(unavailable.price_per_gram,null);assert.deepEqual(Object.keys(unavailable),Object.keys(cached));
 assert.ok(!writes.some(w=>w.table==='gold_quote_history'));
});
