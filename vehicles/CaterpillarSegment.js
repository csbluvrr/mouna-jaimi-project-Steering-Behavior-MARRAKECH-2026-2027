/**
 * Anneau (segment) du corps ou de la queue de la chenille (sous-classe de Vehicle).
 * Reprend la logique de l'exercice 3-Arrival : chaque anneau suit un point
 * situé à distance fixe (spacing) derrière l'anneau précédent via arrive(),
 * géré par son BehaviorManager.
 */
class CaterpillarSegment extends Vehicle {
  constructor(x, y, assets, isTail = false, index = 0) {
    super(x, y, 2.2, 0.35);
    this.assets = assets;
    this.isTail = isTail;
    this.index = index;
    this.r = isTail ? 5 : 6;
    this.rayonZoneDeFreinage = 18;
    this.targetPos = createVector(x, y);

    // Comportement arrive vers le point d'ancrage derrière le segment précédent
    this.behaviors.add('arrive', (v) => v.arrive(v.targetPos, 0), 1.0, true);
  }

  /**
   * Suit le segment précédent en maintenant un espacement régulier (spacing).
   * Combine le steering arrive() du cours avec un rappel doux pour éviter
   * que les perles de la chenille ne s'étirent trop dans les virages rapides.
   */
  follow(prevVehicle, spacing = 9) {
    const toMe = p5.Vector.sub(this.pos, prevVehicle.pos);
    const d = toMe.mag();

    if (d > 0.001) {
      toMe.setMag(spacing);
      this.targetPos.set(prevVehicle.pos.x + toMe.x, prevVehicle.pos.y + toMe.y);
    } else {
      this.targetPos.set(prevVehicle.pos.x - spacing, prevVehicle.pos.y);
    }

    this.maxSpeed = Math.max(2.0, prevVehicle.maxSpeed * 1.25);
    this.applyManagedBehaviors();
    this.update();

    // Contrainte souple pour garder les perles bien collées (style chenille)
    const afterVec = p5.Vector.sub(this.pos, prevVehicle.pos);
    const afterDist = afterVec.mag();
    if (afterDist > spacing * 1.15 && afterDist > 0.001) {
      afterVec.setMag(spacing);
      this.pos.set(prevVehicle.pos.x + afterVec.x, prevVehicle.pos.y + afterVec.y);
    }
  }

  show(g, colorName = 'green') {
    const file = this.isTail
      ? 'generated/snake/caterpillar_tail_' + colorName + '.png'
      : 'generated/snake/caterpillar_body_' + colorName + '.png';
    const img = this.assets.getImage(file);

    // Petit dandinement sinusoïdal mignon (sans redimensionner les sprites)
    const wiggle = Math.sin(frameCount * 0.22 - this.index * 0.7) * 1.0;
    const ox = Math.round(this.pos.x);
    const oy = Math.round(this.pos.y + wiggle);

    if (img) {
      g.image(img, ox - Math.floor(img.width / 2), oy - Math.floor(img.height / 2));
    } else {
      g.noStroke();
      g.fill(130, 210, 110);
      g.circle(ox, oy, this.r * 2);
    }
  }
}
