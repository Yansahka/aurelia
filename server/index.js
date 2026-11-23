import { pool } from './db.js';
import { createApp } from './app.js';
const port = Number(process.env.PORT || 3000);
try {
  await pool.query('SELECT 1');
  const { rows: [role] } = await pool.query('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
  if (role.rolsuper || role.rolbypassrls) throw new Error('Utiliser le compte SQL limité : npm run db:setup-local');
} catch (error) {
  console.error('Demarrage PostgreSQL impossible :', error.code || error.message);
  await pool.end();
  process.exit(1);
}
const app=createApp(pool);
const server = app.listen(port, () => console.log(`Aurelia : http://localhost:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await app.locals.flushMail();await pool.end(); process.exit(0); }));
