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
    this.trainScenario = 'evolve'; // 'evolve' | 'observe' | 'broom' (inspiré de 9-VoitureSuitCircuit)
    this.trainPaused = false;
    this.stepOnce = false;
    this.generation = 1;
    this.bestFitnessEver = 0;
    this.bestLapSec = null;
    this.bestBrainEver = null;
    this.fitnessHistory = [];

    this.bunnies = [];
    this.savedBunnies = [];
    this.broomBunny = null;
    this.hayObstacles = [];
    this.fx = [];
    this.raceCountdown = 0;
    this.raceStandings = [];
    this.panelEl = null;
    this.inspectorEl = null;
    this.inspectorSel = null;
    this._wasPausedBeforeInspect = false;

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
      this.trackImg = this.game.assets.getImage('minigames/derby/track_01.png');
      const maskImg = this.game.assets.getImage('minigames/derby/track_01_mask.png');
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
    this.closeBrainInspector();
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
    if (this.broomBunny) {
      this.broomBunny.dispose();
      this.broomBunny = null;
    }
    this.bunnies = [];
    this.savedBunnies = [];
  }

  /** Crée la voiture-balai (lapin doré lièvre) pour le scénario 'broom'. */
  spawnBroomBunny() {
    if (this.broomBunny) {
      this.broomBunny.dispose();
      this.broomBunny = null;
    }
    if (this.trainScenario !== 'broom' || !this.meta) return;
    const [sx, sy] = this.meta.start;
    const heading = this.meta.start_heading_rad;
    const broomCfg = { ...this.config, useRuleFallback: true };
    const broom = new DerbyBunny(sx, sy, heading, broomCfg, this.game.assets, null, 2, 'Broom');
    broom.maxSpeed = 1.68;
    broom.isBroom = true;
    this.broomBunny = broom;
  }

  startTraining(resetStats = false) {
    this.mode = 'TRAINING';
    this.disposePopulation();
    this.hayObstacles = [];
    this.trainPaused = false;
    this.stepOnce = false;
    if (resetStats) {
      this.generation = 1;
      this.bestFitnessEver = 0;
      this.bestLapSec = null;
      this.fitnessHistory = [];
    }

    const [sx, sy] = this.meta.start;
    const heading = this.meta.start_heading_rad;
    for (let i = 0; i < this.config.popSize; i++) {
      let brain = null;
      if (this.trainScenario === 'observe' && this.bestBrainEver) {
        brain = this.bestBrainEver.copy();
      }
      this.bunnies.push(new DerbyBunny(sx, sy, heading, this.config, this.game.assets, brain, i));
    }
    this.spawnBroomBunny();
    this.state = 'RUNNING';
    this.syncPauseButton();
    this.updatePanelStats();
    this.updateSparkline();
  }

  /** Passe à la génération suivante (GA) ou relance les cerveaux figés en mode Observe. */
  evolveGeneration() {
    if (!this.meta || this.bunnies.length === 0) return;
    const [sx, sy] = this.meta.start;
    const heading = this.meta.start_heading_rad;

    if (this.trainScenario === 'observe') {
      const clonedBrains = this.bunnies.map((b) => (b.brain ? b.brain.copy() : null));
      this.disposePopulation();
      for (let i = 0; i < clonedBrains.length; i++) {
        this.bunnies.push(new DerbyBunny(sx, sy, heading, this.config, this.game.assets, clonedBrains[i], i));
      }
      this.spawnBroomBunny();
      this.updatePanelStats();
      return;
    }

    const genBest = this.recordBestFromGeneration();
    this.fitnessHistory.push(genBest);
    if (this.fitnessHistory.length > 60) this.fitnessHistory.shift();

    this.savedBunnies = this.bunnies;
    this.bunnies = GeneticAlgorithm.nextGeneration(
      this.savedBunnies,
      this.config.popSize,
      this.config.mutationRate,
      (brain, idx) => new DerbyBunny(sx, sy, heading, this.config, this.game.assets, brain, idx)
    );
    this.savedBunnies = [];
    this.generation++;
    this.spawnBroomBunny();
    this.updatePanelStats();
    this.updateSparkline();
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
    // Le panneau Training Lab s'affiche en mode TRAINING ou en mode Debug [H]
    if (this.panelEl) {
      this.panelEl.style.display = (this.mode === 'TRAINING' || Vehicle.debug) ? 'flex' : 'none';
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

    // Pause & pas-à-pas ("Un pas") en mode TRAINING (comme 9-VoitureSuitCircuit)
    if (this.mode === 'TRAINING' && this.trainPaused && !this.stepOnce) {
      return;
    }

    const steps = this.mode === 'TRAINING'
      ? (this.stepOnce ? 1 : this.speedMult)
      : 1;
    this.stepOnce = false;
    const cps = this.meta.checkpoints_in_order;
    const t0 = performance.now();

    for (let s = 0; s < steps; s++) {
      // Budget temps par frame (10ms max) pour garantir 60 FPS même en 20x
      if (s > 0 && performance.now() - t0 > 10) break;
      let aliveCount = 0;
      let finishedCount = 0;

      // Scénario Voiture-Balai ('broom') : fait avancer le lièvre doré
      if (this.mode === 'TRAINING' && this.trainScenario === 'broom' && this.broomBunny && !this.broomBunny.dead) {
        this.broomBunny.step(this.maskPixels, this.maskW, this.maskH, cps, []);
      }

      for (const b of this.bunnies) {
        b.step(this.maskPixels, this.maskW, this.maskH, cps, this.hayObstacles);
        // Élimination par la Voiture-Balai si le lapin a > 4 checkpoints de retard
        if (
          this.mode === 'TRAINING' &&
          this.trainScenario === 'broom' &&
          this.broomBunny &&
          !b.dead &&
          !b.finishedLap &&
          this.broomBunny.checkpointsPassed >= 4 &&
          this.broomBunny.checkpointsPassed - b.checkpointsPassed > 4
        ) {
          b.dead = true;
        }
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
        // Arrêt automatique quand >= 60% des lapins bouclent un tour (sauf en mode Observe)
        if (this.trainScenario !== 'observe' && finishedCount >= Math.ceil(this.bunnies.length * 0.6)) {
          const genBest = this.recordBestFromGeneration();
          this.fitnessHistory.push(genBest);
          this.updateSparkline();
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
          this.evolveGeneration();
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
    const genBest = top ? top.rawFitness : 0;
    if (top && top.rawFitness > this.bestFitnessEver) {
      this.bestFitnessEver = top.rawFitness;
      if (top.brain) {
        if (this.bestBrainEver) this.bestBrainEver.dispose();
        this.bestBrainEver = top.brain.copy();
      }
    }
    return genBest;
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
      const img = assets.getSheetFrame('characters/animals/bunnies/bunny_' + spc.colour + '.png', 32, 32, frameCol, 0);
      g.push();
      g.translate(sx, Math.round(sy + hop));
      if (spc.facingLeft) g.scale(-1, 1);
      if (img) g.image(img, -16, -27);
      g.pop();
    }

    // Drapeau de départ/arrivée
    if (this.meta) {
      const flag = assets.getImage('minigames/derby/finish_flag.png');
      const [sx, sy] = this.meta.start;
      if (flag) {
        const wave = Math.round(Math.sin(frameCount * 0.12) * 0.7);
        g.image(flag, Math.round(sx * scaleX) - 6 + wave, Math.round(sy * scaleY) - 18);
      }
    }

    // Bottes de foin placées au clic (évitement avoid)
    const hayImg = assets.getImage('minigames/derby/hay_bale.png');
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

    // 2. Lapins coureurs (les rayons capteurs NE s'affichent QU'en mode TRAINING, jamais en Race Day !)
    const leader = this.getLeaderBunny();
    if (leader && !leader.dead && this.state === 'RUNNING' && frameCount % 7 === 0) {
      this.fx.push(new SparkleFX(leader.pos.x * scaleX, leader.pos.y * scaleY + 2, 'sparkle'));
    }
    const drawRaysNow = this.mode === 'TRAINING' && (this.showRays || Vehicle.debug);
    for (const b of this.bunnies) {
      b.show(g, scaleX, scaleY, b === leader, drawRaysNow && b === leader);
    }

    // Voiture-Balai (lièvre doré) dans le scénario 'broom'
    if (this.mode === 'TRAINING' && this.trainScenario === 'broom' && this.broomBunny && !this.broomBunny.dead) {
      const bx = Math.round(this.broomBunny.pos.x * scaleX);
      const by = Math.round(this.broomBunny.pos.y * scaleY);
      g.push();
      g.noFill();
      g.stroke(255, 200, 60, 220);
      g.strokeWeight(1.5);
      g.circle(bx, by, 16);
      g.pop();
      this.broomBunny.show(g, scaleX, scaleY, false, false);
      PixelUI.txt(g, font, 'BROOM', bx, by - 22, g.color(255, 225, 110), CENTER, 6.5);
    }

    // Ballons colorés qui flottent autour du circuit + pollen doré
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

    // 3. Mini visualisation du réseau de neurones du leader (uniquement en TRAINING)
    if (leader && this.mode === 'TRAINING' && this.state === 'RUNNING') {
      this.drawMiniBrain(g, leader);
    }

    // 4. Repère discret sur le lapin parié + compte à rebours (zéro panneau par-dessus la piste !)
    if (this.mode === 'RACE' && this.state === 'RUNNING') {
      const chosen = this.bunnies[this.betBunnyIdx];
      if (chosen && !chosen.dead) {
        const cx = Math.round(chosen.pos.x * scaleX);
        const cy = Math.round(chosen.pos.y * scaleY) - 22;
        PixelUI.txt(g, font, 'YOUR BET', cx, cy, g.color(255, 240, 130), CENTER, 7);
      }
      if (this.raceCountdown > 0) {
        const num = Math.ceil(this.raceCountdown / 40);
        PixelUI.drawTag(g, font, 'RACE IN ' + num + '...', 240, 140, g.color(247, 235, 170));
      }
    }

    // 5. Effets confettis + éclairage coucher de soleil cohérent avec le choix du joueur
    for (const fx of this.fx) fx.show(g, assets);
    if (typeof SkyBackdrop !== 'undefined') {
      const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
      SkyBackdrop.drawMoodGlaze(g, skyMood, 480, 272);
    }

    // 6. Barre HUD ultra-compacte tout en haut (y=2, h=14 — ne cache JAMAIS la piste !)
    const alive = this.bunnies.filter((b) => !b.dead).length;
    if (this.mode === 'RACE') {
      const chosen = this.bunnies[this.betBunnyIdx];
      const chosenName = chosen ? chosen.name : '';
      PixelUI.panel(g, 6, 2, 224, 14);
      PixelUI.txt(g, font, 'BET: ' + chosenName + ' (' + this.betAmount + 'T) | Click: hay', 12, 4, g.color(107, 75, 91), LEFT, 7.5, 214);

      const sorted = [...this.bunnies].sort((a, b) => b.checkpointsPassed - a.checkpointsPassed);
      const top3 = sorted.slice(0, 3).map((b, i) => (i + 1) + '.' + b.name).join('  ');
      PixelUI.panel(g, 234, 2, 240, 14);
      PixelUI.txt(g, font, top3, 354, 4, g.color(144, 78, 92), CENTER, 7.5, 230);
    } else {
      PixelUI.panel(g, 6, 2, 340, 14);
      const scLbl = this.trainScenario === 'broom' ? 'BROOM' : (this.trainScenario === 'observe' ? 'OBSERVE' : 'GA');
      const spLbl = this.trainPaused ? 'PAUSED' : (this.speedMult + 'x');
      const hudText = 'TRAIN [' + scLbl + '] | GEN ' + this.generation + ' | ALIVE ' + alive + '/' + this.bunnies.length + ' | ' + spLbl;
      PixelUI.txt(g, font, hudText, 12, 4, g.color(107, 75, 91), LEFT, 7.5, 328);
    }

    // Overlays (flushLayer pour que les cartes recouvrent proprement le HUD HD derrière)
    if (this.state === 'INTRO') { PixelUI.flushLayer(g); this.drawIntroCard(g); }
    else if (this.state === 'BETTING') { PixelUI.flushLayer(g); this.drawBettingCard(g); }
    else if (this.state === 'PAUSED') { PixelUI.flushLayer(g); this.drawPauseMenu(g); }
    else if (this.state === 'GRADUATED' || this.state === 'RACE_FINISH') { PixelUI.flushLayer(g); this.drawFinishCard(g); }
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

  /** Panneau HTML latéral regroupant les scénarios, contrôles pas-à-pas, sparkline, Brain Inspector et curseurs. */
  createSidePanel() {
    if (this.panelEl) this.panelEl.remove();
    const el = document.createElement('div');
    el.id = 'derby-panel';
    el.innerHTML = `
      <div class="dp-title">DERBY TRAINING LAB [H]</div>
      <div class="dp-tabs">
        <button id="dp-tab-race" class="dp-btn dp-active">Race Day</button>
        <button id="dp-tab-train" class="dp-btn">Training</button>
      </div>
      <label>Scenario:
        <select id="dp-scenario">
          <option value="evolve" selected>Evolve (Genetic Algo)</option>
          <option value="observe">Observe (Frozen Brains)</option>
          <option value="broom">Broom (Voiture-Balai)</option>
        </select>
      </label>
      <label>Track:
        <select id="dp-track">
          <option value="clover" selected>Clover S-Curve (Hard)</option>
          <option value="twister">Twister Pro (Expert)</option>
          <option value="classic">Meadow Classic (Easy)</option>
        </select>
      </label>
      <div class="dp-stats" id="dp-stats">Gen 1 | Fit 0 | Lap --</div>
      <div class="dp-status-row">
        <span id="dp-pill-run" class="dp-pill">Run 0</span>
        <span id="dp-pill-fin" class="dp-pill ok">Fin 0</span>
        <span id="dp-pill-dead" class="dp-pill dead">Dead 0</span>
      </div>
      <svg id="dp-sparkline" viewBox="0 0 200 36" preserveAspectRatio="none" title="Best Fitness per Generation"></svg>
      <div class="dp-row">
        <button id="dp-pause" class="dp-btn" title="Pause / Resume Training">Pause</button>
        <button id="dp-step" class="dp-btn" title="Advance exactly 1 frame (Un pas)">+1 Step</button>
        <button id="dp-nextgen" class="dp-btn" title="Force Next Generation">Next Gen</button>
      </div>
      <div class="dp-row">
        <button id="dp-sp1" class="dp-btn dp-active">1x</button>
        <button id="dp-sp5" class="dp-btn">5x</button>
        <button id="dp-sp20" class="dp-btn">20x</button>
        <button id="dp-rays-tog" class="dp-btn dp-active">Rays</button>
      </div>
      <button id="dp-inspect" class="dp-btn" style="background:#d6e8fa;">Inspect Brain &#8599;</button>
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
        <button id="dp-restart" class="dp-btn">Restart</button>
        <button id="dp-save" class="dp-btn">Save</button>
      </div>
      <div class="dp-row">
        <button id="dp-export" class="dp-btn">Export JSON</button>
        <button id="dp-import" class="dp-btn">Import JSON</button>
      </div>
      <input id="dp-import-file" type="file" accept=".json,application/json" style="display:none" />
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

    el.querySelector('#dp-scenario').addEventListener('change', (e) => {
      this.trainScenario = e.target.value;
      if (this.mode === 'TRAINING') this.startTraining(false);
    });
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

    el.querySelector('#dp-pause').onclick = () => {
      if (this.mode !== 'TRAINING') return;
      this.trainPaused = !this.trainPaused;
      this.syncPauseButton();
    };
    el.querySelector('#dp-step').onclick = () => {
      if (this.mode !== 'TRAINING') return;
      this.trainPaused = true;
      this.stepOnce = true;
      this.syncPauseButton();
    };
    el.querySelector('#dp-nextgen').onclick = () => {
      if (this.mode !== 'TRAINING') return;
      this.evolveGeneration();
    };
    el.querySelector('#dp-inspect').onclick = () => this.openBrainInspector();

    const setSp = (n, btnId) => {
      this.speedMult = n;
      ['#dp-sp1', '#dp-sp5', '#dp-sp20'].forEach((id) => el.querySelector(id).classList.remove('dp-active'));
      el.querySelector(btnId).classList.add('dp-active');
    };
    el.querySelector('#dp-sp1').onclick = () => setSp(1, '#dp-sp1');
    el.querySelector('#dp-sp5').onclick = () => setSp(5, '#dp-sp5');
    el.querySelector('#dp-sp20').onclick = () => setSp(20, '#dp-sp20');
    el.querySelector('#dp-rays-tog').onclick = () => {
      this.showRays = !this.showRays;
      el.querySelector('#dp-rays-tog').classList.toggle('dp-active', this.showRays);
    };
    el.querySelector('#dp-restart').onclick = () => {
      if (this.mode === 'TRAINING') this.startTraining(true);
      else this.startRaceDay();
    };
    el.querySelector('#dp-save').onclick = () => this.saveBestBrain();
    el.querySelector('#dp-export').onclick = () => this.exportBestBrainJson();
    const fileInp = el.querySelector('#dp-import-file');
    el.querySelector('#dp-import').onclick = () => fileInp.click();
    fileInp.onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) this.importBrainJson(f);
      fileInp.value = '';
    };
    el.querySelector('#dp-saved-list').onchange = (e) => {
      if (e.target.value !== '') this.loadSavedBrain(Number(e.target.value));
    };
    el.querySelector('#dp-back').onclick = () => this.backToHub();
    this.refreshSavedDropdown();
    this.updateSparkline();
  }

  syncPauseButton() {
    if (!this.panelEl) return;
    const btn = this.panelEl.querySelector('#dp-pause');
    if (!btn) return;
    btn.textContent = this.trainPaused ? 'Play' : 'Pause';
    btn.classList.toggle('dp-active', this.trainPaused);
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
    if (el) {
      const lapTxt = this.bestLapSec ? this.bestLapSec.toFixed(1) + 's' : '--';
      el.textContent = 'Gen ' + this.generation + ' | Fit ' + Math.round(this.bestFitnessEver) + ' | Lap ' + lapTxt;
    }
    let run = 0;
    let fin = 0;
    let dead = 0;
    for (const b of this.bunnies) {
      if (b.finishedLap) fin++;
      else if (b.dead) dead++;
      else run++;
    }
    const pRun = this.panelEl.querySelector('#dp-pill-run');
    const pFin = this.panelEl.querySelector('#dp-pill-fin');
    const pDead = this.panelEl.querySelector('#dp-pill-dead');
    if (pRun) pRun.textContent = 'Run ' + run;
    if (pFin) pFin.textContent = 'Fin ' + fin;
    if (pDead) pDead.textContent = 'Dead ' + dead;
  }

  /** Dessine la courbe SVG de progression de la meilleure fitness par génération. */
  updateSparkline() {
    if (!this.panelEl) return;
    const svg = this.panelEl.querySelector('#dp-sparkline');
    if (!svg) return;
    const hist = this.fitnessHistory;
    if (hist.length === 0) {
      svg.innerHTML = '<text x="100" y="21" text-anchor="middle" font-size="9" fill="#9c8078">Fitness history (Gen 1...)</text>';
      return;
    }
    const maxV = Math.max(10, ...hist);
    const n = hist.length;
    const pts = hist.map((v, i) => {
      const x = n === 1 ? 100 : 4 + (i / (n - 1)) * 192;
      const y = 32 - (v / maxV) * 26;
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    const poly = pts.join(' ');
    const area = '4,34 ' + poly + ' ' + (n === 1 ? '100' : '196') + ',34';
    svg.innerHTML =
      '<polygon points="' + area + '" fill="rgba(120,178,118,0.28)" />' +
      '<polyline points="' + poly + '" fill="none" stroke="#4c8c58" stroke-width="2" />' +
      '<text x="196" y="10" text-anchor="end" font-size="8" fill="#6b4b5b">max ' + Math.round(maxV) + '</text>';
  }

  /** Exporte le meilleur cerveau au format JSON téléchargeable. */
  exportBestBrainJson() {
    const leader = this.getLeaderBunny();
    const targetBrain = this.bestBrainEver || (leader && leader.brain);
    if (!targetBrain) return;
    const payload = {
      name: 'MooDerby_G' + this.generation + '_Fit' + Math.round(this.bestFitnessEver),
      config: { ...this.config },
      brainData: targetBrain.serialize(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = payload.name + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.game.sound.playSfx('ui_click');
  }

  /** Importe un cerveau JSON et lance immédiatement la population avec ce cerveau. */
  importBrainJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const brainData = parsed.brainData || parsed;
        if (!brainData || !Array.isArray(brainData.weights)) return;
        if (parsed.config) {
          this.config = { ...this.config, ...parsed.config };
        }
        const loaded = NeuralNetwork.deserialize(brainData);
        if (this.bestBrainEver) this.bestBrainEver.dispose();
        this.bestBrainEver = loaded;

        if (!Array.isArray(this.game.save.data.savedBrains)) this.game.save.data.savedBrains = [];
        this.game.save.data.savedBrains.unshift({
          name: parsed.name || file.name.replace(/\.json$/i, ''),
          config: { ...this.config },
          brainData: loaded.serialize(),
          savedAt: new Date().toISOString()
        });
        if (this.game.save.data.savedBrains.length > 8) this.game.save.data.savedBrains.pop();
        this.game.save.save();
        this.refreshSavedDropdown();

        this.mode = 'TRAINING';
        this.loadSavedBrain(0);
        this.game.sound.playSfx('success_bell', 0.8);
      } catch (err) {
        console.warn('Invalid brain JSON:', err);
      }
    };
    reader.readAsText(file);
  }

  /** Ouvre le Brain Inspector interactif (inspiré de brain-inspector.js du repo Bruno Vasselle). */
  openBrainInspector() {
    const leader = this.getLeaderBunny();
    if (!leader || !leader.brain) return;
    this._wasPausedBeforeInspect = this.trainPaused;
    this.trainPaused = true;
    this.syncPauseButton();

    if (!this.inspectorEl) {
      const modal = document.createElement('div');
      modal.id = 'brain-inspector-modal';
      modal.innerHTML = `
        <div class="bi-card">
          <div class="bi-head">
            <span id="bi-title">BRAIN INSPECTOR — NEURAL NETWORK</span>
            <div style="display:flex;gap:6px;">
              <button id="bi-step-btn" class="hud-pill hud-pill-sm" type="button">+1 Step</button>
              <button id="bi-close-btn" class="hud-pill hud-pill-sm" type="button">Close (Esc)</button>
            </div>
          </div>
          <div class="bi-svg-wrap"><svg id="bi-svg" width="700" height="240"></svg></div>
          <div class="bi-grid">
            <div class="bi-box">
              <h4 id="bi-neuron-title">Click any neuron to inspect z = &Sigma;(a&#x1D62; &times; w&#x1D62;) + b</h4>
              <div id="bi-neuron-detail">Select a hidden or output neuron in the graph above to view exact incoming weights, activations, and bias.</div>
            </div>
            <div class="bi-box">
              <h4>Live Sensors &amp; Steering Outputs</h4>
              <div id="bi-io-detail"></div>
            </div>
          </div>
        </div>
      `;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeBrainInspector();
      });
      modal.querySelector('#bi-close-btn').onclick = () => this.closeBrainInspector();
      modal.querySelector('#bi-step-btn').onclick = () => {
        if (this.mode === 'TRAINING' && this.meta && this.maskPixels) {
          const cps = this.meta.checkpoints_in_order;
          if (this.trainScenario === 'broom' && this.broomBunny && !this.broomBunny.dead) {
            this.broomBunny.step(this.maskPixels, this.maskW, this.maskH, cps, []);
          }
          for (const b of this.bunnies) {
            b.step(this.maskPixels, this.maskW, this.maskH, cps, this.hayObstacles);
          }
          this.updatePanelStats();
          this.renderBrainInspector();
        }
      };
      document.body.appendChild(modal);
      this.inspectorEl = modal;
    }

    this.inspectorSel = { layer: leader.brain._cachedLayers.length, idx: 0 }; // Sélectionne la sortie "Turn" par défaut
    this.inspectorEl.classList.add('open');
    this.renderBrainInspector();
  }

  closeBrainInspector() {
    if (this.inspectorEl) {
      this.inspectorEl.classList.remove('open');
    }
    this.trainPaused = this._wasPausedBeforeInspect;
    this.syncPauseButton();
  }

  /** Dessine le graphe SVG interactif des poids/activations + tables de détail. */
  renderBrainInspector() {
    if (!this.inspectorEl || !this.inspectorEl.classList.contains('open')) return;
    const leader = this.getLeaderBunny();
    if (!leader || !leader.brain) return;

    const snap = leader.brain.getSnapshot(leader.lastInputs);
    const rc = this.config.rayCount;
    const spreadDeg = Math.round(0.85 * 180); // ~153°
    const rayAngles = [];
    for (let i = 0; i < rc; i++) {
      const t = rc === 1 ? 0.5 : i / (rc - 1);
      rayAngles.push(Math.round(-spreadDeg * 0.5 + t * spreadDeg));
    }

    const titleEl = this.inspectorEl.querySelector('#bi-title');
    if (titleEl) {
      titleEl.textContent =
        'BRAIN INSPECTOR — ' + leader.name + ' (Gen ' + this.generation +
        ' | CP ' + leader.checkpointsPassed + ' | ' + snap.widths.join(' -> ') + ' | ' + snap.activation + ')';
    }

    const numCols = snap.widths.length;
    const maxNodes = Math.max(...snap.widths);
    const svgW = Math.max(660, numCols * 175);
    const svgH = Math.max(220, maxNodes * 24 + 36);
    const svg = this.inspectorEl.querySelector('#bi-svg');
    svg.setAttribute('width', svgW);
    svg.setAttribute('height', svgH);
    svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);

    // Coordonnées (x, y) de chaque neurone
    const coords = [];
    const padX = 72;
    const stepX = numCols > 1 ? (svgW - padX * 2) / (numCols - 1) : 0;
    for (let c = 0; c < numCols; c++) {
      const count = snap.widths[c];
      const colPts = [];
      const topY = 26;
      const availH = svgH - 44;
      for (let i = 0; i < count; i++) {
        const y = count === 1 ? topY + availH / 2 : topY + (i * availH) / (count - 1);
        colPts.push({ x: padX + c * stepX, y });
      }
      coords.push(colPts);
    }

    const sel = this.inspectorSel;
    let html = '';

    // En-têtes de colonnes
    for (let c = 0; c < numCols; c++) {
      const lbl = c === 0 ? 'Inputs (' + snap.widths[c] + ')'
        : (c === numCols - 1 ? 'Outputs (2)' : 'Hidden ' + c + ' (' + snap.widths[c] + ')');
      html += '<text x="' + coords[c][0].x + '" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="#6b4b5b">' + lbl + '</text>';
    }

    // Arêtes pondérées : bleu = positif, rouge = négatif, épaisseur ~ |w|
    for (let l = 0; l < snap.layers.length; l++) {
      const layer = snap.layers[l];
      for (let i = 0; i < layer.inSize; i++) {
        for (let j = 0; j < layer.outSize; j++) {
          const w = layer.w[i * layer.outSize + j];
          const p1 = coords[l][i];
          const p2 = coords[l + 1][j];
          const isSelEdge = sel && sel.layer === l + 1 && sel.idx === j;
          const color = w >= 0 ? '#2b6cb0' : '#c53030';
          const sw = Math.min(3.4, 0.45 + Math.abs(w) * 1.15);
          const op = sel ? (isSelEdge ? 0.95 : 0.16) : Math.min(0.75, 0.18 + Math.abs(w) * 0.35);
          html += '<line x1="' + p1.x.toFixed(1) + '" y1="' + p1.y.toFixed(1) +
            '" x2="' + p2.x.toFixed(1) + '" y2="' + p2.y.toFixed(1) +
            '" stroke="' + color + '" stroke-width="' + sw.toFixed(2) + '" stroke-opacity="' + op.toFixed(2) + '" />';
        }
      }
    }

    // Neurones cliquables
    const nodeLabel = (c, i) => {
      if (c === 0) return i < rc ? 'R' + (i + 1) + ' (' + rayAngles[i] + '°)' : 'Speed';
      if (c === numCols - 1) return i === 0 ? 'Turn' : 'Throttle';
      return 'H' + c + '_' + (i + 1);
    };

    for (let c = 0; c < numCols; c++) {
      for (let i = 0; i < snap.widths[c]; i++) {
        const pt = coords[c][i];
        const act = snap.activations[c] && snap.activations[c][i] !== undefined ? snap.activations[c][i] : 0;
        const norm = Math.max(0, Math.min(1, act));
        const isSel = sel && sel.layer === c && sel.idx === i;
        const fill = 'rgb(' + Math.round(252 - norm * 110) + ',' + Math.round(238 - norm * 24) + ',' + Math.round(190 - norm * 60) + ')';
        html += '<g class="bi-node" data-layer="' + c + '" data-idx="' + i + '" style="cursor:pointer;">';
        html += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + (isSel ? 10 : 8) +
          '" fill="' + fill + '" stroke="' + (isSel ? '#a64d5a' : '#6b4b5b') + '" stroke-width="' + (isSel ? 2.6 : 1.5) + '" />';
        html += '<text x="' + pt.x.toFixed(1) + '" y="' + (pt.y + 3).toFixed(1) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#462b38">' +
          act.toFixed(2) + '</text>';
        if (c === 0) {
          html += '<text x="' + (pt.x - 13).toFixed(1) + '" y="' + (pt.y + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#523442">' +
            nodeLabel(c, i) + '</text>';
        } else if (c === numCols - 1) {
          html += '<text x="' + (pt.x + 13).toFixed(1) + '" y="' + (pt.y + 3).toFixed(1) + '" text-anchor="start" font-size="10" font-weight="700" fill="#523442">' +
            nodeLabel(c, i) + '</text>';
        }
        html += '</g>';
      }
    }

    svg.innerHTML = html;
    svg.querySelectorAll('.bi-node').forEach((gEl) => {
      gEl.addEventListener('click', () => {
        this.inspectorSel = {
          layer: Number(gEl.getAttribute('data-layer')),
          idx: Number(gEl.getAttribute('data-idx'))
        };
        this.renderBrainInspector();
      });
    });

    // Détail du neurone sélectionné : z = Σ (a_i × w_i) + b
    const nTitle = this.inspectorEl.querySelector('#bi-neuron-title');
    const nDetail = this.inspectorEl.querySelector('#bi-neuron-detail');
    if (sel && sel.layer > 0 && snap.layers[sel.layer - 1]) {
      const layer = snap.layers[sel.layer - 1];
      const prevActs = snap.activations[sel.layer - 1] || [];
      const bias = layer.b[sel.idx];
      let z = bias;
      let rows = '';
      for (let i = 0; i < layer.inSize; i++) {
        const ai = prevActs[i] || 0;
        const wi = layer.w[i * layer.outSize + sel.idx];
        const contrib = ai * wi;
        z += contrib;
        const cls = contrib >= 0 ? 'bi-pos' : 'bi-neg';
        rows += '<tr><td>' + nodeLabel(sel.layer - 1, i) + '</td><td>' + ai.toFixed(3) +
          '</td><td class="' + (wi >= 0 ? 'bi-pos' : 'bi-neg') + '">' + (wi >= 0 ? '+' : '') + wi.toFixed(3) +
          '</td><td class="' + cls + '">' + (contrib >= 0 ? '+' : '') + contrib.toFixed(3) + '</td></tr>';
      }
      const outVal = snap.activations[sel.layer][sel.idx] || 0;
      nTitle.textContent = 'Neuron ' + nodeLabel(sel.layer, sel.idx) + ' (' + layer.act + ')';
      nDetail.innerHTML =
        '<div style="margin-bottom:5px;"><b>z</b> = &Sigma;(a&#x1D62;&middot;w&#x1D62;) + b(' + (bias >= 0 ? '+' : '') + bias.toFixed(3) +
        ') = <b>' + z.toFixed(3) + '</b> &rarr; <b>a = ' + outVal.toFixed(3) + '</b></div>' +
        '<table class="bi-table"><thead><tr><th>From</th><th>a&#x1D62;</th><th>w&#x1D62;</th><th>a&#x1D62;&times;w&#x1D62;</th></tr></thead><tbody>' +
        rows + '</tbody></table>';
    } else if (sel && sel.layer === 0) {
      const val = snap.activations[0][sel.idx] || 0;
      nTitle.textContent = 'Input ' + nodeLabel(0, sel.idx);
      nDetail.innerHTML = '<p>Raw normalized sensor value: <b>' + val.toFixed(3) + '</b> (0 = edge touch, 1 = clear ray of ' + this.config.rayLength + 'px).</p>';
    }

    // Détail des capteurs + formules de sortie
    const ioDetail = this.inspectorEl.querySelector('#bi-io-detail');
    const steerOut = leader.lastOutputs[0] || 0.5;
    const throttleOut = leader.lastOutputs[1] || 0.5;
    const dHeadDeg = ((steerOut - 0.5) * 0.28 * 180 / Math.PI).toFixed(1);
    const spdVal = (0.75 + throttleOut * (leader.maxSpeed - 0.75)).toFixed(2);
    let rayRows = '';
    for (let i = 0; i < rc; i++) {
      const dNorm = leader.lastInputs[i] || 0;
      rayRows += '<tr><td>R' + (i + 1) + '</td><td>' + rayAngles[i] + '&deg;</td><td>' +
        (dNorm * this.config.rayLength).toFixed(0) + ' px (' + dNorm.toFixed(2) + ')</td></tr>';
    }
    ioDetail.innerHTML =
      '<div style="margin-bottom:6px;">' +
      '<b>Turn</b>: ' + steerOut.toFixed(3) + ' &rarr; &Delta;angle = <b>' + (Number(dHeadDeg) >= 0 ? '+' : '') + dHeadDeg + '&deg;/frame</b><br/>' +
      '<b>Throttle</b>: ' + throttleOut.toFixed(3) + ' &rarr; speed = <b>' + spdVal + ' px/f</b>' +
      '</div>' +
      '<table class="bi-table"><thead><tr><th>Ray</th><th>Angle</th><th>Distance</th></tr></thead><tbody>' +
      rayRows + '</tbody></table>';
  }

  drawIntroCard(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    this.startBtn = { x: 68,  y: 202, w: 164, h: 24 };
    this.trainBtn = { x: 248, y: 202, w: 164, h: 24 };

    g.noStroke();
    g.fill(26, 20, 32, 135);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 52, 32, 376, 208, g.color(250, 242, 212));
    g.fill(189, 117, 126);
    g.rect(54, 34, 372, 22, 1);
    PixelUI.txt(g, font, 'BUNNY DERBY — CHOOSE YOUR MODE!', 240, 39, g.color(255, 252, 238), CENTER, 10, 360);

    const lines = [
      '• WATCH & BET: Pick a bunny, bet tickets (1st = 3x, Top 3 = 1.5x),',
      '  and watch randomly selected pre-trained AI racers!',
      '• TRAINING LAB: Open the Neuroevolution trainer (TF.js), adjust',
      '  rays, layers, neurons & mutation, and save your own brains!',
      '• Click the track during a race to drop hay bales (avoid AI).'
    ];
    lines.forEach((ln, i) => {
      PixelUI.txt(g, font, ln, 68, 70 + i * 20, g.color(107, 75, 91), LEFT, 8.2, 344);
    });

    PixelUI.txt(g, font, 'Arrows: Select  |  Space/Enter: Confirm  |  H: Debug', 240, 178, g.color(144, 98, 93), CENTER, 8);

    if (this.introIdx === undefined) this.introIdx = 0;
    if (PixelUI.pointInRect(mx, my, this.startBtn)) this.introIdx = 0;
    else if (PixelUI.pointInRect(mx, my, this.trainBtn)) this.introIdx = 1;

    PixelUI.drawButton(
      g, font, this.startBtn, (this.introIdx === 0 ? '> ' : '') + 'WATCH & BET',
      this.introIdx === 0,
      g.color(223, 240, 187), g.color(202, 232, 152)
    );
    PixelUI.drawButton(
      g, font, this.trainBtn, (this.introIdx === 1 ? '> ' : '') + 'TRAINING LAB (AI)',
      this.introIdx === 1,
      g.color(210, 228, 248), g.color(184, 212, 242)
    );
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

    if (this.betFocus === undefined) this.betFocus = 'BUNNY';
    PixelUI.txt(g, font, '1. Choose your bunny champion (Arrows | 1st = 3x | Top 3 = 1.5x):', 56, 53, this.betFocus === 'BUNNY' ? g.color(168, 74, 94) : g.color(107, 75, 91), LEFT, 8, 370);

    for (const c of L.bunnyCards) {
      const b = this.bunnies[c.idx];
      const sel = this.betBunnyIdx === c.idx;
      const hov = PixelUI.pointInRect(mx, my, c);
      const bg = sel ? g.color(223, 240, 187) : (hov ? g.color(255, 246, 206) : g.color(238, 220, 182));
      PixelUI.panel(g, c.x, c.y, c.w, c.h, bg);
      if (sel && this.betFocus === 'BUNNY') {
        g.push(); g.noFill(); g.stroke(189, 117, 126); g.strokeWeight(1.5);
        g.rect(c.x + 1, c.y + 1, c.w - 2, c.h - 2, 1); g.pop();
      }

      const colName = b ? b.colour : DerbyBunny.COLOURS[c.idx];
      const sp = assets.getSheetFrame('characters/animals/bunnies/bunny_' + colName + '.png', 32, 32, 0, 0);
      if (sp) g.image(sp, c.x + 2, c.y + 4);
      const bName = b ? b.name : DerbyBunny.NAMES[c.idx];
      PixelUI.txt(g, font, bName, c.x + 34, c.y + 10, sel ? g.color(62, 108, 70) : g.color(107, 75, 91), LEFT, 8, 52);
      if (sel) {
        PixelUI.txt(g, font, 'PICKED', c.x + 34, c.y + 23, g.color(70, 130, 78), LEFT, 7);
      }
    }

    PixelUI.txt(g, font, '2. Choose bet amount (Up/Down to switch row):', 56, 154, this.betFocus === 'AMOUNT' ? g.color(168, 74, 94) : g.color(107, 75, 91), LEFT, 8);
    for (const bb of L.betBtns) {
      const canAfford = tickets >= bb.amt;
      const sel = this.betAmount === bb.amt;
      const hov = PixelUI.pointInRect(mx, my, bb);
      const bg = !canAfford
        ? g.color(216, 206, 196)
        : (sel ? g.color(223, 240, 187) : (hov ? g.color(255, 246, 206) : g.color(232, 207, 166)));
      PixelUI.panel(g, bb.x, bb.y, bb.w, bb.h, bg);
      if (sel && this.betFocus === 'AMOUNT') {
        g.push(); g.noFill(); g.stroke(189, 117, 126); g.strokeWeight(1.5);
        g.rect(bb.x + 1, bb.y + 1, bb.w - 2, bb.h - 2, 1); g.pop();
      }
      PixelUI.txt(
        g, font, bb.label, bb.x + bb.w / 2, bb.y + 5,
        !canAfford ? g.color(150, 138, 134) : (sel ? g.color(62, 108, 70) : g.color(107, 75, 91)),
        CENTER, 8.5, bb.w - 6
      );
    }

    const goHov = PixelUI.pointInRect(mx, my, L.goBtn) || this.betFocus === 'GO';
    PixelUI.drawButton(
      g, font, L.goBtn,
      (this.betFocus === 'GO' ? '> ' : '') + 'START RACE! (Space)',
      goHov,
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

    if (this.pauseIdx === undefined) this.pauseIdx = 0;
    const pBtns = [
      { rect: this.resumeBtn, label: 'Resume (Esc)', accent: g.color(223, 240, 187) },
      { rect: this.restartBtn, label: 'Restart' },
      { rect: this.exitBtn, label: 'Back to Fair' }
    ];
    pBtns.forEach((b, i) => {
      if (PixelUI.pointInRect(mx, my, b.rect)) this.pauseIdx = i;
      const sel = this.pauseIdx === i;
      PixelUI.drawButton(g, font, b.rect, (sel ? '> ' : '') + b.label, sel, b.accent);
    });
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
        this.mode = 'RACE';
        if (this.panelEl) {
          this.panelEl.style.display = Vehicle.debug ? 'flex' : 'none';
          const rTab = this.panelEl.querySelector('#dp-tab-race');
          const tTab = this.panelEl.querySelector('#dp-tab-train');
          if (rTab && tTab) { rTab.classList.add('dp-active'); tTab.classList.remove('dp-active'); }
        }
        this.startRaceDay(false);
        this.state = 'BETTING';
        this.game.sound.playSfx('ui_click', 0.8);
      } else if (this.trainBtn && PixelUI.pointInRect(mx, my, this.trainBtn)) {
        this.seenIntro = true;
        this.mode = 'TRAINING';
        this.showRays = true;
        if (this.panelEl) {
          this.panelEl.style.display = 'flex';
          const rTab = this.panelEl.querySelector('#dp-tab-race');
          const tTab = this.panelEl.querySelector('#dp-tab-train');
          if (rTab && tTab) { tTab.classList.add('dp-active'); rTab.classList.remove('dp-active'); }
        }
        this.startTraining(true);
        this.state = 'RUNNING';
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
      if (this.introIdx === undefined) this.introIdx = 0;
      if (kc === LEFT_ARROW || kc === RIGHT_ARROW || kc === UP_ARROW || kc === DOWN_ARROW ||
          k === 'a' || k === 'A' || k === 'd' || k === 'D' || k === 'q' || k === 'Q') {
        this.introIdx = (this.introIdx + 1) % 2;
        this.game.sound.playSfx('ui_click', 0.5);
      } else if (k === ' ' || kc === ENTER) {
        this.seenIntro = true;
        if (this.introIdx === 0) {
          this.mode = 'RACE';
          if (this.panelEl) {
            this.panelEl.style.display = Vehicle.debug ? 'flex' : 'none';
            const rTab = this.panelEl.querySelector('#dp-tab-race');
            const tTab = this.panelEl.querySelector('#dp-tab-train');
            if (rTab && tTab) { rTab.classList.add('dp-active'); tTab.classList.remove('dp-active'); }
          }
          this.startRaceDay(false);
          this.state = 'BETTING';
        } else {
          this.mode = 'TRAINING';
          this.showRays = true;
          if (this.panelEl) {
            this.panelEl.style.display = 'flex';
            const rTab = this.panelEl.querySelector('#dp-tab-race');
            const tTab = this.panelEl.querySelector('#dp-tab-train');
            if (rTab && tTab) { tTab.classList.add('dp-active'); rTab.classList.remove('dp-active'); }
          }
          this.startTraining(true);
          this.state = 'RUNNING';
        }
        this.game.sound.playSfx('ui_click', 0.8);
      } else if (kc === ESCAPE) {
        this.backToHub();
      }
      return;
    }
    if (this.state === 'BETTING') {
      if (this.betFocus === undefined) this.betFocus = 'BUNNY';
      const amounts = [0, 5, 10, 25, 50];
      const tickets = this.game.save.data.tickets || 0;
      if (kc === LEFT_ARROW || k === 'a' || k === 'A' || k === 'q' || k === 'Q') {
        if (this.betFocus === 'BUNNY') this.betBunnyIdx = (this.betBunnyIdx + 7) % 8;
        else if (this.betFocus === 'AMOUNT') {
          let idx = amounts.indexOf(this.betAmount);
          for (let t = 0; t < amounts.length; t++) {
            idx = (idx - 1 + amounts.length) % amounts.length;
            if (tickets >= amounts[idx]) { this.betAmount = amounts[idx]; break; }
          }
        }
        this.game.sound.playSfx('ui_click', 0.5);
      } else if (kc === RIGHT_ARROW || k === 'd' || k === 'D') {
        if (this.betFocus === 'BUNNY') this.betBunnyIdx = (this.betBunnyIdx + 1) % 8;
        else if (this.betFocus === 'AMOUNT') {
          let idx = amounts.indexOf(this.betAmount);
          for (let t = 0; t < amounts.length; t++) {
            idx = (idx + 1) % amounts.length;
            if (tickets >= amounts[idx]) { this.betAmount = amounts[idx]; break; }
          }
        }
        this.game.sound.playSfx('ui_click', 0.5);
      } else if (kc === UP_ARROW || k === 'w' || k === 'W' || k === 'z' || k === 'Z') {
        if (this.betFocus === 'GO') this.betFocus = 'AMOUNT';
        else if (this.betFocus === 'AMOUNT') this.betFocus = 'BUNNY';
        else if (this.betBunnyIdx >= 4) this.betBunnyIdx -= 4;
        else this.betFocus = 'GO';
        this.game.sound.playSfx('ui_click', 0.5);
      } else if (kc === DOWN_ARROW || k === 's' || k === 'S') {
        if (this.betFocus === 'BUNNY') {
          if (this.betBunnyIdx < 4) this.betBunnyIdx += 4;
          else this.betFocus = 'AMOUNT';
        } else if (this.betFocus === 'AMOUNT') {
          this.betFocus = 'GO';
        } else {
          this.betFocus = 'BUNNY';
        }
        this.game.sound.playSfx('ui_click', 0.5);
      } else if (k === ' ' || kc === ENTER) {
        this.startRaceDay(true);
      }
      return;
    }
    if (this.state === 'PAUSED') {
      if (this.pauseIdx === undefined) this.pauseIdx = 0;
      if (kc === UP_ARROW || k === 'w' || k === 'W' || k === 'z' || k === 'Z') {
        this.pauseIdx = (this.pauseIdx + 2) % 3;
        this.game.sound.playSfx('ui_click', 0.5);
      } else if (kc === DOWN_ARROW || k === 's' || k === 'S') {
        this.pauseIdx = (this.pauseIdx + 1) % 3;
        this.game.sound.playSfx('ui_click', 0.5);
      } else if (k === ' ' || kc === ENTER) {
        if (this.pauseIdx === 0) this.state = 'RUNNING';
        else if (this.pauseIdx === 1) {
          if (this.mode === 'RACE') this.startRaceDay(false);
          else this.startTraining(true);
        } else this.backToHub();
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
