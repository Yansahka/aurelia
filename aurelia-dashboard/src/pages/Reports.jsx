import { api } from '../api';
import { PageHead, Skeleton, QueryError } from '../components/ui/Bits';
import BarChart from '../components/ui/BarChart';
import Icon from '../components/ui/Icon';
import { useQuery } from '../hooks/useQuery';
import { navigate } from '../hooks/useRoute';
import { downloadCsv, reportCsvRows } from '../lib/csv';
import { compact, money, num, pct } from '../lib/format';

const METRICS = [['revenue', 'Chiffre d’affaires'], ['orders', 'Commandes livrées'], ['winrate', 'Taux de réussite'], ['avg', 'Panier moyen']];
const GROUPS = [['month', 'Par mois'], ['product', 'Par produit'], ['category', 'Par catégorie']];

// Les choix sont dans l'adresse (#/reports?m=…&g=…) : on peut partager la vue exacte.
export default function Reports({ route }) {
  const m = route.params.m || 'revenue', g = route.params.g==='family'?'category':route.params.g || 'month';
  const { data: r, error, refetch } = useQuery(`stats:report:${m}:${g}`, () => api.stats.report({ metric: m, group: g }));
  const { data: store, error: storeError, refetch: refetchStore } = useQuery('store', api.store.get);
  if (!METRICS.some(([key]) => key === m) || !GROUPS.some(([key]) => key === g)) return <QueryError message="Ce rapport n’existe pas. Choisissez une mesure et un regroupement valides." onRetry={() => navigate('reports')} action="Afficher le rapport par défaut" />;
  if (error || storeError) return <QueryError message={(error || storeError).message} onRetry={() => { refetch(); refetchStore(); }} />;
  if (!r || !store) return <Skeleton h={420} />;
  const cur = store.currency;
  const fmt = (v, withCur = false) => (m === 'revenue' || m === 'avg' ? compact(v, withCur ? cur : '') : m === 'winrate' ? pct(v) : num(v));
  const go = (nm, ng) => navigate('reports', { m: nm, g: ng });
  const label = METRICS.find((x) => x[0] === m)[1];

  return (
    <>
      <PageHead title="Rapports" sub="Choisissez une mesure et un regroupement : l’adresse garde vos choix, vous pouvez la partager.">
        <button className="btn" onClick={() => downloadCsv(`rapport-${m}-${g}.csv`, reportCsvRows(r, label, cur))}><Icon name="download" />Exporter en CSV</button>
      </PageHead>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ch"><div><h3>{label} {GROUPS.find((x) => x[0] === g)[1].toLowerCase()}</h3><div className="sub">12 derniers mois</div></div></div>
        <div className="filters" style={{ justifyContent: 'space-between' }}>
          <div className="chips">{METRICS.map(([k, l]) => <button key={k} className={'chip' + (m === k ? ' on' : '')} onClick={() => go(k, g)}>{l}</button>)}</div>
          <div className="chips">{GROUPS.map(([k, l]) => <button key={k} className={'chip' + (g === k ? ' on' : '')} onClick={() => go(m, k)}>{l}</button>)}</div>
        </div>
        <div className="stat-row">
          <div><small>{m === 'winrate' || m === 'avg' ? 'Moyenne' : 'Total'}</small><div className="big-n num">{fmt(r.total, true)}</div></div>
          {r.highest && <div><small>Le plus élevé</small><div className="big-n">{r.highest.label}</div><small>{fmt(r.highest.value)}</small></div>}
        </div>
        <BarChart data={r.rows} format={(v) => fmt(v)} height={210} showValues highlight={r.highest?.key} />
      </div>
      <div className="card scroll-x">
        <h3 style={{ marginBottom: 8 }}>Les chiffres</h3>
        <table className="tbl"><thead><tr><th>{g === 'month' ? 'Mois' : g === 'product' ? 'Produit' : 'Catégorie'}</th><th className="r">{label}</th><th className="r">Part</th></tr></thead>
          <tbody>{r.rows.map((x) => <tr key={x.key}><td>{g === 'month' ? x.key : x.label}</td><td className="r num">{['revenue', 'avg'].includes(m) ? money(x.value, cur) : fmt(x.value)}</td><td className="r muted">{x.share != null ? pct(x.share) : '—'}</td></tr>)}</tbody></table>
        <p className="hint" style={{ marginTop: 10 }}>Seules les commandes livrées comptent dans le chiffre d’affaires. Le taux de réussite = livrées / (livrées + annulées).</p>
      </div>
    </>
  );
}
