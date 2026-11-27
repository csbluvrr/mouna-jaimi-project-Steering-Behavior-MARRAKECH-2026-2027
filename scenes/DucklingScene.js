/**
 * Mini-jeu 3 : Duckling Herder (Boids + textToPoints).
 * - Intro : les 20 canetons volent en arrive() sur les points de textToPoints
 *   pour former "3", "2", "1", "START!" puis éclatent en mode Boids.
 * - Volée : align + cohesion + separation + flee (bulle souris "shoo") + avoid + arrive(enclos).
 * - Quelques canetons rebelles (wander fort) + 1 oie grognon (pursue + wander).
 * - Objectif : rentrer au moins 15/20 canetons dans l'enclos avant le coucher du soleil (75s).
 */
class DucklingScene extends Scene {
  constructor(game) {
    super(game);
    this.state = 'INTRO_CARD'; // 'INTRO_CARD' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'WIN' | 'TIMEUP'
    this.seenIntro = false;

    this.totalDucklings = 32;
    this.goalCount = 24;
    this.totalTime = 75;
    this.timeLeft = this.totalTime;
    this.inPenCount = 0;

    this.ducklings = [];
    this.goose = null;
    this.obstacles = [];
    this.fx = [];

    // Compte à rebours textToPoints ("3", "2", "1", "GO!") — ultra lisible avec 32 canetons !
    this.countdownSteps = ['3', '2', '1', 'GO!'];
    this.countdownIdx = 0;
    this.countdownTimer = 0;

    this.penRect = { x: 368, y: 84, w: 96, h: 108 };
    this.pond = { x: 118, y: 176, rx: 34, ry: 20 };

    this.earnedStars = 0;
    this.earnedTickets = 0;

    this.startBtn = { x: 185, y: 182, w: 110, h: 22 };
    this.resumeBtn = { x: 180, y: 112, w: 120, h: 20 };
    this.restartBtn = { x: 180, y: 138, w: 120, h: 20 };
    this.exitBtn = { x: 180, y: 164, w: 120, h: 20 };
    this.retryEndBtn = { x: 130, y: 192, w: 104, h: 22 };
    this.hubEndBtn = { x: 246, y: 192, w: 104, h: 22 };
  }

  init() {
    this.game.sound.playMusic('ducklings');
    this.game.sound.playSfx('jingle_ducklings', 0.7);
    this.resetRound(!this.seenIntro);
  }

  resetRound(showIntro = false) {
    this.state = showIntro ? 'INTRO_CARD' : 'COUNTDOWN';
    this.timeLeft = this.totalTime;
    this.inPenCount = 0;
    this.fx = [];
    this.countdownIdx = 0;
    this.countdownTimer = 0;

    // Obstacles circulaires : mare + coins/murs de l'enclos (sauf la porte ouverte à gauche !)
    this.obstacles = [
      new Obstacle(this.pond.x, this.pond.y, 26, 'pond'),
      new Obstacle(this.penRect.x, this.penRect.y + 8, 9, 'fence'),
      new Obstacle(this.penRect.x, this.penRect.y + this.penRect.h - 8, 9, 'fence'),
      new Obstacle(this.penRect.x + 48, this.penRect.y, 12, 'fence'),
      new Obstacle(this.penRect.x + 48, this.penRect.y + this.penRect.h, 12, 'fence')
    ];

    // Créer les 32 canetons sur la moitié gauche du pré (loin de l'enclos) dont 4 rebelles
    this.ducklings = [];
    for (let i = 0; i < this.totalDucklings; i++) {
      const isRebel = i >= this.totalDucklings - 4;
      const d = new BoidDuckling(random(30, 260), random(42, 232), this.game.assets, isRebel);
      this.ducklings.push(d);
    }

    // Une oie grognon patrouille dans le pré
    this.goose = new GrumpyGoose(96, 86, this.game.assets);

    this.assignTextTargets(this.countdownSteps[0]);
  }

  /**
   * Utilise textToPoints() sur la police pixel (cf. cours slide 24) pour
   * répartir les 32 canetons bien espacés sur "3", "2", "1", "GO!".
   */
  assignTextTargets(word) {
    const font = this.game.assets.font;
    let pts = [];
    if (font && typeof font.textToPoints === 'function') {
      const sz = word.length > 1 ? 74 : 102;
      const bounds = font.textBounds(word, 0, 0, sz);
      const tx = 192 - bounds.w / 2;
      const ty = 148 + bounds.h / 2;
      pts = font.textToPoints(word, tx, ty, sz, { sampleFactor: 0.35 });
    }

    if (pts.length === 0) {
      for (let i = 0; i < this.ducklings.length; i++) {
        const a = (TWO_PI * i) / this.ducklings.length;
        pts.push({ x: 192 + Math.cos(a) * 44, y: 140 + Math.sin(a) * 36 });
      }
    }

    for (let i = 0; i < this.ducklings.length; i++) {
      const p = pts[Math.floor((i * pts.length) / this.ducklings.length)];
      this.ducklings[i].textTarget.set(p.x, p.y);
    }
  }

  update() {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].update();
      if (this.fx[i].isDead) this.fx.splice(i, 1);
    }

    if (this.state === 'INTRO_CARD' || this.state === 'PAUSED') return;

    // Phase d'intro textToPoints ("3" -> "2" -> "1" -> "START!")
    if (this.state === 'COUNTDOWN') {
      this.countdownTimer++;
      const { mx, my } = this.game.getMouseBufferPos();
      const shoo = createVector(mx, my);
      for (const d of this.ducklings) {
        d.step(this.ducklings, this.obstacles, shoo, null);
      }

      if (this.countdownTimer >= 52) {
        this.countdownTimer = 0;
        this.countdownIdx++;
        if (this.countdownIdx < this.countdownSteps.length) {
          this.game.sound.playSfx('countdown_tick', 0.7);
          this.assignTextTargets(this.countdownSteps[this.countdownIdx]);
        } else {
          // Début de la partie : tous les canetons éclatent en mode Boids !
          this.game.sound.playSfx('squeak_double_2', 0.8);
          this.state = 'PLAYING';
          for (const d of this.ducklings) {
            d.startFlockMode();
          }
        }
      }
      return;
    }

    if (this.state === 'WIN' || this.state === 'TIMEUP') {
      // Les canetons dans l'enclos continuent de sautiller joyeusement
      const noShoo = createVector(-999, -999);
      for (const d of this.ducklings) {
        if (d.mode === 'IN_PEN') d.step(this.ducklings, this.obstacles, noShoo, null);
      }
      return;
    }

    // Phase PLAYING : chrono de coucher du soleil
    this.timeLeft = Math.max(0, this.timeLeft - deltaTime / 1000);
    if (this.timeLeft <= 0) {
      this.finishRound(this.inPenCount >= this.goalCount);
      return;
    }

    const { mx, my } = this.game.getMouseBufferPos();
    const shooPos = createVector(mx, my);

    this.goose.step(this.ducklings, this.obstacles);

    for (const d of this.ducklings) {
      const justEntered = d.step(this.ducklings, this.obstacles, shooPos, this.goose);
      if (justEntered) {
        this.inPenCount++;
        this.game.sound.playSfx('squeak_1', 0.7);
        this.fx.push(new SparkleFX(d.pos.x, d.pos.y - 6, 'text', '+1', color(223, 240, 187)));
        for (let k = 0; k < 4; k++) {
          this.fx.push(new SparkleFX(d.pos.x, d.pos.y, 'sparkle'));
        }
      }
    }

    // Victoire immédiate si tous les 20 canetons sont rentrés !
    if (this.inPenCount >= this.totalDucklings) {
      this.finishRound(true);
    }
  }

  finishRound(won) {
    if (won) {
      this.state = 'WIN';
      if (this.inPenCount >= this.totalDucklings - 2 || this.timeLeft >= 20) {
        this.earnedStars = 3;
        this.earnedTickets = 16;
      } else if (this.inPenCount >= this.goalCount + 3 || this.timeLeft >= 10) {
        this.earnedStars = 2;
        this.earnedTickets = 11;
      } else {
        this.earnedStars = 1;
        this.earnedTickets = 7;
      }
      this.game.save.recordGameResult('ducklings', this.earnedStars, this.earnedTickets);
      this.game.sound.playSfx('success_bell', 0.9);
      for (let i = 0; i < 24; i++) {
        this.fx.push(new SparkleFX(this.penRect.x + 48, this.penRect.y + 40, 'confetti'));
      }
    } else {
      this.state = 'TIMEUP';
      this.earnedStars = 0;
      this.earnedTickets = 2;
      this.game.save.addTickets(this.earnedTickets);
      this.game.sound.playSfx('fail_soft_2', 0.8);
    }
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;

    // 1. Pré + transition de ciel vers le crépuscule selon le temps restant
    this.drawPasture(g);

    // 2. Enclos des canetons (à droite, porte ouverte à gauche)
    this.drawPen(g);

    // Silhouette douce du chiffre/mot pendant le compte à rebours textToPoints pour une lisibilité parfaite
    if (this.state === 'COUNTDOWN') {
      const word = this.countdownSteps[this.countdownIdx] || '';
      g.push();
      g.textFont('Verdana, Trebuchet MS, sans-serif');
      g.textStyle(BOLD);
      g.textAlign(CENTER, CENTER);
      g.textSize(word.length > 1 ? 66 : 92);
      g.noStroke();
      g.fill(255, 250, 215, 72);
      g.text(word, 192, 146);
      g.pop();
    }

    // 3. Oie grognon + canetons
    if (this.state !== 'COUNTDOWN') {
      this.goose.show(g);
    }
    for (const d of this.ducklings) {
      d.show(g);
    }

    // 4. Nuage mignon "SHOO!" autour de la souris pendant le jeu
    if (this.state === 'PLAYING') {
      const { mx, my } = this.game.getMouseBufferPos();
      this.drawShooCloud(g, Math.round(mx), Math.round(my));
    }

    // 5. Effets visuels
    for (const fx of this.fx) {
      fx.show(g, assets);
    }

    // 6. Teinte douce de coucher de soleil progressive
    const duskRatio = 1 - this.timeLeft / this.totalTime;
    if (duskRatio > 0.15) {
      g.noStroke();
      g.fill(120, 62, 118, Math.round((duskRatio - 0.15) * 95));
      g.rect(0, 0, 480, 272);
    }

    // 7. Debug [H]
    if (Vehicle.debug) {
      for (const obs of this.obstacles) obs.showDebug(g);
      PixelUI.drawTag(g, font, 'DEBUG [H]: Boids + flee + avoid', 378, 266, g.color(223, 240, 187));
    }

    // 8. HUD + Overlays
    this.drawHud(g);
    if (this.state === 'COUNTDOWN') {
      PixelUI.drawTag(g, font, "Get ready! Herd Purins into Moo's Purin Farm ->", 240, 256, g.color(247, 235, 170));
    } else if (this.state === 'INTRO_CARD') {
      this.drawIntroCard(g);
    } else if (this.state === 'PAUSED') {
      this.drawPauseMenu(g);
    } else if (this.state === 'WIN' || this.state === 'TIMEUP') {
      this.drawEndCard(g);
    }
  }

  /** Dessine le nuage doux et animé "SHOO!" qui suit la souris pour guider les Pompompurins. */
  drawShooCloud(g, cx, cy) {
    const bob = Math.round(Math.sin(frameCount * 0.14) * 1.5);
    g.push();
    // Rayon d'influence doux en pointillés
    g.noFill();
    g.stroke(255, 248, 210, 130);
    g.strokeWeight(1);
    g.circle(cx, cy, 112);

    // Nuage moelleux crème-blanc + contour chocolat caramel
    g.translate(cx, cy + bob);
    g.noStroke();
    g.fill(118, 72, 52, 160);
    g.circle(-7, 2, 13);
    g.circle(7, 2, 13);
    g.circle(0, -3, 15);
    g.rect(-7, 0, 14, 8);

    g.fill(255, 252, 242);
    g.circle(-6, 1, 11);
    g.circle(6, 1, 11);
    g.circle(0, -3, 13);
    g.rect(-6, 0, 12, 7);

    // Petit visage kawaii sur le nuage
    g.fill(107, 68, 52);
    g.rect(-3, -1, 1.5, 2);
    g.rect(2, -1, 1.5, 2);
    g.fill(252, 166, 184);
    g.rect(-5, 1, 2, 1.5);
    g.rect(3.5, 1, 2, 1.5);
    g.pop();

    PixelUI.txt(g, this.game.assets.font, 'SHOO!', cx, cy - 19 + bob, g.color(118, 72, 52), CENTER, 7.5);
  }

  drawPasture(g) {
    // Prairie pastel thème Pompompurin (crème vanille + menthe douce + motifs pudding)
    g.noStroke();
    g.fill(178, 214, 146);
    g.rect(0, 0, 480, 272);
    g.fill(190, 224, 156);
    for (let y = 28; y < 260; y += 24) {
      for (let x = 12; x < 468; x += 24) {
        if (((x + y) / 24) % 2 === 0) g.rect(x, y, 24, 24);
      }
    }

    // Petites fleurs crème & caramel dans l'herbe
    for (let i = 0; i < 14; i++) {
      const fx = 28 + (i * 73) % 315;
      const fy = 40 + (i * 47) % 205;
      g.fill(255, 244, 182);
      g.circle(fx, fy, 4);
      g.fill(158, 96, 56);
      g.circle(fx, fy, 1.5);
    }

    // Mare caramel-lait / bleue douce à contourner
    g.fill(134, 198, 218);
    g.ellipse(this.pond.x, this.pond.y, this.pond.rx * 2, this.pond.ry * 2);
    g.fill(174, 224, 240);
    g.ellipse(this.pond.x - 6, this.pond.y - 3, this.pond.rx * 1.1, this.pond.ry * 0.9);

    // Clôture caramel Pompompurin
    g.noFill();
    g.stroke(118, 72, 52);
    g.strokeWeight(3);
    g.rect(10, 26, 460, 236);
    g.stroke(236, 194, 126);
    g.strokeWeight(1);
    g.rect(10, 26, 460, 236);
  }

  drawPen(g) {
    const p = this.penRect;
    // Sol crème-caramel chaleureux dans Moo's Purin Farm
    g.noStroke();
    g.fill(252, 234, 168);
    g.rect(p.x, p.y, p.w, p.h);
    g.fill(244, 220, 146);
    g.rect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);

    // Clôtures solides chocolat-caramel (porte UNIQUEMENT à gauche de y+30 à y+78)
    g.stroke(118, 72, 52);
    g.strokeWeight(4);
    g.line(p.x, p.y, p.x + p.w, p.y);
    g.line(p.x + p.w, p.y, p.x + p.w, p.y + p.h);
    g.line(p.x, p.y + p.h, p.x + p.w, p.y + p.h);
    g.line(p.x, p.y, p.x, p.y + 30);
    g.line(p.x, p.y + 78, p.x, p.y + p.h);

    // Poteaux dorés + chevrons animés signalant l'ouverture
    g.noStroke();
    g.fill(252, 212, 102);
    g.rect(p.x - 3, p.y + 27, 6, 6);
    g.rect(p.x - 3, p.y + 75, 6, 6);
    const arrowX = p.x - 12 + Math.round(Math.sin(frameCount * 0.14) * 3);
    PixelUI.txt(g, this.game.assets.font, '>>', arrowX, p.y + 49, g.color(118, 72, 52), CENTER, 9);

    // Panneau "MOO'S PURIN FARM"
    PixelUI.drawTag(g, this.game.assets.font, "MOO'S PURIN FARM", p.x + 48, p.y - 4, g.color(252, 232, 162));
  }

  drawHud(g) {
    const font = this.game.assets.font;

    PixelUI.panel(g, 8, 5, 142, 16);
    PixelUI.txt(g, font, 'FARM: ' + this.inPenCount + '/' + this.totalDucklings + ' (goal ' + this.goalCount + ')', 13, 8, g.color(118, 72, 52), LEFT, 8.5, 132);

    PixelUI.panel(g, 156, 5, 176, 16);
    const ratio = constrain(this.timeLeft / this.totalTime, 0, 1);
    g.noStroke();
    g.fill(118, 72, 52);
    g.rect(160, 9, 108, 8);
    g.fill(236 + 18 * ratio, 136 + 88 * ratio, 112 + 12 * ratio);
    g.rect(160, 9, Math.round(108 * ratio), 8);
    PixelUI.txt(g, font, Math.ceil(this.timeLeft) + 's', 274, 8, g.color(118, 72, 52), LEFT, 8.5);

    PixelUI.panel(g, 338, 5, 80, 16);
    PixelUI.txt(g, font, 'M: Menu', 344, 8, g.color(144, 98, 93), LEFT, 8.5, 70);
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    this.startBtn = { x: 180, y: 204, w: 120, h: 24 };
    PixelUI.drawRulesCard(g, font, {
      title: 'CATCH THE PURINS! (BOIDS)',
      headerCol: g.color(198, 134, 72),
      rules: [
        'Use your fluffy SHOO! cloud cursor to herd the Pompompurins!',
        "Guide at least " + this.goalCount + '/' + this.totalDucklings + " Purins into Moo's Purin Farm before sunset.",
        'Purins can ONLY enter through the open left gate (>>)!',
        'Watch out for the grumpy goose & cheeky rebel Purins!'
      ],
      controls: 'Mouse: Fluffy SHOO! Cloud  |  [H] Debug Boids  |  [M] Menu',
      btnRect: this.startBtn,
      btnLabel: 'START! (Space)',
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
    g.fill(112, 162, 198);
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
    g.fill(won ? g.color(112, 162, 198) : g.color(189, 117, 126));
    g.rect(92, 58, 296, 22);
    PixelUI.txt(g, font, won ? 'ALL SAFE FOR BEDTIME!' : 'SUNSET! TRY AGAIN?', 240, 64, g.color(243, 244, 231), CENTER);

    if (won) {
      const starStr = '*'.repeat(this.earnedStars) + '-'.repeat(3 - this.earnedStars);
      PixelUI.txt(g, font, 'Stars: [' + starStr + ']  (' + this.inPenCount + '/' + this.totalDucklings + ' safe!)', 240, 100, g.color(107, 75, 91), CENTER, 9.5, 280);
    } else {
      PixelUI.txt(g, font, 'You herded ' + this.inPenCount + ' / ' + this.goalCount + ' ducklings!', 240, 102, g.color(107, 75, 91), CENTER, 9.5, 280);
    }

    PixelUI.drawTag(g, font, '+' + this.earnedTickets + ' Tickets earned!', 240, 166, g.color(223, 240, 187));
    PixelUI.drawButton(g, font, this.retryEndBtn, 'Play Again', PixelUI.pointInRect(mx, my, this.retryEndBtn), g.color(223, 240, 187));
    PixelUI.drawButton(g, font, this.hubEndBtn, 'Back to Fair', PixelUI.pointInRect(mx, my, this.hubEndBtn));
  }

  backToHub() {
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo('hub', { fromBooth: 'ducklings' });
  }

  mousePressed(mx, my) {
    if (this.state === 'INTRO_CARD') {
      if (PixelUI.pointInRect(mx, my, this.startBtn)) {
        this.game.sound.playSfx('ui_click');
        this.seenIntro = true;
        this.state = 'COUNTDOWN';
        this.game.sound.playSfx('countdown_tick', 0.7);
      }
      return;
    }
    if (this.state === 'PAUSED') {
      if (PixelUI.pointInRect(mx, my, this.resumeBtn)) this.state = 'PLAYING';
      else if (PixelUI.pointInRect(mx, my, this.restartBtn)) this.resetRound(false);
      else if (PixelUI.pointInRect(mx, my, this.exitBtn)) this.backToHub();
      return;
    }
    if (this.state === 'WIN' || this.state === 'TIMEUP') {
      if (PixelUI.pointInRect(mx, my, this.retryEndBtn)) this.resetRound(false);
      else if (PixelUI.pointInRect(mx, my, this.hubEndBtn)) this.backToHub();
    }
  }

  keyPressed(k, kc) {
    if (this.state === 'INTRO_CARD') {
      if (k === ' ' || kc === ENTER) {
        this.seenIntro = true;
        this.state = 'COUNTDOWN';
        this.game.sound.playSfx('countdown_tick', 0.7);
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
    if ((this.state === 'WIN' || this.state === 'TIMEUP') && (k === ' ' || kc === ENTER)) {
      this.resetRound(false);
    }
  }
}
