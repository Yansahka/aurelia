# Migration : données fictives -> backend + PostgreSQL

> **Mise à jour :** l’API est désormais implémentée dans `server/` à la racine du projet. Utiliser le [guide PostgreSQL](../../docs/POSTGRESQL.md) pour l’installation, les migrations et les sessions par cookie HttpOnly. Les indications JWT/localStorage et le démarrage manuel du schéma ci-dessous décrivent l’ancien contrat et sont conservées comme historique ; elles ne constituent plus la procédure de lancement.

Le dashboard n'appelle que l'objet `api` (`src/api/index.js`). Deux implémentations ont **les mêmes méthodes** :

| Mode | Fichier | Données |
|------|---------|---------|
| Démo (`VITE_USE_MOCK=true`) | `src/api/mock/api.js` | base en mémoire + `localStorage`, jeu de données `mock/seed.js` |
| Réel (`VITE_USE_MOCK=false`) | `src/api/http/api.js` | API REST `/v1` (jeton JWT dans `localStorage.token`) |

Les pages, composants et contextes ne changent pas.

## 1. Créer la base
```bash
createdb parfum_saas
psql parfum_saas -f database/schema.sql
npm run export:sql            # génère database/seed.sql depuis le jeu fictif
psql parfum_saas -f database/seed.sql     # optionnel (démo)
```
Les identifiants du jeu fictif sont de vrais UUID : le même jeu fonctionne dans le mock et dans PostgreSQL.

## 2. Contrat d'API attendu par le dashboard
Tous les montants sont des entiers. Les listes sont renvoyées sous la forme `{ "items": [...] }`. Les champs sont en camelCase (conversion snake_case -> camelCase côté API).

| Méthode du front | Route REST | Réponse |
|---|---|---|
| `api.me()` | `GET /auth/me` | `{ id, name, email, role }` |
| `api.store.get()` / `update(patch)` | `GET` / `PATCH /store` | `{ id, slug, name, tagline, currency, locale, whatsapp, whatsappMessage, shareMessage, monthlyTarget, plan }` |
| `api.products.list()` | `GET /products` | `{ items: Product[] }` (hors `deleted_at`) |
| `products.create / update / remove / restore` | `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` (suppression douce), `POST /products/:id/restore` | `Product` |
| `api.orders.list()` | `GET /orders` | `{ items: Order[] }` avec `customerName`, `phone` et `items[]` (jointure customers + order_items) |
| `orders.updateStatus(id, status)` / `update(id, patch)` | `PATCH /orders/:id` `{ status }` ou `{ notes, followUpAt }` | `Order` ; passer à `delivered` renseigne `delivered_at` |
| `api.customers.list()` | `GET /customers` | `{ items: [{ id, name, phone, orders, spent, lastOrderAt }] }` (agrégat) |
| `api.reviews.list()` / `setPublished` | `GET /reviews`, `PATCH /reviews/:id` `{ isPublished }` | avec `productName` |
| `api.tasks.list()` / `toggle(id)` | `GET /tasks`, `POST /tasks/:id/toggle` | `{ items: Task[] }` |
| `api.stats.overview()` | `GET /stats/overview` | voir ci-dessous |
| `api.stats.report({ metric, group })` | `GET /stats/report?metric=revenue&group=month` | `{ metric, group, total, highest, rows: [{ key, label, value, share }] }` |

`metric` : `revenue` \| `orders` \| `winrate` \| `avg` — `group` : `month` \| `product` \| `family`.

Forme de `GET /stats/overview` (voir `src/api/mock/stats.js`, fonction `overview`) :
`wonThisMonth, wonCountThisMonth, monthlyTarget, open{count,value}, weighted, winRate, closed{won,total}, revenueByMonth[{key,label,value}], stages[{key,count,value}], nextBest(Order|null), topProducts[], closingSoon[], newOrders`.

## 3. Correspondance avec les requêtes SQL
* `revenueByMonth` -> vue `v_monthly_revenue` (compléter les mois sans vente avec `generate_series`).
* `topProducts` -> vue `v_product_sales ORDER BY units DESC LIMIT 5`.
* `weighted` -> `SUM(total * CASE status WHEN 'new' THEN .25 WHEN 'contacted' THEN .5 WHEN 'confirmed' THEN .85 END)` sur les commandes ouvertes.
* `winRate` -> `count(delivered) / count(delivered + cancelled)`.
* `report` -> mêmes agrégats groupés par mois, produit (`order_items`) ou famille (`products.family`).

## 4. Points d'attention
* **Isolation** : `store_id` vient du JWT, jamais du corps de la requête ; activer la RLS fournie dans `schema.sql`.
* **Commandes** : elles sont créées par la vitrine (`POST /public/stores/:slug/orders`) ; le dashboard ne fait que les suivre. Le client est retrouvé/créé par `(store_id, phone)`.
* **Écart avec la spécification backend (PDF)** : le dashboard a besoin d'une table `customers` et d'une table `tasks`, ajoutées dans `schema.sql`. Dans le PDF, le client était stocké directement sur `orders`.
* **Authentification** : `http/api.js` lit `localStorage.token` et émet l'événement `auth:expired` sur une réponse 401 ; il reste à ajouter la page de connexion et le rafraîchissement du jeton.
* **Cache** : `useQuery` est un petit cache maison ; vous pouvez le remplacer par TanStack Query (les clés `orders`, `products`, `stats:*`… sont déjà prévues).
* **Lien partagé** : `VITE_STORE_BASE_URL` doit pointer vers le domaine réel des vitrines (`https://{slug}.votredomaine.com`).
