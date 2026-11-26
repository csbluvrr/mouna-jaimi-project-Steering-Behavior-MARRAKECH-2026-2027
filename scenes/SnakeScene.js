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
      vHead: 1.35,
      vNorm: 0.55,
      vEvade: 0.95,
      vision: 48,
      obstacles: []
    },
    {
      num: 2,
      name: 'Dewdrop Patch',
      nbFruits: 6,
      nbRotten: 2,
      vHead: 1.55,
      vNorm: 0.70,
      vEvade: 1.15,
      vision: 58,
      obstacles: [
        { rx: 0.28, ry: 0.34, r: 9, kind: 'puddle' },
        { rx: 0.72, ry: 0.66, r: 9, kind: 'mush_red' }
      ]
    },
    {
      num: 3,
      name: 'Mushroom Ring',
      nbFruits: 8,
      nbRotten: 3,
      vHead: 1.75,
      vNorm: 0.85,
      vEvade: 1.35,
      vision: 68,
      obstacles: [
        { rx: 0.26, ry: 0.30, r: 9, kind: 'mush_red' },
        { rx: 0.74, ry: 0.30, r: 9, kind: 'rock_big' },
        { rx: 0.26, ry: 0.72, r: 9, kind: 'puddle' },
        { rx: 0.74, ry: 0.72, r: 9, kind: 'mush_purple_b' }
      ]
    },
    {
      num: 4,
      name: 'Berry Frenzy',
      nbFruits: 10,
      nbRotten: 4,
      vHead: 1.95,
      vNorm: 0.95,
      vEvade: 1.50,
      vision: 76,
      obstacles: [
        { rx: 0.24, ry: 0.30, r: 9, kind: 'rock_big' },
        { rx: 0.76, ry: 0.30, r: 9, kind: 'mush_red' },
        { rx: 0.24, ry: 0.72, r: 9, kind: 'mush_purple_b' },
        { rx: 0.76, ry: 0.72, r: 9, kind: 'puddle' },
        { rx: 0.50, ry: 0.26, r: 8, kind: 'rock_big' }
      ]
    },
    {
      num: 5,
      name: 'Butterfly Bloom',
      nbFruits: 12,
      nbRotten: 6,
      vHead: 2.15,
      vNorm: 1.05,
      vEvade: 1.65,
      vision: 86,
      obstacles: [
        { rx: 0.24, ry: 0.28, r: 9, kind: 'mush_red' },
        { rx: 0.76, ry: 0.28, r: 9, kind: 'rock_big' },
        { rx: 0.24, ry: 0.74, r: 9, kind: 'puddle' },
        { rx: 0.76, ry: 0.74, r: 9, kind: 'mush_purple_b' },
        { rx: 0.50, ry: 0.24, r: 8, kind: 'rock_big' },
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
    this.gardenDecor = [];
    this.fx = [];
    this.winButterfly = null;

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

    // Obstacles fixes du niveau (Obstacle extends Vehicle, maxSpeed = 0)
    const [bx, by, bw, bh] = this.bounds;
    this.obstacles = cfg.obstacles.map((o) => {
      const obs = new Obstacle(bx + o.rx * bw, by + o.ry * bh, o.r, o.kind);
      obs.kind = o.kind;
      return obs;
    });

    // Touffes d'herbe et fleurs décoratives
    this.gardenDecor = [];
    const decorSprites = ['tuft_a', 'tuft_b', 'flower_yellow_s', 'flower_pink_s', 'flower_blue'];
    for (let i = 0; i < 22; i++) {
      this.gardenDecor.push({
        sprite: decorSprites[i % decorSprites.length],
        x: Math.round(random(bx + 8, bx + bw - 16)),
        y: Math.round(random(by + 8, by + bh - 16))
      });
    }

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
        } else {
          const gain = f.type === 'golden' ? 2 : 1;
          this.caterpillar.grow(gain);
          if (f.type === 'blueberry') this.caterpillar.activateBoost(180);
          this.fruitsEatenLevel++;
          this.totalEatenRun++;
          this.game.sound.playSfx('squeak_double_1', 0.65);

          for (let k = 0; k < 6; k++) this.fx.push(new SparkleFX(f.pos.x, f.pos.y, 'sparkle'));
          const lbl = f.type === 'blueberry' ? 'BOOST!' : (gain > 1 ? '+' + gain + ' ★' : 'NOM!');
          this.fx.push(new SparkleFX(f.pos.x, f.pos.y - 6, 'text', lbl, color(255, 232, 110)));
        }

        this.fruits.splice(i, 1);
      }
    }

    // 5. Niveau terminé quand tous les BONS fruits du niveau sont mangés (les pourris ne comptent pas)
    const remainingGood = this.fruits.filter((f) => f.type !== 'rotten').length;
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

    // 1. Pelouse du jardin + clôture (murs mortels)
    g.noStroke();
    g.fill(157, 198, 126);
    g.rect(0, 0, 480, 272);
    g.fill(149, 191, 118);
    for (let y = by; y < by + bh; y += 16) {
      for (let x = bx; x < bx + bw; x += 16) {
        if (((x - bx + y - by) / 16) % 2 === 0) g.rect(x, y, 16, 16);
      }
    }

    for (const dec of this.gardenDecor) {
      const sp = assets.getSprite(dec.sprite);
      if (sp) g.image(sp, dec.x, dec.y);
    }

    // Bordure du jardin (teinte corail douce pour rappeler que toucher le bord arrête la manche)
    g.noFill();
    g.stroke(189, 117, 126);
    g.strokeWeight(3);
    g.rect(bx, by, bw, bh);

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

      // Sprite de l'obstacle au centre
      if (obs.kind === 'puddle') {
        g.noStroke();
        g.fill(130, 192, 214);
        g.ellipse(px, py, obs.r * 2.0, obs.r * 1.4);
        g.fill(164, 218, 234);
        g.ellipse(px - 2, py - 1, obs.r * 1.2, obs.r * 0.7);
      } else {
        const sp = assets.getSprite(obs.kind);
        if (sp) g.image(sp, px - Math.floor(sp.width / 2), py - Math.floor(sp.height / 2));
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

    // 3. Fruits + Chenille + Papillon de victoire + FX
    for (const f of this.fruits) f.show(g);
    if (this.caterpillar) this.caterpillar.show(g);
    if (this.winButterfly) this.winButterfly.show(g);
    for (const fx of this.fx) fx.show(g, assets);

    // 4. HUD supérieur
    const cfg = this.getLevelCfg(this.currentLevel);
    const goodLeft = this.fruits.filter((f) => f.type !== 'rotten').length;
    PixelUI.panel(g, 8, 5, 114, 16);
    PixelUI.txt(g, font, 'LVL ' + cfg.num + '/5 ' + cfg.name.split(' ')[0], 13, 8, g.color(107, 75, 91));

    PixelUI.panel(g, 130, 5, 86, 16);
    PixelUI.txt(g, font, 'FRUIT ' + goodLeft + '/' + cfg.nbFruits, 136, 8, g.color(107, 75, 91));

    PixelUI.panel(g, 224, 5, 76, 16);
    const rings = this.caterpillar ? this.caterpillar.getRingCount() : 1;
    PixelUI.txt(g, font, 'RINGS: ' + rings, 230, 8, g.color(107, 75, 91));

    PixelUI.panel(g, 308, 5, 108, 16);
    const modeTxt = this.controlMode === 'KEYBOARD' ? '[M] Arrows' : '[M] Mouse';
    PixelUI.txt(g, font, modeTxt + ' | Esc', 313, 8, g.color(144, 98, 93));

    if (this.state === 'INTRO') this.drawIntroCard(g);
    else if (this.state === 'PAUSED') this.drawPauseMenu(g);
    else if (this.state === 'LEVEL_CLEAR' || this.state === 'VICTORY_ALL' || this.state === 'CRASH') {
      this.drawEndCard(g);
    }
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    g.noStroke();
    g.fill(0, 0, 0, 115);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 68, 50, 344, 166);
    g.fill(122, 174, 112);
    g.rect(68, 50, 344, 22);
    PixelUI.txt(g, font, 'CATERPILLAR CRAWL (5 LEVELS)', 240, 56, g.color(243, 244, 231), CENTER);

    PixelUI.txt(g, font, 'Start with 1 ring & eat all fleeing fruit to advance!', 240, 86, g.color(107, 75, 91), CENTER);
    PixelUI.txt(g, font, 'Arrows/WASD to steer (press M to switch Mouse Arrive).', 240, 106, g.color(107, 75, 91), CENTER);
    PixelUI.txt(g, font, "Don't hit red spiky hazards, fence, or your tail!", 240, 126, g.color(189, 75, 90), CENTER);
    PixelUI.txt(g, font, 'Avoid stationary rotten fruit (-1 ring)!', 240, 150, g.color(107, 75, 91), CENTER);

    PixelUI.drawButton(g, font, this.startBtn, 'START (Space)', PixelUI.pointInRect(mx, my, this.startBtn), g.color(223, 240, 187));
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
    el.querySelectorAll('[data-lv]').forEach((btn) => {
      btn.onclick = () => this.loadLevel(Number(btn.getAttribute('data-lv')), 'PLAYING');
    });
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
    const inst = this.debugPanelEl.querySelector('#sd-instant');
    if (inst) inst.checked = this.tuning.instantTurn;
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
      if (this.state === 'PLAYING') this.state = 'PAUSED';
      else if (this.state === 'PAUSED') this.state = 'PLAYING';
      else this.backToHub();
      return;
    }

    if (k === 'm' || k === 'M') {
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
