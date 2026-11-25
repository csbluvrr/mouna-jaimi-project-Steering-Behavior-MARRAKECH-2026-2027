/**
 * Bonus ramassable dans Fox Showdown (sous-classe de Vehicle, maxSpeed = 0).
 * Types : 'shield' (bloque le prochain coup), 'triple' (éventail de 3 carottes), 'heal' (+2 PV).
 * Moo ET le Renard font la course pour le récupérer (le Renard le cherche avec seek()).
 */
class PowerUp extends Vehicle {
  constructor(x, y, type, assets) {
    super(x, y, 0, 0);
    this.type = type; // 'shield' | 'triple' | 'heal'
    this.assets = assets;
    this.r = 9;
    this.phase = random(TWO_PI);
  }

  show(g) {
    const px = Math.round(this.pos.x);
    const py = Math.round(this.pos.y + Math.sin(frameCount * 0.1 + this.phase) * 1.5);

    const ringFile = Math.floor(frameCount / 16) % 2 === 0
      ? 'generated/fox/pickup_ring_0.png'
      : 'generated/fox/pickup_ring_1.png';
    const ring = this.assets.getImage(ringFile);
    if (ring) g.image(ring, px - Math.floor(ring.width / 2), py - Math.floor(ring.height / 2));

    const icon = this.assets.getImage('generated/fox/powerup_' + this.type + '.png');
    if (icon) {
      g.image(icon, px - Math.floor(icon.width / 2), py - Math.floor(icon.height / 2));
    }
  }
}
