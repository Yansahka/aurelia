export function cartReducer(items,a){
 switch(a.type){
  case 'add':return items.some(x=>x.id===a.id)?items.map(x=>x.id===a.id?{...x,qty:Math.min(a.max,x.qty+a.qty)}:x):[...items,{id:a.id,qty:Math.min(a.max,a.qty)}];
  case 'qty':return items.map(x=>x.id===a.id?{...x,qty:Math.min(a.max,x.qty+a.d)}:x).filter(x=>x.qty>0);
  case 'clear':return [];
  default:return items;
 }
}
