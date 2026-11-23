import { useUI } from '../context/UIContext';
import { useRoute } from '../hooks/useRoute';
import Customers from '../pages/Customers';
import Orders from '../pages/Orders';
import Overview from '../pages/Overview';
import Products from '../pages/Products';
import Reports from '../pages/Reports';
import Reviews from '../pages/Reviews';
import StorePage from '../pages/StorePage';
import ProductFormModal from './ProductFormModal';
import ShareModal from './ShareModal';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AccountPage from '../pages/AccountPage';
import VerificationNotice from './VerificationNotice';

const PAGES = {
  overview: [Overview, 'Vue d’ensemble'], products: [Products, 'Produits'], orders: [Orders, 'Commandes'], customers: [Customers, 'Clients'],
  reviews: [Reviews, 'Avis'], reports: [Reports, 'Rapports'], store: [StorePage, 'Ma boutique'],account:[AccountPage,'Mon compte'],
};

export default function Shell() {
  const route = useRoute();
  const { collapsed, mobileOpen, closeMobile } = useUI();
  const [Page, title] = PAGES[route.path] || PAGES.overview;
  return (
    <div className={'app' + (collapsed ? ' collapsed' : '') + (mobileOpen ? ' mobile-open' : '')}>
      <Sidebar current={PAGES[route.path] ? route.path : 'overview'} />
      {mobileOpen && <div className="scrim" onClick={closeMobile} />}
      <div className="main" inert={mobileOpen ? '' : undefined}>
        <Topbar title={title} />
        <div className="page" key={route.path}>{route.path!=='account'&&<VerificationNotice/>}<Page route={route} /></div>
      </div>
      <ProductFormModal />
      <ShareModal />
    </div>
  );
}
