import { test } from 'node:test';
import assert from 'node:assert/strict';
import { report, overview } from '../stats.js';
import { relDays } from '../../aurelia-dashboard/src/lib/format.js';
import { reportCsvRows } from '../../aurelia-dashboard/src/lib/csv.js';

const now=new Date(), start=new Date(now.getFullYear(),now.getMonth()-11,1), end=new Date(now.getFullYear(),now.getMonth()+1,1);
const db={store:{monthlyTarget:0},products:[{id:'p',family:'bois'}],customers:[],items:[],orders:[]};
const add=(id,date,total,status='delivered')=>{db.orders.push({id,createdAt:date.toISOString(),total,status});db.items.push({orderId:id,productId:'p',name:'Oud',qty:1,unitPrice:total});};
add('before',new Date(start.getTime()-1),1000);add('boundary',start,42000);add('recent',now,269500);add('future',end,9000);

test('La période inclut sa borne de début et exclut la borne de fin pour tous les regroupements',()=>{
 for(const group of ['month','product','family']){
  const r=report(db,{metric:'revenue',group});assert.equal(r.total,311500);assert.equal(r.rows.reduce((a,r)=>a+r.value,0),311500);
 }
});
test('Les mesures non additives utilisent aussi la période commune',()=>{
 for(const group of ['month','product','family']){
  assert.equal(report(db,{metric:'orders',group}).total,2);
  assert.equal(report(db,{metric:'avg',group}).total,155750);
  assert.equal(report(db,{metric:'winrate',group}).total,1);
 }
});
test('Le CSV garde le montant exact, la devise et le mois avec son année',()=>{
 const report={metric:'revenue',group:'month',rows:[{key:'2026-11',label:'Nov',value:269500,share:1}]};
 const rows=reportCsvRows(report,'Chiffre d’affaires','FCFA');
 assert.deepEqual(rows[1],['2026-11',269500,'FCFA',100]);assert.ok(!JSON.stringify(rows).includes('270K'));
});
test('Le CSV conserve les noms des produits et les valeurs des ratios sans abréviation',()=>{
 const rows=reportCsvRows({metric:'winrate',group:'product',rows:[{key:'uuid',label:'Rose de Mai',value:.375,share:null}]},'Taux','FCFA');
 assert.deepEqual(rows[1],['Rose de Mai',37.5,'%', '']);
});
test('Une date de relance absente ou invalide ne devient pas une date de 1970',()=>{
 for(const value of [null,undefined,'','invalid'])assert.equal(relDays(value),'Non planifiée');
 assert.equal(relDays(new Date()),"aujourd'hui");
});
test('Les commandes sans relance planifiée restent absentes du bloc des échéances',()=>{
 const r=overview({...db,orders:[{id:'new',status:'new',total:1,createdAt:now.toISOString(),followUpAt:null}]});
 assert.deepEqual(r.closingSoon,[]);
});
