/**
 * Rendu du ciel parallaxe animé à 7 couches (Jour / Coucher de soleil) pour Moo's Funfair.
 * Couches : dégradé ciel, halo solaire, nuages lointains, nuages proches + nuées d'oiseaux,
 * rochers fantastiques, brume atmosphérique, ligne d'arbres, plus particules & feuilles flottantes.
 * Inclut une transition douce (fondu) entre Jour et Coucher de soleil.
 */
class SkyBackdrop {
  static BIRDS = [
    { x: 64,  y: 22, speed: 0.14, phase: 0.0, size: 2 },
    { x: 74,  y: 26, speed: 0.14, phase: 0.7, size: 1 },
    { x: 245, y: 17, speed: 0.17, phase: 4.5, size: 2 },
    { x: 256, y: 21, speed: 0.17, phase: 5.1, size: 1 },
    { x: 382, y: 34, speed: 0.19, phase: 1.7, size: 2 },
    { x: 393, y: 30, speed: 0.19, phase: 2.3, size: 1 },
    { x: 416, y: 26, speed: 0.12, phase: 3.1, size: 2 }
  ];

  static MOTES = [
    { x: 32,  y: 18, vx: 0.12, vy: 0.04, phase: 0.3, leaf: false },
    { x: 112, y: 42, vx: 0.18, vy: 0.08, phase: 1.4, leaf: true  },
    { x: 188, y: 26, vx: 0.10, vy: 0.03, phase: 2.2, leaf: false },
    { x: 264, y: 52, vx: 0.16, vy: 0.07, phase: 3.1, leaf: true  },
    { x: 338, y: 30, vx: 0.11, vy: 0.04, phase: 4.0, leaf: false },
    { x: 412, y: 48, vx: 0.15, vy: 0.06, phase: 5.2, leaf: true  },
    { x: 468, y: 22, vx: 0.13, vy: 0.03, phase: 0.9, leaf: false },
    { x: 78,  y: 66, vx: 0.14, vy: 0.05, phase: 2.7, leaf: false }
  ];

  static _blend = -1; // 0 = day, 1 = sunset

  /** Met à jour le fondu progressif entre Day (0) et Sunset (1). */
  static _updateBlend(mood) {
    const target = mood === 'sunset' ? 1 : 0;
    if (SkyBackdrop._blend < 0) {
      SkyBackdrop._blend = target;
      return target;
    }
    const dt = Math.min(0.05, (typeof deltaTime === 'number' ? deltaTime : 16.6) / 1000);
    const diff = target - SkyBackdrop._blend;
    if (Math.abs(diff) < 0.008) {
      SkyBackdrop._blend = target;
    } else {
      SkyBackdrop._blend += diff * Math.min(1, dt * 3.8);
    }
    return SkyBackdrop._blend;
  }

  /**
   * Dessine le ciel en coordonnées écran (0..vw), avec décalage parallaxe camX.
   */
  static draw(g, assets, mood = 'day', vw = 480, camX = 0, oy = 0) {
    if (!assets) return;
    const blend = SkyBackdrop._updateBlend(mood);
    const m = blend >= 0.5 ? 'sunset' : 'day';
    const meta = assets.skyMeta;
    const moodCfg = meta && meta.moods ? meta.moods[m] : null;

    const bg        = assets.getImage('sky/' + m + '_bg.png');
    const sun       = assets.getImage('sky/' + m + '_sun.png');
    const cloudFar  = assets.getImage('sky/' + m + '_cloud_far.png');
    const cloudNear = assets.getImage('sky/' + m + '_cloud_near.png');
    const rocks     = assets.getImage('sky/' + m + '_rocks.png');
    const haze      = assets.getImage('sky/' + m + '_haze.png');
    const treeline  = assets.getImage('sky/' + m + '_treeline.png');

    const drawTiled = (img, y, scrollX) => {
      if (!img) return;
      const w = img.width;
      const startX = -((scrollX % w) + w) % w;
      for (let x = startX; x < vw; x += w) {
        g.image(img, Math.round(x), Math.round(y));
      }
    };

    const t = frameCount;
    g.push();

    // 1. Fond dégradé du ciel
    if (bg) {
      g.image(bg, 0, oy, vw, bg.height);
    } else {
      g.background(m === 'sunset' ? g.color(246, 174, 152) : g.color(178, 224, 248));
    }

    // 2. Halo solaire atmosphérique doux + Soleil parallaxe
    const sunOx = Math.round((vw - 480) / 2 - camX * 0.06);
    const pulse = Math.sin(t * 0.04) * 3;
    g.noStroke();
    if (m === 'sunset') {
      const sx = sunOx + 112;
      const sy = oy + 70;
      g.fill(255, 214, 146, 26);
      g.circle(sx, sy, 86 + pulse);
      g.fill(255, 232, 170, 34);
      g.circle(sx, sy, 58 + pulse * 0.6);
    } else {
      const sx = sunOx + 394;
      const sy = oy + 26;
      g.fill(255, 252, 212, 34);
      g.circle(sx, sy, 52 + pulse);
      g.fill(255, 254, 230, 44);
      g.circle(sx, sy, 34 + pulse * 0.5);
    }
    if (sun) {
      g.image(sun, sunOx, oy);
    }

    // 3. Nuages lointains + proches en défilement continu
    drawTiled(cloudFar,  oy, t * 0.07 + camX * 0.11);
    drawTiled(cloudNear, oy, t * 0.16 + camX * 0.21);

    // 4. Petites nuées d'oiseaux qui traversent le ciel
    const birdCol = moodCfg && moodCfg.bird ? moodCfg.bird : (m === 'sunset' ? '#8a4466' : '#6b4b5b');
    g.stroke(birdCol);
    g.strokeWeight(1);
    g.noFill();
    const wrapW = Math.max(vw + 48, 528);
    for (const b of SkyBackdrop.BIRDS) {
      const bx = Math.round(((b.x + t * b.speed - camX * 0.15) % wrapW + wrapW) % wrapW - 24);
      const by = oy + b.y + Math.round(Math.sin(t * 0.06 + b.phase) * 1.6);
      const wing = Math.sin(t * 0.22 + b.phase) > 0 ? -1 : 1;
      g.point(bx, by);
      g.point(bx - 1, by + wing);
      g.point(bx + 1, by + wing);
      if (b.size >= 2) {
        g.point(bx - 2, by + wing);
        g.point(bx + 2, by + wing);
      }
    }

    // 5. Silhouettes rocheuses + brume + ligne d'arbres à l'horizon
    const horizonLayerY = oy - 22;
    drawTiled(rocks,    horizonLayerY, camX * 0.25);
    drawTiled(haze,     horizonLayerY, camX * 0.30);
    drawTiled(treeline, horizonLayerY, camX * 0.45);

    // 6. Particules atmosphériques & petites feuilles flottantes au premier plan du ciel
    g.noStroke();
    for (const p of SkyBackdrop.MOTES) {
      const px = Math.round(((p.x + t * p.vx - camX * 0.35) % wrapW + wrapW) % wrapW - 16);
      const py = Math.round(oy + ((p.y + t * p.vy + Math.sin(t * 0.05 + p.phase) * 4) % 86));
      if (p.leaf) {
        g.fill(m === 'sunset' ? g.color(246, 174, 128, 170) : g.color(178, 224, 146, 175));
        g.rect(px, py, 2, 1);
        g.rect(px + 1, py + 1, 1, 1);
      } else {
        const a = Math.round(90 + Math.sin(t * 0.09 + p.phase) * 65);
        g.fill(m === 'sunset' ? g.color(255, 232, 168, a) : g.color(255, 254, 236, a));
        g.rect(px, py, 1, 1);
      }
    }

    // 7. Fondu de transition douce lors du basculement Day <-> Sunset
    if (blend > 0.02 && blend < 0.98) {
      const transitionPeak = Math.sin(blend * Math.PI);
      g.fill(255, 206, 174, Math.round(transitionPeak * 58));
      g.rect(0, oy, vw, 96);
    }

    g.pop();
  }

  /**
   * Dessine la douce transition tramée (dithered shadow) entre la ligne d'arbres (y=94)
   * et la prairie du parc.
   */
  static drawHorizonBlend(g, mood, x0, x1, yTop = 94) {
    g.push();
    g.noStroke();
    const isSunset = mood === 'sunset';
    g.fill(isSunset ? g.color(116, 68, 86, 112) : g.color(86, 128, 88, 70));
    g.rect(x0, yTop, x1 - x0, 5);
    g.fill(isSunset ? g.color(116, 68, 86, 78) : g.color(86, 128, 88, 45));
    for (let x = x0; x < x1; x += 2) {
      g.rect(x, yTop + 5, 1, 1);
      g.rect(x + 1, yTop + 6, 1, 1);
      g.rect(x, yTop + 8, 1, 1);
    }
    g.pop();
  }

  /** Voile chaud ultra-léger + poussières dorées en mode Sunset (sans tint() lent). */
  static drawMoodGlaze(g, mood, vw, vh) {
    const b = SkyBackdrop._blend >= 0 ? SkyBackdrop._blend : (mood === 'sunset' ? 1 : 0);
    if (b <= 0.02) return;
    g.push();
    g.noStroke();
    g.fill(255, 186, 148, Math.round(32 * b));
    g.rect(0, 94, vw, vh - 94);
    // Quelques lucioles / poussières dorées lentes au coucher du soleil
    const t = frameCount;
    for (let i = 0; i < 10; i++) {
      const gx = Math.round(((i * 73 + t * (0.14 + (i % 3) * 0.05)) % (vw + 20)) - 10);
      const gy = Math.round(108 + ((i * 39) % (vh - 120)) + Math.sin(t * 0.05 + i) * 4);
      const a = Math.round((85 + Math.sin(t * 0.08 + i * 1.7) * 65) * b);
      g.fill(255, 236, 162, a);
      g.rect(gx, gy, 2, 2);
    }
    g.pop();
  }
}
