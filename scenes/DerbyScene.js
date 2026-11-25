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
    this.mode = 'TRAINING'; // 'TRAINING' | 'RACE'
    this.state = 'INTRO';   // 'INTRO' | 'RUNNING' | 'PAUSED' | 'GRADUATED' | 'RACE_FINISH'
    this.seenIntro = false;

    this.meta = null;
    this.maskPixels = null;
    this.maskW = 640;
    this.maskH = 360;

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
    this.meta = this.game.assets.derbyMeta;

    // Extraire les pixels du masque de collision une seule fois (performance 60 FPS)
    const maskImg = this.game.assets.getImage('derby/track_01_mask.png');
    if (maskImg) {
      maskImg.loadPixels();
      this.maskPixels = maskImg.pixels;
      this.maskW = maskImg.width;
      this.maskH = maskImg.height;
    }

    this.hayObstacles = [];
    this.fx = [];
    this.createSidePanel();
    this.startTraining(true);
    this.state = this.seenIntro ? 'RUNNING' : 'INTRO';
  }

  cleanup() {
    this.disposePopulation();
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

  /** Lance le mode Race Day avec les cerveaux sauvegardés + pré-entraîné inclus. */
  startRaceDay() {
    this.mode = 'RACE';
    this.disposePopulation();
    this.raceStandings = [];
    this.raceCountdown = 120; // 2 secondes
    this.state = 'RUNNING';

    const [sx, sy] = this.meta.start;
    const heading = this.meta.start_heading_rad;
    const saved = this.game.save.data.savedBrains || [];

    // Jusqu'à 8 lapins : cerveaux sauvegardés + meilleur courant + cerveaux pré-entraînés
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
        // Cerveau pré-entraîné embarqué (fonctionne immédiatement !)
        cfg.useRuleFallback = true;
      }

      // Petit décalage sur la grille de départ
      const offset = (i - 3.5) * 2.2;
      const nx = sx - Math.sin(heading) * offset;
      const ny = sy + Math.cos(heading) * offset;
      const bunny = new DerbyBunny(nx, ny, heading, cfg, this.game.assets, brain, i, label);
      bunny.maxSpeed = 2.15 + (i % 3) * 0.12;
      this.bunnies.push(bunny);
    }
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

    for (let s = 0; s < steps; s++) {
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
          const stars = this.raceStandings[0] && this.raceStandings[0].finishedLap ? 3 : 2;
          this.game.save.recordGameResult('derby', stars, 10);
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
    const trackImg = assets.getImage('derby/track_01.png');

    // 1. Piste de course (640x360 mappé proprement sur 480x272)
    if (trackImg) {
      g.image(trackImg, 0, 0, 480, 272);
    } else {
      g.background(148, 188, 126);
    }

    const scaleX = 480 / this.maskW;
    const scaleY = 272 / this.maskH;

    // Drapeau de départ/arrivée
    if (this.meta) {
      const flag = assets.getImage('generated/derby/finish_flag.png');
      const [sx, sy] = this.meta.start;
      if (flag) g.image(flag, Math.round(sx * scaleX) - 6, Math.round(sy * scaleY) - 18);
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

    // 2. Lapins coureurs + rayons capteurs du leader
    const leader = this.getLeaderBunny();
    for (const b of this.bunnies) {
      b.show(g, scaleX, scaleY, b === leader, (this.showRays || Vehicle.debug) && b === leader);
    }

    // 3. Mini visualisation du réseau de neurones du leader (en bas à gauche)
    if (leader && this.mode === 'TRAINING' && this.state === 'RUNNING') {
      this.drawMiniBrain(g, leader);
    }

    // 4. Classement en direct en mode Race Day
    if (this.mode === 'RACE' && this.state === 'RUNNING') {
      const sorted = [...this.bunnies].sort((a, b) => b.checkpointsPassed - a.checkpointsPassed);
      PixelUI.panel(g, 8, 28, 102, 54);
      PixelUI.txt(g, font, 'LEADERBOARD', 14, 31, g.color(189, 117, 126));
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        PixelUI.txt(g, font, (i + 1) + '. ' + sorted[i].name, 14, 44 + i * 12, g.color(107, 75, 91));
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
    PixelUI.panel(g, 8, 5, 250, 16);
    const hudText = this.mode === 'TRAINING'
      ? 'GEN ' + this.generation + ' | ALIVE ' + alive + '/' + this.bunnies.length + ' | ' + this.speedMult + 'x'
      : 'RACE DAY | Click track to drop hay!';
    PixelUI.txt(g, font, hudText, 14, 8, g.color(107, 75, 91));

    // Overlays
    if (this.state === 'INTRO') this.drawIntroCard(g);
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
      g.fill(lerpColor(g.color(220, 90, 100), g.color(110, 195, 110), val));
      g.circle(xIn, 214 + (i * 42) / Math.max(1, inCount - 1), 4);
    }
    g.fill(107, 75, 91);
    for (let j = 0; j < hidCount; j++) {
      g.circle(xHid, 214 + (j * 42) / Math.max(1, hidCount - 1), 4);
    }
    for (let k = 0; k < outCount; k++) {
      const ov = bunny.lastOutputs[k] || 0.5;
      g.fill(lerpColor(g.color(120, 160, 220), g.color(245, 200, 80), ov));
      g.circle(xOut, 224 + k * 22, 5);
    }
  }

  /** Panneau HTML latéral discret regroupant tous les curseurs exigés par le cours. */
  createSidePanel() {
    if (this.panelEl) this.panelEl.remove();
    const el = document.createElement('div');
    el.id = 'derby-panel';
    el.innerHTML = `
      <div class="dp-title">BUNNY DERBY LAB</div>
      <div class="dp-tabs">
        <button id="dp-tab-train" class="dp-btn dp-active">Training</button>
        <button id="dp-tab-race" class="dp-btn">Race Day</button>
      </div>
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
    g.noStroke();
    g.fill(0, 0, 0, 115);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 74, 54, 332, 160);
    g.fill(189, 117, 126);
    g.rect(74, 54, 332, 22);
    PixelUI.txt(g, font, 'BUNNY DERBY (NEUROEVOLUTION)', 240, 60, g.color(243, 244, 231), CENTER);

    PixelUI.txt(g, font, 'Train bunnies with TensorFlow.js neural nets!', 240, 92, g.color(107, 75, 91), CENTER);
    PixelUI.txt(g, font, 'Tune rays, layers & mutation in the side panel.', 240, 112, g.color(107, 75, 91), CENTER);
    PixelUI.txt(g, font, 'Switch to Race Day anytime to race saved brains!', 240, 132, g.color(144, 98, 93), CENTER);

    PixelUI.drawButton(g, font, this.startBtn, 'START (Space)', PixelUI.pointInRect(mx, my, this.startBtn), g.color(223, 240, 187));
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
    g.fill(0, 0, 0, 100);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 92, 62, 296, 148);
    g.fill(189, 117, 126);
    g.rect(92, 62, 296, 22);
    const title = this.state === 'GRADUATED' ? 'THE BUNNIES GRADUATED!' : 'RACE DAY PODIUM!';
    PixelUI.txt(g, font, title, 240, 68, g.color(243, 244, 231), CENTER);

    if (this.state === 'RACE_FINISH' && this.raceStandings.length > 0) {
      for (let i = 0; i < Math.min(3, this.raceStandings.length); i++) {
        PixelUI.txt(g, font, '#' + (i + 1) + '  ' + this.raceStandings[i].name, 240, 100 + i * 18, g.color(107, 75, 91), CENTER);
      }
    } else {
      PixelUI.txt(g, font, '60%+ bunnies completed a full lap!', 240, 108, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, 'Click Save Brain or try Race Day!', 240, 130, g.color(144, 98, 93), CENTER);
    }

    PixelUI.txt(g, font, 'Press Space to race again or Esc for Fair', 240, 182, g.color(144, 98, 93), CENTER);
  }

  backToHub() {
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo('hub', { fromBooth: 'derby' });
  }

  mousePressed(mx, my) {
    if (this.state === 'INTRO') {
      if (PixelUI.pointInRect(mx, my, this.startBtn)) {
        this.seenIntro = true;
        this.state = 'RUNNING';
      }
      return;
    }
    if (this.state === 'PAUSED') {
      if (PixelUI.pointInRect(mx, my, this.resumeBtn)) this.state = 'RUNNING';
      else if (PixelUI.pointInRect(mx, my, this.restartBtn)) this.startTraining(true);
      else if (PixelUI.pointInRect(mx, my, this.exitBtn)) this.backToHub();
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
        this.state = 'RUNNING';
      } else if (kc === ESCAPE) {
        this.backToHub();
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
      if (this.mode === 'RACE') this.startRaceDay();
      else this.startTraining(false);
    }
  }
}
