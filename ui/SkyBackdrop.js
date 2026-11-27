/**
 * Rendu du ciel parallaxe animé (Jour / Coucher de soleil) pour Moo's Funfair.
 * Superpose les 7 couches de sky/ (bg, sun, cloud_far, cloud_near, rocks, haze, treeline)
 * avec défilement doux des nuages, parallaxe caméra, oiseaux animés et ombre d'horizon.
 */
class SkyBackdrop {
  static BIRDS = [
    { x: 96,  y: 22, speed: 0.14, phase: 0.0 },
    { x: 382, y: 36, speed: 0.18, phase: 1.7 },
    { x: 416, y: 28, speed: 0.12, phase: 3.1 },
    { x: 245, y: 18, speed: 0.16, phase: 4.5 }
  ];

  /**
   * Dessine le ciel en coordonnées écran (0..vw), avec décalage parallaxe camX.
   * @param {p5.Graphics} g
   * @param {AssetManager} assets
   * @param {string} mood 'day' | 'sunset'
   * @param {number} vw largeur du buffer visible
   * @param {number} camX position X de la caméra monde (pour parallaxe subtile)
   * @param {number} oy décalage vertical éventuel
   */
  static draw(g, assets, mood = 'day', vw = 480, camX = 0, oy = 0) {
    if (!assets) return;
    const m = mood === 'sunset' ? 'sunset' : 'day';
    const meta = assets.skyMeta;
    const moodCfg = meta && meta.moods ? meta.moods[m] : null;

    const bg        = assets.getImage('sky/' + m + '_bg.png');
    const sun       = assets.getImage('sky/' + m + '_sun.png');
    const cloudFar  = assets.getImage('sky/' + m + '_cloud_far.png');
    const cloudNear = assets.getImage('sky/' + m + '_cloud_near.png');
    const rocks     = assets.getImage('sky/' + m + '_rocks.png');
    const haze      = assets.getImage('sky/' + m + '_haze.png');
    const treeline  = assets.getImage('sky/' + m + '_treeline.png');

    // Helper pour répéter proprement une couche sur toute la largeur vw
    const drawTiled = (img, y, scrollX) => {
      if (!img) return;
      const w = img.width;
      let startX = -((scrollX % w) + w) % w;
      for (let x = startX; x < vw; x += w) {
        g.image(img, Math.round(x), Math.round(y));
      }
    };

    g.push();
    // 1. Fond dégradé du ciel (étiré proprement sur toute la largeur vw)
    if (bg) {
      g.image(bg, 0, oy, vw, bg.height);
    } else {
      g.background(m === 'sunset' ? g.color(246, 174, 152) : g.color(178, 224, 248));
    }

    // 2. Soleil centré par rapport au cœur 480px du parc
    if (sun) {
      const sunOx = Math.round((vw - 480) / 2 - camX * 0.06);
      g.image(sun, sunOx, oy);
    }

    // 3. Nuages lointains + proches en défilement continu
    const t = frameCount;
    drawTiled(cloudFar,  oy, t * 0.08 + camX * 0.12);
    drawTiled(cloudNear, oy, t * 0.18 + camX * 0.22);

    // 4. Petits oiseaux qui traversent le ciel
    const birdCol = moodCfg && moodCfg.bird ? moodCfg.bird : (m === 'sunset' ? '#8a4466' : '#6b4b5b');
    g.stroke(birdCol);
    g.strokeWeight(1);
    g.noFill();
    const wrapW = Math.max(vw + 40, 520);
    for (const b of SkyBackdrop.BIRDS) {
      const bx = Math.round(((b.x + t * b.speed) % wrapW) - 20);
      const by = oy + b.y + Math.round(Math.sin(t * 0.06 + b.phase) * 1.5);
      const wing = Math.sin(t * 0.22 + b.phase) > 0 ? -1 : 1;
      g.point(bx, by);
      g.point(bx - 1, by + wing);
      g.point(bx - 2, by + wing);
      g.point(bx + 1, by + wing);
      g.point(bx + 2, by + wing);
    }

    // 5. Silhouettes rocheuses + brume + ligne d'arbres à l'horizon
    // Les images 128px de haut sont calées de sorte que la ligne d'horizon tombe à y ~ 96
    const horizonLayerY = oy - 22;
    drawTiled(rocks,    horizonLayerY, camX * 0.25);
    drawTiled(haze,     horizonLayerY, camX * 0.30);
    drawTiled(treeline, horizonLayerY, camX * 0.45);
    g.pop();
  }

  /**
   * Dessine la douce transition tramée (dithered shadow) entre la ligne d'arbres (y=94)
   * et la prairie du parc, ainsi que la lueur dorée en mode Coucher de soleil.
   */
  static drawHorizonBlend(g, mood, x0, x1, yTop = 94) {
    g.push();
    g.noStroke();
    const isSunset = mood === 'sunset';
    // Bande d'ombre douce sous la lisière d'arbres
    g.fill(isSunset ? g.color(116, 68, 86, 105) : g.color(86, 128, 88, 70));
    g.rect(x0, yTop, x1 - x0, 5);
    // Damier pixel discret pour un fondu rétro naturel (fidèle aux exemples)
    g.fill(isSunset ? g.color(116, 68, 86, 75) : g.color(86, 128, 88, 45));
    for (let x = x0; x < x1; x += 2) {
      g.rect(x, yTop + 5, 1, 1);
      g.rect(x + 1, yTop + 6, 1, 1);
      g.rect(x, yTop + 8, 1, 1);
    }
    g.pop();
  }

  /** Voile chaud ultra-léger sur la scène en mode Sunset (sans tint() lent). */
  static drawMoodGlaze(g, mood, vw, vh) {
    if (mood !== 'sunset') return;
    g.push();
    g.noStroke();
    g.fill(255, 186, 148, 30);
    g.rect(0, 94, vw, vh - 94);
    g.pop();
  }
}
