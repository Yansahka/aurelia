import { useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import ProductCard from './ProductCard';
import Reveal from './ui/Reveal';

export default function ProductCarousel({ query, family, onFamily, onResetFamily }) {
  const { products, collections } = useStore();
  const track = useRef(null);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p=>(!family||(family==='uncategorized'?!p.categoryId:(p.categoryId||p.family)===family))&&(!q||[p.name,p.reference,p.categoryName,p.tagline,p.size,...Object.values(p.attributes||{})].join(' ').toLowerCase().includes(q)));
  }, [products, query, family]);
  const scroll = (dir) => track.current.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="sec" id="shop">
      <Reveal className="sh">
        <h2>Découvrez notre<br /><em>collection de produits</em></h2>
        {family ? <button className="more" onClick={onResetFamily}>Voir tout ↺</button> : <a className="more" href="#shop">Tous les produits ↗</a>}
      </Reveal>
      <div className="catalogue-filters" aria-label="Catégories de produits"><button className={!family?'selected':''} aria-pressed={!family} onClick={onResetFamily}>Tous les produits</button>{collections.map(c=><button key={c.id||c.slug} className={family===(c.id||c.slug)?'selected':''} aria-pressed={family===(c.id||c.slug)} onClick={()=>onFamily(c.id||c.slug)}>{c.name}</button>)}{products.some(p=>!p.categoryId&&!p.family||p.family==='autre'&&!p.categoryId)&&<button aria-pressed={family==='uncategorized'} onClick={()=>onFamily('uncategorized')}>Sans catégorie</button>}</div>
      <Reveal className="cw">
        <button className="arr l" onClick={() => scroll(-1)} aria-label="Précédent">←</button>
        <div className="track" ref={track}>
          {list.length ? list.map((p) => <ProductCard key={p.id} product={p} />) : <p className="empty">{products.length ? 'Aucun produit ne correspond à votre recherche.' : 'Notre collection se prépare. Revenez bientôt ou contactez la boutique sur WhatsApp.'}</p>}
        </div>
        <button className="arr r" onClick={() => scroll(1)} aria-label="Suivant">→</button>
      </Reveal>
    </section>
  );
}
