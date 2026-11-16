import {parseExpense} from './assistant.mjs';

export const isSavingsRequest=text=>typeof text==='string'&&/\b(tabungan|menabung|nabung|tabung(?:kan)?|sisihkan|savings?|deposit)\b/i.test(text);
const invalid='Untuk mengisi tabungan, sebutkan satu target dan nominal, misalnya “tambahkan tabungan ke Jepang 500000”.';
export function parseSavingsDeposit(text){
 if(!isSavingsRequest(text))return null;
 if(typeof text!=='string'||text.length>500)return {error:invalid};
 // Keep savings requests out of the expense parser, including questions and negations.
 if(/\b(jangan|tidak|bukan|belum|batal|hapus|kurang(?:i|kan)?|tarik|ambil|buat(?:kan)?|baru|contoh|misal(?:kan)?|berapa|apakah|mungkin|rencana|ingin|mau|kalau|jika|seandainya|andai|atau|kemarin|besok|tanggal|minggu|bulan|lalu|not|never|no|without|cannot|if|unless|maybe|could|would|should|want|plan|example|what|how|when|withdraw|subtract|remove|delete|create|new|yesterday|tomorrow|last|next|or)\b|\b[a-z]+n['’]t\b|\?/i.test(text))return {error:invalid};
 let value=text.trim().replace(/^(?:tolong|mohon|please)\s+/i,'');
 if(!/^(?:tambah(?:kan)?|catat(?:kan)?|isi(?:kan)?|masukkan|sisihkan|tabung(?:kan)?|nabung|menabung|add|record|deposit|save|put)\b/i.test(value))return {error:invalid};
 value=value.replace(/^(?:tambah(?:kan)?|catat(?:kan)?|isi(?:kan)?|masukkan|sisihkan|tabung(?:kan)?|nabung|menabung|add|record|deposit|save|put)\s*/i,'');
 value=value.replace(/\b(?:ke|untuk|pada|dalam|tabungan|target|sebesar|sejumlah|senilai|savings?|to|towards|into|for)\b/gi,' ').replace(/\bhari ini\b/gi,' ').replace(/\s+/g,' ').trim();
 if(/\b(?:pemasukan|pengeluaran|income|expense|emas|gold|gram|grams)\b/i.test(value))return {error:invalid};
 // Validate amounts using the existing strict IDR rules; a neutral title avoids
 // interpreting words in a goal name as transaction instructions or categories.
 const amounts=[...value.matchAll(/(?:\b(?:rp\.?|IDR)\s*)?-?\d+(?:[.,]\d+)*(?:\s*(?:ribu|juta|rb|jt|k|thousand|million)\b)?/gi)];
 if(amounts.length!==1)return {error:invalid};
 const token=amounts[0];
 const target=(value.slice(0,token.index)+' '+value.slice(token.index+token[0].length)).replace(/^[\s,:“”"']+|[\s,.!:“”"']+$/g,'').replace(/\s+/g,' ').trim();
 if(!target||target.length>100||/\b(dan|serta|and|then)\b|[+;/]|[$€£]|\b(?:USD|EUR|GBP|dollars?|euros?)\b/i.test(target))return {error:invalid};
 const result=parseExpense(`record expense placeholder ${token[0]}`);
 if(result.error)return {error:result.error};
 return {deposit:{target,amount:result.transaction.amount}};
}

function words(value){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(w=>w&&!['ke','untuk','tabungan','target','savings','to','for','the'].includes(w))}
export function matchSavingsGoals(target,goals){
 const tokens=words(target);if(!tokens.length)return [];
 const normalized=tokens.join(' ');
 const exact=goals.filter(g=>words(g.title).join(' ')===normalized);
 if(exact.length)return exact;
 return goals.filter(g=>{const title=new Set(words(g.title));return tokens.every(token=>title.has(token))});
}

export async function depositToSavings(db,{id,goalId,amount}){
 if(!id||!goalId||!Number.isSafeInteger(amount)||amount<=0||amount>1000000000000)throw Error('Invalid savings deposit');
 const {data,error}=await db.rpc('deposit_assistant_goal',{request_id:id,goal_id:goalId,deposit_amount:amount}).single();
 if(error)throw error;
 return data;
}
