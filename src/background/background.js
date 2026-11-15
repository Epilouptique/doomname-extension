import { ext, hasNotifications } from '../common/browser.js';
import { checkDomain, subscribe, ApiError } from '../common/api.js';
import { getSettings } from '../common/storage.js';
import { getWatchList, getCachedWatchList, rememberWatched } from '../common/watchlist.js';
import { domainFromUrl, normalizeDomain, isValidDomain } from '../common/domain.js';

const MENU_WATCH_PAGE = 'doomname-watch-page';
const MENU_WATCH_LINK = 'doomname-watch-link';
const MENU_CHECK_SELECTION = 'doomname-check-selection';

/* ─── Menus contextuels ────────────────────────────────────────────────────── */

function buildMenus() {
  ext.contextMenus.removeAll(() => {
    ext.contextMenus.create({
      id: MENU_WATCH_PAGE,
      title: 'Surveiller ce domaine avec DoomName',
      contexts: ['page'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });
    ext.contextMenus.create({
      id: MENU_WATCH_LINK,
      title: 'Surveiller le domaine de ce lien',
      contexts: ['link'],
      targetUrlPatterns: ['http://*/*', 'https://*/*'],
    });
    ext.contextMenus.create({
      id: MENU_CHECK_SELECTION,
      title: 'Vérifier « %s » sur DoomName',
      contexts: ['selection'],
    });
  });
}

ext.runtime.onInstalled.addListener(async (details) => {
  buildMenus();
  await applyActionBehaviour();
  await updateBadgeForActiveTab();
  // Première installation : on ouvre les réglages pour saisir l'e-mail d'alerte.
  if (details.reason === 'install') {
    ext.runtime.openOptionsPage?.();
  }
});

ext.runtime.onStartup?.addListener(async () => {
  buildMenus();
  await applyActionBehaviour();
  await getWatchList({ force: true });
  await updateBadgeForActiveTab();
});

ext.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_WATCH_PAGE) {
    await watchDomain(domainFromUrl(info.pageUrl || tab?.url), tab?.id);
  } else if (info.menuItemId === MENU_WATCH_LINK) {
    await watchDomain(domainFromUrl(info.linkUrl), tab?.id);
  } else if (info.menuItemId === MENU_CHECK_SELECTION) {
    await checkAndNotify(info.selectionText);
  }
});

/* ─── Raccourci clavier ────────────────────────────────────────────────────── */

ext.commands?.onCommand.addListener(async (command) => {
  if (command !== 'watch-current-domain') return;
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  await watchDomain(domainFromUrl(tab?.url), tab?.id);
});

/* ─── Clic sur l'icône en mode « ajout direct » ────────────────────────────── */

/** Retire ou rétablit le popup selon le réglage autoWatchOnClick. */
async function applyActionBehaviour() {
  const { autoWatchOnClick } = await getSettings();
  try {
    await ext.action.setPopup({ popup: autoWatchOnClick ? '' : 'popup/popup.html' });
  } catch { /* API indisponible : le popup par défaut du manifeste reste actif */ }
}

ext.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.autoWatchOnClick) applyActionBehaviour();
});

ext.action.onClicked.addListener(async (tab) => {
  // Déclenché uniquement quand le popup a été retiré (mode ajout direct).
  await watchDomain(domainFromUrl(tab?.url), tab?.id);
});

/* ─── Ajout d'une surveillance ─────────────────────────────────────────────── */

/**
 * Vérifie puis enregistre un domaine, avec retour visuel (badge + notification).
 * @returns {Promise<{ok:boolean, domain?:string, available?:boolean, error?:string}>}
 */
export async function watchDomain(domain, tabId) {
  if (!domain) {
    await flashBadge('!', '#ba7517');
    notify('Domaine introuvable', "Cette page n'a pas de nom de domaine exploitable.");
    return { ok: false, error: 'Domaine introuvable' };
  }

  const { email, notifyOnWatch } = await getSettings();
  if (!email) {
    notify('E-mail requis', 'Renseignez votre e-mail dans les réglages pour recevoir les alertes.');
    ext.runtime.openOptionsPage?.();
    return { ok: false, error: 'E-mail non configuré' };
  }

  await flashBadge('…', '#d97757', false);

  try {
    const check = await checkDomain(domain).catch(() => null);
    await subscribe(domain, email);
    await rememberWatched(domain);
    getWatchList({ force: true }).then(() => updateBadgeForActiveTab());
    await flashBadge('✓', '#1d9e75');

    if (notifyOnWatch) {
      const state = check?.available
        ? 'Il est disponible : vous serez prévenu s’il est pris puis relibéré.'
        : 'Vous serez alerté par e-mail dès qu’il se libère.';
      notify(`${domain} est surveillé`, state);
    }
    return { ok: true, domain, available: check?.available ?? null };
  } catch (err) {
    await flashBadge('✕', '#e24b4a');
    const message = err instanceof ApiError ? err.message : 'Erreur inattendue';
    notify('Échec de l’ajout', message);
    return { ok: false, domain, error: message };
  }
}

/**
 * Vérifie un domaine issu d'une sélection de texte et annonce le résultat.
 * N'enregistre aucune surveillance : c'est une simple consultation.
 */
async function checkAndNotify(selection) {
  const domain = normalizeDomain(selection || '');
  if (!isValidDomain(domain)) {
    notify('Sélection invalide', "Sélectionnez un nom de domaine complet, par exemple exemple.com.");
    return;
  }

  await flashBadge('…', '#d97757', false);
  try {
    const { available, status, expiry } = await checkDomain(domain);
    await flashBadge(available ? '✓' : '✕', available ? '#1d9e75' : '#e24b4a');
    const detail = available
      ? 'Ce domaine est libre.'
      : status && status !== 'taken'
        ? 'Bientôt libéré — ouvrez DoomName pour le surveiller.'
        : expiry ? `Déjà pris — expire le ${expiry}.` : 'Déjà pris.';
    notify(domain, detail);
  } catch (err) {
    await flashBadge('!', '#ba7517');
    notify('Vérification impossible', err instanceof ApiError ? err.message : 'Erreur inattendue');
  }
}

/* ─── Indicateur « domaine surveillé » sur l'icône ─────────────────────────── */

const WATCHED_BADGE = '✓';
const WATCHED_COLOR = '#1d9e75';

/**
 * Affiche une coche verte sur l'icône quand le domaine de l'onglet actif est
 * déjà sous surveillance, et efface le badge sinon.
 */
async function updateBadgeForActiveTab() {
  try {
    const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
    const domain = domainFromUrl(tab?.url);
    if (!domain) return setBadge('');

    const map = await getCachedWatchList();
    const watched = Boolean(map[domain]?.active);

    await setBadge(watched ? WATCHED_BADGE : '', WATCHED_COLOR);
    await ext.action.setTitle({
      title: watched ? `DoomName — ${domain} est surveillé` : 'DoomName',
    });
  } catch { /* onglet fermé entre-temps */ }
}

async function setBadge(text, color) {
  try {
    await ext.action.setBadgeText({ text });
    if (text && color) await ext.action.setBadgeBackgroundColor({ color });
  } catch { /* API indisponible */ }
}

ext.tabs.onActivated.addListener(() => updateBadgeForActiveTab());
ext.tabs.onUpdated.addListener((_id, changeInfo, tab) => {
  if (tab.active && (changeInfo.url || changeInfo.status === 'complete')) {
    updateBadgeForActiveTab();
  }
});

/* Rafraîchissement périodique de la liste de surveillance (l'utilisateur peut
   l'avoir modifiée depuis le site ou l'application mobile). */
const REFRESH_ALARM = 'doomname-watchlist-refresh';

ext.alarms?.create(REFRESH_ALARM, { periodInMinutes: 15 });
ext.alarms?.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== REFRESH_ALARM) return;
  await getWatchList({ force: true });
  await updateBadgeForActiveTab();
});

/* ─── Retours visuels ──────────────────────────────────────────────────────── */

let badgeTimer = null;

async function flashBadge(text, color, autoClear = true) {
  try {
    await ext.action.setBadgeText({ text });
    await ext.action.setBadgeBackgroundColor({ color });
  } catch { return; }

  clearTimeout(badgeTimer);
  if (autoClear) {
    badgeTimer = setTimeout(() => updateBadgeForActiveTab(), 2500);
  }
}

function notify(title, message) {
  if (!hasNotifications) return;
  ext.notifications.create({
    type: 'basic',
    iconUrl: ext.runtime.getURL('icons/icon-128.png'),
    title,
    message,
  });
}

/* ─── Messages depuis le popup / les options ───────────────────────────────── */

ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'watch-domain') {
    watchDomain(msg.domain).then(sendResponse);
    return true; // réponse asynchrone
  }
  if (msg?.type === 'refresh-badge') {
    getWatchList({ force: true })
      .then(updateBadgeForActiveTab)
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === 'refresh-action-behaviour') {
    applyActionBehaviour().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
