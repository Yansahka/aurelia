export const cartLineKey=item=>item.id+(item.variantId?'::'+item.variantId:'');
export function cartReducer(items,a){
 const key=a.key||cartLineKey(a);
 switch(a.type){
  case 'add':return items.some(x=>cartLineKey(x)===key)?items.map(x=>cartLineKey(x)===key?{...x,qty:Math.min(a.max,x.qty+a.qty)}:x):[...items,{id:a.id,qty:Math.min(a.max,a.qty),...(a.variantId?{variantId:a.variantId}:{}),...(a.name?{name:a.name}:{}),...(a.variantLabel?{variantLabel:a.variantLabel}:{})}];
  case 'qty':return items.map(x=>cartLineKey(x)===key?{...x,qty:Math.min(a.max,x.qty+a.d)}:x).filter(x=>x.qty>0);
  case 'remove':return items.filter(x=>cartLineKey(x)!==key);
  case 'clear':return [];
  default:return items;
 }
}
export function resolveCartLines(items,byId){
 return items.map(item=>{
  const base=byId(item.id),variant=base?.variants?.find(v=>v.id===item.variantId&&v.isActive);
  let reason='';
  if(!base)reason='Produit indisponible.';
  else if(base.hasVariants&&!item.variantId)reason='Choisissez une variante pour cet article.';
  else if(item.variantId&&(!base.hasVariants||!variant))reason='Cette variante n’est plus disponible.';
  const product={...(base||{id:item.id,name:item.name||'Produit indisponible'}),...(variant?{price:variant.price,oldPrice:variant.oldPrice,stock:variant.stock,reference:variant.reference}:{}),variantLabel:variant?.label||item.variantLabel||''};
  if(!reason&&(!product.stock||item.qty>product.stock))reason='Stock disponible : '+(product.stock||0)+'. Ajustez votre panier.';
  return {key:cartLineKey(item),product,variantId:item.variantId||null,qty:item.qty,available:!reason,unavailableReason:reason};
 });
}
