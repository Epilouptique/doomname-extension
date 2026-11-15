import { getCached, setCached } from './storage.js';

export const API_BASE = 'https://www.doomname.com';
const TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  // L'appelant peut annuler (frappe clavier suivante) ; on relaie son signal.
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });

    let data = null;
    try { data = await res.json(); } catch { /* réponse vide ou non JSON */ }

    if (!res.ok) {
      throw new ApiError(data?.error || `Erreur ${res.status}`, res.status);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    if (err instanceof ApiError) throw err;
    throw new ApiError('Serveur injoignable. Vérifiez votre connexion.', 0);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Vérifie la disponibilité d'un domaine.
 * @returns {Promise<{available:boolean, status:string, expiry:string|null, cached:boolean}>}
 */
export async function checkDomain(domain, { signal, useCache = true } = {}) {
  if (useCache) {
    const hit = await getCached(domain);
    if (hit) return { ...hit, cached: true };
  }
  const data = await request(`/api/check?domain=${encodeURIComponent(domain)}`, { signal });
  const result = {
    available: Boolean(data.available),
    status: data.status || (data.available ? 'available' : 'taken'),
    expiry: data.expiry || null,
  };
  await setCached(domain, result);
  return { ...result, cached: false };
}

/** Ajoute une surveillance (alerte e-mail) sur un domaine. */
export function subscribe(domain, email, { signal } = {}) {
  return request('/api/manage/subscribe', {
    method: 'POST',
    body: { domain, email },
    signal,
  });
}

/** Liste les surveillances de l'utilisateur. */
export function listSubscriptions(email, { signal } = {}) {
  return request(`/api/manage/subscriptions?email=${encodeURIComponent(email)}`, { signal });
}

/** Supprime une surveillance. */
export function deleteSubscription(id, email, { signal } = {}) {
  return request(
    `/api/manage/subscription/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`,
    { method: 'DELETE', signal },
  );
}

/** Active / désactive une surveillance. */
export function toggleSubscription(id, email, { signal } = {}) {
  return request(
    `/api/manage/subscription/${encodeURIComponent(id)}/toggle?email=${encodeURIComponent(email)}`,
    { method: 'PATCH', signal },
  );
}
