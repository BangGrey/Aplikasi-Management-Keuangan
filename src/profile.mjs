import {normalizeUsername,validUsername,usernameHint} from './username.mjs';
export async function updateUsername(db,value){
 const username=normalizeUsername(value);if(!validUsername(username))throw Error(usernameHint);
 const {data,error}=await db.rpc('set_username',{chosen_username:username});
 if(error){if(error.code==='23505')throw Error('Username sudah dipakai. Pilih username lain.');throw error;}
 return data||username;
}
export function validatePasswordChange(currentPassword,newPassword,confirmation){
 if(typeof currentPassword!=='string'||!currentPassword)throw Error('Masukkan password saat ini.');
 if(typeof newPassword!=='string'||newPassword.length<8||newPassword.length>1024)throw Error('Password baru harus 8–1.024 karakter.');
 if(newPassword!==confirmation)throw Error('Konfirmasi password baru tidak sama.');
 if(currentPassword===newPassword)throw Error('Gunakan password baru yang berbeda dari password saat ini.');
}
export async function changePassword({db,verificationClient,user,currentPassword,newPassword,confirmation,nonce}){
 validatePasswordChange(currentPassword,newPassword,confirmation);
 if(!user?.id||!user.email)throw Error('Silakan masuk kembali untuk mengubah password.');
 try{
  const {data,error}=await verificationClient.auth.signInWithPassword({email:user.email,password:currentPassword});
  if(error||data.user?.id!==user.id)throw Error('Password saat ini salah atau verifikasi akun gagal.');
  const result=await db.auth.updateUser({password:newPassword,current_password:currentPassword,...(nonce?.trim()?{nonce:nonce.trim()}:{})});
  if(result.error)throw result.error;
 }finally{
  // This is an isolated temporary client. Never revoke the user's main app session.
  try{await verificationClient.auth.signOut({scope:'local'})}catch{}
 }
}
