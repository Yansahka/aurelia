import { catalogueProducts } from './catalogue.js';
export function row(r) {
  if (!r) return null;
  const aliases = { whatsapp_number: 'whatsapp', plan_code: 'plan', size_label: 'size', bg_color: 'bg', image_url: 'image', name_snapshot: 'name' };
  return Object.fromEntries(Object.entries(r).map(([k,v]) => [aliases[k] || k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v instanceof Date ? v.toISOString() : ['price','old_price','total','unit_price','monthly_target'].includes(k) && v !== null ? Number(v) : v]));
}
export async function loadData(c, store) {
  const query = async t => (await c.query(`SELECT * FROM ${t} WHERE store_id=$1`, [store.id])).rows.map(row);
  const products = await catalogueProducts(c,store.id);
  const categories = await query('categories');
  const customers = await query('customers');
  const orders = await query('orders');
  const items = (await c.query('SELECT i.* FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.store_id=$1', [store.id])).rows.map(row);
  const reviews = await query('reviews');
  const tasks = (await query('tasks')).map(t => ({ ...t, done: !!t.doneAt }));
  return { store, products, categories, customers, orders, items, reviews, tasks };
}
export function publicHome(store, db) {
  const products = db.products.filter(p => p.isActive && !p.deletedAt).sort((a,b) => a.position-b.position);
  const reviews = db.reviews.filter(r => r.isPublished);
  return {
    store: { slug: store.slug, name: store.name, tagline: store.tagline, currency: store.currency, locale: store.locale, whatsapp: store.whatsapp, whatsappMessage: store.whatsappMessage || `Bonjour ${store.name}, je souhaite commander :`,
      hero: { title: `${store.name}|Votre prochain|*coup de cœur*`, subtitle: store.tagline || 'Découvrez nos produits et échangez directement avec nous sur WhatsApp.', cta: 'Découvrir les produits', statValue: String(products.length), statLabel: 'produits à découvrir' },
      story: `Bienvenue chez ${store.name}. Découvrez notre sélection de *produits* et contactez-nous sur WhatsApp pour préparer votre commande.`,
      commitment: 'Une question sur un *produit* ? Contactez notre boutique pour recevoir des *conseils personnalisés*.',
      footer: { tagline: 'Les nouvelles de *notre boutique*', columns: [{ title: 'Découvrir', links: [{label:'La collection',href:'#shop'},{label:'Contact WhatsApp',href:'#wa'}] }] } },
    products, collections: (db.categories||[]).filter(c=>products.some(p=>p.categoryId===c.id)).map(c=>({id:c.id,slug:c.id,name:c.name,gradient:['#c9d8cf','#5a7767']})),
    featured: { title: 'Notre *sélection*', text: 'Les produits mis en avant par notre boutique.', productIds: products.filter(p => p.isFeatured).map(p => p.id) },
    newArrival: { title: 'À *découvrir*', text: products.find(p=>p.isNew)?.tagline || '', productId: products.find(p=>p.isNew)?.id },
    gallery: [], reviews: { rating: reviews.length ? reviews.reduce((a,r)=>a+r.rating,0)/reviews.length : 0, count: reviews.length, items: reviews.map(({author,text,role,rating})=>({author,text,role,rating})) },
  };
}
