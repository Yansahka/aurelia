export const variantKey=values=>JSON.stringify(Object.keys(values).sort().map(key=>[key,values[key]]));
export const variantLabel=(options,values)=>options.map(option=>`${option.name} : ${values[option.name]}`).join(' · ');
export function combinations(options){return options.reduce((rows,option)=>rows.flatMap(row=>option.values.map(value=>({...row,[option.name]:value}))),[{}]);}
export function variantSummary(variants){const active=variants.filter(v=>v.isActive),inStock=active.filter(v=>v.stock>0),priced=inStock.length?inStock:active.length?active:variants;return {price:priced.length?Math.min(...priced.map(v=>v.price)):0,stock:active.reduce((n,v)=>n+v.stock,0),oldPrice:null};}
