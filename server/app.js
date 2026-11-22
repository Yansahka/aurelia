import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, verifyPassword, digest, newToken, fail, text, email, phone, slug, integer } from './security.js';
import { row, loadData, publicHome } from './data.js';
import { overview, report, enrich } from './stats.js';
import { catalogueProducts, productExtras, saveExtras, categoryRoutes } from './catalogue.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const uuid = id => { if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) fail(404, 'Élément introuvable.'); return id; };
const own = (obj, key) => Object.hasOwn(obj, key);
const one = result => { if (!result.rows[0]) fail(404, 'Élément introuvable.'); return row(result.rows[0]); };
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/v1' };

export function createApp(pool, options = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
  app.use(helmet({ contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'data:', 'https:'], 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], 'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'] } }, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const origins = (process.env.APP_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:5174').split(',');
  app.use('/v1', (req,res,next) => {
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) return res.status(403).json({error:{message:'Origine non autorisée.'}});
    if (origin) { res.set('Access-Control-Allow-Origin', origin); res.set('Access-Control-Allow-Credentials','true'); res.vary('Origin'); }
    res.set('Access-Control-Allow-Headers','Content-Type');
    res.set('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
    res.set('Cache-Control','no-store');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    // Les mutations avec cookie nécessitent une origine connue + JSON (protection CSRF).
    // Content-Type doit aussi être vérifié sur DELETE sans corps (req.is() renvoie alors null).
    const jsonContent = /^application\/json(?:\s*;|$)/i.test(req.get('Content-Type') || '');
    if (!['GET','HEAD'].includes(req.method) && (!origin || !jsonContent)) return res.status(403).json({error:{message:'Requête JSON depuis une origine autorisée requise.'}});
    next();
  });
  app.use(express.json({limit:'200kb'}));
  app.use('/v1', rateLimit({ windowMs: 60000, limit: options.rateLimit || 300, standardHeaders:'draft-8', legacyHeaders:false, message:{error:{message:'Trop de requêtes. Réessayez dans une minute.'}} }));
  const authLimiter = rateLimit({windowMs:900000, limit: options.authLimit || 20, standardHeaders:'draft-8',legacyHeaders:false,message:{error:{message:'Trop de tentatives. Réessayez dans 15 minutes.'}}});
  async function transaction(fn) {
    const c = await pool.connect();
    try { await c.query('BEGIN'); const result = await fn(c); await c.query('COMMIT'); return result; }
    catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
  async function session(c, res, userId) {
    const token = newToken();
    await c.query("DELETE FROM sessions WHERE expires_at < now()");
    await c.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[digest(token),userId]);
    return () => res.cookie('aurelia_session',token,{...cookieOptions,maxAge:7*864e5});
  }
  const readToken = req => {
    const token = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('aurelia_session='))?.slice(16);
    return /^[a-f0-9]{64}$/.test(token || '') ? token : null;
  };
  async function authenticate(req) {
    const token = readToken(req); if (!token) fail(401,'Connectez-vous à votre compte.');
    const r = await pool.query(`SELECT u.id,u.name,u.email,s.id AS store_id FROM sessions se JOIN users u ON u.id=se.user_id JOIN stores s ON s.owner_id=u.id AND s.status='active' WHERE se.token_hash=$1 AND se.expires_at>now()`,[digest(token)]);
    if (!r.rows[0]) fail(401,'Session expirée. Reconnectez-vous.');
    return r.rows[0];
  }
  async function tenant(req, fn) {
    const user = await authenticate(req);
    return transaction(async c => {
      await c.query("SELECT set_config('app.store_id',$1,true)",[user.store_id]);
      const store = one(await c.query('SELECT * FROM stores WHERE id=$1 AND owner_id=$2',[user.store_id,user.id]));
      return fn(c,store,user);
    });
  }
  app.get('/v1/health', async (req,res) => { await pool.query('SELECT 1'); res.json({status:'ok'}); });
  categoryRoutes(app,tenant);
  app.post('/v1/auth/register',authLimiter,async(req,res)=>{
    const d=req.body || {}, address=email(d.email), name=text(d.name,'Nom',100), storeName=text(d.storeName,'Nom de boutique',100), storeSlug=slug(d.slug), whatsapp=phone(d.whatsapp);
    if (typeof d.password!=='string' || d.password.length<12 || d.password.length>128) fail(400,'Le mot de passe doit contenir de 12 à 128 caractères.');
    const hash=await hashPassword(d.password);
    const result=await transaction(async c=>{
      const user=one(await c.query('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id,name,email',[address,name,hash]));
      const store=one(await c.query('INSERT INTO stores(owner_id,name,slug,whatsapp_number) VALUES($1,$2,$3,$4) RETURNING *',[user.id,storeName,storeSlug,whatsapp]));
      const setCookie=await session(c,res,user.id);
      return {user,store,setCookie};
    });
    result.setCookie(); res.status(201).json({user:result.user,store:result.store});
  });
  app.post('/v1/auth/login',authLimiter,async(req,res)=>{
    const address=email(req.body?.email), password=req.body?.password;
    if(typeof password!=='string' || password.length>128) fail(400,'Mot de passe invalide.');
    const user=(await pool.query('SELECT * FROM users WHERE lower(email)=$1',[address])).rows[0];
    if(!await verifyPassword(password,user?.password_hash)) fail(401,'Adresse e-mail ou mot de passe incorrect.');
    const setCookie=await transaction(c=>session(c,res,user.id)); setCookie();
    res.json({user:{id:user.id,name:user.name,email:user.email}});
  });
  app.post('/v1/auth/logout',async(req,res)=>{
    const token=readToken(req); if(token) await pool.query('DELETE FROM sessions WHERE token_hash=$1',[digest(token)]);
    res.clearCookie('aurelia_session',cookieOptions).sendStatus(204);
  });
  app.get('/v1/auth/me',async(req,res)=>{ const u=await authenticate(req); res.json({id:u.id,name:u.name,email:u.email,role:'owner'}); });
  app.get('/v1/store',async(req,res)=>res.json(await tenant(req,async(c,s)=>s)));
  app.patch('/v1/store',async(req,res)=>res.json(await tenant(req,async(c,s)=>{
    const d=req.body || {}, values=[], cols=[];
    const fields={name:['name',v=>text(v,'Nom',100)],slug:['slug',slug],tagline:['tagline',v=>text(v,'Slogan',500,false)],whatsapp:['whatsapp_number',phone],whatsappMessage:['whatsapp_message',v=>text(v,'Message',1000,false)],shareMessage:['share_message',v=>text(v,'Message',1000,false)],monthlyTarget:['monthly_target',v=>integer(v,'Objectif')]};
    for(const [key,[column,check]] of Object.entries(fields)) if(own(d,key)) {values.push(check(d[key]));cols.push(`${column}=$${values.length}`);}
    if(!cols.length) fail(400,'Aucune information à enregistrer.');
    values.push(s.id);return one(await c.query(`UPDATE stores SET ${cols.join(',')} WHERE id=$${values.length} RETURNING *`,values));
  })));
  app.get('/v1/:collection',async(req,res,next)=>{
    if(!['products','orders','customers','reviews','tasks'].includes(req.params.collection)) return next();
    res.json(await tenant(req,async(c,s)=>{
      const db=await loadData(c,s); let items;
      switch(req.params.collection) {
        case 'products': items=db.products.filter(p=>!p.deletedAt);break;
        case 'orders':items=db.orders.map(o=>enrich(db,o)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));break;
        case 'customers':items=db.customers.map(customer=>{const os=db.orders.filter(o=>o.customerId===customer.id);return {...customer,orders:os.length,spent:os.filter(o=>o.status==='delivered').reduce((a,o)=>a+o.total,0),lastOrderAt:os.map(o=>o.createdAt).sort().pop()||null};});break;
        case 'reviews':items=db.reviews.map(r=>({...r,productName:db.products.find(p=>p.id===r.productId)?.name||'—'}));break;
        case 'tasks':items=db.tasks;break;
      } return {items};
    }));
  });
  function productData(d, existing={}) {
    const p={...existing,...d};
    const name=text(p.name,'Nom du produit',150), price=integer(p.price,'Prix',1), stock=integer(p.stock??0,'Stock');
    const oldPrice=p.oldPrice==null||p.oldPrice===''?null:integer(p.oldPrice,'Ancien prix',price+1);
    const string=(k,max=500)=>text(p[k]??'',k,max,false);
    const boolean=(k,def=false)=>{if(p[k]!==undefined && typeof p[k]!=='boolean') fail(400,k+' invalide.');return p[k]??def;};
    const image=string('image',2000); if(image && !/^https:\/\//i.test(image)) fail(400,'Utilisez une URL d’image HTTPS.');
    const palette=p.palette??['#c9a27a','#5b3a1e']; if(!Array.isArray(palette)||palette.length!==2||!palette.every(x=>/^#[0-9a-f]{6}$/i.test(x))) fail(400,'Couleurs invalides.');
    const family=string('family',30)||'autre';if(!['bois','fleurs','ambre','frais','autre'].includes(family)) fail(400,'Famille invalide.');
    return [name,string('tagline'),price,oldPrice,string('size',80),string('note',100),family,string('badge',80)||null,stock,boolean('isActive',true),boolean('isFeatured'),boolean('isNew'),image||null,palette];
  }
  app.post('/v1/products',async(req,res)=>res.status(201).json(await tenant(req,async(c,s)=>{
    const extras=await productExtras(c,s.id,req.body||{});
    const values=productData(req.body||{}); const productSlug=randomUUID();
    const product=one(await c.query(`INSERT INTO products(name,tagline,price,old_price,size_label,note,family,badge,stock,is_active,is_featured,is_new,image_url,palette,store_id,slug) VALUES(${values.map((_,i)=>'$'+(i+1)).join(',')},$15,$16) RETURNING *`,[...values,s.id,productSlug]));
    return saveExtras(c,s.id,product.id,extras);
  })));
  app.patch('/v1/products/:id',async(req,res)=>res.json(await tenant(req,async(c,s)=>{
    const id=uuid(req.params.id);one(await c.query('SELECT id FROM products WHERE id=$1 AND store_id=$2 AND deleted_at IS NULL FOR UPDATE',[id,s.id]));
    const existing=(await catalogueProducts(c,s.id)).find(p=>p.id===id);
    const extras=await productExtras(c,s.id,req.body||{},existing);
    const values=productData(req.body||{},existing);
    const cols=['name','tagline','price','old_price','size_label','note','family','badge','stock','is_active','is_featured','is_new','image_url','palette'];
    await c.query(`UPDATE products SET ${cols.map((k,i)=>k+'=$'+(i+1)).join(',')} WHERE id=$15 AND store_id=$16`,[...values,id,s.id]);
    return saveExtras(c,s.id,id,extras);
  })));
  for(const [method,path,deleted] of [['delete','/v1/products/:id',true],['post','/v1/products/:id/restore',false]]) app[method](path,async(req,res)=>res.json(await tenant(req,async(c,s)=>one(await c.query(`UPDATE products SET deleted_at=${deleted?'now()':'NULL'} WHERE id=$1 AND store_id=$2 RETURNING id`,[uuid(req.params.id),s.id])))));
  app.patch('/v1/orders/:id',async(req,res)=>res.json(await tenant(req,async(c,s)=>{
    const d=req.body||{}, values=[],cols=[];
    if(own(d,'status')) {if(!['new','contacted','confirmed','delivered','cancelled'].includes(d.status)) fail(400,'Statut invalide.');values.push(d.status);cols.push('status=$1::order_status',"delivered_at=CASE WHEN $1::order_status='delivered' THEN coalesce(delivered_at,now()) ELSE NULL END");}
    if(own(d,'notes')) {values.push(text(d.notes,'Notes',5000,false));cols.push('notes=$'+values.length);}
    if(own(d,'followUpAt')) {if(d.followUpAt!==null && !Number.isFinite(Date.parse(d.followUpAt))) fail(400,'Date invalide.');values.push(d.followUpAt);cols.push('follow_up_at=$'+values.length);}
    if(!cols.length) fail(400,'Aucune modification.');
    values.push(uuid(req.params.id),s.id); const order=one(await c.query(`UPDATE orders SET ${cols.join(',')} WHERE id=$${values.length-1} AND store_id=$${values.length} RETURNING *`,values));
    return enrich(await loadData(c,s),order);
  })));
  app.patch('/v1/reviews/:id',async(req,res)=>res.json(await tenant(req,async(c,s)=>{
    if(typeof req.body?.isPublished!=='boolean') fail(400,'Publication invalide.');
    return one(await c.query('UPDATE reviews SET is_published=$1 WHERE id=$2 AND store_id=$3 RETURNING *',[req.body.isPublished,uuid(req.params.id),s.id]));
  })));
  app.post('/v1/tasks/:id/toggle',async(req,res)=>res.json(await tenant(req,async(c,s)=>{
    const t=one(await c.query('UPDATE tasks SET done_at=CASE WHEN done_at IS NULL THEN now() ELSE NULL END WHERE id=$1 AND store_id=$2 RETURNING *',[uuid(req.params.id),s.id]));return {...t,done:!!t.doneAt};
  })));
  app.get('/v1/stats/:kind',async(req,res)=>res.json(await tenant(req,async(c,s)=>{
    const db=await loadData(c,s);if(req.params.kind==='overview')return overview(db);
    if(req.params.kind!=='report')fail(404,'Rapport introuvable.');
    const metric=req.query.metric||'revenue', group=req.query.group||'month';
    if(!['revenue','orders','winrate','avg'].includes(metric)||!['month','product','family','category'].includes(group))fail(400,'Rapport invalide.');
    return report(db,{metric,group});
  })));
  async function publicTenant(req,fn) {
    return transaction(async c=>{
      const s=one(await c.query("SELECT * FROM stores WHERE slug=$1 AND status='active'",[req.params.slug]));
      await c.query("SELECT set_config('app.store_id',$1,true)",[s.id]);return fn(c,s);
    });
  }
  app.get('/v1/public/stores/:slug/home',async(req,res)=>res.json(await publicTenant(req,async(c,s)=>{
    // Les données privées (clients, commandes, tâches) ne sont jamais chargées par la vitrine.
    const products=await catalogueProducts(c,s.id,true);
    const categories=(await c.query('SELECT * FROM categories WHERE store_id=$1 ORDER BY position,name',[s.id])).rows.map(row);
    const reviews=(await c.query('SELECT author,text,role,rating,is_published FROM reviews WHERE store_id=$1 AND is_published',[s.id])).rows.map(row);
    return publicHome(s,{products,reviews,categories});
  })));
  app.post('/v1/public/stores/:slug/orders',async(req,res)=>res.status(201).json(await publicTenant(req,async(c,s)=>{
    const d=req.body||{}, customerName=text(d.customerName,'Votre nom',100), customerPhone=phone(d.phone);
    if(!Array.isArray(d.items)||!d.items.length||d.items.length>50)fail(400,'Panier invalide.');
    const quantities=new Map();for(const i of d.items){const id=uuid(i.productId);quantities.set(id,(quantities.get(id)||0)+integer(i.qty,'Quantité',1,100));}
    const lines=[];let total=0;
    // Ordre stable des verrous pour éviter les interblocages entre paniers.
    for(const [id,qty] of [...quantities].sort(([a],[b])=>a.localeCompare(b))){
      const p=one(await c.query('SELECT * FROM products WHERE id=$1 AND store_id=$2 AND is_active AND deleted_at IS NULL FOR UPDATE',[id,s.id]));
      if(qty>100||p.stock<qty)fail(409,`Stock insuffisant pour ${p.name}.`);
      total+=p.price*qty;lines.push({p,qty});
    }
    integer(total,'Total',1,100000000000);
    const customer=one(await c.query('INSERT INTO customers(store_id,name,phone) VALUES($1,$2,$3) ON CONFLICT(store_id,phone) DO UPDATE SET name=EXCLUDED.name RETURNING *',[s.id,customerName,customerPhone]));
    const code='AU-'+randomUUID().slice(0,8).toUpperCase();
    const order=one(await c.query('INSERT INTO orders(store_id,customer_id,code,total) VALUES($1,$2,$3,$4) RETURNING *',[s.id,customer.id,code,total]));
    for(const {p,qty} of lines) await c.query('INSERT INTO order_items(order_id,product_id,name_snapshot,unit_price,qty) VALUES($1,$2,$3,$4,$5)',[order.id,p.id,p.name,p.price,qty]);
    // Une demande WhatsApp est un lead, pas un paiement : pas de décrémentation automatique du stock.
    return {code,total};
  })));
  app.post('/v1/public/stores/:slug/newsletter',async(req,res)=>{
    await publicTenant(req,async(c,s)=>c.query('INSERT INTO newsletter_subscribers(store_id,email) VALUES($1,$2) ON CONFLICT DO NOTHING',[s.id,email(req.body?.email)]));res.sendStatus(204);
  });
  app.post('/v1/public/stores/:slug/events',async(req,res)=>{
    await publicTenant(req,async(c,s)=>{
      if(!Array.isArray(req.body?.events)||req.body.events.length>20)fail(400,'Événements invalides.');
      for(const e of req.body.events){
        if(!['view','add_to_cart','whatsapp_click','checkout'].includes(e.type))fail(400,'Événement invalide.');
        if(e.productId)one(await c.query('SELECT id FROM products WHERE id=$1 AND store_id=$2',[uuid(e.productId),s.id]));
        await c.query('INSERT INTO events(store_id,type,product_id) VALUES($1,$2,$3)',[s.id,e.type,e.productId||null]);
      }
    });res.sendStatus(204);
  });
  app.use('/v1', (req,res)=>res.status(404).json({error:{message:'Route introuvable.'}}));
  const front=resolve(root,'aurelia-front/dist'), dashboard=resolve(root,'aurelia-dashboard/dist');
  app.use('/dashboard',express.static(dashboard));
  app.get(/^\/dashboard(?:\/.*)?$/, (req,res)=>res.sendFile(resolve(dashboard,'index.html')));
  app.use(express.static(front));
  app.get(/^\/(?:s\/[^/]+\/?|demo\/?)?$/, (req,res)=>res.sendFile(resolve(front,'index.html')));
  app.use((err,req,res,next)=>{
    const conflict=err.code==='23505'||err.code==='23503', bad=err.code==='22P02'||err.code==='23514';
    const status=err.status || (conflict?409:bad?400:500);
    if(status>=500 && !options.quiet)console.error('Erreur API :',err.code||err.name);
    const duplicate=err.constraint==='categories_name_ci'?'Cette categorie existe deja.':err.constraint==='products_reference_ci'?'Cette reference produit existe deja.':err.code==='23503'?'Cet element est encore utilise.':'Cette adresse e-mail ou cette adresse de boutique est déjà utilisée.';
    res.status(status).json({error:{message:conflict?duplicate:bad?'Informations invalides.':status>=500?'Service momentanément indisponible. Réessayez.':err.message}});
  });
  return app;
}
