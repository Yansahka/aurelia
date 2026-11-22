import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { invalidate, useQuery } from '../hooks/useQuery';
import { BADGES } from '../lib/constants';
import { productImage } from '../lib/art';
import { Switch } from './ui/Bits';
import Modal from './ui/Modal';

const DEFAULTS={name:'',tagline:'',description:'',reference:'',price:'',oldPrice:'',stock:'0',size:'',categoryId:'',badge:'',isActive:true,isFeatured:false,isNew:false};
function Form({ product, onClose }) {
 const toast=useToast();
 const categoriesQuery=useQuery('categories',api.categories.list);
 const [f,setF]=useState(()=>({...DEFAULTS,...product,price:product?String(product.price):'',oldPrice:product?.oldPrice?String(product.oldPrice):'',stock:String(product?.stock??0),categoryId:product?.categoryId||'',badge:product?.badge||''}));
 const [photos,setPhotos]=useState(()=>product?.images?.length?product.images:product?.image?[product.image]:[]);
 const [attributes,setAttributes]=useState(()=>Object.entries(product?.attributes||{}));
 const [newCategory,setNewCategory]=useState(''),[categoryBusy,setCategoryBusy]=useState(false);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const set=(key,value)=>setF(prev=>({...prev,[key]:value}));
 const field=key=>({value:f[key],onChange:e=>set(key,e.target.value)});
 const addCategory=async()=>{
  setCategoryBusy(true);setError('');try{const c=await api.categories.create(newCategory);set('categoryId',c.id);setNewCategory('');invalidate('categories');}catch(e){setError(e.message);}finally{setCategoryBusy(false);}
 };
 const submit=async e=>{
  e.preventDefault();setError('');
  const price=Number(f.price),stock=Number(f.stock),oldPrice=f.oldPrice===''?null:Number(f.oldPrice);
  if(!f.name.trim()||!Number.isInteger(price)||price<=0||!Number.isInteger(stock)||stock<0||oldPrice!==null&&(!Number.isInteger(oldPrice)||oldPrice<=price)){setError('Vérifiez le nom, le prix, le stock et le prix promotionnel.');return;}
  const keys=attributes.map(([key])=>key.trim());
  if(new Set(keys).size!==keys.length||attributes.some(([key,value])=>!key.trim()||!value.trim())){setError('Chaque caractéristique doit avoir un nom unique et une valeur.');return;}
  const data={name:f.name.trim(),tagline:f.tagline,description:f.description,reference:f.reference,size:f.size,price,stock,oldPrice,categoryId:f.categoryId||null,badge:f.badge,isActive:f.isActive,isFeatured:f.isFeatured,isNew:f.isNew,images:photos.map(url=>url.trim()),attributes:Object.fromEntries(attributes.map(([key,value])=>[key.trim(),value.trim()]))};
  setBusy(true);try{
   product?await api.products.update(product.id,data):await api.products.create(data);
   invalidate('products','stats','categories');toast(product?'Produit mis à jour':'Produit ajouté');onClose();
  }catch(x){setError(x.message||'Enregistrement impossible');setBusy(false);}
 };
 const movePhoto=(index,direction)=>setPhotos(prev=>{const next=[...prev];[next[index],next[index+direction]]=[next[index+direction],next[index]];return next;});
 return <form className="stack product-form" onSubmit={submit}>
  <div className="product-form-heading"><span className="thumb" style={{width:62,height:72}}><img src={productImage({...f,image:photos[0]})} alt=""/></span><label className="field">Nom du produit *<input {...field('name')} required maxLength={150} autoFocus/></label></div>
  <label className="field">Description courte<input {...field('tagline')} maxLength={500} placeholder="L’essentiel de votre produit en une phrase"/></label>
  <label className="field">Description détaillée<textarea {...field('description')} maxLength={5000} placeholder="Utilisation, composition, contenu du colis…"/></label>
  <div className="grid3">
   <label className="field">Prix (FCFA) *<input {...field('price')} inputMode="numeric" required/></label>
   <label className="field">Ancien prix<input {...field('oldPrice')} inputMode="numeric" placeholder="Facultatif"/></label>
   <label className="field">Stock<input {...field('stock')} inputMode="numeric" required/></label>
  </div>
  <div className="grid2"><label className="field">Référence<input {...field('reference')} maxLength={80} placeholder="Ex. TSH-001 (facultatif)"/></label><label className="field">Format / dimensions<input {...field('size')} maxLength={80} placeholder="Ex. 500 g, 30 × 20 cm, unité"/></label></div>
  <label className="field">Catégorie<select {...field('categoryId')} disabled={!categoriesQuery.data}><option value="">Sans catégorie</option>{categoriesQuery.data?.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
  {categoriesQuery.error&&<p role="alert">{categoriesQuery.error.message}<button type="button" className="btn" onClick={categoriesQuery.refetch}>Réessayer</button></p>}
  <div className="category-row"><label className="field">Créer une catégorie<input value={newCategory} onChange={e=>setNewCategory(e.target.value)} maxLength={80} placeholder="Ex. Accessoires"/></label><button type="button" className="btn" disabled={!newCategory.trim()||categoryBusy} onClick={addCategory}>Créer et sélectionner</button></div>
  <fieldset className="catalogue-section"><legend>Caractéristiques</legend><p className="muted">Ajoutez les informations utiles : matière, marque, poids…</p>
   {attributes.map(([name,value],index)=><div className="attribute-row" key={index}><label className="field">Nom<input aria-label={'Caractéristique '+(index+1)} value={name} maxLength={80} onChange={e=>setAttributes(prev=>prev.map((pair,i)=>i===index?[e.target.value,pair[1]]:pair))}/></label><label className="field">Valeur<input aria-label={'Valeur '+(index+1)} value={value} maxLength={500} onChange={e=>setAttributes(prev=>prev.map((pair,i)=>i===index?[pair[0],e.target.value]:pair))}/></label><button type="button" className="btn" aria-label={'Supprimer la caractéristique '+(index+1)} onClick={()=>setAttributes(prev=>prev.filter((_,i)=>i!==index))}>Retirer</button></div>)}
   <button type="button" className="btn" disabled={attributes.length>=20} onClick={()=>setAttributes(prev=>[...prev,['','']])}>Ajouter une caractéristique</button>
  </fieldset>
  <fieldset className="catalogue-section"><legend>Photos ({photos.length}/8)</legend><p className="muted">Utilisez des liens HTTPS vers vos photos. La première est la photo principale.</p>
   {photos.map((url,index)=><div className="photo-row" key={index}><label className="field">{index===0?'Photo principale':'Photo '+(index+1)}<input type="url" aria-label={'URL photo '+(index+1)} value={url} maxLength={2000} required placeholder="https://…" onChange={e=>setPhotos(prev=>prev.map((value,i)=>i===index?e.target.value:value))}/></label><div className="photo-actions"><button type="button" className="btn sm" disabled={index===0} aria-label={'Monter la photo '+(index+1)} onClick={()=>movePhoto(index,-1)}>Monter</button><button type="button" className="btn sm" disabled={index===photos.length-1} aria-label={'Descendre la photo '+(index+1)} onClick={()=>movePhoto(index,1)}>Descendre</button><button type="button" className="btn sm danger" aria-label={'Supprimer la photo '+(index+1)} onClick={()=>setPhotos(prev=>prev.filter((_,i)=>i!==index))}>Retirer</button></div></div>)}
   <button type="button" className="btn" disabled={photos.length>=8} onClick={()=>setPhotos(prev=>[...prev,''])}>Ajouter une photo</button>
  </fieldset>
  <label className="field">Étiquette<select {...field('badge')}><option value="">Aucune</option>{BADGES.map(b=><option key={b}>{b}</option>)}</select></label>
  {[['isActive','Visible dans la boutique'],['isFeatured','Mettre en avant'],['isNew','Afficher comme nouveauté']].map(([key,label])=><div className="product-setting" key={key}>{label}<Switch on={f[key]} onChange={value=>set(key,value)} label={label}/></div>)}
  {error&&<p className="action-error" role="alert">{error}</p>}
  <div className="acts"><button type="button" className="btn ghost" onClick={onClose}>Annuler</button><button className="btn lime" disabled={busy||categoryBusy}>{busy?'Enregistrement…':product?'Enregistrer':'Ajouter le produit'}</button></div>
 </form>;
}
export default function ProductFormModal(){
 const {productForm,closeProductForm}=useUI();
 const {data:products}=useQuery('products',api.products.list);
 if(!productForm)return null;
 const product=productForm.id?products?.find(p=>p.id===productForm.id):null;
 if(productForm.id&&!products)return null;
 return <Modal title={product?'Modifier le produit':'Nouveau produit'} onClose={closeProductForm} wide><Form key={productForm.id||'new'} product={product} onClose={closeProductForm}/></Modal>;
}
