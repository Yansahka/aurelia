import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { api } from '../api/client';
import { resolveSlug } from '../config';
import { buildOrderMessage, whatsappUrl } from '../lib/whatsapp';
import { useStore } from './StoreContext';
import { useToast } from './ToastContext';
import { cartReducer as reducer } from '../lib/cart';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

const KEY = () => 'cart:' + resolveSlug();
const init = () => { try { return JSON.parse(localStorage.getItem(KEY()) || '[]'); } catch { return []; } };

export function CartProvider({ children }) {
  const { store, byId, money } = useStore();
  const toast = useToast();
  const [items, dispatch] = useReducer(reducer, null, init);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => { try { localStorage.setItem(KEY(), JSON.stringify(items)); } catch { /* stockage indisponible */ } }, [items]);

  const lines = useMemo(() => items.map((i) => ({ product: byId(i.id), qty: i.qty })).filter((l) => l.product), [items, byId]);
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const add = useCallback((id,qty=1) => {
    const p = byId(id); if (!p || p.stock === 0) return;
    const existing=items.find(i=>i.id===id)?.qty||0;
    if(!Number.isInteger(qty)||qty<1||existing+qty>p.stock){toast('Quantité supérieure au stock disponible.');return false;}
    dispatch({ type: 'add', id,qty,max:p.stock }); toast(p.name + ' ajouté à votre panier'); api.track('add_to_cart', id);return true;
  }, [byId, toast,items]);

  const changeQty = (id, d) => {const p=byId(id);if(!p)return;const qty=items.find(i=>i.id===id)?.qty||0;if(d>0&&qty>=p.stock){toast('Stock maximum atteint.');return;}dispatch({ type: 'qty', id, d,max:p.stock });};

  // Enregistre le lead (non bloquant) puis ouvre WhatsApp avec la commande pré-remplie.
  const checkout = async ({ customerName, phone }) => {
    if (!lines.length || busy) return;
    setBusy(true); setCheckoutError('');
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try {
      const order = await api.createOrder({ customerName, phone, items: lines.map(({ product, qty }) => ({ productId: product.id, qty })) });
      const message = `${buildOrderMessage({ store, lines, money, total: order.total ?? total })}\nNom : ${customerName}\nTéléphone : ${phone}\nRéférence : ${order.code}`;
      const url = whatsappUrl(store.whatsapp, message);
      api.track('whatsapp_click');
      dispatch({type:'clear'}); toast('Demande enregistrée : ' + order.code); setOpen(false);
      if (popup) popup.location.href = url; else window.location.assign(url);
    } catch (e) { popup?.close(); setCheckoutError(e.message || 'Impossible d’enregistrer votre demande. Réessayez.'); }
    finally { setBusy(false); }
  };

  return <Ctx.Provider value={{ lines, total, count, open, busy, checkoutError, openBag: () => setOpen(true), closeBag: () => setOpen(false), add, changeQty, checkout }}>{children}</Ctx.Provider>;
}
