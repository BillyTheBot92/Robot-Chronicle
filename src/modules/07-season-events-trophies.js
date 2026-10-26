/* Robot Chronicle — partie 07-season-events-trophies; contenu conservé depuis l’objet RC original. */
(function (root) {
  const parts = root.__RC_MODULES || (root.__RC_MODULES = []);
  parts.push({
  // MODULE 4/4 — SIMULÉS, ÉVÉNEMENTS, SAISON, INTER-SAISON, FINAL
  // ============================================================

  simulatedWinChance() {
    const c = this.state.career;
    const li = c.leagueIdx || 0;
    const expectedGen = 56 + li * 7;
    let p = 0.50 + (c.gen - expectedGen) / 200;
    p += (this.stateMult(c.state) - 1) * 1.0;
    const fx = c.ia.fx || {};
    p += Math.min(0.08, (fx.learn || 0) * (c.combatsFought || 0)) * 0.5;
    p += (fx.scoreBonus || 0);
    return Math.max(0.22, Math.min(0.78, p));
  },

  // v0.7.0 — les combats simulés peuvent produire des KO.
  // Auparavant le compteur n'était incrémenté que sur les 5 combats
  // narratifs, avec un taux quasi nul : le joueur affichait 0 KO sur
  // toute une carrière pendant que son rival en accumulait.
  simulatedKOChance() {
    const c = this.state.career;
    const cm = this.CHASSIS_MOD[c.chassis.id] || this.CHASSIS_MOD.tactical;
    // La Puissance et le châssis décident de la capacité à finir un adversaire
    return Math.max(0.03, Math.min(0.28, 0.06 + (c.stats.pui / 99) * 0.16 * cm.dmgDealt));
  },

  runSimulatedBatch() {
    const c = this.state.career;
    const batch = Math.min(3, this.SEASON_FIGHTS - c.fightIndex);
    if (batch <= 0) { this.showSeasonSummary(); return; }

    const baseChance = this.simulatedWinChance();
    const koChance = this.simulatedKOChance();
    const li = c.leagueIdx || 0;
    const cm = this.CHASSIS_MOD[c.chassis.id] || this.CHASSIS_MOD.tactical;
    const results = [];
    let folDelta = 0;
    // v0.16.0 — F5 : la ligne Cores affichait le SOLDE total, sans dire ce
    // que le bloc avait rapporté — impossible de savoir si on avait gagné
    // 400 ou 4 000. La ligne Followers juste en dessous affiche pourtant un
    // delta. On mémorise le solde d'entrée pour présenter les deux.
    const coresAtStart = c.cores;

    for (let i = 0; i < batch; i++) {
      // L'écart de niveau avec l'adversaire du jour module la probabilité
      const stI = this.standingById(c.schedule[c.fightIndex + i]);
      const chance = stI
        ? Math.max(0.15, Math.min(0.88, baseChance + (c.gen - stI.spec) / 120))
        : baseChance;
      let won = Math.random() < chance;

      // v0.10.0 — saison Amateur : les combats simulés compensent les
      // résultats narratifs pour converger vers une cible de victoires.
      // C'est ce qui permet à la 4e place d'être exacte sans jamais
      // corriger le classement brutalement à la fin.
      const target = this.playerTargetWins();
      if (target != null) {
        const played = c.fightIndex + i;
        // Seuls les combats simulés sont pilotables : les narratifs
        // restants peuvent encore être perdus, il faut donc prendre
        // de l'avance sans compter dessus.
        let simLeft = 0;
        for (let k = played; k < this.SEASON_FIGHTS; k++) if (k % 4 !== 0) simLeft++;
        const need = target - c.seasonWins;
        if (need >= simLeft) won = true;
        else if (need <= 0) won = false;
      }
      const ko = won && Math.random() < koChance;
      // v0.13 — meme bareme d'usure que le combat narratif (§12.1),
      // plus aucun combat simule n'est gratuit en structure.
      const usureSim = this.computeUsure(won, ko);
      const dmg = Math.max(1, Math.round(usureSim.total * this.wearMod(cm)));
      // v0.8.0 — l'adversaire vient du calendrier de la ligue
      const st = this.standingById(c.schedule[c.fightIndex + i]);
      const opName = st ? st.name : (this.pick(this.ROBOT_NAMES_POOL) + '-' + Math.floor(10 + Math.random()*90));
      results.push({ num: c.fightIndex + i + 1, opponent: opName, won, ko, dmg, standingId: st ? st.id : null });

      // v0.16.0 — F2 : les combats simulés représentent 15 des 20 journées
      // et n'ont pas de rounds joués. On leur en génère, avec la même règle
      // que pour les adversaires — dont le KO qui vaut le maximum.
      c.seasonRDiff = (c.seasonRDiff || 0) + (ko
        ? this.roundDiff(true, true, false)
        : this.botRoundDiff({ id: 'player', spec: c.gen }, c.fightIndex + i, won));

      if (won) {
        c.seasonWins++; c.totalWins++;
        if (ko) { c.seasonKO++; c.totalKO++; }
        this.checkTrophies('fight', { victory:true });
        let gain = Math.floor(480 + li * 700);
        if (ko) gain = Math.floor(gain * 1.2);
        gain = Math.floor(gain * (1 + (c.sponsor.fx.bonusPct || 0)));
        c.cores += gain; c.totalEarned = (c.totalEarned || 0) + gain;
        this.trackDebt();
        folDelta += Math.floor((120 + Math.random()*260 + (ko ? 300 : 0)) * (1 + li*0.4));
      } else {
        c.seasonLosses++; c.totalLosses++;
        c.cores += Math.floor(130 + li * 90);
        this.trackDebt();
        folDelta -= Math.floor((60 + Math.random()*150) * (1 + li*0.3));
      }
      if (dmg > 0) c.state = Math.max(5, c.state - dmg);
      c.combatsFought = (c.combatsFought || 0) + 1;
    }

    const wonCount = results.filter(r => r.won).length;
    results.forEach(r => this.playMatchday(r.standingId, r.won));
    c.fightIndex += batch;
    c.simulatedResults = c.simulatedResults.concat(results);
    this.addFollowers(folDelta, 'Combats de ligue');
    this.addSatis((wonCount >= 2 ? 2 : -3) * (c.sponsor.fx.demand || 1));

    // Risque Underground
    let riskMsg = null;
    if (c.sponsor.fx.risk && Math.random() < 0.18) {
      const roll = Math.random();
      if (roll < 0.4) {
        const fine = Math.floor(700 * this.leagueFactor());
        const debt = this.payCores(fine, 'Amende du milieu');
        riskMsg = '🚨 Amende du milieu clandestin — -' + fine.toLocaleString('fr') + ' ⚡';
        if (debt) riskMsg += '<br>' + this.debtText(debt);
      } else if (roll < 0.75) {
        const d = 3 + Math.floor(Math.random()*5);
        c.state = Math.max(5, c.state - d);
        riskMsg = '🚨 Pièce défectueuse montée sur le châssis — -' + d + '% d\'état';
      } else {
        const f = Math.floor(1200 * this.leagueFactor());
        this.addFollowers(f, 'Aura underground');
        riskMsg = '🚨 Vos combats font parler dans les bas-fonds — +' + f.toLocaleString('fr') + ' followers';
      }
    }

    this.recalcGen();
    this.saveState();

    let h = '<div class="page-title" style="font-size:14px">🎲 Combats simulés</div>';
    h += '<div class="page-sub">Combats ' + results[0].num + ' à ' + results[results.length-1].num + ' · ' + c.league + ' · Saison ' + c.season + '</div>';

    results.forEach((r, i) => {
      h += '<div class="sim-row" style="animation-delay:' + (i*0.12) + 's">';
      h += '<span class="sim-num">#' + r.num + '</span>';
      h += '<span class="sim-opponent">vs ' + r.opponent + '</span>';
      h += '<span class="sim-result ' + (r.won ? 'sim-win' : 'sim-loss') + '">' + (r.ko ? 'KO' : (r.won ? 'WIN' : 'LOSS')) + '</span>';
      h += '<span class="sim-dmg">' + (r.dmg > 0 ? '-' + r.dmg + '%' : '') + '</span></div>';
    });

    if (riskMsg) h += '<div class="glitch-box" style="margin-top:12px"><div class="glitch-text">' + riskMsg + '</div></div>';

    h += '<div class="post-stats" style="margin-top:14px">';
    h += '<div class="post-row"><span class="post-row-label">État du robot</span><span class="post-row-val" style="color:' + this.stateColor(c.state) + '">' + c.state + '% · ' + this.stateLabel(c.state) + '</span></div>';
    const coresDelta = c.cores - coresAtStart;
    h += '<div class="post-row"><span class="post-row-label">Cores gagnés</span><span class="post-row-val" style="color:var(--yellow)">'
      + (coresDelta >= 0 ? '+' : '') + coresDelta.toLocaleString('fr') + ' ⚡'
      + '<span style="opacity:.5;font-size:10px"> · ' + c.cores.toLocaleString('fr') + ' au total</span></span></div>';
    h += '<div class="post-row"><span class="post-row-label">Followers</span><span class="post-row-val" style="color:' + (folDelta >= 0 ? 'var(--green)' : 'var(--pink)') + '">' + (folDelta >= 0 ? '+' : '') + folDelta.toLocaleString('fr') + '</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Bilan saison</span><span class="post-row-val" style="color:var(--cyan)">' + c.seasonWins + 'V — ' + c.seasonLosses + 'D</span></div>';
    h += '</div>';
    h += '<button class="btn-primary btn-cyan" onclick="RC.showCareer()">Continuer</button>';

    document.getElementById('simresults-content').innerHTML = h;
    this.goTo('simresults');
    // v0.14.0 — les combats simulés accordent des trophées (ligne
    // checkTrophies('fight') plus haut : KO, victoires cumulées…) mais
    // ne vidaient jamais la file. Un trophée gagné sur un combat simulé
    // attendait donc le prochain flush, qui pouvait tomber après un
    // événement narratif — d'où le « trophée KO reçu après un message ».
    // On vide ici, une fois l'écran de résultats affiché : le joueur voit
    // d'abord ses combats, puis le trophée par-dessus.
    this.flushTrophies();
  },

  // ============================================================
  // ÉVÉNEMENTS NARRATIFS
  // ============================================================

  pickEvent() {
    const c = this.state.career;
    if (!c.eventsSeen) c.eventsSeen = [];
    let pool = this.EVENTS.filter(e => c.eventsSeen.indexOf(e.title) === -1);
    pool = pool.filter(e => e.cat !== 'under' || c.sponsor.id === 'underground' || c.flagged);
    pool = pool.filter(e => e.cat !== 'sponsor' || c.sponsor.fx.canDrop);
    pool = pool.filter(e => e.cat !== 'rival' || c.season >= 2);
    // v0.12 — plusieurs événements Rival supposent un duel prochain :
    // ils n'ont aucun sens si le rival évolue dans une autre ligue.
    pool = pool.filter(e => !e.needSameLeague || (c.rival && c.rival.leagueIdx === c.leagueIdx));
    pool = pool.filter(e => e.cat !== 'media' || c.followers >= 3000);
    // v0.12 — conditions propres à certains événements
    pool = pool.filter(e => !e.minSeason || c.season >= e.minSeason);
    pool = pool.filter(e => e.req !== 'transfer' || (c.transfersUsed || 0) > 0);
    pool = pool.filter(e => e.req !== 'flagged' || !!c.flagged);
    if (!pool.length) return null;
    this._pendingEvent = this.pick(pool);
    return this._pendingEvent;
  },

  showEvent() {
    const ev = this._pendingEvent;
    if (!ev) { this.continueSeason(); return; }
    let h = '<div class="cat-' + ev.cat + '">';
    h += '<div class="ev-head"><div class="ev-cat">' + ev.icon + ' ' + ev.catName + '</div>';
    h += '<div class="ev-title">' + ev.title + '</div></div>';
    h += '<div class="ev-body"><p>' + ev.text + '</p></div>';
    h += '<div class="ev-tags">';
    ev.tags.forEach(t => { h += '<span class="ev-tag">' + t + ' en jeu</span>'; });
    h += '</div><div class="ev-choices">';
    // v0.16.0 — F4 : dans le rouge, les options qui coûtent de l'argent
    // sont grisées. Le joueur voit ce qu'il rate, ce qui donne du poids à
    // la situation, sans que ça devienne un piège sans fond.
    //
    // RISQUE DE BLOCAGE : si TOUTES les options
    // coûtent, l'écran devient une impasse — trois choix grisés et rien ne
    // se passe. On garantit donc qu'au moins une reste toujours cliquable.
    // Les options dont le coût n'est pas annoncé (fx.cores absent, effet
    // révélé après le choix) ne sont jamais grisées : rien ne permettrait
    // au joueur de comprendre pourquoi.
    const locked = ev.choices.map(ch => {
      const cost = (ch.fx && typeof ch.fx.cores === 'number' && ch.fx.cores < 0) ? -ch.fx.cores : 0;
      return cost > 0 && !this.canAfford(cost);
    });
    if (locked.every(Boolean)) {
      // Toutes bloquées : on rouvre la moins chère, sinon plus rien ne
      // permet d'avancer.
      let best = 0, bestCost = Infinity;
      ev.choices.forEach((ch, i) => {
        const cost = (ch.fx && typeof ch.fx.cores === 'number' && ch.fx.cores < 0) ? -ch.fx.cores : 0;
        if (cost < bestCost) { bestCost = cost; best = i; }
      });
      locked[best] = false;
    }
    ev.choices.forEach((ch, i) => {
      if (locked[i]) {
        h += '<div class="ev-choice ev-choice-locked">' + ch.t
          + '<span class="ev-choice-cost">Solde négatif</span></div>';
      } else {
        h += '<div class="ev-choice" onclick="RC.chooseEvent(' + i + ')">' + ch.t + '</div>';
      }
    });
    h += '</div></div>';
    document.getElementById('event-content').innerHTML = h;
    this.goTo('event');
  },



  // ============================================================
  //  v0.12 — LES 50 TROPHÉES
  //  Quatre portées : carrière · cumul · saison · combat.
  //  Les cumuls ne montent QU'À la clôture d'une carrière
  //  terminée : un abandon ne verse rien et ne retire rien.
  // ============================================================
  trophyDef(id) { return this.TROPHIES.find(t => t.id === id); },
  hasTrophy(id) { const t = this.state.meta.trophies[id]; return !!(t && t.got); },

  grant(id, tier) {
    if (!this.state.meta) return false;
    const def = this.trophyDef(id);
    if (!def) return false;
    const cur = this.state.meta.trophies[id];
    if (cur && cur.got && (tier === undefined || (cur.tier || 0) >= tier)) return false;
    this.state.meta.trophies[id] = { got:true, tier: tier !== undefined ? Math.max(tier, (cur&&cur.tier)||0) : undefined, date: Date.now() };
    this._troQ = this._troQ || [];
    this._troQ.push({ id, tier });
    this.saveState();
    return true;
  },

  tierReached(def, v) {
    if (!def.tiers) return undefined;
    let n = 0; def.tiers.forEach(t => { if (v >= t) n++; });
    return n;
  },

  cumulValue(counter) {
    const m = this.state.meta.cumul, c = this.state.career;
    const acq = counter === 'chassisPlayed' ? (m.chassisPlayed||[]).length : (m[counter] || 0);
    let pend = 0;
    if (c && !c.finished) {
      if (counter === 'ko') pend = c.totalKO || 0;
      else if (counter === 'cores') pend = c.totalEarned || 0;
      else if (counter === 'fights') pend = c.combatsFought || 0;
    }
    return { acquired: acq, pending: pend, total: acq + pend };
  },

  trophyCount() {
    return { got: this.TROPHIES.filter(t => this.hasTrophy(t.id)).length, total: this.TROPHIES.length };
  },

  // Seul endroit qui verse les cumuls.
  commitCumul() {
    const c = this.state.career, m = this.state.meta.cumul;
    if (c.cumulCommitted) return;
    c.cumulCommitted = true; c.finished = true;
    m.ko += (c.totalKO || 0);
    m.cores += (c.totalEarned || 0);
    m.fights += (c.combatsFought || 0);
    m.careersDone += 1;
    if (m.chassisPlayed.indexOf(c.startChassis || c.chassis.id) === -1) m.chassisPlayed.push(c.startChassis || c.chassis.id);
    [['destroyer', m.ko], ['pocket_money', m.cores]].forEach(pair => {
      const t = this.tierReached(this.trophyDef(pair[0]), pair[1]);
      if (t > 0) this.grant(pair[0], t);
    });
    if (m.fights >= 1000) this.grant('marathon');
    if (m.chassisPlayed.length >= 4) this.grant('collector');
    if (m.careersDone >= 5) this.grant('pantheon');
    if (m.careersDone >= 2) this.grant('again');
    if (this.puceCount() >= 20) this.grant('legendary_chip');
    const e = this.state.meta.endings || [];
    if (e.indexOf('no_regret')>=0 && e.indexOf('immortal')>=0 && e.indexOf('last_round')>=0) this.grant('all_paths');
    if (m.dmStreak >= 3) this.grant('not_scared');
    this.saveState();
  },

  trophyProgress(def) {
    const m = this.state.meta, c = this.state.career;
    const g = m.trophies[def.id];
    const o = { got: !!(g && g.got), tier: (g && g.tier) || 0 };
    if (def.scope === 'cumul' && def.counter) {
      if (def.counter === 'chassisPlayed') { o.acquired = (m.cumul.chassisPlayed||[]).length; o.pending = 0; }
      else if (def.counter === 'dmStreak') { o.acquired = m.cumul.dmStreak || 0; o.pending = 0; }
      else if (def.counter === 'careersDone') { o.acquired = m.cumul.careersDone || 0; o.pending = 0; }
      else { const v = this.cumulValue(def.counter); o.acquired = v.acquired; o.pending = v.pending; }
    } else if (def.id === 'spotlight' && c) { o.acquired = c.maxFollowers || c.followers || 0; o.pending = 0; }
    else if (def.id === 'legendary_chip') { o.acquired = this.puceCount(); o.pending = 0; }
    return o;
  },


  // ============================================================
  //  v0.12 — ÉCRAN TROPHÉES (classes existantes : inter-section,
  //  page-title, page-sub, puce, btn-back)
  // ============================================================
  // v0.13 — §18.1 : le Hall of Fame ne montre QUE les carrières du
  // joueur, jamais le rival. Tri principal par note SPEC MAXIMALE
  // atteinte (pas la SPEC finale, qui peut avoir chuté après une
  // défaite). Tri secondaire par ratio V/D en cas d'égalité. La fin
  // obtenue est une information affichée à côté, jamais un critère de
  // tri : une carrière SPEC 94 terminée par un refus n'est pas
  // hiérarchiquement au-dessus ou en dessous d'une SPEC 91 qui a
  // accepté et gagné.
  HOF_ENDING_LABEL: {
    no_regret:  { icon:'🕊️', name:'Sans Regret',  cls:'t-diamant' },
    immortal:   { icon:'♾️', name:"L'Immortel",    cls:'t-diamant' },
    last_round: { icon:'⚰️', name:'Dernier Round', cls:'t-epave' },
    destroyed:  { icon:'☠️', name:'Détruit',       cls:'t-epave' }
  },

  showHallOfFame() {
    const list = (this.state.hallOfFame || []).slice();
    list.sort((a, b) => {
      if (b.gen !== a.gen) return b.gen - a.gen;
      const ra = a.wins / Math.max(1, a.wins + a.losses);
      const rb = b.wins / Math.max(1, b.wins + b.losses);
      return rb - ra;
    });

    let h = '<div class="btn-back sticky" id="hof-back" onclick="RC.goTo(\'home\')">← Menu</div>';
    h += '<div class="page-title">🏛️ Hall of Fame</div>';
    h += '<div class="page-sub">' + list.length + ' carrière' + (list.length > 1 ? 's' : '') + ' menée' + (list.length > 1 ? 's' : '') + ' à son terme</div>';

    if (!list.length) {
      h += '<div class="empty-note" style="margin-top:16px">Aucune carrière terminée pour l\'instant.<br>Le Hall of Fame se remplit à la fin d\'une carrière — jamais sur un abandon.</div>';
    } else {
      list.forEach((e, i) => {
        const end = this.HOF_ENDING_LABEL[e.endingType] || null;
        h += '<div class="tro got" style="cursor:default">';
        h += '<span class="tro-ico" style="font-size:15px;font-family:var(--font-title);font-weight:900">#' + (i + 1) + '</span>';
        h += '<span class="tro-txt"><b>' + e.name + '</b>';
        h += '<em>' + e.chassis + ' · ' + e.ia + ' · ' + e.seasons + ' saison' + (e.seasons > 1 ? 's' : '') + ' · ' + e.wins + 'V-' + e.losses + 'D</em>';
        if (end) h += '<em style="color:var(--text-dim)">' + end.icon + ' ' + end.name + '</em>';
        h += '</span>';
        h += '<span class="tro-state ' + this.tierCls(e.gen) + '" style="font-family:var(--font-title);font-size:15px">' + e.gen + '</span>';
        h += '</div>';
      });
    }

    document.getElementById('halloffame-content').innerHTML = h;
    this.goTo('halloffame');
    this.bindStickyBack('halloffame', 'hof-back');
  },

  showTrophees() {
    const cnt = this.trophyCount();
    let h = '<div class="btn-back sticky" id="tro-back" onclick="RC.goTo(\'home\')">← Menu</div>';
    h += '<div class="page-title">🏆 Trophées</div>';
    h += '<div class="page-sub">' + cnt.got + ' sur ' + cnt.total + ' débloqués</div>';
    h += '<div class="quetes-bar" style="margin:14px 0 18px"><div class="quetes-fill" style="width:'
       + Math.round(cnt.got / cnt.total * 100) + '%"></div></div>';

    this.TROPHY_CATS.forEach(cat => {
      const list = this.TROPHIES.filter(t => t.cat === cat);
      if (!list.length) return;
      const got = list.filter(t => this.hasTrophy(t.id)).length;
      h += '<div class="inter-section">';
      h += '<div class="inter-section-head"><span class="inter-section-title">' + cat + '</span>';
      h += '<span class="inter-section-note">' + got + '/' + list.length + '</span></div>';
      list.forEach(t => {
        const p = this.trophyProgress(t);
        const hid = t.hidden && !p.got;
        const etat = hid ? '—'
          : t.tiers ? (p.tier || 0) + '/' + t.tiers.length
          : (p.got ? 'Obtenu' : 'À faire');
        h += '<div class="tro' + (p.got ? ' got' : '') + (hid ? ' hid' : '') +
             '" onclick="RC.trophyDetail(\'' + t.id + '\')">';
        h += '<span class="tro-ico">' + (hid ? '?' : t.icon) + '</span>';
        h += '<span class="tro-txt"><b>' + (hid ? 'Trophée caché' : t.name) + '</b>';
        h += '<em>' + (hid ? 'À vous de le découvrir.' : t.cond) + '</em></span>';
        h += '<span class="tro-state">' + etat + '</span>';
        h += '</div>';
      });
      h += '</div>';
    });
    document.getElementById('trophees-content').innerHTML = h;
    this.goTo('trophees');
    this.bindStickyBack('trophees', 'tro-back');
  },

  // v0.12 — le bouton collant apparaît au défilement, s'estompe 1,5 s
  // après l'arrêt, et devient inerte au moment même où il disparaît.
  bindStickyBack(screenId, btnId) {
    const sc = document.getElementById(screenId);
    const b = document.getElementById(btnId);
    if (!sc || !b) return;
    let t = null;
    const show = () => {
      b.classList.remove('faded');
      clearTimeout(t);
      t = setTimeout(() => b.classList.add('faded'), 1500);
    };
    sc.onscroll = show;
    b.classList.remove('faded');   // visible à l'arrivée sur l'écran
  },

  // v0.13 — variante pour les groupes de boutons collants.
  bindStickyGroup(screenId, groupId) {
    this.bindStickyBack(screenId, groupId);
  },


  trophyDetail(id) {
    const t = this.trophyDef(id);
    if (!t) return;
    const p = this.trophyProgress(t);
    if (t.hidden && !p.got) return this.showInfo('Trophée caché', '<p>À vous de le découvrir.</p>', 'Fermer', () => this.hideInfo());
    let b = '<p>' + t.cond + '</p>';
    if (t.tiers) {
      b += '<div class="card-stats" style="margin-top:10px">';
      t.tiers.forEach((v, i) => {
        b += '<span class="stat-tag" style="' + (i < (p.tier||0) ? 'color:var(--yellow);border-color:var(--yellow)' : '') + '">'
           + v.toLocaleString('fr') + '</span>';
      });
      b += '</div>';
    }
    if (t.scope === 'cumul' && p.acquired !== undefined) {
      b += '<p style="margin-top:10px"><b style="color:var(--yellow)">' + p.acquired.toLocaleString('fr') + ' acquis</b>';
      if (p.pending) b += ' · ' + p.pending.toLocaleString('fr') + ' en attente sur la carrière en cours';
      b += '</p>';
      if (p.pending) b += '<p style="margin-top:8px;color:var(--orange)">Les ' + p.pending.toLocaleString('fr')
        + ' en attente seront ajoutés à la fin de cette carrière. Si vous l\'abandonnez, ils sont perdus — les '
        + p.acquired.toLocaleString('fr') + ' acquis, eux, restent définitivement.</p>';
    }
    if (t.warn) b += '<p style="margin-top:8px;color:var(--orange)">' + t.warn + '</p>';
    this.showInfo((p.got ? '✅ ' : '') + t.icon + ' ' + t.name, b, 'Fermer', () => this.hideInfo());
  },

  // File des trophées débloqués, affichée une par une.
  flushTrophies(next) {
    if (next) this._afterTro = next;
    const q = this._troQ || [];
    if (!q.length) {
      // v0.16.0 — _afterTro restait posé quand la file était vide. Il était
      // alors consommé plus tard, au premier flush venu : en fin de
      // carrière, resumeAfterTrophy() relançait afterEventResume() sur une
      // carrière déjà supprimée, d'où « Cannot read properties of null
      // (reading 'fightIndex') ». La reprise n'a de sens que si un trophée
      // s'affiche réellement.
      this._afterTro = null;
      return false;
    }
    const it = q.shift();
    const def = this.trophyDef(it.id);
    if (!def) return this.flushTrophies();
    let b = '<div style="text-align:center"><div style="font-size:52px;margin-bottom:8px">' + def.icon + '</div>';
    b += '<div style="font-family:var(--font-title);font-size:17px;color:var(--yellow);margin-bottom:6px">' + def.name + '</div>';
    b += '<p>' + def.cond + '</p>';
    if (it.tier && def.tiers) b += '<p style="margin-top:8px;color:var(--cyan)">Palier ' + it.tier + ' / ' + def.tiers.length + '</p>';
    b += '</div>';
    this.showInfo('🏆 Trophée débloqué', b, q.length ? 'Suivant' : 'Continuer',
      () => { const cancel = document.getElementById('modal-cancel'); if (cancel) cancel.style.display = '';
              if (q.length) this.flushTrophies(); else this.resumeAfterTrophy(); });
    return true;
  },

  resumeAfterTrophy() {
    const n = this._afterTro; this._afterTro = null;
    if (n && typeof this[n] === 'function') this[n]();
  },


  // ============================================================
  //  v0.12 — ÉVALUATION DES TROPHÉES
  //  Un seul point d'entrée, appelé après chaque combat et à chaque
  //  fin de saison. Évite d'éparpiller des grant() dans le moteur.
  //  ctx : 'fight' | 'season' | 'career'
  // ============================================================
  checkTrophies(ctx, info) {
    const c = this.state.career;
    if (!c) return;
    info = info || {};

    // ---- portée COMBAT ----
    if (ctx === 'fight') {
      // Ne jamais déverrouiller « Premier Sang » pendant une défaite,
      // même si la sauvegarde contient déjà une victoire antérieure.
      if (info.victory && c.totalWins >= 1) this.grant('first_blood');
      if (c.totalKO >= 1) this.grant('just_begun');
      if (info.victory && info.cleanWin && !info.boss) this.grant('no_appeal');
      if (info.victory && info.startState < 30) this.grant('on_knees');
      if (info.victory && this._playerHP <= 1) this.grant('on_the_wire');
      if (info.fightAtouts >= 3) this.grant('triple_dose');
      if (info.boss && info.victory && info.lostFirstTwo) this.grant('cold_blood');
      if (info.isRival && info.victory) this.grant('at_last');
    }

    // ---- portée CARRIÈRE, réévaluée en continu ----
    if (c.totalWins >= 100) this.grant('centurion');
    if ((c.combatsFought || 0) >= 100) this.grant('veteran');
    if (this.affPct() >= 100) this.grant('inseparable');
    if (c.baptized) this.grant('baptism');
    // v0.14.0 — trophées définis mais accordés NULLE PART. Neuf des
    // cinquante étaient dans ce cas, soit 18% du contenu inaccessible.
    // Les données existaient déjà, seul l'appel manquait.
    if ((c.transfersUsed || 0) >= 1) this.grant('transfer');
    if (c.droppedFrom) this.grant('dropped');
    const li = c.leagueIdx || 0;
    // « Vieux Démons » : recroiser en Légendaire une machine affrontée en
    // Amateur. Structurellement impossible avant v0.14.0 — les plateaux
    // étaient retirés au hasard à chaque saison, sans aucune mémoire.
    // La mémoire des ligues (A11) le rend enfin atteignable.
    if (li >= 5 && c.metAmateur && c.metAmateur.length) {
      const now = (c.standings || []).map(b => b.id);
      if (c.metAmateur.some(id => now.indexOf(id) !== -1)) this.grant('old_demons');
    }
    // v0.14.0 — A7 : les seuils étaient décalés d'un cran. LEAGUES vaut
    // ['Amateur','Régionale','Nationale','Mondiale','Elite','Légendaire'],
    // soit les index 0 à 5 : « Reconnu · Atteindre la Nationale » tombait
    // donc en Régionale, « Exporté · Mondiale » en Nationale et « Parmi
    // les Grands · Elite » en Mondiale. Seul « Au Sommet » était juste,
    // ce qui explique que le décalage soit passé inaperçu.
    if (li >= 2) this.grant('recognized');    // Nationale
    if (li >= 3) this.grant('exported');      // Mondiale
    if (li >= 4) this.grant('among_greats');  // Elite
    if (li >= 5) this.grant('summit');        // Légendaire
    if ((c.leaguesWon || 0) >= 1) this.grant('the_title');
    const fol = c.followers || 0;
    if (fol > (c.maxFollowers || 0)) c.maxFollowers = fol;
    const t = this.tierReached(this.trophyDef('spotlight'), c.maxFollowers);
    if (t > 0) this.grant('spotlight', t);

    // ---- portée SAISON ----
    if (ctx === 'season') {
      const sc = this.seasonCounters();
      if ((c.seasonLosses || 0) >= 15) this.grant('shameful');
      if ((sc.atouts || 0) === 0) this.grant('bare_hands');
      if ((sc.lowState === undefined ? 100 : sc.lowState) >= 80) this.grant('impeccable');
      if ((sc.repairs || 0) === 0) this.grant('unbreakable');
      if ((c.seasonKO || 0) === 0 && (c.seasonKOTaken || 0) === 0) this.grant('phantom');
      // v0.16.0 — F4 : « Sur la Paille » se déclenche désormais au moment
      // du passage SOUS zéro (voir payOrDebt), et non plus au bilan de
      // saison. Sa portée est passée de saison à carrière.
      if ((sc.counters || 0) >= 3) this.grant('riposte');
    }
    this.saveState();
  },

  // ---- v0.12 : effets persistants ----
  persistMult(key) {
    const c = this.state.career;
    if (!c || !c.persist) return 1;
    let m = 1;
    c.persist.forEach(p => { if (p[key]) m *= p[key]; });
    return m;
  },

  hasFlag(f) {
    const c = this.state.career;
    return !!(c && c.persist && c.persist.some(p => p.flag === f));
  },

  activeLabels() {
    const c = this.state.career;
    return (c && c.persist ? c.persist : []).map(p => p.label).filter(Boolean);
  },

  // Conséquences différées : décomptées à chaque combat.
  tickDeferred() {
    const c = this.state.career;
    if (!c.deferred || !c.deferred.length) return [];
    const fired = [];
    c.deferred.forEach(d => { d.in--; if (d.in <= 0) fired.push(d); });
    c.deferred = c.deferred.filter(d => d.in > 0);
    fired.forEach(d => {
      const f = d.fx || {};
      if (f.cores) this.payCores(Math.round(f.cores * this.leagueFactor()), d.from);
      if (f.state) c.state = Math.max(0, Math.min(100, c.state + f.state));
      if (f.followers) this.addFollowers(Math.round(f.followers * this.leagueFactor()), d.from);
      if (f.satis) this.addSatis(f.satis);
    });
    return fired;
  },

  // Fin de saison : les persistants 'season' tombent, les 'career' restent.
  purgeSeasonEffects() {
    const c = this.state.career;
    c.persist = (c.persist || []).filter(p => p.until !== 'season');
    c.deferred = (c.deferred || []).filter(d => d.scope !== 'season');
  },

  chooseEvent(idx) {
    // v0.16.0 — F4 : garde d'exécution, au cas où l'option serait
    // déclenchée autrement que par le clic (rechargement, appel direct).
    {
      const ev0 = this._pendingEvent;
      const ch0 = ev0 && ev0.choices && ev0.choices[idx];
      const cost0 = (ch0 && ch0.fx && typeof ch0.fx.cores === 'number' && ch0.fx.cores < 0) ? -ch0.fx.cores : 0;
      if (cost0 > 0 && !this.canAfford(cost0)) {
        this.showMessage('Solde négatif — cette option est hors de portée');
        return;
      }
    }
    const c = this.state.career;
    const ev = this._pendingEvent;
    const choice = ev.choices[idx];
    const fx = choice.fx || {};
    const lf = this.leagueFactor();
    const impacts = [];
    const genBefore = c.gen;
    let debt = null;

    if (fx.cores) {
      const v = Math.round(fx.cores * lf);
      if (v < 0) {
        const before = c.cores;
        debt = this.payCores(v, ev.title);
        const moved = c.cores - before;
        impacts.push({ l:'Cores', v: moved.toLocaleString('fr') + ' ⚡'
          + (c.cores < 0 ? ' <span style="opacity:.6;font-size:10px">· solde ' + c.cores.toLocaleString('fr') + '</span>' : ''),
          c:'var(--pink)' });
        this.trackDebt();
      } else {
        c.cores += v; c.totalEarned = (c.totalEarned || 0) + v;
        impacts.push({ l:'Cores', v:'+' + v.toLocaleString('fr') + ' ⚡', c:'var(--green)' });
      }
    }
    if (fx.followers) {
      const v = Math.round(fx.followers * lf);
      this.addFollowers(v, ev.title);
      impacts.push({ l:'Followers', v:(v>0?'+':'') + v.toLocaleString('fr'), c:v>0?'var(--green)':'var(--pink)' });
    }
    if (fx.satis && c.sponsor.fx.canDrop) {
      this.addSatis(fx.satis);
      impacts.push({ l:'Satisfaction sponsor', v:(fx.satis>0?'+':'') + fx.satis + '%', c:fx.satis>0?'var(--green)':'var(--pink)' });
    }
    // v0.16.0 — F3 : le texte d'insolvabilité annonçait une ponction d'état
    // (« −9% d'état ») pendant que la ligne d'impact affichait celle de
    // l'événement (« −4% »). Deux valeurs distinctes, jamais réconciliées :
    // à l'écran, les deux chiffres se contredisaient. Elles sont désormais
    // additionnées sur une seule ligne.
    const stateFromEvent = fx.state || 0;
    const stateFromDebt = debt ? -(debt.state || 0) : 0;
    if (stateFromEvent) c.state = Math.max(1, Math.min(100, c.state + stateFromEvent));
    const stateTotal = stateFromEvent + stateFromDebt;
    if (stateTotal) {
      impacts.push({ l:'État du robot', v:(stateTotal>0?'+':'') + stateTotal + '%',
        c: stateTotal>0?'var(--green)':'var(--pink)' });
    }
    if (fx.aff) {
      this.addAffection(fx.aff);
      impacts.push({ l:'Lien avec l\'IA', v:(fx.aff>0?'+':'') + fx.aff + '%', c:fx.aff>0?'var(--purple)':'var(--pink)' });
    }
    // ---- v0.12 : effets différés et persistants ----
    if (choice.deferred) {
      c.deferred = c.deferred || [];
      c.deferred.push(Object.assign({}, choice.deferred, { from: ev.title }));
      impacts.push({ l:'Conséquence en attente', v:'⏳', c:'var(--orange)' });
    }
    if (choice.persist) {
      c.persist = c.persist || [];
      const k = c.persist.findIndex(x => x.label === choice.persist.label);
      if (k >= 0) c.persist[k] = Object.assign({}, choice.persist);
      else c.persist.push(Object.assign({}, choice.persist));
      impacts.push({ l:choice.persist.label, v:'♾', c:'var(--purple)' });
    }
    if (choice.clear === 'flagged') c.flagged = false;
    if (choice.trophy) this.grant(choice.trophy);
    if (fx.flagged) c.flagged = true;
    if (fx.atoutBonus) { c.atoutBonus = (c.atoutBonus||0) + fx.atoutBonus; c.atoutsLeft += fx.atoutBonus; }
    if (fx.rivalAnger && c.rival) { c.rival.angry = true; c.rival.respect = false; }
    if (fx.rivalRespect && c.rival) { c.rival.respect = true; c.rival.angry = false; }
    if (fx.rivalBoost && c.rival) c.rival.boosted = true;
    if (fx.nextFight) c.nextFight = fx.nextFight;
    if (fx.nextRival) c.nextRival = fx.nextRival;

    if (fx.stat && fx.statVal) {
      c.stats[fx.stat] = Math.min(99, c.stats[fx.stat] + fx.statVal);
      const names = { pui:'Puissance', vit:'Vitesse', res:'Résistance', int:'Intelligence' };
      impacts.push({ l:names[fx.stat] + ' (stat permanente)', v:'+' + fx.statVal + ' → ' + c.stats[fx.stat], c:'var(--cyan)' });
    }
    if (fx.trait) this.addTrait(fx.trait);
    if (fx.challenge) c.challenge = fx.challenge;
    // v0.14.0 — A9 : fx.flagged, fx.rivalBoost et fx.rivalAnger étaient
    // appliqués une deuxième fois ici. Sans effet visible — ce sont des
    // booléens mis à true deux fois — mais le jour où l'un devient un
    // compteur, il compterait double. Les versions retenues sont celles
    // d'au-dessus, qui vérifient l'existence du rival.
    if (fx.exitUnder) {
      c.sponsor = this.SPONSORS.find(s => s.id === 'indie');
      c.satis = 50;
      c.sponsorChanges = (c.sponsorChanges || 0) + 1;
      c.exitedUnderground = true;
      impacts.push({ l:'Sponsor', v:'→ Garage indépendant', c:'var(--green)' });
    }

    c.eventsSeen.push(ev.title);
    this.recalcGen();
    if (c.gen !== genBefore) {
      impacts.push({ l:'Note SPEC', v:(c.gen>genBefore?'+':'') + (c.gen-genBefore) + ' → ' + c.gen, c:c.gen>genBefore?'var(--yellow)':'var(--pink)' });
    }
    this.saveState();

    let h = '<div class="cat-' + ev.cat + '">';
    h += '<div class="ev-head"><div class="ev-cat">' + ev.icon + ' ' + ev.catName + '</div>';
    h += '<div class="ev-title">' + ev.title + '</div></div>';
    h += '<div class="ev-outcome" style="background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07)"><p>' + choice.out + '</p></div>';

    if (debt) h += '<div class="glitch-box"><div class="glitch-text">' + this.debtText(debt) + '</div></div>';

    if (impacts.length) {
      h += '<div class="ev-impacts">';
      impacts.forEach(i => {
        h += '<div class="ev-impact"><span class="ev-impact-label">' + i.l + '</span>';
        h += '<span class="ev-impact-val" style="color:' + i.c + '">' + i.v + '</span></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="empty-note">Aucun impact immédiat mesurable.</div>';
    }
    h += '<button class="btn-primary btn-cyan" onclick="RC.afterEvent()">Continuer</button></div>';

    document.getElementById('event-content').innerHTML = h;
    document.getElementById('event').scrollTop = 0;
  },

  afterEvent() {
    this._pendingEvent = null;
    // v0.14.0 — A8 : grant() ne fait qu'empiler dans _troQ ; c'est
    // flushTrophies() qui affiche. Or il n'était appelé qu'après un
    // combat et en fin de saison : un trophée gagné par un choix
    // d'événement restait donc en file jusqu'au prochain combat, voire
    // jusqu'au bilan. Quatre trophées étaient concernés — Intègre,
    // Rival sur et en dehors, Vendu, Ennemis Utiles.
    //
    // On vide ici, et pas au clic : la modale recouvrirait l'écran de
    // conséquences avant que le joueur ait pu le lire. La suite du tour
    // est passée en reprise, pour qu'elle s'exécute une fois la ou les
    // modales fermées.
    if (this.flushTrophies('afterEventResume')) return;
    this.afterEventResume();
  },

  afterEventResume() {
    // v0.16.0 — même garde : rien à reprendre sans carrière en cours.
    if (!this.state.career) return;
    if (this.nextIsNarrative()) this.startNarrativeCombat();
    else this.runSimulatedBatch();
  },

  // ============================================================
  // BILAN DE SAISON
  // ============================================================

  pushTimeline(rank) {
    const c = this.state.career;
    if (!c) return;
    if (!c.timeline) c.timeline = [];
    if (c.timeline.some(t => t.season === c.season)) return;
    c.timeline.push({
      season:c.season, league:c.league, sponsor:c.sponsor.id,
      w:c.seasonWins, l:c.seasonLosses, ko:c.seasonKO, gen:c.gen,
      rank: (typeof rank === 'number' ? rank : (c.lastRank || 1))
    });
  },

  showSeasonSummary() {
    const c = this.state.career;
    const li = c.leagueIdx || 0;
    // v0.10.0 — verrou : le bilan déjà rendu ne doit pas se recalculer.
    // Sinon un retour sur l'écran de carrière permettait de le rejouer,
    // ce qui faisait traverser deux inter-saisons et vidait les Cores.
    if (c.summaryDone) { this.resumeAfterSummary(); return; }
    c.summaryDone = true;
    const winRate = c.seasonWins / Math.max(1, c.seasonWins + c.seasonLosses);

    // v0.8.0 — le classement décide seul de la promotion et de la relégation.
    // Auparavant le rang affiché et la décision venaient de deux calculs
    // distincts : on pouvait être 8e sur 15 et promu quand même.
    this.completeSeason();
    // v0.9.0 — saison Amateur scriptée : le joueur finit 4e, le rival 2e.
    // Dernière saison Légendaire : joueur et rival aux deux premières places.
    const table = this.sortedStandings();
    const me = table.find(r => r.isPlayer);
    const rank = me.rank;
    const zone = this.zoneOf(rank);
    c.lastRank = rank;
    // v0.11.0 — la note, le châssis et l'IA doivent être conservés :
    // sans eux le tableau du tournoi affichait « SPEC undef » et la
    // finale se jouait contre un adversaire aux stats NaN.
    c.lastTable = table.map(r => ({ rank:r.rank, name:r.name, pts:r.pts, w:r.w, l:r.l,
      spec:r.spec, chassisId:r.chassisId, iaId:r.iaId, isPlayer:r.isPlayer, isRival:r.isRival }));

    // v0.13 — §17.1bis : le titre et la sortie du circuit sont deux
    // choses distinctes. Le titre s'acquiert dès le premier podium ; la
    // sortie du circuit — et donc le combat à mort — n'arrive que la
    // saison où le rival est LUI AUSSI en tête, ex aequo (isFinalSeason).
    let result;
    if (li === 5) {
      if (c.bossDone) result = 'champion';
      // v0.16.0 — GDD §6.3 : le combat à mort exige une VRAIE égalité, pas
      // seulement deux places dans la zone haute. L'ancienne condition ne
      // testait que `zone === 'promo'` : le jeu annonçait « vous terminez à
      // égalité » avec 45 contre 42 au tableau, ce que le joueur voyait
      // immédiatement. On vérifie désormais points ET différence.
      else if (zone === 'promo' && this.isFinalSeason() && this.tiedWithRival()) result = 'deathmatch';
      else if (zone === 'promo') result = 'titre_seul';
      else if (zone === 'releg') result = 'releg';
      else result = 'stay';
    }
    else if (zone === 'promo') result = 'promo';
    else if (zone === 'releg') result = 'releg';
    else result = 'stay';

    if (rank === 1) c.leaguesWon = (c.leaguesWon || 0) + 1;
    this.pushTimeline(rank);

    const narr = this.pick(this.SEASON_NARRATIONS);

    let h = '<div class="section-card" style="border-color:rgba(0,240,255,.18)">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">';
    h += '<span class="page-title" style="font-size:15px;margin:0">🏁 Bilan Saison ' + c.season + '</span>';
    h += '<span class="league-badge ' + this.leagueCls(c.league) + '">' + c.league + '</span></div>';

    h += '<div class="stats-row" style="margin-bottom:14px">';
    h += '<div class="stat-box"><div class="stat-value val-green">' + c.seasonWins + '</div><div class="stat-label">Victoires</div></div>';
    h += '<div class="stat-box"><div class="stat-value val-red">' + c.seasonLosses + '</div><div class="stat-label">Défaites</div></div>';
    h += '<div class="stat-box"><div class="stat-value val-yellow">' + c.seasonKO + '</div><div class="stat-label">KO</div></div>';
    h += '<div class="stat-box"><div class="stat-value val-cyan">' + c.gen + '</div><div class="stat-label">SPEC</div></div></div>';

    h += '<div class="post-stats">';
    h += '<div class="post-row"><span class="post-row-label">État du robot</span><span class="post-row-val" style="color:' + this.stateColor(c.state) + '">' + c.state + '% · ' + this.stateLabel(c.state) + '</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Cores</span><span class="post-row-val" style="color:var(--yellow)">' + c.cores.toLocaleString('fr') + ' ⚡</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Followers</span><span class="post-row-val" style="color:var(--cyan)">' + this.fmtFollowers(c.followers) + ' · ' + this.folTier(c.followers).cur.name + '</span></div>';
    if (c.sponsor.fx.canDrop) {
      h += '<div class="post-row"><span class="post-row-label">Satisfaction sponsor</span><span class="post-row-val" style="color:' + (c.satis>=55?'var(--green)':c.satis>=30?'var(--orange)':'var(--pink)') + '">' + c.satis + '%</span></div>';
    }
    h += '<div class="post-row"><span class="post-row-label">Lien avec l\'IA</span><span class="post-row-val" style="color:var(--purple)">' + this.affPct() + '%</span></div>';
    h += '</div></div>';

    // Rival : état avant progression, puis annonce de sa progression.
    // Le recalage sur la ligue du joueur se fait dans nextSeason(),
    // une fois que la promotion ou la relégation du joueur est appliquée.
    const rBefore = { gen:c.rival.gen, league:this.LEAGUES[c.rival.leagueIdx], w:c.rival.seasonWins, l:c.rival.seasonLosses };
    c.rivalPending = true;
    const r = c.rival;
    const genDelta = 0;

    h += '<div class="rival-card"><div class="rival-head">';
    h += '<div class="rival-avatar">' + r.chassis.icon + '</div>';
    h += '<div class="rival-id"><div class="rival-label">Votre rival cette saison</div>';
    h += '<div class="rival-name">' + r.name + '</div>';
    h += '<div class="rival-meta">' + rBefore.league + ' · ' + rBefore.w + 'V-' + rBefore.l + 'D cette saison</div></div>';
    h += '<div class="rival-gen ' + this.tierCls(rBefore.gen) + '"><div class="rival-gen-val">' + rBefore.gen + '</div><div class="rival-gen-lab">SPEC</div></div></div>';
    h += '<div class="rival-h2h">';
    h += '<div class="h2h-box"><div class="h2h-val" style="color:' + (c.gen>=rBefore.gen?'var(--green)':'var(--pink)') + '">' + c.gen + '</div><div class="h2h-lab">Votre SPEC</div></div>';
    h += '<div class="h2h-box"><div class="h2h-val" style="color:var(--orange)">' + rBefore.gen + '</div><div class="h2h-lab">Le sien</div></div>';
    h += '</div>';
    h += '<div class="empty-note" style="text-align:left">Sa saison est terminée. Sa trajectoire pour la suite sera connue à l\'intersaison.</div>';
    // v0.14.0 — A4 : on publie ici la nouvelle de la saison qui vient de
    // se terminer, au lieu de relire celle de la saison précédente.
    const news = this.consumeRivalNews();
    if (news) h += '<div class="rival-quote"><p>' + r.name + ' ' + news + '</p></div>';
    h += '</div>';

    h += '<div class="narration-box"><p>« ' + narr + ' »</p></div>';

    if (result === 'deathmatch') {
      // v0.13 — §6.3/§17 : ex aequo avec le rival en tête de la
      // Légendaire. C'est ce qui déclenche la demande du combat à mort.
      h += '<div class="promo-banner promo-up" style="border-color:rgba(229,56,59,.4)"><div class="promo-icon">⚔️</div>';
      h += '<div class="promo-text" style="color:var(--red)">Ex æquo en tête</div>';
      h += '<div class="promo-sub">Vous et ' + c.rival.name + ' terminez à égalité.<br>Quelqu\'un veut une réponse.</div></div>';
      h += '<button class="btn-primary btn-red" onclick="RC.showDeathmatchIntro()">…</button>';
    } else if (result === 'titre_seul') {
      // v0.13 — §17.1bis : le titre est acquis, mais le rival n'est pas
      // encore en Légendaire. Pas de sortie du circuit, la carrière
      // continue en attendant qu'il rejoigne.
      h += '<div class="promo-banner promo-up" style="border-color:rgba(247,224,24,.3)"><div class="promo-icon">🏆</div>';
      h += '<div class="promo-text" style="color:var(--yellow)">Champion de la Légendaire</div>';
      h += '<div class="promo-sub">' + (c.rival ? c.rival.name : 'Votre rival') + ' n\'est pas encore dans cette ligue.</div></div>';
      h += '<button class="btn-primary btn-yellow" onclick="RC.nextSeason(\'titre_seul\')">Continuer</button>';
    } else if (this.isScriptedSeason() && rank <= 3) {
      // Le joueur a décroché le podium par lui-même : pas de scénario,
      // la promotion est méritée et le baptême suit quand même.
      h += '<div class="promo-banner promo-up"><div class="promo-icon">🚀</div>';
      h += '<div class="promo-text">Promotion !</div>';
      h += '<div class="promo-sub">Bienvenue en Régionale</div></div>';
      h += '<button class="btn-primary btn-gradient" onclick="RC.directAmateurPromo()">Continuer</button>';
    } else if (this.isScriptedSeason()) {
      // Le scénario de disqualification prend le relais
      h += '<div class="promo-banner promo-stay"><div class="promo-icon">😤</div>';
      h += '<div class="promo-text">Promotion suspendue</div>';
      h += '<div class="promo-sub">Une décision disciplinaire doit encore être rendue.</div></div>';
      h += '<button class="btn-primary btn-cyan" onclick="RC.showDisqualification()">Continuer</button>';
    } else if (result === 'promo') {
      h += '<div class="promo-banner promo-up"><div class="promo-icon">🚀</div><div class="promo-text">Promotion !</div>';
      h += '<div class="promo-sub">Bienvenue en ' + this.LEAGUES[li+1] + '</div></div>';
      h += '<button class="btn-primary btn-gradient" onclick="RC.nextSeason(\'promo\')">Continuer</button>';
    } else if (result === 'stay') {
      h += '<div class="promo-banner promo-stay"><div class="promo-icon">➡️</div><div class="promo-text">Maintien</div>';
      h += '<div class="promo-sub">Vous restez en ' + c.league + '</div></div>';
      h += '<button class="btn-primary btn-cyan" onclick="RC.nextSeason(\'stay\')">Continuer</button>';
    } else if (result === 'releg') {
      h += '<div class="promo-banner promo-down"><div class="promo-icon">📉</div><div class="promo-text">Relégation</div>';
      h += '<div class="promo-sub">Retour en ' + this.LEAGUES[li-1] + '</div></div>';
      h += '<button class="btn-primary btn-red" onclick="RC.nextSeason(\'releg\')">Continuer</button>';
    } else {
      h += '<div class="promo-banner promo-up" style="border-color:rgba(247,224,24,.3)"><div class="promo-icon">👑</div>';
      h += '<div class="promo-text" style="color:var(--yellow)">Champion !</div>';
      h += '<div class="promo-sub">Votre carrière touche à sa fin</div></div>';
      h += '<button class="btn-primary btn-yellow" onclick="RC.endCareer(false)">Rapport de carrière</button>';
    }

    document.getElementById('season-summary-content').innerHTML = h;
    this.saveState();
    this.goTo('season-summary');
  },

  // Reprend le parcours là où il en était si le bilan a déjà été rendu
  // Promotion Amateur obtenue sans le scénario de disqualification
  directAmateurPromo() {
    const c = this.state.career;
    c.scenarioDone = true;
    const prime = Math.floor(1500 * this.leagueFactor());
    c.cores += prime; c.totalEarned = (c.totalEarned || 0) + prime;
    this.addSatis(10);
    this.addFollowers(Math.floor(2500 * this.leagueFactor()), 'Promotion en Régionale');
    this.recalcGen(); this.saveState();
    this.startBaptism();
  },

  // v0.13 — §17.1bis : distinction titre / sortie du circuit.
  resumeAfterSummary() {
    const c = this.state.career;
    if (c.leagueIdx === 5 && this.zoneOf(c.lastRank || 15) === 'promo') {
      if (this.isFinalSeason()) { this.showDeathmatchIntro(); return; }
      this.showInterSeason(); return;   // titre acquis, la carrière continue
    }
    if (this.isScriptedSeason()) {
      if ((c.lastRank || 15) <= 3) { this.directAmateurPromo(); return; }
      this.showDisqualification(); return;
    }
    this.showInterSeason();
  },

  nextSeason(result) {
    // v0.13 (ajusté) — checkTrophies('season') tournait AVANT la mise à
    // jour de c.leagueIdx : « Reconnu » et les trophées de ligue ne
    // pouvaient donc jamais se déclencher à la promotion elle-même,
    // seulement au combat suivant. Déplacé après la mise à jour de ligue.
    this.purgeSeasonEffects();

    const c = this.state.career;
    const li = c.leagueIdx || 0;
    // v0.10.0 — compteur de stagnation, remis à zéro uniquement à la
    // promotion. Un joueur qui fait l'ascenseur entre deux ligues doit
    // finir par franchir le palier, sinon sa carrière dépasse 30 saisons.
    if (result === 'promo') {
      c.leagueIdx = li + 1; c.league = this.LEAGUES[c.leagueIdx];
      c.seasonsInLeague = 0;
    } else {
      if (result === 'releg') {
        c.leagueIdx = Math.max(0, li - 1); c.league = this.LEAGUES[c.leagueIdx];
      }
      c.seasonsInLeague = (c.seasonsInLeague || 0) + 1;
    }
    c.state = Math.max(1, c.state - (2 + Math.floor(Math.random()*3)));
    c.interOffers = null;
    if (c.rivalPending) { this.advanceRival(); c.rivalPending = false; }
    this.recalcGen();

    // v0.13 (ajusté) — évalué maintenant que c.leagueIdx reflète la
    // ligue à venir, PUIS affiché immédiatement : sinon le trophée
    // restait en file jusqu'au prochain combat et semblait décrire
    // la mauvaise saison.
    this.checkTrophies('season');
    this.resetSeasonCounters();
    this.saveState();
    this.resolveSponsor();
    this.flushTrophies();
  },

  // ============================================================
  // SPONSORS : LÂCHAGE ET OFFRES
  // ============================================================

  resolveSponsor() {
    const c = this.state.career;
    const dropped = c.sponsor.fx.canDrop && c.satis < 25;
    const offers = [];

    if (dropped) {
      c.droppedFrom = c.sponsor.name;
      c.sponsor = this.SPONSORS.find(s => s.id === 'indie');
      c.satis = 50;
      c.sponsorChanges = (c.sponsorChanges || 0) + 1;
    }
    if (c.season >= 2) {
      const f = c.followers;
      if (c.sponsor.id !== 'corp' && f >= 8000) offers.push('corp');
      if (c.sponsor.id !== 'mega' && f >= 60000 && (c.leagueIdx || 0) >= 2) offers.push('mega');
      if (c.sponsor.id !== 'underground' && f >= 15000) offers.push('underground');
      if (c.sponsor.id !== 'indie') offers.push('indie');
    }
    if (dropped || offers.length) {
      this._sponsorOffers = offers;
      this.showSponsorOffers(dropped);
    } else {
      this.showInterSeason();
    }
  },

  showSponsorOffers(dropped) {
    const c = this.state.career;
    const offers = this._sponsorOffers || [];

    let h = '<div style="text-align:center;padding:8px 0 14px">';
    h += '<div style="font-family:var(--font-mono);font-size:9px;color:var(--blue);text-transform:uppercase;letter-spacing:3px;margin-bottom:5px">🏢 Marché des sponsors</div>';
    h += '<div class="page-title">Votre avenir</div>';
    h += '<div class="page-sub">Fin de saison ' + c.season + ' · ' + this.fmtFollowers(c.followers) + ' followers</div></div>';

    if (dropped) {
      h += '<div class="promo-banner promo-down"><div class="promo-icon">📉</div>';
      h += '<div class="promo-text">Contrat rompu</div>';
      h += '<div class="promo-sub">' + c.droppedFrom + ' met fin à votre collaboration.<br>Vous repartez en garage indépendant.</div></div>';
    }

    h += '<div class="inter-section"><div class="inter-section-head"><span class="inter-section-title">Sponsor actuel</span></div>';
    h += '<div class="shop-item done" style="opacity:.85"><div class="shop-info">';
    h += '<div class="shop-name" style="color:' + this.sponsorColor(c.sponsor.id) + '">' + c.sponsor.icon + ' ' + c.sponsor.name + '</div>';
    h += '<div class="shop-desc">' + c.sponsor.desc + '</div></div></div></div>';

    if (offers.length) {
      h += '<div class="inter-section"><div class="inter-section-head"><span class="inter-section-title">Offres reçues</span>';
      h += '<span class="inter-section-note">Changer coûte des followers</span></div>';
      offers.forEach(id => {
        const s = this.SPONSORS.find(x => x.id === id);
        const extra = (id === 'underground' && c.exitedUnderground) ? ' · Retour risqué' : '';
        h += '<div class="shop-item" onclick="RC.acceptSponsor(\'' + id + '\')"><div class="shop-info">';
        h += '<div class="shop-name" style="color:' + this.sponsorColor(id) + '">' + s.icon + ' ' + s.name + '</div>';
        h += '<div class="shop-desc">' + s.desc + extra + '</div></div>';
        h += '<div class="shop-price free">Signer →</div></div>';
      });
      h += '</div>';
    }
    h += '<button class="btn-primary btn-cyan" onclick="RC.showInterSeason()">' + (offers.length ? 'Rester avec ' + c.sponsor.name.split(' ')[0] : 'Continuer') + '</button>';

    document.getElementById('sponsor-offers-content').innerHTML = h;
    this.goTo('sponsor-offers');
  },

  acceptSponsor(id) {
    const c = this.state.career;
    const s = this.SPONSORS.find(x => x.id === id);
    if (!s) return;
    const loss = Math.floor(c.followers * 0.08);
    c.sponsor = s; c.satis = 50;
    c.sponsorChanges = (c.sponsorChanges || 0) + 1;
    c.sponsorJustSigned = true;
    this.addFollowers(-loss, 'Changement de sponsor');
    if (id === 'underground') c.flagged = true;
    this.saveState();
    this.showInterSeason();
  },

  // ============================================================
  // INTER-SAISON
  // ============================================================

  // v0.14.0 — B4 : les gains croissaient plus vite que les coûts. Le
  // rapport « une saison de gains / une remise à neuf » passait de 2,15
  // en Amateur à 3,25 en Légendaire : la pression économique s'évaporait
  // au moment précis où la carrière aurait dû devenir la plus tendue.
  // Les deux barèmes suivent désormais la même pente que les gains.
  repairPointCost() { return 35 + (this.state.career.leagueIdx || 0) * 42; },

  repairQuote(points, midSeason) {
    const c = this.state.career;
    const gravity = c.state >= 55 ? 1 : (c.state >= 25 ? 1.25 : 1.5);
    const discount = midSeason ? 0.7 : 1;
    const sponsorPart = 1 - (c.sponsor.fx.repairPct || 0);
    // v0.13 — §5 : quand le sponsor prend tout en charge (repairPct=1),
    // sponsorPart tombe a 0 et le prix DOIT pouvoir etre reellement 0.
    // L'ancien plancher Math.max(1,...) remontait ce cas a 1 ⚡ artificiel,
    // un Core symbolique paye pour quelque chose cense etre gratuit.
    if (sponsorPart <= 0) return 0;
    return Math.max(1, Math.round(points * this.repairPointCost() * gravity * discount * sponsorPart));
  },

  repairPrices() {
    const c = this.state.career;
    const missing = 100 - c.state;
    return {
      full: this.repairQuote(missing, false),
      mid: this.repairQuote(Math.min(15, missing), true),
      special: Math.round(30000 * (1 - (c.sponsor.fx.repairPct || 0)))
    };
  },

  // v0.14.0 — B4 : même correction que pour les réparations. Un point de
  // stat coûtait 1 000 ⚡ en Amateur et 4 500 en Légendaire, alors que
  // les gains y sont sept fois plus élevés : améliorer devenait presque
  // gratuit en fin de carrière.
  upgradePrice() { return 1000 + (this.state.career.leagueIdx || 0) * 1150; },

  buildInterOffers() {
    // v0.13 — A16 : les montants ne dépendaient que de la ligue, donc
    // identiques sur tous les adversaires proposés dans la même
    // inter-saison. Chacun a désormais sa propre variance.
    const c = this.state.career;
    const li = c.leagueIdx || 0;
    const friendly = [];
    const nb = 3 + Math.floor(Math.random()*3);
    for (let i = 0; i < nb; i++) {
      const v = 0.85 + Math.random() * 0.3;   // ±15%
      friendly.push({
        id:'f'+i,
        opponent: this.pick(this.ROBOT_NAMES_POOL) + '-' + Math.floor(10 + Math.random()*90),
        win: Math.floor((400 + li * 520) * v), lose: Math.floor((200 + li * 260) * v), done:false
      });
    }
    const clandestine = [];
    if (c.sponsor.id !== 'underground') {
      const n = 1 + Math.floor(Math.random()*2);
      for (let i = 0; i < n; i++) {
        const v = 0.8 + Math.random() * 0.4;   // ±20% — plus volatil, plus risqué
        clandestine.push({
          id:'c'+i,
          opponent: this.pick(this.ROBOT_NAMES_POOL) + '-' + Math.floor(10 + Math.random()*90),
          win: Math.floor((2000 + li * 2600) * v), done:false
        });
      }
    }
    c.interOffers = { friendly, clandestine, transferDone:false };
  },

  showInterSeason() {
    const c = this.state.career;
    if (!c) { this.goTo('home'); return; }
    if (!c.interOffers) this.buildInterOffers();
    this.renderInterSeason();
    this.goTo('interseason');
  },

  renderInterSeason() {
    const c = this.state.career;
    const p = this.repairPrices();
    const up = this.upgradePrice();
    const off = c.interOffers;
    const repairPct = c.sponsor.fx.repairPct || 0;

    let h = '<div style="text-align:center;padding:5px 0 14px">';
    h += '<div style="font-family:var(--font-mono);font-size:9px;color:var(--yellow);text-transform:uppercase;letter-spacing:3px;margin-bottom:4px">🔧 Inter-saison</div>';
    h += '<div class="page-title">Atelier de saison</div>';
    h += '<div class="page-sub">Préparez la saison ' + (c.season+1) + ' · ' + c.league + '<br>Réparez, améliorez, encaissez.</div></div>';

    const gt = this.specTier(c.gen);
    h += '<div class="inter-bar">';
    h += '<div class="inter-bar-box"><span class="resource-icon">⚡</span><div><div class="inter-bar-val">' + c.cores.toLocaleString('fr') + '</div><div class="inter-bar-label">Cores</div></div></div>';
    h += '<div class="inter-bar-box"><span class="resource-icon">🔧</span><div><div class="inter-bar-val" style="color:' + this.stateColor(c.state) + '">' + c.state + '%</div><div class="inter-bar-label">' + this.stateLabel(c.state) + '</div></div></div>';
    // v0.13 — le troisieme bloc affiche la note SPEC (71) et son palier
    // (OR) mais le libelle seul "OR" ne disait pas de quoi il s'agissait.
    h += '<div class="inter-bar-box"><span class="resource-icon">⭐</span><div><div class="inter-bar-val" style="color:var(--tier-' + gt.key + ')">' + c.gen + '</div><div class="inter-bar-label">SPEC · ' + gt.name + '</div></div></div></div>';

    // Followers
    const t = this.folTier(c.followers);
    h += '<div class="fol-panel"><div class="fol-top">';
    h += '<span class="fol-count">' + this.fmtFollowers(c.followers) + '</span>';
    h += '<span class="fol-next">' + (t.next ? 'Prochain palier : ' + this.fmtFollowers(t.next.at) + ' (' + t.next.name + ')' : 'Palier maximum atteint') + '</span></div>';
    if (t.next) {
      const pct = Math.max(0, Math.min(100, ((c.followers - t.cur.at) / (t.next.at - t.cur.at)) * 100));
      h += '<div class="fol-track"><div class="fol-fill" style="width:' + pct + '%"></div></div>';
    }
    h += '<div class="fol-tier">' + t.cur.name + (c.newTier === t.cur.name ? ' · nouveau palier atteint' : '') + '</div>';
    c.newTier = null;
    if (c.folLog && c.folLog.length) {
      h += '<div class="fol-log">';
      c.folLog.slice(0,4).forEach(l => {
        h += '<div class="fol-log-row"><span class="fol-log-reason">' + l.r + '</span>';
        h += '<span class="fol-log-val" style="color:' + (l.v>=0?'var(--green)':'var(--pink)') + '">' + (l.v>=0?'+':'') + l.v.toLocaleString('fr') + '</span></div>';
      });
      h += '</div>';
    }
    h += '</div>';

    // Réparations
    h += '<div class="inter-section' + (c.state < 55 ? ' warn' : '') + '">';
    h += '<div class="inter-section-head"><span class="inter-section-title">🔧 Réparations</span>';
    h += '<span class="inter-section-note">' + (repairPct > 0 ? 'Sponsor : -' + Math.round(repairPct*100) + '%' : this.repairPointCost() + ' ⚡ / point') + '</span></div>';
    if (c.state >= 100) {
      h += '<div class="empty-note">Votre robot est en parfait état.<br>Rien à réparer.</div>';
    } else {
      const missing = 100 - c.state;
      h += this.shopItem('Remise à neuf complète', missing + ' points à réparer · retour à 100%', p.full, this.canAfford(p.full), "RC.doRepair('full')");
      if (missing > 15) {
        const partial = this.repairQuote(15, false);
        h += this.shopItem('Réparation partielle', '+15% seulement · pour économiser', partial, this.canAfford(partial), "RC.doRepair('partial')");
      }
      if (!c.specialRepairUsed && c.state <= 30) {
        h += this.shopItem('⭐ Réparation spéciale', 'Une seule fois par carrière · +25% immédiat', p.special, this.canAfford(p.special), "RC.doRepair('special')");
      }
    }
    h += '</div>';

    // Améliorations
    h += '<div class="inter-section"><div class="inter-section-head"><span class="inter-section-title">📈 Améliorations</span>';
    h += '<span class="inter-section-note">' + up.toLocaleString('fr') + ' ⚡ par point</span></div>';
    const canUp = this.canAfford(up);
    h += '<div class="upgrade-grid">';
    h += this.upgradeBtn('Puissance', 'pui', c.stats.pui, canUp);
    h += this.upgradeBtn('Vitesse', 'vit', c.stats.vit, canUp);
    h += this.upgradeBtn('Résistance', 'res', c.stats.res, canUp);
    h += this.upgradeBtn('Intelligence', 'int', c.stats.int, canUp);
    h += '</div>';
    if (!canUp) h += '<div class="empty-note">' + (this.inDebt() ? 'Solde négatif : aucun achat possible tant que la dette n\'est pas épongée.' : 'Cores insuffisants pour améliorer une stat.') + '</div>';
    h += '</div>';

    // Combats amicaux
    h += '<div class="inter-section"><div class="inter-section-head"><span class="inter-section-title">🤝 Combats amicaux</span>';
    h += '<span class="inter-section-note">Zéro dégât</span></div>';
    off.friendly.forEach(f => {
      h += f.done
        ? this.resultItem('vs ' + f.opponent, f.won, f.gain, null)
        : this.shopItem('vs ' + f.opponent, 'Victoire ' + f.win.toLocaleString('fr') + ' ⚡ · Défaite ' + f.lose.toLocaleString('fr') + ' ⚡', null, true, "RC.doFriendly('"+f.id+"')", 'Combattre');
    });
    h += '</div>';

    // Combats clandestins
    if (off.clandestine.length) {
      h += '<div class="inter-section warn"><div class="inter-section-head"><span class="inter-section-title">💀 Combats clandestins</span>';
      h += '<span class="inter-section-note">Dégâts possibles</span></div>';
      off.clandestine.forEach(f => {
        h += f.done
          ? this.resultItem('vs ' + f.opponent, f.won, f.gain, f.dmg)
          : this.shopItem('vs ' + f.opponent, 'Victoire ' + f.win.toLocaleString('fr') + ' ⚡ · Défaite : rien, et des dégâts', null, true, "RC.doClandestine('"+f.id+"')", 'Risquer');
      });
      h += '</div>';
    }

    // Transfert mémoire
    h += '<div class="inter-section gold"><div class="inter-section-head"><span class="inter-section-title">🧠 Transfert mémoire</span>';
    h += '<span class="inter-section-note">' + (c.transfersUsed || 0) + ' effectué(s)</span></div>';
    h += off.transferDone
      ? '<div class="empty-note">Transfert déjà effectué cette inter-saison.</div>'
      : this.shopItem('Nouveau châssis ' + c.chassis.name, 'État remis à 100% · −15% sur toutes les stats · la mémoire est conservée', this.TRANSFER_COST, this.canAfford(this.TRANSFER_COST), "RC.doTransfer()");
    h += '</div>';

    h += '<button class="btn-primary btn-yellow" style="margin-top:6px" onclick="RC.startNextSeason()">Lancer la saison ' + (c.season+1) + '</button>';
    document.getElementById('interseason-content').innerHTML = h;
  },

  shopItem(name, desc, price, affordable, action, actionLabel) {
    const locked = !affordable;
    let h = '<div class="shop-item' + (locked ? ' locked' : '') + '"' + (locked ? '' : ' onclick="' + action + '"') + '>';
    h += '<div class="shop-info"><div class="shop-name">' + name + '</div><div class="shop-desc">' + desc + '</div></div>';
    // v0.13 — §5.3 : un prix reellement nul (sponsor a 100%) s'affiche
    // « Gratuit », plus jamais « 1 ⚡ » symbolique.
    h += price === null
      ? '<div class="shop-price free">' + (actionLabel || 'Go') + ' →</div>'
      : price === 0
      ? '<div class="shop-price free">Gratuit</div>'
      : '<div class="shop-price' + (locked ? ' cant' : '') + '">' + price.toLocaleString('fr') + ' ⚡</div>';
    return h + '</div>';
  },

  resultItem(name, won, gain, dmg) {
    let h = '<div class="shop-item ' + (won ? 'result-win' : 'result-loss') + '">';
    h += '<div class="shop-info"><div class="shop-name">' + name + '</div>';
    h += '<div class="shop-desc">' + (won ? 'Victoire' : 'Défaite');
    if (dmg) h += ' · −' + dmg + '% d\'état';
    h += '</div></div>';
    h += '<div class="shop-result" style="color:' + (won ? 'var(--green)' : 'var(--pink)') + '">';
    h += (gain > 0 ? '+' + gain.toLocaleString('fr') + ' ⚡' : '—');
    h += '<div class="shop-result-sub">' + (won ? 'gagné' : 'consolation') + '</div></div></div>';
    return h;
  },

  upgradeBtn(label, key, value, canUp) {
    let h = '<div class="upgrade-btn' + (canUp ? '' : ' locked') + '"' + (canUp ? ' onclick="RC.doUpgrade(\'' + key + '\')"' : '') + '>';
    h += '<div class="upgrade-stat">' + label + '</div>';
    h += '<div class="upgrade-val">' + value + '</div>';
    h += '<div class="upgrade-plus">+1 point</div></div>';
    return h;
  },

  doRepair(type) {
    const c = this.state.career;
    const p = this.repairPrices();
    let cost, gain;
    if (type === 'special') { cost = p.special; gain = 25; }
    else if (type === 'partial') { cost = this.repairQuote(15, false); gain = 15; }
    else if (type === 'mid') { cost = p.mid; gain = Math.min(15, 100 - c.state); }
    else { cost = p.full; gain = 100 - c.state; }
    if (!this.canAfford(cost)) { this.showMessage(this.inDebt() ? 'Vous êtes dans le rouge' : 'Cores insuffisants'); return; }
    c.cores -= cost;
    c.state = Math.min(100, c.state + gain);
    if (type === 'special') c.specialRepairUsed = true;
    if (type === 'mid') c.midRepairUsed = true;
    // v0.14.0 — seasonC.repairs était LU par le trophée « Increvable »
    // (traverser une saison sans la moindre réparation) mais n'était
    // incrémenté nulle part : il valait toujours zéro, et le trophée
    // tombait à chaque fin de saison même après plusieurs réparations.
    this.seasonCounters().repairs++;
    // v0.14.0 — B2 : +3 étaient versés à CHAQUE réparation, sans limite.
    // Rien n'empêchait d'enchaîner plusieurs réparations partielles dans
    // la même inter-saison et d'encaisser +3 par clic. Le geste compte
    // désormais une fois par saison — c'est l'attention portée à la
    // machine qui est récompensée, pas le nombre de factures.
    if (c.repairBondSeason !== c.season) {
      c.repairBondSeason = c.season;
      this.addAffection(3);
    }
    this.addTrait('soigneux');
    this.recalcGen();
    this.saveState();
    if (type === 'mid') this.showCareer(); else this.renderInterSeason();
  },

  doUpgrade(key) {
    const c = this.state.career;
    const cost = this.upgradePrice();
    if (!this.canAfford(cost)) { this.showMessage(this.inDebt() ? 'Vous êtes dans le rouge' : 'Cores insuffisants'); return; }
    if (c.stats[key] >= 99) { this.showMessage('Stat déjà au maximum'); return; }
    c.cores -= cost;
    c.stats[key] = Math.min(99, c.stats[key] + 1);
    this.recalcGen();
    this.saveState();
    this.renderInterSeason();
  },

  doFriendly(id) {
    const c = this.state.career;
    const f = c.interOffers.friendly.find(x => x.id === id);
    if (!f || f.done) return;
    const won = Math.random() < this.simulatedWinChance();
    const gain = won ? f.win : f.lose;
    c.cores += gain;
    c.totalEarned = (c.totalEarned || 0) + gain;
    this.addFollowers(won ? Math.floor(150 + Math.random()*250) : Math.floor(40 + Math.random()*80), 'Combat amical');
    f.done = true; f.won = won; f.gain = gain;
    this.saveState();
    this.renderInterSeason();
  },

  doClandestine(id) {
    const c = this.state.career;
    const f = c.interOffers.clandestine.find(x => x.id === id);
    if (!f || f.done) return;
    const cm = this.CHASSIS_MOD[c.chassis.id] || this.CHASSIS_MOD.tactical;
    const won = Math.random() < (this.simulatedWinChance() - 0.12);
    const dmg = Math.max(1, Math.round((won ? 4 + Math.random()*6 : 9 + Math.random()*9) * this.wearMod(cm)));
    c.state = Math.max(1, c.state - dmg);
    if (won) {
      c.cores += f.win; c.totalEarned = (c.totalEarned || 0) + f.win;
      this.addFollowers(Math.floor(500 + Math.random()*1200), 'Combat clandestin');
    } else {
      this.addFollowers(-Math.floor(100 + Math.random()*300), 'Défaite clandestine');
    }
    this.addSatis(-5);
    c.flagged = true;
    f.done = true; f.won = won; f.gain = won ? f.win : 0; f.dmg = dmg;
    this.recalcGen();
    this.saveState();
    this.renderInterSeason();
  },

  startNextSeason() {
    const c = this.state.career;
    c.season++;
    c.seasonWins = 0; c.seasonLosses = 0; c.seasonKO = 0; c.seasonKOTaken = 0;
    c.seasonRDiff = 0;
    c.narrativeCombat = 0; c.simulatedResults = [];
    c.fightIndex = 0; c.atoutsLeft = 3; c.interOffers = null; c.midRepairUsed = false;
    // v0.14.0 — A11 : le plateau de la saison est bien remis à zéro, mais
    // le VIVIER de la ligue (c.leaguePool) est conservé : c'est lui qui
    // permet de recroiser les mêmes machines en revenant dans une ligue.
    c.standings = null; c.schedule = null;
    c.summaryDone = false; c._targetWins = null; c.matchday = 0;
    if (c.rival) c.rival.seq = null;

    const fx = c.ia.fx || {};
    if (fx.seasonStat) {
      const keys = ['pui','vit','res','int'];
      for (let i = 0; i < fx.seasonStat; i++) {
        const k = this.pick(keys);
        c.stats[k] = Math.min(99, c.stats[k] + 1);
      }
      c.protoBonus = fx.seasonStat;
    }
    this.recalcGen();
    this.saveState();
    this.showCareer();
  },

  // ============================================================
  // RAPPORT FINAL
  // ============================================================

  careerBadge(destroyed) {
    const c = this.state.career;
    // v0.13 — §17.3 : les trois issues du combat à mort donnent des
    // badges distincts. Le tournoi n'existe plus.
    if (destroyed) return { key:'ferraille', name:'Ferraille', cls:'badge-ferraille', tokens:2 };
    if (c.deathmatchOutcome === 'immortal') return { key:'mondiale', name:"L'Immortel", cls:'badge-mondiale', tokens:40 };
    if (c.deathmatchOutcome === 'no_regret') return { key:'legende', name:'Sans Regret', cls:'badge-legende', tokens:32 };
    if ((c.leagueIdx || 0) >= 5) return { key:'icone', name:'Icône', cls:'badge-icone', tokens:25 };
    if ((c.leaguesWon || 0) >= 1) return { key:'champion', name:'Champion', cls:'badge-champion', tokens:15 };
    if ((c.totalWins || 0) >= 40) return { key:'combattant', name:'Combattant', cls:'badge-combattant', tokens:10 };
    return { key:'ferraille', name:'Ferraille', cls:'badge-ferraille', tokens:5 };
  },

  pickSpeech() {
    const c = this.state.career;
    const traits = this.topTraits(3);
    const aff = this.affPct();
    const t = c.traits || {};

    if ((c.state <= 10 || (t.negligent || 0) >= 2) && aff < 40) {
      return this.SPEECHES.find(s => s.key === 'brise');
    }
    const corrupt = t.corrompu || 0;
    const positives = (t.fidele||0)+(t.protecteur||0)+(t.soigneux||0)+(t.integre||0)+(t.humble||0)+(t.libre||0)+(t.ouvert||0);
    if (corrupt > 0 && aff < 55 && corrupt >= positives / 2) {
      return this.SPEECHES.find(s => s.key === 'corrompu');
    }
    let best = null, bestScore = -1;
    this.SPEECHES.forEach(s => {
      if (aff < s.min) return;
      if (s.key === 'corrompu' || s.key === 'brise') return;
      let score = 0;
      s.traits.forEach(tr => { if (traits.indexOf(tr) !== -1) score += 2; });
      score += s.min / 100;
      if (corrupt > 0 && (s.key === 'humble' || s.key === 'fidele_haut')) score -= 1;
      if (score > bestScore) { bestScore = score; best = s; }
    });
    return best || this.SPEECHES.find(s => s.key === 'soumis');
  },

  endCareer(destroyed) {
    const c = this.state.career;
    if (!c) { this.goTo('home'); return; }
    this.pushTimeline(c.lastRank || (c.bossWon ? 1 : 2));
    // v0.14.0 — quatre trophées ne peuvent se juger qu'une fois la
    // carrière close : ils portent sur ce qui N'A PAS eu lieu (aucun
    // transfert, aucun changement de sponsor) ou sur l'état final.
    // Aucun n'était accordé nulle part.
    // v0.16.0 — F4 : pendant sombre de « Sur la Paille ». L'un se gagne en
    // y tombant, l'autre en y finissant.
    if ((c.cores || 0) < 0) this.grant('red_end');
    if ((c.transfersUsed || 0) === 0) this.grant('faithful');
    if ((c.sponsorChanges || 0) === 0) this.grant('loyalty');
    // v0.16.0 — F1 : avec un départ à 15 %, « finir sous 20 % » deviendrait
    // trivial — ne rien faire suffirait. Le trophée exige désormais d'avoir
    // GAGNÉ la confiance (pic au-dessus de 50 %) puis de l'avoir PERDUE.
    if (this.affPct() < 20 && (c.affPeak || 0) >= 50) this.grant('who_are_you');
    // « Bête Noire » / « Souffre-Douleur » annoncent TOUS les duels d'une
    // carrière : ils ne peuvent donc se juger qu'ici. Évalués en continu,
    // ils tombaient dès le premier duel, avant que « tous » ait un sens.
    // Le minimum de trois duels évite qu'un unique affrontement suffise.
    const duels = (c.h2hWins || 0) + (c.h2hLosses || 0);
    if (duels >= 3 && (c.h2hLosses || 0) === 0) this.grant('nemesis');
    if (duels >= 3 && (c.h2hWins || 0) === 0) this.grant('punchbag');
    // « Retraite au Sommet » : quitter le circuit par le podium de la
    // Légendaire. destroyed indique une fin subie, qui ne compte pas.
    if (!destroyed && (c.leagueIdx || 0) >= 5 && (c.lastRank || 99) <= 3) this.grant('retire_top');
    this.checkTrophies('career');
    // v0.14.0 — commitCumul() n'était appelé NULLE PART. C'est pourtant
    // le seul endroit qui verse les cumuls multi-carrières (KO, cores,
    // combats, carrières terminées, châssis joués) dans state.meta.
    // Sans cet appel, les compteurs restaient à zéro d'une carrière à
    // l'autre et les trophées de cumul — Destructeur, Argent de poche,
    // Marathon, Collectionneur, Panthéon, Encore, Puce Légendaire,
    // Tous les chemins — ne pouvaient jamais se débloquer.
    // Il doit tourner AVANT le rapport final, qui affiche ces totaux.
    // v0.16.0 — meta.endings n'était alimenté NULLE PART. Le trophée
    // « Toutes les Voies » vérifie pourtant d'y trouver les trois fins :
    // il était donc inatteignable, quel que soit le nombre de carrières.
    // Constaté dans une sauvegarde réelle : immortal obtenu, endings vide.
    // On enregistre la fin ici, avant le versement des cumuls, pour que
    // checkTrophies('career') la voie.
    const ending = destroyed ? 'last_round' : (c.deathmatchOutcome || null);
    if (ending) {
      if (!Array.isArray(this.state.meta.endings)) this.state.meta.endings = [];
      if (this.state.meta.endings.indexOf(ending) === -1) this.state.meta.endings.push(ending);
    }
    this.commitCumul();
    this.showFinalReport(destroyed);
  },

  showFinalReport(destroyed) {
    const c = this.state.career;
    const badge = this.careerBadge(destroyed);
    const speech = this.pickSpeech();
    const traits = this.topTraits(3);
    const nick = this.pick(this.NICKNAMES[c.chassis.id] || ['La Machine']);
    const r = c.rival;
    const genMax = c.genMax || c.gen;
    const finTier = this.specTier(genMax);

    let h = '<div class="fin-hero">';
    h += '<div class="fin-badge ' + badge.cls + '">' + badge.name + '</div>';
    h += '<div class="fin-gen ' + this.tierCls(genMax) + '"><div class="fin-gen-val">' + genMax + '</div><div class="fin-gen-lab">SPEC max</div></div>';
    h += '<div><span class="tier-chip t-' + finTier.key + '">' + finTier.name + '</span></div>';
    h += '<div class="fin-name">' + c.name + '</div>';
    if (c.oldName && c.oldName !== c.name) {
      h += '<div class="fin-nick" style="color:var(--text-dim)">matricule d\'origine : ' + c.oldName + '</div>';
    }
    h += '<div class="fin-nick">« ' + nick + ' »</div>';
    h += '<div class="fin-meta">' + c.chassis.icon + ' ' + c.chassis.name + ' · ' + c.ia.icon + ' ' + c.ia.name + ' · ' + c.season + ' saison(s)</div>';
    if (traits.length) {
      h += '<div class="fin-traits">';
      traits.forEach(t => { h += '<span class="fin-trait">' + (this.TRAIT_LABELS[t] || t) + '</span>'; });
      h += '</div>';
    }
    h += '</div>';

    // La puce IA détruite au temps mort ampute le message final
    let speechText = speech.text;
    if (c.timeoutTag === 'puce_detruite') {
      const cut = Math.max(60, Math.floor(speechText.length * 0.45));
      speechText = speechText.slice(0, cut).replace(/[\s,;:]+$/, '') + '… [SIGNAL PERDU]';
    }
    h += '<div class="fin-speech"><div class="fin-speech-label">🧠 Message de ' + c.name + ' à son créateur</div>';
    h += '<p>' + speechText + '</p></div>';
    if (c.timeoutTag === 'puce_detruite') {
      h += '<div class="glitch-box"><div class="glitch-text">⚠️ La puce IA a cédé pendant la finale. Le message s\'interrompt — il n\'y aura pas de suite.</div></div>';
    }
    if (c.puceNew) {
      h += '<div class="fin-tokens" style="border-color:rgba(247,224,24,.4)"><span style="font-size:22px">🏅</span>';
      h += '<div><div class="fin-tokens-val">Puce IA en or débloquée</div>';
      h += '<div class="fin-tokens-lab">' + c.chassis.name + ' · ' + c.ia.name + '</div></div></div>';
    }

    h += '<div class="fin-section"><div class="fin-section-title">Statistiques</div><div class="fin-grid">';
    h += '<div class="fin-cell"><div class="fin-cell-val">' + (c.totalWins + c.totalLosses) + '</div><div class="fin-cell-lab">Combats</div></div>';
    h += '<div class="fin-cell"><div class="fin-cell-val" style="color:var(--green)">' + c.totalWins + '</div><div class="fin-cell-lab">Victoires</div></div>';
    h += '<div class="fin-cell"><div class="fin-cell-val" style="color:var(--yellow)">' + c.totalKO + '</div><div class="fin-cell-lab">KO infligés</div></div>';
    h += '<div class="fin-cell"><div class="fin-cell-val" style="color:var(--purple)">' + (c.atoutsSuccess||0) + '/' + (c.atoutsUsed||0) + '</div><div class="fin-cell-lab">Atouts réussis</div></div>';
    h += '<div class="fin-cell"><div class="fin-cell-val" style="color:var(--pink)">' + this.fmtFollowers(c.followers) + '</div><div class="fin-cell-lab">Followers</div></div>';
    h += '<div class="fin-cell"><div class="fin-cell-val" style="color:var(--yellow)">' + this.fmtFollowers(c.totalEarned||0) + '</div><div class="fin-cell-lab">Fortune totale</div></div>';
    h += '</div></div>';

    h += '<div class="fin-section"><div class="fin-section-title">Palmarès</div><div class="post-stats" style="margin:0">';
    h += '<div class="post-row"><span class="post-row-label">Ligue atteinte</span><span class="post-row-val" style="color:var(--cyan)">' + c.league + '</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Ligues remportées</span><span class="post-row-val" style="color:var(--yellow)">' + (c.leaguesWon||0) + '</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Changements de sponsor</span><span class="post-row-val">' + (c.sponsorChanges||0) + '</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Transferts mémoire</span><span class="post-row-val">' + (c.transfersUsed||0) + '</span></div>';
    if ((c.bugsSuffered||0) > 0) h += '<div class="post-row"><span class="post-row-label">Bugs subis</span><span class="post-row-val" style="color:var(--pink)">' + c.bugsSuffered + '</span></div>';
    // v0.16.0 — F4 : la trajectoire de dette, et non le simple compteur.
    // Quatre cas : jamais endetté · endetté puis remboursé · endetté à
    // répétition · terminé dans le rouge.
    const dbt = this.debtSummary();
    if (dbt) {
      h += '<div class="post-row"><span class="post-row-label">' + dbt.label + '</span>';
      h += '<span class="post-row-val" style="color:' + dbt.color + '">' + dbt.val + '</span></div>';
    }
    h += '<div class="post-row"><span class="post-row-label">Lien final avec l\'IA</span><span class="post-row-val" style="color:var(--purple)">' + this.affPct() + '%</span></div>';
    h += '</div></div>';

    if (c.timeline && c.timeline.length) {
      h += '<div class="fin-section"><div class="fin-section-title">Parcours</div><div class="fin-time">';
      c.timeline.forEach(t => {
        const col = 'var(--tier-' + (this.LEAGUE_TIER[t.league] || 'bronze') + ')';
        const sp = this.SPONSORS.find(s => s.id === t.sponsor);
        h += '<div class="fin-time-row"><div class="fin-time-dot" style="background:' + col + '"></div>';
        h += '<div class="fin-time-mid"><div class="fin-time-league" style="color:' + col + '">S' + t.season + ' · ' + t.league + '</div>';
        h += '<div class="fin-time-detail">' + t.w + 'V-' + t.l + 'D · ' + t.ko + ' KO · ' + (sp ? sp.icon : '') + '</div></div>';
        h += '<div class="fin-time-gen">' + t.gen + '</div></div>';
      });
      h += '</div></div>';
    }

    h += '<div class="fin-section"><div class="fin-section-title">Face à face · ' + r.name + '</div>';
    h += '<div class="fin-vs"><span class="fin-vs-you">' + genMax + '</span><span class="fin-vs-lab">SPEC max</span><span class="fin-vs-rival">' + r.gen + '</span></div>';
    h += '<div class="fin-vs"><span class="fin-vs-you">' + c.totalWins + '</span><span class="fin-vs-lab">Victoires</span><span class="fin-vs-rival">' + r.wins + '</span></div>';
    h += '<div class="fin-vs"><span class="fin-vs-you">' + c.totalKO + '</span><span class="fin-vs-lab">KO</span><span class="fin-vs-rival">' + r.ko + '</span></div>';
    h += '<div class="fin-vs"><span class="fin-vs-you">' + c.league + '</span><span class="fin-vs-lab">Ligue finale</span><span class="fin-vs-rival">' + this.LEAGUES[r.leagueIdx] + '</span></div>';
    h += '<div class="fin-vs"><span class="fin-vs-you">' + r.h2hWins + '</span><span class="fin-vs-lab">Duels gagnés</span><span class="fin-vs-rival">' + r.h2hLosses + '</span></div>';

    let rivalNarr;
    if (r.h2hWins > r.h2hLosses) rivalNarr = "Vous l'avez dominé quand ça comptait. Le circuit se souviendra de qui menait cette rivalité.";
    else if (r.h2hWins < r.h2hLosses) rivalNarr = "Il vous a eu plus souvent qu'à son tour. Cette rivalité restera une épine.";
    else if (r.h2hWins > 0) rivalNarr = "Aucun des deux n'a jamais pris le dessus durablement. Une rivalité parfaitement équilibrée.";
    else rivalNarr = "Vos routes ne se sont jamais vraiment croisées. Le circuit gardera cette confrontation comme un manque.";
    h += '<div class="rival-quote" style="margin-top:10px"><p>' + rivalNarr + '</p></div></div>';

    const pct = Math.min(99, Math.max(3, Math.round(
      (genMax - 40) * 1.4 + (c.leaguesWon||0) * 6 + (c.bossWon ? 12 : 0) - (destroyed ? 22 : 0)
    )));
    h += '<div class="fin-rank"><div class="fin-rank-val">' + pct + '%</div>';
    h += '<div class="fin-rank-lab">Meilleure carrière que ' + pct + '%<br>des destins simulés</div></div>';

    const tokens = badge.tokens;
    this.state.tokens = (this.state.tokens || 0) + tokens;
    h += '<div class="fin-tokens"><span style="font-size:22px">🪙</span>';
    h += '<div><div class="fin-tokens-val">+' + tokens + ' jetons</div>';
    h += '<div class="fin-tokens-lab">Total : ' + this.state.tokens + ' 🪙</div></div></div>';

    if (!this.state.hallOfFame) this.state.hallOfFame = [];
    this.state.hallOfFame.unshift({
      name:c.name, gen:genMax, badge:badge.name, badgeCls:badge.cls,
      chassis:c.chassis.name, ia:c.ia.name, seasons:c.season,
      wins:c.totalWins, losses:c.totalLosses, fortune:c.totalEarned || 0,
      destroyed, nick, oldName:c.oldName || null, date:Date.now(),
      // v0.13 — §18.1 : la fin obtenue est stockee comme information
      // affichee a cote de l'entree, jamais comme critere de tri.
      endingType: destroyed ? 'destroyed' : (c.deathmatchOutcome || null)
    });
    if (this.state.hallOfFame.length > 50) this.state.hallOfFame.length = 50;

    h += '<button class="btn-primary btn-yellow" onclick="RC.closeCareer()">Retour au menu</button>';
    document.getElementById('final-report-content').innerHTML = h;

    this.state.career = null;
    this.saveState();
    this.goTo('final-report');
    // v0.14.0 — les trophées gagnés en toute fin de carrière (cumuls,
    // issues du combat à mort) restaient en file indéfiniment : plus
    // aucun flush ne venait après. Ils s'affichent désormais par-dessus
    // le rapport final.
    this.flushTrophies();
  },

  closeCareer() {
    this.refreshHomeButtons();
    this.goTo('home');
  }
  });
})(window);
