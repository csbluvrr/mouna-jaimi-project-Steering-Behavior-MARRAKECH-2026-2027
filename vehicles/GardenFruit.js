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

    // Coordonnées (col, row) dans items/plants_items.png (grille 16x16)
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

    // Comportements gérés par BehaviorManager
    this.behaviors.add('evade', (v) => {
      if (!v.headRef || !v.isEvading) return createVector(0, 0);
      return v.evade(v.headRef, 10);
    }, 1.3, true);
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
    // Un fruit pourri ne bouge jamais
    if (this.type === 'rotten') return false;

    this.headRef = head;
    this.obstaclesRef = obstacles;
    this.normalSpeed = this.type === 'shy' ? vNorm * 1.15 : vNorm;
    this.evadeSpeed = this.type === 'shy' ? vEvade * 1.15 : vEvade;
    this.champDeVision = vision;

    const wasEvading = this.isEvading;
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

    this.applyManagedBehaviors();
    this.update();
    this.containAndBounce(obstacles);

    return !wasEvading && this.isEvading;
  }

  show(g) {
    const px = Math.round(this.pos.x);

    // Rendu spécial bien reconnaissable pour les fruits pourris immobiles
    if (this.type === 'rotten') {
      const py = Math.round(this.pos.y);

      // Halo toxique olive/violet au sol
      g.noStroke();
      g.fill(118, 128, 66, 95);
      g.ellipse(px, py + 4, 16, 8);

      // Sprite de baie teinté marron-olive pourri
      const img = this.assets.getSheetFrame('items/plants_items.png', 16, 16, this.cell[0], this.cell[1]);
      if (img) {
        g.push();
        g.tint(148, 138, 86);
        g.image(img, px - 8, py - 8);
        g.noTint();
        g.pop();
      }

      // Petites lignes d'odeur ondulantes + 2 moucherons qui tournent autour
      g.stroke(140, 165, 78, 190);
      g.strokeWeight(1);
      const sway = Math.sin(frameCount * 0.14 + this.phase) * 1.5;
      g.line(px - 3, py - 7, Math.round(px - 3 + sway), py - 11);
      g.line(px + 3, py - 8, Math.round(px + 3 - sway), py - 12);

      g.noStroke();
      g.fill(58, 42, 62);
      const a1 = frameCount * 0.12 + this.phase;
      const a2 = -frameCount * 0.15 + this.phase + 2;
      g.rect(Math.round(px + Math.cos(a1) * 7), Math.round(py - 4 + Math.sin(a1) * 4), 2, 2);
      g.rect(Math.round(px + Math.cos(a2) * 6), Math.round(py - 5 + Math.sin(a2) * 3), 1, 1);
      return;
    }

    const bob = Math.sin(frameCount * 0.12 + this.phase) * 1.2;
    const py = Math.round(this.pos.y + bob);

    if (this.type === 'golden') {
      g.noFill();
      g.stroke(255, 232, 110, 175);
      g.strokeWeight(1);
      g.circle(px, py, 16);
    }

    // Petit '!' quand le fruit détecte la chenille et s'évade !
    if (this.isEvading) {
      g.noStroke();
      g.fill(255, 115, 135);
      g.rect(px - 1, py - 12, 2, 4);
      g.rect(px - 1, py - 7, 2, 1);
    }

    const img = this.assets.getSheetFrame('items/plants_items.png', 16, 16, this.cell[0], this.cell[1]);
    if (img) {
      g.image(img, px - 8, py - 8);
    }

    if (Vehicle.debug) {
      g.push();
      g.noFill();
      g.stroke(this.isEvading ? color(255, 140, 80, 170) : color(255, 230, 110, 90));
      g.strokeWeight(1);
      g.circle(this.pos.x, this.pos.y, this.champDeVision * 2);
      g.pop();
      this.drawDebugVectors(g);
    }
  }
}
