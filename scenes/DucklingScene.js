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

    this.totalDucklings = 20;
    this.goalCount = 15;
    this.totalTime = 75;
    this.timeLeft = this.totalTime;
    this.inPenCount = 0;

    this.ducklings = [];
    this.goose = null;
    this.obstacles = [];
    this.fx = [];

    // Compte à rebours textToPoints ("3", "2", "1", "START!")
    this.countdownSteps = ['3', '2', '1', 'START!'];
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

    // Créer les 20 canetons (dont 3 rebelles avec wander plus élevé)
    this.ducklings = [];
    for (let i = 0; i < this.totalDucklings; i++) {
      const isRebel = i >= this.totalDucklings - 3;
      const d = new BoidDuckling(random(30, 320), random(40, 235), this.game.assets, isRebel);
      this.ducklings.push(d);
    }

    // Une oie grognon patrouille dans le pré
    this.goose = new GrumpyGoose(96, 86, this.game.assets);

    this.assignTextTargets(this.countdownSteps[0]);
  }

  /**
   * Utilise textToPoints() sur la police pixel (cf. cours slide 24) pour
   * répartir les 20 canetons sur les lettres de "3", "2", "1", "START!".
   */
  assignTextTargets(word) {
    const font = this.game.assets.font;
    let pts = [];
    if (font && typeof font.textToPoints === 'function') {
      const sz = word.length > 1 ? 56 : 86;
      const bounds = font.textBounds(word, 0, 0, sz);
      const tx = 200 - bounds.w / 2;
      const ty = 148 + bounds.h / 2;
      pts = font.textToPoints(word, tx, ty, sz, { sampleFactor: 0.25 });
    }

    if (pts.length === 0) {
      // Repli géométrique propre si la police ne renvoie pas de points
      for (let i = 0; i < this.ducklings.length; i++) {
        const a = (TWO_PI * i) / this.ducklings.length;
        pts.push({ x: 200 + Math.cos(a) * 44, y: 140 + Math.sin(a) * 36 });
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
      if (this.inPenCount >= 19 || this.timeLeft >= 20) {
        this.earnedStars = 3;
        this.earnedTickets = 16;
      } else if (this.inPenCount >= 17 || this.timeLeft >= 10) {
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

    // 3. Oie grognon + canetons
    if (this.state !== 'COUNTDOWN') {
      this.goose.show(g);
    }
    for (const d of this.ducklings) {
      d.show(g);
    }

    // 4. Bulle amicale "shoo" autour de la souris pendant le jeu
    if (this.state === 'PLAYING') {
      const { mx, my } = this.game.getMouseBufferPos();
      g.push();
      g.noFill();
      g.stroke(255, 245, 190, 140);
      g.strokeWeight(1);
      g.circle(Math.round(mx), Math.round(my), 56 * 2);
      g.fill(255, 245, 190, 40);
      g.noStroke();
      g.circle(Math.round(mx), Math.round(my), 18);
      g.pop();
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
      PixelUI.drawTag(g, font, 'Get ready! Herd ducklings into the pen ->', 240, 256, g.color(247, 235, 170));
    } else if (this.state === 'INTRO_CARD') {
      this.drawIntroCard(g);
    } else if (this.state === 'PAUSED') {
      this.drawPauseMenu(g);
    } else if (this.state === 'WIN' || this.state === 'TIMEUP') {
      this.drawEndCard(g);
    }
  }

  drawPasture(g) {
    g.noStroke();
    g.fill(154, 196, 126);
    g.rect(0, 0, 480, 272);

    // Mare centrale à éviter
    g.fill(122, 186, 210);
    g.ellipse(this.pond.x, this.pond.y, this.pond.rx * 2, this.pond.ry * 2);
    g.fill(158, 214, 232);
    g.ellipse(this.pond.x - 6, this.pond.y - 3, this.pond.rx * 1.1, this.pond.ry * 0.9);

    // Clôture du pré
    g.noFill();
    g.stroke(107, 75, 91);
    g.strokeWeight(3);
    g.rect(10, 26, 460, 236);
    g.stroke(182, 137, 98);
    g.strokeWeight(1);
    g.rect(10, 26, 460, 236);
  }

  drawPen(g) {
    const p = this.penRect;
    // Sol paillé accueillant dans l'enclos
    g.noStroke();
    g.fill(232, 212, 152);
    g.rect(p.x, p.y, p.w, p.h);

    // Clôtures de l'enclos (porte grande ouverte sur le côté gauche de y+28 à y+80)
    g.stroke(107, 75, 91);
    g.strokeWeight(4);
    g.line(p.x, p.y, p.x + p.w, p.y);
    g.line(p.x + p.w, p.y, p.x + p.w, p.y + p.h);
    g.line(p.x, p.y + p.h, p.x + p.w, p.y + p.h);
    g.line(p.x, p.y, p.x, p.y + 28);
    g.line(p.x, p.y + 80, p.x, p.y + p.h);

    // Panneau d'enclos
    const sign = this.game.assets.getImage('generated/ducklings/pen_sign.png');
    if (sign) {
      g.image(sign, p.x + 32, p.y - 18);
    } else {
      PixelUI.drawTag(g, this.game.assets.font, 'PEN', p.x + 48, p.y - 2);
    }
  }

  drawHud(g) {
    const font = this.game.assets.font;

    // Compteur canetons dans l'enclos
    PixelUI.panel(g, 8, 5, 130, 16);
    PixelUI.txt(g, font, 'PEN: ' + this.inPenCount + '/' + this.totalDucklings + ' (goal ' + this.goalCount + ')', 13, 8, g.color(107, 75, 91));

    // Barre de coucher de soleil
    PixelUI.panel(g, 148, 5, 184, 16);
    const ratio = constrain(this.timeLeft / this.totalTime, 0, 1);
    g.noStroke();
    g.fill(107, 75, 91);
    g.rect(152, 9, 114, 8);
    g.fill(lerpColor(g.color(220, 110, 140), g.color(250, 215, 110), ratio));
    g.rect(152, 9, Math.round(114 * ratio), 8);
    PixelUI.txt(g, font, Math.ceil(this.timeLeft) + 's', 274, 8, g.color(107, 75, 91));

    PixelUI.panel(g, 342, 5, 70, 16);
    PixelUI.txt(g, font, 'Esc Pause', 347, 8, g.color(144, 98, 93));
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    g.noStroke();
    g.fill(0, 0, 0, 115);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 74, 54, 332, 160);
    g.fill(112, 162, 198);
    g.rect(74, 54, 332, 22);
    PixelUI.txt(g, font, 'DUCKLING HERDER', 240, 60, g.color(243, 244, 231), CENTER);

    PixelUI.txt(g, font, 'Use the mouse bubble to gently shoo ducklings!', 240, 92, g.color(107, 75, 91), CENTER);
    PixelUI.txt(g, font, 'Herd at least ' + this.goalCount + '/20 into the pen before sunset.', 240, 112, g.color(107, 75, 91), CENTER);
    PixelUI.txt(g, font, 'Watch out for the grumpy goose & rebel ducklings!', 240, 132, g.color(144, 98, 93), CENTER);

    PixelUI.drawButton(g, font, this.startBtn, 'START (Space)', PixelUI.pointInRect(mx, my, this.startBtn), g.color(223, 240, 187));
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
      const starStr = '★'.repeat(this.earnedStars) + '☆'.repeat(3 - this.earnedStars);
      PixelUI.txt(g, font, 'Stars: ' + starStr + '  (' + this.inPenCount + '/20 safe!)', 240, 100, g.color(107, 75, 91), CENTER);
    } else {
      PixelUI.txt(g, font, 'You herded ' + this.inPenCount + ' / ' + this.goalCount + ' ducklings!', 240, 102, g.color(107, 75, 91), CENTER);
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
