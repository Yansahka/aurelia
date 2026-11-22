# Aurelia — dashboard vendeur (React + Vite)

Espace de gestion d'une boutique de parfums : ventes, parfums, commandes (tableau glisser-déposer), clients, avis, rapports,
et **partage du lien de la boutique via WhatsApp**. Relié à l’API Node.js et PostgreSQL de la racine, avec authentification par cookie HttpOnly et isolation des boutiques. Chaque inscription initialise une boutique vide.

Suivre le [README principal](../README.md) pour démarrer l’ensemble, ou le [guide PostgreSQL](../docs/POSTGRESQL.md) pour connecter une base standard. Le mode fictif est optionnel et s’active explicitement avec `VITE_USE_MOCK=true`.

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5174/dashboard/ ; API démarrée sur le port 3000
npm run build
npm run export:sql # génère database/seed.sql à partir du jeu fictif
```

## Pages
| Route | Contenu |
|---|---|
| `#/overview` | Indicateurs, chiffre d'affaires sur 12 mois vs objectif, commandes par étape, prochaine action (WhatsApp), tâches, classement, relances, **bandeau de partage** |
| `#/products` | Liste filtrable, activation/masquage, stock, création/édition, suppression avec « Annuler », partage d'un parfum |
| `#/orders` | Tableau (glisser-déposer) et liste, fiche commande, écrire/appeler le client |
| `#/customers` | Clients, total dépensé, bouton WhatsApp |
| `#/reviews` | Publication des avis |
| `#/reports?m=revenue&g=month` | Mesures x regroupements, tableau, export CSV |
| `#/store` | Partage (copier, WhatsApp, numéro, partage natif) et réglages de la boutique |

## Partage WhatsApp
`src/lib/share.js` construit `https://wa.me/?text=<message + lien>` (choix du contact dans WhatsApp) ou `https://wa.me/<numéro>?text=…`.
Le lien utilise `/s/:slug` sur le domaine courant en production, ou sur `localhost:5173` en développement Vite. `VITE_STORE_BASE_URL` permet de remplacer ce modèle si nécessaire.

## Structure
```
src/api/        index.js (mock ou http) · mock/ (seed, stats, api) · http/api.js
src/context/    UIContext (thème, menu, modales) · ToastContext (avec « Annuler »)
src/hooks/      useQuery (cache + invalidation) · useRoute (routeur par hash)
src/components/ Shell, Sidebar, Topbar, ProductFormModal, ShareModal, SharePanel, ui/*
src/pages/      Overview, Products, Orders, Customers, Reviews, Reports, StorePage
src/lib/        format, share, csv, art, constants
database/       schema.sql (PostgreSQL) · seed.sql (généré)
docs/           MIGRATION.md (contrat d'API et correspondance SQL)
```
