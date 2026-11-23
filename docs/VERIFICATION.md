# Validation complète locale — lot 5

Mise à jour du 23 novembre : le [lot 6 de sécurité des comptes](SECURITE-COMPTES.md) porte la suite à 80 tests réussis et ajoute les contrôles natifs de récupération et de vérification e-mail. Les résultats du lot 5 ci-dessous constituent le bilan de cette étape précédente.

Vérifié le **23 novembre 2026**, branche `feature/validation-complete-lot-5`, après les quatre lots de catalogue, personnalisation, variantes et images locales. Le fonctionnement commercial reste une demande de commande finalisée avec le vendeur sur WhatsApp.

## Résultats techniques

| Commande | Résultat |
|---|---|
| `npm test` | 70 tests réussis, aucun échec, bases isolées |
| `npm run test:postgres` | 17 contrôles réussis sur PostgreSQL natif |
| `npm run test:catalogue:postgres` | 9 tests réussis |
| `npm run test:branding:postgres` | 8 tests réussis |
| `npm run test:variants:postgres` | 8 tests réussis |
| `npm run test:media:postgres` | 8 tests réussis |
| `npm run test:journey:postgres` | 8 tests réussis |
| `npm run build` | Front et dashboard compilés avec succès |

Les suites natives créent et conservent des boutiques de validation distinctes. Les tests isolés n’utilisent pas les données de la base locale. Le nouveau test `complete-journey.test.js` enchaîne inscription, identité visuelle, import, catégorie, produit simple, variantes, commande mixte, notes, livraison, statistiques, changement des prix et contrôle de l’historique, suppression douce, restauration, redémarrage et révocation de session. Il vérifie aussi les tentatives d’accès croisé entre deux vendeurs, leurs produits, images et commandes.

## Contrôles navigateur

- Formulaire d’inscription : « Épicerie du Soleil » génère `epicerie-du-soleil`. Le parcours d’inscription serveur est couvert par les suites automatisées.
- Création d’un produit simple à 5 000 FCFA avec photo locale dans **Atelier Horizon**, distincte de Yanshop.
- Commande mixte : 2 × 12 500 + 1 × 14 500 + 1 × 5 000 = **44 500 FCFA**. Les variantes, références et prix sont repris dans le brouillon WhatsApp. Le brouillon a été fermé sans envoyer de message.
- Commande `AU-5A5CB70C` retrouvée dans le dashboard, notes enregistrées et état passé à « Livré ». Les trois lignes et le montant ont été revérifiés directement en PostgreSQL ; les ventes du mois reflètent ce montant (affiché sous forme compacte dans les indicateurs).
- Actualisation : une nouvelle demande de test absente de la page déjà ouverte apparaît après « Actualiser les commandes », sans rechargement de la page.
- Panier : fermé, il est inerte et masqué aux technologies d’assistance ; ouvert, le focus reste dans le dialogue, Tab et Maj+Tab bouclent, Échap ferme, le focus revient au bouton d’ouverture et le défilement du fond est restauré.
- Mobile : fiche et panier à 390 et 320 pixels sans débordement horizontal ; quantité supérieure au stock bloquée. Détail de commande à 320 pixels : dialogue de 278 pixels sans débordement interne.
- Connexion d’un second vendeur de test au catalogue vide, déconnexion, puis connexion du premier vendeur : les deux catalogues restent distincts, sans réutilisation des données en cache de l’autre compte.
- Aucune erreur JavaScript remontée sur les vues de connexion et de panier contrôlées.

## Corrections issues de la validation

1. Panier accessible au clavier lorsqu’il était fermé et absence de gestion du focus/défilement en ouverture : dialogue modal, fond inerte, focus contenu et restauré.
2. Commandes nouvelles absentes d’un dashboard déjà ouvert : bouton « Actualiser les commandes » et actualisation des données lors du clic sur la cloche.
3. Date de création présentée comme une relance prévue : affichage de la vraie date de relance, ou « Non planifiée » lorsqu’elle manque.
4. Séparateur « · » superflu dans le panier pour un produit sans format : prix affiché directement.
5. Message de filtre sans résultat sur un compte sans produit : message invitant à ajouter le premier produit.

## Conservation de Yanshop

Une sauvegarde privée de la base et des fichiers a été créée dans `.local/backups/validation-lot5-2026-11-23`. Les neuf produits présents au début du lot, cinq catégories, un client, une commande et sa ligne, trois médias enregistrés, ainsi que tous les champs et événements initiaux sont conservés. Les trois fichiers d’images ont été comparés par SHA-256 et sont identiques. L’identité visuelle, les prix, stocks et dates initiales sont inchangés. Aucune migration ni modification du schéma n’était nécessaire dans ce lot.

Le [rapport illustré](validation-complete-lot5/rapport-lot5.html), la [comparaison de Yanshop](validation-complete-lot5/conservation-yanshop.json) et la [commande de validation](validation-complete-lot5/commande-validation.json) donnent les preuves détaillées.

## Limites de cette validation

Validation effectuée localement avec PostgreSQL natif et le stockage local d’images. Le déploiement public HTTPS, les certificats et le futur fournisseur de stockage ne sont pas validés. Le navigateur couvre les interactions réelles décrites ci-dessus ; les suites CLI vérifient le serveur et les données et ne pilotent pas l’interface. Il n’y a pas d’envoi automatique de messages, de paiement en ligne ni de réservation/décrémentation automatique du stock. Les nouvelles commandes ne sont pas poussées en temps réel : utiliser l’actualisation ou la cloche pour relire les données. Les limites d’exploitation et les fonctions encore absentes restent décrites dans le README et le guide PostgreSQL.
