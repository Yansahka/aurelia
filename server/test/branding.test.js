import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createApp } from '../app.js';
import { createLocalPool } from '../local-pool.js';
import { brandStyle, contrast } from '../../shared/branding.js';

test('Identite des boutiques et fiches produit partageables',async t=>{
 const native=process.env.AURELIA_BRANDING_NATIVE==='1';
 const pool=native?(await import('../db.js')).pool:await createLocalPool();
 const server=createApp(pool,{quiet:true,authLimit:200}).listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
 const base=`http://127.0.0.1:${server.address().port}`,suffix=randomUUID().slice(0,8);
 const req=async(path,{method='GET',cookie,body}={})=>{const r=await fetch(base+'/v1'+path,{method,headers:{Origin:'http://localhost:3000','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();return {status:r.status,body:text?JSON.parse(text):null,cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const register=n=>req('/auth/register',{method:'POST',body:{name:'Validation identite',email:`identite-${n}-${suffix}@example.test`,password:'Identite-Test-Local-2026!',storeName:`Identité ${n}`,slug:`identite-${n}-${suffix}`,whatsapp:'237690000000'}});
 let a,b,p;
 const branding={logoUrl:'https://images.example.test/logo.png',coverUrl:'https://images.example.test/cover.jpg',accentColor:'#d8b46b',backgroundColor:'#141b24',textColor:'#edf1f5',heroTitle:'Votre collection, votre univers'};
 await t.test('Valeurs initiales compatibles et boutiques independantes',async()=>{
  a=await register('a');b=await register('b');assert.equal(a.status,201);assert.equal(b.status,201);
  const store=(await req('/store',{cookie:a.cookie})).body;assert.equal(store.logoUrl,null);assert.equal(store.accentColor,'#2b1620');
  assert.equal((await req('/store',{method:'PATCH',body:branding})).status,401);
 });
 await t.test('Sauvegarde et publication de l identite sans toucher au second vendeur',async()=>{
  const updated=await req('/store',{method:'PATCH',cookie:a.cookie,body:{...branding,id:b.body.store.id,ownerId:b.body.user.id}});assert.equal(updated.status,200,JSON.stringify(updated.body));
  assert.equal(updated.body.id,a.body.store.id);
  const publicStore=(await req(`/public/stores/${a.body.store.slug}/home`)).body.store;
  for(const [key,value] of Object.entries(branding)){if(key==='heroTitle')assert.equal(publicStore.hero.title,value);else assert.equal(publicStore[key],value);}
  assert.equal(publicStore.ownerId,undefined);
  const other=(await req('/store',{cookie:b.cookie})).body;assert.equal(other.logoUrl,null);assert.equal(other.backgroundColor,'#f6f0e7');
 });
 await t.test('Couleurs et URL invalides rejetees sans modification partielle',async()=>{
  for(const patch of [{logoUrl:'javascript:alert(1)'},{coverUrl:'http://images.example.test/cover.jpg'},{logoUrl:'https://user:secret@example.test/logo.png'},{accentColor:'red;background:url(x)'},{textColor:'#141b24',backgroundColor:'#141b24'},{backgroundColor:'#eeeeee',textColor:'#eeeeed'}]){
   assert.equal((await req('/store',{method:'PATCH',cookie:a.cookie,body:{name:'Ne doit pas être sauvegardé',...patch}})).status,400);
  }
  const actual=(await req('/store',{cookie:a.cookie})).body;assert.equal(actual.name,'Identité a');assert.equal(actual.logoUrl,branding.logoUrl);
 });
 await t.test('Fiche publique : galerie, description, reference et bon prix',async()=>{
  const created=await req('/products',{method:'POST',cookie:a.cookie,body:{name:'Sac Horizon',price:35000,oldPrice:40000,stock:3,reference:'SAC-001',description:'Un sac pour le quotidien.',attributes:{Matière:'Coton'},images:['https://images.example.test/sac1.jpg','https://images.example.test/sac2.jpg']}});assert.equal(created.status,201);p=created.body;
  const detail=await req(`/public/stores/${a.body.store.slug}/products/${p.id}`);assert.equal(detail.status,200);assert.equal(detail.body.product.price,35000);assert.equal(detail.body.product.reference,'SAC-001');assert.equal(detail.body.product.images.length,2);assert.deepEqual(detail.body.reviews,[]);
  assert.equal((await req(`/public/stores/${b.body.store.slug}/products/${p.id}`)).status,404);
  const page=await fetch(`${base}/s/${a.body.store.slug}/p/${p.id}`);assert.equal(page.status,200);assert.match(await page.text(),/<div id="root">/);
 });
 await t.test('Avis du produit uniquement publies et prix commande calcules cote serveur',async()=>{
  const c=await pool.connect();try{await c.query('BEGIN');await c.query("SELECT set_config('app.store_id',$1,true)",[a.body.store.id]);await c.query("INSERT INTO reviews(store_id,product_id,author,text,rating,is_published) VALUES($1,$2,'Client public','Très bien',5,true),($1,$2,'Client privé','Non publié',2,false)",[a.body.store.id,p.id]);await c.query('COMMIT');}finally{c.release();}
  const detail=(await req(`/public/stores/${a.body.store.slug}/products/${p.id}`)).body;assert.equal(detail.reviews.length,1);assert.equal(detail.reviews[0].author,'Client public');
  const order=await req(`/public/stores/${a.body.store.slug}/orders`,{method:'POST',body:{customerName:'Client test',phone:'237690000001',items:[{productId:p.id,qty:2}],total:1}});assert.equal(order.status,201);assert.equal(order.body.total,70000);
  assert.equal((await req(`/public/stores/${a.body.store.slug}/orders`,{method:'POST',body:{customerName:'Client test',phone:'237690000001',items:[{productId:p.id,qty:4}]}})).status,409);
 });
 await t.test('Fiche retiree pour un produit masque ou supprime ; suppression du logo et couverture',async()=>{
  await req('/products/'+p.id,{method:'PATCH',cookie:a.cookie,body:{isActive:false}});assert.equal((await req(`/public/stores/${a.body.store.slug}/products/${p.id}`)).status,404);
  await req('/products/'+p.id,{method:'PATCH',cookie:a.cookie,body:{isActive:true}});await req('/products/'+p.id,{method:'DELETE',cookie:a.cookie});assert.equal((await req(`/public/stores/${a.body.store.slug}/products/${p.id}`)).status,404);
  const cleared=await req('/store',{method:'PATCH',cookie:a.cookie,body:{logoUrl:null,coverUrl:'',heroTitle:''}});assert.equal(cleared.status,200);assert.equal(cleared.body.logoUrl,null);assert.equal(cleared.body.coverUrl,null);assert.equal(cleared.body.heroTitle,'');
 });
 if(native)console.log('Boutiques de validation conservees :',a.body.store.slug,b.body.store.slug);
});
test('Les couleurs de bouton restent lisibles pour les accents clairs et sombres',()=>{
 for(const accentColor of ['#ffffff','#000000','#ffff00','#d8b46b','#205a86']){const style=brandStyle({accentColor});assert.ok(contrast(accentColor,style['--brand-on-accent'])>=4.5);}
});
