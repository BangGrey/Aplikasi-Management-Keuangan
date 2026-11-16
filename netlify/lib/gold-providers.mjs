import {load} from 'cheerio';
import {jakartaDay,validDay} from '../../src/gold.mjs';
export const TROY_OUNCE_GRAMS=31.1034768;
const months=['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
export function parseIndonesianDate(text){
 const m=text.toLowerCase().match(/(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/);
 if(!m)throw Error('Tanggal sumber tidak ditemukan');const day=`${m[3]}-${String(months.indexOf(m[2])+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
 if(!validDay(day))throw Error('Tanggal sumber tidak valid');return day;
}
function validateQuote(q,now){
 if(!Number.isFinite(q.price_per_gram)||q.price_per_gram<10000||q.price_per_gram>100000000||!validDay(q.source_date)||q.source_date>jakartaDay(now))throw Error('Harga/tanggal sumber tidak valid');return q;
}
export function parseGaleri24(html,now=new Date()){
 const $=load(html);return [['GALERI 24','galeri24'],['ANTAM','antam-galeri24']].map(([brand,source])=>{
  const section=$('[id]').filter((_,el)=>$(el).attr('id')===brand).first();
  const text=section.text().replace(/\s+/g,' ');if(!text.includes('Harga Jual')||!text.includes('Harga Buyback'))throw Error('Struktur tabel Galeri24 berubah');
  let price=null;
  section.find('div.grid-cols-5').each((_,row)=>{const cells=$(row).children('div');if(cells.length===3&&cells.eq(0).text().trim()==='1'){
   const raw=cells.eq(2).text().trim();if(!/^Rp\s*[\d.]+$/.test(raw))throw Error('Format buyback berubah');price=Number(raw.replace(/[^\d]/g,''));
  }});
  return validateQuote({source,price_per_gram:price,source_date:parseIndonesianDate(text),observed_at:now.toISOString(),status:'ok',message:null,metadata:{url:'https://galeri24.co.id/harga-emas',basis:'Buyback pecahan 1 gram',brand}},now);
 });
}
export function worldQuote(gold,fx,now=new Date()){
 if(gold.symbol!=='XAU'||gold.currency!=='USD'||fx.base!=='USD'||fx.quote!=='IDR'||!Number.isFinite(gold.price)||gold.price<=0||!Number.isFinite(fx.rate)||fx.rate<=0||!validDay(fx.date)||fx.date>jakartaDay(now)||!Number.isFinite(Date.parse(gold.updatedAt))||Date.parse(gold.updatedAt)>now.getTime()+600000)throw Error('Data emas dunia/kurs tidak valid');
 const goldDay=jakartaDay(new Date(gold.updatedAt));
 return validateQuote({source:'world',price_per_gram:gold.price*fx.rate/TROY_OUNCE_GRAMS,source_date:[goldDay,fx.date].sort()[0],observed_at:now.toISOString(),status:'ok',message:null,metadata:{url:'https://gold-api.com',fx_url:'https://frankfurter.dev',usd_per_troy_ounce:gold.price,usd_idr:fx.rate,gold_updated_at:gold.updatedAt,fx_date:fx.date,basis:'Referensi dunia; bukan buyback toko'}},now);
}
export function partnerQuotes(data,now=new Date()){
 if(!Array.isArray(data.quotes)||data.quotes.length>2)throw Error('Format feed partner tidak valid');
 const seen=new Set();return data.quotes.map(q=>{if(!['antam','pegadaian'].includes(q.source)||seen.has(q.source)||q.kind!=='buyback'||q.currency!=='IDR'||q.unit!=='gram')throw Error('Jenis feed partner tidak valid');seen.add(q.source);return validateQuote({source:q.source,price_per_gram:q.price_per_gram,source_date:q.source_date,observed_at:now.toISOString(),status:'ok',message:null,metadata:{basis:'Buyback per gram dari feed partner terkonfigurasi',url:q.source==='antam'?'https://www.logammulia.com/id/sell/gold':'https://pegadaian.co.id/harga-emas'}},now)});
}
async function get(url,request,token){
 const response=await request(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Kantong/1.0 (daily gold price monitor)',...(token?{Authorization:`Bearer ${token}`}:{})},redirect:'error'});
 if(!response.ok)throw Error('Sumber tidak dapat diakses');const body=await response.text();if(body.length>2000000)throw Error('Respons terlalu besar');return body;
}
export async function collectGoldQuotes({request=fetch,now=new Date(),partnerUrl=process.env.GOLD_PARTNER_FEED_URL,partnerToken=process.env.GOLD_PARTNER_FEED_TOKEN}={}){
 const results=await Promise.allSettled([
  get('https://galeri24.co.id/harga-emas',request).then(h=>parseGaleri24(h,now)),
  Promise.all([get('https://api.gold-api.com/price/XAU',request),get('https://api.frankfurter.dev/v2/rate/USD/IDR',request)]).then(([gold,fx])=>[worldQuote(JSON.parse(gold),JSON.parse(fx),now)]),
  Promise.resolve().then(()=>{if(!partnerUrl)return [];if(new URL(partnerUrl).protocol!=='https:')throw Error('Feed harus HTTPS');return get(partnerUrl,request,partnerToken).then(body=>partnerQuotes(JSON.parse(body),now))}),
 ]);
 const quotes=results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value);
 const failures=['galeri24','antam-galeri24','world','antam','pegadaian'].filter(source=>!quotes.some(q=>q.source===source)).map(source=>({source,message:['antam','pegadaian'].includes(source)?'Feed buyback langsung belum tersedia. Gunakan input manual bertanggal atau konfigurasi feed partner.':'Sumber belum berhasil diperbarui; harga terakhir dipertahankan.'}));
 return {quotes,failures};
}
