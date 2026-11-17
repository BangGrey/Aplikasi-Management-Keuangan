import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {tr} from './language.mjs';
import useDialogLayer from './useDialogLayer.jsx';
import './navigation-panels.css';

export default function SidebarDrawer({open,onClose,children}) {
  const small=()=>window.matchMedia?.('(max-width:650px)').matches??window.innerWidth<=650;
  const [mobile,setMobile]=useState(small),ref=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const media=window.matchMedia?.('(max-width:650px)');
    const resize=()=>{const next=small();setMobile(next);if(!next)close.current();};
    window.addEventListener('resize',resize);media?.addEventListener('change',resize);
    return()=>{window.removeEventListener('resize',resize);media?.removeEventListener('change',resize)};
  },[]);
  useDialogLayer(ref,onClose,mobile&&open);
  const sidebar=<aside id="app-sidebar" ref={ref} className={open?'sidebar open':'sidebar'}
    role={mobile?'dialog':undefined} aria-modal={mobile&&open?true:undefined}
    aria-label={tr('Menu utama')} aria-hidden={mobile&&!open?true:undefined} inert={mobile&&!open?true:undefined} tabIndex={-1}>
    <button type="button" className="sidebar-close" aria-label={tr('Tutup menu')} data-dialog-close onClick={onClose}><X size={21}/></button>
    {children}
  </aside>;
  // A portal keeps the drawer interactive while the rest of the app is inert.
  return mobile?createPortal(<div className="sidebar-layer">{open&&<button type="button" className="sidebar-backdrop" aria-label={tr('Tutup menu')} tabIndex={-1} onClick={onClose}/>} {sidebar}</div>,document.body):sidebar;
}
