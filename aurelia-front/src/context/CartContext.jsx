import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { api } from '../api/client';
import { resolveSlug } from '../config';
import { buildOrderMessage, whatsappUrl } from '../lib/whatsapp';
import { useStore } from './StoreContext';
import { useToast } from './ToastContext';
import { cartReducer as reducer,cartLineKey,resolveCartLines } from '../lib/cart';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

const KEY = () => 'cart:' + resolveSlug();
const init = () => { try { const items=JSON.parse(localStorage.getItem(KEY())||'[]');return Array.isArray(items)?items.filter(i=>i&&typeof i.id==='string'&&Number.isInteger(i.qty)&&i.qty>0):[]; } catch { return []; } };

export function CartProvider({ children }) {
  const { store, byId, money } = useStore();
  const toast = useToast();
  const [items, dispatch] = useReducer(reducer, null, init);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => { try { localStorage.setItem(KEY(), JSON.stringify(items)); } catch { /* stockage indisponible */ } }, [items]);

  const lines = useMemo(() => resolveCartLines(items,byId), [items, byId]);
  const hasUnavailable=lines.some(line=>!line.available);
  const total = lines.filter(l=>l.available).reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const add = useCallback((id,qty=1,variantId=null) => {
    const base=byId(id),variant=base?.variants?.find(v=>v.id===variantId&&v.isActive);
    if(!base)return false;
    if(base.hasVariants&&!variant){toast('Choisissez une variante disponible.');return false;}
    if(!base.hasVariants&&variantId){toast('Cette variante n’est plus disponible.');return false;}
    const p=variant?{...base,price:variant.price,stock:variant.stock}:base;
    const key=cartLineKey({id,variantId}),existing=items.find(i=>cartLineKey(i)===key)?.qty||0;
    if(!Number.isInteger(qty)||qty<1||existing+qty>p.stock){toast('Quantité supérieure au stock disponible.');return false;}
    dispatch({ type: 'add', id,variantId,qty,max:p.stock,name:p.name,variantLabel:variant?.label }); toast(p.name + ' ajouté à votre panier'); api.track('add_to_cart', id);return true;
  }, [byId, toast,items]);

  const changeQty = (key,d) => {const line=lines.find(l=>l.key===key);if(!line)return;if(d>0&&(!line.available||line.qty>=line.product.stock)){toast('Stock maximum atteint.');return;}dispatch({type:'qty',key,d,max:line.available?line.product.stock:Infinity});};
  const removeLine=key=>dispatch({type:'remove',key});

  // Enregistre le lead (non bloquant) puis ouvre WhatsApp avec la commande pré-remplie.
  const checkout = async ({ customerName, phone }) => {
    if (!lines.length || busy) return;
    if(hasUnavailable){setCheckoutError('Mettez a jour les articles indisponibles avant de commander.');return;}
    setBusy(true); setCheckoutError('');
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try {
      const order = await api.createOrder({ customerName, phone, items: lines.map(({ product, qty,variantId }) => ({ productId: product.id,variantId, qty })) });
      const confirmed=order.items?order.items.map(i=>({product:{name:i.name,size:i.size,price:i.unitPrice,variantLabel:i.variantLabel,reference:i.reference},qty:i.qty})):lines;
      const message = `${buildOrderMessage({ store, lines:confirmed, money, total: order.total ?? total })}\nNom : ${customerName}\nTéléphone : ${phone}\nRéférence : ${order.code}`;
      const url = whatsappUrl(store.whatsapp, message);
      api.track('whatsapp_click');
      dispatch({type:'clear'}); toast('Demande enregistrée : ' + order.code); setOpen(false);
      if (popup) popup.location.href = url; else window.location.assign(url);
    } catch (e) { popup?.close(); setCheckoutError(e.message || 'Impossible d’enregistrer votre demande. Réessayez.'); }
    finally { setBusy(false); }
  };

  return <Ctx.Provider value={{ lines, total, count, open, busy, checkoutError, hasUnavailable,openBag: () => setOpen(true), closeBag: () => setOpen(false), add, changeQty,removeLine, checkout }}>{children}</Ctx.Provider>;
}
