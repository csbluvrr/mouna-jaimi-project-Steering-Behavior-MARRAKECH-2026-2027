/**
 * Caneton Boid pour le mini-jeu Duckling Herder (sous-classe de Vehicle).
 * Trois états gérés proprement via BehaviorManager :
 * 1) 'TEXT_INTRO' : arrive() rapide sur un point de textToPoints ("3", "2", "1", "GO!")
 * 2) 'FLOCK'      : align + cohesion + separation (règles Boids du cours)
 *                   + flee (bulle "shoo" de la souris et oie grognon)
 *                   + avoid (mare et clôtures) + boundaries + wander
 *                   + murs physiques stricts autour de l'enclos (entrée UNIQUEMENT par la porte !)
 * 3) 'IN_PEN'     : sautille joyeusement à l'abri dans l'enclos !
 */
class BoidDuckling extends Vehicle {
  constructor(x, y, assets, isRebel = false) {
    super(x, y, isRebel ? 1.55 : 1.40, 0.12);
    this.assets = assets;
    this.isRebel = isRebel;
    this.r = 5;
    this.perceptionRadius = 34;
    this.rayonZoneDeFreinage = 14;
    this.aheadScale = 14;

    this.mode = 'TEXT_INTRO'; // 'TEXT_INTRO' | 'FLOCK' | 'IN_PEN'
    this.textTarget = createVector(x, y);
    this.penRect = { x: 368, y: 84, w: 96, h: 108 };
    this.gateY0 = this.penRect.y + 30; // 114
    this.gateY1 = this.penRect.y + 78; // 162

    // Références mises à jour à chaque frame
    this.flockRef = [];
    this.obstaclesRef = [];
    this.shooPos = createVector(-999, -999);
    this.shooRadius = 60;
    this.gooseRef = null;
    this.hopPhase = random(TWO_PI);

    this.vel = p5.Vector.random2D().mult(0.8);

    // Enregistrement de tous les comportements dans le BehaviorManager
    this.behaviors.add('textArrive', (v) => v.arrive(v.textTarget, 0), 2.2, true);
    this.behaviors.add('align', (v) => v.align(v.flockRef), isRebel ? 0.45 : 1.15, false);
    this.behaviors.add('cohesion', (v) => v.cohesion(v.flockRef), isRebel ? 0.25 : 0.95, false);
    this.behaviors.add('separation', (v) => v.separation(v.flockRef, 16), 1.55, false);
    this.behaviors.add('wander', (v) => v.wander(), isRebel ? 1.45 : 0.45, false);
    this.behaviors.add('fleeMouse', (v) => v.flee(v.shooPos, v.shooRadius), 3.1, false);
    this.behaviors.add('fleeGoose', (v) => {
      if (!v.gooseRef) return createVector(0, 0);
      return v.flee(v.gooseRef.pos, 48);
    }, 2.3, false);
    this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.4, false);
    // Légère tendance à rester dans la prairie ouverte (évite qu'ils rentrent tout seuls sans être guidés !)
    this.behaviors.add('meadowBias', (v) => {
      const distMouseSq = (v.pos.x - v.shooPos.x) ** 2 + (v.pos.y - v.shooPos.y) ** 2;
      // Si la souris est en train de les guider activement, on n'interfère pas
      if (distMouseSq < (v.shooRadius + 18) ** 2) return createVector(0, 0);
      if (v.pos.x > 330) {
        return createVector(-v.maxForce * 0.55, 0);
      }
      return createVector(0, 0);
    }, 1.0, false);
    this.behaviors.add('boundaries', (v) => v.boundaries(16, 30, 448, 226, 16), 2.2, false);
  }

  /** Passe en mode volée (Boids) après le compte à rebours textToPoints. */
  startFlockMode() {
    this.mode = 'FLOCK';
    this.maxSpeed = this.isRebel ? 1.55 : 1.40;
    this.maxForce = 0.12;
    // Élan initial vers la gauche/centre du pré pour ne jamais tomber passivement dans l'enclos
    const ang = random(PI * 0.55, PI * 1.45);
    this.vel.set(Math.cos(ang) * 1.15, Math.sin(ang) * 1.15);

    this.behaviors.deactivate('textArrive');
    this.behaviors.activate('align');
    this.behaviors.activate('cohesion');
    this.behaviors.activate('separation');
    this.behaviors.activate('wander');
    this.behaviors.activate('fleeMouse');
    this.behaviors.activate('fleeGoose');
    this.behaviors.activate('avoid');
    this.behaviors.activate('meadowBias');
    this.behaviors.activate('boundaries');
  }

  /** Passe en mode sécurisé dans l'enclos (sautillements joyeux). */
  enterPen() {
    this.mode = 'IN_PEN';
    this.maxSpeed = 0.45;
    this.maxForce = 0.04;
    this.behaviors.deactivate('fleeMouse');
    this.behaviors.deactivate('fleeGoose');
    this.behaviors.deactivate('avoid');
    this.behaviors.deactivate('meadowBias');
    this.behaviors.deactivate('align');
    this.behaviors.deactivate('cohesion');
    this.behaviors.changeWeight('wander', 0.8);
    this.behaviors.changeWeight('separation', 1.2);
    this.behaviors.remove('boundaries');
    this.behaviors.add('boundaries', (v) => {
      const p = v.penRect;
      return v.boundaries(p.x + 10, p.y + 10, p.w - 20, p.h - 20, 8);
    }, 2.5, true);
  }

  /**
   * Collision physique stricte avec les 4 murs de l'enclos :
   * les canetons ne peuvent JAMAIS traverser les clôtures haut/bas/droite/coins gauches ;
   * ils doivent impérativement passer par l'ouverture de la porte à gauche [gateY0..gateY1] !
   */
  resolvePenWalls(prevX, prevY) {
    const p = this.penRect;
    const pad = this.r + 2;
    const left = p.x - pad;
    const right = p.x + p.w + pad;
    const top = p.y - pad;
    const bottom = p.y + p.h + pad;

    // Est-ce que le caneton vient d'entrer proprement par l'ouverture de la porte gauche ?
    const inGateY = this.pos.y >= this.gateY0 + 2 && this.pos.y <= this.gateY1 - 2;
    if (inGateY && prevX <= p.x + 4 && this.pos.x > p.x + 4) {
      // Poussée douce à l'intérieur pour bien franchir le seuil
      this.pos.x = Math.max(this.pos.x, p.x + 10);
      this.enterPen();
      return true;
    }

    // Sinon, bloquer strictement tout franchissement des murs de l'enclos !
    if (this.pos.x > left && this.pos.x < right && this.pos.y > top && this.pos.y < bottom) {
      if (prevY <= top) {
        // Mur du haut
        this.pos.y = top;
        this.vel.y = -Math.abs(this.vel.y) * 0.7;
      } else if (prevY >= bottom) {
        // Mur du bas
        this.pos.y = bottom;
        this.vel.y = Math.abs(this.vel.y) * 0.7;
      } else if (prevX >= right) {
        // Mur de droite
        this.pos.x = right;
        this.vel.x = Math.abs(this.vel.x) * 0.7;
      } else {
        // Mur gauche (parties pleines au-dessus et en dessous de la porte)
        if (!inGateY) {
          this.pos.x = left;
          this.vel.x = -Math.abs(this.vel.x) * 0.7;
        }
      }
    }
    return false;
  }

  step(ducklings, obstacles, shooPos, goose) {
    this.flockRef = ducklings.filter((d) => d.mode === this.mode);
    this.obstaclesRef = obstacles;
    this.shooPos = shooPos;
    this.gooseRef = goose;

    if (this.mode === 'TEXT_INTRO') {
      this.maxSpeed = 4.6;
      this.maxForce = 0.42;
      this.applyManagedBehaviors();
      this.update();
      return false;
    }

    const prevX = this.pos.x;
    const prevY = this.pos.y;

    this.applyManagedBehaviors();
    this.update();

    if (this.mode === 'FLOCK') {
      this.pos.x = constrain(this.pos.x, 14, 464);
      this.pos.y = constrain(this.pos.y, 30, 256);
      return this.resolvePenWalls(prevX, prevY);
    } else if (this.mode === 'IN_PEN') {
      const p = this.penRect;
      this.pos.x = constrain(this.pos.x, p.x + 10, p.x + p.w - 10);
      this.pos.y = constrain(this.pos.y, p.y + 10, p.y + p.h - 10);
    }

    return false;
  }

  show(g) {
    const moving = this.vel.magSq() > 0.02;
    const col = moving ? 1 + (Math.floor(frameCount / 7) % 3) : 0;
    const img = this.assets.getSheetFrame('sprites/ducklings/duckling_sheet.png', 16, 16, col, 1);

    const hop = this.mode === 'IN_PEN'
      ? Math.abs(Math.sin(frameCount * 0.16 + this.hopPhase)) * -3.5
      : 0;

    g.push();
    g.translate(Math.round(this.pos.x), Math.round(this.pos.y + hop) - 10);
    if (this.vel.x < -0.05) {
      g.scale(-1, 1);
    }
    if (img) {
      g.image(img, -8, -6);
    } else {
      g.noStroke();
      g.fill(255, 224, 90);
      g.circle(0, 0, 8);
    }

    // Petit signe rebelle discret au-dessus des canetons rebelles
    if (this.isRebel && this.mode === 'FLOCK') {
      g.noStroke();
      g.fill(235, 110, 130);
      g.rect(-1, -10, 2, 2);
    }
    g.pop();

    if (Vehicle.debug && this.mode === 'FLOCK') {
      this.drawDebugVectors(g);
    }
  }
}
