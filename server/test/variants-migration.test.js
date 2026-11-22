import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm';
test('Migration 005 : produits simples et commandes historiques conserves',async()=>{
 const db=new PGlite({extensions:{pgcrypto,pg_trgm}});await db.waitReady;
 try{
  for(const path of ['../../aurelia-dashboard/database/schema.sql','../migrations/002-sessions.sql','../migrations/003-universal-catalogue.sql','../migrations/004-store-branding.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
  const u=(await db.query("INSERT INTO users(name,email,password_hash) VALUES('Vendeur','migration-variant@example.test','test') RETURNING id")).rows[0];
  const s=(await db.query("INSERT INTO stores(owner_id,name,slug,whatsapp_number) VALUES($1,'Boutique','boutique-migration','237690000000') RETURNING *",[u.id])).rows[0];
  const p=(await db.query("INSERT INTO products(store_id,slug,name,price,stock) VALUES($1,'rose','Rose existante',25000,15) RETURNING *",[s.id])).rows[0];
  const customer=(await db.query("INSERT INTO customers(store_id,name,phone) VALUES($1,'Client','237690000001') RETURNING id",[s.id])).rows[0];
  const order=(await db.query("INSERT INTO orders(store_id,customer_id,code,total) VALUES($1,$2,'OLD-001',50000) RETURNING *",[s.id,customer.id])).rows[0];
  const item=(await db.query('INSERT INTO order_items(order_id,product_id,name_snapshot,unit_price,qty) VALUES($1,$2,$3,25000,2) RETURNING *',[order.id,p.id,p.name])).rows[0];
  await db.exec('BEGIN');await db.exec(await readFile(new URL('../migrations/005-product-variants.sql',import.meta.url),'utf8'));await db.exec('COMMIT');
  for(const [table,original] of [['stores',s],['products',p],['orders',order],['order_items',item]]){const current=(await db.query(`SELECT * FROM ${table} WHERE id=$1`,[original.id])).rows[0];for(const [key,value] of Object.entries(original))assert.deepEqual(current[key],value,table+'.'+key);}
  assert.equal((await db.query('SELECT has_variants FROM products WHERE id=$1',[p.id])).rows[0].has_variants,false);assert.equal((await db.query('SELECT * FROM product_variants')).rows.length,0);
 }finally{await db.close();}
});
