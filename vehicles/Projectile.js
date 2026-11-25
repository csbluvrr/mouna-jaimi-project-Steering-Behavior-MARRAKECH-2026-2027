/**
 * Projectile du duel Fox Showdown (sous-classe de Vehicle).
 * - 'carrot' (lancé par Moo) : vole en ligne droite à bonne vitesse.
 * - 'acorn'  (lancé par le Renard) : lent, avec variante légèrement chercheuse
 *   (seek avec très faible maxForce pour rester esquivable !).
 */
class Projectile extends Vehicle {
  constructor(x, y, dirVec, owner, homing = false, assets = null) {
    const speed = owner === 'moo' ? 3.2 : 1.75;
    const force = homing ? 0.035 : 0;
    super(x, y, speed, force);

    this.owner = owner; // 'moo' | 'fox'
    this.homing = homing;
    this.assets = assets;
    this.r = 4;
    this.vel = dirVec.copy().setMag(speed);
    this.life = owner === 'moo' ? 120 : 180;
    this.isDead = false;
    this.targetRef = null;

    if (homing) {
      this.behaviors.add('seek', (v) => {
        if (!v.targetRef) return createVector(0, 0);
        return v.seek(v.targetRef.pos);
      }, 1.0, true);
    }
  }

  step(target, obstacles) {
    if (this.homing && target) {
      this.targetRef = target;
      this.applyManagedBehaviors();
    }
    this.update();

    this.life--;
    if (this.life <= 0 || this.pos.x < 10 || this.pos.x > 470 || this.pos.y < 26 || this.pos.y > 262) {
      this.isDead = true;
      return;
    }

    // Bloqué par les stands et caisses de la scène (permet de se mettre à couvert)
    for (const obs of obstacles) {
      if (p5.Vector.dist(this.pos, obs.pos) < obs.r + this.r) {
        this.isDead = true;
        return;
      }
    }
  }

  show(g) {
    const file = this.owner === 'moo'
      ? 'generated/fox/projectile_carrot.png'
      : 'generated/fox/projectile_acorn.png';
    const img = this.assets ? this.assets.getImage(file) : null;

    g.push();
    g.translate(Math.round(this.pos.x), Math.round(this.pos.y));
    if (this.homing) {
      // Halo discret violet sur les glands chercheurs
      g.noFill();
      g.stroke(210, 140, 235, 170);
      g.strokeWeight(1);
      g.circle(0, 0, 11);
    }
    g.rotate(this.vel.heading());
    if (img) {
      g.image(img, -Math.floor(img.width / 2), -Math.floor(img.height / 2));
    } else {
      g.noStroke();
      g.fill(this.owner === 'moo' ? color(250, 145, 65) : color(165, 115, 75));
      g.circle(0, 0, 6);
    }
    g.pop();
  }
}
