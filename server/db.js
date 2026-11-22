import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'node:fs';

if (!process.env.DATABASE_URL && !process.env.PGDATABASE) throw new Error('Connexion manquante : renseignez PGDATABASE, PGUSER et PGPASSWORD dans .env.');
export const pool = new pg.Pool({
  ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
    host: process.env.PGHOST || 'localhost', port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE, user: process.env.PGUSER, password: process.env.PGPASSWORD,
  }),
  ...(process.env.PGSSLROOTCERT ? { ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.PGSSLROOTCERT, 'utf8') } } : {}),
  max: 10, connectionTimeoutMillis: 5000,
});
pool.on('error', () => console.error('Connexion PostgreSQL interrompue.'));
