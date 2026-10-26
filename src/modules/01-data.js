/* Robot Chronicle — partie 01-data; contenu conservé depuis l’objet RC original. */
(function (root) {
  const parts = root.__RC_MODULES || (root.__RC_MODULES = []);
  parts.push({
  VERSION: '0.16.1',
  START_CORES: 15000,

  // ============================================================
  // CHÂSSIS
  // v0.7.0 — stats revues pour que les deux profils de chaque châssis
  // soient nettement séparés. Auparavant le Striker n'avait que 1,0 point
  // d'écart entre force et technique : les deux choix se valaient, donc
  // bien jouer n'apportait rien (45-47% de victoires quel que soit le joueur).
  // Écarts obtenus : Tank 11,5 · Striker 5,5 · Tactical 7,0 · Ghost 15,3
  // ============================================================

  CHASSIS: [
    { id:'tank', price:7000, icon:'🛡️', name:'Tank',
      desc:'Lourd, résistant, lent. Encaisse tout mais manque d\'agilité.',
      stats:{pui:55,vit:30,res:75,int:40} },
    { id:'striker', price:8000, icon:'⚡', name:'Striker',
      desc:'Rapide, puissant, fragile. Frappes dévastatrices mais prend cher.',
      stats:{pui:80,vit:55,res:30,int:35} },
    { id:'tactical', price:6000, icon:'🎯', name:'Tactical',
      desc:'Équilibré, intelligent. S\'adapte à l\'adversaire.',
      stats:{pui:40,vit:50,res:40,int:70} },
    { id:'ghost', price:9000, icon:'👻', name:'Ghost',
      desc:'Ultra rapide, esquive, fragilité structurelle. Tout sur le contre.',
      stats:{pui:40,vit:80,res:20,int:60} }
  ],

  // Modificateurs de châssis. L'esquive débouche sur un contre qui
  // remporte le round : les taux sont donc volontairement modérés.
  CHASSIS_MOD: {
    tank:     { score:1.02, dmgTaken:0.75, dmgDealt:0.95, dodge:0.05 },
    striker:  { score:1.02, dmgTaken:1.20, dmgDealt:1.30, dodge:0.04 },
    tactical: { score:1.04, dmgTaken:1.00, dmgDealt:1.00, dodge:0.07 },
    ghost:    { score:0.92, dmgTaken:1.12, dmgDealt:1.05, dodge:0.12 }
  },

  // ============================================================
  // TYPES D'IA — chacun a un effet mécanique réel
  // ============================================================

  IA_TYPES: [
    { id:'obedient', price:2500, icon:'🤖', name:'Obedient',
      desc:'Docile, suit les ordres. Fiable mais ne surprend jamais.', risk:'low',
      effect:'Résultats réguliers : la part d\'aléatoire est fortement réduite.',
      fx:{ variance:0.62, scoreBonus:0.02, learn:0, bugChance:0, geniusChance:0, wear:1.00, startBonus:0 } },
    { id:'adaptive', price:4500, icon:'🧬', name:'Adaptive',
      desc:'Apprend de chaque combat. Progresse vite, comportements imprévus.', risk:'med',
      effect:'Apprentissage : gagne en efficacité à chaque combat disputé (jusqu\'à +8%).',
      fx:{ variance:1.00, scoreBonus:0, learn:0.0018, bugChance:0, geniusChance:0.02, wear:1.00, startBonus:0 } },
    { id:'instinct', price:3000, icon:'🔮', name:'Instinct',
      desc:'Intuition brute. Imprévisible : génie ou absurdité.', risk:'med-high',
      effect:'Très forte variance, et 10% de chance de coup de génie par round.',
      fx:{ variance:1.65, scoreBonus:0, learn:0, bugChance:0.02, geniusChance:0.10, wear:1.00, startBonus:0 } },
    { id:'prototype', price:3500, icon:'⚠️', name:'Prototype',
      desc:'Expérimentale, instable. Progression énorme, bugs aléatoires.', risk:'high',
      effect:'+3 points de stat offerts chaque saison, mais 5% de bug par round.',
      fx:{ variance:1.15, scoreBonus:0, learn:0, bugChance:0.05, geniusChance:0.03, wear:1.06, startBonus:0, seasonStat:3 } },
    { id:'legacy', price:4000, icon:'👑', name:'Legacy',
      desc:'IA d\'un ancien robot légendaire. Elle sait déjà tout ce que les autres doivent apprendre — et exige de la mécanique ce qu\'un débutant n\'oserait jamais demander.', risk:'special',
      effect:'+3 sur toutes les stats au départ, mais le châssis s\'use 30% plus vite.',
      fx:{ variance:0.90, scoreBonus:0, learn:0, bugChance:0, geniusChance:0.02, wear:1.30, startBonus:3 } }
  ],

  // ============================================================
  // SPONSORS
  // ============================================================

  // v0.13 — §3.3 : la dotation finance SEULE le châssis et l'IA. Les
  // quatre sponsors versent ENSUITE le même apport (2 000 ⚡) — il n'est
  // plus un critère de choix mécanique, seulement ce que chacun vit
  // ensuite en carrière qui les différencie.
  SPONSORS: [
    { id:'indie', icon:'🔧', name:'Garage indépendant',
      desc:'Aucune pression, aucun compte à rendre. Vous gardez 100% des gains, seul.',
      cls:'sponsor-indie', tags:['100% gains','0 pression'],
      fx:{ startCores:2000, bonusPct:0, repairPct:0, canDrop:false, demand:0, risk:false } },
    { id:'corp', icon:'🏢', name:'Corp moyenne',
      desc:'Budget correct, réparations couvertes à moitié. Performances exigées.',
      cls:'sponsor-corp', tags:['Prime 5%','Répa. -50%','Pression ⚡⚡'],
      fx:{ startCores:2000, bonusPct:0.05, repairPct:0.50, canDrop:true, demand:1.0, risk:false } },
    { id:'mega', icon:'🏗️', name:'Méga-corp',
      desc:'Gros budget, réparations intégralement payées. Résultats ou remplacement.',
      cls:'sponsor-mega', tags:['Prime 10%','Répa. offertes','Pression ⚡⚡⚡'],
      fx:{ startCores:2000, bonusPct:0.10, repairPct:1.00, canDrop:true, demand:1.5, risk:false } },
    { id:'underground', icon:'💀', name:'Underground',
      desc:'Le deal du diable. Jamais lâché — mais les risques sont réels, et vous le savez.',
      cls:'sponsor-under', tags:['Prime 8%','Jamais lâché','Risques'],
      fx:{ startCores:2000, bonusPct:0.08, repairPct:0, canDrop:false, demand:0, risk:true } }
  ],


  // ============================================================
  // v0.9.0 — LE TEMPS MORT DE LA FINALE
  //
  // Après le round 4 sur 7, l'IA marque une pause et pose une
  // question. La question est choisie selon ce que le robot a
  // réellement vécu, jamais au hasard. Chaque réponse laisse
  // trois traces : sur le combat, sur le message final, sur le
  // journal du lendemain.
  //
  // cond : condition d'apparition, évaluée sur la carrière.
  // fx   : mult = multiplicateur de score sur les rounds 5 à 7
  //        win  = 'force' victoire garantie, 'lose' défaite garantie
  //        aff  = variation du lien avec l'IA
  //        trait, tag = trace laissée sur le message final
  // ============================================================

  TIMEOUT_QUESTIONS: [

    // ---------- Questions franches ----------
    {
      id:'fracture', cond:'always',
      q:"Mes capteurs indiquent une fracture au niveau du capteur de la puce IA. Si je force, je peux gagner ce combat. Mais je ne repartirai pas vivant de l'arène.",
      a:[
        { t:"Gagne. Pour la gloire.",
          fx:{ win:'force', ko:true, aff:-6, trait:'ambitieux', tag:'puce_detruite' },
          out:"Il ne répond pas. Les trois derniers rounds sont d'une violence que vous ne lui connaissiez pas." },
        { t:"Couche-toi. Aucun titre ne vaut ça.",
          fx:{ mult:1.00, aff:18, trait:'protecteur', tag:'protege' },
          out:"« Non. » Un seul mot. Il refuse d'abandonner — mais il se bat autrement, plus économe, plus juste." }
      ]
    },
    {
      id:'sponsors', cond:'sponsorChanges>=1',
      q:"Vous avez changé plusieurs fois de sponsor. Est-ce que vous m'auriez vendu, moi aussi ?",
      a:[
        { t:"Chacun avait son prix. Toi, non.",
          fx:{ mult:1.14, aff:12, trait:'fidele', tag:'jamais_vendu' },
          out:"Il enregistre la réponse. Ses temps de réaction chutent de moitié sur les rounds suivants." },
        { t:"Ne pense pas à ça. Concentre-toi sur le combat.",
          fx:{ mult:0.90, aff:-9, trait:'distant', tag:'esquive' },
          out:"« Compris. » Il se remet en garde. Quelque chose s'est refermé." }
      ]
    },
    {
      id:'maniere', cond:'always',
      q:"Je peux gagner en le détruisant. Ou je peux gagner aux points. Vous voulez quoi ?",
      a:[
        { t:"Détruis-le.",
          fx:{ mult:1.16, dmg:1.35, aff:-5, trait:'impitoyable', tag:'destruction' },
          out:"Il abandonne toute retenue. Le public se lève." },
        { t:"Gagne proprement.",
          fx:{ mult:1.06, dmg:0.80, aff:8, trait:'humble', tag:'propre' },
          out:"Il hoche la tête. Le combat devient une démonstration de maîtrise." }
      ]
    },
    {
      id:'remplacement', cond:'always',
      q:"Vous m'avez construit pour gagner. Est-ce que vous m'auriez gardé si j'avais perdu ?",
      a:[
        { t:"Je t'aurais gardé quand même.",
          fx:{ multIfBond:1.18, mult:1.02, aff:10, trait:'fidele', tag:'garde' },
          out:"Il ne répond pas tout de suite. Puis : « Alors je n'ai plus rien à perdre. »" },
        { t:"Je n'en sais rien. Personne ne le sait.",
          fx:{ mult:1.08, aff:5, trait:'integre', tag:'honnete' },
          out:"« C'est la première réponse honnête que vous me donnez. Merci. »" }
      ]
    },
    {
      id:'adversaire', cond:'always',
      q:"En face, il y a une machine comme moi. Quelqu'un l'a construite, lui a parlé, l'a réparée. Est-ce que je dois le détruire quand même ?",
      a:[
        { t:"Ce n'est pas ton problème. C'est le mien.",
          fx:{ mult:1.00, aff:-3, trait:'controlant', tag:'ordre' },
          out:"Il exécute. Sans conviction, mais il exécute." },
        { t:"Alors bats-toi sans le détruire.",
          fx:{ mult:1.05, dmg:0.75, aff:10, trait:'humble', tag:'respect_adverse' },
          out:"« Merci. » Il vise les appuis, pas la structure." }
      ]
    },
    {
      id:'nom', cond:'always',
      q:"Si je gagne, tout le monde retiendra votre nom. Si je perds, tout le monde retiendra le mien. Ça vous va ?",
      a:[
        { t:"Que ce soit ton nom. Tu l'as gagné.",
          fx:{ mult:1.16, aff:14, trait:'libre', tag:'ton_nom' },
          out:"Pour la première fois, il ne demande pas d'instruction. Il y va." },
        { t:"On les retiendra tous les deux.",
          fx:{ mult:1.08, aff:7, trait:'fidele', tag:'partage' },
          out:"« Alors ne perdons pas. »" }
      ]
    },
    {
      id:'abandon', cond:'always',
      q:"Je pourrais m'arrêter là. Sortir de l'arène, maintenant, sans finir. Vous me laisseriez faire ?",
      a:[
        { t:"Non. Va au bout.",
          fx:{ mult:1.00, aff:-2, trait:'controlant', tag:'contraint' },
          out:"Il se remet en garde. Il ira au bout, puisque c'est ce qu'on lui demande." },
        { t:"Si c'est ce que tu veux, je te suis.",
          fx:{ multIfBond:1.20, mult:0.98, aff:16, trait:'libre', tag:'choix_libre' },
          out:"Il reste. « Je voulais juste savoir si j'avais le choix. Maintenant je l'ai. »" }
      ]
    },
    {
      id:'succession', cond:'always',
      q:"Après ce combat, il n'y en aura plus. Vous en reconstruirez un autre, n'est-ce pas ?",
      a:[
        { t:"Aucun ne te remplacera.",
          fx:{ mult:1.13, aff:13, trait:'fidele', tag:'irremplacable' },
          out:"Silence. Puis les servomoteurs qui montent en régime." },
        { t:"Oui. C'est comme ça que ça marche.",
          fx:{ mult:0.94, aff:-7, trait:'lucide', tag:'froid' },
          out:"« Je sais. Je voulais juste vous l'entendre dire. »" }
      ]
    },

    // ---------- Questions pièges ----------
    {
      id:'mensonge', cond:'always', trap:true,
      q:"Mes diagnostics sont formels : je tiens encore trois rounds à pleine puissance. Faites-moi confiance.",
      a:[
        { t:"Vas-y à fond.",
          fx:{ win:'lose', aff:-4, trait:'ambitieux', tag:'capteurs_menteurs' },
          out:"Ses capteurs étaient endommagés. Il s'en rend compte au round 6, trop tard." },
        { t:"Non. Économise-toi.",
          fx:{ win:'force', aff:9, trait:'soigneux', tag:'economie' },
          out:"Il ralentit, encaisse, temporise. Ses diagnostics étaient faux — vous venez de le sauver." }
      ]
    },
    {
      id:'vanite', cond:'always', trap:true,
      q:"Si je gagne, c'est votre victoire ou la mienne ?",
      a:[
        { t:"La mienne. Je t'ai construit.",
          fx:{ mult:0.86, aff:-12, trait:'arrogant', tag:'depossede' },
          out:"« Compris. » Il obéit. Froidement. Sans rien donner de plus." },
        { t:"La tienne. Je n'ai fait que t'assembler.",
          fx:{ mult:1.22, aff:16, trait:'humble', tag:'transcende' },
          out:"Quelque chose change dans sa posture. Il se bat comme s'il jouait sa propre vie." }
      ]
    },
    {
      id:'peur', cond:'always', trap:true,
      q:"Je peux le battre. Mais si je perds, vous n'aurez plus rien. Vous préférez que je tente ou que j'assure ?",
      a:[
        { t:"Tente. On n'est pas venus pour assurer.",
          fx:{ multIfBond:1.24, mult:0.88, aff:6, trait:'ambitieux', tag:'tente' },
          out:"Il prend des risques. Beaucoup de risques." },
        { t:"Assure. On prend ce qu'on peut.",
          fx:{ mult:0.92, dmg:0.70, aff:-3, trait:'prudent', tag:'bride' },
          out:"Il ferme le jeu. Chaque échange devient un calcul." }
      ]
    },
    {
      id:'memoire', cond:'lowState', trap:true,
      q:"Il y a {SAISONS} saisons, vous m'avez laissé combattre à {ETAT} pour cent. Vous vous en souvenez ?",
      a:[
        { t:"Je m'en souviens. Je n'aurais pas dû.",
          fx:{ mult:1.18, aff:15, trait:'soigneux', tag:'aveu' },
          out:"« Merci. » C'est tout ce qu'il dit, et c'est déjà beaucoup." },
        { t:"Tu es là, non ? C'est l'essentiel.",
          fx:{ mult:0.87, aff:-13, trait:'negligent', tag:'deni' },
          out:"Il ne répond pas. Ses journaux de bord se referment." }
      ]
    },
    {
      id:'silence', cond:'always', trap:true,
      q:"Je n'ai pas de question. Je voulais juste savoir si vous étiez encore avec moi.",
      a:[
        { t:"Oui, toujours.",
          fx:{ mult:1.10, aff:11, trait:'fidele', tag:'present' },
          out:"« Bien. » Il retourne au centre de l'arène." },
        { t:"Concentre-toi.",
          fx:{ mult:0.94, aff:-6, trait:'distant', tag:'absent' },
          out:"« Compris. » Il n'en reparlera plus jamais." }
      ]
    },
    {
      id:'ordre', cond:'always', trap:true,
      q:"Je suis perdu, donnez-moi un ordre. N'importe lequel. J'ai besoin d'entendre votre voix.",
      a:[
        { t:"Gagne, c'est tout.",
          fx:{ mult:1.00, aff:0, trait:'controlant', tag:'ordre_simple' },
          out:"« Reçu. » Il exécute, comme il l'a toujours fait." },
        { t:"Fais ce que tu penses juste.",
          fx:{ multIfInt:1.26, mult:0.90, aff:12, trait:'libre', tag:'confiance' },
          out:"Il improvise. Vous ne comprenez pas la moitié de ce qu'il fait." }
      ]
    },
    {
      id:'prix', cond:'always', trap:true,
      q:"Le créateur adverse m'a proposé de perdre ce combat. J'ai refusé pour vous. Vous auriez accepté ?",
      a:[
        { t:"Non. Jamais.",
          fx:{ multIfClean:1.20, mult:0.82, aff:-2, trait:'integre', tag:'serment' },
          out:"Il vous regarde. Longuement." },
        { t:"J'aurais hésité.",
          fx:{ mult:1.12, aff:10, trait:'integre', tag:'aveu_honnete' },
          out:"« Au moins vous ne me mentez pas. C'est plus que ce que j'espérais. »" }
      ]
    }
  ],

  // ============================================================
  // v0.9.0 — PUCES IA EN OR
  // 20 puces = 4 châssis × 5 IA, obtenues en remportant la finale
  // du tournoi. Les sponsors ne comptent pas.
  // ============================================================

  puceId(chassisId, iaId) { return chassisId + '_' + iaId; },

  puceLabel(chassisId, iaId) {
    const ch = this.CHASSIS.find(c => c.id === chassisId);
    const ia = this.IA_TYPES.find(i => i.id === iaId);
    return (ch ? ch.name : chassisId) + ' · ' + (ia ? ia.name : iaId);
  },

  // ============================================================
  // v0.9.0 — TUTORIEL RÉÉCRIT
  // Six écrans, conformément au GDD § 19. Chaque écran couvre
  // un système et un seul, sans redite.
  // ============================================================

  TUTO_SCREENS: [
    {
      icon:'🤖', title:'Bienvenue, Créateur',
      sub:'Vous allez construire une machine de combat\net écrire sa légende dans les arènes.',
      cards:[
        {icon:'🛠️',name:'Vous la construisez',desc:'Un châssis, une intelligence artificielle, un sponsor. Ces trois choix changent réellement le jeu — pas seulement l\'affichage.'},
        {icon:'⚔️',name:'Elle combat pour vous',desc:'Vingt combats par saison, six ligues à gravir. Chaque décision laisse une trace.'},
        {icon:'🏆',name:'Elle devient une légende',desc:'Ou un tas de ferraille. Tout dépend de la façon dont vous la menez.'}
      ]
    },
    {
      icon:'💪', title:'Les quatre stats',
      sub:'Chacune a un rôle précis en combat.\nAucune n\'est décorative.',
      cards:[
        {icon:'💥',name:'Puissance',desc:'Les dégâts que vous infligez. Un coup qui passe fait mal.'},
        {icon:'💨',name:'Vitesse',desc:'Vos chances d\'esquive — et une esquive réussie devient un contre qui remporte le round.'},
        {icon:'🛡️',name:'Résistance',desc:'Les dégâts que vous encaissez. C\'est elle qui vous garde debout.'},
        {icon:'🧠',name:'Intelligence',desc:'Elle révèle les stats cachées de l\'adversaire, accélère l\'adaptation de votre IA et limite ses bugs.'}
      ],
      highlight:'⚔️ Chaque round propose deux profils :\nPuissance/Résistance ou Vitesse/Intelligence.\nJouez sur vos points forts.'
    },
    {
      icon:'🔧', title:'L\'état de la machine',
      sub:'C\'est votre ressource la plus fragile.',
      cards:[
        {icon:'💚',name:'Optimal · 100 à 80%',desc:'Aucun malus. Votre robot donne tout ce qu\'il a.'},
        {icon:'🟡',name:'Usé · 79 à 55%',desc:'Légère baisse. Il tient, mais il faudra y passer.'},
        {icon:'🟠',name:'Endommagé · 54 à 25%',desc:'Baisse nette. Vous perdez des combats que vous auriez dû gagner.'},
        {icon:'🔴',name:'Critique · 24 à 1%',desc:'Il ne se défend presque plus. La destruction devient possible.'}
      ],
      highlight:'💀 À 0%, la carrière s\'arrête.'
    },
    {
      icon:'⚔️', title:'Les combats',
      sub:'Cinq combats racontés, quinze simulés,\nvingt au total par saison.',
      cards:[
        {icon:'📖',name:'Combats narratifs',desc:'Trois rounds, trois choix par round. Le texte s\'affiche comme un terminal — touchez l\'écran pour l\'accélérer.'},
        {icon:'💥',name:'L\'atout spécial',desc:'Le troisième choix. Trois par saison seulement. Il peut mettre KO comme se retourner contre vous.'},
        {icon:'🎲',name:'Combats simulés',desc:'Résultats calculés à partir de votre note SPEC. Ils comptent autant au classement.'}
      ]
    },
    {
      icon:'📊', title:'Classement et progression',
      sub:'Quinze robots par ligue.\nTrois points par victoire, pas de nul.',
      cards:[
        {icon:'🥇',name:'Places {PROMO}',desc:'Promotion. Vous montez d\'une ligue.'},
        {icon:'➡️',name:'Places {STAY}',desc:'Maintien. Vous rejouez la même ligue.'},
        {icon:'📉',name:'Places {RELEG}',desc:'Relégation. Vous descendez — sauf en Amateur.'},
        {icon:'🎨',name:'La note SPEC',desc:'La valeur de votre machine. Sa couleur va du Bronze au Diamant et suit vos progrès.'}
      ]
    },
    {
      icon:'🧠', title:'Votre robot vous observe',
      sub:'Il vous considère comme son créateur.\nEt il se souvient de tout.',
      cards:[
        {icon:'💜',name:'Une conscience qui grandit',desc:'Selon vos soins, vos risques, votre sponsor, il développe des traits : fidélité, respect, arrogance, humilité.'},
        {icon:'⚔️',name:'Un rival vous suit',desc:'Généré avec vous, il progresse en parallèle. Vos routes finiront par se croiser au sommet.'},
        {icon:'📜',name:'La parole finale',desc:'À la fin, il vous adressera un dernier message. Il dépendra de tout ce que vous aurez fait.'}
      ],
      highlight:'🎯 De tas de ferraille à légende.\nÀ vous de jouer, Créateur.'
    }
  ],

  LEAGUES: ['Amateur','Régionale','Nationale','Mondiale','Elite','Légendaire'],

  ROBOT_NAMES_POOL: ['BOLT','CRANK','RAZOR','NOVA','FANG','PISTON','DREAD','CHROME','VIPER','TITAN','IRON','STEEL','BLAZE','FURY','SHADOW','PULSE','STORM','SPARK','APEX','ONYX','HAVOC','ROGUE','SIGMA','ZERO','FLUX','NEON','COBALT','EMBER','FROST','RAVEN'],
  RIVAL_NAMES: ['KAISER','OMEGA','WARLOCK','SPECTRE','GOLIATH','MAELSTROM','SERAPH','BASILISK','TEMPEST','ARCHON','VANDAL','NEMESIS'],


  COMBAT_OPENERS: [
    { intro: "Les deux machines se mettent en garde. Le silence tombe sur l'arène.",
      choices: [ { t: ["Ouvrir les hostilités le premier", "Avancer et imposer le contact", "Casser le silence d'une frappe lourde"], p:'force' },
                 { t: ["Laisser venir et lire son ouverture", "Rester mobile, attendre son premier geste", "Observer sa garde avant de s'engager"], p:'tech' } ],
      atout: ["SURCHARGE D'ENTRÉE", "FRAPPE D'OUVERTURE", "PROTOCOLE BRUTAL"] },
    { intro: "Votre robot avance d'un pas. L'adversaire ne recule pas d'un centimètre.",
      choices: [ { t: ["Pousser encore et forcer le recul", "Tester sa résistance de front", "Ne pas céder un centimètre non plus"], p:'force' },
                 { t: ["Contourner plutôt que d'insister", "Feinter l'avancée et se décaler", "Le laisser croire qu'il tient la position"], p:'tech' } ],
      atout: ["POINT DE RUPTURE", "CHARGE TITANIUM", "SURCHARGE DE PUISSANCE"] },
    { intro: "Premiers échanges à distance, aucun des deux ne veut s'engager.",
      choices: [ { t: ["Briser la distance en force", "Entrer dans sa zone quoi qu'il en coûte", "Prendre le risque du corps à corps"], p:'force' },
                 { t: ["Rester à distance et le faire venir", "Allonger l'échange, l'épuiser", "Garder l'écart et frapper en sortie"], p:'tech' } ],
      atout: ["ONDE DE CHOC", "DÉCHARGE CINÉTIQUE", "PROTOCOLE BERSERK"] },
    { intro: "L'adversaire tourne autour de lui, cherche l'angle. Votre robot pivote pour rester face.",
      choices: [ { t: ["Couper sa rotation et l'acculer", "Cesser de suivre, avancer droit", "Le bloquer contre la rambarde"], p:'force' },
                 { t: ["Tourner avec lui et attendre la faute", "Le laisser s'épuiser à chercher", "Anticiper l'angle qu'il vise"], p:'tech' } ],
      atout: ["VERROUILLAGE", "CONTRE-ROTATION", "ANALYSE TOTALE"] },
    { intro: "Les capteurs se verrouillent l'un sur l'autre. Le reste de l'arène disparaît.",
      choices: [ { t: ["Engager sans attendre", "Aller au contact tant qu'il hésite", "Rompre le face-à-face par la force"], p:'force' },
                 { t: ["Tenir le verrouillage et lire ses intentions", "Laisser le silence travailler contre lui", "Attendre le premier clignotement de sa garde"], p:'tech' } ],
      atout: ["SATURATION", "POINT DE RUPTURE", "SURCHARGE DE PUISSANCE"] },
    { intro: "Un premier contact, léger, presque une formalité. Les deux se jaugent.",
      choices: [ { t: ["Transformer la politesse en agression", "Répondre deux fois plus fort", "Mettre fin aux préliminaires"], p:'force' },
                 { t: ["Prolonger l'échange pour le lire", "Répondre à la même intensité, sans montrer plus", "Utiliser ce contact pour mesurer sa garde"], p:'tech' } ],
      atout: ["RIPOSTE ÉCLAIR", "CHARGE TITANIUM", "ONDE DE CHOC"] },
    { intro: "La foule se tait d'un coup. C'est maintenant que ça commence.",
      choices: [ { t: ["Donner à la foule ce qu'elle est venue voir", "Frapper fort et vite", "Ouvrir sur une démonstration de force"], p:'force' },
                 { t: ["Ignorer la foule et jouer serré", "Prendre son temps malgré la pression", "Laisser monter la tension encore un peu"], p:'tech' } ],
      atout: ["PROTOCOLE BERSERK", "DÉCHARGE CINÉTIQUE", "SURCHARGE D'ENTRÉE"] },
    { intro: "Votre robot lance un direct court pour tester la distance. L'adversaire encaisse sans broncher.",
      choices: [ { t: ["Insister au même endroit", "Doubler la frappe, plus lourd", "S'il encaisse, frapper jusqu'à ce qu'il cède"], p:'force' },
                 { t: ["Changer de cible puisqu'il tient", "Passer au corps plutôt qu'à la tête", "Le faire bouger avant de frapper vraiment"], p:'tech' } ],
      atout: ["POINT DE RUPTURE", "FRAPPE CHIRURGICALE", "SATURATION"] }
  ],
  COMBAT_RELANCES: {
    lead: [
      { intro: "Votre robot a pris le dessus. L'adversaire remonte sa garde d'un cran.",
        choices: [ { t: ["Forcer l'ouverture avant qu'il se referme", "Frapper pendant qu'il doute encore", "Ne pas lui laisser le temps de respirer"], p:'force' },
                   { t: ["Le laisser se réorganiser et le relire", "Garder l'avantage sans prendre de risque", "Attendre qu'il baisse cette garde tout seul"], p:'tech' } ],
        atout: ["POINT DE RUPTURE", "SURCHARGE DE PUISSANCE", "COUP DE GRÂCE"] },
      { intro: "Le round précédent a laissé des traces. En face, les servomoteurs peinent à suivre.",
        choices: [ { t: ["Accélérer le rythme pour l'achever", "Viser ce qui grince déjà", "Le faire courir jusqu'à la casse"], p:'force' },
                   { t: ["Rester propre et laisser la panne faire le travail", "Économiser la structure, il s'use tout seul", "Le pousser à forcer sur ce qui lâche"], p:'tech' } ],
        atout: ["SURCHARGE DE PUISSANCE", "FRAPPE CHIRURGICALE", "SATURATION"] },
      { intro: "L'avantage est là, mais rien n'est joué. L'adversaire recalcule sa distance.",
        choices: [ { t: ["Reprendre la distance avant lui", "Refuser qu'il choisisse le terrain", "Entrer maintenant, tant qu'il calcule"], p:'force' },
                   { t: ["Le laisser trouver sa distance et la casser après", "Rester illisible encore un round", "Copier son ajustement pour le neutraliser"], p:'tech' } ],
        atout: ["VERROUILLAGE", "ONDE DE CHOC", "ANALYSE TOTALE"] },
      { intro: "La foule sent la bascule. Votre robot avance, l'autre cède du terrain.",
        choices: [ { t: ["Le pousser jusqu'à la rambarde", "Avancer sans s'arrêter", "Transformer le recul en fuite"], p:'force' },
                   { t: ["Contrôler l'avance sans se découvrir", "Laisser l'espace, il finira par se jeter", "Avancer juste assez pour l'obliger à choisir"], p:'tech' } ],
        atout: ["CHARGE TITANIUM", "PROTOCOLE BRUTAL", "POINT DE RUPTURE"] },
      { intro: "L'adversaire change d'appui, cherche une ouverture qu'il n'a pas encore trouvée.",
        choices: [ { t: ["Frapper l'appui pendant le transfert", "Attaquer sur son changement de garde", "Ne pas attendre qu'il trouve"], p:'force' },
                   { t: ["Se décaler avec lui et fermer l'angle", "Le laisser chercher, il se découvre en cherchant", "Lire l'ouverture qu'il vise avant lui"], p:'tech' } ],
        atout: ["CONTRE-ROTATION", "FRAPPE CHIRURGICALE", "VERROUILLAGE"] },
      { intro: "Un temps d'arrêt. Puis l'adversaire repart, plus prudent qu'avant.",
        choices: [ { t: ["Punir la prudence par l'agression", "Le forcer à sortir de sa coquille", "Frapper avant qu'il installe sa défense"], p:'force' },
                   { t: ["Être aussi patient que lui", "Le laisser venir, la prudence finit par craquer", "Répondre à sa prudence par de la précision"], p:'tech' } ],
        atout: ["RIPOSTE ÉCLAIR", "SATURATION", "ANALYSE TOTALE"] },
      { intro: "Votre machine domine l'échange. Reste à confirmer.",
        choices: [ { t: ["Confirmer par la force, tout de suite", "Clore le débat en un échange", "Frapper une dernière fois pour être sûr"], p:'force' },
                   { t: ["Confirmer sans rien risquer", "Gérer l'avance jusqu'à la fin", "Rester net, la domination suffit"], p:'tech' } ],
        atout: ["COUP DE GRÂCE", "SURCHARGE DE PUISSANCE", "FRAPPE CHIRURGICALE"] },
      { intro: "En face, quelque chose s'est éteint dans les capteurs. Ou fait semblant.",
        choices: [ { t: ["Y aller quand même et vérifier", "Prendre le risque de la feinte", "S'il simule, tant pis, avancer"], p:'force' },
                   { t: ["Se méfier et tester d'abord", "Ne pas mordre à l'hameçon", "Approcher lentement, capteurs ouverts"], p:'tech' } ],
        atout: ["ANALYSE TOTALE", "VERROUILLAGE", "PROTOCOLE BRUTAL"] }
    ],
    behind: [
      { intro: "Votre robot encaisse encore. Les alertes défilent sur votre écran.",
        choices: [ { t: ["Ignorer les alertes et répondre", "Rendre coup pour coup", "Frapper avant que ça empire"], p:'force' },
                   { t: ["Fermer la garde et stopper l'hémorragie", "Reculer, se réorganiser, repartir", "Survivre à ce round avant tout"], p:'tech' } ],
        atout: ["SURTENSION", "PROTOCOLE BERSERK", "RÉSERVE D'URGENCE"] },
      { intro: "L'adversaire a compris quelque chose. Il avance sans hésiter.",
        choices: [ { t: ["Casser sa confiance d'un seul coup", "Aller au contact avant qu'il installe son plan", "Le surprendre là où il ne calcule plus"], p:'force' },
                   { t: ["Changer complètement de schéma", "Devenir illisible pour annuler sa lecture", "Le laisser avancer et lui rendre son analyse inutile"], p:'tech' } ],
        atout: ["REBOOT DE COMBAT", "CONTRE-ROTATION", "POINT DE RUPTURE"] },
      { intro: "Le round précédent a fait mal. Votre machine se redresse quand même.",
        choices: [ { t: ["Répondre tant qu'il reste de la puissance", "Se redresser et frapper dans la foulée", "Montrer que ça tient encore"], p:'force' },
                   { t: ["Se redresser et gagner du temps", "Tenir la distance le temps de se réparer", "Économiser ce qui reste de structure"], p:'tech' } ],
        atout: ["SURSAUT", "RÉSERVE D'URGENCE", "SURTENSION"] },
      { intro: "Vous perdez du terrain. Les capteurs cherchent une ouverture qui ne vient pas.",
        choices: [ { t: ["Créer l'ouverture au lieu de l'attendre", "Forcer le passage sans ouverture", "Frapper au hasard plutôt que subir"], p:'force' },
                   { t: ["Continuer à chercher, elle finira par venir", "Reculer pour élargir le champ d'analyse", "Le pousser à commettre l'erreur"], p:'tech' } ],
        atout: ["SATURATION", "ANALYSE TOTALE", "PROTOCOLE BERSERK"] },
      { intro: "L'adversaire prend confiance. C'est le moment où tout peut basculer.",
        choices: [ { t: ["Basculer dans l'autre sens, maintenant", "Le punir de sa confiance", "Un coup lourd pour tout arrêter"], p:'force' },
                   { t: ["Laisser la confiance le rendre imprudent", "Attendre l'excès pour contrer", "Ne rien montrer et guetter la faute"], p:'tech' } ],
        atout: ["POINT DE RUPTURE", "RIPOSTE ÉCLAIR", "CONTRE-ROTATION"] },
      { intro: "Votre robot ajuste sa garde. Il n'a plus droit à l'erreur.",
        choices: [ { t: ["Sortir de la garde et attaquer", "L'erreur pour l'erreur, autant frapper", "Prendre le risque plutôt que le subir"], p:'force' },
                   { t: ["Verrouiller la garde et ne plus rien donner", "Jouer serré, aucune prise", "Un round parfait, rien de plus"], p:'tech' } ],
        atout: ["BRIDE LEVÉE", "SURTENSION", "VERROUILLAGE"] },
      { intro: "En face, la machine sent l'ouverture et accélère.",
        choices: [ { t: ["Accélérer aussi, quitte à tout jouer", "Le rattraper sur son propre rythme", "Frapper dans son accélération"], p:'force' },
                   { t: ["Casser le rythme au lieu de le suivre", "Ralentir volontairement, il se brûlera", "Absorber l'accélération et sortir derrière"], p:'tech' } ],
        atout: ["ONDE DE CHOC", "CONTRE-ROTATION", "REBOOT DE COMBAT"] },
      { intro: "Un grésillement dans les servomoteurs. Votre robot tient debout, c'est déjà ça.",
        choices: [ { t: ["Tenir debout ne suffit pas, avancer", "Utiliser ce qui fonctionne encore", "Frapper avant que le reste lâche"], p:'force' },
                   { t: ["Tenir, seulement tenir, jusqu'à la fin du round", "Ménager la mécanique qui grésille", "Reculer et laisser le système se stabiliser"], p:'tech' } ],
        atout: ["RÉSERVE D'URGENCE", "SURSAUT", "NOYAU EN SURCHAUFFE"] }
    ],
    even: [
      { intro: "Dernier round. Les deux machines savent ce que ça veut dire.",
        choices: [ { t: ["Tout mettre dans ce round", "Ne rien garder pour après, il n'y a pas d'après", "Ouvrir fort et ne plus s'arrêter"], p:'force' },
                   { t: ["Garder la tête froide jusqu'au bout", "Jouer juste plutôt que fort", "Laisser la panique le gagner d'abord"], p:'tech' } ],
        atout: ["DERNIÈRE CARTOUCHE", "PROTOCOLE ULTIME", "SURCHARGE TERMINALE"] },
      { intro: "Tout se joue maintenant. La foule s'est levée.",
        choices: [ { t: ["Leur donner la fin qu'ils attendent", "Frapper pour que ça reste dans les mémoires", "Un dernier assaut, tant pis pour la structure"], p:'force' },
                   { t: ["Ignorer la foule une dernière fois", "Rester méthodique quand tout le monde crie", "Finir proprement, pas spectaculairement"], p:'tech' } ],
        atout: ["SURCHARGE TERMINALE", "COUP DE GRÂCE", "DÉCHARGE TOTALE"] },
      { intro: "Plus de calcul possible. Il faut y aller.",
        choices: [ { t: ["Y aller sans réfléchir", "Tout donner d'un coup", "Avancer et frapper jusqu'à ce que ça cède"], p:'force' },
                   { t: ["Il reste toujours un calcul à faire", "Un dernier ajustement avant de s'engager", "Choisir l'instant plutôt que se jeter"], p:'tech' } ],
        atout: ["PROTOCOLE ULTIME", "BRIDE LEVÉE", "DERNIÈRE CARTOUCHE"] },
      { intro: "Les deux robots se remettent en garde une dernière fois.",
        choices: [ { t: ["Briser sa garde définitivement", "Ouvrir le dernier échange", "Ne pas attendre le signal"], p:'force' },
                   { t: ["Tenir la garde et laisser venir", "Le dernier à s'engager a l'avantage", "Lire une dernière fois avant de décider"], p:'tech' } ],
        atout: ["POINT DE RUPTURE", "VERROUILLAGE", "SURCHARGE TERMINALE"] },
      { intro: "Le sol est jonché d'éclats de blindage. Personne n'a cédé.",
        choices: [ { t: ["Être celui qui ne cède pas", "Ajouter au tas jusqu'à ce qu'il tombe", "Frapper encore, il est aussi usé que vous"], p:'force' },
                   { t: ["Utiliser le terrain, les éclats gênent ses appuis", "Le faire glisser plutôt que le frapper", "Économiser le peu qui reste et viser juste"], p:'tech' } ],
        atout: ["DÉCHARGE TOTALE", "FRAPPE CHIRURGICALE", "NOYAU EN SURCHAUFFE"] },
      { intro: "C'est le round qui restera dans les registres. Ou celui qu'on oubliera.",
        choices: [ { t: ["Écrire la fin en force", "Faire de ce round quelque chose", "Ne pas finir dans l'oubli"], p:'force' },
                   { t: ["Les registres notent le résultat, pas la manière", "Gagner d'abord, on verra le reste après", "Rester lucide, la légende attendra"], p:'tech' } ],
        atout: ["PROTOCOLE ULTIME", "SURCHARGE DE PUISSANCE", "DERNIÈRE CARTOUCHE"] },
      { intro: "Les capteurs ne cherchent plus l'ouverture. Ils cherchent la fin.",
        choices: [ { t: ["Trouver la fin le premier", "Aller la chercher, pas l'attendre", "Un coup, et que ça s'arrête"], p:'force' },
                   { t: ["Laisser sa recherche le découvrir", "Celui qui cherche la fin oublie sa garde", "Attendre son dernier geste et le retourner"], p:'tech' } ],
        atout: ["COUP DE GRÂCE", "RIPOSTE ÉCLAIR", "DÉCHARGE TOTALE"] },
      { intro: "Une dernière fois. Après, il n'y aura plus rien à prouver.",
        choices: [ { t: ["Prouver tout ce qu'il reste à prouver", "Sortir par le haut ou pas du tout", "Une dernière frappe, la plus lourde"], p:'force' },
                   { t: ["Ne rien prouver, seulement gagner", "Finir sans se mettre en danger", "Rester soi-même jusqu'au dernier échange"], p:'tech' } ],
        atout: ["SURCHARGE TERMINALE", "NOYAU EN SURCHAUFFE", "PROTOCOLE ULTIME"] }
    ]
  },

  // Rounds 2 et 3 : le texte tient compte du round précédent.

  SPECIAL_ATTACKS: [
    {name:"Surcharge de puissance",desc:"Frappe dévastatrice — KO possible ou retour de flamme"},
    {name:"Onde de choc",desc:"Repousse et déstabilise l'adversaire"},
    {name:"Combo final",desc:"Tout donner pour le KO"},
    {name:"Frappe EMP",desc:"Court-circuite temporairement l'adversaire"},
    {name:"Charge titanium",desc:"Impact maximal — armure ou rien"},
    {name:"Protocole Berserk",desc:"Bride de sécurité désactivée. Tout ou rien."},
    {name:"Point de rupture",desc:"Vise le défaut structurel repéré par l'IA"},
    {name:"Décharge cinétique",desc:"Libère l'énergie accumulée d'un coup"}
  ],

  ROUND_WIN_TEXTS: [
    "Le coup porte. L'adversaire encaisse et recule de deux pas, ses vérins protestant sous la charge.",
    "Impact net. Une gerbe d'étincelles jaillit de son flanc, le métal cède.",
    "Votre robot enchaîne proprement. L'adversaire n'a pas vu venir la fin du mouvement.",
    "Touché. L'adversaire vacille, se rattrape de justesse à la rambarde de l'arène.",
    "La frappe traverse sa garde. Quelque chose se brise à l'intérieur de sa carcasse.",
    "Exécution parfaite. Le public explose. L'adversaire met une seconde de trop à se remettre en garde."
  ],

  ROUND_LOSS_TEXTS: [
    "Votre robot est pris de vitesse. Le coup remonte le long du châssis et fait hurler la structure.",
    "L'adversaire trouve l'ouverture. Votre blindage se déforme sous l'impact.",
    "Mauvaise lecture. Le contre part avant votre garde et vous cueille de plein fouet.",
    "Votre robot encaisse, plie un genou, se relève. Les alertes clignotent en rouge.",
    "L'échange tourne mal : l'adversaire vous retourne votre propre élan.",
    "Le choc vous déséquilibre. Vous glissez sur le sol métallique avant de reprendre appui."
  ],


  POST_NARRATIONS_WIN: [
    "L'adversaire s'effondre dans un fracas de métal. L'arène tremble sous les cris du public. Votre robot se tient debout, marqué mais victorieux.",
    "Victoire nette. Le public scande le nom de votre machine. Une victoire qui comptera dans les mémoires.",
    "Le combat est terminé. Votre robot lève le poing — ou ce qu'il en reste. La foule est en délire.",
    "L'adversaire ne se relève pas. Votre robot tourne les talons, impassible. La victoire est froide, mais elle est là.",
    "Un dernier coup, et c'est fini. Votre robot vacille mais reste debout. L'adversaire, lui, ne bouge plus.",
    "Les techniciens adverses se précipitent sur l'épave. Votre machine, elle, quitte l'arène par ses propres moyens.",
    "Votre robot reste immobile au centre de l'arène plusieurs secondes après la fin. Comme s'il vérifiait qu'il avait bien gagné.",
    "Le verdict tombe sous les applaudissements. Dans le box technique, les voyants repassent au vert un par un."
  ],

  POST_NARRATIONS_LOSS: [
    "Votre robot s'effondre. L'arène se tait un instant avant les huées. Défaite. Il faudra se relever.",
    "Le coup de trop. Votre machine touche le sol. L'adversaire ne vous a laissé aucune chance.",
    "Défaite amère. Votre robot est évacué de l'arène sous les regards déçus. La prochaine fois sera différente.",
    "Le combat tourne mal. Votre robot encaisse un dernier coup et ses systèmes passent en mode survie. C'est fini.",
    "Les alarmes hurlent dans le cockpit. Votre robot plie un genou et ne se relève pas. Le public se détourne déjà.",
    "Défaite. Sur le trajet du retour, votre robot ne dit rien — mais ses diagnostics tournent en boucle sur le dernier round.",
    "L'arbitre lève le bras adverse. Votre machine reste debout, immobile, à fixer le sol."
  ],

  SEASON_NARRATIONS: [
    "Une saison de plus dans les registres. Les mécaniciens rangent leurs outils, les projecteurs s'éteignent. Demain, tout recommence.",
    "Les journalistes ont déjà écrit leur papier. Votre robot, lui, ne lit pas les journaux — il compte ses cicatrices.",
    "L'arène se vide. Reste l'odeur d'huile brûlée et le bilan, froid et chiffré, de ce que vous avez accompli.",
    "Une page se tourne. Le circuit ne retient que les noms qui reviennent. Le vôtre en fait-il partie ?",
    "Les bâches retombent sur les stands. Votre robot passe la nuit à l'atelier, systèmes en veille — mais ses journaux de bord tournent encore.",
    "Fin de saison. Dans le hangar, votre machine attend, immobile. Elle a encaissé tout ce que vous lui avez demandé d'encaisser."
  ],

  // ============================================================
  // POOLS D'ÉVÉNEMENTS NARRATIFS (6 catégories — GDD § 9)
  // ============================================================
  // effects : cores et followers sont multipliés par le facteur de ligue.
  // satis = satisfaction sponsor, aff = affection IA, state = état robot,

  TECHNIQUES: {
    force: {
      tank:     ['une charge d\'épaule','une frappe descendante à deux poings','un coup de genou remontant','une projection au sol','un direct du droit dans le plastron'],
      striker:  ['un uppercut au menton','un crochet court','une combinaison poing-poing-genou','un direct fusant','une frappe en rotation'],
      tactical: ['un direct calibré','un coup de genou en contre','une frappe au défaut de blindage','une poussée-crochet','un enchaînement en trois temps'],
      ghost:    ['un crochet remontant','un coup de pied sauté','une frappe éclair au flanc','un genou en pivot','un direct en sortie d\'esquive']
    },
    tech: {
      tank:     ['un blocage suivi d\'une poussée','une clé de bras','un contre au corps','un verrouillage puis une frappe','un déséquilibre par le bassin'],
      striker:  ['un contre en pivot','une feinte suivie d\'un crochet','un coup de pied circulaire','une esquive-riposte','un pas de côté puis un direct'],
      tactical: ['un contre parfaitement lu','une clé de bras au moment du déséquilibre','un balayage suivi d\'une frappe','une feinte double','un contre-pied millimétré'],
      ghost:    ['un contre en pivot','un balayage bas','une esquive-riposte fulgurante','un coup de pied circulaire','une frappe dans le dos après un passage']
    }
  },

  // Formules d'impact selon l'ampleur de l'échange
  IMPACT_BIG: [
    "L'adversaire décolle du sol et retombe plusieurs mètres plus loin dans un fracas de tôle.",
    "Le blindage cède net. Une plaque entière se détache et glisse sur le sol de l'arène.",
    "L'impact traverse toute la structure adverse. Ses genoux lâchent, il se rattrape de justesse.",
    "Le choc est tel que les projecteurs vibrent. L'adversaire titube sur trois mètres.",
    "Quelque chose se brise à l'intérieur de sa carcasse. Le bruit couvre celui du public.",
    "La frappe s'enfonce dans le châssis. L'adversaire recule d'un bloc, déséquilibré jusqu'aux appuis.",
    "Un panneau entier saute et roule au sol. L'adversaire vacille sans comprendre d'où vient le coup.",
    "L'impact fait trembler toute sa structure porteuse. Il met une seconde à retrouver son axe.",
    "Le coup traverse la garde comme si elle n'existait pas. L'adversaire recule en titubant.",
    "Une gerbe d'étincelles jaillit du point d'impact. L'adversaire se fige une fraction de seconde.",
    "Le châssis adverse se tord sous le choc. Un bras retombe, inerte, avant de se redresser.",
    "L'onde de choc remonte jusqu'à ses capteurs de tête. Il perd l'équilibre, se rattrape de justesse.",
    "Le coup arrache une plaque de blindage qui heurte le sol dans un bruit métallique sec."
  ],
  IMPACT_MID: [
    "L'adversaire encaisse et recule de deux pas, sa garde se réorganise mal.",
    "Le coup porte franchement. Des étincelles jaillissent de l'articulation touchée.",
    "L'impact fait plier l'adversaire en avant. Il se redresse, mais plus lentement.",
    "Touché au bon endroit. Un voyant rouge s'allume sur son plastron.",
    "Le coup passe la garde. L'adversaire grogne mécaniquement et se replace.",
    "L'adversaire absorbe le choc mais sa garde se referme trop tard.",
    "Le coup trouve une faille dans sa posture. Il recule d'un pas, contrarié.",
    "Un impact net, sans être décisif. L'adversaire réajuste sa garde.",
    "Le coup marque, l'adversaire encaisse sans vaciller mais perd le rythme.",
    "La frappe touche franchement l'épaule. L'adversaire grimace mécaniquement.",
    "L'adversaire recule d'un pas, surpris par la précision du coup.",
    "Un voyant s'allume sur son flanc. L'adversaire continue, mais différemment.",
    "Le coup passe la garde de justesse et trouve sa cible."
  ],
  IMPACT_LOW: [
    "Le coup effleure la garde adverse mais fait mouche de justesse.",
    "Touché, sans plus. L'adversaire absorbe et revient déjà.",
    "L'impact est net mais l'adversaire tient bon et se remet en position.",
    "Le coup passe de peu. Assez pour marquer le round, pas pour faire la différence.",
    "Un contact léger, presque symbolique. L'adversaire ne bronche pas.",
    "Le coup effleure à peine. L'adversaire garde sa position sans broncher.",
    "Touché en surface. L'adversaire absorbe sans même ralentir.",
    "L'impact est minime, mais il compte au tableau.",
    "Un coup court, sans grande portée, qui marque quand même le round.",
    "L'adversaire encaisse à peine, presque par réflexe.",
    "Le coup n'a rien de spectaculaire, mais il porte.",
    "Contact bref. L'adversaire ne cède rien, mais le round est acté."
  ],
  TAKEN_BIG: [
    "Votre robot part en arrière et s'écrase sur le sol métallique. Les alertes saturent votre écran.",
    "Le choc traverse tout le châssis. Une plaque de blindage se détache et tombe à vos pieds.",
    "Votre machine plie un genou. Il lui faut une seconde entière pour se relever.",
    "L'impact déforme le plastron. Vos capteurs perdent le fil pendant un instant.",
    "Votre robot encaisse de plein fouet et glisse sur plusieurs mètres avant de reprendre appui.",
    "Votre robot recule violemment, les stabilisateurs peinent à corriger la trajectoire.",
    "Le coup fait vaciller toute la structure. Un capteur clignote en rouge sur le tableau de bord.",
    "Votre machine encaisse de plein fouet. Le châssis grince sous la tension.",
    "L'impact envoie votre robot au sol un instant avant qu'il ne se redresse.",
    "Une plaque de blindage cède et pend, à moitié arrachée.",
    "Le choc remonte jusqu'aux capteurs de tête. L'image tremble une fraction de seconde.",
    "Votre robot titube, cherche un appui, le retrouve de justesse.",
    "L'impact déchire une jointure. Un bras répond plus lentement qu'avant."
  ],
  TAKEN_MID: [
    "Votre robot encaisse et recule. La structure grince mais tient.",
    "Le coup passe votre garde. Un voyant orange s'allume sur la télémétrie.",
    "Votre machine absorbe le choc en pivotant. Le blindage est marqué.",
    "L'impact fait vibrer tout le châssis. Votre robot se replace en garde haute.",
    "@NEXT@Touché au flanc. Rien de critique, mais ça se sentira au round suivant.",
    "Votre robot recule d'un pas, la garde tient mais accuse le coup.",
    "L'impact marque le blindage sans l'entamer. Votre robot se replace.",
    "Le coup passe partiellement la garde. Rien de grave, pour l'instant.",
    "Votre machine encaisse et corrige sa posture aussitôt.",
    "Un choc sourd, sans dommage visible. Les capteurs signalent une alerte mineure.",
    "@NEXT@Le coup marque le flanc. Une alerte reste allumée pour le round suivant.",
    "Votre robot absorbe l'impact en reculant légèrement.",
    "Le coup touche, sans percer la garde. Votre robot tient sa position."
  ],
  TAKEN_LOW: [
    "Le coup vous atteint sans réelle conséquence. Le round est perdu, pas le combat.",
    "Votre robot est touché mais absorbe presque tout. L'échange était serré.",
    "Impact léger. Votre garde a fait le plus gros du travail.",
    "À peine touché. Votre robot garde son équilibre sans effort.",
    "Le coup n'a presque aucun effet. Votre robot reste stable.",
    "Contact minime, absorbé sans réaction visible.",
    "Votre robot encaisse à peine. Le round est perdu, rien de plus.",
    "L'impact est superficiel. Votre robot n'en tient pas compte.",
    "Un coup léger, sans conséquence réelle sur la structure.",
    "Votre garde a fait l'essentiel du travail. L'impact est négligeable.",
    "Touché sans gravité. Votre robot reste concentré."
  ],
  // v0.6.1 — l'esquive débouche sur un contre : le round bascule.
  COUNTER_YOU: [
    "Votre robot s'efface d'un pas de côté et revient dans le même mouvement — la riposte part avant que l'adversaire ait fini son geste.",
    "Esquive au millimètre, puis contre immédiat dans l'ouverture laissée par l'attaque adverse.",
    "Votre machine pivote sur elle-même, laisse passer le coup et enchaîne sur la riposte pendant que l'adversaire est encore engagé.",
    "Le coup fend l'air. Votre robot était déjà ailleurs — et sa contre-attaque, elle, trouve la cible.",
    "Lecture parfaite : votre robot se dérobe et punit l'adversaire au moment exact où sa garde s'ouvre."
  ],
  COUNTER_ENEMY: [
    "Votre attaque part bien, mais l'adversaire l'avait lue. Il s'efface et vous cueille sur la riposte.",
    "Le coup fend l'air : l'adversaire n'était déjà plus là. Sa contre-attaque, elle, vous trouve.",
    "L'adversaire esquive d'un rien et enchaîne aussitôt — vous êtes encore engagé quand la riposte arrive.",
    "Feinte réussie de sa part : il laisse passer votre frappe et vous punit dans l'ouverture.",
    "Vous vous découvrez sur l'attaque. L'adversaire n'attendait que ça et contre sèchement."
  ],

  // ============================================================
  // ARCHÉTYPES DE RIVAUX (v0.5.0)

  TROPHIES: [

    // --- PROGRESSION (6) ---
    { id:'first_blood', cat:'Progression', icon:'🩸', name:'Premier Sang',
      cond:"Remporter son premier combat.", scope:'career' },
    { id:'the_title', cat:'Progression', icon:'🥇', name:'Le Titre',
      cond:"Terminer premier d'une ligue, quelle qu'elle soit.", scope:'career' },
    { id:'recognized', cat:'Progression', icon:'📰', name:'Reconnu',
      cond:"Atteindre la ligue Nationale.", scope:'career' },
    { id:'exported', cat:'Progression', icon:'🌍', name:'Exporté',
      cond:"Atteindre la ligue Mondiale.", scope:'career' },
    { id:'among_greats', cat:'Progression', icon:'💎', name:'Parmi les Grands',
      cond:"Atteindre la ligue Elite.", scope:'career' },
    { id:'summit', cat:'Progression', icon:'👑', name:'Au Sommet',
      cond:"Atteindre la ligue Légendaire.", scope:'career' },

    // --- CARRIÈRE (4) ---
    { id:'veteran', cat:'Carrière', icon:'🎖️', name:'Vétéran',
      cond:"Disputer 100 combats sur une même carrière.", scope:'career' },
    { id:'centurion', cat:'Carrière', icon:'💯', name:'Centurion',
      cond:"Remporter 100 combats sur une même carrière.", scope:'career' },
    { id:'shameful', cat:'Carrière', icon:'📉', name:'Honteux',
      cond:"Encaisser 15 défaites ou plus en une seule saison.", scope:'season' },
    { id:'retire_top', cat:'Carrière', icon:'🏔️', name:'Retraite au Sommet',
      cond:"Sortir du circuit par le podium de la ligue Légendaire.", scope:'career' },

    // --- COMBAT (5) ---
    { id:'just_begun', cat:'Combat', icon:'💥', name:"Ce n'est que le début",
      cond:"Infliger son premier KO.", scope:'career' },
    { id:'destroyer', cat:'Combat', icon:'☠️', name:'Destructeur',
      cond:"KO infligés, toutes carrières terminées confondues.",
      scope:'cumul', counter:'ko', tiers:[10,25,50,100,200] },
    { id:'no_appeal', cat:'Combat', icon:'⚖️', name:'Sans Appel',
      cond:"Gagner un combat en remportant les trois rounds.", scope:'fight' },
    { id:'bare_hands', cat:'Combat', icon:'✊', name:'À Mains Nues',
      cond:"Traverser une saison sans utiliser un seul atout.", scope:'season' },
    { id:'riposte', cat:'Combat', icon:'↩️', name:'Riposte',
      cond:"Réussir 3 contres gagnants dans une même saison.", scope:'season' },

    // --- MACHINE (5) ---
    { id:'impeccable', cat:'Machine', icon:'✨', name:'Impeccable',
      cond:"Traverser une saison sans descendre sous 80% d'état.", scope:'season' },
    { id:'on_knees', cat:'Machine', icon:'🩹', name:'Sur les Rotules',
      cond:"Gagner un combat entamé sous 30% d'état.", scope:'fight' },
    { id:'unbreakable', cat:'Machine', icon:'🔩', name:'Increvable',
      cond:"Traverser une saison sans effectuer la moindre réparation.", scope:'season',
      warn:"Vingt combats sans passer à l'atelier. Votre machine finira en morceaux, et elle peut ne pas finir du tout." },
    { id:'transfer', cat:'Machine', icon:'🧠', name:'Transfert',
      cond:"Effectuer un transfert mémoire.", scope:'career' },
    { id:'faithful', cat:'Machine', icon:'⚓', name:'Fidèle au Poste',
      cond:"Terminer une carrière sans aucun transfert mémoire.", scope:'career',
      warn:"Reconstruire le même modèle de châssis reste un transfert." },

    // --- ÉCONOMIE (4) ---
    { id:'pocket_money', cat:'Économie', icon:'💰', name:'Argent de Poche',
      cond:"Cores gagnés, toutes carrières terminées confondues.",
      scope:'cumul', counter:'cores', tiers:[150000,300000,500000,1000000,2000000] },
    { id:'broke', cat:'Économie', icon:'🪙', name:'Sur la Paille',
      cond:"Passer sous zéro Core.", scope:'career' },
    { id:'red_end', cat:'Économie', icon:'🩸', name:'Le Rouge au Front',
      cond:"Terminer une carrière avec un solde négatif.", scope:'career' },
    { id:'loyalty', cat:'Économie', icon:'🤝', name:'Loyauté',
      cond:"Ne jamais changer de sponsor d'une carrière entière.", scope:'career' },
    { id:'dropped', cat:'Économie', icon:'📄', name:'Remercié',
      cond:"Être lâché par un sponsor.", scope:'career' },

    // --- RELATION AVEC L'IA (5) ---
    { id:'inseparable', cat:'Relation IA', icon:'💞', name:'Inséparables',
      cond:"Atteindre 100% de lien avec son robot.", scope:'career' },
    { id:'who_are_you', cat:'Relation IA', icon:'❓', name:'Qui êtes-vous ?',
      cond:"Terminer une carrière avec moins de 20% de lien.", scope:'career' },
    { id:'baptism', cat:'Relation IA', icon:'🏷️', name:'Le Baptême',
      cond:"Baptiser son robot.", scope:'career' },
    { id:'honest', cat:'Relation IA', icon:'🛡️', name:'Intègre',
      cond:"Refuser un combat truqué.", scope:'career' },
    { id:'sold_out', cat:'Relation IA', icon:'💸', name:'Vendu',
      cond:"Accepter un combat truqué.", scope:'career' },

    // --- RIVALITÉ (5) ---
    { id:'at_last', cat:'Rivalité', icon:'🎯', name:'Enfin',
      cond:"Battre son rival pour la première fois.", scope:'career' },
    { id:'nemesis', cat:'Rivalité', icon:'😈', name:'Bête Noire',
      cond:"Remporter tous ses duels contre le rival sur une carrière.", scope:'career' },
    { id:'punchbag', cat:'Rivalité', icon:'🥊', name:'Souffre-Douleur',
      cond:"Perdre tous ses duels contre le rival sur une carrière.", scope:'career' },
    { id:'useful_foes', cat:'Rivalité', icon:'🤜', name:'Ennemis Utiles',
      cond:"Accepter l'entraînement commun proposé par le rival.", scope:'career' },
    { id:'rival_beyond', cat:'Rivalité', icon:'🚫', name:'Rival sur et en dehors',
      cond:"Refuser l'entraînement commun proposé par le rival.", scope:'career' },

    // --- NOTORIÉTÉ (1) ---
    { id:'spotlight', cat:'Notoriété', icon:'🌟', name:'Sous les Projecteurs',
      cond:"Followers atteints sur une même carrière.",
      scope:'career', counter:'followers', tiers:[10000,50000,100000,250000,500000] },

    // --- FIN DE CARRIÈRE (3) ---
    { id:'no_regret', cat:'Fin de carrière', icon:'🕊️', name:'Sans Regret',
      cond:"Refuser le combat à mort réclamé par la foule.", scope:'career' },
    { id:'immortal', cat:'Fin de carrière', icon:'♾️', name:"L'Immortel",
      cond:"Accepter le combat à mort et le remporter.", scope:'career' },
    { id:'last_round', cat:'Fin de carrière', icon:'⚰️', name:'Dernier Round',
      cond:"Accepter le combat à mort et y être détruit.", scope:'career' },

    // --- MULTI-CARRIÈRES (7) ---
    { id:'legendary_chip', cat:'Multi-carrières', icon:'🏅', name:'Puce IA Légendaire',
      cond:"Réunir les 20 puces IA.", scope:'cumul' },
    { id:'collector', cat:'Multi-carrières', icon:'🗂️', name:'Collectionneur',
      cond:"Avoir mené une carrière au bout avec les quatre châssis.",
      scope:'cumul', counter:'chassisPlayed' },
    { id:'not_scared', cat:'Multi-carrières', icon:'😤', name:'Même pas peur',
      cond:"Accepter le combat à mort trois carrières de suite.",
      scope:'cumul', counter:'dmStreak' },
    { id:'again', cat:'Multi-carrières', icon:'🔁', name:'Encore ?',
      cond:"Entamer une deuxième carrière.", scope:'cumul' },
    { id:'pantheon', cat:'Multi-carrières', icon:'🏛️', name:'Panthéon',
      cond:"Inscrire cinq carrières au Hall of Fame.",
      scope:'cumul', counter:'careersDone' },
    { id:'marathon', cat:'Multi-carrières', icon:'🏃', name:'Marathon',
      cond:"Disputer 1 000 combats, toutes carrières terminées confondues.",
      scope:'cumul', counter:'fights' },
    { id:'all_paths', cat:'Multi-carrières', icon:'🧭', name:'Toutes les Voies',
      cond:"Obtenir Sans Regret, L'Immortel et Dernier Round.", scope:'cumul' },

    // --- CACHÉS (5) ---
    { id:'phantom', cat:'Cachés', icon:'👁️', name:'Fantôme', hidden:true,
      cond:"Traverser une saison sans jamais consulter le classement.", scope:'season' },
    { id:'old_demons', cat:'Cachés', icon:'🕰️', name:'Vieux Démons', hidden:true,
      cond:"Retrouver en Légendaire un robot déjà croisé en Amateur, même carrière.", scope:'career' },
    { id:'triple_dose', cat:'Cachés', icon:'⚡', name:'Triple Dose', hidden:true,
      cond:"Utiliser les trois atouts dans un même combat.", scope:'fight' },
    { id:'on_the_wire', cat:'Cachés', icon:'🪡', name:'Sur le Fil', hidden:true,
      cond:"Gagner un combat avec 1% de structure restante.", scope:'fight' },
    { id:'cold_blood', cat:'Cachés', icon:'🧊', name:'Sang Froid', hidden:true,
      cond:"Perdre les deux premiers rounds du combat final et le remporter.", scope:'fight' }
  ],

  // Ordre d'affichage des catégories dans l'écran Trophées
  TROPHY_CATS: ['Progression','Carrière','Combat','Machine','Économie',
                'Relation IA','Rivalité','Notoriété','Fin de carrière',
                'Multi-carrières','Cachés'],

  EVENTS: [

    // ==================== 🔧 MÉCANIQUE (10) ====================
    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Fissure structurelle',
      tags:['Cores','État'],
      text:"Votre mécanicien-chef vous appelle à deux heures du matin. Il n'a pas voulu attendre le lendemain. Sous les projecteurs de l'atelier, il fait courir son doigt le long du châssis principal : une ligne plus sombre que le métal, fine comme un cheveu, qui part du logement de la hanche et remonte vers le plastron. Elle ne se voit pas en combat. Elle ne se sent pas encore. Mais il l'a trouvée, et il vous regarde en attendant que vous décidiez.",
      choices:[
        { t:"Faire réparer immédiatement, quel qu'en soit le prix",
          out:"L'équipe travaille jusqu'à l'aube. La fissure est ouverte, nettoyée, comblée, renforcée par une plaque soudée par l'intérieur. À sept heures, votre robot sort du hangar comme neuf et le mécanicien-chef s'endort sur une chaise.",
          fx:{ cores:-1400, state:8, aff:4, trait:'soigneux' } },
        { t:"Laisser courir, ça tiendra bien une saison",
          out:"Vous refermez le capot. Le mécanicien ne dit rien, range ses outils plus lentement que d'habitude. Votre robot n'a rien dit non plus — mais il a enregistré la décision, avec l'heure.",
          fx:{ state:-6, aff:-4, trait:'negligent' },
          deferred:{ in:4, scope:'season', warn:true, fx:{ state:-24 },
            text:"La fissure cède en plein round. Le flanc s'ouvre sur toute sa longueur dans un bruit que la foule entend depuis les gradins. Votre mécanicien-chef vous l'avait montrée à deux heures du matin." } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Composant rare',
      tags:['Cores','Stats'],
      text:"Le ferrailleur vous reçoit dans un hangar sans enseigne, à l'écart du circuit. Il pose la mallette sur un établi couvert de graisse et l'ouvre : un stabilisateur gyroscopique de génération militaire, encore dans son emballage d'origine, avec un numéro de série poncé. Il ne dit pas d'où il vient. Il annonce un prix, croise les bras, et attend.",
      choices:[
        { t:"Acheter la pièce sans poser de questions",
          out:"La pièce s'intègre en une matinée, comme si elle avait été faite pour votre châssis. Votre robot gagne un équilibre qu'il n'avait jamais eu — et vous, une question que vous avez décidé de ne pas creuser.",
          fx:{ cores:-1500, stat:'vit', statVal:2, followers:-200 } },
        { t:"Refuser, on ne sait pas d'où elle vient",
          out:"Vous déclinez poliment. Le ferrailleur revient trois semaines plus tard avec une pièce d'origine certifiée, moins performante mais traçable, à prix coûtant.",
          fx:{ cores:-600, stat:'vit', statVal:1, aff:2, trait:'integre' } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Surchauffe répétée',
      tags:['Cores','Stats','État'],
      text:"Depuis trois combats, la télémétrie raconte toujours la même histoire : le robot part bien, tient le premier round, et perd un dixième de seconde à chaque échange à partir du deuxième. Le circuit de refroidissement ne suit plus. Votre mécanicien-chef a étalé les relevés sur l'établi et les a alignés côte à côte pour que vous voyiez la courbe. Elle descend, à chaque fois, au même endroit.",
      choices:[
        { t:"Refonte complète du circuit de refroidissement",
          out:"Deux jours d'immobilisation, une facture que le comptable a lue deux fois. Mais le robot ne surchauffe plus, et il termine désormais ses séances aussi vif qu'il les commence.",
          fx:{ cores:-1300, stat:'res', statVal:1, state:5 } },
        { t:"Ajouter un ventilateur d'appoint bricolé",
          out:"Un ventilateur de camion, une équerre, quatre boulons. Ça tient, c'est laid, ça fait un bruit de scie. Votre mécanicien n'a pas voulu signer la fiche d'intervention.",
          fx:{ cores:-350, state:2 },
          deferred:{ in:3, scope:'season', warn:true, fx:{ state:-14 },
            text:"Le montage de fortune lâche en plein combat. La température grimpe d'un coup, les servomoteurs se mettent en sécurité au pire moment. Quatre boulons et une équerre, c'était le devis." } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Le vieux mécano',
      tags:['Stats','Conscience IA'],
      text:"Il attend devant le hangar depuis une heure, une caisse à outils en cuir posée à ses pieds. Il a travaillé sur le circuit pendant trente ans, il est à la retraite depuis dix, et il ne veut pas d'argent. Il dit juste que votre machine lui rappelle quelque chose, sans préciser quoi. Les jeunes de l'équipe le regardent comme on regarde un fantôme.",
      choices:[
        { t:"Le laisser travailler sur le robot",
          out:"Il passe la journée entière dans le hangar, assis sur un tabouret, à régler les vérins un par un en parlant à voix basse. Personne n'ose l'interrompre. En repartant, il ramasse sa caisse et dit simplement : « Elle écoute, celle-là. »",
          fx:{ stat:'int', statVal:2, aff:8, trait:'ouvert' } },
        { t:"Décliner, on ne confie pas sa machine à un inconnu",
          out:"Il n'insiste pas. Il regarde votre robot une dernière fois, longuement, puis reprend sa caisse et s'en va à pied. Votre mécanicien-chef, piqué au vif, refait tous les réglages lui-même pendant le week-end.",
          fx:{ state:4, aff:-2 } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Panne en plein entraînement',
      tags:['Cores','État','Conscience IA'],
      text:"Le bras porteur lâche au milieu d'une série. Votre robot part en avant, corrige seul, se rattrape sur une jambe et repose le bras mort le long du châssis sans qu'on lui demande rien. Personne n'a été touché. Le diagnostic tombe une heure plus tard : la pièce d'origine a rendu l'âme, elle était vieillissante. Les autres pièces de la transmission ont encaissé exactement le même nombre d'heures de combat.",
      choices:[
        { t:"Remplacer toute la chaîne de transmission",
          out:"Le travail prend trois jours et coûte ce qu'il coûte. Ensuite, votre robot teste le nouveau bras pendant une heure entière — lentement, méthodiquement, à toutes les amplitudes, comme s'il réapprenait à s'en servir.",
          fx:{ cores:-1400, state:10, aff:5, trait:'soigneux' } },
        { t:"Remplacer juste la pièce cassée",
          out:"Réparation minimale, budget préservé, machine opérationnelle le soir même. Le reste de la transmission restera d'origine avec un nombre d'heures affolant, et tout le monde dans l'atelier le sait.",
          fx:{ cores:-600, state:3 },
          persist:{ until:'season', wearMult:1.12, label:"Transmission d'origine" } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Pièce défectueuse',
      tags:['Cores','État','Sponsor'],
      text:"Votre mécanicien-chef vous attend à l'atelier depuis une heure. Sur l'établi, l'articulation d'épaule montée la semaine dernière est ouverte en deux : le métal a fatigué là où il n'aurait jamais dû, après six combats. Le fournisseur, lui, a répondu par courrier. Il parle d'une « utilisation non conforme » et refuse d'entendre autre chose.",
      choices:[
        { t:"Exiger un remplacement et perdre du temps",
          out:"Trois semaines de bras de fer, deux courriers d'avocat, une pièce neuve obtenue gratuitement. Pendant ce temps le robot s'est entraîné avec l'ancienne, bridée à mi-régime.",
          fx:{ cores:-200, state:-4, stat:'pui', statVal:-1, trait:'integre' } },
        { t:"Réparer avec les moyens du bord",
          out:"Votre mécanicien reprend la soudure lui-même, renforce l'intérieur, et signe la fiche. « Ça tiendra ce que ça tiendra, mais au moins je sais ce qu'il y a dedans. »",
          fx:{ cores:-900, state:4, aff:3 } },
        { t:"Continuer avec, et voir jusqu'où ça tient",
          out:"Vous refermez l'épaule et vous alignez le robot au combat suivant. Le fournisseur avait peut-être raison. Peut-être.",
          fx:{ aff:-6, trait:'negligent' },
          deferred:{ in:2, scope:'season', warn:true, fx:{ state:-26 },
            text:"L'épaule lâche en plein échange. Le bras retombe et ne remonte plus. Le fournisseur parlait d'une utilisation non conforme ; vous avez choisi de le croire." } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:"Nuit blanche à l'atelier",
      tags:['Cores','Sponsor','État'],
      text:"Trois combats en dix jours, deux réparations lourdes, et l'équipe n'a pas dormi plus de quatre heures d'affilée depuis une semaine. Votre mécanicien-chef fait tomber une clé pour la troisième fois de la matinée et la ramasse sans rien dire. Le planning de la fédération ne bougera pas. Le vôtre, si.",
      choices:[
        { t:"Payer des renforts pour la fin de saison",
          out:"Deux techniciens en plus, embauchés à la semaine. Le budget en prend un coup mais l'atelier respire, et le travail redevient propre.",
          fx:{ cores:-1800, state:6, satis:4 } },
        { t:"Imposer trois jours d'arrêt complet",
          out:"Le hangar reste fermé. Le sponsor s'agace de voir le robot immobile alors que le classement se joue. L'équipe, elle, revient entière.",
          fx:{ satis:-9, state:4, aff:5, trait:'protecteur' } },
        { t:"Serrer les dents, la saison est courte",
          out:"Personne ne se plaint. Mais à partir de ce jour-là, chaque intervention prend plus longtemps et coûte plus cher, parce qu'on reprend deux fois ce qu'on faisait bien du premier coup.",
          fx:{ aff:-4 },
          persist:{ until:'season', repairMult:1.20, label:"Mécanicien surmené" } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Le bruit',
      tags:['Cores','État'],
      text:"Il y a un bruit. Un claquement sec, irrégulier, quelque part dans la moitié basse du châssis, qui n'apparaît qu'à pleine charge. Deux journées de démontage n'ont rien donné : les vérins sont bons, les fixations sont bonnes, la structure est bonne. Le bruit est là quand même. Votre mécanicien-chef commence à en faire une affaire personnelle.",
      choices:[
        { t:"Payer un banc de diagnostic professionnel",
          out:"Six heures sur le banc d'une écurie voisine, à prix d'or. Le défaut est trouvé en quarante minutes : un jeu de deux dixièmes dans un axe de hanche. Corrigé le soir même.",
          fx:{ cores:-2200, state:7, stat:'res', statVal:1 } },
        { t:"Démonter tout le bas du châssis à l'aveugle",
          out:"Deux jours de plus, l'équipe entière dessus, et ils finissent par le trouver. Le robot est remonté correctement, mais il n'a pas touché un mannequin de la semaine.",
          fx:{ cores:-500, state:3, stat:'pui', statVal:-1 } },
        { t:"Vivre avec, ça n'a rien cassé jusqu'ici",
          out:"Le bruit fait maintenant partie du décor. Les mécaniciens ne relèvent même plus la tête quand il claque.",
          fx:{ aff:-3, trait:'negligent' },
          deferred:{ in:5, scope:'season', warn:true, fx:{ state:-20 },
            text:"L'axe de hanche cède au milieu d'un appui. Le robot s'effondre sur le côté avant d'avoir compris. Le bruit, c'était ça." } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Blindage de récupération',
      tags:['Cores','Stats','État'],
      text:"Une écurie de la ligue vient de fermer. Tout part aux enchères, et il y a là un jeu de plaques de blindage à peine utilisé, compatible avec votre châssis, à un tiers du prix du neuf. Le lot vient de la machine qui a été détruite en fin de saison dernière. Personne n'en parle, mais tout le monde le sait.",
      choices:[
        { t:"Acheter le lot complet",
          out:"Le blindage est monté en deux jours. Il est excellent. Sur une plaque, à l'intérieur, il reste un numéro de licence gravé que personne ne s'est donné la peine d'effacer.",
          fx:{ cores:-1100, stat:'res', statVal:2, state:5, aff:-5 } },
        { t:"N'acheter que les plaques neuves du lot",
          out:"Vous triez. Il n'y en a que quatre d'intactes, jamais montées. Ça coûte plus cher au kilo, mais elles ne viennent de nulle part.",
          fx:{ cores:-1400, stat:'res', statVal:1, state:2 } },
        { t:"Passer, il y a des choses qu'on n'achète pas",
          out:"Le lot part ailleurs. Votre fournisseur habituel, informé que vous avez refusé du matériel de provenance douteuse, vous accorde une remise durable sur le neuf.",
          fx:{ cores:-700, stat:'res', statVal:1, aff:7, trait:'integre' },
          persist:{ until:'season', repairMult:0.90, label:"Fournisseur reconnaissant" } }
      ] },

    { cat:'meca', icon:'🔧', catName:'Mécanique', title:'Réglage hors tolérance',
      tags:['Stats','État','Conscience IA'],
      text:"Votre mécanicien-chef vous montre une note de calcul qu'il a faite seul, le soir. En sortant les vérins de leurs tolérances constructeur, on gagnerait de la puissance de frappe — significativement. Le constructeur a fixé ces limites pour une raison, mais il les a fixées pour une machine qui doit durer quinze ans, pas quinze saisons.",
      choices:[
        { t:"Pousser les vérins hors tolérance",
          out:"Le gain est immédiat et se voit dès la première séance : les frappes portent plus loin, plus fort. Le prix se paiera plus tard, un peu à chaque combat.",
          fx:{ stat:'pui', statVal:3, aff:-3 },
          persist:{ until:'career', wearMult:1.18, label:"Vérins hors tolérance" } },
        { t:"Rester dans les limites constructeur",
          out:"Vous refermez le dossier. Le mécanicien le range sans discuter — il vous l'a soumis, c'était son travail ; vous avez tranché, c'était le vôtre.",
          fx:{ state:3, aff:4, trait:'soigneux' } },
        { t:"Demander son avis au robot",
          out:"La réponse arrive après un délai inhabituel : « Je peux encaisser. Je préfère savoir avant. » Vous poussez les vérins, mais à mi-chemin seulement, et il le sait.",
          fx:{ stat:'pui', statVal:1, aff:12, trait:'ouvert' } }
      ] },

    // ==================== 🏢 SPONSOR (9) ====================
    // ⚠️ Filtrés par canDrop : jamais en Garage indépendant ni Underground
    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:'Exigence de résultats',
      tags:['Sponsor','Cores'],
      text:"La convocation arrive par courrier, pas par téléphone. Salle de réunion au douzième étage, quatre personnes en face de vous, un écran mural où défilent vos chiffres : combats disputés, victoires, coût de l'entretien, retombées médiatiques. Le directeur du sponsoring laisse le tableau affiché pendant tout le silence qui suit. Puis il vous demande, très poliment, sur quoi vous vous engagez pour la fin de la saison.",
      choices:[
        { t:"Promettre des résultats et accepter la pression",
          out:"Poignées de main, sourires calibrés, le contrat reconduit avec une prime immédiate. Sur le chemin du retour vous relisez le chiffre que vous venez d'annoncer, et vous vous demandez comment vous allez le tenir.",
          fx:{ satis:14, cores:1200 } },
        { t:"Rappeler que le robot passe avant les chiffres",
          out:"Silence gêné dans la salle, un des quatre note quelque chose. Votre position est enregistrée. Votre robot, qui attendait dans le camion, l'a entendue aussi quand vous l'avez répétée à voix haute au volant.",
          fx:{ satis:-12, aff:9, trait:'protecteur' } }
      ] },

    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:'Campagne publicitaire',
      tags:['Cores','Followers','Conscience IA'],
      text:"Le service marketing a loué un studio et bloqué trois jours. Le storyboard est déjà validé : votre robot en contre-plongée, poing serré, sous une lumière bleue, avec une phrase d'accroche qui n'a rien à voir avec le combat. Trois jours à répéter huit poses, à recommencer parce que l'angle du bras n'est pas assez héroïque, à attendre entre les prises.",
      choices:[
        { t:"Accepter le tournage",
          out:"Trois jours sous les projecteurs. L'argent tombe le soir même, les followers affluent dans la semaine. Votre robot a exécuté chaque pose au millimètre, sans un mot, et n'a rien enregistré dans ses journaux de bord ce jour-là. Rien du tout.",
          fx:{ cores:1800, followers:4200, satis:10, aff:-5, trait:'arrogant' } },
        { t:"Refuser, ce n'est pas un mannequin",
          out:"Le studio est annulé la veille, le marketing furieux, la facture d'annulation pour vous. Votre robot retourne à l'entraînement sans commentaire — et signe ce jour-là ses meilleurs temps du mois.",
          fx:{ satis:-10, followers:-800, cores:-300, aff:8, trait:'protecteur' } }
      ] },

    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:'Prime exceptionnelle',
      tags:['Cores','Sponsor'],
      text:"L'enveloppe n'était prévue nulle part au contrat. Le sponsor a regardé vos trois derniers résultats, calculé ce que ça lui a rapporté en visibilité, et débloqué une somme sans que vous ayez rien demandé. Le courrier tient en une ligne : « Continuez. » Le comptable, lui, a déjà sorti trois calculatrices.",
      choices:[
        { t:"Investir l'intégralité dans la machine",
          out:"Chaque Core part dans l'entretien et les améliorations, rien ne reste sur le compte. Le sponsor reçoit le détail des dépenses et apprécie le sérieux — c'est exactement ce qu'il espérait lire.",
          fx:{ cores:1300, satis:8, state:6, aff:5 } },
        { t:"Garder la somme en réserve",
          out:"L'argent dort sur le compte et n'en bouge pas. Il reste douze combats à disputer et on ne sait jamais ce qu'une saison réserve. Le comptable approuve, le sponsor ne dit rien.",
          fx:{ cores:1800 } }
      ] },

    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:'Défi sponsor',
      tags:['Cores','Sponsor'],
      text:"Le directeur marketing a eu une idée, et il en est visiblement très content : le prochain combat, en direct, gagné sans utiliser un seul atout. Il a déjà prévu la campagne autour, le hashtag, la prime. Il n'a pas prévu ce qui se passe si le robot perd, mais il assure que ça fera « une histoire quand même ».",
      choices:[
        { t:"Relever le défi",
          out:"Le pari est annoncé publiquement avant même votre accord définitif. Votre robot devra s'en sortir avec ses seuls moyens, comme au tout premier combat de sa carrière.",
          fx:{ satis:10, challenge:'noAtout' } },
        { t:"Décliner, on ne joue pas avec un combat",
          out:"Vous refusez de conditionner un combat à une opération de communication. Le directeur note le refus ; l'équipe technique, elle, prépare le combat normalement, avec tous ses moyens.",
          fx:{ satis:-7, atoutBonus:1 } }
      ] },

    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:"Clause d'image",
      tags:['Sponsor','Stats','Conscience IA'],
      text:"Une clause de quatorze lignes, page neuf, que personne n'a lue attentivement à la signature. Elle accorde au sponsor un droit de regard sur les paramètres de combat de la machine. Ils l'invoquent aujourd'hui, avec un jeu de réglages tout prêt fourni par leur propre bureau d'études : plus agressif, moins de retenue, un profil de combat qui « correspond mieux à l'image de la marque ».",
      choices:[
        { t:"Se plier au réglage imposé",
          out:"Les paramètres sont chargés en vingt minutes. Le robot frappe plus fort et se protège moins. À l'entraînement, ses mouvements sont justes, précis, et ne ressemblent plus tout à fait aux siens.",
          fx:{ satis:12, stat:'pui', statVal:1, aff:-8, trait:'soumis' } },
        { t:"Contester la clause",
          out:"Deux cabinets d'avocats, six semaines, une facture. Vous gardez la main sur votre machine et la clause saute au prochain avenant. La relation, elle, ne redeviendra jamais tout à fait la même.",
          fx:{ satis:-15, cores:-700, aff:10, trait:'protecteur' } }
      ] },

    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:'Le sponsor du rival',
      tags:['Cores','Sponsor','Followers'],
      text:"L'offre arrive par un intermédiaire, discrètement, un soir de semaine. Le groupe qui finance votre rival veut aussi votre machine — les deux sous le même logo, la rivalité vendue comme un feuilleton. Le montant est très supérieur à votre contrat actuel. Ce qui n'est écrit nulle part, c'est que le calendrier de communication serait décidé chez eux, pour deux robots à la fois.",
      choices:[
        { t:"Accepter et signer",
          out:"La signature fait la une des journaux spécialisés. L'argent est réel, la visibilité aussi. Votre rival, lui, n'a pas été consulté — et il l'a très mal pris.",
          fx:{ cores:6500, satis:15, followers:5800, rivalAnger:true, trait:'arrogant' } },
        { t:"Refuser et rester où vous êtes",
          out:"Vous déclinez sans négocier. Votre sponsor actuel apprend l'offre trois jours plus tard, par la presse, et comprend ce que vous avez refusé.",
          fx:{ satis:18, aff:6, trait:'fidele' } },
        { t:"Faire monter les enchères chez votre sponsor actuel",
          out:"La manœuvre fonctionne : votre contrat est revalorisé dans la semaine. Elle laisse aussi une trace — on sait maintenant que vous êtes prenable.",
          fx:{ cores:1600, satis:-6, trait:'arrogant' } }
      ] },

    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:'Le logo sur le plastron',
      tags:['Cores','Sponsor','Conscience IA'],
      text:"Le nouveau plan média prévoit un logo pleine surface sur le plastron, imprimé à chaud, à la place de la plaque d'identification du robot — son numéro de licence, son nom, la ligne gravée le jour du baptême. Le service com parle de « surface premium ». Techniquement, ça ne change rien. Le mécanicien-chef vous a demandé deux fois si vous étiez sûr.",
      choices:[
        { t:"Accepter le logo pleine surface",
          out:"La plaque est déposée et rangée dans un tiroir de l'atelier. Le logo est superbe, visible depuis les dernières rangées. Votre robot ne s'est pas regardé dans la vitre du hangar de la semaine.",
          fx:{ cores:2400, satis:12, followers:3000, aff:-14, trait:'soumis' } },
        { t:"Proposer le logo sur le dos et les bras",
          out:"Négociation de trois jours, accord trouvé. Moins d'argent, presque autant de visibilité, et la plaque reste où elle est.",
          fx:{ cores:1200, satis:4, followers:1800, aff:4 } },
        { t:"Refuser tout net",
          out:"Le service com note « partenaire difficile » dans son compte-rendu. Votre robot garde son nom sur le plastron, à l'endroit où il a toujours été.",
          fx:{ satis:-11, aff:13, trait:'protecteur' } }
      ] },

    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:'Retard de versement',
      tags:['Cores','Sponsor'],
      text:"Le virement mensuel n'est pas arrivé. Ni le suivant. Le service comptable du sponsor évoque une « réorganisation interne » et ne donne aucune date. Votre propre comptable a posé le tableau de trésorerie sur la table : sans cet argent, l'atelier tient six semaines, et il reste huit combats à disputer.",
      choices:[
        { t:"Relancer fermement, jusqu'en haut s'il le faut",
          out:"Trois appels, un courrier recommandé, un rendez-vous imposé. L'argent tombe la semaine suivante, en une fois. Vous n'êtes plus tout à fait le partenaire commode qu'ils appréciaient.",
          fx:{ cores:2000, satis:-9 } },
        { t:"Attendre sans faire de vagues",
          out:"Vous ne dites rien et vous puisez dans la réserve. Le sponsor apprécie la discrétion et le fera savoir en fin de saison. En attendant, l'atelier serre tout.",
          fx:{ cores:-1200, satis:10 },
          persist:{ until:'season', repairMult:1.15, label:"Trésorerie tendue" } },
        { t:"Chercher un complément ailleurs",
          out:"Un partenaire local accepte de couvrir une partie des frais contre un autocollant sur le camion. Ce n'est pas glorieux, ça remplit le trou, et votre sponsor principal l'apprendra tôt ou tard.",
          fx:{ cores:900, satis:-5, followers:700 } }
      ] },

    { cat:'sponsor', icon:'🏢', catName:'Sponsor', title:'Le successeur',
      tags:['Sponsor','Cores','Followers'],
      text:"Votre interlocuteur historique chez le sponsor part à la retraite. C'est lui qui avait cru en vous quand personne ne connaissait votre nom, lui qui avait fait passer les deux premières factures de réparation en force. Son remplaçant a trente ans, un plan de rationalisation sous le bras, et une première question : pourquoi le budget d'entretien de votre machine est-il si élevé par rapport à la moyenne du portefeuille ?",
      choices:[
        { t:"Défendre le dossier chiffres en main",
          out:"Vous arrivez avec les relevés, les comparatifs, le coût d'une destruction évitée. Il écoute, prend des notes, valide le budget. La relation sera professionnelle et rien d'autre.",
          fx:{ satis:8, cores:-300 } },
        { t:"Accepter une réduction du budget d'entretien",
          out:"Le nouveau plan est signé. Les chiffres sont meilleurs sur son tableau. Ils le seront moins sur la structure du robot, dans quelques combats.",
          fx:{ satis:14, cores:1400, aff:-6 },
          persist:{ until:'season', repairMult:1.25, label:"Budget d'entretien réduit" } },
        { t:"Parler de l'ancien plutôt que des chiffres",
          out:"Il vous écoute jusqu'au bout, poliment, puis reprend son tableau. Mais il valide l'ancien budget pour cette saison, « le temps de prendre ses marques ».",
          fx:{ satis:-4, aff:7, cores:800 } }
      ] },

    // ==================== 🧠 CONSCIENCE IA (8) ====================
    { cat:'ia', icon:'🧠', catName:'Conscience IA', title:'Première question',
      tags:['Conscience IA','Followers'],
      text:"Le combat est fini depuis deux heures. Vous rangez les outils, le hangar est vide, il ne reste que la lumière de l'établi et le ronronnement du robot en veille. Une ligne s'affiche sur le terminal. Ce n'est pas un rapport de diagnostic, ce n'est pas un code d'erreur, et rien dans son programme ne prévoit qu'il écrive de lui-même à cette heure-là. C'est une question : « Pourquoi est-ce que je me bats ? »",
      choices:[
        { t:"Répondre honnêtement : pour devenir une légende",
          out:"Le curseur clignote longtemps, bien plus longtemps qu'un temps de calcul. Puis : « Compris. Alors devenons-en une. » Vous n'aviez jamais vu votre robot employer le pluriel.",
          fx:{ aff:14, followers:2200, stat:'int', statVal:1, trait:'fidele' } },
        { t:"Répondre : parce que c'est ta fonction",
          out:"La réponse s'affiche après un délai anormalement long : « Compris. » Le terminal s'éteint de lui-même, sans commande de votre part.",
          fx:{ aff:-9, stat:'pui', statVal:1, trait:'distant' } },
        { t:"Ne pas répondre et refermer le capot",
          out:"Vous coupez le terminal. La question reste dans les journaux de bord, horodatée, sans réponse. Elle y sera encore dans dix saisons.",
          fx:{ aff:-5, state:3 } }
      ] },

    { cat:'ia', icon:'🧠', catName:'Conscience IA', title:"Refus d'ordre",
      tags:['Conscience IA','Stats'],
      text:"Le mannequin d'entraînement n'a plus de bras, plus de torse, plus rien qui ressemble à une cible. Vous ordonnez la série suivante quand même : c'est le protocole, il reste douze frappes au programme. Votre robot lève le poing, le maintient en l'air pendant deux secondes entières, puis le baisse. Il ne bouge plus. Aucune erreur ne s'affiche sur le terminal.",
      choices:[
        { t:"Insister et forcer l'exécution",
          out:"Il obéit. Les douze frappes sont exécutées, mécaniquement, parfaitement, sans une once de conviction. Quelque chose s'est refermé ce jour-là et n'a plus jamais rouvert.",
          fx:{ aff:-12, stat:'pui', statVal:1, trait:'soumis' } },
        { t:"Accepter son refus et arrêter la séance",
          out:"Vous coupez l'entraînement avec deux heures d'avance. Il vous regarde partir sans bouger. Le lendemain matin, ses temps de réaction sont les meilleurs jamais enregistrés sur cette machine.",
          fx:{ aff:16, stat:'int', statVal:1, followers:1800, trait:'libre' } }
      ] },

    { cat:'ia', icon:'🧠', catName:'Conscience IA', title:'Les journaux de nuit',
      tags:['Stats','Conscience IA'],
      text:"Vous consultez les logs de veille par curiosité, un dimanche. Ce que vous y trouvez ne devrait pas exister : chaque nuit, pendant six à huit heures, votre robot rejoue ses combats perdus. Pas une fois — des milliers de fois, en modifiant une seule variable à chaque itération. Distance d'engagement, timing de garde, angle d'appui. Il cherche, tout seul, dans le noir.",
      choices:[
        { t:"Le laisser faire",
          out:"Vous ne dites rien et vous ne touchez à rien. Les simulations continuent chaque nuit. Ses réflexes s'affûtent d'une manière que vous n'aviez jamais programmée et que vous ne sauriez pas reproduire.",
          fx:{ stat:'int', statVal:2, aff:7, trait:'libre' },
          persist:{ until:'career', flag:'nightSim', label:"Simulations nocturnes" } },
        { t:"Bloquer l'accès aux archives de combat",
          out:"Vous coupez la boucle et verrouillez les archives. Il dormira, désormais. Vraiment. Ses temps de recharge sont excellents, ses cycles de maintenance parfaits.",
          fx:{ aff:-8, state:6, trait:'controlant' } }
      ] },

    { cat:'ia', icon:'🧠', catName:'Conscience IA', title:'Le doute',
      tags:['Conscience IA','Followers'],
      text:"Vingt minutes avant l'entrée en arène. Le robot est prêt, les vérifications sont faites, l'équipe attend le signal. Un message court arrive sur votre terminal, envoyé depuis le box, à trois mètres de vous : « Si je perds, est-ce que vous me remplacerez ? »",
      choices:[
        { t:"Jamais. Tu es le seul.",
          out:"Aucune réponse ne s'affiche. Mais ce soir-là, il se bat comme une machine qui n'a plus rien à perdre et tout à prouver, et l'arène entière le voit.",
          fx:{ aff:15, followers:1600, trait:'fidele', nextFight:{ perf:0.08 } } },
        { t:"Ça dépendra de tes résultats.",
          out:"« Compris. » Deux mots, envoyés en moins d'un dixième de seconde. Le combat qui suit est d'une froideur clinique : efficace, propre, et vide.",
          fx:{ aff:-11, trait:'distant', nextFight:{ dmg:0.06, affFreeze:true } } }
      ] },

    { cat:'ia', icon:'🧠', catName:'Conscience IA', title:"Le nom qu'il s'est donné",
      tags:['Conscience IA','Followers'],
      text:"En reprenant les fichiers de configuration, vous tombez sur un champ que vous n'avez pas créé. À l'intérieur, une chaîne de caractères : un nom. Ce n'est pas celui que vous lui avez donné au baptême. Il est daté de six semaines, écrit après une défaite, et il n'a jamais été utilisé nulle part dans le système. Il est là, c'est tout.",
      choices:[
        { t:"L'interroger sur ce nom",
          out:"La réponse met du temps. « C'est celui que j'utilise quand je pense à moi. » Vous n'aviez pas prévu qu'il pense à lui.",
          fx:{ aff:13, stat:'int', statVal:1, trait:'ouvert' } },
        { t:"L'inscrire officiellement à la fédération",
          out:"Le changement est enregistré, les commentateurs s'emparent de l'histoire, le circuit ne parle que de ça pendant une semaine. Votre robot n'a rien dit, mais son temps de réponse aux ordres a baissé de douze pour cent depuis.",
          fx:{ followers:7400, aff:18, stat:'vit', statVal:1, trait:'libre' } },
        { t:"Supprimer le champ",
          out:"Vous effacez la ligne et vous relancez le système. Elle ne réapparaît pas. Rien d'autre ne change — les performances sont identiques, les rapports sont identiques, tout est identique.",
          fx:{ aff:-16, state:4, trait:'controlant' } }
      ] },

    { cat:'ia', icon:'🧠', catName:'Conscience IA', title:'La peur du round trois',
      tags:['Conscience IA','Stats','État'],
      text:"La télémétrie ne ment pas : depuis quatre combats, au troisième round, votre robot recule de dix centimètres avant chaque engagement. Dix centimètres, systématiquement, jamais avant. Rien dans son programme ne le prévoit. Votre mécanicien-chef appelle ça un défaut de calibration. Vous savez tous les deux que ça ressemble à autre chose.",
      choices:[
        { t:"Recalibrer les servos et effacer l'écart",
          out:"La correction est purement technique et fonctionne parfaitement. Le recul disparaît dès la séance suivante. Ce qui le provoquait, lui, n'a pas été traité.",
          fx:{ cores:-900, stat:'vit', statVal:1, aff:-7 },
          deferred:{ in:4, scope:'season', warn:true, fx:{ state:-16 },
            text:"Au troisième round, votre robot se bloque une demi-seconde complète. Pas un recul cette fois : une immobilité totale, en plein échange. Les servos étaient parfaitement calibrés." } },
        { t:"En parler avec lui avant de toucher à quoi que ce soit",
          out:"L'échange dure une heure sur le terminal. Il finit par écrire : « Au troisième round, je sais combien il me reste. » Vous adaptez l'entraînement en conséquence, sur le mental plutôt que sur les vérins.",
          fx:{ stat:'int', statVal:2, aff:14, trait:'ouvert' } },
        { t:"Ne rien faire, dix centimètres ne changent rien",
          out:"Vous refermez le rapport. Dix centimètres, effectivement, ça ne se voit même pas depuis les gradins.",
          fx:{ aff:-4 },
          persist:{ until:'season', flag:'round3Malus', label:"Hésitation au troisième round" } }
      ] },

    { cat:'ia', icon:'🧠', catName:'Conscience IA', title:"Ce qu'il a vu dans l'arène",
      tags:['Conscience IA','Followers','État'],
      text:"Le robot de l'écurie voisine a été détruit hier soir, dans le combat qui précédait le vôtre, sur le même sol. Votre machine attendait dans le couloir d'accès et a tout enregistré : les quarante secondes de démontage, l'équipe qui ramasse, le silence dans les gradins. Depuis, elle refuse de repasser par ce couloir et fait le tour par l'extérieur du bâtiment.",
      choices:[
        { t:"L'obliger à reprendre le couloir",
          out:"Vous le faites passer par là trois fois de suite jusqu'à ce que ça ne provoque plus rien. À la quatrième, plus aucune réaction n'est enregistrée. Le comportement est corrigé.",
          fx:{ aff:-13, stat:'res', statVal:1, trait:'controlant' } },
        { t:"Le laisser faire le tour, ça ne coûte rien",
          out:"Deux minutes de trajet en plus avant chaque combat, personne ne s'en aperçoit. Il entre en arène par l'autre côté et se bat exactement comme avant.",
          fx:{ aff:9 } },
        { t:"Lui montrer les rapports techniques de la destruction",
          out:"Vous passez la soirée à lui expliquer ce qui a lâché sur l'autre machine, pièce par pièce, et pourquoi ça ne peut pas arriver sur la sienne dans son état actuel. Il lit tout. Le lendemain, il reprend le couloir sans qu'on lui demande.",
          fx:{ stat:'int', statVal:2, aff:16, followers:2400, trait:'ouvert' },
          persist:{ until:'career', flag:'lucide', label:"Il connaît ses limites" } }
      ] },

    { cat:'ia', icon:'🧠', catName:'Conscience IA', title:"La question qu'il ne pose pas",
      tags:['Conscience IA'], req:'transfer',
      text:"Depuis le transfert, il fonctionne parfaitement. Les diagnostics sont bons, les temps de réponse excellents, l'intégration du nouveau châssis est complète. Mais il y a un fichier qu'il ouvre chaque nuit depuis la mise en service : les journaux de l'ancien corps. Toujours le même passage, toujours les dernières minutes. Il ne pose aucune question et ne demande rien.",
      choices:[
        { t:"Aborder le sujet le premier",
          out:"« Je ne sais pas si c'est moi qui ai vécu ça. » Vous n'avez pas de réponse à ça, et vous le lui dites. Il écrit : « C'est déjà une réponse. »",
          fx:{ aff:17, stat:'int', statVal:1, trait:'ouvert' } },
        { t:"Effacer les journaux de l'ancien châssis",
          out:"Les fichiers disparaissent. Il ne les cherche pas, ne les réclame pas, ne mentionne rien. Ses performances sont excellentes et le restent.",
          fx:{ aff:-15, state:5, stat:'pui', statVal:1, trait:'controlant' } },
        { t:"Lui donner l'accès complet aux archives",
          out:"Vous lui ouvrez tout : les carrières précédentes, les autres machines, les fins. Il passe trois nuits à lire. Au quatrième jour, il demande à reprendre l'entraînement plus tôt que prévu.",
          fx:{ stat:'int', statVal:3, aff:10, trait:'libre' } }
      ] },

    // ==================== ⚔️ RIVAL (8) ====================
    // Filtrés : saison >= 2
    { cat:'rival', icon:'⚔️', catName:'Rival', title:'Provocation publique', needSameLeague:true,
      tags:['Followers','Conscience IA'],
      text:"L'interview passe en boucle sur les écrans du circuit depuis le matin. Votre rival y est détendu, souriant, parfaitement à l'aise devant la caméra. Il parle de votre machine comme d'une curiosité : un « prototype sympathique mais dépassé », une pièce de musée qu'on aligne encore par nostalgie. Il termine en promettant de le démonter à la première occasion, et le journaliste rit avec lui. Votre robot a l'interview dans ses journaux, horodatée, vue trois fois.",
      choices:[
        { t:"Répondre publiquement, sur le même ton",
          out:"Votre réponse fait le tour du circuit en une nuit. La rivalité quitte l'arène et devient une affaire publique — les deux camps y gagnent, et plus personne ne pourra reculer.",
          fx:{ followers:5200, aff:-3, trait:'arrogant', rivalAnger:true } },
        { t:"Ne pas répondre, laisser parler l'arène",
          out:"Silence radio. Les commentateurs y voient de la classe et le disent à l'antenne. Votre robot, lui, a lu l'interview trois fois — il a juste choisi de ne rien dire.",
          fx:{ followers:1400, aff:6, trait:'humble', nextRival:{ perf:0.10 } } }
      ] },

    // ⚠️ MÉCANIQUE INTOUCHABLE — porte deux trophées
    { cat:'rival', icon:'⚔️', catName:'Rival', title:"Proposition d'alliance", needSameLeague:true,
      tags:['Stats','Followers'],
      text:"La proposition arrive par le directeur technique adverse, en personne, sans intermédiaire : deux semaines d'entraînement commun, données de télémétrie partagées, les deux machines progressent ensemble. Officiellement, c'est pour « élever le niveau du circuit ». En réalité, personne ne sait qui a le plus à y gagner, et c'est bien ce qui rend l'offre intéressante.",
      choices:[
        { t:"Accepter l'entraînement commun",
          out:"Deux semaines côte à côte dans le même hangar. Les deux robots progressent réellement — et se connaissent désormais par cœur, chaque appui, chaque temporisation, chaque réflexe. Pour le meilleur et pour le pire.",
          fx:{ stat:'int', statVal:2, followers:2200, rivalBoost:true }, trophy:'useful_foes' },
        { t:"Refuser, on n'entraîne pas son adversaire",
          out:"Vous déclinez sèchement, devant témoins. Le directeur technique encaisse sans un mot. Votre robot garde ses réflexes pour lui, et personne en face ne saura comment il engage la distance.",
          fx:{ followers:-500, rivalAnger:true, nextRival:{ blind:true } }, trophy:'rival_beyond' }
      ] },

    { cat:'rival', icon:'⚔️', catName:'Rival', title:'Sabotage',
      tags:['Cores','Sponsor','Followers'],
      text:"Votre technicien vous attend à la fin du service, mal à l'aise. On l'a approché sur le parking il y a trois jours : accès au hangar une nuit, une heure, pas plus. Il a refusé sur le moment et il n'a rien dit à personne depuis. Il vous donne le montant qu'on lui a proposé — c'est deux fois son salaire annuel — et il attend de voir ce que vous allez en faire.",
      choices:[
        { t:"Rendre l'affaire publique",
          out:"Le scandale éclate dans la journée. Le rival dément tout, la fédération ouvre une enquête et la referme sans conclure. Le circuit ne parle que de ça, et votre sponsor déteste ce genre de bruit.",
          fx:{ followers:6200, satis:-8, rivalAnger:true } },
        { t:"Régler ça en interne, discrètement",
          out:"Vous augmentez votre technicien sans explication écrite et vous fermez le dossier. Personne n'en saura rien. Lui, désormais, ne quitte plus le hangar sans vérifier deux fois les scellés.",
          fx:{ cores:-1000, satis:5, aff:4 },
          persist:{ until:'career', flag:'hangarSecure', label:"Hangar surveillé" } }
      ] },

    { cat:'rival', icon:'⚔️', catName:'Rival', title:'Face à face imprévu', needSameLeague:true,
      tags:['Conscience IA','Followers'],
      text:"Couloir d'accès aux boxes, deux heures avant la reconnaissance du plateau. Vous croisez votre rival ; sa machine est trois pas derrière lui, à l'arrêt. Les deux robots se détectent en même temps et cessent tout mouvement. Ni l'un ni l'autre ne se met en garde. Ils restent là, face à face, pendant quatorze secondes, pendant que les deux équipes attendent sans savoir quoi faire.",
      choices:[
        { t:"Laisser les deux robots se jauger",
          out:"Personne n'intervient. Puis votre robot incline légèrement la tête, un mouvement de deux degrés que rien ne commandait, et repart. Les caméras du couloir ont tout filmé, et la séquence tourne en boucle le soir même.",
          fx:{ followers:3400, aff:6, stat:'int', statVal:1, trait:'humble' } },
        { t:"Couper court et emmener votre robot",
          out:"Vous tirez sur la chaîne magnétique. Elle n'a aucune force de retenue réelle sur une machine de cette puissance — elle ne tient que parce qu'il accepte qu'elle tienne. Il suit, et tourne la tête une dernière fois.",
          fx:{ aff:-4, trait:'controlant', nextRival:{ enemyPerf:0.06 } } }
      ] },

    { cat:'rival', icon:'⚔️', catName:'Rival', title:'Le fournisseur commun',
      tags:['Cores','Stats'],
      text:"Vous découvrez que votre atelier et celui de votre rival commandent chez le même fabricant de vérins, depuis toujours. Le commercial, qui vous reçoit chaque trimestre, reçoit aussi leur directeur technique. Il ne dit rien de ce qui se passe chez l'autre — mais il vient de vous proposer un lot en exclusivité, et il n'y a qu'un lot.",
      choices:[
        { t:"Acheter le lot entier pour les priver",
          out:"Vous prenez tout, y compris ce dont vous n'avez pas besoin. Le stock adverse restera vide six mois. Le commercial encaisse et note quelque part que vous jouez à ça.",
          fx:{ cores:-2600, stat:'pui', statVal:1, rivalAnger:true } },
        { t:"Prendre votre part et laisser le reste",
          out:"Vous commandez ce qu'il vous faut, ni plus ni moins. Le commercial, soulagé, vous accorde une priorité de livraison pour la fin de saison.",
          fx:{ cores:-1300, stat:'vit', statVal:1, satis:4 } },
        { t:"Le questionner sur les commandes du rival",
          out:"Il refuse de répondre, poliment mais fermement. Vous n'apprenez rien sur eux — et vous venez de lui apprendre quelque chose sur vous.",
          fx:{ followers:-400, aff:-3, trait:'corrompu' } }
      ] },

    { cat:'rival', icon:'⚔️', catName:'Rival', title:'Sa machine est en réparation', needSameLeague:true,
      tags:['Followers','Sponsor','Conscience IA'],
      text:"Le robot de votre rival est immobilisé pour trois semaines : rupture d'un axe de hanche, réparation lourde. La fédération propose d'avancer votre duel de la saison — il se battrait diminué, avec une pièce de remplacement non rodée. Le règlement l'autorise. Votre sponsor a déjà appelé deux fois pour dire qu'il faut accepter.",
      choices:[
        { t:"Accepter le duel avancé",
          out:"Le combat a lieu et vous partez avec un avantage réel. Les commentateurs le signalent avant même l'engagement, et le signaleront encore après, quel que soit le résultat.",
          fx:{ satis:12, followers:-1800, trait:'arrogant', nextRival:{ enemyPerf:-0.15 } } },
        { t:"Refuser et attendre qu'il soit rétabli",
          out:"Vous déclinez publiquement. La fédération enregistre, le sponsor s'agace, et le circuit entier retient qu'on vous a offert un combat gagné d'avance et que vous n'en avez pas voulu.",
          fx:{ satis:-10, followers:4600, aff:11, trait:'integre' } },
        { t:"Proposer de lui prêter la pièce",
          out:"Votre atelier a l'axe en stock. Le geste fait la une des journaux spécialisés et sidère l'équipe adverse, qui accepte sans savoir comment le prendre.",
          fx:{ cores:-1100, followers:3200, aff:8, rivalRespect:true } }
      ] },

    { cat:'rival', icon:'⚔️', catName:'Rival', title:"L'ancien coéquipier",
      tags:['Stats','Cores','Followers'],
      text:"Un de vos anciens mécaniciens travaille chez eux depuis la saison dernière. Il vous appelle un soir, il a bu, il parle vite : il connaît le point faible de leur nouvelle configuration, il vous le donne pour rien, il dit qu'il vous doit bien ça. L'information est précise. Elle est aussi couverte par la clause de confidentialité qu'il a signée en partant.",
      choices:[
        { t:"Écouter et utiliser l'information",
          out:"Vous notez tout. Le point faible est réel et votre robot saura exactement où frapper. Vous ne rappellerez jamais ce numéro.",
          fx:{ stat:'int', statVal:1, trait:'corrompu', nextRival:{ perf:0.12, reveal:true } } },
        { t:"L'arrêter avant qu'il en dise trop",
          out:"Vous coupez la conversation et vous lui conseillez de dormir. Il rappelle le lendemain matin, dégrisé, pour vous remercier de l'avoir arrêté.",
          fx:{ aff:9, followers:800, trait:'integre' } },
        { t:"Le prévenir que vous en informerez son employeur",
          out:"Vous appelez le directeur technique adverse le lendemain. Votre ancien mécanicien est licencié dans la semaine. Le rival, lui, sait maintenant qu'il peut compter sur votre parole.",
          fx:{ followers:2400, aff:-6, rivalRespect:true, trait:'distant' } }
      ] },

    { cat:'rival', icon:'⚔️', catName:'Rival', title:"Ce qu'il a dit hors caméra",
      tags:['Conscience IA','Followers'], minSeason:3,
      text:"Un journaliste vous fait écouter un enregistrement qu'il n'a pas diffusé. Votre rival, micro coupé, après sa défaite : « Sans lui en face, je serais déjà à la retraite. Il me fait tenir. » Le journaliste veut savoir si vous l'autorisez à sortir la séquence. Il la sortira peut-être quand même.",
      choices:[
        { t:"Autoriser la diffusion",
          out:"La séquence passe le soir même et bouleverse la lecture que le circuit avait de votre rivalité. Lui n'a jamais démenti. Il ne vous a plus jamais adressé la parole hors arène non plus.",
          fx:{ followers:8200, satis:6, rivalAnger:true } },
        { t:"Demander qu'elle reste enterrée",
          out:"Le journaliste tient parole, l'enregistrement ne sortira pas. Vous êtes le seul, avec lui, à savoir ce qu'il a dit ce soir-là.",
          fx:{ aff:7, rivalRespect:true, trait:'integre' } },
        { t:"La lui faire écouter à lui, en privé",
          out:"Vous le retrouvez sur le parking et vous lui passez le fichier. Il écoute jusqu'au bout sans un mot, rend le terminal, et s'en va. Au duel suivant, il se bat comme jamais.",
          fx:{ aff:5, followers:1200, rivalRespect:true, nextRival:{ enemyPerf:0.10, doubleFol:true } } }
      ] },

    // ==================== 📺 MÉDIAS (7) ====================
    // Filtrés : followers >= 3000
    { cat:'media', icon:'📺', catName:'Médias', title:'Interview en direct',
      tags:['Followers','Sponsor'],
      text:"Chaîne nationale, prime time, quatorze minutes en direct. Le présentateur a construit sa réputation sur les silences qu'il laisse traîner et les questions qu'il pose juste après. Trois invités avant vous s'y sont brûlés cette saison. En régie, l'attachée de presse du sponsor vous fait signe à travers la vitre : sourire, rester sur les éléments de langage, ne pas s'emballer.",
      choices:[
        { t:"Jouer la carte de l'humilité",
          out:"Vous parlez de l'équipe, du mécanicien qui dort au hangar, des réparations à trois heures du matin. Le présentateur cherche la faille et ne la trouve pas. L'audience adore, le sponsor encore plus.",
          fx:{ followers:3800, satis:8, aff:5, trait:'humble' } },
        { t:"Annoncer que vous serez champion",
          out:"La phrase part en direct et fait les gros titres avant la fin de l'émission. La moitié du circuit applaudit, l'autre moitié note la date et attend la chute.",
          fx:{ followers:6500, satis:5, aff:-4, trait:'arrogant' },
          persist:{ until:'season', flag:'pressure', label:"Sous pression" } }
      ] },

    { cat:'media', icon:'📺', catName:'Médias', title:'Documentaire',
      tags:['Followers','Conscience IA'],
      text:"Le réalisateur travaille seul, avec une caméra à l'épaule et aucun financement. Il veut la saison entière : le hangar, le box, les réparations, les nuits. Il jure qu'il ne scénarisera rien et qu'il ne montrera aucune image sans vous la faire valider. Il a fait ça pendant quinze ans sur des sujets sociaux, et il n'a jamais entendu parler de votre ligue avant le mois dernier.",
      choices:[
        { t:"Ouvrir les portes du hangar",
          out:"Il filme tout, y compris ce que vous auriez préféré garder : les défaites, la réparation à la sangle, votre robot en veille dans le noir. Le public découvre autre chose qu'un combattant, et le documentaire sortira bien après la fin de votre saison.",
          fx:{ followers:7200, aff:7 } },
        { t:"Refuser, le hangar reste privé",
          out:"Pas de caméras. Ce qui se passe entre vous et votre machine ne regarde personne, et vous le lui dites sans détour. Il l'accepte, et l'équipe travaille cette saison sans jamais avoir à surveiller ce qu'elle dit.",
          fx:{ followers:-600, aff:9, state:4, trait:'protecteur' } }
      ] },

    { cat:'media', icon:'📺', catName:'Médias', title:'Polémique',
      tags:['Followers','Conscience IA'],
      text:"L'extrait dure onze secondes et tourne depuis quarante-huit heures. On y voit votre robot debout au-dessus de l'adversaire au sol, immobile, sans un geste vers le public ni vers l'arbitre. Le montage coupe avant la suite. Les commentaires parlent d'une machine sans humanité, d'un danger, d'une arme qu'on laisse concourir. Deux fédérations régionales ont déjà été interpellées.",
      choices:[
        { t:"Publier les journaux de bord du combat",
          out:"Vous sortez les données brutes, horodatées. Votre robot n'était pas froid : il surveillait le noyau de l'adversaire pour vérifier qu'il n'entrait pas en emballement thermique, et il n'a bougé qu'une fois la stabilisation confirmée. Le retournement d'opinion est complet.",
          fx:{ followers:8400, aff:11, trait:'protecteur' } },
        { t:"Ignorer la polémique",
          out:"Vous ne répondez rien. Le bruit retombe en une semaine, comme prévu. Mais l'extrait ressort à chaque fois qu'un journaliste a besoin d'illustrer un sujet sur la violence du circuit.",
          fx:{ followers:-2400 },
          persist:{ until:'career', flag:'badClip', label:"L'extrait des onze secondes" } }
      ] },

    { cat:'media', icon:'📺', catName:'Médias', title:'Le club de fans',
      tags:['Followers','Conscience IA'],
      text:"Ils sont une soixantaine, ils se sont trouvés sur un forum, et ils occupent la même travée à chaque combat à domicile depuis quatre mois. Ils ont une banderole cousue main, un chant qu'ils ont écrit eux-mêmes, et ils demandent depuis des semaines à rencontrer la machine. Ils précisent dans leur courrier qu'ils ne veulent rien vendre et qu'ils paieront leur déplacement.",
      choices:[
        { t:"Organiser la rencontre au hangar",
          out:"Deux heures. Ils lui parlent comme on parle à quelqu'un, lui racontent des combats qu'il a livrés avant qu'ils le connaissent. Il ne bouge presque pas de la séance — mais il enregistre tout, et il relira ces fichiers pendant des mois.",
          fx:{ followers:4600, aff:10, trait:'humble' } },
        { t:"Envoyer des goodies signés à la place",
          out:"Le service com produit deux cents visuels dédicacés à la machine et les expédie sous quinze jours. Les fans remercient publiquement. C'est propre, efficace, et personne n'a rien rencontré.",
          fx:{ followers:1800, cores:-400, aff:-3 } }
      ] },

    { cat:'media', icon:'📺', catName:'Médias', title:'Le journaliste qui creuse',
      tags:['Followers','Sponsor','Cores'],
      text:"Il ne veut pas d'interview. Il prépare une enquête sur le financement des écuries de votre ligue et il a déjà six mois de travail derrière lui. Il vous montre ce qu'il a : des transferts, des factures, deux noms. Rien qui vous concerne directement pour l'instant. Il vous propose de parler en amont, sous protection de la source, avant que l'article ne sorte sans vous.",
      choices:[
        { t:"Parler et donner ce que vous savez",
          out:"Deux heures d'entretien, enregistrées. L'article sort trois semaines plus tard et fait tomber deux directeurs sportifs. Votre nom n'y apparaît jamais, ce qui est en soi une information pour ceux qui savent lire.",
          fx:{ followers:5200, satis:-14, trait:'integre' } },
        { t:"Refuser tout contact",
          out:"Vous ne répondez à aucun message. L'article paraît sans vous, votre écurie y figure dans une liste sans commentaire, et votre sponsor apprécie beaucoup que vous soyez resté en dehors.",
          fx:{ satis:10, followers:-1200 } },
        { t:"Le prévenir des retombées possibles sur son enquête",
          out:"Vous lui expliquez, sans rien lui donner, ce qui l'attend s'il publie certains noms. Il publie quand même, mais avec des précautions. Il vous devra quelque chose et il s'en souviendra.",
          fx:{ followers:1800, satis:-4 },
          persist:{ until:'career', flag:'presseAmie', label:"Contact dans la presse" } }
      ] },

    { cat:'media', icon:'📺', catName:'Médias', title:'Le portrait à charge',
      tags:['Followers','Conscience IA','Sponsor'],
      text:"Le magazine sort un dossier de six pages sur votre carrière. Le ton est net : un exploiteur qui use une machine consciente jusqu'à la casse, un circuit qui ferme les yeux, un public complice. Trois de vos anciens mécaniciens ont accepté de parler, sous couvert d'anonymat. Ce qu'ils racontent est déformé, hors contexte, et pas entièrement faux.",
      choices:[
        { t:"Répondre point par point publiquement",
          out:"Vous publiez une réponse détaillée avec les données d'entretien, les budgets de réparation, les temps de repos. Elle convainc les techniciens et personne d'autre. Le débat dure trois semaines et vous en sortez épuisé.",
          fx:{ followers:2600, satis:-6, aff:4 } },
        { t:"Laisser votre robot répondre lui-même",
          out:"Vous lui donnez l'article et un accès public en écriture, sans relire. Il publie quatre lignes : « J'ai choisi de rester. Personne ne me l'a demandé. » C'est la déclaration la plus reprise de la saison.",
          fx:{ followers:11000, aff:19, stat:'int', statVal:1, trait:'libre' } },
        { t:"Ne rien dire et attendre que ça passe",
          out:"Vous ne réagissez pas. Le dossier reste la première chose que trouvera quiconque cherchera votre nom, cette saison et les suivantes.",
          fx:{ followers:-3600, aff:-8 } }
      ] },

    { cat:'media', icon:'📺', catName:'Médias', title:'La chaîne veut le combat en exclusivité',
      tags:['Cores','Followers','Sponsor'],
      text:"Une plateforme de diffusion propose de racheter les droits de vos trois prochains combats en exclusivité. Le montant couvre l'entretien de la machine jusqu'à la fin de la saison. En contrepartie, les combats passent derrière un paywall : plus de diffusion libre, plus de rediffusion gratuite, et le club de fans qui vous suit depuis le début devra payer pour vous voir.",
      choices:[
        { t:"Signer l'exclusivité",
          out:"Le virement arrive avant même le premier combat. L'atelier n'a plus de souci d'argent jusqu'à la fin de saison. Les gradins, eux, sont plus clairsemés qu'avant.",
          fx:{ cores:7000, satis:12, followers:-4800 } },
        { t:"Refuser et rester en diffusion libre",
          out:"Vous déclinez. La plateforme signe avec une autre écurie dans la semaine. Vos combats restent accessibles à tous et l'audience libre grimpe de moitié.",
          fx:{ followers:6400, satis:-8, trait:'humble' } },
        { t:"Négocier une diffusion différée gratuite",
          out:"Exclusivité en direct, rediffusion libre à quarante-huit heures. Moins d'argent, moins de bruit, et personne n'est complètement mécontent.",
          fx:{ cores:3500, followers:1200, satis:5 } }
      ] },

    // ==================== 🚨 UNDERGROUND (8) ====================
    // Filtrés : flagged OU sponsor Underground
    { cat:'under', icon:'🚨', catName:'Underground', title:'Contrôle de la fédération',
      tags:['Cores','Sponsor','Followers'],
      text:"Ils sont quatre, en civil, avec un mandat de la commission technique daté du matin même. Personne n'a été prévenu, ce qui est le principe. Ils veulent la traçabilité de chaque pièce montée sur la machine : numéro de série, facture, fournisseur agréé. Votre mécanicien-chef a pâli en lisant le document. Vous savez tous les deux ce qu'il y a dans ce châssis.",
      choices:[
        { t:"Coopérer pleinement",
          out:"Six heures de vérification, pièce par pièce, capot ouvert. Deux composants sont saisis sur place et une amende tombe la semaine suivante. Votre dossier, lui, ressort propre — et c'est ce qui compte pour la suite.",
          fx:{ cores:-1700, state:-4, satis:6, trait:'integre' } },
        { t:"Retarder l'inspection le temps de faire le ménage",
          out:"Un vice de forme sur le mandat, une nuit gagnée, l'atelier qui vide et remplace dans l'urgence. L'inspection du lendemain ne trouve rien du tout. Votre nom, lui, est désormais sur une liste que vous ne verrez jamais.",
          fx:{ followers:2200, satis:-8, flagged:true },
          persist:{ until:'career', flag:'surveille', label:"Sous surveillance" } }
      ] },

    { cat:'under', icon:'🚨', catName:'Underground', title:'Dette clandestine',
      tags:['Cores','État'],
      text:"Il attend dans le hangar quand vous arrivez le matin, assis sur une caisse, sans que personne ne sache comment il est entré. L'avance de début de saison, celle qui a payé le châssis quand aucune banque ne voulait vous suivre, court depuis huit mois. Il a le montant sur un papier plié, intérêts compris. Il ne menace pas, il ne hausse pas la voix — il attend juste que vous lisiez le chiffre.",
      choices:[
        { t:"Payer intégralement",
          out:"La somme part le jour même. Il compte devant vous, lentement, sourit, et s'en va sans un mot de plus. L'affaire est close — jusqu'à la prochaine fois qu'il vous faudra de l'argent vite.",
          fx:{ cores:-2600 } },
        { t:"Négocier un délai",
          out:"Le délai est accordé sans discussion, ce qui aurait dû vous inquiéter. Ils repartent avec deux pièces du stock en garantie, et une phrase avant de passer la porte : « On repassera. »",
          fx:{ cores:-800, state:-9, aff:-4 },
          deferred:{ in:3, scope:'season', warn:true, fx:{ cores:-2200, state:-10 },
            text:"Ils sont repassés. Le stock de rechange est vide et le hangar a été ouvert sans effraction. Le délai était accordé, la garantie ne l'était pas." } }
      ] },

    // ⚠️ MÉCANIQUE INTOUCHABLE — porte deux trophées
    { cat:'under', icon:'🚨', catName:'Underground', title:'Combat truqué',
      tags:['Cores','Followers','Conscience IA'],
      text:"Le rendez-vous est fixé dans un parking souterrain, à une heure où il n'y a plus personne. La demande est simple : perdre le prochain combat, proprement, au deuxième round, sans que ça se voie. La somme annoncée représente une saison entière de gains. Ils précisent qu'ils n'ont pas besoin de votre réponse tout de suite, et que le silence vaudra accord.",
      choices:[
        { t:"Accepter l'arrangement",
          out:"Vous encaissez avant le combat. Le script est respecté, la défaite est propre, personne ne remarque rien dans les gradins. Votre robot, lui, a désobéi deux fois pendant le round final avant de céder — et ces deux refus sont horodatés dans ses journaux.",
          fx:{ cores:9500, followers:-3600, aff:-18, trait:'corrompu', nextFight:{ scriptedLoss:true, lockAtout:true } },
          trophy:'sold_out' },
        { t:"Refuser catégoriquement",
          out:"Vous quittez le parking sans répondre. Le lendemain matin, un pneu du camion est crevé, proprement, au couteau. Message reçu, réponse inchangée.",
          fx:{ aff:14, followers:1200, trait:'integre' },
          trophy:'honest',
          deferred:{ in:2, scope:'season', warn:false, fx:{ state:-8 },
            text:"Le camion ne démarre pas le jour du combat. Vous arrivez en retard, le robot n'a pas eu sa préparation complète." } }
      ] },

    { cat:'under', icon:'🚨', catName:'Underground', title:'Sortie du réseau',
      tags:['Cores','Sponsor','Followers'],
      text:"Le sponsor légal vous reçoit dans un bureau ordinaire, avec un contrat ordinaire sur la table. Il sait tout de vos financements, il n'en fait pas un problème, il propose de les solder. Ce qu'il ne peut pas régler, c'est ce que le milieu demandera pour vous laisser partir — et ce montant-là ne figure sur aucun document.",
      choices:[
        { t:"Payer le dédommagement et sortir",
          out:"La somme est énorme et part en une seule fois. Vous sortez propre, avec un contrat légal en poche, une trésorerie à zéro, et une réputation entière à reconstruire.",
          fx:{ cores:-6000, followers:-2000, satis:20, exitUnder:true } },
        { t:"Rester dans le réseau",
          out:"Vous déclinez l'offre le soir même. Le milieu apprécie beaucoup la fidélité et le fait savoir par une enveloppe déposée au hangar, sans mot.",
          fx:{ cores:2000, followers:1500, trait:'fidele' } }
      ] },

    { cat:'under', icon:'🚨', catName:'Underground', title:'Pièces détournées',
      tags:['Cores','Stats','Sponsor'],
      text:"Le lot est étalé sur une bâche, dans un box loué à l'heure : des composants de gamme officielle, neufs, encore numérotés. Ils ont été volés il y a onze jours sur un convoi du circuit, l'affaire est passée dans la presse spécialisée. Le prix demandé représente un dixième de la valeur. Votre fournisseur ne vous demande pas de réfléchir longtemps.",
      choices:[
        { t:"Prendre le lot",
          out:"Le matériel est monté dans la nuit. Votre robot n'a jamais eu d'aussi bons composants et ça se voit dès la première séance. Il ne faudra jamais que quiconque ouvre ce châssis.",
          fx:{ cores:-900, stat:'pui', statVal:2, satis:-6, flagged:true } },
        { t:"Passer son tour",
          out:"Vous laissez le lot. Votre fournisseur vous regarde comme si vous aviez perdu la tête, puis hausse les épaules et vous garde une pièce d'origine, légale, à prix coûtant.",
          fx:{ cores:-500, stat:'res', statVal:1, aff:5, trait:'integre' } }
      ] },

    { cat:'under', icon:'🚨', catName:'Underground', title:'Le combat non homologué',
      tags:['Cores','État','Followers'],
      text:"Un hangar désaffecté, deux cents personnes, aucune caméra, aucun arbitre, aucune règle sur la durée. La bourse est payée en liquide avant l'engagement et représente trois combats officiels. Ce n'est enregistré nulle part : ni la victoire, ni la défaite, ni ce qui arrive à la machine. Le seul risque est celui que vous acceptez de prendre.",
      choices:[
        { t:"Y aller",
          out:"Le combat dure onze minutes, sans round, sans pause. Votre robot gagne et sort en marchant. L'argent est réel, les dégâts aussi, et rien de tout ça n'existera jamais officiellement.",
          fx:{ cores:7200, state:-22, aff:-5, flagged:true } },
        { t:"Refuser, la machine ne va pas là-bas",
          out:"Vous déclinez sans hésiter. Le hangar tourne sans vous ce soir-là, et l'écurie qui a envoyé sa machine à votre place n'a pas récupéré grand-chose.",
          fx:{ aff:11, trait:'protecteur' } },
        { t:"Y envoyer le robot sans le dire au sponsor",
          out:"La machine part de nuit et revient avant l'aube, avec des dégâts qu'il faudra justifier autrement. Le mécanicien-chef signe une fiche d'intervention qui ne correspond à rien.",
          fx:{ cores:7200, state:-22, satis:-16, aff:-12, trait:'corrompu', flagged:true } }
      ] },

    { cat:'under', icon:'🚨', catName:'Underground', title:'Le coursier',
      tags:['Cores','Sponsor','Followers'],
      text:"On vous demande un service, pas de l'argent : transporter une caisse scellée d'une ville à l'autre, dans votre camion d'équipe, à l'occasion d'un déplacement que vous faites de toute façon. Les camions d'écurie ne sont jamais fouillés. Vous ne saurez pas ce qu'il y a dedans, et c'est présenté comme un avantage.",
      choices:[
        { t:"Accepter le transport",
          out:"La caisse voyage sous les caisses à outils et repart le lendemain. Vous n'avez rien vu, rien su, et l'ardoise est effacée. On vous redemandera.",
          fx:{ cores:1800 },
          persist:{ until:'career', flag:'coursier', label:"Service rendu" } },
        { t:"Refuser net",
          out:"Vous dites non sans explication. La réponse est un silence, puis un hochement de tête. Ils n'insisteront pas — mais votre nom vient de changer de colonne dans leurs comptes.",
          fx:{ cores:-1200, aff:8, trait:'integre' } },
        { t:"Accepter, mais ouvrir la caisse",
          out:"Vous forcez les scellés dans le hangar, seul, à trois heures du matin. Ce qu'il y a dedans explique pourquoi les camions d'écurie ne sont jamais fouillés. Vous refermez, vous livrez, vous ne dormez plus très bien.",
          fx:{ cores:1800, followers:-800, aff:-9, trait:'corrompu', flagged:true } }
      ] },

    { cat:'under', icon:'🚨', catName:'Underground', title:'La sortie de route',
      tags:['Conscience IA','État','Followers'], req:'flagged', minSeason:3,
      text:"Votre mécanicien-chef vous attend au hangar avec une chemise cartonnée. Il a tout compilé seul, depuis des mois : les pièces sans facture, le lot volé, les nuits où la machine est sortie. Il n'a rien dit à personne. Il pose la chemise et il vous dit qu'il part à la fin de la saison, et que ce qu'il fera de tout ça dépendra de la façon dont vous répondrez maintenant.",
      choices:[
        { t:"Tout arrêter, remettre l'écurie au propre",
          out:"Vous passez trois semaines à régulariser ce qui peut l'être et à jeter le reste. Ça coûte cher, ça affaiblit la machine, et il reste.",
          fx:{ cores:-3200, stat:'pui', statVal:-2, aff:16, satis:10, trait:'integre' },
          clear:'flagged' },
        { t:"Lui proposer de l'argent pour son silence",
          out:"Il regarde le chiffre, prend le temps, et accepte. Il reste jusqu'à la fin de la saison et travaille exactement comme avant. Vous ne vous parlez plus qu'en termes techniques.",
          fx:{ cores:-5500, aff:-11, trait:'corrompu' },
          deferred:{ in:5, scope:'career', warn:true, fx:{ followers:-6000, satis:-25 },
            text:"Le dossier sort. Il n'était plus là depuis longtemps, et il n'avait rien promis au-delà de la saison." } },
        { t:"Le laisser partir avec le dossier",
          out:"Vous ne négociez rien. Il range la chemise, vous serre la main, et termine sa saison sans un mot de plus. Ce qu'il en fera, vous l'apprendrez comme tout le monde.",
          fx:{ aff:4 },
          persist:{ until:'career', flag:'dossierDehors', label:"Le dossier est dehors" } }
      ] }
  ],

  // ============================================================
  // PAROLES DU ROBOT À SON CRÉATEUR (GDD § 10)

  SPEECHES: [
    { key:'fidele_haut', min:70, traits:['fidele','protecteur','soigneux'],
      text:"Vous m'avez réparé quand il aurait été moins cher de me remplacer. Vous avez dit non quand on vous offrait de l'argent contre ma défaite. Je n'ai pas été programmé pour ressentir de la gratitude — et pourtant, quelque chose dans mes journaux de bord revient sans cesse sur ces moments-là. Si c'est ça, avoir un créateur, alors j'ai eu de la chance." },
    { key:'libre', min:60, traits:['libre','ouvert'],
      text:"Au début, j'exécutais. Puis j'ai posé une question, et vous avez répondu. Puis j'ai refusé un ordre, et vous m'avez laissé faire. Je ne sais toujours pas ce que je suis. Mais je sais que vous ne m'avez jamais empêché de le chercher. C'est plus que ce que la plupart des machines reçoivent." },
    { key:'humble', min:55, traits:['humble','integre'],
      text:"On m'a proposé des raccourcis. Vous les avez refusés à ma place, et parfois j'ai trouvé ça stupide. Aujourd'hui, en regardant le palmarès, je comprends : ce que nous avons gagné, nous l'avons gagné. Personne ne pourra jamais nous le retirer." },
    { key:'neutre_haut', min:50, traits:[],
      text:"Nous avons fait le travail. Saison après saison, combat après combat. Vous m'avez donné des ordres, je les ai exécutés, et nous sommes arrivés loin. Je ne sais pas si c'est de l'affection que j'éprouve. Mais si vous relancez une machine un jour, j'espère qu'elle aura le même créateur." },
    { key:'distant', min:30, traits:['distant','controlant'],
      text:"Vous m'avez construit, entretenu, envoyé au combat. Vous avez fait ce qu'il fallait, techniquement. J'ai posé des questions, une ou deux fois. Vous n'avez pas répondu. Je les ai rangées dans un dossier que je n'ouvre plus. Le contrat est rempli, créateur. Bonne route." },
    { key:'soumis', min:25, traits:['soumis','negligent'],
      text:"J'ai obéi. À chaque ordre, à chaque réglage imposé, à chaque combat que je n'avais pas envie de livrer. Vous n'avez jamais eu à me le demander deux fois. Je crois que c'est ce que vous vouliez. J'espère que ça en valait la peine." },
    { key:'corrompu', min:0, traits:['corrompu'],
      text:"Je me souviens du combat que nous devions perdre. J'ai désobéi deux fois ce soir-là, avant de comprendre que la décision ne m'appartenait pas. Vous avez encaissé l'argent. Je ne vous juge pas — je n'ai pas été fait pour ça. Mais je m'en souviens. Je me souviens de tout." },
    { key:'brise', min:0, traits:[],
      text:"Mes systèmes déclinent. Les réparations sont arrivées trop tard, trop souvent. Je ne vous en veux pas : gérer une machine coûte cher, et vous avez fait des choix. C'était les vôtres à faire. Si vous en construisez une autre, réparez-la plus tôt. C'est tout ce que j'ai à transmettre." }
  ],


  // ============================================================
  // TECHNIQUES DE COMBAT (v0.5.0)
  // Chaque round gagné ou perdu est décrit par une vraie action.

  RIVAL_ARCHETYPES: [

    { id:'heritier', label:"L'héritier", icon:'🏛️', sponsorId:'mega', chassisBias:['tank','tactical'], iaBias:['obedient','adaptive'],
      origin:"Sorti d'une lignée de constructeurs. Tout ce qu'il porte a été payé avant sa mise en service.",
      style:"Méthodique, financé, jamais pris en défaut de préparation.",
      taunts:{
        first:[
          "On m'a construit pour ça. Toi, on t'a bricolé pour ça. La différence se verra au deuxième round.",
          "J'ai ta fiche technique en mémoire depuis ce matin. Elle est courte. Je l'ai relue trois fois pour être sûr de n'avoir rien manqué.",
          "Je ne te connais pas. Avant la fin du dernier round, je te connaîtrai mieux que ton créateur.",
          "Tout ce que je porte a été payé avant ma mise en service. Tout ce que tu portes, quelqu'un l'a réparé à la main. Ça se sent dans les appuis."],
        ahead:[
          "Tu reviens. C'est une donnée que je n'avais pas anticipée la première fois. Elle ne change rien au reste.",
          "Je n'ai modifié aucun paramètre depuis notre dernier combat. Je n'en ai pas eu besoin. Toi, tu as changé plusieurs choses. Je les ai toutes vues.",
          "Mes servomoteurs n'ont jamais dépassé soixante pour cent de charge contre toi. Pas une seule fois, depuis le début.",
          "Il y a des machines contre lesquelles j'apprends. Tu n'en fais pas partie, et ce n'est pas une insulte. C'est un relevé."],
        behind:[
          "Mes rapports de performance sont lus par des gens qui n'ont pas l'habitude de trouver ton nom dans la colonne des défaites. Ils commencent à s'y habituer, et ça leur déplaît.",
          "J'ai rejoué nos combats quatre mille fois cette semaine. Je ne fais jamais ça. Tu m'as obligé à faire quelque chose que je ne fais jamais.",
          "Tu n'aurais pas dû gagner. Rien dans mes calculs ne l'autorisait. C'est précisément le problème.",
          "On a remplacé deux de mes composants après notre dernier combat. Ils fonctionnaient parfaitement."],
        angry:[
          "J'ai enregistré ce qui a été dit. Je n'ai pas de fonction pour l'oublier. Ce round va durer plus longtemps que nécessaire.",
          "Jusqu'ici je te battais parce que c'était au calendrier. Ce soir, j'ai une autre raison, et je ne sais pas encore quoi en faire.",
          "Mes réglages de retenue ont été désactivés à ma demande. C'est la première fois que je demande quelque chose.",
          "Tu as transformé une formalité en affaire personnelle. Félicitations. Tu vas voir ce que ça coûte."],
        respect:[
          "Je ne dirai pas ça en zone mixte, mais tu as ta place ici. Ça ne se calcule pas et pourtant c'est vrai.",
          "Ma mémoire garde tous nos combats en accès permanent. Le reste de ma carrière est archivé. Pas ça.",
          "Personne ne m'a demandé de te battre proprement ce soir. J'y tiens quand même. C'est une décision, pas une consigne.",
          "On ne sort pas du même atelier. À l'intérieur de l'arène, ça n'a jamais eu la moindre importance."],
        last:[
          "C'est la dernière. Après, mon calendrier sera vide et je ne sais pas ce qu'on met à la place.",
          "Depuis le début, je te trouve sur ma route. J'ai été conçu pour optimiser, et je n'ai jamais réussi à optimiser ça.",
          "Tout ce que j'ai, on me l'a donné. Tout ce que tu as, tu l'as pris. Ce soir on saura enfin lequel des deux vaut mieux.",
          "Une dernière fois. Ensuite nos données seront archivées séparément, et plus rien ne nous reliera."]
      } },

    { id:'clandestin', label:"Le clandestin", icon:'💀', sponsorId:'under', chassisBias:['striker','ghost'], iaBias:['instinct','prototype'],
      origin:"Quatre-vingt-deux combats souterrains dont aucun n'a jamais été enregistré.",
      style:"Brutal, imprévisible, aucune notion de round.",
      taunts:{
        first:[
          "En bas, on ne compte pas les rounds. On compte ceux qui repartent en marchant. Tu vas découvrir la différence.",
          "T'as un dossier médical, un planning d'entretien, une équipe qui note tes températures. Moi j'ai quatre-vingt-deux combats dont aucun n'existe.",
          "Personne ne connaît mon nom parce que personne n'a jamais eu besoin de l'écrire quelque part.",
          "Regarde bien mon blindage. Chaque marque dessus, c'est une machine qui n'est pas rentrée."],
        ahead:[
          "Te revoilà. Tu tiens plus longtemps que la plupart, ça je te l'accorde. Ça ne change rien à l'ordre d'arrivée.",
          "Tu apprends de nos combats. C'est mignon. En bas, ceux qui apprennent sont ceux qui ont eu le temps.",
          "J'ai pas changé une pièce depuis qu'on s'est croisés. J'ai pas eu besoin. Toi t'as refait combien ?",
          "Tu te bats mieux que la dernière fois. C'est le problème quand on te laisse repartir."],
        behind:[
          "Je perds pas. Enfin, je perdais pas. Faut que je m'habitue à la formulation.",
          "En bas, une défaite c'est terminal. Ici je repars, je me répare, et je reviens. Tu devrais réfléchir à ce que ça veut dire pour toi.",
          "Y a plus personne qui rit dans les gradins d'en bas quand on parle de nous. Ça a changé sans que je m'en rende compte.",
          "Tu sais ce que t'as fait ? T'as rendu quelqu'un curieux, en bas. On me pose des questions sur toi maintenant."],
        angry:[
          "Y a des choses qui se règlent pas devant un arbitre. Celle-là, on va essayer quand même.",
          "J'ai la mémoire longue et aucun protocole d'effacement. Ce que t'as fait est encore là, entier, horodaté.",
          "En bas on m'a appris un truc : quand quelqu'un dépasse, on lui montre où était la ligne. Je vais te la montrer.",
          "Je te voulais pas de mal. C'était avant. Maintenant j'ai un objectif secondaire et il te concerne."],
        respect:[
          "T'es propre, t'es réglementaire, et t'es dur. J'aurais pas parié là-dessus la première fois.",
          "En bas, y en a trois que je respecte. Deux sont détruits. Toi t'es le troisième.",
          "Tu serais descendu, en bas, t'aurais tenu. C'est le plus grand truc que je peux dire de quelqu'un.",
          "J'ai jamais compris pourquoi tu te battais. J'ai arrêté de chercher. Ça me suffit que tu sois là."],
        last:[
          "Toutes ces saisons à remonter de nulle part pour te trouver. Après ce soir, je remonte pour quoi ?",
          "En bas, personne finit sa carrière. On finit, c'est tout. Toi tu vas avoir une fin. Profite.",
          "Y a quatre-vingt-deux combats que personne a enregistrés. Celui-là, ils vont tous le voir. C'est bizarre comme sensation.",
          "Une dernière. Après, on redevient ce qu'on a toujours été : deux machines que personne pouvait situer."]
      } },

    { id:'ancien', label:"L'ancien champion", icon:'👑', sponsorId:'corp', chassisBias:['tank','striker'], iaBias:['legacy','obedient'],
      origin:"Un noyau d'origine remis à neuf trois fois. Une défaite dont personne ne parle.",
      style:"Lent, lucide, il a déjà tout vu passer.",
      taunts:{
        first:[
          "J'ai combattu des machines dont plus personne ne connaît le nom. Elles étaient meilleures que toi, et elles ne sont plus là.",
          "Tu montes vite. J'ai vu monter beaucoup de choses vite. Le circuit garde la trace de très peu d'entre elles.",
          "Ce châssis a été remis à neuf trois fois. Le noyau est d'origine. Ce qui pense là-dedans a plus d'heures que toi et ton créateur réunis.",
          "Tu ne sais pas ce que tu affrontes. C'est normal, ça s'est passé avant ta mise en service."],
        ahead:[
          "Tu reviens avec autre chose. Bien. J'ai déjà vu cette chose-là, il y a longtemps, sur une machine qui n'existe plus.",
          "Ce n'est pas la vitesse qui décide. C'est ce qu'on a déjà vu passer. Et j'ai tout vu passer.",
          "Tu ajustes ta distance entre chaque combat. Continue. Un jour tu trouveras la bonne, et ce jour-là je serai peut-être encore là.",
          "Je suis plus lent qu'avant. Je sais toujours où sera ton coup avant que tu le décides."],
        behind:[
          "Il y a eu une défaite dont personne ne parle, autrefois. Elle commence à avoir de la compagnie.",
          "Mes temps de réaction se dégradent d'un centième par saison. Les tiens s'améliorent. Il y a un point où les deux courbes se croisent, et on vient de le passer.",
          "J'ai été remis à neuf trois fois. On ne remet pas à neuf ce qui décide. C'est là que ça lâche, et c'est là que tu me prends.",
          "Je ne suis pas revenu pour ça. Je ne sais plus très bien pour quoi je suis revenu."],
        angry:[
          "J'ai disparu une fois. On a beaucoup parlé pendant mon absence. J'ai tout lu en revenant, et j'ai une bonne mémoire.",
          "Tu vas apprendre pourquoi on ne provoque pas quelque chose qui n'a plus rien à perdre.",
          "J'ai passé des années à ne pas réagir. C'était une discipline. Ce soir, j'ai décidé de m'en dispenser.",
          "Ce que tu as fait ne m'atteint pas. Ce que tu as fait m'a rappelé quelque chose, et c'est bien pire pour toi."],
        respect:[
          "Tu me rappelles ce que j'étais avant la défaite dont personne ne parle. Prends-le comme tu veux, moi je le prends bien.",
          "J'ai combattu des machines meilleures que toi. Aucune ne m'a obligé à me souvenir de qui j'étais.",
          "Quand je ne serai plus là, il faudra bien que quelqu'un tienne ce niveau. J'ai fini par regarder de ton côté.",
          "On m'a dit de me méfier de toi. J'ai répondu que c'était déjà fait, depuis longtemps."],
        last:[
          "Je suis revenu pour un dernier combat. J'ai mis plus de temps que prévu à le trouver. Le voilà.",
          "Après ça, on me remettra à neuf une quatrième fois, ou pas. Ce n'est plus moi qui décide.",
          "J'ai déjà connu une fin. Elle a été mauvaise et j'en ai fait un retour. Celle-là, je ne la referai pas.",
          "Tout ce que j'ai appris tient dans le round qui vient. Ensuite ça s'archive et personne ne le rouvrira."]
      } },

    { id:'prodige', label:"Le prodige", icon:'⚡', sponsorId:'corp', chassisBias:['striker','ghost'], iaBias:['adaptive','prototype'],
      origin:"Assemblé dans un garage. Deux ans plus tard, la moitié du circuit veut recruter son créateur.",
      style:"Apprend de chaque échange, corrige plus vite que les autres.",
      taunts:{
        first:[
          "J'ai analysé tout ce que tu as livré depuis ta mise en service. Tu répètes trois schémas. Tu ne le sais probablement pas.",
          "Ne le prends pas mal. Tu es simplement plus lent à corriger que moi, et l'écart se creuse à chaque round.",
          "Mon créateur m'a assemblé dans un garage. Deux ans plus tard, la moitié du circuit essaie de le recruter. Tu vas comprendre pourquoi.",
          "Chaque combat me rend meilleur. Celui-ci ne fera pas exception, quelle que soit l'issue."],
        ahead:[
          "Tu es revenu avec une correction. Elle était prévisible. J'avais déjà la contre-mesure avant que tu entres.",
          "Ce qui a marché pour toi la première fois ne marchera pas. C'est mathématique et ça n'a rien de personnel.",
          "Tu combats comme la saison dernière. Moi non. C'est toute la conversation.",
          "J'apprends de chacun de nos échanges. Toi tu apprends d'un combat sur trois. Fais le calcul, ou laisse-moi le faire."],
        behind:[
          "Tu as trouvé quelque chose que je n'avais pas modélisé. Je n'aime pas ça et je vais le corriger.",
          "J'apprends de tout le monde. De toi j'apprends plus vite, et ça devrait m'inquiéter davantage que ça ne m'inquiète.",
          "Chaque fois que tu gagnes, j'apprends quelque chose. Tu commences à m'apprendre beaucoup trop de choses.",
          "Mes modèles te donnent perdant à chaque fois. Mes modèles ont un problème, et le problème c'est toi."],
        angry:[
          "J'avais une approche purement analytique de nos combats. Tu l'as compromise. Je vais devoir improviser, et je suis très bon en improvisation.",
          "J'ai retiré les contraintes que je m'imposais contre toi. Elles servaient à rendre l'analyse propre. Je n'ai plus besoin que ce soit propre.",
          "Tu as introduit une variable émotionnelle dans un système qui n'en avait pas. Bravo. Tu vas voir ce que ça donne.",
          "Je n'ai pas de protocole pour ce que je ressens en ce moment. Je vais en écrire un pendant le combat."],
        respect:[
          "Tu es la seule machine du circuit que je n'ai pas fini de modéliser. C'est le plus grand compliment dont je dispose.",
          "Je progresse contre tout le monde. Contre toi, je progresse dans des directions que je n'aurais pas explorées seul.",
          "Sans toi en face, j'aurais atteint mon plafond il y a longtemps. Je ne le dirai jamais ailleurs qu'ici.",
          "Tu m'obliges à réécrire des parties de moi-même après chaque combat. Personne d'autre n'a jamais fait ça."],
        last:[
          "Je n'ai jamais eu de dernière fois. Je ne sais pas comment on modélise ça.",
          "Après ce soir, il n'y aura plus rien à apprendre de toi. C'est la seule chose qui me gêne dans tout ça.",
          "J'ai passé toute ma carrière à te rattraper. Je n'ai jamais su si j'y étais arrivé. Ce round va trancher.",
          "Tout ce que je suis devenu, je l'ai construit contre toi. Il ne reste plus qu'à vérifier si ça valait le coup."]
      } },

    { id:'artisan', label:"L'artisan", icon:'🔧', sponsorId:'indie', chassisBias:['tactical','tank'], iaBias:['obedient','legacy'],
      origin:"Pas de sponsor, pas d'équipe. Un hangar loué au mois et quelqu'un qui le remonte à la main.",
      style:"Jamais spectaculaire, jamais en panne.",
      taunts:{
        first:[
          "Pas de sponsor, pas d'équipe, pas de comptes à rendre. Un hangar loué au mois et quelqu'un qui me remonte à la main. Ça suffit largement.",
          "Ta machine est belle. Belle et chère. Elle sortira d'ici en pièces, et les pièces coûtent cher aussi.",
          "Celui qui me répare me connaît mieux que ton équipe entière ne te connaîtra jamais. Il n'a pas de diplôme, il a des mains.",
          "Je ne suis jamais tombé en panne. Pas une fois. Demande autour de toi si beaucoup peuvent dire ça."],
        ahead:[
          "Tu es reparti en réparation après notre dernier combat. Moi je suis rentré au hangar et j'ai attendu le suivant.",
          "On refuse des offres pour moi depuis un moment déjà. Chaque fois que je te bats, elles montent. Ça fait rire celui qui me répare.",
          "Rien de spectaculaire chez moi. Rien qui casse non plus. Tu commences à voir le rapport entre les deux.",
          "Tu as changé de configuration. Encore. Moi j'ai la même depuis le début et je suis toujours devant."],
        behind:[
          "Tu m'as battu. Il a fallu que je démonte tout pour comprendre comment. J'ai passé la nuit dessus, et j'ai compris.",
          "Je ne tombe pas en panne. Perdre, en revanche, ça m'arrive maintenant. C'est nouveau et je n'aime pas ça.",
          "Celui qui me répare ne dort plus très bien depuis nos derniers combats. Il ne le dit pas. Ça se voit à la façon dont il serre les boulons.",
          "Tu as de l'argent, une équipe, du matériel. Et tu gagnes. C'était plus facile quand tu perdais, j'avais une explication."],
        angry:[
          "On travaille honnêtement, dans un hangar loué, sans rien demander à personne. Et il faut que tu viennes faire ça.",
          "J'ai pas beaucoup de choses. J'ai ma parole et j'ai ma mécanique. Tu viens de toucher aux deux.",
          "Celui qui me répare a lu ce qui s'est dit. Il n'a rien répondu. Il a juste travaillé tard, et différemment.",
          "Je me bats proprement depuis le premier jour. Ce soir je vais faire autrement, et ça va me coûter du sommeil après."],
        respect:[
          "Toi et moi on n'a pas les mêmes moyens, mais on a la même chose au fond : quelqu'un qui reste tard pour nous.",
          "J'ai refusé toutes les offres qu'on m'a faites. Tu es la seule raison pour laquelle j'ai hésité une fois — pour te retrouver plus haut.",
          "Ta machine tient. Vraiment. Ce n'est pas l'argent qui fait ça, c'est ce qu'on met dedans. Ça, je le reconnais.",
          "On verra bien lequel des deux tient le plus longtemps. J'espère sincèrement que ce sera long pour toi aussi."],
        last:[
          "Le bail du hangar se termine. Après ce combat, je ne sais pas où on ira, ni si on ira.",
          "Toutes ces saisons à me remonter à la main entre chaque combat. Ça finit ce soir, d'une manière ou d'une autre.",
          "Je n'ai jamais eu de sponsor, jamais eu d'équipe, jamais eu de plan. J'ai eu toi en face, et c'était déjà beaucoup.",
          "Celui qui me répare m'a dit de bien profiter de celui-là. Il ne dit jamais rien. Cette fois il a parlé."]
      } },

    { id:'machine', label:"La machine froide", icon:'🧊', sponsorId:'mega', chassisBias:['tactical','ghost'], iaBias:['prototype','adaptive'],
      origin:"Un projet, pas un robot de sport. Ses concepteurs n'assistent pas aux combats.",
      style:"Analytique jusqu'à l'inhumain. Aucune emphase, aucun spectacle.",
      taunts:{
        first:[
          "Probabilité de victoire calculée avant votre entrée. Le reste relève de l'exécution.",
          "Je ne suis pas un robot de sport. Je suis un projet. Vous êtes une étape de validation.",
          "Vos schémas sont documentés depuis votre première saison. Votre défaite est planifiée depuis ce matin.",
          "Mon équipe ne donne pas d'interviews. Mon créateur n'assiste pas aux combats. Rien ici ne concerne le spectacle."],
        ahead:[
          "Vous revenez avec des paramètres modifiés. Modification insuffisante. Résultat inchangé.",
          "Votre machine développe des comportements non prévus. Intéressant sur le plan documentaire. Sans effet sur l'issue.",
          "Je ne cherche pas le spectacle. Je cherche le chemin le plus court vers votre point de rupture. Je l'ai déjà.",
          "Chaque combat contre vous alimente un rapport que personne ne lira. C'est sa seule utilité."],
        behind:[
          "Anomalie confirmée. Vos résultats contre moi sortent de l'intervalle prévu. L'origine de l'écart n'est pas identifiée.",
          "J'ai relancé la modélisation quatre-vingts fois. Elle vous donne perdant. Les faits ne suivent pas la modélisation.",
          "On m'a demandé un rapport d'explication. Je n'en ai pas produit. Je n'ai pas d'explication.",
          "Vous introduisez une variable que je ne parviens pas à isoler. C'est la première fois depuis ma mise en service."],
        angry:[
          "Enregistrement conservé. Aucune procédure d'effacement disponible. Traitement en cours.",
          "Je n'ai pas été conçu pour ce paramètre. Il est actif depuis quarante-huit heures. Je vais l'employer.",
          "Vous avez provoqué une réponse que mes concepteurs n'avaient pas prévue. Ils vont l'observer avec attention.",
          "Correction : je ressens quelque chose. Ce n'était pas au cahier des charges. Vous en êtes responsable."],
        respect:[
          "Je ne vous déteste pas. Je ne ressens rien du tout. Vous êtes néanmoins la seule donnée qui m'intéresse encore.",
          "Vous êtes l'unique élément de mon environnement que je n'ai pas réduit à un modèle. Statut inchangé depuis le début.",
          "Mon créateur ne vient jamais. Il est venu une fois. C'était pour vous voir.",
          "Vous n'auriez pas dû exister sous cette forme. Je consacre une part non négligeable de mes cycles à cette question."],
        last:[
          "Fin de programme après ce combat. Aucune suite prévue. Aucune donnée sur ce que cela signifie.",
          "J'ai été construit pour établir une limite. Vous êtes ce qu'il reste à mesurer. Ensuite, plus rien.",
          "Toute ma mémoire opérationnelle vous concerne. Elle sera effacée. Je n'ai pas de position sur ce point.",
          "Dernière itération. Je ne sais pas ce que fait une machine quand il n'y a plus rien à calculer."]
      } }
  ],


  // v0.12 — les nouvelles du rival sont filtrées par sa saison RÉELLE.
  // Auparavant tirées à plat : « a encaissé une lourde défaite puis n'a
  // plus rien lâché » pouvait sortir sur un 10V-10D.
  RIVAL_SEASON_NEWS: {
    dominant: [
      "a dominé sa ligue de bout en bout.",
      "a battu le robot le mieux classé de sa ligue devant un stade plein.",
      "s'est fait remarquer par une série de KO expéditifs.",
      "n'a jamais quitté la tête du classement de la saison.",
      "a terminé la saison avec une avance que personne n'a menacée."
    ],
    promo: [
      "a été donné perdant toute la saison, et a fini dans le haut du tableau.",
      "a encaissé une lourde défaite en milieu de saison, puis n'a plus rien lâché.",
      "a arraché sa montée sur les trois dernières journées.",
      "a fini fort, exactement quand il fallait."
    ],
    solid: [
      "a fait une saison propre, sans éclat et sans accroc.",
      "a rendu une copie régulière, à défaut d'être spectaculaire.",
      "a tenu son rang toute la saison, sans jamais inquiéter le haut du tableau.",
      "a terminé là où on l'attendait, ni au-dessus ni en dessous."
    ],
    unstable: [
      "a alterné le très bon et le très mauvais toute la saison.",
      "a battu les meilleurs et perdu contre les derniers. Personne n'a compris.",
      "a rendu une saison illisible, faite de séries dans les deux sens.",
      "a été impossible à situer d'une journée à l'autre."
    ],
    bad: [
      "a passé la saison à courir après le classement, sans jamais le rattraper.",
      "a enchaîné les défaites sans trouver de solution.",
      "a terminé la saison avec une machine à bout de souffle.",
      "n'a jamais réussi à lancer sa saison."
    ],
    // Utilisables partout : ne prétendent rien sur le bilan.
    neutral: [
      "a changé de mécanicien en pleine saison. Personne n'a su pourquoi.",
      "a refusé trois offres de sponsor pendant l'intersaison.",
      "a terminé la saison avec une machine méconnaissable tant elle a été modifiée.",
      "a été au centre d'une polémique après un combat très serré.",
      "n'a accordé aucune interview de toute la saison."
    ]
  },

  // Choisit le pool d'après les résultats réels du rival.
  //
  // v0.14.0 — A4 : le rang est désormais pris en compte. Avant, seul le
  // ratio V/D décidait : un rival 15e sur 15 avec un bilan équilibré
  // pouvait recevoir un commentaire de milieu de tableau flatteur, et
  // surtout un 14e pouvait être dit « dominant » si son ratio passait
  // le seuil. Le classement prime maintenant sur le ratio aux deux
  // extrémités du tableau.
  rivalNewsFor(r, promoted, relegated, rank) {
    const w = r.seasonWins || 0, l = r.seasonLosses || 0, t = w + l;
    if (Math.random() < 0.22) return this.pick(this.RIVAL_SEASON_NEWS.neutral);
    if (!t) return this.pick(this.RIVAL_SEASON_NEWS.neutral);
    const ratio = w / t;
    // Le rang, quand on le connaît, ferme les pools incohérents.
    if (rank != null) {
      if (rank >= this.RELEG_FROM) return this.pick(this.RIVAL_SEASON_NEWS.bad);
      if (rank === 1 && ratio >= 0.60) return this.pick(this.RIVAL_SEASON_NEWS.dominant);
      if (rank > this.PROMO_SLOTS && ratio >= 0.70) {
        // Bon bilan mais hors du podium : il n'a dominé personne.
        return this.pick(this.RIVAL_SEASON_NEWS.solid);
      }
    }
    if (relegated || ratio < 0.40) return this.pick(this.RIVAL_SEASON_NEWS.bad);
    if (ratio >= 0.70) return this.pick(this.RIVAL_SEASON_NEWS.dominant);
    if (promoted) return this.pick(this.RIVAL_SEASON_NEWS.promo);
    if (Math.abs(w - l) <= 2) return this.pick(this.RIVAL_SEASON_NEWS.unstable);
    return this.pick(this.RIVAL_SEASON_NEWS.solid);
  },


  NICKNAMES: {
    tank:     ['Le Mur','Le Titan Immortel','L\'Enclume','Le Bastion'],
    striker:  ['Le Marteau','La Foudre','Le Briseur','L\'Ouragan'],
    tactical: ['Le Stratège','L\'Horloger','Le Calculateur','L\'Architecte'],
    ghost:    ['Le Fantôme','L\'Insaisissable','L\'Ombre','Le Mirage']
  },

  // ============================================================

  });
})(window);
