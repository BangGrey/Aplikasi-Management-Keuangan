import {getLocale,getLanguage,tr} from './language.mjs';
// Only explicit, single-transaction commands are accepted. Amounts remain IDR.
export const rupiah=n=>new Intl.NumberFormat(getLocale(),{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
function commandText(text){
 const english=/\b(add|record|expense|expenses|income|buy|bought|pay|paid|received|balance|summary|salary|today|yesterday|month|week|year|all time)\b/i.test(text);
 if(!english)return text;
 const phrases=[[/\b(?:do not|[a-z]+n['’]t|cannot|never|no|not|without)\b/gi,'jangan'],[/\b(?:if|unless|maybe|might|could|would|should|want|planning|plan|example|suppose|imagine|pretend|either|or|wish|hope)\b/gi,'mungkin'],[/\b(?:how much|what|when|where|how)\b/gi,'berapa'],[/\b(?:this|last) (week|month|year)\b/gi,m=>{const [when,unit]=m.toLowerCase().split(' ');return ({week:'minggu',month:'bulan',year:'tahun'}[unit])+' '+(when==='this'?'ini':'lalu')}],[/\ball time\b/gi,'semua'],[/\band (?:make|create|generate)(?: a)? receipt\b/gi,'dan buatkan nota'],[/\bcurrent(?:ly)?\b/gi,'saat ini']];
 let normalized=text.replace(/\bIDR\s*(?=\d)/gi,'Rp ');for(const [pattern,value]of phrases)normalized=normalized.replace(pattern,value);
 const words={add:'tambahkan',record:'catat',expense:'pengeluaran',expenses:'pengeluaran',income:'pemasukan',balance:'saldo',summary:'ringkasan',buy:'beli',bought:'beli',pay:'bayar',paid:'bayar',receive:'terima',received:'terima',today:'hari ini',yesterday:'kemarin',tomorrow:'besok',day:'hari',days:'hari',week:'minggu',weeks:'minggu',month:'bulan',months:'bulan',year:'tahun',years:'tahun',last:'terakhir',thousand:'ribu',million:'juta',and:'dan',from:'dari',for:'untuk',please:'tolong',delete:'hapus',remove:'hapus',cancel:'batal'};
 normalized=normalized.replace(/\b[a-z]+\b/gi,word=>words[word.toLowerCase()]||word);
 // English thousands separators; decimals stay subject to the existing whole-IDR validation.
 return normalized.replace(/\b\d{1,3}(?:,\d{3})+\b/g,value=>value.replaceAll(',',''));
}
export function localDate(now=new Date()){
 return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function parseName(text,first=false){
 const english=text.trim().match(/^(?:(?:i(?:'ll|’ll| will)?\s+)?call you|your name is|rename yourself(?: to)?)\s+(.+?)[.!]?$/iu);
 const match=text.trim().match(/^(?:(?:aku|saya)\s+(?:akan\s+)?(?:memanggil|menamai|panggil)\s+(?:kamu|mu)\s+(?:sebagai\s+)?|(?:nama(?:mu| kamu)|ganti nama(?:mu| kamu)?)\s*(?:adalah|jadi|menjadi|ke|:)\s*|panggil(?:\s+kamu)?\s+)(.+?)[.!]?$/iu);
 const value=(english?.[1]||match?.[1]||(first?text.trim():'' )).trim();
 if(!value||value.length>30||!/^\p{L}[\p{L}\p{M} '\-]*$/u.test(value))return null;
 return value;
}
export function parseExpense(text,now=new Date()){
 const fail=message=>({error:message});
 if(/[$€£]|\b(?:USD|EUR|GBP|dollars?|euros?|pounds?)\b/i.test(text))return fail('Nominal harus dalam rupiah (IDR).');
 text=commandText(text);
 if(text.length>500)return fail('Pesannya terlalu panjang. Tulis satu pengeluaran saja.');
 if(!/\b(pengeluaran|beli|membeli|bayar|membayar|catat|keluar)\b/i.test(text)||/\b(pemasukan|gaji|jangan|tidak|bukan|belum|batal|hapus|contoh|misal|misalkan|berapa|apakah|mungkin|rencana|ingin|mau|atau)\b|\?/i.test(text))return fail('Saya bisa mencatat satu pengeluaran. Coba: “tambahkan pengeluaran untuk membeli kopi 5000”.');
 // Require a single positive whole-rupiah amount; reject multiple transactions and uncertain numbers.
 const amounts=[...text.matchAll(/(?:rp\.?\s*)?-?\d+(?:[.,]\d+)*(?:\s*(?:ribu|juta|rb|jt|k)\b)?/gi)];
 if(amounts.length!==1)return fail('Tulis tepat satu nominal dan satu pengeluaran, misalnya “beli kopi Rp5.000”.');
 const token=amounts[0][0].replace(/^rp\.?\s*/i,'').trim();
 const m=token.match(/^(\d+(?:[.,]\d+)?)\s*(ribu|rb|k|juta|jt)$/i);
 let amount;
 if(m)amount=Number(m[1].replace(',','.'))*(/^(juta|jt)$/i.test(m[2])?1000000:1000);
 else if(/^\d+$/.test(token))amount=Number(token);
 else if(/^\d{1,3}(?:\.\d{3})+(?:,00)?$/.test(token))amount=Number(token.replace(/\./g,'').replace(',00',''));
 else return fail('Nominal belum jelas. Gunakan 5000, Rp5.000, 5 ribu, atau 5rb.');
 if(!Number.isSafeInteger(amount)||amount<=0||amount>1000000000000)return fail('Nominal harus rupiah bulat, lebih dari 0 dan maksimal Rp1 triliun.');
 if(/\b(kemarin|besok|tanggal|minggu|bulan|lalu)\b/i.test(text))return fail('Untuk saat ini saya mencatat transaksi hari ini. Gunakan formulir manual untuk tanggal lain.');
 let title=(text.slice(0,amounts[0].index)+' '+text.slice(amounts[0].index+amounts[0][0].length))
 .replace(/^(?:(?:tolong|mohon|tambahkan|tambah|catatkan|catat|pengeluaran|untuk|membeli|beli|membayar|bayar|aku|saya)\b[\s,:]*)+/i,'')
 .replace(/\b(?:seharga|sebesar|senilai|dengan harga|harga|sejumlah|hari ini|rupiah|dan buatkan(?: juga)? nota(?:nya)?|buatkan(?: juga)? nota(?:nya)?)\b/gi,' ')
 .replace(/[.,!]+$/g,'').replace(/\s+/g,' ').trim();
 if(!title||title.length>100||/\b(dan|serta|lalu)\b/i.test(title))return fail('Sebutkan satu nama pengeluaran, misalnya “kopi”, beserta nominalnya.');
 title=title.charAt(0).toUpperCase()+title.slice(1);
 const rules=[[/kopi|makan|minum|roti|nasi|teh|snack|coffee|food|lunch|dinner|breakfast|bread|tea/i,'Makanan'],[/bensin|parkir|ojek|taksi|bus|kereta|transport|taxi|fuel|parking/i,'Transportasi'],[/listrik|internet|pulsa|air|tagihan|electricity|water bill/i,'Tagihan'],[/obat|dokter|vitamin|medicine|doctor/i,'Kesehatan'],[/bioskop|game|film|cinema/i,'Hiburan'],[/belanja|baju|sepatu|shopping|clothes|shoes/i,'Belanja']];
 return {transaction:{title,type:'expense',amount,category:rules.find(([r])=>r.test(title))?.[1]||'Lainnya',date:localDate(now)}};
}

export function parseTransaction(text,now=new Date()){
 text=commandText(text);
 const income=/\b(pemasukan|pendapatan|gaji|salary|terima|menerima)\b/i.test(text);
 if(!income)return parseExpense(text,now);
 if(/\b(pengeluaran|beli|membeli|bayar|membayar|keluar)\b/i.test(text))return {error:'Pisahkan pemasukan dan pengeluaran menjadi dua pesan.'};
 if(!/\b(tambah(?:kan)?|catat(?:kan)?|terima|menerima)\b/i.test(text))return {error:'Untuk mencatat pemasukan, coba “catat pemasukan gaji 5 juta”.'};
 // Reuse the same nominal and safety validation as expenses.
 const normalized=text.replace(/\b(pemasukan|pendapatan)\b/gi,'').replace(/\b(terima|menerima)\b/gi,'catat');
 const result=parseExpense('catat '+normalized.replace(/\bgaji\b/gi,'upah'),now);
 if(result.error)return {error:result.error.replace(/pengeluaran/g,'pemasukan').replace('beli kopi Rp5.000','catat pemasukan gaji Rp5.000')};
 const title=result.transaction.title.replace(/\bupah\b/gi,'Gaji').replace(/\s+dari\s+/gi,' dari ').replace(/^dari\s+/i,'');
 return {transaction:{...result.transaction,title,type:'income',category:/gaji|upah|salary/i.test(text)?'Gaji':/freelance|proyek/i.test(text)?'Freelance':'Lainnya',date:localDate(now)}};
}

const months=['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
const dateLabel=value=>new Date(value+'T00:00:00').toLocaleDateString(getLocale(),{dateStyle:'long'});
function validDate(value){const d=new Date(value+'T00:00:00');return !Number.isNaN(d.getTime())&&localDate(d)===value}
export function parsePeriod(text,now=new Date(),allByDefault=false){
 text=commandText(text).replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,m=>months[['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(m.toLowerCase())]);
 if(/\d{4}-\d{2}-\d{2}/.test(text))text=text.replace(/\b(?:to|through)\b/gi,'sampai').replace(/\bbetween\b/gi,'').replace(/\bdan\b/gi,'sampai');
 const t=text.toLowerCase(),year=now.getFullYear(),month=now.getMonth();
 const day=offset=>localDate(new Date(year,month,now.getDate()+offset));
 const range=(from,to,label)=>({from,to,label});
 const invalid={error:'Periode belum jelas. Gunakan “hari ini”, “bulan lalu”, “November 2026”, atau “2026-11-01 sampai 2026-11-15”.'};
 const dates=t.match(/\d{4}-\d{2}-\d{2}/g);
 if(dates){if(dates.length>2||dates.some(d=>!validDate(d)))return invalid;if(dates.length===2){if(!/\b(sampai|hingga|s\.d)\b/.test(t)||dates[0]>dates[1])return invalid;return range(dates[0],dates[1],`${dateLabel(dates[0])} – ${dateLabel(dates[1])}`)}if(/\b(sampai|hingga|sejak)\b/.test(t))return invalid;return range(dates[0],dates[0],dateLabel(dates[0]))}
 const named=months.filter(m=>new RegExp(`\\b${m}\\b`).test(t));
 if(named.length){if(named.length!==1||/\b(tanggal|hari|minggu|sampai|hingga)\b/.test(t))return invalid;const years=t.match(/\b\d{4}\b/g);if(years?.length>1||/\d/.test(t.replace(/\b\d{4}\b/g,'')))return invalid;const y=years?Number(years[0]):year;if(y<1900||y>9999)return invalid;const m=months.indexOf(named[0]);return range(localDate(new Date(y,m,1)),localDate(new Date(y,m+1,0)),`${named[0]} ${y}`)}
 const specs=[[/\b(hari ini)\b/,()=>range(day(0),day(0),'hari ini')],[/\bkemarin\b/,()=>range(day(-1),day(-1),'kemarin')],[/\bminggu (ini|lalu)\b/,match=>{const offset=(now.getDay()+6)%7+(match[1]==='lalu'?7:0);return range(day(-offset),day(6-offset),match[0]+' (Senin–Minggu)')}],[/\bbulan (ini|lalu)\b/,match=>{const m=month-(match[1]==='lalu'?1:0);return range(localDate(new Date(year,m,1)),localDate(new Date(year,m+1,0)),match[0])}],[/\btahun (ini|lalu)\b/,match=>{const y=year-(match[1]==='lalu'?1:0);return range(`${y}-01-01`,`${y}-12-31`,match[0])}],[/\b(seluruh|semua|sepanjang waktu)\b/,()=>range(null,day(0),'seluruh catatan sampai hari ini')]];
 const found=specs.flatMap(([r,fn])=>[...t.matchAll(new RegExp(r.source,'g'))].map(fn));
 if(found.length>1)return invalid;if(found.length===1)return found[0];
 if(/\b(periode|tanggal|minggu|bulan|tahun|hari|terakhir|sejak|sampai|hingga|besok)\b|\d/.test(t))return invalid;
 return allByDefault?range(null,day(0),'seluruh catatan sampai hari ini'):range(localDate(new Date(year,month,1)),localDate(new Date(year,month+1,0)),'bulan ini');
}
export function parseFinancialQuery(text,now=new Date()){
 const t=commandText(text).toLowerCase();
 if(!/\b(saldo|pemasukan|pendapatan|pengeluaran|ringkasan)\b/.test(t))return null;
 if(/\b(tambah(?:kan)?|catat(?:kan)?|beli|bayar|terima|menerima)\b/.test(t)){
  if(/\b(berapa|total|saldo|ringkasan)\b|\?/.test(t))return {error:'Pisahkan perintah mencatat dan pertanyaan ringkasan menjadi dua pesan.'};
  return null;
 }
 const kind=/\b(ringkasan|saldo)\b/.test(t)?'balance':/\b(pemasukan|pendapatan)\b/.test(t)&&/\bpengeluaran\b/.test(t)?'summary':/\b(pemasukan|pendapatan)\b/.test(t)?'income':'expense';
 const period=parsePeriod(t,now,kind==='balance');
 return period.error?period:{query:{kind,...period}};
}
export function summarizeTransactions(rows,query){
 const selected=rows.filter(t=>(!query.from||t.date>=query.from)&&t.date<=query.to);
 const income=selected.filter(t=>t.type==='income').reduce((n,t)=>n+Number(t.amount),0);
 const expense=selected.filter(t=>t.type==='expense').reduce((n,t)=>n+Number(t.amount),0);
 if(getLanguage()==='en'){
  const label=tr(query.label).replace(/^seluruh catatan sampai (\d{4}-\d{2}-\d{2})$/,(_,date)=>`all records through ${date}`).replace(/^(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember) (\d{4})$/i,(_,month,year)=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(Number(year),months.indexOf(month.toLowerCase()),1)));
  const period=`Period: ${label}${query.from?` (${query.from} to ${query.to})`:''}.`;
  if(query.kind==='income')return `${period}\nTotal income: ${rupiah(income)}.\n${selected.filter(t=>t.type==='income').length} income records.`;
  if(query.kind==='expense')return `${period}\nTotal expenses: ${rupiah(expense)}.\n${selected.filter(t=>t.type==='expense').length} expense records.`;
  return `${period}\nIncome: ${rupiah(income)}\nExpenses: ${rupiah(expense)}\n${query.from?'Period balance':'Current recorded balance'}: ${rupiah(income-expense)}\nCalculated from transaction records; savings goal progress is excluded.${selected.length?'':' No transactions in this period.'}`;
 }
 const period=`Periode: ${query.label}${query.from?` (${query.from} s.d. ${query.to})`:''}.`;
 if(query.kind==='income')return `${period}\nTotal pemasukan: ${rupiah(income)}.\n${selected.filter(t=>t.type==='income').length} catatan pemasukan.`;
 if(query.kind==='expense')return `${period}\nTotal pengeluaran: ${rupiah(expense)}.\n${selected.filter(t=>t.type==='expense').length} catatan pengeluaran.`;
 return `${period}\nPemasukan: ${rupiah(income)}\nPengeluaran: ${rupiah(expense)}\n${query.from?'Selisih periode':'Saldo tercatat saat ini'}: ${rupiah(income-expense)}\nDihitung dari catatan transaksi, tidak termasuk progres target tabungan.${selected.length?'':' Belum ada transaksi dalam periode ini.'}`;
}
