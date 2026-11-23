import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../app.js';
import {createLocalPool} from '../local-pool.js';
import {createMailer,publicAppUrl} from '../mailer.js';
import {digest} from '../security.js';

test('Sécurité des comptes : liens personnels, sessions, vérification et récupération',async t=>{
 const native=process.env.AURELIA_ACCOUNT_NATIVE==='1',pool=native?(await import('../db.js')).pool:await createLocalPool(),messages=[];
 const app=createApp(pool,{quiet:true,authLimit:200,accountLimit:200,mailer:async message=>{messages.push(message);},publicUrl:'http://localhost:3000'}),server=app.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));await app.locals.flushMail();await pool.end();});
 const base=`http://127.0.0.1:${server.address().port}/v1`;
 const req=async(path,{method='POST',cookie,body,origin='http://localhost:3000',host}={})=>{const res=await fetch(base+path,{method,headers:{...(origin?{Origin:origin}:{}),'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(host?{Host:host}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:res.status,body:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 const suffix=randomUUID().slice(0,8),password='Initial-Compte-Test-2026!',account=n=>({name:'Validation sécurité',email:`compte-${n}-${suffix}@example.test`,password,storeName:`Compte ${n}`,slug:`compte-${n}-${suffix}`,whatsapp:'237690000000'});
 let a,b,verification,reset,secondSession;
 const mail=async(purpose,to)=>{await app.locals.flushMail();const message=messages.filter(m=>m.purpose===purpose&&m.to===to).at(-1);assert.ok(message);return message;};
 const token=message=>message.text.match(/#token=([a-f0-9]{64})/)[1];
 const postToken=(purpose,raw,extra={})=>req('/auth/'+purpose,{body:{token:raw,...extra}});
 await t.test('Inscription : e-mail de confirmation sans jeton dans la réponse ni accès bloqué',async()=>{
  a=await req('/auth/register',{body:account('a')});b=await req('/auth/register',{body:account('b')});assert.equal(a.status,201);assert.equal(b.status,201);assert.equal(a.body.user.emailVerified,false);
  verification=token(await mail('verify-email',account('a').email));assert.ok(!JSON.stringify(a.body).includes(verification));
  const row=(await pool.query('SELECT token_hash FROM account_tokens WHERE user_id=$1',[a.body.user.id])).rows[0];assert.equal(row.token_hash,digest(verification));assert.notEqual(row.token_hash,verification);
  assert.equal((await req('/products',{method:'GET',cookie:a.cookie})).status,200);
  secondSession=(await req('/auth/login',{body:{email:account('a').email,password}})).cookie;assert.ok(secondSession);
 });
 await t.test('Vérification explicite : bon compte, usage unique, séparation des usages et cooldown',async()=>{
  const count=messages.length;assert.equal((await req('/auth/resend-verification',{cookie:a.cookie,body:{}})).status,202);await app.locals.flushMail();assert.equal(messages.length,count);
  assert.equal((await req('/auth/resend-verification',{body:{}})).status,401);
  assert.equal((await postToken('reset-password',verification,{password:'Nouveau-secret-Long-2026!'})).status,400);
  assert.equal((await postToken('verify-email',verification)).status,200);assert.equal((await postToken('verify-email',verification)).status,400);
  assert.equal((await req('/auth/me',{method:'GET',cookie:a.cookie})).body.emailVerified,true);assert.equal((await req('/auth/me',{method:'GET',cookie:b.cookie})).body.emailVerified,false);
  assert.equal((await req('/auth/resend-verification',{cookie:a.cookie,body:{}})).status,202);await app.locals.flushMail();assert.equal(messages.length,count);
 });
 await t.test('Mot de passe oublié : réponse identique, origine contrôlée et lien indépendant du Host',async()=>{
  const existing=await req('/auth/forgot-password',{body:{email:account('a').email},host:'evil.example'}),missing=await req('/auth/forgot-password',{body:{email:`absent-${suffix}@example.test`}});assert.equal(existing.status,202);assert.deepEqual(existing,missing);
  const message=await mail('reset-password',account('a').email);assert.ok(message.text.includes('http://localhost:3000/compte/reinitialiser#token='));assert.ok(!message.text.includes('evil.example'));reset=token(message);
  assert.equal((await req('/auth/forgot-password',{body:{email:account('a').email},origin:'https://evil.example'})).status,403);
  assert.equal((await req('/auth/forgot-password',{body:{email:account('a').email},origin:null})).status,403);
  const count=messages.length;await req('/auth/forgot-password',{body:{email:account('a').email}});await app.locals.flushMail();assert.equal(messages.length,count);
  assert.equal((await postToken('verify-email',reset)).status,400);
 });
 await t.test('Réinitialisation : validation, concurrence, révocation de toutes les sessions du bon compte',async()=>{
  assert.equal((await postToken('reset-password',reset,{password:'court'})).status,400);
  assert.equal((await postToken('reset-password',reset,{password:' '.repeat(12)})).status,400);
  assert.equal((await postToken('reset-password','0'.repeat(64),{password:'Nouveau-secret-Long-2026!'})).status,400);
  const [first,second,racingLogin]=await Promise.all([postToken('reset-password',reset,{password:'Nouveau-secret-Long-2026!'}),postToken('reset-password',reset,{password:'Nouveau-secret-Long-2026!'}),req('/auth/login',{body:{email:account('a').email,password}})]);assert.deepEqual([first.status,second.status].sort(),[200,400]);
  if(racingLogin.status===200)assert.equal((await req('/auth/me',{method:'GET',cookie:racingLogin.cookie})).status,401);else assert.equal(racingLogin.status,401);
  assert.equal((await req('/auth/me',{method:'GET',cookie:a.cookie})).status,401);assert.equal((await req('/auth/me',{method:'GET',cookie:secondSession})).status,401);assert.equal((await req('/auth/me',{method:'GET',cookie:b.cookie})).status,200);
  assert.equal((await req('/auth/login',{body:{email:account('a').email,password}})).status,401);assert.equal((await req('/auth/login',{body:{email:account('a').email,password:'Nouveau-secret-Long-2026!'}})).status,200);
  await mail('password-changed',account('a').email);
 });
 await t.test('Expiration et nouveau lien : les anciens liens ne redeviennent pas utilisables',async()=>{
  const oldVerification=token(await mail('verify-email',account('b').email));
  await pool.query("UPDATE account_tokens SET expires_at=now()-interval '1 second',created_at=now()-interval '2 minutes' WHERE user_id=$1",[b.body.user.id]);assert.equal((await postToken('verify-email',oldVerification)).status,400);
  await req('/auth/resend-verification',{cookie:b.cookie,body:{}});const newer=token(await mail('verify-email',account('b').email));assert.notEqual(newer,oldVerification);assert.equal((await postToken('verify-email',newer)).status,200);
  await req('/auth/forgot-password',{body:{email:account('b').email}});const oldReset=token(await mail('reset-password',account('b').email));await pool.query("UPDATE account_tokens SET created_at=now()-interval '2 minutes' WHERE user_id=$1 AND purpose='reset-password'",[b.body.user.id]);
  await req('/auth/forgot-password',{body:{email:account('b').email}});const newerReset=token(await mail('reset-password',account('b').email));assert.notEqual(newerReset,oldReset);assert.equal((await postToken('reset-password',oldReset,{password:'Autre-secret-Long-2026!'})).status,400);
  await pool.query("UPDATE account_tokens SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[digest(newerReset)]);assert.equal((await postToken('reset-password',newerReset,{password:'Autre-secret-Long-2026!'})).status,400);
 });
 await t.test('Token lié à l’adresse actuelle ; aucun changement métier après les opérations de compte',async()=>{
  await pool.query("UPDATE account_tokens SET created_at=now()-interval '2 minutes' WHERE user_id=$1",[b.body.user.id]);await req('/auth/forgot-password',{body:{email:account('b').email}});const pending=token(await mail('reset-password',account('b').email));
  await pool.query('UPDATE users SET email=$1 WHERE id=$2',[`change-${suffix}@example.test`,b.body.user.id]);assert.equal((await postToken('reset-password',pending,{password:'Autre-secret-Long-2026!'})).status,400);await pool.query('UPDATE users SET email=$1 WHERE id=$2',[account('b').email,b.body.user.id]);
  assert.equal((await req('/products',{method:'GET',cookie:b.cookie})).body.items.length,0);assert.equal((await req('/orders',{method:'GET',cookie:b.cookie})).body.items.length,0);
 });
 if(native)console.log('Comptes de sécurité de test conservés :',a.body.store.slug,b.body.store.slug);
});

test('Transport local privé et URL publique validée',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'aurelia-mail-'));try{
  const send=createMailer({mode:'file',directory:dir});await send({to:'test@example.test',subject:'Validation locale',text:'Lien de test sans envoi externe.'});
  const files=await readdir(dir);assert.equal(files.filter(f=>f.endsWith('.eml')).length,1);const plain=await readFile(join(dir,files.find(f=>f.endsWith('.txt'))),'utf8');assert.ok(plain.includes('test@example.test'));assert.ok(plain.includes('Lien de test'));
  assert.equal(publicAppUrl('http://localhost:3000'),'http://localhost:3000');for(const value of ['http://evil.example','https://user:secret@example.test','https://example.test/path','https://example.test/#token=x'])assert.throws(()=>publicAppUrl(value));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Limitation des demandes publiques de récupération',async t=>{
 const pool=await createLocalPool(),app=createApp(pool,{quiet:true,mailer:async()=>{},accountLimit:2}),server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
 const base=`http://127.0.0.1:${server.address().port}/v1/auth/forgot-password`;const call=()=>fetch(base,{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({email:'inconnu@example.test'})});assert.equal((await call()).status,202);assert.equal((await call()).status,202);assert.equal((await call()).status,429);
});
