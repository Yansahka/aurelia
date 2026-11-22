// Données fictives. Les identifiants sont de vrais UUID : le même jeu peut être exporté en SQL (npm run export:sql).
export const uuid = (ns, n) => `${ns}0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const NS = { store: '5001', user: '5002', product: '5003', customer: '5004', order: '5005', item: '5006', review: '5007', task: '5008' };

const DAY = 864e5;

export function buildSeed(now = new Date()) {
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const user = { id: uuid(NS.user, 1), name: 'Amina Ngono', email: 'amina@exemple.com', role: 'Propriétaire' };
  const store = {
    id: uuid(NS.store, 1), ownerId: user.id, slug: 'aurelia', name: 'Aurelia', tagline: 'Parfums botaniques pour des rituels plus lents',
    currency: 'FCFA', locale: 'fr-FR', whatsapp: '237690000000', whatsappMessage: 'Bonjour Aurelia, je souhaite commander :',
    shareMessage: '', monthlyTarget: 800000, status: 'active', plan: 'pro',
  };

  const P = (n, name, tagline, price, oldPrice, size, note, family, badge, stock, active, featured, isNew, palette, shape, bg) => ({
    id: uuid(NS.product, n), name, tagline, price, oldPrice, size, note, family, badge, stock, isActive: active, isFeatured: featured, isNew, palette, shape, bg, image: '',
  });
  const products = [
    P(1, 'Oud Nocturne', 'Eau de parfum boisée, safran et ambre noir.', 42000, 48000, '50 ml', 'Oud', 'bois', 'Promotion', 14, true, true, false, ['#d9922b', '#7a4a12'], 0, '#efdba8'),
    P(2, 'Rose de Mai', 'Rose fraîche, pivoine et musc blanc.', 38500, null, '50 ml', 'Rose', 'fleurs', 'Nouveau', 9, true, true, true, ['#e8a5b0', '#9b3d55'], 1, '#d9d0cf'),
    P(3, 'Vétiver Brume', 'Brume parfumée de vétiver et de citron vert.', 29000, null, '100 ml', 'Vétiver', 'frais', 'Coup de cœur', 22, true, false, false, ['#c9d3b0', '#5d6e3d'], 2, '#e6d8cb'),
    P(4, 'Ambre Solaire', 'Ambre chaud, vanille et fleur d’oranger.', 24000, null, '30 ml', 'Ambre', 'ambre', 'Nouveau', 3, true, false, true, ['#f1c04a', '#b36a14'], 0, '#dfe4e6'),
    P(5, 'Santal Velours', 'Bois de santal crémeux, cardamome et cèdre blond.', 45000, null, '50 ml', 'Santal', 'bois', '', 11, true, true, false, ['#c9a27a', '#6b4630'], 2, '#e8dccf'),
    P(6, 'Néroli Blanc', 'Néroli, thé blanc et fleur de coton.', 33000, null, '100 ml', 'Néroli', 'fleurs', 'Nouveau', 17, true, false, true, ['#f2e6c4', '#c9a64a'], 1, '#dfd6e0'),
    P(7, 'Cèdre & Cuir', 'Cuir fumé, cèdre de l’Atlas et poivre noir.', 36000, null, '50 ml', 'Cuir', 'bois', '', 8, true, false, false, ['#8a6a50', '#3a2418'], 0, '#ddd2c4'),
    P(8, 'Bergamote Givrée', 'Bergamote, menthe poivrée et thé vert.', 27500, null, '100 ml', 'Bergamote', 'frais', '', 19, true, false, false, ['#d6e6b0', '#7fa14a'], 2, '#e9e2c9'),
    P(9, 'Iris Poudré', 'Iris, poudre de riz et vanille (en préparation).', 39000, null, '50 ml', 'Iris', 'fleurs', '', 0, false, false, true, ['#cdbfe0', '#6b4f93'], 1, '#e4dde9'),
    P(10, 'Musc Blanc', 'Musc blanc et coton, très enveloppant.', 31000, null, '50 ml', 'Musc', 'ambre', '', 0, true, false, false, ['#efe9df', '#b9aa93'], 0, '#e3ddd2'),
  ];

  const names = ['Nadia Tchoumi', 'Clarisse Eyenga', 'Lydie Bassong', 'Jean-Paul Kamga', 'Amara Okafor', 'Sofia Marín', 'Fatou Diallo', 'Hervé Nkoulou', 'Carine Mbarga', 'Patrick Essomba', 'Inès Fotso', 'Ruth Ndzana', 'Boris Tamo', 'Mireille Atangana'];
  const customers = names.map((name, i) => ({ id: uuid(NS.customer, i + 1), name, phone: '2376' + String(50123456 + i * 1234567).slice(0, 8) }));

  const sellable = products.filter((p) => p.isActive);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const used = new Set();
  const code = () => { let c; do { c = Array.from({ length: 4 }, () => alphabet[Math.floor(rnd() * alphabet.length)]).join(''); } while (used.has(c)); used.add(c); return c; };

  const orders = []; const items = [];
  for (let m = 11; m >= 0; m--) {
    const count = m === 0 ? 15 : 7 + Math.floor(rnd() * 4);
    for (let k = 0; k < count; k++) {
      let d = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(rnd() * 27), 8 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
      if (d > now) d = new Date(now.getTime() - Math.floor(rnd() * 5) * DAY - Math.floor(rnd() * 5 + 1) * 36e5);
      const age = (now - d) / DAY;
      const status = age > 21 ? (rnd() < 0.86 ? 'delivered' : 'cancelled')
        : pick(age < 3 ? ['new', 'new', 'contacted'] : age < 10 ? ['contacted', 'confirmed', 'delivered', 'delivered'] : ['delivered', 'delivered', 'delivered', 'cancelled']);
      const n = orders.length + 1;
      const chosen = [...sellable].sort(() => rnd() - 0.5).slice(0, 1 + Math.floor(rnd() * 3));
      const its = chosen.map((p) => ({ productId: p.id, name: p.name, unitPrice: p.price, qty: 1 + (rnd() < 0.25 ? 1 : 0) }));
      its.forEach((it, j) => items.push({ id: uuid(NS.item, items.length + 1), orderId: uuid(NS.order, n), ...it, _j: j }));
      orders.push({
        id: uuid(NS.order, n), code: code(), customerId: pick(customers).id, status, source: pick(['cart', 'cart', 'cart', 'product']),
        total: its.reduce((t, i) => t + i.unitPrice * i.qty, 0), notes: '', createdAt: d.toISOString(),
        followUpAt: null, deliveredAt: null,
      });
    }
  }
  // Le mois en cours doit toujours montrer des commandes ouvertes, quelle que soit la date.
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ['new', 'new', 'contacted', 'contacted', 'confirmed', 'confirmed', 'confirmed'].forEach((st, i) => { recent[i].status = st; });
  orders.forEach((o) => {
    if (['new', 'contacted', 'confirmed'].includes(o.status)) o.followUpAt = new Date(now.getTime() + Math.floor(rnd() * 5) * DAY).toISOString();
    if (o.status === 'delivered') o.deliveredAt = new Date(new Date(o.createdAt).getTime() + 2 * DAY).toISOString();
  });

  const review = (n, productN, author, role, text, rating, pub) => ({ id: uuid(NS.review, n), productId: uuid(NS.product, productN), author, role, text, rating, isPublished: pub, createdAt: new Date(now.getTime() - n * 4 * DAY).toISOString() });
  const reviews = [
    review(1, 1, 'Sofia M.', 'Cliente fidèle', 'Un sillage qui rappelle un jardin après la pluie. Livraison rapide et emballage soigné.', 5, true),
    review(2, 1, 'Amara O.', 'Acheteur vérifié', 'L’Oud Nocturne tient toute la soirée. On m’a demandé le nom trois fois.', 5, true),
    review(3, 2, 'Nadia T.', 'Acheteur vérifié', 'Rose de Mai est devenue mon parfum du quotidien, léger sans être fade.', 5, true),
    review(4, 5, 'Clarisse E.', 'Acheteur vérifié', 'Santal Velours est doux et enveloppant, exactement ce que je cherchais.', 4, true),
    review(5, 4, 'Jean-Paul K.', 'Client', 'Bon parfum mais la tenue est un peu courte à mon goût.', 3, false),
    review(6, 3, 'Lydie B.', 'Cadeau', 'Réponse immédiate sur WhatsApp et conseils précis pour choisir mon cadeau.', 5, false),
  ];

  const open = recent.slice(0, 7);
  const cust = (id) => customers.find((c) => c.id === id);
  const firstItem = (o) => items.find((i) => i.orderId === o.id)?.name;
  const at = (h) => { const d = new Date(now); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  const tasks = [
    { id: uuid(NS.task, 1), orderId: open[0].id, type: 'message', label: `Relancer ${cust(open[0].customerId).name}`, detail: `#${open[0].code} · ${firstItem(open[0])}`, dueAt: at(10), done: false },
    { id: uuid(NS.task, 2), orderId: open[2].id, type: 'call', label: `Appeler ${cust(open[2].customerId).name}`, detail: `#${open[2].code} · confirmer l’adresse`, dueAt: at(14), done: false },
    { id: uuid(NS.task, 3), orderId: open[4].id, type: 'delivery', label: `Préparer la livraison ${open[4].code}`, detail: `${cust(open[4].customerId).name} · ${firstItem(open[4])}`, dueAt: at(16), done: false },
    { id: uuid(NS.task, 4), orderId: null, type: 'stock', label: 'Réapprovisionner Ambre Solaire', detail: 'Stock bas : 3 flacons', dueAt: at(17), done: false },
  ];

  return { user, store, products, customers, orders, items, reviews, tasks };
}
