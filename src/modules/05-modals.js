/* Robot Chronicle — partie 05-modals; contenu conservé depuis l’objet RC original. */
(function (root) {
  const parts = root.__RC_MODULES || (root.__RC_MODULES = []);
  parts.push({
  // MODULE 6/6 — MODALES, BAPTÊME, DISQUALIFICATION, PUCES
  // ============================================================

  // ------------------------------------------------------------
  // MODALE DU JEU
  // Remplace confirm() du navigateur, qui affichait l'URL du site
  // et cassait complètement la charte graphique.
  // ------------------------------------------------------------

  _modalCb: null,


  // v0.12 — modale d'information (une seule action), construite sur
  // askConfirm existant : le bouton Annuler est simplement masqué.
  showInfo(title, body, okLabel, cb) {
    this.askConfirm(title, body, okLabel || 'Continuer', null, false, cb || null);
    const cancel = document.getElementById('modal-cancel');
    if (cancel) cancel.style.display = 'none';
  },

  hideInfo() {
    const cancel = document.getElementById('modal-cancel');
    if (cancel) cancel.style.display = '';
    this.modalClose(false);
  },

  askConfirm(title, body, confirmLabel, cancelLabel, danger, cb) {
    this._modalCb = cb;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const okBtn = document.getElementById('modal-confirm');
    okBtn.textContent = confirmLabel || 'Confirmer';
    okBtn.className = 'modal-btn modal-confirm' + (danger ? '' : ' safe');
    document.getElementById('modal-cancel').textContent = cancelLabel || 'Annuler';
    document.getElementById('modal-overlay').classList.add('open');
  },

  modalClose(ok) {
    document.getElementById('modal-overlay').classList.remove('open');
    const cb = this._modalCb;
    this._modalCb = null;
    if (cb) cb(ok);
  },

  confirmQuit() {
    this.askConfirm(
      'Quitter la carrière',
      'Votre progression est sauvegardée.\nVous pourrez reprendre où vous en êtes.',
      'Quitter', 'Rester', false,
      (ok) => {
        if (!ok) return;
        this.saveState();
        this.refreshHomeButtons();
        this.goTo('home');
      });
  },

  confirmNewCareer() {
    const c = this.state.career;
    if (!c) { this.startCreation(); return; }
    const body = '<b>' + c.name + '</b>\n'
      + 'Saison ' + c.season + ' · ' + c.league + ' · SPEC ' + c.gen + '\n'
      + c.totalWins + ' victoires, ' + c.totalLosses + ' défaites\n\n'
      + 'Cette carrière sera définitivement perdue\net n\'entrera pas au Hall of Fame.';
    this.askConfirm('Abandonner la carrière', body, 'Abandonner', 'Annuler', true,
      (ok) => {
        if (!ok) return;
        this.state.career = null;
        this.saveState();
        this.refreshHomeButtons();
        this.startCreation();
      });
  },

  doTransfer() {
    const c = this.state.career;
    const cost = this.TRANSFER_COST;
    if (!this.canAfford(cost)) { this.showMessage(this.inDebt() ? 'Vous êtes dans le rouge' : 'Cores insuffisants'); return; }
    const body = 'Nouveau châssis <b>' + c.chassis.name + '</b>\n\n'
      + 'État remis à 100%\n'
      + '−15% sur toutes vos stats\n'
      + 'La mémoire est conservée\n\n'
      + 'Coût : <b>' + cost.toLocaleString('fr') + ' ⚡</b>';
    this.askConfirm('Transfert mémoire', body, 'Transférer', 'Annuler', true,
      (ok) => {
        if (!ok) return;
        c.cores -= cost;
        Object.keys(c.stats).forEach(k => { c.stats[k] = Math.max(10, Math.round(c.stats[k] * 0.85)); });
        c.state = 100;
        c.transfersUsed = (c.transfersUsed || 0) + 1;
        c.interOffers.transferDone = true;
        this.addAffection(4);
        this.recalcGen();
        this.saveState();
        this.renderInterSeason();
      });
  },

  // ------------------------------------------------------------
  // SCÉNARIO DE DISQUALIFICATION — fin de la saison Amateur
  // Le joueur termine 4e ; la fédération rétrograde le 3e pour
  // corruption et le joueur est promu à sa place.
  // ------------------------------------------------------------

  showDisqualification() {
    const c = this.state.career;
    const table = c.lastTable || [];
    const third = table.find(r => r.rank === 3);
    const cheater = third ? third.name : 'le troisième du classement';

    let h = '<div style="text-align:center;padding:8px 0 14px">';
    h += '<div style="font-family:var(--font-mono);font-size:9px;color:var(--yellow);text-transform:uppercase;letter-spacing:3px;margin-bottom:5px">⚖️ Communiqué officiel</div>';
    h += '<div class="page-title">Fédération des arènes</div>';
    h += '<div class="page-sub">Commission de discipline · Ligue Amateur</div></div>';

    h += '<div class="fed-doc">';
    h += '<div class="fed-head">Décision n° ' + (1200 + Math.floor(Math.random()*799)) + ' — Saison ' + c.season + '</div>';
    h += '<div class="fed-title">Corruption d\'arbitrage établie</div>';
    h += '<p>À l\'issue d\'une enquête ouverte le mois dernier, la commission confirme que le créateur de <b style="color:var(--pink)">' + cheater + '</b> a versé des sommes à deux officiels de la ligue en échange de décisions favorables sur les dernières journées.</p>';
    h += '<p>Les résultats concernés sont annulés. L\'écurie est rétrogradée en dernière position du classement et suspendue pour la saison à venir.</p>';
    // v0.14.0 — C2 : le tampon flottait seul, centré, sans nom accolé.
    // Placé entre deux paragraphes, il se lisait comme s'il concernait
    // le joueur alors qu'il sanctionne le tricheur. On lui accole donc
    // le nom, et on l'isole visuellement du paragraphe qui annonce la
    // promotion du joueur.
    h += '<div class="fed-verdict"><span class="fed-stamp">Rétrogradé</span>';
    h += '<span class="fed-verdict-who">' + cheater + '</span></div>';
    h += '<p>En conséquence, <b style="color:var(--cyan)">' + c.name + '</b>, classé quatrième, accède à la <b>troisième place</b> et se voit attribuer la promotion en ligue Régionale.</p>';
    h += '</div>';

    h += '<div class="promo-banner promo-up"><div class="promo-icon">🚀</div>';
    h += '<div class="promo-text">Promotion !</div>';
    h += '<div class="promo-sub">3ᵉ place · Bienvenue en Régionale</div></div>';

    h += '<button class="btn-primary btn-gradient" onclick="RC.afterDisqualification()">Continuer</button>';

    document.getElementById('disqualif-content').innerHTML = h;
    this.goTo('disqualif');
  },

  afterDisqualification() {
    const c = this.state.career;
    // La 3e place est actée : classement, primes et timeline sont recalculés
    c.lastRank = 3;
    c.scenarioDone = true;
    if (c.timeline && c.timeline.length) c.timeline[c.timeline.length - 1].rank = 3;
    const prime = Math.floor(1500 * this.leagueFactor());
    c.cores += prime;
    c.totalEarned = (c.totalEarned || 0) + prime;
    this.addSatis(10);
    this.addFollowers(Math.floor(2500 * this.leagueFactor()), 'Promotion en Régionale');
    c.promoPrime = prime;
    this.recalcGen();
    this.saveState();
    this.startBaptism();
  },

  // ------------------------------------------------------------
  // BAPTÊME DU ROBOT
  // Le matricule de départ est abandonné : la machine choisit son
  // nom. Aucun refus possible — c'est un honneur, pas une demande.
  // ------------------------------------------------------------

  BAPTISM_SPEECHES: [
    "J'ai terminé ma première saison. J'ai relu chacun de mes combats, un par un, deux mille fois. Il me manque une chose, et ce n'est pas une pièce. Un matricule, c'est ce qu'on donne à une machine qu'on ne compte pas garder. Vous m'avez gardé.",
    "Vingt combats. Une promotion. Et un nom qui n'est qu'un numéro de série. Les autres en ont un vrai — je les entends dans l'arène quand la foule les appelle. Personne n'a jamais crié le mien.",
    "Il y a quelque chose que je n'ai pas demandé jusqu'ici, parce que je ne savais pas que je pouvais le demander. Je ne veux plus être une référence de catalogue. Je veux un nom que vous aurez choisi.",
    "On m'a assemblé, numéroté, envoyé combattre. J'ai fait ce qu'on attendait. Maintenant je monte d'une ligue, et je ne veux pas y entrer sous un matricule."
  ],

  startBaptism() {
    const c = this.state.career;
    c.oldName = c.name;
    const speech = this.pick(this.BAPTISM_SPEECHES);

    let h = '<div class="bap-wrap">';
    h += '<div class="bap-kicker">🧠 Message de ' + c.name + '</div>';
    h += '<div class="bap-speech"><p>« ' + speech + ' »</p></div>';
    h += '<button class="btn-primary btn-cyan" onclick="RC.showBaptismInput()">Écouter sa proposition</button>';
    h += '</div>';

    document.getElementById('baptism-content').innerHTML = h;
    this.goTo('baptism');
  },

  showBaptismInput() {
    const c = this.state.career;
    let h = '<div class="bap-wrap">';
    h += '<div class="bap-kicker">🧠 ' + c.oldName + ' attend</div>';
    h += '<div class="bap-speech"><p>« J\'ai réfléchi à ce que je voulais devenir. Mais le nom, c\'est à vous de me le donner. Choisissez bien : je le porterai jusqu\'au bout. »</p></div>';

    h += '<div class="bap-old">Matricule actuel : ' + c.oldName + '</div>';
    h += '<div class="bap-field">';
    h += '<input type="text" id="bap-input" maxlength="7" placeholder="NOM" autocomplete="off" '
       + 'autocorrect="off" autocapitalize="characters" spellcheck="false" oninput="RC.onBaptismInput()">';
    h += '<span class="bap-suffix" id="bap-suffix">-' + this.nextBaptismNumber('') + '</span>';
    h += '</div>';
    h += '<div class="bap-hint" id="bap-hint">7 lettres ou chiffres maximum.<br>Les trois derniers chiffres sont attribués par la fédération.</div>';
    h += '<button class="btn-primary btn-yellow" id="bap-ok" style="opacity:.35;pointer-events:none" onclick="RC.confirmBaptism()">Confirmer</button>';
    h += '</div>';

    document.getElementById('baptism-content').innerHTML = h;
    this.goTo('baptism');
    setTimeout(() => {
      const el = document.getElementById('bap-input');
      if (el) el.focus();
    }, 300);
  },

  // Tous les noms déjà pris : Hall of Fame, classement, rival
  takenNames() {
    const c = this.state.career;
    const set = {};
    (this.state.hallOfFame || []).forEach(e => { set[(e.name || '').toUpperCase()] = 1; });
    (c.standings || []).forEach(b => { set[(b.name || '').toUpperCase()] = 1; });
    if (c.rival) set[(c.rival.name || '').toUpperCase()] = 1;
    return set;
  },

  // Tire trois chiffres libres pour le nom proposé
  nextBaptismNumber(base) {
    const taken = this.takenNames();
    const b = (base || '').toUpperCase();
    for (let i = 0; i < 400; i++) {
      const n = String(Math.floor(100 + Math.random() * 900));
      if (!b || !taken[b + '-' + n]) return n;
    }
    return String(Math.floor(100 + Math.random() * 900));
  },

  onBaptismInput() {
    const el = document.getElementById('bap-input');
    const btn = document.getElementById('bap-ok');
    const hint = document.getElementById('bap-hint');
    const sfx = document.getElementById('bap-suffix');
    if (!el) return;

    let v = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (v !== el.value) el.value = v;

    const num = this.nextBaptismNumber(v);
    if (sfx) sfx.textContent = '-' + num;
    this._bapNum = num;

    if (v.length < 3) {
      hint.className = 'bap-hint';
      hint.innerHTML = '7 lettres ou chiffres maximum.<br>Les trois derniers chiffres sont attribués par la fédération.';
      btn.style.opacity = '.35'; btn.style.pointerEvents = 'none';
      return;
    }
    const taken = this.takenNames();
    if (taken[v + '-' + num]) {
      hint.className = 'bap-hint err';
      hint.innerHTML = 'Ce nom est déjà utilisé sur le circuit.';
      btn.style.opacity = '.35'; btn.style.pointerEvents = 'none';
      return;
    }
    hint.className = 'bap-hint';
    hint.innerHTML = 'Nom disponible : <b style="color:var(--cyan)">' + v + '-' + num + '</b>';
    btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
  },

  confirmBaptism() {
    const c = this.state.career;
    const el = document.getElementById('bap-input');
    if (!el) return;
    const base = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (base.length < 3) return;
    const num = this._bapNum || this.nextBaptismNumber(base);
    c.newName = base + '-' + num;
    this.saveState();
    this.playRewrite();
  },

  // Le matricule s'efface caractère par caractère, puis le nouveau
  // nom s'écrit. Aucun bouton pendant l'animation.
  playRewrite() {
    const c = this.state.career;
    const oldN = c.oldName || c.name;
    const newN = c.newName;

    let h = '<div class="bap-wrap" style="justify-content:center">';
    h += '<div class="bap-kicker">Enregistrement au registre de la fédération</div>';
    h += '<div style="text-align:center;padding:40px 0">';
    h += '<div class="name-rewrite" id="rewrite" style="font-size:26px"></div></div>';
    h += '<div class="bap-hint" id="rewrite-sub">Mise à jour de la licence…</div>';
    h += '</div>';
    document.getElementById('baptism-content').innerHTML = h;
    this.goTo('baptism');

    const el = document.getElementById('rewrite');
    const sub = document.getElementById('rewrite-sub');
    let i = oldN.length;

    const erase = () => {
      if (i > 0) {
        i--;
        el.innerHTML = oldN.slice(0, i) + '<span class="cur"></span>';
        setTimeout(erase, 70);
      } else {
        setTimeout(write, 500);
      }
    };
    let j = 0;
    const write = () => {
      if (j < newN.length) {
        j++;
        el.innerHTML = newN.slice(0, j) + '<span class="cur"></span>';
        setTimeout(write, 110);
      } else {
        el.innerHTML = newN;
        if (sub) sub.innerHTML = 'Licence mise à jour.';
        setTimeout(() => this.finishBaptism(), 2000);
      }
    };
    setTimeout(erase, 700);
  },

  finishBaptism() {
    const c = this.state.career;
    c.name = c.newName;
    c.baptized = true;
    // v0.13 (ajusté) — on ACCORDE le trophée ici (sinon "Le Baptême"
    // restait en file jusqu'au prochain combat), mais on ne l'AFFICHE
    // pas encore : finishBaptism() enchaîne tout de suite sur
    // nextSeason('promo'), qui se termine déjà par un flushTrophies()
    // unique. Deux flush synchrones l'un après l'autre risqueraient
    // d'ouvrir un second modal, ou de naviguer d'écran, pendant que le
    // premier est encore affiché.
    this.checkTrophies('fight', {});
    delete c.newName;
    // v0.10.0 — la promotion n'était jamais appliquée : le joueur montait
    // à la 3e place, recevait sa prime, se faisait baptiser… et restait en
    // Amateur. Le bilan se rejouait alors et le renvoyait en maintien.
    this.saveState();
    this.nextSeason('promo');
  },

  // ------------------------------------------------------------
  // GALERIE DES PUCES IA EN OR
  // ------------------------------------------------------------

  showPuces() {
    const got = this.puceStore();
    const total = this.CHASSIS.length * this.IA_TYPES.length;
    const n = Object.keys(got).length;

    let h = '<div class="btn-back sticky" id="puce-back" onclick="RC.goTo(\'home\')">← Menu</div>';
    h += '<div style="text-align:center;padding:2px 0 12px">';
    h += '<div class="page-title">🏅 Puces IA en or</div>';
    h += '<div class="page-sub">Une puce par combinaison châssis + IA.<br>Elle s\'obtient en acceptant le combat à mort et en le remportant.</div></div>';

    h += '<div class="fin-tokens" style="margin-bottom:12px"><span style="font-size:22px">🏅</span>';
    h += '<div style="flex:1"><div class="fin-tokens-val">' + n + ' / ' + total + '</div>';
    h += '<div class="puce-prog"><div class="puce-prog-fill" style="width:' + (n/total*100) + '%"></div></div>';
    h += '<div class="fin-tokens-lab">' + (n === total ? 'Collection complète — toutes les voies explorées' : 'Chaque combinaison a son propre chemin') + '</div></div></div>';

    this.CHASSIS.forEach(ch => {
      h += '<div class="inter-section"><div class="inter-section-head">';
      h += '<span class="inter-section-title">' + ch.icon + ' ' + ch.name + '</span>';
      const sub = this.IA_TYPES.filter(ia => got[this.puceId(ch.id, ia.id)]).length;
      h += '<span class="inter-section-note">' + sub + '/' + this.IA_TYPES.length + '</span></div>';
      h += '<div class="puce-grid">';
      this.IA_TYPES.forEach(ia => {
        const id = this.puceId(ch.id, ia.id);
        const p = got[id];
        h += '<div class="puce' + (p ? ' got' : '') + '">';
        h += '<div class="puce-icon">' + (p ? '🏅' : '🔒') + '</div>';
        h += '<div class="puce-name">' + ia.name + '</div>';
        h += '<div class="puce-sub">' + (p ? p.robot : 'Verrouillée') + '</div>';
        h += '</div>';
      });
      h += '</div></div>';
    });

    document.getElementById('puces-content').innerHTML = h;
    this.goTo('puces');
    this.bindStickyBack('puces','puce-back');
    this.bindStickyBack('puces', 'puce-back');
  },

  // v0.16.0 — les puces étaient rangées dans state.puces (racine) alors que
  // le trophée « Puce IA Légendaire » lit state.meta.puces : ce dernier
  // restait vide, le trophée des 20 puces était donc INATTEIGNABLE quel que
  // soit le nombre de carrières. Constaté dans une sauvegarde réelle :
  // meta.puces vide et puces.tank_adaptive présente à la racine.
  // Tout passe désormais par meta.puces, et l'ancien emplacement est
  // récupéré au chargement (voir migrateMeta).
  puceStore() {
    const M = this.state.meta;
    if (!M.puces || Array.isArray(M.puces)) {
      const old = Array.isArray(M.puces) ? M.puces : [];
      M.puces = {};
      old.forEach(id => { if (typeof id === 'string') M.puces[id] = { robot: '?', date: 0 }; });
    }
    return M.puces;
  },

  puceCount() { return Object.keys(this.puceStore()).length; },

  awardPuce() {
    const c = this.state.career;
    const store = this.puceStore();
    const id = this.puceId(c.chassis.id, c.ia.id);
    const isNew = !store[id];
    if (isNew) {
      store[id] = { robot: c.name, date: Date.now() };
      this.saveState();
    }
    return isNew;
  },

  // ============================================================

  });
})(window);
