import { useEffect, useState } from 'react';

// Routeur minimal basé sur le hash : #/orders?q=abc  (remplaçable par react-router).
const parse = () => {
  const [path, qs = ''] = (location.hash.slice(2) || 'overview').split('?');
  return { path: path || 'overview', params: Object.fromEntries(new URLSearchParams(qs)) };
};
export function navigate(path, params) {
  const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params) : '';
  location.hash = '/' + path + qs;
}
export function useRoute() {
  const [r, set] = useState(parse);
  useEffect(() => { const on = () => set(parse()); addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);
  return r;
}
