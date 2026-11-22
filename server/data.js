export function row(r) {
  if (!r) return null;
  const aliases = { whatsapp_number: 'whatsapp', plan_code: 'plan', size_label: 'size', bg_color: 'bg', image_url: 'image', name_snapshot: 'name' };
  return Object.fromEntries(Object.entries(r).map(([k,v]) => [aliases[k] || k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v instanceof Date ? v.toISOString() : ['price','old_price','total','unit_price','monthly_target'].includes(k) && v !== null ? Number(v) : v]));
}
export async function loadData(c, store) {
  const query = async t => (await c.query(`SELECT * FROM ${t} WHERE store_id=$1`, [store.id])).rows.map(row);
  const products = await query('products');
  const customers = await query('customers');
  const orders = await query('orders');
  const items = (await c.query('SELECT i.* FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.store_id=$1', [store.id])).rows.map(row);
  const reviews = await query('reviews');
  const tasks = (await query('tasks')).map(t => ({ ...t, done: !!t.doneAt }));
  return { store, products, customers, orders, items, reviews, tasks };
}
export function publicHome(store, db) {
  const products = db.products.filter(p => p.isActive && !p.deletedAt).sort((a,b) => a.position-b.position);
  const reviews = db.reviews.filter(r => r.isPublished);
  const families = [['fleurs','Fleurs',['#e9b7a3','#a9484d']],['bois','Bois',['#c9a27a','#4d3326']],['ambre','Ambres',['#e8c66a','#8a4a16']],['frais','Agrumes',['#b9c98a','#2f4a3a']]];
  return {
    store: { slug: store.slug, name: store.name, tagline: store.tagline, currency: store.currency, locale: store.locale, whatsapp: store.whatsapp, whatsappMessage: store.whatsappMessage || `Bonjour ${store.name}, je souhaite commander :`,
      hero: { title: `${store.name}|Votre prochain|*coup de cœur*`, subtitle: store.tagline || 'Découvrez notre collection et échangez directement avec nous sur WhatsApp.', cta: 'Découvrir la collection', statValue: String(products.length), statLabel: 'parfums à découvrir' },
      story: `Bienvenue chez ${store.name}. Découvrez notre sélection de *parfums* et contactez-nous sur WhatsApp pour choisir votre prochaine fragrance.`,
      commitment: 'Une question sur votre prochain *parfum* ? Contactez notre boutique pour recevoir des *conseils personnalisés*.',
      footer: { tagline: 'Les nouvelles de *notre boutique*', columns: [{ title: 'Découvrir', links: [{label:'La collection',href:'#shop'},{label:'Contact WhatsApp',href:'#wa'}] }] } },
    products, collections: families.filter(([slug]) => products.some(p => p.family === slug)).map(([slug,name,gradient]) => ({slug,name,gradient})),
    featured: { title: 'Notre *sélection*', text: 'Les parfums mis en avant par notre boutique.', productIds: products.filter(p => p.isFeatured).map(p => p.id) },
    newArrival: { title: 'À *découvrir*', text: products.find(p=>p.isNew)?.tagline || '', productId: products.find(p=>p.isNew)?.id },
    gallery: [], reviews: { rating: reviews.length ? reviews.reduce((a,r)=>a+r.rating,0)/reviews.length : 0, count: reviews.length, items: reviews.map(({author,text,role,rating})=>({author,text,role,rating})) },
  };
}
