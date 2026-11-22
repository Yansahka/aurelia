import { useRef, useState } from 'react';
import { api } from '../api';
import { productPlaceholder } from '../lib/art';

const ACCEPT='image/jpeg,image/png,image/webp';
export default function ImagePicker({images,onChange,label,description,multiple=false,max=1,onBusyChange}){
 const input=useRef(null),replacement=useRef(null),target=useRef(0);
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState('');
 const upload=async(event,replace=false)=>{
  const files=Array.from(event.target.files||[]);event.target.value='';if(!files.length)return;
  setError('');
  if(!replace&&images.length+files.length>max){setError(`Choisissez au maximum ${max-images.length} image(s) supplémentaire(s).`);return;}
  if(files.some(f=>f.size>10*1024*1024)){setError('Chaque image doit faire 10 Mo maximum.');return;}
  if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type))){setError('Choisissez des images JPEG, PNG ou WebP.');return;}
  setBusy(true);onBusyChange?.(true);const next=[...images];
  try{
   for(const [index,file] of files.entries()){
    setProgress(`Import de l’image ${index+1} sur ${files.length}…`);
    const asset=await api.media.upload(file);
    if(replace)next[target.current]=asset.url;else next.push(asset.url);
    onChange([...next]);
   }
   setProgress('Image'+(files.length>1?'s importées':' importée')+' — enregistrez vos modifications.');
  }catch(e){setError(e.message||'Import impossible. Réessayez.');setProgress('');}
  finally{setBusy(false);onBusyChange?.(false);}
 };
 const move=(index,d)=>{const next=[...images];[next[index],next[index+d]]=[next[index+d],next[index]];onChange(next);};
 return <fieldset className="catalogue-section image-picker" disabled={busy} aria-busy={busy}>
  <legend>{label}{multiple?` (${images.length}/${max})`:''}</legend>
  <p className="muted">{description} JPEG, PNG ou WebP · 10 Mo maximum par image.</p>
  <input ref={input} type="file" accept={ACCEPT} multiple={multiple} hidden aria-label={'Fichiers pour '+label} onChange={e=>upload(e)}/>
  <input ref={replacement} type="file" accept={ACCEPT} hidden aria-label={'Remplacement pour '+label} onChange={e=>upload(e,true)}/>
  <div className="image-picker-list">{images.map((url,index)=><div className="image-picker-item" key={url}>
   <img src={url} alt={multiple?(index===0?'Photo principale':'Photo '+(index+1)):label} onError={e=>{e.currentTarget.src=productPlaceholder;}}/>
   <div><strong>{multiple?(index===0?'Photo principale':'Photo '+(index+1)):label}</strong><div className="photo-actions">
    <button type="button" className="btn sm" aria-label={'Remplacer '+label+' '+(index+1)} onClick={()=>{target.current=index;replacement.current.click();}}>Remplacer</button>
    {multiple&&<><button type="button" className="btn sm" disabled={index===0} aria-label={'Monter la photo '+(index+1)} onClick={()=>move(index,-1)}>Monter</button><button type="button" className="btn sm" disabled={index===images.length-1} aria-label={'Descendre la photo '+(index+1)} onClick={()=>move(index,1)}>Descendre</button></>}
    <button type="button" className="btn sm danger" aria-label={'Retirer '+label+' '+(index+1)} onClick={()=>{onChange(images.filter((_,i)=>i!==index));setProgress('');}}>Retirer</button>
   </div></div>
  </div>)}</div>
  {images.length<max&&<button type="button" className="btn" onClick={()=>input.current.click()}>{multiple?'Choisir des photos':'Choisir '+(label==='Logo'?'le logo':'la couverture')}</button>}
  {progress&&<p className="image-picker-status" role="status">{progress}</p>}{error&&<p className="action-error" role="alert">{error}</p>}
 </fieldset>;
}
