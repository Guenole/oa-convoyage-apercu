/* ══════════ Aperçu du site OA Convoyage ══════════
   1. Deux versions du même site (même structure, mêmes textes) : on passe de l'une à l'autre à tout moment,
      sur la même page et à peu près au même endroit.
   2. Ordinateur ou mobile.
   3. Remarques : on touche un endroit, on écrit ; une pastille reste posée ; envoi par email à HWS.
   Le site est dans une iframe de même origine : l'aperçu lit sa page, son défilement et y pose les pastilles. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const DEST = 'guenole@hws.pm';
const LIEN = 'https://guenole.github.io/oa-convoyage-apercu/';
const CLE_ETAT = 'oa-apercu-etat', CLE = 'oa-remarques-v2', CLE_V1 = 'oa-remarques-v1', CLE_NOM = 'oa-remarques-nom';
const VERSIONS = { ancienne: 'Ancienne version', nouvelle: 'Nouvelle version', premier: 'Premier aperçu' };
const APPAREILS = { ordinateur: 'ordinateur', mobile: 'mobile' };
const NOMS = { accueil: 'Accueil', professionnels: 'Professionnels', particuliers: 'Particuliers', 'a-propos': 'À propos', contact: 'Contact', convoyages: 'Convoyages' };
const frame = $('#ap-site'), scene = $('.ap-scene');
const telephone = () => matchMedia('(max-width: 767px)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- état : version, page, affichage (dans l'adresse, et retenu sur l'appareil) ---------- */
let etat = { version: 'nouvelle', page: 'accueil', appareil: 'ordinateur' };
try { Object.assign(etat, JSON.parse(localStorage.getItem(CLE_ETAT) || '{}')); } catch (e) {}
(() => {
  const [v, p, a] = decodeURIComponent(location.hash.slice(1)).split('/');
  if (VERSIONS[v] && v !== 'premier') etat.version = v;
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
  $$('[data-version]').forEach(b => b.setAttribute('aria-pressed', b.dataset.version === etat.version));
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
  majInterface(); sauver(); rendrePins();
}
frame.addEventListener('load', () => {
  const d = doc();
  if (!d || frame.src === 'about:blank') return;
  injecterStyles(d);
  d.addEventListener('click', clicPose, true);
  ['pointerdown', 'mousedown', 'touchstart'].forEach(t => d.addEventListener(t, e => { if (pose) { e.stopPropagation(); } }, true));
  d.addEventListener('keydown', e => { if (e.key === 'Escape') fermerTout(); });
  frame.contentWindow.addEventListener('hashchange', () => setTimeout(suivrePage, 80));
  frame.contentWindow.addEventListener('resize', () => rendrePins());
  suivrePage();
  const f = apresChargement; apresChargement = null;
  if (f) setTimeout(() => defilerFraction(f), 650);
  setTimeout(rendrePins, 700);
});

/* ---------- commandes ---------- */
$$('[data-version]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.version === etat.version) return;
  const f = fraction();
  etat.version = b.dataset.version;
  majInterface(); sauver(); charger(f);
}));
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

/* ══════════ Remarques ══════════ */
let liste = [];
try { liste = JSON.parse(localStorage.getItem(CLE) || '[]'); } catch (e) { liste = []; }
// les remarques du premier aperçu (textes d'exemple) sont gardées dans la liste, sans pastille
try {
  const v1 = JSON.parse(localStorage.getItem(CLE_V1) || '[]');
  if (v1.length && !localStorage.getItem(CLE_V1 + '-repris')) {
    liste = v1.map(r => ({ ...r, version: 'premier' })).concat(liste);
    localStorage.setItem(CLE_V1 + '-repris', '1');
    localStorage.setItem(CLE, JSON.stringify(liste));
  }
} catch (e) {}
const enregistrer = () => { try { localStorage.setItem(CLE, JSON.stringify(liste)); } catch (e) {} };
const panneau = $('.ap-panneau'), btnRq = $('.ap-rq'), consigne = $('.ap-consigne'), bulle = $('.ap-bulle'), lecture = $('.ap-lecture'), toast = $('.ap-toast');
const champNom = $('.ap-nom input');
try { champNom.value = localStorage.getItem(CLE_NOM) || ''; } catch (e) {}
champNom.addEventListener('input', () => { try { localStorage.setItem(CLE_NOM, champNom.value.trim()); } catch (e) {} });
const ouvrir = v => { panneau.hidden = !v; btnRq.setAttribute('aria-expanded', v); };
btnRq.addEventListener('click', () => ouvrir(panneau.hidden));
$('.ap-x').addEventListener('click', () => ouvrir(false));
function info(t) { toast.textContent = t; toast.hidden = false; clearTimeout(info.t); info.t = setTimeout(() => { toast.hidden = true; }, 2800); }
function fermerTout() { placer(false); bulle.hidden = true; lecture.hidden = true; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerTout(); });

/* pose d'une remarque */
let pose = false, brouillon = null;
function placer(v) {
  pose = v; consigne.hidden = !v; document.body.classList.toggle('ap-pose', v);
  const d = doc(); if (d) d.documentElement.classList.toggle('ap-pose', v);
  if (v) { ouvrir(false); lecture.hidden = true; }
}
$('.ap-ajout').addEventListener('click', () => placer(true));
$('button', consigne).addEventListener('click', () => placer(false));

function nomSection(cible, racine) {
  if (cible.closest('.hdr, .hdr-m, .entete, .menu-mobile')) return 'Menu';
  if (cible.closest('.footer, .footer-m, .pied')) return 'Pied de page';
  if (cible.closest('.cta-bar, .barre-action')) return 'Barre d’action';
  let n = cible;
  while (n && n.parentElement && n.parentElement !== racine) n = n.parentElement;
  if (!n || n.parentElement !== racine) return 'Page';
  if (n.matches('.demande-poster, .demande-cta') && n.previousElementSibling) n = n.previousElementSibling;
  if (n.querySelector('h1')) return 'Ouverture';
  const h = n.querySelector('h1, h2');
  let t = (h ? h.textContent : n.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  return t ? (t.length > 60 ? t.slice(0, 57) + '…' : t) : 'Section';
}
function clicPose(e) {
  if (!pose) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  const d = doc(), w = frame.contentWindow;
  let x, y, racine;
  if (etat.version === 'ancienne') {
    racine = d.querySelector('main.page:not([hidden])'); if (!racine) return;
    const r = racine.getBoundingClientRect();
    x = (e.clientX - r.left) / r.width * 100; y = e.clientY - r.top;
  } else {
    racine = d.querySelector('main');
    x = e.clientX / d.documentElement.clientWidth * 100; y = e.clientY + w.scrollY;
  }
  brouillon = { version: etat.version, page: etat.page, titre: titrePage() || etat.page, section: nomSection(e.target, racine), appareil: appareil(),
                x: Math.max(0, Math.min(100, x)), y: Math.max(0, y) };
  placer(false);
  const fr = frame.getBoundingClientRect();
  montrerBulle(bulle, fr.left + e.clientX, fr.top + e.clientY);
  $('.ap-bulle__ou', bulle).textContent = `${VERSIONS[brouillon.version]} · ${brouillon.titre} · ${brouillon.section}`;
  const ta = $('textarea', bulle); ta.value = ''; setTimeout(() => ta.focus(), 30);
}
function montrerBulle(el, cx, cy) {
  el.hidden = false;
  const w = el.offsetWidth || 300, h = el.offsetHeight || 180;
  el.style.left = Math.max(12, Math.min(innerWidth - w - 12, cx - w / 2)) + 'px';
  el.style.top = Math.max(60, Math.min(innerHeight - h - 12, cy + 16)) + 'px';
}
bulle.addEventListener('submit', e => {
  e.preventDefault();
  const t = $('textarea', bulle).value.trim();
  if (!t || !brouillon) return;
  liste.push({ ...brouillon, id: Date.now().toString(36), texte: t, date: new Date().toISOString() });
  enregistrer(); brouillon = null; bulle.hidden = true; rendre(); info('Remarque enregistrée');
});
$('.ap-annule', bulle).addEventListener('click', () => { brouillon = null; bulle.hidden = true; });

/* pastilles posées dans le site, liste dans le panneau */
const STYLE_PIN = `
html.ap-pose, html.ap-pose *{cursor:crosshair!important}
.ap-pins{position:absolute;left:0;top:0;width:100%;height:0;z-index:2147483000;pointer-events:none}
.ap-pin{position:absolute;width:30px;height:30px;margin:-34px 0 0 -15px;padding:0;border:0;background:none;display:flex;align-items:center;justify-content:center;
  color:#3d3e3e;font:700 12px/1 "Montserrat",system-ui,sans-serif;cursor:pointer;pointer-events:auto}
.ap-pin::before{content:"";position:absolute;inset:0;z-index:-1;border:2px solid #faf8f3;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
  background:#e4c7bd;box-shadow:0 6px 14px -4px rgba(60,40,36,.45)}`;
function injecterStyles(d) {
  if (d.getElementById('ap-style')) return;
  const s = d.createElement('style'); s.id = 'ap-style'; s.textContent = STYLE_PIN; d.head.appendChild(s);
}
function rendrePins() {
  const d = doc(); if (!d || !d.body) return;
  d.querySelectorAll('.ap-pins').forEach(p => p.remove());
  let hote;
  if (etat.version === 'ancienne') { hote = d.querySelector('main.page:not([hidden])'); if (hote) hote.style.position = 'relative'; }
  else hote = d.body;
  if (!hote) return;
  const calque = d.createElement('div'); calque.className = 'ap-pins';
  if (etat.version === 'ancienne') calque.style.height = '100%';
  liste.forEach((r, i) => {
    if (r.version !== etat.version || r.page !== etat.page || r.appareil !== appareil()) return;
    const p = d.createElement('button');
    p.type = 'button'; p.className = 'ap-pin'; p.textContent = i + 1;
    p.style.left = r.x + '%'; p.style.top = r.y + 'px';
    p.setAttribute('aria-label', 'Remarque ' + (i + 1));
    p.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const fr = frame.getBoundingClientRect();
      montrerLecture(r, i, fr.left + ev.clientX, fr.top + ev.clientY);
    });
    calque.appendChild(p);
  });
  hote.appendChild(calque);
}
let lue = null;
function montrerLecture(r, i, cx, cy) {
  lue = r;
  $('.ap-bulle__ou', lecture).textContent = `${i + 1} · ${VERSIONS[r.version] || ''} · ${r.section}`;
  $('.ap-lecture__texte', lecture).textContent = r.texte;
  montrerBulle(lecture, cx, cy);
}
$('.ap-ferme', lecture).addEventListener('click', () => { lecture.hidden = true; });
$('.ap-suppr', lecture).addEventListener('click', () => { if (lue) { liste = liste.filter(x => x !== lue); enregistrer(); rendre(); } lecture.hidden = true; });

function rendre() {
  rendrePins();
  $('.ap-liste').innerHTML = liste.map((r, i) => `<li data-i="${i}"><b>${i + 1}</b><div><span class="ap-ou">${esc(VERSIONS[r.version] || '')} · ${esc(r.titre)} · ${esc(r.section)} · ${esc(r.appareil)}</span><p>${esc(r.texte)}</p><span class="ap-act">${r.version !== 'premier' ? '<button type="button" data-voir>Voir</button>' : ''}<button type="button" data-suppr>Supprimer</button></span></div></li>`).join('');
  $('.ap-vide').hidden = liste.length > 0;
  const nb = $('.ap-rq__nb'); nb.hidden = !liste.length; nb.textContent = liste.length;
  $('.ap-envoi').disabled = $('.ap-copie').disabled = !liste.length;
}
$('.ap-liste').addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const i = +li.dataset.i, r = liste[i];
  if (e.target.closest('[data-suppr]')) { liste.splice(i, 1); enregistrer(); rendre(); return; }
  if (e.target.closest('[data-voir]')) {
    ouvrir(false);
    const aller = () => { rendrePins(); const s = defileur(); if (s) defilerA(Math.max(0, r.y - s.clientHeight / 3), true); };
    if (r.appareil !== appareil() && !telephone()) { etat.appareil = r.appareil; }
    if (r.version !== etat.version || r.page !== etat.page || scene.dataset.appareil !== etat.appareil) {
      etat.version = r.version; etat.page = r.page;
      majInterface(); sauver();
      apresChargement = 0; frame.src = urlDe(etat.version, etat.page);
      frame.addEventListener('load', () => setTimeout(aller, 900), { once: true });
    } else aller();
    if (r.appareil !== appareil()) info(r.appareil === 'mobile' ? 'Cette remarque a été posée sur mobile' : 'Cette remarque a été posée sur ordinateur');
  }
});

/* envoi */
function texteEnvoi() {
  const nom = champNom.value.trim();
  const l = liste.map((r, i) => `${i + 1}. ${VERSIONS[r.version] || ''}, ${r.titre}, ${r.section} (${r.appareil})\n${r.texte}`).join('\n\n');
  return `Remarques sur l’aperçu du site OA Convoyage${nom ? ' (' + nom + ')' : ''}\n${LIEN}\n\n${l}\n`;
}
$('.ap-envoi').addEventListener('click', () => {
  const sujet = 'Remarques sur l’aperçu du site' + (champNom.value.trim() ? ' (' + champNom.value.trim() + ')' : '');
  const corps = texteEnvoi();
  location.href = `mailto:${DEST}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  if (corps.length > 1500) setTimeout(() => info('Si l’email est incomplet : « Copier », puis collez dans un email'), 800);
});
$('.ap-copie').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(texteEnvoi()); info('Remarques copiées : collez-les dans un email à ' + DEST); }
  catch (e) { info('Copie impossible : utilisez « Envoyer à HWS »'); }
});

/* ---------- démarrage ---------- */
addEventListener('resize', () => { majInterface(); });
majInterface(); sauver(); rendre();
charger(0);
})();
