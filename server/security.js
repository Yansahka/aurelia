import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const digest = token => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}
export async function verifyPassword(password, encoded) {
  const [salt, key] = (encoded || '').split(':');
  // Même dérivation coûteuse si l'adresse n'existe pas.
  const actual = await scrypt(password, salt || 'aurelia-dummy-salt', 64);
  const expected = Buffer.from(key || '00'.repeat(64), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual) && !!key;
}
export const newToken = () => randomBytes(32).toString('hex');
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function text(v, name, max = 200, required = true) {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim())) fail(400, name + ' invalide.');
  return v.trim();
}
export function email(v) {
  const s = text(v, 'Adresse e-mail', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) fail(400, 'Adresse e-mail invalide.');
  return s;
}
export function phone(v) {
  const s = text(v, 'Téléphone', 30).replace(/[+\s()-]/g, '');
  if (!/^[1-9]\d{7,14}$/.test(s)) fail(400, 'Téléphone : utilisez le format international.');
  return s;
}
export function slug(v) {
  const s = text(v, 'Adresse de boutique', 40);
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s) || ['admin','api','dashboard','demo','www'].includes(s)) fail(400, 'Adresse : 3 à 40 lettres minuscules, chiffres ou tirets.');
  return s;
}
export function integer(v, name, min = 0, max = 1000000000) {
  if (!Number.isSafeInteger(v) || v < min || v > max) fail(400, name + ' invalide.');
  return v;
}
