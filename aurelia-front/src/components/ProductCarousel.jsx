import { useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import ProductCard from './ProductCard';
import Reveal from './ui/Reveal';

export default function ProductCarousel({ query, family, onResetFamily }) {
  const { products } = useStore();
  const track = useRef(null);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!family || p.family === family) && (!q || (p.name + ' ' + p.note + ' ' + p.family + ' ' + p.tagline).toLowerCase().includes(q)));
  }, [products, query, family]);
  const scroll = (dir) => track.current.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="sec" id="shop">
      <Reveal className="sh">
        <h2>Découvrez notre<br /><em>collection de parfums</em></h2>
        {family ? <button className="more" onClick={onResetFamily}>Voir tout ↺</button> : <a className="more" href="#shop">Tous les parfums ↗</a>}
      </Reveal>
      <Reveal className="cw">
        <button className="arr l" onClick={() => scroll(-1)} aria-label="Précédent">←</button>
        <div className="track" ref={track}>
          {list.length ? list.map((p) => <ProductCard key={p.id} product={p} />) : <p className="empty">{products.length ? 'Aucun parfum ne correspond à votre recherche.' : 'Notre collection se prépare. Revenez bientôt ou contactez la boutique sur WhatsApp.'}</p>}
        </div>
        <button className="arr r" onClick={() => scroll(1)} aria-label="Suivant">→</button>
      </Reveal>
    </section>
  );
}
