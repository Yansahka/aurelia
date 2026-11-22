import { open, readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Un seul processus peut ouvrir la base embarquée à la fois.
export async function acquireLocalLock(path) {
  const token=randomUUID();
  for(let attempt=0;attempt<2;attempt++){
    try{
      const handle=await open(path,'wx');
      try{await handle.writeFile(JSON.stringify({pid:process.pid,token}));}finally{await handle.close();}
      return async()=>{const state=JSON.parse(await readFile(path,'utf8'));if(state.token===token)await unlink(path);};
    }catch(e){
      if(e.code!=='EEXIST')throw e;
      let state;try{state=JSON.parse(await readFile(path,'utf8'));}catch{throw new Error('Le verrou de la base locale est illisible. Aucun fichier de données ne sera modifié.');}
      if(!Number.isInteger(state.pid)||state.pid<=0)throw new Error('Verrou local invalide.');
      try{process.kill(state.pid,0);}catch(probe){
        if(probe.code==='ESRCH'){await unlink(path);continue;}
        throw new Error('Impossible de vérifier le processus de la base locale.');
      }
      throw new Error('Aurelia utilise déjà cette base locale. Arrêtez le serveur existant avant de relancer.');
    }
  }
  throw new Error('Impossible de réserver la base locale.');
}
