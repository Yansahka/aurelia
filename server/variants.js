import { fail, integer, text } from './security.js';
import { variantKey, variantLabel, variantSummary } from '../shared/variants.js';
export { variantSummary } from '../shared/variants.js';
export function prepareVariants(d,existing={}){
 if(Object.hasOwn(d,'variants')&&!Array.isArray(d.variants))fail(400,'Liste de variantes invalide.');
 const enabled=d.hasVariants??existing.hasVariants??false;
 if(typeof enabled!=='boolean')fail(400,'Le mode variantes est invalide.');
 if(!enabled){if(d.variants?.length)fail(400,'Activez les variantes avant de les renseigner.');return {hasVariants:false,variantOptions:[],variants:[]};}
 const options=d.variantOptions??existing.variantOptions,variants=d.variants??existing.variants;
 if(!Array.isArray(options)||options.length<1||options.length>3)fail(400,'Choisissez de 1 a 3 options de variantes.');
 const normalized=options.map(option=>{
  const name=text(option?.name,'Nom de l’option',50).normalize('NFC');
  if(!Array.isArray(option.values)||!option.values.length||option.values.length>20)fail(400,'Chaque option doit avoir de 1 a 20 valeurs.');
  const values=option.values.map(v=>text(v,'Valeur de l’option',80).normalize('NFC'));
  if(new Set(values.map(v=>v.toLowerCase())).size!==values.length)fail(400,'Une valeur d’option est repetee.');return {name,values};
 });
 if(new Set(normalized.map(o=>o.name.toLowerCase())).size!==normalized.length)fail(400,'Chaque option doit avoir un nom different.');
 if(normalized.reduce((n,o)=>n*o.values.length,1)>100)fail(400,'Limitez le produit a 100 combinaisons.');
 if(!Array.isArray(variants)||!variants.length||variants.length>100)fail(400,'Renseignez de 1 a 100 variantes.');
 const rows=variants.map(v=>{
  if(!v||!v.options||typeof v.options!=='object'||Array.isArray(v.options)||Object.keys(v.options).length!==normalized.length)fail(400,'Combinaison de variante invalide.');
  const values=Object.fromEntries(normalized.map(o=>{if(!Object.hasOwn(v.options,o.name)||!o.values.includes(v.options[o.name]))fail(400,'Une variante ne correspond pas aux options.');return [o.name,v.options[o.name]];}));
  const price=integer(v.price,'Prix de variante',1),stock=integer(v.stock,'Stock de variante');
  const oldPrice=v.oldPrice==null||v.oldPrice===''?null:integer(v.oldPrice,'Ancien prix de variante',price+1);
  if(v.isActive!==undefined&&typeof v.isActive!=='boolean')fail(400,'Visibilite de variante invalide.');
  if(v.id!==undefined&&(typeof v.id!=='string'||! /^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(v.id)))fail(400,'Identifiant de variante invalide.');
  return {id:v.id,options:values,key:variantKey(values),label:variantLabel(normalized,values),price,oldPrice,stock,reference:text(v.reference??'','Reference variante',80,false),isActive:v.isActive??true};
 });
 if(new Set(rows.map(v=>v.key)).size!==rows.length)fail(400,'Deux variantes ont la meme combinaison.');
 if(new Set(rows.filter(v=>v.id).map(v=>v.id)).size!==rows.filter(v=>v.id).length)fail(400,'Une variante est repetee.');
 integer(variantSummary(rows).stock,'Stock total');
 return {hasVariants:true,variantOptions:normalized,variants:rows};
}
export async function saveVariants(c,storeId,productId,data){
 const existing=(await c.query('SELECT id FROM product_variants WHERE product_id=$1 AND store_id=$2 AND archived_at IS NULL',[productId,storeId])).rows;
 for(const v of data.variants)if(v.id&&!existing.some(row=>row.id===v.id))fail(400,'Cette variante n’appartient pas a ce produit ou a ete retiree.');
 // Archiver sans supprimer preserve les references des commandes et evite les collisions de combinaisons.
 await c.query('UPDATE product_variants SET archived_at=now() WHERE product_id=$1 AND store_id=$2 AND archived_at IS NULL',[productId,storeId]);
 for(const [position,v] of data.variants.entries()){
  const values=[JSON.stringify(v.options),v.key,v.label,v.reference,v.price,v.oldPrice,v.stock,v.isActive,position];
  if(v.id)await c.query('UPDATE product_variants SET options=$1::jsonb,combination_key=$2,label=$3,reference=$4,price=$5,old_price=$6,stock=$7,is_active=$8,position=$9,archived_at=NULL WHERE id=$10 AND product_id=$11 AND store_id=$12',[...values,v.id,productId,storeId]);
  else await c.query('INSERT INTO product_variants(options,combination_key,label,reference,price,old_price,stock,is_active,position,product_id,store_id) VALUES($1::jsonb,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[...values,productId,storeId]);
 }
 await c.query('UPDATE products SET has_variants=$1,variant_options=$2::jsonb WHERE id=$3 AND store_id=$4',[data.hasVariants,JSON.stringify(data.variantOptions),productId,storeId]);
}
