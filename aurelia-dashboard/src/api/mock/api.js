import { buildSeed } from './seed';
import { enrich, overview, report } from './stats';

// Base fictive en mémoire (persistée dans localStorage pour la démo).
const KEY = 'mockdb:v1';
let db;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
if (!db || !db.store) db = buildSeed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } };
const out = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));
const find = (list, id) => list.find((x) => x.id === id);

const withStats = (p) => p;
export const mockApi = {
  me: () => out(db.user),
  store: {
    get: () => out(db.store),
    update: (patch) => { Object.assign(db.store, patch); save(); return out(db.store); },
  },
  products: {
    list: () => out(db.products.filter((p) => !p.deletedAt).map(withStats)),
    create: (data) => { const p = { id: crypto.randomUUID(), image: '', palette: ['#c9a27a', '#5b3a1e'], shape: 0, bg: '#efe3c9', ...data }; db.products.unshift(p); save(); return out(p); },
    update: (id, patch) => { Object.assign(find(db.products, id), patch); save(); return out(find(db.products, id)); },
    remove: (id) => { find(db.products, id).deletedAt = new Date().toISOString(); save(); return out({ id }); },   // suppression douce
    restore: (id) => { delete find(db.products, id).deletedAt; save(); return out({ id }); },
  },
  orders: {
    list: () => out(db.orders.map((o) => enrich(db, o)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    updateStatus: (id, status) => { const o = find(db.orders, id); o.status = status; o.deliveredAt = status === 'delivered' ? new Date().toISOString() : null; save(); return out(enrich(db, o)); },
    update: (id, patch) => { Object.assign(find(db.orders, id), patch); save(); return out(enrich(db, find(db.orders, id))); },
  },
  customers: {
    list: () => out(db.customers.map((c) => {
      const os = db.orders.filter((o) => o.customerId === c.id), won = os.filter((o) => o.status === 'delivered');
      return { ...c, orders: os.length, spent: won.reduce((t, o) => t + o.total, 0), lastOrderAt: os.map((o) => o.createdAt).sort().pop() || null };
    })),
  },
  reviews: {
    list: () => out(db.reviews.map((r) => ({ ...r, productName: find(db.products, r.productId)?.name || '—' }))),
    setPublished: (id, v) => { find(db.reviews, id).isPublished = v; save(); return out({ id }); },
  },
  tasks: {
    list: () => out(db.tasks),
    toggle: (id) => { const t = find(db.tasks, id); t.done = !t.done; save(); return out(t); },
  },
  stats: {
    overview: () => out(overview(db)),
    report: (params) => out(report(db, params)),
  },
};
