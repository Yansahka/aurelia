import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
test('Migration 003 : reprise des parfums sans modification des champs historiques',async()=>{
 const db=new PGlite({extensions:{pgcrypto,pg_trgm}});await db.waitReady;
 try {
  for(const path of ['../../aurelia-dashboard/database/schema.sql','../migrations/002-sessions.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
  const user=(await db.query("INSERT INTO users(email,name,password_hash) VALUES('migration@example.test','Ancien vendeur','test-hash') RETURNING id")).rows[0];
  const store=(await db.query("INSERT INTO stores(owner_id,name,slug,whatsapp_number) VALUES($1,'Ancienne boutique','ancienne-boutique','237690000000') RETURNING id",[user.id])).rows[0];
  const original=(await db.query("INSERT INTO products(store_id,slug,name,price,stock,note,size_label,family,image_url) VALUES($1,'rose','Rose historique',25000,15,'Rose','50 ml','fleurs','https://images.example.test/rose.jpg') RETURNING *",[store.id])).rows[0];
  await db.exec('BEGIN');await db.exec(await readFile(new URL('../migrations/003-universal-catalogue.sql',import.meta.url),'utf8'));await db.exec('COMMIT');
  const actual=(await db.query('SELECT * FROM products WHERE id=$1',[original.id])).rows[0];
  for(const [key,value] of Object.entries(original))assert.deepEqual(actual[key],value,key);
  assert.deepEqual(actual.attributes,{'Note principale':'Rose'});assert.ok(actual.category_id);
  assert.equal((await db.query('SELECT name FROM categories WHERE id=$1',[actual.category_id])).rows[0].name,'Fleurs');
  assert.deepEqual((await db.query('SELECT url,position FROM product_images WHERE product_id=$1',[original.id])).rows,[{url:original.image_url,position:0}]);
 } finally {await db.close();}
});
