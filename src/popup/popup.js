import { ext } from '../common/browser.js';
import { checkDomain, subscribe, deleteSubscription, API_BASE, ApiError } from '../common/api.js';
import { getSettings, getHistory, pushHistory, clearHistory } from '../common/storage.js';
import { getWatchList, rememberWatched, forgetWatched } from '../common/watchlist.js';
import { hasHostAccess } from '../common/permissions.js';
import {
  normalizeDomain, isValidDomain, isBareLabel, domainFromUrl, SUGGESTED_TLDS,
} from '../common/domain.js';

const DEBOUNCE_MS = 350;

const $ = (id) => document.getElementById(id);
const el = {
  banner: $('setup-banner'), setupLink: $('setup-link'),
  options: $('open-options'),
  current: $('current-card'), currentDomain: $('current-domain'), currentWatch: $('current-watch'),
  input: $('search-input'), clear: $('search-clear'), spinner: $('search-spinner'),
  hint: $('search-hint'), results: $('results'),
  history: $('history-section'), historyList: $('history-list'), historyClear: $('history-clear'),
  manage: $('link-manage'), site: $('link-site'),
};

let settings = null;
let watchList = {};     // domaine -> { id, active }
let inflight = null;    // AbortController de la recherche en cours
let debounce = null;
let lastQuery = '';

/* ─── Thème ───────────────────────────────────────────────────────────────── */

function applyTheme(theme) {
  const dark = theme === 'dark'
    || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/* ─── Statuts ─────────────────────────────────────────────────────────────── */

const STATUS = {
  available:        { cls: 'available', dot: 'dot-green' },
  taken:            { cls: 'taken',     dot: 'dot-red' },
  gracePeriod:      { cls: 'grace',     dot: 'dot-amber', label: 'Période de grâce' },
  redemptionPeriod: { cls: 'grace',     dot: 'dot-amber', label: 'Rachat possible' },
  pendingDelete:    { cls: 'grace',     dot: 'dot-amber', label: 'Suppression en cours' },
};

const statusOf = (r) => STATUS[r.status] || (r.available ? STATUS.available : STATUS.taken);

function subtitle(result) {
  const s = statusOf(result);
  if (result.available) return { text: 'Libre — enregistrable maintenant', cls: 'ok' };
  if (s.cls === 'grace') return { text: `${s.label} — bientôt libéré`, cls: 'warn' };
  return { text: result.expiry ? `Pris — expire le ${result.expiry}` : 'Déjà enregistré', cls: 'ko' };
}

/* ─── Bouton de surveillance ──────────────────────────────────────────────── */

const isWatchedNow = (domain) => Boolean(watchList[domain]?.active);

/**
 * Applique l'état visuel du bouton d'après la liste de surveillance.
 * Surveillé  -> bouton « ✓ Surveillé », un clic retire la surveillance.
 * Non suivi  -> « Surveiller » (libre) ou « M'alerter » (pris).
 */
function paintWatchButton(btn, domain, result) {
  btn.disabled = false;
  if (isWatchedNow(domain)) {
    btn.className = 'btn btn-sm btn-done';
    btn.textContent = '✓ Surveillé';
    btn.title = 'Cliquer pour retirer de la surveillance';
  } else {
    const available = result?.available;
    btn.className = 'btn btn-sm ' + (available ? 'btn-ghost' : 'btn-primary');
    btn.textContent = available ? 'Surveiller' : "M'alerter";
    btn.title = 'Être alerté dès que ce domaine change de statut';
  }
}

/** Branche le bouton : ajout si non suivi, retrait si déjà suivi. */
function bindWatchButton(btn, domain, result) {
  paintWatchButton(btn, domain, result);
  btn.onclick = () => (isWatchedNow(domain)
    ? unwatch(domain, btn, result)
    : watch(domain, btn, result));
}

async function watch(domain, btn, result) {
  if (!settings.email) {
    el.banner.classList.remove('hidden');
    ext.runtime.openOptionsPage?.();
    return;
  }
  btn.disabled = true;
  btn.textContent = '…';
  try {
    await subscribe(domain, settings.email);
    await rememberWatched(domain);
    watchList = await getWatchList({ force: true }); // récupère l'identifiant
    paintWatchButton(btn, domain, result);
    refreshBadge();
  } catch (err) {
    paintWatchButton(btn, domain, result);
    setHint(err instanceof ApiError ? err.message : "Échec de l'ajout.", true);
  }
}

async function unwatch(domain, btn, result) {
  btn.disabled = true;
  btn.textContent = '…';
  try {
    let id = watchList[domain]?.id;
    if (!id) {
      watchList = await getWatchList({ force: true });
      id = watchList[domain]?.id;
    }
    if (!id) throw new ApiError('Surveillance introuvable.', 404);

    await deleteSubscription(id, settings.email);
    await forgetWatched(domain);
    delete watchList[domain];
    paintWatchButton(btn, domain, result);
    setHint('');
    refreshBadge();
  } catch (err) {
    paintWatchButton(btn, domain, result);
    setHint(err instanceof ApiError ? err.message : 'Échec du retrait.', true);
  }
}

function refreshBadge() {
  ext.runtime.sendMessage({ type: 'refresh-badge' }).catch(() => {});
}

/* ─── Rendu des résultats ─────────────────────────────────────────────────── */

/* Construction DOM sans innerHTML : les analyseurs des stores signalent toute
   affectation à innerHTML, même avec un contenu statique. */
function el_(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function resultRow(cls, dotCls, domain, subText, subCls) {
  const row = el_('div', `result ${cls}`);
  const main = el_('div', 'result-main');
  main.append(
    el_('div', 'result-domain', domain),
    el_('div', `result-sub${subCls ? ' ' + subCls : ''}`, subText),
  );
  row.append(el_('span', `dot ${dotCls}`), main);
  return row;
}

function renderResult(domain, result) {
  const s = statusOf(result);
  const sub = subtitle(result);
  const row = resultRow(s.cls, s.dot, domain, sub.text, sub.cls);

  const btn = document.createElement('button');
  bindWatchButton(btn, domain, result);
  row.appendChild(btn);
  return row;
}

function renderPending(domain) {
  return resultRow('pending', 'dot-grey', domain, 'Vérification…');
}

function renderError(domain, message) {
  return resultRow('error', 'dot-amber', domain, message, 'warn');
}

/* ─── Recherche ───────────────────────────────────────────────────────────── */

function setBusy(busy) {
  el.spinner.classList.toggle('hidden', !busy);
  el.clear.classList.toggle('hidden', busy || !el.input.value);
}

function setHint(text, isError = false) {
  el.hint.textContent = text;
  el.hint.classList.toggle('error', isError);
  el.hint.classList.toggle('hidden', !text);
}

async function runSearch(raw) {
  const value = normalizeDomain(raw);

  inflight?.abort();
  el.results.replaceChildren();
  setHint('');

  if (!value) {
    setBusy(false);
    el.history.classList.toggle('hidden', !el.historyList.children.length);
    return;
  }

  el.history.classList.add('hidden');

  // Saisie sans extension : on teste les TLD les plus courants.
  const targets = isValidDomain(value)
    ? [value]
    : isBareLabel(value)
      ? SUGGESTED_TLDS.map((t) => `${value}.${t}`)
      : null;

  if (!targets) {
    setBusy(false);
    setHint('Nom de domaine invalide (ex. exemple.com).', true);
    return;
  }

  setBusy(true);
  const ctrl = new AbortController();
  inflight = ctrl;

  const rows = targets.map((d) => {
    const row = renderPending(d);
    el.results.appendChild(row);
    return row;
  });

  await Promise.all(targets.map(async (domain, i) => {
    try {
      const result = await checkDomain(domain, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      rows[i].replaceWith(renderResult(domain, result));
    } catch (err) {
      if (ctrl.signal.aborted || err.name === 'AbortError') return;
      rows[i].replaceWith(renderError(domain, err instanceof ApiError ? err.message : 'Erreur'));
    }
  }));

  if (ctrl.signal.aborted) return;
  inflight = null;
  setBusy(false);
  if (isValidDomain(value)) await pushHistory(value);
}

function scheduleSearch() {
  const raw = el.input.value;
  el.clear.classList.toggle('hidden', !raw);
  clearTimeout(debounce);

  const value = normalizeDomain(raw);
  if (value === lastQuery) return;
  lastQuery = value;

  debounce = setTimeout(() => runSearch(raw), DEBOUNCE_MS);
}

function resetSearch() {
  el.input.value = '';
  lastQuery = '';
  inflight?.abort();
  el.results.replaceChildren();
  el.clear.classList.add('hidden');
  setBusy(false);
  setHint('');
  loadHistory();
  el.input.focus();
}

/* ─── Onglet actif ────────────────────────────────────────────────────────── */

async function loadCurrentTab() {
  let tab;
  try {
    [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  } catch { return; }

  const domain = domainFromUrl(tab?.url);
  if (!domain) return;

  el.currentDomain.textContent = domain;
  el.current.classList.remove('hidden');
  bindWatchButton(el.currentWatch, domain, null);

  try {
    const result = await checkDomain(domain);
    bindWatchButton(el.currentWatch, domain, result);
  } catch { /* statut inconnu : le bouton reste utilisable */ }
}

/* ─── Historique ──────────────────────────────────────────────────────────── */

async function loadHistory() {
  const history = await getHistory();
  el.historyList.replaceChildren();
  if (!history.length) { el.history.classList.add('hidden'); return; }

  for (const domain of history) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = domain;
    chip.addEventListener('click', () => {
      el.input.value = domain;
      el.input.focus();
      lastQuery = '';
      scheduleSearch();
    });
    el.historyList.appendChild(chip);
  }
  el.history.classList.remove('hidden');
}

/* ─── Initialisation ──────────────────────────────────────────────────────── */

async function init() {
  settings = await getSettings();
  applyTheme(settings.theme);
  setHint('');

  if (!(await hasHostAccess())) {
    el.banner.querySelector('span').textContent = "Autorisez l'accès à doomname.com pour lancer les vérifications.";
    el.banner.classList.remove('hidden');
  } else if (!settings.email) {
    el.banner.classList.remove('hidden');
  }

  el.manage.href = `${API_BASE}/manage.html`;
  el.site.href = API_BASE;
  for (const link of [el.manage, el.site]) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      ext.tabs.create({ url: link.href });
      window.close();
    });
  }

  const openOptions = () => { ext.runtime.openOptionsPage?.(); window.close(); };
  el.options.addEventListener('click', openOptions);
  el.setupLink.addEventListener('click', openOptions);

  el.input.addEventListener('input', scheduleSearch);
  el.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { clearTimeout(debounce); lastQuery = ''; runSearch(el.input.value); }
    if (e.key === 'Escape' && el.input.value) { e.preventDefault(); resetSearch(); }
  });
  el.clear.addEventListener('click', resetSearch);

  el.historyClear.addEventListener('click', async () => {
    await clearHistory();
    await loadHistory();
  });

  el.input.focus();

  // La liste de surveillance conditionne l'état des boutons : on la charge d'abord.
  watchList = await getWatchList();
  await Promise.all([loadCurrentTab(), loadHistory()]);
}

init();
