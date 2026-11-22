import { useStore } from '../context/StoreContext';
import { productImage, productPlaceholder } from '../lib/art';
import Reveal from './ui/Reveal';
import RichText from './ui/RichText';
import { productPath } from '../config';

export default function BestSellers() {
  const { featured, byId, money } = useStore();
  const items = featured.productIds.map(byId).filter(Boolean);
  if (!items.length) return null;
  return (
    <section className="sec" id="best">
      <div className="bs">
        <Reveal className="l"><h2><RichText text={featured.title} /></h2><p>{featured.text}</p><a className="btn dk" href="#shop">Tout voir →</a></Reveal>
        <div>
          {items.map((p) => (
            <a className="bc" key={p.id} href={productPath(p)}>
              <img src={productImage(p)} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.src=productPlaceholder;}}/>
              <div><b>{p.name}</b><small>{[p.categoryName,p.size].filter(Boolean).join(' · ')}</small></div>
              <div><b>{money(p.price)}</b></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
