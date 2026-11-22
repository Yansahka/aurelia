import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { productImage, productPlaceholder } from '../lib/art';
import { shopPath, productPath } from '../config';

export default function ProductPage({ id }) {
 const {store,money,products}=useStore(),{add,openBag}=useCart(),toast=useToast();
 const [state,setState]=useState({loading:true}),[retry,setRetry]=useState(0);
 const [photo,setPhoto]=useState(0),[quantity,setQuantity]=useState(1),[zoom,setZoom]=useState(false);
 const dialog=useRef(null);
 useEffect(()=>{let alive=true;setState({loading:true});api.product(id).then(data=>{if(alive)setState({...data,loading:false});}).catch(error=>{if(alive)setState({error,loading:false});});return()=>{alive=false;};},[id,retry]);
 useEffect(()=>{if(!state.product)return;document.title=state.product.name+' — '+store.name;const meta=document.querySelector('meta[name=description]');if(meta)meta.content=state.product.tagline||(state.product.description||'').slice(0,160)||store.name;},[state.product,store.name]);
 useEffect(()=>{if(zoom)dialog.current?.showModal();return()=>{dialog.current?.close();};},[zoom]);
 const root=shopPath();
 if(state.loading)return <main className="product-page"><p role="status">Chargement du produit…</p></main>;
 if(state.error)return <main className="product-page product-unavailable"><h1>Produit indisponible</h1><p>Ce produit n’est plus proposé à cette adresse, ou le service est temporairement indisponible.</p><button className="btn dk" onClick={()=>setRetry(n=>n+1)}>Réessayer</button><a className="btn" href={root+'#shop'}>Retour à la boutique</a></main>;
 const p=state.product,images=p.images?.length?p.images:[productImage(p)],qty=Number(quantity);
 const valid=Number.isInteger(qty)&&qty>=1&&qty<=p.stock;
 const related=products.filter(x=>x.id!==p.id&&x.categoryId===p.categoryId).slice(0,4);
 const copy=async()=>{try{await navigator.clipboard.writeText(window.location.href);toast('Lien du produit copié.');}catch{toast('Copiez l’adresse de cette page pour partager ce produit.');}};
 const addProduct=()=>{if(add(p.id,qty))openBag();};
 return <main className="product-page">
  <nav className="product-breadcrumb" aria-label="Fil d’Ariane"><a href={root+'#shop'}>{store.name}</a><span>/</span>{p.categoryName&&<><a href={root+'?category='+encodeURIComponent(p.categoryId)+'#shop'}>{p.categoryName}</a><span>/</span></>}<span>{p.name}</span></nav>
  <div className="product-detail-grid">
   <section className="product-gallery" aria-label={'Galerie de '+p.name}>
    <button className="product-main-photo" onClick={()=>setZoom(true)} aria-label={'Agrandir la photo de '+p.name}><img src={images[photo]} alt={p.name+' — photo '+(photo+1)} onError={e=>{e.currentTarget.src=productPlaceholder;}}/><span>Agrandir</span></button>
    {images.length>1&&<div className="product-thumbnails">{images.map((url,index)=><button key={url} aria-label={'Photo '+(index+1)+' de '+p.name} aria-pressed={photo===index} onClick={()=>setPhoto(index)}><img src={url} alt="" onError={e=>{e.currentTarget.src=productPlaceholder;}}/></button>)}</div>}
   </section>
   <section className="product-purchase" aria-label="Informations et commande">
    {p.badge&&<span className="product-badge">{p.badge}</span>}<h1>{p.name}</h1>{p.tagline&&<p className="product-tagline">{p.tagline}</p>}
    <div className="product-price">{money(p.price)}{p.oldPrice&&<><s>{money(p.oldPrice)}</s><span>−{Math.round((1-p.price/p.oldPrice)*100)} %</span></>}</div>
    <p className={'product-stock'+(p.stock===0?' out':'')}>{p.stock===0?'Épuisé — indisponible à la commande':p.stock===1?'Dernière unité disponible':p.stock+' en stock'}</p>
    <dl className="product-meta">{p.reference&&<div><dt>Référence</dt><dd>{p.reference}</dd></div>}{p.size&&<div><dt>Format / dimensions</dt><dd>{p.size}</dd></div>}{p.categoryName&&<div><dt>Catégorie</dt><dd>{p.categoryName}</dd></div>}</dl>
    <div className="product-buy-row"><label>Quantité<input type="number" min="1" max={Math.max(1,p.stock)} step="1" value={quantity} disabled={p.stock===0} onChange={e=>setQuantity(e.target.value)}/></label><button className="btn dk product-add" disabled={!valid||p.stock===0} onClick={addProduct}>{p.stock===0?'Épuisé':'Ajouter au panier'}</button></div>
    {!valid&&p.stock>0&&<p role="alert">Choisissez une quantité de 1 à {p.stock}.</p>}
    <p className="product-order-note">Préparez votre panier, puis envoyez votre demande sur WhatsApp. La boutique confirmera la disponibilité, la livraison et le règlement.</p>
    <button className="product-share" onClick={copy}>Copier le lien du produit</button>
   </section>
  </div>
  {(p.description||Object.keys(p.attributes||{}).length>0)&&<section className="product-specifications"><h2>À propos de ce produit</h2>{p.description&&<p>{p.description}</p>}{Object.keys(p.attributes||{}).length>0&&<><h3>Caractéristiques</h3><dl>{Object.entries(p.attributes).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></>}</section>}
  {state.reviews.length>0&&<section className="product-reviews"><h2>Avis sur ce produit</h2>{state.reviews.map((r,index)=><article key={index}><p aria-label={r.rating+' sur 5'}>{'★'.repeat(r.rating)}</p><blockquote>{r.text}</blockquote><span>{r.author}</span></article>)}</section>}
  {related.length>0&&<section className="product-related"><h2>Dans la même catégorie</h2><div>{related.map(other=><a key={other.id} href={productPath(other)}><img src={productImage(other)} alt="" loading="lazy" onError={e=>{e.currentTarget.src=productPlaceholder;}}/><strong>{other.name}</strong><span>{money(other.price)}</span></a>)}</div></section>}
  <dialog className="product-zoom" ref={dialog} onClose={()=>setZoom(false)} onClick={e=>{if(e.target===dialog.current)setZoom(false);}} aria-label={'Photo agrandie de '+p.name}><button className="btn" autoFocus onClick={()=>setZoom(false)}>Fermer la photo</button><img src={images[photo]} alt={p.name+' — photo '+(photo+1)} onError={e=>{e.currentTarget.src=productPlaceholder;}}/></dialog>
 </main>;
}
