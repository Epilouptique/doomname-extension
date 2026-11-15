import { ext } from './browser.js';
import { listSubscriptions } from './api.js';
import { getEmail } from './storage.js';

/* Copie locale des surveillances de l'utilisateur, pour savoir instantanément
   si le domaine d'un onglet est déjà suivi — sans appel réseau à chaque
   changement d'onglet. Rafraîchie à l'ouverture du popup, après chaque
   ajout/retrait, et périodiquement par une alarme. */

const KEY = 'watchlist';
const TTL_MS = 5 * 60 * 1000;

/** @returns {Promise<{map: Record<string,{id:number, active:boolean}>, at:number, email:string}>} */
async function readCache() {
  const { [KEY]: cache } = await ext.storage.local.get(KEY);
  return cache || { map: {}, at: 0, email: '' };
}

async function writeCache(cache) {
  await ext.storage.local.set({ [KEY]: cache });
}

/**
 * Renvoie la table domaine -> surveillance. Rafraîchit depuis l'API si le
 * cache est périmé, vide, ou si l'e-mail a changé.
 */
export async function getWatchList({ force = false } = {}) {
  const email = await getEmail();
  if (!email) {
    await writeCache({ map: {}, at: Date.now(), email: '' });
    return {};
  }

  const cache = await readCache();
  const stale = force
    || cache.email !== email
    || Date.now() - cache.at > TTL_MS
    || !cache.at;

  if (!stale) return cache.map;

  try {
    const subs = await listSubscriptions(email);
    const map = {};
    for (const s of subs) map[s.domain] = { id: s.id, active: Boolean(s.active) };
    await writeCache({ map, at: Date.now(), email });
    return map;
  } catch {
    return cache.map; // hors ligne : on garde la dernière vue connue
  }
}

/** Lecture sans réseau : uniquement ce qui est déjà en cache. */
export async function getCachedWatchList() {
  const email = await getEmail();
  const cache = await readCache();
  return cache.email === email ? cache.map : {};
}

export async function isWatched(domain) {
  const map = await getCachedWatchList();
  return Boolean(map[domain]?.active);
}

/** Met à jour le cache après un ajout, sans attendre le prochain rafraîchissement. */
export async function rememberWatched(domain, entry = { id: null, active: true }) {
  const cache = await readCache();
  cache.map = { ...cache.map, [domain]: entry };
  cache.email = await getEmail();
  await writeCache(cache);
}

/** Met à jour le cache après un retrait. */
export async function forgetWatched(domain) {
  const cache = await readCache();
  if (cache.map?.[domain]) {
    delete cache.map[domain];
    await writeCache(cache);
  }
}
