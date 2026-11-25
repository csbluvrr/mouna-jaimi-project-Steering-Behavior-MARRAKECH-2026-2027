/**
 * Chenille principale du mini-jeu Caterpillar Crawl (sous-classe de Vehicle).
 * Reprend directement l'architecture du Snake de 3-Arrival :
 * - La tête (this) utilise BehaviorManager : arrive(souris) + avoid(obstacles) + boundaries.
 * - Les segments (CaterpillarSegment extends Vehicle) suivent en chaîne avec arrive().
 */
class Caterpillar extends Vehicle {
  constructor(x, y, initialSegments, assets) {
    super(x, y, 1.85, 0.16);
    this.assets = assets;
    this.r = 7;
    this.rayonZoneDeFreinage = 28;
    this.aheadScale = 18;
    this.spacing = 9;

    this.baseSpeed = 1.85;
    this.boostFrames = 0;
    this.bonkCooldown = 0;

    this.mouseTarget = createVector(x + 20, y);
    this.obstaclesRef = [];
    this.bounds = [14, 30, 452, 228];

    // Chaîne des anneaux derrière la tête
    this.segments = [];
    for (let i = 0; i < initialSegments; i++) {
      const isTail = i === initialSegments - 1;
      this.segments.push(
        new CaterpillarSegment(x - (i + 1) * this.spacing, y, assets, isTail, i)
      );
    }

    // Enregistrement des comportements de la tête dans BehaviorManager
    this.behaviors.add('arrive', (v) => v.arrive(v.mouseTarget, 0), 1.0, true);
    this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.3, true);
    this.behaviors.add('boundaries', (v) => {
      const [bx, by, bw, bh] = v.bounds;
      return v.boundaries(bx, by, bw, bh, 12);
    }, 2.0, true);
  }

  /** Longueur totale (tête + segments). */
  getLength() {
    return 1 + this.segments.length;
  }

  /** Ajoute n segments à la chenille (et met à jour la queue). */
  grow(count = 1) {
    for (let c = 0; c < count; c++) {
      const last = this.segments[this.segments.length - 1];
      const sx = last ? last.pos.x - this.spacing : this.pos.x - this.spacing;
      const sy = last ? last.pos.y : this.pos.y;
      if (last) {
        last.isTail = false;
        last.r = 6;
      }
      this.segments.push(
        new CaterpillarSegment(sx, sy, this.assets, true, this.segments.length)
      );
    }
  }

  /** Réduit la chenille (citron ou bonk contre un obstacle), minimum 2 segments. */
  shrink(count = 1) {
    for (let c = 0; c < count; c++) {
      if (this.segments.length <= 2) break;
      this.segments.pop();
    }
    if (this.segments.length > 0) {
      const last = this.segments[this.segments.length - 1];
      last.isTail = true;
      last.r = 5;
    }
  }

  /** Active un boost de vitesse temporaire (myrtille). */
  activateBoost(frames = 210) {
    this.boostFrames = Math.max(this.boostFrames, frames);
  }

  /**
   * Met à jour la tête (BehaviorManager) puis propage le mouvement à toute la chaîne.
   * Retourne l'obstacle touché s'il y a eu un "bonk" (collision douce, jamais de mort).
   */
  step(mx, my, obstacles) {
    this.mouseTarget.set(
      constrain(mx, this.bounds[0], this.bounds[0] + this.bounds[2]),
      constrain(my, this.bounds[1], this.bounds[1] + this.bounds[3])
    );
    this.obstaclesRef = obstacles;

    if (this.boostFrames > 0) {
      this.boostFrames--;
      this.maxSpeed = this.baseSpeed * 1.45;
    } else {
      this.maxSpeed = this.baseSpeed;
    }

    if (this.bonkCooldown > 0) {
      this.bonkCooldown--;
    }

    this.applyManagedBehaviors();
    this.update();

    // Confinement souple dans le jardin
    this.pos.x = constrain(this.pos.x, this.bounds[0] + 6, this.bounds[0] + this.bounds[2] - 6);
    this.pos.y = constrain(this.pos.y, this.bounds[1] + 6, this.bounds[1] + this.bounds[3] - 6);

    // Vérification des "bonks" contre les obstacles du jardin (repousse + perte de 1 segment)
    let bonkedObstacle = null;
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const d = p5.Vector.dist(this.pos, obs.pos);
      const minD = this.r + obs.r;
      if (d < minD) {
        const pushOut = p5.Vector.sub(this.pos, obs.pos);
        if (pushOut.magSq() < 1e-4) pushOut.set(1, 0);
        pushOut.setMag(minD + 2);
        this.pos.set(obs.pos.x + pushOut.x, obs.pos.y + pushOut.y);
        // Rebond doux vers l'extérieur
        this.vel.set(pushOut.normalize().mult(this.maxSpeed * 0.9));

        if (this.bonkCooldown === 0) {
          this.bonkCooldown = 45;
          this.shrink(1);
          bonkedObstacle = obs;
        }
      }
    }

    // Mise à jour en chaîne des anneaux
    for (let i = 0; i < this.segments.length; i++) {
      const prev = i === 0 ? this : this.segments[i - 1];
      this.segments[i].follow(prev, this.spacing);
    }

    return bonkedObstacle;
  }

  getActiveColor() {
    if (this.bonkCooldown > 30) return 'pink';
    if (this.boostFrames > 0) return 'blue';
    return 'green';
  }

  show(g) {
    const colName = this.getActiveColor();

    // Dessin de la queue vers la tête pour un recouvrement naturel
    for (let i = this.segments.length - 1; i >= 0; i--) {
      this.segments[i].show(g, colName);
    }

    // Tête de la chenille (légèrement orientée selon la vitesse)
    const headImg = this.assets.getImage('generated/snake/caterpillar_head_' + colName + '.png');
    g.push();
    g.translate(Math.round(this.pos.x), Math.round(this.pos.y));
    if (this.vel.x < -0.15) {
      g.scale(-1, 1);
    }
    if (headImg) {
      g.image(headImg, -Math.floor(headImg.width / 2), -Math.floor(headImg.height / 2));
    } else {
      g.noStroke();
      g.fill(100, 190, 90);
      g.circle(0, 0, this.r * 2);
    }
    g.pop();

    // Affichage debug [H] : zone de freinage arrive + vecteurs steering
    if (Vehicle.debug) {
      g.push();
      g.noFill();
      g.stroke(255, 235, 130, 160);
      g.strokeWeight(1);
      g.circle(this.mouseTarget.x, this.mouseTarget.y, this.rayonZoneDeFreinage * 2);
      g.pop();
      this.drawDebugVectors(g);
    }
  }
}
