# Vérifications de la version locale

Vérifié le 22 novembre 2026.

- Les deux applications React compilent avec Vite (`npm run build`).
- `npm test` : 11 tests réussis, dont le scénario principal et ses 10 sous-tests.
- Les tests utilisent PostgreSQL embarqué PGlite avec les extensions pgcrypto et pg_trgm, le schéma SQL du projet et la migration des sessions.
- L’API de test utilise un rôle sans superutilisateur ni BYPASSRLS. Une requête SQL sur les produits sans filtre explicite ne voit que ceux de la boutique sélectionnée ; en dehors de cette transaction, elle ne voit aucun produit.
- Deux comptes sont inscrits séparément. Les catalogues et commandes sont distincts, et les modifications d’identifiants d’une autre boutique sont refusées.
- Les doublons déclenchent une erreur et l’inscription est annulée dans son ensemble, sans compte orphelin.
- Les mots de passe sont hachés ; le cookie de session porte HttpOnly et SameSite=Lax. Une session déconnectée est refusée côté serveur.
- Le serveur recalcule les prix des commandes, refuse un produit provenant d’une autre boutique et rejette un stock insuffisant.
- Les produits cachés ne sont pas publiés. Le contenu public n’inclut ni les clients ni les commandes privées.
- Une commande livrée alimente les statistiques et les dépenses du client.
- Inscription, arrivée sur le dashboard vide, création de produit et affichage sur la boutique publique vérifiés dans le navigateur.
- Redémarrage du serveur local : compte, boutique et produit conservés dans `.local/postgres`.

Un compte de contrôle nommé **Vendeur de test local**, une boutique **Atelier Test Local** et un parfum **Néroli de test** existent dans la base locale utilisée pour la vérification visuelle. Ils sont distincts des bases éphémères des tests automatiques. Créer son propre compte depuis la page d’accueil pour commencer avec un espace vide.

La capture `docs/aurelia-preview.jpg` montre le site commercial local. Aucun message WhatsApp n’a été envoyé pendant les vérifications.

La connexion réseau à un serveur PostgreSQL standard et le déploiement HTTPS ne sont pas vérifiés ici : aucune instance externe n’est configurée. Le moteur embarqué valide les requêtes et politiques SQL, mais ne couvre pas les certificats TLS, le pool de connexions réseau ni les opérations de sauvegarde d’un serveur PostgreSQL classique.
