import { fail, text } from './security.js';
import { row } from './data.js';
import { variantSummary } from '../shared/variants.js';
import { imageUrl } from './branding.js';
import { validateImageReference } from './media.js';
const id = value => {if(typeof value!=='string'||! /^[a-f0-9-]{36}$/i.test(value))fail(400,'Categorie invalide.');return value;};
export async function catalogueProducts(c,storeId,publicOnly=false) {
 const products=(await c.query(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id AND c.store_id=p.store_id WHERE p.store_id=$1 ${publicOnly?'AND p.is_active AND p.deleted_at IS NULL':''} ORDER BY p.position,p.created_at,p.id`,[storeId])).rows.map(row);
 const photos=(await c.query('SELECT product_id,url,position FROM product_images WHERE store_id=$1 ORDER BY position',[storeId])).rows;
 const variants=(await c.query(`SELECT * FROM product_variants WHERE store_id=$1 AND archived_at IS NULL ${publicOnly?'AND is_active':''} ORDER BY position,id`,[storeId])).rows.map(row);
 return products.map(p=>{const rows=variants.filter(v=>v.productId===p.id);const summary=p.hasVariants&&rows.length?variantSummary(rows):p.hasVariants?{price:p.price,stock:0,oldPrice:null}:{};const variantOptions=publicOnly&&p.hasVariants?p.variantOptions.map(o=>({...o,values:o.values.filter(value=>rows.some(v=>v.options[o.name]===value))})):p.variantOptions;return {...p,...summary,variantOptions,variants:rows,images:photos.filter(i=>i.product_id===p.id).map(i=>i.url)};});
}
export async function productExtras(c,storeId,d,existing={}) {
 const p={...existing,...d};
 const categoryId=p.categoryId||null;
 if(categoryId && !(await c.query('SELECT id FROM categories WHERE id=$1 AND store_id=$2',[id(categoryId),storeId])).rows.length)fail(400,'Choisissez une categorie de votre boutique.');
 const attributes=p.attributes??{};
 if(!attributes || Array.isArray(attributes)||typeof attributes!=='object'||Object.keys(attributes).length>20)fail(400,'Caracteristiques invalides (20 maximum).');
 for(const [key,value] of Object.entries(attributes)) {
  text(key,'Nom de caracteristique',80);text(value,'Valeur de caracteristique',500);
 }
 let images=Object.hasOwn(d,'images')?d.images:Object.hasOwn(d,'image')?(d.image?[d.image]:[]):existing.images||(existing.image?[existing.image]:[]);
 if(!Array.isArray(images)||images.length>8)fail(400,'Galerie : 8 photos maximum.');
 images=images.map(url=>{const value=imageUrl(text(url,'URL de photo',2000));if(!value)fail(400,'Photo invalide.');return value;});
 for(const url of images)await validateImageReference(c,storeId,url);
 if(new Set(images).size!==images.length)fail(400,'Chaque photo doit etre differente.');
 return {categoryId,reference:text(p.reference??'','Reference',80,false),description:text(p.description??'','Description',5000,false),attributes,images};
}
export async function saveExtras(c,storeId,productId,extras) {
 await c.query('UPDATE products SET category_id=$1,reference=$2,description=$3,attributes=$4::jsonb,image_url=$5 WHERE id=$6 AND store_id=$7',[extras.categoryId,extras.reference,extras.description,JSON.stringify(extras.attributes),extras.images[0]||null,productId,storeId]);
 await c.query('DELETE FROM product_images WHERE product_id=$1 AND store_id=$2',[productId,storeId]);
 for(const [position,url] of extras.images.entries())await c.query('INSERT INTO product_images(store_id,product_id,url,position) VALUES($1,$2,$3,$4)',[storeId,productId,url,position]);
 return (await catalogueProducts(c,storeId)).find(p=>p.id===productId);
}
export function categoryRoutes(app,tenant) {
 app.get('/v1/categories',async(req,res)=>res.json(await tenant(req,async(c,s)=>({items:(await c.query('SELECT * FROM categories WHERE store_id=$1 ORDER BY position,name',[s.id])).rows.map(row)}))));
 app.post('/v1/categories',async(req,res)=>res.status(201).json(await tenant(req,async(c,s)=>row((await c.query('INSERT INTO categories(store_id,name,slug) VALUES($1,$2,gen_random_uuid()::text) RETURNING *',[s.id,text(req.body?.name,'Nom de categorie',80)])).rows[0]))));
 app.patch('/v1/categories/:id',async(req,res)=>res.json(await tenant(req,async(c,s)=>{
  const category=(await c.query('UPDATE categories SET name=$1 WHERE id=$2 AND store_id=$3 RETURNING *',[text(req.body?.name,'Nom de categorie',80),id(req.params.id),s.id])).rows[0];
  if(!category)fail(404,'Categorie introuvable.');return row(category);
 })));
 app.delete('/v1/categories/:id',async(req,res)=>{
  await tenant(req,async(c,s)=>{
   if((await c.query('SELECT id FROM products WHERE category_id=$1 AND store_id=$2 LIMIT 1',[id(req.params.id),s.id])).rows.length)fail(409,'Cette categorie est utilisee. Reaffectez ses produits avant de la supprimer.');
   const result=await c.query('DELETE FROM categories WHERE id=$1 AND store_id=$2 RETURNING id',[id(req.params.id),s.id]);if(!result.rows.length)fail(404,'Categorie introuvable.');
  });res.sendStatus(204);
 });
}
