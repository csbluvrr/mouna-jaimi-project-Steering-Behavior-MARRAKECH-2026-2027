/**
 * Mini-jeu 4 : Bunny Derby (Neuro-évolution TensorFlow.js — Sujet 2 du cours).
 * Deux modes accessibles par onglets :
 * 1) Training Barn : entraînement génétique des lapins sur track_01.png + track_01_mask.png
 *    avec panneau latéral de curseurs (rayons, portée, population, couches, neurones,
 *    mutation, activation), vitesse 1x/5x/20x, visualisation du réseau, sauvegarde/chargement
 *    des poids + configurations dans localStorage, et arrêt automatique quand >= 60% finissent un tour.
 * 2) Race Day : course immédiate avec cerveaux sauvegardés + cerveau pré-entraîné inclus,
 *    compte à rebours, classement en direct, couronne sur le leader, bottes de foin cliquables
 *    (comportement avoid), podium et tickets !
 */
class DerbyScene extends Scene {
  constructor(game) {
    super(game);
    // Race Day est le mode par défaut à l'entrée du stand ; Training Lab s'affiche uniquement en Debug [H] !
    this.mode = 'RACE';     // 'RACE' | 'TRAINING'
    this.state = 'INTRO';   // 'INTRO' | 'BETTING' | 'RUNNING' | 'PAUSED' | 'GRADUATED' | 'RACE_FINISH'
    this.seenIntro = false;

    // Système de pari de tickets pendant Race Day
    this.betBunnyIdx = 0;
    this.betAmount = 10;
    this.betResultMsg = '';
    this.betWonTickets = 0;

    this.meta = null;
    this.trackImg = null;
    this.maskPixels = null;
    this.maskW = 640;
    this.maskH = 360;
    this.trackId = 'clover'; // 'clover' (défaut complexe) | 'twister' | 'classic'
    this.spectators = [];
    this.balloons = [];
    this.pond = null;
    this.pollen = [];

    // Paramètres neuro-évolution réglables par les curseurs (slides 53 & 56)
    this.config = {
      rayCount: 5,
      rayLength: 75,
      popSize: 22,
      hiddenLayers: 1,
      hiddenNodes: 8,
      mutationRate: 0.12,
      activation: 'sigmoid'
    };

    this.speedMult = 1;
    this.showRays = true;
    this.generation = 1;
    this.bestFitnessEver = 0;
    this.bestLapSec = null;
    this.bestBrainEver = null;

    this.bunnies = [];
    this.savedBunnies = [];
    this.hayObstacles = [];
    this.fx = [];
    this.raceCountdown = 0;
    this.raceStandings = [];
    this.panelEl = null;

    this.startBtn = { x: 185, y: 184, w: 110, h: 22 };
    this.resumeBtn = { x: 180, y: 112, w: 120, h: 20 };
    this.restartBtn = { x: 180, y: 138, w: 120, h: 20 };
    this.exitBtn = { x: 180, y: 164, w: 120, h: 20 };
  }

  init() {
    this.game.sound.playMusic('derby');
    this.game.sound.playSfx('jingle_derby', 0.7);

    // Petits grains de pollen flottants pour un circuit vivant
    this.pollen = [];
    for (let i = 0; i < 14; i++) {
      this.pollen.push({
        x: random(12, 468),
        y: random(24, 260),
        vx: random(-0.12, 0.16),
        vy: random(-0.08, 0.08),
        phase: random(TWO_PI)
      });
    }

    this.hayObstacles = [];
    this.fx = [];
    this.mode = 'RACE'; // Toujours Race Day par défaut à l'entrée du stand
    this.createSidePanel();
    this.loadTrack(this.trackId, true);
    this.state = this.seenIntro ? 'BETTING' : 'INTRO';
  }

  /** Charge un des 3 circuits (Clover S-Curve, Twister Pro, ou Meadow Classic). */
  loadTrack(trackId, resetStats = true) {
    this.trackId = trackId;
    if (this.trackImg && typeof this.trackImg.remove === 'function') {
      this.trackImg.remove();
      this.trackImg = null;
    }

    if (trackId === 'classic') {
      this.meta = this.game.assets.derbyMeta;
      this.trackImg = this.game.assets.getImage('derby/track_01.png');
      const maskImg = this.game.assets.getImage('derby/track_01_mask.png');
      if (maskImg) {
        maskImg.loadPixels();
        this.maskPixels = maskImg.pixels;
        this.maskW = maskImg.width;
        this.maskH = maskImg.height;
      }
      this.spectators = [
        { x: 280, y: 175, colour: 'peach', phase: 0.4, facingLeft: false },
        { x: 320, y: 165, colour: 'mint', phase: 1.8, facingLeft: true },
        { x: 350, y: 180, colour: 'lavender', phase: 3.1, facingLeft: true }
      ];
      this.balloons = [
        { x: 36, y: 54, sprite: 'balloon_red', phase: 0 },
        { x: 600, y: 54, sprite: 'balloon_blue', phase: 1.5 },
        { x: 594, y: 310, sprite: 'balloon_yellow', phase: 3.0 }
      ];
      this.pond = null;
    } else {
      const built = TrackBuilder.buildCustomTrack(trackId, this.game.assets);
      this.meta = built;
      this.trackImg = built.trackImg;
      this.maskPixels = built.maskPixels;
      this.maskW = built.maskW;
      this.maskH = built.maskH;
      this.spectators = built.spectators;
      this.balloons = built.balloons;
      this.pond = built.pond;
    }

    if (this.mode === 'RACE') {
      this.prepareRaceGrid();
      this.state = this.seenIntro ? 'BETTING' : 'INTRO';
    } else {
      this.startTraining(resetStats);
    }
  }

  cleanup() {
    this.disposePopulation();
    if (this.trackImg && typeof this.trackImg.remove === 'function') {
      this.trackImg.remove();
      this.trackImg = null;
    }
    if (this.panelEl) {
      this.panelEl.remove();
      this.panelEl = null;
    }
  }

  disposePopulation() {
    for (const b of this.bunnies) b.dispose();
    for (const b of this.savedBunnies) b.dispose();
    this.bunnies = [];
    this.savedBunnies = [];
  }

  startTraining(resetStats = false) {
    this.mode = 'TRAINING';
    this.disposePopulation();
    this.hayObstacles = [];
    if (resetStats) {
      this.generation = 1;
      this.bestFitnessEver = 0;
      this.bestLapSec = null;
    }

    const [sx, sy] = this.meta.start;
    const heading = this.meta.start_heading_rad;
    for (let i = 0; i < this.config.popSize; i++) {
      this.bunnies.push(new DerbyBunny(sx, sy, heading, this.config, this.game.assets, null, i));
    }
    this.state = 'RUNNING';
    this.updatePanelStats();
  }

  /** Prépare la grille des 8 lapins de Race Day (avant le pari). */
  prepareRaceGrid() {
    this.mode = 'RACE';
    this.disposePopulation();
    this.raceStandings = [];
    this.hayObstacles = [];
    this.betResultMsg = '';
    this.betWonTickets = 0;

    const [sx, sy] = this.meta.start;
    const heading = this.meta.start_heading_rad;
    const saved = this.game.save.data.savedBrains || [];

    for (let i = 0; i < 8; i++) {
      let brain = null;
      let cfg = { ...this.config };
      let label = DerbyBunny.NAMES[i];

      if (i < saved.length && saved[i].brainData) {
        try {
          brain = NeuralNetwork.deserialize(saved[i].brainData);
          cfg = { ...cfg, ...saved[i].config };
          label = saved[i].name || label;
        } catch (e) {
          cfg.useRuleFallback = true;
        }
      } else if (i === saved.length && this.bestBrainEver) {
        brain = this.bestBrainEver.copy();
        label = 'Champ G' + this.generation;
      } else {
        cfg.useRuleFallback = true;
      }

      const offset = (i - 3.5) * 2.2;
      const nx = sx - Math.sin(heading) * offset;
      const ny = sy + Math.cos(heading) * offset;
      const bunny = new DerbyBunny(nx, ny, heading, cfg, this.game.assets, brain, i, label);
      bunny.maxSpeed = 2.12 + random(-0.08, 0.18);
      this.bunnies.push(bunny);
    }
  }

  /** Valide le pari de tickets et lance la course Race Day ! */
  startRaceDay(skipBetting = false) {
    if (!skipBetting) {
      this.prepareRaceGrid();
      this.state = 'BETTING';
      return;
    }

    // Déduire la mise si le joueur a parié des tickets
    const tickets = this.game.save.data.tickets || 0;
    const stake = Math.min(this.betAmount, tickets);
    this.betAmount = stake;
    if (stake > 0) {
      this.game.save.addTickets(-stake);
    }

    this.raceCountdown = 120; // 2 secondes
    this.state = 'RUNNING';
    this.game.sound.playSfx('countdown_tick', 0.7);
  }

  /** Sauvegarde le meilleur cerveau (poids + config sliders) dans localStorage. */
  saveBestBrain() {
    const leader = this.getLeaderBunny();
    const targetBrain = this.bestBrainEver || (leader && leader.brain);
    if (!targetBrain) return;

    const entry = {
      name: 'Brain G' + this.generation + ' (' + Math.round(this.bestFitnessEver) + ')',
      config: { ...this.config },
      brainData: targetBrain.serialize(),
      savedAt: new Date().toISOString()
    };

    if (!Array.isArray(this.game.save.data.savedBrains)) {
      this.game.save.data.savedBrains = [];
    }
    this.game.save.data.savedBrains.unshift(entry);
    if (this.game.save.data.savedBrains.length > 8) {
      this.game.save.data.savedBrains.pop();
    }
    this.game.save.save();
    this.game.sound.playSfx('success_bell', 0.8);
    this.refreshSavedDropdown();
  }

  loadSavedBrain(index) {
    const list = this.game.save.data.savedBrains || [];
    const entry = list[index];
    if (!entry || !entry.brainData) return;

    this.config = { ...this.config, ...entry.config };
    this.bestBrainEver = NeuralNetwork.deserialize(entry.brainData);
    this.disposePopulation();
    const [sx, sy] = this.meta.start;
    const heading = this.meta.start_heading_rad;
    for (let i = 0; i < this.config.popSize; i++) {
      const bBrain = this.bestBrainEver.copy();
      if (i > 0) bBrain.mutate(this.config.mutationRate * 0.5);
      this.bunnies.push(new DerbyBunny(sx, sy, heading, this.config, this.game.assets, bBrain, i));
    }
    this.state = 'RUNNING';
    this.game.sound.playSfx('ui_click');
  }

  getLeaderBunny() {
    let best = null;
    for (const b of this.bunnies) {
      if (!b.dead && (!best || b.checkpointsPassed > best.checkpointsPassed)) {
        best = b;
      }
    }
    return best || this.bunnies[0] || null;
  }

  update() {
    // Le panneau Training Lab n'apparaît QUE en mode Debug [H] !
    if (this.panelEl) {
      this.panelEl.style.display = Vehicle.debug ? 'flex' : 'none';
    }

    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].update();
      if (this.fx[i].isDead) this.fx.splice(i, 1);
    }

    if (this.state !== 'RUNNING' || !this.meta || !this.maskPixels) return;

    // Compte à rebours de Race Day
    if (this.mode === 'RACE' && this.raceCountdown > 0) {
      this.raceCountdown--;
      if (this.raceCountdown === 60 || this.raceCountdown === 1) {
        this.game.sound.playSfx('countdown_tick', 0.7);
      }
      return;
    }

    const steps = this.mode === 'TRAINING' ? this.speedMult : 1;
    const cps = this.meta.checkpoints_in_order;
    const t0 = performance.now();

    for (let s = 0; s < steps; s++) {
      // Budget temps par frame (10ms max) pour garantir 60 FPS même en 20x
      if (s > 0 && performance.now() - t0 > 10) break;
      let aliveCount = 0;
      let finishedCount = 0;

      for (const b of this.bunnies) {
        b.step(this.maskPixels, this.maskW, this.maskH, cps, this.hayObstacles);
        if (!b.dead) aliveCount++;
        if (b.finishedLap) {
          finishedCount++;
          const lapSec = b.lapTimeFrames / 60;
          if (this.bestLapSec === null || lapSec < this.bestLapSec) {
            this.bestLapSec = lapSec;
          }
          if (this.mode === 'RACE' && !this.raceStandings.includes(b)) {
            this.raceStandings.push(b);
            b.dead = true; // Stoppe après la ligne d'arrivée
          }
        }
      }

      if (this.mode === 'TRAINING') {
        // Arrêt automatique quand >= 60% des lapins bouclent un tour (slide 54 !)
        if (finishedCount >= Math.ceil(this.bunnies.length * 0.6)) {
          this.recordBestFromGeneration();
          this.state = 'GRADUATED';
          this.game.save.recordGameResult('derby', 3, 15);
          this.game.sound.playSfx('success_bell', 0.9);
          for (let i = 0; i < 24; i++) {
            this.fx.push(new SparkleFX(240, 120, 'confetti'));
          }
          break;
        }

        // Passage à la génération suivante quand tous les lapins sont éliminés
        if (aliveCount === 0) {
          this.recordBestFromGeneration();
          const [sx, sy] = this.meta.start;
          const heading = this.meta.start_heading_rad;
          this.savedBunnies = this.bunnies;
          this.bunnies = GeneticAlgorithm.nextGeneration(
            this.savedBunnies,
            this.config.popSize,
            this.config.mutationRate,
            (brain, idx) => new DerbyBunny(sx, sy, heading, this.config, this.game.assets, brain, idx)
          );
          this.savedBunnies = [];
          this.generation++;
        }
      } else if (this.mode === 'RACE') {
        if (this.raceStandings.length >= 3 || aliveCount === 0) {
          // Compléter le classement par checkpoints franchis
          const rest = this.bunnies
            .filter((b) => !this.raceStandings.includes(b))
            .sort((a, b) => b.checkpointsPassed - a.checkpointsPassed);
          this.raceStandings = this.raceStandings.concat(rest);
          this.state = 'RACE_FINISH';

          // Calcul des gains du pari !
          const chosen = this.bunnies[this.betBunnyIdx];
          const rank = chosen ? this.raceStandings.indexOf(chosen) : -1;
          let reward = 5; // Participation de base
          if (this.betAmount > 0) {
            if (rank === 0) {
              reward = this.betAmount * 3;
              this.betResultMsg = chosen.name + ' WON 1st! +' + reward + ' Tickets (3x)!';
            } else if (rank === 1 || rank === 2) {
              reward = Math.ceil(this.betAmount * 1.5);
              this.betResultMsg = chosen.name + ' placed #' + (rank + 1) + '! +' + reward + ' Tickets (1.5x)!';
            } else {
              reward = 4;
              this.betResultMsg = (chosen ? chosen.name : 'Your bunny') + ' finished #' + (rank + 1) + '. (+4 consolation)';
            }
          } else {
            reward = 8;
            this.betResultMsg = 'Free watch! +8 Tickets earned!';
          }
          this.betWonTickets = reward;
          const stars = rank === 0 ? 3 : (rank >= 1 && rank <= 2 ? 2 : 1);
          this.game.save.recordGameResult('derby', stars, reward);
          this.game.sound.playSfx('success_bell', 0.9);
          for (let i = 0; i < 26; i++) {
            this.fx.push(new SparkleFX(240, 110, 'confetti'));
          }
          break;
        }
      }
    }

    if (frameCount % 8 === 0) {
      this.updatePanelStats();
    }
  }

  recordBestFromGeneration() {
    let top = null;
    for (const b of this.bunnies) {
      b.computeFitness();
      if (!top || b.rawFitness > top.rawFitness) top = b;
    }
    if (top && top.rawFitness > this.bestFitnessEver) {
      this.bestFitnessEver = top.rawFitness;
      if (top.brain) {
        if (this.bestBrainEver) this.bestBrainEver.dispose();
        this.bestBrainEver = top.brain.copy();
      }
    }
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;

    // 1. Piste de course (640x360 mappé proprement sur 480x272)
    if (this.trackImg) {
      g.image(this.trackImg, 0, 0, 480, 272);
    } else {
      g.background(148, 188, 126);
    }

    const scaleX = 480 / this.maskW;
    const scaleY = 272 / this.maskH;

    // Ondes animées dans la mare centrale du circuit
    if (this.pond) {
      const px = Math.round(this.pond.x * scaleX);
      const py = Math.round(this.pond.y * scaleY);
      const rip = (frameCount * 0.25) % 24;
      g.noFill();
      g.stroke(235, 250, 255, map(rip, 0, 24, 170, 0));
      g.strokeWeight(1);
      g.ellipse(px, py, rip * 1.4, rip * 0.8);
    }

    // Guirlandes festives animées le long du haut de la piste
    for (let gx = 4; gx < 476; gx += 16) {
      const sp = assets.getSprite((gx / 16) % 2 === 0 ? 'bunting_a' : 'bunting_b');
      if (sp) g.image(sp, gx, 18 + Math.round(Math.sin(frameCount * 0.05 + gx * 0.05) * 0.6));
    }

    // Lapins spectateurs qui sautillent et encouragent les coureurs !
    for (const spc of this.spectators) {
      const sx = Math.round(spc.x * scaleX);
      const sy = Math.round(spc.y * scaleY);
      const hop = Math.abs(Math.sin(frameCount * 0.14 + spc.phase)) * -3;
      const frameCol = Math.floor(frameCount / 10 + spc.phase) % 4;
      const img = assets.getSheetFrame('sprites/bunny/bunny_' + spc.colour + '.png', 32, 32, frameCol, 0);
      g.push();
      g.translate(sx, Math.round(sy + hop));
      if (spc.facingLeft) g.scale(-1, 1);
      if (img) g.image(img, -16, -27);
      g.pop();
    }

    // Drapeau de départ/arrivée
    if (this.meta) {
      const flag = assets.getImage('generated/derby/finish_flag.png');
      const [sx, sy] = this.meta.start;
      if (flag) {
        const wave = Math.round(Math.sin(frameCount * 0.12) * 0.7);
        g.image(flag, Math.round(sx * scaleX) - 6 + wave, Math.round(sy * scaleY) - 18);
      }
    }

    // Bottes de foin placées au clic (évitement avoid)
    const hayImg = assets.getImage('generated/derby/hay_bale.png');
    for (const obs of this.hayObstacles) {
      const hx = Math.round(obs.pos.x * scaleX);
      const hy = Math.round(obs.pos.y * scaleY);
      if (hayImg) g.image(hayImg, hx - Math.floor(hayImg.width / 2), hy - Math.floor(hayImg.height / 2));
      if (Vehicle.debug) {
        g.noFill();
        g.stroke(255, 90, 90);
        g.circle(hx, hy, obs.r * 2 * scaleX);
      }
    }

    // 2. Lapins coureurs + rayons capteurs du leader + petite poussière derrière le leader
    const leader = this.getLeaderBunny();
    if (leader && !leader.dead && this.state === 'RUNNING' && frameCount % 7 === 0) {
      this.fx.push(new SparkleFX(leader.pos.x * scaleX, leader.pos.y * scaleY + 2, 'sparkle'));
    }
    for (const b of this.bunnies) {
      b.show(g, scaleX, scaleY, b === leader, (this.showRays || Vehicle.debug) && b === leader);
    }

    // Ballons colorés qui flottent autour du circuit + tribune de spectateurs animés + pollen doré
    // Mini tribune festive de spectateurs en haut à droite (hors piste)
    g.push();
    g.noStroke();
    g.fill(107, 75, 91);
    g.rect(314, 4, 156, 17, 2);
    g.fill(186, 138, 102);
    g.rect(315, 5, 154, 15, 1);
    g.fill(236, 212, 172);
    g.rect(316, 13, 152, 6);
    const fanCols = [
      [246, 152, 174], [252, 224, 134], [158, 212, 236],
      [212, 176, 232], [176, 226, 158], [250, 188, 138]
    ];
    for (let i = 0; i < 12; i++) {
      const fx = 322 + i * 12;
      const cheer = Math.floor((frameCount + i * 9) / 14) % 2 === 0 ? -1 : 0;
      const c = fanCols[i % fanCols.length];
      g.fill(c[0], c[1], c[2]);
      g.rect(fx, 8 + cheer, 6, 6, 1);
      g.fill(107, 75, 91);
      g.rect(fx + 1, 10 + cheer, 1, 1);
      g.rect(fx + 4, 10 + cheer, 1, 1);
      // Petit drapeau agité par un spectateur sur 3
      if (i % 3 === 0) {
        g.fill(255, 246, 182);
        g.rect(fx + 6, 6 + cheer, 3, 2);
      }
    }
    g.pop();

    for (const bl of this.balloons) {
      const bsp = assets.getSprite(bl.sprite);
      if (bsp) {
        const bx = Math.round(bl.x * scaleX);
        const by = Math.round(bl.y * scaleY + Math.sin(frameCount * 0.06 + bl.phase) * 2);
        g.image(bsp, bx - Math.floor(bsp.width / 2), by - Math.floor(bsp.height / 2));
      }
    }
    g.noStroke();
    for (const p of this.pollen) {
      p.x = (p.x + p.vx + 480) % 480;
      p.y = 22 + ((p.y - 22 + p.vy + 244) % 244);
      const a = 90 + Math.sin(frameCount * 0.08 + p.phase) * 80;
      g.fill(255, 246, 185, a);
      g.rect(Math.round(p.x), Math.round(p.y), 2, 2);
    }

    // 3. Mini visualisation du réseau de neurones du leader (en bas à gauche)
    if (leader && this.mode === 'TRAINING' && this.state === 'RUNNING') {
      this.drawMiniBrain(g, leader);
    }

    // 4. Classement en direct en mode Race Day + repère sur le lapin parié
    if (this.mode === 'RACE' && this.state === 'RUNNING') {
      const chosen = this.bunnies[this.betBunnyIdx];
      if (chosen && !chosen.dead) {
        const cx = Math.round(chosen.pos.x * scaleX);
        const cy = Math.round(chosen.pos.y * scaleY) - 22;
        PixelUI.txt(g, font, 'YOUR BET', cx, cy, g.color(255, 240, 130), CENTER, 7);
      }

      const sorted = [...this.bunnies].sort((a, b) => b.checkpointsPassed - a.checkpointsPassed);
      PixelUI.panel(g, 8, 28, 112, 56);
      PixelUI.txt(g, font, 'LEADERBOARD', 14, 31, g.color(189, 117, 126), LEFT, 8.5);
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        const isBet = sorted[i] === chosen;
        const lbl = (i + 1) + '. ' + sorted[i].name + (isBet ? ' *' : '');
        PixelUI.txt(
          g, font, lbl, 14, 44 + i * 12,
          isBet ? g.color(70, 130, 78) : g.color(107, 75, 91),
          LEFT, 8.5, 98
        );
      }
      if (this.raceCountdown > 0) {
        const num = Math.ceil(this.raceCountdown / 40);
        PixelUI.drawTag(g, font, 'RACE IN ' + num + '...', 240, 140, g.color(247, 235, 170));
      }
    }

    // 5. Effets confettis
    for (const fx of this.fx) fx.show(g, assets);

    // 6. Barre HUD en haut
    const alive = this.bunnies.filter((b) => !b.dead).length;
    PixelUI.panel(g, 8, 5, 290, 16);
    const chosenName = this.bunnies[this.betBunnyIdx] ? this.bunnies[this.betBunnyIdx].name : '';
    const hudText = this.mode === 'TRAINING'
      ? 'GEN ' + this.generation + ' | ALIVE ' + alive + '/' + this.bunnies.length + ' | ' + this.speedMult + 'x'
      : 'RACE DAY | Bet: ' + chosenName + ' (' + this.betAmount + 'T) | Click track: hay!';
    PixelUI.txt(g, font, hudText, 14, 8, g.color(107, 75, 91), LEFT, 8.5, 278);

    // Overlays
    if (this.state === 'INTRO') this.drawIntroCard(g);
    else if (this.state === 'BETTING') this.drawBettingCard(g);
    else if (this.state === 'PAUSED') this.drawPauseMenu(g);
    else if (this.state === 'GRADUATED' || this.state === 'RACE_FINISH') this.drawFinishCard(g);
  }

  /** Petit schéma temps réel des entrées (rayons) -> couche cachée -> sorties du leader. */
  drawMiniBrain(g, bunny) {
    PixelUI.panel(g, 8, 206, 86, 58, g.color(247, 235, 170));
    const inCount = Math.min(6, bunny.lastInputs.length || 5);
    const hidCount = Math.min(6, this.config.hiddenNodes);
    const outCount = 2;

    const xIn = 20;
    const xHid = 50;
    const xOut = 80;

    g.strokeWeight(1);
    for (let i = 0; i < inCount; i++) {
      const y1 = 214 + (i * 42) / Math.max(1, inCount - 1);
      for (let j = 0; j < hidCount; j++) {
        const y2 = 214 + (j * 42) / Math.max(1, hidCount - 1);
        g.stroke(182, 137, 98, 90);
        g.line(xIn, y1, xHid, y2);
      }
    }
    for (let j = 0; j < hidCount; j++) {
      const y2 = 214 + (j * 42) / Math.max(1, hidCount - 1);
      for (let k = 0; k < outCount; k++) {
        const y3 = 224 + k * 22;
        g.stroke(182, 137, 98, 110);
        g.line(xHid, y2, xOut, y3);
      }
    }

    g.noStroke();
    for (let i = 0; i < inCount; i++) {
      const val = bunny.lastInputs[i] || 0;
      g.fill(220 - 110 * val, 90 + 105 * val, 100 + 10 * val);
      g.circle(xIn, 214 + (i * 42) / Math.max(1, inCount - 1), 4);
    }
    g.fill(107, 75, 91);
    for (let j = 0; j < hidCount; j++) {
      g.circle(xHid, 214 + (j * 42) / Math.max(1, hidCount - 1), 4);
    }
    for (let k = 0; k < outCount; k++) {
      const ov = bunny.lastOutputs[k] || 0.5;
      g.fill(120 + 125 * ov, 160 + 40 * ov, 220 - 140 * ov);
      g.circle(xOut, 224 + k * 22, 5);
    }
  }

  /** Panneau HTML latéral discret regroupant tous les curseurs exigés par le cours. */
  createSidePanel() {
    if (this.panelEl) this.panelEl.remove();
    const el = document.createElement('div');
    el.id = 'derby-panel';
    el.innerHTML = `
      <div class="dp-title">DERBY DEBUG LAB [H]</div>
      <div class="dp-tabs">
        <button id="dp-tab-race" class="dp-btn dp-active">Race Day</button>
        <button id="dp-tab-train" class="dp-btn">Training</button>
      </div>
      <label>Track:
        <select id="dp-track">
          <option value="clover" selected>Clover S-Curve (Hard)</option>
          <option value="twister">Twister Pro (Expert)</option>
          <option value="classic">Meadow Classic (Easy)</option>
        </select>
      </label>
      <div class="dp-stats" id="dp-stats">Gen 1 | Best: 0</div>
      <label>Rays: <span id="dp-v-rays">${this.config.rayCount}</span>
        <input id="dp-rays" type="range" min="3" max="11" step="2" value="${this.config.rayCount}">
      </label>
      <label>Ray Len: <span id="dp-v-len">${this.config.rayLength}</span>
        <input id="dp-len" type="range" min="35" max="140" step="5" value="${this.config.rayLength}">
      </label>
      <label>Pop Size: <span id="dp-v-pop">${this.config.popSize}</span>
        <input id="dp-pop" type="range" min="8" max="45" step="2" value="${this.config.popSize}">
      </label>
      <label>Layers: <span id="dp-v-lay">${this.config.hiddenLayers}</span>
        <input id="dp-lay" type="range" min="1" max="3" step="1" value="${this.config.hiddenLayers}">
      </label>
      <label>Neurons: <span id="dp-v-neu">${this.config.hiddenNodes}</span>
        <input id="dp-neu" type="range" min="4" max="20" step="2" value="${this.config.hiddenNodes}">
      </label>
      <label>Mutation: <span id="dp-v-mut">${this.config.mutationRate}</span>
        <input id="dp-mut" type="range" min="0.02" max="0.4" step="0.02" value="${this.config.mutationRate}">
      </label>
      <label>Activation:
        <select id="dp-act">
          <option value="sigmoid">sigmoid</option>
          <option value="relu">relu</option>
        </select>
      </label>
      <div class="dp-row">
        <button id="dp-sp1" class="dp-btn dp-active">1x</button>
        <button id="dp-sp5" class="dp-btn">5x</button>
        <button id="dp-sp20" class="dp-btn">20x</button>
        <button id="dp-rays-tog" class="dp-btn">Rays</button>
      </div>
      <div class="dp-row">
        <button id="dp-restart" class="dp-btn">Restart</button>
        <button id="dp-save" class="dp-btn">Save Brain</button>
      </div>
      <select id="dp-saved-list"><option value="">-- Load Saved Brain --</option></select>
      <button id="dp-back" class="dp-btn dp-back">Back to Fair</button>
    `;
    el.style.display = Vehicle.debug ? 'flex' : 'none';
    document.body.appendChild(el);
    this.panelEl = el;

    const bindSlider = (id, vid, key, restartNeeded = false) => {
      const inp = el.querySelector(id);
      inp.addEventListener('input', () => {
        this.config[key] = Number(inp.value);
        el.querySelector(vid).textContent = inp.value;
        if (restartNeeded && this.mode === 'TRAINING') this.startTraining(true);
      });
    };
    bindSlider('#dp-rays', '#dp-v-rays', 'rayCount', true);
    bindSlider('#dp-len', '#dp-v-len', 'rayLength', false);
    bindSlider('#dp-pop', '#dp-v-pop', 'popSize', true);
    bindSlider('#dp-lay', '#dp-v-lay', 'hiddenLayers', true);
    bindSlider('#dp-neu', '#dp-v-neu', 'hiddenNodes', true);
    bindSlider('#dp-mut', '#dp-v-mut', 'mutationRate', false);

    el.querySelector('#dp-act').addEventListener('change', (e) => {
      this.config.activation = e.target.value;
      if (this.mode === 'TRAINING') this.startTraining(true);
    });
    el.querySelector('#dp-track').addEventListener('change', (e) => {
      this.loadTrack(e.target.value, true);
    });

    el.querySelector('#dp-tab-train').onclick = () => {
      el.querySelector('#dp-tab-train').classList.add('dp-active');
      el.querySelector('#dp-tab-race').classList.remove('dp-active');
      this.startTraining(false);
    };
    el.querySelector('#dp-tab-race').onclick = () => {
      el.querySelector('#dp-tab-race').classList.add('dp-active');
      el.querySelector('#dp-tab-train').classList.remove('dp-active');
      this.startRaceDay();
    };

    const setSp = (n, btnId) => {
      this.speedMult = n;
      ['#dp-sp1', '#dp-sp5', '#dp-sp20'].forEach((id) => el.querySelector(id).classList.remove('dp-active'));
      el.querySelector(btnId).classList.add('dp-active');
    };
    el.querySelector('#dp-sp1').onclick = () => setSp(1, '#dp-sp1');
    el.querySelector('#dp-sp5').onclick = () => setSp(5, '#dp-sp5');
    el.querySelector('#dp-sp20').onclick = () => setSp(20, '#dp-sp20');
    el.querySelector('#dp-rays-tog').onclick = () => { this.showRays = !this.showRays; };
    el.querySelector('#dp-restart').onclick = () => {
      if (this.mode === 'TRAINING') this.startTraining(true);
      else this.startRaceDay();
    };
    el.querySelector('#dp-save').onclick = () => this.saveBestBrain();
    el.querySelector('#dp-saved-list').onchange = (e) => {
      if (e.target.value !== '') this.loadSavedBrain(Number(e.target.value));
    };
    el.querySelector('#dp-back').onclick = () => this.backToHub();
    this.refreshSavedDropdown();
  }

  refreshSavedDropdown() {
    if (!this.panelEl) return;
    const sel = this.panelEl.querySelector('#dp-saved-list');
    const list = this.game.save.data.savedBrains || [];
    sel.innerHTML = '<option value="">-- Saved Brains (' + list.length + ') --</option>';
    list.forEach((b, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
  }

  updatePanelStats() {
    if (!this.panelEl) return;
    const el = this.panelEl.querySelector('#dp-stats');
    if (!el) return;
    const lapTxt = this.bestLapSec ? this.bestLapSec.toFixed(1) + 's' : '--';
    el.textContent = 'Gen ' + this.generation + ' | Fit ' + Math.round(this.bestFitnessEver) + ' | Lap ' + lapTxt;
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    this.startBtn = { x: 170, y: 204, w: 140, h: 24 };
    PixelUI.drawRulesCard(g, font, {
      title: 'BUNNY DERBY — RACE DAY!',
      headerCol: g.color(189, 117, 126),
      rules: [
        'Pick your favorite bunny and bet your funfair tickets!',
        '1st place pays 3x your bet  |  2nd & 3rd place pay 1.5x!',
        'Click anywhere on the track during the race to drop hay bales.',
        'Bunnies steer & avoid hay using Craig Reynolds AI!'
      ],
      controls: 'Click to Bet & Drop Hay  |  [H] Debug AI Training Lab  |  [M] Menu',
      btnRect: this.startBtn,
      btnLabel: 'PLACE BET! (Space)',
      mx,
      my
    });
  }

  /** Géométrie des boutons du panneau de pari Race Day. */
  getBetLayout() {
    const bunnyCards = [];
    for (let i = 0; i < 8; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      bunnyCards.push({
        idx: i,
        x: 56 + col * 93,
        y: 66 + row * 44,
        w: 88,
        h: 39
      });
    }
    const amounts = [0, 5, 10, 25, 50];
    const betBtns = amounts.map((amt, i) => ({
      amt,
      label: amt === 0 ? 'FREE' : amt + ' T',
      x: 56 + i * 74,
      y: 168,
      w: 68,
      h: 20
    }));
    const goBtn = { x: 165, y: 202, w: 150, h: 24 };
    return { bunnyCards, betBtns, goBtn };
  }

  drawBettingCard(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    const tickets = this.game.save.data.tickets || 0;
    const L = this.getBetLayout();

    g.noStroke();
    g.fill(26, 20, 32, 135);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 42, 26, 396, 212, g.color(250, 242, 212));
    g.fill(189, 117, 126);
    g.rect(44, 28, 392, 22, 1);
    PixelUI.txt(g, font, 'PLACE YOUR RACE BET!  (Tickets: ' + tickets + ')', 240, 33, g.color(255, 252, 238), CENTER, 9.5, 380);

    PixelUI.txt(g, font, '1. Choose your bunny champion (1st = 3x | Top 3 = 1.5x):', 56, 53, g.color(107, 75, 91), LEFT, 8, 370);

    for (const c of L.bunnyCards) {
      const b = this.bunnies[c.idx];
      const sel = this.betBunnyIdx === c.idx;
      const hov = PixelUI.pointInRect(mx, my, c);
      const bg = sel ? g.color(223, 240, 187) : (hov ? g.color(255, 246, 206) : g.color(238, 220, 182));
      PixelUI.panel(g, c.x, c.y, c.w, c.h, bg);

      const colName = b ? b.colour : DerbyBunny.COLOURS[c.idx];
      const sp = assets.getSheetFrame('sprites/bunny/bunny_' + colName + '.png', 32, 32, 0, 0);
      if (sp) g.image(sp, c.x + 2, c.y + 4);
      const bName = b ? b.name : DerbyBunny.NAMES[c.idx];
      PixelUI.txt(g, font, bName, c.x + 34, c.y + 10, sel ? g.color(62, 108, 70) : g.color(107, 75, 91), LEFT, 8, 52);
      if (sel) {
        PixelUI.txt(g, font, 'PICKED', c.x + 34, c.y + 23, g.color(70, 130, 78), LEFT, 7);
      }
    }

    PixelUI.txt(g, font, '2. Choose bet amount:', 56, 154, g.color(107, 75, 91), LEFT, 8);
    for (const bb of L.betBtns) {
      const canAfford = tickets >= bb.amt;
      const sel = this.betAmount === bb.amt;
      const hov = PixelUI.pointInRect(mx, my, bb);
      const bg = !canAfford
        ? g.color(216, 206, 196)
        : (sel ? g.color(223, 240, 187) : (hov ? g.color(255, 246, 206) : g.color(232, 207, 166)));
      PixelUI.panel(g, bb.x, bb.y, bb.w, bb.h, bg);
      PixelUI.txt(
        g, font, bb.label, bb.x + bb.w / 2, bb.y + 5,
        !canAfford ? g.color(150, 138, 134) : (sel ? g.color(62, 108, 70) : g.color(107, 75, 91)),
        CENTER, 8.5, bb.w - 6
      );
    }

    PixelUI.drawButton(
      g, font, L.goBtn,
      'START RACE! (Space)',
      PixelUI.pointInRect(mx, my, L.goBtn),
      g.color(223, 240, 187)
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

  drawFinishCard(g) {
    const font = this.game.assets.font;
    g.noStroke();
    g.fill(0, 0, 0, 110);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 76, 52, 328, 168);
    g.fill(189, 117, 126);
    g.rect(78, 54, 324, 22);
    const title = this.state === 'GRADUATED' ? 'THE BUNNIES GRADUATED!' : 'RACE DAY PODIUM!';
    PixelUI.txt(g, font, title, 240, 59, g.color(243, 244, 231), CENTER, 10, 310);

    if (this.state === 'RACE_FINISH' && this.raceStandings.length > 0) {
      const chosen = this.bunnies[this.betBunnyIdx];
      for (let i = 0; i < Math.min(3, this.raceStandings.length); i++) {
        const b = this.raceStandings[i];
        const mark = b === chosen ? ' (YOUR BET!)' : '';
        PixelUI.txt(
          g, font, '#' + (i + 1) + '  ' + b.name + mark, 240, 86 + i * 18,
          b === chosen ? g.color(62, 118, 70) : g.color(107, 75, 91),
          CENTER, 9.5, 300
        );
      }
      if (this.betResultMsg) {
        PixelUI.drawTag(g, font, this.betResultMsg, 240, 166, g.color(223, 240, 187));
      }
    } else {
      PixelUI.txt(g, font, '60%+ bunnies completed a full lap!', 240, 102, g.color(107, 75, 91), CENTER, 9.5, 300);
      PixelUI.txt(g, font, 'Click Save Brain or switch to Race Day!', 240, 126, g.color(144, 98, 93), CENTER, 9, 300);
    }

    PixelUI.txt(g, font, 'Press Space to race again  |  M for Menu', 240, 194, g.color(144, 98, 93), CENTER, 8.5, 310);
  }

  backToHub() {
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo('hub', { fromBooth: 'derby' });
  }

  mousePressed(mx, my) {
    if (this.state === 'INTRO') {
      if (PixelUI.pointInRect(mx, my, this.startBtn)) {
        this.seenIntro = true;
        this.state = this.mode === 'RACE' ? 'BETTING' : 'RUNNING';
        this.game.sound.playSfx('ui_click', 0.8);
      }
      return;
    }
    if (this.state === 'BETTING') {
      const L = this.getBetLayout();
      const tickets = this.game.save.data.tickets || 0;
      for (const c of L.bunnyCards) {
        if (PixelUI.pointInRect(mx, my, c)) {
          this.betBunnyIdx = c.idx;
          this.game.sound.playSfx('ui_click', 0.6);
          return;
        }
      }
      for (const bb of L.betBtns) {
        if (PixelUI.pointInRect(mx, my, bb) && tickets >= bb.amt) {
          this.betAmount = bb.amt;
          this.game.sound.playSfx('ui_click', 0.6);
          return;
        }
      }
      if (PixelUI.pointInRect(mx, my, L.goBtn)) {
        this.startRaceDay(true);
        return;
      }
      return;
    }
    if (this.state === 'PAUSED') {
      if (PixelUI.pointInRect(mx, my, this.resumeBtn)) this.state = 'RUNNING';
      else if (PixelUI.pointInRect(mx, my, this.restartBtn)) {
        if (this.mode === 'RACE') this.startRaceDay(false);
        else this.startTraining(true);
      } else if (PixelUI.pointInRect(mx, my, this.exitBtn)) this.backToHub();
      return;
    }
    // En Race Day, cliquer sur la piste place une botte de foin (évitée par avoid()!)
    if (this.mode === 'RACE' && this.state === 'RUNNING') {
      const tx = (mx / 480) * this.maskW;
      const ty = (my / 272) * this.maskH;
      if (this.hayObstacles.length >= 6) this.hayObstacles.shift();
      this.hayObstacles.push(new Obstacle(tx, ty, 12, 'hay'));
      this.game.sound.playSfx('ui_click', 0.6);
    }
  }

  keyPressed(k, kc) {
    if (this.state === 'INTRO') {
      if (k === ' ' || kc === ENTER) {
        this.seenIntro = true;
        this.state = this.mode === 'RACE' ? 'BETTING' : 'RUNNING';
      } else if (kc === ESCAPE) {
        this.backToHub();
      }
      return;
    }
    if (this.state === 'BETTING') {
      if (k === ' ' || kc === ENTER) {
        this.startRaceDay(true);
      }
      return;
    }
    if (kc === ESCAPE) {
      if (this.state === 'RUNNING') this.state = 'PAUSED';
      else if (this.state === 'PAUSED') this.state = 'RUNNING';
      else this.backToHub();
      return;
    }
    if ((this.state === 'GRADUATED' || this.state === 'RACE_FINISH') && (k === ' ' || kc === ENTER)) {
      if (this.mode === 'RACE') this.startRaceDay(false);
      else this.startTraining(false);
    }
  }
}
