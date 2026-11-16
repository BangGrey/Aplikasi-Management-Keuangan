import {useEffect,useState} from 'react';
import {hasPaidSubscription} from './premium.mjs';
export default function usePremium(profile,session){
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{
  const update=()=>setNow(Date.now());update();
  const interval=setInterval(update,15000);
  const remaining=Date.parse(profile?.paid_until)-Date.now();
  const expiry=remaining>0&&remaining<2147483647?setTimeout(update,remaining+10):null;
  window.addEventListener('focus',update);
  return()=>{clearInterval(interval);if(expiry)clearTimeout(expiry);window.removeEventListener('focus',update)};
 },[profile?.paid_until,session?.user.id]);
 return hasPaidSubscription(profile,session,Math.max(now,Date.now()));
}
