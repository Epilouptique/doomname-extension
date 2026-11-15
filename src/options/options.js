import { ext } from '../common/browser.js';
import { getSettings, setSettings, clearCache, clearHistory } from '../common/storage.js';
import { hasHostAccess, requestHostAccess } from '../common/permissions.js';
import { listSubscriptions, deleteSubscription, toggleSubscription, ApiError } from '../common/api.js';

const $ = (id) => document.getElementById(id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let settings = null;

function applyTheme(theme) {
  const dark = theme === 'dark'
    || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function flash(node, text, kind = 'ok') {
  node.textContent = text;
  node.className = `msg ${kind}`;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => { node.textContent = ''; node.className = 'msg'; }, 3500);
}

/* ─── Surveillances ───────────────────────────────────────────────────────── */

const STATUS_LABEL = {
  available: ['available', 'Disponible'],
  taken: ['taken', 'Pris'],
  gracePeriod: ['grace', 'Période de grâce'],
  redemptionPeriod: ['grace', 'Rachat possible'],
  pendingDelete: ['grace', 'Suppression en cours'],
};

function subItem(sub) {
  const [cls, label] = STATUS_LABEL[sub.last_status] || ['taken', 'Statut inconnu'];
  const item = document.createElement('div');
  item.className = `sub-item ${sub.active ? cls : 'off'}`;

  const main = document.createElement('div');
  main.className = 'sub-main';
  const dom = document.createElement('div');
  dom.className = 'sub-domain';
  dom.textContent = sub.domain;
  const meta = document.createElement('div');
  meta.className = 'sub-meta';
  const since = sub.created_at ? new Date(sub.created_at).toLocaleDateString('fr-FR') : null;
  meta.textContent = `${sub.active ? label : 'Surveillance en pause'}${since ? ` · depuis le ${since}` : ''}`;
  main.append(dom, meta);

  const actions = document.createElement('div');
  actions.className = 'sub-actions';

  const toggle = document.createElement('button');
  toggle.className = 'btn btn-ghost btn-sm';
  toggle.textContent = sub.active ? 'Mettre en pause' : 'Réactiver';
  toggle.addEventListener('click', async () => {
    toggle.disabled = true;
    try {
      await toggleSubscription(sub.id, settings.email);
      ext.runtime.sendMessage({ type: 'refresh-badge' }).catch(() => {});
      await loadSubs();
    } catch (err) {
      toggle.disabled = false;
      flash($('maint-msg'), err instanceof ApiError ? err.message : 'Erreur', 'err');
    }
  });

  const del = document.createElement('button');
  del.className = 'btn btn-danger btn-sm';
  del.textContent = 'Supprimer';
  del.addEventListener('click', async () => {
    del.disabled = true;
    try {
      await deleteSubscription(sub.id, settings.email);
      ext.runtime.sendMessage({ type: 'refresh-badge' }).catch(() => {});
      item.remove();
    } catch (err) {
      del.disabled = false;
      flash($('maint-msg'), err instanceof ApiError ? err.message : 'Erreur', 'err');
    }
  });

  actions.append(toggle, del);
  item.append(main, actions);
  return item;
}

async function loadSubs() {
  const box = $('subs');
  if (!settings.email) {
    box.innerHTML = '<p class="desc">Renseignez votre e-mail pour afficher vos surveillances.</p>';
    return;
  }
  box.innerHTML = '<p class="desc">Chargement…</p>';
  try {
    const subs = await listSubscriptions(settings.email);
    box.replaceChildren();
    if (!subs.length) {
      box.innerHTML = '<p class="desc">Aucun domaine surveillé pour le moment.</p>';
      return;
    }
    subs.forEach((s) => box.appendChild(subItem(s)));
  } catch (err) {
    box.replaceChildren();
    const p = document.createElement('p');
    p.className = 'desc';
    p.textContent = err instanceof ApiError ? err.message : 'Impossible de charger la liste.';
    box.appendChild(p);
  }
}

/* ─── Initialisation ──────────────────────────────────────────────────────── */

async function init() {
  settings = await getSettings();
  applyTheme(settings.theme);

  $('email').value = settings.email;
  $('auto-watch').checked = settings.autoWatchOnClick;
  $('notify').checked = settings.notifyOnWatch;
  $('theme').value = settings.theme;
  $('version').textContent = `v${ext.runtime.getManifest().version}`;

  $('save-email').addEventListener('click', async () => {
    const email = $('email').value.trim().toLowerCase();
    if (email && !EMAIL_RE.test(email)) {
      flash($('email-msg'), 'Adresse e-mail invalide.', 'err');
      return;
    }
    settings = await setSettings({ email });
    flash($('email-msg'), email ? 'E-mail enregistré.' : 'E-mail effacé.');
    await loadSubs();
  });

  $('email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('save-email').click();
  });

  $('auto-watch').addEventListener('change', async (e) => {
    settings = await setSettings({ autoWatchOnClick: e.target.checked });
    ext.runtime.sendMessage({ type: 'refresh-action-behaviour' }).catch(() => {});
  });

  $('notify').addEventListener('change', async (e) => {
    settings = await setSettings({ notifyOnWatch: e.target.checked });
  });

  $('theme').addEventListener('change', async (e) => {
    settings = await setSettings({ theme: e.target.value });
    applyTheme(settings.theme);
  });

  $('reload-subs').addEventListener('click', loadSubs);

  if (!(await hasHostAccess())) $('perm-card').classList.remove('hidden');
  $('grant-perm').addEventListener('click', async () => {
    if (await requestHostAccess()) {
      $('perm-card').classList.add('hidden');
      await loadSubs();
    }
  });

  $('clear-cache').addEventListener('click', async () => {
    await clearCache();
    flash($('maint-msg'), 'Cache vidé.');
  });

  $('clear-history').addEventListener('click', async () => {
    await clearHistory();
    flash($('maint-msg'), 'Historique effacé.');
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(settings.theme));

  await loadSubs();
}

init();
