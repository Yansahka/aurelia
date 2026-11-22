import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import { createLocalPool } from '../local-pool.js';

test('Catalogue universel : categories, photos, caracteristiques et isolation',async t=>{
 const native=process.env.AURELIA_CATALOGUE_NATIVE==='1';
 const pool=native?(await import('../db.js')).pool:await createLocalPool();
 const server=createApp(pool,{quiet:true,authLimit:200}).listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
 const base=`http://127.0.0.1:${server.address().port}/v1`,suffix=randomUUID().slice(0,8);
 const req=async(path,{method='GET',cookie,body}={})=>{
  const r=await fetch(base+path,{method,headers:{Origin:'http://localhost:3000','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await r.text();return {status:r.status,body:text?JSON.parse(text):null,cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 const register=async n=>req('/auth/register',{method:'POST',body:{name:'Validation catalogue',email:`catalogue-${n}-${suffix}@example.test`,password:'Catalogue-Test-Local-2026!',storeName:`Catalogue ${n}`,slug:`catalogue-${n}-${suffix}`,whatsapp:'237690000000'}});
 let a,b,ca,cb,p;
 await t.test('Deux nouvelles boutiques sans categories imposees',async()=>{
  a=await register('a');b=await register('b');assert.equal(a.status,201);assert.equal(b.status,201);
  assert.deepEqual((await req('/categories',{cookie:a.cookie})).body.items,[]);
  assert.equal((await req('/categories')).status,401);
 });
 await t.test('Categories libres, doublons et acces croises refuses',async()=>{
  ca=await req('/categories',{method:'POST',cookie:a.cookie,body:{name:'Vêtements'}});
  cb=await req('/categories',{method:'POST',cookie:b.cookie,body:{name:'Électronique'}});
  assert.equal(ca.status,201);assert.equal(cb.status,201);
  assert.equal((await req('/categories',{method:'POST',cookie:a.cookie,body:{name:'VÊTEMENTS'}})).status,409);
  assert.equal((await req('/categories/'+ca.body.id,{method:'PATCH',cookie:b.cookie,body:{name:'Volée'}})).status,404);
  assert.equal((await req('/categories/'+ca.body.id,{method:'DELETE',cookie:b.cookie})).status,404);
 });
 const photos=['https://images.example.test/t-shirt-front.jpg','https://images.example.test/t-shirt-back.jpg'];
 await t.test('Produit sans attribut de parfum, reference et galerie ordonnee',async()=>{
  p=await req('/products',{method:'POST',cookie:a.cookie,body:{name:'T-shirt en coton',price:12500,stock:8,reference:'TSH-001',description:'Coton doux. Lavage à 30 °C.',size:'Unité',categoryId:ca.body.id,attributes:{Matière:'Coton',Couleur:'Bleu'},images:photos}});
  assert.equal(p.status,201,JSON.stringify(p.body));assert.deepEqual(p.body.images,photos);assert.equal(p.body.image,photos[0]);assert.equal(p.body.categoryName,'Vêtements');assert.deepEqual(p.body.attributes,{Matière:'Coton',Couleur:'Bleu'});
  const publicData=(await req(`/public/stores/${a.body.store.slug}/home`)).body;
  assert.equal(publicData.collections[0].name,'Vêtements');assert.deepEqual(publicData.products[0].images,photos);assert.equal(publicData.products[0].reference,'TSH-001');
 });
 await t.test('Validation des photos et categories sans ecriture partielle',async()=>{
  for(const patch of [{categoryId:cb.body.id},{images:['javascript:alert(1)']},{images:['http://images.example.test/unsafe.jpg']},{images:Array(9).fill(photos[0])},{images:['https://user:password@example.test/image.jpg']},{attributes:{Poids:{value:2}}}]) {
   assert.equal((await req('/products/'+p.body.id,{method:'PATCH',cookie:a.cookie,body:patch})).status,400);
  }
  const unchanged=(await req('/products',{cookie:a.cookie})).body.items[0];assert.deepEqual(unchanged.images,photos);assert.equal(unchanged.categoryId,ca.body.id);
  assert.equal((await req('/products',{method:'POST',cookie:a.cookie,body:{name:'Doublon',price:10,reference:'tsh-001'}})).status,409);
  assert.equal((await req('/products',{cookie:a.cookie})).body.items.length,1);
 });
 await t.test('Mise a jour partielle conserve les photos ; ordre et suppression de photo',async()=>{
  const updated=await req('/products/'+p.body.id,{method:'PATCH',cookie:a.cookie,body:{stock:4}});assert.deepEqual(updated.body.images,photos);
  const reversed=await req('/products/'+p.body.id,{method:'PATCH',cookie:a.cookie,body:{images:[...photos].reverse()}});assert.equal(reversed.body.image,photos[1]);
  const removed=await req('/products/'+p.body.id,{method:'PATCH',cookie:a.cookie,body:{images:[photos[0]]}});assert.deepEqual(removed.body.images,[photos[0]]);
  assert.equal((await req('/products/'+p.body.id,{method:'PATCH',cookie:b.cookie,body:{images:[]}})).status,404);
 });
 await t.test('RLS et contrainte SQL empechent categories et photos inter-boutiques',async()=>{
  assert.equal((await pool.query('SELECT * FROM categories')).rows.length,0);assert.equal((await pool.query('SELECT * FROM product_images')).rows.length,0);
  const c=await pool.connect();try {
   await c.query('BEGIN');await c.query("SELECT set_config('app.store_id',$1,true)",[b.body.store.id]);
   assert.equal((await c.query('SELECT * FROM categories')).rows.length,1);assert.equal((await c.query('SELECT * FROM product_images')).rows.length,0);
   await assert.rejects(()=>c.query('INSERT INTO product_images(store_id,product_id,url,position) VALUES($1,$2,$3,0)',[b.body.store.id,p.body.id,photos[0]]));await c.query('ROLLBACK');
  }finally{c.release();}
 });
 await t.test('Commande et rapport par categorie : prix serveur et historique',async()=>{
  const order=await req(`/public/stores/${a.body.store.slug}/orders`,{method:'POST',body:{customerName:'Client de test',phone:'237690000001',items:[{productId:p.body.id,qty:2}],total:1}});assert.equal(order.status,201);assert.equal(order.body.total,25000);
  const orders=(await req('/orders',{cookie:a.cookie})).body.items;assert.equal(orders[0].items[0].name,'T-shirt en coton');
  assert.equal((await req('/orders/'+orders[0].id,{method:'PATCH',cookie:a.cookie,body:{status:'delivered'}})).status,200);
  const report=(await req('/stats/report?metric=revenue&group=category',{cookie:a.cookie})).body;assert.equal(report.total,25000);assert.equal(report.rows[0].label,'Vêtements');
 });
 await t.test('Renommage, categorie utilisee protegee, masquage et visuel sans photo',async()=>{
  assert.equal((await req('/categories/'+ca.body.id,{method:'DELETE',cookie:a.cookie})).status,409);
  assert.equal((await req('/categories/'+ca.body.id,{method:'PATCH',cookie:a.cookie,body:{name:'Mode'}})).status,200);
  assert.equal((await req('/products',{cookie:a.cookie})).body.items[0].categoryName,'Mode');
  const hidden=await req('/products/'+p.body.id,{method:'PATCH',cookie:a.cookie,body:{images:[],isActive:false}});assert.deepEqual(hidden.body.images,[]);assert.equal(hidden.body.image,null);
  assert.equal((await req(`/public/stores/${a.body.store.slug}/home`)).body.products.length,0);
  const empty=await req('/categories',{method:'POST',cookie:a.cookie,body:{name:'À retirer'}});assert.equal((await req('/categories/'+empty.body.id,{method:'DELETE',cookie:a.cookie})).status,204);
 });
 if(native)console.log('Boutiques PostgreSQL de validation conservees :',a.body.store.slug,b.body.store.slug);
});
