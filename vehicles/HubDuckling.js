/**
 * Caneton d'ambiance autour de la mare du Hub (sous-classe de Vehicle).
 * Combine wander + separation + boundaries autour de la mare via BehaviorManager.
 */
class HubDuckling extends Vehicle {
  constructor(x, y, assets) {
    super(x, y, 0.35, 0.03);
    this.assets = assets;
    this.vel = p5.Vector.random2D().mult(0.2);
    this.distanceCercle = 14;
    this.wanderRadius = 7;
    this.displaceRange = 0.25;
    this.perceptionRadius = 22;
    this.flockRef = [];

    this.behaviors.add('wander', (v) => v.wander(), 0.9, true);
    this.behaviors.add('separation', (v) => v.separation(v.flockRef, 18), 1.4, true);
    this.behaviors.add('boundaries', (v) => v.boundaries(348, 200, 112, 46, 12), 2.5, true);
  }

  step(ducklings) {
    this.flockRef = ducklings;
    this.applyManagedBehaviors();
    this.update();
  }

  show(g) {
    const moving = this.vel.magSq() > 0.01;
    const col = moving ? 1 + (Math.floor(frameCount / 8) % 3) : 0;
    const img = this.assets.getSheetFrame('sprites/ducklings/duckling_sheet.png', 16, 16, col, 1);
    if (img) {
      g.push();
      g.translate(Math.round(this.pos.x), Math.round(this.pos.y) - 15);
      if (this.vel.x < 0) {
        g.scale(-1, 1);
        g.translate(-16, 0);
      }
      g.image(img, 0, 0);
      g.pop();
    }
    this.drawDebugVectors(g);
  }
}
