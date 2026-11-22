import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { PageHead, Skeleton, Switch, Thumb, QueryError } from '../components/ui/Bits';
import Icon from '../components/ui/Icon';
import { storeUrl } from '../config';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { invalidate, useQuery } from '../hooks/useQuery';
import { FAMILIES, familyLabel } from '../lib/constants';
import { money } from '../lib/format';
import { waLink } from '../lib/share';

export default function Products({ route }) {
  const productsQuery = useQuery('products', api.products.list);
  const storeQuery = useQuery('store', api.store.get);
  const { data: products } = productsQuery;
  const { data: store } = storeQuery;
  const { openProductForm } = useUI();
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState(route.params.q || '');
  const [fam, setFam] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState(null);
  useEffect(() => { setQ(route.params.q || ''); if (route.params.q) { setTab('all'); setFam(''); } }, [route.params.q]);
  useEffect(() => { const reveal = e => { setQ(e.detail); setTab('all'); setFam(''); }; window.addEventListener('products:reveal', reveal); return () => window.removeEventListener('products:reveal', reveal); }, []);

  const TABS = useMemo(() => {
    const l = products || [];
    return [['all', 'Tous', l.length], ['active', 'Visibles', l.filter((p) => p.isActive).length], ['draft', 'Masqués', l.filter((p) => !p.isActive).length], ['out', 'Rupture', l.filter((p) => p.stock === 0).length]];
  }, [products]);
  const list = useMemo(() => (products || []).filter((p) =>
    (tab === 'all' || (tab === 'active' && p.isActive) || (tab === 'draft' && !p.isActive) || (tab === 'out' && p.stock === 0)) &&
    (!fam || p.family === fam) && (!q || (p.name + ' ' + p.note).toLowerCase().includes(q.toLowerCase()))), [products, tab, fam, q]);

  if (productsQuery.error || storeQuery.error) return <QueryError message={(productsQuery.error || storeQuery.error).message} onRetry={() => { productsQuery.refetch(); storeQuery.refetch(); }} />;
  if (!products || !store) return <Skeleton h={320} />;
  const cur = store.currency;

  const toggle = async (p, v) => { setActionError(''); try { await api.products.update(p.id, { isActive: v }); invalidate('products', 'stats'); } catch(e) { setActionError(e.message); } };
  const remove = async (p) => {
    setPending(p.id); setActionError('');
    try {
      await api.products.remove(p.id); invalidate('products', 'stats');
      toast(`« ${p.name} » supprimé`, { label: 'Annuler', onClick: async () => { try { await api.products.restore(p.id); invalidate('products', 'stats'); } catch(e) { setActionError(e.message); } } });
    } catch(e) { setActionError(e.message); } finally { setPending(null); }
  };
  const share = (p) => window.open(waLink(`${p.name} — ${money(p.price, cur)}\n${p.tagline}\n${storeUrl(store.slug)}#shop`), '_blank', 'noopener');

  return (
    <>
      <PageHead title="Parfums" sub={`${products.length} références · ${products.filter((p) => p.isActive).length} visibles dans la boutique`}>
        <button className="btn lime" onClick={() => openProductForm()}><Icon name="plus" />Nouveau parfum</button>
      </PageHead>
      {actionError && <div className="card action-error" role="alert">{actionError}</div>}
      <div className="filters">
        <div className="tabs">{TABS.map(([k, l, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l} {n}</button>)}</div>
        <label className="qinput"><Icon name="search" className="ic" style={{ width: 14, height: 14 }} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par nom ou note" /></label>
        <div className="chips">{[{ key: '', label: 'Toutes les familles' }, ...FAMILIES].map((f) => <button key={f.key} className={'chip' + (fam === f.key ? ' on' : '')} onClick={() => setFam(f.key)}>{f.label}</button>)}</div>
      </div>
      <div className="product-cards">
        {list.map(p => <article className="card product-mobile" key={p.id}>
          <div className="product-mobile-head"><Thumb product={p} /><div><h2>{p.name}</h2><p>{familyLabel(p.family)} · {p.size}</p></div></div>
          <div className="product-mobile-info"><strong className="num">{money(p.price, cur)}</strong><span className={p.stock === 0 ? 'stock-empty' : ''}>{p.stock === 0 ? 'En rupture' : p.stock + ' en stock'}</span></div>
          <div className="product-mobile-visibility"><span>Visible dans la boutique</span><Switch on={p.isActive} onChange={v => toggle(p, v)} label={'Visible : ' + p.name} /></div>
          <div className="product-mobile-actions"><button className="btn" onClick={() => openProductForm(p.id)}>Modifier</button><button className="btn" onClick={() => share(p)} aria-label={'Partager ' + p.name}>Partager</button><button className="btn danger" disabled={pending === p.id} onClick={() => remove(p)}>Supprimer</button></div>
        </article>)}
        {!list.length && <div className="card empty">Aucun parfum ne correspond à ces filtres.</div>}
      </div>
      <div className="card scroll-x products-table" style={{ padding: 6 }}>
        {list.length ? (
          <table className="tbl">
            <thead><tr><th>Parfum</th><th>Famille</th><th className="r">Prix</th><th className="r">Stock</th><th>Visible</th><th /></tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id}>
                <td><div className="cell"><Thumb product={p} /><div><b style={{ fontWeight: 500 }}>{p.name}</b> {p.badge && <span className="pill">{p.badge}</span>}<small>{p.size} · {p.note}</small></div></div></td>
                <td>{familyLabel(p.family)}</td>
                <td className="r num">{money(p.price, cur)}{p.oldPrice && <small className="muted" style={{ display: 'block', textDecoration: 'line-through' }}>{money(p.oldPrice, cur)}</small>}</td>
                <td className="r num" style={{ color: p.stock === 0 ? 'var(--red)' : p.stock <= 3 ? 'var(--amber)' : undefined }}>{p.stock === 0 ? 'Rupture' : p.stock}</td>
                <td><Switch on={p.isActive} onChange={(v) => toggle(p, v)} label={'Visible : ' + p.name} /></td>
                <td className="r" style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" style={{ display: 'inline-grid' }} title="Partager sur WhatsApp" onClick={() => share(p)}><Icon name="chat" /></button>{' '}
                  <button className="icon-btn" style={{ display: 'inline-grid' }} title="Modifier" onClick={() => openProductForm(p.id)}><Icon name="edit" /></button>{' '}
                  <button className="icon-btn" disabled={pending === p.id} style={{ display: 'inline-grid' }} title="Supprimer" onClick={() => remove(p)}><Icon name="trash" /></button>
                </td>
              </tr>))}</tbody>
          </table>) : <div className="empty">Aucun parfum ne correspond à ces filtres.</div>}
      </div>
    </>
  );
}
