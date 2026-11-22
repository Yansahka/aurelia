import { api } from '../api';
import { Avatar, PageHead, Skeleton, StagePill, Thumb, QueryError } from '../components/ui/Bits';
import BarChart from '../components/ui/BarChart';
import Icon from '../components/ui/Icon';
import { storeUrl } from '../config';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { invalidate, useQuery } from '../hooks/useQuery';
import { navigate } from '../hooks/useRoute';
import { stageLabel } from '../lib/constants';
import { compact, dateLong, money, pct, relDays } from '../lib/format';
import { copyText, orderMessage, waLink } from '../lib/share';

const TASK_ICON = { message: 'chat', call: 'phone', delivery: 'orders', stock: 'bottle' };
const COLORS = { new: 'var(--mut)', contacted: 'var(--amber)', confirmed: 'var(--blue)', delivered: 'var(--lime)' };

export default function Overview() {
  const overviewQuery = useQuery('stats:overview', api.stats.overview);
  const storeQuery = useQuery('store', api.store.get);
  const { data: o } = overviewQuery;
  const { data: store } = storeQuery;
  const productsQuery = useQuery('products', api.products.list);
  const { data: products } = productsQuery;
  const { data: me } = useQuery('me', api.me);
  const { data: tasks } = useQuery('tasks', api.tasks.list);
  const { openShare, openProductForm } = useUI();
  const toast = useToast();

  const error = overviewQuery.error || storeQuery.error || productsQuery.error;
  if (error) return <QueryError message={error.message} onRetry={() => { overviewQuery.refetch(); storeQuery.refetch(); productsQuery.refetch(); }} />;
  if (!o || !store || !products) return <><Skeleton h={70} /><div style={{ height: 12 }} /><Skeleton h={110} /><div style={{ height: 12 }} /><Skeleton h={260} /></>;

  const cur = store.currency, c = (n) => compact(n, cur);
  const goal = o.monthlyTarget > 0 ? Math.min(100, Math.round((o.wonThisMonth / o.monthlyTarget) * 100)) : 0;
  const nb = o.nextBest, maxStage = Math.max(...o.stages.map((s) => s.value), 1);
  const todo = tasks?.filter((t) => !t.done).length ?? 0;
  const hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
  const url = storeUrl(store.slug);
  const toggle = async (id) => { try { await api.tasks.toggle(id); invalidate('tasks'); } catch(e) { toast(e.message); } };
  const hasProducts = products.length > 0, hasVisibleProducts = products.some(p => p.isActive);

  return (
    <>
      <PageHead title={`${hello}, ${me?.name.split(' ')[0] || ''}`} sub={`${store.name} · ${dateLong(new Date())} · ${o.open.count} commandes en cours · ${todo} actions aujourd’hui`}>
        <button className="btn" onClick={() => navigate('reports')}>Rapports</button>
        <button className="btn lime" onClick={() => openProductForm()}><Icon name="plus" />Nouveau produit</button>
      </PageHead>
      {o.closed.total === 0 && o.open.count === 0 && <div className="card onboarding">
        <h3>{!hasProducts ? 'Votre boutique commence ici' : !hasVisibleProducts ? 'Votre collection attend ses visiteurs' : 'Votre catalogue est prêt à être partagé'}</h3>
        <p>{!hasProducts ? 'Ajoutez votre premier produit pour composer votre catalogue.' : !hasVisibleProducts ? 'Rendez au moins un produit visible dans votre boutique avant de partager votre lien.' : 'Vérifiez les informations de votre boutique, puis partagez votre lien. Votre première commande apparaîtra ici.'}</p>
        <ol className="setup-steps"><li className={hasProducts ? 'complete' : ''}>{hasProducts ? '✓ Catalogue créé' : 'Catalogue à créer'}</li><li className={store.whatsapp ? 'complete' : ''}>{store.whatsapp ? '✓ WhatsApp renseigné' : 'WhatsApp à renseigner'}</li><li>Première commande à recevoir</li></ol>
        <button className="btn lime" onClick={!hasProducts ? () => openProductForm() : !hasVisibleProducts ? () => navigate('products') : openShare}>{!hasProducts ? 'Ajouter mon premier produit' : !hasVisibleProducts ? 'Gérer mes produits' : 'Partager ma boutique'}</button>
      </div>}

      <div className="card shop-strip">
        <span className="logo-mark"><Icon name="store" /></span>
        <div className="u">Votre boutique est en ligne<b>{url}</b></div>
        <button className="btn" onClick={async () => toast((await copyText(url)) ? 'Lien copié' : 'Copie impossible')}><Icon name="copy" />Copier</button>
        <button className="btn wa" onClick={openShare}><Icon name="chat" />Partager sur WhatsApp</button>
      </div>

      <div className="kpis">
        <div className="card kpi t-blue"><small>Ventes du mois</small><div className="v num">{c(o.wonThisMonth)}</div><div className="prog"><i style={{ width: goal + '%' }} /></div><div className="s">{o.monthlyTarget > 0 ? `${goal}% de l’objectif de ${compact(o.monthlyTarget, '')}` : 'Objectif mensuel à définir'}</div></div>
        <div className="card kpi t-lime"><small>Commandes en cours</small><div className="v num">{c(o.open.value)}</div><div className="s">{o.open.count} commandes ouvertes</div></div>
        <div className="card kpi t-brown"><small>Prévision pondérée</small><div className="v num">{c(o.weighted)}</div><div className="s">selon l’étape de chaque commande</div></div>
        <div className="card kpi"><small>Taux de réussite</small><div className="v num">{pct(o.winRate)}</div><div className="s">{o.closed.won} sur {o.closed.total} commandes clôturées livrées</div></div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ch"><div><h3>Chiffre d’affaires</h3><div className="sub">12 derniers mois par rapport à l’objectif mensuel</div></div>
          <div className="legend"><span><i style={{ background: 'var(--blue)' }} />Livré</span><span><i style={{ background: 'transparent', border: '1px dashed var(--mut)' }} />Objectif {compact(o.monthlyTarget, '')}</span></div></div>
        <BarChart data={o.revenueByMonth} target={o.monthlyTarget} format={(v) => compact(v, cur)} />
      </div>

      <div className="row2">
        <div className="card">
          <div className="ch"><div><h3>Commandes par étape</h3><div className="sub">Valeur à chaque étape</div></div><button className="link" onClick={() => navigate('orders')}>Tableau<Icon name="right" className="ic" style={{ width: 12, height: 12 }} /></button></div>
          {o.stages.map((s) => (
            <div className="hbar" key={s.key}><span>{stageLabel(s.key)}<small>{s.count} commande{s.count > 1 ? 's' : ''}</small></span>
              <div className="tr"><div className="fl" style={{ width: (s.value / maxStage) * 100 + '%', background: COLORS[s.key] }} /></div><span className="num">{compact(s.value, '')}</span></div>
          ))}
        </div>
        <div className="card nbm">
          <div className="eyebrow">Prochaine action</div>
          {nb ? <>
            <h2>{nb.items[0]?.name}{nb.items.length > 1 ? ` +${nb.items.length - 1}` : ''}</h2>
            <div className="sub">{nb.customerName} · {stageLabel(nb.status)} · relance {relDays(nb.followUpAt || nb.createdAt)}</div>
            <div className="big num">{c(nb.total)}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn lime" onClick={() => window.open(waLink(orderMessage(nb, store, (n) => money(n, cur)), nb.phone), '_blank', 'noopener')}><Icon name="chat" />Écrire sur WhatsApp</button>
              <button className="btn ghost" onClick={() => navigate('orders', { open: nb.id })}>Voir la commande</button>
            </div></> : <div className="empty">Aucune commande à relancer.</div>}
        </div>
      </div>

      <div className="row2 even">
        <div className="card">
          <div className="ch"><div><h3>Aujourd’hui</h3><div className="sub">{todo} à faire</div></div></div>
          {tasks?.map((t) => (
            <button key={t.id} className={'task' + (t.done ? ' done' : '')} onClick={() => toggle(t.id)}>
              <span className={'check' + (t.done ? ' on' : '')}>{t.done && <Icon name="check" />}</span>
              <Icon name={TASK_ICON[t.type] || 'bolt'} className="ic muted" /><span className="g"><b style={{ fontWeight: 500 }}>{t.label}</b><small>{t.detail}</small></span>
              <small className="muted">{new Date(t.dueAt).getHours()}h</small>
            </button>
          ))}
        </div>
        <div className="card">
          <div className="ch"><div><h3>Classement des produits</h3><div className="sub">Les plus vendus (livrés)</div></div><button className="link" onClick={() => navigate('products')}>Produits<Icon name="right" className="ic" style={{ width: 12, height: 12 }} /></button></div>
          {o.topProducts.map((p, i) => (
            <div className="list-r" key={p.productId}><span className="rank">{i + 1}</span>{p.image && <Thumb product={p.image} />}
              <span className="g">{p.name}<small>{p.units} vendus</small></span><span className="num">{compact(p.revenue, '')}</span></div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="ch"><div><h3>À relancer bientôt</h3><div className="sub">Prochaines relances de commandes</div></div><button className="link" onClick={() => navigate('orders')}>Tout voir</button></div>
        {!o.closingSoon.length && <p className="hint">Aucune relance planifiée.</p>}
        {o.closingSoon.map((x) => (
          <button className="list-r" style={{ width: '100%', textAlign: 'left' }} key={x.id} onClick={() => navigate('orders', { open: x.id })}>
            <Avatar name={x.customerName} /><span className="g">{x.items[0]?.name}{x.items.length > 1 ? ` +${x.items.length - 1}` : ''}<small>{x.customerName} · relance {relDays(x.followUpAt)}</small></span>
            <StagePill status={x.status} /><span className="num">{compact(x.total, '')}</span>
          </button>
        ))}
      </div>
    </>
  );
}
