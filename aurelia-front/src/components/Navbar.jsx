import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useScrolled } from '../hooks/useScrolled';
import { BagIcon, SearchIcon, UserIcon } from './ui/Icons';
import StoreBrand from './StoreBrand';
import { currentProductId, shopPath } from '../config';

export default function Navbar({ query, onQuery }) {
  const { store, featured, gallery } = useStore();
  const { count, openBag } = useCart();
  const solid = useScrolled(60);
  const root=shopPath(),details=!!currentProductId();
  return (
    <header className={'nav' + (solid||details ? ' solid' : '')}>
      <ul>
        <li><a href={root+'#shop'}>Boutique</a></li>{featured.productIds.length > 0 && <li><a href={root+'#best'}>La sélection</a></li>}
        {gallery.length > 0 && <li><a href={root+'#gallery'}>Galerie</a></li>}<li><a href={root+'#about'}>À propos</a></li>
      </ul>
      <a className="logo" href={root} aria-label={store.name+' — accueil'}><StoreBrand/></a>
      <div className="r">
        <form className="srch" onSubmit={e=>{e.preventDefault();if(details)window.location.assign(root+'?q='+encodeURIComponent(query)+'#shop');}}><SearchIcon />
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher" />
        </form>
        <button className="ib" onClick={openBag} aria-label="Panier"><BagIcon />{count > 0 && <span className="cnt on">{count}</span>}</button>
        <a className="ib" href="/#connexion" aria-label="Espace vendeur Aurelia"><UserIcon /></a>
      </div>
    </header>
  );
}
