import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { pool } from './db.js';
import { createApp } from './app.js';

// Integration native : conserve uniquement les comptes de test identifies ci-dessous.
const suffix = `${Date.now()}-${randomBytes(2).toString('hex')}`;
const password = randomBytes(24).toString('hex');
const server = createApp(pool, { authLimit: 200, quiet: true }).listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/v1`;
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; console.log(`OK ${message}`); };
async function req(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(base + path, { method, headers: {
    Origin: 'http://localhost:3000', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
try {
  const { rows: [info] } = await pool.query('SELECT current_database() AS database, version() AS version, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
  check(info.version.includes('PostgreSQL') && !info.version.includes('PGlite'), 'Connexion au serveur PostgreSQL natif');
  check(!info.rolsuper && !info.rolbypassrls, 'Role applicatif sans privileges permettant de contourner RLS');
  const account = n => ({ name: `Validation PostgreSQL ${n}`, storeName: `Boutique PostgreSQL ${n}`, slug: `pg-${n}-${suffix}`, email: `pg-${n}-${suffix}@example.test`, password, whatsapp: '237690000000' });
  const a = await req('/auth/register', { method: 'POST', body: account('a') });
  check(a.status === 201, 'Inscription : utilisateur, boutique et session crees ensemble');
  const slug = a.body.store.slug;
  check((await req('/products', { cookie: a.cookie })).body.items.length === 0, 'Nouveau dashboard vide');
  const b = await req('/auth/register', { method: 'POST', body: account('b') });
  check(b.status === 201, 'Deuxieme boutique independante creee');
  const product = await req('/products', { method: 'POST', cookie: a.cookie, body: { name: 'Parfum validation PostgreSQL', price: 25000, stock: 10, family: 'bois', isActive: true } });
  check(product.status === 201, 'Creation du premier produit');
  const home = await req(`/public/stores/${slug}/home`);
  check(home.status === 200 && home.body.products[0].id === product.body.id, 'Boutique partageable et catalogue public');
  check((await req('/products', { cookie: b.cookie })).body.items.length === 0, 'Catalogue du second vendeur toujours vide');
  check((await req(`/products/${product.body.id}`, { method: 'PATCH', cookie: b.cookie, body: { price: 1 } })).status === 404, 'Modification inter-boutiques refusee');
  const order = await req(`/public/stores/${slug}/orders`, { method: 'POST', body: { customerName: 'Client validation PostgreSQL', phone: '237690000001', items: [{ productId: product.body.id, qty: 2 }], total: 1 } });
  check(order.status === 201, 'Commande publique enregistree');
  const orders = await req('/orders', { cookie: a.cookie });
  check(orders.body.items.length === 1 && orders.body.items[0].total === 50000, 'Commande visible et prix recalcule a 50000 FCFA');
  check((await req('/orders', { cookie: b.cookie })).body.items.length === 0, 'Commandes isolees entre vendeurs');
  check((await pool.query('SELECT id FROM products')).rows.length === 0, 'RLS PostgreSQL refuse les lectures sans contexte boutique');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SELECT set_config('app.store_id',$1,true)", [a.body.store.id]);
    const scoped = (await c.query('SELECT id FROM products')).rows;
    check(scoped.length === 1 && scoped[0].id === product.body.id, 'RLS PostgreSQL limite la lecture au vendeur courant');
    await c.query('COMMIT');
  } finally { c.release(); }
  check((await req('/auth/logout', { method: 'POST', body: {}, cookie: a.cookie })).status === 204, 'Deconnexion');
  check((await req('/auth/me', { cookie: a.cookie })).status === 401, 'Session revoquee cote serveur');
  const login = await req('/auth/login', { method: 'POST', body: { email: account('a').email, password } });
  check(login.status === 200 && (await req('/products', { cookie: login.cookie })).body.items[0].id === product.body.id, 'Reconnexion : boutique et produit conserves');
  console.log(JSON.stringify({ checks, database: info.database, stores: [slug, b.body.store.slug], productId: product.body.id }, null, 2));
} finally {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
}
