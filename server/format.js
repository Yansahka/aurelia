export const num = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/[\u202f\u00a0]/g, ' ');
export const money = (n, cur = 'FCFA') => num(n) + ' ' + cur;

// 702 000 -> "702K", 2 130 000 -> "2,13M"
export function compact(n, cur = 'FCFA') {
  const a = Math.abs(n);
  const s = a >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',').replace(/,?0+$/, '') + 'M' : a >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n));
  return cur ? s + ' ' + cur : s;
}
export const pct = (n) => Math.round(n * 100) + '%';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const monthShort = (d) => cap(new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(d)).replace('.', ''));
export const dateShort = (d) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(d)).replace('.', '');
export const dateLong = (d) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d)).replace(/\./g, '');

export function relDays(d) {
  const n = Math.round((new Date(d) - Date.now()) / 864e5);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  return n > 0 ? `dans ${n} j` : `il y a ${-n} j`;
}
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
