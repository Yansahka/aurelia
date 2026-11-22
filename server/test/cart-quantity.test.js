import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartReducer } from '../../aurelia-front/src/lib/cart.js';
test('La quantite choisie sur la fiche est conservee et ne depasse pas le stock au cumul',()=>{
 let items=cartReducer([],{type:'add',id:'sac',qty:2,max:3});assert.deepEqual(items,[{id:'sac',qty:2}]);
 items=cartReducer(items,{type:'add',id:'sac',qty:2,max:3});assert.equal(items[0].qty,3);
 items=cartReducer(items,{type:'qty',id:'sac',d:1,max:3});assert.equal(items[0].qty,3);
 items=cartReducer(items,{type:'qty',id:'sac',d:-1,max:3});assert.equal(items[0].qty,2);
});
test('Retirer une ligne ou vider le panier ne modifie pas les autres produits',()=>{
 let items=[{id:'sac',qty:1},{id:'tshirt',qty:2}];items=cartReducer(items,{type:'qty',id:'sac',d:-1,max:3});assert.deepEqual(items,[{id:'tshirt',qty:2}]);assert.deepEqual(cartReducer(items,{type:'clear'}),[]);
});
