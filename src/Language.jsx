import React,{createContext,useContext,useEffect,useState} from 'react';
import {Languages} from 'lucide-react';
import {getLanguage,setLanguage,tr} from './language.mjs';
import './language.css';
const Context=createContext(null);
function initial(){try{return localStorage.getItem('keuanganmu-language')==='en'?'en':'id'}catch{return 'id'}}
export function LanguageProvider({children}){
 const [language,update]=useState(()=>setLanguage(initial()));
 function choose(value){const next=setLanguage(value);update(next);try{localStorage.setItem('keuanganmu-language',next)}catch{}}
 useEffect(()=>{document.documentElement.lang=language;document.title=language==='en'?'Keuanganmu — Your money, your little world':'Keuanganmu — Ruang kecil untuk mimpi besar';},[language]);
 return <Context.Provider value={{language,choose}}>{children}</Context.Provider>;
}
export function useLanguage(){return useContext(Context)||{language:getLanguage(),choose:setLanguage}}
export default function LanguageSwitch({full=false}){
 const {language,choose}=useLanguage();
 return <label className={'language-switch'+(full?' language-full':'')}><Languages size={15}/>{full&&<span>{tr('Bahasa tampilan')}</span>}<select aria-label={tr('Pilih bahasa')} value={language} onChange={e=>choose(e.target.value)}><option value="id">{full?'Bahasa Indonesia':'ID'}</option><option value="en">{full?'English':'EN'}</option></select></label>;
}
