/* Robot Chronicle — partie 03-rival-combat; contenu conservé depuis l’objet RC original. */
(function (root) {
  const parts = root.__RC_MODULES || (root.__RC_MODULES = []);
  parts.push({
  // MODULE 3/4 — RIVAL, CARRIÈRE, COMBAT
  // ============================================================

  generateOpponent(league) {
    const leagueIdx = Math.max(0, this.LEAGUES.indexOf(league));
    const chassis = this.pick(this.CHASSIS);
    const ia = this.pick(this.IA_TYPES);
    const bonus = 4 + leagueIdx * 4;
    const stats = {};
    Object.keys(chassis.stats).forEach(k => {
      stats[k] = Math.max(10, chassis.stats[k] + bonus + Math.floor(Math.random()*13) - 6);
    });
    const name = this.pick(this.ROBOT_NAMES_POOL) + '-' + Math.floor(10 + Math.random()*90);
    return {
      name, chassis, ia, stats,
      gen: this.computeGen(stats, 100, 0, 0, leagueIdx, 0, 0, false),
      hidden: Math.random() > 0.4
    };
  },

  generateRival() {
    const arch = this.pick(this.RIVAL_ARCHETYPES);
    // Les tirages sont sortis des callbacks : appelés à l'intérieur d'un find(),
    // ils étaient réévalués à chaque itération et pouvaient ne jamais coïncider.
    const chId = this.pick(arch.chassisBias);
    const iaId = this.pick(arch.iaBias);
    const chassis = this.CHASSIS.find(c => c.id === chId) || this.CHASSIS[0];
    const ia = this.IA_TYPES.find(i => i.id === iaId) || this.IA_TYPES[0];
    const sponsor = this.SPONSORS.find(sp => sp.id === arch.sponsorId) || this.SPONSORS[0];
    const stats = {};
    Object.keys(chassis.stats).forEach(k => {
      stats[k] = Math.max(10, chassis.stats[k] + Math.floor(Math.random()*7) - 2);
    });
    const name = this.pick(this.RIVAL_NAMES) + '-' + Math.floor(1 + Math.random()*9);
    return {
      archId: arch.id, name, chassis, ia, sponsor, stats,
      state: 88 + Math.floor(Math.random()*10),
      gen: this.computeGen(stats, 92, 0, 0, 0, 0, 0, false),
      leagueIdx: 0, season: 1, wins: 0, losses: 0, ko: 0,
      seasonWins: 0, seasonLosses: 0,
      perf: 0.46 + Math.random()*0.14,
      h2hWins: 0, h2hLosses: 0, angry: false, boosted: false,
      history: []
    };
  },

  rivalArch() {
    const c = this.state.career;
    return this.RIVAL_ARCHETYPES.find(a => a.id === c.rival.archId) || this.RIVAL_ARCHETYPES[0];
  },

  // v0.12 — la provocation dépend du contexte de la rivalité.
  // Priorité : dernière saison > colère > respect > 1re rencontre > qui mène.
  rivalContext() {
    const c = this.state.career, r = c && c.rival;
    if (!r) return 'first';
    if ((c.leagueIdx || 0) === 5) return 'last';
    if (r.angry) return 'angry';
    if (r.respect) return 'respect';
    const w = c.h2hWins || 0, l = c.h2hLosses || 0;
    if (w + l === 0) return 'first';
    if (l > w) return 'ahead';
    if (w > l) return 'behind';
    return 'first';
  },

  rivalTaunt() {
    const t = this.rivalArch().taunts;
    if (Array.isArray(t)) return this.pick(t);
    const pool = t[this.rivalContext()] || t.first;
    return '« ' + this.pick(pool) + ' »';
  },

  // Momentum d'entrée sur un duel : colère → il entame lancé,
  // respect → vous entamez lancé, dernière saison → les deux.
  rivalMomentum() {
    const r = this.state.career.rival;
    if (!r) return { you:0, foe:0 };
    if ((this.state.career.leagueIdx || 0) === 5) return { you:0.08, foe:0.08 };
    if (r.angry) return { you:0, foe:0.05 };
    if (r.respect) return { you:0.05, foe:0 };
    return { you:0, foe:0 };
  },

  advanceRival() {
    const c = this.state.career;
    const r = c.rival;

    const perf = r.seasonWins / Math.max(1, r.seasonWins + r.seasonLosses);
    r.history.push({ season:r.season, league:this.LEAGUES[r.leagueIdx], w:r.seasonWins, l:r.seasonLosses, gen:r.gen });
    if (r.history.length > 12) r.history.shift();

    r.state = 86 + Math.floor(Math.random()*12);

    // v0.11.0 — sa trajectoire suit son CLASSEMENT, comme celle du joueur.
    // Auparavant elle dépendait de son seul taux de victoire : un rival
    // 15e sur 15 pouvait être promu.
    // Le joueur vient de changer de ligue : c.leagueIdx est déjà celle
    // de la saison à venir.
    const pl = c.leagueIdx;
    const st = (c.standings || []).find(b => b.isRival);

    let rank;
    if (st) {
      const table = this.sortedStandings();
      const row = table.find(x => x.isRival);
      rank = row ? row.rank : this.LEAGUE_SIZE;
    } else {
      // v0.11.1 — hors de la ligue du joueur, son classement penche selon
      // l'écart. Auparavant il était tiré à plat : il ne montait donc
      // presque jamais et se contentait d'être traîné une division
      // derrière, avant d'apparaître en Légendaire d'un coup.
      const gap = pl - r.leagueIdx;
      rank = this.rivalRankInOwnLeague(gap);
    }
    r.lastRank = rank;

    let next = r.leagueIdx;

    // Le rang réellement simulé décide partout : podium = promotion,
    // trois dernières places = relégation (sauf Amateur).
    if (rank <= this.PROMO_SLOTS && next < 5) next++;
    else if (rank >= this.RELEG_FROM && next > 0) next--;

    // Verrou : il ne bouge jamais de plus d'une division par saison,
    // dans tous les cas. C'est ce qui interdit toute apparition soudaine.
    next = Math.max(r.leagueIdx - 1, Math.min(r.leagueIdx + 1, next));
    next = Math.max(0, Math.min(5, next));

    const promoted = next > r.leagueIdx, relegated = next < r.leagueIdx;

    // v0.14.0 — A2 : il gagnait +2 sur les QUATRE stats à chaque saison,
    // soit 8 points offerts, sans contrepartie ni condition. Mesuré : le
    // joueur, en dépensant l'intégralité de ses cores, en achète 7,3 par
    // saison — le rival obtenait donc gratuitement l'équivalent de tout
    // le budget du joueur, et pouvait investir le sien ailleurs.
    // Désormais sa progression se mérite : trois stats tirées au sort,
    // +2 chacune s'il monte, +1 s'il se maintient, rien s'il descend.
    // Soit 0 à 6 points au lieu de 8 systématiques.
    const gain = promoted ? 2 : (relegated ? 0 : 1);
    if (gain > 0) {
      const keys = this.shuffle(Object.keys(r.stats)).slice(0, 3);
      keys.forEach(k => { r.stats[k] = Math.min(99, r.stats[k] + gain); });
    }

    // v0.12 — la nouvelle est choisie AVANT la remise à zéro, avec le
    // mouvement de ligue : elle doit correspondre à ce qui vient de se passer.
    //
    // v0.14.0 — A4 : cette nouvelle était écrite ici, à l'inter-saison,
    // mais LUE dans le bilan de fin de saison, qui s'affiche AVANT.
    // Le bilan de la saison N montrait donc le commentaire de la saison
    // N-1 : un rival 15e avec 9V-11D pouvait être décrit comme n'ayant
    // jamais quitté la tête du classement, parce que c'était vrai la
    // saison d'avant. On écrit désormais dans `pendingNews`, et le bilan
    // le publie au moment où il l'affiche (voir consumeRivalNews).
    // v0.14.0 — A4 : la nouvelle n'est plus écrite ici. Elle l'était à
    // l'inter-saison alors que le bilan, qui l'affiche, passe AVANT :
    // le bilan de la saison N publiait donc le commentaire de N-1. Elle
    // est désormais générée par consumeRivalNews(), appelé par le bilan.
    r.leagueIdx = next;
    r.season++;
    r.seasonWins = 0; r.seasonLosses = 0;
    r.perf = 0.46 + Math.random()*0.14 + (r.boosted ? 0.05 : 0) + (r.angry ? 0.04 : 0);
    r.gen = this.computeGen(r.stats, r.state, r.wins, r.losses, r.leagueIdx, 0, 0, false);
    r.boosted = false;
  },

  // v0.14.0 — A4 : publie le commentaire de la saison qui vient de se
  // terminer.
  //
  // Le piège : le bilan s'affiche AVANT advanceRival(). Générer la
  // nouvelle dans advanceRival() revenait donc à la publier une saison
  // trop tard — c'était le bug d'origine. On la calcule ici, au moment
  // du bilan, où r.seasonWins / r.seasonLosses décrivent encore la
  // saison écoulée et où son rang est encore lisible.
  //
  // `promoted` et `relegated` sont volontairement faux : à cet instant
  // sa trajectoire n'est pas décidée, ce que le bilan dit lui-même
  // (« Sa trajectoire pour la suite sera connue à l'intersaison »).
  // C'est le rang qui tranche.
  //
  // newsSeason garde le résultat stable si le bilan est réaffiché.
  consumeRivalNews() {
    const c = this.state.career, r = c && c.rival;
    if (!r) return '';
    if (r.newsSeason !== r.season) {
      let rank = null;
      const st = (c.standings || []).find(b => b.isRival);
      if (st) {
        const row = this.sortedStandings().find(x => x.isRival);
        rank = row ? row.rank : null;
      } else {
        rank = this.rivalRankInOwnLeague((c.leagueIdx || 0) - r.leagueIdx);
      }
      r.lastUpdate = this.rivalNewsFor(r, false, false, rank);
      r.newsSeason = r.season;
    }
    return r.lastUpdate || '';
  },
  showRivalIntro() {
    const c = this.state.career, r = c.rival, a = this.rivalArch();
    let h = '<div style="text-align:center;padding:10px 0 16px">';
    h += '<div style="font-family:var(--font-mono);font-size:9px;color:var(--orange);text-transform:uppercase;letter-spacing:3px;margin-bottom:6px">⚔️ Un nom revient déjà</div>';
    h += '<div class="page-title">Votre rival</div>';
    // v0.16.1 — G0 : la seconde ligne annonçait « Le dernier combat de
    // votre carrière sera contre lui » — elle révélait la fin dès la
    // première minute et garantissait au joueur d'aller au bout (R3).
    h += '<div class="page-sub">Il débute en même temps que vous.<br>Vos routes vont se croiser.</div></div>';

    h += '<div class="rival-card"><div class="rival-head">';
    h += '<div class="rival-avatar">' + r.chassis.icon + '</div>';
    h += '<div class="rival-id"><div class="rival-label">' + a.icon + ' ' + a.label + '</div>';
    h += '<div class="rival-name">' + r.name + '</div>';
    h += '<div class="rival-meta">' + r.chassis.name + ' · ' + r.ia.name + ' · ' + r.sponsor.name.split(' ')[0] + '</div></div>';
    h += '<div class="rival-gen ' + this.tierCls(r.gen) + '"><div class="rival-gen-val">' + r.gen + '</div><div class="rival-gen-lab">SPEC</div></div></div>';
    h += '<div class="stats-row">';
    ['pui','vit','res','int'].forEach((k,i) => {
      const lab = ['Puiss.','Vit.','Rés.','Intel.'][i];
      h += '<div class="stat-box"><div class="stat-value" style="color:var(--orange)">' + r.stats[k] + '</div><div class="stat-label">' + lab + '</div></div>';
    });
    h += '</div><div class="rival-quote"><p>' + this.rivalTaunt() + '</p></div></div>';

    h += '<div class="inter-section"><div class="inter-section-head">';
    h += '<span class="inter-section-title" style="color:var(--orange)">Son histoire</span></div>';
    h += '<div class="ev-body" style="margin:0"><p>' + a.origin + '</p></div></div>';
    h += '<button class="btn-primary btn-red" onclick="RC.showCareer()">Entrer dans l\'arène</button>';

    document.getElementById('rival-intro-content').innerHTML = h;
    this.goTo('rival-intro');
  },

  showRivalProfile() {
    const c = this.state.career, r = c.rival, a = this.rivalArch();

    let h = '<div class="btn-back sticky" id="rival-back" onclick="RC.showCareer()">← Carrière</div>';
    h += '<div style="text-align:center;padding:4px 0 14px">';
    h += '<div style="font-family:var(--font-mono);font-size:9px;color:var(--orange);text-transform:uppercase;letter-spacing:3px;margin-bottom:5px">' + a.icon + ' ' + a.label + '</div>';
    h += '<div class="page-title" style="color:var(--orange)">' + r.name + '</div>';
    h += '<div class="page-sub">' + this.LEAGUES[r.leagueIdx] + ' · Saison ' + r.season + '</div></div>';

    // v0.12 — quand il évolue ailleurs, on montre où il en est chez lui.
    // Sa saison est réellement simulée journée par journée.
    if (r.leagueIdx !== c.leagueIdx) {
      const played = (r.seasonWins || 0) + (r.seasonLosses || 0);
      h += '<div class="inter-section" style="margin-bottom:12px">';
      h += '<div class="inter-section-head"><span class="inter-section-title">Chez lui</span>';
      h += '<span class="inter-section-note">' + this.LEAGUES[r.leagueIdx] + '</span></div>';
      if (played) {
        h += '<div class="stats-row">';
        h += '<div class="stat-box"><div class="stat-value" style="color:var(--green)">' + (r.seasonWins||0) + '</div><div class="stat-label">Victoires</div></div>';
        h += '<div class="stat-box"><div class="stat-value" style="color:var(--pink)">' + (r.seasonLosses||0) + '</div><div class="stat-label">Défaites</div></div>';
        h += '<div class="stat-box"><div class="stat-value">' + played + '</div><div class="stat-label">Journée /' + this.SEASON_FIGHTS + '</div></div>';
        h += '</div>';
      } else {
        h += '<div class="inter-section-note" style="display:block;text-align:center;padding:8px 0">Sa saison n\'a pas encore commencé.</div>';
      }
      h += '</div>';
    }

    // v0.14.0 — C5 : l'archétype et le nom étaient déjà affichés en tête
    // de page, quelques pixels au-dessus. La carte les répétait mot pour
    // mot. Elle ne porte plus que l'équipement, qui n'est nulle part
    // ailleurs.
    h += '<div class="rival-card"><div class="rival-head">';
    h += '<div class="rival-avatar">' + r.chassis.icon + '</div>';
    h += '<div class="rival-id"><div class="rival-label">Ses stats</div>';
    h += '<div class="rival-meta">' + r.chassis.name + ' · ' + r.ia.name + ' · ' + r.sponsor.name.split(' ')[0] + '</div></div>';
    h += '<div class="rival-gen ' + this.tierCls(r.gen) + '"><div class="rival-gen-val">' + r.gen + '</div><div class="rival-gen-lab">SPEC</div></div></div>';
    h += '<div class="stats-row">';
    ['pui','vit','res','int'].forEach((k,i) => {
      const lab = ['Puiss.','Vit.','Rés.','Intel.'][i];
      const col = r.stats[k] > c.stats[k] ? 'var(--pink)' : (r.stats[k] < c.stats[k] ? 'var(--green)' : 'var(--orange)');
      h += '<div class="stat-box"><div class="stat-value" style="color:' + col + '">' + r.stats[k] + '</div><div class="stat-label">' + lab + '</div></div>';
    });
    h += '</div><div class="rival-h2h">';
    h += '<div class="h2h-box"><div class="h2h-val" style="color:var(--green)">' + r.wins + '</div><div class="h2h-lab">Victoires</div></div>';
    h += '<div class="h2h-box"><div class="h2h-val" style="color:var(--pink)">' + r.losses + '</div><div class="h2h-lab">Défaites</div></div>';
    h += '<div class="h2h-box"><div class="h2h-val" style="color:var(--yellow)">' + r.ko + '</div><div class="h2h-lab">KO</div></div>';
    h += '</div></div>';

    h += '<div class="inter-section"><div class="inter-section-head"><span class="inter-section-title" style="color:var(--orange)">D\'où il vient</span></div>';
    h += '<div class="ev-body" style="margin:0"><p>' + a.origin + '</p></div></div>';
    h += '<div class="inter-section"><div class="inter-section-head"><span class="inter-section-title" style="color:var(--orange)">Son style</span></div>';
    h += '<div class="ev-body" style="margin:0"><p>' + a.style + '</p></div></div>';


    if (r.history && r.history.length) {
      h += '<div class="inter-section"><div class="inter-section-head"><span class="inter-section-title">Sa progression</span></div><div class="fin-time">';
      r.history.forEach(hh => {
        const col = 'var(--tier-' + (this.LEAGUE_TIER[hh.league] || 'bronze') + ')';
        h += '<div class="fin-time-row"><div class="fin-time-dot" style="background:' + col + '"></div>';
        h += '<div class="fin-time-mid"><div class="fin-time-league" style="color:' + col + '">S' + hh.season + ' · ' + hh.league + '</div>';
        h += '<div class="fin-time-detail">' + hh.w + 'V-' + hh.l + 'D</div></div>';
        h += '<div class="fin-time-gen">' + hh.gen + '</div></div>';
      });
      h += '</div></div>';
    }
    if (r.lastUpdate) {
      h += '<div class="inter-section"><div class="inter-section-head"><span class="inter-section-title">La saison dernière</span></div>';
      h += '<div class="empty-note" style="text-align:left">' + r.name + ' ' + r.lastUpdate + '</div></div>';
    }
    h += '<div class="rival-quote"><p>' + this.rivalTaunt() + '</p></div>';

    document.getElementById('rival-profile-content').innerHTML = h;
    this.goTo('rival-profile');
    this.bindStickyBack('rival-profile','rival-back');
  },

  // ============================================================
  // ÉCRAN DE CARRIÈRE
  // ============================================================

  nextIsNarrative() {
    const c = this.state.career;
    // v0.16.0 — garde : la carrière peut avoir été close entre-temps.
    if (!c) return false;
    return c.fightIndex < this.SEASON_FIGHTS && c.fightIndex % 4 === 0;
  },

  // v0.9.0 — le combat final unique est remplacé par le tournoi,
  // déclenché au bilan de la saison Légendaire.
  isBossFight() { return false; },

  // v0.8.0 — le duel contre le rival est fixé par le calendrier de la ligue
  isRivalFight() {
    const c = this.state.career;
    if (this.isBossFight()) return false;
    if (c.rival.leagueIdx !== c.leagueIdx) return false;
    const st = this.currentScheduled();
    return !!(st && st.isRival);
  },

  showCareer() {
    const c = this.state.career;
    if (!c) { this.goTo('home'); return; }
    this.bindStickyGroup('career', 'career-topbar');

    // --- Profil
    let h = '<div class="profile-header"><div class="profile-top"><div class="robot-identity">';
    h += '<div class="gen-circle ' + this.tierCls(c.gen) + '"><div class="gen-circle-val">' + c.gen + '</div><div class="gen-circle-label">SPEC</div></div>';
    h += '<div><div class="robot-name">' + c.name + '</div>';
    h += '<div class="robot-details">' + c.chassis.icon + ' ' + c.chassis.name + ' · ' + c.ia.icon + ' ' + c.ia.name + '</div></div>';
    h += '</div></div>';

    h += '<div class="stats-row" style="margin-bottom:10px">';
    [['pui','Puiss.'],['vit','Vit.'],['res','Rés.'],['int','Intel.']].forEach(([k,lab]) => {
      h += '<div class="stat-box"><div class="stat-value">' + c.stats[k] + '</div><div class="stat-label">' + lab + '</div></div>';
    });
    h += '</div>';

    h += '<div class="bar-row"><span class="bar-label">État</span><div class="bar-track"><div class="bar-fill bar-etat" style="width:' + c.state + '%"></div></div>';
    h += '<span class="bar-val" style="color:' + this.stateColor(c.state) + '">' + c.state + '%</span></div>';
    h += '<div class="bar-row"><span class="bar-label">Lien IA</span><div class="bar-track"><div class="bar-fill" style="width:' + this.affPct() + '%;background:linear-gradient(90deg,var(--orange),var(--purple))"></div></div>';
    h += '<span class="bar-val" style="color:var(--purple)">' + this.affPct() + '%</span></div>';

    h += '<div class="resources-row">';
    h += '<div class="resource-box"><span class="resource-icon">⚡</span><div><div class="resource-val">' + c.cores.toLocaleString('fr') + '</div><div class="resource-label">Cores</div></div></div>';
    h += '<div class="resource-box resource-pink"><span class="resource-icon">📣</span><div><div class="resource-val">' + this.fmtFollowers(c.followers) + '</div><div class="resource-label">Followers</div></div></div>';
    h += '</div></div>';

    // --- Sponsor
    h += '<div class="sponsor-strip"><span class="sponsor-logo">' + c.sponsor.icon + '</span>';
    h += '<div class="sponsor-mid"><div class="sponsor-name" style="color:' + this.sponsorColor(c.sponsor.id) + '">' + c.sponsor.name + '</div>';
    if (c.sponsor.fx.canDrop) {
      const col = c.satis >= 55 ? 'var(--green)' : c.satis >= 30 ? 'var(--orange)' : 'var(--pink)';
      const satState = c.satis >= 80 ? 'Enchantés' : c.satis >= 55 ? 'Satisfaits'
        : c.satis >= 30 ? 'Ils attendent de voir' : c.satis >= 15 ? 'Ça se tend'
        : 'Ils cherchent une porte de sortie';
      h += '<div class="satis-label-row"><span class="satis-label">Satisfaction</span><span class="satis-state" style="color:' + col + '">' + satState + '</span></div>';
      h += '<div class="satis-track"><div class="satis-fill" style="width:' + c.satis + '%;background:' + col + '"></div></div>';
      if (c.satis < 15) h += '<div class="sponsor-warn">⚠️ Votre sponsor envisage de vous lâcher</div>';
    } else {
      h += '<div class="shop-desc">Ne vous lâchera jamais</div>';
    }
    if (c.sponsorJustSigned) h += '<div class="shop-desc" style="color:var(--green);margin-top:3px">✓ Contrat signé cette intersaison</div>';
    h += '</div>';
    if (c.sponsor.fx.canDrop) {
      const col = c.satis >= 55 ? 'var(--green)' : c.satis >= 30 ? 'var(--orange)' : 'var(--pink)';
      h += '<span class="satis-val" style="color:' + col + '">' + c.satis + '%</span>';
    }
    h += '</div>';
    document.getElementById('career-header').innerHTML = h;

    // --- Saison
    let s = '';
    if (c.protoBonus) {
      s += '<div class="glitch-box" style="margin-bottom:10px"><div class="glitch-text">';
      s += '⚠️ PROTOTYPE — l\'IA a généré ' + c.protoBonus + ' points de stat cette intersaison.</div></div>';
      c.protoBonus = 0;
    }
    if (c.lastDebt) {
      s += '<div class="glitch-box" style="margin-bottom:10px"><div class="glitch-text">' + this.debtText(c.lastDebt) + '</div></div>';
      c.lastDebt = null;
    }
    c.sponsorJustSigned = false;

    s += '<div class="season-card"><div class="season-header">';
    s += '<span class="season-title">🗓️ Saison ' + c.season + ' · ' + c.league + '</span>';
    s += '<span class="season-record">Combat ' + c.fightIndex + '/' + this.SEASON_FIGHTS + '</span></div>';
    s += '<div class="progress-bar"><div class="progress-fill" style="width:' + (c.fightIndex / this.SEASON_FIGHTS * 100) + '%"></div></div>';
    s += '<div class="season-stats">';
    s += '<div class="season-stat"><div class="season-stat-val val-green">' + c.seasonWins + '</div><div class="season-stat-label">Victoires</div></div>';
    s += '<div class="season-stat"><div class="season-stat-val val-red">' + c.seasonLosses + '</div><div class="season-stat-label">Défaites</div></div>';
    s += '<div class="season-stat"><div class="season-stat-val val-yellow">' + c.seasonKO + '</div><div class="season-stat-label">KO</div></div>';
    s += '<div class="season-stat"><div class="season-stat-val val-cyan">' + c.atoutsLeft + '</div><div class="season-stat-label">Atouts</div></div>';
    s += '</div></div>';

    // Réparation de mi-saison
    // v0.14.0 — A10 : la condition était « fightIndex >= moitié » sans
    // borne haute. L'offre restait donc affichée de la journée 10
    // jusqu'à la fin de saison, ce qui permettait d'attendre la journée
    // 19 et de payer au tarif réduit (×0,7) ce que le bilan facturerait
    // plein tarif. Elle n'est désormais proposée que sur trois journées,
    // et l'encadré dit combien il en reste pour qu'on ne l'oublie pas.
    const half = Math.floor(this.SEASON_FIGHTS / 2);
    const midWindow = 3;
    const midLeft = half + midWindow - c.fightIndex;
    if (c.fightIndex >= half && midLeft > 0 && !c.midRepairUsed && c.state < 100) {
      const pts = Math.min(15, 100 - c.state);
      const cost = this.repairQuote(pts, true);
      const ok = this.canAfford(cost);
      const rp = c.sponsor.fx.repairPct || 0;
      s += '<div class="shop-item' + (ok ? '' : ' locked') + '" style="border:1px solid rgba(247,224,24,.25);background:rgba(247,224,24,.04)"' + (ok ? ' onclick="RC.doRepair(\'mid\')"' : '') + '>';
      s += '<div class="shop-info"><div class="shop-name" style="color:var(--yellow)">🔧 Réparation de mi-saison</div>';
      // v0.14.0 — libellé condensé sur une seule ligne : les trois
      // mentions séparées débordaient sur quatre lignes sur mobile.
      s += '<div class="shop-desc">+' + pts + '% d\'état · tarif réduit · <span style="color:var(--orange)">encore ' + midLeft + ' combat' + (midLeft > 1 ? 's' : '') + '</span>';
      if (rp > 0) s += ' · ' + c.sponsor.name + ' −' + Math.round(rp*100) + '%';
      s += '</div></div>';
      s += cost === 0
        ? '<div class="shop-price free">Gratuit</div></div>'
        : '<div class="shop-price' + (ok ? '' : ' cant') + '">' + cost.toLocaleString('fr') + ' ⚡</div></div>';
    }

    // Rival
    // v0.14.0 — C1 : la ligne détaillée (ligue · SPEC · saison · carrière)
    // répétait mot pour mot ce que « Vos stats », juste en dessous,
    // affiche déjà. Elle débordait en plus sur deux lignes de façon
    // irrégulière. Ne restent ici que le nom, les duels et la situation.
    const r = c.rival, ra = this.rivalArch();
    s += '<div class="sponsor-strip rival-strip" onclick="RC.showRivalProfile()"><span class="sponsor-logo">' + ra.icon + '</span>';
    s += '<div class="sponsor-mid"><div class="sponsor-name" style="color:var(--orange)">Rival · ' + r.name + '</div>';
    // v0.14.0 — A5 : le dernier cas était un `else` fourre-tout. Avec le
    // rival deux ligues derrière, aucun test ne correspondait et le jeu
    // affichait « une ligue devant vous » — l'inverse de la réalité.
    // Libellés volontairement courts : ils débordaient sur deux lignes.
    const dl = r.leagueIdx - (c.leagueIdx || 0);
    let pos;
    if (dl === 0) pos = '<span style="color:var(--orange)">⚔️ Dans votre ligue</span>';
    else if (dl === -1) pos = 'Une ligue derrière';
    else if (dl === 1) pos = 'Une ligue devant';
    else if (dl < -1) pos = (-dl) + ' ligues derrière';
    else pos = dl + ' ligues devant';
    s += '<div class="shop-desc">' + pos + '</div>';
    s += '</div>';
    if (r.h2hWins + r.h2hLosses > 0) {
      s += '<div style="text-align:right;margin-left:8px"><div class="satis-val" style="color:var(--orange);width:auto">' + r.h2hWins + '-' + r.h2hLosses + '</div>';
      s += '<div class="inter-bar-label" style="margin-top:1px">Vos duels</div></div>';
    }
    s += '</div>';

    // v0.13 — §3.1 : « Vos stats », sous le bloc du rival. Vous a gauche,
    // lui a droite. Affiche en permanence des la saison 1, sans ecart
    // calcule (regle R2 : le joueur sait comparer deux nombres lui-meme).
    s += '<div class="vs-block"><div class="vs-title">Vos stats</div>';
    s += '<div class="vs-row"><div class="vs-side vs-side-you"><div class="vs-label">Vous</div><div class="vs-val">' + c.gen + '</div></div>';
    s += '<div class="vs-mid">SPEC</div>';
    s += '<div class="vs-side vs-side-foe"><div class="vs-label">Lui</div><div class="vs-val">' + r.gen + '</div></div></div>';
    s += '<div class="vs-row"><div class="vs-side vs-side-you"><div class="vs-val" style="font-size:12px">' + c.league + '</div></div>';
    s += '<div class="vs-mid">Ligue</div>';
    s += '<div class="vs-side vs-side-foe"><div class="vs-val" style="font-size:12px">' + this.LEAGUES[r.leagueIdx] + '</div></div></div>';
    s += '<div class="vs-row"><div class="vs-side vs-side-you"><div class="vs-val" style="font-size:12px">' + c.seasonWins + 'V-' + c.seasonLosses + 'D</div></div>';
    s += '<div class="vs-mid">Saison</div>';
    s += '<div class="vs-side vs-side-foe"><div class="vs-val" style="font-size:12px">' + r.seasonWins + 'V-' + r.seasonLosses + 'D</div></div></div>';
    s += '<div class="vs-row"><div class="vs-side vs-side-you"><div class="vs-val" style="font-size:12px">' + c.totalWins + 'V-' + c.totalLosses + 'D</div></div>';
    s += '<div class="vs-mid">Carrière</div>';
    s += '<div class="vs-side vs-side-foe"><div class="vs-val" style="font-size:12px">' + r.wins + 'V-' + r.losses + 'D</div></div></div>';
    // v0.14.0 — A6 : les KO totaux, infligés et subis. Les subis n'étaient
    // comptés nulle part avant cette version : ils démarrent donc à zéro
    // sur une carrière déjà entamée.
    s += '<div class="vs-row"><div class="vs-side vs-side-you"><div class="vs-val" style="font-size:12px">' + (c.totalKO || 0) + ' / ' + (c.totalKOTaken || 0) + '</div></div>';
    s += '<div class="vs-mid">KO<br><span style="font-size:7px">inf. / subis</span></div>';
    s += '<div class="vs-side vs-side-foe"><div class="vs-val" style="font-size:12px">' + (r.ko || 0) + ' / —</div></div></div>';
    s += '</div>';

    document.getElementById('career-season').innerHTML = s;

    // --- Action : v0.13 §3.1 — affiche d'adversaire plutot qu'explication
    // de mecanique. « 3 rounds, 3 choix par round » retire (regle R1) :
    // le joueur l'apprend en jouant, pas en le lisant a chaque fois.
    let a = '';
    if (c.fightIndex >= this.SEASON_FIGHTS) {
      a += '<div class="next-hint"><span class="next-hint-icon">🏁</span>';
      a += '<span class="next-hint-text">Les ' + this.SEASON_FIGHTS + ' combats de la saison sont disputés.<br><b>Place au bilan.</b></span></div>';
      a += '<button class="btn-primary btn-gradient" onclick="RC.showSeasonSummary()">Bilan de saison</button>';
    } else if (this.isBossFight()) {
      // v0.13 — correction : le rival stocke `chassis` (l'objet complet),
      // jamais `chassisId`. this.CHASSIS.find(x=>x.id===r.chassisId)
      // retournait toujours undefined et faisait planter .icon.
      // v0.13 (ajusté) — un titre explicite au-dessus de l'affiche : le
      // badge vertical seul ("FINALE"/"RIVAL"/"COMBAT") se comprend une
      // fois qu'on connaît le jeu, pas à la première lecture.
      a += '<div class="foe-poster-title">Prochain combat contre ' + r.name + '</div>';
      a += '<div class="foe-poster foe-boss"><div class="foe-poster-badge">FINALE</div>';
      a += '<div class="foe-poster-mid"><div class="foe-poster-name">' + r.name + '</div>';
      a += '<div class="foe-poster-sub">' + r.chassis.icon + ' ' + r.chassis.name + ' · 7 rounds</div></div>';
      a += '<div class="foe-poster-spec"><div class="foe-poster-spec-val" style="color:var(--yellow)">' + r.gen + '</div><div class="foe-poster-spec-lab">SPEC</div></div></div>';
      a += '<button class="btn-primary btn-yellow" onclick="RC.continueSeason()">Continuer</button>';
    } else if (this.isRivalFight()) {
      a += '<div class="foe-poster-title">Prochain combat contre ' + r.name + '</div>';
      a += '<div class="foe-poster foe-rival"><div class="foe-poster-badge">RIVAL</div>';
      a += '<div class="foe-poster-mid"><div class="foe-poster-name">' + r.name + '</div>';
      a += '<div class="foe-poster-sub">' + r.chassis.icon + ' ' + r.chassis.name + '</div></div>';
      a += '<div class="foe-poster-spec"><div class="foe-poster-spec-val" style="color:var(--orange)">' + r.gen + '</div><div class="foe-poster-spec-lab">SPEC</div></div></div>';
      a += '<button class="btn-primary btn-red" onclick="RC.continueSeason()">Continuer</button>';
    } else if (this.nextIsNarrative()) {
      const st = this.currentScheduled();
      const foeCh = st ? this.CHASSIS.find(x => x.id === st.chassisId) : null;
      a += '<div class="foe-poster-title">Prochain combat contre ' + (st ? st.name : 'un adversaire inconnu') + '</div>';
      a += '<div class="foe-poster"><div class="foe-poster-badge">COMBAT</div>';
      a += '<div class="foe-poster-mid"><div class="foe-poster-name">' + (st ? st.name : '???') + '</div>';
      a += '<div class="foe-poster-sub">' + (foeCh ? foeCh.icon + ' ' + foeCh.name : 'Châssis inconnu') + '</div></div>';
      a += '<div class="foe-poster-spec"><div class="foe-poster-spec-val">' + (st ? st.spec : '?') + '</div><div class="foe-poster-spec-lab">SPEC</div></div></div>';
      a += '<button class="btn-primary btn-red" onclick="RC.continueSeason()">Continuer</button>';
    } else {
      const rem = Math.min(3, this.SEASON_FIGHTS - c.fightIndex);
      a += '<div class="next-hint"><span class="next-hint-icon">⚔️</span>';
      a += '<span class="next-hint-text">Prochain : <b>' + rem + ' combats simulés</b></span></div>';
      a += '<button class="btn-primary btn-cyan" onclick="RC.continueSeason()">Continuer</button>';
    }
    document.getElementById('career-action').innerHTML = a;

    this.goTo('career');
  },

  continueSeason() {
    const c = this.state.career;
    if (!c) { this.goTo('home'); return; }
    if (c.fightIndex >= this.SEASON_FIGHTS) { this.showSeasonSummary(); return; }
    if (!this.isBossFight() && c.fightIndex > 0 && Math.random() < 0.30 && this.pickEvent()) {
      this.showEvent(); return;
    }
    if (this.nextIsNarrative()) this.startNarrativeCombat();
    else this.runSimulatedBatch();
  },

  // ============================================================
  // COMBAT NARRATIF
  // ============================================================

  _currentOpponent: null, _currentRound: 0, _maxRounds: 3,
  _playerHP: 100, _enemyHP: 100, _combatLog: [],
  _roundWins: 0, _momentum: 0, _atoutFailed: false,
  _isBoss: false, _isRival: false, _enemyAtouts: 0,
  _roundChoices: null, _lastRound: null, _challengeBonus: 0,
  _typingInterval: null, _typingDone: false, _typingCallback: null,
  _typingFullText: '', _typingElementId: '',

  startNarrativeCombat() {
    const c = this.state.career;
    this._isBoss = this.isBossFight();
    this._isRival = this.isRivalFight();
    this._isDeathmatch = false;
    this._tournStage = null;
    this._timeoutFx = null;
    this._timeoutDone = true;

    // v0.8.0 — l'adversaire vient du calendrier de la ligue
    const st = this.currentScheduled();
    this._scheduledId = st ? st.id : null;
    if (this._isBoss) {
      const r = c.rival;
      this._currentOpponent = { name:r.name, chassis:r.chassis, ia:r.ia, stats:{...r.stats}, gen:r.gen, hidden:false, isRival:true };
    } else if (st) {
      this._currentOpponent = this.opponentFromStanding(st);
      this._isRival = !!st.isRival;
    } else {
      this._currentOpponent = this.generateOpponent(c.league);
    }
    // L'Intelligence révèle les stats cachées de l'adversaire
    if (this.intelSeeAll(c.stats)) this._currentOpponent.hidden = false;

    this._maxRounds = this._isBoss ? 7 : 3;
    this._currentRound = 0;
    this._playerHP = 100; this._enemyHP = 100;
    this._combatLog = []; this._roundWins = 0; this._momentum = 0;
    this._atoutFailed = false;
    this._enemyAtouts = this._isBoss ? 3 : 0;
    this._lastRound = null;

    if (this._isBoss) {
      c.atoutsLeft = 3;
      if (c.state < 75) { c.bossRepaired = 100 - c.state; c.state = 75; }
    }
    this.showPreCombat();
  },

  showPreCombat() {
    const c = this.state.career, op = this._currentOpponent;
    let h = '';

    if (this._isDeathmatch) {
      // v0.13 — §17.2/17.3 : le combat a mort. Hors ligue, sans arbitre,
      // sans regle de reprise. La destruction est reelle des deux cotes.
      h += '<div class="boss-banner" style="border-color:rgba(229,56,59,.4)"><div class="boss-kicker" style="color:var(--red)">Hors ligue · Héphaïstos</div>';
      h += '<div class="boss-title">COMBAT À MORT</div>';
      h += '<div class="boss-sub">7 rounds · 3 atouts pour chacun<br>Sans arbitre, sans règle de reprise. Une seule machine repart.</div></div>';
    } else if (this._isBoss) {
      h += '<div class="boss-banner"><div class="boss-kicker">Combat final</div>';
      h += '<div class="boss-title">FINALE</div>';
      h += '<div class="boss-sub">7 rounds · 3 atouts pour chacun</div></div>';
    } else {
      h += '<div style="text-align:center;margin-bottom:14px">';
      h += '<div style="font-family:var(--font-mono);font-size:9px;color:' + (this._isRival ? 'var(--orange)' : 'var(--pink)') + ';text-transform:uppercase;letter-spacing:3px;margin-bottom:4px">';
      h += (this._isRival ? '⚔️ Duel de rivaux' : '⚔️ Combat narratif') + '</div>';
      h += '<div class="page-title">COMBAT #' + (c.fightIndex + 1) + '</div>';
      h += '<div class="page-sub">' + c.league + ' · Saison ' + c.season + '</div></div>';
    }

    h += '<div class="vs-card"><div class="vs-side vs-you">';
    h += '<div class="vs-name">' + c.name + '</div>';
    h += '<div class="vs-chassis">' + c.chassis.icon + ' ' + c.chassis.name + '</div>';
    [['PUI','pui'],['VIT','vit'],['RÉS','res'],['INT','int']].forEach(([lab,k]) => {
      h += '<div class="vs-stat"><span class="vs-stat-label">' + lab + '</span><span class="vs-stat-val">' + c.stats[k] + '</span></div>';
    });
    h += '</div><div class="vs-divider">VS</div><div class="vs-side vs-enemy">';
    h += '<div class="vs-name">' + op.name + '</div>';
    h += '<div class="vs-chassis">' + op.chassis.icon + ' ' + op.chassis.name + '</div>';
    h += '<div class="vs-stat"><span class="vs-stat-label">PUI</span><span class="vs-stat-val">' + op.stats.pui + '</span></div>';
    h += '<div class="vs-stat"><span class="vs-stat-label">VIT</span><span class="vs-stat-val">' + op.stats.vit + '</span></div>';
    if (op.hidden) {
      h += '<div class="vs-stat"><span class="vs-stat-label">RÉS</span><span class="vs-stat-hidden">???</span></div>';
      h += '<div class="vs-stat"><span class="vs-stat-label">INT</span><span class="vs-stat-hidden">???</span></div>';
    } else {
      h += '<div class="vs-stat"><span class="vs-stat-label">RÉS</span><span class="vs-stat-val">' + op.stats.res + '</span></div>';
      h += '<div class="vs-stat"><span class="vs-stat-label">INT</span><span class="vs-stat-val">' + op.stats.int + '</span></div>';
    }
    h += '</div></div>';

    if (!op.hidden && this.intelSeeAll(c.stats)) {
      h += '<div class="rr-momentum" style="margin-bottom:12px"><span class="rr-momentum-icon">🧠</span>';
      h += '<span class="rr-momentum-text">Votre Intelligence (' + c.stats.int + ') a percé les données adverses : toutes ses stats sont visibles.</span></div>';
    }
    if (this._isRival) h += '<div class="rival-quote" style="margin-bottom:14px"><p>' + this.rivalTaunt() + '</p></div>';
    if (c.state < 55) {
      h += '<div class="round-feedback rf-loss" style="margin-bottom:12px">⚠️ Robot en état ' + this.stateLabel(c.state) + ' (' + c.state + '%) — vos performances sont réduites.</div>';
    }
    if (c.challenge === 'noAtout') {
      h += '<div class="round-feedback rf-dodge" style="margin-bottom:12px">🎯 Défi sponsor en cours : gagner sans utiliser d\'atout.</div>';
    }

    h += '<button class="btn-primary ' + (this._isBoss ? 'btn-yellow' : 'btn-red') + '" id="btn-engage" onclick="RC.startRound()">Engager le combat</button>';
    document.getElementById('precombat-content').innerHTML = h;
    this.goTo('precombat');
  },

  startRound() { this._currentRound++; this.showRound(); },

  pickText(pool) {
    const c = this.state.career;
    if (!c.textsSeen) c.textsSeen = [];
    const avail = pool.filter(t => c.textsSeen.indexOf(t.intro.slice(0,28)) === -1);
    const src = avail.length ? avail : pool;
    const picked = this.pick(src);
    const key = picked.intro.slice(0,28);
    if (c.textsSeen.indexOf(key) === -1) {
      c.textsSeen.push(key);
      if (c.textsSeen.length > 60) c.textsSeen.shift();
    }
    return picked;
  },

  showRound() {
    const round = this._currentRound, c = this.state.career;

    let textData;
    if (round === 1) textData = this.pickText(this.COMBAT_OPENERS);
    else {
      const lost = this._combatLog.length - this._roundWins;
      const key = this._roundWins > lost ? 'lead' : (this._roundWins < lost ? 'behind' : 'even');
      textData = this.pickText(this.COMBAT_RELANCES[key]);
    }
    // v0.12 — chaque option porte 3 formulations : on en tire une.
    // Le balisage et les classes restent identiques.
    const opts = textData.choices.map(o => ({
      t: Array.isArray(o.t) ? this.pick(o.t) : o.t, p: o.p
    }));
    const sp0 = this.pick(this.SPECIAL_ATTACKS);
    const special = { name: textData.atout ? this.pick(textData.atout) : sp0.name, desc: sp0.desc };
    this._roundChoices = opts;

    let h = '<div class="combat-top"><div class="round-dots">';
    for (let i = 1; i <= this._maxRounds; i++) {
      const log = this._combatLog[i-1];
      if (log) h += '<div class="round-dot ' + (log.won ? 'done' : 'lost') + '"></div>';
      else if (i === round) h += '<div class="round-dot active"></div>';
      else h += '<div class="round-dot"></div>';
    }
    h += '</div><div class="round-label">Round ' + round + '/' + this._maxRounds + '</div></div>';

    h += '<div class="combat-health"><div class="health-side you"><div class="health-name"><span>' + c.name + '</span><span class="health-hp">' + this._playerHP + '%</span></div>';
    h += '<div class="health-bar"><div class="health-you" style="width:' + this._playerHP + '%"></div></div></div>';
    h += '<div class="health-side enemy"><div class="health-name"><span>' + this._currentOpponent.name + '</span><span class="health-hp">' + this._enemyHP + '%</span></div>';
    h += '<div class="health-bar"><div class="health-enemy" style="width:' + this._enemyHP + '%"></div></div></div></div>';

    if (this._momentum > 0) {
      h += '<div class="rr-momentum"><span class="rr-momentum-icon">🧠</span>';
      h += '<span class="rr-momentum-text">Momentum · votre IA s\'est adaptée : <b>+' + Math.round(this._momentum*100) + '%</b> d\'efficacité ce round.</span></div>';
    }

    h += '<div class="terminal-box" id="terminal-box" onclick="RC.skipTyping()"><div class="terminal-text" id="terminal-text"></div></div>';
    h += '<div class="combat-choices locked" id="combat-choices">';
    h += '<div class="combat-choice ' + (opts[0].p === 'force' ? 'choice-pow' : 'choice-tech') + '" id="cc1" onclick="RC.makeChoice(1)">' + opts[0].t;
    h += '<div class="choice-profile">' + (opts[0].p === 'force' ? '⚔ Puissance / Résistance' : '✦ Vitesse / Intelligence') + '</div></div>';
    h += '<div class="combat-choice ' + (opts[1].p === 'force' ? 'choice-pow' : 'choice-tech') + '" id="cc2" onclick="RC.makeChoice(2)">' + opts[1].t;
    h += '<div class="choice-profile">' + (opts[1].p === 'force' ? '⚔ Puissance / Résistance' : '✦ Vitesse / Intelligence') + '</div></div>';
    if (c.atoutsLeft > 0) {
      h += '<div class="combat-choice choice-special" id="cc3" onclick="RC.makeChoice(3)">';
      h += '<div class="choice-special-label">💥 ' + special.name + '</div>' + special.desc;
      h += '<div class="choice-stock">Stock : ' + c.atoutsLeft + ' restant(s)</div></div>';
    }
    h += '</div>';

    document.getElementById('combat-content').innerHTML = h;
    this.goTo('combat-round');
    this.typeText(textData.intro, 'terminal-text', () => this.showChoicesAnimated());
  },

  typeText(text, elementId, callback) {
    let idx = 0;
    this._typingDone = false;
    const el = document.getElementById(elementId);
    if (!el) return;
    clearInterval(this._typingInterval);
    this._typingInterval = setInterval(() => {
      if (idx < text.length) {
        el.innerHTML = text.substring(0, idx+1) + '<span class="terminal-cursor"></span>';
        idx++;
      } else {
        clearInterval(this._typingInterval);
        el.innerHTML = text;
        this._typingDone = true;
        if (callback) callback();
      }
    }, 18);
    this._typingCallback = callback;
    this._typingFullText = text;
    this._typingElementId = elementId;
  },

  skipTyping() {
    if (!this._typingDone) {
      clearInterval(this._typingInterval);
      const el = document.getElementById(this._typingElementId);
      if (el) el.innerHTML = this._typingFullText;
      this._typingDone = true;
      if (this._typingCallback) this._typingCallback();
    }
  },

  showChoicesAnimated() {
    let delay = 0;
    ['cc1','cc2','cc3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { setTimeout(() => el.classList.add('visible'), delay); delay += 250; }
    });
    setTimeout(() => {
      const box = document.getElementById('combat-choices');
      if (box) box.classList.remove('locked');
    }, delay + 120);
  },

  // --- Narration de round : technique nommée + impact
  techniqueFor(profile, chassisId) {
    const byProfile = this.TECHNIQUES[profile] || this.TECHNIQUES.force;
    return this.pick(byProfile[chassisId] || byProfile.tactical);
  },

  roundNarration(o) {
    if (o.counter) {
      return o.won
        ? o.opName + ' lance ' + this.techniqueFor(o.enemyProfile, o.opChassis) + '. ' + this.pick(this.COUNTER_YOU)
        : 'Votre robot lance ' + this.techniqueFor(o.profile, o.myChassis) + '. ' + this.pick(this.COUNTER_ENEMY);
    }
    // Le registre du texte suit l'ampleur réelle des dégâts affichés
    const tier = o.impact >= 26 ? 'BIG' : (o.impact >= 16 ? 'MID' : 'LOW');
    return o.won
      ? 'Votre robot place ' + this.techniqueFor(o.profile, o.myChassis) + '. ' + this.pickReaction(this['IMPACT_' + tier])
      : o.opName + ' place ' + this.techniqueFor(o.enemyProfile, o.opChassis) + '. ' + this.pickReaction(this['TAKEN_' + tier]);
  },

  // ============================================================
  // RÉSOLUTION D'UN ROUND
  // Les quatre stats interviennent : Puissance sur les dégâts infligés,
  // Résistance sur les dégâts subis, Vitesse sur l'esquive (qui contre),
  // Intelligence sur le momentum et la résistance aux bugs.
  // ============================================================

  // Sous ce seuil de structure, le combat est arrêté : la machine
  // ne peut plus se défendre. C'est ce qui rend les KO atteignables.
  KO_THRESHOLD: 15,

  makeChoice(choice) {
    const c = this.state.career, op = this._currentOpponent;
    const cm = this.CHASSIS_MOD[c.chassis.id] || this.CHASSIS_MOD.tactical;
    const om = this.CHASSIS_MOD[op.chassis.id] || this.CHASSIS_MOD.tactical;
    const fx = c.ia.fx || {};

    // Modificateurs issus des stats
    const myPower = this.powerMod(c.stats), myArmor = this.armorMod(c.stats);
    const opPower = this.powerMod(op.stats), opArmor = this.armorMod(op.stats);
    const myDodge = cm.dodge + this.dodgeBonus(c.stats);
    const opDodge = om.dodge + this.dodgeBonus(op.stats);

    let won = false, ko = false, counter = false, bug = false, genius = false;
    let dealt = 0, taken = 0, title = '', sub = '', action = '';

    const learn = Math.min(0.08, (fx.learn || 0) * (c.combatsFought || 0));
    const iaBonus = 1 + (fx.scoreBonus || 0) + learn + this._momentum;

    if (choice === 3) {
      // ===== ATOUT SPÉCIAL =====
      c.atoutsLeft--;
      c.atoutsUsed = (c.atoutsUsed || 0) + 1;
      this.seasonCounters().atouts++;
      if (c.challenge === 'noAtout') { c.challenge = null; c.challengeFailed = true; }
      const chance = 0.48 + (c.stats.int / 500) + (this.stateMult(c.state) - 1) * 0.5 + this._momentum
                   + (this._isBoss ? 0.10 : 0);   // les atouts pèsent davantage en finale
      if (Math.random() < chance) {
        won = true;
        c.atoutsSuccess = (c.atoutsSuccess || 0) + 1;
        dealt = Math.round((34 + Math.random()*20) * cm.dmgDealt * myPower * opArmor);
        this._enemyHP = Math.max(0, this._enemyHP - dealt);
        if (this._enemyHP <= this.KO_THRESHOLD) { ko = true; this._enemyHP = 0; }
        title = ko ? 'KO !' : 'Atout réussi';
        sub = ko ? 'L\'atout spécial met fin au combat' : 'La manœuvre passe parfaitement';
        action = "L'atout part au bon moment. " + this.pickReaction(this.IMPACT_BIG);
      } else {
        this._atoutFailed = true;
        taken = Math.round((26 + Math.random()*16) * cm.dmgTaken * myArmor * opPower);
        this._playerHP = Math.max(0, this._playerHP - taken);
        if (this._playerHP <= this.KO_THRESHOLD) { ko = true; this._playerHP = 0; }
        title = 'Atout raté';
        sub = 'Le retour de flamme est violent';
        action = "La manœuvre part trop tôt : votre robot se découvre complètement. " + this.pickReaction(this.TAKEN_BIG);
      }
    } else {
      // ===== CHOIX NORMAL =====
      const profile = (this._roundChoices && this._roundChoices[choice-1]) ? this._roundChoices[choice-1].p : 'force';
      const enemyProfile = this.opponentProfile(op);
      const variance = fx.variance || 1;

      const pNoise = 14 + (Math.random() - 0.5) * 28 * variance;
      const eNoise = 14 + (Math.random() - 0.5) * 28;
      const toFx = this._timeoutFx || {};
      const toMult = (this._isBoss && this._currentRound > 4 && toFx.mult) ? toFx.mult : 1;
      let pScore = this.profileScore(c.stats, profile) * this.stateMult(c.state) * cm.score * iaBonus * toMult + pNoise;
      const eScore = this.profileScore(op.stats, enemyProfile) * (0.97 + Math.random()*0.10) + eNoise;

      // L'Intelligence atténue les bugs du Prototype
      if (Math.random() < (fx.bugChance || 0) * this.bugResist(c.stats)) {
        bug = true; c.bugsSuffered = (c.bugsSuffered || 0) + 1; pScore *= 0.55;
      }
      if (!bug && Math.random() < (fx.geniusChance || 0)) { genius = true; pScore *= 1.45; }

      let bossAtout = false;
      if (this._isBoss && this._enemyAtouts > 0 && this._currentRound >= 2 && Math.random() < 0.35) {
        bossAtout = true; this._enemyAtouts--;
      }
      const eFinal = (bossAtout ? eScore * 1.45 : eScore) * (this._isBoss ? 1.03 : 1);

      won = pScore > eFinal;
      // Certaines réponses au temps mort décident de l'issue
      if (this._isBoss && this._currentRound > 4 && toFx.win) {
        if (toFx.win === 'force') won = true;
        else if (toFx.win === 'lose') won = false;
      }
      const gap = Math.abs(pScore - eFinal);
      const raw = Math.round(15 + Math.min(26, gap * 1.05));

      if (won) {
        if (Math.random() < opDodge) {
          // L'adversaire esquive et contre : le round bascule
          counter = true; won = false;
          taken = Math.max(1, Math.round(raw * 0.5 * cm.dmgTaken * myArmor * opPower));
          this._playerHP = Math.max(0, this._playerHP - taken);
          if (this._playerHP <= this.KO_THRESHOLD) {
            ko = true; this._playerHP = 0; title = 'KO subi';
            sub = (this._currentRound >= this._maxRounds)
              ? 'Contré au pire moment'
              : 'Contré au pire moment, le combat est arrêté';
          }
          else { title = 'Contré'; sub = op.name + ' esquive et vous punit sur la riposte'; }
        } else {
          dealt = Math.round(raw * cm.dmgDealt * myPower * opArmor * (toFx.dmg || 1));
          this._enemyHP = Math.max(0, this._enemyHP - dealt);
          // v0.13 (ajuste) — "combat arrete" implique une interruption de
          // quelque chose qui aurait continue. Faux sur le DERNIER round
          // possible (round 3/3 en combat normal, 7/7 en duel) : rien
          // n'y est interrompu, le combat s'y terminait de toute facon.
          if (this._enemyHP <= this.KO_THRESHOLD) {
            ko = true; this._enemyHP = 0; title = 'KO !';
            sub = (this._currentRound >= this._maxRounds)
              ? op.name + ' ne peut plus se défendre'
              : op.name + ' ne peut plus se défendre — combat arrêté';
          }
          else { title = 'Round remporté'; sub = genius ? 'Coup de génie de votre IA' : (gap > 22 ? 'Échange à sens unique' : 'Votre choix a payé'); }
        }
      } else {
        if (Math.random() < myDodge) {
          // Votre robot esquive et contre
          counter = true; won = true;
          // v0.14.0 — seasonC.counters était lu par le trophée « Riposte »
          // (3 contres gagnants dans une saison) mais n'était incrémenté
          // nulle part : le trophée était strictement impossible à
          // obtenir. Même défaut que seasonC.repairs.
          this.seasonCounters().counters++;
          dealt = Math.max(1, Math.round(raw * 0.5 * cm.dmgDealt * myPower * opArmor));
          this._enemyHP = Math.max(0, this._enemyHP - dealt);
          if (this._enemyHP <= this.KO_THRESHOLD) { ko = true; this._enemyHP = 0; title = 'KO !'; sub = 'Le contre met fin au combat'; }
          else { title = 'Contre gagnant'; sub = 'Votre robot esquive et punit sur la riposte'; }
        } else {
          taken = Math.round(raw * cm.dmgTaken * myArmor * opPower);
          this._playerHP = Math.max(0, this._playerHP - taken);
          if (this._playerHP <= this.KO_THRESHOLD) {
            ko = true; this._playerHP = 0; title = 'KO subi';
            sub = (this._currentRound >= this._maxRounds)
              ? 'Votre robot ne peut plus se défendre'
              : 'Votre robot ne peut plus se défendre — combat arrêté';
          }
          else { title = 'Round perdu'; sub = bug ? 'Bug système au pire moment' : (bossAtout ? op.name + ' a utilisé un atout' : (gap > 22 ? 'Vous avez été dominé' : 'L\'adversaire a pris le dessus')); }
        }
      }
      action = this.roundNarration({ won, counter, profile, enemyProfile,
        impact: (dealt || taken), myChassis:c.chassis.id, opChassis:op.chassis.id, opName:op.name });
    }

    // Momentum : l'Intelligence détermine la vitesse d'adaptation
    if (won) this._momentum = 0;
    else this._momentum = Math.min(0.14, this._momentum + this.momentumStep(c.stats));

    // En finale, le joueur doit avoir gagné au moins un round avant le
    // temps mort, sinon la question n'a aucun intérêt.
    if (this._isBoss && !won && this._currentRound === 2 && this._roundWins === 0) {
      won = true; counter = false;
      title = 'Round remporté'; sub = 'Votre robot trouve l\'ouverture au dernier instant';
      dealt = Math.max(1, Math.round(14 * cm.dmgDealt * myPower * opArmor));
      taken = 0;
      this._enemyHP = Math.max(0, this._enemyHP - dealt);
      this._playerHP = Math.min(100, this._playerHP + 0);
      action = 'Votre robot place ' + this.techniqueFor('force', c.chassis.id) + '. ' + this.pickReaction(this.IMPACT_MID);
    }

    if (won) this._roundWins++;
    this._combatLog.push({ round:this._currentRound, won, ko, choice, counter, bug, genius });
    this._lastRound = { won, ko, counter, bug, genius, dealt, taken, title, sub, action, atout: choice === 3 };
    this.showRoundResult();
  },

  showRoundResult() {
    const c = this.state.career, op = this._currentOpponent, lr = this._lastRound;
    const finished = this._playerHP <= 0 || this._enemyHP <= 0 || this._currentRound >= this._maxRounds;
    const cls = lr.won ? 'rr-win' : 'rr-loss';
    const icon = lr.ko ? (lr.won ? '🏆' : '💀') : (lr.counter ? (lr.won ? '↩️' : '💥') : (lr.won ? '✅' : '❌'));

    let h = '<div class="rr-wrap">';
    h += '<div class="rr-round">Round ' + this._currentRound + ' / ' + this._maxRounds + '</div>';
    h += '<div class="rr-verdict ' + cls + '"><div class="rr-icon">' + icon + '</div>';
    h += '<div class="rr-title">' + lr.title + '</div><div class="rr-sub">' + lr.sub + '</div></div>';

    if (lr.bug) h += '<div class="glitch-box"><div class="glitch-text">⚠️ BUG PROTOTYPE — une routine instable s\'est déclenchée en plein mouvement. Efficacité réduite de 45% sur ce round.</div></div>';
    // v0.13 (ajusté) — genius ne signifie que "le bonus de dé s'est
    // déclenché" : il ne garantit pas la victoire du round. Le message
    // ne doit apparaître QUE si le round est gagné, sinon on annonce un
    // coup de génie... sur une défaite.
    if (lr.genius && lr.won) h += '<div class="rr-momentum"><span class="rr-momentum-icon">🔮</span><span class="rr-momentum-text">Coup de génie — votre IA Instinct a trouvé une ouverture que personne n\'avait vue.</span></div>';

    h += '<div class="rr-action"><p>' + lr.action + '</p></div>';

    h += '<div class="rr-dmg-row">';
    h += '<div class="rr-dmg-box"><div class="rr-dmg-label">Dégâts infligés</div>';
    h += '<div class="rr-dmg-val" style="color:' + (lr.dealt > 0 ? 'var(--green)' : 'var(--text-dim)') + '">' + (lr.dealt > 0 ? '-' + lr.dealt + '%' : '—') + '</div>';
    h += '<div class="rr-dmg-sub">' + op.name + '</div></div>';
    h += '<div class="rr-dmg-box"><div class="rr-dmg-label">Dégâts subis</div>';
    h += '<div class="rr-dmg-val" style="color:' + (lr.taken > 0 ? 'var(--pink)' : 'var(--text-dim)') + '">' + (lr.taken > 0 ? '-' + lr.taken + '%' : '—') + '</div>';
    h += '<div class="rr-dmg-sub">' + c.name + '</div></div></div>';

    h += '<div class="rr-bars">';
    h += '<div class="rr-bar-row"><div class="rr-bar-head"><span class="rr-bar-name">' + c.name + '</span>';
    h += '<span class="rr-bar-hp" style="color:var(--cyan)">' + this._playerHP + '%</span></div>';
    h += '<div class="rr-bar-track"><div class="rr-bar-fill" style="width:' + this._playerHP + '%;background:var(--cyan)"></div></div></div>';
    h += '<div class="rr-bar-row"><div class="rr-bar-head"><span class="rr-bar-name">' + op.name + '</span>';
    h += '<span class="rr-bar-hp" style="color:var(--pink)">' + this._enemyHP + '%</span></div>';
    h += '<div class="rr-bar-track"><div class="rr-bar-fill" style="width:' + this._enemyHP + '%;background:var(--pink)"></div></div></div></div>';

    if (this._enemyHP < 100 || this._playerHP < 100) {
      const diff = this._playerHP - this._enemyHP;
      const msg = diff > 20 ? 'Votre robot domine la confrontation physique (+' + diff + ' pts de structure).'
                : diff < -20 ? op.name + ' vous domine physiquement (' + diff + ' pts de structure).'
                : 'Les deux machines sont au coude à coude.';
      h += '<div class="next-hint" style="margin-bottom:10px"><span class="next-hint-icon">⚖️</span><span class="next-hint-text">' + msg + '</span></div>';
    }
    if (!finished && this._momentum > 0) {
      h += '<div class="rr-momentum"><span class="rr-momentum-icon">🧠</span>';
      h += '<span class="rr-momentum-text">Votre IA analyse l\'échange perdu. Elle abordera le round suivant avec <b>+' + Math.round(this._momentum*100) + '%</b> d\'efficacité.</span></div>';
    }

    h += '<div class="season-stats" style="margin-bottom:14px">';
    h += '<div class="season-stat"><div class="season-stat-val val-green">' + this._roundWins + '</div><div class="season-stat-label">Rounds gagnés</div></div>';
    h += '<div class="season-stat"><div class="season-stat-val val-red">' + (this._combatLog.length - this._roundWins) + '</div><div class="season-stat-label">Rounds perdus</div></div>';
    h += '<div class="season-stat"><div class="season-stat-val val-cyan">' + c.atoutsLeft + '</div><div class="season-stat-label">Atouts</div></div></div>';

    // Temps mort après le round 4 de la finale du tournoi
    // v0.16.0 — le temps mort ne pouvait se déclencher qu'EXACTEMENT au
    // round 4. Un KO au round 3 mettait fin au combat avant, et le joueur
    // sautait une des pièces centrales de la finale — constaté en jeu :
    // duel terminé en 3 rounds sur 7, aucune question posée.
    // Il se déclenche désormais au premier round atteint parmi 2, 3 et 4,
    // ce qui le garantit sans toucher à l'équilibre du combat.
    const needTimeout = !finished && this._isBoss && !this._timeoutDone
      && this._currentRound >= 2 && this._currentRound <= 4;
    h += finished
      ? '<button class="btn-primary btn-gradient" onclick="RC.showPostCombat()">Résultat du combat</button>'
      : (needTimeout
        ? '<button class="btn-primary btn-yellow" onclick="RC.showTimeout()">⏸ Votre robot demande un temps mort</button>'
        : '<button class="btn-primary btn-cyan" onclick="RC.startRound()">Round ' + (this._currentRound + 1) + ' →</button>');
    h += '</div>';

    document.getElementById('roundresult-content').innerHTML = h;
    this.goTo('roundresult');
  },

  // v0.13 — §12.1 : systeme d'usure a deux composantes, toujours actives.
  // Remplace l'ancien tirage a 20% independant du resultat, qui pouvait
  // rendre une defaite totalement gratuite en structure.
  //   usure d'attaque : presente a CHAQUE combat, gagne ou perdu
  //   usure d'impact  : presente SEULEMENT en cas de coup recu
  // Barreme verrouille (GDD RÈGLES §12.1) :
  //   victoire simple   attaque 1-2%   impact 0%
  //   victoire par KO    attaque 2-4%   impact 0%   (strictement > victoire simple)
  //   defaite simple    attaque 1-2%   impact 3-5%
  //   defaite par KO     attaque 1-2%   impact 6-9%
  // v0.14.0 — B1 : l'usure était bien trop violente. Ancien barème :
  // victoire 1,5 · victoire KO 3 · défaite 5,5 · défaite KO 9, soit un
  // rapport de 3,7× entre défaite et victoire. Mesuré sur une saison de
  // 20 combats, on perdait 60 points d'état en dominant sa ligue à 70%
  // de victoires, et 94 points à 30% : AUCUN robot ne survivait à une
  // saison et demie sans réparation, quel que soit le niveau de jeu.
  //
  // Conséquences en chaîne : la réparation cessait d'être un choix
  // économique pour devenir une obligation, ce qui vidait le budget et
  // gonflait le lien IA (+3 par réparation).
  //
  // Nouveau barème : amplitude divisée par deux environ, et rapport
  // défaite/victoire ramené à ~2× pour que bien jouer protège vraiment
  // la machine. Une saison à 70% coûte désormais environ 28 points,
  // une saison à 30% environ 48.
  computeUsure(victory, ko) {
    const attack = victory
      ? (ko ? 1.2 + Math.random() * 1.0 : 0.6 + Math.random() * 0.6)
      : (0.6 + Math.random() * 0.6);
    const impact = victory ? 0
      : (ko ? 2.6 + Math.random() * 1.4 : 1.4 + Math.random() * 1.0);
    return { attack, impact, total: attack + impact };
  },

  showPostCombat() {
    const c = this.state.career, op = this._currentOpponent;
    const cm = this.CHASSIS_MOD[c.chassis.id] || this.CHASSIS_MOD.tactical;
    const roundsLost = this._combatLog.length - this._roundWins;

    // v0.10.0 — certaines réponses au temps mort promettent la victoire :
    // la promesse doit être tenue sur l'ISSUE du combat, pas seulement sur
    // les rounds restants. Mené 3-1 avant le temps mort, gagner les trois
    // derniers ne suffisait pas toujours.
    const forced = (this._timeoutFx && this._timeoutFx.win) || null;
    if (forced === 'force' && this._playerHP > 0) { this._enemyHP = 0; }
    else if (forced === 'lose' && this._enemyHP > 0) { this._playerHP = 0; }

    let victory, koDealt = false, koTaken = false, resultSub = '';
    if (this._enemyHP <= 0) { victory = true; koDealt = true; resultSub = 'KO au round ' + this._currentRound; }
    else if (this._playerHP <= 0) { victory = false; koTaken = true; resultSub = 'KO subi au round ' + this._currentRound; }
    else if (this._roundWins > roundsLost) { victory = true; resultSub = 'Victoire aux rounds (' + this._roundWins + '-' + roundsLost + ')'; }
    else if (this._roundWins < roundsLost) { victory = false; resultSub = 'Défaite aux rounds (' + this._roundWins + '-' + roundsLost + ')'; }
    else { victory = this._playerHP >= this._enemyHP; resultSub = victory ? 'Départage aux points de structure' : 'Départage perdu aux points de structure'; }

    // v0.16.0 — F2 : différence de rounds du combat, pour le départage du
    // classement. Ici les rounds sont RÉELLEMENT joués : on prend le score
    // effectif, sauf en cas de KO où le maximum s'applique d'office (un KO
    // au round 1 vaut 3-0, pas 1-0). Le combat final est exclu : il se joue
    // hors ligue et n'entre dans aucun classement.
    if (!this._isBoss) {
      const dominant = victory ? (roundsLost === 0) : (this._roundWins === 0);
      c.seasonRDiff = (c.seasonRDiff || 0)
        + this.roundDiff(victory, koDealt || koTaken, dominant);
    }

    // v0.13 — systeme d'usure a deux composantes (§12.1)
    const usure = this.computeUsure(victory, koDealt);
    let stateDmg = usure.total;
    if (this._atoutFailed) stateDmg += 1.5;   // un atout rate coute un peu plus
    stateDmg = Math.max(1, Math.round(stateDmg * this.wearMod(cm)));
    this._lastUsureAttack = Math.round(usure.attack * this.wearMod(cm) * 10) / 10;
    this._lastUsureImpact = Math.round(usure.impact * this.wearMod(cm) * 10) / 10;
    if (this._isBoss) stateDmg = Math.min(stateDmg, Math.max(0, c.state - 5));

    const li = c.leagueIdx || 0;
    const cleanWin = victory && roundsLost === 0;
    let coresWon = victory
      ? Math.floor((cleanWin ? 800 : 500) + li * (cleanWin ? 840 : 500) + (koDealt ? 400 : 0))
      : Math.floor(150 + li * 70);
    if (this._isBoss) coresWon *= 3;
    if (victory) coresWon = Math.floor(coresWon * (1 + (c.sponsor.fx.bonusPct || 0)));

    let folGain = victory
      ? Math.floor((800 + Math.random()*1500 + (koDealt ? 1000 : 0)) * (1 + li*0.5))
      : -Math.floor((300 + Math.random()*500) * (1 + li*0.3));
    if (this._isRival || this._isBoss) folGain = Math.round(folGain * 2.2);

    // Mémorise le point le plus bas atteint : le robot citera ce chiffre
    // exact lors du temps mort de la finale.
    if (c.state < (c.lowestState || 100)) { c.lowestState = c.state; c.lowestStateSeason = c.season; }
    c.state = Math.max(0, c.state - stateDmg);
    c.cores += coresWon;
    this.trackDebt();
    c.totalEarned = (c.totalEarned || 0) + coresWon;
    this.addFollowers(folGain, victory ? (this._isBoss ? 'Combat final' : 'Victoire narrative') : 'Défaite');
    if (!this._isBoss) { c.narrativeCombat++; c.fightIndex++; }
    c.combatsFought = (c.combatsFought || 0) + 1;
    if (!this._isBoss) {
      this.playMatchday(this._scheduledId, victory);
    }
    if (victory) { c.seasonWins++; c.totalWins++; } else { c.seasonLosses++; c.totalLosses++; }
    if (koDealt) { c.seasonKO++; c.totalKO++; }
    // v0.14.0 — A6 : koTaken etait calcule puis perdu. Il n'alimentait
    // aucun compteur, donc les KO subis n'etaient ni cumules ni
    // affichables nulle part.
    if (koTaken) { c.seasonKOTaken = (c.seasonKOTaken||0) + 1; c.totalKOTaken = (c.totalKOTaken||0) + 1; }
    const sc0 = this.seasonCounters();
    if (c.state < sc0.lowState) sc0.lowState = c.state;
    if (this._isRival) { if (victory) c.h2hWins = (c.h2hWins||0)+1; else c.h2hLosses = (c.h2hLosses||0)+1; }
    this._firedDeferred = this.tickDeferred();
    this.checkTrophies('fight', { victory, cleanWin: victory && this._roundWins === this._maxRounds,
      boss: this._isBoss, startState: this._startState || 100, isRival: this._isRival,
      fightAtouts: this._fightAtouts || 0, lostFirstTwo: this._lostFirstTwo });
    this.addSatis(victory ? 3 * (c.sponsor.fx.demand || 1) : -4 * (c.sponsor.fx.demand || 1));
    this.addAffection(victory ? 1 : -1);

    if (c.challenge === 'noAtout' && victory) {
      c.challenge = null;
      const bonus = Math.floor(2000 * this.leagueFactor());
      c.cores += bonus; c.totalEarned += bonus;
      this.addSatis(12);
      this._challengeBonus = bonus;
    } else if (c.challengeFailed) {
      c.challengeFailed = false; c.challenge = null; this.addSatis(-8);
    }
    if (this._isRival || this._isBoss) {
      if (victory) c.rival.h2hWins++; else c.rival.h2hLosses++;
    }
    this.recalcGen();
    // v0.13 — §17.3 : la destruction est REELLE au combat a mort,
    // contrairement a l'ancien tournoi qui l'excluait ("match d'honneur").
    // La resolution passe par deathmatchDefeat(), pas par cette variable :
    // elle ne sert plus qu'a l'affichage post-combat hors deathmatch.
    const destroyed = c.state <= 0 && !this._isBoss;
    const narr = victory ? this.pick(this.POST_NARRATIONS_WIN) : this.pick(this.POST_NARRATIONS_LOSS);

    let h = '';
    if (this._isDeathmatch) {
      // v0.13 — §17.3 : le bandeau reflete les vrais enjeux du combat a
      // mort. Une victoire mene au choix achever/epargner ; une defaite
      // signifie que le robot du joueur va etre detruit, pas qu'il « est
      // alle jusqu'au bout » comme le disait l'ancien texte de tournoi.
      h += '<div class="boss-banner" style="border-color:rgba(229,56,59,.4)"><div class="boss-kicker" style="color:var(--red)">Combat à mort</div>';
      h += '<div class="boss-title">' + (victory ? 'VICTOIRE' : 'DÉTRUIT') + '</div>';
      h += '<div class="boss-sub">' + (victory ? op.name + ' est à terre. Sans arbitre, personne ne vous dira quoi faire.' : op.name + ' l\'emporte. Rien ne vous en protège.') + '</div></div>';
    } else if (destroyed) {
      h += '<div class="result-banner result-defeat"><div class="result-text">💀 Détruit</div><div class="result-sub">Votre robot n\'a pas survécu au combat</div></div>';
    } else {
      h += '<div class="result-banner ' + (victory ? 'result-victory' : 'result-defeat') + '">';
      h += '<div class="result-text">' + (victory ? 'Victoire' : 'Défaite') + '</div>';
      h += '<div class="result-sub">' + resultSub + '</div></div>';
    }

    h += '<div class="post-stats">';
    h += '<div class="post-row"><span class="post-row-label">Structure finale</span><span class="post-row-val" style="color:var(--cyan)">' + this._playerHP + '% <span style="color:var(--text-dim);font-size:10px">vs ' + this._enemyHP + '%</span></span></div>';
    h += '<div class="post-row"><span class="post-row-label">Rounds</span><span class="post-row-val" style="color:var(--yellow)">' + this._roundWins + ' — ' + roundsLost + '</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Usure</span><span class="post-row-val" style="color:var(--pink)">-' + stateDmg + '%</span></div>';
    h += '<div class="post-row"><span class="post-row-label">État du robot</span><span class="post-row-val" style="color:' + this.stateColor(c.state) + '">' + c.state + '% · ' + this.stateLabel(c.state) + '</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Cores gagnés</span><span class="post-row-val" style="color:var(--green)">+' + coresWon.toLocaleString('fr') + ' ⚡</span></div>';
    h += '<div class="post-row"><span class="post-row-label">Followers</span><span class="post-row-val" style="color:' + (folGain >= 0 ? 'var(--green)' : 'var(--pink)') + '">' + (folGain >= 0 ? '+' : '') + folGain.toLocaleString('fr') + '</span></div>';
    if (this._challengeBonus) {
      h += '<div class="post-row" style="border:1px solid rgba(247,224,24,.25)"><span class="post-row-label">🎯 Défi sponsor réussi</span>';
      h += '<span class="post-row-val" style="color:var(--yellow)">+' + this._challengeBonus.toLocaleString('fr') + ' ⚡</span></div>';
      this._challengeBonus = 0;
    }
    h += '<div class="post-row"><span class="post-row-label">Note SPEC</span><span class="post-row-val" style="color:var(--yellow)">' + c.gen + '</span></div>';
    h += '</div>';

    h += '<div class="narration-box"><p>« ' + narr + ' »</p></div>';

    if (this._isDeathmatch) {
      // v0.13 — §17.3 : victoire -> achever/épargner (les deux donnent
      // le même trophée). Défaite -> le robot du joueur est détruit.
      this.recalcGen();
      h += victory
        ? '<button class="btn-primary btn-red" onclick="RC.showDeathmatchChoice()">…</button>'
        : '<button class="btn-primary btn-red" onclick="RC.deathmatchDefeat()">…</button>';
    } else if (destroyed) {
      h += '<button class="btn-primary btn-red" onclick="RC.endCareer(true)">Game Over</button>';
    } else {
      h += '<button class="btn-primary btn-cyan" onclick="RC.showCareer()">Continuer</button>';
    }

    document.getElementById('postcombat-content').innerHTML = h;
    this.flushTrophies();   // v0.12 — sinon le joueur débloque sans le savoir
    this.saveState();
    this.goTo('postcombat');
  },

  // ============================================================

  });
})(window);
