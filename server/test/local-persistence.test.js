import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createLocalPool } from '../local-pool.js';
import { acquireLocalLock } from '../local-lock.js';

test('Sécurité du stockage embarqué local',async t=>{
 const temp=await mkdtemp(join(tmpdir(),'aurelia-persistence-'));
 const children=[];
 t.after(async()=>{
  for(const child of children)if(child.exitCode===null&&child.signalCode===null)child.kill();
  const safe=resolve(temp);
  if(!safe.startsWith(resolve(tmpdir())+sep)||!safe.split(sep).at(-1).startsWith('aurelia-persistence-'))throw new Error('Unsafe test cleanup');
  await rm(safe,{recursive:true,force:true});
 });
 await t.test('Une seconde ouverture du serveur est refusée par le verrou',async()=>{
  const path=join(temp,'server.lock');const release=await acquireLocalLock(path);
  await assert.rejects(()=>acquireLocalLock(path),/déjà/);
  await release();const second=await acquireLocalLock(path);await second();
 });
 await t.test('Une écriture validée survit à un arrêt brutal du processus de test',async()=>{
  const dir=join(temp,'postgres');
  const child=fork(new URL('./helpers/write-local.mjs',import.meta.url),[dir],{stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});children.push(child);
  let stderr='';child.stderr.on('data',data=>{stderr=(stderr+data.toString()).slice(-2000);});
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Child startup timeout: '+stderr)),30000);
   child.once('message',message=>{clearTimeout(timer);message==='committed'?resolve():reject(new Error('Unexpected child message'));});
   child.once('exit',code=>{clearTimeout(timer);reject(new Error('Child exited early: '+code+' '+stderr));});
  });
  const ended=once(child,'exit');child.kill('SIGKILL');await ended;
  const pool=await createLocalPool(dir);
  try{assert.equal((await pool.query('SELECT count(*)::int AS n FROM users')).rows[0].n,1);}finally{await pool.end();}
 });
});
