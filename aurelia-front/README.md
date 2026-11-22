# Aurelia — site commercial et boutiques (React + Vite)

Site commercial Aurelia avec création de compte et connexion à `/`, boutiques vendeurs à `/s/:slug`, et boutique fictive à `/demo`. Le parcours réel utilise l’API commune à la racine du projet.

Pour lancer l’ensemble sans installer PostgreSQL : suivre le [README principal](../README.md). La configuration d’un serveur PostgreSQL est décrite dans le [guide PostgreSQL](../docs/POSTGRESQL.md).

## Démarrer
```bash
npm install
cp .env.example .env     # puis ajuster
npm run dev              # http://localhost:5173
npm run build            # production -> dist/
```

## API commune
1. Dans `.env` : `VITE_USE_MOCK=false` et `VITE_API_BASE=/v1`. Démarrer l’API à la racine avec `npm run dev:local` ou `npm start`.
2. Le front appelle (voir le PDF de spécification backend) :
   - `GET  /public/stores/:slug/home`  -> payload complet (même forme que `src/api/mock.js`)
   - `POST /public/stores/:slug/orders` -> enregistre le lead avant l'ouverture de WhatsApp
   - `POST /public/stores/:slug/newsletter`, `POST /public/stores/:slug/events`
3. Le `slug` est lu en priorité dans `/s/:slug`. Le sous-domaine ou `VITE_STORE_SLUG` servent seulement aux configurations alternatives.
4. Seul `src/api/client.js` est à adapter si le contrat change.

## Structure
```
src/
  api/         client.js (appels HTTP), mock.js (données fictives)
  context/     StoreContext (boutique), CartContext (panier + checkout WhatsApp), ToastContext
  components/  Navbar, Hero, ProductCarousel/ProductCard, Story, Rituals, BestSellers,
               NewArrival, Gallery, Reviews, Commitment, Footer, CartDrawer, WhatsAppButton
    ui/        Reveal, RichText, Marquee, Icons
  hooks/       useReveal, useScrolled
  lib/         art (illustrations de repli), format, whatsapp
  styles/      CSS par section (importés dans main.jsx)
```

## Notes
- Textes avec `*mot*` : le mot est affiché en italique (`RichText`).
- Images : si un produit/collection/galerie a un champ `image`, il remplace l'illustration de repli.
- Le prix affiché est indicatif : le backend recalcule le total depuis la base.
- Les coordonnées de l’acheteur sont demandées avant l’enregistrement de sa demande. Une erreur d’API empêche l’ouverture de WhatsApp et reste affichée dans le panier.
- L’inscription et la connexion utilisent une session en cookie HttpOnly, partagée avec le dashboard sur le même domaine.
