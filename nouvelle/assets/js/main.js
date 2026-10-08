/* OA Convoyage — prototype animé de la Nouvelle DA
   Interactions (sans dépendance) puis animations (GSAP + ScrollTrigger + SplitText, Lenis).
   Le contenu reste visible si un script échoue : les états de départ sont posés par GSAP. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var estMobile = function () { return window.matchMedia('(max-width: 1023px)').matches; };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var page = document.body.dataset.page;
  var G = window.gsap;
  var ST = window.ScrollTrigger;
  var avecGsap = !!(G && ST);
  var NB = ' ';
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
  $$('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    a.addEventListener('click', function (e) {
      var cible = document.getElementById(id);
      if (!cible) return;
      e.preventDefault();
      defilerVers(cible);
      if (id === 'contenu') cible.focus({ preventScroll: true });
    });
  });
  var surDefilement = function (fn) {
    if (lenis) lenis.on('scroll', function (l) { fn(l.scroll); });
    else window.addEventListener('scroll', function () { fn(window.scrollY); }, { passive: true });
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
    document.body.appendChild(fixe);
    var dernier = 0;
    var seuil = function () {
      var hero = $('[data-hero]') || $('.hero-public') || entete;
      return Math.max(240, hero.offsetTop + hero.offsetHeight * 0.75);
    };
    var visible = false;
    var montrer = function (oui) {
      if (oui === visible) return;
      visible = oui;
      fixe.classList.toggle('est-visible', oui);
      if (oui) { fixe.removeAttribute('inert'); fixe.removeAttribute('aria-hidden'); }
      else { fixe.setAttribute('inert', ''); fixe.setAttribute('aria-hidden', 'true'); }
    };
    surDefilement(function (y) {
      if (y < seuil()) montrer(false);
      else if (y < dernier - 6) montrer(true);
      else if (y > dernier + 6) montrer(false);
      dernier = y;
    });
    fixe.querySelector('[data-menu-ouvrir]') && fixe.querySelector('[data-menu-ouvrir]').addEventListener('click', ouvrirMenu);
  })();

  /* -------------------------------------------------------- menu mobile */
  var menu = $('[data-menu]');
  var dernierFocus = null;
  function ouvrirMenu() {
    if (!menu) return;
    dernierFocus = document.activeElement;
    menu.hidden = false;
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
  (function () {
    var barre = $('[data-barre-action]');
    if (!barre || page === 'contact') return;
    var barres = $$('form.barre');
    var visibles = new Set();
    var maj = function () {
      var montrer = estMobile() && visibles.size === 0 && (!menu || menu.hidden);
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
    setTimeout(maj, 600);
  })();

  /* ---------------------------------------------------------- questions */
  $$('[data-question]').forEach(function (q) {
    var bouton = $('.question__bouton', q);
    bouton.addEventListener('click', function () {
      var ouvert = q.classList.toggle('question--ouverte');
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      if (ST) setTimeout(function () { ST.refresh(); }, 600);
    });
  });

  /* ---------------------------------------------------- pistes (avis) */
  $$('[data-piste]').forEach(function (piste) {
    var nom = piste.dataset.piste;
    var controles = $$('[data-defilement="' + nom + '"]');
    var cartes = $$('[data-carte]', piste);
    if (!cartes.length) return;
    var pas = function () {
      if (cartes.length > 1) return cartes[1].offsetLeft - cartes[0].offsetLeft;
      return cartes[0].getBoundingClientRect().width;
    };
    var position = function () { return Math.round(piste.scrollLeft / pas()); };
    var maj = function () {
      var p = Math.min(cartes.length - 1, position());
      var max = piste.scrollWidth - piste.clientWidth - 2;
      controles.forEach(function (ctl) {
        $('[data-pos]', ctl).textContent = String(p + 1);
        $('[data-total]', ctl).textContent = String(cartes.length);
        $('[data-prec]', ctl).disabled = piste.scrollLeft <= 2;
        $('[data-suiv]', ctl).disabled = piste.scrollLeft >= max;
      });
    };
    var aller = function (i) {
      i = Math.max(0, Math.min(cartes.length - 1, i));
      piste.scrollTo({ left: i * pas(), behavior: reduit ? 'auto' : 'smooth' });
    };
    controles.forEach(function (ctl) {
      $('[data-prec]', ctl).addEventListener('click', function () { aller(position() - 1); });
      $('[data-suiv]', ctl).addEventListener('click', function () { aller(position() + 1); });
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
    window.addEventListener('pointerup', function () {
      if (!appui) return;
      var bouge = appui.bouge;
      appui = null;
      piste.classList.remove('est-glisse');
      if (bouge) aller(position());
    });
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
  /* la voiture roule d'étape en étape et s'arrête sur chacune ; un clic l'envoie à l'étape choisie,
     le survol ne change rien (le texte perd seulement sa transparence) */
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
    var enVue = false, clavier = false;
    var minuterie = null, trajet = null, boucle = null;

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
    var enMarche = function () { return anime && enVue && !clavier && !document.hidden; };
    var arreter = function () { if (minuterie) { minuterie.kill(); minuterie = null; } };
    var programmer = function (delai) {
      arreter();
      if (enMarche()) minuterie = G.delayedCall(delai, avancer);
    };
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
    var aller = function (n) {
      arreter();
      if (boucle) { boucle.kill(); boucle = null; G.set(disque, { scale: 1, opacity: 1 }); }
      activer(n, 'clic');
      rouler(n, Math.min(1.6, 0.45 + 0.28 * Math.abs(n - etat.p)), 'power3.inOut', function () { programmer(ARRET + 1.2); });
    };

    boutons.forEach(function (b, n) { b.addEventListener('click', function () { aller(n); }); });
    /* au clavier, la voiture attend : on lit sans que l'étape change */
    route.addEventListener('focusin', function (e) {
      if (e.target.matches && e.target.matches(':focus-visible')) { clavier = true; arreter(); }
    });
    route.addEventListener('focusout', function (e) {
      if (!route.contains(e.relatedTarget)) { clavier = false; if (!trajet && !boucle) programmer(ARRET); }
    });
    var io = new IntersectionObserver(function (e) {
      enVue = e[0].isIntersecting;
      if (!enVue) arreter();
      else if (!minuterie && !trajet && !boucle) programmer(ARRET);
    }, { threshold: 0.35 });
    io.observe(route);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) arreter();
      else if (!minuterie && !trajet && !boucle) programmer(ARRET);
    });
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
    var bandeau = $('[data-bandeau]', form);
    var carte = $('[data-carte-formulaire]');
    var envoye = $('[data-envoye]');
    var majEntreprise = function (anime) {
      var pro = form.profil && form.profil.value === 'pro';
      if (!entreprise) return;
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

    /* pré-remplissage depuis une barre de demande */
    var valeurs = { profil: params.get('profil'), depart: params.get('depart'), arrivee: params.get('arrivee'), vehicule: params.get('vehicule') };
    var source = $('input[name="source"]', form);
    if (source && params.get('source')) source.value = params.get('source');
    var prerempli = !!(valeurs.profil || valeurs.depart || valeurs.arrivee || valeurs.vehicule);
    if (valeurs.profil) { var r = $('input[name="profil"][value="' + valeurs.profil + '"]', form); if (r) r.checked = true; }
    majEntreprise(false);
    var champTexte = [['depart', valeurs.depart], ['arrivee', valeurs.arrivee]];
    var selectVehicule = form.vehicule;
    if (valeurs.vehicule && selectVehicule) selectVehicule.value = valeurs.vehicule;
    $$('[data-champ]', form).forEach(function (ch) { var s = $('input, select, textarea', ch); if (s) majEtat(ch, s); });
    function majEtat(ch, s) { ch.classList.toggle('est-rempli', !!(s.value && s.value.trim())); }
    $$('[data-champ] input, [data-champ] select, [data-champ] textarea', form).forEach(function (s) {
      var ch = s.closest('[data-champ]');
      s.addEventListener('input', function () { majEtat(ch, s); effacerErreur(ch); });
      s.addEventListener('change', function () { majEtat(ch, s); effacerErreur(ch); });
    });
    if (prerempli) {
      var focusNom = function () { var nom = form.nom; if (nom) nom.focus({ preventScroll: true }); };
      champTexte.forEach(function (paire) { if (form[paire[0]] && paire[1]) form[paire[0]].value = paire[1]; });
      if (avecGsap && !reduit) {
        // tout est lisible dès la première image : un filet rose parcourt seulement les valeurs transmises
        var transmis = [];
        champTexte.forEach(function (paire) { if (paire[1] && form[paire[0]]) transmis.push(form[paire[0]].closest('[data-champ]')); });
        if (valeurs.vehicule && selectVehicule) transmis.push(selectVehicule.closest('[data-champ]'));
        transmis.forEach(function (ch, i) { if (!ch) return; ch.style.setProperty('--delai', (0.35 + i * 0.18) + 's'); ch.classList.add('est-transmis'); });
        setTimeout(focusNom, 1400);
      } else {
        setTimeout(focusNom, 300);
      }
      $$('[data-champ]', form).forEach(function (ch) { var s = $('input, select, textarea', ch); if (s) majEtat(ch, s); });
    }

    /* validation (états du Form Block Webflow : défaut, erreur, envoyé) */
    var messages = {
      profil: 'Erreur : choisissez « Professionnel » ou « Particulier ».',
      depart: 'Erreur : indiquez où se trouve le véhicule.',
      arrivee: 'Erreur : indiquez où le véhicule doit être livré.',
      nom: 'Erreur : indiquez votre nom pour que nous sachions à qui répondre.',
      prenom: 'Erreur : indiquez votre prénom.',
      entreprise: 'Erreur : indiquez le nom de votre entreprise.',
      telephone: 'Erreur : indiquez un numéro de téléphone à 10 chiffres pour être rappelé.',
      email: 'Erreur : indiquez une adresse email valide, par exemple vous@exemple.fr.',
      consentement: 'Erreur : cochez la case pour que nous puissions vous répondre.'
    };
    function poserErreur(ch, cle) {
      if (!ch) return;
      ch.classList.add('est-erreur');
      var aide = $('[data-aide]', ch);
      if (aide) { if (!aide.dataset.texte) aide.dataset.texte = aide.textContent; aide.textContent = messages[cle]; aide.classList.add('est-erreur'); }
      var s = $('input, select, textarea', ch);
      if (s) s.setAttribute('aria-invalid', 'true');
    }
    function effacerErreur(ch) {
      if (!ch || !ch.classList.contains('est-erreur')) return;
      ch.classList.remove('est-erreur');
      var aide = $('[data-aide]', ch);
      if (aide && aide.dataset.texte !== undefined) { aide.textContent = aide.dataset.texte; aide.classList.remove('est-erreur'); }
      $$('[aria-invalid]', ch).forEach(function (s) { s.removeAttribute('aria-invalid'); });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var erreurs = [];
      var verifier = function (nom, ok) { var ch = form.querySelector('[data-champ="' + nom + '"]'); if (!ok) { poserErreur(ch, nom); erreurs.push(ch); } else effacerErreur(ch); };
      var pro = form.profil && form.profil.value === 'pro';
      verifier('profil', !!form.profil.value);
      verifier('depart', form.depart.value.trim().length > 1);
      verifier('arrivee', form.arrivee.value.trim().length > 1);
      verifier('nom', form.nom.value.trim().length > 0);
      verifier('prenom', form.prenom.value.trim().length > 0);
      if (pro) verifier('entreprise', form.entreprise.value.trim().length > 0);
      verifier('telephone', form.telephone.value.replace(/\D/g, '').length >= 10);
      verifier('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim()));
      verifier('consentement', form.consentement.checked);
      if (erreurs.length) {
        var n = erreurs.length;
        bandeau.querySelector('[data-bandeau-texte]').textContent = 'Votre demande n’a pas pu être envoyée. ' + (n === 1 ? 'Corrigez le champ signalé' : 'Corrigez les ' + (n === 2 ? 'deux' : n === 3 ? 'trois' : n === 4 ? 'quatre' : n) + ' champs signalés') + ', ou appelez-nous au 06 08 57 23 14.';
        bandeau.hidden = false;
        if (avecGsap && !reduit) G.fromTo(bandeau, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' });
        defilerVers(bandeau, -120);
        var premier = $('input, select, textarea', erreurs[0]);
        setTimeout(function () { if (premier) premier.focus({ preventScroll: true }); }, 500);
        return;
      }
      bandeau.hidden = true;
      var bouton = $('[type="submit"]', form);
      bouton.disabled = true;
      bouton.classList.add('est-envoi');
      $('.bouton__libelle', bouton).textContent = 'Envoi en cours';
      setTimeout(function () {
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

  /* SplitText coupe à chaque <br>, même masqué : les coupures de l'autre format (br-d en mobile,
     br-m sur ordinateur) sont retirées avant la découpe, et la découpe est refaite au changement de format */
  var formatMobile = window.matchMedia('(max-width: 1023px)');
  function lignes(el, opts) {
    opts = opts || {};
    if (!split) return G.from(el, { y: 30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: opts.st });
    var source = el.innerHTML;
    var instance = null;
    var decouper = function (anime) {
      el.innerHTML = source;
      $$('br', el).forEach(function (b) { if (getComputedStyle(b).display === 'none') b.remove(); });
      instance = split.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'ligne', autoSplit: true,
        onSplit: function (self) {
          if (!anime) return;
          return G.from(self.lines, { yPercent: 108, duration: opts.duree || 1.15, ease: 'expo.out', stagger: opts.stagger || 0.09, delay: opts.delai || 0, scrollTrigger: opts.st === false ? undefined : (opts.st || { trigger: el, start: 'top 86%', once: true }) });
        }
      });
    };
    decouper(true);
    formatMobile.addEventListener('change', function () { if (instance) instance.revert(); decouper(false); });
    return instance;
  }

  function revelerTitres(conteneur, exclure) {
    $$('[data-lignes]', conteneur).forEach(function (el) { if (exclure && exclure.indexOf(el) > -1) return; lignes(el); });
    $$('[data-monte]', conteneur).forEach(function (el) {
      if (exclure && exclure.indexOf(el) > -1) return;
      G.from(el, { y: 24, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /* -------------------------------------------------- compteur 48 h */
  function animerCompteur(cpt) {
    if (!cpt) return;
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

  /* ---------------------------------------------- en-tête et pied */
  function animerPied() {
    var pied = $('[data-pied]');
    if (!pied) return;
    G.from($$('.pied__marque, .pied__colonne, .pied__bas', pied), { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: pied, start: 'top 92%', once: true } });
  }

  /* ---------------------------------------------- barres (entrée) */
  function animerBarre(form, delai, declencheur) {
    if (!form) return;
    var tl = G.timeline({ delay: delai || 0, scrollTrigger: declencheur ? { trigger: declencheur, start: 'top 85%', once: true } : undefined });
    tl.from(form, { y: 46, opacity: 0, duration: 1.2, ease: 'expo.out' })
      .from($$('.barre__champ, .barre__vers, .barre__envoi', form), { y: 10, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06 }, '-=0.85');
    return tl;
  }

  /* ---------------------------------------------- pages */
  document.fonts.ready.then(function () {
    finAnim();
    if (page === 'accueil') pageAccueil();
    if (page === 'professionnels' || page === 'particuliers') pagePublic();
    if (page === 'a-propos') pageAPropos();
    if (page === 'contact') pageContact();
    if (page === 'convoyages' || page === 'convoyage') pageConvoyages();
    animerPied();
    ST.refresh();
  });

  function pageAccueil() {
    var hero = $('[data-hero]');
    var surface = $('.hero__surface', hero);
    var img = $('.hero__photo img', hero);
    var titre = $('.hero__ligne', hero);
    var accent = $('[data-script]', hero);
    var rayon = estMobile() ? 28 : 40;
    var tl = G.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo(surface, { clipPath: 'inset(9% 7% 9% 7% round ' + rayon + 'px)' }, { clipPath: 'inset(0% 0% 0% 0% round ' + rayon + 'px)', duration: 1.7, ease: 'expo.inOut' }, 0)
      .fromTo(img, { scale: 1.22 }, { scale: 1, duration: 2.6 }, 0)
      .from($('.entete', surface), { y: -18, opacity: 0, duration: 1 }, 0.8);
    if (split) {
      var s = split.create(titre, { type: 'chars', mask: 'chars' });
      tl.from(s.chars, { yPercent: 110, duration: 1.2, stagger: 0.035 }, 0.75);
    } else tl.from(titre, { y: 40, opacity: 0, duration: 1.2 }, 0.75);
    tl.fromTo(accent, { clipPath: 'inset(-20% 100% -30% -5%)', filter: 'blur(8px)', opacity: 0.4 }, { clipPath: 'inset(-20% -5% -30% -5%)', filter: 'blur(0px)', opacity: 1, duration: 1.5, ease: 'power2.inOut' }, 1.15)
      .from($('.hero__sous-titre', hero), { y: 20, opacity: 0, duration: 1.1 }, 1.45)
      .from($$('.hero__releve', hero), { y: 16, opacity: 0, duration: 1, stagger: 0.12 }, 1.6)
      .add(function () { $$('.hero__releve [data-compte]', hero).forEach(function (el) { compter(el, 1.8); }); }, 1.6)
      .from($$('.hero__releve .icone--etoile', hero), { scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(3)', stagger: 0.07 }, 1.9);
    tl.add(animerBarre($('.hero__barre', hero)), 1.75);

    /* parallaxe à la sortie du hero */
    G.to(img, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: surface, start: 'top top', end: 'bottom top', scrub: true } });
    G.to($('.hero__titre', hero), { yPercent: -18, opacity: 0.3, ease: 'none', scrollTrigger: { trigger: surface, start: 'top top', end: 'bottom 20%', scrub: true } });

    /* manifeste : mots qui s'allument (épinglé en desktop) */
    var mani = $('[data-manifeste]');
    var phrase = $('[data-mots]', mani);
    var photoMani = $('.manifeste__photo img', mani);
    var sig = $('.manifeste__signature', mani);
    if (split) {
      var mots = split.create(phrase, { type: 'words' });
      mm.add('(min-width: 1024px)', function () {
        G.set(mots.words, { opacity: 0.14 });
        var t = G.timeline({ scrollTrigger: { trigger: mani, start: 'top top', end: '+=85%', pin: true, scrub: 0.6, anticipatePin: 1 } });
        t.to(mots.words, { opacity: 1, stagger: 0.14, ease: 'none', duration: 0.5 }, 0)
          .fromTo(photoMani, { scale: 1.16 }, { scale: 1, ease: 'none', duration: 1.4 }, 0)
          .from(sig, { y: 24, opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.95);
        return function () { G.set(mots.words, { clearProps: 'opacity' }); };
      });
      mm.add('(max-width: 1023px)', function () {
        G.set(mots.words, { opacity: 0.14 });
        G.to(mots.words, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: phrase, start: 'top 85%', end: 'bottom 45%', scrub: 0.5 } });
        G.from(sig, { y: 20, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: sig, start: 'top 92%', once: true } });
        G.fromTo(photoMani, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: photoMani, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }

    /* deux publics : panneaux qui s'ouvrent, parallaxe interne */
    $$('[data-panneau]').forEach(function (p, i) {
      var r = getComputedStyle(p).borderTopLeftRadius;
      var im = $('.panneau__photo img', p);
      G.fromTo(p, { clipPath: 'inset(16% 0% 0% 0% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 88%', once: true } });
      G.fromTo(im, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.12, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
      G.from($$('.panneau__titre, .panneau__phrase, .panneau__lien', p), { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: p, start: 'top 70%', once: true } });
    });

    /* le trajet : panneau, route, étapes, compteur */
    var trajet = $('[data-trajet]');
    G.fromTo(trajet, { clipPath: 'inset(5% 3% 5% 3% round ' + rayon + 'px)' }, { clipPath: 'inset(0% 0% 0% 0% round ' + rayon + 'px)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: trajet, start: 'top 85%', once: true } });
    var liste = $('[data-etapes]', trajet);
    var route = $('.etapes__route', liste);
    G.fromTo(route, { scaleY: 0 }, { scaleY: 1, ease: 'none', transformOrigin: 'top', scrollTrigger: { trigger: liste, start: 'top 72%', end: 'bottom 62%', scrub: 0.6 } });
    $$('[data-etape]', liste).forEach(function (et) {
      var t = G.timeline({ scrollTrigger: { trigger: et, start: 'top 68%', once: true } });
      t.from($('.etape__anneau', et), { scale: 0, duration: 0.7, ease: 'back.out(3)' })
        .from($$('.etape__nom, .etape__detail', et), { x: -16, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, 0.05);
      if (et.classList.contains('etape--destination')) t.fromTo($('.etape__anneau', et), { boxShadow: '0 0 0 0 rgba(228,199,189,.8)' }, { boxShadow: '0 0 0 14px rgba(228,199,189,0)', duration: 1.2, ease: 'power2.out' }, 0.4);
    });
    animerCompteur($('[data-compteur]', trajet));
    G.from($$('.trajet__zone, .trajet__confirmer', trajet), { y: 16, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: $('.trajet__zone', trajet), start: 'top 95%', once: true } });

    animerCartesConvoyages($('[data-convoyages-une]'));
    animerAvis($('[data-avis]'));
    animerEquipe($('[data-equipe]'));
    animerQuestions($('.questions'));
    animerFin($('[data-fin]'));
    revelerTitres(document, [titre, $('.hero__sous-titre', hero)]);
  }

  /* ------------------------------------------- hero partagé (pages intérieures) */
  function heroPartage() {
    var hero = $('[data-hero-public]');
    if (!hero) return null;
    var entete = $('body > .entete');
    var photo = $('.hero-public__photo', hero);
    var img = $('img', photo);
    var r = estMobile() ? 28 : 40;
    var tl = G.timeline({ defaults: { ease: 'expo.out' } });
    if (entete) tl.from(entete, { y: -14, opacity: 0, duration: 0.9 }, 0.1);
    tl.fromTo(photo, { clipPath: estMobile() ? 'inset(0% 0% 100% 0% round ' + r + 'px)' : 'inset(0% 0% 0% 100% round ' + r + 'px)' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + 'px)', duration: 1.6, ease: 'expo.inOut' }, 0.15)
      .fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2.4 }, 0.15)
      .from($('.ariane', hero), { y: 12, opacity: 0, duration: 0.9 }, 0.35);
    var ligne = $('.hero-public__ligne', hero);
    if (split && ligne) { var sp = split.create(ligne, { type: 'chars', mask: 'chars' }); tl.from(sp.chars, { yPercent: 110, duration: 1.1, stagger: 0.03 }, 0.45); }
    tl.fromTo($('[data-script]', hero), { clipPath: 'inset(-25% 100% -35% -6%)', filter: 'blur(6px)', opacity: 0.4 }, { clipPath: 'inset(-25% -6% -35% -6%)', filter: 'blur(0px)', opacity: 1, duration: 1.4, ease: 'power2.inOut' }, 0.8)
      .from($$('.hero-public__chapo, .hero-public__lien', hero), { y: 18, opacity: 0, duration: 1, stagger: 0.1 }, 1.05)
      .from($$('.hero-public__releve, .hero-public__legende', hero), { y: 14, opacity: 0, duration: 0.9, stagger: 0.1 }, 1.25)
      .add(function () { $$('.hero-public__releve [data-compte]', hero).forEach(function (el) { compter(el, 1.7); }); }, 1.25)
      .from($$('.hero-public__releve .icone--etoile', hero), { scale: 0, duration: 0.6, ease: 'back.out(3)', stagger: 0.06 }, 1.5);
    var barre = $('.hero-public__barre', hero);
    if (barre) tl.add(animerBarre(barre), 1.3);
    G.to(img, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: photo, start: 'top top', end: 'bottom top', scrub: true } });
    return hero;
  }

  function deriveTitres() {
    $$('[data-derive]').forEach(function (t) {
      mm.add('(min-width: 1024px)', function () {
        G.fromTo(t, { x: -60 }, { x: 0, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'top 35%', scrub: true } });
      });
    });
  }

  function animerFiche(sec) {
    if (!sec) return;
    var r = getComputedStyle(sec).borderTopLeftRadius;
    G.fromTo(sec, { clipPath: 'inset(8% 4% 8% 4% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: sec, start: 'top 85%', once: true } });
    $$('.ligne-fiche', sec).forEach(function (l, i) {
      G.from(l, { '--trait': 0, opacity: 0, y: 16, duration: 1, ease: 'expo.out', delay: (i % 4) * 0.06, scrollTrigger: { trigger: l, start: 'top 92%', once: true } });
    });
  }

  function animerDeroule(sec) {
    if (!sec) return;
    var r = getComputedStyle(sec).borderTopLeftRadius;
    G.fromTo(sec, { clipPath: 'inset(4% 3% 4% 3% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: sec, start: 'top 85%', once: true } });
    var photos = $('.deroule__photos', sec);
    G.fromTo(photos, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: photos, start: 'top 85%', once: true } });
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
    if (!sec) return;
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

  /* les cartes de convoyage arrivent par rangées ; chaque photo se développe comme un tirage */
  function animerCartesConvoyages(conteneur) {
    if (!conteneur) return;
    $$('.convoyages-grille', conteneur).forEach(function (g) {
      var cartes = $$('[data-carte-convoyage]', g);
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
    var entete = $('body > .entete');
    var hero = $('[data-convoyages-hero]') || $('[data-convoyage-fiche]');
    var tl = G.timeline({ defaults: { ease: 'expo.out' } });
    if (entete) tl.from(entete, { y: -14, opacity: 0, duration: 0.9 }, 0.1);
    var ligne = hero ? $('.convoyages-hero__ligne, .convoyage-fiche__ligne', hero) : null;
    if (hero) {
      var photo = $('.convoyage-fiche__photo', hero);
      if (photo) {
        var r = estMobile() ? 24 : 32;
        tl.fromTo(photo, { clipPath: 'inset(100% 0% 0% 0% round ' + r + 'px)' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + 'px)', duration: 1.5, ease: 'expo.inOut' }, 0.15);
        var im = $('img', photo);
        if (im) tl.fromTo(im, { scale: 1.2, filter: 'saturate(0) brightness(1.4)' }, { scale: 1, filter: 'saturate(1) brightness(1)', duration: 2.4, ease: 'power2.out' }, 0.2);
      }
      tl.from($('.ariane', hero), { y: 12, opacity: 0, duration: 0.9 }, 0.3);
      if (split && ligne) { var sp = split.create(ligne, { type: 'chars', mask: 'chars' }); tl.from(sp.chars, { yPercent: 110, duration: 1.1, stagger: 0.03 }, 0.4); }
      tl.fromTo($('[data-script]', hero), { clipPath: 'inset(-25% 100% -35% -6%)', filter: 'blur(6px)', opacity: 0.4 }, { clipPath: 'inset(-25% -6% -35% -6%)', filter: 'blur(0px)', opacity: 1, duration: 1.4, ease: 'power2.inOut' }, 0.75)
        .from($$('.convoyages-hero__chapo, .convoyages-hero__crochet, .convoyage-fiche__chapo, .convoyage-fiche__crochet, .convoyage-fiche__legende', hero), { y: 18, opacity: 0, duration: 1, stagger: 0.1 }, 1.0);
      var lignesFiche = $$('.convoyage-fiche__donnees .ligne-fiche', hero);
      if (lignesFiche.length) tl.from(lignesFiche, { y: 14, opacity: 0, duration: 0.8, stagger: 0.07 }, 1.15);
    }
    animerCartesConvoyages(document);
    var barre = $('.convoyage-suite__barre');
    if (barre) animerBarre(barre, 0, barre);
    revelerTitres(document, ligne ? [ligne] : []);
  }

  function pagePublic() {
    heroPartage();
    deriveTitres();
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
    mm.add('(min-width: 1024px)', function () {
      G.set(jalons, { opacity: 0.12 });
      G.set(filet, { scaleX: 0, transformOrigin: 'left' });
      var tl = G.timeline({ scrollTrigger: { trigger: liste, start: 'top 80%', end: 'bottom 55%', scrub: 0.6 } });
      tl.to(filet, { scaleX: 1, ease: 'none', duration: 3 }, 0);
      jalons.forEach(function (j, i) { tl.to(j, { opacity: 1, duration: 0.5, ease: 'none' }, i * 0.95); });
      var auj = $('.jalon--aujourdhui .jalon__halo', liste);
      if (auj) ST.create({ trigger: liste, start: 'bottom 60%', once: true, onEnter: function () { G.fromTo(auj, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(2.5)' }); } });
      return function () { G.set(jalons, { clearProps: 'opacity' }); G.set(filet, { clearProps: 'transform' }); };
    });
    mm.add('(max-width: 1023px)', function () {
      G.from(jalons, { x: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: liste, start: 'top 85%', once: true } });
    });
  }

  function pageAPropos() {
    var hero = heroPartage();
    if (hero) G.from($$('.hero-public__signature', hero), { y: 16, opacity: 0, duration: 1, ease: 'expo.out', delay: 1.4 });
    var parcours = $('.parcours');
    var planche = $('.parcours__photo', parcours);
    var r = getComputedStyle(planche).borderTopLeftRadius;
    G.fromTo(planche, { clipPath: 'inset(10% 6% 10% 6% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: planche, start: 'top 85%', once: true } });
    G.fromTo($('img', planche), { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: planche, start: 'top bottom', end: 'bottom top', scrub: true } });
    animerJalons(parcours);
    $$('.exigence .ligne-fiche, .exigence__intro').forEach(function (l, i) {
      G.from(l, { y: 18, opacity: 0, duration: 1, ease: 'expo.out', delay: (i % 2) * 0.08, scrollTrigger: { trigger: l, start: 'top 92%', once: true } });
    });
    var eq = $('[data-equipe-ap]');
    if (eq) {
      var re = getComputedStyle(eq).borderTopLeftRadius;
      G.fromTo(eq, { clipPath: 'inset(0% 100% 0% 0% round ' + re + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + re + ')', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: eq, start: 'top 82%', once: true } });
      G.from($('.equipe-ap__portrait img', eq), { scale: 1.2, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: eq, start: 'top 70%', once: true } });
      var conv = $('[data-convoyeur]', eq);
      G.from(conv, { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: conv, start: 'top 90%', once: true } });
      G.from($$('.convoyeur__points li', conv), { x: -14, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: conv, start: 'top 80%', once: true } });
      $$('.equipe-ap__engagements .ligne-fiche', eq).forEach(function (l) { G.from(l, { y: 18, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 92%', once: true } }); });
    }
    animerFin($('[data-fin]'));
    revelerTitres(document, [$('.hero-public__ligne')]);
  }

  /* ------------------------------------------------------------- Contact */
  function pageContact() {
    // page de tâche : titre, numéro et formulaire lisibles dès la première image ; le mouvement ne cache rien
    var ligne = $('.contact .hero-public__ligne');
    var carte = $('[data-carte-formulaire]');
    if (carte) G.from(carte, { y: 36, duration: 1.3, ease: 'expo.out', delay: 0.05 });
    $$('.coordonnees .ligne-fiche').forEach(function (l) { G.from(l, { y: 18, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 94%', once: true } }); });
    revelerTitres(document, [ligne]);
  }

  function animerAvis(sec) {
    if (!sec) return;
    var note = $('.note-google__note', sec);
    ST.create({ trigger: sec, start: 'top 75%', once: true, onEnter: function () { compter(note, 1.6); } });
    G.from($$('.note-google .icone--etoile', sec), { scale: 0, duration: 0.6, ease: 'back.out(3)', stagger: 0.07, scrollTrigger: { trigger: sec, start: 'top 72%', once: true } });
    G.from($$('[data-carte]', sec), { x: 120, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: $('[data-piste]', sec), start: 'top 88%', once: true } });
    G.from($$('.avis__actions > *, .avis__bas-mobile > *', sec), { y: 16, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: sec, start: 'top 70%', once: true } });
  }

  function animerEquipe(sec) {
    if (!sec) return;
    var r = getComputedStyle(sec).borderTopLeftRadius;
    var t = G.timeline({ scrollTrigger: { trigger: sec, start: 'top 82%', once: true } });
    t.fromTo(sec, { clipPath: 'inset(0% 100% 0% 0% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.4, ease: 'expo.inOut' })
      .from($('.equipe__portrait img', sec), { scale: 1.25, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.5)
      .from($$('.equipe__legende, .equipe__membres li', sec), { y: 18, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.9)
      .from($('.equipe__filet', sec), Object.assign(estMobile() ? { scaleX: 0 } : { scaleY: 0 }, { duration: 1.1, ease: 'expo.inOut' }), 0.8)
      .from($$('.equipe__tel > *', sec), { y: 18, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 1.1);
  }

  function animerQuestions(sec) {
    if (!sec) return;
    var titre = $('h2', sec);
    if (!estMobile()) G.fromTo(titre, { x: -70 }, { x: 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 30%', scrub: true } });
    if (!sec.querySelector('[data-question]')) return;
    G.from($$('[data-question]', sec), { y: 28, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: $('[data-questions]', sec), start: 'top 82%', once: true } });
    G.from($$('.questions-public__cote > *', sec), { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
  }

  function animerFin(sec) {
    if (!sec) return;
    var surface = $('.encastre', sec);
    var img = $('img', surface);
    G.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: surface, start: 'top bottom', end: 'bottom bottom', scrub: true } });
    var r = getComputedStyle(surface).borderTopLeftRadius;
    G.fromTo(surface, { clipPath: 'inset(6% 4% 0% 4% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: surface, start: 'top 88%', once: true } });
    animerBarre($('.barre', sec), 0, $('.barre', sec));
  }
})();
