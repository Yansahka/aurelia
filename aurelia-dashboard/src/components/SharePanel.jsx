import { useState } from 'react';
import { storeUrl } from '../config';
import { useToast } from '../context/ToastContext';
import { copyText, shareText, waLink } from '../lib/share';
import Icon from './ui/Icon';

// Partage du lien de la boutique : copier, WhatsApp (choix du contact), envoi à un numéro, partage natif.
export default function SharePanel({ store }) {
  const toast = useToast();
  const url = storeUrl(store.slug);
  const [msg, setMsg] = useState(store.shareMessage || `Découvrez ${store.name} : nos parfums, à commander directement sur WhatsApp.`);
  const [phone, setPhone] = useState('');
  const full = shareText(store, msg);
  const phoneOk = !phone || /^[1-9]\d{7,14}$/.test(phone.replace(/[\s+]/g, ''));

  const copy = async () => toast((await copyText(url)) ? 'Lien copié' : 'Copie impossible');
  const open = (p) => window.open(waLink(full, p), '_blank', 'noopener');
  const native = () => navigator.share({ title: store.name, text: msg, url }).catch(() => {});

  return (
    <div className="share-box">
      <label className="field">Lien de votre boutique
        <span className="copyrow"><input readOnly value={url} onFocus={(e) => e.target.select()} /><button type="button" className="btn" onClick={copy}><Icon name="copy" />Copier</button></span>
      </label>
      <label className="field">Message
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} />
      </label>
      <button type="button" className="btn wa" onClick={() => open('')}><Icon name="chat" />Partager sur WhatsApp</button>
      <span className="or">ou envoyer directement à un contact</span>
      <label className="field">
        <span className="copyrow">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="237 6XX XX XX XX" inputMode="tel" aria-label="Numéro WhatsApp" />
          <button type="button" className="btn" disabled={!phone || !phoneOk} onClick={() => open(phone)}>Envoyer</button>
        </span>
        {!phoneOk && <small>Format international sans « + », ex. 237690000000</small>}
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="btn ghost" onClick={native}><Icon name="share" />Autres applications</button>}
        <a className="btn ghost" href={url} target="_blank" rel="noopener noreferrer"><Icon name="ext" />Voir ma boutique</a>
      </div>
    </div>
  );
}
