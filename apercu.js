/* ══════════ Aperçu du site OA Convoyage ══════════
   1. Depuis le 29/10, une seule version : la nouvelle, validée par Océane (l'ancienne n'est plus publiée ;
      une adresse « #ancienne/… » ouvre la même page dans la nouvelle version).
   2. Ordinateur ou mobile.
   3. Les remarques passent par l'outil FlowDesk (remarques.js), chargé dans chaque page du site (voir build_apercu.py).
      Les anciennes remarques gardées sur l'appareil (mode Remarques d'avant le 28/10) restent envoyables par email.
   Le site est dans une iframe de même origine : l'aperçu lit sa page et son défilement. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const DEST = 'guenole@hws.pm';
const LIEN = 'https://guenole.github.io/oa-convoyage-apercu/';
const CLE_ETAT = 'oa-apercu-etat', CLE = 'oa-remarques-v2', CLE_NOM = 'oa-remarques-nom', CLE_VU = 'oa-remarques-v2-bandeau-ferme';
const VERSIONS = { ancienne: 'Ancienne version', nouvelle: 'Nouvelle version', premier: 'Premier aperçu' };
const APPAREILS = { ordinateur: 'ordinateur', mobile: 'mobile' };
const NOMS = { accueil: 'Accueil', professionnels: 'Professionnels', particuliers: 'Particuliers', 'a-propos': 'À propos', contact: 'Contact', convoyages: 'Convoyages' };
const frame = $('#ap-site'), scene = $('.ap-scene');
const telephone = () => matchMedia('(max-width: 767px)').matches;

/* ---------- état : version, page, affichage (dans l'adresse, et retenu sur l'appareil) ---------- */
let etat = { version: 'nouvelle', page: 'accueil', appareil: 'ordinateur' };
try { Object.assign(etat, JSON.parse(localStorage.getItem(CLE_ETAT) || '{}')); } catch (e) {}
etat.version = 'nouvelle';
(() => {
  const [v, p, a] = decodeURIComponent(location.hash.slice(1)).split('/');
  if (p && /^[\w-]+$/.test(p)) etat.page = p;
  if (APPAREILS[a]) etat.appareil = a;
})();
const appareil = () => telephone() ? 'mobile' : etat.appareil;
const sauver = () => {
  try { localStorage.setItem(CLE_ETAT, JSON.stringify(etat)); } catch (e) {}
  history.replaceState(null, '', '#' + [etat.version, etat.page, etat.appareil].join('/'));
};
const urlDe = (version, page) => version === 'ancienne' ? 'ancienne/index.html#' + page : 'nouvelle/' + page + '.html';

function majInterface() {
  $$('[data-appareil]').forEach(b => b.setAttribute('aria-pressed', b.dataset.appareil === etat.appareil));
  scene.dataset.appareil = etat.appareil;
  const sel = $('#ap-page');
  sel.value = /^convoyage-/.test(etat.page) ? 'convoyages' : etat.page;
  document.title = (titrePage() ? titrePage() + ' · ' : '') + 'Aperçu du site OA Convoyage';
}
function titrePage() {
  if (NOMS[etat.page]) return NOMS[etat.page];
  const d = doc();
  if (!d) return '';
  if (etat.version === 'ancienne') { const p = d.querySelector('main.page:not([hidden])'); return p ? p.dataset.title : ''; }
  const h = d.querySelector('h1'); return h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
}
const doc = () => { try { return frame.contentDocument; } catch (e) { return null; } };

/* ---------- défilement du site (l'ancienne version défile dans .site, la nouvelle dans la fenêtre) ---------- */
function defileur() {
  const d = doc(); if (!d) return null;
  return etat.version === 'ancienne' ? d.querySelector('.site') : d.scrollingElement;
}
function fraction() {
  const s = defileur(); if (!s) return 0;
  const max = s.scrollHeight - s.clientHeight;
  return max > 0 ? s.scrollTop / max : 0;
}
function defilerA(y, doux) {
  const s = defileur(); if (!s) return;
  if (etat.version === 'nouvelle') {
    const w = frame.contentWindow;
    if (w.OAlenis) w.OAlenis.scrollTo(y, { immediate: !doux });
    else w.scrollTo({ top: y, behavior: doux ? 'smooth' : 'auto' });
  } else s.scrollTo({ top: y, behavior: doux ? 'smooth' : 'auto' });
}
function defilerFraction(f) {
  const s = defileur(); if (!s) return;
  defilerA(Math.round(f * (s.scrollHeight - s.clientHeight)), false);
}

/* ---------- chargement ---------- */
let apresChargement = null;
function charger(f) {
  apresChargement = f || 0;
  frame.src = urlDe(etat.version, etat.page);
}
function pageDuCadre() {
  try {
    const l = frame.contentWindow.location;
    if (/\/ancienne\//.test(l.pathname)) return { version: 'ancienne', page: l.hash.slice(1).split('--')[0] || 'accueil' };
    const m = l.pathname.match(/\/nouvelle\/([\w-]+)\.html$/);
    if (m) return { version: 'nouvelle', page: m[1] };
  } catch (e) {}
  return null;
}
function suivrePage() {
  const p = pageDuCadre();
  if (!p) return;
  etat.version = p.version; etat.page = p.page;
  majInterface(); sauver();
}
frame.addEventListener('load', () => {
  const d = doc();
  if (!d || frame.src === 'about:blank') return;
  frame.contentWindow.addEventListener('hashchange', () => setTimeout(suivrePage, 80));
  suivrePage();
  const f = apresChargement; apresChargement = null;
  if (f) setTimeout(() => defilerFraction(f), 650);
});

/* ---------- commandes ---------- */
$$('[data-appareil]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.appareil === etat.appareil) return;
  const f = fraction();
  etat.appareil = b.dataset.appareil;
  majInterface(); sauver();
  setTimeout(() => charger(f), 460); // le cadre change de taille, puis le site se recharge à sa nouvelle largeur
}));
$('#ap-page').addEventListener('change', e => {
  etat.page = e.target.value;
  if (etat.version === 'ancienne' && pageDuCadre() && pageDuCadre().version === 'ancienne') { frame.contentWindow.location.hash = '#' + etat.page; }
  else charger(0);
  majInterface(); sauver();
});

/* ══════════ Anciennes remarques ══════════
   Avant le 28/10, les remarques restaient dans le navigateur (localStorage). L'outil FlowDesk les remplace ;
   celles déjà notées sur cet appareil ne sont ni effacées ni perdues : un bandeau propose de les envoyer à HWS. */
let anciennes = [];
try { anciennes = JSON.parse(localStorage.getItem(CLE) || '[]').filter(r => r && r.texte); } catch (e) { anciennes = []; }
const bandeau = $('.ap-anciennes'), toast = $('.ap-toast');
function info(t) { toast.textContent = t; toast.hidden = false; clearTimeout(info.t); info.t = setTimeout(() => { toast.hidden = true; }, 2800); }
function texteEnvoi() {
  let nom = ''; try { nom = localStorage.getItem(CLE_NOM) || ''; } catch (e) {}
  const l = anciennes.map((r, i) => `${i + 1}. ${VERSIONS[r.version] || ''}, ${r.titre || r.page || ''}, ${r.section || ''} (${r.appareil || ''})\n${r.texte}`).join('\n\n');
  return `Remarques sur l’aperçu du site OA Convoyage${nom ? ' (' + nom + ')' : ''}\n${LIEN}\n\n${l}\n`;
}
let vu = false; try { vu = localStorage.getItem(CLE_VU) === String(anciennes.length); } catch (e) {}
if (anciennes.length && !vu) {
  $('.ap-anciennes__nb', bandeau).textContent = anciennes.length > 1 ? anciennes.length + ' remarques' : 'une remarque';
  bandeau.hidden = false;
}
$('.ap-anciennes__envoi', bandeau).addEventListener('click', () => {
  const corps = texteEnvoi();
  location.href = `mailto:${DEST}?subject=${encodeURIComponent('Remarques sur l’aperçu du site')}&body=${encodeURIComponent(corps)}`;
  if (corps.length > 1500) setTimeout(() => info('Si l’email est incomplet : « Copier », puis collez dans un email'), 800);
});
$('.ap-anciennes__copie', bandeau).addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(texteEnvoi()); info('Remarques copiées : collez-les dans un email à ' + DEST); }
  catch (e) { info('Copie impossible : utilisez « Envoyer à HWS »'); }
});
$('.ap-anciennes__x', bandeau).addEventListener('click', () => { bandeau.hidden = true; try { localStorage.setItem(CLE_VU, String(anciennes.length)); } catch (e) {} });

/* ---------- démarrage ---------- */
addEventListener('resize', () => { majInterface(); });
majInterface(); sauver();
charger(0);
})();
