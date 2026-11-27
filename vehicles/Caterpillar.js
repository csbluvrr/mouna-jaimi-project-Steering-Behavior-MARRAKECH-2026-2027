/**
 * Chenille principale de Caterpillar Crawl (sous-classe de Vehicle).
 * Reprend exactement la logique du TP 3 (3-Arrival/snake.js) :
 * - Démarre avec 1 seul anneau (initialSegments = 1) et grandit à chaque fruit mangé.
 * - Mode hybride : Flèches / WASD / ZQSD (pilotage continu d'Euler sans demi-tour 180°)
 *   OU Souris (comportement arrive() via BehaviorManager).
 * - Règles classiques du Snake : collision avec les bords du jardin, auto-collision
 *   (à partir du 4e anneau) et collision avec les obstacles du niveau.
 */
class Caterpillar extends Vehicle {
  constructor(x, y, initialSegments = 1, assets = null, bounds = [14, 30, 452, 228]) {
    super(x, y, 1.5, 0.16);
    this.assets = assets;
    this.r = 6;
    this.rayonZoneDeFreinage = 26;
    this.spacing = 8;
    this.bounds = bounds;

    this.baseSpeed = 1.5;
    this.boostFrames = 0;

    // Virages instantanés au clavier par défaut (sans inertie molle),
    // désactivable dans le panneau debug [H] pour tester maxForce.
    this.instantTurn = true;

    // Mode de contrôle : 'KEYBOARD' (flèches par défaut, comme TP 3) ou 'MOUSE' (arrive)
    this.controlMode = 'KEYBOARD';
    this.direction = createVector(1, 0);
    this.vel = this.direction.copy().mult(this.baseSpeed);
    this.mouseTarget = createVector(x + 30, y);

    // Anneaux soudés derrière la tête (1 seul anneau au départ !)
    this.segments = [];
    this.buildBody(x, y, initialSegments);

    // Comportements enregistrés dans BehaviorManager
    this.behaviors.add('keyboardSteer', (v) => {
      const desired = v.direction.copy().setMag(v.maxSpeed);
      const steer = p5.Vector.sub(desired, v.vel);
      steer.limit(v.maxForce);
      return steer;
    }, 1.0, true);

    this.behaviors.add('mouseArrive', (v) => v.arrive(v.mouseTarget, 0), 1.0, false);
  }

  buildBody(x, y, count) {
    this.segments = [];
    for (let i = 0; i < count; i++) {
      const isTail = i === count - 1;
      this.segments.push(
        new CaterpillarSegment(x - (i + 1) * this.spacing, y, this.assets, isTail, i)
      );
    }
  }

  setControlMode(mode) {
    this.controlMode = mode;
    if (mode === 'MOUSE') {
      this.behaviors.deactivate('keyboardSteer');
      this.behaviors.activate('mouseArrive');
    } else {
      this.behaviors.deactivate('mouseArrive');
      this.behaviors.activate('keyboardSteer');
    }
  }

  /** Change la direction au clavier en bloquant le demi-tour instantané à 180°. */
  setDirection(dx, dy) {
    const newDir = createVector(dx, dy).normalize();
    if (this.direction.dot(newDir) >= -0.1) {
      this.direction = newDir;
      if (this.controlMode !== 'KEYBOARD') {
        this.setControlMode('KEYBOARD');
      }
    }
  }

  getRingCount() {
    return this.segments.length;
  }

  grow(count = 1) {
    for (let c = 0; c < count; c++) {
      const last = this.segments[this.segments.length - 1];
      const sx = last ? last.pos.x - this.spacing : this.pos.x - this.spacing;
      const sy = last ? last.pos.y : this.pos.y;
      if (last) {
        last.isTail = false;
        last.r = 5.5;
      }
      this.segments.push(
        new CaterpillarSegment(sx, sy, this.assets, true, this.segments.length)
      );
    }
  }

  /** Réduit la chenille d'un anneau ; renvoie true s'il ne reste plus aucun anneau. */
  shrink(count = 1) {
    for (let c = 0; c < count; c++) {
      if (this.segments.length <= 0) break;
      this.segments.pop();
    }
    if (this.segments.length > 0) {
      const last = this.segments[this.segments.length - 1];
      last.isTail = true;
      last.r = 4.5;
    }
    return this.segments.length === 0;
  }

  activateBoost(frames = 180) {
    this.boostFrames = Math.max(this.boostFrames, frames);
  }

  step(mx, my) {
    this.mouseTarget.set(
      constrain(mx, this.bounds[0], this.bounds[0] + this.bounds[2]),
      constrain(my, this.bounds[1], this.bounds[1] + this.bounds[3])
    );

    if (this.boostFrames > 0) {
      this.boostFrames--;
      this.maxSpeed = this.baseSpeed * 1.35;
    } else {
      this.maxSpeed = this.baseSpeed;
    }

    if (this.controlMode === 'KEYBOARD' && this.instantTurn) {
      // Mouvement direct et net au clavier par défaut (réactivité Snake classique)
      this.vel.set(this.direction.x * this.maxSpeed, this.direction.y * this.maxSpeed);
      this.acc.set(0, 0);
      this.pos.add(this.vel);
    } else {
      // Pilotage par force de steering (mode Souris arrive ou si Force Max activée en debug)
      this.applyManagedBehaviors();
      this.update();
    }

    // Suivi soudé des anneaux (identique à 3-Arrival/snake.js)
    for (let i = 0; i < this.segments.length; i++) {
      const prev = i === 0 ? this : this.segments[i - 1];
      this.segments[i].maxSpeed = this.maxSpeed * 1.25;
      this.segments[i].follow(prev, this.spacing);
    }
  }

  /** Collision mortelle avec la bordure en bois du jardin (comme TP 3). */
  checkWallCollision() {
    const [bx, by, bw, bh] = this.bounds;
    const margin = this.r * 0.7;
    return (
      this.pos.x - margin <= bx ||
      this.pos.x + margin >= bx + bw ||
      this.pos.y - margin <= by ||
      this.pos.y + margin >= by + bh
    );
  }

  /** Auto-collision : la tête touche un de ses anneaux (à partir du 4e, comme TP 3). */
  checkSelfCollision() {
    for (let i = 4; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const dx = this.pos.x - seg.pos.x;
      const dy = this.pos.y - seg.pos.y;
      const minD = this.r * 0.65 + seg.r * 0.65;
      if (dx * dx + dy * dy < minD * minD) {
        return true;
      }
    }
    return false;
  }

  /** Collision avec un obstacle rocheux/champignon du niveau (comme TP 3). */
  checkObstacleCollision(obstacles) {
    for (const obs of obstacles) {
      const dx = this.pos.x - obs.pos.x;
      const dy = this.pos.y - obs.pos.y;
      const minD = this.r * 0.75 + obs.r * 0.85;
      if (dx * dx + dy * dy < minD * minD) {
        return true;
      }
    }
    return false;
  }

  getActiveColor() {
    if (this.boostFrames > 0) return 'blue';
    return 'green';
  }

  show(g) {
    const colName = this.getActiveColor();

    // Ombres douces au sol sous chaque rocher d'Onix et sa tête
    g.noStroke();
    g.fill(58, 86, 56, 90);
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      g.ellipse(Math.round(seg.pos.x), Math.round(seg.pos.y) + 5, seg.r * 2.1, seg.r * 1.0);
    }
    g.ellipse(Math.round(this.pos.x), Math.round(this.pos.y) + 7, 16, 7);

    // Dessin de la queue vers la tête (rochers d'Onix)
    for (let i = this.segments.length - 1; i >= 0; i--) {
      this.segments[i].show(g, colName);
    }

    // Halo Pokémon si boost actif (vitesse Quick Ball ou Rare Candy 2x)
    const px = Math.round(this.pos.x);
    const py = Math.round(this.pos.y);
    if (this.boostFrames > 0) {
      g.noFill();
      g.stroke(96, 198, 255, 190);
      g.strokeWeight(1.5);
      g.circle(px, py, 22 + Math.sin(frameCount * 0.3) * 2);
    }

    const headImg = this.assets.getImage('generated/pokemon/onix_head.png');
    g.push();
    g.translate(px, py);
    if (this.vel.x < -0.1) {
      g.scale(-1, 1);
    }
    if (headImg) {
      g.image(headImg, -11, -12, 22, 22);
    } else {
      g.noStroke();
      g.fill(158, 158, 166);
      g.circle(0, 0, this.r * 2);
    }
    g.pop();

    if (Vehicle.debug) {
      if (this.controlMode === 'MOUSE') {
        g.push();
        g.noFill();
        g.stroke(255, 235, 130, 160);
        g.strokeWeight(1);
        g.circle(this.mouseTarget.x, this.mouseTarget.y, this.rayonZoneDeFreinage * 2);
        g.pop();
      }
      this.drawDebugVectors(g);
    }
  }
}
