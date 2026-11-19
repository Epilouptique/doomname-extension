# DoomName — Extension Chrome & Firefox

Vérifier la disponibilité d'un nom de domaine et le mettre sous surveillance
en un clic, sans quitter l'onglet en cours.

**Installer** — [Chrome](https://chromewebstore.google.com/detail/doomname-%E2%80%94-surveillance-d/lafgkmmmkofidhhodeglkpeokcbkflgh) · [Firefox](https://addons.mozilla.org/addon/doomname-surveillance-domaines/)

Front-end seul : l'extension s'appuie sur l'API publique de
[doomname.com](https://www.doomname.com) (`/api/check`, `/api/manage/*`).
Aucune clé API n'est nécessaire.

## Fonctionnalités

| | |
|---|---|
| **Onglet actif** | Le popup affiche immédiatement le domaine de l'onglet et son statut WHOIS, avec un bouton *Surveiller* / *M'alerter*. |
| **Recherche instantanée** | La vérification part pendant la frappe (debounce 350 ms, requête précédente annulée). |
| **Multi-extensions** | Une saisie sans TLD (`monsite`) teste `.com .fr .net .io .co` en parallèle. |
| **Ajout sans popup** | Raccourci `Alt+Maj+D`, menu contextuel (page, lien, sélection), ou clic direct sur l'icône si l'option est activée. |
| **Statuts fins** | Disponible, pris, période de grâce, rachat possible, suppression en cours — mêmes états que le site. |
| **Gestion** | La page de réglages liste les domaines surveillés : pause, réactivation, suppression. |
| **Cache local** | 10 min par domaine, pour ne pas solliciter le WHOIS inutilement. |
| **Thème** | Clair / sombre / automatique, design system identique au site. |

## Structure

```
src/
  manifest.chrome.json     MV3 — service worker
  manifest.firefox.json    MV3 — background scripts + gecko id
  common/
    browser.js             abstraction chrome.* / browser.*
    domain.js              normalisation, validation, domaine enregistrable
    api.js                 client HTTP (timeout, abort, erreurs typées)
    storage.js             réglages (sync), cache et historique (local)
    permissions.js         host permissions optionnelles (Firefox MV3)
  background/background.js menus contextuels, raccourci, badge, notifications
  popup/                   popup de recherche
  options/                 réglages + liste des surveillances
build/
  build.sh                 assemble dist/chrome et dist/firefox
  make-icons.py            génère les icônes PNG
  test-domain.mjs          tests de non-régression
```

## Build

```bash
./build/build.sh      # produit dist/chrome et dist/firefox (aucun zip créé)
node build/test-domain.mjs
python3 build/make-icons.py   # uniquement si les icônes changent
```

Chargement en développement :

- **Chrome** — `chrome://extensions` → Mode développeur → *Charger l'extension non empaquetée* → `dist/chrome`
- **Firefox** — `about:debugging#/runtime/this-firefox` → *Charger un module temporaire* → `dist/firefox/manifest.json`

Le packaging (`.zip` / `.xpi`) est fait manuellement à partir de `dist/<cible>`.

## Permissions demandées

| Permission | Usage |
|---|---|
| `storage` | e-mail d'alerte, préférences, cache, historique |
| `tabs` | lire l'URL de l'onglet actif pour en extraire le domaine |
| `contextMenus` | entrées « Surveiller ce domaine » |
| `notifications` | confirmation visuelle après un ajout |
| `alarms` | réservé aux évolutions (rafraîchissement périodique) |
| `host_permissions: https://www.doomname.com/*` | appels API |

Aucune donnée n'est transmise ailleurs qu'à doomname.com. Pas de script de
contenu injecté dans les pages, pas de suivi.

## API utilisée

| Méthode | Route | Usage |
|---|---|---|
| `GET` | `/api/check?domain=` | statut WHOIS temps réel |
| `POST` | `/api/manage/subscribe` | ajout d'une surveillance |
| `GET` | `/api/manage/subscriptions?email=` | liste des surveillances |
| `PATCH` | `/api/manage/subscription/:id/toggle?email=` | pause / reprise |
| `DELETE` | `/api/manage/subscription/:id?email=` | suppression |
