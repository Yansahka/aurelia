import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm';
test('Migration 007 : comptes, mots de passe, sessions et données existants conservés',async()=>{
 const db=new PGlite({extensions:{pgcrypto,pg_trgm}});await db.waitReady;try{
  for(const path of ['../../aurelia-dashboard/database/schema.sql','../migrations/002-sessions.sql','../migrations/003-universal-catalogue.sql','../migrations/004-store-branding.sql','../migrations/005-product-variants.sql','../migrations/006-local-media.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
  const user=(await db.query("INSERT INTO users(name,email,password_hash) VALUES('Vendeur existant','ancien@example.test','hash-a-conserver') RETURNING *")).rows[0];
  const store=(await db.query("INSERT INTO stores(owner_id,name,slug,whatsapp_number) VALUES($1,'Boutique existante','boutique-existante','237690000000') RETURNING *",[user.id])).rows[0];
  const product=(await db.query("INSERT INTO products(store_id,slug,name,price,stock) VALUES($1,'ancien','Produit existant',25000,3) RETURNING *",[store.id])).rows[0];
  const session=(await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES('session-a-conserver',$1,now()+interval '1 day') RETURNING *",[user.id])).rows[0];
  await db.exec(await readFile(new URL('../migrations/007-account-security.sql',import.meta.url),'utf8'));
  for(const [table,original,primary] of [['users',user,'id'],['stores',store,'id'],['products',product,'id'],['sessions',session,'token_hash']]){const current=(await db.query(`SELECT * FROM ${table} WHERE ${primary}=$1`,[original[primary]])).rows[0];for(const [key,value] of Object.entries(original))assert.deepEqual(current[key],value,table+'.'+key);}
  assert.equal((await db.query('SELECT email_verified_at FROM users WHERE id=$1',[user.id])).rows[0].email_verified_at,null);assert.deepEqual((await db.query('SELECT * FROM account_tokens')).rows,[]);
 }finally{await db.close();}
});
