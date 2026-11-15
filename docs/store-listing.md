# Textes de publication — Chrome Web Store & Firefox Add-ons

## Nom
DoomName — Surveillance de domaines

## Description courte (132 car. max, Chrome)
Vérifiez la disponibilité d'un nom de domaine et surveillez-le en un clic, depuis n'importe quel onglet.

## Description longue

DoomName vous dit instantanément si un nom de domaine est libre, et vous prévient
par e-mail dès qu'un domaine pris se libère.

**Depuis n'importe quelle page**
Ouvrez le popup : le domaine de l'onglet actif est déjà vérifié, avec son statut
WHOIS. Un clic suffit pour le mettre sous surveillance.

**Recherche instantanée**
Tapez un nom de domaine : la vérification se lance pendant la frappe. Sans
extension (« monsite »), les TLD les plus courants sont testés en parallèle :
.com, .fr, .net, .io, .co.

**Alertes e-mail**
Un domaine qui vous intéresse est déjà pris ? Activez l'alerte : vous recevez un
e-mail dès qu'il redevient disponible. L'extension détecte aussi les domaines en
période de grâce ou en cours de suppression — ceux qui vont bientôt se libérer.

**Rapide à utiliser**
- Raccourci clavier Alt+Maj+D pour surveiller le domaine de l'onglet actif
- Menu contextuel sur une page, un lien ou une sélection de texte
- Option « clic sur l'icône = surveillance immédiate »
- Gestion complète de vos domaines surveillés depuis les réglages

**Gratuit et sans compte**
Pas d'inscription : une adresse e-mail suffit pour recevoir vos alertes.
DoomName est un projet open source.

## Justification des permissions (Chrome Web Store)

- **storage** — mémorise l'adresse e-mail d'alerte, les préférences d'affichage,
  un cache court des vérifications et l'historique local des recherches.
- **tabs** — lit l'URL de l'onglet actif pour en extraire le nom de domaine à
  proposer. Aucune URL n'est transmise à un serveur tiers.
- **contextMenus** — ajoute les entrées « Surveiller ce domaine ».
- **notifications** — confirme l'ajout d'une surveillance.
- **alarms** — réservé au rafraîchissement périodique des statuts.
- **host permission `https://www.doomname.com/*`** — seule destination des
  requêtes : vérification WHOIS et gestion des alertes.
- **Pas de code distant** : tout le code est inclus dans le paquet.

## Catégorie
Productivité / Outils de développement

## Mots-clés
nom de domaine, whois, disponibilité, alerte, domaine expiré, registrar, dns
