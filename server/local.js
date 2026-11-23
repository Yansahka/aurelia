import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createLocalPool } from './local-pool.js';
import { createApp } from './app.js';
import { acquireLocalLock } from './local-lock.js';
const dir=fileURLToPath(new URL('../.local/postgres',import.meta.url));
await mkdir(dir,{recursive:true});
const unlock=await acquireLocalLock(fileURLToPath(new URL('../.local/server.lock',import.meta.url)));
let pool;
try { pool=await createLocalPool(dir); }
catch { await unlock(); console.error('Impossible de rouvrir la base locale. Les fichiers sont conservés dans .local/postgres.'); process.exit(1); }
const port=Number(process.env.PORT||3000);
const app=createApp(pool);
const server=app.listen(port, '127.0.0.1',()=>{
  console.log(`Aurelia local : http://localhost:${port}`);
  console.log('PostgreSQL embarqué PGlite · données persistantes dans .local/postgres · usage local uniquement.');
});
server.on('error',async()=>{await pool.end();await unlock();console.error('Le port du serveur local est indisponible.');process.exit(1);});
let closing=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(closing)return;closing=true;server.close(async()=>{await app.locals.flushMail();await pool.end();await unlock();process.exit(0);});});
