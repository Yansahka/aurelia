import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import sharp from 'sharp';
import {createApp} from '../app.js';
import {createLocalPool} from '../local-pool.js';

test('Parcours complet : compte, identité, médias, catégories, variantes, commande et rapports',async t=>{
 const native=process.env.AURELIA_JOURNEY_NATIVE==='1',pool=native?(await import('../db.js')).pool:await createLocalPool();
 const mediaDirectory=native?resolve(process.env.MEDIA_DIRECTORY||'.local/uploads'):await mkdtemp(join(tmpdir(),'aurelia-journey-'));
 let server,base;const start=async()=>{server=createApp(pool,{mailer:async()=>{},quiet:true,authLimit:200,mediaDirectory}).listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;};await start();
 t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();if(!native)await rm(mediaDirectory,{force:true,recursive:true});});
 const req=async(path,{method='GET',cookie,body}={})=>{const r=await fetch(base+'/v1'+path,{method,headers:{Origin:'http://localhost:3000','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json().catch(()=>null),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const suffix=randomUUID().slice(0,8),account=n=>({name:'Validation complète',email:`parcours-${n}-${suffix}@example.test`,password:'Parcours-Complet-Local-2026!',storeName:`Parcours ${n}`,slug:`parcours-${n}-${suffix}`,whatsapp:'237690000000'});
 let a,b,asset,category,simple,variable,order;
 const variantOptions=[{name:'Taille',values:['M','L']}],variants=[{options:{Taille:'M'},price:12000,stock:3,reference:'TEST-M'},{options:{Taille:'L'},price:15000,oldPrice:18000,stock:2,reference:'TEST-L'}];
 await t.test('Inscription et catalogue vide indépendants pour deux vendeurs',async()=>{
  a=await req('/auth/register',{method:'POST',body:account('a')});b=await req('/auth/register',{method:'POST',body:account('b')});assert.equal(a.status,201);assert.equal(b.status,201);assert.deepEqual((await req('/products',{cookie:a.cookie})).body.items,[]);assert.deepEqual((await req('/orders',{cookie:b.cookie})).body.items,[]);
 });
 await t.test('Import puis identité visuelle et catégorie propres au vendeur',async()=>{
  const png=await sharp({create:{width:80,height:100,channels:4,background:'#285579'}}).png().toBuffer(),form=new FormData();form.append('image',new Blob([png],{type:'image/png'}),'produit.png');
  const uploaded=await fetch(base+'/v1/media',{method:'POST',headers:{Origin:'http://localhost:3000',Cookie:a.cookie},body:form});assert.equal(uploaded.status,201);asset=await uploaded.json();
  const branding=await req('/store',{method:'PATCH',cookie:a.cookie,body:{logoUrl:asset.url,coverUrl:asset.url,accentColor:'#285579',backgroundColor:'#ffffff',textColor:'#102437',heroTitle:'Collection de validation'}});assert.equal(branding.status,200);
  const created=await req('/categories',{method:'POST',cookie:a.cookie,body:{name:'Vêtements et accessoires'}});assert.equal(created.status,201);category=created.body;
 });
 await t.test('Produit simple et produit à variantes avec galerie locale partagée',async()=>{
  const payload={categoryId:category.id,images:[asset.url],description:'Description de validation',attributes:{Matière:'Coton'},isActive:true};
  const s=await req('/products',{method:'POST',cookie:a.cookie,body:{...payload,name:'Accessoire simple',reference:'TEST-ACCESSOIRE',price:5000,stock:5}});assert.equal(s.status,201);simple=s.body;
  const v=await req('/products',{method:'POST',cookie:a.cookie,body:{...payload,name:'T-shirt décliné',hasVariants:true,variantOptions,variants}});assert.equal(v.status,201);variable=v.body;assert.equal(variable.stock,5);
  const home=await req(`/public/stores/${a.body.store.slug}/home`);assert.equal(home.body.store.logoUrl,asset.url);assert.equal(home.body.products.length,2);assert.equal(home.body.collections[0].name,category.name);assert.ok(!JSON.stringify(home.body).includes(a.body.user.email));assert.equal(home.body.customers,undefined);
  assert.equal((await fetch(base+asset.url)).status,200);
 });
 await t.test('Commande mixte : prix serveur, variantes séparées et données du client',async()=>{
  const result=await req(`/public/stores/${a.body.store.slug}/orders`,{method:'POST',body:{customerName:'Client parcours complet',phone:'237690000099',total:1,items:[{productId:simple.id,qty:1,price:1},{productId:variable.id,variantId:variable.variants[0].id,qty:2,price:1},{productId:variable.id,variantId:variable.variants[1].id,qty:1}]}});assert.equal(result.status,201);assert.equal(result.body.total,44000);assert.equal(result.body.items.length,3);
  order=(await req('/orders',{cookie:a.cookie})).body.items[0];assert.equal(order.code,result.body.code);assert.equal(order.items.length,3);assert.equal(order.items.find(i=>i.variantReference==='TEST-M').unitPrice,12000);assert.equal(order.phone,'237690000099');
  const products=(await req('/products',{cookie:a.cookie})).body.items;assert.equal(products.find(p=>p.id===variable.id).stock,5);assert.equal(products.find(p=>p.id===simple.id).stock,5);
 });
 await t.test('Isolation complète : commandes, produits, catégories, images et variantes',async()=>{
  assert.deepEqual((await req('/orders',{cookie:b.cookie})).body.items,[]);assert.deepEqual((await req('/products',{cookie:b.cookie})).body.items,[]);
  assert.equal((await req('/products/'+variable.id,{method:'PATCH',cookie:b.cookie,body:{name:'Accès refusé'}})).status,404);
  assert.equal((await req('/orders/'+order.id,{method:'PATCH',cookie:b.cookie,body:{status:'delivered'}})).status,404);
  assert.equal((await req('/store',{method:'PATCH',cookie:b.cookie,body:{logoUrl:asset.url}})).status,400);
  assert.equal((await req(`/public/stores/${b.body.store.slug}/products/${variable.id}`)).status,404);
  const invalid=await req(`/public/stores/${b.body.store.slug}/orders`,{method:'POST',body:{customerName:'Intrus',phone:'237690000099',items:[{productId:variable.id,variantId:variable.variants[0].id,qty:1}]}});assert.equal(invalid.status,404);
 });
 await t.test('Suivi vendeur, notes et revenus après livraison ; historique de prix immuable',async()=>{
  const delivered=await req('/orders/'+order.id,{method:'PATCH',cookie:a.cookie,body:{status:'delivered',notes:'Validation sans paiement ni message envoyé'}});assert.equal(delivered.status,200);
  const overview=await req('/stats/overview',{cookie:a.cookie});assert.equal(overview.body.wonThisMonth,44000);assert.equal(overview.body.open.count,0);
  const changed=await req('/products/'+variable.id,{method:'PATCH',cookie:a.cookie,body:{variants:variable.variants.map(v=>({...v,price:v.price+1000,oldPrice:null}))}});assert.equal(changed.status,200);
  const historical=(await req('/orders',{cookie:a.cookie})).body.items[0];assert.equal(historical.total,44000);assert.equal(historical.items.find(i=>i.variantReference==='TEST-M').unitPrice,12000);assert.equal(historical.notes,'Validation sans paiement ni message envoyé');
 });
 await t.test('Masquage et suppression douce, restauration puis redémarrage',async()=>{
  assert.equal((await req('/products/'+simple.id,{method:'DELETE',cookie:a.cookie})).status,200);assert.equal((await req(`/public/stores/${a.body.store.slug}/products/${simple.id}`)).status,404);
  assert.equal((await req('/products/'+simple.id+'/restore',{method:'POST',cookie:a.cookie})).status,200);
  await new Promise(r=>server.close(r));await start();const home=(await req(`/public/stores/${a.body.store.slug}/home`)).body;assert.equal(home.products.length,2);assert.equal(home.store.logoUrl,asset.url);assert.equal((await fetch(base+asset.url)).status,200);assert.equal((await req('/orders',{cookie:a.cookie})).body.items[0].total,44000);
  const logout=await req('/auth/logout',{method:'POST',cookie:a.cookie});assert.equal(logout.status,204);assert.equal((await req('/products',{cookie:a.cookie})).status,401);
 });
 if(native)console.log('Boutiques du parcours complet conservées :',a.body.store.slug,b.body.store.slug);
});
