/* Robot Chronicle — partie 02-state-ui; contenu conservé depuis l’objet RC original. */
(function (root) {
  const parts = root.__RC_MODULES || (root.__RC_MODULES = []);
  parts.push({
  // MODULE 2/4 — ÉTAT, NOTE SPEC, STATS, HELPERS
  // ============================================================

  SEASON_FIGHTS: 20,
  NARRATIVE_PER_SEASON: 5,

  state: {
    firstLaunch: true,
    version: '0.16.1',
    tokens: 0,
    hallOfFame: [],
    badges: {},
    streak: 0,
    career: null,
    creation: { chassis: null, ia: null, sponsor: null },
    // v0.12 — méta persistante entre les carrières
    meta: {
      cumul: { ko:0, cores:0, fights:0, careersDone:0, dmStreak:0, chassisPlayed:[] },
      puces: {}, trophies: {}, endings: []
    }
  },

  deferredInstallPrompt: null,

  // ============================================================
  // INIT / NAVIGATION
  // ============================================================

  init() {
    this.loadState();
    this.setupInstallPrompt();
    this.setupSplash();
    this.renderCreationCards();
    document.getElementById('version-text').textContent = 'v' + this.VERSION;
  },

  goTo(screenId) {
    // v0.12 — on efface aussi le display posé en ligne. Le repli du
    // splash peut en avoir mis un : sans ce nettoyage, un écran
    // masqué en dur ne réapparaîtrait plus jamais.
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) { target.classList.add('active'); target.scrollTop = 0; }
  },

  setupSplash() {
    // v0.12 — la sortie du splash est pilotée par un script AUTONOME
    // placé avant celui-ci (hors de .app). Il ne dépend ni de RC ni
    // de DOMContentLoaded : si le moteur échoue, l'écran passe quand
    // même. On se contente ici d'exposer le relais.
    if (window.__splashDone) this.afterSplash();
  },

  afterSplash() {
    if (this._splashHandled) return;
    this._splashHandled = true;
    // La base mémorise le tutoriel dans state.firstLaunch — pas
    if (this.state.firstLaunch) { this.tutoPage = 0; this.renderTutoPage(); this.goTo('tuto'); }
    else { this.refreshHomeButtons(); this.goTo('home'); }
  },


  // v0.12 — toLocaleString('fr') insère une espace fine insécable que
  // le rendu colle au symbole (« −1008 ⚡ » au lieu de « −7 000 ⚡ »).
  // On formate à la main, avec une espace normale.
  fmt(n) {
    const neg = n < 0;
    const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '−' : '') + s;
  },


  // v0.12 — A5 : au dernier round, aucun texte ne doit annoncer une
  // suite. « Ça se sentira au round suivant » est faux au round 3/3,
  // et le sera aussi au round 7 du duel final.
  // v0.12 — certaines réactions annoncent un round à venir. Elles sont
  // marquées « @NEXT@ » et exclues au DERNIER round, où elles seraient
  // fausses (round 3/3, ou round 7 du duel final). Le marqueur est
  // toujours retiré du texte affiché.
  pickReaction(pool) {
    const last = this._currentRound >= this._maxRounds;
    let list = pool;
    if (last) {
      const ok = pool.filter(t =>
        t.indexOf('@NEXT@') !== 0 &&
        !/round suivant|prochain round|la suite du combat|plus tard dans le combat/i.test(t));
      if (ok.length) list = ok;
    }
    return this.pick(list).replace('@NEXT@', '');
  },



  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  // ============================================================
  // NOTE SPEC ET PALIERS
  // ============================================================

  SPEC_TIERS: [
    { min:92, key:'diamant', name:'Diamant' },
    { min:85, key:'rouge',   name:'Rouge' },
    { min:78, key:'violet',  name:'Violet' },
    { min:71, key:'or',      name:'Or' },
    { min:64, key:'argent',  name:'Argent' },
    { min:55, key:'bronze',  name:'Bronze' },
    { min:0,  key:'epave',   name:'Épave' }
  ],

  specTier(v) {
    return this.SPEC_TIERS.find(t => v >= t.min) || this.SPEC_TIERS[this.SPEC_TIERS.length - 1];
  },

  tierCls(v) { return 't-' + this.specTier(v).key; },

  LEAGUE_TIER: { 'Amateur':'bronze', 'Régionale':'argent', 'Nationale':'or',
                 'Mondiale':'violet', 'Elite':'rouge', 'Légendaire':'diamant' },

  leagueCls(league) { return 't-' + (this.LEAGUE_TIER[league] || 'bronze'); },

  computeGen(stats, robotState, wins, losses, leagueIdx, followers, leaguesWon, champion) {
    const sum = stats.pui + stats.vit + stats.res + stats.int;
    let g = sum * 0.28;
    g += (leagueIdx || 0) * 2;
    g += (leaguesWon || 0) * 1;
    if (champion) g += 3;
    const total = (wins || 0) + (losses || 0);
    if (total >= 5) g += ((wins / total) - 0.5) * 16;
    const f = followers || 0;
    if (f >= 500000) g += 4;
    else if (f >= 100000) g += 3;
    else if (f >= 10000) g += 2;
    else if (f >= 1000) g += 1;
    if (robotState < 25) g -= 12;
    else if (robotState < 55) g -= 7;
    else if (robotState < 80) g -= 3;
    return Math.max(20, Math.min(99, Math.round(g)));
  },

  recalcGen() {
    const c = this.state.career;
    if (!c) return;
    c.gen = this.computeGen(c.stats, c.state, c.totalWins, c.totalLosses,
                            c.leagueIdx, c.followers, c.leaguesWon, c.bossWon);
    if (c.gen > (c.genMax || 0)) c.genMax = c.gen;
  },

  // ============================================================
  // IDENTITÉ MÉCANIQUE DES STATS (v0.7.0)
  // Auparavant les quatre stats ne servaient qu'au score de round :
  // les dégâts subis dépendaient uniquement du châssis, si bien qu'un
  // Tank à 75 de Résistance encaissait exactement comme un Tank à 20.
  // Chaque stat a désormais un effet propre, en plus du score.
  // ============================================================

  // Puissance → dégâts infligés (de −12% à +18% sur l'amplitude 20-99)
  powerMod(stats) { return 0.88 + (stats.pui / 99) * 0.30; },

  // Résistance → dégâts subis (de +18% à −12%)
  armorMod(stats) { return 1.18 - (stats.res / 99) * 0.30; },

  // Vitesse → esquive, qui débouche sur un contre (jusqu'à +7 points)
  dodgeBonus(stats) { return (stats.vit / 99) * 0.07; },

  // Intelligence → révélation des stats adverses, momentum, résistance aux bugs
  intelSeeAll(stats) { return stats.int >= 62; },
  momentumStep(stats) { return 0.04 + (stats.int / 99) * 0.04; },
  bugResist(stats) { return 1 - (stats.int / 99) * 0.45; },

  // Score d'un profil : la paire dominante pèse le plus, les 4 stats comptent
  profileScore(stats, profile) {
    return profile === 'force'
      ? stats.pui * 0.40 + stats.res * 0.30 + stats.vit * 0.15 + stats.int * 0.15
      : stats.vit * 0.40 + stats.int * 0.30 + stats.pui * 0.15 + stats.res * 0.15;
  },

  opponentProfile(op) {
    const best = this.profileScore(op.stats, 'force') >= this.profileScore(op.stats, 'tech') ? 'force' : 'tech';
    return Math.random() < 0.6 ? best : (best === 'force' ? 'tech' : 'force');
  },

  // ============================================================
  // ÉTAT DU ROBOT
  // ============================================================

  stateMult(s) {
    if (s >= 80) return 1.00;
    if (s >= 55) return 0.95;
    if (s >= 25) return 0.87;
    return 0.72;
  },

  stateColor(s) { return s > 79 ? 'var(--green)' : s > 54 ? 'var(--orange)' : 'var(--pink)'; },

  stateLabel(s) {
    if (s >= 80) return 'Optimal';
    if (s >= 55) return 'Usé';
    if (s >= 25) return 'Endommagé';
    if (s >= 1) return 'Critique';
    return 'Détruit';
  },

  // v0.14.0 — B3 : le facteur 0,4 écrasait l'avantage annoncé. Un Tank
  // affiché à dmgTaken 0.75 (−25% d'usure) n'encaissait en réalité que
  // −10% : 1 + (0.75 − 1) × 0.4 = 0.90. Même écrasement sur le Striker
  // (+20% annoncé, +8% réel) et le Ghost (+12% annoncé, +4,8% réel).
  // Le choix du châssis ne pesait donc rien face à l'usure brute.
  // Le modificateur est désormais appliqué tel qu'il est annoncé.
  wearMod(cm) {
    const c = this.state.career;
    const iaWear = c && c.ia && c.ia.fx ? c.ia.fx.wear : 1;
    return cm.dmgTaken * iaWear;
  },

  // ============================================================
  // FOLLOWERS
  // ============================================================

  fmtFollowers(n) {
    if (n >= 1000000) return (n/1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return String(n);
  },

  FOL_TIERS: [
    { at:0, name:'Inconnu' }, { at:10000, name:'Viral' }, { at:100000, name:'Buzz' },
    { at:250000, name:'Star' }, { at:500000, name:'Idole' }, { at:1000000, name:'Phénomène' }
  ],

  folTier(n) {
    let cur = this.FOL_TIERS[0], next = null;
    for (let i = 0; i < this.FOL_TIERS.length; i++) {
      if (n >= this.FOL_TIERS[i].at) cur = this.FOL_TIERS[i];
      else { next = this.FOL_TIERS[i]; break; }
    }
    return { cur, next };
  },

  addFollowers(n, reason) {
    const c = this.state.career;
    if (!n || !c) return;
    const before = c.followers;
    c.followers = Math.max(0, c.followers + Math.round(n));
    if (!c.folLog) c.folLog = [];
    c.folLog.unshift({ v: c.followers - before, r: reason });
    if (c.folLog.length > 12) c.folLog.length = 12;
    const t = this.folTier(c.followers);
    if (t.cur.at > 0 && before < t.cur.at && c.followers >= t.cur.at) {
      if (!c.tiersReached) c.tiersReached = [];
      if (c.tiersReached.indexOf(t.cur.name) === -1) {
        c.tiersReached.push(t.cur.name);
        c.newTier = t.cur.name;
      }
    }
  },

  leagueFactor() { return 1 + (this.state.career.leagueIdx || 0) * 1.0; },

  // ============================================================
  // SPONSOR ET CONSCIENCE IA
  // ============================================================

  addSatis(n) {
    const c = this.state.career;
    if (!c.sponsor.fx.canDrop) return;
    c.satis = Math.max(0, Math.min(100, (c.satis || 50) + n));
  },

  // v0.14.0 — B2 : le lien atteignait 100% en une saison et demie. Il
  // part de 50, il n'y a donc que 50 points à parcourir, et les sources
  // rapportaient +32 (jeu prudent) à +69 (jeu optimisé) par saison —
  // les seuls événements narratifs valant déjà +25 à +48, leurs valeurs
  // positives moyennant +9,6 contre −7 pour les négatives.
  //
  // Plutôt que de retoucher les 113 valeurs `aff` du contenu validé, on
  // amortit à l'entrée : plus le lien est haut, moins un gain rapporte.
  // Les valeurs des événements gardent ainsi leur hiérarchie relative —
  // un +16 reste bien plus fort qu'un +4 — mais le 100% devient
  // asymptotique, donc une affaire de fin de carrière.
  //
  // Rendement : plein en dessous de 45, puis décroissant. Mesuré sur une
  // saison type (5 événements bienveillants, une réparation, 5 combats
  // gagnés, deux revers) : ~72% en fin de saison 1, ~78% en saison 5.
  // Un joueur qui privilégie systématiquement le lien approche 95% vers
  // la saison 8 et ne touche 100% qu'en toute fin de carrière — ce qui
  // laisse le trophée « Inséparable » atteignable sans être offert.
  //
  // Les pertes sont appliquées en entier, sans amortissement : la
  // confiance se perd toujours plus vite qu'elle ne se gagne.
  //
  // La valeur est stockée en DÉCIMAL. Arrondir à chaque gain bloquait
  // toute progression dans le haut de la courbe : un gain amorti à
  // +0,4 point était arrondi à zéro, et le lien restait figé.
  // L'arrondi ne se fait qu'à l'affichage, via affPct().
  // v0.16.0 — F1 : le lien démarrait à 50 %, valeur héritée jamais motivée
  // ni au GDD ni à la Roadmap. Elle contredisait le propos du jeu : à la
  // création, la machine sort de l'atelier et ne connaît pas son créateur.
  // Démarrer à mi-chemin offrait gratuitement la moitié de ce que la
  // carrière entière est censée construire.
  //
  // AFF_FREE descend de 45 à 30 en conséquence : sans cela le début de
  // courbe serait à plein rendement et le lien remonterait à 50 % en une
  // saison, le changement n'aurait servi à rien.
  AFF_START: 15,
  AFF_FREE: 30,

  // v0.14.0 — accès unique aux compteurs de saison.
  //
  // Le motif `if (c.seasonC) c.seasonC.x = …` était partout : quand
  // l'objet manquait — carrière migrée d'une version antérieure, où il
  // n'était pas recréé — l'écriture était silencieusement ignorée. La
  // lecture, elle, faisait `c.seasonC || {}`, donc le compteur passait
  // pour valant zéro. Résultat : « Fantôme » (traverser une saison sans
  // consulter le classement) tombait alors que le joueur l'avait bien
  // consulté, puisque le flag n'avait jamais pu être posé.
  //
  // Cette fonction garantit que l'objet existe avant toute écriture ou
  // lecture. Elle est le seul point d'entrée.
  seasonCounters() {
    const c = this.state.career;
    if (!c) return { atouts:0, counters:0, lowState:100, repairs:0, standingsSeen:false };
    if (!c.seasonC) {
      c.seasonC = { atouts:0, counters:0, lowState:(c.state == null ? 100 : c.state), repairs:0, standingsSeen:false };
    }
    return c.seasonC;
  },

  resetSeasonCounters() {
    const c = this.state.career;
    if (!c) return;
    c.seasonC = { atouts:0, counters:0, lowState:(c.state == null ? 100 : c.state), repairs:0, standingsSeen:false };
  },

  addAffection(n) {
    const c = this.state.career;
    const cur = (c.affection == null) ? this.AFF_START : c.affection;
    let next = cur;
    if (n <= 0) {
      next = cur + n;
    } else {
      // Le gain est consommé par petits pas : chaque point gagné coûte
      // plus cher que le précédent. Sans ça, un gros gain unique
      // franchirait la zone amortie d'un bloc.
      let left = n;
      const step = 0.25;
      while (left > 0) {
        const chunk = Math.min(step, left);
        const over = Math.min(1, Math.max(0, (next - this.AFF_FREE) / (100 - this.AFF_FREE)));
        const yieldFactor = Math.max(0.03, Math.pow(1 - over, 2.2));
        next += chunk * yieldFactor;
        left -= chunk;
      }
    }
    c.affection = Math.max(0, Math.min(100, next));
    // Pic atteint dans la carrière, pour « Qui êtes-vous ? ».
    if (c.affection > (c.affPeak || 0)) c.affPeak = c.affection;
  },

  // Lien IA en pourcentage entier, pour tout affichage.
  affPct() {
    const c = this.state.career;
    return Math.round(c && c.affection != null ? c.affection : this.AFF_START);
  },

  addTrait(t) {
    const c = this.state.career;
    if (!c.traits) c.traits = {};
    c.traits[t] = (c.traits[t] || 0) + 1;
  },

  topTraits(n) {
    const c = this.state.career;
    if (!c.traits) return [];
    return Object.keys(c.traits).sort((a,b) => c.traits[b] - c.traits[a]).slice(0, n || 3);
  },

  TRAIT_LABELS: {
    fidele:'Fidèle', protecteur:'Protecteur', soigneux:'Soigneux', integre:'Intègre',
    humble:'Humble', libre:'Âme libre', ouvert:'Ouvert', arrogant:'Arrogant',
    distant:'Distant', soumis:'Soumis', negligent:'Négligent', controlant:'Autoritaire',
    corrompu:'Corrompu'
  },

  sponsorColor(id) {
    return id === 'indie' ? 'var(--green)' : id === 'corp' ? 'var(--blue)'
         : id === 'mega' ? 'var(--yellow)' : 'var(--pink)';
  },

  // ============================================================
  // INSOLVABILITÉ (v0.7.0)
  // Auparavant `cores = Math.max(0, cores + coût)` : le joueur payait
  // ce qu'il avait et le reste s'évaporait. À 0 Core, tous les choix
  // coûteux devenaient donc gratuits. Ce qui n'est pas payé en Cores
  // se paye désormais en nature, et la facture dépend du sponsor.
  // ============================================================

  payCores(amount, label) {
    const c = this.state.career;
    const cost = Math.abs(Math.round(amount));
    if (cost === 0) return null;

    if (c.cores >= cost) { c.cores -= cost; return null; }

    // v0.16.0 — F4 : le solde était forcé à zéro, ce qui contredisait le
    // message « fonds insuffisants » — le joueur payait ET subissait la
    // sanction, sans jamais voir de dette. Le solde passe désormais
    // réellement dans le rouge : tant qu'il y est, plus aucun achat n'est
    // possible (voir canAfford). Pas de plancher, c'est assumé.
    const missing = cost - c.cores;
    c.cores -= cost;
    if (!c.debtPeak || c.cores < c.debtPeak) c.debtPeak = c.cores;
    this.grant('broke');
    // Sévérité proportionnelle au manque, normalisée par la ligue
    const ratio = Math.min(1, missing / (2500 * this.leagueFactor()));
    const debt = { label: label || 'Dette', missing: missing, kind: null, state: 0, fol: 0, satis: 0 };

    if (c.sponsor.fx.risk || c.flagged) {
      // Underground : représailles physiques
      debt.kind = 'reprisals';
      debt.state = Math.round(4 + ratio * 21);
      debt.fol = -Math.round((300 + ratio * 2200) * this.leagueFactor());
      c.state = Math.max(5, c.state - debt.state);
      this.addFollowers(debt.fol, 'Représailles du milieu');
      this.addAffection(-3);
    } else if (c.sponsor.fx.canDrop) {
      // Corp / Méga-corp : le sponsor avance, la satisfaction s'effondre
      debt.kind = 'sponsor';
      debt.satis = -Math.round(8 + ratio * 27);
      this.addSatis(debt.satis);
    } else {
      // Garage indépendant : on démonte des pièces pour éponger
      debt.kind = 'parts';
      debt.state = Math.round(3 + ratio * 15);
      c.state = Math.max(5, c.state - debt.state);
      this.addAffection(-2);
      this.addTrait('negligent');
    }
    c.insolvencies = (c.insolvencies || 0) + 1;
    this.recalcGen();
    return debt;
  },

  // v0.16.0 — F4 : dans le rouge, plus aucun paiement n'est possible.
  // Règle : aucune exception, pas même une
  // réparation d'urgence à crédit.
  inDebt() {
    const c = this.state.career;
    return !!c && c.cores < 0;
  },

  canAfford(cost) {
    const c = this.state.career;
    if (!c) return false;
    if (c.cores < 0) return false;
    return c.cores >= (cost || 0);
  },

  // Trajectoire de dette, pour le bilan de fin de carrière : jamais
  // endetté · endetté puis remboursé · endetté à répétition · fini dans
  // le rouge. Appelé à chaque encaissement.
  trackDebt() {
    const c = this.state.career;
    if (!c) return;
    if (c.cores < 0) { c.wasInDebt = true; c.debtOpen = true; }
    else if (c.debtOpen) { c.debtOpen = false; c.debtsCleared = (c.debtsCleared || 0) + 1; }
  },

  // v0.16.0 — F4 : résumé de la trajectoire de dette pour le bilan de fin
  // de carrière. Renvoie null quand le joueur n'est jamais passé dans le
  // rouge : inutile d'occuper une ligne pour dire qu'il ne s'est rien
  // passé.
  debtSummary() {
    const c = this.state.career;
    if (!c) return null;
    const peak = c.debtPeak || 0;
    const cleared = c.debtsCleared || 0;
    if (!c.wasInDebt && (c.cores || 0) >= 0) return null;
    if ((c.cores || 0) < 0) {
      return { label: 'Terminé dans le rouge', color: 'var(--red)',
               val: c.cores.toLocaleString('fr') + ' ⚡' };
    }
    if (cleared >= 2) {
      return { label: 'Dettes épongées', color: 'var(--orange)',
               val: cleared + ' fois · pire creux ' + peak.toLocaleString('fr') + ' ⚡' };
    }
    return { label: 'Dette remboursée', color: 'var(--green)',
             val: 'creux à ' + peak.toLocaleString('fr') + ' ⚡' };
  },

  debtText(d) {
    if (!d) return '';
    if (d.kind === 'reprisals')
      return '🚨 Fonds insuffisants — ' + d.missing.toLocaleString('fr') + ' ⚡ manquants. Le milieu est venu se servir dans votre hangar : −' + d.state + '% d\'état.';
    if (d.kind === 'sponsor')
      return '🏢 Fonds insuffisants — ' + d.missing.toLocaleString('fr') + ' ⚡ manquants. Votre sponsor a réglé la différence, et ne l\'a pas apprécié : ' + d.satis + '% de satisfaction.';
    return '🔧 Fonds insuffisants — ' + d.missing.toLocaleString('fr') + ' ⚡ manquants. Vous avez démonté des pièces pour éponger : −' + d.state + '% d\'état.';
  },

  // ============================================================
  // TOAST / SAUVEGARDE / PWA
  // ============================================================

  showMessage(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.animation = 'fadeUp .3s ease-out';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2500);
  },

  saveState() {
    try { localStorage.setItem('RC_STATE', JSON.stringify(this.state)); }
    catch(e) { console.warn('Save failed:', e); }
  },

  loadState() {
    try {
      const raw = localStorage.getItem('RC_STATE');
      if (raw) {
        const saved = JSON.parse(raw);
        Object.assign(this.state, saved);
      }
    } catch (e) { console.warn('Sauvegarde illisible', e); }
    // v0.12 — fusion défensive : une sauvegarde antérieure n'a pas
    // de bloc meta, il ne doit jamais manquer.
    if (!this.state.meta) this.state.meta = {};
    const M = this.state.meta;
    if (!M.cumul) M.cumul = {};
    ['ko','cores','fights','careersDone','dmStreak'].forEach(k => { if (typeof M.cumul[k] !== 'number') M.cumul[k] = 0; });
    if (!Array.isArray(M.cumul.chassisPlayed)) M.cumul.chassisPlayed = [];
    // v0.16.0 — les puces sont un OBJET (id -> {robot,date}), plus un
    // tableau. On récupère au passage celles rangées à la racine par les
    // versions antérieures, sinon elles seraient perdues.
    if (!M.puces || Array.isArray(M.puces)) {
      const old = Array.isArray(M.puces) ? M.puces : [];
      M.puces = {};
      old.forEach(id => { if (typeof id === 'string') M.puces[id] = { robot: '?', date: 0 }; });
    }
    if (this.state.puces && typeof this.state.puces === 'object') {
      Object.keys(this.state.puces).forEach(id => {
        if (!M.puces[id]) M.puces[id] = this.state.puces[id];
      });
      delete this.state.puces;
    }
    if (!Array.isArray(M.endings)) M.endings = [];
    if (!M.trophies) M.trophies = {};
    this.state.version = this.VERSION;
  },

  migrateCareer() {
    const c = this.state.career;
    if (!c) return;
    const def = (k, v) => { if (typeof c[k] !== typeof v || c[k] === undefined || c[k] === null) c[k] = v; };
    def('narrativeCombat', 0); def('fightIndex', 0); def('leagueIdx', 0);
    def('totalWins', 0); def('totalLosses', 0); def('totalKO', 0);
    // v0.14.0 — A6 : KO subis. Absents des sauvegardes anterieures.
    def('totalKOTaken', 0); def('seasonKOTaken', 0);
    // v0.15.0 — E5 : cumuls de structure pour le départage.
    def('seasonRDiff', 0); def('seasonTie', 0); def('affPeak', 0);
    // v0.16.0 — F4 : suivi de la dette pour le bilan de fin de carrière.
    def('debtPeak', 0); def('debtsCleared', 0);
    if (typeof c.legendRelegated !== 'boolean') c.legendRelegated = false;
    if (typeof c.wasInDebt !== 'boolean') c.wasInDebt = false;
    if (typeof c.debtOpen !== 'boolean') c.debtOpen = false;
    def('seasonWins', 0); def('seasonLosses', 0); def('seasonKO', 0);
    def('atoutsLeft', 3); def('atoutsUsed', 0); def('atoutsSuccess', 0);
    def('satis', 50); def('affection', 15);
    def('genMax', c.gen || 40); def('combatsFought', 0);
    def('totalEarned', c.cores || 0); def('sponsorChanges', 0);
    def('leaguesWon', 0); def('bugsSuffered', 0); def('transfersUsed', 0);
    def('insolvencies', 0); def('specialRepairUsed', false); def('midRepairUsed', false);
    if (!Array.isArray(c.simulatedResults)) c.simulatedResults = [];
    if (!c.traits) c.traits = {};
    if (!c.folLog) c.folLog = [];
    if (!c.tiersReached) c.tiersReached = [];
    if (!c.timeline) c.timeline = [];
    if (!c.eventsSeen) c.eventsSeen = [];
    if (!c.textsSeen) c.textsSeen = [];
    if (!c.interOffers) c.interOffers = null;
    if (!c.ia.fx) { const f = this.IA_TYPES.find(x => x.id === c.ia.id); if (f) c.ia = f; }
    if (!c.sponsor.fx) { const f = this.SPONSORS.find(x => x.id === c.sponsor.id); if (f) c.sponsor = f; }
    if (!c.rival) c.rival = this.generateRival();
    if (typeof c.moral === 'number') delete c.moral;   // v0.7.0 : jauge retirée
  },

  refreshHomeButtons() {
    const btn = document.getElementById('btn-start-career');
    const abandon = document.getElementById('btn-new-career');
    if (!btn) return;
    if (this.state.career) {
      btn.textContent = 'REPRENDRE LA CARRIÈRE';
      btn.onclick = () => RC.showCareer();
      if (abandon) abandon.style.display = 'block';
    } else {
      btn.textContent = 'COMMENCER UNE CARRIÈRE';
      btn.onclick = () => RC.startCreation();
      if (abandon) abandon.style.display = 'none';
    }
  },

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      document.getElementById('install-btn').style.display = 'inline-block';
    });
  },

  installApp() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      this.deferredInstallPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') document.getElementById('install-btn').style.display = 'none';
        this.deferredInstallPrompt = null;
      });
    } else {
      this.showMessage('Ouvrez dans Chrome pour installer');
    }
  },

  // ============================================================
  // v0.13.4 — PANNEAU DE DIAGNOSTIC
  //
  // Ouvert par cinq taps sur le numéro de version du pied de
  // l'accueil, moins d'une seconde entre chaque. Le compteur repart
  // de zéro dès qu'une seconde s'écoule : un tap isolé ne déclenche
  // jamais rien.
  //
  // Trois outils :
  //   1. Copie de la sauvegarde, pour transmettre l'état exact
  //      plutôt qu'une capture d'écran.
  //   2. Simulateur de carrières, qui appelle le VRAI moteur — les
  //      mêmes fonctions que le jeu, sans DOM — et sort un rapport
  //      chiffré sur le rival, l'usure, les cores et le classement.
  //   3. Réinitialisation.
  // ============================================================

  _rstTaps: 0,
  _rstTimer: null,

  tapVersion() {
    if (this._rstTimer) { clearTimeout(this._rstTimer); this._rstTimer = null; }
    this._rstTaps++;
    if (this._rstTaps < 5) {
      this._rstTimer = setTimeout(() => { this._rstTaps = 0; this._rstTimer = null; }, 1000);
      return;
    }
    this._rstTaps = 0;
    this.showDiag();
  },

  showDiag() {
    let h = '<div style="text-align:center;padding:5px 0 14px">';
    h += '<div style="font-family:var(--font-mono);font-size:9px;color:var(--yellow);text-transform:uppercase;letter-spacing:3px;margin-bottom:4px">🧪 Diagnostic</div>';
    h += '<div class="page-title">Outils de vérification</div>';
    h += '<div class="page-sub">Version ' + this.VERSION + '</div></div>';

    h += '<div class="diag-sec"><div class="diag-sec-title">1 · Sauvegarde</div>';
    h += '<textarea class="diag-out" id="diag-save" readonly placeholder="Appuyez sur Extraire."></textarea>';
    h += '<div class="diag-btn" onclick="RC.diagExport()">Extraire la sauvegarde</div>';
    h += '<div class="diag-btn" onclick="RC.diagCopy(\'diag-save\')">Copier</div>';
    h += '<div class="diag-note">Contient la carrière en cours, le classement, le rival, les cores et l\'état. À coller tel quel.</div></div>';

    h += '<div class="diag-sec"><div class="diag-sec-title">2 · Simulateur</div>';
    h += '<textarea class="diag-out" id="diag-sim" readonly placeholder="Appuyez sur Lancer. Quelques secondes."></textarea>';
    h += '<div class="diag-btn" onclick="RC.diagRun(50,12)">Lancer · 50 carrières × 12 saisons</div>';
    h += '<div class="diag-btn" onclick="RC.diagRun(200,12)">Lancer · 200 carrières (plus lent, plus fiable)</div>';
    h += '<div class="diag-btn" onclick="RC.diagCopy(\'diag-sim\')">Copier le rapport</div>';
    h += '<div class="diag-note">Fait tourner le moteur réel sans affichage. Ne touche pas à votre partie en cours.</div></div>';

    h += '<div class="diag-sec"><div class="diag-sec-title">3 · Réinitialisation</div>';
    h += '<div class="diag-btn danger" onclick="RC.diagReset()">Tout effacer</div>';
    h += '<div class="diag-note">Efface uniquement les données de Robot Chronicle. Les autres applications du même domaine ne sont pas touchées.</div></div>';

    const el = document.getElementById('diag-content');
    if (el) el.innerHTML = h;
    this.goTo('diag');
    this.bindStickyBack('diag', 'diag-back');
  },

  diagExport() {
    const out = document.getElementById('diag-save');
    if (!out) return;
    let raw = null;
    try { raw = localStorage.getItem('RC_STATE'); } catch (e) {}
    if (!raw) { out.value = 'Aucune sauvegarde trouvée.'; return; }
    let txt;
    try { txt = JSON.stringify(JSON.parse(raw), null, 1); } catch (e) { txt = raw; }
    out.value = '// Robot Chronicle ' + this.VERSION + '\n' + txt;
  },

  diagCopy(id) {
    const el = document.getElementById(id);
    if (!el || !el.value) return;
    el.readOnly = false;
    el.select();
    el.setSelectionRange(0, el.value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    el.readOnly = true;
    if (!ok && navigator.clipboard) {
      navigator.clipboard.writeText(el.value).then(
        () => this.showMessage('Copié'),
        () => this.showMessage('Copie refusée — sélectionnez à la main')
      );
      return;
    }
    this.showMessage(ok ? 'Copié' : 'Copie refusée — sélectionnez à la main');
  },

  diagReset() {
    this.askConfirm(
      'Réinitialisation complète',
      'Toute la progression sera effacée :\ncarrière en cours, trophées, Hall of Fame.\n\nCette action est définitive.',
      'Tout effacer', 'Annuler', true,
      (ok) => {
        if (!ok) return;
        try {
          const kill = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf('RC_') === 0) kill.push(k);
          }
          kill.forEach(k => localStorage.removeItem(k));
        } catch (e) {}
        try { location.reload(); } catch (e) {}
      }
    );
  },

  // ------------------------------------------------------------
  // Carrière synthétique, sans DOM.
  // Reproduit launchCareer() en omettant ce qui touche à l'écran.
  // Si launchCareer change, cette fonction doit suivre — c'est le
  // seul point du simulateur qui duplique du code du jeu.
  // ------------------------------------------------------------
  diagMakeCareer(chassisId) {
    const chassis = this.CHASSIS.find(x => x.id === chassisId) || this.pick(this.CHASSIS);
    const ia = this.pick(this.IA_TYPES);
    const sponsor = this.pick(this.SPONSORS);
    const stats = {};
    Object.keys(chassis.stats).forEach(k => { stats[k] = chassis.stats[k]; });
    const c = {
      name: 'DIAG-01', chassis, ia, sponsor, stats,
      gen: this.computeGen(stats, 100, 0, 0, 0, 0, 0, false),
      cores: this.START_CORES - chassis.price - ia.price + sponsor.fx.startCores,
      state: 100, startChassis: chassis.id,
      followers: 0, season: 1, league: 'Amateur', leagueIdx: 0,
      seasonWins: 0, seasonLosses: 0, seasonKO: 0,
      totalWins: 0, totalLosses: 0, totalKO: 0,
      seasonKOTaken: 0, totalKOTaken: 0,
      atoutsLeft: 3, atoutsUsed: 0, atoutsSuccess: 0,
      narrativeCombat: 0, simulatedResults: [], fightIndex: 0, combatsFought: 0,
      specialRepairUsed: false, midRepairUsed: false, transfersUsed: 0,
      interOffers: null, satis: 50, affection: 15, traits: {},
      seasonC: { atouts: 0, counters: 0, lowState: 100, repairs: 0, standingsSeen: false },
      deferred: [], persist: [], h2hWins: 0, h2hLosses: 0,
      debtPeak: 0, debtsCleared: 0, wasInDebt: false, debtOpen: false, affPeak: 15,
      atoutBonus: 0, nextFight: null, nextRival: null, flagged: false,
      maxFollowers: 0, finished: false, cumulCommitted: false,
      folLog: [], tiersReached: [], timeline: [], eventsSeen: [], textsSeen: [],
      genMax: 0, totalEarned: 0, sponsorChanges: 0,
      leaguesWon: 0, bugsSuffered: 0, insolvencies: 0,
      standings: null, schedule: null, matchday: 0, _targetWins: null,
      seasonsInLeague: 0, scenarioDone: true    // pas de saison scriptée en simulation
    };
    c.rival = this.generateRival();
    return c;
  },

  // ------------------------------------------------------------
  // Simulateur. Appelle le moteur réel : ensureStandings,
  // playMatchday, computeUsure, wearMod, zoneOf, advanceRival,
  // repairQuote, upgradePrice. Rien n'est réimplémenté ici.
  // ------------------------------------------------------------
  diagRun(nCareers, nSeasons) {
    const out = document.getElementById('diag-sim');
    if (out) out.value = 'Simulation en cours…';
    // Laisse le navigateur peindre le message avant de bloquer.
    setTimeout(() => {
      let txt;
      try { txt = this.diagSimulate(nCareers, nSeasons); }
      catch (e) { txt = 'Erreur de simulation :\n' + (e && e.message ? e.message : e) + '\n' + (e && e.stack ? e.stack : ''); }
      const o = document.getElementById('diag-sim');
      if (o) o.value = txt;
    }, 60);
  },

  diagSimulate(nCareers, nSeasons) {
    const savedState = this.state;
    const t0 = Date.now();

    const L = this.LEAGUES;
    const rivalMoves = { promo: 0, releg: 0, stay: 0 };
    const rivalLeagueEnd = [0, 0, 0, 0, 0, 0];
    const gapCount = {};                      // écart de ligue joueur − rival
    const wearByChassis = {};                 // usure moyenne par saison
    const coresByLeague = [];                 // solde de fin de saison
    const zoneCount = { promo: 0, stay: 0, releg: 0 };
    for (let i = 0; i < 6; i++) coresByLeague.push({ gain: 0, n: 0 });
    let playerTop = 0, seasonsRun = 0, upBought = 0;
    const specTrack = [];                     // SPEC joueur vs rival, par saison

    const chassisIds = this.CHASSIS.map(x => x.id);

    try {
      for (let k = 0; k < nCareers; k++) {
        const chId = chassisIds[k % chassisIds.length];
        const c = this.diagMakeCareer(chId);
        this.state = { career: c, meta: { puces: [] }, firstLaunch: false };
        if (!wearByChassis[chId]) wearByChassis[chId] = { wear: 0, n: 0 };
        const cm = this.CHASSIS_MOD[chId] || this.CHASSIS_MOD.tactical;

        for (let s = 0; s < nSeasons; s++) {
          const li = c.leagueIdx || 0;
          const coresBefore = c.cores;
          let wearSeason = 0;

          c.standings = null; c.schedule = null; c.matchday = 0;
          c._targetWins = null;
          c.seasonWins = 0; c.seasonLosses = 0; c.seasonKO = 0; c.seasonKOTaken = 0;
          c.seasonRDiff = 0;
          c.fightIndex = 0;
          if (c.rival) c.rival.seq = null;
          this.ensureStandings();

          // Chance de victoire du joueur : son SPEC contre celui attendu
          // dans sa ligue. Volontairement simple — on mesure les suites
          // (usure, cores, classement), pas la résolution d'un combat.
          const expected = this.leagueBaseSpec(li);
          let pWin = 0.5 + (c.gen - expected) * 0.012;
          pWin = Math.max(0.2, Math.min(0.8, pWin));

          for (let f = 0; f < this.SEASON_FIGHTS; f++) {
            const won = Math.random() < pWin;
            const ko = won && Math.random() < 0.12;
            const u = this.computeUsure(won, ko);
            const dmg = Math.max(1, Math.round(u.total * this.wearMod(cm)));
            wearSeason += dmg;
            c.state = Math.max(0, c.state - dmg);
            if (won) { c.seasonWins++; c.totalWins++; if (ko) { c.seasonKO++; c.totalKO++; } }
            else { c.seasonLosses++; c.totalLosses++; }
            c.cores += won
              ? Math.floor(480 + li * 700) * (ko ? 1.2 : 1)
              : Math.floor(130 + li * 90);
            c.fightIndex++;
            const st = this.standingById(c.schedule[f]);
            this.playMatchday(st ? st.id : null, won);
          }

          wearByChassis[chId].wear += wearSeason;
          wearByChassis[chId].n++;

          // Réparation complète à l'inter-saison, si les cores suivent.
          const missing = 100 - c.state;
          if (missing > 0) {
            const price = this.repairQuote(missing, false);
            if (c.cores >= price) { c.cores -= price; c.state = 100; }
          }
          // Puis améliorations, tant qu'il reste une réserve d'une
          // réparation complète. Sans cette étape le joueur simulé
          // stagnerait pendant que le rival gagne +2 par stat et par
          // saison dans advanceRival() — la comparaison serait faussée.
          const keys = ['pui', 'vit', 'res', 'int'];
          let guardUp = 0;
          while (c.cores >= this.upgradePrice() * 2 && guardUp++ < 40) {
            const kk = keys[guardUp % 4];
            if (c.stats[kk] >= 99) continue;
            c.cores -= this.upgradePrice();
            c.stats[kk]++;
            upBought++;
          }
          this.recalcGen();
          coresByLeague[li].gain += (c.cores - coresBefore);
          coresByLeague[li].n++;
          specTrack.push({ s: s, me: c.gen, him: c.rival.gen });

          const rank = this.playerRank();
          const zone = this.zoneOf(rank);
          zoneCount[zone]++;
          if (rank === 1) playerTop++;
          seasonsRun++;

          const rivalBefore = c.rival.leagueIdx;
          const gap = li - c.rival.leagueIdx;
          gapCount[gap] = (gapCount[gap] || 0) + 1;

          // Transition de ligue du joueur — même règle que nextSeason()
          if (zone === 'promo' && li < 5) { c.leagueIdx = li + 1; }
          else if (zone === 'releg' && li > 0) { c.leagueIdx = li - 1; }
          c.league = L[c.leagueIdx];

          this.advanceRival();
          const d = c.rival.leagueIdx - rivalBefore;
          if (d > 0) rivalMoves.promo++; else if (d < 0) rivalMoves.releg++; else rivalMoves.stay++;

          c.season++;
          this.recalcGen();
        }
        rivalLeagueEnd[c.rival.leagueIdx]++;
      }
    } finally {
      this.state = savedState;
    }

    // ---------- rapport ----------
    const pad = (s, n) => (String(s) + '                    ').slice(0, n);
    const pct = (x, tot) => tot ? (x * 100 / tot).toFixed(1) + '%' : '—';
    let r = '';
    r += 'ROBOT CHRONICLE ' + this.VERSION + ' — RAPPORT\n';
    r += nCareers + ' carrières × ' + nSeasons + ' saisons (' + seasonsRun + ' saisons)\n';
    r += 'RELEG_FROM=' + this.RELEG_FROM + '  PROMO_SLOTS=' + this.PROMO_SLOTS + '  LEAGUE_SIZE=' + this.LEAGUE_SIZE + '\n';
    r += '\n— RIVAL, mouvement par saison —\n';
    const rt = rivalMoves.promo + rivalMoves.releg + rivalMoves.stay;
    r += '  monte    ' + pad(rivalMoves.promo, 7) + pct(rivalMoves.promo, rt) + '\n';
    r += '  reste    ' + pad(rivalMoves.stay, 7) + pct(rivalMoves.stay, rt) + '\n';
    r += '  descend  ' + pad(rivalMoves.releg, 7) + pct(rivalMoves.releg, rt) + '\n';
    r += '\n— RIVAL, ligue en fin de carrière —\n';
    for (let i = 0; i < 6; i++) r += '  ' + pad(L[i], 14) + pad(rivalLeagueEnd[i], 6) + pct(rivalLeagueEnd[i], nCareers) + '\n';
    r += '\n— ÉCART DE LIGUE joueur − rival —\n';
    Object.keys(gapCount).map(Number).sort((a, b) => a - b).forEach(g => {
      const lab = g === 0 ? 'même ligue' : (g > 0 ? g + ' devant le rival' : (-g) + ' derrière le rival');
      r += '  ' + pad(lab, 22) + pct(gapCount[g], seasonsRun) + '\n';
    });
    r += '\n— USURE moyenne par saison (20 combats) —\n';
    Object.keys(wearByChassis).forEach(id => {
      const w = wearByChassis[id];
      const mod = this.wearMod(this.CHASSIS_MOD[id] || this.CHASSIS_MOD.tactical);
      r += '  ' + pad(id, 10) + pad((w.wear / Math.max(1, w.n)).toFixed(1) + ' pts', 12)
        + 'wearMod ' + mod.toFixed(3) + '\n';
    });
    r += '\n— CORES, solde net de fin de saison —\n';
    for (let i = 0; i < 6; i++) {
      const b = coresByLeague[i];
      if (!b.n) continue;
      r += '  ' + pad(L[i], 14) + pad(Math.round(b.gain / b.n), 9)
        + 'amél. ' + this.diagUpgradeAt(i) + ' ⚡/pt\n';
    }
    r += '\n— SPEC moyen, joueur vs rival, par saison —\n';
    r += '  saison    vous    lui    écart\n';
    for (let s = 0; s < nSeasons; s++) {
      const rows = specTrack.filter(x => x.s === s);
      if (!rows.length) continue;
      const me = rows.reduce((a, x) => a + x.me, 0) / rows.length;
      const him = rows.reduce((a, x) => a + x.him, 0) / rows.length;
      r += '  ' + pad('S' + (s + 1), 10) + pad(me.toFixed(1), 8) + pad(him.toFixed(1), 7)
        + (me - him >= 0 ? '+' : '') + (me - him).toFixed(1) + '\n';
    }
    r += '  points de stat achetés : ' + Math.round(upBought / Math.max(1, nCareers)) + ' par carrière\n';

    r += '\n— ZONE du joueur en fin de saison —\n';
    r += '  promotion ' + pct(zoneCount.promo, seasonsRun) + '\n';
    r += '  maintien  ' + pct(zoneCount.stay, seasonsRun) + '\n';
    r += '  relégation ' + pct(zoneCount.releg, seasonsRun) + '\n';
    r += '  1re place ' + pct(playerTop, seasonsRun) + '\n';
    r += '\ncalculé en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n';
    return r;
  },

  // Prix d'amélioration pour une ligue donnée, sans dépendre de l'état
  // courant : upgradePrice() lit this.state.career, déjà restauré ici.
  diagUpgradeAt(li) { return 1000 + li * 1150; },

  // ============================================================
  // TUTORIEL
  // ============================================================

  tutoPage: 0,

  startTutorial() { this.tutoPage = 0; this.goTo('tuto'); this.renderTutoPage(); },

  renderTutoPage() {
    const data = this.TUTO_SCREENS[this.tutoPage];
    const total = this.TUTO_SCREENS.length;
    const isLast = this.tutoPage === total - 1;
    const isFirst = this.tutoPage === 0;

    let h = '<div class="step-dots">';
    for (let i = 0; i < total; i++) {
      h += '<div class="step-dot ' + (i < this.tutoPage ? 'done' : i === this.tutoPage ? 'active-long' : '') + '"></div>';
    }
    h += '</div>';

    h += '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:10px 0">';
    h += '<div style="text-align:center;font-size:50px;margin-bottom:12px">' + data.icon + '</div>';
    h += '<div class="page-title">' + data.title + '</div>';
    h += '<div class="page-sub" style="white-space:pre-line">' + data.sub + '</div>';

    h += '<div class="explain">';
    data.cards.forEach(card => {
      h += '<div class="explain-card"><div class="explain-icon">' + card.icon + '</div>';
      // v0.16.1 — G5 : bornes du classement calculées depuis les
      // constantes. Le tutoriel annonçait « Places 12 à 15 » et « 4 à 11 »
      // en dur alors que RELEG_FROM vaut 13 : il contredisait la règle et
      // la légende du classement.
      const cardName = card.name
        .replace('{PROMO}', '1 à ' + this.PROMO_SLOTS)
        .replace('{STAY}', (this.PROMO_SLOTS + 1) + ' à ' + (this.RELEG_FROM - 1))
        .replace('{RELEG}', this.RELEG_FROM + ' à ' + this.LEAGUE_SIZE);
      h += '<div><div class="explain-name">' + cardName + '</div>';
      h += '<div class="explain-desc">' + card.desc + '</div></div></div>';
    });
    h += '</div>';

    if (data.demo) {
      h += '<div class="demo-box"><div class="demo-label">' + data.demo.label + '</div>';
      data.demo.rows.forEach(r => {
        h += '<div class="demo-row"><span class="demo-row-label">' + r.l + '</span>';
        h += '<span class="demo-row-val ' + r.c + '">' + r.v + '</span></div>';
      });
      h += '</div>';
    }
    if (data.highlight) {
      h += '<div class="highlight-box"><div class="highlight-text" style="white-space:pre-line">' + data.highlight + '</div></div>';
    }
    h += '</div>';

    h += '<div class="tuto-nav">';
    if (!isFirst) h += '<button class="btn-primary btn-cyan" style="flex:1" onclick="RC.tutoBack()">← Retour</button>';
    h += isLast
      ? '<button class="btn-primary btn-yellow" style="flex:1" onclick="RC.tutoFinish()">Commencer →</button>'
      : '<button class="btn-primary btn-cyan" style="flex:1" onclick="RC.tutoNext()">Suivant →</button>';
    h += '</div>';

    document.getElementById('tuto-container').innerHTML = h;
  },

  tutoNext() {
    if (this.tutoPage < this.TUTO_SCREENS.length - 1) {
      this.tutoPage++; this.renderTutoPage();
      document.getElementById('tuto').scrollTop = 0;
    }
  },

  tutoBack() {
    if (this.tutoPage > 0) {
      this.tutoPage--; this.renderTutoPage();
      document.getElementById('tuto').scrollTop = 0;
    }
  },

  tutoFinish() { this.state.firstLaunch = false; this.saveState(); this.goTo('home'); },

  // ============================================================
  // CRÉATION DU ROBOT
  // ============================================================

  renderCreationCards() {
    let h = '';
    this.CHASSIS.forEach(c => {
      h += '<div class="card" onclick="RC.selectChassis(\'' + c.id + '\', this)">';
      h += '<div class="card-icon">' + c.icon + '</div>';
      h += '<div class="card-name">' + c.name + '</div>';
      h += '<div class="card-desc">' + c.desc + '</div>';
      h += '<div class="card-stats">';
      h += '<span class="stat-tag">PUI ' + c.stats.pui + '</span><span class="stat-tag">VIT ' + c.stats.vit + '</span>';
      h += '<span class="stat-tag">RÉS ' + c.stats.res + '</span><span class="stat-tag">INT ' + c.stats.int + '</span>';
      h += '</div>';
      h += '<div class="shop-desc" style="margin-top:8px">Prix : <b style="color:var(--yellow)">' + this.fmt(c.price) + ' ⚡</b></div>';
      h += '</div>';
    });
    document.getElementById('chassis-cards').innerHTML = h;

    h = '';
    this.IA_TYPES.forEach(ia => {
      h += '<div class="card" onclick="RC.selectIA(\'' + ia.id + '\', this)">';
      h += '<div class="card-icon">' + ia.icon + '</div>';
      h += '<div class="card-name">' + ia.name + '</div>';
      h += '<div class="card-desc">' + ia.desc + '</div>';
      h += '<div class="ia-effect"><span class="ia-effect-icon">⚙️</span>';
      h += '<span class="ia-effect-text"><b>EFFET</b><br>' + ia.effect + '</span></div>';
      h += '<div class="risk-bar"><span class="risk-label">Risque</span>';
      h += '<div class="risk-meter"><div class="risk-fill risk-' + ia.risk + '"></div></div></div>';
      h += '<div class="shop-desc" style="margin-top:8px">Prix : <b style="color:var(--yellow)">' + this.fmt(ia.price) + ' ⚡</b></div>';
      h += '</div>';
    });
    document.getElementById('ia-cards').innerHTML = h;

    h = '';
    this.SPONSORS.forEach(s => {
      h += '<div class="card ' + s.cls + '" onclick="RC.selectSponsor(\'' + s.id + '\', this)">';
      h += '<div class="card-icon">' + s.icon + '</div>';
      h += '<div class="card-name">' + s.name + '</div>';
      h += '<div class="card-desc">' + s.desc + '</div>';
      h += '<div class="card-stats">';
      s.tags.forEach(t => { h += '<span class="stat-tag">' + t + '</span>'; });
      h += '</div>';
      h += '<div class="shop-desc" style="margin-top:8px">Apport : ' + this.fmt(s.fx.startCores) + ' ⚡';
      h += s.fx.canDrop ? ' · Peut vous lâcher' : ' · Ne vous lâche jamais';
      h += '</div></div>';
    });
    document.getElementById('sponsor-cards').innerHTML = h;
  },

  startCreation() {
    this.state.creation = { chassis: null, ia: null, sponsor: null };
    document.querySelectorAll('#chassis-cards .card, #ia-cards .card, #sponsor-cards .card')
      .forEach(c => c.classList.remove('selected'));
    this.refreshBudget();          // v0.12 — sinon le bandeau reste vide
    this.goTo('create-chassis');
  },

  // v0.12 — dotation de 15 000 ⚡ : le châssis et l'IA s'achètent.
  budgetLeft() {
    const cr = this.state.creation || {};
    let spent = 0;
    if (cr.chassis) { const x = this.CHASSIS.find(c => c.id === cr.chassis); if (x) spent += x.price; }
    if (cr.ia) { const x = this.IA_TYPES.find(i => i.id === cr.ia); if (x) spent += x.price; }
    return this.START_CORES - spent;
  },

  refreshBudget() {
    const left = this.budgetLeft();
    // v0.13 (ajusté) — le bandeau ne montrait que ce qu'il restait,
    // jamais la dotation de départ (15 000 ⚡) : un nombre isolé, sans
    // repère pour savoir s'il est haut ou bas.
    ['budget-chassis','budget-ia'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = 'Dotation <b style="color:var(--text)">' + this.fmt(this.START_CORES) + ' ⚡</b> · il reste <b style="color:var(--yellow)">' + this.fmt(left) + ' ⚡</b>';
    });
    // v0.13 (ajusté) — §3.3 : présentation reprise, l'ancienne version
    // tenait en une seule ligne plate, peu lisible.
    const bs = document.getElementById('budget-sponsor');
    if (bs) bs.innerHTML = '<div class="sponsor-guarantee"><span class="sponsor-guarantee-icon">🤝</span><div><div class="sponsor-guarantee-val">2 000 ⚡</div><div class="sponsor-guarantee-lab">Apport garanti, quel que soit le sponsor choisi</div></div></div>';
    // grise ce qui n'est plus finançable
    document.querySelectorAll('#ia-cards .card').forEach((card, i) => {
      const ia = this.IA_TYPES[i];
      if (!ia) return;
      const ok = ia.price <= left;
      card.style.opacity = ok ? '' : '.35';
      card.style.pointerEvents = ok ? '' : 'none';
    });
  },

  selectChassis(id, el) {
    document.querySelectorAll('#chassis-cards .card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    this.state.creation.chassis = id;
    this.refreshBudget();
    setTimeout(() => this.goTo('create-ia'), 500);
  },

  selectIA(id, el) {
    document.querySelectorAll('#ia-cards .card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    this.state.creation.ia = id;
    this.refreshBudget();
    setTimeout(() => this.goTo('create-sponsor'), 500);
  },

  selectSponsor(id, el) {
    document.querySelectorAll('#create-sponsor .card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    this.state.creation.sponsor = id;
    setTimeout(() => this.showRecap(), 500);
  },

  showRecap() {
    const cr = this.state.creation;
    const chassis = this.CHASSIS.find(c => c.id === cr.chassis);
    const ia = this.IA_TYPES.find(i => i.id === cr.ia);
    const sponsor = this.SPONSORS.find(s => s.id === cr.sponsor);
    if (!chassis || !ia || !sponsor) return;

    const stats = { ...chassis.stats };
    if (ia.fx.startBonus) {
      Object.keys(stats).forEach(k => { stats[k] = Math.min(99, stats[k] + ia.fx.startBonus); });
    }
    const gen = this.computeGen(stats, 100, 0, 0, 0, 0, 0, false);
    const tier = this.specTier(gen);

    const prefixes = ['RC','MK','XR','VX','DR','NX','AX','ZR','KR','TX'];
    const robotName = this.pick(prefixes) + '-' + Math.floor(1000 + Math.random()*9000);

    let h = '<div class="recap-card">';
    h += '<div class="recap-title">Votre machine</div>';
    h += '<div class="recap-name">' + robotName + '</div>';
    h += '<div class="recap-sub">Ligue Amateur · Saison 1</div>';
    h += '<div style="display:flex;flex-direction:column;align-items:center;margin:14px 0 4px">';
    h += '<div class="gen-circle ' + this.tierCls(gen) + '" style="width:74px;height:74px">';
    h += '<div class="gen-circle-val" style="font-size:26px">' + gen + '</div>';
    h += '<div class="gen-circle-label">SPEC</div></div>';
    h += '<span class="tier-chip t-' + tier.key + '" style="margin-top:8px">' + tier.name + '</span></div>';

    h += '<div class="stats-row" style="margin:16px 0">';
    h += '<div class="stat-box"><div class="stat-value">' + stats.pui + '</div><div class="stat-label">Puiss.</div></div>';
    h += '<div class="stat-box"><div class="stat-value">' + stats.vit + '</div><div class="stat-label">Vit.</div></div>';
    h += '<div class="stat-box"><div class="stat-value">' + stats.res + '</div><div class="stat-label">Rés.</div></div>';
    h += '<div class="stat-box"><div class="stat-value">' + stats.int + '</div><div class="stat-label">Intel.</div></div>';
    h += '</div>';

    h += '<div class="recap-items">';
    h += '<div class="recap-item"><span class="recap-item-label">Châssis</span><span class="recap-item-value">' + chassis.icon + ' ' + chassis.name + '</span></div>';
    h += '<div class="recap-item"><span class="recap-item-label">IA</span><span class="recap-item-value">' + ia.icon + ' ' + ia.name + '</span></div>';
    h += '<div class="recap-item"><span class="recap-item-label">Sponsor</span><span class="recap-item-value">' + sponsor.icon + ' ' + sponsor.name.split(' ')[0] + '</span></div>';
    // v0.16.1 — G7 : la ligne affichait sponsor.fx.startCores, c'est-à-dire
    // l'apport du sponsor et non le solde : 2 000 au lieu de 5 500, en
    // contradiction avec « Il vous reste » quelques lignes plus bas.
    h += '<div class="recap-item"><span class="recap-item-label">Cores</span><span class="recap-item-value">' + this.fmt(this.START_CORES - chassis.price - ia.price + sponsor.fx.startCores) + ' ⚡</span></div>';
    h += '<div class="recap-item"><span class="recap-item-label">État</span><span class="recap-item-value" style="color:var(--green)">100% Optimal</span></div>';
    h += '</div>';

    // v0.12 — le détail de la dotation
    h += '<div class="recap-items" style="margin-top:10px">';
    h += '<div class="recap-item"><span class="recap-item-label">Dotation</span><span class="recap-item-value">' + this.fmt(this.START_CORES) + ' ⚡</span></div>';
    h += '<div class="recap-item"><span class="recap-item-label">Châssis ' + chassis.name + '</span><span class="recap-item-value" style="color:var(--pink)">−' + this.fmt(chassis.price) + ' ⚡</span></div>';
    h += '<div class="recap-item"><span class="recap-item-label">IA ' + ia.name + '</span><span class="recap-item-value" style="color:var(--pink)">−' + this.fmt(ia.price) + ' ⚡</span></div>';
    h += '<div class="recap-item"><span class="recap-item-label">Apport ' + sponsor.name + '</span><span class="recap-item-value" style="color:var(--green)">+' + this.fmt(sponsor.fx.startCores) + ' ⚡</span></div>';
    h += '<div class="recap-item"><span class="recap-item-label"><b>Il vous reste</b></span><span class="recap-item-value" style="color:var(--yellow)"><b>' + this.fmt(this.START_CORES - chassis.price - ia.price + sponsor.fx.startCores) + ' ⚡</b></span></div>';
    h += '</div>';

    h += '<div class="ia-effect" style="text-align:left"><span class="ia-effect-icon">' + ia.icon + '</span>';
    h += '<span class="ia-effect-text"><b>' + ia.name.toUpperCase() + '</b><br>' + ia.effect + '</span></div>';
    h += '<button class="btn-primary btn-red" onclick="RC.launchCareer()">Entrer dans l\'arène</button></div>';

    document.getElementById('recap-content').innerHTML = h;

    // v0.12 — dotation de 15 000 ⚡ moins les achats, plus l'apport du sponsor
    const spent = chassis.price + ia.price;
    const startCores = this.START_CORES - spent + sponsor.fx.startCores;
    this._pendingCareer = {
      name: robotName, chassis, ia, sponsor,
      gen, stats, cores: startCores, state: 100,
      startChassis: chassis.id,
      followers: 0, season: 1, league: 'Amateur', leagueIdx: 0
    };
    this.goTo('create-recap');
  },

  launchCareer() {
    if (!this._pendingCareer) return;
    const c = this._pendingCareer;
    Object.assign(c, {
      seasonWins:0, seasonLosses:0, seasonKO:0,
      totalWins:0, totalLosses:0, totalKO:0,
      seasonKOTaken:0, totalKOTaken:0,
      atoutsLeft:3, atoutsUsed:0, atoutsSuccess:0,
      narrativeCombat:0, simulatedResults:[], fightIndex:0, combatsFought:0,
      specialRepairUsed:false, midRepairUsed:false, transfersUsed:0,
      interOffers:null, satis:50, affection:15, traits:{},
      seasonC:{ atouts:0, counters:0, lowState:100, repairs:0, standingsSeen:false },
      deferred:[], persist:[], h2hWins:0, h2hLosses:0,
      atoutBonus:0, nextFight:null, nextRival:null, flagged:false,
      debtPeak:0, debtsCleared:0, wasInDebt:false, debtOpen:false, affPeak:15,
      seasonRDiff:0, seasonTie:0,
      maxFollowers:0, finished:false, cumulCommitted:false,
      folLog:[], tiersReached:[], timeline:[], eventsSeen:[], textsSeen:[],
      genMax:c.gen, totalEarned:c.cores, sponsorChanges:0,
      leaguesWon:0, bugsSuffered:0, insolvencies:0
    });
    c.rival = this.generateRival();
    this.state.career = c;
    this._pendingCareer = null;
    this.saveState();
    this.showRivalIntro();
  },

  // ============================================================

  });
})(window);
