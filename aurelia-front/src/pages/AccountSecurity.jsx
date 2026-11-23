import {useEffect,useState} from 'react';
import {CONFIG} from '../config';
import '../styles/landing.css';
import '../styles/account-security.css';

export default function AccountSecurity(){
 const mode=location.pathname.includes('reinitialiser')?'reset':location.pathname.includes('verifier-email')?'verify':'forgot';
 const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('token')||'');
 const [busy,setBusy]=useState(false),[done,setDone]=useState(''),[error,setError]=useState('');
 useEffect(()=>{document.title=(mode==='forgot'?'Mot de passe oublié':mode==='reset'?'Nouveau mot de passe':'Vérification e-mail')+' — Aurelia';history.replaceState(null,'',location.pathname);const onHash=()=>{if(location.hash)location.reload();};addEventListener('hashchange',onHash);return()=>removeEventListener('hashchange',onHash);},[mode]);
 const submit=async event=>{
  event.preventDefault();if(busy)return;setError('');
  const data=Object.fromEntries(new FormData(event.currentTarget));
  if(mode==='reset'&&data.password!==data.confirmation){setError('Les deux mots de passe doivent être identiques.');return;}
  setBusy(true);
  try{
   const path=mode==='forgot'?'forgot-password':mode==='reset'?'reset-password':'verify-email';
   const body=mode==='forgot'?{email:data.email}:mode==='reset'?{token,password:data.password}:{token};
   const res=await fetch(CONFIG.API_BASE+'/auth/'+path,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await res.json().catch(()=>({}));if(!res.ok)throw new Error(result.error?.message||'La demande n’a pas pu aboutir. Réessayez.');setDone(result.message);
  }catch(e){setError(e instanceof TypeError?'Le service est indisponible. Réessayez dans quelques instants.':e.message);}finally{setBusy(false);}
 };
 const missing=mode!=='forgot'&&!token;
 return <div className="al-site security-site"><header><a className="al-logo" href="/">aurelia<span>✳</span></a></header><main className="security-panel al-form-panel">
  <span className="al-kicker">VOTRE COMPTE AURELIA</span>
  <h1>{mode==='forgot'?'Retrouver votre accès.':mode==='reset'?'Un nouveau mot de passe.':'Confirmer votre adresse.'}</h1>
  <p>{mode==='forgot'?'Indiquez l’adresse e-mail utilisée pour votre compte vendeur.':mode==='reset'?'Choisissez un mot de passe de 12 à 128 caractères. Vos anciennes sessions seront fermées.':'Confirmez cette adresse pour sécuriser les échanges liés à votre compte.'}</p>
  {done?<div className="security-success" role="status"><p>{done}</p><a className="al-button al-dark" href={mode==='verify'?'/dashboard/#/account':'/#connexion'}>{mode==='verify'?'Retrouver mon compte':'Me connecter'}</a></div>:missing?<div><p className="al-error" role="alert">Le lien est incomplet. Ouvrez le lien reçu par e-mail ou demandez-en un nouveau.</p></div>:<form onSubmit={submit}>
   {mode==='forgot'&&<label>Adresse e-mail<input type="email" name="email" required maxLength={254} autoComplete="email"/></label>}
   {mode==='reset'&&<><label>Nouveau mot de passe<input type="password" name="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label><label>Confirmer le mot de passe<input type="password" name="confirmation" required minLength={12} maxLength={128} autoComplete="new-password"/></label></>}
   {error&&<p className="al-error" role="alert">{error}</p>}
   <button className="al-button al-dark" disabled={busy}>{busy?'Traitement…':mode==='forgot'?'Recevoir un lien':mode==='reset'?'Enregistrer mon mot de passe':'Confirmer mon adresse e-mail'}</button>
  </form>}
  {!done&&<p className="security-links">{mode==='reset'?<a href="/compte/mot-de-passe-oublie">Demander un nouveau lien</a>:mode==='verify'?<a href="/dashboard/#/account">Renvoyer le lien depuis mon compte</a>:null}<a href="/#connexion">Retour à la connexion</a></p>}
 </main></div>;
}
