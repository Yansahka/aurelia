import { useEffect, useState } from 'react';
import { combinations,variantKey,variantLabel } from '../../../shared/variants.js';
import { Switch } from './ui/Bits';
export default function VariantEditor({ options,variants,onChange,onDirty,basePrice }){
 const [axes,setAxes]=useState(()=>options.length?options.map(o=>({name:o.name,values:o.values.join(', ')})):[{name:'Taille',values:''}]);
 const [error,setError]=useState(''),[query,setQuery]=useState('');
 useEffect(()=>{onDirty(!options.length);},[]);
 const editAxis=(index,key,value)=>{setAxes(prev=>prev.map((axis,i)=>i===index?{...axis,[key]:value}:axis));onDirty(true);};
 const generate=()=>{
  const next=axes.map(a=>({name:a.name.trim(),values:a.values.split(',').map(v=>v.trim()).filter(Boolean)}));
  if(next.some(a=>!a.name||!a.values.length||a.values.length>20||new Set(a.values.map(v=>v.toLowerCase())).size!==a.values.length)||new Set(next.map(a=>a.name.toLowerCase())).size!==next.length){setError('Renseignez des options distinctes avec de 1 à 20 valeurs séparées par des virgules.');return;}
  if(next.reduce((n,a)=>n*a.values.length,1)>100){setError('Limitez le produit à 100 combinaisons.');return;}
  const prior=new Map(variants.map(v=>[variantKey(v.options),v]));
  onChange(next,combinations(next).map(values=>prior.get(variantKey(values))||{options:values,price:basePrice||'',oldPrice:null,stock:0,reference:'',isActive:true}));onDirty(false);setError('');
 };
 const update=(index,key,value)=>onChange(options,variants.map((v,i)=>i===index?{...v,[key]:value}:v));
 return <fieldset className="catalogue-section variant-editor"><legend>Options et variantes</legend>
  <p className="muted">Jusqu’à 3 options et 100 combinaisons. Les nouvelles variantes commencent avec un stock de 0. Régénérer conserve les combinaisons identiques ; celles retirées seront archivées à l’enregistrement.</p>
  {axes.map((axis,index)=><div className="variant-axis" key={index}><label className="field">Nom de l’option {index+1}<input value={axis.name} maxLength={50} placeholder="Taille, Couleur, Format…" onChange={e=>editAxis(index,'name',e.target.value)}/></label><label className="field">Valeurs de {axis.name||'l’option'}<input aria-label={'Valeurs option '+(index+1)} value={axis.values} placeholder="S, M, L" onChange={e=>editAxis(index,'values',e.target.value)}/></label><button type="button" className="btn" disabled={axes.length===1} onClick={()=>{setAxes(prev=>prev.filter((_,i)=>i!==index));onDirty(true);}}>Retirer l’option {index+1}</button></div>)}
  <div className="photo-actions"><button type="button" className="btn" disabled={axes.length>=3} onClick={()=>{setAxes(prev=>[...prev,{name:prev.length===1?'Couleur':'Format',values:''}]);onDirty(true);}}>Ajouter une option</button><button type="button" className="btn lime" onClick={generate}>Générer les variantes</button></div>
  {error&&<p role="alert" className="action-error">{error}</p>}
  {variants.length>0&&<><h3>{variants.length} variantes</h3><label className="field">Filtrer les variantes<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Combinaison ou référence"/></label></>}
  {variants.map((v,index)=>({v,index})).filter(({v})=>(Object.values(v.options).join(' ')+' '+v.reference).toLowerCase().includes(query.toLowerCase())).map(({v,index})=><section className="variant-card" key={v.id||variantKey(v.options)}>
   <h4>{variantLabel(options,v.options)}</h4><div className="grid3">
    <label className="field">Prix (FCFA) *<input aria-label={'Prix variante '+(index+1)} value={v.price} inputMode="numeric" required onChange={e=>update(index,'price',e.target.value)}/></label>
    <label className="field">Ancien prix<input aria-label={'Ancien prix variante '+(index+1)} value={v.oldPrice??''} inputMode="numeric" onChange={e=>update(index,'oldPrice',e.target.value)}/></label>
    <label className="field">Stock *<input aria-label={'Stock variante '+(index+1)} value={v.stock} inputMode="numeric" required onChange={e=>update(index,'stock',e.target.value)}/></label>
   </div><label className="field">Référence de variante<input aria-label={'Référence variante '+(index+1)} value={v.reference} maxLength={80} onChange={e=>update(index,'reference',e.target.value)}/></label>
   <div className="product-setting">Proposer cette variante<Switch on={v.isActive} onChange={value=>update(index,'isActive',value)} label={'Proposer '+variantLabel(options,v.options)}/></div><button type="button" className="btn danger" onClick={()=>onChange(options,variants.filter((_,i)=>i!==index))}>Retirer cette variante</button>
  </section>)}
 </fieldset>;
}
