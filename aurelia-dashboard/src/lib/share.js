import { storeUrl } from '../config';

// Message de partage par défaut (modifiable par le vendeur dans « Ma boutique »).
export const defaultShareMessage = (store) =>
  `Découvrez ${store.name} : nos parfums, à commander directement sur WhatsApp.`;

export const shareText = (store, message) => `${message || store.shareMessage || defaultShareMessage(store)}\n${storeUrl(store.slug)}`;

// Sans numéro : WhatsApp laisse choisir le contact. Avec numéro : ouvre la conversation.
export const waLink = (text, phone = '') => `https://wa.me/${String(phone).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    const ok = document.execCommand('copy'); t.remove(); return ok;
  }
}

// Message pré-rempli pour écrire à un client au sujet d'une commande.
export function orderMessage(order, store, money) {
  const first = (order.customerName || '').split(' ')[0];
  return `Bonjour ${first}, c’est ${store.name}. Je reviens vers vous au sujet de votre commande ${order.code} (${money(order.total)}). Souhaitez-vous que nous la confirmions ?`;
}
