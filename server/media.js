import multer from 'multer';
import sharp from 'sharp';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { fail } from './security.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const localUrl=new RegExp(`^/media/(${UUID})/(${UUID})\\.webp$`);
export const MEDIA_MAX_BYTES=10*1024*1024;
// Adaptateur local : les clés et URL restent indépendantes du chemin physique.
export function localMediaStorage(directory=process.env.MEDIA_DIRECTORY||resolve(root,'.local/uploads')){
 const base=resolve(directory);
 return {
  path:key=>resolve(base,key),
  async put(key,buffer){const path=resolve(base,key);await mkdir(dirname(path),{recursive:true});await writeFile(path,buffer,{flag:'wx'});},
  async remove(key){await unlink(resolve(base,key)).catch(e=>{if(e.code!=='ENOENT')throw e;});},
 };
}
export async function validateImageReference(c,storeId,value){
 if(typeof value!=='string'||!value.startsWith('/'))return;
 if(!localUrl.test(value))fail(400,'Référence d’image locale invalide.');
 if(!(await c.query('SELECT id FROM media_assets WHERE url=$1 AND store_id=$2',[value,storeId])).rows.length)fail(400,'Choisissez une image importée dans votre boutique.');
}
export function mediaRoutes(app,tenant,options={}){
 const storage=localMediaStorage(options.mediaDirectory);
 const parser=multer({storage:multer.memoryStorage(),limits:{fileSize:MEDIA_MAX_BYTES,files:1,fields:0,parts:1}}).single('image');
 const receive=(req,res)=>new Promise((ok,no)=>parser(req,res,e=>e?no(e):ok()));
 const limiter=rateLimit({windowMs:60000,limit:options.mediaLimit||30,standardHeaders:'draft-8',legacyHeaders:false,message:{error:{message:'Trop d’images importées. Réessayez dans une minute.'}}});
 app.post('/v1/media',limiter,async(req,res)=>{
  let key;
  try{
   const asset=await tenant(req,async(c,s)=>{
    // Authentifier avant de lire les octets du fichier.
    try{await receive(req,res);}catch(e){if(e instanceof multer.MulterError)throw e;fail(400,'Import interrompu ou formulaire de fichier invalide. Réessayez.');}
    if(!req.file)fail(400,'Choisissez une image JPEG, PNG ou WebP.');
    let output;
    try{
     const image=sharp(req.file.buffer,{limitInputPixels:40000000,animated:false,failOn:'warning'}),metadata=await image.metadata();
     if(!['jpeg','png','webp'].includes(metadata.format)||(metadata.pages||1)>1)fail(400,'Choisissez une image fixe JPEG, PNG ou WebP.');
     // Réencodage, orientation EXIF puis retrait des métadonnées personnelles.
     output=await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});
    }catch(e){if(e.status)throw e;fail(400,'Image illisible ou trop grande (40 mégapixels maximum).');}
    const id=randomUUID();key=`${s.id}/${id}.webp`;
    await storage.put(key,output.data);
    const asset={id,url:`/media/${key}`,mimeType:'image/webp',bytes:output.info.size,width:output.info.width,height:output.info.height};
    await c.query('INSERT INTO media_assets(id,store_id,storage_key,url,mime_type,bytes,width,height) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,s.id,key,asset.url,asset.mimeType,asset.bytes,asset.width,asset.height]);
    return asset;
   });
   res.status(201).json(asset);
  }catch(e){
   if(key)await storage.remove(key);
   if(e instanceof multer.MulterError)fail(e.code==='LIMIT_FILE_SIZE'?413:400,e.code==='LIMIT_FILE_SIZE'?'Image trop volumineuse : 10 Mo maximum.':'Importez une seule image dans le champ image.');
   throw e;
  }
 });
 // Images publiques par conception, noms opaques, pas de liste de répertoire.
 app.get(/^\/media\/.*$/, (req,res,next)=>{
  const match=localUrl.exec(req.path);if(!match)return res.sendStatus(404);
  res.type('webp').set('Cache-Control','public, max-age=31536000, immutable');
  res.sendFile(storage.path(`${match[1]}/${match[2]}.webp`),{dotfiles:'allow'},e=>{if(e){if(e.status===404||e.code==='ENOENT'){res.set('Cache-Control','no-store');res.sendStatus(404);}else next(e);}});
 });
}
