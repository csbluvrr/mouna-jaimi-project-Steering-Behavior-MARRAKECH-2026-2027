/**
 * Caneton Boid pour le mini-jeu Duckling Herder (sous-classe de Vehicle).
 * Trois états gérés proprement via BehaviorManager :
 * 1) 'TEXT_INTRO' : arrive() sur un point de textToPoints ("3", "2", "1", "START!")
 * 2) 'FLOCK'      : align + cohesion + separation (règles Boids du cours)
 *                   + flee (bulle "shoo" de la souris et oie grognon)
 *                   + avoid (mare et clôtures) + boundaries
 *                   + wander (plus fort pour les canetons rebelles)
 *                   + arrive vers l'intérieur de l'enclos près de la porte
 * 3) 'IN_PEN'     : sautille joyeusement à l'abri dans l'enclos !
 */
class BoidDuckling extends Vehicle {
  constructor(x, y, assets, isRebel = false) {
    super(x, y, isRebel ? 1.45 : 1.35, 0.11);
    this.assets = assets;
    this.isRebel = isRebel;
    this.r = 5;
    this.perceptionRadius = 34;
    this.rayonZoneDeFreinage = 20;
    this.aheadScale = 14;

    this.mode = 'TEXT_INTRO'; // 'TEXT_INTRO' | 'FLOCK' | 'IN_PEN'
    this.textTarget = createVector(x, y);
    this.penCenter = createVector(415, 136);
    this.penRect = { x: 368, y: 84, w: 96, h: 108 };
    this.gateZone = { x: 344, y: 112, w: 32, h: 52 };

    // Références mises à jour à chaque frame
    this.flockRef = [];
    this.obstaclesRef = [];
    this.shooPos = createVector(-999, -999);
    this.shooRadius = 56;
    this.gooseRef = null;
    this.hopPhase = random(TWO_PI);

    this.vel = p5.Vector.random2D().mult(0.8);

    // Enregistrement de tous les comportements dans le BehaviorManager
    this.behaviors.add('textArrive', (v) => v.arrive(v.textTarget, 0), 1.6, true);
    this.behaviors.add('align', (v) => v.align(v.flockRef), isRebel ? 0.5 : 1.2, false);
    this.behaviors.add('cohesion', (v) => v.cohesion(v.flockRef), isRebel ? 0.3 : 1.0, false);
    this.behaviors.add('separation', (v) => v.separation(v.flockRef, 16), 1.5, false);
    this.behaviors.add('wander', (v) => v.wander(), isRebel ? 1.3 : 0.25, false);
    this.behaviors.add('fleeMouse', (v) => v.flee(v.shooPos, v.shooRadius), 2.8, false);
    this.behaviors.add('fleeGoose', (v) => {
      if (!v.gooseRef) return createVector(0, 0);
      return v.flee(v.gooseRef.pos, 46);
    }, 2.2, false);
    this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.5, false);
    this.behaviors.add('penArrive', (v) => {
      // Dès qu'un caneton s'approche de la porte ouverte, il rentre dans l'enclos
      const g = v.gateZone;
      if (v.pos.x > g.x && v.pos.x < g.x + g.w + 20 && v.pos.y > g.y && v.pos.y < g.y + g.h) {
        return v.arrive(v.penCenter, 0);
      }
      return createVector(0, 0);
    }, 2.4, false);
    this.behaviors.add('boundaries', (v) => v.boundaries(16, 30, 448, 226, 16), 2.2, false);
  }

  /** Passe en mode volée (Boids) après le compte à rebours textToPoints. */
  startFlockMode() {
    this.mode = 'FLOCK';
    this.maxSpeed = this.isRebel ? 1.45 : 1.35;
    this.maxForce = 0.11;
    this.vel = p5.Vector.random2D().mult(1.0);
    this.behaviors.deactivate('textArrive');
    this.behaviors.activate('align');
    this.behaviors.activate('cohesion');
    this.behaviors.activate('separation');
    this.behaviors.activate('wander');
    this.behaviors.activate('fleeMouse');
    this.behaviors.activate('fleeGoose');
    this.behaviors.activate('avoid');
    this.behaviors.activate('penArrive');
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
    this.behaviors.deactivate('penArrive');
    this.behaviors.deactivate('align');
    this.behaviors.deactivate('cohesion');
    this.behaviors.changeWeight('wander', 0.8);
    this.behaviors.changeWeight('separation', 1.2);
    this.behaviors.remove('boundaries');
    this.behaviors.add('boundaries', (v) => {
      const p = v.penRect;
      return v.boundaries(p.x + 8, p.y + 8, p.w - 16, p.h - 16, 8);
    }, 2.5, true);
  }

  step(ducklings, obstacles, shooPos, goose) {
    this.flockRef = ducklings.filter((d) => d.mode === this.mode);
    this.obstaclesRef = obstacles;
    this.shooPos = shooPos;
    this.gooseRef = goose;

    if (this.mode === 'TEXT_INTRO') {
      this.maxSpeed = 3.2;
      this.maxForce = 0.25;
      this.applyManagedBehaviors();
      this.update();
      return false;
    }

    this.applyManagedBehaviors();
    this.update();

    if (this.mode === 'FLOCK') {
      this.pos.x = constrain(this.pos.x, 14, 464);
      this.pos.y = constrain(this.pos.y, 30, 256);

      // Vérifie si le caneton est entré dans l'enclos par la porte
      const p = this.penRect;
      if (this.pos.x > p.x + 6 && this.pos.x < p.x + p.w - 4 && this.pos.y > p.y + 4 && this.pos.y < p.y + p.h - 4) {
        this.enterPen();
        return true; // Vient d'entrer dans l'enclos !
      }
    } else if (this.mode === 'IN_PEN') {
      const p = this.penRect;
      this.pos.x = constrain(this.pos.x, p.x + 8, p.x + p.w - 8);
      this.pos.y = constrain(this.pos.y, p.y + 8, p.y + p.h - 8);
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
