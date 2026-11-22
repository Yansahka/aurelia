// Illustration de repli quand un parfum n'a pas d'image.
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
export const productImage = (p) => p.image || bottle(p.palette?.[0] || '#c9a27a', p.palette?.[1] || '#5b3a1e', p.shape ?? 0, p.bg || '#efe3c9');
