import { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { productImage } from '../lib/art';
import { CloseIcon } from './ui/Icons';

export default function CartDrawer() {
  const { money } = useStore();
  const { lines, total, open, busy, checkoutError, closeBag, changeQty, checkout } = useCart();

  useEffect(() => {
    const on = (e) => e.key === 'Escape' && closeBag();
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [closeBag]);

  return (
    <>
      <div className={'ov' + (open ? ' on' : '')} onClick={closeBag} />
      <aside className={'dr' + (open ? ' on' : '')} aria-label="Panier">
        <div className="dh"><span>Votre <em>panier</em></span><button className="ib" onClick={closeBag} aria-label="Fermer"><CloseIcon /></button></div>
        <div className="di">
          {lines.length ? lines.map(({ product: p, qty }) => (
            <div className="ci" key={p.id}>
              <div className="t"><img src={productImage(p)} alt="" /></div>
              <div><b>{p.name}</b><small>{p.size} · {money(p.price)}</small></div>
              <div className="qty">
                <button onClick={() => changeQty(p.id, -1)} aria-label="Moins">−</button>{qty}<button onClick={() => changeQty(p.id, 1)} aria-label="Plus">+</button>
              </div>
            </div>
          )) : <p>Votre panier est vide.</p>}
        </div>
        <form onSubmit={e => { e.preventDefault(); checkout(Object.fromEntries(new FormData(e.currentTarget))); }}>
          <div className="sub"><span>Sous-total</span><span>{money(total)}</span></div>
          <label className="checkout-field">Votre nom<input name="customerName" autoComplete="name" required maxLength={100} placeholder="Nom et prénom" /></label>
          <label className="checkout-field">Votre téléphone<input name="phone" type="tel" autoComplete="tel" required maxLength={30} pattern="[+0-9 ()-]{8,30}" placeholder="+237 690 000 000" /></label>
          {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
          <button className="btn go" disabled={!lines.length || busy} style={{ opacity: lines.length ? 1 : 0.5 }}>{busy ? 'Enregistrement…' : 'Commander sur WhatsApp'}</button>
          <p className="hint">Vos coordonnées sont transmises à cette boutique pour traiter votre demande. Vous confirmerez la disponibilité et la livraison sur WhatsApp.</p>
        </form>
      </aside>
    </>
  );
}
