/**
 * Obstacle circulaire fixe (sous-classe de Vehicle avec maxSpeed = 0).
 * Conforme à la règle d'architecture du cours : même les éléments fixes
 * héritent de Vehicle pour unifier la détection de collision et avoid().
 */
class Obstacle extends Vehicle {
  constructor(x, y, r, label = '') {
    super(x, y, 0, 0);
    this.r = r;
    this.label = label;
  }

  /**
   * Convertit une boîte rectangulaire [sx, sy, sw, sh] de hub_layout.json
   * en un (ou plusieurs) Obstacle(s) circulaire(s) pour avoid().
   */
  static fromRect(sx, sy, sw, sh, label = '') {
    const list = [];
    // Si le rectangle est très large (ex: stand ou barrière), on le découpe
    // en cercles côte à côte pour un évitement précis sans faux blocages.
    if (sw > sh * 1.8) {
      const r = Math.max(4, sh * 0.55);
      const count = Math.max(2, Math.round(sw / (r * 1.6)));
      const step = sw / count;
      for (let i = 0; i < count; i++) {
        list.push(new Obstacle(sx + step * (i + 0.5), sy + sh * 0.5, r, label));
      }
    } else {
      const r = Math.max(4, Math.min(sw, sh) * 0.55);
      list.push(new Obstacle(sx + sw * 0.5, sy + sh * 0.5, r, label));
    }
    return list;
  }

  showDebug(g) {
    if (!Vehicle.debug) return;
    g.push();
    g.noFill();
    g.stroke(255, 90, 90, 170);
    g.strokeWeight(1);
    g.circle(this.pos.x, this.pos.y, this.r * 2);
    g.pop();
  }
}
