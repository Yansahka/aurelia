# Aurelia

Plateforme de boutiques de produits physiques : site commercial, inscription vendeur, dashboard privé et boutique publique partageable. Chaque compte possède une boutique vide et crée ses propres catégories ; les données de démonstration restent uniquement sur `/demo`.

Le lot 1 ajoute les catégories par boutique, les références facultatives, les descriptions, les caractéristiques libres et une galerie de 8 photos HTTPS maximum. Les photos se gèrent par liens ; le téléversement de fichiers et les variantes ne font pas partie de ce lot. Les produits sans photo utilisent un visuel neutre. Voir [le rapport du lot 1](docs/catalogue-universel-lot1/rapport-lot1.html).

Le lot 2 ajoute logo, couverture, titre d’accueil et couleurs personnalisables dans « Ma boutique », avec un aperçu avant sauvegarde. Les images utilisent des liens HTTPS. Chaque produit public a maintenant une fiche à `/s/votre-slug/p/identifiant` : galerie agrandissable, descriptions, caractéristiques, avis publiés, produits associés, copie du lien et quantité dans la limite du stock. Le panier est commun à la boutique et à ses fiches. Voir [le rapport du lot 2](docs/personnalisation-boutiques-lot2/rapport-lot2.html).

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

`npm run test:branding:postgres` vérifie l’identité visuelle, les contrastes, les liens produits, les avis publiés, les produits masqués et l’isolation sur PostgreSQL natif. Il crée deux boutiques de validation et conserve leurs données.

## Variantes de produits — lot 3

Activer « Ce produit a des variantes » dans le formulaire produit, définir jusqu’à trois options (taille, couleur, format…), générer les combinaisons puis renseigner prix, ancien prix, stock, référence et disponibilité pour chacune. Limites : 20 valeurs par option et 100 combinaisons par produit. Les combinaisons conservées gardent leurs identifiants ; les variantes retirées sont archivées et les commandes gardent leurs libellés, références et prix historiques.

La boutique exige un choix complet avant l’ajout au panier. Les variantes ont leurs propres lignes de panier et contrôles de stock. Le lien partagé de la fiche peut présélectionner une variante. Les produits simples existants restent inchangés.

`npm run test:variants:postgres` vérifie ces parcours sur PostgreSQL natif et conserve deux boutiques de validation indépendantes. Le [rapport du lot 3](docs/variantes-produits-lot3/rapport-lot3.html) contient les résultats et les captures.

## Images locales — lot 4

Dans le formulaire produit, « Choisir des photos » ouvre le sélecteur de fichiers de l’ordinateur (ou la galerie disponible sur mobile). Choisir plusieurs photos, les réordonner, les remplacer ou les retirer, puis enregistrer le produit. Dans « Ma boutique », sélectionner le logo et la couverture puis enregistrer. Les anciennes images HTTPS restent compatibles.

Formats acceptés : JPEG, PNG et WebP fixes, 10 Mo et 40 mégapixels maximum par image. Le serveur corrige l’orientation, retire les métadonnées et produit un WebP de 2 400 pixels maximum par côté. Jusqu’à huit photos par produit. Le logo conserve sa transparence.

Les fichiers sont enregistrés dans `.local/uploads/<id-boutique>/` sur l’ordinateur qui exécute l’API ; PostgreSQL conserve leurs références dans `media_assets`. Le dossier est exclu de Git. `MEDIA_DIRECTORY` permet de choisir un autre dossier persistant. Après changement de dossier, copier les fichiers existants en conservant leur arborescence avant de relancer l’application. Sauvegarder ensemble la base et ce dossier.

L’import envoie immédiatement le fichier à l’application ; l’association au produit ou à la boutique prend effet après enregistrement. Retirer ou remplacer une photo ne supprime pas son ancien fichier, afin de préserver les liens existants. Les imports abandonnés restent également sur le disque ; aucune purge automatique n’est activée.

`npm run test:media:postgres` vérifie les imports, leur isolation, les associations et la persistance sur PostgreSQL natif, avec des boutiques de test distinctes. Le [rapport du lot 4](docs/images-locales-lot4/rapport-lot4.html) et le [guide du stockage](docs/IMAGES.md) détaillent la validation et la migration future vers un fournisseur.

## Périmètre actuel

Le lot 5 valide l’ensemble du parcours sur PostgreSQL natif, avec conservation de Yanshop et de ses fichiers. Le [rapport complet](docs/validation-complete-lot5/rapport-lot5.html) présente les résultats et les corrections ; [docs/VERIFICATION.md](docs/VERIFICATION.md) donne la matrice de tests. `npm run test:journey:postgres` rejoue le scénario combinant compte, identité, import, catalogue, variantes, commande, livraison et redémarrage sur des boutiques de test indépendantes. Le [plan des lots](docs/PLAN-GENERALISATION.md) est conservé dans le dépôt.

Dans « Commandes », utiliser « Actualiser les commandes » ou la cloche pour récupérer les nouvelles demandes sans recharger le dashboard. Le panier public gère désormais le focus du clavier, le blocage du fond et la fermeture par Échap.

Les commandes sont des demandes commerciales : aucun paiement en ligne, aucune réservation ni décrémentation automatique du stock. La disponibilité est vérifiée à la demande, puis le vendeur confirme sur WhatsApp. Les avis existants peuvent être publiés depuis le dashboard ; la collecte de nouveaux avis et la création de tâches ne sont pas encore proposées dans l’interface. Pas de facturation des abonnements, de vérification e-mail ni de récupération de mot de passe pour l’instant. Un compte correspond à une boutique et un propriétaire. Le changement de slug change immédiatement l’adresse publique et les anciens liens cessent de fonctionner.
