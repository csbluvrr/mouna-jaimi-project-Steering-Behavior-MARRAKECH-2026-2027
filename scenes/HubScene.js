/**
 * Scène principale du Hub : Moo's Funfair (sous-classe de Scene).
 * Reprend fidèlement la mise en page de hub/sketch.js et hub_layout.json,
 * mais remplace tous les mouvements placeholders par des sous-classes de Vehicle
 * gérées via BehaviorManager :
 * - Moo (arrive + avoid + boundaries)
 * - HubButterfly (wander + flee + boundaries)
 * - HubDuckling (wander + separation + boundaries)
 * - Obstacle (Vehicle statique avec maxSpeed = 0)
 */
class HubScene extends Scene {
  constructor(game) {
    super(game);
    // Active le rendu pleine largeur avec caméra horizontale fluide
    this.usesWideCamera = true;
    this.worldLeft = -120;
    this.worldRight = 480 + 120;
    this.camX = 0;

    this.moo = null;
    this.obstacles = [];
    this.butterflies = [];
    this.ducklings = [];
    this.sideObjects = [];
    this.sideBunting = [];
    this.sideLights = [];
    this.leftGroundImg = null;
    this.rightGroundImg = null;
    this.walkBounds = [10, 88, 470, 240];
    this.promptTrigger = null;
    this.overlay = false;
    this.prizeShop = new PrizeShop(game);
    this.prizeBoothPos = { x: 16, y: 84, w: 50, h: 58, sortY: 140 };
    this.toast = '';
    this.toastUntil = 0;
  }

  init(data = {}) {
    const layout = this.game.assets.hubLayout;
    this.overlay = false;
    this.promptTrigger = null;

    // Ajustements propres de position/collision du décor (sans altérer le fichier source)
    this.posterOffsetX = -16; // Décale le panneau d'affiches à gauche pour ne plus chevaucher la mare
    this.solids = layout.solids.map(([sx, sy, sw, sh]) => {
      // Décaler la collision du panneau d'affiches avec lui
      if (sx === 304 && sy === 220 && sw === 58) {
        return [sx + this.posterOffsetX, sy, sw, sh];
      }
      // Élargir et recaler la collision du chat aux ballons pour empêcher de le traverser
      if (sx === 158 && sy === 196 && sw === 14) {
        return [157, 192, 20, 15];
      }
      return [sx, sy, sw, sh];
    });
    // Ajouter une boîte de collision solide sur le panier de pique-nique (36, 210, 16x16)
    this.solids.push([36, 214, 16, 12]);
    // Ajouter le stand Prize Booth (collision solide + déclencheur)
    this.solids.push([
      this.prizeBoothPos.x + 4,
      this.prizeBoothPos.y + 38,
      this.prizeBoothPos.w - 8,
      18
    ]);

    // Construire les prairies latérales (gauche [-120..0] et droite [480..600])
    this.buildSideMeadows();

    // Limites de marche étendues aux prairies latérales
    this.walkBounds = [
      this.worldLeft + 14,
      layout.walk_bounds[1],
      this.worldRight - 14,
      layout.walk_bounds[3]
    ];

    // Triggers ajustés (avec le panneau d'affiches décalé + Prize Booth)
    this.triggers = layout.triggers.map((t) => {
      if (t.id === 'poster') {
        return {
          ...t,
          rect: [t.rect[0] + this.posterOffsetX, t.rect[1], t.rect[2], t.rect[3]],
          stand: [t.stand[0] + this.posterOffsetX, t.stand[1]]
        };
      }
      return t;
    });
    this.triggers.push({
      id: 'prize',
      title: 'Prize Booth',
      rect: [this.prizeBoothPos.x - 2, this.prizeBoothPos.y + 52, this.prizeBoothPos.w + 4, 24],
      stand: [this.prizeBoothPos.x + 25, this.prizeBoothPos.y + 68]
    });

    // Convertir les zones solides du hub (+ prairies latérales) en Obstacles circulaires
    this.obstacles = [];
    this.solids.forEach(([sx, sy, sw, sh]) => {
      const obsList = Obstacle.fromRect(sx, sy, sw, sh);
      for (const o of obsList) {
        this.obstacles.push(o);
      }
    });

    // Position de spawn : devant le stand qu'on vient de quitter, ou à l'entrée
    let spawnX = layout.spawn[0];
    let spawnY = layout.spawn[1];
    if (data && data.fromBooth) {
      const trig = this.triggers.find((t) => t.id === data.fromBooth);
      if (trig && trig.stand) {
        spawnX = trig.stand[0];
        spawnY = trig.stand[1];
      }
    }

    this.moo = new Moo(spawnX, spawnY, this.game.assets);
    this.camX = this.computeTargetCamX();

    // Canetons autour de la mare (Vehicle : wander + separation + boundaries)
    this.ducklings = layout.ducklings.map(
      ([x, y]) => new HubDuckling(x, y, this.game.assets)
    );

    // Papillons d'ambiance (Vehicle : wander + flee quand Moo approche + boundaries)
    this.butterflies = [];
    for (let i = 0; i < layout.butterflies + 2; i++) {
      this.butterflies.push(
        new HubButterfly(random(this.worldLeft + 24, this.worldRight - 24), random(90, 235), this.game.assets)
      );
    }

    this.game.sound.playMusic('hub');

    if (data && data.toast) {
      this.showToast(data.toast, 2600);
    }
  }

  /**
   * Pré-rend le sol herbe + clôture basse des prairies latérales à partir de hub_ground.png
   * pour une jonction 100% invisible, puis place arbres, buissons, fleurs, guirlandes et lumières.
   */
  buildSideMeadows() {
    const assets = this.game.assets;
    const ground = assets.getImage('hub/hub_ground.png');
    const sideW = 120;

    if (!this.leftGroundImg && ground) {
      const makeStrip = (isLeft) => {
        const strip = createGraphics(sideW, BUFFER_H);
        strip.pixelDensity(1);
        strip.noSmooth();

        // Échantillonner exactement la couleur d'herbe de hub_ground.png
        const grassCol = ground.get(4, 4);
        strip.background(grassCol[0], grassCol[1], grassCol[2]);

        // Répéter proprement la clôture basse de hub_ground.png (y = 236..272)
        for (let tx = 0; tx < sideW; tx += 16) {
          strip.image(ground, tx, 236, 16, 36, 16, 236, 16, 36);
        }

        // Petits brins d'herbe subtils pour casser l'uniformité
        strip.noStroke();
        strip.fill(
          Math.max(0, grassCol[0] - 16),
          Math.max(0, grassCol[1] - 14),
          Math.max(0, grassCol[2] - 14)
        );
        for (let i = 0; i < 42; i++) {
          const gx = (i * 29 + (isLeft ? 7 : 19)) % (sideW - 6) + 3;
          const gy = (i * 47 + 15) % 224 + 8;
          strip.rect(gx, gy, 2, 1);
          strip.rect(gx + 2, gy - 1, 1, 2);
        }

        // Poteaux de clôture discrets à l'extrémité du parc
        const edgeX = isLeft ? 4 : sideW - 8;
        for (let py = 20; py < 236; py += 26) {
          strip.fill(107, 75, 91);
          strip.rect(edgeX, py, 4, 14);
          strip.fill(182, 137, 98);
          strip.rect(edgeX + 1, py + 1, 2, 11);
        }

        return strip;
      };

      this.leftGroundImg = makeStrip(true);
      this.rightGroundImg = makeStrip(false);
    }

    // Décorations Y-triées des prairies gauche [-120..0] et droite [480..600]
    this.sideObjects = [
      // --- Prairie gauche ---
      { sprite: 'tree_apple', x: -102, y: 12, sortY: 42, solid: [-98, 30, 16, 10] },
      { sprite: 'tree_tall', x: -58, y: 18, sortY: 46, solid: [-56, 36, 10, 8] },
      { sprite: 'tree_round', x: -28, y: 10, sortY: 40, solid: [-24, 28, 18, 10] },
      { sprite: 'sunflower', x: -86, y: 74, sortY: 118 },
      { sprite: 'bush_berry', x: -46, y: 94, sortY: 109, solid: [-44, 98, 26, 10] },
      { sprite: 'tree_round', x: -106, y: 112, sortY: 142, solid: [-102, 130, 18, 10] },
      { sprite: 'flower_pink', x: -64, y: 132, sortY: 140 },
      { sprite: 'flower_yellow', x: -28, y: 122, sortY: 130 },
      { sprite: 'log', x: -78, y: 168, sortY: 177, solid: [-76, 170, 14, 8] },
      { sprite: 'mush_red', x: -42, y: 174, sortY: 186 },
      { sprite: 'flower_blue', x: -20, y: 164, sortY: 175 },
      { sprite: 'tree_apple', x: -104, y: 188, sortY: 218, solid: [-100, 206, 16, 10] },
      { sprite: 'bush_berry', x: -68, y: 208, sortY: 223, solid: [-66, 212, 26, 10] },
      { sprite: 'mush_purple_b', x: -28, y: 218, sortY: 229 },
      { sprite: 'flower_yellow_s', x: -84, y: 228, sortY: 233 },
      { sprite: 'tuft_a', x: -50, y: 146, sortY: 150 },
      { sprite: 'rock_small', x: -16, y: 86, sortY: 93 },

      // --- Prairie droite ---
      { sprite: 'tree_round', x: 486, y: 10, sortY: 40, solid: [490, 28, 18, 10] },
      { sprite: 'tree_tall', x: 526, y: 16, sortY: 44, solid: [528, 34, 10, 8] },
      { sprite: 'tree_apple', x: 558, y: 12, sortY: 42, solid: [562, 30, 16, 10] },
      { sprite: 'bush_berry', x: 492, y: 88, sortY: 103, solid: [494, 92, 26, 10] },
      { sprite: 'sunflower', x: 548, y: 74, sortY: 118 },
      { sprite: 'tree_round', x: 564, y: 116, sortY: 146, solid: [568, 134, 18, 10] },
      { sprite: 'flower_blue', x: 504, y: 128, sortY: 139 },
      { sprite: 'flower_pink', x: 534, y: 142, sortY: 150 },
      { sprite: 'log', x: 516, y: 170, sortY: 179, solid: [518, 172, 14, 8] },
      { sprite: 'mush_red_b', x: 488, y: 168, sortY: 178 },
      { sprite: 'flower_yellow', x: 550, y: 168, sortY: 176 },
      { sprite: 'hedge_b', x: 492, y: 212, sortY: 227, solid: [494, 216, 26, 10] },
      { sprite: 'tree_apple', x: 554, y: 190, sortY: 220, solid: [558, 208, 16, 10] },
      { sprite: 'mush_purple', x: 534, y: 218, sortY: 226 },
      { sprite: 'flower_pink_s', x: 530, y: 196, sortY: 201 },
      { sprite: 'tuft_b', x: 486, y: 124, sortY: 135 },
      { sprite: 'rock_small', x: 540, y: 92, sortY: 99 }
    ];

    // Ajouter les collisions des arbres/buissons latéraux
    for (const obj of this.sideObjects) {
      if (obj.solid) this.solids.push(obj.solid);
    }

    // Prolonger les guirlandes (y = 66) et lumières basses (y = 242) sur les deux côtés
    this.sideBunting = [];
    this.sideLights = [];
    const buntingSprites = ['bunting_a', 'bunting_b'];
    let idx = 0;
    for (let bx = -112; bx < 0; bx += 16) {
      this.sideBunting.push({ sprite: buntingSprites[idx % 2], x: bx, y: 66 });
      this.sideLights.push({ x: bx, y: 242 });
      idx++;
    }
    for (let bx = 480; bx < 592; bx += 16) {
      this.sideBunting.push({ sprite: buntingSprites[idx % 2], x: bx, y: 66 });
      this.sideLights.push({ x: bx, y: 242 });
      idx++;
    }
  }

  /**
   * Calcule la position X cible de la caméra :
   * - Si Moo est au centre du parc (120..360), la caméra reste posée au centre (480 - viewW) / 2 :
   *   en fenêtré large on voit les prairies latérales ; en plein écran (16:9) on voit le Hub 480x272 normal.
   * - Si Moo marche vers la gauche (< 120) ou la droite (> 360), la caméra suit Moo fluidement.
   */
  computeTargetCamX() {
    const vw = this.game.viewW || BUFFER_W;
    const minCam = this.worldLeft;
    const maxCam = Math.max(minCam, this.worldRight - vw);
    const restingCam = constrain((BUFFER_W - vw) / 2, minCam, maxCam);

    if (!this.moo) return restingCam;

    const mx = this.moo.pos.x;
    if (mx >= 120 && mx <= 360) {
      return restingCam;
    }

    // Suivi fluide de Moo vers les prairies gauche ou droite
    return constrain(mx - vw / 2, minCam, maxCam);
  }

  showToast(msg, durationMs = 2400) {
    this.toast = msg;
    this.toastUntil = millis() + durationMs;
  }

  update() {
    if (this.overlay || (this.prizeShop && this.prizeShop.open)) return;

    // Mise à jour de Moo (déplacement étendu aux prairies latérales)
    this.moo.step(this.solids, this.walkBounds);

    // Suivi fluide de la caméra horizontale
    const targetCamX = this.computeTargetCamX();
    this.camX += (targetCamX - this.camX) * 0.14;
    if (Math.abs(targetCamX - this.camX) < 0.2) this.camX = targetCamX;

    // Mise à jour de la faune d'ambiance (100% Steering Behaviors)
    for (const d of this.ducklings) {
      d.step(this.ducklings);
    }
    for (const b of this.butterflies) {
      b.step(this.moo);
    }

    // Détection de la zone de stand devant laquelle Moo se tient
    const prevTrigger = this.promptTrigger;
    this.promptTrigger =
      this.triggers.find(({ rect: [x, y, w, h] }) =>
        this.moo.pos.x > x &&
        this.moo.pos.x < x + w &&
        this.moo.pos.y > y &&
        this.moo.pos.y < y + h
      ) || null;

    // Bonus d'exploration (+2 tickets) lors de la toute première visite à pied d'un stand
    if (
      this.promptTrigger &&
      this.promptTrigger !== prevTrigger &&
      this.promptTrigger.id !== 'poster'
    ) {
      const awarded = this.game.save.claimFirstVisitBonus(this.promptTrigger.id);
      if (awarded) {
        this.game.sound.playSfx('success_bell', 0.8);
        this.showToast('First visit to ' + this.promptTrigger.title + '! +2 tickets', 2600);
      }
    }
  }

  draw(g) {
    const assets = this.game.assets;
    const layout = assets.hubLayout;
    const font = assets.font;
    const vw = this.game.viewW || BUFFER_W;
    const vh = this.game.viewH || BUFFER_H;
    const oy = Math.floor((vh - BUFFER_H) / 2);
    const camOffset = -Math.round(this.camX);

    g.background(156, 204, 102);

    // === MONDE (avec translation caméra horizontale) ===
    g.push();
    g.translate(camOffset, oy);

    // 1. Sol pré-rendu du parc + prairies latérales + nappe de pique-nique au sol
    if (this.leftGroundImg) g.image(this.leftGroundImg, this.worldLeft, 0);
    const ground = assets.getImage('hub/hub_ground.png');
    if (ground) g.image(ground, 0, 0);
    if (this.rightGroundImg) g.image(this.rightGroundImg, BUFFER_W, 0);

    const blanketObj = layout.objects.find((o) => o.id === 'picnic_blanket');
    if (blanketObj) {
      const bSp = assets.getSprite(blanketObj.sprite);
      if (bSp) g.image(bSp, blanketObj.x, blanketObj.y);
    }

    // 2. Objets triés en Y (stands, arbres, prairies latérales, panneau, chat, panier, Moo, amis, canetons)
    const items = layout.objects
      .filter((o) => o.id !== 'picnic_blanket')
      .map((o) => {
        const ox = o.id === 'poster' ? o.x + this.posterOffsetX : o.x;
        let sortY = o.sortY;
        if (o.id === 'kid_balloon') sortY = 207;
        if (o.id === 'picnic_basket') sortY = 226;
        return {
          sortY,
          draw: () => {
            const sp = assets.getSprite(o.sprite);
            if (sp) g.image(sp, ox, o.y);
          }
        };
      });

    // Décorations Y-triées des prairies gauche et droite
    for (const so of this.sideObjects) {
      items.push({
        sortY: so.sortY,
        draw: () => {
          const sp = assets.getSprite(so.sprite);
          if (sp) g.image(sp, so.x, so.y);
        }
      });
    }

    // Miniatures des 4 jeux collées sur le panneau d'affiches (décalé avec le panneau)
    const pb = layout.objects.find((o) => o.id === 'poster');
    if (pb) {
      const pbx = pb.x + this.posterOffsetX;
      items.push({
        sortY: pb.sortY + 0.1,
        draw: () => {
          layout.games.forEach((gm, i) => {
            const [sx, sy] = layout.poster.slots_in_sprite[i];
            const bSp = assets.getSprite('booth_' + gm.id);
            if (bSp) {
              g.image(bSp, pbx + sx + 4, pb.y + sy + 2, 14, 12, 18, 1, 14, 12);
            }
          });
        }
      });
    }

    // Stand Prize Booth (boutique de cosmétiques & hoodies de Moo)
    items.push({
      sortY: this.prizeBoothPos.sortY,
      draw: () => {
        const sp = assets.getImage('generated/booths/booth_prize.png');
        if (sp) g.image(sp, this.prizeBoothPos.x, this.prizeBoothPos.y);
      }
    });

    // Moo (Vehicle avec sa tenue sauvegardée : behind -> Moo/hoodie -> over)
    items.push({
      sortY: this.moo.pos.y,
      draw: () => this.moo.show(g, this.game.save.data.equippedOutfit)
    });

    // Amis lapins du coin pique-nique
    layout.friends.forEach((f) => {
      items.push({
        sortY: f.y,
        draw: () => {
          const img = assets.getSheetFrame(f.sheet, 32, 32, f.frame[1], f.frame[0]);
          if (img) g.image(img, f.x - 16, f.y - 32);
        }
      });
    });

    // Canetons de la mare (Vehicle)
    this.ducklings.forEach((d) => {
      items.push({ sortY: d.pos.y, draw: () => d.show(g) });
    });

    // Ficelles des ballons dessinées juste derrière le chat (sortY = 206.5 < 207)
    items.push({
      sortY: 206.5,
      draw: () => {
        g.push();
        g.stroke(107, 75, 91, 190);
        g.strokeWeight(1);
        layout.balloons.forEach((b) => {
          const by = b.y + Math.sin(frameCount * 0.05 + b.phase) * 2;
          g.line(Math.round(b.x + 6), Math.round(by + 13), 167, 196);
        });
        g.pop();
      }
    });

    items.sort((a, b) => a.sortY - b.sortY).forEach((it) => it.draw());

    // 3. Éléments au premier plan (guirlandes + côtés, lumières + côtés, ballons, papillons)
    layout.rows.bunting.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, b.y + ((Math.abs(b.x) / 16) % 2 ? 1 : 0));
    });
    this.sideBunting.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, b.y + ((Math.abs(b.x) / 16) % 2 ? 1 : 0));
    });
    layout.rows.lights.forEach((l, i) => {
      const sp = assets.getSprite((Math.floor(frameCount / 30) + i) % 2 ? 'lights_on' : 'lights_dim');
      if (sp) g.image(sp, l.x, l.y);
    });
    this.sideLights.forEach((l, i) => {
      const sp = assets.getSprite((Math.floor(frameCount / 30) + i) % 2 ? 'lights_on' : 'lights_dim');
      if (sp) g.image(sp, l.x, l.y);
    });
    layout.balloons.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, Math.round(b.y + Math.sin(frameCount * 0.05 + b.phase) * 2));
    });
    for (const bf of this.butterflies) {
      bf.show(g);
    }

    // 4. Affichage des obstacles en mode debug (touche H)
    if (Vehicle.debug) {
      for (const obs of this.obstacles) {
        obs.showDebug(g);
      }
    }

    // 5. Bulle d'interaction au-dessus de Moo ou étiquette au survol d'un stand (espace monde)
    if (this.promptTrigger && !this.overlay && !this.prizeShop.open) {
      const label =
        this.promptTrigger.id === 'poster'
          ? 'Pick a game! (P)'
          : (this.promptTrigger.id === 'prize'
            ? 'Open Prize Booth! (Space)'
            : 'Play ' + this.promptTrigger.title + '? (Space)');
      const bob = Math.sin(frameCount * 0.12) * 1.5;
      PixelUI.drawTag(g, font, label, this.moo.pos.x, this.moo.pos.y - 40 + bob);
    }

    const hov = this.hoveredTrigger();
    if (hov && !this.overlay && !this.prizeShop.open && hov !== this.promptTrigger) {
      PixelUI.drawTag(g, font, hov.title, hov.rect[0] + hov.rect[2] / 2, hov.rect[1] - 6);
    }

    g.pop();

    // === INTERFACE ÉCRAN (fixe à la fenêtre) ===
    if (Vehicle.debug) {
      PixelUI.drawTag(g, font, 'DEBUG ON [H] - Vehicles & Avoid', vw - 102, 22, g.color(223, 240, 187));
    }

    // HUD en haut à gauche (tickets)
    this.drawHud(g);

    // Panneau "TODAY'S GAMES" centré sur la fenêtre
    if (this.overlay) {
      this.drawPosterOverlay(g);
    }

    // Boutique des Prix & Garde-Robe de Moo
    if (this.prizeShop && this.prizeShop.open) {
      this.prizeShop.draw(g);
    }

    // Message toast temporaire centré en bas de l'écran
    if (millis() < this.toastUntil && this.toast) {
      const w = Math.round(g.textWidth(this.toast) + 14);
      const cx = Math.round(vw / 2);
      PixelUI.panel(g, cx - Math.round(w / 2), vh - 28, w, 18, g.color(223, 240, 187));
      PixelUI.txt(g, font, this.toast, cx - Math.round(w / 2) + 7, vh - 28, g.color(86, 101, 96));
    }
  }

  drawHud(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const tickets = this.game.save.data.tickets;
    PixelUI.panel(g, 6, 6, 56, 16);
    const ticketSp = assets.getSprite('ticket');
    if (ticketSp) g.image(ticketSp, 10, 8);
    PixelUI.txt(g, font, 'x ' + tickets, 28, 9, g.color(107, 75, 91));
  }

  getOverlayOffsets() {
    const vw = this.game.viewW || BUFFER_W;
    const vh = this.game.viewH || BUFFER_H;
    return {
      ox: Math.floor((vw - BUFFER_W) / 2),
      oy: Math.floor((vh - BUFFER_H) / 2),
      vw,
      vh
    };
  }

  cardRects() {
    const layout = this.game.assets.hubLayout;
    const { ox, oy } = this.getOverlayOffsets();
    const x0 = ox + 80;
    const y0 = oy + 66;
    const cw = 156;
    const ch = 56;
    return layout.games.map((gm, i) => ({
      gm,
      x: x0 + (i % 2) * (cw + 8),
      y: y0 + Math.floor(i / 2) * (ch + 8),
      w: cw,
      h: ch
    }));
  }

  drawPosterOverlay(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    const { ox, oy, vw, vh } = this.getOverlayOffsets();

    g.noStroke();
    g.fill(0, 0, 0, 110);
    g.rect(0, 0, vw, vh);

    PixelUI.panel(g, ox + 70, oy + 34, 340, 176);
    g.fill(189, 117, 126);
    g.rect(ox + 70, oy + 34, 340, 22);
    PixelUI.txt(g, font, "TODAY'S GAMES", ox + 240, oy + 41, g.color(243, 244, 231), CENTER);

    this.cardRects().forEach((c, i) => {
      const hov = PixelUI.pointInRect(mx, my, c);
      const yy = Math.round(c.y + (hov ? -2 + Math.sin(frameCount * 0.3) : 0));
      PixelUI.panel(g, c.x, yy, c.w, c.h, g.color(232, 207, 166));
      PixelUI.txt(g, font, c.gm.title, c.x + 8, yy + 4, g.color(107, 75, 91));

      const bSp = assets.getSprite('booth_' + c.gm.id);
      if (bSp) {
        g.image(bSp, c.x + 8, yy + 26, 28, 24, 18, 1, 14, 12);
      }

      const stars = this.game.save.data.stars[c.gm.id] || 0;
      const starStr = '*'.repeat(stars) + '-'.repeat(3 - stars);
      PixelUI.txt(g, font, 'press ' + (i + 1) + '  [' + starStr + ']', c.x + 44, yy + 30, g.color(144, 98, 93));
    });

    PixelUI.txt(g, font, 'Esc to close', ox + 240, oy + 190, g.color(144, 98, 93), CENTER);
  }

  hoveredTrigger() {
    const assets = this.game.assets;
    const layout = assets.hubLayout;
    const { mx, my } = this.game.getMouseBufferPos();
    const { oy } = this.getOverlayOffsets();
    const wx = mx + this.camX;
    const wy = my - oy;

    return (
      layout.triggers.find((t) => {
        if (t.id === 'poster') return false;
        const o = layout.objects.find((obj) => obj.id === 'booth_' + t.id);
        if (!o) return false;
        const sp = assets.getSprite(o.sprite);
        if (!sp) return false;
        return wx > o.x && wx < o.x + sp.width && wy > o.y && wy < o.y + sp.height;
      }) || null
    );
  }

  enterGame(gameId) {
    this.overlay = false;
    this.moo.stop();
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo(gameId, { fromBooth: gameId });
  }

  mousePressed(mx, my) {
    const layout = this.game.assets.hubLayout;
    const { ox, oy } = this.getOverlayOffsets();

    if (this.prizeShop && this.prizeShop.open) {
      this.prizeShop.mousePressed(mx, my);
      return;
    }

    if (this.overlay) {
      const card = this.cardRects().find((c) => PixelUI.pointInRect(mx, my, c));
      if (card) {
        this.enterGame(card.gm.id);
      } else if (mx < ox + 70 || mx > ox + 410 || my < oy + 34 || my > oy + 210) {
        this.overlay = false;
      }
      return;
    }

    // Conversion coordonnées écran -> monde (en tenant compte de la caméra)
    const wx = mx + this.camX;
    const wy = my - oy;

    // Clic sur le stand Prize Booth -> ouvre directement la boutique & garde-robe
    const pbPos = this.prizeBoothPos;
    if (wx >= pbPos.x && wx <= pbPos.x + pbPos.w && wy >= pbPos.y && wy <= pbPos.y + pbPos.h) {
      this.moo.stop();
      this.prizeShop.show();
      return;
    }

    // Clic sur le panneau d'affiches -> ouvre directement "Today's Games"
    const posterObj = layout.objects.find((o) => o.id === 'poster');
    if (posterObj) {
      const sp = this.game.assets.getSprite(posterObj.sprite);
      const pbx = posterObj.x + this.posterOffsetX;
      if (sp && wx >= pbx && wx <= pbx + sp.width && wy >= posterObj.y && wy <= posterObj.y + sp.height) {
        this.game.sound.playSfx('ui_click');
        this.overlay = true;
        return;
      }
    }

    // Clic sur un stand -> Moo s'y rend
    const t = this.triggers.find(
      ({ rect: [x, y, w, h] }) => wx > x - 10 && wx < x + w + 10 && wy > y - 70 && wy < y + h + 4
    );
    if (t) {
      this.moo.setTarget(t.stand[0], t.stand[1]);
      return;
    }

    // Clic libre dans le parc ou les prairies latérales -> Moo y marche
    this.moo.setTarget(wx, wy);
  }

  keyPressed(k, kc) {
    const layout = this.game.assets.hubLayout;

    if (this.prizeShop && this.prizeShop.open) {
      this.prizeShop.keyPressed(k, kc);
      return;
    }

    if (k === 'p' || k === 'P') {
      this.game.sound.playSfx('ui_click');
      this.overlay = !this.overlay;
      return;
    }

    if (kc === ESCAPE) {
      if (this.overlay) {
        this.overlay = false;
      } else {
        this.game.scenes.switchTo('title');
      }
      return;
    }

    if (this.overlay && k >= '1' && k <= '4') {
      const gm = layout.games[parseInt(k, 10) - 1];
      if (gm) this.enterGame(gm.id);
      return;
    }

    if (k === ' ' && this.promptTrigger && !this.overlay) {
      if (this.promptTrigger.id === 'poster') {
        this.game.sound.playSfx('ui_click');
        this.overlay = true;
      } else if (this.promptTrigger.id === 'prize') {
        this.moo.stop();
        this.prizeShop.show();
      } else {
        this.enterGame(this.promptTrigger.id);
      }
    }
  }
}
