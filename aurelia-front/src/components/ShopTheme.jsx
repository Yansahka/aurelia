import { brandStyle } from '../../../shared/branding.js';
import { useStore } from '../context/StoreContext';
export default function ShopTheme({children}){const {store}=useStore();return <div className="shop-theme" style={brandStyle(store)}>{children}</div>;}
