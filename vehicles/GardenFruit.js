/**
 * Fruit / cible fuyante de Caterpillar Crawl (sous-classe de Vehicle).
 * Reprend exactement la logique des Scorbunnies de 3-Arrival/target.js :
 * - Patrouille calme en vitesse normale, puis fuit avec evade(head, 10) dès que
 *   la tête de la chenille entre dans champDeVision !
 * - Répulsion active des 4 coins (avoidCorners) + barrière physique (containAndBounce)
 *   pour qu'aucun fruit ne puisse jamais toucher les coins mortels de l'écran.
 * - Contournement des obstacles du niveau (avoidObstacles).
 */
class GardenFruit extends Vehicle {
  constructor(x, y, type, assets, bounds = [14, 30, 452, 228]) {
    super(x, y, 0.9, 0.08);
    this.type = type; // 'berry' | 'shy' | 'golden' | 'blueberry' | 'lemon'
    this.assets = assets;
    this.bounds = bounds;
    this.r = 6;
    this.phase = random(TWO_PI);

    this.normalSpeed = 0.75;
    this.evadeSpeed = 1.35;
    this.champDeVision = 58;
    this.isEvading = false;

    // Paramètres d'exclusion des 4 coins et des parois (adaptés à 480x272)
    this.cornerAvoidDistance = 68;
    this.cornerSafetyRadius = 38;
    this.wallMargin = 18;

    this.vel = p5.Vector.random2D().mult(this.normalSpeed);
    this.headRef = null;
    this.obstaclesRef = [];

    // Coordonnées (col, row) dans world/items/plants_items.png (grille 16x16)
    const spriteMap = {
      berry: [1, 3],      // Baie rouge (+1)
      shy: [3, 10],       // Fruit timide rapide (+2)
      golden: [3, 7],     // Ananas doré (+3)
      blueberry: [3, 5],  // Myrtille (+1 + boost)
      lemon: [3, 0],      // Citron (-1)
      rotten: [1, 3]      // Fruit pourri immobile (-1 anneau, teinte verdâtre + mouches)
    };
    this.cell = spriteMap[type] || [1, 3];

    if (this.type === 'rotten') {
      // Les fruits pourris restent strictement immobiles (maxSpeed = 0)
      this.maxSpeed = 0;
      this.maxForce = 0;
      this.vel.set(0, 0);
      return;
    }

    this.isBoostItem = (this.type === 'blueberry' || this.type === 'double');

    // Comportements gérés par BehaviorManager
    if (this.isBoostItem) {
      // Les objets bonus (Quick Ball, Rare Candy) dérivent doucement au hasard (ne fuient JAMAIS Onix !)
      this.behaviors.add('wander', (v) => v.wander(), 0.9, true);
    } else {
      this.behaviors.add('evade', (v) => {
        if (!v.headRef || !v.isEvading) return createVector(0, 0);
        return v.evade(v.headRef, 10);
      }, 1.3, true);
    }
    this.behaviors.add('avoidCorners', (v) => v.avoidCorners(), 1.8, true);
    this.behaviors.add('avoidWalls', (v) => v.avoidWalls(), 1.4, true);
    this.behaviors.add('avoidObstacles', (v) => v.avoid(v.obstaclesRef), 2.0, true);
  }

  getCorners() {
    const [bx, by, bw, bh] = this.bounds;
    return [
      createVector(bx, by),
      createVector(bx + bw, by),
      createVector(bx, by + bh),
      createVector(bx + bw, by + bh)
    ];
  }

  /** Répulsion anticipée des 4 coins (reprise directe de 3-Arrival/target.js). */
  avoidCorners() {
    const steerTotal = createVector(0, 0);
    for (const c of this.getCorners()) {
      const d = p5.Vector.dist(this.pos, c);
      if (d < this.cornerAvoidDistance && d > 0.001) {
        const diff = p5.Vector.sub(this.pos, c);
        const factor = map(d, this.cornerSafetyRadius, this.cornerAvoidDistance, 2.2, 0.6, true);
        const desired = diff.normalize().mult(this.maxSpeed * factor);
        const steer = p5.Vector.sub(desired, this.vel);
        steer.limit(this.maxForce * 2.2);
        steerTotal.add(steer);
      }
    }
    return steerTotal;
  }

  /** Évitement anticipé des 4 murs droits du jardin. */
  avoidWalls() {
    const [bx, by, bw, bh] = this.bounds;
    const m = 28;
    let desired = null;
    if (this.pos.x < bx + m) desired = createVector(this.maxSpeed, this.vel.y);
    else if (this.pos.x > bx + bw - m) desired = createVector(-this.maxSpeed, this.vel.y);

    if (this.pos.y < by + m) {
      const dy = createVector(this.vel.x, this.maxSpeed);
      desired = desired ? p5.Vector.add(desired, dy) : dy;
    } else if (this.pos.y > by + bh - m) {
      const dy = createVector(this.vel.x, -this.maxSpeed);
      desired = desired ? p5.Vector.add(desired, dy) : dy;
    }

    if (desired) {
      desired.setMag(this.maxSpeed);
      const steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce * 1.5);
      return steer;
    }
    return createVector(0, 0);
  }

  /** Barrière physique absolue : impossible de toucher les 4 coins ou de traverser un obstacle. */
  containAndBounce(obstacles = []) {
    const [bx, by, bw, bh] = this.bounds;

    // 1. Rebond hors des obstacles du niveau
    for (const obs of obstacles) {
      const minD = obs.r + this.r + 3;
      const d = p5.Vector.dist(this.pos, obs.pos);
      if (d < minD) {
        const pushDir = p5.Vector.sub(this.pos, obs.pos);
        if (pushDir.magSq() < 0.001) pushDir.set(1, 0);
        pushDir.normalize();
        this.pos.set(p5.Vector.add(obs.pos, p5.Vector.mult(pushDir, minD)));
        const dot = p5.Vector.dot(this.vel, pushDir);
        if (dot < 0) this.vel.sub(p5.Vector.mult(pushDir, 2 * dot));
      }
    }

    // 2. Barrière infranchissable sur les 4 coins (comme TP 3)
    for (const c of this.getCorners()) {
      const d = p5.Vector.dist(this.pos, c);
      if (d < this.cornerSafetyRadius) {
        const pushDir = p5.Vector.sub(this.pos, c);
        if (pushDir.magSq() < 0.001) pushDir.set(1, 1);
        pushDir.normalize();
        this.pos.set(p5.Vector.add(c, p5.Vector.mult(pushDir, this.cornerSafetyRadius)));
        const dot = p5.Vector.dot(this.vel, pushDir);
        if (dot < 0) this.vel.sub(p5.Vector.mult(pushDir, 2 * dot));
      }
    }

    // 3. Rebond doux sur les parois droites
    if (this.pos.x < bx + this.wallMargin) {
      this.pos.x = bx + this.wallMargin;
      if (this.vel.x < 0) this.vel.x *= -0.85;
    } else if (this.pos.x > bx + bw - this.wallMargin) {
      this.pos.x = bx + bw - this.wallMargin;
      if (this.vel.x > 0) this.vel.x *= -0.85;
    }
    if (this.pos.y < by + this.wallMargin) {
      this.pos.y = by + this.wallMargin;
      if (this.vel.y < 0) this.vel.y *= -0.85;
    } else if (this.pos.y > by + bh - this.wallMargin) {
      this.pos.y = by + bh - this.wallMargin;
      if (this.vel.y > 0) this.vel.y *= -0.85;
    }
  }

  /** Met à jour le fruit et renvoie true s'il vient d'entrer en panique (son squeak). */
  step(head, obstacles, vNorm, vEvade, vision) {
    this.headRef = head;
    // Un orbe toxique ne bouge jamais
    if (this.type === 'rotten') return false;

    this.headRef = head;
    this.obstaclesRef = obstacles;
    this.normalSpeed = this.type === 'shy' ? vNorm * 1.15 : vNorm;
    this.evadeSpeed = this.type === 'shy' ? vEvade * 1.15 : vEvade;
    this.champDeVision = vision;

    const wasEvading = this.isEvading;
    if (this.isBoostItem) {
      // Les bonus dérivent calmement sans jamais fuir Onix
      this.isEvading = false;
      this.maxSpeed = Math.max(0.45, vNorm * 0.65);
    } else {
      const d = p5.Vector.dist(head.pos, this.pos);
      if (d < this.champDeVision) {
        this.isEvading = true;
        this.maxSpeed = this.evadeSpeed;
      } else {
        this.isEvading = false;
        this.maxSpeed = this.normalSpeed;
        if (this.vel.magSq() < 0.05) {
          this.vel = p5.Vector.random2D().mult(this.normalSpeed);
        } else {
          this.vel.setMag(this.normalSpeed);
        }
      }
    }

    this.applyManagedBehaviors();
    this.update();
    this.containAndBounce(obstacles);

    return !wasEvading && this.isEvading;
  }

  show(g) {
    const px = Math.round(this.pos.x);

    // 1. Orbe Poison / Toxique immobile : visuellement très clair ("NE PAS TOUCHER / -1 anneau !")
    if (this.type === 'rotten') {
      const py = Math.round(this.pos.y);
      const t = frameCount;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.14 + this.phase);
      g.push();
      g.noStroke();

      // Flaque toxique bouillonnante + anneau de danger pulsant
      g.fill(118, 42, 148, 85 + Math.round(pulse * 40));
      g.ellipse(px, py + 4, 20 + pulse * 2, 9);
      g.noFill();
      g.stroke(226, 72, 118, 125 + Math.round(pulse * 95));
      g.strokeWeight(1.2);
      g.circle(px, py, 16 + pulse * 3);

      // Orbe poison sombre avec visage tête-de-mort toxique (yeux X vert acide)
      g.stroke(46, 18, 62);
      g.strokeWeight(1.5);
      g.fill(124, 52, 162);
      g.circle(px, py, 13);

      g.noStroke();
      // Petit reflet vert acide + tête de mort pixel (yeux + dents)
      g.fill(198, 255, 92);
      g.rect(px - 3, py - 2, 2, 2); // œil gauche
      g.rect(px + 1, py - 2, 2, 2); // œil droit
      g.fill(245, 252, 224);
      g.rect(px - 2, py + 2, 1, 2); // dents de crâne
      g.rect(px,     py + 2, 1, 2);
      g.rect(px + 2, py + 2, 1, 2);

      // Vapeurs / bulles toxiques vertes qui montent en continu
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.03 + this.phase + i * 0.33) % 1;
        const fx = Math.round(px + Math.sin(p * TWO_PI + i) * 5);
        const fy = Math.round(py - 5 - p * 10);
        const a = Math.round((1 - p) * 230);
        g.fill(182, 248, 88, a);
        g.circle(fx, fy, 3 - p * 1.5);
      }

      // Petit panneau d'alerte rouge "-1" qui clignote quand Onix s'approche
      if (this.headRef) {
        const dx = this.headRef.pos.x - this.pos.x;
        const dy = this.headRef.pos.y - this.pos.y;
        if (dx * dx + dy * dy < 54 * 54) {
          g.fill(245, 76, 98);
          g.rect(px - 5, py - 14, 3, 1); // "-"
          g.rect(px + 1, py - 16, 1, 5); // "1"
          g.rect(px,     py - 15, 1, 1);
        }
      }
      g.pop();
      return;
    }

    const bob = Math.sin(frameCount * 0.14 + this.phase) * 1.2;
    const py = Math.round(this.pos.y + bob);

    // 2. Boost Pokémon : Quick Ball (vitesse) ou Rare Candy (2x nourriture)
    if (this.type === 'blueberry' || this.type === 'double') {
      g.push();
      const isDouble = this.type === 'double';
      g.noFill();
      g.stroke(isDouble ? g.color(255, 210, 90, 200) : g.color(86, 198, 255, 200));
      g.strokeWeight(1.5);
      g.circle(px, py, 16 + Math.sin(frameCount * 0.2) * 2);

      if (isDouble) {
        // Rare Candy bleu ciel & doré (2x)
        g.stroke(64, 42, 74);
        g.strokeWeight(1);
        g.fill(132, 208, 252);
        g.rect(px - 4, py - 4, 8, 8, 2);
        g.fill(255, 236, 130);
        g.triangle(px - 7, py - 3, px - 7, py + 3, px - 4, py);
        g.triangle(px + 7, py - 3, px + 7, py + 3, px + 4, py);
        g.noStroke();
        g.fill(255, 255, 255);
        g.rect(px - 2, py - 2, 2, 2);
      } else {
        // Quick Ball (boost vitesse)
        g.stroke(48, 36, 58);
        g.strokeWeight(1);
        g.fill(78, 166, 246);
        g.arc(px, py, 11, 11, PI, TWO_PI, CHORD);
        g.fill(252, 250, 245);
        g.arc(px, py, 11, 11, 0, PI, CHORD);
        g.noStroke();
        g.fill(252, 222, 84);
        g.rect(px - 2, py - 5, 4, 3);
        g.fill(255);
        g.stroke(48, 36, 58);
        g.circle(px, py, 3.5);
      }
      g.pop();
      return;
    }

    // 3. Scorbunny fuyant (ou Shiny Scorbunny doré scintillant pour les points bonus !)
    if (this.isEvading) {
      g.noStroke();
      g.fill(255, 95, 110);
      g.rect(px - 1, py - 19, 2, 4);
      g.rect(px - 1, py - 14, 2, 1);
    }

    let row = 0;
    if (Math.abs(this.vel.x) > Math.abs(this.vel.y)) {
      row = this.vel.x < 0 ? 2 : 3;
    } else {
      row = this.vel.y < 0 ? 1 : 0;
    }
    const col = Math.floor(frameCount / 8 + this.phase) % 2;
    const isShiny = this.type === 'golden';
    const sheetPath = isShiny ? 'minigames/pokemoo/scorbunny_shiny.png' : 'minigames/pokemoo/scorbunny.png';
    const scImg = this.assets.getSheetFrame(sheetPath, 160, 160, col, row);
    if (scImg) {
      g.image(scImg, px - 13, py - 15, 26, 26);
    } else {
      g.noStroke();
      g.fill(isShiny ? g.color(255, 232, 120) : g.color(255, 240, 225));
      g.circle(px, py, 14);
    }

    // Petites étoiles scintillantes Pokémon autour du Shiny Scorbunny !
    if (isShiny) {
      g.push();
      g.noStroke();
      for (let s = 0; s < 3; s++) {
        const phase = frameCount * 0.11 + this.phase + s * 2.1;
        const tw = Math.sin(phase);
        if (tw > 0.05) {
          const sx = Math.round(px + Math.cos(s * 2.1 + frameCount * 0.03) * 12);
          const sy = Math.round(py - 2 + Math.sin(s * 2.1 + frameCount * 0.03) * 10);
          const a = Math.round(tw * 255);
          g.fill(255, 250, 175, a);
          g.rect(sx - 2, sy, 5, 1);
          g.rect(sx, sy - 2, 1, 5);
          g.fill(255, 255, 255, a);
          g.rect(sx, sy, 1, 1);
        }
      }
      g.pop();
    }

    if (Vehicle.debug) {
      g.push();
      g.noFill();
      g.stroke(this.isEvading ? g.color(255, 140, 80, 170) : g.color(255, 230, 110, 90));
      g.strokeWeight(1);
      g.circle(this.pos.x, this.pos.y, this.champDeVision * 2);
      g.pop();
      this.drawDebugVectors(g);
    }
  }
}
