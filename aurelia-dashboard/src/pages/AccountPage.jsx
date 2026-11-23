import {useState} from 'react';
import {api} from '../api';
import {invalidate,useQuery} from '../hooks/useQuery';
import {PageHead,QueryError,Skeleton} from '../components/ui/Bits';
const site=import.meta.env.VITE_SITE_URL||(import.meta.env.DEV?'http://localhost:5173':'');
export default function AccountPage(){
 const {data:user,error,refetch}=useQuery('me',api.me),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failure,setFailure]=useState('');
 if(error)return <QueryError message={error.message} onRetry={refetch}/>;if(!user)return <Skeleton h={240}/>;
 const resend=async()=>{setBusy(true);setFailure('');setMessage('');try{const result=await api.account.resendVerification();setMessage(result.message);}catch(e){setFailure(e.message);}finally{setBusy(false);}};
 return <><PageHead title="Mon compte" sub="Vérifiez votre adresse e-mail et retrouvez les options d’accès à votre compte."/><section className="card stack account-settings">
  <h3>Adresse e-mail</h3><p>{user.email}</p><p role="status">{user.emailVerified?'Adresse e-mail vérifiée.':'Adresse e-mail à vérifier.'}</p>
  {!user.emailVerified&&<><p className="muted">Un lien personnel permet de confirmer votre adresse. Votre boutique reste accessible pendant cette étape.</p><div className="acts"><button className="btn lime" disabled={busy} onClick={resend}>{busy?'Demande en cours…':'Renvoyer le lien de vérification'}</button></div></>}
  <button className="btn" onClick={()=>invalidate('me')}>Actualiser le statut</button>
  {message&&<p role="status">{message}</p>}{failure&&<p className="action-error" role="alert">{failure}</p>}
  <h3>Mot de passe</h3><p className="muted">Pour choisir un nouveau mot de passe, recevez un lien personnel à l’adresse de votre compte. Après modification, toutes vos sessions seront fermées.</p><a className="btn" href={site+'/compte/mot-de-passe-oublie'}>Recevoir un lien de réinitialisation</a>
 </section></>;
}
