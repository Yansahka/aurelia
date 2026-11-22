import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartReducer,cartLineKey,resolveCartLines } from '../../aurelia-front/src/lib/cart.js';
import { buildOrderMessage } from '../../aurelia-front/src/lib/whatsapp.js';
const product={id:'p1',name:'T-shirt',price:100,stock:5,hasVariants:true,variants:[{id:'blue',isActive:true,label:'Taille : M · Couleur : Bleu',reference:'M-B',price:12000,stock:3},{id:'red',isActive:true,label:'Taille : L · Couleur : Rouge',reference:'L-R',price:18000,stock:2}]};
test('Deux variantes d un meme produit forment deux lignes et stocks distincts',()=>{
 let items=cartReducer([],{type:'add',id:'p1',variantId:'blue',qty:2,max:3});items=cartReducer(items,{type:'add',id:'p1',variantId:'red',qty:1,max:2});
 assert.equal(items.length,2);assert.notEqual(cartLineKey(items[0]),cartLineKey(items[1]));
 const lines=resolveCartLines(items,()=>product);assert.ok(lines.every(l=>l.available));assert.equal(lines.reduce((n,l)=>n+l.product.price*l.qty,0),42000);
 items=cartReducer(items,{type:'qty',key:cartLineKey(items[1]),d:1,max:2});assert.equal(items[0].qty,2);assert.equal(items[1].qty,2);
});
test('Ancien panier simple, variante retiree ou retour en mode simple : pas de remplacement silencieux',()=>{
 for(const [items,p] of [[[{id:'p1',qty:1}],product],[[{id:'p1',variantId:'removed',qty:1,variantLabel:'Ancien bleu'}],product],[[{id:'p1',variantId:'blue',qty:1}],{...product,hasVariants:false}]]){const lines=resolveCartLines(items,()=>p);assert.equal(lines.length,1);assert.equal(lines[0].available,false);assert.ok(lines[0].unavailableReason);}
 const simple=resolveCartLines([{id:'old',qty:2}],()=>({id:'old',name:'Produit existant',price:25000,stock:15,hasVariants:false}));assert.equal(simple[0].available,true);assert.equal(simple[0].product.price*simple[0].qty,50000);
});
test('Une ligne hors stock reste visible et peut etre retiree ; message WhatsApp avec la variante',()=>{
 const items=[{id:'p1',variantId:'blue',qty:4},{id:'p1',variantId:'red',qty:1}];const lines=resolveCartLines(items,()=>product);assert.equal(lines[0].available,false);assert.equal(lines[1].available,true);
 const remaining=cartReducer(items,{type:'remove',key:cartLineKey(items[0])});assert.deepEqual(remaining,[items[1]]);
 const message=buildOrderMessage({store:{whatsappMessage:'Bonjour'},lines:[lines[1]],money:v=>v+' FCFA',total:18000});assert.match(message,/Couleur : Rouge/);assert.match(message,/L-R/);assert.match(message,/18000 FCFA/);
});
