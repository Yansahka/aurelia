import { useState } from 'react';
import BestSellers from './components/BestSellers';
import CartDrawer from './components/CartDrawer';
import Commitment from './components/Commitment';
import Footer from './components/Footer';
import Gallery from './components/Gallery';
import Hero from './components/Hero';
import Navbar from './components/Navbar';
import NewArrival from './components/NewArrival';
import ProductCarousel from './components/ProductCarousel';
import Reviews from './components/Reviews';
import Rituals from './components/Rituals';
import Story from './components/Story';
import WhatsAppButton from './components/WhatsAppButton';
import { CartProvider } from './context/CartContext';
import { StoreGate, StoreProvider } from './context/StoreContext';
import { ToastProvider } from './context/ToastContext';
import Landing from './pages/Landing';

function Shop() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState(null);
  const search = (v) => { setQuery(v); if (v) document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); };
  return (
    <>
      <Navbar query={query} onQuery={search} />
      <main>
        <Hero />
        <ProductCarousel query={query} family={family} onFamily={setFamily} onResetFamily={() => setFamily(null)} />
        <Story />
        <Rituals onFamily={setFamily} />
        <BestSellers />
        <NewArrival />
        <section className="sec" id="gallery"><Gallery /><Reviews /></section>
        <Commitment />
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </>
  );
}

export default function App() {
  if (!window.location.pathname.startsWith('/s/') && window.location.pathname !== '/demo') return <Landing />;
  return (
    <ToastProvider>
      {window.location.pathname === '/demo' && <div style={{padding:12,textAlign:'center',background:'#d7ed9d',color:'#183e38',position:'relative',zIndex:100}}>Boutique de démonstration · <a href="/#inscription">Créer ma propre boutique</a></div>}
      <StoreProvider>
        <StoreGate>
          <CartProvider><Shop /></CartProvider>
        </StoreGate>
      </StoreProvider>
    </ToastProvider>
  );
}
