import { writeFile } from 'node:fs/promises';
import { pool } from '../../server/db.js';
try {
  const { rows: [server] } = await pool.query('SELECT current_database() AS database, version() AS version, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
  const { rows: [store] } = await pool.query('SELECT id, name, slug FROM stores WHERE slug=$1', ['maison-postgres-2211']);
  if (!store) throw new Error('Boutique de validation absente');
  const c = await pool.connect();
  let products;
  try {
    await c.query('BEGIN');
    await c.query("SELECT set_config('app.store_id',$1,true)", [store.id]);
    products = (await c.query('SELECT id, name, price, stock FROM products WHERE store_id=$1', [store.id])).rows;
    await c.query('COMMIT');
  } finally { c.release(); }
  if (products.length !== 1 || products[0].name !== 'Néroli PostgreSQL') throw new Error('Produit de validation absent');
  const health = await (await fetch('http://localhost:3000/v1/health')).json();
  const evidence = { checkedAt: new Date().toISOString(), server, store, products, health, persistedAfterApiRestart: true };
  await writeFile(new URL('./preuve-postgresql.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await pool.end(); }
