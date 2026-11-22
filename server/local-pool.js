// PostgreSQL embarqué pour le développement et les tests ; aucune donnée fictive.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFile } from 'node:fs/promises';

export async function createLocalPool(dataDir) {
  const db = new PGlite({ dataDir, extensions: { pgcrypto, pg_trgm } });
  await db.waitReady;
  await db.exec('CREATE TABLE IF NOT EXISTS aurelia_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  const applied=(await db.query('SELECT name FROM aurelia_migrations')).rows.map(r=>r.name);
  await db.exec('BEGIN');
  try {
    for (const [name,path] of [['001-schema','../aurelia-dashboard/database/schema.sql'],['002-sessions','./migrations/002-sessions.sql'],['003-universal-catalogue','./migrations/003-universal-catalogue.sql'],['004-store-branding','./migrations/004-store-branding.sql'],['005-product-variants','./migrations/005-product-variants.sql']]) {
      if(!applied.includes(name)){
        await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
        await db.query('INSERT INTO aurelia_migrations(name) VALUES($1)',[name]);
      }
    }
    // Le serveur local tourne lui aussi sous un rôle sans privilège de contournement RLS.
    await db.exec("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='aurelia_local') THEN CREATE ROLE aurelia_local NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;");
    await db.exec('GRANT USAGE ON SCHEMA public TO aurelia_local; GRANT SELECT,INSERT,UPDATE,DELETE ON users,stores,products,categories,product_images,product_variants,customers,orders,order_items,reviews,tasks,events,sessions,newsletter_subscribers TO aurelia_local; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO aurelia_local; GRANT pg_checkpoint TO aurelia_local; COMMIT; SET ROLE aurelia_local;');
  } catch(e) {await db.exec('ROLLBACK');await db.close();throw e;}
  // PGlite n'a qu'une connexion : sérialiser les transactions entières, pas leurs requêtes.
  let tail=Promise.resolve();
  async function connect(){
    const prior=tail;let unlock;tail=new Promise(r=>{unlock=r;});await prior;
    let inTransaction=false;
    return {async query(sql,params){
      const result=await db.query(sql,params);
      if(/^\s*BEGIN\b/i.test(sql))inTransaction=true;
      if(/^\s*(COMMIT|ROLLBACK)\b/i.test(sql))inTransaction=false;
      // Le mode fichier local fixe un point de reprise après chaque écriture validée.
      // Cela évite de dépendre d’un arrêt propre du terminal Windows.
      if(dataDir && !inTransaction && /^\s*(COMMIT|INSERT|UPDATE|DELETE)\b/i.test(sql))await db.exec('CHECKPOINT');
      return result;
    },release:unlock};
  }
  return {
    connect,
    async query(sql,params){const c=await connect();try{return await c.query(sql,params);}finally{c.release();}},
    async end(){await tail;await db.close();},
  };
}
