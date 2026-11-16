import React,{useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play,Leaf} from 'lucide-react';
import {useLanguage} from './Language.jsx';
import {tr} from './language.mjs';
import './feature-slideshow.css';

export const featureSlides=[
 {id:'overview',label:'Ringkasan',caption:'Ringkasan pemasukan, pengeluaran, dan saldo dalam satu tampilan.'},
 {id:'transactions',label:'Transaksi',caption:'Catat transaksi harian, lihat nota, dan ekspor catatanmu.'},
 {id:'savings',label:'Tabungan',caption:'Buat target tabungan dan pantau progres setiap mimpimu.'},
 {id:'gold',label:'Emas',caption:'Catat gram emas dan pantau estimasi buyback dari sumber pilihanmu.'},
 {id:'assistant',label:'Asisten',caption:'Kenali asisten pribadimu untuk mencatat dan bertanya lewat chat.'},
 {id:'themes',label:'Tema',caption:'Pilih pastel atau karakter lucu yang menemani setiap halaman.'},
];
export default function FeatureSlideshow({intervalMs=6000}){
 const {language}=useLanguage();
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[hidden,setHidden]=useState(()=>document.visibilityState==='hidden'),[visible,setVisible]=useState(true);
 const root=useRef(null),touch=useRef(null),slide=featureSlides[index],running=!paused&&!hovered&&!focused&&!hidden&&visible;
 useEffect(()=>{const change=()=>setHidden(document.visibilityState==='hidden');document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change)},[]);
 useEffect(()=>{const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');const change=()=>{if(media?.matches)setPaused(true)};media?.addEventListener?.('change',change);return()=>media?.removeEventListener?.('change',change)},[]);
 useEffect(()=>{if(!window.IntersectionObserver)return;const observer=new window.IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.15});observer.observe(root.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!running)return;const timer=setTimeout(()=>setIndex(current=>(current+1)%featureSlides.length),intervalMs);return()=>clearTimeout(timer)},[running,index,intervalMs]);
 useEffect(()=>{const next=new window.Image();next.src=`/previews/${featureSlides[(index+1)%featureSlides.length].id}-${language}.svg`},[index,language]);
 function move(direction){setIndex(current=>(current+direction+featureSlides.length)%featureSlides.length)}
 function keyboard(e){const direction=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(direction||e.key==='Home'||e.key==='End'){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?featureSlides.length-1:(index+direction+featureSlides.length)%featureSlides.length;setIndex(next);document.getElementById('preview-tab-'+featureSlides[next].id)?.focus()}}
 return <section className="landing-preview feature-slideshow" aria-label={tr('Slideshow fitur Tabunganmu')} aria-roledescription="carousel" ref={root} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}}>
  <div className="preview-window-top"><span/><span/><span/><strong>tabunganmu</strong><small>{tr('Pratinjau ilustrasi')}</small></div>
  <div className="feature-slide-tabs" role="tablist" aria-label={tr('Pratinjau fitur')}>{featureSlides.map((item,i)=><button type="button" key={item.id} role="tab" id={'preview-tab-'+item.id} aria-controls="landing-preview-content" aria-selected={index===i} tabIndex={index===i?0:-1} onClick={()=>setIndex(i)} onKeyDown={keyboard}>{tr(item.label)}</button>)}</div>
  <div className="feature-slide-stage" id="landing-preview-content" role="tabpanel" aria-labelledby={'preview-tab-'+slide.id} onTouchStart={e=>{const point=e.changedTouches[0];touch.current={x:point.clientX,y:point.clientY}}} onTouchEnd={e=>{if(!touch.current)return;const point=e.changedTouches[0],dx=point.clientX-touch.current.x,dy=point.clientY-touch.current.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))move(dx<0?1:-1);touch.current=null}}>
   <img className="feature-slide-image" key={slide.id+language} src={`/previews/${slide.id}-${language}.svg`} alt={tr(slide.caption)} width="960" height="760" fetchPriority={index===0?'high':'auto'} decoding="async"/>
  </div>
  <div className="feature-slide-summary" aria-live={running?'off':'polite'} aria-atomic="true"><span>{String(index+1).padStart(2,'0')} / {String(featureSlides.length).padStart(2,'0')}</span><p>{tr(slide.caption)}</p></div>
  <div className="feature-slide-controls"><button type="button" aria-label={tr('Slide sebelumnya')} onClick={()=>move(-1)}><ChevronLeft size={17}/></button><div className="feature-slide-indicators" aria-hidden="true">{featureSlides.map((item,i)=><i key={item.id} className={index===i?'is-current':''}/>)}</div><button type="button" className="feature-slide-play" aria-label={tr(paused?'Putar slideshow':'Jeda slideshow')} aria-pressed={paused} onClick={()=>{setPaused(current=>!current);setFocused(false)}}>{paused?<Play size={14}/>:<Pause size={14}/>}</button><button type="button" aria-label={tr('Slide berikutnya')} onClick={()=>move(1)}><ChevronRight size={17}/></button></div>
  <p className="feature-slide-disclaimer">{tr('Gambar ilustrasi fitur dengan data contoh.')}</p><span className="preview-floating-note"><Leaf size={17}/>{tr('Kebiasaan kecil, mimpi besar.')}</span><span className="preview-spark" aria-hidden="true">✧</span>
 </section>;
}
