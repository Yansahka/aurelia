// Illustrations de remplacement : utilisées tant qu'un produit n'a pas de champ `image`.
export const bottle = (a, b, shape = 0, bg = '#efe3c9') => {
  const g = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
  const body = shape === 1
    ? '<circle cx="100" cy="158" r="56" fill="url(#g)"/><rect x="90" y="88" width="20" height="16" fill="#2a1a14"/><rect x="82" y="58" width="36" height="32" rx="16" fill="#2a1a14"/><rect x="74" y="150" width="52" height="30" rx="4" fill="rgba(255,255,255,.7)"/>'
    : shape === 2
      ? '<rect x="76" y="86" width="48" height="136" rx="8" fill="url(#g)"/><rect x="86" y="46" width="28" height="42" rx="4" fill="#2a1a14"/><rect x="82" y="150" width="36" height="40" rx="3" fill="rgba(255,255,255,.7)"/>'
      : '<rect x="52" y="100" width="96" height="118" rx="12" fill="url(#g)"/><rect x="92" y="90" width="16" height="12" fill="#2a1a14"/><rect x="82" y="58" width="36" height="34" rx="5" fill="#2a1a14"/><rect x="70" y="146" width="60" height="42" rx="3" fill="rgba(255,255,255,.7)"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250">${g}<rect width="200" height="250" fill="${bg}"/><ellipse cx="100" cy="226" rx="52" ry="7" fill="rgba(0,0,0,.14)"/>${body}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

export const tile = (c) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" preserveAspectRatio="none"><defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="100" height="130" fill="url(#t)"/></svg>`);

export const productPlaceholder = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20250%22%3E%3Crect%20width%3D%22200%22%20height%3D%22250%22%20fill%3D%22%23e9eee9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23687f70%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m45%2095%2055-27%2055%2027v65l-55%2027-55-27Z%22%2F%3E%3Cpath%20d%3D%22m45%2095%2055%2027%2055-27M100%20122v65M73%2081l55%2027%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22100%22%20y%3D%22218%22%20text-anchor%3D%22middle%22%20fill%3D%22%23687f70%22%20font-family%3D%22sans-serif%22%20font-size%3D%2210%22%3EPHOTO%20%C3%80%20AJOUTER%3C%2Ftext%3E%3C%2Fsvg%3E";
export const productImage = p => p.images?.[0] || p.image || productPlaceholder;

export function makeLeaves(count = 90) {
  let r = 7;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 190;
    const x = Math.round(330 + Math.cos(a) * d * 1.15), y = Math.round(250 + Math.sin(a) * d * 0.8);
    out.push({ x, y, rx: Math.round(10 + rnd() * 14), ry: Math.round(6 + rnd() * 8), rot: Math.round(rnd() * 180),
      fill: `hsl(${Math.round(88 + rnd() * 30)} ${Math.round(28 + rnd() * 14)}% ${Math.round(28 + rnd() * 22)}%)` });
  }
  return out;
}
