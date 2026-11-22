import { CONFIG, resolveSlug } from '../config';
import { MOCK_HOME } from './mock';

// Seul fichier à adapter si le contrat d'API évolue.
const base = () => `${CONFIG.API_BASE}/public/stores/${resolveSlug()}`;

async function req(path, opts = {}) {
  const res = await fetch(base() + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error?.message || 'Boutique indisponible.'); }
  return res.status === 204 ? null : res.json();
}
const post = (path, body) => req(path, { method: 'POST', body: JSON.stringify(body), keepalive: true });

export const api = {
  home: () => (CONFIG.MOCK ? Promise.resolve(MOCK_HOME) : req('/home')),
  product: id => CONFIG.MOCK ? (MOCK_HOME.products.some(p=>p.id===id)?Promise.resolve({product:MOCK_HOME.products.find(p=>p.id===id),reviews:[]}):Promise.reject(new Error('Produit indisponible.'))) : req('/products/'+encodeURIComponent(id)),
  createOrder: (payload) => (CONFIG.MOCK ? (console.info('[mock] POST /orders', payload), Promise.resolve({ code: 'MOCK' })) : post('/orders', payload)),
  subscribe: (email) => (CONFIG.MOCK ? (console.info('[mock] POST /newsletter', email), Promise.resolve()) : post('/newsletter', { email })),
  track: (type, productId) => (CONFIG.MOCK ? undefined : post('/events', { events: [{ type, productId }] }).catch(() => {})),
};
