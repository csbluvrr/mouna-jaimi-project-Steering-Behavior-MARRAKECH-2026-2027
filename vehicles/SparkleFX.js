/**
 * Petit effet visuel (étincelle, confetti ou texte flottant) héritant de Vehicle.
 * Conforme à l'architecture du cours : même les particules et textes animés
 * sont des sous-classes de Vehicle.
 */
class SparkleFX extends Vehicle {
  constructor(x, y, kind = 'sparkle', label = '', col = null) {
    super(x, y, 2.0, 0.1);
    this.kind = kind; // 'sparkle' | 'confetti' | 'text'
    this.label = label;
    this.col = col;
    this.maxLife = kind === 'text' ? 38 : (kind === 'confetti' ? 75 : 22);
    this.life = this.maxLife;
    this.isDead = false;

    if (kind === 'text') {
      this.vel.set(0, -0.55);
    } else if (kind === 'confetti') {
      this.vel = p5.Vector.random2D().mult(random(0.8, 2.4));
      this.vel.y -= 1.2;
      this.confettiIdx = Math.floor(random(6));
    } else {
      this.vel = p5.Vector.random2D().mult(random(0.4, 1.4));
    }
  }

  update() {
    if (this.kind === 'confetti') {
      this.acc.set(0, 0.04); // Gravité douce sur les confettis
    } else if (this.kind === 'sparkle') {
      this.vel.mult(0.92);
    }
    super.update();
    this.life--;
    if (this.life <= 0) this.isDead = true;
  }

  show(g, assets) {
    if (this.kind === 'text') {
      const alpha = map(this.life, 0, 14, 0, 255, true);
      if (assets.font) g.textFont(assets.font);
      g.textSize(14);
      g.textAlign(CENTER, CENTER);
      g.noStroke();
      g.fill(107, 75, 91, alpha);
      g.text(this.label, Math.round(this.pos.x) + 1, Math.round(this.pos.y) + 1);
      const c = this.col || g.color(247, 235, 170);
      g.fill(red(c), green(c), blue(c), alpha);
      g.text(this.label, Math.round(this.pos.x), Math.round(this.pos.y));
    } else if (this.kind === 'confetti') {
      const sheet = assets.getImage('fx/confetti_6colors_3x3.png');
      if (sheet) {
        const frame = assets.getSheetFrame('fx/confetti_6colors_3x3.png', 3, 3, this.confettiIdx, 0);
        if (frame) g.image(frame, Math.round(this.pos.x), Math.round(this.pos.y));
      } else {
        g.noStroke();
        g.fill(250, 220, 110);
        g.rect(Math.round(this.pos.x), Math.round(this.pos.y), 3, 3);
      }
    } else {
      const frameIdx = Math.min(3, Math.floor((1 - this.life / this.maxLife) * 4));
      const frame = assets.getSheetFrame('fx/sparkle_4frames_9x9.png', 9, 9, frameIdx, 0);
      if (frame) {
        g.image(frame, Math.round(this.pos.x) - 4, Math.round(this.pos.y) - 4);
      }
    }
  }
}
