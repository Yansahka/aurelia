# Aurelia

Plateforme de boutiques de produits physiques : site commercial, inscription vendeur, dashboard privé et boutique publique partageable. Chaque compte possède une boutique vide et crée ses propres catégories ; les données de démonstration restent uniquement sur `/demo`.

Le lot 1 ajoute les catégories par boutique, les références facultatives, les descriptions, les caractéristiques libres et une galerie de 8 photos HTTPS maximum. Les photos se gèrent par liens ; le téléversement de fichiers et les variantes ne font pas partie de ce lot. Les produits sans photo utilisent un visuel neutre. Voir [le rapport du lot 1](docs/catalogue-universel-lot1/rapport-lot1.html).

## Demarrer en local avec PostgreSQL

La base locale est `aurelia_db` sur `localhost:5432`. Renseigner le compte de migration dans `.env` avec `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` et `PGPASSWORD`, puis lancer :

```powershell
npm run db:setup-local
npm run dev:local
```

La configuration applique les migrations et cree un compte applicatif limite. `.env` contient ensuite sa connexion ; `.env.migrations` conserve la connexion proprietaire pour les migrations futures. Ces deux fichiers sont exclus de Git et doivent rester prives. Ne pas ecraser `.env.migrations` avec le compte applicatif.

`npm start`, `npm run dev` et `npm run dev:local` utilisent tous le serveur PostgreSQL natif. Aucune bascule automatique vers PGlite. Ouvrir **http://localhost:3000** pour creer son compte ; le dashboard est sur **http://localhost:3000/dashboard/**.

`npm run test:postgres` teste le parcours sur la base configuree, avec deux nouvelles boutiques de validation identifiables par le prefixe `pg-`. Ces donnees sont conservees. Les anciennes donnees PGlite dans `.local/` restent preservees et ne sont pas importees automatiquement.

## Ancien mode embarque (optionnel)

Prérequis : Node.js 20 ou supérieur et npm. Depuis ce dossier :

```powershell
npm install
npm --prefix aurelia-front install
npm --prefix aurelia-dashboard install
npm run build
npm run dev:embedded
```

Ouvrir **http://localhost:3000**, choisir « Créer ma boutique », puis ajouter un produit depuis le dashboard. L’adresse de la boutique est `http://localhost:3000/s/votre-slug` ; le dashboard est `http://localhost:3000/dashboard/`.

Ce mode utilise **PGlite, PostgreSQL embarqué WebAssembly**, avec de vraies tables SQL et la RLS active. Il n’ouvre pas de port PostgreSQL et ne lit pas `DATABASE_URL`. Les données sont conservées dans `.local/postgres` entre les démarrages. Ne pas lancer deux processus sur ce répertoire. Arrêter avec Ctrl+C. Le moteur embarqué est destiné au développement, pas à l’hébergement public. Les données de ce mode ne sont pas transférées automatiquement lors du passage à un serveur PostgreSQL.

Le lancement local réserve `.local/server.lock` pour refuser une seconde ouverture. Chaque écriture validée est suivie d’un point de reprise ; la suite de tests vérifie aussi la persistance après interruption d’un processus temporaire. Le [rapport de validation des 16 corrections](docs/validation-2026-11-22/rapport-validation.html) regroupe les résultats et les captures.

## Connecter un serveur PostgreSQL

Le processus complet, les commandes et la mise en ligne figurent dans [docs/POSTGRESQL.md](docs/POSTGRESQL.md).

1. Créer une base PostgreSQL et son compte de migration.
2. Copier `.env.example` en `.env` et renseigner les variables `PG*` côté serveur (ou `DATABASE_URL` pour une connexion hébergée).
3. Exécuter `npm run db:migrate` avec le compte propriétaire de la base.
4. Créer le compte d’exécution aux droits limités et remplacer `DATABASE_URL` par sa connexion.
5. Exécuter `npm run build`, puis `npm start`.

Le navigateur appelle `/v1` ; il n’accède jamais directement à PostgreSQL. Les sessions utilisent un cookie HttpOnly et les données métier sont isolées par boutique côté API et dans la base. Les mots de passe sont hachés avec scrypt.

## Développement des interfaces

Après le démarrage de l’API (standard ou embarquée), ouvrir deux terminaux :

```powershell
npm --prefix aurelia-front run dev
npm --prefix aurelia-dashboard run dev
```

La vitrine et les boutiques sont sur **http://localhost:5173**, le dashboard sur **http://localhost:5174/dashboard/**. Vite relaie `/v1` vers le port 3000. Les cookies sont partagés sur `localhost`. Utiliser `localhost` partout, sans mélanger avec `127.0.0.1`. Les URL des liens sont calculées automatiquement selon le mode de build ; les variables `VITE_*_URL` servent seulement aux hébergements séparés. Ne pas recopier une URL de développement dans un build de production.

## Organisation

- `aurelia-front/` : site commercial à `/`, formulaires d’accès, boutiques `/s/:slug` et démo `/demo`.
- `aurelia-dashboard/` : gestion du catalogue, commandes, clients, avis, rapports, réglages et partage.
- `server/` : API Express, PostgreSQL, authentification, migrations et tests.
- `docs/POSTGRESQL.md` : installation et exploitation.
- `compose.yaml` : PostgreSQL standard en option, avec Docker.

## Vérifications

`npm test` vérifie le parcours avec deux vendeurs, la RLS sous un rôle non privilégié, les accès inter-boutiques refusés, les transactions, les prix calculés côté serveur, les commandes et la révocation de session. Les tests utilisent une base PostgreSQL embarquée en mémoire indépendante des données locales.

`npm run build` compile les deux interfaces.

`npm run test:catalogue:postgres` vérifie catégories, photos, références, caractéristiques, commandes et isolation sur la vraie base configurée. Il crée deux boutiques de validation indépendantes et conserve ces données. `npm test` utilise des bases isolées en mémoire ; les fichiers sont exécutés successivement pour limiter les moteurs WASM simultanés sous Windows.

## Périmètre actuel

Les commandes sont des demandes commerciales : aucun paiement en ligne, aucune réservation ni décrémentation automatique du stock. La disponibilité est vérifiée à la demande, puis le vendeur confirme sur WhatsApp. Les avis existants peuvent être publiés depuis le dashboard ; la collecte de nouveaux avis et la création de tâches ne sont pas encore proposées dans l’interface. Pas de facturation des abonnements, de vérification e-mail ni de récupération de mot de passe pour l’instant. Un compte correspond à une boutique et un propriétaire. Le changement de slug change immédiatement l’adresse publique et les anciens liens cessent de fonctionner.
