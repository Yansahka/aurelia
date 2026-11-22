import { OPEN_STAGES, STAGES, familyLabel } from './constants.js';
import { monthShort } from './format.js';

const monthKey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
const lastMonths = (n = 12) => { const now = new Date(); return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)); };
const enrich = (db, o) => ({ ...o, customerName: db.customers.find((c) => c.id === o.customerId)?.name, phone: db.customers.find((c) => c.id === o.customerId)?.phone, items: db.items.filter((i) => i.orderId === o.id) });

// Équivalent de GET /stats/overview (requêtes SQL d'agrégation côté backend).
export function overview(db) {
  const orders = db.orders;
  const now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const delivered = orders.filter((o) => o.status === 'delivered');
  const open = orders.filter((o) => OPEN_STAGES.includes(o.status));
  const closed = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));
  const sum = (a) => a.reduce((t, o) => t + o.total, 0);
  const prob = (k) => STAGES.find((s) => s.key === k).prob;

  const revenueByMonth = lastMonths().map((d) => ({ key: monthKey(d), label: monthShort(d), value: sum(delivered.filter((o) => monthKey(o.createdAt) === monthKey(d))) }));
  const stages = [...OPEN_STAGES, 'delivered'].map((k) => {
    const list = orders.filter((o) => o.status === k && (k !== 'delivered' || new Date(o.createdAt) >= mStart));
    return { key: k, count: list.length, value: sum(list) };
  });

  const nextOrder = open.filter((o) => o.status !== 'confirmed').sort((a, b) => b.total - a.total)[0] || open[0];
  const units = {};
  delivered.forEach((o) => db.items.filter((i) => i.orderId === o.id).forEach((i) => { const u = (units[i.productId] ||= { productId: i.productId, name: i.name, units: 0, revenue: 0 }); u.units += i.qty; u.revenue += i.qty * i.unitPrice; }));

  return {
    wonThisMonth: sum(delivered.filter((o) => new Date(o.createdAt) >= mStart)),
    wonCountThisMonth: delivered.filter((o) => new Date(o.createdAt) >= mStart).length,
    monthlyTarget: db.store.monthlyTarget,
    open: { count: open.length, value: sum(open) },
    weighted: Math.round(open.reduce((t, o) => t + o.total * prob(o.status), 0)),
    winRate: closed.length ? delivered.length / closed.length : 0,
    closed: { won: delivered.length, total: closed.length },
    revenueByMonth, stages,
    nextBest: nextOrder ? enrich(db, nextOrder) : null,
    topProducts: Object.values(units).sort((a, b) => b.units - a.units).slice(0, 5).map((u) => ({ ...u, image: db.products.find((p) => p.id === u.productId) })),
    closingSoon: open.filter((o) => o.followUpAt && Number.isFinite(Date.parse(o.followUpAt))).sort((a, b) => a.followUpAt.localeCompare(b.followUpAt)).slice(0, 4).map((o) => enrich(db, o)),
    newOrders: orders.filter((o) => o.status === 'new').length,
  };
}

// Équivalent de GET /stats/report?metric=&group=
export function report(db, { metric = 'revenue', group = 'month' }) {
  const prodOf = (id) => db.products.find((p) => p.id === id);
  const contrib = [];
  const months = lastMonths();
  const start = months[0], end = new Date(months[11].getFullYear(), months[11].getMonth() + 1, 1);
  db.orders.filter((o) => new Date(o.createdAt) >= start && new Date(o.createdAt) < end).forEach((o) => {
    const its = db.items.filter((i) => i.orderId === o.id);
    if (group === 'month') contrib.push({ key: monthKey(o.createdAt), label: monthShort(o.createdAt), o, amount: o.total });
    else if (group === 'product') its.forEach((i) => contrib.push({ key: i.productId, label: i.name, o, amount: i.qty * i.unitPrice }));
    else its.forEach((i) => { const p=prodOf(i.productId);const category=group==='category';const f=category?(p?.categoryId||'sans-categorie'):(p?.family||'autre'); contrib.push({ key:f,label:category?(p?.categoryName||'Sans categorie'):familyLabel(f),o,amount:i.qty*i.unitPrice }); });
  });
  const keys = group === 'month' ? months.map((d) => ({ key: monthKey(d), label: monthShort(d) })) : [...new Map(contrib.map((c) => [c.key, { key: c.key, label: c.label }])).values()];
  const agg = (list) => {
    const won = list.filter((c) => c.o.status === 'delivered'), lost = list.filter((c) => c.o.status === 'cancelled');
    const ids = new Set(won.map((c) => c.o.id)), revenue = won.reduce((t, c) => t + c.amount, 0);
    const closed = new Set([...won, ...lost].map((c) => c.o.id)).size;
    return { revenue, orders: ids.size, winrate: closed ? ids.size / closed : 0, avg: ids.size ? revenue / ids.size : 0 };
  };
  let rows = keys.map((k) => ({ ...k, value: agg(contrib.filter((c) => c.key === k.key))[metric] }));
  if (group !== 'month') rows = rows.sort((a, b) => b.value - a.value);
  const total = agg(contrib)[metric];
  const sumVal = rows.reduce((t, r) => t + r.value, 0);
  rows = rows.map((r) => ({ ...r, share: metric === 'revenue' && sumVal ? r.value / sumVal : null }));
  const highest = rows.reduce((b, r) => (r.value > (b?.value ?? -1) ? r : b), null);
  return { metric, group, total, highest, rows };
}
export { enrich };
