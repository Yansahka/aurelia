import { useState } from 'react';
import { api } from '../api';
import SharePanel from '../components/SharePanel';
import { PageHead, Skeleton, QueryError } from '../components/ui/Bits';
import { storeUrl } from '../config';
import { useToast } from '../context/ToastContext';
import { invalidate, useQuery } from '../hooks/useQuery';
import { DEFAULT_BRANDING, brandStyle, contrast } from '../../../shared/branding.js';

const THEMES=[['Signature','#2b1620','#f6f0e7','#2a1520'],['Océan','#205a86','#f1f7fb','#152e40'],['Forêt','#285947','#f2f6ef','#20382e'],['Nuit','#d8b46b','#141b24','#edf1f5']];
function BrandPreview({ store }) {
 const [broken,setBroken]=useState('');
 return <div className="brand-preview" style={brandStyle(store)} aria-label="Aperçu de votre boutique">
  <div className="brand-preview-nav">{store.logoUrl&&broken!==store.logoUrl?<img key={store.logoUrl} src={store.logoUrl} alt="Votre logo" onError={()=>setBroken(store.logoUrl)}/>:<span className="brand-preview-initial">{store.name?.[0]||'A'}</span>}<strong>{store.name||'Votre boutique'}</strong><span>Collection</span></div>
  <div className="brand-preview-cover">{store.coverUrl&&<img key={store.coverUrl} src={store.coverUrl} alt="Votre couverture" onError={e=>{e.currentTarget.style.display='none';}}/>}<div><small>VOTRE BOUTIQUE</small><h4>{store.heroTitle||'Votre prochain coup de cœur'}</h4><p>{store.tagline||'Découvrez notre sélection de produits.'}</p><span className="brand-preview-cta">Découvrir les produits</span></div></div>
  <div className="brand-preview-products"><span>Votre collection</span><div><i/><strong>Votre produit</strong><span>12 500 FCFA</span><b>+ Panier</b></div></div>
 </div>;
}

function Form({ store }) {
  const toast = useToast();
  const [f, setF] = useState({ ...DEFAULT_BRANDING,...store, monthlyTarget: String(store.monthlyTarget) });
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
    if(contrast(f.backgroundColor,f.textColor)<4.5)er.branding='Le texte et le fond sont trop proches. Choisissez des couleurs plus contrastées.';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.store.update({ name: f.name.trim(), slug: f.slug, tagline: f.tagline, whatsapp: phone, whatsappMessage: f.whatsappMessage, shareMessage: f.shareMessage, monthlyTarget: target, logoUrl:f.logoUrl||null,coverUrl:f.coverUrl||null,accentColor:f.accentColor,backgroundColor:f.backgroundColor,textColor:f.textColor,heroTitle:f.heroTitle });
      invalidate('store', 'stats'); toast('Boutique mise à jour');
    } catch (x) { setErr({save:x.message||'Enregistrement impossible'}); }
    setBusy(false);
  };

  return (
    <form className="card stack store-settings" onSubmit={submit}>
      <h3>Informations de la boutique</h3>
      <label className="field">Nom de la boutique<input {...bind('name')} />{err.name && <small>{err.name}</small>}</label>
      <label className="field">Adresse (slug)<input {...bind('slug')} />{err.slug ? <small>{err.slug}</small> : <span>{storeUrl(f.slug || '…')}</span>}</label>
      <label className="field">Slogan<input {...bind('tagline')} /></label>
      <fieldset className="catalogue-section"><legend>Identité visuelle</legend><div className="stack">
       <label className="field">Logo (URL HTTPS)<input {...bind('logoUrl')} type="url" maxLength={2000} placeholder="https://…/logo.png"/><span>Un logo carré et lisible, de préférence sur fond transparent.</span></label>
       <label className="field">Couverture (URL HTTPS)<input {...bind('coverUrl')} type="url" maxLength={2000} placeholder="https://…/couverture.jpg"/><span>Une image large pour présenter votre univers. Le texte restera sur un fond assombri.</span></label>
       <label className="field">Titre d’accueil<input {...bind('heroTitle')} maxLength={180} placeholder="Votre prochain coup de cœur"/></label>
       <div className="brand-presets" aria-label="Palettes de couleurs">{THEMES.map(([name,accentColor,backgroundColor,textColor])=><button key={name} type="button" className="btn" onClick={()=>setF(s=>({...s,accentColor,backgroundColor,textColor}))} aria-pressed={f.accentColor===accentColor&&f.backgroundColor===backgroundColor&&f.textColor===textColor}><i style={{background:accentColor}}/>{name}</button>)}</div>
       <div className="grid3">{[['accentColor','Couleur principale'],['backgroundColor','Couleur de fond'],['textColor','Couleur du texte']].map(([key,label])=><label key={key} className="field">{label}<input type="color" {...bind(key)}/><span>{f[key]}</span></label>)}</div>
       {err.branding&&<p className="action-error" role="alert">{err.branding}</p>}
       <BrandPreview store={f}/><p className="muted">Aperçu avant enregistrement. Les changements s’afficheront sur votre boutique après sauvegarde.</p>
      </div></fieldset>
      <label className="field">Numéro WhatsApp de la boutique<input {...bind('whatsapp')} inputMode="tel" />{err.whatsapp && <small>{err.whatsapp}</small>}</label>
      <label className="field">Message de commande (début)<input {...bind('whatsappMessage')} /></label>
      <label className="field">Message de partage par défaut<textarea {...bind('shareMessage')} placeholder="Laisser vide pour le message automatique" /></label>
      <label className="field">Objectif de ventes mensuel (FCFA)<input {...bind('monthlyTarget')} inputMode="numeric" />{err.monthlyTarget && <small>{err.monthlyTarget}</small>}</label>
      {err.save&&<p className="action-error" role="alert">{err.save}</p>}
      <div className="acts"><button className="btn lime" disabled={busy}>{busy?'Enregistrement…':'Enregistrer'}</button></div>
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
        <Form key={store.updatedAt || store.slug} store={store} />
      </div>
    </>
  );
}
