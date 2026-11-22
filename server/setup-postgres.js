import { readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parse } from 'dotenv';
import pg from 'pg';

// Ne supprime aucune table et ne modifie aucun compte SQL existant.
const runtimeText = await readFile('.env', 'utf8');
try { await access('.env.migrations'); }
catch { await writeFile('.env.migrations', runtimeText, { flag: 'wx', mode: 0o600 }); }
const admin = parse(await readFile('.env.migrations', 'utf8'));
const migration = spawnSync(process.execPath, ['server/migrate.js'], { stdio: 'inherit', env: { ...process.env, ...admin } });
if (migration.status !== 0) process.exit(migration.status || 1);
const connection = env => env.DATABASE_URL ? { connectionString: env.DATABASE_URL } : {
  host: env.PGHOST || 'localhost', port: Number(env.PGPORT || 5432),
  database: env.PGDATABASE, user: env.PGUSER, password: env.PGPASSWORD,
};
const pool = new pg.Pool({ ...connection(admin), connectionTimeoutMillis: 5000 });
try {
  const current = parse(runtimeText);
  if (current.PGUSER?.startsWith('aurelia_app_')) {
    const runtime = new pg.Pool(connection(current));
    try {
      const { rows: [role] } = await runtime.query('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user');
      if (!role.rolsuper && !role.rolbypassrls) {
        console.log('Compte applicatif PostgreSQL deja configure.');
        process.exitCode = 0;
        // Le finally ferme les connexions, sans recreer de role au prochain lancement.
        await runtime.end();
        await pool.end();
        process.exit(0);
      }
    } finally { await runtime.end(); }
  }
  const role = `aurelia_app_${randomBytes(4).toString('hex')}`;
  const password = randomBytes(32).toString('hex');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    // Identifiant et secret generes uniquement en hexadecimal, jamais journalises.
    await c.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
    const { rows: [db] } = await c.query('SELECT current_database() AS name');
    await c.query(`GRANT CONNECT ON DATABASE "${db.name.replaceAll('"', '""')}" TO ${role}`);
    await c.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON users, stores, products, categories, product_images, customers, orders, order_items, reviews, tasks, events, sessions, newsletter_subscribers TO ${role}`);
    await c.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await c.query('COMMIT');
  } catch (error) { await c.query('ROLLBACK'); throw error; }
  finally { c.release(); }
  const config = connection(admin);
  if (admin.DATABASE_URL) {
    const url = new URL(admin.DATABASE_URL);
    config.host = url.hostname; config.port = url.port || 5432;
    config.database = decodeURIComponent(url.pathname.slice(1));
  }
  const quote = value => JSON.stringify(String(value));
  await writeFile('.env', [
    '# PostgreSQL local : compte applicatif limite. Secrets exclus de Git.',
    `PGHOST=${quote(config.host)}`, `PGPORT=${config.port}`, `PGDATABASE=${quote(config.database)}`,
    `PGUSER=${role}`, `PGPASSWORD=${password}`,
    `PORT=${current.PORT || 3000}`, 'NODE_ENV=development',
    `APP_ORIGINS=${current.APP_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:5174'}`, '',
  ].join('\n'), { mode: 0o600 });
  console.log('PostgreSQL configure : .env pour l API, .env.migrations pour les migrations.');
} catch (error) {
  console.error('Configuration PostgreSQL impossible :', error.code || error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
