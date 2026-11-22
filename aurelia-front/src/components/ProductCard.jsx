import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useState } from 'react';
import { productImage, productPlaceholder } from '../lib/art';

export default function ProductCard({ product: p }) {
  const { money } = useStore();
  const { add } = useCart();
  const [photo,setPhoto]=useState(0);
  const images=p.images?.length?p.images:[productImage(p)];
  return (
    <article className="pc">
      <div className="pi">
        <img src={images[photo]||images[0]} alt={p.name+' — photo '+(photo+1)} loading="lazy" onError={e=>{e.currentTarget.src=productPlaceholder;}}/>
        {p.badge && <span className="bdg">{p.badge}</span>}
        {images.length>1&&<div className="product-photo-picker" aria-label={'Photos de '+p.name}>{images.map((_,index)=><button key={index} type="button" aria-label={'Photo '+(index+1)+' de '+p.name} aria-pressed={photo===index} onClick={()=>setPhoto(index)}>{index+1}</button>)}</div>}
      </div>
      <div className="pm">
        {(p.swatches || []).map((c) => <i key={c} className="sw" style={{ background: c }} />)}
        <span>{[p.categoryName,p.size].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="pn">{p.name}</div>
      <div className="pt">{p.tagline}</div>
      {(p.description||p.reference||Object.keys(p.attributes||{}).length>0)&&<details className="product-details"><summary>Détails du produit</summary>{p.description&&<p>{p.description}</p>}{p.reference&&<p>Réf. {p.reference}</p>}<dl>{Object.entries(p.attributes||{}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details>}
      <div className="pf">
        <span className="pr">{money(p.price)}{p.oldPrice && <s>{money(p.oldPrice)}</s>}</span>
        <button className="add" disabled={p.stock === 0} onClick={() => add(p.id)}>{p.stock === 0 ? 'Épuisé' : '+ Panier'}</button>
      </div>
    </article>
  );
}
