# Soumission au Chrome Web Store — contenu des champs

Formulaire à remplir manuellement : Chrome interdit à toute extension de
piloter le Web Store, l'automatisation est donc impossible.

Console : https://chrome.google.com/webstore/devconsole → **Ajouter un élément**
→ téléverser `doomname-chrome-1.1.0.zip`.

---

## Onglet « Fiche Web Store »

**Nom**
```
DoomName — Surveillance de domaines
```

**Description courte** (132 caractères max)
```
Vérifiez la disponibilité d'un nom de domaine et surveillez-le en un clic, depuis n'importe quel onglet.
```

**Description détaillée**
```
DoomName vous dit instantanément si un nom de domaine est libre, et vous prévient par e-mail dès qu'un domaine pris se libère.

DEPUIS N'IMPORTE QUELLE PAGE
Ouvrez le popup : le domaine de l'onglet actif est déjà vérifié, avec son statut WHOIS. Un clic suffit pour le mettre sous surveillance. Si le domaine est déjà suivi, l'icône de la barre d'outils porte une coche verte — vous le savez sans même ouvrir le popup.

RECHERCHE INSTANTANÉE
Tapez un nom de domaine : la vérification se lance pendant la frappe. Sans extension (« monsite »), les TLD les plus courants sont testés en parallèle : .com, .fr, .net, .io et .co.

ALERTES E-MAIL
Un domaine qui vous intéresse est déjà pris ? Activez l'alerte : vous recevez un e-mail dès qu'il redevient disponible. L'extension détecte aussi les domaines en période de grâce, en phase de rachat ou en cours de suppression — ceux qui vont bientôt se libérer.

RAPIDE À UTILISER
• Raccourci clavier Alt+Maj+D pour surveiller le domaine de l'onglet actif
• Menu contextuel sur une page, un lien ou une sélection de texte
• Option « clic sur l'icône = surveillance immédiate »
• Gestion complète de vos domaines surveillés depuis les réglages : pause, réactivation, suppression
• Thème clair, sombre ou automatique

GRATUIT, SANS COMPTE
Pas d'inscription ni de mot de passe : une adresse e-mail suffit pour recevoir vos alertes. Aucune publicité, aucun traceur, aucun script injecté dans les pages que vous consultez.

DoomName est un projet open source, publié sous licence MIT :
https://github.com/Epilouptique/doomname-extension
```

**Catégorie** : Outils de développement
**Langue** : Français

**Icône** : `icons/icon-128.png`
**Captures d'écran** : les trois fichiers de `docs/store/` (déjà au format 1280×800)

**URL de la page d'accueil** : `https://www.doomname.com`
**URL d'assistance** : `https://www.doomname.com`

---

## Onglet « Confidentialité »

**Objectif unique** (un seul paragraphe, c'est le champ le plus scruté)
```
Vérifier la disponibilité d'un nom de domaine et permettre à l'utilisateur d'être alerté par e-mail lorsque ce domaine devient disponible.
```

**Justification des autorisations**

- `activeTab` / `tabs`
```
Lire l'adresse de l'onglet actif, à la demande de l'utilisateur, afin d'en extraire le nom de domaine à vérifier ou à surveiller. L'historique de navigation n'est ni lu ni transmis.
```

- `storage`
```
Mémoriser l'adresse e-mail d'alerte, les préférences d'affichage, un cache de 10 minutes des vérifications et l'historique local des recherches.
```

- `contextMenus`
```
Proposer « Surveiller ce domaine » dans le menu contextuel sur une page, un lien ou une sélection de texte.
```

- `notifications`
```
Confirmer à l'utilisateur qu'un domaine a bien été mis sous surveillance.
```

- `alarms`
```
Rafraîchir périodiquement la liste des domaines surveillés afin d'afficher l'indicateur sur l'icône sans interroger le serveur à chaque changement d'onglet.
```

- Autorisation d'hôte `https://www.doomname.com/*`
```
Seule destination réseau de l'extension : vérification WHOIS des domaines et gestion des alertes via l'API publique de doomname.com.
```

- **Code exécuté à distance** : répondre **Non, je n'utilise pas de code distant**.
  Tout le code est inclus dans le paquet, sans bundler ni minification.

**Déclaration sur l'utilisation des données** — cocher :

- *Informations permettant d'identifier personnellement l'utilisateur* : OUI
  (l'adresse e-mail d'alerte saisie par l'utilisateur)
- *Activité sur le site Web* : OUI
  (le nom de domaine consulté, transmis au serveur pour la requête WHOIS)
- Tout le reste : NON (santé, finances, authentification, communications
  personnelles, localisation, historique web, contenu du site Web)

Puis cocher les trois certifications :
- Je ne vends ni ne transfère ces données à des tiers, hors cas d'usage approuvés
- Je ne les utilise pas à des fins étrangères à la fonctionnalité principale
- Je ne les utilise pas pour déterminer la solvabilité ni accorder des prêts

**URL de la politique de confidentialité**
```
https://www.doomname.com/politique-confidentialite.html#extension
```

---

## Onglet « Distribution »

- Visibilité : **Public**
- Zones géographiques : tous les pays
- Pas de tarification (extension gratuite)

---

## Après publication

Reporter l'URL publique de l'extension dans `README.md` et dans `CLAUDE.md`,
et envisager un lien depuis doomname.com.
