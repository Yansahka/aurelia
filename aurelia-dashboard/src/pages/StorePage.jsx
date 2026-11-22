import { useState } from 'react';
import { api } from '../api';
import SharePanel from '../components/SharePanel';
import { PageHead, Skeleton, QueryError } from '../components/ui/Bits';
import { storeUrl } from '../config';
import { useToast } from '../context/ToastContext';
import { invalidate, useQuery } from '../hooks/useQuery';

function Form({ store }) {
  const toast = useToast();
  const [f, setF] = useState({ ...store, monthlyTarget: String(store.monthlyTarget) });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => setF((s) => ({ ...s, [k]: e.target.value })) });

  const submit = async (e) => {
    e.preventDefault();
    const er = {}, phone = f.whatsapp.replace(/[\s+]/g, ''), target = Number(f.monthlyTarget);
    if (!f.name.trim()) er.name = 'Nom obligatoire';
    if (!/^[a-z0-9-]{3,40}$/.test(f.slug)) er.slug = '3 à 40 caractères : lettres minuscules, chiffres, tirets';
    if (!/^[1-9]\d{7,14}$/.test(phone)) er.whatsapp = 'Format international sans « + », ex. 237690000000';
    if (!Number.isInteger(target) || target < 0) er.monthlyTarget = 'Objectif invalide';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.store.update({ name: f.name.trim(), slug: f.slug, tagline: f.tagline, whatsapp: phone, whatsappMessage: f.whatsappMessage, shareMessage: f.shareMessage, monthlyTarget: target });
      invalidate('store', 'stats'); toast('Boutique mise à jour');
    } catch (x) { toast(x.message || 'Enregistrement impossible'); }
    setBusy(false);
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>Informations de la boutique</h3>
      <label className="field">Nom de la boutique<input {...bind('name')} />{err.name && <small>{err.name}</small>}</label>
      <label className="field">Adresse (slug)<input {...bind('slug')} />{err.slug ? <small>{err.slug}</small> : <span>{storeUrl(f.slug || '…')}</span>}</label>
      <label className="field">Slogan<input {...bind('tagline')} /></label>
      <label className="field">Numéro WhatsApp de la boutique<input {...bind('whatsapp')} inputMode="tel" />{err.whatsapp && <small>{err.whatsapp}</small>}</label>
      <label className="field">Message de commande (début)<input {...bind('whatsappMessage')} /></label>
      <label className="field">Message de partage par défaut<textarea {...bind('shareMessage')} placeholder="Laisser vide pour le message automatique" /></label>
      <label className="field">Objectif de ventes mensuel (FCFA)<input {...bind('monthlyTarget')} inputMode="numeric" />{err.monthlyTarget && <small>{err.monthlyTarget}</small>}</label>
      <div className="acts"><button className="btn lime" disabled={busy}>Enregistrer</button></div>
    </form>
  );
}

export default function StorePage() {
  const { data: store, error, refetch } = useQuery('store', api.store.get);
  if (error) return <QueryError message={error.message} onRetry={refetch} />;
  if (!store) return <Skeleton h={400} />;
  return (
    <>
      <PageHead title="Ma boutique" sub="Partagez votre lien et réglez les informations affichées aux clients." />
      <div className="row2 even" style={{ alignItems: 'start' }}>
        <div className="card"><h3 style={{ marginBottom: 12 }}>Partager ma boutique</h3><SharePanel key={store.shareMessage + store.slug} store={store} /></div>
        <Form key={store.updatedKey || store.slug} store={store} />
      </div>
    </>
  );
}
