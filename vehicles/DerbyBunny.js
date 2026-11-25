/**
 * Lapin coureur pour Bunny Derby (sous-classe de Vehicle).
 * Reprise de l'exemple 9 du cours :
 * - Lance `rayCount` rayons capteurs de distance sur le masque du circuit
 *   (track_01_mask.png : blanc = piste roulable, sombre = hors-piste).
 * - Passe les distances normalisées + sa vitesse dans un NeuralNetwork (TF.js)
 *   qui retourne la direction et l'accélération.
 * - Calcule sa fitness en combinant les checkpoints franchis et le temps
 *   (pour récompenser les lapins rapides, cf. slide 53).
 * - En mode Race Day, combine aussi avoid() sur les bottes de foin cliquées !
 */
class DerbyBunny extends Vehicle {
  static COLOURS = ['snow', 'peach', 'butter', 'mint', 'lavender', 'sky', 'caramel', 'smoke'];
  static NAMES = ['Mochi', 'Peach', 'Butter', 'Minty', 'Lulu', 'Skye', 'Caramel', 'Smokey'];

  constructor(startX, startY, startHeading, config, assets, brain = null, colourIdx = 0, customName = null) {
    super(startX, startY, 2.35, 0.25);
    this.assets = assets;
    this.config = config;
    this.r = 4;

    this.colourIdx = colourIdx % DerbyBunny.COLOURS.length;
    this.colour = DerbyBunny.COLOURS[this.colourIdx];
    this.name = customName || DerbyBunny.NAMES[this.colourIdx];

    this.heading = startHeading;
    this.speed = 1.2;
    this.vel = p5.Vector.fromAngle(this.heading).mult(this.speed);

    // Topologie du cerveau : rayCount rayons + 1 entrée vitesse -> 2 sorties (angle, gaz)
    if (brain) {
      this.brain = brain;
    } else if (config.useRuleFallback) {
      // Cerveau "pré-entraîné" heuristique livré par défaut pour Race Day immédiat
      this.brain = null;
      this.isPretrained = true;
    } else {
      this.brain = new NeuralNetwork(config.rayCount + 1, config.hiddenNodes, 2, {
        hiddenLayers: config.hiddenLayers,
        activation: config.activation
      });
    }

    this.dead = false;
    this.finishedLap = false;
    this.fadeAlpha = 255;
    this.checkpointIdx = 1;
    this.checkpointsPassed = 0;
    this.framesAlive = 0;
    this.staleFrames = 0;
    this.lapTimeFrames = Infinity;
    this.rawFitness = 0;
    this.fitness = 0;
    this.lastRayHits = [];
    this.lastInputs = [];
    this.lastOutputs = [0.5, 0.5];
  }

  /**
   * Lance `rayCount` rayons en éventail et lit les pixels du masque de piste
   * pour obtenir la distance au bord de la piste dans chaque direction.
   */
  castRays(maskPixels, maskW, maskH) {
    const count = this.config.rayCount;
    const maxLen = this.config.rayLength;
    const spread = PI * 0.85; // Éventail frontal de ~153°
    const readings = [];
    this.lastRayHits = [];

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = this.heading - spread / 2 + t * spread;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let distHit = maxLen;
      // Pas de 3 pixels pour rester très rapide même en vitesse 20x
      for (let d = 3; d <= maxLen; d += 3) {
        const sx = Math.round(this.pos.x + dx * d);
        const sy = Math.round(this.pos.y + dy * d);
        if (!DerbyBunny.isDrivable(maskPixels, maskW, maskH, sx, sy)) {
          distHit = d;
          break;
        }
      }

      readings.push(distHit / maxLen);
      this.lastRayHits.push({
        x: this.pos.x + dx * distHit,
        y: this.pos.y + dy * distHit,
        norm: distHit / maxLen
      });
    }
    return readings;
  }

  /** Lit un pixel du masque (blanc = piste roulable). */
  static isDrivable(maskPixels, maskW, maskH, x, y) {
    if (x < 0 || y < 0 || x >= maskW || y >= maskH) return false;
    const idx = (y * maskW + x) * 4;
    return maskPixels[idx] > 140;
  }

  /**
   * Fait avancer le lapin d'une frame :
   * capteurs -> réseau de neurones -> direction & vitesse -> évitement d'obstacles -> checkpoints.
   */
  step(maskPixels, maskW, maskH, checkpoints, hayObstacles = []) {
    if (this.dead) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - 12);
      return;
    }

    this.framesAlive++;
    this.staleFrames++;

    const rayInputs = this.castRays(maskPixels, maskW, maskH);
    const inputs = [...rayInputs, this.speed / this.maxSpeed];
    this.lastInputs = inputs;

    let steerOut = 0.5;
    let throttleOut = 0.7;

    if (this.brain) {
      const out = this.brain.predict(inputs);
      steerOut = out[0];
      throttleOut = out[1];
    } else if (this.isPretrained) {
      // Cerveau pré-entraîné réactif pour que Race Day fonctionne dès le 1er clic
      const half = Math.floor(rayInputs.length / 2);
      let leftSum = 0;
      let rightSum = 0;
      for (let i = 0; i < half; i++) leftSum += rayInputs[i];
      for (let i = rayInputs.length - half; i < rayInputs.length; i++) rightSum += rayInputs[i];
      const diff = (rightSum - leftSum) / Math.max(1, half);
      steerOut = constrain(0.5 + diff * 0.9 + random(-0.04, 0.04), 0, 1);
      const center = rayInputs[half] || 0.5;
      throttleOut = constrain(0.35 + center * 0.65, 0.25, 1.0);
    }

    this.lastOutputs = [steerOut, throttleOut];

    // Appliquer direction et vitesse issues du réseau
    const turnAngle = map(steerOut, 0, 1, -0.14, 0.14);
    this.heading += turnAngle;
    this.speed = map(throttleOut, 0, 1, 0.75, this.maxSpeed);
    this.vel = p5.Vector.fromAngle(this.heading).mult(this.speed);

    // Comportement avoid() supplémentaire si le joueur place des bottes de foin !
    if (hayObstacles.length > 0) {
      const avoidF = this.avoid(hayObstacles);
      if (avoidF.magSq() > 1e-4) {
        this.vel.add(avoidF.mult(1.8));
        this.vel.limit(this.maxSpeed);
        this.heading = this.vel.heading();
      }
    }

    this.pos.add(this.vel);

    // Collision hors-piste ou botte de foin
    if (!DerbyBunny.isDrivable(maskPixels, maskW, maskH, Math.round(this.pos.x), Math.round(this.pos.y))) {
      this.dead = true;
      return;
    }

    // Progression à travers les checkpoints ordonnés de track_01_meta.json
    const cp = checkpoints[this.checkpointIdx % checkpoints.length];
    if (cp && dist(this.pos.x, this.pos.y, cp[0], cp[1]) < 26) {
      this.checkpointsPassed++;
      this.checkpointIdx = (this.checkpointIdx + 1) % checkpoints.length;
      this.staleFrames = 0;

      if (!this.finishedLap && this.checkpointsPassed >= checkpoints.length) {
        this.finishedLap = true;
        this.lapTimeFrames = this.framesAlive;
      }
    }

    // Évite les lapins qui tournent sur place indéfiniment
    if (this.staleFrames > 220) {
      this.dead = true;
    }
  }

  /**
   * Fonction de fitness (slide 53) :
   * Récompense la progression (checkpoints^2) ET la vitesse (pénalité temporelle),
   * avec un gros bonus si le tour complet est bouclé !
   */
  computeFitness() {
    const progress = this.checkpointsPassed;
    const speedFactor = 1 / (1 + this.framesAlive * 0.0018);
    const lapBonus = this.finishedLap ? 400 + Math.max(0, 800 - this.lapTimeFrames) : 0;
    this.rawFitness = Math.max(0.01, (progress * progress + 1) * speedFactor + lapBonus);
    return this.rawFitness;
  }

  dispose() {
    if (this.brain) {
      this.brain.dispose();
      this.brain = null;
    }
  }

  show(g, scaleX, scaleY, isLeader = false, showRays = false) {
    if (this.fadeAlpha <= 4) return;
    const px = Math.round(this.pos.x * scaleX);
    const py = Math.round(this.pos.y * scaleY);

    // Rayons capteurs (en mode debug ou toggle Rays)
    if (showRays && !this.dead) {
      g.push();
      g.strokeWeight(1);
      for (const hit of this.lastRayHits) {
        g.stroke(hit.norm < 0.35 ? color(255, 110, 120, 180) : color(255, 240, 140, 140));
        g.line(px, py, Math.round(hit.x * scaleX), Math.round(hit.y * scaleY));
      }
      g.pop();
    }

    const col = this.dead ? 0 : Math.floor(frameCount / 6) % 4;
    const row = this.dead ? 3 : 1; // row 1 = hop, row 3 = sit_and_rest
    const img = this.assets.getSheetFrame(
      'sprites/bunny/bunny_' + this.colour + '.png',
      32,
      32,
      col,
      row
    );

    g.push();
    g.translate(px, py);
    if (this.dead) {
      g.tint(255, this.fadeAlpha);
    }
    if (this.vel.x < -0.05) {
      g.scale(-1, 1);
    }
    if (img) {
      g.image(img, -16, -27);
    } else {
      g.noStroke();
      g.fill(255);
      g.circle(0, 0, 6);
    }
    g.noTint();
    g.pop();

    // Couronne dorée au-dessus du lapin en tête !
    if (isLeader && !this.dead) {
      const crown = this.assets.getImage('generated/derby/crown.png');
      if (crown) {
        g.image(crown, px - Math.floor(crown.width / 2), py - 18);
      }
    }
  }
}
