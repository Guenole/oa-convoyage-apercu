/* OA Convoyage — prototype animé de la Nouvelle DA
   Interactions (sans dépendance) puis animations (GSAP + ScrollTrigger + SplitText, Lenis).
   Le contenu reste visible si un script échoue.
   Règle du 29/10/2026 : rien du premier écran ne part invisible. Les états de départ
   (90-anim.css, classe .anim) sont des états déjà visibles, et le script anime à partir
   d'eux ; ce qui est déjà à l'écran au chargement n'est jamais masqué puis réaffiché. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* paliers alignés sur Webflow : mobile ≤ 767 (portrait ≤ 478), tablette 768-991, ordinateur compact 992-1279.
     Menu replié, barre d'action, étapes et jalons verticaux : jusqu'à 991 (lot L1). Le reste suit la mise en page
     elle-même (découpes lues dans la feuille de style, rayon calculé, orientation mesurée). */
  var REPLIE = '(max-width: 991px)';
  var ORDI = '(min-width: 992px)';
  var PALIERS = ['(max-width: 478px)', '(max-width: 767px)', '(max-width: 991px)', '(max-width: 1279px)'];
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var page = document.body.dataset.page;
  var G = window.gsap;
  var ST = window.ScrollTrigger;
  var avecGsap = !!(G && ST);
  var NB = ' ';
  var FINE = ' ';
  var TEL = '06 08 57 23 14';
  var lenis = null;

  /* ------------------------------------------------------------ défilement */
  if (avecGsap) {
    G.config({ nullTargetWarn: false });
    G.registerPlugin(ST);
    if (window.SplitText) G.registerPlugin(window.SplitText);
  }
  if (avecGsap && !reduit && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    window.OAlenis = lenis; // l’aperçu en ligne s’en sert pour garder la position au changement de version
    lenis.on('scroll', ST.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
  }
  var defilerVers = function (cible, decalage) {
    if (!cible) return;
    if (lenis) lenis.scrollTo(cible, { offset: decalage || -24, duration: 1.4 });
    else cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
  };

  /* liens internes (« Aller au contenu », « Voir les étapes »…) : la page défile ET le focus suit.
     Sur l'Accueil, l'en-tête est encore dans <main> : « Aller au contenu » vise alors le titre de la page,
     pour sauter vraiment la navigation. */
  var cibleDuFocus = function (cible) {
    if (cible.id === 'contenu' && cible.querySelector('[data-entete]')) cible = cible.querySelector('h1') || cible;
    if (!cible.matches('a[href], button, input, select, textarea, [tabindex]')) cible.setAttribute('tabindex', '-1');
    return cible;
  };
  $$('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    a.addEventListener('click', function (e) {
      var cible = document.getElementById(id);
      if (!cible) return;
      e.preventDefault();
      defilerVers(cible);
      cibleDuFocus(cible).focus({ preventScroll: true });
    });
  });
  var surDefilement = function (fn) {
    if (lenis) lenis.on('scroll', function (l) { fn(l.scroll); });
    else window.addEventListener('scroll', function () { fn(window.scrollY); }, { passive: true });
  };

  /* hauteurs de l'en-tête fixe et de la barre d'action mobile : 80-interactions.css s'en sert
     (scroll-padding) pour que l'élément qui a le focus ne passe jamais dessous */
  var recouvrement = function () {
    var fixe = $('.entete.est-fixe');
    var barre = $('[data-barre-action]');
    var bas = 0;
    if (barre) {
      var cs = getComputedStyle(barre);
      if (cs.display !== 'none') bas = barre.offsetHeight + (parseFloat(cs.bottom) || 0);
    }
    doc.style.setProperty('--recouvre-haut', (fixe ? fixe.offsetHeight : 0) + 'px');
    doc.style.setProperty('--recouvre-bas', bas + 'px');
  };

  /* --------------------------------------------- en-tête fixe au retour */
  (function () {
    var entete = $('[data-entete]');
    if (!entete) return;
    var fixe = entete.cloneNode(true);
    fixe.classList.remove('entete--photo');
    fixe.classList.add('entete--clair', 'est-fixe');
    fixe.removeAttribute('data-entete');
    var logoFixe = fixe.querySelector('.entete__logo-img');
    if (logoFixe) logoFixe.src = 'assets/svg/logo-anthracite.svg';
    fixe.setAttribute('inert', '');
    fixe.setAttribute('aria-hidden', 'true');
    /* ordre de tabulation : juste après l'en-tête d'origine, ou après le lien d'évitement sur l'Accueil
       (son en-tête est posé sur la photo) ; plus jamais après le pied de page */
    var evitement = $('.evitement');
    if (entete.parentNode === document.body) document.body.insertBefore(fixe, entete.nextSibling);
    else document.body.insertBefore(fixe, evitement ? evitement.nextSibling : document.body.firstChild);
    var dernier = 0;
    var seuil = 240;
    var calculerSeuil = function () {
      var hero = $('[data-hero]') || $('.hero-public') || entete;
      seuil = Math.max(240, hero.offsetTop + hero.offsetHeight * 0.75);
    };
    calculerSeuil();
    window.addEventListener('resize', calculerSeuil);
    window.addEventListener('load', calculerSeuil);
    var visible = false;
    var montrer = function (oui) {
      if (oui === visible) return;
      visible = oui;
      fixe.classList.toggle('est-visible', oui);
      if (oui) { fixe.removeAttribute('inert'); fixe.removeAttribute('aria-hidden'); }
      else { fixe.setAttribute('inert', ''); fixe.setAttribute('aria-hidden', 'true'); }
    };
    surDefilement(function (y) {
      if (y < seuil) montrer(false);
      else if (y < dernier - 6) montrer(true);
      else if (y > dernier + 6) montrer(false);
      dernier = y;
    });
    fixe.querySelector('[data-menu-ouvrir]') && fixe.querySelector('[data-menu-ouvrir]').addEventListener('click', ouvrirMenu);
  })();

  /* -------------------------------------------------------- menu mobile */
  /* fenêtre (role="dialog", aria-modal) : pendant l'ouverture, le reste de la page est inerte */
  var menu = $('[data-menu]');
  var dernierFocus = null;
  var inertes = [];
  function pageInerte(oui) {
    if (oui) {
      inertes = $$('body > *').filter(function (el) { return el !== menu && el.tagName !== 'SCRIPT' && !el.hasAttribute('inert'); });
      inertes.forEach(function (el) { el.setAttribute('inert', ''); });
    } else {
      inertes.forEach(function (el) { el.removeAttribute('inert'); });
      inertes = [];
    }
  }
  function ouvrirMenu() {
    if (!menu || !menu.hidden) return;
    dernierFocus = document.activeElement;
    menu.hidden = false;
    pageInerte(true);
    $$('[data-menu-ouvrir]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    if (avecGsap && !reduit) {
      var panneau = $('.menu-mobile__panneau', menu);
      G.fromTo(menu, { backgroundColor: 'rgba(61,62,62,0)' }, { backgroundColor: 'rgba(61,62,62,.35)', duration: 0.4 });
      G.fromTo(panneau, { clipPath: 'inset(0% 0% 100% 0% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 0.75, ease: 'expo.out' });
      G.from($$('.menu-mobile__nav a, .menu-mobile__bas > *', menu), { y: 28, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05, delay: 0.15 });
    }
    var fermer = $('[data-menu-fermer]', menu);
    fermer && fermer.focus();
  }
  function fermerMenu() {
    if (!menu || menu.hidden) return;
    var fin = function () {
      menu.hidden = true;
      pageInerte(false);
      $$('[data-menu-ouvrir]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (lenis) lenis.start();
      document.body.style.overflow = '';
      if (dernierFocus) dernierFocus.focus();
    };
    if (avecGsap && !reduit) {
      G.to($('.menu-mobile__panneau', menu), { clipPath: 'inset(0% 0% 100% 0% round 28px)', duration: 0.45, ease: 'power3.in', onComplete: fin });
      G.to(menu, { backgroundColor: 'rgba(61,62,62,0)', duration: 0.45 });
    } else fin();
  }
  $$('[data-menu-ouvrir]').forEach(function (b) { b.addEventListener('click', ouvrirMenu); });
  if (menu) {
    $('[data-menu-fermer]', menu).addEventListener('click', fermerMenu);
    menu.addEventListener('click', function (e) { if (e.target === menu) fermerMenu(); });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') fermerMenu();
      if (e.key === 'Tab') {
        var f = $$('a, button', menu);
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* --------------------------------------------------- barres de demande */
  $$('form[data-barre]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var donnees = new FormData(form);
      var params = new URLSearchParams();
      donnees.forEach(function (v, k) { if (String(v).trim()) params.set(k, String(v).trim()); });
      var bouton = $('.barre__envoi', form);
      var aller = function () { window.location.href = 'contact.html?' + params.toString() + '#formulaire'; };
      if (avecGsap && !reduit) G.to(bouton, { scale: 0.96, duration: 0.12, yoyo: true, repeat: 1, onComplete: aller });
      else aller();
    });
  });

  /* barre d'exemple : se remplit seule, champ par champ (note d'interactions Professionnels) */
  function remplirBarre(form, apres) {
    var champs = $$('[data-exemple]', form).filter(function (c) { return c.dataset.exemple; });
    var bouton = $('.barre__envoi', form);
    if (reduit || !avecGsap) {
      champs.forEach(function (c) { c.value = c.dataset.exemple; });
      if (apres) apres();
      return;
    }
    champs.forEach(function (c) { if (c.tagName === 'INPUT') c.value = ''; else if (c.name === 'vehicule') c.value = ''; });
    var tl = G.timeline({ onComplete: apres });
    champs.forEach(function (c) {
      var champ = c.closest('.barre__champ');
      tl.add(function () { champ.classList.add('est-saisi'); });
      if (c.tagName === 'SELECT') {
        tl.add(function () { c.value = c.dataset.exemple; }, '+=0.15');
        tl.fromTo(c, { opacity: 0.25 }, { opacity: 1, duration: 0.35 });
      } else {
        var texte = c.dataset.exemple;
        var o = { n: 0 };
        tl.to(o, { n: texte.length, duration: texte.length * 0.055, ease: 'none', onUpdate: function () { c.value = texte.slice(0, Math.round(o.n)); } }, '+=0.1');
      }
      tl.add(function () { champ.classList.remove('est-saisi'); }, '+=0.05');
    });
    tl.fromTo(bouton, { boxShadow: '0 0 0 0 rgba(228,199,189,0)' }, { boxShadow: '0 0 0 10px rgba(228,199,189,0)', duration: 0.9, ease: 'power2.out', startAt: { boxShadow: '0 0 0 0 rgba(228,199,189,.9)' } }, '+=0.1');
    return tl;
  }

  /* --------------------------------------------- barre d'action mobile */
  /* elle n'existe que là où la feuille de style l'affiche (palier mobile) */
  (function () {
    var barre = $('[data-barre-action]');
    if (!barre || page === 'contact') return;
    var barres = $$('form.barre');
    var visibles = new Set();
    var existe = function () { return getComputedStyle(barre).display !== 'none'; };
    /* téléphone en paysage : le hero dépasse l'écran, la barre de demande n'y est pas visible au chargement ;
       la barre d'action attend que le hero soit dépassé (sinon elle se poserait sur le titre) */
    var paysage = window.matchMedia('(max-height: 500px) and (orientation: landscape)');
    var hero = $('[data-hero]') || $('[data-hero-public]') || $('[data-convoyages-hero]') || $('[data-convoyage-fiche]');
    var heroDepasse = function () { return !paysage.matches || !hero || hero.getBoundingClientRect().bottom <= 0; };
    var maj = function () {
      var montrer = existe() && visibles.size === 0 && heroDepasse() && (!menu || menu.hidden);
      barre.classList.toggle('est-visible', montrer);
      barre.setAttribute('aria-hidden', montrer ? 'false' : 'true');
      $$('a', barre).forEach(function (a) { a.tabIndex = montrer ? 0 : -1; });
    };
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) { if (en.isIntersecting) visibles.add(en.target); else visibles.delete(en.target); });
      maj();
    }, { threshold: 0 });
    barres.forEach(function (b) { io.observe(b); });
    window.addEventListener('resize', maj);
    surDefilement(function () { if (paysage.matches) maj(); });
    setTimeout(maj, 600);
  })();

  recouvrement();
  window.addEventListener('resize', recouvrement);
  window.addEventListener('load', recouvrement);

  /* ---------------------------------------------------------- questions */
  /* une réponse fermée est inerte : ni le clavier ni les lecteurs d'écran n'y entrent */
  $$('[data-question]').forEach(function (q) {
    var bouton = $('.question__bouton', q);
    var reponse = $('.question__reponse', q);
    var majReponse = function (ouvert) {
      if (!reponse) return;
      if (ouvert) reponse.removeAttribute('inert'); else reponse.setAttribute('inert', '');
    };
    majReponse(q.classList.contains('question--ouverte'));
    bouton.addEventListener('click', function () {
      var ouvert = q.classList.toggle('question--ouverte');
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      majReponse(ouvert);
      if (ST) setTimeout(function () { ST.refresh(); }, 600);
    });
  });

  /* ---------------------------------------------------- pistes (avis) */
  /* carrousel nommé ; en bout de liste, la flèche s'atténue (aria-disabled) sans perdre le focus */
  $$('[data-piste]').forEach(function (piste) {
    var nom = piste.dataset.piste;
    var controles = $$('[data-defilement="' + nom + '"]');
    var cartes = $$('[data-carte]', piste);
    if (!cartes.length) return;
    piste.setAttribute('role', 'region');
    piste.setAttribute('aria-roledescription', 'carrousel');
    if (!piste.getAttribute('aria-label')) piste.setAttribute('aria-label', 'Avis Google');
    var pas = function () {
      if (cartes.length > 1) return cartes[1].offsetLeft - cartes[0].offsetLeft;
      return cartes[0].getBoundingClientRect().width;
    };
    var position = function () { return Math.round(piste.scrollLeft / pas()); };
    var bloquer = function (b, oui) { if (b) b.setAttribute('aria-disabled', oui ? 'true' : 'false'); };
    var bloque = function (b) { return b.getAttribute('aria-disabled') === 'true'; };
    var maj = function () {
      var p = Math.min(cartes.length - 1, position());
      var max = piste.scrollWidth - piste.clientWidth - 2;
      controles.forEach(function (ctl) {
        $('[data-pos]', ctl).textContent = String(p + 1);
        $('[data-total]', ctl).textContent = String(cartes.length);
        bloquer($('[data-prec]', ctl), piste.scrollLeft <= 2);
        bloquer($('[data-suiv]', ctl), piste.scrollLeft >= max);
      });
    };
    var aller = function (i) {
      i = Math.max(0, Math.min(cartes.length - 1, i));
      piste.scrollTo({ left: i * pas(), behavior: reduit ? 'auto' : 'smooth' });
    };
    controles.forEach(function (ctl) {
      var prec = $('[data-prec]', ctl), suiv = $('[data-suiv]', ctl);
      prec.disabled = false; suiv.disabled = false;
      prec.addEventListener('click', function () { if (!bloque(prec)) aller(position() - 1); });
      suiv.addEventListener('click', function () { if (!bloque(suiv)) aller(position() + 1); });
    });
    piste.addEventListener('scroll', function () { window.requestAnimationFrame(maj); }, { passive: true });
    piste.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); aller(position() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); aller(position() - 1); }
    });
    /* glisser à la souris */
    var appui = null;
    piste.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      appui = { x: e.clientX, gauche: piste.scrollLeft, bouge: false };
      piste.classList.add('est-glisse');
    });
    window.addEventListener('pointermove', function (e) {
      if (!appui) return;
      var dx = e.clientX - appui.x;
      if (Math.abs(dx) > 4) appui.bouge = true;
      piste.scrollLeft = appui.gauche - dx;
    });
    var lacher = function () {
      if (!appui) return;
      var bouge = appui.bouge;
      appui = null;
      piste.classList.remove('est-glisse');
      if (bouge) aller(position());
    };
    window.addEventListener('pointerup', lacher);
    window.addEventListener('pointercancel', lacher);
    window.addEventListener('blur', lacher);
    maj();
    window.addEventListener('resize', maj);
  });

  /* ------------------------------------- route des étapes (hauteur) */
  $$('[data-etapes]').forEach(function (liste) {
    var route = $('.etapes__route', liste);
    var etapes = $$('[data-etape]', liste);
    if (!route || !etapes.length) return;
    var maj = function () {
      var derniere = etapes[etapes.length - 1];
      route.style.height = (derniere.offsetTop) + 'px';
    };
    maj();
    if (window.ResizeObserver) new ResizeObserver(maj).observe(liste);
  });

  /* ------------------------------------------ déroulé (pages de public) */
  /* la voiture roule d'étape en étape et s'arrête sur chacune (WCAG 2.2.2) :
     - un bouton Pause / Lecture, sur la photo, arrête ou relance l'avance ;
     - le premier clic sur une étape arrête l'avance pour de bon (le bouton passe sur Lecture) ;
     - le survol de la route et le focus sur une étape la suspendent, elle reprend en sortant ;
     - hors de l'écran ou onglet caché, elle attend ; mouvement réduit : pas d'avance du tout. */
  $$('[data-mission]').forEach(function (bloc) {
    var route = $('.mission', bloc);
    var etapes = $$('[data-mission-etape]', bloc);
    var photos = $$('[data-mission-photo]', bloc);
    var boutons = $$('[data-mission-btn]', bloc);
    var filet = $('.mission__filet', bloc);
    var trace = $('.mission__progression', bloc);
    var voiture = $('.mission__voiture', bloc);
    var disque = $('.mission__disque', bloc);
    var icone = disque ? $('svg', disque) : null;
    if (!route || !etapes.length || !voiture) return;
    var dernier = etapes.length - 1;
    var ARRET = 3.4, ARRET_FIN = 4.6, TRAJET = 1.4;
    var anime = avecGsap && !reduit;
    var etat = { p: 0 };
    var centres = [];
    var vertical = false;
    var actif = -1;
    var enVue = false;
    var enPause = false;                 // choix du visiteur : bouton Pause, ou clic sur une étape
    var survol = false, focusDedans = false;
    var minuterie = null, trajet = null, boucle = null;
    var pause = null, libellePause = null;

    var placer = function (p) {
      etat.p = p;
      if (centres.length < 2) return;
      var i = Math.max(0, Math.min(Math.floor(p), dernier - 1)), f = p - i;
      var a = centres[i], b = centres[i + 1], o = centres[0];
      var x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
      voiture.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
      if (vertical) { trace.style.left = (o.x - 0.5) + 'px'; trace.style.top = o.y + 'px'; trace.style.width = '1px'; trace.style.height = Math.max(0, y - o.y) + 'px'; }
      else { trace.style.left = o.x + 'px'; trace.style.top = (o.y - 0.5) + 'px'; trace.style.height = '1px'; trace.style.width = Math.max(0, x - o.x) + 'px'; }
      etapes.forEach(function (et, n) { et.classList.toggle('est-atteinte', n <= p + 0.02); });
    };
    var mesurer = function () {
      var base = route.getBoundingClientRect();
      centres = etapes.map(function (et) {
        var r = $('.mission__repere', et).getBoundingClientRect();
        return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
      });
      var a = centres[0], b = centres[dernier];
      vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
      route.classList.toggle('mission--verticale', vertical);
      if (vertical) { filet.style.left = (a.x - 0.5) + 'px'; filet.style.top = a.y + 'px'; filet.style.width = '1px'; filet.style.height = (b.y - a.y) + 'px'; }
      else { filet.style.left = a.x + 'px'; filet.style.top = (a.y - 0.5) + 'px'; filet.style.width = (b.x - a.x) + 'px'; filet.style.height = '1px'; }
      placer(etat.p);
    };
    var activer = function (i, source) {
      if (i === actif) return;
      var precedent = actif;
      actif = i;
      etapes.forEach(function (et, n) { et.classList.toggle('est-active', n === i); });
      boutons.forEach(function (b, n) { b.setAttribute('aria-pressed', n === i ? 'true' : 'false'); });
      photos.forEach(function (ph, n) {
        ph.classList.toggle('est-active', n === i);
        if (anime && source !== 'init') {
          if (n === i) G.fromTo(ph, { opacity: 0, scale: 1.16 }, { opacity: 1, scale: 1.1, duration: 1.1, ease: 'expo.out', overwrite: 'auto' });
          else if (n === precedent) G.to(ph, { opacity: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
        } else { ph.style.opacity = n === i ? 1 : 0; }
      });
    };

    /* la voiture se tourne dans le sens de la marche, puis se remet face à la route */
    var rouler = function (cible, duree, ease, fin) {
      if (trajet) { trajet.kill(); trajet = null; }
      if (icone) icone.style.transform = cible < etat.p - 0.01 && !vertical ? 'scaleX(-1)' : '';
      if (!anime) { placer(cible); if (icone) icone.style.transform = ''; if (fin) fin(); return; }
      trajet = G.to(etat, { p: cible, duration: duree, ease: ease, onUpdate: function () { placer(etat.p); }, onComplete: function () {
        trajet = null;
        if (icone) icone.style.transform = '';
        if (fin) fin();
      } });
    };
    var enMarche = function () { return anime && enVue && !enPause && !survol && !focusDedans && !document.hidden; };
    var arreter = function () { if (minuterie) { minuterie.kill(); minuterie = null; } };
    var programmer = function (delai) {
      arreter();
      if (enMarche()) minuterie = G.delayedCall(delai, avancer);
    };
    var reprendre = function (delai) { if (!minuterie && !trajet && !boucle) programmer(delai || ARRET); };
    var avancer = function () {
      minuterie = null;
      if (!enMarche()) return;
      if (actif >= dernier) { recommencer(); return; }
      var suivante = actif + 1;
      rouler(suivante, TRAJET, 'power2.inOut', function () {
        activer(suivante, 'auto');
        programmer(suivante === dernier ? ARRET_FIN : ARRET);
      });
    };
    /* arrivée : la voiture s'efface, la ligne se replie, la voiture repart de la première étape */
    var recommencer = function () {
      boucle = G.timeline({ onComplete: function () { boucle = null; programmer(ARRET); } })
        .to(disque, { scale: 0.5, opacity: 0, duration: 0.35, ease: 'power2.in' })
        .to(etat, { p: 0, duration: 0.8, ease: 'power3.inOut', onUpdate: function () { placer(etat.p); } })
        .add(function () { activer(0, 'auto'); })
        .to(disque, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' });
    };
    var majPause = function () {
      if (!pause) return;
      pause.classList.toggle('est-en-pause', enPause);
      libellePause.textContent = enPause ? 'Reprendre le défilement des étapes' : 'Mettre en pause le défilement des étapes';
    };
    /* clic sur une étape : la voiture y va, et l'avance automatique s'arrête pour de bon */
    var aller = function (n) {
      enPause = true;
      majPause();
      arreter();
      if (boucle) { boucle.kill(); boucle = null; G.set(disque, { scale: 1, opacity: 1 }); }
      activer(n, 'clic');
      rouler(n, Math.min(1.6, 0.45 + 0.28 * Math.abs(n - etat.p)), 'power3.inOut');
    };
    boutons.forEach(function (b, n) { b.addEventListener('click', function () { aller(n); }); });

    if (anime) {
      /* bouton Pause / Lecture, posé sur la grande photo (le cadre n'est plus masqué aux lecteurs
         d'écran, seules les photos décoratives le sont) */
      pause = document.createElement('button');
      pause.type = 'button';
      pause.className = 'deroule__pause';
      pause.innerHTML = '<svg class="deroule__pause-icone deroule__pause-icone--pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M9 6.5v11"/><path d="M15 6.5v11"/></svg>'
        + '<svg class="deroule__pause-icone deroule__pause-icone--lecture" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8.5 6.2v11.6L18 12z"/></svg>'
        + '<span class="sr"></span>';
      libellePause = $('.sr', pause);
      var cadre = $('.deroule__photos', bloc);
      if (cadre) {
        cadre.removeAttribute('aria-hidden');
        photos.forEach(function (ph) { ph.setAttribute('aria-hidden', 'true'); });
        cadre.appendChild(pause);
      } else route.parentNode.insertBefore(pause, route);
      majPause();
      pause.addEventListener('click', function () {
        enPause = !enPause;
        majPause();
        if (enPause) arreter(); else reprendre(0.6);
      });
      /* survol (souris) et focus dans la route : on lit sans que l'étape change */
      route.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { survol = true; arreter(); } });
      route.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { survol = false; reprendre(); } });
      route.addEventListener('focusin', function () { focusDedans = true; arreter(); });
      route.addEventListener('focusout', function (e) { if (!route.contains(e.relatedTarget)) { focusDedans = false; reprendre(); } });
      var io = new IntersectionObserver(function (e) {
        enVue = e[0].isIntersecting;
        if (!enVue) arreter(); else reprendre();
      }, { threshold: 0.35 });
      io.observe(route);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) arreter(); else reprendre();
      });
    }
    if (window.ResizeObserver) new ResizeObserver(mesurer).observe(route);
    else window.addEventListener('resize', mesurer);
    activer(0, 'init');
    mesurer();
    if (document.fonts) document.fonts.ready.then(mesurer);
  });

  /* ---------------------------------------------- formulaire de contact */
  (function () {
    var form = $('[data-formulaire]');
    if (!form) return;
    var params = new URLSearchParams(window.location.search);
    var choix = $$('input[name="profil"]', form);
    var entreprise = $('[data-champ-entreprise]', form);
    var saisieEntreprise = entreprise ? $('input', entreprise) : null;
    var bandeau = $('[data-bandeau]', form);
    var texteBandeau = bandeau ? $('[data-bandeau-texte]', bandeau) : null;
    var carte = $('[data-carte-formulaire]');
    var envoye = $('[data-envoye]');
    var profilChoisi = function () { var c = choix.filter(function (r) { return r.checked; })[0]; return c ? c.value : ''; };
    /* champ Entreprise : affiché et obligatoire pour un professionnel seulement
       (jamais « required » sur un champ caché : le navigateur bloquerait l'envoi) */
    var majEntreprise = function (anime) {
      var pro = profilChoisi() === 'pro';
      if (!entreprise) return;
      if (saisieEntreprise) saisieEntreprise.required = pro;
      if (pro && entreprise.hidden) {
        entreprise.hidden = false;
        if (anime && avecGsap && !reduit) G.fromTo(entreprise, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.55, ease: 'expo.out', clearProps: 'height' });
      } else if (!pro && !entreprise.hidden) {
        if (anime && avecGsap && !reduit) G.to(entreprise, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: function () { entreprise.hidden = true; G.set(entreprise, { clearProps: 'all' }); } });
        else entreprise.hidden = true;
      }
      $$('.choix__option', form).forEach(function (o) { o.classList.toggle('est-choisi', $('input', o).checked); });
    };
    choix.forEach(function (c) { c.addEventListener('change', function () { majEntreprise(true); effacerErreur(c.closest('[data-champ]')); }); });

    /* pré-remplissage depuis une barre de demande (valeurs contrôlées : profil pro ou part, source connue) */
    var lire = function (cle, max) { var v = params.get(cle); return v ? v.trim().slice(0, max || 200) : ''; };
    var profil = lire('profil', 8);
    if (profil !== 'pro' && profil !== 'part') profil = '';
    var valeurs = { profil: profil, depart: lire('depart'), arrivee: lire('arrivee'), vehicule: lire('vehicule', 40) };
    var source = $('input[name="source"]', form);
    var src = lire('source', 60);
    if (source && /^[a-z0-9-]+$/.test(src)) source.value = src;
    var prerempli = !!(valeurs.profil || valeurs.depart || valeurs.arrivee || valeurs.vehicule);
    if (valeurs.profil) { var r = $('input[name="profil"][value="' + valeurs.profil + '"]', form); if (r) r.checked = true; }
    majEntreprise(false);
    var champTexte = [['depart', valeurs.depart], ['arrivee', valeurs.arrivee]];
    var selectVehicule = form.vehicule;
    if (valeurs.vehicule && selectVehicule && $$('option', selectVehicule).some(function (o) { return o.value === valeurs.vehicule; })) selectVehicule.value = valeurs.vehicule;
    else valeurs.vehicule = '';
    $$('[data-champ]', form).forEach(function (ch) { var s = $('input, select, textarea', ch); if (s) majEtat(ch, s); });
    function majEtat(ch, s) { ch.classList.toggle('est-rempli', !!(s.value && s.value.trim())); }
    $$('[data-champ] input, [data-champ] select, [data-champ] textarea', form).forEach(function (s) {
      var ch = s.closest('[data-champ]');
      s.addEventListener('input', function () { majEtat(ch, s); effacerErreur(ch); });
      s.addEventListener('change', function () { majEtat(ch, s); effacerErreur(ch); });
    });
    /* le curseur se pose sur le premier champ obligatoire encore vide (pas sur un téléphone :
       le clavier s'ouvrirait et cacherait le haut du formulaire) */
    var premierVide = function () {
      if (!profilChoisi()) return choix[0];
      var ordre = ['depart', 'arrivee', 'nom', 'prenom'];
      for (var i = 0; i < ordre.length; i++) { var c = form[ordre[i]]; if (c && !c.value.trim()) return c; }
      return form.nom;
    };
    if (prerempli) {
      var tactile = window.matchMedia('(pointer: coarse)').matches;
      var placerCurseur = function () { var c = premierVide(); if (c && !tactile) c.focus({ preventScroll: true }); };
      champTexte.forEach(function (paire) { if (form[paire[0]] && paire[1]) form[paire[0]].value = paire[1]; });
      if (avecGsap && !reduit) {
        // tout est lisible dès la première image : un filet rose parcourt seulement les valeurs transmises
        var transmis = [];
        champTexte.forEach(function (paire) { if (paire[1] && form[paire[0]]) transmis.push(form[paire[0]].closest('[data-champ]')); });
        if (valeurs.vehicule && selectVehicule) transmis.push(selectVehicule.closest('[data-champ]'));
        transmis.forEach(function (ch, i) { if (!ch) return; ch.style.setProperty('--delai', (0.35 + i * 0.18) + 's'); ch.classList.add('est-transmis'); });
        setTimeout(placerCurseur, 1400);
      } else {
        setTimeout(placerCurseur, 300);
      }
      $$('[data-champ]', form).forEach(function (ch) { var s = $('input, select, textarea', ch); if (s) majEtat(ch, s); });
    }

    /* validation (états du Form Block Webflow : défaut, erreur, envoyé).
       Un champ vide ou mal rempli s'annonce sur le champ ; « n'a pas pu être envoyée » est réservé
       à un vrai échec d'envoi. */
    var E = 'Erreur' + FINE + ': ';
    var messages = {
      profil: E + 'choisissez «' + NB + 'Professionnel' + NB + '» ou «' + NB + 'Particulier' + NB + '».',
      depart: E + 'indiquez où se trouve le véhicule.',
      arrivee: E + 'indiquez où le véhicule doit être livré.',
      nom: E + 'indiquez votre nom pour que nous sachions à qui répondre.',
      prenom: E + 'indiquez votre prénom.',
      entreprise: E + 'indiquez le nom de votre entreprise.',
      telephone: E + 'indiquez un numéro complet, par exemple 06' + NB + '12' + NB + '34' + NB + '56' + NB + '78, ou avec l’indicatif du pays.',
      email: E + 'indiquez une adresse email valide, par exemple vous@exemple.fr.',
      consentement: E + 'cochez la case pour que nous puissions vous répondre.'
    };
    /* téléphone : un numéro français à 10 chiffres (06 12 34 56 78), ou un numéro avec l'indicatif
       du pays, en +XX ou 00XX (8 à 15 chiffres, norme internationale) */
    var telephoneValide = function (v) {
      var brut = v.trim();
      if (!/^\+?[\d\s.\-()/]+$/.test(brut)) return false;
      var chiffres = brut.replace(/\D/g, '');
      if (brut.charAt(0) === '+') return chiffres.length >= 8 && chiffres.length <= 15;
      if (chiffres.indexOf('00') === 0) return chiffres.length >= 10 && chiffres.length <= 17;
      return chiffres.length === 10 && chiffres.charAt(0) === '0';
    };
    function poserErreur(ch, cle) {
      if (!ch) return;
      ch.classList.add('est-erreur');
      var aide = $('[data-aide]', ch);
      if (aide) { if (!aide.dataset.texte) aide.dataset.texte = aide.textContent; aide.textContent = messages[cle]; aide.classList.add('est-erreur'); }
      $$('input, select, textarea', ch).forEach(function (s) { s.setAttribute('aria-invalid', 'true'); });
    }
    function effacerErreur(ch) {
      if (!ch || !ch.classList.contains('est-erreur')) return;
      ch.classList.remove('est-erreur');
      var aide = $('[data-aide]', ch);
      if (aide && aide.dataset.texte !== undefined) { aide.textContent = aide.dataset.texte; aide.classList.remove('est-erreur'); }
      $$('[aria-invalid]', ch).forEach(function (s) { s.removeAttribute('aria-invalid'); });
    }
    var montrerBandeau = function (texte) {
      texteBandeau.textContent = texte;
      bandeau.hidden = false;
      if (avecGsap && !reduit) G.fromTo(bandeau, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' });
      defilerVers(bandeau, -120);
    };
    var bouton = $('[type="submit"]', form);
    var libelle = $('.bouton__libelle', bouton);
    var libelleInitial = libelle.textContent;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (bouton.disabled) return;
      var erreurs = [];
      var verifier = function (nom, ok) { var ch = form.querySelector('[data-champ="' + nom + '"]'); if (!ok) { poserErreur(ch, nom); erreurs.push(ch); } else effacerErreur(ch); };
      var pro = profilChoisi() === 'pro';
      verifier('profil', !!profilChoisi());
      verifier('depart', form.depart.value.trim().length > 1);
      verifier('arrivee', form.arrivee.value.trim().length > 1);
      verifier('nom', form.nom.value.trim().length > 0);
      verifier('prenom', form.prenom.value.trim().length > 0);
      if (pro) verifier('entreprise', form.entreprise.value.trim().length > 0);
      verifier('telephone', telephoneValide(form.telephone.value));
      verifier('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim()));
      verifier('consentement', form.consentement.checked);
      if (erreurs.length) {
        montrerBandeau((erreurs.length === 1 ? 'Un champ est à compléter ou à corriger.' : 'Plusieurs champs sont à compléter ou à corriger.') + ' Vous pouvez aussi nous appeler au ' + TEL + '.');
        var premier = $('input, select, textarea', erreurs[0]);
        setTimeout(function () { if (premier) premier.focus({ preventScroll: true }); }, 500);
        return;
      }
      bandeau.hidden = true;
      bouton.disabled = true;
      bouton.classList.add('est-envoi');
      libelle.textContent = 'Envoi en cours…';
      setTimeout(function () {
        /* vrai échec d'envoi (dans le prototype : pas de connexion) : état Erreur du Form Block */
        if (navigator.onLine === false) {
          bouton.disabled = false;
          bouton.classList.remove('est-envoi');
          libelle.textContent = libelleInitial;
          montrerBandeau('Votre demande n’a pas pu être envoyée. Réessayez dans un instant, ou appelez-nous au ' + TEL + '.');
          return;
        }
        /* envoyé : le message (role="status") est annoncé et le focus passe sur son titre */
        var montrer = function () {
          carte.hidden = true;
          envoye.hidden = false;
          if (avecGsap && !reduit) G.from($$('[data-envoye] > *'), { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 });
          defilerVers(envoye, -120);
          var t = $('h2', envoye); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
        };
        if (avecGsap && !reduit) G.to(carte, { opacity: 0, y: -16, duration: 0.45, ease: 'power2.in', onComplete: montrer });
        else montrer();
      }, 900);
    });
  })();

  /* ==================================================================
     Animations
     ================================================================== */
  var finAnim = function () { doc.classList.remove('anim'); };
  if (!avecGsap || reduit) {
    finAnim();
    return;
  }
  /* si le délai de secours (3,5 s) a déjà tout affiché, le premier écran ne rejoue pas son entrée */
  var departPose = doc.classList.contains('anim');

  var nombre = function (v, dec) { return dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)); };
  function compter(el, duree, delai) {
    var cible = parseFloat(el.dataset.compte);
    if (isNaN(cible)) return null;
    var dec = parseInt(el.dataset.decimales || '0', 10) || 0;
    var suffixe = (el.dataset.suffixe || '').replace(/&nbsp;/g, NB);
    var o = { v: 0 };
    el.textContent = nombre(0, dec) + suffixe;
    return G.to(o, { v: cible, duration: duree || 1.6, delay: delai || 0, ease: 'power3.out', onUpdate: function () { el.textContent = nombre(o.v, dec) + suffixe; } });
  }

  var mm = G.matchMedia();
  var split = window.SplitText;
  var paliers = PALIERS.map(function (q) { return window.matchMedia(q); });

  /* ce qui est déjà à l'écran au moment où le script démarre n'est jamais masqué :
     seul ce qui est sous la ligne de flottaison part caché, puis entre au défilement */
  var dansLEcran = function (el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };
  var horsEcran = function (liste) { return liste.filter(function (el) { return !dansLEcran(el); }); };

  /* SplitText coupe à chaque <br>, même masqué : les coupures de l'autre format (br-d en mobile,
     br-m sur ordinateur) sont retirées avant la découpe, et la découpe est refaite au changement de palier.
     aria: 'none' : le texte reste du vrai texte, lu normalement par les lecteurs d'écran */
  function lignes(el) {
    if (!split) return G.from(el, { y: 30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    var source = el.innerHTML;
    var instance = null;
    var decouper = function (anime) {
      el.innerHTML = source;
      $$('br', el).forEach(function (b) { if (getComputedStyle(b).display === 'none') b.remove(); });
      instance = split.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'ligne', autoSplit: true, aria: 'none',
        onSplit: function (self) {
          if (!anime) return;
          return G.from(self.lines, { yPercent: 108, duration: 1.15, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
        }
      });
    };
    decouper(true);
    paliers.forEach(function (m) { m.addEventListener('change', function () { if (instance) instance.revert(); decouper(false); }); });
    return instance;
  }

  function revelerTitres(conteneur, exclure) {
    exclure = exclure || [];
    $$('[data-lignes]', conteneur).forEach(function (el) { if (exclure.indexOf(el) > -1 || dansLEcran(el)) return; lignes(el); });
    $$('[data-monte]', conteneur).forEach(function (el) {
      if (exclure.indexOf(el) > -1 || dansLEcran(el)) return;
      G.from(el, { y: 24, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /* ------------------------------------------------ premier écran */
  /* mêmes valeurs que les états de départ de 90-anim.css : aucun saut entre la première image et l'animation */
  var TEXTE = { y: 12, opacity: 0.5 };
  var LETTRES = { yPercent: 30, opacity: 0.5 };
  var ACCENT = { x: -10, opacity: 0.45, filter: 'blur(6px)' };

  /* découpes de départ lues dans la feuille de style (elles changent selon le palier), avant de retirer .anim */
  var decoupes = new Map();
  $$('.hero__surface, .hero-public__photo, .convoyage-fiche__photo').forEach(function (el) {
    var c = getComputedStyle(el).clipPath;
    if (c && c !== 'none') decoupes.set(el, c);
  });
  var insetOuvert = function (clip) {
    var i = clip.indexOf('round');
    var tete = i > -1 ? clip.slice(0, i) : clip;
    return tete.replace(/-?\d*\.?\d+(px|%)?/g, function (m, u) { return '0' + (u || ''); }) + (i > -1 ? clip.slice(i) : '');
  };
  function ouvrir(tl, el, position, duree) {
    var depart = el && decoupes.get(el);
    if (!depart) return;
    G.set(el, { clipPath: depart }); // posé tout de suite, dans la même tâche que le retrait de .anim
    tl.fromTo(el, { clipPath: depart }, { clipPath: insetOuvert(depart), duration: duree, ease: 'expo.inOut', clearProps: 'clipPath' }, position);
  }
  /* titre principal découpé en lettres : une copie invisible garde le texte pour les lecteurs d'écran,
     les lettres animées leur sont masquées */
  function lettres(tl, ligne, position) {
    if (!ligne) return;
    if (!split) { tl.from(ligne, Object.assign({ duration: 1.1 }, LETTRES), position); return; }
    var copie = document.createElement('span');
    copie.className = 'sr';
    copie.textContent = ligne.textContent.replace(/\s+/g, ' ').trim();
    ligne.parentNode.insertBefore(copie, ligne);
    /* autoSplit : la découpe se refait quand la police arrive (le premier écran n'attend pas les polices),
       et l'animation reprend où elle en était */
    split.create(ligne, {
      type: 'words,chars', aria: 'hidden', autoSplit: true,
      onSplit: function (self) { return G.from(self.chars, Object.assign({ duration: 1.1, stagger: 0.025, ease: 'expo.out', delay: position }, LETTRES)); }
    });
  }
  function accent(tl, el, position) {
    if (!el) return;
    tl.fromTo(el, ACCENT, { x: 0, opacity: 1, filter: 'blur(0px)', duration: 1.3, ease: 'power2.out', clearProps: 'filter' }, position);
  }
  function textes(tl, cibles, position) {
    cibles = cibles.filter(Boolean);
    if (cibles.length) tl.from(cibles, Object.assign({ duration: 1, stagger: 0.08 }, TEXTE), position);
  }
  function releves(tl, conteneur, position) {
    if (!conteneur) return;
    $$('[data-compte]', conteneur).forEach(function (el) { compter(el, 1.7, position); });
    var etoiles = $$('.icone--etoile', conteneur);
    if (etoiles.length) tl.from(etoiles, { scale: 0, duration: 0.6, ease: 'back.out(3)', stagger: 0.06 }, position + 0.25);
  }
  function barreHero(tl, barre, position) { if (barre) tl.from(barre, { y: 24, duration: 1.2 }, position); }

  function premierEcran() {
    var tl = G.timeline({ defaults: { ease: 'expo.out' } });
    var hero = $('[data-hero]');
    if (hero) { /* Accueil */
      var img = $('.hero__photo img', hero);
      ouvrir(tl, $('.hero__surface', hero), 0, 1.7);
      if (img) G.set(img, { scale: 1.22 });
      if (img) tl.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 2.6 }, 0);
      lettres(tl, $('.hero__ligne', hero), 0.1);
      accent(tl, $('[data-script]', hero), 0.3);
      textes(tl, [$('.hero__sous-titre', hero)], 0.4);
      textes(tl, $$('.hero__releve', hero), 0.5);
      releves(tl, $('.hero__preuves', hero), 0.5);
      barreHero(tl, $('.hero__barre', hero), 0.55);
      return;
    }
    if (page === 'contact') { /* page de tâche : tout est lisible, la carte se pose */
      var carte = $('[data-carte-formulaire]');
      if (carte) tl.from(carte, { y: 36, duration: 1.3 }, 0.05);
      return;
    }
    var pub = $('[data-hero-public]');
    if (pub) { /* Professionnels, Particuliers, À propos */
      var photo = $('.hero-public__photo', pub);
      var im = photo ? $('img', photo) : null;
      ouvrir(tl, photo, 0.05, 1.5);
      if (im) G.set(im, { scale: 1.25 });
      if (im) tl.fromTo(im, { scale: 1.25 }, { scale: 1, duration: 2.4 }, 0.05);
      lettres(tl, $('.hero-public__ligne', pub), 0.1);
      accent(tl, $('[data-script]', pub), 0.3);
      textes(tl, $$('.hero-public__chapo, .hero-public__lien, .hero-public__signature', pub), 0.35);
      textes(tl, $$('.hero-public__releve, .hero-public__legende', pub), 0.45);
      releves(tl, $('.hero-public__preuves', pub), 0.45);
      barreHero(tl, $('.hero-public__barre', pub), 0.5);
      return;
    }
    var conv = $('[data-convoyages-hero]') || $('[data-convoyage-fiche]');
    if (conv) { /* Convoyages et fiches */
      var ph = $('.convoyage-fiche__photo', conv);
      var pim = ph ? $('img', ph) : null;
      ouvrir(tl, ph, 0.05, 1.5);
      if (pim) G.set(pim, { scale: 1.2, filter: 'saturate(0) brightness(1.4)' });
      if (pim) tl.fromTo(pim, { scale: 1.2, filter: 'saturate(0) brightness(1.4)' }, { scale: 1, filter: 'saturate(1) brightness(1)', duration: 2.4, ease: 'power2.out', clearProps: 'filter' }, 0.1);
      lettres(tl, $('.convoyages-hero__ligne, .convoyage-fiche__ligne', conv), 0.1);
      accent(tl, $('[data-script]', conv), 0.3);
      textes(tl, $$('.convoyages-hero__chapo, .convoyages-hero__crochet, .convoyage-fiche__chapo, .convoyage-fiche__crochet, .convoyage-fiche__legende', conv), 0.35);
      textes(tl, $$('.convoyage-fiche__donnees .ligne-fiche', conv), 0.45);
    }
  }

  /* le premier écran démarre tout de suite, sans attendre les polices ; le reste attend les polices */
  finAnim();
  if (departPose) premierEcran();
  document.fonts.ready.then(function () {
    if (page === 'accueil') pageAccueil();
    if (page === 'professionnels' || page === 'particuliers') pagePublic();
    if (page === 'a-propos') pageAPropos();
    if (page === 'contact') pageContact();
    if (page === 'convoyages' || page === 'convoyage') pageConvoyages();
    animerPied();
    ST.refresh();
  });

  /* -------------------------------------------------- compteur 48 h */
  function animerCompteur(cpt) {
    if (!cpt || dansLEcran(cpt)) return;
    var visible = $$('.compteur__svg', cpt).filter(function (s) { return s.getBoundingClientRect().width > 0; })[0];
    if (!visible) return;
    var aiguille = $('.compteur__aiguille', visible);
    var grads = $$('.compteur__grad', visible);
    var heures = $$('.compteur__heure', visible);
    var lecture = $('[data-compteur-lecture]', cpt);
    var box = visible.viewBox.baseVal;
    var c = box.width / 2;
    aiguille.removeAttribute('style');
    G.set(aiguille, { rotation: 0, svgOrigin: c + ' ' + c });
    G.set(grads, { opacity: 0.18 });
    G.set(heures, { opacity: 0.25 });
    lecture.textContent = '0' + NB + 'h';
    var etat = { h: 0 };
    var tl = G.timeline({ paused: true });
    tl.to(etat, {
      h: 48, duration: 2.8, ease: 'power3.inOut',
      onUpdate: function () {
        G.set(aiguille, { rotation: etat.h * 270 / 48 });
        lecture.textContent = Math.round(etat.h) + NB + 'h';
        grads.forEach(function (g) { if (!g._allume && +g.dataset.h <= etat.h + 0.01) { g._allume = true; G.to(g, { opacity: 1, duration: 0.35 }); } });
        heures.forEach(function (t) { var h = +t.textContent; if (!t._allume && h <= etat.h + 0.01) { t._allume = true; G.to(t, { opacity: 1, duration: 0.4 }); } });
      }
    })
      .to(aiguille, { rotation: 273, duration: 0.18, ease: 'power2.out' })
      .to(aiguille, { rotation: 270, duration: 0.9, ease: 'elastic.out(1, 0.35)' })
      .fromTo($('.compteur__libelle', cpt), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.6);
    ST.create({ trigger: cpt, start: 'top 72%', once: true, onEnter: function () { tl.play(); } });
  }

  /* ---------------------------------------------- pied */
  function animerPied() {
    var pied = $('[data-pied]');
    if (!pied) return;
    var cibles = horsEcran($$('.pied__marque, .pied__colonne, .pied__bas', pied));
    if (cibles.length) G.from(cibles, { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: pied, start: 'top 92%', once: true } });
  }

  /* ---------------------------------------------- barres sous la ligne de flottaison (entrée) */
  function animerBarre(form, declencheur) {
    if (!form || dansLEcran(form)) return;
    var tl = G.timeline({ scrollTrigger: { trigger: declencheur || form, start: 'top 85%', once: true } });
    tl.from(form, { y: 46, opacity: 0, duration: 1.2, ease: 'expo.out' })
      .from($$('.barre__champ, .barre__vers, .barre__envoi', form), { y: 10, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06 }, '-=0.85');
    return tl;
  }

  /* ---------------------------------------------- pages */
  function pageAccueil() {
    var hero = $('[data-hero]');
    var surface = $('.hero__surface', hero);
    var img = $('.hero__photo img', hero);
    var titre = $('.hero__ligne', hero);

    /* parallaxe à la sortie du hero */
    G.to(img, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: surface, start: 'top top', end: 'bottom top', scrub: true } });
    G.to($('.hero__titre', hero), { yPercent: -18, opacity: 0.3, ease: 'none', scrollTrigger: { trigger: surface, start: 'top top', end: 'bottom 20%', scrub: true } });

    /* manifeste : mots qui s'allument (épinglé sur ordinateur, à partir de 992 px) */
    var mani = $('[data-manifeste]');
    var phrase = $('[data-mots]', mani);
    var photoMani = $('.manifeste__photo img', mani);
    var sig = $('.manifeste__signature', mani);
    var chapo = $('.manifeste__chapo', mani);
    if (split && mani && !dansLEcran(mani)) {
      var mots = split.create(phrase, { type: 'words', aria: 'none' });
      mm.add(ORDI, function () {
        G.set(mots.words, { opacity: 0.14 });
        var t = G.timeline({ scrollTrigger: { trigger: mani, start: 'top top', end: '+=85%', pin: true, scrub: 0.6, anticipatePin: 1 } });
        t.to(mots.words, { opacity: 1, stagger: 0.14, ease: 'none', duration: 0.5 }, 0)
          .fromTo(photoMani, { scale: 1.16 }, { scale: 1, ease: 'none', duration: 1.4 }, 0)
          .from(chapo, { y: 24, opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.8)
          .from(sig, { y: 24, opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.95);
        return function () { G.set(mots.words, { clearProps: 'opacity' }); };
      });
      mm.add(REPLIE, function () {
        G.set(mots.words, { opacity: 0.14 });
        G.to(mots.words, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: phrase, start: 'top 85%', end: 'bottom 45%', scrub: 0.5 } });
        G.from(chapo, { y: 20, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: chapo, start: 'top 92%', once: true } });
        G.from(sig, { y: 20, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: sig, start: 'top 92%', once: true } });
        G.fromTo(photoMani, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: photoMani, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }

    /* deux publics : panneaux qui s'ouvrent, parallaxe interne */
    $$('[data-panneau]').forEach(function (p) {
      var im = $('.panneau__photo img', p);
      G.fromTo(im, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.12, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
      if (dansLEcran(p)) return;
      var r = getComputedStyle(p).borderTopLeftRadius;
      G.fromTo(p, { clipPath: 'inset(16% 0% 0% 0% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.5, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: p, start: 'top 88%', once: true } });
      G.from($$('.panneau__titre, .panneau__phrase, .panneau__lien', p), { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: p, start: 'top 70%', once: true } });
    });

    /* le trajet : panneau, route, étapes, compteur */
    var trajet = $('[data-trajet]');
    if (trajet) {
      var liste = $('[data-etapes]', trajet);
      var route = $('.etapes__route', liste);
      G.fromTo(route, { scaleY: 0 }, { scaleY: 1, ease: 'none', transformOrigin: 'top', scrollTrigger: { trigger: liste, start: 'top 72%', end: 'bottom 62%', scrub: 0.6 } });
      if (!dansLEcran(trajet)) {
        var rt = getComputedStyle(trajet).borderTopLeftRadius;
        G.fromTo(trajet, { clipPath: 'inset(5% 3% 5% 3% round ' + rt + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + rt + ')', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: trajet, start: 'top 85%', once: true } });
      }
      $$('[data-etape]', liste).forEach(function (et) {
        if (dansLEcran(et)) return;
        var t = G.timeline({ scrollTrigger: { trigger: et, start: 'top 68%', once: true } });
        t.from($('.etape__anneau', et), { scale: 0, duration: 0.7, ease: 'back.out(3)' })
          .from($$('.etape__nom, .etape__detail', et), { x: -16, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, 0.05);
        if (et.classList.contains('etape--destination')) t.fromTo($('.etape__anneau', et), { boxShadow: '0 0 0 0 rgba(228,199,189,.8)' }, { boxShadow: '0 0 0 14px rgba(228,199,189,0)', duration: 1.2, ease: 'power2.out' }, 0.4);
      });
      animerCompteur($('[data-compteur]', trajet));
      var zone = horsEcran($$('.trajet__zone', trajet));
      if (zone.length) G.from(zone, { y: 16, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: zone[0], start: 'top 95%', once: true } });
    }

    animerCartesConvoyages($('[data-convoyages-une]'));
    animerAvis($('[data-avis]'));
    animerEquipe($('[data-equipe]'));
    animerQuestions($('.questions'));
    animerFin($('[data-fin]'));
    revelerTitres(document, [titre, $('.hero__sous-titre', hero)]);
  }

  function parallaxeHeroPublic() {
    var photo = $('[data-hero-public] .hero-public__photo');
    var img = photo ? $('img', photo) : null;
    if (img) G.to(img, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: photo, start: 'top top', end: 'bottom top', scrub: true } });
  }

  function animerFiche(sec) {
    if (!sec) return;
    if (!dansLEcran(sec)) {
      var r = getComputedStyle(sec).borderTopLeftRadius;
      G.fromTo(sec, { clipPath: 'inset(8% 4% 8% 4% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: sec, start: 'top 85%', once: true } });
    }
    horsEcran($$('.ligne-fiche', sec)).forEach(function (l, i) {
      G.from(l, { '--trait': 0, opacity: 0, y: 16, duration: 1, ease: 'expo.out', delay: (i % 4) * 0.06, scrollTrigger: { trigger: l, start: 'top 92%', once: true } });
    });
  }

  function animerDeroule(sec) {
    if (!sec || dansLEcran(sec)) return;
    var r = getComputedStyle(sec).borderTopLeftRadius;
    G.fromTo(sec, { clipPath: 'inset(4% 3% 4% 3% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: sec, start: 'top 85%', once: true } });
    var photos = $('.deroule__photos', sec);
    G.fromTo(photos, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: photos, start: 'top 85%', once: true } });
    G.fromTo($$('.deroule__photo', sec), { yPercent: -4, scale: 1.1 }, { yPercent: 4, scale: 1.1, ease: 'none', scrollTrigger: { trigger: photos, start: 'top bottom', end: 'bottom top', scrub: true } });
    var route = $('.mission', sec);
    var filet = $('.mission__filet', sec);
    var vertical = route.classList.contains('mission--verticale');
    G.fromTo(filet, vertical ? { scaleY: 0 } : { scaleX: 0 }, { scaleX: 1, scaleY: 1, transformOrigin: vertical ? 'top' : 'left', duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: route, start: 'top 85%', once: true } });
    $$('[data-mission-etape]', sec).forEach(function (et, i) {
      var t = G.timeline({ scrollTrigger: { trigger: route, start: 'top 85%', once: true }, delay: 0.25 + i * 0.16 });
      t.from($('.mission__anneau', et), { scale: 0, duration: 0.7, ease: 'back.out(3)' })
        .from($$('.mission__nom, .mission__detail', et), { y: 16, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity' }, 0.1);
    });
    G.from($('.mission__disque', sec), { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(2.2)', delay: 0.55, scrollTrigger: { trigger: route, start: 'top 85%', once: true } });
  }

  function animerPreparez(sec) {
    if (!sec || dansLEcran(sec)) return;
    var barre = $('form[data-barre="rempli"]', sec);
    var reperes = $$('.piece__repere', sec);
    var pieces = $$('.piece', sec);
    G.set(reperes, { scaleY: 0, transformOrigin: 'top' });
    G.set(pieces, { opacity: 0, y: 16 });
    var lance = false;
    var suite = function () {
      G.to(reperes, { scaleY: 1, duration: 0.6, ease: 'power3.out', stagger: 0.12 });
      G.to(pieces, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12, delay: 0.25 });
    };
    if (barre) $$('input[data-exemple]', barre).forEach(function (c) { if (c.dataset.exemple) c.value = ''; });
    ST.create({ trigger: sec, start: 'top 70%', once: true, onEnter: function () { if (lance) return; lance = true; if (barre) remplirBarre(barre, suite); else suite(); } });
  }

  /* les cartes de convoyage arrivent par rangées ; chaque photo se développe comme un tirage.
     Les cartes déjà à l'écran au chargement restent telles quelles (plus de clignotement). */
  function animerCartesConvoyages(conteneur) {
    if (!conteneur) return;
    $$('.convoyages-grille', conteneur).forEach(function (g) {
      var cartes = horsEcran($$('[data-carte-convoyage]', g));
      if (!cartes.length) return;
      G.set(cartes, { y: 40, opacity: 0 });
      ST.batch(cartes, { start: 'top 90%', once: true, onEnter: function (lot) {
        G.to(lot, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.09 });
        lot.forEach(function (c, i) {
          var img = $('img', c);
          if (img) G.fromTo(img, { scale: 1.16, filter: 'saturate(0) brightness(1.4)' }, { scale: 1, filter: 'saturate(1) brightness(1)', duration: 1.9, ease: 'power2.out', delay: i * 0.09, clearProps: 'transform,filter' });
        });
      } });
    });
  }

  /* ------------------------------------------- convoyages (collection CMS) */
  function pageConvoyages() {
    var ligne = $('.convoyages-hero__ligne, .convoyage-fiche__ligne');
    animerCartesConvoyages(document);
    var barre = $('.convoyage-suite__barre');
    if (barre) animerBarre(barre, barre);
    revelerTitres(document, ligne ? [ligne] : []);
  }

  function pagePublic() {
    parallaxeHeroPublic();
    animerFiche($('[data-essentiel]'));
    animerDeroule($('[data-mission]'));
    animerPreparez($('[data-preparez]'));
    animerQuestions($('.questions-public'));
    animerAvis($('[data-avis]'));
    animerFin($('[data-fin]'));
    revelerTitres(document, [$('.hero-public__ligne')]);
  }

  /* ------------------------------------------------------------ À propos */
  function animerJalons(sec) {
    var liste = $('[data-jalons]', sec);
    if (!liste) return;
    var filet = $('.jalons__filet', liste);
    var jalons = $$('[data-jalon]', liste);
    mm.add(ORDI, function () {
      G.set(jalons, { opacity: 0.12 });
      G.set(filet, { scaleX: 0, transformOrigin: 'left' });
      var tl = G.timeline({ scrollTrigger: { trigger: liste, start: 'top 80%', end: 'bottom 55%', scrub: 0.6 } });
      tl.to(filet, { scaleX: 1, ease: 'none', duration: 3 }, 0);
      jalons.forEach(function (j, i) { tl.to(j, { opacity: 1, duration: 0.5, ease: 'none' }, i * 0.95); });
      var auj = $('.jalon--aujourdhui .jalon__halo', liste);
      if (auj) ST.create({ trigger: liste, start: 'bottom 60%', once: true, onEnter: function () { G.fromTo(auj, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(2.5)' }); } });
      return function () { G.set(jalons, { clearProps: 'opacity' }); G.set(filet, { clearProps: 'transform' }); };
    });
    mm.add(REPLIE, function () {
      if (dansLEcran(liste)) return;
      G.from(jalons, { x: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: liste, start: 'top 85%', once: true } });
    });
  }

  function pageAPropos() {
    parallaxeHeroPublic();
    var parcours = $('.parcours');
    var planche = $('.parcours__photo', parcours);
    if (planche) {
      var r = getComputedStyle(planche).borderTopLeftRadius;
      if (!dansLEcran(planche)) G.fromTo(planche, { clipPath: 'inset(10% 6% 10% 6% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: planche, start: 'top 85%', once: true } });
      G.fromTo($('img', planche), { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: planche, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    animerJalons(parcours);
    horsEcran($$('.exigence .ligne-fiche, .exigence__intro')).forEach(function (l, i) {
      G.from(l, { y: 18, opacity: 0, duration: 1, ease: 'expo.out', delay: (i % 2) * 0.08, scrollTrigger: { trigger: l, start: 'top 92%', once: true } });
    });
    var eq = $('[data-equipe-ap]');
    if (eq && !dansLEcran(eq)) {
      var re = getComputedStyle(eq).borderTopLeftRadius;
      G.fromTo(eq, { clipPath: 'inset(0% 100% 0% 0% round ' + re + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + re + ')', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: eq, start: 'top 82%', once: true } });
      G.from($('.equipe-ap__portrait img', eq), { scale: 1.2, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: eq, start: 'top 70%', once: true } });
      $$('.equipe-ap__engagements .ligne-fiche', eq).forEach(function (l) { G.from(l, { y: 18, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 92%', once: true } }); });
    }
    animerFin($('[data-fin]'));
    revelerTitres(document, [$('.hero-public__ligne')]);
  }

  /* ------------------------------------------------------------- Contact */
  function pageContact() {
    // page de tâche : titre, numéro et formulaire lisibles dès la première image ; le mouvement ne cache rien
    var ligne = $('.contact .hero-public__ligne');
    horsEcran($$('.coordonnees .ligne-fiche')).forEach(function (l) { G.from(l, { y: 18, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 94%', once: true } }); });
    revelerTitres(document, [ligne]);
  }

  function animerAvis(sec) {
    if (!sec || dansLEcran(sec)) return;
    /* la note passe à « 0,0 » maintenant, sous la ligne de flottaison, et compte à l'entrée */
    var note = $('.note-google__note', sec);
    var compte = note ? compter(note, 1.6) : null;
    if (compte) compte.pause();
    ST.create({ trigger: sec, start: 'top 75%', once: true, onEnter: function () { if (compte) compte.play(); } });
    G.from($$('.note-google .icone--etoile', sec), { scale: 0, duration: 0.6, ease: 'back.out(3)', stagger: 0.07, scrollTrigger: { trigger: sec, start: 'top 72%', once: true } });
    G.from($$('[data-carte]', sec), { x: 120, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: $('[data-piste]', sec), start: 'top 88%', once: true } });
    G.from($$('.avis__actions > *, .avis__bas-mobile > *', sec), { y: 16, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: sec, start: 'top 70%', once: true } });
  }

  function animerEquipe(sec) {
    if (!sec || dansLEcran(sec)) return;
    var r = getComputedStyle(sec).borderTopLeftRadius;
    var filet = $('.equipe__filet', sec);
    var horizontal = filet && filet.offsetWidth > filet.offsetHeight;
    var t = G.timeline({ scrollTrigger: { trigger: sec, start: 'top 82%', once: true } });
    t.fromTo(sec, { clipPath: 'inset(0% 100% 0% 0% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath' })
      .from($('.equipe__portrait img', sec), { scale: 1.25, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.5)
      .from($$('.equipe__legende, .equipe__membres li', sec), { y: 18, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.9)
      .from(filet, Object.assign(horizontal ? { scaleX: 0 } : { scaleY: 0 }, { duration: 1.1, ease: 'expo.inOut' }), 0.8)
      .from($$('.equipe__tel > *', sec), { y: 18, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 1.1);
  }

  /* questions : le titre reste dans sa colonne (plus de glissement latéral au défilement) */
  function animerQuestions(sec) {
    if (!sec || !sec.querySelector('[data-question]') || dansLEcran(sec)) return;
    G.from($$('[data-question]', sec), { y: 28, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: $('[data-questions]', sec), start: 'top 82%', once: true } });
    G.from($$('.questions-public__cote > *', sec), { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
  }

  function animerFin(sec) {
    if (!sec) return;
    var surface = $('.encastre', sec);
    var img = $('img', surface);
    if (img) G.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: surface, start: 'top bottom', end: 'bottom bottom', scrub: true } });
    if (!dansLEcran(surface)) {
      var r = getComputedStyle(surface).borderTopLeftRadius;
      G.fromTo(surface, { clipPath: 'inset(6% 4% 0% 4% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: surface, start: 'top 88%', once: true } });
    }
    var barre = $('.barre', sec);
    animerBarre(barre, barre);
  }
})();
