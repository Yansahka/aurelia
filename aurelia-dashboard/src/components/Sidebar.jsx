import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { useQuery } from '../hooks/useQuery';
import { navigate } from '../hooks/useRoute';
import { Avatar } from './ui/Bits';
import Icon from './ui/Icon';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: 'overview', icon: 'overview', label: 'Vue d’ensemble' },
  { path: 'products', icon: 'package', label: 'Produits' },
  { path: 'orders', icon: 'orders', label: 'Commandes', badge: 'orders' },
  { path: 'customers', icon: 'users', label: 'Clients' },
  { path: 'reviews', icon: 'star', label: 'Avis', badge: 'reviews' },
  { path: 'reports', icon: 'chart', label: 'Rapports' },
  { path: 'store', icon: 'store', label: 'Ma boutique' },
];

export default function Sidebar({ current }) {
  const { theme, toggleTheme, toggleCollapsed, collapsed, mobileOpen, closeMobile } = useUI();
  const { logout } = useAuth();
  const side = useRef();
  const go = path => { closeMobile(); navigate(path); };
  useEffect(() => {
    if (!mobileOpen) return;
    const node = side.current;
    node.querySelector('.mobile-close')?.focus();
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); closeMobile(); }
      if (e.key === 'Tab') {
        const buttons = [...node.querySelectorAll('button')].filter(b => b.getClientRects().length && getComputedStyle(b).display !== 'none');
        if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.querySelector('.menu-btn')?.focus(); };
  }, [mobileOpen]);
  const toast = useToast();
  const { data: store } = useQuery('store', api.store.get);
  const { data: me } = useQuery('me', api.me);
  const { data: orders } = useQuery('orders', api.orders.list);
  const { data: reviews } = useQuery('reviews', api.reviews.list);
  const counts = { orders: orders?.filter((o) => o.status === 'new').length || 0, reviews: reviews?.filter((r) => !r.isPublished).length || 0 };

  return (
    <aside className="side" ref={side} id="seller-navigation" aria-label="Navigation vendeur">
      <div className="brand">
        <span className="logo-mark"><Icon name="bolt" /></span>
        <b>Aurelia<small>Espace vendeur</small></b><span className="grow" />
        <button className="icon-btn desktop-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'}><Icon name="panel" /></button>
        <button className="icon-btn mobile-close" onClick={closeMobile} aria-label="Fermer le menu"><Icon name="x" /></button>
      </div>

      <div className="group">Votre boutique</div>
      {store && <button className="ws on" onClick={() => go('store')} aria-label={'Ma boutique : ' + store.name}><span className="sq" style={{ background: 'var(--lime)' }}>{store.name[0]}</span><span className="lbl">{store.name}<small>{store.slug} · {store.plan === 'pro' ? 'Pro' : 'Gratuit'}</small></span></button>}

      <div className="group">Menu</div>
      {NAV.map((n) => (
        <button key={n.path} className={'nav-i' + (current === n.path ? ' on' : '')} onClick={() => go(n.path)} title={n.label} aria-label={n.label} aria-current={current === n.path ? 'page' : undefined}>
          <Icon name={n.icon} /><span className="lbl">{n.label}</span>
          {n.badge && counts[n.badge] > 0 ? <><span className="bd">{counts[n.badge]}</span><span className="dot" /></> : current === n.path ? <span className="dot" /> : null}
        </button>
      ))}

      <div className="sp" />
      <div className="foot">
        <button className="nav-i" onClick={() => go('store')} title="Paramètres" aria-label="Paramètres"><Icon name="settings" /><span className="lbl">Paramètres</span></button>
        <button className="nav-i" onClick={() => toast('Ajoutez vos produits, vérifiez vos coordonnées dans « Ma boutique », puis partagez votre lien. Les demandes reçues apparaissent dans « Commandes ».')} title="Aide"><Icon name="help" /><span className="lbl">Aide</span></button>
        <button className="nav-i" onClick={toggleTheme} title="Mode sombre"><Icon name={theme === 'dark' ? 'moon' : 'sun'} /><span className="lbl">Mode sombre</span>
          <span className={'sw lbl' + (theme === 'dark' ? ' on' : '')} style={{ marginLeft: 'auto' }} /></button>
        <button className="nav-i sidebar-logout" onClick={logout} aria-label="Déconnexion" title="Déconnexion"><Icon name="users" /><span className="lbl">Déconnexion</span></button>
        {me && <div className="me"><Avatar name={me.name} size={30} /><div>{me.name}<small>{me.role === 'owner' ? 'Propriétaire' : me.role}</small></div></div>}
      </div>
    </aside>
  );
}
