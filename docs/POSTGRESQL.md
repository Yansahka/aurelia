# Processus PostgreSQL pour Aurelia

## 1. Architecture

```text
Site Aurelia / inscription ─┐
Dashboard privé ────────────┼─ HTTP /v1 → API Node.js → PostgreSQL
Boutique /s/nom-boutique ───┘
```

Les identifiants de la base restent sur le serveur. Ne jamais placer `DATABASE_URL` ou un mot de passe dans une variable `VITE_*` : elle est publiée dans le JavaScript du navigateur.

L’inscription crée le propriétaire, la boutique et la session dans une transaction. Aucune commande fictive n’est importée. Le cookie opaque est HttpOnly, SameSite=Lax, valide sept jours et Secure en production ; seul son condensat SHA-256 est stocké en base. La déconnexion supprime cette session côté serveur.

Chaque accès privé retrouve la boutique à partir de la session. Chaque transaction métier fixe `app.store_id` et les requêtes filtrent aussi par boutique. La migration ajoute les politiques RLS à toutes les tables métier, y compris les lignes de commande. Le serveur public utilise le slug uniquement pour servir le catalogue actif ou enregistrer une demande ; il ne renvoie pas les coordonnées des autres clients.

## 2. Créer PostgreSQL

Deux possibilités : PostgreSQL 14+ installé, ou Docker Desktop avec le fichier `compose.yaml` fourni. `npm run dev:local` utilise maintenant PostgreSQL natif. L'ancien mode PGlite reste explicitement accessible via `npm run dev:embedded` (voir README).

### Installation locale configuree : aurelia_db

Dans `.env`, renseigner `PGHOST=localhost`, `PGPORT=5432`, `PGDATABASE=aurelia_db`, `PGUSER` et `PGPASSWORD`. Les variables separees evitent d'encoder le mot de passe dans une URL. Ne pas definir `DATABASE_URL` en parallele : elle aurait priorite.

Executer `npm run db:setup-local`, puis `npm run dev:local`. La premiere commande conserve les identifiants proprietaires dans `.env.migrations`, applique les migrations et genere un compte SQL limite dans `.env`. Elle ne supprime aucune table et ne modifie aucun compte SQL existant. Les migrations suivantes utilisent automatiquement `.env.migrations` avec `npm run db:migrate`.

`npm run test:postgres` effectue 17 verifications sur le vrai serveur : inscription, creation de boutique, catalogue, commande, calcul du prix, sessions et isolation RLS. Il conserve des boutiques de validation prefixees `pg-` sans toucher aux donnees existantes.

### Avec Docker

Copier le fichier d’exemple :

```powershell
Copy-Item .env.example .env
```

Dans `.env`, définir un nouveau mot de passe local et la connexion correspondante :

```dotenv
POSTGRES_PASSWORD=REMPLACER_PAR_UN_MOT_DE_PASSE_LOCAL
DATABASE_URL=postgresql://aurelia_owner:MOT_DE_PASSE_ENCODE@localhost:5432/aurelia
PORT=3000
NODE_ENV=development
APP_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174
```

Encoder les caractères spéciaux du mot de passe dans l’URL (par exemple `@` devient `%40`). Garder le mot de passe brut dans `POSTGRES_PASSWORD`. Le volume Docker conserve les données ; modifier cette variable après la première initialisation ne change pas le mot de passe du rôle PostgreSQL.

```powershell
docker compose up -d
docker compose ps
npm run db:migrate
```

Le port de la base est limité à la machine locale. Ne pas exécuter `docker compose down -v` si les données doivent être conservées.

### Avec une installation ou une base hébergée

Créer une base vide et un rôle propriétaire. Renseigner leur URL dans `.env`, puis lancer `npm run db:migrate`. Utiliser la connexion directe fournie par l’hébergeur pour les migrations. Conserver la vérification du certificat TLS ; pour un certificat CA spécifique, renseigner `PGSSLROOTCERT`. Ne pas utiliser `rejectUnauthorized: false`.

## 3. Migrations et droits d’exécution

`npm run db:migrate` applique le schéma d’origine si la base est vide, puis les sessions et les politiques RLS. Les migrations sont transactionnelles, mémorisées dans `aurelia_migrations` et protégées contre deux lancements simultanés par verrou PostgreSQL. Sur une base contenant déjà `stores`, le schéma initial est considéré présent : faire une sauvegarde et vérifier que les autres tables correspondent avant d’appliquer la migration. Des e-mails identiques à la casse près, ou plusieurs boutiques par propriétaire, doivent être résolus avant la migration des index uniques.

Créer ensuite un rôle dédié à l’API. Dans psql connecté avec le propriétaire ou l’administrateur :

```sql
CREATE ROLE aurelia_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
\password aurelia_app
GRANT CONNECT ON DATABASE aurelia TO aurelia_app;
GRANT USAGE ON SCHEMA public TO aurelia_app;
GRANT SELECT, INSERT, UPDATE, DELETE
ON users, stores, products, product_variants, media_assets, categories, product_images, customers, orders, order_items, reviews,
   tasks, events, sessions, newsletter_subscribers
TO aurelia_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aurelia_app;
```

Pour Docker, ouvrir psql avec `docker compose exec postgres psql -U aurelia_owner -d aurelia`. `\password` demande le secret sans l’écrire dans l’historique SQL. Le compte d’exécution ne doit être ni superutilisateur, ni doté de BYPASSRLS. Les vues d’agrégation historiques ne sont pas utilisées par l’API et ne doivent pas être accordées à ce rôle.

Remplacer `DATABASE_URL` dans `.env` par la connexion `aurelia_app`. Garder la connexion propriétaire séparément pour les prochaines migrations. Les tables `users`, `sessions` et `stores` restent accessibles au serveur d’authentification ; aucun accès SQL direct n’est donné aux vendeurs.

## 4. Démarrer et valider

La migration 007 ajoute `users.email_verified_at` et `account_tokens` sans modifier les mots de passe, les sessions ou les données métier existantes. Pour un rôle applicatif personnalisé, accorder `SELECT, INSERT, UPDATE, DELETE ON account_tokens`. Les e-mails de compte sont enregistrés localement par défaut ; configurer SMTP et `APP_PUBLIC_URL` avant la production. Le [guide de sécurité des comptes](SECURITE-COMPTES.md) détaille les parcours, les limites et les tests.

La migration 006 ajoute les métadonnées `media_assets` et autorise les références `/media/…` dans les galeries, logos et couvertures sans modifier les lignes existantes. Pour un rôle SQL personnalisé, accorder les droits `SELECT, INSERT, UPDATE, DELETE ON media_assets`. Le compte applicatif reste sans privilège de contournement RLS. Exécuter `npm run db:migrate`, installer les nouvelles dépendances, compiler puis redémarrer l’API. Les fichiers sont conservés séparément de la base : voir [IMAGES.md](IMAGES.md).

La migration 005 ajoute `product_variants`, les options des produits et les instantanés des variantes dans les lignes de commande. Elle ne convertit aucun produit existant et ne recalcule aucun montant historique. Exécuter `npm run db:migrate` avec le propriétaire avant de démarrer cette version. Les rôles locaux `aurelia_app_*`, `aurelia_app` et `aurelia_local` reçoivent les droits sur la nouvelle table ; pour un rôle personnalisé, accorder explicitement `SELECT, INSERT, UPDATE, DELETE ON product_variants`. La RLS reste obligatoire, avec `app.store_id` fixé par les transactions de l’API. `npm run test:variants:postgres` valide les variantes, les stocks et l’isolation sur la base configurée.

La migration 004 ajoute l’identité visuelle des boutiques : logo, couverture, couleurs et titre d’accueil. Elle conserve les données existantes. Les réglages se font dans « Ma boutique » ; le lot 4 permet désormais de sélectionner les images depuis l’ordinateur. Les fiches publiques sont disponibles sur `/s/:slug/p/:id`, avec la même session de panier que le catalogue. Les produits masqués ou supprimés ne sont pas servis par `/v1/public/stores/:slug/products/:id`.

```powershell
npm install
npm --prefix aurelia-front install
npm --prefix aurelia-dashboard install
npm test
npm run build
npm start
```

1. Ouvrir `http://localhost:3000` et créer un compte vendeur avec un mot de passe d’au moins 12 caractères.
2. Vérifier l’arrivée sur `/dashboard/` avec un catalogue et des commandes vides.
3. Ajouter un parfum actif avec un stock positif.
4. Dans « Ma boutique », vérifier le numéro WhatsApp international et copier le lien `/s/votre-slug`.
5. Ouvrir cette boutique sans session vendeur, préparer un panier et saisir un nom et un téléphone.
6. Envoyer la demande : le serveur calcule le prix à partir du catalogue et enregistre la commande avant d’ouvrir WhatsApp. L’ouverture de WhatsApp ne constitue pas un paiement.
7. Retrouver la commande dans le dashboard, puis la passer à « Livré » pour vérifier les rapports.
8. Créer un deuxième compte avec une autre adresse et un autre slug : il doit avoir un espace vide indépendant.
9. Redémarrer le serveur et vérifier que les données sont conservées.

En ancien mode embarqué, `npm run dev:embedded` remplace les étapes de configuration et de démarrage PostgreSQL, et applique automatiquement les migrations. Il ne nécessite pas `.env`.

## 5. Mise en ligne ultérieure

L’architecture fournie sert les deux builds et l’API sur **le même domaine**, ce qui évite les cookies tiers :

- `/` : site commercial et inscription ;
- `/dashboard/` : espace vendeur ;
- `/s/:slug` : boutique publique ;
- `/v1` : API.

Sur le serveur Node, configurer `DATABASE_URL`, `NODE_ENV=production`, `PORT` et `APP_ORIGINS=https://votre-domaine`. Enlever des fichiers `.env` des interfaces les éventuelles URL localhost avant de construire ; les valeurs par défaut utilisent le domaine courant. Installer les dépendances, migrer avec le propriétaire, construire les deux interfaces puis démarrer avec le rôle limité. En cas d’installation avec `npm ci --omit=dev`, construire les interfaces dans une étape de build séparée et ne pas utiliser le mode PGlite.

Configurer un reverse proxy HTTPS devant Node. Définir `TRUST_PROXY=1` uniquement si une seule couche de proxy de confiance se trouve devant le serveur et que Node n’est pas directement exposé. Les cookies Secure nécessitent HTTPS. Ne pas déplacer le dashboard et l’API sur des domaines indépendants sans revoir le routage et les cookies.

Sauvegarder PostgreSQL, tester la restauration et surveiller les erreurs API. Le limiteur de requêtes utilise la mémoire d’un processus ; avant une exploitation à plusieurs instances, passer à un stockage de limitation partagé. Configurer et tester la remise SMTP des e-mails de récupération et de vérification avant une ouverture commerciale large. La facturation et le paiement en ligne ne font pas partie de cette version.

## 6. Limites et évolutions

Les statistiques réutilisent les calculs du dashboard côté serveur et chargent les données de la boutique ; pour de gros volumes, les remplacer par des agrégations SQL paginées. Les demandes de commande ne réservent pas le stock, et les quantités doivent être confirmées par le vendeur. L’export/import des données PGlite vers PostgreSQL n’est pas automatisé : choisir la base cible avant de saisir des données de production.

Références : [transactions node-postgres](https://node-postgres.com/features/transactions), [requêtes paramétrées](https://node-postgres.com/features/queries), [sécurité Express](https://expressjs.com/en/advanced/best-practice-security/).
