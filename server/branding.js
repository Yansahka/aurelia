import { fail, text } from './security.js';
import { DEFAULT_BRANDING, contrast } from '../shared/branding.js';
export { DEFAULT_BRANDING, contrast } from '../shared/branding.js';
export function color(value){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))fail(400,'Utilisez une couleur au format #RRGGBB.');return value.toLowerCase();}
export function imageUrl(value){
 if(value===null||value==='')return null;
 const input=text(value,'URL de l’image',2000);let url;
 if(/^\/media\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(input))return input;
 try{url=new URL(input);}catch{fail(400,'URL d’image invalide.');}
 if(url.protocol!=='https:'||!url.hostname||url.username||url.password)fail(400,'Utilisez une URL d’image HTTPS sans identifiants.');
 return input.replace(/^https:/i,'https:');
}
export function validateBranding(store,patch){
 const merged={...DEFAULT_BRANDING,...store,...patch};
 if(['backgroundColor','textColor'].some(k=>Object.hasOwn(patch,k))&&contrast(color(merged.backgroundColor),color(merged.textColor))<4.5)fail(400,'Le texte et le fond sont trop proches. Choisissez des couleurs plus contrastées.');
}
