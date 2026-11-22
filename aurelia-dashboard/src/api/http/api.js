import { CONFIG } from '../../config';

// Implémentation réelle : mêmes méthodes que mock/api.js, appelées sur l'API REST /v1 (voir docs/MIGRATION.md).
async function req(path, { method = 'GET', body, params } = {}) {
  const qs = params ? '?' + new URLSearchParams(params) : '';
  const res = await fetch(CONFIG.API_BASE + path + qs, {
    method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { window.dispatchEvent(new Event('auth:expired')); throw new Error('Session expirée'); }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw Object.assign(new Error(e?.error?.message || 'Erreur ' + res.status), { fields: e?.error?.fields }); }
  return res.status === 204 ? null : res.json();
}

export const httpApi = {
  me: () => req('/auth/me'),
  categories: {
    list: () => req('/categories').then(r=>r.items),
    create: name => req('/categories',{method:'POST',body:{name}}),
    update: (id,name) => req('/categories/'+id,{method:'PATCH',body:{name}}),
    remove: id => req('/categories/'+id,{method:'DELETE'}),
  },
  store: { get: () => req('/store'), update: (patch) => req('/store', { method: 'PATCH', body: patch }) },
  products: {
    list: () => req('/products').then((r) => r.items),
    create: (d) => req('/products', { method: 'POST', body: d }),
    update: (id, p) => req('/products/' + id, { method: 'PATCH', body: p }),
    remove: (id) => req('/products/' + id, { method: 'DELETE' }),
    restore: (id) => req(`/products/${id}/restore`, { method: 'POST' }),
  },
  orders: {
    list: () => req('/orders').then((r) => r.items),
    updateStatus: (id, status) => req('/orders/' + id, { method: 'PATCH', body: { status } }),
    update: (id, p) => req('/orders/' + id, { method: 'PATCH', body: p }),
  },
  customers: { list: () => req('/customers').then((r) => r.items) },
  reviews: {
    list: () => req('/reviews').then((r) => r.items),
    setPublished: (id, v) => req('/reviews/' + id, { method: 'PATCH', body: { isPublished: v } }),
  },
  tasks: { list: () => req('/tasks').then((r) => r.items), toggle: (id) => req(`/tasks/${id}/toggle`, { method: 'POST' }) },
  stats: {
    overview: () => req('/stats/overview'),
    report: ({ metric, group }) => req('/stats/report', { params: { metric, group } }),
  },
};
