import { useEffect, useRef } from 'react';
import Icon from './Icon';

const focusable = node => [...node.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');

export default function Modal({ title, onClose, wide, children }) {
  const dialog = useRef();
  const returnFocus = useRef(document.activeElement);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const node = dialog.current;
    const siblings = [...node.parentElement.parentElement.children].filter(el => el !== node.parentElement);
    const previous = siblings.map(el => [el, el.inert]);
    siblings.forEach(el => { el.inert = true; });
    if (!node.contains(document.activeElement)) (focusable(node)[0] || node).focus();
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key === 'Tab') {
        const items = focusable(node), first = items[0], last = items[items.length - 1];
        if (!first) { e.preventDefault(); node.focus(); }
        else if (e.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    };
    const onFocus = e => { if (!node.contains(e.target)) (focusable(node)[0] || node).focus(); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus);
      previous.forEach(([el, inert]) => { el.inert = inert; });
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    };
  }, []);
  return (
    <div className="modal-wrap" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <h2><span>{title}</span><button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button></h2>
        {children}
      </div>
    </div>
  );
}
