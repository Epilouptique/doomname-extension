# DoomName — Extension Chrome & Firefox

Contexte permanent du projet. À relire au début de chaque session, et à tenir
à jour à la fin de chaque session qui modifie le comportement ou la structure.

## Règles de travail (Hugo)

- Aucune mention de Claude dans les commits et les descriptions de PR : Hugo est
  le seul auteur.
- **Ne jamais construire de zip / xpi** : Hugo fait le packaging lui-même.
  `build.sh` et `build.ps1` s'arrêtent à `dist/<cible>`.
- Requêtes SQL une par une (son phpMyAdmin n'affiche que la première).
- Économie de token : sessions longues et autonomes, pas d'allers-retours.

## État

**v1.1.0 développée, non publiée.** Dépôt GitHub : à créer
(`Epilouptique/doomname-extension`). Non soumise aux stores.

Testée visuellement, pas encore validée contre l'API de production.

## Principe

Front-end pur : pas de npm, pas de bundler, pas de dépendance. L'extension
consomme l'API publique de doomname.com sans clé API. L'identité utilisateur
est l'e-mail saisi dans les réglages — même logique que `manage.html`, qui
n'exige pas de jeton sur `/api/manage/*`.

| Méthode | Route | Usage |
|---|---|---|
| GET | `/api/check?domain=` | statut WHOIS temps réel |
| POST | `/api/manage/subscribe` | ajout d'une surveillance |
| GET | `/api/manage/subscriptions?email=` | liste (alimente le cache local) |
| PATCH | `/api/manage/subscription/:id/toggle?email=` | pause / reprise |
| DELETE | `/api/manage/subscription/:id?email=` | suppression |

## Fonctionnalités

- Popup : domaine de l'onglet actif + bouton d'action ; recherche instantanée
  pendant la frappe (debounce 350 ms, `AbortController` sur la requête
  précédente).
- Saisie sans TLD (`monsite`) → test parallèle de `.com .fr .net .io .co`.
- État « surveillé » persistant : le bouton affiche `✓ Surveillé` dès
  l'ouverture si le domaine est suivi ; un clic dessus retire la surveillance.
- Coche verte sur l'icône de la barre d'outils quand le domaine de l'onglet
  actif est surveillé.
- Menus contextuels (page, lien, sélection), raccourci `Alt+Maj+D`, option
  « clic sur l'icône = ajout immédiat » (retrait dynamique du popup via
  `action.setPopup`).
- Statuts fins repris du serveur : `available`, `taken`, `gracePeriod`,
  `redemptionPeriod`, `pendingDelete`.
- Réglages : e-mail, options, thème, liste des domaines surveillés avec pause,
  réactivation, suppression.
- Cache local 10 min par domaine, historique local de 8 recherches.

## Structure

```
src/
  manifest.chrome.json     MV3, service_worker
  manifest.firefox.json    MV3, background.scripts + gecko id, min 128.0
  common/   browser.js domain.js api.js storage.js permissions.js watchlist.js
  background/background.js
  popup/    popup.html popup.css popup.js
  options/  options.html options.css options.js
assets/   doomname-logo.svg  doomname-icon.svg      sources vectorielles
icons/    icon-{16,32,48,128,256,512}.png  doomname-logo.svg
build/    build.sh  build.ps1  make-icons.py  test-domain.mjs
docs/     store-listing.md  PRIVACY.md
```

## Commandes

```powershell
.\build\build.ps1              # assemble dist\chrome et dist\firefox
node build\test-domain.mjs     # 16 tests sur la normalisation des domaines
python build\make-icons.py     # réexporte les PNG depuis assets\doomname-icon.svg
```

Chargement en développement :
- Chrome — `chrome://extensions` → Mode développeur → Charger l'extension non
  empaquetée → `dist\chrome`
- Firefox — `about:debugging#/runtime/this-firefox` → Charger un module
  temporaire → `dist\firefox\manifest.json`

## Pièges connus

- **Deux manifestes.** Chrome MV3 veut `background.service_worker`, Firefox
  veut `background.scripts`. Un manifeste unique casse l'un ou l'autre, d'où le
  script d'assemblage.
- **Firefox 128 minimum** : `background.type: "module"` n'est pas supporté
  avant.
- **host_permissions optionnelles sous Firefox MV3** : `common/permissions.js`
  détecte le cas, la page de réglages affiche un bouton « Autoriser l'accès ».
- **Pas de polyfill** : `chrome.*` renvoie des promesses en MV3, `browser.*`
  aussi. Ne pas ajouter `webextension-polyfill`.
- **`common/watchlist.js`** garde une copie locale des surveillances (TTL
  5 min, alarme de rafraîchissement toutes les 15 min). Sans ce cache, chaque
  changement d'onglet déclencherait un appel API juste pour savoir si le
  domaine est suivi.
- **`domain.js`** réduit un hôte à son domaine enregistrable avec une courte
  liste de suffixes à deux niveaux (co.uk, com.au…) plutôt que d'embarquer la
  Public Suffix List complète. Toute modification doit garder les 16 tests au
  vert.
- **SVG du viseur** : le fond avait un `x="-1.7524332"` qui laissait un liseré
  transparent à droite ; corrigé à `x="0"` dans `assets/doomname-icon.svg`.

## Reste à faire

1. Créer le dépôt GitHub et pousser.
2. Test réel contre l'API de production.
3. **Vérifier le CORS** : si les appels depuis le popup échouent alors que le
   site répond, autoriser les origines `chrome-extension://` et
   `moz-extension://` côté `server.js` du dépôt `doomname-web`.
4. Captures 1280×800 pour les stores, puis soumission Chrome Web Store (5 $) et
   addons.mozilla.org (gratuit).
5. Textes de publication et politique de confidentialité : prêts dans `docs/`.
