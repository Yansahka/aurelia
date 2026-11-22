import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useScrolled } from '../hooks/useScrolled';
import { BagIcon, SearchIcon, UserIcon } from './ui/Icons';

export default function Navbar({ query, onQuery }) {
  const { store, featured, gallery } = useStore();
  const { count, openBag } = useCart();
  const solid = useScrolled(60);
  return (
    <header className={'nav' + (solid ? ' solid' : '')}>
      <ul>
        <li><a href="#shop">Boutique</a></li>{featured.productIds.length > 0 && <li><a href="#best">La sélection</a></li>}
        {gallery.length > 0 && <li><a href="#gallery">Galerie</a></li>}<li><a href="#about">À propos</a></li>
      </ul>
      <a className="logo" href="#">{store.name}</a>
      <div className="r">
        <label className="srch"><SearchIcon />
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher" />
        </label>
        <button className="ib" onClick={openBag} aria-label="Panier"><BagIcon />{count > 0 && <span className="cnt on">{count}</span>}</button>
        <a className="ib" href="/#connexion" aria-label="Espace vendeur Aurelia"><UserIcon /></a>
      </div>
    </header>
  );
}
