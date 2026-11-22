import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { invalidate, useQuery } from '../hooks/useQuery';
import { BADGES, FAMILIES } from '../lib/constants';
import { productImage } from '../lib/art';
import { Switch } from './ui/Bits';
import Modal from './ui/Modal';

const DEFAULTS = { name: '', tagline: '', price: '', oldPrice: '', size: '50 ml', note: '', family: 'bois', badge: '', stock: '10', isActive: true, isFeatured: false, isNew: false, image: '', palette: ['#c9a27a', '#5b3a1e'] };

function Form({ product, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(() => product ? { ...DEFAULTS, ...product, price: String(product.price), oldPrice: product.oldPrice ? String(product.oldPrice) : '', stock: String(product.stock), badge: product.badge || '' } : DEFAULTS);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const text = (k) => ({ value: f[k], onChange: (e) => set(k, e.target.value) });

  const submit = async (e) => {
    e.preventDefault();
    const price = Number(f.price), stock = Number(f.stock), old = f.oldPrice === '' ? null : Number(f.oldPrice), er = {};
    if (!f.name.trim()) er.name = 'Le nom est obligatoire';
    if (!Number.isInteger(price) || price <= 0) er.price = 'Prix invalide';
    if (!Number.isInteger(stock) || stock < 0) er.stock = 'Stock invalide';
    if (old !== null && (!Number.isInteger(old) || old <= price)) er.oldPrice = 'Doit être supérieur au prix';
    setErr(er); if (Object.keys(er).length) return;
    const data = { name: f.name.trim(), tagline: f.tagline.trim(), price, oldPrice: old, size: f.size, note: f.note, family: f.family, badge: f.badge, stock, isActive: f.isActive, isFeatured: f.isFeatured, isNew: f.isNew, image: f.image.trim(), palette: f.palette };
    setBusy(true);
    try {
      product ? await api.products.update(product.id, data) : await api.products.create(data);
      invalidate('products', 'stats'); toast(product ? 'Parfum mis à jour' : 'Parfum ajouté'); onClose();
    } catch (x) { toast(x.message || 'Enregistrement impossible'); setBusy(false); }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span className="thumb" style={{ width: 62, height: 72 }}><img src={productImage({ ...f, palette: f.palette })} alt="" /></span>
        <label className="field" style={{ flex: 1 }}>Nom *<input {...text('name')} autoFocus />{err.name && <small>{err.name}</small>}</label>
      </div>
      <label className="field">Description courte<input {...text('tagline')} placeholder="Notes de tête, de cœur, de fond…" /></label>
      <div className="grid3">
        <label className="field">Prix (FCFA) *<input {...text('price')} inputMode="numeric" />{err.price && <small>{err.price}</small>}</label>
        <label className="field">Ancien prix<input {...text('oldPrice')} inputMode="numeric" placeholder="Promotion" />{err.oldPrice && <small>{err.oldPrice}</small>}</label>
        <label className="field">Stock<input {...text('stock')} inputMode="numeric" />{err.stock && <small>{err.stock}</small>}</label>
      </div>
      <div className="grid3">
        <label className="field">Contenance<input {...text('size')} /></label>
        <label className="field">Note principale<input {...text('note')} placeholder="Oud, Rose…" /></label>
        <label className="field">Famille<select {...text('family')}>{FAMILIES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></label>
      </div>
      <div className="grid2">
        <label className="field">Étiquette<select {...text('badge')}><option value="">Aucune</option>{BADGES.map((b) => <option key={b}>{b}</option>)}</select></label>
        <label className="field">Image (URL)<input {...text('image')} placeholder="https://… (sinon illustration)" /></label>
      </div>
      <div className="grid2">
        <label className="field">Couleur du flacon<span className="copyrow"><input type="color" value={f.palette[0]} onChange={(e) => set('palette', [e.target.value, f.palette[1]])} /><input type="color" value={f.palette[1]} onChange={(e) => set('palette', [f.palette[0], e.target.value])} /></span></label>
      </div>
      {[['isActive', 'Visible dans la boutique'], ['isFeatured', 'Mettre en avant (best-seller)'], ['isNew', 'Afficher comme nouveauté']].map(([k, l]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>{l}<Switch on={f[k]} onChange={(v) => set(k, v)} label={l} /></div>
      ))}
      <div className="acts"><button type="button" className="btn ghost" onClick={onClose}>Annuler</button><button className="btn lime" disabled={busy}>{product ? 'Enregistrer' : 'Ajouter le parfum'}</button></div>
    </form>
  );
}

export default function ProductFormModal() {
  const { productForm, closeProductForm } = useUI();
  const { data: products } = useQuery('products', api.products.list);
  if (!productForm) return null;
  const product = productForm.id ? products?.find((p) => p.id === productForm.id) : null;
  if (productForm.id && !products) return null;
  return <Modal title={product ? 'Modifier le parfum' : 'Nouveau parfum'} onClose={closeProductForm} wide><Form key={productForm.id || 'new'} product={product} onClose={closeProductForm} /></Modal>;
}
