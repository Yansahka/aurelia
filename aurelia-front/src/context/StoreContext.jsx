import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { makeMoney } from '../lib/format';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let off = false;
    api.home()
      .then((data) => !off && setState({ status: 'ready', data }))
      .catch(() => !off && setState({ status: 'error', data: null }));
    return () => { off = true; };
  }, []);

  useEffect(() => {
    if (!state.data) return;
    document.title = state.data.store.name + ' — Boutique en ligne';
    api.track('view');
  }, [state.data]);

  const value = useMemo(() => {
    const d = state.data;
    if (!d) return { status: state.status };
    return { status: 'ready', ...d, money: makeMoney(d.store.locale, d.store.currency), byId: (id) => d.products.find((p) => p.id === id) };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Affiche un état de chargement / d'erreur tant que la boutique n'est pas prête.
export function StoreGate({ children }) {
  const { status } = useStore();
  if (status === 'loading') return <div className="state">Chargement…</div>;
  if (status === 'error') return <div className="state"><div><h1>Boutique indisponible</h1><p>Cette adresse n’existe pas ou le service est temporairement indisponible.</p><button onClick={() => window.location.reload()}>Réessayer</button> · <a href="/">Découvrir Aurelia</a></div></div>;
  return children;
}
