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
    const zBase = 'minigames/legend_of_moo/zelda/';
    const img = this.assets
      ? this.assets.getImage(
          this.owner === 'moo'
            ? zBase + 'Zink/PNG/sprWeaponBoomerang.png'
            : zBase + 'Enemies/PNG/sprFireBall.png'
        )
      : null;

    g.push();
    g.translate(Math.round(this.pos.x), Math.round(this.pos.y));
    if (this.homing) {
      // Halo magique violet sur les boules de feu chercheuses
      g.noFill();
      g.stroke(210, 140, 255, 190);
      g.strokeWeight(1.2);
      g.circle(0, 0, 14);
    }
    if (this.owner === 'moo') {
      // Boomerang Zelda qui tourne rapidement sur lui-même !
      g.rotate(frameCount * 0.45);
      if (img) {
        const fw = Math.min(img.width, img.height);
        g.image(img, -7, -7, 14, 14, 0, 0, fw, fw);
      } else {
        g.noStroke();
        g.fill(252, 214, 92);
        g.circle(0, 0, 7);
      }
    } else {
      g.rotate(this.vel.heading());
      if (img) {
        const fw = Math.min(img.width, img.height);
        const col = Math.floor(frameCount / 5) % Math.max(1, Math.floor(img.width / fw));
        g.image(img, -7, -7, 14, 14, col * fw, 0, fw, fw);
      } else {
        g.noStroke();
        g.fill(255, 120, 65);
        g.circle(0, 0, 7);
      }
    }
    g.pop();
  }
}
