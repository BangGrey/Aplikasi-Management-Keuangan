// Generate local, bilingual SVG feature illustrations. No account data is used.
import fs from 'node:fs';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {APP_NAME} from '../src/brand.mjs';

const directory=new URL('../public/previews/',import.meta.url);fs.mkdirSync(directory,{recursive:true});
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=(x,y,value,size=22,color='#465641',weight=400)=>`<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escape(value)}</text>`;
const box=(x,y,w,h,fill='#fff',stroke='#e0e8d9',radius=18)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const line=(x1,y1,x2,y2,color='#e3e9dd')=>`<path d="M${x1} ${y1}H${x2}" transform="translate(0 ${y2-y1})" stroke="${color}" stroke-width="2"/>`;
const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const progress=(x,y,width,percent,color='#8ba779')=>box(x,y,width,12,'#e8eee1','none',6)+box(x,y,Math.max(10,width*percent/100),12,color,'none',6);
function embed(svg,x,y,width,height){return svg.replace('<svg ',`<svg x="${x}" y="${y}" width="${width}" height="${height}" `)}
const logo=fs.readFileSync(new URL('../public/tabunganmu-icon.svg',import.meta.url),'utf8');
const server=await createServer({configFile:false,envFile:false,server:{watch:null}});
try{
 await server.pluginContainer.buildStart({});
 const {default:Face}=await server.ssrLoadModule('/src/ThemeCharacter.jsx');
 const {default:Companion}=await server.ssrLoadModule('/src/CompanionCharacter.jsx');
 const {themes}=await server.ssrLoadModule('/src/themes.mjs');
 const face=(kind,x,y,size)=>embed(renderToStaticMarkup(React.createElement(Face,{kind})),x,y,size,size);
 const companion=(kind,x,y,width,height)=>embed(renderToStaticMarkup(React.createElement(Companion,{kind})),x,y,width,height);
 for(const language of ['id','en']){
  const t=(id,en)=>language==='id'?id:en;
  const money=number=>new Intl.NumberFormat(language==='en'?'en-US':'id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(number);
  function frame(title,subtitle,content){
   const sidebar=box(18,18,72,724,'#edf2e7','#e0e8d9',20)+embed(logo,33,35,42,42)+[138,202,266,330,394,458].map((y,i)=>circle(54,y,15,i===0?'#8ba779':'#d4dfc9')).join('')+circle(54,682,19,'#b7c7a8');
   return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="760" viewBox="0 0 960 760"><rect width="960" height="760" fill="#fafbf7"/>${sidebar}${text(118,58,APP_NAME.toLowerCase(),24,'#56794f',700)}${text(765,57,t('Data contoh','Sample data'),18,'#8b977f')}${line(115,82,930,82)}${text(120,135,title,33,'#35492f',700)}${text(120,173,subtitle,19,'#849277')}${content}</svg>`;
  }
  let body=box(120,208,810,144,'#e9f1e1','#d6e3ca')+text(146,245,t('Saldo bulan ini','This month’s balance'),21,'#718663')+text(146,302,money(6500000),44,'#56794f',700)+text(146,332,t('Pemasukan dikurangi pengeluaran','Income minus expenses'),17,'#8c9b80');
  body+=box(120,374,392,103)+text(144,411,t('Pemasukan','Income'),20,'#79916c')+text(144,451,money(8500000),29,'#4d6741',700)+box(536,374,394,103)+text(560,411,t('Pengeluaran','Expenses'),20,'#b18d72')+text(560,451,money(2000000),29,'#9f795d',700);
  body+=box(120,499,810,216)+text(146,538,t('Arus keuangan','Cash flow'),22,'#465641',700);
  [70,109,58,126,86,139,103,151].forEach((height,i)=>{body+=box(160+i*89,684-height,23,height,'#a5bc92','none',5)+box(187+i*89,684-height*.54,18,height*.54,'#e4c5a4','none',4)});
  body+=line(145,685,908,685);
  fs.writeFileSync(new URL(`overview-${language}.svg`,directory),frame(t('Keuangan tenang, hati senang.','Peaceful finances, happy heart.'),t('Ringkasan yang mudah dibaca, setiap bulan.','A clear overview, every month.'),body));

  body=box(120,209,810,93,'#f1f5eb')+text(145,246,t('3 pengeluaran tercatat','3 expenses recorded'),21,'#7b8b6d')+text(145,281,money(320000),30,'#56794f',700);
  body+=box(120,326,810,304)+text(145,367,t('Nama transaksi','Transaction name'),19,'#8c987f')+text(538,367,t('Kategori','Category'),19,'#8c987f')+text(741,367,t('Nominal','Amount'),19,'#8c987f');
  [[t('Kopi pagi','Morning coffee'),t('Makanan','Food'),25000,'#f6e8de'],[t('Transportasi','Transport'),t('Transportasi','Transport'),15000,'#e7edf7'],[t('Internet bulanan','Monthly internet'),t('Tagihan','Bills'),280000,'#eee8f5']].forEach(([title,category,amount,color],i)=>{const y=416+i*82;body+=circle(161,y-5,19,color)+text(198,y,title,21)+text(538,y,category,18,'#8b977f')+text(738,y,money(amount),20,'#9b785a',700)+line(144,y+25,907,y+25)});
  body+=box(120,651,810,64,'#edf3e6')+text(145,691,t('Nota pencatatan dan ekspor CSV tersedia.','Record receipts and CSV export included.'),21,'#6e855f');
  fs.writeFileSync(new URL(`transactions-${language}.svg`,directory),frame(t('Setiap rupiah punya cerita.','Every rupiah has a story.'),t('Catat pemasukan dan pengeluaran harianmu.','Record your everyday income and expenses.'),body));

  body='';
  [[t('Rumah impian','Dream home'),50000000,500000000,10,'#f3e9e1'],[t('Liburan ke Jepang','Trip to Japan'),1500000,10000000,15,'#f6e5ed'],[t('Dana darurat','Emergency fund'),6000000,15000000,40,'#e6efde']].forEach(([title,saved,target,percent,color],i)=>{const y=210+i*166;body+=box(120,y,810,146)+circle(160,y+37,18,color)+text(194,y+45,title,25,'#465641',700)+text(146,y+88,`${money(saved)} / ${money(target)}`,21,'#788a68')+progress(146,y+109,666,percent)+text(835,y+121,percent+'%',20,'#56794f',700)});
  fs.writeFileSync(new URL(`savings-${language}.svg`,directory),frame(t('Satu per satu, mimpi jadi nyata.','One by one, dreams come true.'),t('Buat target, isi tabungan, dan lihat progresnya.','Create goals, add savings, and watch your progress.'),body));

  body=box(120,210,392,152,'#fbf3dc','#eddfb8')+text(145,250,t('Emas tercatat','Recorded gold'),21,'#9e854b')+text(145,308,'3 g',48,'#9e7d36',700)+text(145,340,t('Jumlah gram milikmu','Your gold in grams'),18,'#ae9b70');
  body+=box(536,210,394,152)+text(560,250,t('Contoh estimasi buyback','Example buyback estimate'),20,'#8d987f')+text(560,303,money(3000000),32,'#56794f',700)+text(560,339,t('Harga ilustrasi','Illustrative price')+': '+money(1000000)+'/g',17,'#8d987f');
  body+=box(120,386,810,245)+text(145,425,t('Pantau pergerakan nilainya','Track changes in value'),22,'#465641',700)+`<path d="M150 591L245 565L340 581L435 532L530 552L625 501L720 512L815 465L904 476" fill="none" stroke="#b99a55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`+line(145,600,908,600)+text(145,616,t('Ilustrasi grafik harga','Illustrative price chart'),16,'#a39677');
  body+=box(120,653,810,62,'#fbf6e9','#ede2c7')+text(145,691,t('Data contoh, bukan harga emas terkini.','Sample data, not current gold prices.'),21,'#a08c59');
  fs.writeFileSync(new URL(`gold-${language}.svg`,directory),frame(t('Emasmu, terpantau setiap hari.','Keep track of your gold every day.'),t('Catat gram, tambah atau kurangi, lalu lihat estimasinya.','Record grams, add or subtract, and see the estimate.'),body));

  body=box(120,210,260,505,'#faedf1','#ecdce3')+companion('cat',150,245,200,260)+text(164,542,'Muchi',31,'#a96e7c',700)+text(143,580,t('Asisten pilihanmu','Your own assistant'),20,'#9b7b87')+text(143,615,t('Nama bisa diganti','Choose its name'),18,'#a48d96');
  body+=box(404,210,526,505)+face('cat',424,225,55)+text(493,261,'Muchi',23,'#a96e7c',700)+line(424,284,908,284);
  body+=box(428,307,416,72,'#fbf2f5','#eedfe5',13)+text(445,336,t('Halo, aku Muchi!','Hi, I’m Muchi!'),20,'#9d6d7c')+text(445,363,t('Ada yang bisa dibantu?','How can I help?'),18,'#9d7e89');
  body+=box(478,398,429,76,'#eef3e7','#dfe9d5',13)+text(496,428,t('Catat pengeluaran kopi','Record expense coffee'),19,'#647c54')+text(496,456,'25000',21,'#56794f',700);
  body+=box(428,495,434,148,'#fbf2f5','#eedfe5',13)+text(445,529,t('Kopi sudah dicatat.','Coffee recorded.'),21,'#9d6d7c')+text(445,561,t('Nota pencatatannya siap!','Your record receipt is ready!'),18,'#9d7e89')+box(445,578,295,45,'#f3e4ea','#f3e4ea',9)+text(462,608,t('Nota','Receipt')+' · '+money(25000),19,'#a06d7e',700);
  body+=text(428,687,t('Trial Premium & langganan aktif','Active Premium trial & subscription'),17,'#8a977b');
  fs.writeFileSync(new URL(`assistant-${language}.svg`,directory),frame(t('Teman keuangan yang bisa diajak chat.','A money buddy you can chat with.'),t('Catat transaksi, isi tabungan, atau tanyakan saldo.','Record transactions, add savings, or ask about your balance.'),body));

  body='';const selected=['spongebob','cinnamoroll','kuromi','mochi-cat','ducky-days','pochacco'];
  selected.forEach((id,i)=>{const theme=themes.find(theme=>theme.id===id),x=120+i%3*278,y=210+Math.floor(i/3)*224;body+=box(x,y,254,204,theme.colors['--light'],theme.colors['--line'])+face(theme.character,x+61,y+16,132)+text(x+18,y+178,theme.title,20,theme.colors['--accent'],700)});
  body+=text(145,704,t('4 pastel + 16 karakter untuk ruang kecilmu.','4 pastels + 16 characters for your little space.'),21,'#738664');
  fs.writeFileSync(new URL(`themes-${language}.svg`,directory),frame(t('Ruangmu, karakter favoritmu.','Your space, your favorite characters.'),t('Semua tema karakter terbuka selama trial Premium.','Every character theme is unlocked during your Premium trial.'),body));
 }
 console.log('Generated 12 feature preview images (ID / EN).');
}finally{await server.close()}
