import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import { createLocalPool } from '../local-pool.js';

test('Variantes : prix, stocks, isolation et historique des commandes',async t=>{
 const native=process.env.AURELIA_VARIANTS_NATIVE==='1',pool=native?(await import('../db.js')).pool:await createLocalPool();
 const server=createApp(pool,{mailer:async()=>{},quiet:true,authLimit:200}).listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
 const base=`http://127.0.0.1:${server.address().port}/v1`,suffix=randomUUID().slice(0,8);
 const req=async(path,{method='GET',cookie,body}={})=>{const r=await fetch(base+path,{method,headers:{Origin:'http://localhost:3000','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();return {status:r.status,body:text?JSON.parse(text):null,cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const account=n=>({name:'Vendeur variantes',email:`variantes-${n}-${suffix}@example.test`,password:'Variantes-Test-Local-2026!',storeName:`Variantes ${n}`,slug:`variantes-${n}-${suffix}`,whatsapp:'237690000000'});
 const options=[{name:'Taille',values:['M','L']},{name:'Couleur',values:['Bleu','Rouge']}];
 const variants=[{options:{Taille:'M',Couleur:'Bleu'},price:12000,stock:3,reference:'TS-M-B'},{options:{Taille:'M',Couleur:'Rouge'},price:13000,stock:0,reference:'TS-M-R'},{options:{Taille:'L',Couleur:'Bleu'},price:18000,oldPrice:20000,stock:2,reference:'TS-L-B'},{options:{Taille:'L',Couleur:'Rouge'},price:19000,stock:1,reference:'TS-L-R'}];
 let a,b,p,other,order,orderedVariant;
 const create=(cookie,name,patch={})=>req('/products',{method:'POST',cookie,body:{name,hasVariants:true,variantOptions:options,variants,...patch}});
 const basket=items=>({customerName:'Client variantes',phone:'237690000001',items,total:1});
 await t.test('Creation avec prix et stock par SKU, minimum et total derives',async()=>{
  a=await req('/auth/register',{method:'POST',body:account('a')});b=await req('/auth/register',{method:'POST',body:account('b')});assert.equal(a.status,201);assert.equal(b.status,201);
  const result=await create(a.cookie,'T-shirt à variantes');assert.equal(result.status,201,JSON.stringify(result.body));p=result.body;
  assert.equal(p.price,12000);assert.equal(p.stock,6);assert.equal(p.variants.length,4);assert.ok(p.variants.every(v=>v.id));
  other=(await create(b.cookie,'Produit autre vendeur')).body;assert.ok(other.id);
 });
 await t.test('Choix obligatoire, stock propre et total recalcule pour deux variantes',async()=>{
  const path=`/public/stores/${a.body.store.slug}/orders`,v=p.variants;
  assert.equal((await req(path,{method:'POST',body:basket([{productId:p.id,qty:1}])})).status,400);
  assert.equal((await req(path,{method:'POST',body:basket([{productId:p.id,variantId:v[1].id,qty:1}])})).status,409);
  assert.equal((await req(path,{method:'POST',body:basket([{productId:p.id,variantId:v[0].id,qty:2},{productId:p.id,variantId:v[0].id,qty:2}])})).status,409);
  const result=await req(path,{method:'POST',body:basket([{productId:p.id,variantId:v[0].id,qty:2,price:1},{productId:p.id,variantId:v[2].id,qty:1}])});assert.equal(result.status,201);assert.equal(result.body.total,42000);assert.equal(result.body.items.length,2);assert.equal(result.body.items.find(i=>i.variantId===v[0].id).unitPrice,12000);
  const list=(await req('/orders',{cookie:a.cookie})).body.items;order=list[0];orderedVariant=v[0];assert.equal(order.items.length,2);assert.equal(order.items.find(i=>i.variantId===v[0].id).variantReference,'TS-M-B');assert.equal(order.items.find(i=>i.variantId===v[0].id).variantOptions.Taille,'M');
 });
 await t.test('Variantes d un autre produit ou vendeur refusees ; SQL RLS active',async()=>{
  const path=`/public/stores/${a.body.store.slug}/orders`;
  assert.equal((await req(path,{method:'POST',body:basket([{productId:p.id,variantId:other.variants[0].id,qty:1}])})).status,404);
  assert.equal((await req('/products/'+p.id,{method:'PATCH',cookie:b.cookie,body:{stock:1}})).status,404);
  assert.equal((await req('/products/'+p.id,{method:'PATCH',cookie:a.cookie,body:{variants:[{...p.variants[0],id:other.variants[0].id}]}})).status,400);
  assert.equal((await pool.query('SELECT * FROM product_variants')).rows.length,0);
  const c=await pool.connect();try{await c.query('BEGIN');await c.query("SELECT set_config('app.store_id',$1,true)",[b.body.store.id]);assert.equal((await c.query('SELECT * FROM product_variants')).rows.length,4);await assert.rejects(()=>c.query("INSERT INTO product_variants(store_id,product_id,options,combination_key,label,price) VALUES($1,$2,'{}','x','x',1)",[b.body.store.id,p.id]));await c.query('ROLLBACK');}finally{c.release();}
 });
 await t.test('Combinaisons, valeurs et references invalidees sans sauvegarde partielle',async()=>{
  for(const patch of [{variants:[p.variants[0],p.variants[0]]},{variants:[{...p.variants[0],price:-1}]},{variants:[{...p.variants[0],stock:1.5}]},{variants:[{...p.variants[0],options:{Taille:'XL',Couleur:'Bleu'}}]},{variantOptions:[{name:'Taille',values:['M','m']}]},{variantOptions:Array(4).fill(options[0])}])assert.equal((await req('/products/'+p.id,{method:'PATCH',cookie:a.cookie,body:{name:'Ne pas changer',...patch}})).status,400);
  const duplicate=await create(a.cookie,'Référence dupliquée');assert.equal(duplicate.status,409);
  assert.equal((await req('/products',{cookie:a.cookie})).body.items.length,1);assert.equal((await req('/products',{cookie:a.cookie})).body.items[0].name,'T-shirt à variantes');
 });
 await t.test('Modification des prix et retrait ne changent pas les lignes historiques',async()=>{
  const remaining=p.variants.slice(1).map(v=>({...v,price:v.price+1000,oldPrice:null}));
  const result=await req('/products/'+p.id,{method:'PATCH',cookie:a.cookie,body:{variants:remaining}});assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.variants.length,3);
  const history=(await req('/orders',{cookie:a.cookie})).body.items.find(o=>o.id===order.id);const line=history.items.find(i=>i.variantId===orderedVariant.id);assert.equal(line.unitPrice,12000);assert.equal(line.variantReference,'TS-M-B');assert.equal(line.variantOptions.Couleur,'Bleu');
  assert.equal((await req(`/public/stores/${a.body.store.slug}/orders`,{method:'POST',body:basket([{productId:p.id,variantId:orderedVariant.id,qty:1}])})).status,404);
  p=result.body;
 });
 await t.test('Variantes masquees absentes du public ; modification simple conserve les IDs',async()=>{
  const result=await req('/products/'+p.id,{method:'PATCH',cookie:a.cookie,body:{variants:p.variants.map((v,i)=>({...v,isActive:i!==0}))}});assert.equal(result.status,200,JSON.stringify(result.body));p=result.body;
  const publicP=(await req(`/public/stores/${a.body.store.slug}/products/${p.id}`)).body.product;assert.equal(publicP.variants.length,2);assert.ok(!publicP.variantOptions[0].values.includes('M'));
  const ids=p.variants.map(v=>v.id);const updated=await req('/products/'+p.id,{method:'PATCH',cookie:a.cookie,body:{tagline:'Toujours le même catalogue'}});assert.deepEqual(updated.body.variants.map(v=>v.id),ids);
 });
 await t.test('Retour au produit simple sans effacer les variantes ni les commandes',async()=>{
  const result=await req('/products/'+p.id,{method:'PATCH',cookie:a.cookie,body:{hasVariants:false,price:15000,stock:5,variants:[],variantOptions:[]}});assert.equal(result.status,200);assert.equal(result.body.hasVariants,false);assert.equal(result.body.variants.length,0);
  assert.equal((await req(`/public/stores/${a.body.store.slug}/orders`,{method:'POST',body:basket([{productId:p.id,variantId:p.variants[0].id,qty:1}])})).status,400);
  const simple=await req(`/public/stores/${a.body.store.slug}/orders`,{method:'POST',body:basket([{productId:p.id,qty:1}])});assert.equal(simple.status,201);assert.equal(simple.body.total,15000);
  assert.equal((await req('/orders',{cookie:a.cookie})).body.items.find(o=>o.id===order.id).total,42000);
 });
 if(native)console.log('Boutiques de test conservees :',a.body.store.slug,b.body.store.slug);
});
