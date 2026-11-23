import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createLocalPool } from '../local-pool.js';
import { createApp } from '../app.js';

test('Parcours SaaS et isolation sur PostgreSQL embarqué (RLS active)', async t=>{
  const pool=await createLocalPool();
  const server=createApp(pool,{mailer:async()=>{},authLimit:200,rateLimit:2000,quiet:true}).listen(0,'127.0.0.1');
  await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/v1`;
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
  async function req(path,{method='GET',body,cookie,origin='http://localhost:3000'}={}){
    const r=await fetch(base+path,{method,headers:{...(origin?{Origin:origin}:{}),'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:r.status,body:await r.json().catch(()=>null),cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers};
  }
  const account=(n,patch={})=>({name:`Vendeur ${n}`,email:`vendeur${n}@example.test`,password:'Long-secret-test-2026!',storeName:`Maison ${n}`,slug:`maison-${n}`,whatsapp:'237690000000',...patch});
  let a,b,productA,productB,order;
  await t.test('Inscription atomique, session HttpOnly, dashboard vide',async()=>{
    a=await req('/auth/register',{method:'POST',body:account('alpha')});assert.equal(a.status,201,JSON.stringify(a.body));
    assert.match(a.headers.get('set-cookie'),/HttpOnly/);assert.match(a.headers.get('set-cookie'),/SameSite=Lax/);
    assert.equal(a.body.store.slug,'maison-alpha');assert.equal(a.body.user.passwordHash,undefined);
    const me=await req('/auth/me',{cookie:a.cookie});assert.equal(me.body.email,'vendeuralpha@example.test');
    assert.deepEqual((await req('/products',{cookie:a.cookie})).body,{items:[]});
    const stats=await req('/stats/overview',{cookie:a.cookie});assert.equal(stats.body.wonThisMonth,0);assert.equal(stats.body.nextBest,null);
    b=await req('/auth/register',{method:'POST',body:account('beta')});assert.equal(b.status,201);
  });
  await t.test('Validation, doublons et rollback sans utilisateur orphelin',async()=>{
    assert.equal((await req('/auth/register',{method:'POST',body:account('short',{password:'short'})})).status,400);
    assert.equal((await req('/auth/register',{method:'POST',body:account('other',{slug:'maison-alpha'})})).status,409);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM users')).rows[0].n,2);
    assert.equal((await req('/auth/register',{method:'POST',body:account('duplicate',{email:'VENDEURALPHA@example.test'})})).status,409);
    const hash=(await pool.query('SELECT password_hash FROM users LIMIT 1')).rows[0].password_hash;
    assert.ok(!hash.includes('Long-secret'));assert.match(hash,/^[a-f0-9]{32}:[a-f0-9]{128}$/);
  });
  await t.test('Routes privées et origine des mutations',async()=>{
    assert.equal((await req('/products')).status,401);
    assert.equal((await req('/auth/login',{method:'POST',body:account('alpha'),origin:'https://evil.example'})).status,403);
    assert.equal((await req('/auth/logout',{method:'POST',cookie:a.cookie,body:{},origin:null})).status,403);
    assert.equal((await req('/auth/login',{method:'POST',body:{email:'vendeuralpha@example.test',password:'incorrect'}})).status,401);
  });
  const product={name:'Oud Lumière',price:42000,stock:10,family:'bois',isActive:true,isFeatured:true,isNew:true};
  await t.test('Catalogues indépendants et IDOR refusées',async()=>{
    const ra=await req('/products',{method:'POST',cookie:a.cookie,body:{...product,storeId:b.body.store.id}});assert.equal(ra.status,201,JSON.stringify(ra.body));productA=ra.body;
    productB=(await req('/products',{method:'POST',cookie:b.cookie,body:{...product,name:'Rose Beta'}})).body;
    assert.equal((await req('/products',{cookie:a.cookie})).body.items.length,1);
    assert.equal((await req('/products',{cookie:b.cookie})).body.items[0].name,'Rose Beta');
    for(const [method,suffix,body] of [['PATCH','',{name:'Volé'}],['DELETE','',{}],['POST','/restore',{}]])assert.equal((await req('/products/'+productA.id+suffix,{method,cookie:b.cookie,body})).status,404);
    assert.equal((await req('/products/'+productA.id,{method:'PATCH',cookie:a.cookie,body:{price:-1}})).status,400);
    assert.equal((await req('/products/'+productA.id,{method:'PATCH',cookie:a.cookie,body:{image:'javascript:alert(1)'}})).status,400);
  });
  await t.test('RLS limite aussi une requête SQL sans filtre du serveur',async()=>{
    const c=await pool.connect();
    try{
      await c.query('BEGIN');await c.query("SELECT set_config('app.store_id',$1,true)",[a.body.store.id]);
      const products=await c.query('SELECT * FROM products');assert.equal(products.rows.length,1);assert.equal(products.rows[0].id,productA.id);
      await c.query('COMMIT');assert.equal((await c.query('SELECT * FROM products')).rows.length,0);
    }finally{c.release();}
  });
  await t.test('Boutique publique sans données privées ni avis inventés',async()=>{
    const home=await req('/public/stores/maison-alpha/home');assert.equal(home.status,200);
    assert.equal(home.body.store.ownerId,undefined);assert.equal(home.body.customers,undefined);assert.equal(home.body.orders,undefined);
    assert.equal(home.body.products.length,1);assert.equal(home.body.reviews.count,0);
    assert.equal((await req('/public/stores/inconnue/home')).status,404);
    await req('/products/'+productA.id,{method:'PATCH',cookie:a.cookie,body:{isActive:false}});
    assert.equal((await req('/public/stores/maison-alpha/home')).body.products.length,0);
    await req('/products/'+productA.id,{method:'PATCH',cookie:a.cookie,body:{isActive:true}});
  });
  const basket=id=>({customerName:'Cliente Test',phone:'+237 699 111 222',items:[{productId:id,qty:2}],total:1});
  await t.test('Commande : prix serveur, coordonnées, stock et produits du bon vendeur',async()=>{
    assert.equal((await req('/public/stores/maison-alpha/orders',{method:'POST',body:basket(productB.id)})).status,404);
    assert.equal((await req('/public/stores/maison-alpha/orders',{method:'POST',body:{...basket(productA.id),items:[{productId:productA.id,qty:11}]}})).status,409);
    const result=await req('/public/stores/maison-alpha/orders',{method:'POST',body:basket(productA.id)});assert.equal(result.status,201,JSON.stringify(result.body));assert.equal(result.body.total,84000);
    const orders=await req('/orders',{cookie:a.cookie});order=orders.body.items[0];assert.equal(order.customerName,'Cliente Test');assert.equal(order.phone,'237699111222');assert.equal(order.items[0].qty,2);
    assert.equal((await req('/orders',{cookie:b.cookie})).body.items.length,0);
    assert.equal((await req('/orders/'+order.id,{method:'PATCH',cookie:b.cookie,body:{status:'delivered'}})).status,404);
    const delivered=await req('/orders/'+order.id,{method:'PATCH',cookie:a.cookie,body:{status:'delivered'}});assert.equal(delivered.status,200,JSON.stringify(delivered.body));assert.ok(delivered.body.deliveredAt);
    assert.equal((await req('/stats/overview',{cookie:a.cookie})).body.wonThisMonth,84000);
    assert.equal((await req('/stats/report?metric=revenue&group=product',{cookie:a.cookie})).body.total,84000);
    assert.equal((await req('/customers',{cookie:a.cookie})).body.items[0].spent,84000);
  });
  await t.test('Réglages, nouveau lien, suppression douce et restauration',async()=>{
    const store=await req('/store',{method:'PATCH',cookie:a.cookie,body:{slug:'maison-nouvelle',name:'Nouvelle Maison',monthlyTarget:100000}});assert.equal(store.status,200);
    assert.equal((await req('/public/stores/maison-alpha/home')).status,404);
    assert.equal((await req('/public/stores/maison-nouvelle/home')).body.store.name,'Nouvelle Maison');
    // Requête identique au bouton du navigateur : Content-Type JSON, sans corps.
    assert.equal((await req('/products/'+productA.id,{method:'DELETE',cookie:a.cookie})).status,200);
    assert.equal((await req('/products',{cookie:a.cookie})).body.items.length,0);
    assert.equal((await req('/products/'+productA.id+'/restore',{method:'POST',cookie:a.cookie})).status,200);
    assert.equal((await req('/products',{cookie:a.cookie})).body.items.length,1);
  });
  await t.test('Newsletter et événements : aucune référence inter-boutique',async()=>{
    assert.equal((await req('/public/stores/maison-nouvelle/newsletter',{method:'POST',body:{email:'client@example.test'}})).status,204);
    assert.equal((await req('/public/stores/maison-nouvelle/events',{method:'POST',body:{events:[{type:'add_to_cart',productId:productB.id}]}})).status,404);
    assert.equal((await req('/public/stores/maison-nouvelle/events',{method:'POST',body:{events:[{type:'view'}]}})).status,204);
  });
  await t.test('Connexion après inscription et révocation réelle de session',async()=>{
    assert.equal((await req('/auth/logout',{method:'POST',cookie:a.cookie,body:{}})).status,204);
    assert.equal((await req('/auth/me',{cookie:a.cookie})).status,401);
    const login=await req('/auth/login',{method:'POST',body:{email:'VENDEURALPHA@example.test',password:account('alpha').password}});assert.equal(login.status,200);
    assert.equal((await req('/auth/me',{cookie:login.cookie})).status,200);
    assert.equal((await req('/auth/me',{cookie:b.cookie})).status,200);
  });
  await t.test('Rapports : même période et montants exacts entre regroupements',async()=>{
    // B possède encore une session valide ; injecter une vente ancienne et une récente.
    await req('/public/stores/maison-beta/orders',{method:'POST',body:basket(productB.id)});
    const recent=(await req('/orders',{cookie:b.cookie})).body.items[0];
    await req('/orders/'+recent.id,{method:'PATCH',cookie:b.cookie,body:{status:'delivered'}});
    const c=await pool.connect();
    try {
      await c.query('BEGIN');await c.query("SELECT set_config('app.store_id',$1,true)",[b.body.store.id]);
      const old=(await c.query("INSERT INTO orders(store_id,customer_id,code,total,status,created_at) VALUES($1,$2,'OLD-AUDIT',42000,'delivered',now()-interval '2 years') RETURNING id",[b.body.store.id,recent.customerId])).rows[0];
      await c.query('INSERT INTO order_items(order_id,product_id,name_snapshot,unit_price,qty) VALUES($1,$2,$3,42000,1)',[old.id,productB.id,productB.name]);
      await c.query('COMMIT');
    } finally {c.release();}
    for(const group of ['month','product','family']) {
      const result=await req('/stats/report?metric=revenue&group='+group,{cookie:b.cookie});
      assert.equal(result.status,200);assert.equal(result.body.total,84000);assert.equal(result.body.rows.reduce((sum,r)=>sum+r.value,0),84000);
    }
    const badType=await fetch(base+'/products/'+productB.id,{method:'DELETE',headers:{Origin:'http://localhost:3000',Cookie:b.cookie,'Content-Type':'text/plain'},body:'{}'});
    assert.equal(badType.status,403);
    assert.equal((await req('/products/'+productB.id,{method:'DELETE',cookie:b.cookie,origin:'https://evil.example'})).status,403);
  });
});
