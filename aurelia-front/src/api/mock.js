// Données fictives — même forme que la réponse de GET /public/stores/:slug/home
export const MOCK_HOME = {
  store: {
    slug: 'aurelia', name: 'Aurelia', currency: 'FCFA', locale: 'fr-FR', whatsapp: '237690000000',
    whatsappMessage: 'Bonjour Aurelia, je souhaite commander :',
    hero: { title: 'Parfums|*botaniques* pour|des rituels plus lents', subtitle: 'Des fragrances composées à la main, à partir de matières végétales sélectionnées avec soin, pour accompagner vos matins pressés comme vos soirées calmes.', cta: 'Découvrir', statValue: '98%', statLabel: 'de clients conquis, avis vérifiés' },
    story: 'Nous composons des *parfums* que vous porterez longtemps, des matins pressés aux *soirées lentes*. Chaque flacon est préparé à la main dans notre atelier, à partir de *matières botaniques* et de rien d’imprononçable.',
    commitment: 'Découvrez notre engagement pour des {0} *ingrédients d’origine végétale*, des recharges à faible déchet et un *sourcing équitable*, pour un sillage plus doux et une {1} *planète plus douce*.',
    footer: { tagline: 'Notes lentes, *une fois par mois*', columns: [
      { title: 'Boutique', links: [{ label: 'Fleurs', href: '#shop' }, { label: 'Bois', href: '#shop' }, { label: 'Ambres', href: '#shop' }, { label: 'Recharges', href: '#shop' }] },
      { title: 'À propos', links: [{ label: 'Notre atelier', href: '#about' }, { label: 'Ingrédients', href: '#about' }, { label: 'Journal', href: '#about' }] },
      { title: 'Aide', links: [{ label: 'Livraison', href: '#' }, { label: 'Retours', href: '#' }, { label: 'Contact WhatsApp', href: '#wa' }] } ] }
  },
  products: [
    { id: 'p1', name: 'Oud Nocturne', tagline: 'Eau de parfum boisée, safran et ambre noir pour les soirées longues.', price: 42000, oldPrice: 48000, size: '50 ml', note: 'Oud', badge: 'Promotion', family: 'bois', swatches: ['#b9792a', '#5b3a1e', '#8e8a7a'], shape: 0, palette: ['#d9922b', '#7a4a12'], bg: '#efdba8' },
    { id: 'p2', name: 'Rose de Mai', tagline: 'Rose fraîche, pivoine et musc blanc, un bouquet léger au lever du jour.', price: 38500, size: '50 ml', note: 'Rose', badge: 'Nouveau', family: 'fleurs', swatches: ['#d98a98', '#7a3d4e'], shape: 1, palette: ['#e8a5b0', '#9b3d55'], bg: '#d9d0cf' },
    { id: 'p3', name: 'Vétiver Brume', tagline: 'Brume parfumée de vétiver et de citron vert, rechargeable.', price: 29000, size: '100 ml', note: 'Vétiver', badge: 'Coup de cœur', family: 'frais', swatches: ['#e5e1d6', '#a9b58c', '#d98a6a'], shape: 2, palette: ['#c9d3b0', '#5d6e3d'], bg: '#e6d8cb' },
    { id: 'p4', name: 'Ambre Solaire', tagline: 'Ambre chaud, vanille et fleur d’oranger, doux comme une peau au soleil.', price: 24000, size: '30 ml', note: 'Ambre', badge: 'Nouveau', family: 'ambre', swatches: ['#e8d36a', '#c98a2b'], shape: 0, palette: ['#f1c04a', '#b36a14'], bg: '#dfe4e6' },
    { id: 'p5', name: 'Santal Velours', tagline: 'Bois de santal crémeux, cardamome et cèdre blond.', price: 45000, size: '50 ml', note: 'Santal', family: 'bois', swatches: ['#c9a27a', '#6b4630'], shape: 2, palette: ['#c9a27a', '#6b4630'], bg: '#e8dccf' },
    { id: 'p6', name: 'Néroli Blanc', tagline: 'Néroli, thé blanc et fleur de coton, pur et lumineux.', price: 33000, size: '100 ml', note: 'Néroli', badge: 'Nouveau', family: 'fleurs', swatches: ['#f2e6c4', '#c9a64a'], shape: 1, palette: ['#f2e6c4', '#c9a64a'], bg: '#dfd6e0' },
    { id: 'p7', name: 'Cèdre & Cuir', tagline: 'Cuir fumé, cèdre de l’Atlas et poivre noir.', price: 36000, size: '50 ml', note: 'Cuir', family: 'bois', swatches: ['#8a6a50', '#3a2418'], shape: 0, palette: ['#8a6a50', '#3a2418'], bg: '#ddd2c4' },
    { id: 'p8', name: 'Bergamote Givrée', tagline: 'Bergamote, menthe poivrée et thé vert, une fraîcheur nette.', price: 27500, size: '100 ml', note: 'Bergamote', family: 'frais', swatches: ['#d6e6b0', '#7fa14a'], shape: 2, palette: ['#d6e6b0', '#7fa14a'], bg: '#e9e2c9' }
  ],
  collections: [
    { slug: 'fleurs', name: 'Fleurs', gradient: ['#e9b7a3', '#a9484d'] }, { slug: 'bois', name: 'Bois', gradient: ['#c9a27a', '#4d3326'] },
    { slug: 'ambre', name: 'Ambres', gradient: ['#e8c66a', '#8a4a16'] }, { slug: 'frais', name: 'Agrumes', gradient: ['#b9c98a', '#2f4a3a'] }
  ],
  featured: { title: 'Nos *best-sellers*', text: 'Trois parfums élus par nos clients, composés en petits lots et renouvelés chaque saison.', productIds: ['p1', 'p2', 'p5'] },
  newArrival: { title: 'Nouvelle *arrivée*', text: 'Ambre Solaire, une huile de parfum aux notes d’ambre, de vanille et de fleur d’oranger pour un sillage doux qui dure.', productId: 'p4' },
  gallery: [
    { label: 'L’atelier', colors: ['#5a4034', '#1f1210'] }, { label: 'Safran', colors: ['#d9922b', '#6a3b10'] }, { label: 'Bois de santal', colors: ['#a67c5b', '#3d281d'] },
    { label: 'Flacons', colors: ['#c9c2b2', '#6d6a5e'] }, { label: 'Pétales', colors: ['#e9a4ae', '#8c3a4d'] }, { label: 'Macération', colors: ['#6f7f55', '#25301f'] },
    { label: 'Ambre', colors: ['#e8c66a', '#8a4a16'] }, { label: 'Cèdre', colors: ['#8a6a50', '#2e1d14'] }
  ],
  reviews: { rating: 4.9, count: 1240, items: [
    { text: 'Un sillage qui rappelle un jardin après la pluie. Livraison rapide et emballage soigné.', author: 'Sofia M.', role: 'Cliente fidèle' },
    { text: 'L’Oud Nocturne tient toute la soirée. On m’a demandé le nom trois fois.', author: 'Amara O.', role: 'Acheteur vérifié' },
    { text: 'Réponse immédiate sur WhatsApp et conseils précis pour choisir mon cadeau.', author: 'Lydie B.', role: 'Cadeau' },
    { text: 'Rose de Mai est devenue mon parfum du quotidien, léger sans être fade.', author: 'Nadia T.', role: 'Acheteur vérifié' },
    { text: 'Les recharges sont une excellente idée, et la qualité est au rendez-vous.', author: 'Jean-Paul K.', role: 'Client fidèle' },
    { text: 'Santal Velours est doux et enveloppant, exactement ce que je cherchais.', author: 'Clarisse E.', role: 'Acheteur vérifié' }
  ] }
};
