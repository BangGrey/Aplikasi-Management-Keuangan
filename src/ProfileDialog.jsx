import React,{useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X,UserRound} from 'lucide-react';
import {tr} from './language.mjs';
import useDialogLayer from './useDialogLayer.jsx';
import './navigation-panels.css';

export default function ProfileDialog({onClose,children}) {
  const ref=useRef(null),title=useId();
  useDialogLayer(ref,onClose);
  return createPortal(<div className="profile-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="profile-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby={title} tabIndex={-1}>
      <div className="profile-dialog-header"><h2 id={title}><UserRound size={19}/>{tr('Profil & pengaturan')}</h2>
        <button type="button" aria-label={tr('Tutup profil')} data-dialog-close onClick={onClose}><X size={20}/></button>
      </div>
      <div className="profile-dialog-content">{children}</div>
    </section>
  </div>,document.body);
}
