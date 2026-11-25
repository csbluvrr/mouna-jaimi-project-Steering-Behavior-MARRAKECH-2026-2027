/**
 * Fruit du jardin dans Caterpillar Crawl (sous-classe de Vehicle).
 * Types disponibles :
 * - 'berry'     : baie rouge immobile (+1 segment)
 * - 'shy'       : fruit timide qui fuit la tête avec flee() + wander() + avoid() (+2 segments)
 * - 'golden'    : ananas doré rare (+3 segments !)
 * - 'blueberry' : myrtille bleue (+1 segment + boost de vitesse)
 * - 'lemon'     : citron jaune (-1 segment si mangé, à éviter !)
 */
class GardenFruit extends Vehicle {
  constructor(x, y, type, assets) {
    const isShy = type === 'shy';
    super(x, y, isShy ? 1.15 : 0, isShy ? 0.09 : 0);

    this.type = type;
    this.assets = assets;
    this.r = 7;
    this.phase = random(TWO_PI);
    this.fleeRadius = 56;
    this.headRef = null;
    this.obstaclesRef = [];
    this.bounds = [18, 34, 444, 220];

    // Coordonnées (col, row) dans items/plants_items.png (grille 16x16)
    const spriteMap = {
      berry: [1, 3],      // Baie/tomate rouge
      shy: [3, 10],       // Pomme rose timide
      golden: [3, 7],     // Ananas doré
      blueberry: [3, 5],  // Myrtille bleue
      lemon: [3, 0]       // Citron/agrume jaune
    };
    this.cell = spriteMap[type] || [1, 3];

    if (isShy) {
      this.vel = p5.Vector.random2D().mult(0.5);
      this.distanceCercle = 16;
      this.wanderRadius = 8;
      this.aheadScale = 14;

      // Comportements combinés via BehaviorManager pour le fruit timide
      this.behaviors.add('wander', (v) => v.wander(), 0.7, true);
      this.behaviors.add('flee', (v) => {
        if (!v.headRef) return createVector(0, 0);
        return v.flee(v.headRef.pos, v.fleeRadius);
      }, 2.6, true);
      this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.2, true);
      this.behaviors.add('boundaries', (v) => {
        const [bx, by, bw, bh] = v.bounds;
        return v.boundaries(bx, by, bw, bh, 18);
      }, 2.2, true);
    }
  }

  step(head, obstacles) {
    if (this.type !== 'shy') return;
    this.headRef = head;
    this.obstaclesRef = obstacles;
    this.applyManagedBehaviors();
    this.update();

    // Maintien dans le jardin
    this.pos.x = constrain(this.pos.x, this.bounds[0], this.bounds[0] + this.bounds[2]);
    this.pos.y = constrain(this.pos.y, this.bounds[1], this.bounds[1] + this.bounds[3]);
  }

  show(g) {
    const bob = Math.sin(frameCount * 0.1 + this.phase) * 1.5;
    const px = Math.round(this.pos.x);
    const py = Math.round(this.pos.y + bob);

    // Halo discret pour distinguer les fruits spéciaux
    if (this.type === 'golden') {
      g.noFill();
      g.stroke(255, 232, 110, 170);
      g.strokeWeight(1);
      g.circle(px, py, 16 + Math.sin(frameCount * 0.18) * 2);
    } else if (this.type === 'shy') {
      // Petit signe de panique quand la chenille est proche
      if (this.headRef && p5.Vector.dist(this.pos, this.headRef.pos) < this.fleeRadius) {
        g.noStroke();
        g.fill(255, 130, 150);
        g.rect(px - 1, py - 12, 2, 4);
        g.rect(px - 1, py - 7, 2, 1);
      }
    } else if (this.type === 'lemon') {
      g.noFill();
      g.stroke(235, 190, 70, 120);
      g.strokeWeight(1);
      g.circle(px, py, 15);
    }

    const img = this.assets.getSheetFrame(
      'items/plants_items.png',
      16,
      16,
      this.cell[0],
      this.cell[1]
    );
    if (img) {
      g.image(img, px - 8, py - 8);
    } else {
      g.noStroke();
      g.fill(230, 80, 90);
      g.circle(px, py, 10);
    }

    // Debug [H] : rayon de fuite du fruit timide
    if (Vehicle.debug && this.type === 'shy') {
      g.push();
      g.noFill();
      g.stroke(255, 150, 170, 160);
      g.strokeWeight(1);
      g.circle(this.pos.x, this.pos.y, this.fleeRadius * 2);
      g.pop();
      this.drawDebugVectors(g);
    }
  }
}
