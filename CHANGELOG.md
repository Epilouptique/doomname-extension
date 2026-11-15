# Journal des versions

## 1.1.0 — 15/11/2026

- État « surveillé » persistant : le bouton affiche `✓ Surveillé` dès
  l'ouverture si le domaine est déjà suivi, et un clic dessus le retire
- Coche verte sur l'icône de la barre d'outils quand le domaine de l'onglet
  actif est surveillé (`common/watchlist.js`, cache local rafraîchi toutes les
  15 minutes)
- Logos officiels DoomName : en-tête du popup et des réglages, viseur pour
  l'icône de la barre d'outils
- Interface allégée : suppression des libellés redondants du popup et des
  réglages
- Déclaration `data_collection_permissions` requise par addons.mozilla.org
  depuis novembre 2025 (`personallyIdentifyingInfo`, `browsingActivity`),
  minimum Firefox porté à 140
- Construction DOM sans `innerHTML`, signalé par les validateurs de stores
- `build.ps1` pour Windows

## 1.0.0 — 15/11/2026

Première version.

- Popup : statut du domaine de l'onglet actif + recherche instantanée pendant la frappe
- Test parallèle des TLD courants quand la saisie n'a pas d'extension
- Ajout d'une surveillance depuis le popup, le menu contextuel ou `Alt+Maj+D`
- Statuts fins : disponible, pris, période de grâce, rachat, suppression en cours
- Page de réglages : e-mail d'alerte, options, thème, liste des domaines surveillés
- Cache local de 10 min, historique des recherches
- Builds séparés Chrome (service worker) et Firefox (background scripts, id gecko)
