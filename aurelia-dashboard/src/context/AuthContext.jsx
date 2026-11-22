import { createContext, useContext, useEffect, useState } from 'react';
import { CONFIG } from '../config';
import { clearCache } from '../hooks/useQuery';
import '../styles/auth.css';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
const site = import.meta.env.VITE_SITE_URL || (import.meta.env.DEV ? 'http://localhost:5173' : '/');

export function AuthProvider({ children }) {
  const [state,setState] = useState({loading:true,user:null});
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [checkError,setCheckError] = useState('');
  const check = async () => {
    setCheckError('');setState({loading:true,user:null});
    if(CONFIG.MOCK) return setState({loading:false,user:{name:'Démo'}});
    try {
      const res=await fetch(CONFIG.API_BASE+'/auth/me',{credentials:'include'});
      if(res.status===401)return setState({loading:false,user:null});
      if(!res.ok)throw new Error('Le serveur ne répond pas. Vérifiez que l’API et PostgreSQL sont démarrés.');
      setState({loading:false,user:await res.json()});
    } catch(e) {setCheckError(e.message);setState({loading:false,user:null});}
  };
  useEffect(()=>{
    check();
    const expired=()=>{clearCache();setState({loading:false,user:null});};
    window.addEventListener('auth:expired',expired);
    return ()=>window.removeEventListener('auth:expired',expired);
  },[]);
  const logout=async()=>{
    try {
      const res=await fetch(CONFIG.API_BASE+'/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});
      if(!res.ok)throw new Error('Déconnexion impossible. Réessayez.');
      clearCache();setState({loading:false,user:null});
    } catch(e) {window.alert(e.message);}
  };
  const login=async e=>{
    e.preventDefault();setError('');setBusy(true);
    const data=Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res=await fetch(CONFIG.API_BASE+'/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const body=await res.json();if(!res.ok)throw new Error(body.error?.message||'Connexion impossible.');
      clearCache();await check();
    } catch(e){setError(e.message);}finally{setBusy(false);}
  };
  if(state.loading)return <div className="auth-screen"><p role="status">Ouverture de votre espace…</p></div>;
  if(!state.user)return <main className="auth-screen"><section className="auth-box"><a className="auth-brand" href={site}>aurelia<span>✳</span></a><p>VOTRE ESPACE VENDEUR</p><h1>Heureux de vous retrouver.</h1><p>Connectez-vous pour gérer votre boutique et vos commandes.</p>{checkError&&<div role="alert">{checkError} <button onClick={check}>Réessayer</button></div>}<form onSubmit={login}><label>Adresse e-mail<input type="email" name="email" autoComplete="email" required maxLength={254}/></label><label>Mot de passe<input type="password" name="password" autoComplete="current-password" required maxLength={128}/></label>{error&&<div role="alert">{error}</div>}<button disabled={busy}>{busy?'Connexion…':'Me connecter'}</button></form><p>Vous lancez votre boutique ? <a href={site.replace(/\/$/,'')+'/#inscription'}>Créer mon compte</a></p></section></main>;
  return <Ctx.Provider value={{user:state.user,logout}}>{CONFIG.MOCK&&<div className="demo-notice">Mode démonstration : données fictives, aucun compte client connecté.</div>}{children}</Ctx.Provider>;
}
