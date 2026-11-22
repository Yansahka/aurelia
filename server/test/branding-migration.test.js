import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
test('Migration 004 : identite par defaut sans changer les anciennes donnees',async()=>{
 const db=new PGlite({extensions:{pgcrypto,pg_trgm}});await db.waitReady;
 try{
  for(const path of ['../../aurelia-dashboard/database/schema.sql','../migrations/002-sessions.sql','../migrations/003-universal-catalogue.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
  const user=(await db.query("INSERT INTO users(email,name,password_hash) VALUES('ancienne@example.test','Ancien vendeur','test') RETURNING id")).rows[0];
  const original=(await db.query("INSERT INTO stores(owner_id,name,slug,whatsapp_number) VALUES($1,'Boutique existante','boutique-existante','237690000000') RETURNING *",[user.id])).rows[0];
  const product=(await db.query("INSERT INTO products(store_id,slug,name,price,stock,reference,attributes) VALUES($1,'sac','Sac existant',35000,3,'SAC-001','{\"Matiere\":\"Coton\"}') RETURNING *",[original.id])).rows[0];
  await db.exec('BEGIN');await db.exec(await readFile(new URL('../migrations/004-store-branding.sql',import.meta.url),'utf8'));await db.exec('COMMIT');
  const actual=(await db.query('SELECT * FROM stores WHERE id=$1',[original.id])).rows[0];for(const [key,value] of Object.entries(original))assert.deepEqual(actual[key],value,key);
  assert.equal(actual.logo_url,null);assert.equal(actual.cover_url,null);assert.equal(actual.background_color,'#f6f0e7');
  assert.deepEqual((await db.query('SELECT * FROM products WHERE id=$1',[product.id])).rows[0],product);
 }finally{await db.close();}
});
