import React,{useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {normalizeUsername,validUsername,usernameHint} from './username.mjs';
export default function AuthForm({db,session,profile,onDone,onNotice,onProfileChange}){
 const [action,setAction]=useState(session?'username':'register'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setError('');const f=Object.fromEntries(new FormData(e.currentTarget));
 try{
  if(!db)throw Error('Isi konfigurasi Supabase di .env untuk mengaktifkan akun.');
  if(action==='username'||action==='register'){
   if(!validUsername(f.username))throw Error(usernameHint);
   if(action==='username'){
    const result=await db.rpc('set_username',{chosen_username:normalizeUsername(f.username)});
    if(result.error)throw result.error;await onProfileChange();onNotice('Username berhasil disimpan.');onDone();return;
   }
   const {error}=await db.auth.signUp({email:f.email.trim(),password:f.password,options:{emailRedirectTo:location.origin,data:{username:normalizeUsername(f.username)}}});
   if(error)throw error;onNotice('Pendaftaran diproses. Periksa email konfirmasi; jika gagal, coba username lain atau masuk ke akun yang sudah ada.');
  }else if(f.identifier.includes('@')){
   const {error}=await db.auth.signInWithPassword({email:f.identifier.trim(),password:f.password});if(error)throw error;onNotice('Berhasil masuk.');
  }else{
   const response=await fetch('/.netlify/functions/login-username',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:normalizeUsername(f.identifier),password:f.password})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Login gagal.');
   const {error}=await db.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});if(error)throw error;onNotice('Berhasil masuk.');
  }
  onDone();
 }catch(err){setError(err.code==='23505'?'Username sudah dipakai. Pilih username lain.':err.message==='Database error saving new user'?'Pendaftaran gagal. Coba username lain dan pastikan migrasi username.sql sudah dijalankan.':err.message||'Permintaan gagal.')}finally{setBusy(false)}
 }
 return <><form onSubmit={submit}>{!session&&<label>Saya ingin<select value={action} disabled={busy} onChange={e=>{setAction(e.target.value);setError('')}}><option value="register">Buat akun & mulai trial</option><option value="login">Masuk ke akun saya</option></select></label>}{action==='register'&&<label>Email<input name="email" type="email" autoComplete="email" required placeholder="nama@email.com" disabled={busy}/></label>}{action!=='login'&&<label>Username<input name="username" type="text" autoComplete="username" defaultValue={profile?.username||''} pattern="[A-Za-z][A-Za-z0-9_]{2,23}" minLength={3} maxLength={24} required placeholder="misalnya user_01" disabled={busy}/><small className="auth-hint">{usernameHint} Huruf besar/kecil dianggap sama.</small></label>}{action==='login'&&<label>Email atau username<input name="identifier" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="nama@email.com atau user_01" disabled={busy}/></label>}{!session&&<label>Kata sandi<input name="password" type="password" minLength={action==='register'?8:undefined} maxLength={1024} autoComplete={action==='register'?'new-password':'current-password'} required placeholder={action==='register'?'Minimal 8 karakter':'Kata sandi akun Anda'} disabled={busy}/></label>}{error&&<p role="alert" className="auth-error">{error}</p>}<button className="primary" disabled={busy}>{busy?'Memproses…':session?'Simpan username':action==='register'?'Daftar':'Masuk'}<ChevronRight size={17}/></button></form>{!session&&<p className="auth-hint">Email tetap dibutuhkan untuk konfirmasi akun. Akun lama bisa masuk lewat email, lalu memilih username melalui avatar kanan atas.</p>}</>;
}
