export const AVATAR_BUCKET='keuanganmu-avatars',MAX_AVATAR_SIZE=2*1024*1024;
export function ownAvatarPath(path,userId){return typeof path==='string'&&typeof userId==='string'&&path.startsWith(userId+'/')&&/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path)}
export async function validateAvatarFile(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Pilih foto JPG, PNG, atau WebP.');
 if(file.size<=0||file.size>MAX_AVATAR_SIZE)throw Error('Ukuran foto maksimal 2 MB.');
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=[137,80,78,71,13,10,26,10].every((byte,i)=>bytes[i]===byte);
 const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!(file.type==='image/jpeg'&&jpeg||file.type==='image/png'&&png||file.type==='image/webp'&&webp))throw Error('Isi file bukan foto yang didukung.');
}
async function decodeImage(file){
 if(typeof createImageBitmap==='function')return createImageBitmap(file);
 const url=URL.createObjectURL(file);try{return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Foto tidak dapat dibaca.'));image.src=url})}finally{URL.revokeObjectURL(url)}
}
function encodeImage(image){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const context=canvas.getContext('2d');if(!context)throw Error('Foto tidak dapat diproses di browser ini.');
 const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,side=Math.min(width,height);
 context.fillStyle='#fff';context.fillRect(0,0,512,512);context.drawImage(image,(width-side)/2,(height-side)/2,side,side,0,0,512,512);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Foto tidak dapat diproses.')),'image/jpeg',.9));
}
export async function prepareAvatar(file,{decode=decodeImage,encode=encodeImage}={}){
 await validateAvatarFile(file);let image;
 try{image=await decode(file);const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;if(!width||!height||width>12000||height>12000)throw Error('Dimensi foto maksimal 12000 × 12000 piksel.');return await encode(image)}finally{image?.close?.()}
}
export async function saveAvatar(db,userId,blob,oldPath){
 if(blob?.type!=='image/jpeg'||blob.size<=0||blob.size>MAX_AVATAR_SIZE)throw Error('Foto belum siap disimpan.');
 const path=`${userId}/${crypto.randomUUID()}.jpg`;if(!ownAvatarPath(path,userId))throw Error('Sign in required');
 const bucket=db.storage.from(AVATAR_BUCKET);
 const {error:uploadError}=await bucket.upload(path,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'});if(uploadError)throw uploadError;
 const {error}=await db.rpc('set_profile_avatar',{chosen_path:path});
 // A lost RPC response may already have committed. Keep the uploaded object so
 // the account never references a file deleted by error cleanup.
 if(error)throw error;
 if(ownAvatarPath(oldPath,userId)&&oldPath!==path){try{await bucket.remove([oldPath])}catch{}}
 return path;
}
export async function removeAvatar(db,userId,path){
 const {error}=await db.rpc('set_profile_avatar',{chosen_path:null});if(error)throw error;
 if(ownAvatarPath(path,userId)){try{await db.storage.from(AVATAR_BUCKET).remove([path])}catch{}}
}
