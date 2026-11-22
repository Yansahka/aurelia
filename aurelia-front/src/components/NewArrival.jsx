import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { productImage } from '../lib/art';
import Reveal from './ui/Reveal';
import RichText from './ui/RichText';

export default function NewArrival() {
  const { newArrival, byId, money } = useStore();
  const { add } = useCart();
  const p = byId(newArrival.productId);
  if (!p) return null;
  return (
    <section className="sec">
      <div className="na">
        <Reveal className="im"><img src={productImage(p)} alt={p.name} loading="lazy" /></Reveal>
        <Reveal>
          <h2><RichText text={newArrival.title} /></h2><p>{newArrival.text}</p>
          <button className="btn dk" onClick={() => add(p.id)}>Ajouter · {money(p.price)}</button>
        </Reveal>
      </div>
    </section>
  );
}
