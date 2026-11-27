/**
 * Papillon d'ambiance du Hub (sous-classe de Vehicle).
 * Combine 3 comportements via BehaviorManager :
 * - wander : vol léger et naturel au-dessus de la fête foraine
 * - flee : s'écarte vivement lorsque Moo passe tout près
 * - boundaries : reste dans le cadre visible du parc
 */
class HubButterfly extends Vehicle {
  constructor(x, y, assets) {
    super(x, y, random(0.45, 0.7), 0.05);
    this.assets = assets;
    this.vel = p5.Vector.random2D().mult(this.maxSpeed);
    this.distanceCercle = 18;
    this.wanderRadius = 9;
    this.displaceRange = 0.35;
    this.phase = random(TWO_PI);
    this.mooRef = null;

    this.behaviors.add('wander', (v) => v.wander(), 1.0, true);
    this.behaviors.add('flee', (v) => {
      if (!v.mooRef) return createVector(0, 0);
      return v.flee(v.mooRef.pos, 42);
    }, 2.5, true);
    this.behaviors.add('boundaries', (v) => v.boundaries(14, 78, 452, 168, 18), 2.0, true);
  }

  step(moo) {
    this.mooRef = moo;
    this.applyManagedBehaviors();
    this.update();
  }

  show(g) {
    const col = Math.floor(frameCount / 6 + this.phase) % 2;
    const img = this.assets.getSheetFrame('characters/animals/ambient/butterfly_2frames_12x10.png', 12, 10, col, 0);
    if (img) {
      const bob = Math.sin(frameCount * 0.12 + this.phase) * 1.5;
      g.image(img, Math.round(this.pos.x) - 6, Math.round(this.pos.y + bob) - 5);
    }
    this.drawDebugVectors(g);
  }
}
