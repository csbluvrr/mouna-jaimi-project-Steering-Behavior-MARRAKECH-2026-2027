/**
 * Prédateur de jardin (scarabée/guêpe affamé) pour Caterpillar Crawl (sous-classe de Vehicle).
 * Introduit à partir du niveau 3 : utilise BehaviorManager avec pursue(caterpillar) +
 * wander() + avoid(obstacles) + boundaries() pour traquer activement la chenille !
 */
class GardenPredator extends Vehicle {
  constructor(x, y, maxSpeed = 0.78, bounds = [14, 30, 452, 228]) {
    super(x, y, maxSpeed, 0.065);
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
    const ang = this.vel.magSq() > 0.01 ? this.vel.heading() : 0;
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.2 + this.phase);

    g.push();
    g.translate(px, py);

    // Halo rouge pulsant signalant le danger imminent
    g.noFill();
    g.stroke(235, 58, 68, 120 + Math.round(pulse * 110));
    g.strokeWeight(1.2);
    g.circle(0, 0, 16 + pulse * 3);

    g.rotate(ang);
    // Ailes battantes translucides
    const wingY = Math.sin(frameCount * 0.55 + this.phase) * 2;
    g.noStroke();
    g.fill(255, 240, 210, 185);
    g.ellipse(-2, -6 + wingY, 7, 4);
    g.ellipse(-2, 6 - wingY, 7, 4);

    // Carapace scarabée rouge-sombre + rayures dorées
    g.stroke(62, 22, 34);
    g.strokeWeight(1.2);
    g.fill(198, 44, 62);
    g.ellipse(0, 0, 13, 10);
    g.noStroke();
    g.fill(252, 206, 86);
    g.rect(-3, -4, 2, 8);
    g.rect(1, -3, 2, 6);

    // Mandibules affamées à l'avant
    const chomp = Math.sin(frameCount * 0.35 + this.phase) * 1.4;
    g.stroke(62, 22, 34);
    g.strokeWeight(1.4);
    g.line(5, -2, 9, -4 + chomp);
    g.line(5, 2, 9, 4 - chomp);

    // Yeux jaunes perçants
    g.noStroke();
    g.fill(255, 245, 130);
    g.rect(3, -3, 2, 2);
    g.rect(3, 1, 2, 2);
    g.pop();

    if (Vehicle.debug) {
      this.drawDebugVectors(g);
    }
  }
}
