/**
 * Projection orthogonale d'un point p sur le segment [a, b].
 * Reprise exacte de common/vehicle.js du cours (suivi de chemin 5-2 et 5-3).
 */
function findProjection(pos, a, b) {
  const v1 = p5.Vector.sub(a, pos);
  const v2 = p5.Vector.sub(b, pos);
  v2.normalize();
  const sp = v1.dot(v2);
  v2.mult(sp);
  v2.add(pos);
  return v2;
}

/**
 * Classe Vehicle fondamentale du cours (Craig Reynolds, GDC 1999).
 * Reprise directe de common/vehicle.js fourni par l'enseignant :
 * - Tous les comportements de base vivent ici (seek, flee, arrive, pursue,
 *   evade, wander, avoid, follow, align, cohesion, separation, boundaries).
 * - Chaque Vehicle possède un BehaviorManager (bonus du cours, slide 52 & 60).
 * - Les sous-classes ne font que combiner ces comportements et gérer leur rendu.
 */
class Vehicle {
  static debug = false;

  constructor(x, y, maxSpeed = 2, maxForce = 0.15) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);

    this.maxSpeed = maxSpeed;
    this.maxForce = maxForce;
    this.r = 8;

    // Paramètres Arrival (3-Arrival)
    this.rayonZoneDeFreinage = 28;

    // Paramètres Wander (4-Wander, Craig Reynolds)
    this.distanceCercle = 32;
    this.wanderRadius = 14;
    this.wanderTheta = typeof random === 'function' ? random(TWO_PI) : 0;
    this.displaceRange = 0.3;

    // Paramètres ObstacleAvoidance (6-ObstacleAvoidance)
    this.largeurZoneEvitementDevantVaisseau = 10;
    this.aheadScale = 18;

    // Paramètres Boids (7-Boids)
    this.perceptionRadius = 32;

    // Gestionnaire de comportements pondérés
    this.behaviors = new BehaviorManager(this);

    // Dernière force appliquée (utile pour l'affichage debug)
    this.lastSteeringForce = createVector(0, 0);
  }

  // =========================================================================
  // 1-Seek & 3-Arrival : seek, arrive, flee
  // =========================================================================

  /**
   * Calcule la force de steering pour se diriger vers une cible.
   * Si arrival = true, ralentit progressivement dans rayonZoneDeFreinage
   * jusqu'à une vitesse nulle à la distance d (utile pour le Snake).
   */
  seek(target, arrival = false, d = 0) {
    const targetPos = target && target.pos ? target.pos : target;
    let desiredSpeed = this.maxSpeed;

    if (arrival) {
      const distance = p5.Vector.dist(this.pos, targetPos);
      if (distance < this.rayonZoneDeFreinage) {
        desiredSpeed = map(distance, d, this.rayonZoneDeFreinage, 0, this.maxSpeed, true);
      }
    }

    const desired = p5.Vector.sub(targetPos, this.pos);
    if (desired.magSq() < 1e-6) {
      return createVector(0, 0);
    }
    desired.setMag(desiredSpeed);

    // Formule de Craig Reynolds : steering = vitesse souhaitée - vitesse actuelle
    const force = p5.Vector.sub(desired, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  /** Arrivée douce sur une cible (avec distance d'arrêt optionnelle d). */
  arrive(target, d = 0) {
    return this.seek(target, true, d);
  }

  /**
   * Fuite d'une cible (inverse la vitesse désirée, conforme à Reynolds).
   * Ne s'active que si la cible est dans distanceDeDetection.
   */
  flee(target, distanceDeDetection = Infinity) {
    const targetPos = target && target.pos ? target.pos : target;
    const d = p5.Vector.dist(this.pos, targetPos);
    if (d > distanceDeDetection) {
      return createVector(0, 0);
    }
    const desired = p5.Vector.sub(this.pos, targetPos);
    if (desired.magSq() < 1e-6) {
      return p5.Vector.random2D().mult(this.maxForce);
    }
    desired.setMag(this.maxSpeed);
    const force = p5.Vector.sub(desired, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  // =========================================================================
  // 2-PursueEvade : pursue, evade
  // =========================================================================

  /** Poursuite prédictive : vise la position future de la cible (pos + vel * T). */
  pursue(vehicle, predictionFrames = 10) {
    const target = vehicle.pos.copy();
    const prediction = vehicle.vel.copy().mult(predictionFrames);
    target.add(prediction);
    return this.seek(target);
  }

  /** Évasion prédictive : fuit la position future du poursuiveur. */
  evade(vehicle, predictionFrames = 10, distanceDeDetection = Infinity) {
    const d = p5.Vector.dist(this.pos, vehicle.pos);
    if (d > distanceDeDetection) {
      return createVector(0, 0);
    }
    const target = vehicle.pos.copy();
    const prediction = vehicle.vel.copy().mult(predictionFrames);
    target.add(prediction);
    return this.flee(target);
  }

  // =========================================================================
  // 4-Wander : déambulation autonome (Craig Reynolds)
  // =========================================================================

  wander() {
    const forward = this.vel.magSq() > 1e-4
      ? this.vel.copy().normalize()
      : createVector(1, 0);
    const pointDevant = p5.Vector.mult(forward, this.distanceCercle).add(this.pos);

    const heading = this.vel.magSq() > 1e-4 ? this.vel.heading() : 0;
    const theta = this.wanderTheta + heading;
    const pointSurLeCercle = createVector(
      pointDevant.x + this.wanderRadius * Math.cos(theta),
      pointDevant.y + this.wanderRadius * Math.sin(theta)
    );

    // Perturbation aléatoire douce de l'angle sur le cercle virtuel
    this.wanderTheta += random(-this.displaceRange, this.displaceRange);

    const desired = p5.Vector.sub(pointSurLeCercle, this.pos);
    desired.setMag(this.maxSpeed);
    const force = p5.Vector.sub(desired, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  // =========================================================================
  // 6-ObstacleAvoidance : évitement d'obstacles avec ahead + ahead2 + pos
  // =========================================================================

  /**
   * Algorithme d'évitement du cours (transparents 34-36) :
   * Projette deux vecteurs devant le véhicule (ahead et ahead2), trouve
   * l'obstacle circulaire le plus proche, et pousse perpendiculairement /
   * à l'opposé de son centre si un point entre dans son rayon élargi.
   */
  avoid(obstacles) {
    if (!obstacles || obstacles.length === 0) {
      return createVector(0, 0);
    }

    const forward = this.vel.magSq() > 1e-4
      ? this.vel.copy().normalize()
      : createVector(1, 0);
    const speedRatio = this.maxSpeed > 0 ? this.vel.mag() / this.maxSpeed : 0;
    const dynamicLen = Math.max(8, this.aheadScale * Math.max(0.35, speedRatio));

    const ahead = p5.Vector.mult(forward, dynamicLen);
    const ahead2 = p5.Vector.mult(forward, dynamicLen * 0.5);

    const pointAhead = p5.Vector.add(this.pos, ahead);
    const pointAhead2 = p5.Vector.add(this.pos, ahead2);

    // Trouver l'obstacle le plus menaçant (le plus proche des sondes)
    let closest = null;
    let closestDist = Infinity;
    let triggerPoint = pointAhead;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const safeR = obs.r + this.r + 2;

      const d1 = p5.Vector.dist(pointAhead, obs.pos);
      const d2 = p5.Vector.dist(pointAhead2, obs.pos);
      const d0 = p5.Vector.dist(this.pos, obs.pos);
      const minD = Math.min(d1, d2, d0);

      if (minD < safeR && minD < closestDist) {
        closestDist = minD;
        closest = obs;
        if (minD === d0) triggerPoint = this.pos;
        else if (minD === d2) triggerPoint = pointAhead2;
        else triggerPoint = pointAhead;
      }
    }

    if (!closest) {
      return createVector(0, 0);
    }

    // Force d'évitement dirigée du centre de l'obstacle vers le point de sonde
    const force = p5.Vector.sub(triggerPoint, closest.pos);
    if (force.magSq() < 1e-4) {
      force.set(-forward.y, forward.x);
    }
    force.setMag(this.maxSpeed);
    force.sub(this.vel);
    force.limit(this.maxForce * 1.5);
    return force;
  }

  // =========================================================================
  // 5-2 & 5-3 : Suivi de chemin (Path Following)
  // =========================================================================

  follow(path) {
    if (!path || !Array.isArray(path.points) || path.points.length < 2) {
      return createVector(0, 0);
    }

    const predict = this.vel.magSq() > 1e-6
      ? this.vel.copy().normalize().mult(18)
      : createVector(18, 0);
    const predictPos = p5.Vector.add(this.pos, predict);

    let normal = null;
    let target = null;
    let worldRecord = Infinity;

    for (let i = 0; i < path.points.length; i++) {
      let a = path.points[i];
      let b = path.points[(i + 1) % path.points.length];
      let normalPoint = findProjection(predictPos, a, b);
      let dir = p5.Vector.sub(b, a);

      if (
        normalPoint.x < min(a.x, b.x) ||
        normalPoint.x > max(a.x, b.x) ||
        normalPoint.y < min(a.y, b.y) ||
        normalPoint.y > max(a.y, b.y)
      ) {
        normalPoint = b.copy();
        a = path.points[(i + 1) % path.points.length];
        b = path.points[(i + 2) % path.points.length];
        dir = p5.Vector.sub(b, a);
      }

      const d = p5.Vector.dist(predictPos, normalPoint);
      if (d < worldRecord) {
        worldRecord = d;
        normal = normalPoint;
        if (dir.magSq() > 1e-6) {
          dir.normalize().mult(18);
        }
        target = normal.copy().add(dir);
      }
    }

    if (target && worldRecord > (path.radius || 16)) {
      return this.seek(target);
    }
    return createVector(0, 0);
  }

  // =========================================================================
  // 7-Boids : alignement, cohésion, séparation et confinement (boundaries)
  // =========================================================================

  align(boids) {
    const steering = createVector(0, 0);
    let total = 0;
    for (const other of boids) {
      const d = p5.Vector.dist(this.pos, other.pos);
      if (other !== this && d < this.perceptionRadius) {
        steering.add(other.vel);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  cohesion(boids) {
    const steering = createVector(0, 0);
    let total = 0;
    for (const other of boids) {
      const d = p5.Vector.dist(this.pos, other.pos);
      if (other !== this && d < this.perceptionRadius * 1.5) {
        steering.add(other.pos);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      return this.seek(steering);
    }
    return steering;
  }

  separation(boids, desiredSeparation = null) {
    const sepRadius = desiredSeparation || this.perceptionRadius * 0.75;
    const steering = createVector(0, 0);
    let total = 0;
    for (const other of boids) {
      const d = p5.Vector.dist(this.pos, other.pos);
      if (other !== this && d > 0 && d < sepRadius) {
        const diff = p5.Vector.sub(this.pos, other.pos);
        diff.div(d * d); // Plus le voisin est proche, plus il repousse
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  /**
   * Maintien dans un rectangle (bx, by, bw, bh) avec une marge de détection d.
   * Reprise exacte de boundaries() du cours (exemple 7 & 8).
   */
  boundaries(bx, by, bw, bh, d = 16) {
    let desired = null;

    if (this.pos.x < bx + d) {
      desired = createVector(this.maxSpeed, this.vel.y);
    } else if (this.pos.x > bx + bw - d) {
      desired = createVector(-this.maxSpeed, this.vel.y);
    }

    if (this.pos.y < by + d) {
      desired = createVector(desired ? desired.x : this.vel.x, this.maxSpeed);
    } else if (this.pos.y > by + bh - d) {
      desired = createVector(desired ? desired.x : this.vel.x, -this.maxSpeed);
    }

    if (desired !== null) {
      desired.setMag(this.maxSpeed);
      const steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce);
      return steer;
    }
    return createVector(0, 0);
  }

  // =========================================================================
  // Intégration d'Euler standard (locomotion)
  // =========================================================================

  applyForce(force) {
    this.acc.add(force);
  }

  /** Applique automatiquement la force combinée du BehaviorManager. */
  applyManagedBehaviors() {
    const force = this.behaviors.getSteeringForce();
    this.lastSteeringForce.set(force.x, force.y);
    this.applyForce(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  /** Dessine les vecteurs de debug (vitesse et force) sur le buffer pixel g. */
  drawDebugVectors(g) {
    if (!Vehicle.debug) return;
    g.push();
    g.stroke(80, 200, 255);
    g.strokeWeight(1);
    g.line(this.pos.x, this.pos.y, this.pos.x + this.vel.x * 12, this.pos.y + this.vel.y * 12);
    g.stroke(255, 120, 80);
    g.line(
      this.pos.x,
      this.pos.y,
      this.pos.x + this.lastSteeringForce.x * 40,
      this.pos.y + this.lastSteeringForce.y * 40
    );
    g.pop();
  }
}
