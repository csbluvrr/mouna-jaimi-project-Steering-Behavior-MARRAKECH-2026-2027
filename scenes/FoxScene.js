/**
 * Mini-jeu 5 : The Legend of Moo — Plateformer 2D Zelda (Legend_of_Zink_Asset_Pack) !
 * - Moo court (A/D ou Flèches) et saute / double-saute (W / Haut / Espace) sur les plateformes
 *   en pierre du temple d'Hyrule, et lance des boomerangs Zelda au clic !
 * - Le Boss (FoxBoss / Mage de Feu Zelda) utilise 100% Steering Behaviors via BehaviorManager
 *   (pursue, evade des boomerangs, flee, seek des bonus Zelda, avoid, boundaries).
 * - Bonus Zelda toutes les ~10s sur les plateformes : Heart Container (Bouclier),
 *   Magic Potion (Triple Boomerang), Health Potion (+2 PV).
 */
class FoxScene extends Scene {
  constructor(game) {
    super(game);
    this.state = 'INTRO'; // 'INTRO' | 'PLAYING' | 'PAUSED' | 'WIN' | 'LOSE'
    this.seenIntro = false;

    this.moo = null;
    this.mooVy = 0;
    this.onGround = false;
    this.jumpsLeft = 2;
    this.dropThroughTimer = 0;

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
    this.powerupTimer = 360;

    // Sol du temple + 3 plateformes flottantes de plateformer 2D
    this.groundY = 240;
    this.platforms = [
      { x: 36,  y: 186, w: 112, h: 14 }, // Plateforme gauche
      { x: 184, y: 136, w: 112, h: 14 }, // Plateforme haute centrale
      { x: 332, y: 186, w: 112, h: 14 }  // Plateforme droite
    ];

    this.earnedStars = 0;
    this.earnedTickets = 0;

    this.startBtn = { x: 180, y: 204, w: 120, h: 24 };
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
    this.moo = new Moo(86, this.groundY, this.game.assets);
    this.moo.maxSpeed = 2.25;
    this.mooVy = 0;
    this.onGround = true;
    this.jumpsLeft = 2;
    this.dropThroughTimer = 0;

    this.mooHp = this.mooMaxHp;
    this.mooShield = false;
    this.tripleFrames = 0;
    this.shootCooldown = 0;
    this.wasHit = false;

    this.fox = new FoxBoss(376, 128, this.game.assets);
    this.projectiles = [];
    this.powerups = [];
    this.fx = [];
    this.powerupTimer = 300;

    // Piliers de pierre (Obstacle extends Vehicle) bloquant certains projectiles
    this.obstacles = [
      new Obstacle(152, 224, 11, 'rock'),
      new Obstacle(328, 224, 11, 'rock')
    ];
  }

  spawnPowerUp() {
    const types = ['shield', 'triple', 'heal'];
    const type = random(types);
    // Fait apparaître le bonus Zelda sur une des 3 plateformes ou au centre !
    const spots = [
      [92, 168],
      [240, 118],
      [388, 168],
      [240, 222]
    ];
    const sp = random(spots);
    this.powerups.push(new PowerUp(sp[0], sp[1], type, this.game.assets));
    const lbl = type === 'shield' ? 'HEART SHIELD!' : (type === 'triple' ? 'MAGIC 3x!' : 'HEAL POTION!');
    this.fx.push(new SparkleFX(sp[0], sp[1] - 10, 'text', lbl, color(255, 232, 110)));
  }

  triggerJump() {
    if (this.jumpsLeft > 0) {
      this.mooVy = this.jumpsLeft === 2 ? -5.15 : -4.65;
      this.onGround = false;
      this.jumpsLeft--;
      this.game.sound.playSfx('ui_click', 0.45);
      for (let k = 0; k < 4; k++) {
        this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 2, 'sparkle'));
      }
    }
  }

  fireBoomerang(mx, my) {
    if (this.shootCooldown > 0) return;
    this.shootCooldown = 16;
    const baseDir = createVector(mx - this.moo.pos.x, my - (this.moo.pos.y - 14));
    if (baseDir.magSq() < 1) baseDir.set(this.moo.dir === 1 ? -1 : 1, 0);

    if (this.tripleFrames > 0) {
      const angles = [-0.22, 0, 0.22];
      for (const da of angles) {
        const dir = baseDir.copy().rotate(da);
        this.projectiles.push(new Projectile(this.moo.pos.x, this.moo.pos.y - 14, dir, 'moo', false, this.game.assets));
      }
    } else {
      this.projectiles.push(new Projectile(this.moo.pos.x, this.moo.pos.y - 14, baseDir, 'moo', false, this.game.assets));
    }
    this.game.sound.playSfx('hit_4', 0.55);
  }

  /** Physique 2D de plateformer pour Moo (course, gravité, saut/double-saut, plateformes). */
  updatePlatformerMoo() {
    let kx = 0;
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65) || keyIsDown(81)) kx -= 1;
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) kx += 1;

    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
      this.dropThroughTimer = 10;
    } else if (this.dropThroughTimer > 0) {
      this.dropThroughTimer--;
    }

    this.moo.vel.x = kx * this.moo.maxSpeed;
    this.moo.pos.x = constrain(this.moo.pos.x + this.moo.vel.x, 18, 462);
    if (kx < 0) this.moo.dir = 1;
    else if (kx > 0) this.moo.dir = 2;
    this.moo.isMoving = Math.abs(kx) > 0 && this.onGround;

    // Gravité
    const prevY = this.moo.pos.y;
    this.mooVy = Math.min(6.2, this.mooVy + 0.24);
    this.moo.pos.y += this.mooVy;
    this.onGround = false;

    // Atterrissage sur les plateformes (uniquement en descendant, sauf si S/Bas maintenu)
    if (this.mooVy >= 0 && this.dropThroughTimer <= 0) {
      for (const pl of this.platforms) {
        if (this.moo.pos.x >= pl.x - 4 && this.moo.pos.x <= pl.x + pl.w + 4) {
          if (prevY <= pl.y + 3 && this.moo.pos.y >= pl.y) {
            this.moo.pos.y = pl.y;
            this.mooVy = 0;
            this.onGround = true;
            this.jumpsLeft = 2;
            break;
          }
        }
      }
    }

    // Sol du temple
    if (this.moo.pos.y >= this.groundY) {
      this.moo.pos.y = this.groundY;
      this.mooVy = 0;
      this.onGround = true;
      this.jumpsLeft = 2;
    }
  }

  update() {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].update();
      if (this.fx[i].isDead) this.fx.splice(i, 1);
    }

    if (this.state !== 'PLAYING') return;

    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.tripleFrames > 0) this.tripleFrames--;

    // 1. Déplacement 2D plateformer de Moo
    this.updatePlatformerMoo();

    // 2. Apparition périodique de bonus Zelda (~10s)
    this.powerupTimer--;
    if (this.powerupTimer <= 0 && this.powerups.length < 2) {
      this.spawnPowerUp();
      this.powerupTimer = 600;
    }

    // 3. Boss Mage de Feu Zelda (IA Steering Behaviors complète)
    const fired = this.fox.step(this.moo, this.projectiles, this.powerups, this.obstacles);
    if (fired) {
      this.projectiles.push(fired);
      this.game.sound.playSfx('hit_1', 0.45);
    }

    // 4. Mise à jour des projectiles (boomerangs & boules de feu)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.step(p.owner === 'fox' ? this.moo : this.fox, this.obstacles);

      if (!p.isDead && p.owner === 'moo' && !this.fox.isKO) {
        if (p5.Vector.dist(p.pos, this.fox.pos) < this.fox.r + p.r + 3) {
          p.isDead = true;
          const dealt = this.fox.takeDamage(1);
          this.game.sound.playSfx(dealt ? 'hit_2' : 'ui_click', 0.8);
          for (let k = 0; k < 6; k++) this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y, 'sparkle'));
          this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y - 12, 'text', dealt ? '-1' : 'SHIELD!', color(255, 224, 120)));
          if (this.fox.isKO) {
            this.finishDuel(true);
            return;
          }
        }
      } else if (!p.isDead && p.owner === 'fox') {
        if (dist(p.pos.x, p.pos.y, this.moo.pos.x, this.moo.pos.y - 14) < 12) {
          p.isDead = true;
          if (this.mooShield) {
            this.mooShield = false;
            this.game.sound.playSfx('ui_click', 0.8);
            this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 20, 'text', 'BLOCKED!', color(140, 220, 255)));
          } else {
            this.mooHp = Math.max(0, this.mooHp - 1);
            this.wasHit = true;
            this.game.sound.playSfx('fail_soft_1', 0.8);
            this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 20, 'text', '-1', color(255, 130, 140)));
            if (this.mooHp <= 0) {
              this.finishDuel(false);
              return;
            }
          }
        }
      }

      if (p.isDead) this.projectiles.splice(i, 1);
    }

    // 5. Ramassage des bonus Zelda (Moo ET le Boss font la course !)
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      if (dist(this.moo.pos.x, this.moo.pos.y - 14, pu.pos.x, pu.pos.y) < 18) {
        this.applyPowerUp('moo', pu.type);
        this.powerups.splice(i, 1);
      } else if (p5.Vector.dist(this.fox.pos, pu.pos) < 18) {
        this.applyPowerUp('fox', pu.type);
        this.powerups.splice(i, 1);
      }
    }
  }

  applyPowerUp(who, type) {
    this.game.sound.playSfx('success_bell', 0.7);
    if (who === 'moo') {
      if (type === 'shield') this.mooShield = true;
      else if (type === 'triple') this.tripleFrames = 420;
      else if (type === 'heal') this.mooHp = Math.min(this.mooMaxHp, this.mooHp + 2);
      this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 24, 'text', type.toUpperCase() + '!', color(223, 240, 187)));
    } else {
      if (type === 'shield') this.fox.hasShield = true;
      else if (type === 'heal') this.fox.hp = Math.min(this.fox.maxHp, this.fox.hp + 2);
      this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y - 14, 'text', 'BOSS ' + type.toUpperCase() + '!', color(255, 180, 130)));
    }
  }

  finishDuel(won) {
    if (won) {
      this.state = 'WIN';
      this.earnedStars = !this.wasHit ? 3 : (this.mooHp >= 3 ? 2 : 1);
      this.earnedTickets = this.earnedStars === 3 ? 20 : (this.earnedStars === 2 ? 14 : 9);
      this.game.save.recordGameResult('fox', this.earnedStars, this.earnedTickets);
      this.game.sound.playSfx('success_bell', 0.95);
      for (let i = 0; i < 28; i++) {
        this.fx.push(new SparkleFX(this.fox.pos.x, this.fox.pos.y, 'confetti'));
      }
    } else {
      this.state = 'LOSE';
      this.earnedStars = 0;
      this.earnedTickets = 3;
      this.game.save.addTickets(this.earnedTickets);
      this.game.sound.playSfx('fail_soft_2', 0.8);
    }
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const zBase = 'Legend_of_Zink_Asset_Pack/Legend_of_Zink_Asset_Pack/';

    // 1. Ciel Zelda + Temple d'Hyrule en arrière-plan
    const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.draw(g, assets, skyMood, 480, 0, 0);
    } else {
      g.background(126, 178, 212);
    }

    // Collines, murs antiques & colonnes du temple Zelda avec torches vacillantes, bannières et runes
    const t = frameCount;
    g.noStroke();
    g.fill(88, 128, 96);
    g.rect(0, 94, 480, 178);
    // Arche lointaine du sanctuaire
    g.fill(66, 94, 80, 150);
    g.rect(92, 102, 296, 138);
    g.fill(82, 118, 96, 140);
    g.rect(112, 114, 256, 126);

    for (let idx = 0; idx < 4; idx++) {
      const px = [24, 168, 296, 440][idx];
      g.fill(74, 108, 86, 200);
      g.rect(px, 98, 16, 142);
      g.fill(102, 138, 114, 185);
      g.rect(px + 2, 98, 4, 142);
      // Chapiteau & socle de colonne
      g.fill(116, 148, 124, 210);
      g.rect(px - 2, 96, 20, 5);
      g.rect(px - 2, 234, 20, 6);

      // Runes mystiques cyan scintillantes sur les colonnes centrales
      if (idx === 1 || idx === 2) {
        const runeA = Math.round(95 + Math.sin(t * 0.08 + idx) * 65);
        g.fill(124, 226, 246, runeA);
        g.rect(px + 6, 146, 4, 2);
        g.rect(px + 7, 150, 2, 5);
        g.rect(px + 6, 157, 4, 2);
      }

      // Bannière royale rouge & or suspendue
      g.fill(168, 64, 78, 210);
      g.rect(px + 3, 104, 10, 20);
      g.triangle(px + 3, 124, px + 8, 130, px + 13, 124);
      g.fill(248, 208, 92, 220);
      g.rect(px + 6, 108, 4, 10);

      // Torche murale animée avec halo chaud
      const tx = px + 8;
      const ty = 176;
      const flick = Math.sin(t * 0.25 + idx * 1.9);
      g.fill(255, 194, 96, Math.round(42 + flick * 14));
      g.circle(tx, ty - 2, 24 + flick * 3);
      g.fill(92, 62, 54);
      g.rect(tx - 2, ty, 4, 8);
      g.fill(255, 142, 64);
      g.triangle(tx - 3, ty, tx, ty - 7 - Math.round(flick), tx + 3, ty);
      g.fill(255, 238, 148);
      g.rect(tx - 1, ty - 4, 2, 4);
    }

    // Symbole Triforce doré lumineux gravé au centre du temple (s'illumine en victoire !)
    g.push();
    g.noStroke();
    const winBoost = this.state === 'WIN' ? 90 : 0;
    const triPulse = Math.round(36 + Math.sin(t * 0.07) * 16 + winBoost * 0.5);
    g.fill(255, 226, 118, triPulse);
    g.circle(240, 78, this.state === 'WIN' ? 76 : 46);
    g.fill(252, 216, 102, Math.min(255, 145 + winBoost));
    g.triangle(240, 62, 232, 76, 248, 76);
    g.triangle(232, 76, 224, 90, 240, 90);
    g.triangle(248, 76, 240, 90, 256, 90);
    // Particules de mana dorées dérivant dans le temple
    for (let i = 0; i < 10; i++) {
      const mx = Math.round(((i * 53 + t * (0.14 + (i % 3) * 0.05)) % 470) + 5);
      const my = Math.round(108 + ((i * 31) % 124) + Math.sin(t * 0.06 + i) * 5);
      g.fill(255, 238, 162, Math.round(90 + Math.sin(t * 0.1 + i) * 70));
      g.rect(mx, my, 2, 2);
    }
    g.pop();

    // 2. Sol du temple + 3 plateformes en blocs Zelda (sprBlueBlock / sprDarkPurpleBlock)
    const blockImg = assets.getImage(zBase + 'Props/PNG/sprBlueBlock.png');
    const floorImg = assets.getImage(zBase + 'Props/PNG/sprDarkPurpleBlock.png');

    // Sol principal (y = 240..272)
    g.fill(92, 142, 76);
    g.rect(0, this.groundY, 480, 5);
    g.fill(72, 62, 86);
    g.rect(0, this.groundY + 5, 480, 27);
    if (floorImg) {
      for (let fx = 0; fx < 480; fx += 16) {
        g.image(floorImg, fx, this.groundY + 4, 16, 16);
      }
    }
    // Vases antiques Zelda décoratifs aux bords du temple
    const fancyPot = assets.getImage(zBase + 'Props/PNG/sprFancyPot.png');
    const bluePot = assets.getImage(zBase + 'Props/PNG/sprBluePot.png');
    if (fancyPot) {
      g.image(fancyPot, 8, this.groundY - 15, 16, 16);
      g.image(fancyPot, 456, this.groundY - 15, 16, 16);
    }
    if (bluePot) {
      g.image(bluePot, 24, this.groundY - 14, 14, 14);
      g.image(bluePot, 442, this.groundY - 14, 14, 14);
    }

    // 3 plateformes flottantes Zelda
    for (const pl of this.platforms) {
      g.fill(52, 38, 64, 110);
      g.rect(pl.x + 2, pl.y + 4, pl.w, pl.h, 2);
      if (blockImg) {
        for (let bx = pl.x; bx < pl.x + pl.w; bx += 16) {
          g.image(blockImg, bx, pl.y, Math.min(16, pl.x + pl.w - bx), 14);
        }
      } else {
        g.fill(116, 134, 178);
        g.rect(pl.x, pl.y, pl.w, pl.h, 2);
      }
      // Herbe verte lumineuse sur le dessus de chaque plateforme
      g.fill(134, 198, 96);
      g.rect(pl.x, pl.y, pl.w, 3);
    }

    // 3. Blocs de couverture au sol (Obstacle extends Vehicle)
    for (const obs of this.obstacles) {
      if (floorImg) {
        g.image(floorImg, Math.round(obs.pos.x - 10), Math.round(obs.pos.y - 10), 20, 20);
      }
      obs.showDebug(g);
    }

    // 4. Bonus Zelda + Projectiles + Boss Mage de Feu + Moo (avec sa tenue sauvegardée !)
    for (const pu of this.powerups) pu.show(g);
    for (const p of this.projectiles) p.show(g);

    this.drawZeldaBoss(g, assets, zBase);

    if (this.moo) {
      if (this.mooShield) {
        g.noFill();
        g.stroke(120, 224, 255, 220);
        g.strokeWeight(1.5);
        g.circle(Math.round(this.moo.pos.x), Math.round(this.moo.pos.y) - 16, 28);
      }
      this.moo.show(g, this.game.save.data.equippedOutfit);
    }

    // Réticule de visée boomerang
    if (this.state === 'PLAYING') {
      const { mx, my } = this.game.getMouseBufferPos();
      g.push();
      g.noFill();
      g.stroke(255, 240, 140, 210);
      g.strokeWeight(1);
      g.circle(Math.round(mx), Math.round(my), 10);
      g.line(Math.round(mx) - 7, Math.round(my), Math.round(mx) + 7, Math.round(my));
      g.line(Math.round(mx), Math.round(my) - 7, Math.round(mx), Math.round(my) + 7);
      g.pop();
    }

    for (const fx of this.fx) fx.show(g, assets);

    // Éclairage coucher de soleil cohérent sur le temple Zelda
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawMoodGlaze(g, skyMood, 480, 272);
    }

    // 5. HUD Zelda (Cœurs de Moo + Vie du Boss)
    this.drawHud(g);

    if (this.state === 'INTRO') this.drawIntroCard(g);
    else if (this.state === 'PAUSED') { PixelUI.flushLayer(g); this.drawPauseMenu(g); }
    else if (this.state === 'WIN' || this.state === 'LOSE') { PixelUI.flushLayer(g); this.drawEndCard(g); }
  }

  /** Dessine le Boss Zelda (Fire Cultist) sur la position & l'IA Steering Behaviors de FoxBoss. */
  drawZeldaBoss(g, assets, zBase) {
    if (!this.fox) return;
    const px = Math.round(this.fox.pos.x);
    const py = Math.round(this.fox.pos.y);
    const facingLeft = this.moo ? this.moo.pos.x < this.fox.pos.x : this.fox.vel.x < 0;
    const sheetPath = zBase + (facingLeft ? 'Enemies/PNG/sprFireCultistW.png' : 'Enemies/PNG/sprFireCultistE.png');
    const img = assets.getImage(sheetPath);

    g.push();
    g.translate(px, py);
    if (this.fox.hasShield) {
      g.noFill();
      g.stroke(120, 224, 255, 210);
      g.strokeWeight(1.5);
      g.circle(0, -2, 26);
    }
    if (this.fox.hurtFlash > 0 && Math.floor(frameCount / 2) % 2 === 0 && g.drawingContext) {
      g.drawingContext.globalAlpha = 0.5;
    }

    if (img) {
      const fh = img.height;
      const fw = fh; // cellules carrées dans les strips horizontaux Zelda
      const cols = Math.max(1, Math.floor(img.width / fw));
      const col = this.fox.isKO ? 0 : Math.floor(frameCount / 7) % cols;
      g.image(img, -14, -18, 28, 28, col * fw, 0, fw, fh);
    } else {
      this.fox.show(g);
    }
    if (g.drawingContext) g.drawingContext.globalAlpha = 1;
    g.pop();

    if (this.fox.isKO) {
      const star = assets.getImage('generated/fx/dizzy_star.png');
      for (let i = 0; i < 3; i++) {
        const a = frameCount * 0.1 + (TWO_PI * i) / 3;
        if (star) g.image(star, Math.round(px + Math.cos(a) * 11) - 4, Math.round(py - 18 + Math.sin(a) * 4) - 4);
      }
    }
  }

  drawHud(g) {
    const font = this.game.assets.font;

    // Cœurs animés de Moo (heart idle1..4.png en haut à gauche)
    PixelUI.panel(g, 8, 5, 134, 16);
    PixelUI.txt(g, font, 'MOO', 14, 8, g.color(107, 75, 91), LEFT, 8.5);
    const heartFrame = (Math.floor(frameCount / 14) % 4) + 1;
    const heartImg = this.game.assets.getImage('ui/Icon & Menu/Icon & Menu/Heart HP/heart idle' + heartFrame + '.png');
    for (let i = 0; i < this.mooMaxHp; i++) {
      if (i < this.mooHp && heartImg) {
        g.image(heartImg, 44 + i * 16, 6, 13, 13);
      } else {
        g.noStroke();
        g.fill(i < this.mooHp ? g.color(230, 82, 102) : g.color(185, 165, 165, 140));
        g.circle(50 + i * 16, 13, 7);
      }
    }

    // Barre de vie du Fire Cultist Boss (en haut à droite)
    PixelUI.panel(g, 294, 5, 178, 16);
    PixelUI.txt(g, font, 'BOSS', 300, 8, g.color(168, 74, 94), LEFT, 8.5);
    const ratio = this.fox ? constrain(this.fox.hp / this.fox.maxHp, 0, 1) : 0;
    g.noStroke();
    g.fill(107, 75, 91);
    g.rect(338, 9, 126, 8);
    g.fill(238, 114, 82);
    g.rect(338, 9, Math.round(126 * ratio), 8);

    if (this.tripleFrames > 0) {
      PixelUI.drawTag(g, font, 'TRIPLE BOOMERANG!', 218, 22, g.color(255, 224, 120));
    }
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    this.startBtn = { x: 180, y: 204, w: 120, h: 24 };
    PixelUI.drawRulesCard(g, font, {
      title: 'THE LEGEND OF MOO (2D PLATFORMER)',
      headerCol: g.color(76, 148, 104),
      rules: [
        'Run & double-jump across Hyrule Temple stone platforms!',
        'Click to throw spinning Zelda Boomerangs at the Fire Mage!',
        'Dodge homing fireballs & race for Hearts, Magic 3x & Potions.',
        'Defeat the boss without taking a hit for a 3-star bonus!'
      ],
      controls: 'A/D: Run  |  W/Up/Space: Double-Jump  |  S: Drop  |  Click: Boomerang',
      btnRect: this.startBtn,
      btnLabel: 'QUEST! (Space)',
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
    g.fill(76, 148, 104);
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
    g.fill(won ? g.color(76, 148, 104) : g.color(189, 117, 126));
    g.rect(92, 58, 296, 22);
    PixelUI.txt(g, font, won ? 'HYRULE SAVED! YOU WIN!' : 'SO CLOSE! TRY AGAIN?', 240, 64, g.color(243, 244, 231), CENTER, 10, 280);

    if (won) {
      const starStr = '*'.repeat(this.earnedStars) + '-'.repeat(3 - this.earnedStars);
      PixelUI.txt(g, font, 'Stars: [' + starStr + ']' + (!this.wasHit ? '  (NO-HIT BONUS!)' : ''), 240, 102, g.color(107, 75, 91), CENTER, 9.5, 280);
    } else {
      PixelUI.txt(g, font, 'Use double-jump & platforms to dodge fireballs!', 240, 104, g.color(107, 75, 91), CENTER, 9, 280);
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
      this.fireBoomerang(mx, my);
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
      }
      return;
    }
    if (this.state === 'PLAYING') {
      if (kc === UP_ARROW || k === 'w' || k === 'W' || k === 'z' || k === 'Z' || k === ' ') {
        this.triggerJump();
      }
      return;
    }
    if ((this.state === 'WIN' || this.state === 'LOSE') && (k === ' ' || kc === ENTER)) {
      this.resetRound(false);
    }
  }
}
