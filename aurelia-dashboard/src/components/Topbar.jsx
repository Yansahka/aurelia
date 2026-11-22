import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { useUI } from '../context/UIContext';
import { useQuery } from '../hooks/useQuery';
import { navigate } from '../hooks/useRoute';
import Icon from './ui/Icon';
import { Avatar } from './ui/Bits';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ title }) {
  const { logout } = useAuth();
  const { openProductForm, openMobile } = useUI();
  const { data: store } = useQuery('store', api.store.get);
  const { data: me } = useQuery('me', api.me);
  const { data: products } = useQuery('products', api.products.list);
  const { data: orders } = useQuery('orders', api.orders.list);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef();

  useEffect(() => {
    const on = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus(); setOpen(true); } };
    addEventListener('keydown', on); return () => removeEventListener('keydown', on);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase(); if (s.length < 2) return [];
    const p = (products || []).filter(x => x.name.toLowerCase().includes(s)).slice(0, 4).map(x => ({ k: 'p' + x.id, label: x.name, tag: 'Parfum', go: () => { window.dispatchEvent(new CustomEvent('products:reveal', { detail: x.name })); navigate('products', { q: x.name }); } }));
    const o = (orders || []).filter(x => (x.code + ' ' + x.customerName).toLowerCase().includes(s)).slice(0, 4).map(x => ({ k: 'o' + x.id, label: '#' + x.code + ' · ' + x.customerName, tag: 'Commande', go: () => navigate('orders', { open: x.id }) }));
    return [...p, ...o];
  }, [q, products, orders]);

  const choose = r => { r.go(); setQ(''); setOpen(false); input.current?.focus(); };
  const onKeyDown = e => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); setOpen(true);
      if (results.length) setActive(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
    }
    if (e.key === 'Enter' && open && results.length) { e.preventDefault(); choose(results[Math.min(active, results.length - 1)]); }
  };
  const expanded = open && q.trim().length >= 2;
  const newCount = orders?.filter(o => o.status === 'new').length || 0;
  return (
    <header className="top">
      <button className="icon-btn menu-btn" onClick={openMobile} aria-label="Ouvrir le menu" aria-controls="seller-navigation"><Icon name="menu" /></button>
      <div className="crumb"><span className="crumb-store" title={store?.name}>{store?.name}</span><span className="crumb-divider" aria-hidden="true">/</span><b>{title}</b></div>
      <div className="search" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
        <div className="search-field"><Icon name="search" />
          <input ref={input} value={q} onChange={e => { setQ(e.target.value); setActive(0); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} placeholder="Parfum, commande, client…" aria-label="Rechercher" role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls="global-search-results" aria-activedescendant={expanded && results[active] ? 'result-' + results[active].k : undefined} autoComplete="off" />
          <kbd>Ctrl K</kbd>
        </div>
        {expanded && <div className="results" id="global-search-results" role="listbox" aria-label="Résultats de recherche">
          {results.map((r, i) => <button key={r.k} id={'result-' + r.k} role="option" aria-selected={active === i} tabIndex={-1} onClick={() => choose(r)} onMouseEnter={() => setActive(i)}><span className="result-label">{r.label}</span><small>{r.tag}</small></button>)}
          {!results.length && <div className="search-empty" role="status">Aucun résultat pour cette recherche.</div>}
        </div>}
      </div>
      <div className="top-actions">
        <button className="btn lime top-create" onClick={() => openProductForm()} aria-label="Ajouter un parfum"><Icon name="plus" /><span>Nouveau</span></button>
        <button className="icon-btn top-notifications" onClick={() => navigate('orders')} aria-label="Nouvelles commandes"><Icon name="bell" />{newCount > 0 && <span className="rd">{newCount}</span>}</button>
        {me && <span className="top-avatar"><Avatar name={me.name} size={36} /></span>}
        <button className="btn ghost top-logout" onClick={logout}>Déconnexion</button>
      </div>
    </header>
  );
}
