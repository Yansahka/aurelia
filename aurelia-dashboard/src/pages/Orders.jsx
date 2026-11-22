import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Avatar, PageHead, Skeleton, StagePill, QueryError } from '../components/ui/Bits';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { invalidate, useQuery } from '../hooks/useQuery';
import { STAGES, stageLabel } from '../lib/constants';
import { compact, dateShort, money, relDays } from '../lib/format';
import { orderMessage, waLink } from '../lib/share';

const summary = (o) => (o.items[0] ? `${o.items[0].name}${o.items[0].qty > 1 ? ' ×' + o.items[0].qty : ''}${o.items.length > 1 ? ` +${o.items.length - 1}` : ''}` : '—');
const COLORS = { new: 'var(--mut)', contacted: 'var(--amber)', confirmed: 'var(--blue)', delivered: 'var(--lime)', cancelled: 'var(--red)' };

function Detail({ order, store, onClose, onMove, draft, onDraft }) {
  const cur = store.currency, m = (n) => money(n, cur);
  const [saved, setSaved] = useState(order.notes);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const notes = draft ?? order.notes;
  useEffect(() => { setSaved(order.notes); }, [order.notes]);
  const save = async e => {
    e.preventDefault(); if (status === 'saving') return;
    if (notes.length > 5000) { setError('Limitez vos notes à 5 000 caractères.'); return; }
    setStatus('saving'); setError('');
    try { const updated = await api.orders.update(order.id, { notes }); onDraft(updated.notes); setSaved(updated.notes); setStatus('saved'); invalidate('orders'); }
    catch(e) { setStatus('failed'); setError(e.message + ' Votre brouillon est conservé.'); }
  };
  return (
    <Modal title={`Commande #${order.code}`} onClose={() => status !== 'saving' && onClose()} wide>
      <div className="stack">
        <div className="chips">{STAGES.map((s) => <button key={s.key} className={'chip' + (order.status === s.key ? ' on' : '')} onClick={() => order.status !== s.key && onMove(order.id, s.key, order.status)}>{s.label}</button>)}</div>
        <div className="list-r" style={{ borderBottom: 0 }}><Avatar name={order.customerName} size={36} /><span className="g">{order.customerName}<small>+{order.phone} · {dateShort(order.createdAt)} · {order.source === 'cart' ? 'panier' : 'fiche produit'}</small></span></div>
        <table className="tbl"><tbody>
          {order.items.map((i) => <tr key={i.id}><td>{i.name}</td><td className="r muted">{i.qty} × {m(i.unitPrice)}</td><td className="r num">{m(i.qty * i.unitPrice)}</td></tr>)}
          <tr><td><b style={{ fontWeight: 500 }}>Total</b></td><td /><td className="r num"><b>{m(order.total)}</b></td></tr>
        </tbody></table>
        <form className="notes-editor" onSubmit={save}>
          <label className="field">Notes internes<textarea value={notes} maxLength={5000} onChange={e => { onDraft(e.target.value); setStatus(''); setError(''); }} aria-describedby="notes-count notes-state" placeholder="Adresse, créneau de livraison…" /></label>
          <div className="notes-footer"><span className="notes-counter" id="notes-count">{notes.length.toLocaleString('fr-FR')} / 5 000 caractères</span><button className="btn" disabled={status === 'saving' || notes === saved}>{status === 'saving' ? 'Enregistrement…' : 'Enregistrer les notes'}</button></div>
          <p id="notes-state" className={'notes-feedback ' + status} role={error ? 'alert' : 'status'}>{error || (status === 'saved' ? 'Notes enregistrées.' : status === 'saving' ? 'Enregistrement en cours…' : notes !== saved ? 'Modifications non enregistrées. Le brouillon est conservé tant que vous restez sur la page Commandes.' : 'Vos notes sont enregistrées.')}</p>
        </form>
        <div className="acts">
          <a className="btn ghost" href={'tel:+' + order.phone}><Icon name="phone" />Appeler</a>
          <button className="btn wa" onClick={() => window.open(waLink(orderMessage(order, store, m), order.phone), '_blank', 'noopener')}><Icon name="chat" />Écrire sur WhatsApp</button>
        </div>
      </div>
    </Modal>
  );
}

export default function Orders({ route }) {
  const ordersQuery = useQuery('orders', api.orders.list);
  const storeQuery = useQuery('store', api.store.get);
  const { data: orders } = ordersQuery;
  const { data: store } = storeQuery;
  const toast = useToast();
  const [view, setView] = useState('board');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [over, setOver] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [local, setLocal] = useState({});     // mise à jour optimiste pendant l'appel API
  const [drafts, setDrafts] = useState({});
  useEffect(() => { if (route.params.open) setSel(route.params.open); }, [route.params.open]);

  const list = useMemo(() => (orders || []).map((o) => (local[o.id] ? { ...o, status: local[o.id] } : o))
    .filter((o) => !q || (o.code + ' ' + o.customerName + ' ' + summary(o)).toLowerCase().includes(q.toLowerCase())), [orders, local, q]);
  if (ordersQuery.error || storeQuery.error) return <QueryError message={(ordersQuery.error || storeQuery.error).message} onRetry={() => { ordersQuery.refetch(); storeQuery.refetch(); }} />;
  if (!orders || !store) return <Skeleton h={360} />;

  const move = async (id, status, prev) => {
    const o = orders.find((x) => x.id === id);
    setLocal((l) => ({ ...l, [id]: status }));
    try { await api.orders.updateStatus(id, status); invalidate('orders', 'stats', 'tasks', 'customers'); toast(`« #${o.code} » → ${stageLabel(status)}`, { label: 'Annuler', onClick: () => move(id, prev, status) }); }
    catch (e) { toast(e.message); }
    finally { setLocal((l) => { const n = { ...l }; delete n[id]; return n; }); }
  };
  const selected = sel && list.find((o) => o.id === sel);
  const open = list.filter((o) => ['new', 'contacted', 'confirmed'].includes(o.status));

  return (
    <>
      <PageHead title="Commandes" sub={`${open.length} commandes ouvertes · ${money(open.reduce((t, o) => t + o.total, 0), store.currency)} en jeu`} />
      <div className="filters">
        <div className="tabs">{[['board', 'Tableau'], ['list', 'Liste']].map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</div>
        <label className="qinput"><Icon name="search" className="ic" style={{ width: 14, height: 14 }} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par client, code ou parfum" /></label>
      </div>

      {view === 'board' ? (
        <>
          <div className="hint">Glissez une commande vers une autre étape (ou ouvrez-la pour changer son étape). Les commandes arrivent depuis la boutique via WhatsApp.</div>
          <div className="board">
            {STAGES.map((s) => {
              const col = list.filter((o) => o.status === s.key).slice(0, s.key === 'delivered' || s.key === 'cancelled' ? 12 : 99);
              return (
                <div key={s.key} className={'kcol' + (over === s.key ? ' over' : '')}
                  onDragOver={(e) => { e.preventDefault(); setOver(s.key); }} onDragLeave={() => setOver(null)}
                  onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); const cur = list.find((o) => o.id === id); if (cur && cur.status !== s.key) move(id, s.key, cur.status); }}>
                  <div className="kh"><i style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[s.key] }} />{s.label}<span className="ct">{list.filter((o) => o.status === s.key).length}</span><span className="tot">{compact(col.reduce((t, o) => t + o.total, 0), '')}</span></div>
                  {col.map((o) => (
                    <div key={o.id} className={'kcard' + (dragId === o.id ? ' drag' : '')} draggable role="button" tabIndex={0}
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', o.id); setDragId(o.id); }} onDragEnd={() => setDragId(null)}
                      onClick={() => setSel(o.id)} onKeyDown={(e) => e.key === 'Enter' && setSel(o.id)}>
                      <b>{summary(o)}</b><small>{o.customerName}</small>
                      <div className="f"><Avatar name={o.customerName} /><span>{relDays(o.createdAt)}</span><span className="amt num">{compact(o.total, '')}</span></div>
                    </div>
                  ))}
                  {!col.length && <div className="hint" style={{ padding: 8, margin: 0 }}>Déposez ici</div>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="card scroll-x" style={{ padding: 6 }}>
          <table className="tbl">
            <thead><tr><th>Code</th><th>Client</th><th>Parfums</th><th>Statut</th><th>Date</th><th className="r">Total</th></tr></thead>
            <tbody>{list.map((o) => <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSel(o.id)}><td className="num">#{o.code}</td><td>{o.customerName}</td><td className="muted">{summary(o)}</td><td><StagePill status={o.status} /></td><td className="muted">{dateShort(o.createdAt)}</td><td className="r num">{money(o.total, store.currency)}</td></tr>)}</tbody>
          </table>
          {!list.length && <div className="empty">Aucune commande.</div>}
        </div>
      )}
      {selected && <Detail key={selected.id} order={selected} store={store} onClose={() => setSel(null)} onMove={move} draft={drafts[selected.id]} onDraft={notes => setDrafts(d => ({ ...d, [selected.id]: notes }))} />}
    </>
  );
}
