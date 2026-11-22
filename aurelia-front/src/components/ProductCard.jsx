import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { productImage } from '../lib/art';

export default function ProductCard({ product: p }) {
  const { money } = useStore();
  const { add } = useCart();
  return (
    <article className="pc">
      <div className="pi">
        <img src={productImage(p)} alt={p.name} loading="lazy" />
        {p.badge && <span className="bdg">{p.badge}</span>}
      </div>
      <div className="pm">
        {(p.swatches || []).map((c) => <i key={c} className="sw" style={{ background: c }} />)}
        <span>{p.size} · {p.note}</span>
      </div>
      <div className="pn">{p.name}</div>
      <div className="pt">{p.tagline}</div>
      <div className="pf">
        <span className="pr">{money(p.price)}{p.oldPrice && <s>{money(p.oldPrice)}</s>}</span>
        <button className="add" disabled={p.stock === 0} onClick={() => add(p.id)}>{p.stock === 0 ? 'Épuisé' : '+ Panier'}</button>
      </div>
    </article>
  );
}
