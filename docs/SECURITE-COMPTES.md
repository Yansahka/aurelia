# Sécurité des comptes — lot 6

## Parcours proposés

« Mot de passe oublié ? » est accessible depuis les deux écrans de connexion. Le vendeur renseigne son adresse e-mail, ouvre le lien reçu, choisit et confirme son nouveau mot de passe, puis se reconnecte. Le mot de passe comporte de 12 à 128 caractères et ne peut pas être composé uniquement d’espaces. Le mot de passe n’est jamais envoyé par e-mail.

Une nouvelle inscription génère aussi un e-mail de vérification. Le lien ouvre une page qui demande une confirmation explicite ; sa simple consultation ne consomme pas le lien. Dans le dashboard, « Mon compte » présente l’adresse, son statut et un bouton pour renvoyer le message. « Actualiser le statut » recharge le statut après confirmation dans un autre onglet.

Les anciens comptes restent utilisables et sont initialement indiqués « à vérifier ». Aucun mot de passe ni aucune session existante n’est modifié par la migration. La vérification e-mail est proposée sans bloquer le dashboard, les produits ou la boutique publique ; ce lot n’impose pas de vérification avant publication.

## Tester sur cet ordinateur

Le mode de développement utilise par défaut des fichiers locaux. Il ne transmet aucun message à une boîte e-mail sur Internet.

```dotenv
MAIL_MODE=file
APP_PUBLIC_URL=http://localhost:3000
# Facultatif : dossier absolu, sinon .local/mail sous la racine du projet
# MAIL_DIRECTORY=C:/Aurelia/emails
```

1. Démarrer l’application et demander un lien depuis « Mot de passe oublié ? », ou renvoyer la vérification depuis « Mon compte ».
2. Ouvrir le dossier `.local/mail` dans l’explorateur et trier par date de modification.
3. Ouvrir le fichier `.txt` le plus récent correspondant à l’adresse souhaitée. Il contient le destinataire, l’objet et le lien complet. Le fichier `.eml` associé peut aussi être ouvert dans un logiciel de messagerie.
4. Copier **tout** le lien, y compris `#token=…`, dans le navigateur. L’application efface ensuite le fragment de la barre d’adresse et garde le jeton uniquement en mémoire pour cette page. Recharger cette page après cet effacement nécessite de rouvrir le lien original ou d’en demander un nouveau.
5. Pour une vérification, cliquer sur « Confirmer mon adresse e-mail ». Pour une réinitialisation, remplir les deux champs puis enregistrer et se reconnecter.

Le dossier contient des liens personnels : il reste privé sur le serveur, n’est pas exposé par HTTP et est exclu de Git. Aucun panneau public ne permet de lire les e-mails des autres comptes. Les fichiers de développement ne sont pas purgés automatiquement ; les liens expirent même si leur fichier reste présent. Les dates et objets servent à distinguer les messages de test.

## Garanties côté serveur

- Jetons aléatoires de 32 octets, avec seulement leur condensat SHA-256 en base. Le lien brut n’apparaît jamais dans une réponse d’API ni dans les logs applicatifs.
- Liens personnels à usage unique, associés au compte, à l’adresse au moment de leur émission et à un usage précis. Un lien de vérification ne réinitialise pas le mot de passe et inversement.
- Expiration : 30 minutes pour le mot de passe, 24 heures pour l’adresse e-mail. Une nouvelle émission invalide les liens précédents du même usage. Une minute minimum entre deux émissions pour un compte et un usage.
- Réponse de récupération identique pour une adresse connue ou inconnue, et limitation de 10 opérations de récupération/vérification par IP sur 15 minutes. Les mutations exigent une origine autorisée et du JSON. Ces limites utilisent la mémoire du processus, comme les autres limiteurs existants.
- Après réinitialisation, toutes les sessions du compte concerné et tous ses liens encore ouverts sont invalidés. Les sessions des autres comptes restent valides. Il n’y a pas de connexion automatique avec le lien.
- Verrouillage du compte pendant la consommation du lien et pendant la connexion : deux consommations simultanées ne peuvent pas réussir, et une connexion concurrente ne peut pas laisser une session valide fondée sur l’ancien mot de passe après la réinitialisation.
- Notification après changement du mot de passe, sans mot de passe ni jeton dans ce message.
- Liens construits depuis `APP_PUBLIC_URL`, jamais depuis l’en-tête `Host` de la requête. Les jetons sont dans le fragment du lien, qui n’est pas envoyé dans la requête GET du navigateur. La confirmation exige un POST explicite.

Les tables d’authentification `users`, `sessions` et `account_tokens` sont accessibles au serveur uniquement. Les tables métier gardent leur isolation RLS par boutique. La migration 007 ajoute `users.email_verified_at` et `account_tokens` sans transformer les données métier. Pour un rôle SQL applicatif personnalisé, accorder `SELECT, INSERT, UPDATE, DELETE ON account_tokens` après migration ; les rôles locaux standard sont gérés par le script.

## Configuration d’un fournisseur SMTP

Le transport SMTP est implémenté mais aucun fournisseur n’est configuré ni testé pour ce projet. Lors de la mise en ligne, renseigner les valeurs dans l’environnement privé du serveur :

```dotenv
NODE_ENV=production
APP_PUBLIC_URL=https://votre-domaine
APP_ORIGINS=https://votre-domaine
MAIL_MODE=smtp
MAIL_FROM=Aurelia <no-reply@votre-domaine>
SMTP_HOST=smtp.votre-fournisseur
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=identifiant-fourni
SMTP_PASSWORD=secret-fourni
```

Le port 587 utilise STARTTLS obligatoire ; pour TLS direct, utiliser le port 465 et `SMTP_SECURE=true`. La validation des certificats reste active. `SMTP_USER` et `SMTP_PASSWORD` doivent être renseignés ensemble lorsqu’une authentification est nécessaire. Configurer l’expéditeur et les enregistrements DNS demandés par le fournisseur, puis tester la réception réelle avant ouverture publique.

`APP_PUBLIC_URL` doit être une origine HTTPS sans chemin, paramètres, fragment ou identifiants. HTTP est autorisé uniquement pour localhost en développement. Le mode fichier est refusé en production. Les secrets SMTP restent côté serveur et ne doivent jamais être placés dans une variable `VITE_*`.

L’envoi est lancé après validation des données et ne révèle pas les erreurs du transport au demandeur d’une récupération. Un incident d’envoi ne supprime pas un compte qui vient d’être créé. Les erreurs sont signalées sans lien personnel dans la console du serveur ; l’utilisateur peut redemander un message après le délai d’une minute. Les envois en cours sont attendus lors d’un arrêt propre. Il n’y a pas encore de file d’envoi persistante ni de relance automatique après un arrêt brutal ou un échec SMTP.

## Validation et conservation

`npm test` : 80 tests réussis. `npm run test:accounts:postgres` : 9 tests réussis ; régressions natives SaaS : 17 contrôles ; parcours complet : 8 tests. Les suites existantes utilisent un transport factice pour éviter tout envoi externe, même si SMTP est configuré. Le transport fichier est testé séparément et a été utilisé dans le navigateur.

Les tests couvrent les expirations, le rejeu, les usages croisés, les nouvelles émissions, les demandes simultanées, les sessions de plusieurs comptes, les réponses publiques identiques, les origines non autorisées, le domaine des liens, le stockage des seuls condensats et la conservation des comptes/sessions pendant la migration.

Dans le navigateur : demande de récupération, e-mail local généré, lien de vérification confirmé, statut vérifié dans « Mon compte », formulaire de nouveau mot de passe, liens invalides et présentation à 320 pixels vérifiés. Le changement de mot de passe et ses effets sont validés par les tests automatisés sur des comptes de test ; aucun mot de passe Yanshop n’a été modifié et aucun e-mail n’a été envoyé sur Internet.

La sauvegarde privée initiale est dans `.local/backups/lot6-2026-11-23`. Les 9 produits de Yanshop, les données initiales de sa boutique et ses 3 fichiers d’images sont inchangés. Le [rapport du lot 6](securite-comptes-lot6/rapport-lot6.html) contient les captures et la comparaison finale.
