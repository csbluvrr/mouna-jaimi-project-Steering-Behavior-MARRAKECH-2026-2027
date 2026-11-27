/**
 * Anneau (segment) du corps ou de la queue de la chenille (sous-classe de Vehicle).
 * Reprend exactement la logique cinématique soudée de 3-Arrival/snakeSegment.js :
 * chaque anneau reste collé à une distance fixe (spacing) derrière le précédent
 * sans jamais s'étirer ou se détacher dans les virages serrés.
 */
class CaterpillarSegment extends Vehicle {
  constructor(x, y, assets, isTail = false, index = 0) {
    super(x, y, 2.2, 0.35);
    this.assets = assets;
    this.isTail = isTail;
    this.index = index;
    this.r = isTail ? 4.5 : 5.5;
    this.currentHeading = 0;
  }

  /**
   * Liaison cinématique rigide et collée à l'anneau précédent (identique à 3-Arrival).
   */
  follow(prevVehicle, spacing = 8) {
    const dir = p5.Vector.sub(prevVehicle.pos, this.pos);
    const currentDist = dir.mag();

    if (currentDist > 0.001) {
      this.currentHeading = dir.heading();
    }

    // Contrainte de distance directe : aucun étirement élastique mou
    if (currentDist > spacing) {
      const pull = p5.Vector.sub(prevVehicle.pos, dir.copy().setMag(spacing));
      this.pos.set(pull);
    }

    // Vitesse alignée avec le déplacement pour cohérence Vehicle
    this.vel = p5.Vector.sub(prevVehicle.pos, this.pos);
    this.vel.limit(this.maxSpeed);
  }

  show(g, colorName = 'green') {
    const file = this.isTail
      ? 'minigames/pokemoo/onix_tail.png'
      : 'minigames/pokemoo/onix_rock.png';
    const img = this.assets.getImage(file);

    const wiggle = Math.sin(frameCount * 0.2 - this.index * 0.65) * 0.6;
    const ox = Math.round(this.pos.x);
    const oy = Math.round(this.pos.y + wiggle);

    if (img) {
      g.image(img, ox - Math.floor(img.width / 2), oy - Math.floor(img.height / 2));
    } else {
      g.noStroke();
      g.fill(152, 152, 160);
      g.circle(ox, oy, this.r * 2);
    }
  }
}
