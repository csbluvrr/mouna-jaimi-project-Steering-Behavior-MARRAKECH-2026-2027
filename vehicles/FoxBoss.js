/**
 * Le Renard rival dans Fox Showdown (sous-classe de Vehicle).
 * Cerveau basé sur une petite machine à états lisible pilotant BehaviorManager :
 * - 'WANDER'       : patrouille si Moo est hors de son cercle de vision (165 px)
 * - 'SEEK_POWERUP' : fonce avec seek() vers un bonus apparu sur la scène
 * - 'PURSUE'       : poursuit Moo avec pursue() lorsqu'elle est loin
 * - 'STRAFE_THROW' : garde sa distance et lance des glands
 * - 'FLEE'         : fuit avec flee() lorsque sa vie est basse (<= 3 PV)
 * En parallèle en permanence :
 * - 'evade' sur les carottes entrantes + 'avoid' sur les stands/caisses + 'boundaries'.
 */
class FoxBoss extends Vehicle {
  constructor(x, y, assets) {
    super(x, y, 1.35, 0.12);
    this.assets = assets;
    this.r = 9;
    this.maxHp = 10;
    this.hp = this.maxHp;
    this.hasShield = false;
    this.visionRadius = 165;
    this.aheadScale = 16;

    this.state = 'WANDER';
    this.throwCooldown = 70;
    this.throwAnimFrames = 0;
    this.hurtFlash = 0;
    this.isKO = false;

    this.mooRef = null;
    this.powerupRef = null;
    this.threatCarrot = null;
    this.obstaclesRef = [];

    this.vel = p5.Vector.random2D().mult(0.8);

    // Enregistrement de tous les comportements dans BehaviorManager
    this.behaviors.add('wander', (v) => v.wander(), 1.0, true);
    this.behaviors.add('pursue', (v) => v.mooRef ? v.pursue(v.mooRef, 10) : createVector(0, 0), 1.2, false);
    this.behaviors.add('seekPowerup', (v) => v.powerupRef ? v.seek(v.powerupRef.pos) : createVector(0, 0), 1.6, false);
    this.behaviors.add('flee', (v) => v.mooRef ? v.flee(v.mooRef.pos, 140) : createVector(0, 0), 1.5, false);
    this.behaviors.add('evadeCarrot', (v) => {
      if (!v.threatCarrot) return createVector(0, 0);
      return v.evade(v.threatCarrot, 6, 54);
    }, 2.4, true);
    this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.6, true);
    this.behaviors.add('boundaries', (v) => v.boundaries(18, 34, 444, 222, 18), 2.2, true);
  }

  /** Choisit l'état courant et active/désactive les comportements correspondants. */
  updateStateMachine(moo, powerups, projectiles) {
    this.mooRef = moo;
    this.powerupRef = powerups.length > 0 ? powerups[0] : null;

    // Détecte la carotte la plus proche pour l'esquiver (evade)
    this.threatCarrot = null;
    let bestC = 54;
    for (const p of projectiles) {
      if (p.owner !== 'moo') continue;
      const d = p5.Vector.dist(this.pos, p.pos);
      if (d < bestC) {
        bestC = d;
        this.threatCarrot = p;
      }
    }

    const dMoo = p5.Vector.dist(this.pos, moo.pos);

    // Sélection d'état claire (priorité : vie basse -> bonus -> vue de Moo -> errance)
    if (this.hp <= 3 && dMoo < 130) {
      this.state = 'FLEE';
    } else if (this.powerupRef && p5.Vector.dist(this.pos, this.powerupRef.pos) < 170) {
      this.state = 'SEEK_POWERUP';
    } else if (dMoo <= this.visionRadius) {
      this.state = dMoo > 105 ? 'PURSUE' : 'STRAFE_THROW';
    } else {
      this.state = 'WANDER';
    }

    // Active uniquement le comportement de l'état courant
    this.behaviors.deactivate('wander');
    this.behaviors.deactivate('pursue');
    this.behaviors.deactivate('seekPowerup');
    this.behaviors.deactivate('flee');

    if (this.state === 'WANDER') this.behaviors.activate('wander');
    else if (this.state === 'PURSUE') this.behaviors.activate('pursue');
    else if (this.state === 'SEEK_POWERUP') this.behaviors.activate('seekPowerup');
    else if (this.state === 'FLEE') this.behaviors.activate('flee');
    else if (this.state === 'STRAFE_THROW') {
      // Garde une distance confortable en tournant autour de Moo
      if (dMoo < 70) this.behaviors.activate('flee');
      else this.behaviors.activate('wander');
    }
  }

  /** Met à jour le renard et retourne éventuellement un gland lancé. */
  step(moo, powerups, projectiles, obstacles) {
    if (this.isKO) return null;

    this.obstaclesRef = obstacles;
    if (this.hurtFlash > 0) this.hurtFlash--;
    if (this.throwAnimFrames > 0) this.throwAnimFrames--;

    this.updateStateMachine(moo, powerups, projectiles);
    this.applyManagedBehaviors();
    this.update();

    // Confinement et glissement doux hors des obstacles
    this.pos.x = constrain(this.pos.x, 20, 460);
    this.pos.y = constrain(this.pos.y, 36, 250);
    for (const obs of obstacles) {
      const d = p5.Vector.dist(this.pos, obs.pos);
      const minD = this.r + obs.r;
      if (d < minD) {
        const pushOut = p5.Vector.sub(this.pos, obs.pos).setMag(minD + 1);
        this.pos.set(obs.pos.x + pushOut.x, obs.pos.y + pushOut.y);
      }
    }

    // Lancer de gland si Moo est dans son champ de vision
    this.throwCooldown--;
    const dMoo = p5.Vector.dist(this.pos, moo.pos);
    if (this.throwCooldown <= 0 && dMoo <= this.visionRadius + 15) {
      this.throwCooldown = this.hp <= 4 ? 58 : 78;
      this.throwAnimFrames = 18;
      const aim = p5.Vector.sub(moo.pos, this.pos);
      const isHoming = random() < 0.35; // 35% de glands légèrement chercheurs
      return new Projectile(this.pos.x, this.pos.y, aim, 'fox', isHoming, this.assets);
    }

    return null;
  }

  takeDamage(amount = 1) {
    if (this.hasShield) {
      this.hasShield = false;
      return false;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.hurtFlash = 14;
    if (this.hp <= 0) this.isKO = true;
    return true;
  }

  show(g) {
    // Nouveau spritesheet Fox Sprite Sheet.png (448x224 = 14x7 cellules 32x32) :
    // row 0 = repos (5f), row 2 = course (8f), row 3 = bond/lancer (11f), row 4 = surpris/touché (5f), row 5 = sieste KO (6f)
    let row = 0;
    let col = Math.floor(frameCount / 8) % 5;
    if (this.isKO) {
      row = 5;
      col = Math.floor(frameCount / 10) % 6;
    } else if (this.hurtFlash > 0) {
      row = 4;
      col = Math.floor(frameCount / 3) % 5;
    } else if (this.throwAnimFrames > 0) {
      row = 3;
      col = Math.floor(frameCount / 3) % 11;
    } else if (this.vel.magSq() > 0.04) {
      row = 2; // course vive
      col = Math.floor(frameCount / 5) % 8;
    }

    const img = this.assets.getSheetFrame('Fox Sprite Sheet.png', 32, 32, col, row);
    const px = Math.round(this.pos.x);
    const py = Math.round(this.pos.y);

    g.push();
    g.translate(px, py);
    if (this.hasShield) {
      g.noFill();
      g.stroke(120, 215, 255, 200);
      g.strokeWeight(1.5);
      g.circle(0, -4, 24);
    }
    // Clignotement rapide sans p5.tint() lent
    if (this.hurtFlash > 0 && Math.floor(frameCount / 2) % 2 === 0 && g.drawingContext) {
      g.drawingContext.globalAlpha = 0.55;
    }
    if (this.vel.x < -0.05 || (this.mooRef && this.mooRef.pos.x < this.pos.x && this.throwAnimFrames > 0)) {
      g.scale(-1, 1);
    }
    if (img) {
      g.image(img, -16, -24);
    }
    if (g.drawingContext) g.drawingContext.globalAlpha = 1;
    g.pop();

    // Étoiles étourdies au-dessus du renard vaincu (pas de violence, ton cozy !)
    if (this.isKO) {
      const star = this.assets.getImage('generated/fx/dizzy_star.png');
      for (let i = 0; i < 3; i++) {
        const a = frameCount * 0.1 + (TWO_PI * i) / 3;
        const sx = Math.round(px + Math.cos(a) * 11);
        const sy = Math.round(py - 18 + Math.sin(a) * 4);
        if (star) g.image(star, sx - 4, sy - 4);
      }
    }

    // Debug [H] : cercle de vision + état courant de la machine à états
    if (Vehicle.debug && !this.isKO) {
      g.push();
      g.noFill();
      g.stroke(210, 150, 240, 130);
      g.strokeWeight(1);
      g.circle(this.pos.x, this.pos.y, this.visionRadius * 2);
      g.pop();
      PixelUI.drawTag(g, this.assets.font, this.state, px, py - 24, g.color(247, 235, 170));
      this.drawDebugVectors(g);
    }
  }
}
