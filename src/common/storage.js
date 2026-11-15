import { ext } from './browser.js';

/* Réglages persistés dans chrome.storage.sync (suivent le profil navigateur)
   et cache de vérifications dans storage.local (volumineux, non synchronisé). */

const DEFAULTS = {
  email: '',
  autoWatchOnClick: false, // clic sur l'icône = surveiller directement, sans popup
  notifyOnWatch: true,     // notification système après un ajout
  theme: 'auto',           // 'auto' | 'light' | 'dark'
};

export async function getSettings() {
  const stored = await ext.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

export async function setSettings(patch) {
  await ext.storage.sync.set(patch);
  return getSettings();
}

export async function getEmail() {
  return (await getSettings()).email;
}

/* ─── Cache des vérifications WHOIS ────────────────────────────────────────── */

const CACHE_KEY = 'checkCache';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min : le serveur met déjà en cache
const CACHE_MAX_ENTRIES = 300;

export async function getCached(domain) {
  const { [CACHE_KEY]: cache = {} } = await ext.storage.local.get(CACHE_KEY);
  const entry = cache[domain];
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) return null;
  return entry.result;
}

export async function setCached(domain, result) {
  const { [CACHE_KEY]: cache = {} } = await ext.storage.local.get(CACHE_KEY);
  cache[domain] = { at: Date.now(), result };

  const keys = Object.keys(cache);
  if (keys.length > CACHE_MAX_ENTRIES) {
    keys
      .sort((a, b) => cache[a].at - cache[b].at)
      .slice(0, keys.length - CACHE_MAX_ENTRIES)
      .forEach((k) => delete cache[k]);
  }
  await ext.storage.local.set({ [CACHE_KEY]: cache });
}

export async function clearCache() {
  await ext.storage.local.remove(CACHE_KEY);
}

/* ─── Historique local des recherches ──────────────────────────────────────── */

const HISTORY_KEY = 'history';
const HISTORY_MAX = 8;

export async function getHistory() {
  const { [HISTORY_KEY]: h = [] } = await ext.storage.local.get(HISTORY_KEY);
  return h;
}

export async function pushHistory(domain) {
  const h = await getHistory();
  const next = [domain, ...h.filter((d) => d !== domain)].slice(0, HISTORY_MAX);
  await ext.storage.local.set({ [HISTORY_KEY]: next });
  return next;
}

export async function clearHistory() {
  await ext.storage.local.remove(HISTORY_KEY);
}
