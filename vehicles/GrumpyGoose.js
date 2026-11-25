/**
 * Oie grognon patrouillant dans le pré (sous-classe de Vehicle).
 * Utilise BehaviorManager :
 * - pursue : poursuit le caneton libre le plus proche pour le disperser
 * - wander : patrouille calmement s'il n'y a aucun caneton proche
 * - avoid : évite la mare et l'enclos
 * - boundaries : reste dans le pré à gauche de l'enclos
 */
class GrumpyGoose extends Vehicle {
  constructor(x, y, assets) {
    super(x, y, 0.85, 0.06);
    this.assets = assets;
    this.r = 9;
    this.vel = p5.Vector.random2D().mult(0.6);
    this.targetDuckling = null;
    this.obstaclesRef = [];
    this.distanceCercle = 24;
    this.wanderRadius = 12;

    this.behaviors.add('pursue', (v) => {
      if (!v.targetDuckling) return createVector(0, 0);
      return v.pursue(v.targetDuckling, 8);
    }, 1.0, true);
    this.behaviors.add('wander', (v) => v.wander(), 0.8, true);
    this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.5, true);
    this.behaviors.add('boundaries', (v) => v.boundaries(22, 38, 315, 208, 18), 2.4, true);
  }

  step(ducklings, obstacles) {
    this.obstaclesRef = obstacles;

    // Cherche le caneton libre le plus proche dans un rayon de 95 px
    let closest = null;
    let bestD = 95;
    for (const d of ducklings) {
      if (d.mode !== 'FLOCK') continue;
      const distVal = p5.Vector.dist(this.pos, d.pos);
      if (distVal < bestD) {
        bestD = distVal;
        closest = d;
      }
    }
    this.targetDuckling = closest;

    this.applyManagedBehaviors();
    this.update();
    this.pos.x = constrain(this.pos.x, 22, 340);
    this.pos.y = constrain(this.pos.y, 38, 248);
  }

  show(g) {
    const col = Math.floor(frameCount / 12) % 2;
    const img = this.assets.getSheetFrame('generated/ducklings/goose_2frames_30x28.png', 30, 28, col, 0);

    g.push();
    g.translate(Math.round(this.pos.x), Math.round(this.pos.y));
    if (this.vel.x < -0.05) {
      g.scale(-1, 1);
    }
    if (img) {
      g.image(img, -15, -18);
    } else {
      g.noStroke();
      g.fill(245, 245, 245);
      g.circle(0, 0, 14);
    }
    g.pop();

    if (Vehicle.debug) {
      g.push();
      g.noFill();
      g.stroke(255, 160, 110, 140);
      g.strokeWeight(1);
      g.circle(this.pos.x, this.pos.y, 92);
      g.pop();
      this.drawDebugVectors(g);
    }
  }
}
