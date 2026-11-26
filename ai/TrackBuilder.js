/**
 * Générateur de circuits complexes pour Bunny Derby (640x360).
 * Construit à la volée :
 * - une image de circuit pixel-art vivante (herbe, bordures rouge/crème, piste sable,
 *   ligne de départ en damier, arbres, fleurs, mare et ballots de paille),
 * - son masque de collision exact (blanc = piste roulable, noir = hors-piste),
 * - les checkpoints ordonnés le long de la courbe Catmull-Rom pour la fitness.
 * Permet aussi de tester la généralisation d'un cerveau sauvegardé sur plusieurs circuits (slide 54) !
 */
class TrackBuilder {
  /** Échantillonne une courbe fermée lisse (Catmull-Rom) à partir de points de contrôle. */
  static sampleClosedSpline(controlPts, samplesPerSeg = 14) {
    const pts = [];
    const n = controlPts.length;
    for (let i = 0; i < n; i++) {
      const p0 = controlPts[(i - 1 + n) % n];
      const p1 = controlPts[i];
      const p2 = controlPts[(i + 1) % n];
      const p3 = controlPts[(i + 2) % n];

      for (let s = 0; s < samplesPerSeg; s++) {
        const t = s / samplesPerSeg;
        const t2 = t * t;
        const t3 = t2 * t;
        const x = 0.5 * (
          2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
        );
        const y = 0.5 * (
          2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
        );
        pts.push([x, y]);
      }
    }
    return pts;
  }

  /** Construit un circuit complet (image + masque + checkpoints + décors animés). */
  static buildCustomTrack(presetId, assets) {
    const W = 640;
    const H = 360;

    // Deux circuits techniques complexes (chicanes en S, épingles, virages serrés)
    let controlPts;
    let trackWidth;
    let name;
    let pondPos;

    if (presetId === 'twister') {
      name = 'Twister Pro';
      trackWidth = 38;
      pondPos = { x: 318, y: 186, rx: 32, ry: 18 };
      controlPts = [
        [105, 72], [225, 56], [320, 112], [430, 56],
        [555, 78], [574, 152], [472, 184], [568, 246],
        [530, 312], [388, 304], [312, 246], [224, 308],
        [92, 294], [68, 224], [164, 186], [72, 134]
      ];
    } else {
      // 'clover' (défaut) : grand circuit technique en S + épingle + chicane
      name = 'Clover S-Curve';
      trackWidth = 42;
      pondPos = { x: 245, y: 175, rx: 34, ry: 20 };
      controlPts = [
        [108, 76], [238, 56], [358, 92], [468, 56],
        [562, 94], [570, 178], [468, 206], [552, 276],
        [456, 314], [344, 266], [248, 312], [116, 298],
        [72, 232], [148, 178], [76, 128]
      ];
    }

    const centerLine = TrackBuilder.sampleClosedSpline(controlPts, 14);

    // 1. Masque de collision exact (blanc = piste roulable, noir = hors-piste)
    const maskG = createGraphics(W, H);
    maskG.pixelDensity(1);
    maskG.background(0);
    maskG.noFill();
    maskG.stroke(255);
    maskG.strokeWeight(trackWidth);
    maskG.strokeJoin(ROUND);
    maskG.strokeCap(ROUND);
    maskG.beginShape();
    for (const [x, y] of centerLine) maskG.vertex(x, y);
    maskG.endShape(CLOSE);
    maskG.loadPixels();
    const maskPixels = new Uint8ClampedArray(maskG.pixels);

    // 2. Rendu pixel-art chaleureux du circuit (herbe, bordures, piste, damier)
    const trackG = createGraphics(W, H);
    trackG.pixelDensity(1);
    trackG.noSmooth();

    // Pelouse en damier pastel Sprout Lands
    trackG.noStroke();
    trackG.fill(152, 196, 122);
    trackG.rect(0, 0, W, H);
    trackG.fill(144, 189, 114);
    for (let y = 0; y < H; y += 20) {
      for (let x = 0; x < W; x += 20) {
        if (((x + y) / 20) % 2 === 0) trackG.rect(x, y, 20, 20);
      }
    }

    // Ombre extérieure sous la piste
    trackG.noFill();
    trackG.stroke(107, 75, 91, 95);
    trackG.strokeWeight(trackWidth + 14);
    trackG.strokeJoin(ROUND);
    trackG.beginShape();
    for (const [x, y] of centerLine) trackG.vertex(x + 2, y + 3);
    trackG.endShape(CLOSE);

    // Bordure sombre de contour
    trackG.stroke(107, 75, 91);
    trackG.strokeWeight(trackWidth + 10);
    trackG.beginShape();
    for (const [x, y] of centerLine) trackG.vertex(x, y);
    trackG.endShape(CLOSE);

    // Vibreurs rouge corail & crème alternés le long du circuit
    trackG.stroke(245, 236, 206);
    trackG.strokeWeight(trackWidth + 6);
    trackG.beginShape();
    for (const [x, y] of centerLine) trackG.vertex(x, y);
    trackG.endShape(CLOSE);

    trackG.stroke(204, 108, 118);
    trackG.strokeWeight(trackWidth + 6);
    trackG.drawingContext.setLineDash([12, 12]);
    trackG.beginShape();
    for (const [x, y] of centerLine) trackG.vertex(x, y);
    trackG.endShape(CLOSE);
    trackG.drawingContext.setLineDash([]);

    // Piste en terre dorée chaleureuse
    trackG.stroke(230, 204, 154);
    trackG.strokeWeight(trackWidth);
    trackG.beginShape();
    for (const [x, y] of centerLine) trackG.vertex(x, y);
    trackG.endShape(CLOSE);

    // Bande centrale plus claire + pointillés de course
    trackG.stroke(240, 218, 174);
    trackG.strokeWeight(trackWidth - 14);
    trackG.beginShape();
    for (const [x, y] of centerLine) trackG.vertex(x, y);
    trackG.endShape(CLOSE);

    trackG.stroke(255, 248, 224, 160);
    trackG.strokeWeight(2);
    trackG.drawingContext.setLineDash([7, 9]);
    trackG.beginShape();
    for (const [x, y] of centerLine) trackG.vertex(x, y);
    trackG.endShape(CLOSE);
    trackG.drawingContext.setLineDash([]);

    // Ligne de départ/arrivée en damier noir & blanc
    const pStart = centerLine[0];
    const pNext = centerLine[2];
    const startHeading = Math.atan2(pNext[1] - pStart[1], pNext[0] - pStart[0]);

    trackG.push();
    trackG.translate(pStart[0], pStart[1]);
    trackG.rotate(startHeading);
    trackG.noStroke();
    const rows = Math.floor(trackWidth / 6);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 2; c++) {
        trackG.fill((r + c) % 2 === 0 ? 55 : 248);
        trackG.rect(-6 + c * 6, -trackWidth / 2 + r * 6, 6, 6);
      }
    }
    trackG.pop();

    // Petite mare décorative à l'intérieur si elle ne chevauche pas la piste
    const pondClear = !TrackBuilder.isOnTrack(maskPixels, W, H, pondPos.x, pondPos.y, 38);
    if (pondClear) {
      trackG.noStroke();
      trackG.fill(107, 75, 91, 90);
      trackG.ellipse(pondPos.x, pondPos.y + 2, pondPos.rx * 2 + 4, pondPos.ry * 2 + 4);
      trackG.fill(122, 186, 210);
      trackG.ellipse(pondPos.x, pondPos.y, pondPos.rx * 2, pondPos.ry * 2);
      trackG.fill(164, 218, 234);
      trackG.ellipse(pondPos.x - 5, pondPos.y - 3, pondPos.rx * 1.1, pondPos.ry * 0.85);
    }

    // Placement d'arbres, fleurs et ballots de foin dans les zones hors-piste
    const decorNames = ['flower_yellow_s', 'flower_pink_s', 'flower_blue', 'tuft_a', 'tuft_b', 'mush_red', 'tree_apple', 'tree_round'];
    for (let i = 0; i < 65; i++) {
      const dx = 18 + ((i * 97) % (W - 36));
      const dy = 24 + ((i * 61) % (H - 48));
      const isTree = i % 7 === 0;
      const clearance = isTree ? 34 : 20;
      if (!TrackBuilder.isOnTrack(maskPixels, W, H, dx, dy, clearance)) {
        if (pondClear && dist(dx, dy, pondPos.x, pondPos.y) < 42) continue;
        const spName = isTree ? (i % 14 === 0 ? 'tree_apple' : 'tree_round') : decorNames[i % 6];
        const sp = assets ? assets.getSprite(spName) : null;
        if (sp) {
          trackG.image(sp, Math.round(dx - sp.width / 2), Math.round(dy - sp.height / 2));
        }
      }
    }

    // 3. Checkpoints ordonnés régulièrement espacés le long de la courbe
    const checkpoints = [];
    const step = Math.max(2, Math.floor(centerLine.length / 44));
    for (let i = 0; i < centerLine.length; i += step) {
      checkpoints.push([centerLine[i][0], centerLine[i][1]]);
    }

    // 4. Spectateurs lapins animés et ballons de fête placés hors-piste !
    const spectators = [];
    const candidateSpecs = [
      [190, 145], [310, 155], [420, 140], [185, 235],
      [355, 200], [495, 130], [260, 240], [440, 252]
    ];
    for (let i = 0; i < candidateSpecs.length; i++) {
      const [sx, sy] = candidateSpecs[i];
      if (!TrackBuilder.isOnTrack(maskPixels, W, H, sx, sy, 26)) {
        if (pondClear && dist(sx, sy, pondPos.x, pondPos.y) < 38) continue;
        spectators.push({
          x: sx,
          y: sy,
          colour: DerbyBunny.COLOURS[i % DerbyBunny.COLOURS.length],
          phase: i * 1.1,
          facingLeft: sx > W / 2
        });
      }
    }

    const balloons = [];
    const bColors = ['balloon_red', 'balloon_blue', 'balloon_yellow', 'balloon_green', 'balloon_purple'];
    const bSpots = [[36, 54], [600, 56], [40, 318], [596, 316], [312, 34]];
    for (let i = 0; i < bSpots.length; i++) {
      const [bx, by] = bSpots[i];
      if (!TrackBuilder.isOnTrack(maskPixels, W, H, bx, by, 22)) {
        balloons.push({ x: bx, y: by, sprite: bColors[i % bColors.length], phase: i * 1.3 });
      }
    }

    maskG.remove();

    return {
      id: presetId,
      name,
      trackImg: trackG,
      maskPixels,
      maskW: W,
      maskH: H,
      start: [pStart[0], pStart[1]],
      start_heading_rad: startHeading,
      checkpoints_in_order: checkpoints,
      spectators,
      balloons,
      pond: pondClear ? pondPos : null
    };
  }

  /** Vérifie si un cercle autour de (cx, cy) touche la piste blanche. */
  static isOnTrack(maskPixels, W, H, cx, cy, radius) {
    const checkPts = [
      [cx, cy],
      [cx - radius, cy], [cx + radius, cy],
      [cx, cy - radius], [cx, cy + radius],
      [cx - radius * 0.7, cy - radius * 0.7],
      [cx + radius * 0.7, cy + radius * 0.7]
    ];
    for (const [x, y] of checkPts) {
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      if (maskPixels[(iy * W + ix) * 4] > 100) return true;
    }
    return false;
  }
}
