export const whatsappUrl = (number, text) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

export function buildOrderMessage({ store, lines, money, total }) {
  return [
    store.whatsappMessage,
    ...lines.map(({ product: p, qty }) => `- ${qty} x ${p.name}${p.variantLabel?' — '+p.variantLabel:p.size?' ('+p.size+')':''}${p.reference?' [Réf. '+p.reference+']':''} - ${money(p.price * qty)}`),
    `Total : ${money(total)}`,
    'Pouvez-vous me confirmer la disponibilité ? Merci !',
  ].join('\n');
}
