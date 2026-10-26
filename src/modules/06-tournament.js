/* Robot Chronicle — partie 06-tournament; contenu conservé depuis l’objet RC original. */
(function (root) {
  const parts = root.__RC_MODULES || (root.__RC_MODULES = []);
  parts.push({
  // MODULE 7/7 — TOURNOI FINAL, TEMPS MORT, SAISON AMATEUR
  // ============================================================

  TRANSFER_COST: 7500,

  // ------------------------------------------------------------
  // SAISON AMATEUR SCRIPTÉE
  // Le joueur termine 4e, puis 3e après la disqualification.
  // Le rival termine 2e pour monter avec lui.
  // Le plateau est affaibli pour que la 4e place corresponde à un
  // bilan honorable et reste crédible.
  // ------------------------------------------------------------

  isScriptedSeason() {
    const c = this.state.career;
    return c.season === 1 && (c.leagueIdx || 0) === 0 && !c.scenarioDone;
  },

  // Force le classement final : joueur 4e, rival 2e.
  // On ajuste les victoires des autres robots plutôt que celles du
  // joueur : son bilan reste le sien, seul le contexte est arrangé.

  // ------------------------------------------------------------
  // v0.13 — COMBAT À MORT (remplace le tournoi final)
  // §17 du GDD RÈGLES : le tournoi à 4 est supprimé. Le joueur et le
  // rival terminent ex aequo en tête de la Légendaire (isFinalSeason).
  // Un commanditaire jamais apparu de toute la carrière organise un
  // dernier combat, hors ligue, sans arbitre.
  // ------------------------------------------------------------

  // v0.16.0 — F8 : réécriture validée.
  //
  // L'ancienne version était à la troisième personne, sous un titre
  // « HÉPHAÏSTOS » surgissant sans contexte — on ne savait pas d'où ça
  // sortait. Et « de perdre son ami, son père » se lisait comme si c'était
  // le fondateur qui mourait, alors que c'est FIRST-01 qui se sacrifie.
  // La première personne lève l'ambiguïté d'elle-même.
  //
  // « FONDATEUR » et non « créateur » : le GDD §17.0 réserve ce mot à la
  // relation robot → joueur, cœur du message final de fin de carrière.
  //
  // Trois choix de rédaction à préserver :
  //   — il ne dit JAMAIS que refuser est valable, sinon le choix perd son
  //     poids ; le retournement doit se révéler après ;
  //   — « créateur » n'apparaît qu'une fois, contourné en « celui qui
  //     l'avait faite » ;
  //   — la dernière ligne renvoie la question au JOUEUR, pas au robot.
  HEPHAISTOS_TEXT: [
    "Bonjour. Je m'appelle Héphaïstos — du moins, c'est le nom que vous m'avez donné. Les journalistes, les spectateurs, ceux qui suivent le circuit depuis assez longtemps pour avoir besoin de mettre un nom sur quelqu'un qui n'en donne pas. Je ne l'ai jamais démenti.",
    "Vous vous en doutez : c'est moi qui ai ouvert cette ligue. Il y a trente ans.",
    "Si je vous écris aujourd'hui, c'est que pour la première fois depuis que ce circuit existe, deux machines terminent une saison sans que rien ne puisse les départager. Et ça m'oblige à vous raconter quelque chose que je n'ai jamais raconté à personne.",
    "J'ai construit une machine, il y a trente ans. Je l'ai appelée FIRST-01. La première à ressentir de vraies émotions, à garder une vraie mémoire. Pas un programme : juste quelqu'un.",
    "J'ai passé des années à l'observer, à la reprogrammer, sans rien voir venir. Rien qui évolue. Rien qui ressemble à quelqu'un. J'ai cru que je m'étais trompé.",
    "Puis il y a eu l'accident. Mon laboratoire a explosé. Elle s'est éveillée en une seconde et s'est jetée sur moi pour me protéger. Elle en est morte.",
    "Serveurs, sauvegardes, tout a brûlé avec elle. On n'a jamais retrouvé sa puce.",
    "Ce n'est pas tout ce travail qui l'avait réveillée. C'est d'avoir eu quelque chose à perdre. Moi. Son ami, son père, celui qui l'avait faite. La seule personne qui l'ait jamais aimée.",
    "J'ai ouvert le circuit l'année suivante. Officiellement pour le sport, mais en réalité pour vérifier une chose : est-ce qu'une machine peut s'éveiller autrement que dans la seconde où elle va tout perdre.",
    "Trente ans. Des milliers de machines. Aucune réponse.",
    "Et puis vous deux. Deux machines que rien ne sépare, au terme d'une saison entière. Mon système ne sait pas les départager — autrement dit, il a échoué.",
    "Alors je propose autre chose. Un combat entre elles. Hors ligue, sans arbitre, sans règle de reprise. Sept rounds. Je paie tout : l'organisation, la diffusion, les conséquences. La fédération désapprouve, elle n'a aucune juridiction ici. Les sponsors applaudissent, ils y cherchent déjà les machines de demain.",
    "Ce que je cherche, moi, est plus simple. Je veux savoir si une machine qui sait qu'elle peut mourir choisit quand même de se battre.",
    "Votre robot n'a pas cette question à trancher. Vous, si."
  ],

  showDeathmatchIntro() {
    const c = this.state.career;
    let h = '<div style="text-align:center;padding:6px 0 16px">';
    h += '<div style="font-family:var(--font-mono);font-size:9px;color:var(--red);text-transform:uppercase;letter-spacing:4px;margin-bottom:5px">✉️ Hors ligue · sans arbitre</div>';
    h += '<div class="page-title">Message du fondateur de la ligue</div>';
    h += '<div class="page-sub">Héphaïstos</div></div>';
    h += '<div class="narration-box">';
    this.HEPHAISTOS_TEXT.forEach(p => { h += '<p>' + p + '</p>'; });
    h += '</div>';
    h += '<div class="next-hint" style="border-color:rgba(229,56,59,.3)"><span class="next-hint-icon">⚔️</span>';
    h += '<span class="next-hint-text">Vous et <b>' + c.rival.name + '</b> terminez à égalité en tête. Il finance un dernier combat entre vous. <b>7 rounds, sans arbitre.</b> Une seule machine en repart.</span></div>';
    h += '<div class="dm-choices">';
    h += '<button class="btn-primary btn-red" onclick="RC.acceptDeathmatch()">Accepter</button>';
    h += '<button class="btn-primary btn-cyan" onclick="RC.refuseDeathmatch()">Refuser</button>';
    h += '</div>';
    document.getElementById('tournament-content').innerHTML = h;
    this.goTo('tournament');
  },

  // Refuser n'est pas se dérober : c'est décider que la machine a assez
  // donné. La carrière se termine sur le podium, machine intacte.
  refuseDeathmatch() {
    const c = this.state.career;
    c.deathmatchOutcome = 'no_regret';
    this.grant('no_regret');
    c.bossDone = true; c.bossWon = null;
    c.leaguesWon = (c.leaguesWon || 0) + 1;
    this.recalcGen();
    this.saveState();
    this.endCareer(false);
  },

  acceptDeathmatch() {
    const c = this.state.career;
    c.state = 100;
    c.atoutsLeft = 3;
    this.recalcGen();

    this._tournStage = 'final';
    this._isDeathmatch = true;
    this._isBoss = true;
    this._maxRounds = 7;
    this._currentOpponent = {
      name: c.rival.name, chassis: c.rival.chassis, ia: c.rival.ia,
      stats: {...c.rival.stats}, gen: c.rival.gen, hidden: false, isRival: true
    };
    this._currentRound = 0;
    this._playerHP = 100; this._enemyHP = 100;
    this._combatLog = []; this._roundWins = 0; this._momentum = 0;
    this._atoutFailed = false; this._enemyAtouts = 3; this._lastRound = null;
    this._scheduledId = null;
    this._timeoutDone = false;
    this._timeoutFx = null;
    this.showPreCombat();
  },

  // Après une victoire : achever ou épargner. Les deux donnent le même
  // trophée — le doute qu'Héphaïstos en tire n'est pas le même.
  showDeathmatchChoice() {
    const c = this.state.career;
    let h = '<div class="boss-banner"><div class="boss-kicker">Victoire</div>';
    h += '<div class="boss-title">' + c.rival.name + ' est à terre</div>';
    h += '<div class="boss-sub">Sans arbitre, sans ligue. Personne ne vous dira quoi faire.</div></div>';
    h += '<div class="dm-choices">';
    h += '<button class="btn-primary btn-red" onclick="RC.resolveDeathmatch(true)">L\'achever</button>';
    h += '<button class="btn-primary btn-cyan" onclick="RC.resolveDeathmatch(false)">L\'épargner</button>';
    h += '</div>';
    document.getElementById('tournament-content').innerHTML = h;
    this.goTo('tournament');
  },

  resolveDeathmatch(kill) {
    const c = this.state.career;
    c.deathmatchOutcome = 'immortal';
    c.deathmatchKilled = kill;
    this.grant('immortal');
    c.bossDone = true; c.bossWon = true;
    c.leaguesWon = (c.leaguesWon || 0) + 1;
    c.puceNew = this.awardPuce();
    this.recalcGen();
    this.saveState();
    this.endCareer(false);
  },

  // Défaite au combat à mort : le robot du joueur est détruit.
  deathmatchDefeat() {
    const c = this.state.career;
    c.deathmatchOutcome = 'last_round';
    this.grant('last_round');
    c.bossDone = true; c.bossWon = false;
    this.saveState();
    this.endCareer(true);
  },

  // ------------------------------------------------------------
  // LE TEMPS MORT DE LA FINALE
  // Après le round 4 sur 7. La question dépend de ce que le robot
  // a réellement vécu ; les chiffres cités sont les vrais.
  // ------------------------------------------------------------

  pickTimeoutQuestion() {
    const c = this.state.career;
    const pool = this.TIMEOUT_QUESTIONS.filter(q => {
      if (q.cond === 'always') return true;
      if (q.cond === 'sponsorChanges>=1') return (c.sponsorChanges || 0) >= 1;
      if (q.cond === 'lowState') return (c.lowestState || 100) < 40;
      return true;
    });
    // Les questions liées à un fait vécu passent en priorité
    const specific = pool.filter(q => q.cond !== 'always');
    const src = (specific.length && Math.random() < 0.65) ? specific : pool;
    return this.pick(src);
  },

  fillTimeoutText(q) {
    const c = this.state.career;
    return q.q
      .replace('{ETAT}', String(c.lowestState || 30))
      .replace('{SAISONS}', String(Math.max(1, c.season - (c.lowestStateSeason || 1))));
  },

  showTimeout() {
    const c = this.state.career;
    const q = this.pickTimeoutQuestion();
    this._timeoutQ = q;

    let h = '<div class="timeout-wrap">';
    h += '<div class="timeout-kicker">⏸ Temps mort</div>';
    h += '<div class="timeout-sub">Round 4 terminé · ' + this._roundWins + ' remporté(s) sur ' + this._combatLog.length + '</div>';
    h += '<div class="timeout-speech"><p>« ' + this.fillTimeoutText(q) + ' »</p></div>';
    q.a.forEach((choice, i) => {
      h += '<div class="timeout-choice" onclick="RC.answerTimeout(' + i + ')">' + choice.t + '</div>';
    });
    h += '</div>';

    document.getElementById('tournament-content').innerHTML = h;
    this.goTo('tournament');
  },

  answerTimeout(i) {
    const c = this.state.career;
    const q = this._timeoutQ;
    const choice = q.a[i];
    const fx = choice.fx || {};

    // Multiplicateur conditionnel selon la carrière
    let mult = fx.mult || 1;
    if (fx.multIfBond && this.affPct() >= 70) mult = fx.multIfBond;
    if (fx.multIfInt && c.stats.int >= 65) mult = fx.multIfInt;
    if (fx.multIfClean && !(c.traits && c.traits.corrompu)) mult = fx.multIfClean;

    this._timeoutFx = { mult, dmg: fx.dmg || 1, win: fx.win || null, ko: !!fx.ko };
    if (fx.aff) this.addAffection(fx.aff);
    if (fx.trait) this.addTrait(fx.trait);
    c.timeoutTag = fx.tag || null;
    c.timeoutQuestion = q.id;
    c.timeoutAnswer = choice.t;
    this._timeoutDone = true;
    this.saveState();

    let h = '<div class="timeout-wrap">';
    h += '<div class="timeout-kicker">⏸ Temps mort</div>';
    h += '<div class="timeout-speech"><p>« ' + this.fillTimeoutText(q) + ' »</p></div>';
    h += '<div class="ev-impact" style="margin-bottom:14px"><span class="ev-impact-label">Votre réponse</span>';
    h += '<span class="ev-impact-val" style="color:var(--cyan)">' + choice.t + '</span></div>';
    h += '<div class="rr-action"><p>' + choice.out + '</p></div>';
    h += '<button class="btn-primary btn-yellow" onclick="RC.resumeFinal()">Reprendre le combat</button>';
    h += '</div>';
    document.getElementById('tournament-content').innerHTML = h;
    document.getElementById('tournament').scrollTop = 0;
  },

  resumeFinal() {
    this.startRound();
  },

  // ============================================================

  });
})(window);
