/**
 * Moo, le personnage principal contrôlé par le joueur dans le Hub.
 * Hérite de Vehicle (règle d'architecture du cours : tout objet animé est un Vehicle),
 * mais utilise un déplacement de personnage principal simple, réactif et naturel :
 * - Clavier (Flèches / WASD / ZQSD) : déplacement direct immédiat sans inertie gênante.
 * - Clic souris : marche directement vers le point cliqué (arrive simple sans évitement parasite).
 * - Glissement propre contre les obstacles solides du décor.
 */
class Moo extends Vehicle {
  constructor(x, y, assets) {
    super(x, y, 1.45, 0.25);
    this.assets = assets;
    this.r = 6;
    this.rayonZoneDeFreinage = 14;
    this.walkSpeed = 1.45;
    this.runSpeed = 2.55;

    this.targetPos = null;
    this.dir = 0; // Lignes du spritesheet : 0=bas, 1=gauche, 2=droite, 3=haut
    this.isMoving = false;
    this.isRunning = false;
    this.runDust = [];
  }

  /** Définit une destination cliquée à la souris. */
  setTarget(x, y) {
    this.targetPos = createVector(x, y);
  }

  /** Arrête immédiatement Moo. */
  stop() {
    this.targetPos = null;
    this.vel.set(0, 0);
    this.acc.set(0, 0);
    this.isMoving = false;
  }

  /**
   * Déplacement classique de personnage principal :
   * 1) Si une touche directionnelle est maintenue, déplacement direct immédiat.
   * 2) Sinon, si un point a été cliqué, marche directe jusqu'au point.
   */
  step(solids, walkBounds) {
    let kx = 0;
    let ky = 0;
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65) || keyIsDown(81)) kx -= 1;
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) kx += 1;
    if (keyIsDown(UP_ARROW) || keyIsDown(87) || keyIsDown(90)) ky -= 1;
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) ky += 1;

    // Maintenir SHIFT pour courir plus vite !
    const wantRun = keyIsDown(SHIFT);
    this.maxSpeed = wantRun ? this.runSpeed : this.walkSpeed;

    if (kx !== 0 || ky !== 0) {
      // Déplacement clavier direct (annule une éventuelle destination cliquée)
      this.targetPos = null;
      const len = Math.hypot(kx, ky);
      this.vel.set((kx / len) * this.maxSpeed, (ky / len) * this.maxSpeed);
    } else if (this.targetPos) {
      // Marche directe vers le point cliqué
      const dx = this.targetPos.x - this.pos.x;
      const dy = this.targetPos.y - this.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1.8) {
        this.stop();
      } else {
        const speed = dist < this.rayonZoneDeFreinage
          ? Math.max(0.45, this.maxSpeed * (dist / this.rayonZoneDeFreinage))
          : this.maxSpeed;
        this.vel.set((dx / dist) * speed, (dy / dist) * speed);
      }
    } else {
      // Aucune entrée -> arrêt net
      this.vel.set(0, 0);
    }

    if (this.vel.magSq() > 1e-4) {
      const [bx0, by0, bx1, by1] = walkBounds;
      const nx = constrain(this.pos.x + this.vel.x, bx0, bx1);
      const ny = constrain(this.pos.y + this.vel.y, by0, by1);

      let movedX = false;
      let movedY = false;

      if (!this.hitsSolid(nx, this.pos.y, solids)) {
        this.pos.x = nx;
        movedX = true;
      } else {
        this.vel.x = 0;
      }

      if (!this.hitsSolid(this.pos.x, ny, solids)) {
        this.pos.y = ny;
        movedY = true;
      } else {
        this.vel.y = 0;
      }

      // Si bloqué en marchant vers un clic, on s'arrête proprement
      if (this.targetPos && !movedX && !movedY) {
        this.stop();
        return;
      }

      // Orientation du sprite (haut / bas / gauche / droite)
      if (Math.abs(this.vel.x) > Math.abs(this.vel.y)) {
        this.dir = this.vel.x < 0 ? 1 : 2;
      } else if (Math.abs(this.vel.y) > 0.01) {
        this.dir = this.vel.y < 0 ? 3 : 0;
      }
      this.isMoving = movedX || movedY;
      this.isRunning = this.isMoving && wantRun;
    } else {
      this.isMoving = false;
      this.isRunning = false;
    }

    // Petits nuages de poussière mignons sous les pieds quand Moo court (Shift)
    if (this.isRunning && frameCount % 5 === 0) {
      this.runDust.push({
        x: this.pos.x - this.vel.x * 2 + random(-2, 2),
        y: this.pos.y - 1 + random(-1, 1),
        life: 14,
        maxLife: 14
      });
    }
    for (let i = this.runDust.length - 1; i >= 0; i--) {
      this.runDust[i].life--;
      this.runDust[i].y -= 0.12;
      if (this.runDust[i].life <= 0) this.runDust.splice(i, 1);
    }
  }

  hitsSolid(x, y, solids) {
    const bx = x - 6;
    const by = y - 4;
    const bw = 12;
    const bh = 5;
    for (let i = 0; i < solids.length; i++) {
      const [sx, sy, sw, sh] = solids[i];
      if (bx < sx + sw && bx + bw > sx && by < sy + sh && by + bh > sy) {
        return true;
      }
    }
    return false;
  }

  show(g, outfit = null) {
    // Cycle de marche adapté à better sprite.png (4x4 cellules 32x40) :
    // - Haut/Bas (lignes 0 et 3) : [2, 0, 3, 0]
    // - Gauche/Droite (lignes 1 et 2) : [1, 2, 3, 0]
    // - Repos : clignement d'yeux sur la ligne 0 (face)
    const walkCycle = (this.dir === 1 || this.dir === 2) ? [1, 2, 3, 0] : [2, 0, 3, 0];
    const animDiv = this.isRunning ? 4 : 7;
    const col = this.isMoving
      ? walkCycle[Math.floor(frameCount / animDiv) % 4]
      : (this.dir === 0 && Math.floor(frameCount / 90) % 4 === 3 ? 1 : 0);

    // Petits nuages de poussière de course derrière Moo
    if (this.runDust.length > 0) {
      g.push();
      g.noStroke();
      for (const d of this.runDust) {
        const a = Math.round((d.life / d.maxLife) * 180);
        g.fill(247, 238, 212, a);
        g.circle(Math.round(d.x), Math.round(d.y), 2 + (1 - d.life / d.maxLife) * 3);
      }
      g.pop();
    }

    const drawX = Math.round(this.pos.x) - 16;
    const drawY = Math.round(this.pos.y) - 40;

    // Dessin en 3 couches (behind -> Moo/hoodie -> over) exactement au même point
    const activeOutfit = outfit || (typeof game !== 'undefined' && game.save ? game.save.data.equippedOutfit : null);
    if (typeof CosmeticCatalog !== 'undefined') {
      CosmeticCatalog.drawMooWithOutfit(g, this.assets, activeOutfit, drawX, drawY, col, this.dir, 1);
    } else {
      const img = this.assets.getSheetFrame('sprites/moo/better sprite.png', 32, 40, col, this.dir);
      if (img) g.image(img, drawX, drawY);
    }

    // Petit repère discret au sol si on marche vers un clic
    if (this.targetPos) {
      g.push();
      g.noFill();
      g.stroke(247, 235, 170, 180);
      g.strokeWeight(1);
      g.ellipse(Math.round(this.targetPos.x), Math.round(this.targetPos.y), 6, 3);
      g.pop();
    }
  }
}
