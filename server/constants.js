// Étapes d'une commande (= enum order_status en base). `prob` sert à la prévision pondérée.
export const STAGES = [
  { key: 'new', label: 'Nouveau', prob: 0.25 },
  { key: 'contacted', label: 'Contacté', prob: 0.5 },
  { key: 'confirmed', label: 'Confirmé', prob: 0.85 },
  { key: 'delivered', label: 'Livré', prob: 1 },
  { key: 'cancelled', label: 'Annulé', prob: 0 },
];
export const OPEN_STAGES = ['new', 'contacted', 'confirmed'];
export const stageLabel = (k) => STAGES.find((s) => s.key === k)?.label || k;

export const FAMILIES = [
  { key: 'fleurs', label: 'Fleurs' }, { key: 'bois', label: 'Bois' },
  { key: 'ambre', label: 'Ambres' }, { key: 'frais', label: 'Agrumes & frais' },
];
export const familyLabel = (k) => FAMILIES.find((f) => f.key === k)?.label || k;
export const BADGES = ['Nouveau', 'Promotion', 'Coup de cœur'];
