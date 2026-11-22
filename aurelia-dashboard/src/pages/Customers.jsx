import { useMemo, useState } from 'react';
import { api } from '../api';
import { Avatar, PageHead, Skeleton, QueryError } from '../components/ui/Bits';
import Icon from '../components/ui/Icon';
import { useQuery } from '../hooks/useQuery';
import { money, relDays } from '../lib/format';
import { waLink } from '../lib/share';

export default function Customers() {
  const customersQuery = useQuery('customers', api.customers.list);
  const storeQuery = useQuery('store', api.store.get);
  const { data: customers } = customersQuery;
  const { data: store } = storeQuery;
  const [q, setQ] = useState('');
  const list = useMemo(() => (customers || []).filter((c) => !q || (c.name + c.phone).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.spent - a.spent), [customers, q]);
  if (customersQuery.error || storeQuery.error) return <QueryError message={(customersQuery.error || storeQuery.error).message} onRetry={() => { customersQuery.refetch(); storeQuery.refetch(); }} />;
  if (!customers || !store) return <Skeleton h={320} />;
  return (
    <>
      <PageHead title="Clients" sub={`${customers.length} clients · ${money(customers.reduce((t, c) => t + c.spent, 0), store.currency)} de ventes livrées`} />
      <div className="filters"><label className="qinput"><Icon name="search" className="ic" style={{ width: 14, height: 14 }} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un client ou un numéro" /></label></div>
      <div className="card scroll-x" style={{ padding: 6 }}>
        <table className="tbl">
          <thead><tr><th>Client</th><th className="r">Commandes</th><th className="r">Total dépensé</th><th>Dernière commande</th><th /></tr></thead>
          <tbody>{list.map((c) => (
            <tr key={c.id}>
              <td><div className="cell"><Avatar name={c.name} size={32} /><div>{c.name}<small>+{c.phone}</small></div></div></td>
              <td className="r num">{c.orders}</td><td className="r num">{money(c.spent, store.currency)}</td><td className="muted">{c.lastOrderAt ? relDays(c.lastOrderAt) : '—'}</td>
              <td className="r"><button className="btn wa sm" onClick={() => window.open(waLink(`Bonjour ${c.name.split(' ')[0]}, c’est ${store.name}. `, c.phone), '_blank', 'noopener')}><Icon name="chat" />WhatsApp</button></td>
            </tr>))}</tbody>
        </table>
        {!list.length && <div className="empty">Aucun client.</div>}
      </div>
    </>
  );
}
