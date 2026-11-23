import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../app.js';
import { createLocalPool } from '../local-pool.js';
import { MEDIA_MAX_BYTES } from '../media.js';

test('Images locales : import, isolation, association, lecture publique et persistance',async t=>{
 const native=process.env.AURELIA_MEDIA_NATIVE==='1',pool=native?(await import('../db.js')).pool:await createLocalPool();
 const mediaDirectory=native?resolve(process.env.MEDIA_DIRECTORY||'.local/uploads'):await mkdtemp(join(tmpdir(),'aurelia-media-test-'));
 let server,base;
 const start=async()=>{server=createApp(pool,{mailer:async()=>{},quiet:true,authLimit:200,mediaLimit:200,mediaDirectory}).listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;};
 await start();t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();if(!native)await rm(mediaDirectory,{recursive:true,force:true});});
 const req=async(path,{method='GET',cookie,body,origin='http://localhost:3000'}={})=>{const res=await fetch(base+'/v1'+path,{method,headers:{...(origin?{Origin:origin}:{}),'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 const upload=async(buffer,{cookie,name='image.png',type='image/png',origin='http://localhost:3000',two=false}={})=>{const data=new FormData();data.append('image',new Blob([buffer],{type}),name);if(two)data.append('image',new Blob([buffer],{type}),name);const res=await fetch(base+'/v1/media',{method:'POST',headers:{...(origin?{Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:data});return {status:res.status,body:await res.json()};};
 const suffix=randomUUID().slice(0,8),account=n=>({name:'Vendeur images',email:`images-${n}-${suffix}@example.test`,password:'Images-Test-Local-2026!',storeName:`Images ${n}`,slug:`images-${n}-${suffix}`,whatsapp:'237690000000'});
 const a=await req('/auth/register',{method:'POST',body:account('a')}),b=await req('/auth/register',{method:'POST',body:account('b')});assert.equal(a.status,201);assert.equal(b.status,201);
 const png=await sharp({create:{width:160,height:120,channels:4,background:{r:30,g:90,b:200,alpha:.5}}}).png().toBuffer();
 let asset,product;
 await t.test('Import réservé à un vendeur et à une origine autorisée',async()=>{
  assert.equal((await upload(png)).status,401);
  assert.equal((await upload(png,{cookie:a.cookie,origin:'https://evil.example'})).status,403);
  assert.equal((await upload(png,{cookie:a.cookie,origin:null})).status,403);
  assert.equal((await req('/store',{method:'PATCH',cookie:a.cookie,body:{logoUrl:'//evil.example/a.png'}})).status,400);
 });
 await t.test('Fichier réencodé, nom opaque, transparence préservée et lecture publique',async()=>{
  const result=await upload(png,{cookie:a.cookie,name:'../../logo.exe',type:'application/octet-stream'});assert.equal(result.status,201,JSON.stringify(result.body));asset=result.body;
  assert.match(asset.url,new RegExp(`^/media/${a.body.store.id}/[a-f0-9-]+\\.webp$`));assert.equal(asset.mimeType,'image/webp');assert.equal(asset.width,160);assert.equal(asset.height,120);
  const response=await fetch(base+asset.url);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.match(response.headers.get('cache-control'),/immutable/);
  const bytes=Buffer.from(await response.arrayBuffer()),meta=await sharp(bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.hasAlpha,true);assert.equal(meta.exif,undefined);assert.equal(bytes.length,asset.bytes);
  assert.deepEqual(bytes,await readFile(join(mediaDirectory,asset.url.slice(7))));
 });
 await t.test('Orientation corrigée, dimensions limitées et métadonnées retirées',async()=>{
  const jpeg=await sharp({create:{width:3000,height:1000,channels:3,background:'#cc5533'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const result=await upload(jpeg,{cookie:a.cookie,name:'photo.jpg',type:'image/jpeg'});assert.equal(result.status,201);assert.equal(result.body.width,800);assert.equal(result.body.height,2400);
  const meta=await sharp(Buffer.from(await(await fetch(base+result.body.url)).arrayBuffer())).metadata();assert.equal(meta.orientation,undefined);assert.equal(meta.exif,undefined);
 });
 await t.test('Faux fichiers, SVG, taille excessive et import multiple refusés sans fichier parasite',async()=>{
  const before=await readdir(join(mediaDirectory,a.body.store.id));
  assert.equal((await upload(Buffer.from('pas une photo'),{cookie:a.cookie})).status,400);
  assert.equal((await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),{cookie:a.cookie})).status,400);
  assert.equal((await upload(Buffer.alloc(MEDIA_MAX_BYTES+1),{cookie:a.cookie})).status,413);
  assert.equal((await upload(png,{cookie:a.cookie,two:true})).status,400);
  const broken=await fetch(base+'/v1/media',{method:'POST',headers:{Origin:'http://localhost:3000',Cookie:a.cookie,'Content-Type':'multipart/form-data; boundary=absent'},body:'envoi tronqué'});assert.equal(broken.status,400);
  assert.deepEqual(await readdir(join(mediaDirectory,a.body.store.id)),before);
 });
 await t.test('Association aux produits et à l’identité visuelle ; anciennes URL compatibles',async()=>{
  const created=await req('/products',{method:'POST',cookie:a.cookie,body:{name:'Produit avec photo locale',price:12000,stock:2,images:[asset.url,'https://images.example.test/ancienne.jpg']}});assert.equal(created.status,201,JSON.stringify(created.body));product=created.body;assert.equal(product.images[0],asset.url);
  const store=await req('/store',{method:'PATCH',cookie:a.cookie,body:{logoUrl:asset.url,coverUrl:asset.url}});assert.equal(store.status,200);assert.equal(store.body.logoUrl,asset.url);
  const home=await req('/public/stores/'+a.body.store.slug+'/home');assert.equal(home.status,200);assert.equal(home.body.store.logoUrl,asset.url);assert.equal(home.body.products[0].images[0],asset.url);
  const reorder=await req('/products/'+product.id,{method:'PATCH',cookie:a.cookie,body:{images:[product.images[1],asset.url]}});assert.equal(reorder.status,200);assert.equal(reorder.body.images[1],asset.url);
 });
 await t.test('Références d’une autre boutique et chemins arbitraires refusés ; RLS directe',async()=>{
  assert.equal((await req('/store',{method:'PATCH',cookie:b.cookie,body:{logoUrl:asset.url}})).status,400);
  assert.equal((await req('/products',{method:'POST',cookie:b.cookie,body:{name:'Vol photo',price:1,stock:1,images:[asset.url]}})).status,400);
  for(const url of ['/media/../../.env','/etc/passwd',`/media/${a.body.store.id}/${randomUUID()}.webp`])assert.equal((await req('/store',{method:'PATCH',cookie:a.cookie,body:{coverUrl:url}})).status,400);
  const c=await pool.connect();try{await c.query('BEGIN');await c.query("SELECT set_config('app.store_id',$1,true)",[b.body.store.id]);assert.equal((await c.query('SELECT id FROM media_assets WHERE id=$1',[asset.id])).rows.length,0);await c.query('ROLLBACK');}finally{c.release();}
  assert.equal((await fetch(base+'/media/')).status,404);assert.equal((await fetch(base+asset.url.replace('.webp','.svg'))).status,404);
 });
 await t.test('Redémarrage : fichiers et associations conservés ; retrait ne casse pas les anciens liens',async()=>{
  await new Promise(r=>server.close(r));await start();assert.equal((await fetch(base+asset.url)).status,200);
  assert.equal((await req('/products',{cookie:a.cookie})).body.items.find(p=>p.id===product.id).images[1],asset.url);
  const clear=await req('/store',{method:'PATCH',cookie:a.cookie,body:{logoUrl:null,coverUrl:null}});assert.equal(clear.status,200);assert.equal(clear.body.logoUrl,null);assert.equal((await fetch(base+asset.url)).status,200);
 });
});
