export const CONFIG = {
  MOCK: import.meta.env.VITE_USE_MOCK === 'true' || window.location.pathname === '/demo',
  API_BASE: import.meta.env.VITE_API_BASE || '/v1',
};

// Multi-tenant : slug forcé par l'env, sinon premier label du sous-domaine (aurelia.domaine.com), sinon "aurelia".
export function resolveSlug() {
  const match = window.location.pathname.match(/^\/s\/([^/]+)\/?$/);
  if (match) return decodeURIComponent(match[1]);
  if (import.meta.env.VITE_STORE_SLUG) return import.meta.env.VITE_STORE_SLUG;
  const parts = window.location.hostname.split('.');
  return parts.length >= 3 && parts[0] !== 'www' ? parts[0] : 'aurelia';
}
