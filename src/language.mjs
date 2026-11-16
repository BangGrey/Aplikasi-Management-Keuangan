import english from './translations/en.json' with {type:'json'};
let language='id';
export const getLanguage=()=>language;
export const getLocale=()=>language==='en'?'en-US':'id-ID';
export function setLanguage(value){language=value==='en'?'en':'id';return language}
export function translate(text,params={},lang=language){
 if(typeof text!=='string')return text;
 const normalized=text.trim();
 const translated=Object.hasOwn(english,text)?english[text]:Object.hasOwn(english,normalized)?english[normalized]:undefined;
 const result=lang==='en'&&translated!==undefined?text.replace(normalized,()=>translated):text;
 return result.replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(params,key)?String(params[key]):match);
}
export const tr=translate;
