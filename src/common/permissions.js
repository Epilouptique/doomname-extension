import { ext } from './browser.js';

/* Firefox MV3 traite les host_permissions comme optionnelles : l'utilisateur
   doit parfois les accorder explicitement. Chrome les accorde à l'installation.
   Ces helpers permettent d'afficher un bouton d'autorisation si besoin. */

export const HOST = 'https://www.doomname.com/*';

export async function hasHostAccess() {
  try {
    return await ext.permissions.contains({ origins: [HOST] });
  } catch {
    return true; // API absente : on considère l'accès accordé par le manifeste
  }
}

export async function requestHostAccess() {
  try {
    return await ext.permissions.request({ origins: [HOST] });
  } catch {
    return false;
  }
}
