import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';
// La connexion propriétaire reste séparée du compte limité utilisé par l'API.
config({ path: '.env.migrations', quiet: true });
const { pool } = await import('./db.js');
const c = await pool.connect();
try {
  await c.query('BEGIN');
  await c.query("SELECT pg_advisory_xact_lock(7276191)");
  await c.query('CREATE TABLE IF NOT EXISTS aurelia_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  const applied = (await c.query('SELECT name FROM aurelia_migrations')).rows.map(r => r.name);
  const hasSchema = (await c.query("SELECT to_regclass('public.stores') AS name")).rows[0].name;
  if (!applied.includes('001-schema')) {
    if (!hasSchema) await c.query(await readFile(new URL('../aurelia-dashboard/database/schema.sql', import.meta.url), 'utf8'));
    await c.query('INSERT INTO aurelia_migrations(name) VALUES ($1)', ['001-schema']);
  }
  if (!applied.includes('002-sessions')) {
    await c.query(await readFile(new URL('./migrations/002-sessions.sql', import.meta.url), 'utf8'));
    await c.query('INSERT INTO aurelia_migrations(name) VALUES ($1)', ['002-sessions']);
  }
  await c.query('COMMIT');
  console.log('Migrations PostgreSQL appliquées.');
} catch (e) { await c.query('ROLLBACK'); console.error('Migration échouée :', e.code || e.message); process.exitCode = 1; }
finally { c.release(); await pool.end(); }
