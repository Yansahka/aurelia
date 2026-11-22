# Images de produits et de boutiques

Le sélecteur natif permet de choisir des photos depuis l’ordinateur ou depuis la galerie proposée par le téléphone. L’application importe seulement les fichiers sélectionnés. Elle ne parcourt pas les autres dossiers de l’utilisateur.

## Utilisation

1. Produit : ouvrir le formulaire puis « Choisir des photos ». Plusieurs fichiers peuvent être sélectionnés ensemble, dans la limite de huit photos.
2. « Monter » et « Descendre » changent l’ordre ; la première photo devient la photo principale. « Remplacer » ouvre un sélecteur pour une seule image et « Retirer » retire son association.
3. Boutique : ouvrir « Ma boutique », choisir ou remplacer le logo et la couverture. Un aperçu permet de vérifier le résultat.
4. Attendre la fin des imports, puis enregistrer. Un import invalide conserve la photo précédente et affiche une erreur. Le bouton d’enregistrement attend la fin des imports.

Les images doivent être fixes, aux formats JPEG, PNG ou WebP, de 10 Mo et 40 mégapixels au maximum. Les fichiers HEIC, GIF, SVG et AVIF ne sont pas acceptés dans cette version : les convertir en JPEG ou PNG avant sélection. Le serveur vérifie le contenu réel plutôt que le seul nom du fichier. Il corrige l’orientation EXIF, supprime les métadonnées (notamment EXIF/GPS), réduit les dimensions à 2 400 × 2 400 pixels au maximum sans agrandissement et encode en WebP qualité 85. Les PNG transparents restent transparents.

## Stockage actuel

Par défaut, le serveur écrit dans `.local/uploads/<UUID de boutique>/<UUID d’image>.webp`, sous la racine du projet. Les noms originaux et les chemins privés de l’ordinateur ne sont pas conservés. Les photos existantes utilisant des URL HTTPS continuent de fonctionner sans téléchargement ni modification.

```dotenv
# Exemple facultatif dans le .env du serveur
MEDIA_DIRECTORY=C:/Aurelia/images
```

Le dossier est créé au premier import. Le compte Windows qui lance Node doit pouvoir y lire et y écrire. Sans configuration, le dossier utilisé est celui du projet, indépendamment du répertoire de lancement. Une configuration relative est résolue par rapport au répertoire de lancement de Node : préférer un chemin absolu.

Les URL publiques sont relatives au site, par exemple `/media/<boutique>/<image>.webp`. Elles fonctionnent après changement de domaine si les fichiers sont transférés en conservant les mêmes chemins. Le proxy Vite relaie aussi `/media` vers l’API en développement.

PostgreSQL conserve dans `media_assets` l’appartenance à la boutique, la clé de stockage, l’URL, le type, la taille et les dimensions. Les octets des images restent sur disque. L’import exige une session vendeur et une origine autorisée ; l’API empêche d’associer une image locale d’une autre boutique. Les images importées sont destinées à être publiques et sont accessibles par leur URL dès l’import, avant même l’enregistrement du formulaire. Aucun répertoire n’est listable. Une image dont l’import échoue avant validation de la transaction est retirée du disque.

Retirer une image du formulaire n’efface pas le fichier ; les imports abandonnés restent aussi conservés. Une future purge devra rechercher les références des produits et boutiques, garder un délai de récupération et être précédée d’une sauvegarde. Il n’y a pas de quota global par boutique ni de purge automatique pour ce fonctionnement local ; les limites de taille et de fréquence s’appliquent aux imports.

## Sauvegarde et restauration

Sauvegarder la base PostgreSQL **et** la totalité de `MEDIA_DIRECTORY` (ou `.local/uploads`), en conservant les sous-dossiers. Pour un instantané cohérent, suspendre les imports pendant les deux sauvegardes. Une sauvegarde SQL seule ne contient pas les photos. Les fichiers et les sauvegardes privées ne sont pas publiés dans GitHub.

Pour déplacer le dossier : arrêter l’API, copier toute l’arborescence vers le nouveau dossier, renseigner `MEDIA_DIRECTORY`, relancer l’API et vérifier quelques URL publiques. Ne pas renommer les fichiers ni les sous-dossiers. Le stockage des tests automatisés isolés utilise un dossier temporaire supprimé à la fin ; les tests PostgreSQL natifs conservent leurs boutiques et leurs fichiers dans le stockage local configuré.

## Passage ultérieur chez un fournisseur

Le fournisseur n’est pas encore configuré. Les opérations de stockage sont regroupées dans `server/media.js` et les clés sont indépendantes du chemin du disque. Pour la mise en ligne :

1. Choisir le fournisseur et un espace dédié, avec des identifiants gardés côté serveur.
2. Ajouter un adaptateur pour envoyer les WebP dans cet espace en conservant les clés `<boutique>/<image>.webp` et les contrôles existants.
3. Copier les fichiers locaux, puis vérifier tailles, intégrité et lisibilité.
4. Adapter la lecture de `/media/…` en proxy ou redirection vers le stockage ; conserver ces URL permet de garder les références déjà enregistrées. Une autre option est une migration explicite vers un domaine d’images HTTPS.
5. Vérifier les fiches, les logos, les couvertures et la politique de cache ; activer les sauvegardes et les quotas chez le fournisseur avant de basculer.

Avec un hébergement Node classique et un volume persistant, le stockage local peut également continuer de fonctionner : le dossier serait alors sur le serveur, et non sur l’ordinateur du visiteur. Un hébergement à disque éphémère nécessite un stockage externe.
