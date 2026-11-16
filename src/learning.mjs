export const categories=['Makanan','Belanja','Transportasi','Tagihan','Hiburan','Kesehatan','Gaji','Freelance','Lainnya'];
export const memoryKey=title=>title.normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ');
export function applyMemory(transaction,memories=[],shared=[]){
 const matches=r=>r.term===memoryKey(transaction.title)&&r.type===transaction.type&&categories.includes(r.category);
 const found=memories.find(matches)||shared.find(matches);
 return found?{...transaction,category:found.category}:transaction;
}
export function remember(memories,transaction,category){
 if(!categories.includes(category))throw Error('Kategori tidak valid');
 const term=memoryKey(transaction.title);
 const old=memories.find(r=>r.term===term&&r.type===transaction.type);
 return [...memories.filter(r=>r!==old),{term,type:transaction.type,category,examples:(old?.examples||0)+1}];
}
