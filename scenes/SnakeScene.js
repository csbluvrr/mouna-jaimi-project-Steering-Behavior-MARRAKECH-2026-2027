/**
 * Mini-jeu 2 : Caterpillar Crawl — Logique complète du TP 3 (3-Arrival) !
 * - Démarre à 1 seul anneau et grandit à chaque fruit dévoré.
 * - 5 niveaux à difficulté croissante (4 -> 12 fruits, vitesse, vision, 0 -> 6 obstacles).
 * - Contrôle hybride : Flèches / WASD / ZQSD (Snake classique) OU Souris (Arrival),
 *   commutable à tout moment avec la touche M ou dans le menu Pause.
 * - Règles classiques du TP 3 : bordures du jardin, auto-collision (dès le 4e anneau)
 *   et obstacles rocheux/champignons provoquent une fin de manche (ton doux "Try again?").
 * - Fruits fuyants (evade) protégés contre les 4 coins (avoidCorners + containAndBounce).
 * - Redémarrage / niveau suivant 100% manuel (ESPACE ou clic, jamais automatique).
 */
class SnakeScene extends Scene {
  static LEVELS = [
    {
      num: 1,
      name: 'Sprout Garden',
      nbFruits: 4,
      nbRotten: 0,
      nbHunters: 0,
      hunterSpeed: 0.70,
      vHead: 1.35,
      vNorm: 0.35,
      vEvade: 0.58,
      vision: 38,
      obstacles: []
    },
    {
      num: 2,
      name: 'Dewdrop Patch',
      nbFruits: 6,
      nbRotten: 2,
      nbHunters: 0,
      hunterSpeed: 0.72,
      vHead: 1.55,
      vNorm: 0.52,
      vEvade: 0.88,
      vision: 50,
      obstacles: [
        { rx: 0.28, ry: 0.34, r: 9, kind: 'puddle' },
        { rx: 0.72, ry: 0.66, r: 9, kind: 'mush_red', patrol: { dx: 0, dy: 34, speed: 0.025 } }
      ]
    },
    {
      num: 3,
      name: 'Mushroom Ring',
      nbFruits: 8,
      nbRotten: 3,
      nbHunters: 1,
      hunterSpeed: 0.76,
      vHead: 1.75,
      vNorm: 0.70,
      vEvade: 1.18,
      vision: 62,
      obstacles: [
        { rx: 0.26, ry: 0.30, r: 9, kind: 'mush_red', patrol: { dx: 36, dy: 0, speed: 0.028 } },
        { rx: 0.74, ry: 0.30, r: 9, kind: 'rock_big' },
        { rx: 0.26, ry: 0.72, r: 9, kind: 'puddle' },
        { rx: 0.74, ry: 0.72, r: 9, kind: 'mush_purple_b', patrol: { dx: 0, dy: 30, speed: 0.03 } }
      ]
    },
    {
      num: 4,
      name: 'Berry Frenzy',
      nbFruits: 10,
      nbRotten: 4,
      nbHunters: 1,
      hunterSpeed: 0.92,
      vHead: 1.95,
      vNorm: 0.88,
      vEvade: 1.45,
      vision: 74,
      obstacles: [
        { rx: 0.24, ry: 0.30, r: 9, kind: 'rock_big', patrol: { dx: 42, dy: 0, speed: 0.032 } },
        { rx: 0.76, ry: 0.30, r: 9, kind: 'mush_red' },
        { rx: 0.24, ry: 0.72, r: 9, kind: 'mush_purple_b' },
        { rx: 0.76, ry: 0.72, r: 9, kind: 'puddle', patrol: { dx: 0, dy: 34, speed: 0.032 } },
        { rx: 0.50, ry: 0.26, r: 8, kind: 'rock_big' }
      ]
    },
    {
      num: 5,
      name: 'Butterfly Bloom',
      nbFruits: 12,
      nbRotten: 6,
      nbHunters: 2,
      hunterSpeed: 1.04,
      vHead: 2.15,
      vNorm: 1.04,
      vEvade: 1.72,
      vision: 86,
      obstacles: [
        { rx: 0.24, ry: 0.28, r: 9, kind: 'mush_red', patrol: { dx: 44, dy: 0, speed: 0.036 } },
        { rx: 0.76, ry: 0.28, r: 9, kind: 'rock_big' },
        { rx: 0.24, ry: 0.74, r: 9, kind: 'puddle' },
        { rx: 0.76, ry: 0.74, r: 9, kind: 'mush_purple_b', patrol: { dx: -44, dy: 0, speed: 0.036 } },
        { rx: 0.50, ry: 0.24, r: 8, kind: 'rock_big', patrol: { dx: 0, dy: 26, speed: 0.034 } },
        { rx: 0.50, ry: 0.78, r: 8, kind: 'puddle' }
      ]
    }
  ];

  constructor(game) {
    super(game);
    this.bounds = [14, 30, 452, 228];
    this.state = 'INTRO'; // 'INTRO' | 'PLAYING' | 'PAUSED' | 'LEVEL_CLEAR' | 'VICTORY_ALL' | 'CRASH'
    this.seenIntro = false;

    this.currentLevel = 1;
    this.controlMode = 'KEYBOARD';
    this.crashReason = '';
    this.fruitsEatenLevel = 0;
    this.totalEatenRun = 0;

    // Paramètres dynamiques réglables via le panneau debug [H] (identiques au TP 3)
    this.tuning = {
      instantTurn: true,
      vHead: 1.35,
      maxForce: 0.16,
      slowingRadius: 26,
      spacing: 8,
      startRings: 1,
      vNorm: 0.55,
      vEvade: 0.95,
      vision: 48
    };
    this.debugPanelEl = null;

    this.caterpillar = null;
    this.fruits = [];
    this.obstacles = [];
    this.predators = [];
    this.gardenDecor = [];
    this.pollen = [];
    this.dirtPatches = [];
    this.fx = [];
    this.winButterfly = null;
    this.shakeFrames = 0;
    this.shakeMag = 0;
    this.bannerFrames = 0;

    this.startBtn = { x: 185, y: 186, w: 110, h: 22 };
    this.resumeBtn = { x: 170, y: 98, w: 140, h: 18 };
    this.modeBtn = { x: 170, y: 120, w: 140, h: 18 };
    this.restartBtn = { x: 170, y: 142, w: 140, h: 18 };
    this.exitBtn = { x: 170, y: 164, w: 140, h: 18 };
    this.actionEndBtn = { x: 126, y: 190, w: 110, h: 22 };
    this.hubEndBtn = { x: 246, y: 190, w: 108, h: 22 };
  }

  init() {
    this.game.sound.playMusic('snake');
    this.game.sound.playSfx('jingle_snake', 0.7);
    this.totalEatenRun = 0;
    this.createDebugPanel();
    this.loadLevel(1, !this.seenIntro ? 'INTRO' : 'PLAYING');
  }

  cleanup() {
    if (this.debugPanelEl) {
      this.debugPanelEl.remove();
      this.debugPanelEl = null;
    }
  }

  getLevelCfg(num) {
    return SnakeScene.LEVELS[constrain(num - 1, 0, SnakeScene.LEVELS.length - 1)];
  }

  loadLevel(num, targetState = 'PLAYING') {
    this.currentLevel = constrain(num, 1, SnakeScene.LEVELS.length);
    const cfg = this.getLevelCfg(this.currentLevel);

    this.state = targetState;
    this.crashReason = '';
    this.fruitsEatenLevel = 0;
    this.fx = [];
    this.winButterfly = null;

    // Obstacles du niveau (fixes ou patrouilleurs mobiles — Obstacle extends Vehicle)
    const [bx, by, bw, bh] = this.bounds;
    this.obstacles = cfg.obstacles.map((o, idx) => {
      const ox = bx + o.rx * bw;
      const oy = by + o.ry * bh;
      const obs = new Obstacle(ox, oy, o.r, o.kind);
      obs.kind = o.kind;
      obs.homeX = ox;
      obs.homeY = oy;
      obs.patrol = o.patrol || null;
      obs.patrolPhase = idx * 1.4;
      if (obs.patrol) obs.maxSpeed = 1.2;
      return obs;
    });

    // Gengars affamés qui poursuivent Onix dès le niveau 3 (pursue + avoid + boundaries)
    this.predators = [];
    const hunterSpawns = [
      [bx + bw - 34, by + 34],
      [bx + 34, by + bh - 34]
    ];
    for (let i = 0; i < (cfg.nbHunters || 0); i++) {
      const sp = hunterSpawns[i % hunterSpawns.length];
      this.predators.push(new GardenPredator(sp[0], sp[1], cfg.hunterSpeed || 0.8, this.bounds, this.game.assets));
    }
    this.doubleFrames = 0;

    // Touffes d'herbe et fleurs décoratives (animées par une douce brise)
    this.gardenDecor = [];
    const decorSprites = ['tuft_a', 'tuft_b', 'flower_yellow_s', 'flower_pink_s', 'flower_blue', 'flower_yellow', 'flower_pink'];
    for (let i = 0; i < 30; i++) {
      this.gardenDecor.push({
        sprite: decorSprites[i % decorSprites.length],
        x: Math.round(random(bx + 10, bx + bw - 18)),
        y: Math.round(random(by + 10, by + bh - 18)),
        phase: random(TWO_PI)
      });
    }

    // Petits îlots de terre douce dans la pelouse pour casser la monotonie
    this.dirtPatches = [];
    for (let i = 0; i < 6; i++) {
      this.dirtPatches.push({
        x: Math.round(random(bx + 36, bx + bw - 36)),
        y: Math.round(random(by + 28, by + bh - 28)),
        w: Math.round(random(24, 46)),
        h: Math.round(random(12, 22))
      });
    }

    // Pollen / lucioles d'ambiance dérivant lentement au-dessus du jardin
    this.pollen = [];
    for (let i = 0; i < 16; i++) {
      this.pollen.push({
        x: random(bx + 8, bx + bw - 8),
        y: random(by + 8, by + bh - 8),
        vx: random(-0.14, 0.18),
        vy: random(-0.12, 0.08),
        phase: random(TWO_PI)
      });
    }

    this.bannerFrames = 110;
    this.shakeFrames = 0;

    // Synchroniser les réglages par défaut du niveau dans le panneau debug
    this.tuning.vHead = cfg.vHead;
    this.tuning.vNorm = cfg.vNorm;
    this.tuning.vEvade = cfg.vEvade;
    this.tuning.vision = cfg.vision;
    this.syncDebugPanelValues();

    // Chenille démarrant au centre avec 1 SEUL ANNEAU (ou valeur du slider debug)
    this.caterpillar = new Caterpillar(bx + bw / 2, by + bh / 2, this.tuning.startRings, this.game.assets, this.bounds);
    this.caterpillar.instantTurn = this.tuning.instantTurn;
    this.caterpillar.baseSpeed = this.tuning.vHead;
    this.caterpillar.maxSpeed = this.tuning.vHead;
    this.caterpillar.maxForce = this.tuning.maxForce;
    this.caterpillar.rayonZoneDeFreinage = this.tuning.slowingRadius;
    this.caterpillar.spacing = this.tuning.spacing;
    this.caterpillar.setControlMode(this.controlMode);

    // Génération des bons fruits fuyants + fruits pourris immobiles du niveau
    this.fruits = [];
    const types = ['berry', 'berry', 'shy', 'blueberry', 'golden'];
    for (let i = 0; i < cfg.nbFruits; i++) {
      const pos = this.findSafeFruitPos();
      const type = types[i % types.length];
      this.fruits.push(new GardenFruit(pos.x, pos.y, type, this.game.assets, this.bounds));
    }
    for (let i = 0; i < (cfg.nbRotten || 0); i++) {
      const pos = this.findSafeFruitPos();
      this.fruits.push(new GardenFruit(pos.x, pos.y, 'rotten', this.game.assets, this.bounds));
    }
    // Bonus Rare Candy (2x croissance) dès le niveau 2
    if (this.currentLevel >= 2) {
      const pos = this.findSafeFruitPos();
      this.fruits.push(new GardenFruit(pos.x, pos.y, 'double', this.game.assets, this.bounds));
    }
  }

  /** Position sûre pour un fruit : loin des 4 coins (> 55 px), des obstacles et de la tête. */
  findSafeFruitPos() {
    const [bx, by, bw, bh] = this.bounds;
    const corners = [
      createVector(bx, by),
      createVector(bx + bw, by),
      createVector(bx, by + bh),
      createVector(bx + bw, by + bh)
    ];

    for (let attempt = 0; attempt < 80; attempt++) {
      const x = random(bx + 26, bx + bw - 26);
      const y = random(by + 24, by + bh - 24);
      let ok = true;
      for (const c of corners) {
        if (dist(x, y, c.x, c.y) < 58) { ok = false; break; }
      }
      if (ok) {
        for (const obs of this.obstacles) {
          if (dist(x, y, obs.pos.x, obs.pos.y) < obs.r + 24) { ok = false; break; }
        }
      }
      if (ok && this.caterpillar && dist(x, y, this.caterpillar.pos.x, this.caterpillar.pos.y) < 55) {
        ok = false;
      }
      if (ok) return createVector(x, y);
    }
    return createVector(bx + bw * 0.72, by + bh * 0.5);
  }

  triggerCrash(reason) {
    this.state = 'CRASH';
    this.crashReason = reason;
    this.shakeFrames = 14;
    this.shakeMag = 3;
    this.game.sound.playSfx('fail_soft', 0.8);
    for (let i = 0; i < 10; i++) {
      this.fx.push(new SparkleFX(this.caterpillar.pos.x, this.caterpillar.pos.y, 'sparkle'));
    }
    this.fx.push(new SparkleFX(this.caterpillar.pos.x, this.caterpillar.pos.y - 8, 'text', 'BONK!', color(255, 130, 145)));
  }

  update() {
    // Afficher ou masquer le panneau de sliders uniquement quand le mode debug [H] est actif
    if (this.debugPanelEl) {
      this.debugPanelEl.style.display = Vehicle.debug ? 'flex' : 'none';
    }

    if (this.shakeFrames > 0) this.shakeFrames--;
    if (this.bannerFrames > 0 && this.state === 'PLAYING') this.bannerFrames--;

    // Dérive douce du pollen / lucioles d'ambiance
    const [bx, by, bw, bh] = this.bounds;
    for (const p of this.pollen) {
      p.x += p.vx + Math.sin(frameCount * 0.03 + p.phase) * 0.08;
      p.y += p.vy + Math.cos(frameCount * 0.025 + p.phase) * 0.06;
      if (p.x < bx + 4) p.x = bx + bw - 4;
      if (p.x > bx + bw - 4) p.x = bx + 4;
      if (p.y < by + 4) p.y = by + bh - 4;
      if (p.y > by + bh - 4) p.y = by + 4;
    }

    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].update();
      if (this.fx[i].isDead) this.fx.splice(i, 1);
    }

    if (this.winButterfly) {
      this.winButterfly.step(null);
    }

    if (this.state !== 'PLAYING') return;

    const { mx, my } = this.game.getMouseBufferPos();

    // Appliquer en direct les curseurs du panneau debug [H]
    this.caterpillar.instantTurn = this.tuning.instantTurn;
    this.caterpillar.baseSpeed = this.tuning.vHead;
    this.caterpillar.maxForce = this.tuning.maxForce;
    this.caterpillar.rayonZoneDeFreinage = this.tuning.slowingRadius;
    this.caterpillar.spacing = this.tuning.spacing;

    // 1. Déplacement de la chenille (instantané au clavier par défaut, ou steering force)
    this.caterpillar.step(mx, my);

    // 1.5. Mise à jour des obstacles patrouilleurs mobiles (via vitesse Vehicle)
    for (const obs of this.obstacles) {
      if (obs.patrol) {
        obs.patrolPhase += obs.patrol.speed;
        const targetX = obs.homeX + Math.sin(obs.patrolPhase) * obs.patrol.dx;
        const targetY = obs.homeY + Math.sin(obs.patrolPhase) * obs.patrol.dy;
        obs.vel.set(targetX - obs.pos.x, targetY - obs.pos.y);
        obs.pos.add(obs.vel);
      }
    }

    if (this.doubleFrames > 0) this.doubleFrames--;

    // 1.6. Mise à jour des Gengars qui poursuivent Onix !
    for (const pred of this.predators) {
      pred.step(this.caterpillar, this.obstacles);
      if (pred.catches(this.caterpillar)) {
        this.triggerCrash('Caught by a sneaky Gengar!');
        return;
      }
    }

    // Discrète traînée étincelante pendant le boost myrtille
    if (this.caterpillar.boostFrames > 0 && frameCount % 5 === 0) {
      const tail = this.caterpillar.segments[this.caterpillar.segments.length - 1] || this.caterpillar;
      this.fx.push(new SparkleFX(tail.pos.x, tail.pos.y, 'sparkle'));
    }

    // 2. Vérifications classiques du Snake (TP 3) : murs, auto-collision, obstacles
    if (this.caterpillar.checkWallCollision()) {
      this.triggerCrash('Bonked the garden fence!');
      return;
    }
    if (this.caterpillar.checkSelfCollision()) {
      this.triggerCrash('Tangled in your own tail!');
      return;
    }
    if (this.caterpillar.checkObstacleCollision(this.obstacles)) {
      this.triggerCrash('Bonked a garden obstacle!');
      return;
    }

    // 3. Mise à jour des fruits fuyants (evade + avoidCorners + avoidObstacles)
    for (const f of this.fruits) {
      const panicked = f.step(this.caterpillar, this.obstacles, this.tuning.vNorm, this.tuning.vEvade, this.tuning.vision);
      if (panicked) {
        this.game.sound.playSfx('squeak_1', 0.35);
      }
    }

    // 4. Dégustation des fruits -> bons fruits font grandir, fruits pourris rétrécissent de 1 anneau
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      if (p5.Vector.dist(this.caterpillar.pos, f.pos) < this.caterpillar.r + f.r + 3) {
        if (f.type === 'rotten') {
          const noRingsLeft = this.caterpillar.shrink(1);
          this.fruits.splice(i, 1);
          if (noRingsLeft) {
            this.triggerCrash('No rings left after eating a rotten fruit!');
            return;
          }
          this.game.sound.playSfx('hit_1', 0.75);
          for (let k = 0; k < 5; k++) this.fx.push(new SparkleFX(f.pos.x, f.pos.y, 'sparkle'));
          this.fx.push(new SparkleFX(f.pos.x, f.pos.y - 6, 'text', 'ROTTEN! -1', color(180, 200, 105)));
          continue;
        } else if (f.type === 'double') {
          // Rare Candy : active 2x croissance pendant 8 secondes !
          this.doubleFrames = 480;
          this.game.sound.playSfx('success_bell', 0.65);
          for (let k = 0; k < 6; k++) this.fx.push(new SparkleFX(f.pos.x, f.pos.y, 'sparkle'));
          this.fx.push(new SparkleFX(f.pos.x, f.pos.y - 6, 'text', 'RARE CANDY 2x!', color(140, 224, 255)));
        } else {
          const baseGain = f.type === 'golden' ? 2 : 1;
          const gain = this.doubleFrames > 0 ? baseGain * 2 : baseGain;
          this.caterpillar.grow(gain);
          if (f.type === 'blueberry') this.caterpillar.activateBoost(210);
          this.fruitsEatenLevel++;
          this.totalEatenRun++;
          this.shakeFrames = 5;
          this.shakeMag = 1.2;
          this.game.sound.playSfx('squeak_double_1', 0.65);

          for (let k = 0; k < 6; k++) this.fx.push(new SparkleFX(f.pos.x, f.pos.y, 'sparkle'));
          const lbl = f.type === 'blueberry' ? 'QUICK BALL!' : (gain > 1 ? '+' + gain + ' ROCKS!' : 'CHOMP!');
          this.fx.push(new SparkleFX(f.pos.x, f.pos.y - 6, 'text', lbl, color(255, 232, 110)));
        }

        this.fruits.splice(i, 1);
      }
    }

    // 5. Niveau terminé quand tous les Scorbunnies du niveau sont attrapés (les Toxic Orbs & Rare Candies ne bloquent pas)
    const remainingGood = this.fruits.filter((f) => f.type !== 'rotten' && f.type !== 'double').length;
    if (remainingGood === 0) {
      this.game.sound.playSfx('success_bell', 0.9);
      this.winButterfly = new HubButterfly(this.caterpillar.pos.x, this.caterpillar.pos.y, this.game.assets);
      for (let i = 0; i < 20; i++) {
        this.fx.push(new SparkleFX(this.caterpillar.pos.x, this.caterpillar.pos.y, 'confetti'));
      }

      if (this.currentLevel < SnakeScene.LEVELS.length) {
        this.state = 'LEVEL_CLEAR';
        const stars = this.currentLevel >= 3 ? 2 : 1;
        this.game.save.recordGameResult('snake', stars, 4 + this.currentLevel);
      } else {
        this.state = 'VICTORY_ALL';
        this.game.save.recordGameResult('snake', 3, 18);
      }
    }
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const [bx, by, bw, bh] = this.bounds;

    g.push();
    if (this.shakeFrames > 0) {
      g.translate(Math.round(random(-this.shakeMag, this.shakeMag)), Math.round(random(-this.shakeMag, this.shakeMag)));
    }

    // 1. Palette d'ambiance dynamique par niveau (du matin printanier au jardin luciole !)
    const themes = [
      { bg: [134, 178, 108], c1: [160, 202, 128], c2: [151, 195, 120], dirt: [216, 194, 146], tint: null },
      { bg: [122, 174, 122], c1: [148, 196, 140], c2: [140, 188, 132], dirt: [204, 192, 148], tint: [110, 200, 220, 14] },
      { bg: [142, 176, 104], c1: [168, 200, 120], c2: [159, 192, 113], dirt: [218, 190, 138], tint: [255, 220, 130, 16] },
      { bg: [146, 162, 108], c1: [172, 188, 122], c2: [163, 180, 114], dirt: [216, 180, 138], tint: [245, 155, 120, 22] },
      { bg: [110, 134, 120], c1: [134, 164, 136], c2: [126, 156, 128], dirt: [190, 168, 148], tint: [130, 92, 175, 28] }
    ];
    const th = themes[constrain(this.currentLevel - 1, 0, themes.length - 1)];

    // Fond extérieur + pelouse en damier organique
    g.noStroke();
    g.fill(th.bg[0], th.bg[1], th.bg[2]);
    g.rect(0, 0, 480, 272);
    g.fill(th.c1[0], th.c1[1], th.c1[2]);
    g.rect(bx, by, bw, bh);
    g.fill(th.c2[0], th.c2[1], th.c2[2]);
    for (let y = by; y < by + bh; y += 16) {
      for (let x = bx; x < bx + bw; x += 16) {
        if (((x - bx + y - by) / 16) % 2 === 0) g.rect(x, y, 16, 16);
      }
    }

    // Ligne médiane & Pokéball géante du stade Pokémon !
    g.push();
    g.noFill();
    g.stroke(255, 255, 245, 78);
    g.strokeWeight(2);
    const fcx = bx + bw / 2;
    const fcy = by + bh / 2;
    g.line(fcx, by + 4, fcx, by + bh - 4);
    g.circle(fcx, fcy, 68);
    g.circle(fcx, fcy, 20);
    g.noStroke();
    g.fill(232, 92, 96, 36);
    g.arc(fcx, fcy, 66, 66, PI, TWO_PI);
    g.fill(255, 255, 245, 36);
    g.arc(fcx, fcy, 66, 66, 0, PI);
    g.pop();

    // Petits îlots de terre douce
    g.fill(th.dirt[0], th.dirt[1], th.dirt[2], 125);
    for (const dp of this.dirtPatches) {
      g.ellipse(dp.x, dp.y, dp.w, dp.h);
    }

    // Fleurs et herbes qui se balancent doucement dans la brise
    for (const dec of this.gardenDecor) {
      const sp = assets.getSprite(dec.sprite);
      if (sp) {
        const sway = Math.round(Math.sin(frameCount * 0.045 + dec.phase) * 0.8);
        g.image(sp, dec.x + sway, dec.y);
      }
    }

    // Ombre intérieure douce sous la clôture supérieure
    g.noStroke();
    g.fill(68, 96, 62, 55);
    g.rect(bx + 2, by + 2, bw - 4, 4);

    // Clôture en bois illustrée + poteaux d'angle (style Sprout Lands)
    g.noFill();
    g.stroke(107, 75, 91);
    g.strokeWeight(5);
    g.rect(bx - 1, by - 1, bw + 2, bh + 2);
    g.stroke(182, 137, 98);
    g.strokeWeight(2);
    g.rect(bx - 1, by - 1, bw + 2, bh + 2);

    // Poteaux de clôture réguliers sur les bords
    g.noStroke();
    const posts = [
      [bx - 3, by - 3], [bx + bw - 3, by - 3],
      [bx - 3, by + bh - 3], [bx + bw - 3, by + bh - 3]
    ];
    for (const [px, py] of posts) {
      g.fill(107, 75, 91);
      g.rect(px, py, 6, 6);
      g.fill(218, 174, 126);
      g.rect(px + 1, py + 1, 4, 4);
    }

    // Alerte visuelle dynamique sur le bord le plus proche quand la chenille s'approche d'un mur !
    if (this.caterpillar && this.state === 'PLAYING') {
      const warnDist = 26;
      const hx = this.caterpillar.pos.x;
      const hy = this.caterpillar.pos.y;
      g.strokeWeight(2);
      if (hx - bx < warnDist) {
        g.stroke(235, 70, 90, map(hx - bx, 0, warnDist, 240, 0, true));
        g.line(bx + 1, by + 2, bx + 1, by + bh - 2);
      }
      if (bx + bw - hx < warnDist) {
        g.stroke(235, 70, 90, map(bx + bw - hx, 0, warnDist, 240, 0, true));
        g.line(bx + bw - 1, by + 2, bx + bw - 1, by + bh - 2);
      }
      if (hy - by < warnDist) {
        g.stroke(235, 70, 90, map(hy - by, 0, warnDist, 240, 0, true));
        g.line(bx + 2, by + 1, bx + bw - 2, by + 1);
      }
      if (by + bh - hy < warnDist) {
        g.stroke(235, 70, 90, map(by + bh - hy, 0, warnDist, 240, 0, true));
        g.line(bx + 2, by + bh - 1, bx + bw - 2, by + bh - 1);
      }
    }

    // Petites guirlandes festives en haut de l'arène
    for (let gx = bx + 4; gx < bx + bw - 16; gx += 16) {
      const sp = assets.getSprite(((gx - bx) / 16) % 2 === 0 ? 'bunting_a' : 'bunting_b');
      if (sp) g.image(sp, gx, by - 4 + Math.round(Math.sin(frameCount * 0.05 + gx * 0.05) * 0.6));
    }

    // En mode debug [H], afficher les 4 arcs d'exclusion des coins (comme TP 3 !)
    if (Vehicle.debug) {
      g.push();
      g.noFill();
      g.stroke(255, 165, 95, 180);
      g.strokeWeight(1);
      const rD = 38 * 2;
      g.arc(bx, by, rD, rD, 0, HALF_PI);
      g.arc(bx + bw, by, rD, rD, HALF_PI, PI);
      g.arc(bx, by + bh, rD, rD, -HALF_PI, 0);
      g.arc(bx + bw, by + bh, rD, rD, PI, PI + HALF_PI);
      g.pop();
    }

    // 2. Obstacles mortels du niveau (visuellement très reconnaissables : anneau rouge pulsant + épines)
    for (const obs of this.obstacles) {
      const px = Math.round(obs.pos.x);
      const py = Math.round(obs.pos.y);
      const pulse = Math.sin(frameCount * 0.12 + px * 0.1) * 0.5 + 0.5;

      // Zone de danger rouge-corail pulsante + épines autour de l'obstacle
      g.push();
      g.noStroke();
      g.fill(220, 68, 88, 55 + pulse * 40);
      g.circle(px, py, obs.r * 2.5);

      g.noFill();
      g.stroke(235, 65, 85, 190 + pulse * 65);
      g.strokeWeight(1.5);
      g.circle(px, py, obs.r * 2.25);

      // 8 petites épines pixelisées autour du cercle pour signaler le danger au premier coup d'œil
      g.stroke(107, 45, 62);
      g.strokeWeight(1);
      for (let k = 0; k < 8; k++) {
        const a = (TWO_PI * k) / 8;
        const rIn = obs.r * 1.05;
        const rOut = obs.r * 1.38;
        g.line(
          Math.round(px + Math.cos(a) * rIn),
          Math.round(py + Math.sin(a) * rIn),
          Math.round(px + Math.cos(a) * rOut),
          Math.round(py + Math.sin(a) * rOut)
        );
      }
      g.pop();

      // Sprite de l'obstacle au centre (avec petite onde animée pour les flaques)
      if (obs.kind === 'puddle') {
        g.noStroke();
        g.fill(130, 192, 214);
        g.ellipse(px, py, obs.r * 2.0, obs.r * 1.4);
        g.fill(164, 218, 234);
        g.ellipse(px - 2, py - 1, obs.r * 1.2, obs.r * 0.7);
        const rip = (frameCount * 0.2 + px) % (obs.r * 1.6);
        g.noFill();
        g.stroke(235, 250, 255, map(rip, 0, obs.r * 1.6, 170, 0));
        g.strokeWeight(1);
        g.ellipse(px, py, rip, rip * 0.65);
      } else {
        const sp = assets.getSprite(obs.kind);
        if (sp) g.image(sp, px - Math.floor(sp.width / 2), py - Math.floor(sp.height / 2));
      }

      // Rail pointillé discret sous les obstacles mobiles pour annoncer leur trajet
      if (obs.patrol) {
        g.push();
        g.stroke(235, 85, 95, 95);
        g.strokeWeight(1);
        g.line(
          Math.round(obs.homeX - obs.patrol.dx),
          Math.round(obs.homeY - obs.patrol.dy),
          Math.round(obs.homeX + obs.patrol.dx),
          Math.round(obs.homeY + obs.patrol.dy)
        );
        g.pop();
      }

      // Petit '!' rouge pulsant au-dessus de l'obstacle mortel
      g.noStroke();
      g.fill(255, 245, 245);
      g.rect(px - 2, py - obs.r - 8, 4, 7);
      g.fill(225, 55, 78);
      g.rect(px - 1, py - obs.r - 7, 2, 3);
      g.rect(px - 1, py - obs.r - 3, 2, 1);

      obs.showDebug(g);
    }

    // 3. Ombres sous les fruits + Fruits + Prédateurs + Chenille + Papillon de victoire + FX
    g.noStroke();
    g.fill(68, 96, 62, 70);
    for (const f of this.fruits) {
      g.ellipse(Math.round(f.pos.x), Math.round(f.pos.y) + 6, 10, 4);
    }
    for (const f of this.fruits) f.show(g);
    for (const pred of this.predators) pred.show(g);
    if (this.caterpillar) this.caterpillar.show(g);
    if (this.winButterfly) this.winButterfly.show(g);
    for (const fx of this.fx) fx.show(g, assets);

    // 3.5. Pollen doré / lucioles flottantes + léger voile d'ambiance du niveau
    g.noStroke();
    for (const p of this.pollen) {
      const a = 110 + Math.sin(frameCount * 0.09 + p.phase) * 90;
      g.fill(255, 246, 185, a);
      g.rect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    if (th.tint) {
      g.fill(th.tint[0], th.tint[1], th.tint[2], th.tint[3]);
      g.rect(bx, by, bw, bh);
    }

    g.pop();

    // Bannière animée de début de niveau
    const cfg = this.getLevelCfg(this.currentLevel);
    if (this.bannerFrames > 0 && this.state === 'PLAYING') {
      PixelUI.drawTag(g, font, 'LEVEL ' + cfg.num + ' — ' + cfg.name.toUpperCase(), 240, 52, g.color(247, 235, 170));
    }

    // 4. HUD supérieur (PokéMoo Feast!!)
    const goodLeft = this.fruits.filter((f) => f.type !== 'rotten' && f.type !== 'double').length;
    PixelUI.panel(g, 8, 5, 114, 16);
    PixelUI.txt(g, font, 'LVL ' + cfg.num + '/5 ' + cfg.name.split(' ')[0], 13, 8, g.color(107, 75, 91), LEFT, 8.5, 104);

    PixelUI.panel(g, 130, 5, 88, 16);
    PixelUI.txt(g, font, 'BUNS ' + goodLeft + '/' + cfg.nbFruits, 136, 8, g.color(107, 75, 91), LEFT, 8.5, 78);

    PixelUI.panel(g, 224, 5, 78, 16);
    const rings = this.caterpillar ? this.caterpillar.getRingCount() : 1;
    const boostTag = this.doubleFrames > 0 ? ' 2x!' : '';
    PixelUI.txt(g, font, 'ROCKS: ' + rings + boostTag, 229, 8, this.doubleFrames > 0 ? g.color(64, 138, 198) : g.color(107, 75, 91), LEFT, 8.5, 70);

    PixelUI.panel(g, 308, 5, 118, 16);
    const modeTxt = this.controlMode === 'KEYBOARD' ? '[C] Arrows' : '[C] Mouse';
    PixelUI.txt(g, font, modeTxt + ' | M Menu', 313, 8, g.color(144, 98, 93), LEFT, 8.5, 108);

    if (this.state === 'INTRO') this.drawIntroCard(g);
    else if (this.state === 'PAUSED') this.drawPauseMenu(g);
    else if (this.state === 'LEVEL_CLEAR' || this.state === 'VICTORY_ALL' || this.state === 'CRASH') {
      this.drawEndCard(g);
    }
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    this.startBtn = { x: 180, y: 204, w: 120, h: 24 };
    PixelUI.drawRulesCard(g, font, {
      title: 'POKEMOO FEAST!! (5 STADIUM LEVELS)',
      headerCol: g.color(206, 78, 86),
      rules: [
        'Play as Onix! Catch all fleeing Scorbunnies to grow rock rings!',
        'Grab Quick Balls (speed boost) & Rare Candies (2x growth)!',
        'Avoid spiky hazards, moving patrols & chasing Gengars (Lvl 3+).',
        'Purple Toxic Orbs shrink Onix by 1 rock (0 rocks = Game Over)!'
      ],
      controls: 'Arrows / WASD: Steer Onix  |  [C] Mouse Mode  |  [H] Debug Sliders',
      btnRect: this.startBtn,
      btnLabel: 'PLAY! (Space)',
      mx,
      my
    });
  }

  drawPauseMenu(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    g.noStroke();
    g.fill(0, 0, 0, 115);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 138, 66, 204, 140);
    g.fill(122, 174, 112);
    g.rect(138, 66, 204, 22);
    PixelUI.txt(g, font, 'PAUSED — LEVEL ' + this.currentLevel, 240, 72, g.color(243, 244, 231), CENTER);

    PixelUI.drawButton(g, font, this.resumeBtn, 'Resume (Esc)', PixelUI.pointInRect(mx, my, this.resumeBtn), g.color(223, 240, 187));
    const mLbl = this.controlMode === 'KEYBOARD' ? 'Mode: Arrows [M]' : 'Mode: Mouse [M]';
    PixelUI.drawButton(g, font, this.modeBtn, mLbl, PixelUI.pointInRect(mx, my, this.modeBtn));
    PixelUI.drawButton(g, font, this.restartBtn, 'Restart Level', PixelUI.pointInRect(mx, my, this.restartBtn));
    PixelUI.drawButton(g, font, this.exitBtn, 'Back to Fair', PixelUI.pointInRect(mx, my, this.exitBtn));
  }

  drawEndCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    const isClear = this.state === 'LEVEL_CLEAR';
    const isAll = this.state === 'VICTORY_ALL';

    g.noStroke();
    g.fill(0, 0, 0, 100);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 84, 58, 312, 164);
    g.fill(isAll ? g.color(235, 190, 75) : (isClear ? g.color(122, 174, 112) : g.color(189, 117, 126)));
    g.rect(84, 58, 312, 22);
    const title = isAll
      ? 'ALL 5 LEVELS CLEARED!'
      : (isClear ? 'LEVEL ' + this.currentLevel + ' COMPLETE!' : 'SO CLOSE! TRY AGAIN?');
    PixelUI.txt(g, font, title, 240, 64, g.color(243, 244, 231), CENTER);

    if (isAll) {
      PixelUI.txt(g, font, 'Butterfly Master! ★★★  (+18 tickets)', 240, 102, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, 'Total fruit eaten: ' + this.totalEatenRun, 240, 124, g.color(144, 98, 93), CENTER);
    } else if (isClear) {
      const nextCfg = this.getLevelCfg(this.currentLevel + 1);
      PixelUI.txt(g, font, 'Next: Level ' + nextCfg.num + ' - ' + nextCfg.name, 240, 102, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, '(' + nextCfg.nbFruits + ' fruit, ' + nextCfg.obstacles.length + ' obstacles)', 240, 124, g.color(144, 98, 93), CENTER);
    } else {
      PixelUI.txt(g, font, this.crashReason, 240, 102, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, 'Rings reached: ' + this.caterpillar.getRingCount(), 240, 124, g.color(144, 98, 93), CENTER);
    }

    PixelUI.txt(g, font, 'Press Space or click below', 240, 162, g.color(144, 98, 93), CENTER);

    const primaryLbl = isAll ? 'Play Level 1' : (isClear ? 'Next Level ->' : 'Retry Level');
    PixelUI.drawButton(g, font, this.actionEndBtn, primaryLbl, PixelUI.pointInRect(mx, my, this.actionEndBtn), g.color(223, 240, 187));
    PixelUI.drawButton(g, font, this.hubEndBtn, 'Back to Fair', PixelUI.pointInRect(mx, my, this.hubEndBtn));
  }

  /** Crée le panneau de curseurs TP 3 (visible uniquement quand Debug [H] est activé). */
  createDebugPanel() {
    if (this.debugPanelEl) this.debugPanelEl.remove();
    const el = document.createElement('div');
    el.id = 'snake-debug-panel';
    el.className = 'debug-side-panel';
    el.style.display = Vehicle.debug ? 'flex' : 'none';
    el.innerHTML = `
      <div class="dp-title">SNAKE DEBUG [H]</div>
      <div class="dp-row">
        <button id="sd-mode" class="dp-btn">Mode: Arrows</button>
        <button id="sd-pause" class="dp-btn">Pause [P]</button>
      </div>
      <label class="dp-check">
        <input id="sd-instant" type="checkbox" checked> Instant Keyboard Turn
      </label>
      <label>Speed: <span id="sd-v-head">${this.tuning.vHead}</span>
        <input id="sd-head" type="range" min="0.8" max="3.5" step="0.05" value="${this.tuning.vHead}">
      </label>
      <label>Max Force: <span id="sd-v-force">${this.tuning.maxForce}</span>
        <input id="sd-force" type="range" min="0.04" max="0.6" step="0.02" value="${this.tuning.maxForce}">
      </label>
      <label>Slow Radius: <span id="sd-v-slow">${this.tuning.slowingRadius}</span>
        <input id="sd-slow" type="range" min="10" max="80" step="2" value="${this.tuning.slowingRadius}">
      </label>
      <label>Ring Gap: <span id="sd-v-gap">${this.tuning.spacing}</span>
        <input id="sd-gap" type="range" min="5" max="16" step="1" value="${this.tuning.spacing}">
      </label>
      <label>Start Rings: <span id="sd-v-rings">${this.tuning.startRings}</span>
        <input id="sd-rings" type="range" min="1" max="10" step="1" value="${this.tuning.startRings}">
      </label>
      <label>Fruit Speed: <span id="sd-v-fnorm">${this.tuning.vNorm}</span>
        <input id="sd-fnorm" type="range" min="0.2" max="2.0" step="0.05" value="${this.tuning.vNorm}">
      </label>
      <label>Fruit Evade: <span id="sd-v-fevade">${this.tuning.vEvade}</span>
        <input id="sd-fevade" type="range" min="0.4" max="2.6" step="0.05" value="${this.tuning.vEvade}">
      </label>
      <label>Fruit Vision: <span id="sd-v-fvis">${this.tuning.vision}</span>
        <input id="sd-fvis" type="range" min="20" max="140" step="4" value="${this.tuning.vision}">
      </label>
      <div class="dp-row">
        <button class="dp-btn" data-lv="1">L1</button>
        <button class="dp-btn" data-lv="2">L2</button>
        <button class="dp-btn" data-lv="3">L3</button>
        <button class="dp-btn" data-lv="4">L4</button>
        <button class="dp-btn" data-lv="5">L5</button>
      </div>
    `;
    document.body.appendChild(el);
    this.debugPanelEl = el;

    const bind = (sel, lbl, key, onExtra) => {
      const inp = el.querySelector(sel);
      inp.addEventListener('input', () => {
        this.tuning[key] = Number(inp.value);
        el.querySelector(lbl).textContent = inp.value;
        if (onExtra) onExtra();
      });
    };

    bind('#sd-head', '#sd-v-head', 'vHead');
    bind('#sd-force', '#sd-v-force', 'maxForce', () => {
      // Si l'utilisateur ajuste Max Force, on désactive le virage instantané pour sentir la force
      this.tuning.instantTurn = false;
      el.querySelector('#sd-instant').checked = false;
    });
    bind('#sd-slow', '#sd-v-slow', 'slowingRadius');
    bind('#sd-gap', '#sd-v-gap', 'spacing');
    bind('#sd-rings', '#sd-v-rings', 'startRings', () => this.loadLevel(this.currentLevel, 'PLAYING'));
    bind('#sd-fnorm', '#sd-v-fnorm', 'vNorm');
    bind('#sd-fevade', '#sd-v-fevade', 'vEvade');
    bind('#sd-fvis', '#sd-v-fvis', 'vision');

    el.querySelector('#sd-instant').addEventListener('change', (e) => {
      this.tuning.instantTurn = e.target.checked;
    });
    el.querySelector('#sd-mode').onclick = () => {
      this.toggleControlMode();
      this.syncDebugPanelValues();
    };
    el.querySelector('#sd-pause').onclick = () => {
      this.togglePause();
    };
    el.querySelectorAll('[data-lv]').forEach((btn) => {
      btn.onclick = () => this.loadLevel(Number(btn.getAttribute('data-lv')), 'PLAYING');
    });
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.game.sound.playSfx('ui_click');
      this.state = 'PAUSED';
    } else if (this.state === 'PAUSED') {
      this.game.sound.playSfx('ui_click');
      this.state = 'PLAYING';
    }
    this.syncDebugPanelValues();
  }

  syncDebugPanelValues() {
    if (!this.debugPanelEl) return;
    const setVal = (sel, lbl, val) => {
      const inp = this.debugPanelEl.querySelector(sel);
      if (inp) inp.value = val;
      const sp = this.debugPanelEl.querySelector(lbl);
      if (sp) sp.textContent = val;
    };
    setVal('#sd-head', '#sd-v-head', this.tuning.vHead);
    setVal('#sd-force', '#sd-v-force', this.tuning.maxForce);
    setVal('#sd-slow', '#sd-v-slow', this.tuning.slowingRadius);
    setVal('#sd-gap', '#sd-v-gap', this.tuning.spacing);
    setVal('#sd-rings', '#sd-v-rings', this.tuning.startRings);
    setVal('#sd-fnorm', '#sd-v-fnorm', this.tuning.vNorm);
    setVal('#sd-fevade', '#sd-v-fevade', this.tuning.vEvade);
    setVal('#sd-fvis', '#sd-v-fvis', this.tuning.vision);
    const modeBtn = this.debugPanelEl.querySelector('#sd-mode');
    if (modeBtn) modeBtn.textContent = this.controlMode === 'KEYBOARD' ? 'Mode: Arrows' : 'Mode: Mouse';
    const pauseBtn = this.debugPanelEl.querySelector('#sd-pause');
    if (pauseBtn) pauseBtn.textContent = this.state === 'PAUSED' ? 'Resume [P]' : 'Pause [P]';
    const inst = this.debugPanelEl.querySelector('#sd-instant');
    if (inst) inst.checked = this.tuning.instantTurn;
    this.debugPanelEl.querySelectorAll('[data-lv]').forEach((btn) => {
      const lv = Number(btn.getAttribute('data-lv'));
      btn.classList.toggle('dp-active', lv === this.currentLevel);
    });
  }

  toggleControlMode() {
    this.controlMode = this.controlMode === 'KEYBOARD' ? 'MOUSE' : 'KEYBOARD';
    if (this.caterpillar) this.caterpillar.setControlMode(this.controlMode);
    this.game.sound.playSfx('ui_click');
  }

  handleEndPrimaryAction() {
    this.game.sound.playSfx('ui_click');
    if (this.state === 'LEVEL_CLEAR') {
      this.loadLevel(this.currentLevel + 1, 'PLAYING');
    } else if (this.state === 'VICTORY_ALL') {
      this.totalEatenRun = 0;
      this.loadLevel(1, 'PLAYING');
    } else if (this.state === 'CRASH') {
      this.loadLevel(this.currentLevel, 'PLAYING');
    }
  }

  backToHub() {
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo('hub', { fromBooth: 'snake' });
  }

  mousePressed(mx, my) {
    if (this.state === 'INTRO') {
      if (PixelUI.pointInRect(mx, my, this.startBtn)) {
        this.game.sound.playSfx('ui_click');
        this.seenIntro = true;
        this.state = 'PLAYING';
      }
      return;
    }
    if (this.state === 'PAUSED') {
      if (PixelUI.pointInRect(mx, my, this.resumeBtn)) this.state = 'PLAYING';
      else if (PixelUI.pointInRect(mx, my, this.modeBtn)) this.toggleControlMode();
      else if (PixelUI.pointInRect(mx, my, this.restartBtn)) this.loadLevel(this.currentLevel, 'PLAYING');
      else if (PixelUI.pointInRect(mx, my, this.exitBtn)) this.backToHub();
      return;
    }
    if (this.state === 'LEVEL_CLEAR' || this.state === 'VICTORY_ALL' || this.state === 'CRASH') {
      if (PixelUI.pointInRect(mx, my, this.actionEndBtn)) this.handleEndPrimaryAction();
      else if (PixelUI.pointInRect(mx, my, this.hubEndBtn)) this.backToHub();
    }
  }

  keyPressed(k, kc) {
    if (this.state === 'INTRO') {
      if (k === ' ' || kc === ENTER) {
        this.seenIntro = true;
        this.state = 'PLAYING';
      } else if (kc === ESCAPE) {
        this.backToHub();
      }
      return;
    }

    if (kc === ESCAPE) {
      if (this.state === 'PLAYING' || this.state === 'PAUSED') this.togglePause();
      else this.backToHub();
      return;
    }

    // En mode debug [H], la touche P met en pause / reprend et 1-5 sélectionne un niveau
    if (Vehicle.debug) {
      if (k === 'p' || k === 'P') {
        this.togglePause();
        return;
      }
      if (k >= '1' && k <= '5') {
        this.loadLevel(parseInt(k, 10), 'PLAYING');
        return;
      }
    }

    if (k === 'c' || k === 'C') {
      this.toggleControlMode();
      return;
    }

    if (this.state === 'PLAYING') {
      if (kc === UP_ARROW || k === 'z' || k === 'Z' || k === 'w' || k === 'W') {
        this.controlMode = 'KEYBOARD';
        this.caterpillar.setDirection(0, -1);
      } else if (kc === DOWN_ARROW || k === 's' || k === 'S') {
        this.controlMode = 'KEYBOARD';
        this.caterpillar.setDirection(0, 1);
      } else if (kc === LEFT_ARROW || k === 'q' || k === 'Q' || k === 'a' || k === 'A') {
        this.controlMode = 'KEYBOARD';
        this.caterpillar.setDirection(-1, 0);
      } else if (kc === RIGHT_ARROW || k === 'd' || k === 'D') {
        this.controlMode = 'KEYBOARD';
        this.caterpillar.setDirection(1, 0);
      }
      return;
    }

    if ((this.state === 'LEVEL_CLEAR' || this.state === 'VICTORY_ALL' || this.state === 'CRASH')
        && (k === ' ' || kc === ENTER)) {
      this.handleEndPrimaryAction();
    }
  }
}
