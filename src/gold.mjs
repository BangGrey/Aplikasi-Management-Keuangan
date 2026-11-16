export const goldSources=[
 {id:'galeri24',label:'Galeri24 · merek Galeri24',url:'https://galeri24.co.id/harga-emas',automatic:true},
 {id:'antam-galeri24',label:'Antam · buyback di Galeri24',url:'https://galeri24.co.id/harga-emas',automatic:true},
 {id:'antam',label:'Antam · langsung Logam Mulia',url:'https://www.logammulia.com/id/sell/gold'},
 {id:'pegadaian',label:'Pegadaian · Tabungan Emas',url:'https://pegadaian.co.id/harga-emas'},
 {id:'world',label:'Referensi dunia · XAU/USD → IDR',url:'https://gold-api.com',reference:true,automatic:true},
 {id:'custom',label:'Toko emas lain · input manual',url:null},
];
export const jakartaDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const gramsText=n=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:4}).format(Number(n))+' g';
export function validateHolding(row){
 const units=Number(row.grams)*10000;
 return !!(row.label?.trim()&&row.label.trim().length<=100&&goldSources.some(s=>s.id===row.source)&&Number.isFinite(units)&&units>0&&units<=1e10&&Math.abs(Math.round(units)-units)<0.00001&&['auto','manual'].includes(row.price_mode)&&(row.price_mode!=='manual'||Number.isFinite(Number(row.manual_price))&&Number(row.manual_price)>0&&Number(row.manual_price)<=100000000&&validDay(row.manual_date)));
}
export function validDay(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}
export function valueHolding(holding,quotes,now=new Date()){
 const manual=holding.price_mode==='manual';
 const quote=quotes.find(q=>q.source===holding.source);
 const price=Number(manual?holding.manual_price:quote?.price_per_gram);
 const date=manual?holding.manual_date:quote?.source_date;
 if(!Number.isFinite(price)||price<=0||!validDay(date)||date>jakartaDay(now))return {value:null,price:null,date:null,manual,reference:holding.source==='world'};
 const value=Math.round(Math.round(Number(holding.grams)*10000)*price/10000);
 return {value,price,date,manual,reference:holding.source==='world',old:date!==jakartaDay(now),failed:!manual&&quote?.status!=='ok'};
}
export function totalGrams(holdings){return holdings.reduce((n,h)=>n+Math.round(Number(h.grams)*10000),0)/10000}
export const buybackSources=goldSources.filter(s=>!s.reference&&s.id!=='custom');
export const buybackSource=id=>buybackSources.find(s=>s.id===id)||buybackSources[0];
export function automaticHolding(grams,source,previous={}){
 return {label:previous.label||'Tabungan emas',grams:Number(grams),source:buybackSource(source).id,price_mode:'auto',manual_price:null,manual_date:null,cost_basis:previous.cost_basis??null};
}
export function valueAtSource(holding,source,quotes,now=new Date()){
 return valueHolding({...holding,source:buybackSource(source).id,price_mode:'auto'},quotes,now);
}
export function remainingGold(current,removed){
 const currentUnits=Number(current)*10000,removedUnits=Number(removed)*10000;
 if(!Number.isFinite(currentUnits)||currentUnits<0||currentUnits>1e10||Math.abs(Math.round(currentUnits)-currentUnits)>0.00001||!Number.isFinite(removedUnits)||removedUnits<=0||removedUnits>1e10||Math.abs(Math.round(removedUnits)-removedUnits)>0.00001)throw Error('Masukkan jumlah gram positif dengan maksimal 4 desimal.');
 const balance=Math.round(currentUnits),sold=Math.round(removedUnits);
 if(sold>balance)throw Error('Jumlah yang dijual melebihi saldo emas.');
 return (balance-sold)/10000;
}
