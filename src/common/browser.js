/* Abstraction minimale Chrome / Firefox.
   chrome.* renvoie des promesses depuis Chrome 88 (MV3) et Firefox expose
   browser.* en promesses : aucune dépendance externe n'est nécessaire. */
export const ext = globalThis.browser ?? globalThis.chrome;

/** True si l'API notifications est utilisable (absente sur certains builds). */
export const hasNotifications = Boolean(ext?.notifications?.create);
