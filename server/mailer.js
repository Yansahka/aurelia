import nodemailer from 'nodemailer';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
export function publicAppUrl(value=process.env.APP_PUBLIC_URL||'http://localhost:3000'){
 const url=new URL(value),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||(url.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&local&&url.protocol==='http:')))throw new Error('APP_PUBLIC_URL doit être une origine HTTPS (HTTP localhost autorisé en développement).');
 return url.origin;
}
export function createMailer(options={}){
 const mode=options.mode||process.env.MAIL_MODE||(process.env.NODE_ENV==='production'?'smtp':'file');
 const from=process.env.MAIL_FROM||'Aurelia <no-reply@aurelia.local>';
 if(mode==='file'){
  if(process.env.NODE_ENV==='production')throw new Error('Le mode e-mail fichier est réservé au développement. Configurer SMTP en production.');
  const directory=resolve(options.directory||process.env.MAIL_DIRECTORY||resolve(root,'.local/mail'));
  const transport=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'});
  return async message=>{
   const result=await transport.sendMail({from,to:message.to,subject:message.subject,text:message.text});
   await mkdir(directory,{recursive:true});const name=Date.now()+'-'+randomUUID();
   await writeFile(resolve(directory,name+'.eml'),result.message,{flag:'wx',mode:0o600});
   await writeFile(resolve(directory,name+'.txt'),`À : ${message.to}\nObjet : ${message.subject}\n\n${message.text}\n`,{flag:'wx',mode:0o600});
  };
 }
 if(mode!=='smtp'||!process.env.SMTP_HOST||!process.env.MAIL_FROM)throw new Error('Configurer MAIL_MODE=smtp, SMTP_HOST et MAIL_FROM.');
 const port=Number(process.env.SMTP_PORT||587),secure=process.env.SMTP_SECURE==='true'||port===465;
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('SMTP_PORT invalide.');
 if(!!process.env.SMTP_USER!==!!process.env.SMTP_PASSWORD)throw new Error('Renseigner SMTP_USER et SMTP_PASSWORD ensemble.');
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure,requireTLS:!secure,auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
 return message=>transport.sendMail({from,to:message.to,subject:message.subject,text:message.text});
}
