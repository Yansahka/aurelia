import { useState } from 'react';
import { api } from '../api';
import { invalidate } from '../hooks/useQuery';
function CategoryRow({ category, run, busy }) {
 const [name,setName]=useState(category.name);
 return <form className="category-row" onSubmit={e=>{e.preventDefault();run(()=>api.categories.update(category.id,name));}}>
  <label className="field">Nom de catégorie<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required aria-label={'Renommer '+category.name}/></label>
  <button className="btn" disabled={busy || name===category.name}>Enregistrer</button>
  <button type="button" className="btn danger" disabled={busy} onClick={()=>run(()=>api.categories.remove(category.id))} aria-label={'Supprimer la catégorie '+category.name}>Supprimer</button>
 </form>;
}
export default function CategoryManager({ categories }) {
 const [open,setOpen]=useState(false),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const run=async fn=>{setBusy(true);setError('');try{await fn();invalidate('categories','products','stats');return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}};
 return <section className="card category-manager">
  <button className="btn" aria-expanded={open} onClick={()=>setOpen(!open)}>Gérer les catégories ({categories.length})</button>
  {open&&<div className="stack" style={{marginTop:16}}>
   <p className="muted">Classez vos produits selon votre activité. Une catégorie utilisée ne peut pas être supprimée.</p>
   <form className="category-row" onSubmit={async e=>{e.preventDefault();if(await run(()=>api.categories.create(name)))setName('');}}>
    <label className="field">Nouvelle catégorie<input value={name} onChange={e=>setName(e.target.value)} placeholder="Vêtements, Électronique, Épicerie…" required maxLength={80}/></label><button className="btn lime" disabled={busy}>Créer la catégorie</button>
   </form>
   {categories.map(c=><CategoryRow key={c.id+':'+c.name} category={c} run={run} busy={busy}/>)}
  </div>}{error&&<p className="action-error" role="alert">{error}</p>}
 </section>;
}
