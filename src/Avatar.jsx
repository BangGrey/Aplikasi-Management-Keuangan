import React,{useEffect,useState} from 'react';
import {AVATAR_BUCKET,ownAvatarPath} from './avatar.mjs';
import './avatar.css';
export function useAvatar(db,userId,path){
 const [value,setValue]=useState({path:null,url:''});
 useEffect(()=>{
  let alive=true;if(!db||!ownAvatarPath(path,userId)){setValue({path:null,url:''});return;}
  const load=async()=>{try{const {data,error}=await db.storage.from(AVATAR_BUCKET).createSignedUrl(path,3600);if(alive)setValue({path,url:!error&&data?.signedUrl||''})}catch{if(alive)setValue({path,url:''})}};
  load();const timer=setInterval(load,45*60*1000);window.addEventListener('focus',load);return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',load)};
 },[db,userId,path]);
 return value.path===path?value.url:'';
}
export default function Avatar({src,label='',className=''}){
 const [failed,setFailed]=useState('');
 return <span className={'user-avatar '+className} aria-hidden="true">{src&&failed!==src?<img src={src} alt="" onError={()=>setFailed(src)}/>:String(label||'U').slice(0,1).toUpperCase()}</span>;
}
