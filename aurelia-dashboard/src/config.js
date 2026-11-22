export const CONFIG = {
  MOCK: import.meta.env.VITE_USE_MOCK === 'true',
  API_BASE: import.meta.env.VITE_API_BASE || '/v1',
  STORE_BASE_URL: import.meta.env.VITE_STORE_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5173/s/{slug}' : window.location.origin + '/s/{slug}'),
};

// Adresse publique de la vitrine d'un vendeur.
export const storeUrl = (slug) => CONFIG.STORE_BASE_URL.replace('{slug}', encodeURIComponent(slug));
