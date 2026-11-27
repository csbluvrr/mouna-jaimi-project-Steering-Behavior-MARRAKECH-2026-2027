/**
 * Prédateur de jardin (scarabée/guêpe affamé) pour Caterpillar Crawl (sous-classe de Vehicle).
 * Introduit à partir du niveau 3 : utilise BehaviorManager avec pursue(caterpillar) +
 * wander() + avoid(obstacles) + boundaries() pour traquer activement la chenille !
 */
class GardenPredator extends Vehicle {
  constructor(x, y, maxSpeed = 0.78, bounds = [14, 30, 452, 228], assets = null) {
    super(x, y, maxSpeed, 0.065);
    this.assets = assets;
    this.bounds = bounds;
    this.r = 7;
    this.aheadScale = 14;
    this.phase = random(TWO_PI);
    this.targetRef = null;
    this.obstaclesRef = [];
    this.vel = p5.Vector.random2D().mult(maxSpeed * 0.6);

    // Comportements gérés par BehaviorManager (100% Steering Behaviors)
    this.behaviors.add('pursue', (v) => {
      if (!v.targetRef) return createVector(0, 0);
      return v.pursue(v.targetRef, 8);
    }, 1.45, true);
    this.behaviors.add('wander', (v) => v.wander(), 0.35, true);
    this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.1, true);
    this.behaviors.add('boundaries', (v) => {
      const [bx, by, bw, bh] = v.bounds;
      return v.boundaries(bx + 12, by + 12, bw - 24, bh - 24, 14);
    }, 2.2, true);
  }

  step(caterpillar, obstacles) {
    this.targetRef = caterpillar;
    this.obstaclesRef = obstacles || [];
    this.applyManagedBehaviors();
    this.update();

    const [bx, by, bw, bh] = this.bounds;
    this.pos.x = constrain(this.pos.x, bx + 10, bx + bw - 10);
    this.pos.y = constrain(this.pos.y, by + 10, by + bh - 10);
  }

  /** Vérifie si le prédateur a attrapé la tête de la chenille. */
  catches(caterpillar) {
    if (!caterpillar) return false;
    const dx = this.pos.x - caterpillar.pos.x;
    const dy = this.pos.y - caterpillar.pos.y;
    const hitR = this.r + caterpillar.r - 1;
    return dx * dx + dy * dy < hitR * hitR;
  }

  show(g) {
    const px = Math.round(this.pos.x);
    const py = Math.round(this.pos.y);
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.18 + this.phase);

    g.push();
    // Aura fantôme violette de Gengar + ombre
    g.noStroke();
    g.fill(92, 48, 138, 85);
    g.ellipse(px, py + 7, 16, 6);
    g.noFill();
    g.stroke(176, 86, 232, 120 + Math.round(pulse * 110));
    g.strokeWeight(1.2);
    g.circle(px, py, 18 + pulse * 3);

    // Gengar animé (gengar.png : 4x4 cellules 64x64 -> row 0=bas, 1=gauche, 2=droite, 3=haut)
    let row = 0;
    if (Math.abs(this.vel.x) > Math.abs(this.vel.y)) {
      row = this.vel.x < 0 ? 1 : 2;
    } else {
      row = this.vel.y < 0 ? 3 : 0;
    }
    const col = Math.floor(frameCount / 7 + this.phase) % 4;
    const gImg = this.assets ? this.assets.getSheetFrame('minigames/pokemoo/gengar.png', 64, 64, col, row) : null;
    const floatY = Math.round(Math.sin(frameCount * 0.14 + this.phase) * 1.5);
    if (gImg) {
      g.image(gImg, px - 12, py - 13 + floatY, 24, 24);
    } else {
      g.noStroke();
      g.fill(128, 72, 178);
      g.circle(px, py, 14);
    }
    g.pop();

    if (Vehicle.debug) {
      this.drawDebugVectors(g);
    }
  }
}
