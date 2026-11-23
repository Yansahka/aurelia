import {api} from '../api';
import {useQuery} from '../hooks/useQuery';
import {navigate} from '../hooks/useRoute';
export default function VerificationNotice(){const {data:user}=useQuery('me',api.me);if(!user||user.emailVerified||!user.email)return null;return <div className="verification-notice"><p>Votre adresse e-mail reste à vérifier.</p><button className="btn sm" onClick={()=>navigate('account')}>Vérifier mon adresse</button></div>;}
