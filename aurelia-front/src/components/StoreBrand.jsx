import { useState } from 'react';
import { useStore } from '../context/StoreContext';
export default function StoreBrand(){
 const {store}=useStore(),[broken,setBroken]=useState(null);
 return <>{store.logoUrl&&broken!==store.logoUrl&&<img className="store-logo" key={store.logoUrl} src={store.logoUrl} alt="" onError={()=>setBroken(store.logoUrl)}/>}<span>{store.name}</span></>;
}
