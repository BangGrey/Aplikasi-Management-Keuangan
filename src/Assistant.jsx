import React,{useEffect,useRef,useState} from 'react';
import {Bot,Send,X,ReceiptText,MessageCircle,Settings2,LockKeyhole,Crown} from 'lucide-react';
import {parseName,parseTransaction,parseFinancialQuery,summarizeTransactions,rupiah,localDate} from './assistant.mjs';
import {applyMemory} from './learning.mjs';
import useLearning from './useLearning.jsx';
import TeachForm from './TeachForm.jsx';
import {CharacterSticker} from './CharacterDecorations.jsx';
const introduction='Halo! Saya asisten keuangan kamu. Kamu ingin menamai saya sebagai apa?';
function stored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
export default function PremiumAssistant(props){
 return props.premium?<Assistant {...props} active={true}/>:<LockedAssistant onSubscribe={props.onSubscribe}/>;
}
function LockedAssistant({onSubscribe}){
 const [opened,setOpened]=useState(false);
 return <><button className="assistant-launch" onClick={()=>setOpened(!opened)} aria-label="Asisten keuangan, khusus premium"><LockKeyhole size={17}/><span>Asisten Premium</span></button>{opened&&<section className="assistant-chat assistant-locked" aria-label="Asisten khusus premium"><button className="close" aria-label="Tutup" onClick={()=>setOpened(false)}><X size={20}/></button><span className="premium-lock-icon"><Crown size={32}/></span><h2>Teman keuangan<br/>khusus Premium.</h2><p>Catat lewat chat, tanyakan saldo, dan ajari asisten kebiasaanmu dengan langganan berbayar aktif.</p><p>Asisten belum tersedia untuk akun gratis, demo, atau trial.</p><button className="primary" onClick={()=>{setOpened(false);onSubscribe()}}>Buka dengan Premium</button></section>}</>;
}
function Assistant({db,session,active,onRecord,onRead,onCorrect,onReceipt,onSubscribe,theme}){
 const key=`kantong-assistant-${session?.user.id||'demo'}`;
 const [opened,setOpened]=useState(false),[name,setName]=useState(''),[messages,setMessages]=useState(()=>stored(key+'-chat',[])),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[renaming,setRenaming]=useState(false),[loadError,setLoadError]=useState('');
 const lock=useRef(false),pending=useRef(null),end=useRef(null);
 const learning=useLearning(db,session,onCorrect);
 const [aiEnabled,setAiEnabled]=useState(()=>stored(key+'-ai-enabled',false));
 useEffect(()=>{localStorage.setItem(key+'-ai-enabled',JSON.stringify(aiEnabled))},[aiEnabled,key]);
 useEffect(()=>{let alive=true;(async()=>{try{let value=stored(key+'-name','');if(session){const {data,error}=await db.from('assistant_preferences').select('name').eq('user_id',session.user.id).maybeSingle();if(error)throw error;value=data?.name||''}if(alive)setName(value)}catch{if(alive)setLoadError('Nama asisten belum bisa dimuat. Periksa koneksi dan jalankan migrasi assistant.sql.')}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[]);
 useEffect(()=>{localStorage.setItem(key+'-chat',JSON.stringify(messages.slice(-60)))},[messages,key]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[messages,busy,opened]);
 const say=text=>setMessages(m=>[...m,{role:'assistant',text}]);
 async function askAI(text){
  if(!session){say('AI lanjutan tersedia setelah masuk ke akun. Mode demo tetap mendukung perintah sederhana dan memori kategori lokal.');return}
  const response=await fetch('/.netlify/functions/assistant-ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({text,today:localDate()})});
  const result=await response.json();if(!response.ok){say(result.error||'AI belum tersedia.');return}
  if(result.kind==='query'){say(summarizeTransactions(await onRead(result.query),result.query));return}
  if(result.kind==='transaction'){
   const proposal=applyMemory({...result.transaction,id:crypto.randomUUID()},learning.memories,learning.knowledge);
   setMessages(m=>[...m,{role:'assistant',text:`Saya memahami ${proposal.type==='income'?'pemasukan':'pengeluaran'} ${proposal.title}: ${rupiah(proposal.amount)} (${proposal.category}). Periksa sebelum disimpan.`,proposal}]);return;
  }
  say(result.message);
 }
 async function accept(index){
  if(lock.current||!active)return;const proposal=messages[index]?.proposal;if(!proposal||messages[index].transaction||messages[index].dismissed)return;
  lock.current=true;setBusy(true);try{const saved=await onRecord(proposal);setMessages(m=>m.map((r,i)=>i===index?{role:'assistant',text:`${saved.title} sudah dicatat: ${rupiah(saved.amount)}.`,transaction:saved}:r))}catch{say('Belum berhasil menyimpan. Silakan coba lagi.')}finally{lock.current=false;setBusy(false)}
 }
 async function teach(transaction,category,term){
  if(lock.current||!active)return false;lock.current=true;setBusy(true);
  try{await learning.learn(transaction,category,term);setMessages(m=>m.map(r=>r.transaction?.id===transaction.id?{...r,transaction:{...r.transaction,category}}:r));say(`Saya ingat: ${transaction.title} termasuk ${category}. Koreksi catatan ini juga sudah disimpan.${term?' Saran bersama menunggu tinjauan admin.':''}`);return true}catch{say('Koreksi belum tersimpan. Periksa koneksi dan migrasi learning.sql.');return false}finally{lock.current=false;setBusy(false)}
 }
 async function forget(){if(lock.current||!confirm('Hapus seluruh memori kategori pribadi dan saran yang belum diterbitkan? Catatan keuangan tetap tersimpan.'))return;lock.current=true;setBusy(true);try{await learning.forget();say('Memori kategori pribadi dan saran antrean sudah dihapus. Pengetahuan bersama yang sudah ditinjau tidak dihapus.')}catch(e){say(e.message)}finally{lock.current=false;setBusy(false)}}
 async function send(e){e.preventDefault();const text=input.trim();if(!text||lock.current||loading||loadError)return;lock.current=true;setBusy(true);setInput('');setMessages(m=>[...m,{role:'user',text}]);
 try{
  if(!active){say('Trial kamu sudah berakhir. Berlangganan untuk menamai asisten dan mencatat transaksi baru.');return}
  const candidate=parseName(text,!name||renaming);
  if(!name||renaming||candidate){if(!candidate){say('Pilih nama 1–30 karakter berupa huruf, misalnya “Muchi”.');return}if(session){const {error}=await db.from('assistant_preferences').upsert({user_id:session.user.id,name:candidate});if(error)throw error}else localStorage.setItem(key+'-name',JSON.stringify(candidate));setName(candidate);setRenaming(false);say(`Baiklah, mulai sekarang saya akan bernama ${candidate}. Ada yang bisa dibantu? Coba “tambahkan pengeluaran untuk membeli kopi 5000”.`);return}
  const question=parseFinancialQuery(text);
  if(question){if(question.error){if(aiEnabled)await askAI(text);else say(question.error);return}const rows=await onRead(question.query);say(summarizeTransactions(rows,question.query));return}
  const result=parseTransaction(text);if(result.error){if(aiEnabled)await askAI(text);else say(result.error);return}
  // Reuse the same transaction id after a lost response, so retries cannot insert twice.
  if(pending.current?.text!==text)pending.current={text,id:crypto.randomUUID()};
  if(!learning.ready){say('Memori masih dimuat. Coba lagi sebentar.');return}
  const saved=await onRecord(applyMemory({...result.transaction,id:pending.current.id},learning.memories,learning.knowledge));
  pending.current=null;
  setMessages(m=>[...m,{role:'assistant',text:`${saved.type==='income'?'Pemasukan':'Pengeluaran'} sudah saya catat: ${saved.title}, ${rupiah(saved.amount)} (${saved.category}). Nota pencatatannya siap di bawah ini.`,transaction:saved}]);
 }catch{say('Permintaan belum berhasil diproses. Periksa koneksi atau status langganan, lalu coba lagi. Saya tidak menerbitkan nota atau angka ringkasan sebelum data berhasil diproses.')}finally{lock.current=false;setBusy(false)}
 }
 return <><button className="assistant-launch" aria-label="Buka asisten keuangan" onClick={()=>setOpened(!opened)}><CharacterSticker theme={theme} place="chat-launch"/><MessageCircle size={21}/><span>{name||'Asisten keuangan'}</span></button>{opened&&<section className="assistant-chat" aria-label="Chat asisten keuangan"><div className="assistant-header"><span className="assistant-avatar"><CharacterSticker theme={theme} place="chat-avatar"/><Bot size={22}/></span><div><strong>{name||'Asisten keuangan'}</strong><small>Asisten keuangan · memori pribadi</small></div><button aria-label="Ganti nama asisten" disabled={busy||loading||!!loadError} onClick={()=>{setRenaming(true);say('Tentu! Kamu ingin mengganti nama saya menjadi apa?')}}><Settings2 size={17}/></button><button aria-label="Tutup chat" onClick={()=>setOpened(false)}><X size={19}/></button></div><details className="learning-settings"><summary>Memori & AI lanjutan · {learning.memories.length} pola pribadi</summary><p>Asisten belajar kategori dari koreksi. Penggunaan saja tidak melatih ulang model.</p><label><input type="checkbox" checked={aiEnabled} onChange={e=>setAiEnabled(e.target.checked)} disabled={busy}/>Aktifkan OpenAI untuk pesan yang belum dipahami</label><p>Jika aktif, pesan tersebut dan memori kategori dikirim ke OpenAI. Daftar transaksi dan riwayat chat tidak dikirim. Maksimal 50 permintaan/hari per akun.</p>{learning.error&&<p role="alert">{learning.error}</p>}<div className="memory-list">{learning.memories.map(m=><div key={m.type+m.term}><span>{m.term} · {m.type==='income'?'masuk':'keluar'}</span><strong>{m.category}</strong></div>)}</div><button disabled={busy||!learning.ready} onClick={forget}>Hapus memori & saran pribadi</button></details><div className="assistant-messages" role="log" aria-live="polite"><div className="chat-message assistant">{introduction}</div>{messages.map((m,i)=><div className={'chat-message '+m.role} key={i}><p>{m.text}</p>{m.transaction&&<button className="chat-receipt" onClick={()=>onReceipt(m.transaction)}><ReceiptText size={17}/><span>Nota · {rupiah(m.transaction.amount)}</span></button>}{m.transaction&&<TeachForm transaction={m.transaction} onTeach={teach} disabled={busy||!active||!learning.ready||!!learning.error} demo={!session}/>} {m.proposal&&!m.transaction&&<div className="proposal-actions"><button disabled={busy||!active||m.dismissed} onClick={()=>accept(i)}>Simpan transaksi ini</button><button disabled={busy||m.dismissed} onClick={()=>setMessages(rows=>rows.map((r,j)=>i===j?{...r,dismissed:true}:r))}>{m.dismissed?'Dibatalkan':'Batal'}</button></div>}</div>)}{loading&&<p className="chat-hint">Memuat asisten…</p>}{loadError&&<p role="alert" className="chat-hint">{loadError}</p>}{busy&&<p className="chat-hint">Memproses permintaan…</p>}<div ref={end}/></div>{!active&&<button className="chat-upgrade" onClick={onSubscribe}>Lihat paket langganan →</button>}<p className="chat-hint">Catat satu transaksi hari ini, atau tanyakan saldo dan total per periode. Riwayat chat tersimpan di browser ini.</p><div className="assistant-suggestions">{['Catat pemasukan gaji 5 juta','Berapa saldo saat ini?','Total pemasukan bulan ini','Total pengeluaran bulan lalu'].map(example=><button type="button" key={example} disabled={busy||loading||!name||renaming} onClick={()=>setInput(example)}>{example}</button>)}</div><form className="assistant-input" onSubmit={send}><input aria-label="Pesan ke asisten" placeholder={!name||renaming?'Aku akan memanggil kamu Muchi':'Contoh: beli kopi 5000'} value={input} onChange={e=>setInput(e.target.value)} maxLength={500} disabled={busy||loading||!!loadError}/><button aria-label="Kirim pesan" disabled={busy||loading||!!loadError||!input.trim()}><Send size={18}/></button></form></section>}</>;
}
