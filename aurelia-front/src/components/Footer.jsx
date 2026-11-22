import { useState } from 'react';
import { api } from '../api/client';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { whatsappUrl } from '../lib/whatsapp';
import RichText from './ui/RichText';
import StoreBrand from './StoreBrand';
import { shopPath } from '../config';

export default function Footer() {
  const { store } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const wa = whatsappUrl(store.whatsapp, `Bonjour ${store.name}, j’ai une question.`);

  const submit = (e) => {
    e.preventDefault();
    api.subscribe(email).then(() => { toast('Merci, à très bientôt !'); setEmail(''); }).catch(() => toast('Une erreur est survenue, réessayez.'));
  };

  return (
    <footer className="ft">
      <div className="fg">
        <div>
          <h3><RichText text={store.footer.tagline} /></h3>
          <form className="nl" onSubmit={submit}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" aria-label="E-mail" />
            <button className="btn" type="submit">S’abonner</button>
          </form>
        </div>
        <div className="cols">
          {store.footer.columns.map((c) => (
            <div key={c.title}><h4>{c.title}</h4>{c.links.map((l) => <a key={l.label} href={l.href === '#wa' ? wa : l.href.startsWith('#')?shopPath()+l.href:l.href}>{l.label}</a>)}</div>
          ))}
        </div>
      </div>
      <div className="wm"><StoreBrand/></div>
      <div className="fb"><span>© {new Date().getFullYear()} {store.name}</span><a href={shopPath()}>Accueil de la boutique</a></div>
    </footer>
  );
}
