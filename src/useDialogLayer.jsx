import {useEffect,useRef} from 'react';

const inertLocks=new Map();let bodyLocks=0,bodyOverflow='';
function lockBackground(panel){
  const others=[...document.body.children].filter(node=>!node.contains(panel));
  others.forEach(node=>{
    const entry=inertLocks.get(node)||{count:0,value:node.inert};entry.count++;
    inertLocks.set(node,entry);node.inert=true;
  });
  if(bodyLocks++===0){bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
  return()=>{
    others.forEach(node=>{const entry=inertLocks.get(node);if(--entry.count===0){node.inert=entry.value;inertLocks.delete(node);}});
    if(--bodyLocks===0)document.body.style.overflow=bodyOverflow;
  };
}

export default function useDialogLayer(ref,onClose,active=true) {
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    if(!active||!ref.current)return;
    const panel=ref.current,origin=document.activeElement,unlock=lockBackground(panel);
    const focusable=()=>[...panel.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(node=>{
      if(node.disabled||node.tabIndex<0||node.type==='hidden'||node.closest('[hidden],[inert]'))return false;
      const closed=node.closest('details:not([open])');
      return !closed||node===closed.querySelector('summary');
    });
    (panel.querySelector('[data-dialog-close]')||focusable()[0]||panel).focus({preventScroll:true});
    const keydown=event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close.current();}
      if(event.key==='Tab'){
        const items=focusable(),first=items[0],last=items.at(-1);
        if(!first){event.preventDefault();panel.focus();}
        else if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    };
    window.addEventListener('keydown',keydown,true);
    return()=>{
      window.removeEventListener('keydown',keydown,true);
      unlock();
      // A mobile sidebar link may have become hidden while opening the profile.
      const hiddenSidebar=origin?.closest?.('.sidebar')?.getAttribute('aria-hidden')==='true';
      const target=hiddenSidebar?document.querySelector('.mobile-menu'):origin;
      if(target?.isConnected&&!target.closest('[inert]'))target.focus({preventScroll:true});
    };
  },[active,ref]);
}
