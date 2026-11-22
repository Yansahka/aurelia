import { api } from '../api';
import { PageHead, Skeleton, Stars, Switch, QueryError } from '../components/ui/Bits';
import Icon from '../components/ui/Icon';
import { useState } from 'react';
import { invalidate, useQuery } from '../hooks/useQuery';
import { dateShort } from '../lib/format';

export default function Reviews() {
  const { data: reviews, error, refetch } = useQuery('reviews', api.reviews.list);
  const [actionError, setActionError] = useState('');
  if (error) return <QueryError message={error.message} onRetry={refetch} />;
  if (!reviews) return <Skeleton h={260} />;
  const avg = reviews.reduce((t, r) => t + r.rating, 0) / (reviews.length || 1);
  const toggle = async (r, v) => { setActionError(''); try { await api.reviews.setPublished(r.id, v); invalidate('reviews'); } catch(e) { setActionError(e.message); } };
  return (
    <>
      <PageHead title="Avis" sub={reviews.length ? `${reviews.length} avis · note moyenne ${avg.toFixed(1)}/5 · ${reviews.filter((r) => r.isPublished).length} publiés sur la boutique` : 'La note moyenne sera disponible dès le premier avis.'} />
      {actionError && <div className="card action-error" role="alert">{actionError}</div>}
      {!reviews.length && <section className="card empty-reviews"><div className="empty-icon"><Icon name="star" /></div><h2>Aucun avis pour le moment</h2><p>Les avis disponibles apparaîtront ici. Vous pourrez choisir ceux que vous souhaitez publier sur votre boutique.</p><p>Votre note moyenne n’est pas encore calculée.</p></section>}
      <div className="pcards">
        {reviews.map((r) => (
          <div className="card review" key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Stars n={r.rating} /><span className="muted" style={{ fontSize: 14 }}>{dateShort(r.createdAt)}</span></div>
            <p>“{r.text}”</p>
            <div className="f"><span style={{ flex: 1 }}>{r.author} · {r.productName}</span>{r.isPublished ? 'Publié' : 'Masqué'}<Switch on={r.isPublished} onChange={(v) => toggle(r, v)} label="Publier l’avis" /></div>
          </div>
        ))}
      </div>
    </>
  );
}
