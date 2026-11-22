// Génère database/seed.sql à partir des mêmes données fictives que le mock :  npm run export:sql
import { buildSeed } from '../src/api/mock/seed.js';

const d = buildSeed();
const q = (v) => (v === null || v === undefined || v === '' ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `ARRAY[${a.map(q).join(',')}]::text[]`;
const insert = (table, cols, rows) => rows.length ? `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${rows.map((r) => '  (' + r.join(', ') + ')').join(',\n')};\n` : '';

const out = ['-- Données de démonstration (générées par scripts/export-seed-sql.mjs)', 'BEGIN;'];
out.push(insert('users', ['id', 'email', 'name', 'password_hash'], [[q(d.user.id), q(d.user.email), q(d.user.name), q('$2b$10$CHANGE_ME_demo_hash_not_for_production')]]));
const s = d.store;
out.push(insert('stores', ['id', 'owner_id', 'slug', 'name', 'tagline', 'currency', 'locale', 'whatsapp_number', 'whatsapp_message', 'share_message', 'monthly_target', 'plan_code', 'status'],
  [[q(s.id), q(s.ownerId), q(s.slug), q(s.name), q(s.tagline), q(s.currency), q(s.locale), q(s.whatsapp), q(s.whatsappMessage), q(s.shareMessage), s.monthlyTarget, q(s.plan), q(s.status)]]));
out.push(insert('products', ['id', 'store_id', 'name', 'slug', 'tagline', 'price', 'old_price', 'size_label', 'note', 'family', 'badge', 'stock', 'is_active', 'is_featured', 'is_new', 'palette', 'shape', 'bg_color', 'image_url'],
  d.products.map((p) => [q(p.id), q(s.id), q(p.name), q(p.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')), q(p.tagline), p.price, q(p.oldPrice), q(p.size), q(p.note), q(p.family), q(p.badge), p.stock, q(p.isActive), q(p.isFeatured), q(p.isNew), arr(p.palette), p.shape, q(p.bg), q(p.image)])));
out.push(insert('customers', ['id', 'store_id', 'name', 'phone'], d.customers.map((c) => [q(c.id), q(s.id), q(c.name), q(c.phone)])));
out.push(insert('orders', ['id', 'store_id', 'customer_id', 'code', 'status', 'source', 'total', 'notes', 'follow_up_at', 'delivered_at', 'created_at'],
  d.orders.map((o) => [q(o.id), q(s.id), q(o.customerId), q(o.code), q(o.status), q(o.source), o.total, q(o.notes), q(o.followUpAt), q(o.deliveredAt), q(o.createdAt)])));
out.push(insert('order_items', ['id', 'order_id', 'product_id', 'name_snapshot', 'unit_price', 'qty'], d.items.map((i) => [q(i.id), q(i.orderId), q(i.productId), q(i.name), i.unitPrice, i.qty])));
out.push(insert('reviews', ['id', 'store_id', 'product_id', 'author', 'role', 'text', 'rating', 'is_published', 'created_at'], d.reviews.map((r) => [q(r.id), q(s.id), q(r.productId), q(r.author), q(r.role), q(r.text), r.rating, q(r.isPublished), q(r.createdAt)])));
out.push(insert('tasks', ['id', 'store_id', 'order_id', 'type', 'label', 'detail', 'due_at'], d.tasks.map((t) => [q(t.id), q(s.id), q(t.orderId), q(t.type), q(t.label), q(t.detail), q(t.dueAt)])));
out.push('COMMIT;');
console.log(out.join('\n'));
