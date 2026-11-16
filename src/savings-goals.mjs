const unit='ribu|rb|k|thousand|juta|jt|million|miliar|milyar|billion';
const number=`[+-]?\\d+(?:[.,]\\d+)*(?:\\s*(?:${unit})\\b)?`;
const amount=`(?:Rp\\.?\\s*|IDR\\s*)?${number}`;
const initialLabel='tabungan\\s+awal|saldo\\s+awal|setoran\\s+awal|initial\\s+(?:savings|balance|deposit)|starting\\s+(?:savings|balance)';
const targetLabel='target(?:nya|\\s+dana|\\s+tabungan|\\s+amount)?|total\\s+target|goal\\s+amount|budget';
const invalid='Nominal tabungan harus rupiah bulat, target lebih dari 0, saldo awal minimal 0, dan masing-masing maksimal Rp1 triliun.';
const unsafe=/\b(jangan|tidak|bukan|batal(?:kan)?|contoh|misal(?:kan)?|kalau|jika|seandainya|andai|mungkin|nanti|besok|kemarin|hapus|tarik|kurangi|not|never|no|without|cannot|if|unless|maybe|example|tomorrow|yesterday|delete|withdraw)\b|\b[a-z]+n['’]t\b|[$€£]|\b(?:USD|EUR|GBP|dollars?|euros?)\b/i;

export function goalAmount(value){
 const text=value.trim().replace(/^(?:Rp\.?|IDR)\s*/i,'');
 const scaled=text.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unit})$`,'i'));
 let n;
 if(scaled){const scale=/ribu|rb|k|thousand/i.test(scaled[2])?1e3:/juta|jt|million/i.test(scaled[2])?1e6:1e9;n=Number(scaled[1].replace(',','.'))*scale}
 else if(/^\d+$/.test(text))n=Number(text);
 else if(/^\d{1,3}(?:\.\d{3})+(?:,00)?$/.test(text))n=Number(text.replaceAll('.','').replace(',00',''));
 else if(/^\d{1,3}(?:,\d{3})+(?:\.00)?$/.test(text))n=Number(text.replaceAll(',','').replace('.00',''));
 return Number.isSafeInteger(n)&&n>=0&&n<=1e12?n:null;
}
export function validateGoalDraft(draft){
 return !!(draft&&typeof draft.title==='string'&&draft.title.trim()&&draft.title.trim().length<=100&&Number.isSafeInteger(draft.target)&&draft.target>0&&draft.target<=1e12&&Number.isSafeInteger(draft.initialSaved)&&draft.initialSaved>=0&&draft.initialSaved<=1e12);
}
export function parseGoalCreation(text,current=null){
 if(typeof text!=='string')return null;
 if(current&&/^(?:batal(?:kan)?|cancel|lupakan|never mind)[.!]?$/i.test(text.trim()))return {cancel:true};
 const explicit=/\b(?:buat(?:kan)?|membuat|bikin(?:kan)?|create|start|open)\b.*\b(?:tabungan|savings?|goal)\b|\b(?:tabungan|savings?\s+goal)\s+(?:baru|new)\b/i.test(text);
 const hasInitial=new RegExp(`\\b(?:${initialLabel})\\b`,'i').test(text);
 const hasTarget=new RegExp(`\\b(?:${targetLabel})\\b`,'i').test(text);
 if(!explicit&&!hasInitial&&!current)return null;
 // Unrelated transactions and questions remain available while a draft is open.
 if(current&&!explicit&&!hasInitial&&!hasTarget&&/\b(pengeluaran|pemasukan|saldo|berapa|total|beli|bayar|gaji|tambah(?:kan)?|expense|income|balance|buy|paid|add)\b|\?/i.test(text))return null;
 if(text.length>500||unsafe.test(text)||/\b(?:emas|gold|grams?|dan|serta|and|then)\b|[+;]/i.test(text))return {error:'Saya bisa membantu membuat satu target tabungan rupiah. Sebutkan nama, target dana, dan tabungan awal jika ada. Ketik Batal untuk membatalkan.'};
 const draft={title:current?.title||'',target:current?.target??null,initialSaved:current?.initialSaved??0};
 let rest=text.trim();let found=false;
 for(const [label,key]of [[initialLabel,'initialSaved'],[targetLabel,'target']]){
  const regex=new RegExp(`\\b(?:${label})\\s*(?:(?:sebesar|adalah|is|of|nya)\\s*)?[:=]?\\s*(${amount})`,'gi');
  const matches=[...rest.matchAll(regex)];if(matches.length>1)return {error:invalid};
  if(matches.length){const value=goalAmount(matches[0][1]);if(value===null||key==='target'&&value===0)return {error:invalid};draft[key]=value;rest=rest.replace(regex,' ');found=true}
 }
 rest=rest.replace(/^(?:(?:tolong|mohon|please|aku|saya|i|ingin|mau|want|would|like|to|a|an|buat(?:kan)?|membuat|bikin(?:kan)?|create|start|open|new)\s+)*(?:(?:target|goal)\s+)?(?:tabungan|savings?)(?:\s+(?:baru|goal))?\b/i,' ')
  .replace(/^(?:\s*(?:untuk membeli|untuk|membeli|beli|bernama|dengan nama|for buying|to buy|for|named|called)\b)+/i,' ')
  .replace(/^[\s,:“”"']+|[\s,.!:“”"']+$/g,'').replace(/\s+/g,' ').trim();
 if(current&&!found){
  const bare=goalAmount(rest);
  if(bare!==null){if(!bare)return {error:invalid};draft.target=bare;rest='';found=true}
 }
 // Never guess whether an unlabelled number means target amount or initial savings.
 if(/\d/.test(rest)||new RegExp(`\\b(?:${initialLabel}|${targetLabel})\\b`,'i').test(rest))return {error:'Bedakan target dana dan tabungan awal, misalnya “target 500 juta, tabungan awal 500000”.'};
 if(current?.title&&!found&&!explicit&&rest)return null;
 if(rest){if(rest.length>100)return {error:'Nama target tabungan maksimal 100 karakter.'};draft.title=rest.charAt(0).toUpperCase()+rest.slice(1)}
 if(!draft.title&&!found&&!explicit)return null;
 return {draft};
}

export async function createSavingsGoal(db,{id,...draft}){
 if(!id||!validateGoalDraft(draft))throw Error('Invalid savings goal');
 const {data,error}=await db.rpc('create_assistant_goal',{record_id:id,title_value:draft.title.trim(),target_value:draft.target,initial_saved:draft.initialSaved}).single();
 if(error)throw error;return data;
}
