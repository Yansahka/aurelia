import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { pool } from './db.js';
import { row } from './data.js';

const products = [
  { name:'Rose de Minuit', tagline:'Une rose veloutée aux accents délicats.', price:25000, stock:15, size:'50 ml', note:'Rose', family:'fleurs', badge:'Nouveau', isNew:true },
  { name:'Oud Impérial', tagline:'Un bois profond au caractère intense.', price:65000, stock:3, size:'100 ml', note:'Oud', family:'bois', badge:'Coup de cœur', isFeatured:true },
  { name:'Ambre Doré', tagline:'Une fragrance chaude et enveloppante.', price:32000, oldPrice:40000, stock:12, size:'50 ml', note:'Ambre', family:'ambre', badge:'Promotion' },
  { name:'Citron Soleil', tagline:'Une fraîcheur pétillante pour le quotidien.', price:18500, stock:25, size:'30 ml', note:'Citron', family:'frais' },
  { name:'Jasmin Blanc', tagline:'Un bouquet floral lumineux.', price:28000, stock:0, size:'50 ml', note:'Jasmin', family:'fleurs' },
  { name:'Cèdre Sauvage', tagline:'Des notes boisées sèches et élégantes.', price:35000, stock:1, size:'75 ml', note:'Cèdre', family:'bois', badge:'Nouveau' },
  { name:'Vanille Ambrée', tagline:'Une douceur vanillée aux nuances chaudes.', price:22500, oldPrice:27500, stock:8, size:'50 ml', note:'Vanille', family:'ambre', badge:'Promotion' },
  { name:'Bergamote Secrète', tagline:'Une composition fraîche encore en préparation.', price:29900, stock:10, size:'100 ml', note:'Bergamote', family:'frais', isActive:false },
].map(p=>({oldPrice:null,badge:null,isActive:true,isFeatured:false,isNew:false,...p}));

const c = await pool.connect();
let store, saved;
try {
  await c.query('BEGIN');
  const stores = (await c.query('SELECT id,name,slug,status FROM stores WHERE id=$1 AND slug=$2 FOR UPDATE', ['74e15809-bcae-4e5f-95da-8735d7fa7d59','yanshop'])).rows;
  assert.equal(stores.length,1,'Yanshop introuvable : aucune autre boutique ne sera modifiee');
  store=stores[0]; assert.equal(store.status,'active');
  await c.query("SELECT set_config('app.store_id',$1,true)", [store.id]);
  const existing=(await c.query('SELECT * FROM products WHERE store_id=$1 AND name=ANY($2::text[])', [store.id,products.map(p=>p.name)])).rows;
  assert.ok(existing.length===0 || existing.length===8,'Import partiel ou noms deja utilises : verifier avant de relancer');
  if (existing.length===0) {
    for (const [position,p] of products.entries()) {
      await c.query(`INSERT INTO products(store_id,slug,name,tagline,price,old_price,stock,size_label,note,family,badge,is_active,is_featured,is_new,position)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [store.id,p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-'),p.name,p.tagline,p.price,p.oldPrice,p.stock,p.size,p.note,p.family,p.badge,p.isActive,p.isFeatured,p.isNew,position]);
    }
  }
  saved=(await c.query('SELECT * FROM products WHERE store_id=$1 AND name=ANY($2::text[]) ORDER BY position',[store.id,products.map(p=>p.name)])).rows.map(row);
  assert.equal(saved.length,8);
  for (const expected of products) {
    const actual=saved.find(p=>p.name===expected.name);
    assert.ok(actual && !actual.deletedAt);
    for (const [key,value] of Object.entries(expected)) assert.deepEqual(actual[key],value,`${expected.name}: ${key}`);
  }
  await c.query('COMMIT');
} catch (error) {await c.query('ROLLBACK'); throw error;}
finally {c.release();await pool.end();}

const response=await fetch('http://localhost:3000/v1/public/stores/yanshop/home');
assert.equal(response.status,200);
const home=await response.json();
const expectedPublic=products.filter(p=>p.isActive);
for (const expected of expectedPublic) {
  const actual=home.products.find(p=>p.name===expected.name);
  assert.ok(actual,`Produit public absent: ${expected.name}`);
  for (const [key,value] of Object.entries(expected)) assert.deepEqual(actual[key],value,`${expected.name} public: ${key}`);
}
assert.ok(!home.products.some(p=>p.name==='Bergamote Secrète'));
assert.ok(home.featured.productIds.includes(saved.find(p=>p.name==='Oud Impérial').id));
assert.equal(home.newArrival.productId,saved.find(p=>p.name==='Rose de Minuit').id);
assert.equal(products.find(p=>p.name==='Rose de Minuit').price*2+products.find(p=>p.name==='Citron Soleil').price,68500);
const report={checkedAt:new Date().toISOString(),store,createdOrVerified:8,publicProductsVerified:7,hiddenProduct:'Bergamote Secrète',publicUrl:'http://localhost:3000/s/yanshop',products:saved.map(({id,name,price,oldPrice,stock,size,note,family,badge,isActive,isFeatured,isNew})=>({id,name,price,oldPrice,stock,size,note,family,badge,isActive,isFeatured,isNew}))};
await mkdir('docs/validation-2026-11-22',{recursive:true});
await writeFile('docs/validation-2026-11-22/produits-yanshop.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
