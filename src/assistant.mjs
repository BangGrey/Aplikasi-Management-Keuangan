// Deterministic Indonesian command parser. Never executes arbitrary instructions.
export const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
export function localDate(now=new Date()){
 return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function parseName(text,first=false){
 const match=text.trim().match(/^(?:(?:aku|saya)\s+(?:akan\s+)?(?:memanggil|menamai|panggil)\s+(?:kamu|mu)\s+(?:sebagai\s+)?|(?:nama(?:mu| kamu)|ganti nama(?:mu| kamu)?)\s*(?:adalah|jadi|menjadi|ke|:)\s*|panggil(?:\s+kamu)?\s+)(.+?)[.!]?$/iu);
 const value=(match?.[1]||(first?text.trim():'' )).trim();
 if(!value||value.length>30||!/^\p{L}[\p{L}\p{M} '\-]*$/u.test(value))return null;
 return value;
}
export function parseExpense(text,now=new Date()){
 const fail=message=>({error:message});
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
 const rules=[[/kopi|makan|minum|roti|nasi|teh|snack/i,'Makanan'],[/bensin|parkir|ojek|taksi|bus|kereta|transport/i,'Transportasi'],[/listrik|internet|pulsa|air|tagihan/i,'Tagihan'],[/obat|dokter|vitamin/i,'Kesehatan'],[/bioskop|game|film/i,'Hiburan'],[/belanja|baju|sepatu/i,'Belanja']];
 return {transaction:{title,type:'expense',amount,category:rules.find(([r])=>r.test(title))?.[1]||'Lainnya',date:localDate(now)}};
}

export function parseTransaction(text,now=new Date()){
 const income=/\b(pemasukan|pendapatan|gaji|terima|menerima)\b/i.test(text);
 if(!income)return parseExpense(text,now);
 if(/\b(pengeluaran|beli|membeli|bayar|membayar|keluar)\b/i.test(text))return {error:'Pisahkan pemasukan dan pengeluaran menjadi dua pesan.'};
 if(!/\b(tambah(?:kan)?|catat(?:kan)?|terima|menerima)\b/i.test(text))return {error:'Untuk mencatat pemasukan, coba “catat pemasukan gaji 5 juta”.'};
 // Reuse the same nominal and safety validation as expenses.
 const normalized=text.replace(/\b(pemasukan|pendapatan)\b/gi,'').replace(/\b(terima|menerima)\b/gi,'catat');
 const result=parseExpense('catat '+normalized.replace(/\bgaji\b/gi,'upah'),now);
 if(result.error)return {error:result.error.replace(/pengeluaran/g,'pemasukan').replace('beli kopi Rp5.000','catat pemasukan gaji Rp5.000')};
 const title=result.transaction.title.replace(/\bupah\b/gi,'Gaji').replace(/\s+dari\s+/gi,' dari ').replace(/^dari\s+/i,'');
 return {transaction:{...result.transaction,title,type:'income',category:/gaji|upah/i.test(text)?'Gaji':/freelance|proyek/i.test(text)?'Freelance':'Lainnya',date:localDate(now)}};
}

const months=['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
const dateLabel=value=>new Date(value+'T00:00:00').toLocaleDateString('id-ID',{dateStyle:'long'});
function validDate(value){const d=new Date(value+'T00:00:00');return !Number.isNaN(d.getTime())&&localDate(d)===value}
export function parsePeriod(text,now=new Date(),allByDefault=false){
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
 const t=text.toLowerCase();
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
 const period=`Periode: ${query.label}${query.from?` (${query.from} s.d. ${query.to})`:''}.`;
 if(query.kind==='income')return `${period}\nTotal pemasukan: ${rupiah(income)}.\n${selected.filter(t=>t.type==='income').length} catatan pemasukan.`;
 if(query.kind==='expense')return `${period}\nTotal pengeluaran: ${rupiah(expense)}.\n${selected.filter(t=>t.type==='expense').length} catatan pengeluaran.`;
 return `${period}\nPemasukan: ${rupiah(income)}\nPengeluaran: ${rupiah(expense)}\n${query.from?'Selisih periode':'Saldo tercatat saat ini'}: ${rupiah(income-expense)}\nDihitung dari catatan transaksi, tidak termasuk progres target tabungan.${selected.length?'':' Belum ada transaksi dalam periode ini.'}`;
}
