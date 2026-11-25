/**
 * Mini-jeu 2 : Caterpillar Crawl (sous-classe de Scene).
 * Reprend le fonctionnement du Snake de 3-Arrival dans un jardin chaleureux :
 * - Tête de la chenille : arrive(souris) + avoid(obstacles) + boundaries
 * - Segments : arrive() en chaîne derrière le segment précédent
 * - Fruits : baies fixes, fruits timides (flee + wander + avoid), ananas doré (+3),
 *   myrtille (boost vitesse), citron (-1 segment)
 * - Obstacles de jardin (flaques, champignons, rochers) : bonk doux sans mort
 * - Objectif : atteindre 16 segments avant la fin du chrono de 60s -> éclosion en papillon !
 */
class SnakeScene extends Scene {
  constructor(game) {
    super(game);
    this.state = 'INTRO'; // 'INTRO' | 'PLAYING' | 'PAUSED' | 'WIN' | 'TIMEUP'
    this.seenIntro = false;

    this.targetLength = 16;
    this.totalTime = 60; // secondes
    this.timeLeft = this.totalTime;
    this.fruitsEaten = 0;

    this.caterpillar = null;
    this.fruits = [];
    this.obstacles = [];
    this.gardenDecor = [];
    this.fx = [];

    // Animation de victoire (papillon qui sort du cocon)
    this.winButterfly = null;
    this.cocoonPos = null;
    this.earnedStars = 0;
    this.earnedTickets = 0;

    // Boutons des overlays
    this.startBtn = { x: 185, y: 184, w: 110, h: 22 };
    this.resumeBtn = { x: 180, y: 112, w: 120, h: 20 };
    this.restartBtn = { x: 180, y: 138, w: 120, h: 20 };
    this.exitBtn = { x: 180, y: 164, w: 120, h: 20 };
    this.retryEndBtn = { x: 130, y: 192, w: 104, h: 22 };
    this.hubEndBtn = { x: 246, y: 192, w: 104, h: 22 };
  }

  init() {
    this.game.sound.playMusic('snake');
    this.game.sound.playSfx('jingle_snake', 0.7);
    this.resetRound(!this.seenIntro);
  }

  resetRound(showIntro = false) {
    this.state = showIntro ? 'INTRO' : 'PLAYING';
    this.timeLeft = this.totalTime;
    this.fruitsEaten = 0;
    this.fx = [];
    this.winButterfly = null;
    this.cocoonPos = null;
    this.earnedStars = 0;
    this.earnedTickets = 0;

    // Obstacles fixes du jardin (tous des Obstacle extends Vehicle avec maxSpeed = 0)
    this.obstacles = [
      this.makeGardenObstacle(128, 96, 10, 'puddle'),
      this.makeGardenObstacle(352, 100, 9, 'mush_red'),
      this.makeGardenObstacle(152, 198, 9, 'rock_big'),
      this.makeGardenObstacle(332, 194, 10, 'puddle'),
      this.makeGardenObstacle(240, 148, 8, 'mush_purple_b')
    ];

    // Touffes d'herbe et fleurs purement décoratives sur le sol du jardin
    this.gardenDecor = [];
    const decorSprites = ['tuft_a', 'tuft_b', 'flower_yellow_s', 'flower_pink_s', 'flower_blue'];
    for (let i = 0; i < 26; i++) {
      this.gardenDecor.push({
        sprite: decorSprites[i % decorSprites.length],
        x: Math.round(random(20, 452)),
        y: Math.round(random(34, 248))
      });
    }

    // Chenille démarrant à gauche du centre (3 segments = longueur 4 avec la tête)
    this.caterpillar = new Caterpillar(92, 148, 3, this.game.assets);

    // Génération initiale des fruits variés
    this.fruits = [];
    this.spawnFruit('berry');
    this.spawnFruit('berry');
    this.spawnFruit('shy');
    this.spawnFruit('blueberry');
    this.spawnFruit('golden');
    this.spawnFruit('lemon');
  }

  makeGardenObstacle(x, y, r, kind) {
    const obs = new Obstacle(x, y, r, kind);
    obs.kind = kind;
    return obs;
  }

  /** Trouve une position sûre dans le jardin (loin des obstacles et de la tête). */
  findSafePos(minDistFromHead = 52) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const x = random(28, 452);
      const y = random(42, 244);
      let ok = true;

      for (const obs of this.obstacles) {
        if (dist(x, y, obs.pos.x, obs.pos.y) < obs.r + 22) {
          ok = false;
          break;
        }
      }
      if (ok && this.caterpillar && dist(x, y, this.caterpillar.pos.x, this.caterpillar.pos.y) < minDistFromHead) {
        ok = false;
      }
      if (ok) {
        for (const f of this.fruits) {
          if (dist(x, y, f.pos.x, f.pos.y) < 22) {
            ok = false;
            break;
          }
        }
      }
      if (ok) return createVector(x, y);
    }
    return createVector(random(40, 440), random(50, 230));
  }

  spawnFruit(type) {
    const pos = this.findSafePos();
    this.fruits.push(new GardenFruit(pos.x, pos.y, type, this.game.assets));
  }

  /** Choisit un type de fruit équilibré pour renouveler le jardin. */
  pickNextFruitType() {
    const r = random();
    if (r < 0.42) return 'berry';
    if (r < 0.65) return 'shy';
    if (r < 0.80) return 'blueberry';
    if (r < 0.92) return 'golden';
    return 'lemon';
  }

  spawnBurst(x, y, label, col, count = 6, kind = 'sparkle') {
    for (let i = 0; i < count; i++) {
      this.fx.push(new SparkleFX(x, y, kind));
    }
    if (label) {
      this.fx.push(new SparkleFX(x, y - 6, 'text', label, col));
    }
  }

  update() {
    // Mise à jour des effets visuels (même pendant l'écran de victoire)
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].update();
      if (this.fx[i].isDead) this.fx.splice(i, 1);
    }

    if (this.state === 'WIN' && this.winButterfly) {
      this.winButterfly.step(null);
      return;
    }

    if (this.state !== 'PLAYING') return;

    // Décompte du chrono (60s)
    this.timeLeft = Math.max(0, this.timeLeft - deltaTime / 1000);
    if (this.timeLeft <= 0) {
      this.finishRound(false);
      return;
    }

    // 1. Déplacement de la chenille vers la souris + évitement d'obstacles
    const { mx, my } = this.game.getMouseBufferPos();
    const bonked = this.caterpillar.step(mx, my, this.obstacles);
    if (bonked) {
      this.game.sound.playSfx('hit_2', 0.8);
      this.spawnBurst(this.caterpillar.pos.x, this.caterpillar.pos.y, 'BONK! -1', color(255, 130, 145), 5);
    }

    // 2. Mise à jour des fruits timides (flee + wander + avoid)
    for (const f of this.fruits) {
      f.step(this.caterpillar, this.obstacles);
    }

    // 3. Détection de dégustation de fruits
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      const d = p5.Vector.dist(this.caterpillar.pos, f.pos);
      if (d < this.caterpillar.r + f.r + 2) {
        this.handleEatFruit(f);
        this.fruits.splice(i, 1);

        // Maintenir toujours assez de bons fruits (et au plus 1 citron)
        const lemonCount = this.fruits.filter((fr) => fr.type === 'lemon').length;
        let nextType = this.pickNextFruitType();
        if (nextType === 'lemon' && lemonCount >= 1) nextType = 'berry';
        this.spawnFruit(nextType);
      }
    }

    // 4. Victoire dès que la longueur cible est atteinte !
    if (this.caterpillar.getLength() >= this.targetLength) {
      this.finishRound(true);
    }
  }

  handleEatFruit(fruit) {
    const x = fruit.pos.x;
    const y = fruit.pos.y;

    if (fruit.type === 'berry') {
      this.caterpillar.grow(1);
      this.fruitsEaten++;
      this.game.sound.playSfx('squeak_1', 0.7);
      this.spawnBurst(x, y, '+1', color(223, 240, 187), 5);
    } else if (fruit.type === 'shy') {
      this.caterpillar.grow(2);
      this.fruitsEaten++;
      this.game.sound.playSfx('squeak_double_1', 0.8);
      this.spawnBurst(x, y, '+2 SHY!', color(255, 195, 210), 7);
    } else if (fruit.type === 'golden') {
      this.caterpillar.grow(3);
      this.fruitsEaten++;
      this.game.sound.playSfx('success_bell', 0.8);
      this.spawnBurst(x, y, '+3 GOLD!', color(255, 232, 110), 10);
    } else if (fruit.type === 'blueberry') {
      this.caterpillar.grow(1);
      this.caterpillar.activateBoost(210);
      this.fruitsEaten++;
      this.game.sound.playSfx('squeak_2', 0.8);
      this.spawnBurst(x, y, 'BOOST!', color(145, 215, 255), 8);
    } else if (fruit.type === 'lemon') {
      this.caterpillar.shrink(1);
      this.game.sound.playSfx('hit_1', 0.7);
      this.spawnBurst(x, y, 'SOUR! -1', color(255, 220, 95), 5);
    }
  }

  finishRound(won) {
    if (won) {
      this.state = 'WIN';
      if (this.timeLeft >= 20) {
        this.earnedStars = 3;
        this.earnedTickets = 15;
      } else if (this.timeLeft >= 10) {
        this.earnedStars = 2;
        this.earnedTickets = 10;
      } else {
        this.earnedStars = 1;
        this.earnedTickets = 6;
      }
      this.game.save.recordGameResult('snake', this.earnedStars, this.earnedTickets);
      this.game.sound.playSfx('success_bell', 0.9);

      // Éclosion du cocon en papillon + pluie de confettis !
      this.cocoonPos = this.caterpillar.pos.copy();
      this.winButterfly = new HubButterfly(this.cocoonPos.x, this.cocoonPos.y, this.game.assets);
      this.winButterfly.maxSpeed = 1.0;
      this.spawnBurst(this.cocoonPos.x, this.cocoonPos.y, 'BUTTERFLY!', color(255, 232, 110), 26, 'confetti');
    } else {
      this.state = 'TIMEUP';
      this.earnedStars = 0;
      this.earnedTickets = 2; // Ton bienveillant : toujours un petit bonus
      this.game.save.addTickets(this.earnedTickets);
      this.game.sound.playSfx('fail_soft', 0.8);
    }
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;

    // 1. Fond du jardin pastel (herbe douce + bordure en bois)
    this.drawGardenBackground(g);

    // 2. Obstacles du jardin (flaques, champignons, rochers)
    for (const obs of this.obstacles) {
      this.drawGardenObstacle(g, obs);
      obs.showDebug(g);
    }

    // 3. Fruits du jardin
    for (const f of this.fruits) {
      f.show(g);
    }

    // 4. Chenille (ou cocon + papillon éclos en cas de victoire)
    if (this.state === 'WIN' && this.cocoonPos) {
      g.noStroke();
      g.fill(235, 224, 185);
      g.ellipse(Math.round(this.cocoonPos.x), Math.round(this.cocoonPos.y), 14, 10);
      g.stroke(144, 98, 93);
      g.strokeWeight(1);
      g.noFill();
      g.ellipse(Math.round(this.cocoonPos.x), Math.round(this.cocoonPos.y), 14, 10);
      if (this.winButterfly) this.winButterfly.show(g);
    } else if (this.caterpillar) {
      this.caterpillar.show(g);
    }

    // 5. Effets (étincelles, confettis, textes flottants)
    for (const fx of this.fx) {
      fx.show(g, assets);
    }

    // 6. HUD supérieur (Chrono, barre de longueur, fruits mangés)
    this.drawHud(g);

    // 7. Overlays (Intro, Pause, Victoire / Essai encore)
    if (this.state === 'INTRO') this.drawIntroCard(g);
    else if (this.state === 'PAUSED') this.drawPauseMenu(g);
    else if (this.state === 'WIN' || this.state === 'TIMEUP') this.drawEndCard(g);

    if (Vehicle.debug) {
      PixelUI.drawTag(g, font, 'DEBUG [H]: arrive + avoid + flee', 376, 266, g.color(223, 240, 187));
    }
  }

  drawGardenBackground(g) {
    const assets = this.game.assets;
    // Pelouse douce en damier discret 16x16
    g.noStroke();
    g.fill(157, 198, 126);
    g.rect(0, 0, 480, 272);
    g.fill(149, 191, 118);
    for (let y = 24; y < 264; y += 16) {
      for (let x = 8; x < 472; x += 16) {
        if (((x + y) / 16) % 2 === 0) {
          g.rect(x, y, 16, 16);
        }
      }
    }

    // Cadre boisé autour du jardin
    g.noFill();
    g.stroke(107, 75, 91);
    g.strokeWeight(4);
    g.rect(10, 26, 460, 236);
    g.stroke(182, 137, 98);
    g.strokeWeight(2);
    g.rect(10, 26, 460, 236);

    // Fleurs et touffes d'herbe décoratives
    for (const dec of this.gardenDecor) {
      const sp = assets.getSprite(dec.sprite);
      if (sp) g.image(sp, dec.x, dec.y);
    }
  }

  drawGardenObstacle(g, obs) {
    const px = Math.round(obs.pos.x);
    const py = Math.round(obs.pos.y);

    if (obs.kind === 'puddle') {
      g.noStroke();
      g.fill(130, 192, 214);
      g.ellipse(px, py, obs.r * 2.2, obs.r * 1.5);
      g.fill(164, 218, 234);
      g.ellipse(px - 2, py - 1, obs.r * 1.4, obs.r * 0.8);
    } else {
      const sp = this.game.assets.getSprite(obs.kind);
      if (sp) {
        g.image(sp, px - Math.floor(sp.width / 2), py - Math.floor(sp.height / 2));
      } else {
        g.noStroke();
        g.fill(160, 130, 120);
        g.circle(px, py, obs.r * 2);
      }
    }
  }

  drawHud(g) {
    const font = this.game.assets.font;
    const len = this.caterpillar ? this.caterpillar.getLength() : 0;

    // Chrono
    const secs = Math.ceil(this.timeLeft);
    const timeCol = secs <= 10 ? g.color(255, 200, 195) : g.color(247, 235, 170);
    PixelUI.panel(g, 8, 5, 64, 16, timeCol);
    PixelUI.txt(g, font, 'TIME ' + secs + 's', 14, 8, g.color(107, 75, 91));

    // Barre de progression de longueur
    PixelUI.panel(g, 82, 5, 178, 16);
    const ratio = constrain(len / this.targetLength, 0, 1);
    g.noStroke();
    g.fill(218, 205, 164);
    g.rect(86, 9, 108, 8);
    g.fill(128, 198, 114);
    g.rect(86, 9, Math.round(108 * ratio), 8);
    PixelUI.txt(g, font, len + '/' + this.targetLength, 200, 8, g.color(107, 75, 91));

    // Compteur de fruits
    PixelUI.panel(g, 270, 5, 86, 16);
    PixelUI.txt(g, font, 'FRUIT ' + this.fruitsEaten, 276, 8, g.color(107, 75, 91));

    // Indice Pause
    PixelUI.panel(g, 366, 5, 66, 16);
    PixelUI.txt(g, font, 'Esc Pause', 371, 8, g.color(144, 98, 93));
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    g.noStroke();
    g.fill(0, 0, 0, 115);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 74, 52, 332, 164);
    g.fill(122, 174, 112);
    g.rect(74, 52, 332, 22);
    PixelUI.txt(g, font, 'CATERPILLAR CRAWL', 240, 58, g.color(243, 244, 231), CENTER);

    PixelUI.txt(g, font, 'Guide your caterpillar with the mouse to eat fruit!', 240, 88, g.color(107, 75, 91), CENTER);
    PixelUI.txt(g, font, 'Reach length ' + this.targetLength + ' in 60s. Watch shy fruit & lemons!', 240, 108, g.color(107, 75, 91), CENTER);
    PixelUI.txt(g, font, 'Puddles & mushrooms bonk you back (no game over!).', 240, 128, g.color(144, 98, 93), CENTER);

    // Mini légende colorée
    PixelUI.txt(g, font, 'Gold=+3  Blue=Boost  Pink=Shy(+2)  Lemon=-1', 240, 152, g.color(107, 75, 91), CENTER);

    PixelUI.drawButton(
      g,
      font,
      this.startBtn,
      'START (Space)',
      PixelUI.pointInRect(mx, my, this.startBtn),
      g.color(223, 240, 187),
      g.color(200, 232, 150)
    );
  }

  drawPauseMenu(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    g.noStroke();
    g.fill(0, 0, 0, 115);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 148, 72, 184, 128);
    g.fill(189, 117, 126);
    g.rect(148, 72, 184, 22);
    PixelUI.txt(g, font, 'PAUSED', 240, 78, g.color(243, 244, 231), CENTER);

    PixelUI.drawButton(g, font, this.resumeBtn, 'Resume (Esc)', PixelUI.pointInRect(mx, my, this.resumeBtn), g.color(223, 240, 187));
    PixelUI.drawButton(g, font, this.restartBtn, 'Restart', PixelUI.pointInRect(mx, my, this.restartBtn));
    PixelUI.drawButton(g, font, this.exitBtn, 'Back to Fair', PixelUI.pointInRect(mx, my, this.exitBtn));
  }

  drawEndCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    const won = this.state === 'WIN';

    g.noStroke();
    g.fill(0, 0, 0, 100);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 92, 58, 296, 166);
    g.fill(won ? g.color(122, 174, 112) : g.color(189, 117, 126));
    g.rect(92, 58, 296, 22);
    PixelUI.txt(
      g,
      font,
      won ? 'A BUTTERFLY HATCHED!' : 'SO CLOSE! TRY AGAIN?',
      240,
      64,
      g.color(243, 244, 231),
      CENTER
    );

    if (won) {
      const starStr = '★'.repeat(this.earnedStars) + '☆'.repeat(3 - this.earnedStars);
      PixelUI.txt(g, font, 'Stars: ' + starStr + '  (' + Math.ceil(this.timeLeft) + 's left)', 240, 96, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, 'Length reached: ' + this.caterpillar.getLength() + '  |  Fruit: ' + this.fruitsEaten, 240, 120, g.color(144, 98, 93), CENTER);
    } else {
      PixelUI.txt(g, font, 'You reached length ' + this.caterpillar.getLength() + ' / ' + this.targetLength + '!', 240, 102, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, 'Tip: grab Golden (+3) & Shy (+2) fruit!', 240, 124, g.color(144, 98, 93), CENTER);
    }

    PixelUI.drawTag(g, font, '+' + this.earnedTickets + ' Tickets earned!', 240, 166, g.color(223, 240, 187));

    PixelUI.drawButton(g, font, this.retryEndBtn, 'Play Again', PixelUI.pointInRect(mx, my, this.retryEndBtn), g.color(223, 240, 187));
    PixelUI.drawButton(g, font, this.hubEndBtn, 'Back to Fair', PixelUI.pointInRect(mx, my, this.hubEndBtn));
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
      if (PixelUI.pointInRect(mx, my, this.resumeBtn)) {
        this.game.sound.playSfx('ui_click');
        this.state = 'PLAYING';
      } else if (PixelUI.pointInRect(mx, my, this.restartBtn)) {
        this.game.sound.playSfx('ui_click');
        this.resetRound(false);
      } else if (PixelUI.pointInRect(mx, my, this.exitBtn)) {
        this.backToHub();
      }
      return;
    }

    if (this.state === 'WIN' || this.state === 'TIMEUP') {
      if (PixelUI.pointInRect(mx, my, this.retryEndBtn)) {
        this.game.sound.playSfx('ui_click');
        this.resetRound(false);
      } else if (PixelUI.pointInRect(mx, my, this.hubEndBtn)) {
        this.backToHub();
      }
    }
  }

  keyPressed(k, kc) {
    if (this.state === 'INTRO') {
      if (k === ' ' || kc === ENTER) {
        this.game.sound.playSfx('ui_click');
        this.seenIntro = true;
        this.state = 'PLAYING';
      } else if (kc === ESCAPE) {
        this.backToHub();
      }
      return;
    }

    if (kc === ESCAPE) {
      if (this.state === 'PLAYING') {
        this.game.sound.playSfx('ui_click');
        this.state = 'PAUSED';
      } else if (this.state === 'PAUSED') {
        this.game.sound.playSfx('ui_click');
        this.state = 'PLAYING';
      } else {
        this.backToHub();
      }
      return;
    }

    if ((this.state === 'WIN' || this.state === 'TIMEUP') && (k === ' ' || kc === ENTER)) {
      this.game.sound.playSfx('ui_click');
      this.resetRound(false);
    }
  }
}
