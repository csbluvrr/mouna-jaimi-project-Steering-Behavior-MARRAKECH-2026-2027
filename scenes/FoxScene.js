/**
 * Mini-jeu 5 : Fox Showdown (Chase + Shooter cozy).
 * - Moo se déplace au clavier (WASD / ZQSD / Flèches), vise à la souris et lance des carottes au clic.
 * - Le Renard utilise une machine à états (WANDER, PURSUE, STRAFE_THROW, FLEE, SEEK_POWERUP)
 *   + evade(carottes) + avoid(stands/caisses) + boundaries via BehaviorManager.
 * - Stands et bottes de foin (Obstacle extends Vehicle) servent de couverture contre les projectiles.
 * - Bonus toutes les ~14s : bouclier, triple carotte, soin (le Renard fait la course pour les prendre !).
 */
class FoxScene extends Scene {
  constructor(game) {
    super(game);
    this.state = 'INTRO'; // 'INTRO' | 'PLAYING' | 'PAUSED' | 'WIN' | 'LOSE'
    this.seenIntro = false;

    this.moo = null;
    this.mooHp = 5;
    this.mooMaxHp = 5;
    this.mooShield = false;
    this.tripleFrames = 0;
    this.shootCooldown = 0;
    this.wasHit = false;

    this.fox = null;
    this.obstacles = [];
    this.projectiles = [];
    this.powerups = [];
    this.fx = [];
    this.powerupTimer = 420; // premier bonus après 7s, puis toutes les 14s

    this.earnedStars = 0;
    this.earnedTickets = 0;

    this.startBtn = { x: 185, y: 184, w: 110, h: 22 };
    this.resumeBtn = { x: 180, y: 112, w: 120, h: 20 };
    this.restartBtn = { x: 180, y: 138, w: 120, h: 20 };
    this.exitBtn = { x: 180, y: 164, w: 120, h: 20 };
    this.retryEndBtn = { x: 130, y: 192, w: 104, h: 22 };
    this.hubEndBtn = { x: 246, y: 192, w: 104, h: 22 };
  }

  init() {
    this.game.sound.playMusic('fox');
    this.game.sound.playSfx('jingle_fox', 0.7);
    this.resetRound(!this.seenIntro);
  }

  resetRound(showIntro = false) {
    this.state = showIntro ? 'INTRO' : 'PLAYING';
    this.moo = new Moo(104, 152, this.game.assets);
    this.moo.maxSpeed = 1.6;
    this.mooHp = this.mooMaxHp;
    this.mooShield = false;
    this.tripleFrames = 0;
    this.shootCooldown = 0;
    this.wasHit = false;

    this.fox = new FoxBoss(376, 152, this.game.assets);
    this.projectiles = [];
    this.powerups = [];
    this.fx = [];
    this.powerupTimer = 360;

    // Obstacles de couverture (bottes de foin / caisses -> Obstacle extends Vehicle)
    this.obstacles = [
      new Obstacle(180, 108, 12, 'hay'),
      new Obstacle(300, 108, 12, 'hay'),
      new Obstacle(180, 196, 12, 'hay'),
      new Obstacle(300, 196, 12, 'hay')
    ];

    // Boîtes solides correspondantes pour le déplacement de Moo
    this.solids = this.obstacles.map((o) => [o.pos.x - o.r, o.pos.y - o.r, o.r * 2, o.r * 2]);
  }

  spawnPowerUp() {
    const types = ['shield', 'triple', 'heal'];
    const type = random(types);
    const pos = createVector(random(130, 350), random(64, 224));
    this.powerups.push(new PowerUp(pos.x, pos.y, type, this.game.assets));
    this.fx.push(new SparkleFX(pos.x, pos.y - 8, 'text', type.toUpperCase() + '!', color(255, 232, 110)));
  }

  fireCarrot(mx, my) {
    if (this.shootCooldown > 0) return;
    this.shootCooldown = 18;
    const baseDir = createVector(mx - this.moo.pos.x, my - (this.moo.pos.y - 10));
    if (baseDir.magSq() < 1) baseDir.set(1, 0);

    if (this.tripleFrames > 0) {
      // Éventail de 3 carottes
      const angles = [-0.22, 0, 0.22];
      for (const da of angles) {
        const dir = baseDir.copy().rotate(da);
        this.projectiles.push(new Projectile(this.moo.pos.x, this.moo.pos.y - 10, dir, 'moo', false, this.game.assets));
      }
    } else {
      this.projectiles.push(new Projectile(this.moo.pos.x, this.moo.pos.y - 10, baseDir, 'moo', false, this.game.assets));
    }
    this.game.sound.playSfx('hit_4', 0.55);
  }

  update() {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].update();
      if (this.fx[i].isDead) this.fx.splice(i, 1);
    }

    if (this.state !== 'PLAYING') return;

    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.tripleFrames > 0) this.tripleFrames--;

    // 1. Déplacement de Moo (clavier direct, sans click-to-walk pour garder le clic pour tirer)
    this.moo.targetPos = null;
    this.moo.step(this.solids, [16, 36, 464, 254]);

    // 2. Apparition périodique de bonus (~14s)
    this.powerupTimer--;
    if (this.powerupTimer <= 0 && this.powerups.length < 2) {
      this.spawnPowerUp();
      this.powerupTimer = 840;
    }

    // 3. Cerveau du Renard + lancer éventuel de gland
    const acorn = this.fox.step(this.moo, this.powerups, this.projectiles, this.obstacles);
    if (acorn) {
      this.projectiles.push(acorn);
      this.game.sound.playSfx('hit_3', 0.5);
    }

    // 4. Ramassage des bonus (course entre Moo et le Renard !)
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      if (p5.Vector.dist(this.moo.pos, pu.pos) < 16) {
        this.applyPowerUpToMoo(pu);
        this.powerups.splice(i, 1);
      } else if (p5.Vector.dist(this.fox.pos, pu.pos) < 16) {
        this.applyPowerUpToFox(pu);
        this.powerups.splice(i, 1);
      }
    }

    // 5. Mise à jour des projectiles & collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.step(p.owner === 'fox' ? this.moo : null, this.obstacles);

      if (!p.isDead && p.owner === 'moo' && p5.Vector.dist(p.pos, this.fox.pos) < this.fox.r + p.r + 3) {
        p.isDead = true;
        const hurt = this.fox.takeDamage(1);
        this.game.sound.playSfx('hit_5', 0.75);
        this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y - 10, 'text', hurt ? '-1' : 'BLOCKED', color(255, 220, 120)));
        for (let k = 0; k < 5; k++) this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y, 'sparkle'));
        if (this.fox.isKO) {
          this.finishRound(true);
          return;
        }
      } else if (!p.isDead && p.owner === 'fox' && p5.Vector.dist(p.pos, createVector(this.moo.pos.x, this.moo.pos.y - 10)) < 11) {
        p.isDead = true;
        if (this.mooShield) {
          this.mooShield = false;
          this.game.sound.playSfx('hit_1', 0.7);
          this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 18, 'text', 'SHIELD!', color(145, 215, 255)));
        } else {
          this.mooHp = Math.max(0, this.mooHp - 1);
          this.wasHit = true;
          this.game.sound.playSfx('hit_6', 0.75);
          this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 18, 'text', 'OUCH!', color(255, 130, 145)));
          if (this.mooHp <= 0) {
            this.finishRound(false);
            return;
          }
        }
      }

      if (p.isDead) this.projectiles.splice(i, 1);
    }
  }

  applyPowerUpToMoo(pu) {
    this.game.sound.playSfx('success_bell', 0.75);
    if (pu.type === 'shield') {
      this.mooShield = true;
      this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 18, 'text', 'SHIELD UP!', color(145, 215, 255)));
    } else if (pu.type === 'triple') {
      this.tripleFrames = 420;
      this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 18, 'text', 'TRIPLE!', color(255, 210, 110)));
    } else if (pu.type === 'heal') {
      this.mooHp = Math.min(this.mooMaxHp, this.mooHp + 2);
      this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 18, 'text', '+2 HP!', color(150, 235, 150)));
    }
  }

  applyPowerUpToFox(pu) {
    this.game.sound.playSfx('squeak_2', 0.7);
    if (pu.type === 'shield') {
      this.fox.hasShield = true;
      this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y - 16, 'text', 'FOX SHIELD!', color(210, 160, 245)));
    } else if (pu.type === 'heal') {
      this.fox.hp = Math.min(this.fox.maxHp, this.fox.hp + 2);
      this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y - 16, 'text', 'FOX +2 HP!', color(210, 160, 245)));
    } else {
      this.fox.throwCooldown = 10;
      this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y - 16, 'text', 'FOX READY!', color(210, 160, 245)));
    }
  }

  finishRound(won) {
    if (won) {
      this.state = 'WIN';
      this.earnedStars = !this.wasHit ? 3 : (this.mooHp >= 3 ? 2 : 1);
      this.earnedTickets = 6 + this.mooHp * 2 + (!this.wasHit ? 5 : 0);
      this.game.save.recordGameResult('fox', this.earnedStars, this.earnedTickets);
      this.game.sound.playSfx('success_bell', 0.9);
      for (let i = 0; i < 28; i++) {
        this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y, 'confetti'));
      }
    } else {
      this.state = 'LOSE';
      this.earnedStars = 0;
      this.earnedTickets = 2;
      this.game.save.addTickets(this.earnedTickets);
      this.game.sound.playSfx('fail_soft', 0.8);
    }
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;

    // 1. Scène de fête foraine chaleureuse (planche en bois + tapis central)
    g.noStroke();
    g.fill(218, 188, 146);
    g.rect(0, 0, 480, 272);
    g.fill(204, 174, 132);
    for (let y = 32; y < 260; y += 16) g.rect(12, y, 456, 2);

    g.noFill();
    g.stroke(107, 75, 91);
    g.strokeWeight(4);
    g.rect(10, 26, 460, 236);

    // 2. Obstacles de couverture (bottes de foin)
    const hayImg = assets.getImage('generated/derby/hay_bale.png');
    for (const obs of this.obstacles) {
      if (hayImg) {
        g.image(hayImg, Math.round(obs.pos.x) - Math.floor(hayImg.width / 2), Math.round(obs.pos.y) - Math.floor(hayImg.height / 2));
      } else {
        g.noStroke();
        g.fill(222, 186, 100);
        g.circle(obs.pos.x, obs.pos.y, obs.r * 2);
      }
      obs.showDebug(g);
    }

    // 3. Bonus
    for (const pu of this.powerups) pu.show(g);

    // 4. Moo & Renard triés en Y
    const actors = [
      { y: this.moo.pos.y, draw: () => {
        if (this.mooShield) {
          g.noFill();
          g.stroke(120, 215, 255, 200);
          g.strokeWeight(1.5);
          g.circle(Math.round(this.moo.pos.x), Math.round(this.moo.pos.y - 12), 26);
        }
        this.moo.show(g);
      }},
      { y: this.fox.pos.y, draw: () => this.fox.show(g) }
    ];
    actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());

    // 5. Projectiles & effets
    for (const p of this.projectiles) p.show(g);
    for (const fx of this.fx) fx.show(g, assets);

    // Viseur discret à la souris
    if (this.state === 'PLAYING') {
      const { mx, my } = this.game.getMouseBufferPos();
      g.noFill();
      g.stroke(107, 75, 91, 180);
      g.strokeWeight(1);
      g.circle(Math.round(mx), Math.round(my), 8);
    }

    // 6. Barres de vie HUD (Moo à gauche, Renard à droite)
    this.drawHud(g);

    if (this.state === 'INTRO') this.drawIntroCard(g);
    else if (this.state === 'PAUSED') this.drawPauseMenu(g);
    else if (this.state === 'WIN' || this.state === 'LOSE') this.drawEndCard(g);
  }

  drawHud(g) {
    const font = this.game.assets.font;
    // Vie de Moo
    PixelUI.panel(g, 8, 5, 134, 16);
    PixelUI.txt(g, font, 'MOO', 13, 8, g.color(107, 75, 91));
    g.noStroke();
    g.fill(218, 205, 164);
    g.rect(46, 9, 88, 8);
    g.fill(235, 108, 128);
    g.rect(46, 9, Math.round(88 * (this.mooHp / this.mooMaxHp)), 8);

    // Vie du Renard
    PixelUI.panel(g, 290, 5, 134, 16);
    PixelUI.txt(g, font, 'FOX', 295, 8, g.color(107, 75, 91));
    g.noStroke();
    g.fill(218, 205, 164);
    g.rect(326, 9, 92, 8);
    g.fill(168, 118, 204);
    g.rect(326, 9, Math.round(92 * (this.fox.hp / this.fox.maxHp)), 8);

    if (this.tripleFrames > 0) {
      PixelUI.drawTag(g, font, 'TRIPLE CARROT!', 216, 20, g.color(255, 224, 120));
    }
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    this.startBtn = { x: 180, y: 204, w: 120, h: 24 };
    PixelUI.drawRulesCard(g, font, {
      title: 'FOX SHOWDOWN (BOSS DUEL)',
      headerCol: g.color(158, 114, 192),
      rules: [
        'Move Moo around the arena & throw carrots at the clever fox!',
        'Hide behind hay bales to block the fox\'s homing acorns.',
        'Race the fox to grab Shields, Triple Carrot & Heal pickups!',
        'Beat the fox without getting hit for a 3-star No-Hit Bonus!'
      ],
      controls: 'WASD / Arrows: Move  |  Click: Throw Carrot  |  [H] Debug  |  [M] Menu',
      btnRect: this.startBtn,
      btnLabel: 'FIGHT! (Space)',
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

    PixelUI.panel(g, 148, 72, 184, 128);
    g.fill(158, 114, 192);
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
    g.fill(won ? g.color(158, 114, 192) : g.color(189, 117, 126));
    g.rect(92, 58, 296, 22);
    PixelUI.txt(g, font, won ? 'FOX IS DIZZY! YOU WIN!' : 'SO CLOSE! FREE RETRY?', 240, 64, g.color(243, 244, 231), CENTER);

    if (won) {
      const starStr = '*'.repeat(this.earnedStars) + '-'.repeat(3 - this.earnedStars);
      PixelUI.txt(g, font, 'Stars: [' + starStr + ']' + (!this.wasHit ? '  (NO-HIT BONUS!)' : ''), 240, 102, g.color(107, 75, 91), CENTER, 9.5, 280);
    } else {
      PixelUI.txt(g, font, 'The fox got lucky! Hide behind hay bales!', 240, 104, g.color(107, 75, 91), CENTER, 9.5, 280);
    }

    PixelUI.drawTag(g, font, '+' + this.earnedTickets + ' Tickets earned!', 240, 166, g.color(223, 240, 187));
    PixelUI.drawButton(g, font, this.retryEndBtn, 'Play Again', PixelUI.pointInRect(mx, my, this.retryEndBtn), g.color(223, 240, 187));
    PixelUI.drawButton(g, font, this.hubEndBtn, 'Back to Fair', PixelUI.pointInRect(mx, my, this.hubEndBtn));
  }

  backToHub() {
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo('hub', { fromBooth: 'fox' });
  }

  mousePressed(mx, my) {
    if (this.state === 'INTRO') {
      if (PixelUI.pointInRect(mx, my, this.startBtn)) {
        this.seenIntro = true;
        this.state = 'PLAYING';
      }
      return;
    }
    if (this.state === 'PLAYING') {
      this.fireCarrot(mx, my);
      return;
    }
    if (this.state === 'PAUSED') {
      if (PixelUI.pointInRect(mx, my, this.resumeBtn)) this.state = 'PLAYING';
      else if (PixelUI.pointInRect(mx, my, this.restartBtn)) this.resetRound(false);
      else if (PixelUI.pointInRect(mx, my, this.exitBtn)) this.backToHub();
      return;
    }
    if (this.state === 'WIN' || this.state === 'LOSE') {
      if (PixelUI.pointInRect(mx, my, this.retryEndBtn)) this.resetRound(false);
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
    if ((this.state === 'WIN' || this.state === 'LOSE') && (k === ' ' || kc === ENTER)) {
      this.resetRound(false);
    }
  }
}
