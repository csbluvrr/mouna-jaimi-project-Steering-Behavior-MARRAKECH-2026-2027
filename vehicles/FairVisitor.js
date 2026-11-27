/**
 * Visiteur / Mascotte animée du Hub (sous-classe de Vehicle).
 * Donne vie à la fête foraine avec les nouveaux assets :
 * - 'carrot'    : Mr. Carrot mascotte (mr.carrot by caoduy/carrot sprite sheet.png)
 * - 'girl'      : Visiteuse / vendeuse (FREE SAMPLE NPC Characters by antarcticbees/girl1_idle.png)
 * - 'new_bunny' : Nouveau lapin bondissant (Bunny/Bunny 1 16x16 animation.png)
 * - 'kid'       : Visiteur enfant 4 directions (sprites/npc/kid_4dir_sheet.png)
 * - 'fox_nap'   : Petit renard curieux/endormi (Fox Sprite Sheet.png)
 * Tous les déplacements passent par BehaviorManager (wander + separation + avoid + boundaries).
 */
class FairVisitor extends Vehicle {
  constructor(x, y, kind, assets, options = {}) {
    const stationary = Boolean(options.stationary);
    const speed = stationary ? 0 : (kind === 'new_bunny' ? 0.72 : (kind === 'carrot' ? 0.58 : 0.52));
    super(x, y, speed, stationary ? 0 : 0.045);

    this.kind = kind;
    this.assets = assets;
    this.stationary = stationary;
    this.r = 7;
    this.greeting = options.greeting || null;
    this.bounds = options.bounds || [24, 128, 432, 112];
    this.phase = random(TWO_PI);
    this.facingLeft = Boolean(options.facingLeft);
    this.dirRow = 0; // 0=bas, 1=gauche, 2=droite, 3=haut
    this.showBubble = false;

    this.othersRef = [];
    this.obstaclesRef = [];

    if (!stationary) {
      this.vel = p5.Vector.random2D().mult(speed * 0.7);
      this.behaviors.add('wander', (v) => v.wander(), 1.1, true);
      this.behaviors.add('separation', (v) => v.separation(v.othersRef, 22), 1.4, true);
      this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.0, true);
      this.behaviors.add('boundaries', (v) => {
        const [bx, by, bw, bh] = v.bounds;
        return v.boundaries(bx, by, bw, bh, 16);
      }, 2.2, true);
    }
  }

  step(moo, others, obstacles) {
    this.othersRef = others || [];
    this.obstaclesRef = obstacles || [];

    if (!this.stationary) {
      this.applyManagedBehaviors();
      this.update();

      const [bx, by, bw, bh] = this.bounds;
      this.pos.x = constrain(this.pos.x, bx, bx + bw);
      this.pos.y = constrain(this.pos.y, by, by + bh);

      if (Math.abs(this.vel.x) > 0.06) {
        this.facingLeft = this.vel.x < 0;
      }
      if (Math.abs(this.vel.x) > Math.abs(this.vel.y)) {
        this.dirRow = this.vel.x < 0 ? 1 : 2;
      } else if (Math.abs(this.vel.y) > 0.04) {
        this.dirRow = this.vel.y < 0 ? 3 : 0;
      }
    } else if (moo) {
      this.facingLeft = moo.pos.x < this.pos.x;
    }

    // Bulle de dialogue chaleureuse quand Moo passe tout près !
    if (moo && this.greeting) {
      const dx = moo.pos.x - this.pos.x;
      const dy = moo.pos.y - this.pos.y;
      this.showBubble = dx * dx + dy * dy < 38 * 38;
    } else {
      this.showBubble = false;
    }
  }

  show(g) {
    const px = Math.round(this.pos.x);
    const py = Math.round(this.pos.y);
    const moving = !this.stationary && this.vel.magSq() > 0.015;

    // Ombre douce au sol
    g.push();
    g.noStroke();
    g.fill(68, 96, 62, 75);
    g.ellipse(px, py - 1, 14, 5);
    g.pop();

    g.push();
    g.translate(px, py);

    if (this.kind === 'carrot') {
      // Mr. Carrot (352x224 = 11x7 cellules 32x32 ; row 2 = marche 7f, row 1 = danse 6f)
      const row = moving ? 2 : 1;
      const col = Math.floor(frameCount / 7 + this.phase) % (moving ? 7 : 6);
      const img = this.assets.getSheetFrame('mr.carrot by caoduy/carrot sprite sheet.png', 32, 32, col, row);
      if (this.facingLeft) g.scale(-1, 1);
      if (img) g.image(img, -16, -30);
    } else if (this.kind === 'girl') {
      // Visiteuse / vendeuse (girl1_idle.png = 32x32) avec léger rebond vivant
      const img = this.assets.getImage('FREE SAMPLE NPC Characters by antarcticbees/girl1_idle.png');
      const bob = Math.round(Math.sin(frameCount * 0.08 + this.phase) * 0.8);
      if (this.facingLeft) g.scale(-1, 1);
      if (img) g.image(img, -16, -30 + bob);
    } else if (this.kind === 'new_bunny') {
      // Nouveau lapin bondissant (Bunny 1 16x16 animation.png = 32x32 cellules)
      // row 4 = bond droite (6f), row 5 = bond gauche (6f), row 0 = repos (8f)
      const row = moving ? (this.facingLeft ? 5 : 4) : 0;
      const col = Math.floor(frameCount / 6 + this.phase) % (moving ? 6 : 8);
      const img = this.assets.getSheetFrame('Bunny/Bunny 1 16x16 animation.png', 32, 32, col, row);
      if (img) g.image(img, -16, -24);
    } else if (this.kind === 'fox_nap') {
      // Petit renard du nouveau Fox Sprite Sheet.png (32x32 ; row 5 = sieste 6f, row 0 = assis 5f)
      const row = this.showBubble ? 0 : 5;
      const col = Math.floor(frameCount / 12 + this.phase) % (this.showBubble ? 5 : 6);
      const img = this.assets.getSheetFrame('Fox Sprite Sheet.png', 32, 32, col, row);
      if (this.facingLeft) g.scale(-1, 1);
      if (img) g.image(img, -16, -26);
    } else {
      // Visiteur enfant (kid_4dir_sheet.png = 4x4 cellules 48x48)
      const col = moving ? Math.floor(frameCount / 9 + this.phase) % 4 : 0;
      const img = this.assets.getSheetFrame('sprites/npc/kid_4dir_sheet.png', 48, 48, col, this.dirRow);
      if (img) g.image(img, -24, -40);
    }

    g.pop();

    // Bulle de dialogue joyeuse quand Moo est à côté
    if (this.showBubble && this.greeting) {
      const bob = Math.sin(frameCount * 0.12) * 1.2;
      PixelUI.drawTag(g, this.assets.font, this.greeting, px, py - 34 + bob, g.color(255, 250, 224));
    }

    if (Vehicle.debug && !this.stationary) {
      this.drawDebugVectors(g);
    }
  }
}
