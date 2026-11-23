import {rateLimit} from 'express-rate-limit';
import {newToken,digest,email,fail,hashPassword} from './security.js';
import {createMailer,publicAppUrl} from './mailer.js';

export function checkPassword(value){if(typeof value!=='string'||!value.trim()||value.length<12||value.length>128)fail(400,'Le mot de passe doit contenir de 12 à 128 caractères et ne peut pas être composé uniquement d’espaces.');return value;}
export function accountSecurity(app,{pool,transaction,authenticate,options}){
 const origin=publicAppUrl(options.publicUrl),send=options.mailer||createMailer(options.mail);
 const pending=new Set();
 const dispatch=message=>{const job=Promise.resolve().then(()=>send(message)).catch(()=>{if(!options.quiet)console.error('E-mail de compte non remis. Vérifiez la configuration du service e-mail.');}).finally(()=>pending.delete(job));pending.add(job);};
 app.locals.flushMail=async()=>{while(pending.size)await Promise.all([...pending]);};
 const limiter=rateLimit({windowMs:15*60000,limit:options.accountLimit||10,standardHeaders:'draft-8',legacyHeaders:false,message:{error:{message:'Trop de demandes. Réessayez dans 15 minutes.'}}});
 async function issue(userId,purpose){
  return transaction(async c=>{
   const user=(await c.query('SELECT id,email,email_verified_at FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
   if(!user||purpose==='verify-email'&&user.email_verified_at)return null;
   const recent=await c.query("SELECT id FROM account_tokens WHERE user_id=$1 AND purpose=$2 AND created_at>now()-interval '60 seconds' LIMIT 1",[userId,purpose]);if(recent.rows.length)return null;
   const token=newToken(),expires=purpose==='reset-password'?'30 minutes':'24 hours';
   await c.query('UPDATE account_tokens SET used_at=now() WHERE user_id=$1 AND purpose=$2 AND used_at IS NULL',[userId,purpose]);
   await c.query('INSERT INTO account_tokens(user_id,purpose,token_hash,email_snapshot,expires_at) VALUES($1,$2,$3,$4,now()+$5::interval)',[userId,purpose,digest(token),user.email,expires]);
   const reset=purpose==='reset-password',url=origin+(reset?'/compte/reinitialiser':'/compte/verifier-email')+'#token='+token;
   return {to:user.email,purpose,subject:reset?'Réinitialisez votre mot de passe Aurelia':'Vérifiez votre adresse e-mail Aurelia',text:`Bonjour,\n\n${reset?'Pour choisir un nouveau mot de passe':'Pour confirmer votre adresse e-mail'}, ouvrez ce lien :\n${url}\n\nCe lien personnel est utilisable une seule fois et expire dans ${reset?'30 minutes':'24 heures'}. ${reset?'Le changement déconnectera toutes les sessions de votre compte.':'Votre boutique reste accessible pendant la vérification.'}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message. Ne partagez pas ce lien.\n\nAurelia`};
  });
 }
 const request=async(userId,purpose)=>{const message=await issue(userId,purpose);if(message)dispatch(message);};
 async function consume(raw,purpose,fn){
  if(typeof raw!=='string'||! /^[a-f0-9]{64}$/.test(raw))fail(400,'Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien.');
  const hash=digest(raw);
  return transaction(async c=>{
   const candidate=(await c.query('SELECT user_id FROM account_tokens WHERE token_hash=$1 AND purpose=$2',[hash,purpose])).rows[0];if(!candidate)fail(400,'Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien.');
   // Toujours verrouiller le compte avant le jeton : génération et consommation sérialisées.
   const user=(await c.query('SELECT id,email,email_verified_at FROM users WHERE id=$1 FOR UPDATE',[candidate.user_id])).rows[0];
   const token=(await c.query('SELECT id,email_snapshot FROM account_tokens WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at>now() FOR UPDATE',[hash,purpose])).rows[0];
   if(!token||!user||token.email_snapshot!==user.email)fail(400,'Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien.');
   await fn(c,user);
   await c.query('UPDATE account_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL'+(purpose==='verify-email'?" AND purpose='verify-email'":''),[user.id]);
   return user;
  });
 }
 app.post('/v1/auth/forgot-password',limiter,async(req,res)=>{
  const address=email(req.body?.email),user=(await pool.query('SELECT id FROM users WHERE lower(email)=$1',[address])).rows[0];
  if(user)await request(user.id,'reset-password');
  res.status(202).json({message:'Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé. Vérifiez aussi vos courriers indésirables.'});
 });
 app.post('/v1/auth/reset-password',limiter,async(req,res)=>{
  const hash=await hashPassword(checkPassword(req.body?.password));
  const user=await consume(req.body?.token,'reset-password',async(c,user)=>{await c.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2',[hash,user.id]);await c.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);});
  dispatch({to:user.email,purpose:'password-changed',subject:'Votre mot de passe Aurelia a été modifié',text:`Votre mot de passe Aurelia vient d’être modifié. Toutes les sessions de votre compte ont été fermées.\n\nSi vous n’êtes pas à l’origine de ce changement, demandez immédiatement une nouvelle réinitialisation depuis ${origin}/compte/mot-de-passe-oublie .\n\nAurelia`});
  res.json({message:'Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.'});
 });
 app.post('/v1/auth/resend-verification',limiter,async(req,res)=>{const user=await authenticate(req);await request(user.id,'verify-email');res.status(202).json({message:'Si votre adresse reste à vérifier, un lien vous sera envoyé. Attendez une minute entre deux demandes.'});});
 app.post('/v1/auth/verify-email',limiter,async(req,res)=>{await consume(req.body?.token,'verify-email',(c,user)=>c.query('UPDATE users SET email_verified_at=coalesce(email_verified_at,now()),updated_at=now() WHERE id=$1',[user.id]));res.json({message:'Votre adresse e-mail est vérifiée. Vous pouvez retrouver votre dashboard.'});});
 return {request};
}
