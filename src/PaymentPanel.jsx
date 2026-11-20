import React,{useEffect,useRef,useState} from 'react';
import {RefreshCw,FlaskConical,CheckCircle2} from 'lucide-react';
import {tr} from './language.mjs';
import './payment.css';

export default function PaymentPanel({session,onRefresh,onConfiguration}){
 const [configuration,setConfiguration]=useState(null),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[reload,setReload]=useState(0);
 const refresh=useRef(onRefresh),configured=useRef(onConfiguration),checkRef=useRef(null);
 refresh.current=onRefresh;configured.current=onConfiguration;
 useEffect(()=>{
  let alive=true,timer,checking=false,attempts=0;
  const orderId=new URLSearchParams(window.location.search).get('payment_order');
  const check=async(manual=false)=>{
   if(!alive||checking)return;clearTimeout(timer);checking=true;setBusy(true);setError('');if(manual)attempts=0;
   try{
    const response=await fetch('/.netlify/functions/payment-status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(orderId?{orderId}:{})});
    const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'Status pembayaran belum dapat diperiksa. Silakan coba lagi.'),{publicMessage:true});
    if(!alive)return;setResult(data);
    if(data.paid||manual)await refresh.current?.();
    if(alive&&!data.paid&&['pending','capture'].includes(data.transactionStatus)&&++attempts<5)timer=setTimeout(()=>check(),15000);
   }catch(err){if(alive)setError(err.publicMessage?err.message:'Status pembayaran belum dapat diperiksa. Silakan coba lagi.')}finally{checking=false;if(alive)setBusy(false)}
  };
  checkRef.current=()=>check(true);setBusy(true);setError('');setResult(null);setConfiguration(null);configured.current?.(null);
  (async()=>{
   try{
    const response=await fetch('/.netlify/functions/payment-config'),data=await response.json();
    if(!response.ok||!['sandbox','production'].includes(data.environment)||typeof data.ready!=='boolean')throw Error('Pembayaran belum tersedia. Silakan coba lagi nanti.');
    if(!alive)return;setConfiguration(data);configured.current?.(data);
    if(data.ready)await check();else setBusy(false);
   }catch{if(alive){setError('Pembayaran belum tersedia. Silakan coba lagi nanti.');setBusy(false)}}
  })();
  return()=>{alive=false;clearTimeout(timer);checkRef.current=null;};
 },[session.user.id,session.access_token,reload]);
 let message=result?.paid?'Pembayaran terverifikasi. Premium sudah diaktifkan sesuai paket.':
  result?.transactionStatus==='none'?'Belum ada transaksi pembayaran.':
  ['deny','cancel','expire','failure','refund','partial_refund'].includes(result?.transactionStatus)?'Pembayaran belum berhasil atau sudah tidak berlaku. Silakan buat pembayaran baru.':
  result?'Pembayaran masih menunggu penyelesaian atau verifikasi.':null;
 return <div className="payment-panel">
  {configuration?.environment==='sandbox'&&<div className="payment-sandbox"><FlaskConical size={19}/><div><strong>{tr('Mode Sandbox · pembayaran uji')}</strong><p>{tr('Tidak menggunakan uang sungguhan. Pembayaran uji yang berhasil akan mengaktifkan Premium sesuai paket.')}</p></div></div>}
  {configuration&&!configuration.ready&&<p className="payment-message" role="status">{tr('Pembayaran belum tersedia. Silakan coba lagi nanti.')}</p>}
  {message&&<div className={'payment-message'+(result.paid?' is-paid':'')} role="status">{result.paid&&<CheckCircle2 size={17}/>}<span>{tr(message)}{result.orderId&&<small>{result.orderId}</small>}</span></div>}
  {error&&<p className="payment-error" role="alert">{tr(error)}</p>}
  <button type="button" className="text-button" disabled={busy} onClick={()=>configuration?.ready?checkRef.current?.():setReload(value=>value+1)}><RefreshCw size={14}/>{tr(busy?'Memeriksa pembayaran…':configuration?.ready?'Periksa pembayaran':'Muat ulang pembayaran')}</button>
 </div>;
}
