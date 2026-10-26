/* Robot Chronicle — partie 04-standings; contenu conservé depuis l’objet RC original. */
(function (root) {
  const parts = root.__RC_MODULES || (root.__RC_MODULES = []);
  parts.push({
  // MODULE 5 — CLASSEMENT DE LIGUE (réécrit en v0.11.0)
  //
  // Principe : la saison entière des 14 adversaires est calculée
  // UNE FOIS en début de saison, puis simplement révélée journée
  // après journée. Le classement n'est jamais réécrit.
  //
  // La version précédente recalculait les bilans à chaque combat
  // à partir de ceux du joueur : des victoires apparaissaient,
  // des défaites disparaissaient, et le scripting se voyait.
  // ============================================================

  LEAGUE_SIZE: 15,
  PROMO_SLOTS: 3,
  // v0.13.3 — GDD §7.2 : le flux doit être symétrique, 3 promus contre
  // 3 relégués. Avec 12, la zone de relégation couvrait les rangs 12 à 15,
  // soit QUATRE robots pour trois promus. Zone correcte : rangs 13-14-15.
  RELEG_FROM: 13,

  leagueBaseSpec(leagueIdx) {
    const c = this.state.career;
    const theoric = 61 + leagueIdx * 7;
    if (!c) return theoric;
    const stuck = Math.min(12, c.seasonsInLeague || 0);
    return Math.round(Math.max(theoric - 10, Math.min(theoric + 12, c.gen - 5 - stuck)));
  },

  STANDING_TIERS: [
    { n:4, delta:  7 },
    { n:6, delta:  0 },
    { n:4, delta: -8 }
  ],

  // ------------------------------------------------------------
  // Cibles de victoires
  // ------------------------------------------------------------

  // Nombre de victoires que le joueur atteindra cette saison.
  // Fixé à la création du plateau : les combats simulés y convergent.
  // v0.15.0 — E2/E3 : COUPLAGE À UNE LIGUE.
  //
  playerTargetWins() {
    const c = this.state.career;
    if (c._targetWins == null) {
      if (this.isScriptedSeason()) {
        c._targetWins = 12 + Math.floor(Math.random() * 4);        // 12 à 15
      } else if (this.scriptedRank() != null) {
        // Saisons 2 et 3 scénarisées — voir scriptedRank().
        c._targetWins = this.winsForRank(this.scriptedRank());
      } else if ((c.leagueIdx || 0) === 5 && this.isFinalSeason()) {
        c._targetWins = 13 + Math.floor(Math.random() * 4);        // 13 à 16
      } else {
        c._targetWins = null;                                       // libre
      }
    }
    return c._targetWins;
  },

  // Nombre de victoires qui place approximativement à un rang donné.
  // Les adversaires visent en moyenne la moitié des 20 journées ; chaque
  // victoire supplémentaire fait gagner à peu près une place et demie.
  winsForRank(rank) {
    const mid = this.SEASON_FIGHTS / 2;
    const target = Math.round(mid + (8 - rank) * 0.62);
    return Math.max(4, Math.min(this.SEASON_FIGHTS - 3, target));
  },

  // v0.15.0 — E4 : les saisons 2 et 3 sont scénarisées.
  // Finir 13e en saison 2 après avoir été sauvé par la disqualification
  // donne le sentiment d'une promotion volée et coupe l'envie de
  // continuer. La courbe raconte désormais quelque chose : un milieu de
  // tableau honnête, puis une montée méritée.
  scriptedRank() {
    const c = this.state.career;
    if (!c) return null;
    if ((c.leagueIdx || 0) !== 1) return null;      // Régionale uniquement
    if (c.season === 2) return 6 + Math.floor(Math.random() * 2);   // 6e ou 7e
    if (c.season === 3) return 1 + Math.floor(Math.random() * 3);   // podium
    return null;
  },

  isFinalSeason() {
    const c = this.state.career;
    const bothThere = (c.leagueIdx || 0) === 5 && !!c.rival && c.rival.leagueIdx === 5;
    // La saison commune en Légendaire déclenche directement la finale.
    return bothThere;
  },

  // ------------------------------------------------------------
  // Construction du plateau et du calendrier
  // ------------------------------------------------------------

  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  },

  // Répartit `wins` victoires sur `n` journées, dans un ordre crédible
  buildSequence(wins, n) {
    const seq = [];
    for (let i = 0; i < n; i++) seq.push(i < wins);
    return this.shuffle(seq);
  },

  // ------------------------------------------------------------
  // v0.14.0 — A11 : MÉMOIRE DES LIGUES
  //
  // Avant, buildStandings() retirait 14 noms au hasard à chaque saison
  // et startNextSeason() faisait `c.standings = null`. Rien n'était
  // conservé : impossible de recroiser un robot en montant ou en
  // redescendant, alors que c'est exactement ce qu'une carrière de
  // circuit devrait produire.
  //
  // Le vivier de chaque ligue est désormais mémorisé dans
  // c.leaguePool[leagueIdx]. En y revenant, on retrouve les mêmes
  // machines — vieillies, car leur SPEC a suivi la ligue entre-temps.
  // Une partie du vivier est renouvelée à chaque passage pour que le
  // plateau ne soit jamais figé.
  // ------------------------------------------------------------

  // Proportion du vivier remplacée à chaque saison passée dans la ligue.
  LEAGUE_TURNOVER: 0.25,

  leaguePool(li) {
    const c = this.state.career;
    if (!c.leaguePool) c.leaguePool = {};
    return c.leaguePool[li] || null;
  },

  saveLeaguePool(li, bots) {
    const c = this.state.career;
    if (!c.leaguePool) c.leaguePool = {};
    // On ne garde que l'identité : les résultats sont propres à la saison.
    c.leaguePool[li] = bots
      .filter(b => !b.isRival)
      .map(b => ({ id:b.id, name:b.name, chassisId:b.chassisId, iaId:b.iaId, spec:b.spec }));
  },

  // Fait vieillir un vivier retrouvé : les robots ont continué à courir
  // pendant l'absence du joueur, leur niveau a suivi celui de la ligue.
  agePool(pool, li, seasonsAway) {
    const base = this.leagueBaseSpec(li);
    const n = Math.max(1, seasonsAway || 1);
    return pool.map(b => {
      const drift = Math.round((base - b.spec) * 0.35) + Math.floor(Math.random() * 5) - 2 + n;
      return Object.assign({}, b, { spec: Math.max(25, Math.min(99, b.spec + drift)) });
    });
  },

  buildStandings() {
    const c = this.state.career;
    const li = c.leagueIdx || 0;
    const base = this.leagueBaseSpec(li);
    const N = this.SEASON_FIGHTS;

    // --- Identités, radicaux uniques sur le plateau
    const usedRoot = {};
    usedRoot[(c.name || '').split('-')[0].toUpperCase()] = 1;
    if (c.rival) usedRoot[(c.rival.name || '').split('-')[0].toUpperCase()] = 1;

    // v0.14.0 — A11 : on repart du vivier mémorisé pour cette ligue,
    // s'il existe. Les robots déjà croisés sont conservés et vieillis ;
    // une partie est renouvelée pour que le plateau ne soit pas figé.
    let bots = [];
    let id = 0;
    const seen = this.leaguePool(li);
    if (seen && seen.length) {
      const away = Math.max(1, c.season - (c.leagueSeen && c.leagueSeen[li] || c.season));
      const keep = Math.max(0, Math.round(seen.length * (1 - this.LEAGUE_TURNOVER)));
      const kept = this.agePool(this.shuffle(seen.slice()).slice(0, keep), li, away);
      kept.forEach(b => {
        usedRoot[(b.name || '').split('-')[0].toUpperCase()] = 1;
        bots.push({
          id: b.id, name: b.name, chassisId: b.chassisId, iaId: b.iaId,
          spec: b.spec, w: 0, l: 0, j: 0, isRival: false, seq: null, known: true
        });
        const num = parseInt(String(b.id).replace(/\D/g, ''), 10);
        if (isFinite(num) && num >= id) id = num + 1;
      });
    }

    // Complément : on tire de nouvelles machines jusqu'à remplir le
    // plateau, en respectant la répartition par palier.
    const missing = (this.LEAGUE_SIZE - 1) - bots.length;
    let toDraw = missing;
    this.STANDING_TIERS.forEach(tier => {
      const share = Math.round(tier.n * missing / (this.LEAGUE_SIZE - 1));
      for (let i = 0; i < share && toDraw > 0; i++) {
        toDraw--;
        let root, guard = 0;
        do { root = this.pick(this.ROBOT_NAMES_POOL); } while (usedRoot[root] && guard++ < 80);
        usedRoot[root] = 1;
        const chassis = this.pick(this.CHASSIS);
        const ia = this.pick(this.IA_TYPES);
        bots.push({
          id: 'b' + (id++),
          name: root + '-' + Math.floor(10 + Math.random() * 90),
          chassisId: chassis.id, iaId: ia.id,
          spec: Math.max(25, Math.min(99, base + tier.delta + Math.floor(Math.random()*7) - 3)),
          w: 0, l: 0, j: 0, isRival: false, seq: null
        });
      }
    });
    // Arrondis : on complète au besoin pour atteindre le compte exact.
    while (bots.length < this.LEAGUE_SIZE - 1) {
      let root, guard = 0;
      do { root = this.pick(this.ROBOT_NAMES_POOL); } while (usedRoot[root] && guard++ < 80);
      usedRoot[root] = 1;
      const chassis = this.pick(this.CHASSIS);
      const ia = this.pick(this.IA_TYPES);
      bots.push({
        id: 'b' + (id++),
        name: root + '-' + Math.floor(10 + Math.random() * 90),
        chassisId: chassis.id, iaId: ia.id,
        spec: Math.max(25, Math.min(99, base + Math.floor(Math.random()*7) - 3)),
        w: 0, l: 0, j: 0, isRival: false, seq: null
      });
    }
    bots = bots.slice(0, this.LEAGUE_SIZE - 1);

    // v0.15.0 — E5 : tirage de départage figé pour la saison (GDD §6.1,
    // critère 4). Invisible, stable, il ne départage que les égalités
    // parfaites restantes. Il remplace l'ordre alphabétique supprimé.
    this.shuffle(bots.slice()).forEach((b, i) => { b.tie = i + 1; });
    bots.forEach(b => { b.rdiff = 0; });
    // Le joueur reçoit lui aussi son rang de départage, tiré dans le même
    // intervalle : il n'est ni favorisé ni pénalisé par le hasard figé.
    c.seasonTie = 1 + Math.floor(Math.random() * this.LEAGUE_SIZE);

    // Mémorise le vivier et la saison de passage, pour le prochain retour.
    if (!c.leagueSeen) c.leagueSeen = {};
    c.leagueSeen[li] = c.season;
    this.saveLeaguePool(li, bots);

    // v0.14.0 — trace des machines affrontées en Amateur : c'est la
    // condition du trophée « Vieux Démons », qui demande d'en recroiser
    // une en Légendaire au cours de la même carrière.
    if (li === 0) {
      if (!c.metAmateur) c.metAmateur = [];
      bots.forEach(b => { if (c.metAmateur.indexOf(b.id) === -1) c.metAmateur.push(b.id); });
    }

    // Le rival prend une place quand il est dans la ligue.
    // v0.11.0 — en Légendaire il doit y être d'office : le plateau de la
    // dernière saison était bâti alors qu'il était encore en Elite, et il
    // ne pouvait donc pas figurer au tournoi.
    const r = c.rival;
    // v0.13 — §14.1 : le forçage par téléportation est supprimé. Le
    // rival ne rejoint la Légendaire que par ses propres résultats,
    // via l'aimant de simulateRivalMatchday() et advanceRival().
    const rivalHere = r.leagueIdx === li;
    if (rivalHere) {
      const slot = Math.floor(Math.random() * bots.length);
      bots[slot] = {
        id: 'rival', name: r.name, chassisId: r.chassis.id, iaId: r.ia.id,
        spec: r.gen, w: 0, l: 0, j: 0, isRival: true, seq: null, rdiff: 0
      };
    }

    // --- Cibles de victoires, décidées maintenant et jamais retouchées
    const target = this.playerTargetWins();
    const order = this.shuffle(bots.filter(b => !b.isRival));
    const rivalBot = bots.find(b => b.isRival);

    if (target != null && this.isScriptedSeason()) {
      // Saison Amateur : joueur 4e, rival 2e
      const tops = [];
      if (order[0]) tops.push({ bot: order[0], wins: target + 3 });
      if (rivalBot)  tops.push({ bot: rivalBot,  wins: target + 2 });
      else if (order[2]) tops.push({ bot: order[2], wins: target + 2 });
      if (order[1]) tops.push({ bot: order[1], wins: target + 1 });
      tops.forEach(t => { t.bot.targetW = Math.min(N, t.wins); });
      const rest = bots.filter(b => b.targetW == null);
      rest.forEach((b, i) => { b.targetW = Math.max(0, target - 1 - (i % 6)); });

    } else if (target != null && this.isFinalSeason()) {
      // v0.16.0 — GDD §6.3 : la dernière saison doit produire une VRAIE
      // ÉGALITÉ, pas seulement deux places voisines.
      //
      // L'ancienne règle donnait au rival `target ± 1` victoire : le jeu
      // annonçait ensuite « vous terminez à égalité » alors que le tableau
      // affichait 45 contre 42, ou 42 contre 39. Le joueur le voyait
      // immédiatement — c'est l'incohérence la plus signalée en test.
      //
      // Le rival reçoit donc EXACTEMENT le même nombre de victoires, donc
      // les mêmes points. La différence de rounds est alignée séparément
      // (voir alignRivalRoundDiff), et le départage est neutralisé en
      // Légendaire pour que personne ne passe devant l'autre.
      if (rivalBot) rivalBot.targetW = Math.min(N, Math.max(0, target));
      const floor = target - 1;
      bots.forEach(b => { if (b.targetW == null) b.targetW = Math.max(0, floor - Math.floor(Math.random()*4)); });

    } else {
      // Saison libre : chacun selon son niveau
      bots.forEach(b => {
        const edge = (b.spec - base) / 10;
        b.targetW = Math.max(2, Math.min(N - 2, Math.round(N * (0.5 + edge * 0.06) + (Math.random()*4 - 2))));
      });
    }

    // --- Le calendrier complet, figé
    bots.forEach(b => { b.seq = this.buildSequence(b.targetW, N); });

    c.standings = bots;
    c.matchday = 0;
    if (rivalHere) { r.seasonWins = 0; r.seasonLosses = 0; }
    this.buildSchedule();
  },

  buildSchedule() {
    const c = this.state.career;
    const ids = c.standings.map(b => b.id);
    let sched = this.shuffle(ids.slice());
    // v0.12 — GDD RÈGLES § 6.2 : une seule confrontation avec le rival
    // par saison. Il est exclu du tirage qui comble les journées
    // manquantes, sinon il peut sortir deux fois.
    const fillers = ids.filter(id => id !== 'rival');
    const extra = this.shuffle(fillers.slice()).slice(0, this.SEASON_FIGHTS - ids.length);
    sched = sched.concat(extra);

    const rivalIdx = sched.indexOf('rival');
    if (rivalIdx !== -1) {
      const slots = [];
      for (let i = 0; i < this.SEASON_FIGHTS; i++) if (i % 4 === 0) slots.push(i);
      const target = this.pick(slots);
      const tmp = sched[target]; sched[target] = 'rival'; sched[rivalIdx] = tmp;
    }
    c.schedule = sched;
  },

  ensureStandings() {
    const c = this.state.career;
    if (!c.standings || !c.standings.length || !c.schedule || c.schedule.length !== this.SEASON_FIGHTS
        || !c.standings[0].seq) {
      this.buildStandings();
    }
  },

  standingById(id) {
    const c = this.state.career;
    return (c.standings || []).find(b => b.id === id) || null;
  },

  currentScheduled() {
    const c = this.state.career;
    this.ensureStandings();
    return this.standingById(c.schedule[Math.min(c.fightIndex, this.SEASON_FIGHTS - 1)]);
  },

  opponentFromStanding(st) {
    const c = this.state.career;
    const chassis = this.CHASSIS.find(x => x.id === st.chassisId) || this.CHASSIS[0];
    const ia = this.IA_TYPES.find(x => x.id === st.iaId) || this.IA_TYPES[0];
    const spec = (typeof st.spec === 'number' && isFinite(st.spec)) ? st.spec : this.leagueBaseSpec(c.leagueIdx || 0);
    const baseSum = chassis.stats.pui + chassis.stats.vit + chassis.stats.res + chassis.stats.int;
    const targetSum = Math.max(140, (spec - (c.leagueIdx || 0) * 2) / 0.28);
    const k = targetSum / baseSum;
    const stats = {};
    Object.keys(chassis.stats).forEach(key => {
      stats[key] = Math.max(10, Math.min(99, Math.round(chassis.stats[key] * k)));
    });
    return {
      name: st.name, chassis, ia, stats, gen: spec,
      hidden: !st.isRival && Math.random() > 0.4,
      isRival: !!st.isRival, standingId: st.id
    };
  },

  // ------------------------------------------------------------
  // Une journée : on RÉVÈLE les résultats prévus, on n'en invente pas
  // ------------------------------------------------------------

  playMatchday(playerOpponentId, playerWon) {
    const c = this.state.career;
    this.ensureStandings();
    const idx = Math.min(c.matchday || 0, this.SEASON_FIGHTS - 1);

    c.standings.forEach(b => {
      let win = b.seq[idx];
      if (b.id === playerOpponentId) {
        // Le résultat réel prime. Pour préserver son total de fin de
        // saison, on échange avec une journée à venir — jamais avec une
        // journée déjà affichée.
        const real = !playerWon;
        if (real !== win) {
          // Permutation : la journée à venir reçoit l'ancienne valeur,
          // la journée courante reçoit le résultat réel. Le total de fin
          // de saison du robot reste donc exactement celui prévu.
          for (let k = idx + 1; k < this.SEASON_FIGHTS; k++) {
            if (b.seq[k] === real) { b.seq[k] = win; b.seq[idx] = real; break; }
          }
          win = b.seq[idx];
        }
      }
      b.j++;
      if (win) b.w++; else b.l++;
      b.rdiff = (b.rdiff || 0) + this.botRoundDiff(b, idx, win);
      if (b.isRival) {
        if (win) { c.rival.seasonWins++; c.rival.wins++; if (Math.random() < 0.12) c.rival.ko++; }
        else {
          c.rival.seasonLosses++; c.rival.losses++;
          // v0.15.0 — E6 : ses KO subis, symétriques de ses KO infligés.
          if (Math.random() < 0.12) c.rival.koTaken = (c.rival.koTaken || 0) + 1;
        }
      }
    });

    // Le rival évolue ailleurs : sa propre saison avance en parallèle
    if (!c.standings.some(b => b.isRival)) this.simulateRivalMatchday();

    c.matchday = idx + 1;
    // v0.16.0 — GDD §6.3 : maintient l'égalité parfaite pendant la saison
    // d'ex aequo, y compris si le joueur consulte le classement en cours
    // de saison.
    this.alignRivalRoundDiff();
    this.rebalanceTops();
    c.rival.gen = this.computeGen(c.rival.stats, c.rival.state || 92,
                                  c.rival.wins, c.rival.losses, c.rival.leagueIdx, 0, 0, false);
    const rs = c.standings.find(b => b.isRival);
    if (rs) rs.spec = c.rival.gen;
  },

  // Si le joueur dépasse sa cible — une victoire narrative n'est pas
  // pilotable —, les robots de tête récupèrent l'écart sur leurs journées
  // À VENIR. Rien de déjà affiché n'est retouché.
  // Ajuste les journées À VENIR pour que le podium reste exactement celui
  // prévu : 1er au-dessus du joueur, rival 2e, un 3e juste devant lui.
  // Rien de déjà affiché n'est retouché — seul l'avenir est réécrit,
  // ce qui reste invisible et laisse les bilans cohérents.
  rebalanceTops() {
    const c = this.state.career;
    if (c._targetWins == null) return;
    const N = this.SEASON_FIGHTS;
    const idx = c.matchday;
    if (c.seasonWins > c._targetWins) c._targetWins = c.seasonWins;
    const T = c._targetWins;

    // Fixe le total de fin de saison d'un robot en n'agissant qu'à venir
    const setFinal = (b, want) => {
      let proj = b.w;
      for (let k = idx; k < N; k++) if (b.seq[k]) proj++;
      for (let k = idx; k < N && proj < want; k++) if (!b.seq[k]) { b.seq[k] = true; proj++; }
      for (let k = N - 1; k >= idx && proj > want; k--) if (b.seq[k]) { b.seq[k] = false; proj--; }
      b.targetW = proj;
      return proj;
    };

    const rivalBot = c.standings.find(b => b.isRival);
    const others = c.standings.filter(b => !b.isRival)
                     .sort((a, b) => (b.targetW || 0) - (a.targetW || 0));

    if (this.isScriptedSeason()) {
      if (others[0]) setFinal(others[0], Math.min(N, T + 3));
      if (rivalBot)  setFinal(rivalBot,  Math.min(N, T + 2));
      if (others[1]) setFinal(others[1], Math.min(N, T + 1));
      const ceiling = T - 1;
      others.slice(2).forEach(b => setFinal(b, Math.min(ceiling, b.targetW || 0)));
    } else if (this.isFinalSeason()) {
      // Joueur et rival aux deux premières places, ordre libre
      if (rivalBot) setFinal(rivalBot, Math.min(N, T + (rivalBot.targetW > T ? 1 : -1)));
      const ceiling = Math.min(T, rivalBot ? rivalBot.targetW : T) - 1;
      others.forEach(b => setFinal(b, Math.min(ceiling, b.targetW || 0)));
    }
  },

  // Journée du rival dans sa propre ligue
  simulateRivalMatchday() {
    const c = this.state.career;
    const r = c.rival;
    if ((r.seasonWins + r.seasonLosses) >= this.SEASON_FIGHTS) return;
    if (!r.seq) {
      const expected = this.leagueBaseSpec(r.leagueIdx);
      let edge = (r.gen - expected) / 10;
      // v0.13 — §14.1 : l'aimant. Dès que le joueur atteint la Mondiale
      // et tant que le rival n'a pas rejoint la Légendaire, un vent
      // favorable pousse discrètement ses résultats — jamais une
      // téléportation, juste une saison un peu meilleure que ce que ses
      // stats brutes auraient donné seules.
      const pl = c.leagueIdx || 0;
      // Un léger biais narratif peut accélérer le rival s'il est derrière.
      // Sa montée reste déterminée par son rang réellement simulé; le
      // joueur n'est jamais retenu pour l'attendre.
      const gap = pl - r.leagueIdx;
      if (gap >= 1 && r.leagueIdx < 5) {
        edge += Math.min(2.4, 1.2 + (gap - 1) * 0.6);
      }
      // v0.14.0 — A1 : le coefficient était 0.06, ce qui écrasait tout.
      const t = Math.max(3, Math.min(this.SEASON_FIGHTS - 3,
        Math.round(this.SEASON_FIGHTS * (0.5 + edge * 0.11) + (Math.random()*4 - 2))));
      // Quand le joueur a une division d'avance, le rival reçoit une
      // saison scénarisée suffisamment forte pour viser le podium. Son
      // classement dans sa ligue reste calculé normalement à partir de ce
      // bilan et des bilans simulés de ses adversaires.
      const target = gap >= 1 && r.leagueIdx < 5
        ? Math.max(t, Math.min(this.SEASON_FIGHTS - 3, this.winsForRank(this.PROMO_SLOTS) + 2))
        : t;
      r.seq = this.buildSequence(target, this.SEASON_FIGHTS);
      r.targetW = target;
    }
    const i = r.seasonWins + r.seasonLosses;
    if (r.seq[i]) { r.seasonWins++; r.wins++; if (Math.random() < 0.12) r.ko++; }
    else { r.seasonLosses++; r.losses++; }
  },

  completeRivalSeason() {
    const c = this.state.career;
    const r = c.rival;
    if (c.standings && c.standings.some(b => b.isRival)) return;
    let guard = 0;
    while ((r.seasonWins + r.seasonLosses) < this.SEASON_FIGHTS && guard++ < 40) {
      this.simulateRivalMatchday();
    }
  },

  // Place du rival dans SA ligue quand il n'est pas avec le joueur.
  // Sert à décider sa promotion : elle dépend de son rang, comme pour
  // le joueur, et non plus de son seul taux de victoire.
  // gap = ligue du joueur − ligue du rival.
  // Positif : le rival est derrière, sa ligue lui est plus facile, il a
  // donc de bonnes chances de monter. Négatif : il est devant et peine.
  // v0.12 — le rang du rival dans SA ligue. Auparavant retiré au hasard à
  // chaque appel : affiché tel quel, il aurait sauté de 4e à 11e d'une
  // journée à l'autre. Les 14 objectifs de ses adversaires sont désormais
  // figés en début de saison, exactement comme dans la ligue du joueur.
  ensureRivalLeagueSeq() {
    const r = this.state.career.rival;
    if (!r) return;
    if (r.leagueSeq && r.leagueSeq.length === this.LEAGUE_SIZE - 1 && r.leagueSeqSeason === r.season) return;
    const seq = [];
    for (let i = 0; i < this.LEAGUE_SIZE - 1; i++) {
      seq.push(Math.round(this.SEASON_FIGHTS * (0.28 + Math.random() * 0.42)));
    }
    r.leagueSeq = seq;
    r.leagueSeqSeason = r.season;
  },

  rivalRankInOwnLeague(gap) {
    const r = this.state.career.rival;
    if (!r) return 8;
    this.ensureRivalLeagueSeq();
    const played = (r.seasonWins || 0) + (r.seasonLosses || 0);
    if (!played) return 8;
    const ratio = played / this.SEASON_FIGHTS;
    const mine = r.seasonWins || 0;
    // Le rival peut recevoir un léger appui scénaristique s'il est derrière.
    // Être devant le joueur ne le pénalise jamais.
    const ease = Math.max(0, Math.min(2, gap || 0)) * 4;
    let better = 0;
    r.leagueSeq.forEach(t => { if (Math.round((t - ease) * ratio) > mine) better++; });
    return better + 1;
  },

  // Phrase de situation, pour la fiche du rival hors ligue.
  rivalLeagueNote() {
    const rank = this.rivalRankInOwnLeague(0);
    if (!rank) return '';
    if (rank <= this.PROMO_SLOTS) return 'En position de monter.';
    if (rank >= this.RELEG_FROM) return 'En position de descendre.';
    return 'Installé en milieu de tableau.';
  },


  // ------------------------------------------------------------
  // Table et zones
  // ------------------------------------------------------------

  // v0.15.0 — E5 : ordre de départage du GDD §6.1.
  //   1. Points
  //   2. Différence de structure — dégâts infligés moins encaissés
  //   3. Différence victoires-défaites
  //   4. Tirage figé en début de saison, invisible et stable
  //
  // L'ordre alphabétique est SUPPRIMÉ, comme l'exige le GDD : il était
  // arbitraire et repérable. Comme tout le monde dispute 20 combats,
  // (victoires − défaites) est mathématiquement redondant avec les points ;
  // le vrai départage était donc la première lettre du nom. Constaté en
  // Légendaire : trois robots à 30 points classés par leur initiale.
  sortedStandings() {
    const c = this.state.career;
    this.ensureStandings();
    const rows = c.standings.map(b => ({
      id: b.id, name: b.name, chassisId: b.chassisId, iaId: b.iaId,
      spec: b.spec, w: b.w, l: b.l, j: b.j, pts: b.w * 3,
      diff: b.rdiff || 0, tie: b.tie || 0,
      isRival: b.isRival, isPlayer: false
    }));
    rows.push({
      id: 'player', name: c.name, chassisId: c.chassis.id, iaId: c.ia.id,
      spec: c.gen, w: c.seasonWins, l: c.seasonLosses,
      j: c.seasonWins + c.seasonLosses, pts: c.seasonWins * 3,
      diff: c.seasonRDiff || 0, tie: c.seasonTie || 0,
      isRival: false, isPlayer: true
    });
    rows.sort((a, b) =>
      (b.pts - a.pts) ||
      (b.diff - a.diff) ||
      ((b.w - b.l) - (a.w - a.l)) ||
      (a.tie - b.tie));
    rows.forEach((r, i) => { r.rank = i + 1; });

    // v0.16.0 — GDD §6.3 : lors de la saison d'ex aequo, joueur et rival
    // terminent à égalité de points ET de différence. Sans exception, le
    // tirage figé les départagerait quand même et produirait un 1er et un
    // 2e — ce qui contredirait le communiqué annonçant qu'on ne peut pas
    // les départager. Ils partagent donc le rang 1, et le suivant est 3e.
    if ((c.leagueIdx || 0) === 5 && this.isFinalSeason()) {
      const me = rows.find(x => x.isPlayer), ri = rows.find(x => x.isRival);
      if (me && ri && me.pts === ri.pts && me.diff === ri.diff) {
        const top = Math.min(me.rank, ri.rank);
        me.rank = top; ri.rank = top;
        rows.forEach(x => {
          if (!x.isPlayer && !x.isRival && x.rank > top) x.rank = Math.max(x.rank, top + 2);
        });
      }
    }
    return rows;
  },

  playerRank() {
    const row = this.sortedStandings().find(r => r.isPlayer);
    return row ? row.rank : this.LEAGUE_SIZE;
  },

  // v0.16.0 — F2 : DÉPARTAGE PAR DIFFÉRENCE DE ROUNDS.
  //
  // Le départage par dégâts de la v0.15.0 est abandonné : mesuré en jeu,
  // le SPEC y pesait 25 fois plus que le bilan (à 14V-6D, la différence
  // allait de +19 pour un SPEC 40 à +469 pour un SPEC 70), l'échelle du
  // joueur n'était pas comparable à celle des adversaires (ses combats
  // narratifs cumulaient trois rounds réels contre une valeur par journée
  // pour eux), et les nombres atteignaient ±600, illisibles.
  //
  // Chaque combat vaut désormais +3, +1, −1 ou −3 :
  //   victoire par KO ...... 3-0 d'office ... +3
  //   victoire nette ....... 3-0 ............ +3
  //   victoire serrée ...... 2-1 ............ +1
  //   défaite serrée ....... 1-2 ............ −1
  //   défaite nette ........ 0-3 ............ −3
  //   défaite par KO ....... 0-3 d'office ... −3
  //
  // RÈGLE DU KO : le KO vaut le score maximum
  // QUEL QUE SOIT le round où il tombe. Un KO au round 1 clôt le combat
  // sur 1-0, ce qui ne vaudrait que +1 alors qu'écraser d'entrée est plus
  // dominant qu'une victoire 2-1 ; pire, un KO au round 3 après deux
  // rounds perdus donnerait 1-2, soit une différence NÉGATIVE pour le
  // vainqueur. Conséquence voulue : mettre des KO améliore la différence.
  //
  // Échelle obtenue : environ +32 pour un 18V-2D, +16 pour un 14V-6D,
  // 0 pour un 10V-10D. Plage d'environ ±35.
  //
  // Les points ne changent pas : victoire = 3 points, KO ou non. Comme la
  // différence de buts au football, elle ne sert qu'à départager.
  roundDiff(won, ko, dominant) {
    if (ko) return won ? 3 : -3;
    if (dominant) return won ? 3 : -3;
    return won ? 1 : -1;
  },

  // Score de rounds d'un adversaire simulé pour une journée. Il ne combat
  // pas réellement : on tire une issue cohérente avec son résultat et son
  // écart de niveau. Tirage déterministe (semence figée par robot et par
  // journée) pour respecter R5 — aucune valeur affichée ne doit changer
  // entre deux consultations du classement.
  botRoundDiff(b, day, won) {
    const base = this.leagueBaseSpec(this.state.career.leagueIdx || 0);
    const edge = Math.max(-20, Math.min(20, (b.spec || base) - base));
    const seed = (this.hashCode(String(b.id) + ':' + day) % 1000) / 1000;
    // Un robot fort domine plus souvent ; un robot faible se fait écraser.
    const pDominant = won
      ? Math.max(0.18, Math.min(0.62, 0.34 + edge * 0.010))
      : Math.max(0.18, Math.min(0.62, 0.34 - edge * 0.010));
    return this.roundDiff(won, false, seed < pDominant);
  },

  // Hachage stable, sans dépendance : sert aux tirages déterministes.
  hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return Math.abs(h);
  },

  // v0.16.0 — GDD §6.3 : joueur et rival sont-ils réellement départagés ?
  // Sert de garde avant d'annoncer l'ex aequo : si l'alignement a échoué
  // pour une raison quelconque, mieux vaut une saison de plus qu'un texte
  // contredit par le tableau juste au-dessus.
  tiedWithRival() {
    const c = this.state.career;
    if (!c || !c.rival) return false;
    const st = (c.standings || []).find(b => b.isRival);
    if (!st) return false;
    return st.w === c.seasonWins && (st.rdiff || 0) === (c.seasonRDiff || 0);
  },

  // v0.16.0 — GDD §6.3 : aligne la différence de rounds du rival sur celle
  // du joueur pendant la saison d'ex aequo. Ses rounds ne sont jamais
  // affichés combat par combat — seul le cumul apparaît dans la colonne
  // DIFF — donc l'alignement est invisible. Appelé à chaque journée pour
  // que le classement reste cohérent même consulté en cours de saison.
  alignRivalRoundDiff() {
    const c = this.state.career;
    if (!c || (c.leagueIdx || 0) !== 5 || !this.isFinalSeason()) return;
    const st = (c.standings || []).find(b => b.isRival);
    if (!st) return;

    const last = (c.matchday || 0) >= this.SEASON_FIGHTS;
    if (!last) return;

    const played = st.w + st.l;
    const oldWins = st.w;
    const oldLosses = st.l;
    st.w = Math.max(0, Math.min(played, c.seasonWins));
    st.l = played - st.w;
    st.rdiff = c.seasonRDiff || 0;
    if (c.rival) {
      c.rival.seasonWins = st.w;
      c.rival.seasonLosses = st.l;
      c.rival.wins += st.w - oldWins;
      c.rival.losses += st.l - oldLosses;
    }
  },

  zoneOf(rank) {
    const li = this.state.career.leagueIdx || 0;
    // v0.15.0 — E1 : la Légendaire gardait `rank <= 4`, vestige du tournoi
    // final à quatre supprimé par le GDD v4.0 §17. Elle suit désormais les
    // mêmes bornes que les autres ligues : podium 1-3 (§6), relégation
    // 13-15. Seule l'Amateur reste sans relégation, c'est le plancher.
    if (rank <= this.PROMO_SLOTS) return 'promo';
    if (rank >= this.RELEG_FROM) return this.hasRelegZone(li) ? 'releg' : 'stay';
    return 'stay';
  },

  // Seule l'Amateur est un plancher. Les trois dernières places descendent
  // dans toutes les autres ligues, y compris la Légendaire.
  hasRelegZone(li) {
    return li !== 0;
  },

  // Termine la saison : on déroule les journées restantes du calendrier
  completeSeason() {
    const c = this.state.career;
    this.ensureStandings();
    this.completeRivalSeason();
    let guard = 0;
    while ((c.matchday || 0) < this.SEASON_FIGHTS && guard++ < 40) {
      const idx = c.matchday;
      c.standings.forEach(b => {
        if (b.j >= this.SEASON_FIGHTS) return;
        b.j++;
        const won = !!b.seq[idx];
        if (won) { b.w++; if (b.isRival) { c.rival.seasonWins++; c.rival.wins++; } }
        else {
          b.l++;
          if (b.isRival) {
            c.rival.seasonLosses++; c.rival.losses++;
            if (Math.random() < 0.12) c.rival.koTaken = (c.rival.koTaken || 0) + 1;
          }
        }
        b.rdiff = (b.rdiff || 0) + this.botRoundDiff(b, idx, won);
      });
      c.matchday = idx + 1;
      this.alignRivalRoundDiff();
    }
  },

  seasonStarted() {
    const c = this.state.career;
    return (c.fightIndex || 0) > 0;
  },

  showStandings() {
    // Le classement est désormais un calcul interne de la carrière.
    // L'écran public a été retiré pour ne pas exposer les rangs simulés.
    this.showCareer();
  },

  // ============================================================

  });
})(window);
