/* Normalisation et validation des noms de domaine — règles identiques à
   celles du serveur DoomName (server.js) pour éviter tout aller-retour inutile. */

export const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/;

/** TLD testés automatiquement quand l'utilisateur saisit un nom sans extension. */
export const SUGGESTED_TLDS = ['com', 'fr', 'net', 'io', 'co'];

/**
 * Nettoie une saisie libre (URL complète, www., chemin, port, casse…)
 * et renvoie le nom de domaine enregistrable.
 */
export function normalizeDomain(input) {
  if (!input) return '';
  let d = String(input).trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // schéma
  d = d.replace(/^[^@/]*@/, '');                // identifiants éventuels
  d = d.split(/[/?#]/)[0];                      // chemin, query, ancre
  d = d.split(':')[0];                          // port
  d = d.replace(/\.+$/, '');                    // point final (FQDN absolu)
  d = d.replace(/^www\./, '');
  return d;
}

export function isValidDomain(d) {
  return DOMAIN_RE.test(d);
}

/** True si la saisie ne contient pas encore d'extension (« monsite »). */
export function isBareLabel(d) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(d);
}

/* Suffixes publics à deux niveaux les plus courants. Liste volontairement
   courte : elle couvre l'essentiel du trafic sans embarquer la Public Suffix
   List complète (plusieurs centaines de Ko) dans l'extension. */
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'me.uk', 'ac.uk', 'gov.uk', 'net.uk', 'sch.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'net.nz', 'org.nz',
  'co.za', 'org.za', 'net.za',
  'com.br', 'net.br', 'org.br',
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn',
  'co.in', 'net.in', 'org.in',
  'com.mx', 'com.ar', 'com.tr', 'com.sg', 'com.hk', 'com.tw', 'com.pl',
  'co.il', 'co.kr', 'co.id', 'co.th',
  'gouv.fr', 'asso.fr', 'tm.fr', 'com.es', 'com.pt', 'com.ua', 'com.ru',
]);

/**
 * Réduit un hôte à son domaine enregistrable :
 * « docs.google.com » -> « google.com », « blog.exemple.co.uk » -> « exemple.co.uk ».
 */
export function registrableDomain(host) {
  const parts = normalizeDomain(host).split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  const keep = MULTI_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  return parts.slice(-keep).join('.');
}

/**
 * Extrait le domaine enregistrable d'une URL d'onglet.
 * Renvoie null pour les pages internes (chrome://, about:, file://…).
 */
export function domainFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = registrableDomain(u.hostname);
    return isValidDomain(host) ? host : null;
  } catch {
    return null;
  }
}
