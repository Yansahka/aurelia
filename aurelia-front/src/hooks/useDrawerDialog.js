import { useEffect, useRef } from 'react';

const controls=node=>[...node.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
export function useDrawerDialog(ref,open,onClose){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open)return;
  const node=ref.current,previousFocus=document.activeElement,overflow=document.body.style.overflow;
  const siblings=[...node.parentElement.children].filter(el=>el!==node&&!el.classList.contains('ov')).map(el=>[el,el.inert]);
  siblings.forEach(([el])=>{el.inert=true;});document.body.style.overflow='hidden';
  (controls(node)[0]||node).focus();
  const keepFocus=e=>{if(!node.contains(e.target))(controls(node)[0]||node).focus();};
  const key=e=>{
   if(e.key==='Escape'){e.preventDefault();close.current();}
   if(e.key==='Tab'){
    const items=controls(node),first=items[0],last=items[items.length-1];
    if(!first){e.preventDefault();node.focus();}
    else if(e.shiftKey&&(document.activeElement===first||!node.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||!node.contains(document.activeElement))){e.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',key,true);document.addEventListener('focusin',keepFocus);
  return()=>{document.removeEventListener('keydown',key,true);document.removeEventListener('focusin',keepFocus);siblings.forEach(([el,inert])=>{el.inert=inert;});document.body.style.overflow=overflow;if(previousFocus?.isConnected)previousFocus.focus();};
 },[open,ref]);
}
