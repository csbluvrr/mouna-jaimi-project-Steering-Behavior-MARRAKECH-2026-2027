/**
 * Scène principale du Hub : Moo's Funfair — Promenade continue en 3 ailes reliées !
 * - Aile Ouest  [-480 ..   0] : Prize Booth (tenues & hoodies) + 2 pavillons "Coming Soon" + promenade fleurie
 * - Place Cœur  [   0 .. 480] : Hub original intact (Arche MOO'S FUNFAIR, Grande Roue animée,
 *                               les 4 stands de jeux, Pique-nique, Chat aux ballons, Poster GAMES,
 *                               Panneau MAP, Mare aux canetons & Vache)
 * - Aile Est    [ 480 .. 960] : 2 pavillons "Coming Soon" + coin détente + renard curieux & visiteurs
 *
 * Aucune coupure de scène : la caméra glisse de façon continue lorsque Moo marche vers l'Ouest ou l'Est !
 */
class HubScene extends Scene {
  constructor(game) {
    super(game);
    this.usesWideCamera = true;
    this.worldLeft = -480;
    this.worldRight = 960;
    this.camX = 0;

    this.moo = null;
    this.obstacles = [];
    this.solids = [];
    this.triggers = [];
    this.visitors = [];
    this.butterflies = [];
    this.ducklings = [];
    this.wingObjects = [];
    this.wingPlaceholders = [];
    this.wingBunting = [];
    this.wingLights = [];
    this.wingBalloons = [];

    this.westGroundImg = null;
    this.eastGroundImg = null;
    this.walkBounds = [-462, 102, 942, 240];

    this.promptTrigger = null;
    this.overlay = false;     // Panneau "TODAY'S GAMES"
    this.mapOverlay = false;  // Panneau "FUNFAIR MAP"
    this.prizeShop = new PrizeShop(game);
    this.posterOffsetX = -16;

    // Positions des stands ajoutés
    this.prizeBoothPos = { x: -245, y: 76, w: 50, h: 58, sortY: 134 };
    this.mapBoardPos = { x: 256, y: 184, w: 24, h: 36, sortY: 220 };

    // Code secret Debug [H] : *** montre [+], n* cache [+]
    this.secretStarCount = 0;
    this.secretLastWasN = false;
    this.showTicketCheat = false;
    this.ticketPlusBtn = { x: 66, y: 6, w: 18, h: 16 };

    this.toast = '';
    this.toastUntil = 0;
  }

  init(data = {}) {
    const layout = this.game.assets.hubLayout;
    this.overlay = false;
    this.mapOverlay = false;
    this.promptTrigger = null;

    // 1. Sols pré-rendus des ailes Ouest [-480..0] et Est [480..960]
    this.buildWingGrounds();

    // 2. Collisions du Hub central original (intact, avec décalage propre du poster et du chat)
    this.solids = layout.solids.map(([sx, sy, sw, sh]) => {
      if (sx === 304 && sy === 220 && sw === 58) return [sx + this.posterOffsetX, sy, sw, sh];
      if (sx === 158 && sy === 196 && sw === 14) return [157, 192, 20, 15];
      return [sx, sy, sw, sh];
    });
    this.solids.push([36, 214, 16, 12]); // Panier pique-nique
    this.solids.push([this.mapBoardPos.x + 2, this.mapBoardPos.y + 24, 20, 10]); // Panneau MAP

    // Collisions de l'aile Ouest & Est (Prize Booth + pavillons placeholders + bancs)
    this.solids.push(
      [this.prizeBoothPos.x + 4, this.prizeBoothPos.y + 36, 42, 22], // Prize Booth
      [-392, 112, 46, 22], // Placeholder Ouest 1 (Cotton Candy)
      [-108, 112, 46, 22], // Placeholder Ouest 2 (Photo Booth)
      [564, 112, 46, 22],  // Placeholder Est 1 (Ring Toss)
      [764, 112, 46, 22],  // Placeholder Est 2 (Fortune Tent)
      [-322, 198, 16, 8],  // Banc Ouest
      [-156, 198, 16, 8],  // Banc Ouest 2
      [656, 198, 16, 8],   // Banc Est
      [840, 198, 16, 8]    // Banc Est 2
    );

    // 3. Décorations cohérentes et ordonnées des ailes Ouest et Est
    this.buildWingDecor();

    // 4. Triggers (4 stands originaux renommés + Poster + MAP + Prize Booth)
    const renamedTitles = {
      derby: 'Bunny Derby',
      snake: 'PokeMoo Feast!!',
      ducklings: 'Catch the Purins!',
      fox: 'The Legend of Moo'
    };
    this.triggers = layout.triggers.map((t) => {
      const title = renamedTitles[t.id] || t.title;
      if (t.id === 'poster') {
        return {
          ...t,
          title,
          rect: [t.rect[0] + this.posterOffsetX, t.rect[1], t.rect[2], t.rect[3]],
          stand: [t.stand[0] + this.posterOffsetX, t.stand[1]]
        };
      }
      return { ...t, title };
    });
    this.triggers.push(
      {
        id: 'map',
        title: 'Funfair Map',
        rect: [this.mapBoardPos.x - 4, this.mapBoardPos.y + 28, 32, 20],
        stand: [this.mapBoardPos.x + 12, this.mapBoardPos.y + 44]
      },
      {
        id: 'prize',
        title: 'Prize Booth',
        rect: [this.prizeBoothPos.x - 2, this.prizeBoothPos.y + 56, 54, 22],
        stand: [this.prizeBoothPos.x + 25, this.prizeBoothPos.y + 72]
      }
    );

    // Convertir toutes les zones solides en Obstacles circulaires (Vehicle fixes)
    this.obstacles = [];
    this.solids.forEach(([sx, sy, sw, sh]) => {
      const obsList = Obstacle.fromRect(sx, sy, sw, sh);
      for (const o of obsList) this.obstacles.push(o);
    });

    // 5. Position de spawn de Moo
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

    // 6. Canetons autour de la mare du Hub central (Vehicle)
    this.ducklings = layout.ducklings.map(([x, y]) => new HubDuckling(x, y, this.game.assets));

    // 7. Visiteurs & mascottes répartis harmonieusement sur les 3 ailes (FairVisitor extends Vehicle)
    this.visitors = [
      // Aile Ouest (Promenade des Prix)
      new FairVisitor(-184, 138, 'girl', this.game.assets, {
        stationary: true,
        greeting: 'Welcome to the Prize Booth!'
      }),
      new FairVisitor(-295, 166, 'carrot', this.game.assets, {
        bounds: [-410, 140, 280, 76],
        greeting: 'Spend tickets on cute hats!'
      }),
      new FairVisitor(-142, 186, 'new_bunny', this.game.assets, {
        bounds: [-210, 152, 160, 68]
      }),

      // Place Centrale (Hub principal vivant mais aéré)
      new FairVisitor(218, 162, 'carrot', this.game.assets, {
        bounds: [120, 140, 220, 78],
        greeting: "Welcome to Moo's Funfair!"
      }),
      new FairVisitor(116, 178, 'new_bunny', this.game.assets, {
        bounds: [60, 148, 130, 62]
      }),
      new FairVisitor(362, 160, 'kid', this.game.assets, {
        bounds: [280, 140, 140, 56],
        greeting: 'Check the Map or Games board!'
      }),

      // Aile Est (Prairie du Carnaval)
      new FairVisitor(630, 144, 'fox_nap', this.game.assets, {
        stationary: true,
        greeting: 'New booths opening soon!'
      }),
      new FairVisitor(712, 166, 'girl', this.game.assets, {
        stationary: true,
        greeting: 'Such a cozy funfair meadow!'
      }),
      new FairVisitor(540, 176, 'kid', this.game.assets, {
        bounds: [500, 144, 190, 72]
      }),
      new FairVisitor(812, 184, 'new_bunny', this.game.assets, {
        bounds: [720, 150, 170, 70]
      })
    ];

    // 8. Papillons répartis doucement sur les 3 ailes
    this.butterflies = [];
    for (let i = 0; i < 10; i++) {
      this.butterflies.push(
        new HubButterfly(random(-420, 900), random(108, 228), this.game.assets)
      );
    }

    this.game.sound.playMusic('hub');
    if (data && data.toast) this.showToast(data.toast, 2600);
  }

  /** Pré-rend les sols des ailes Ouest [-480..0] et Est [480..960] dans le même style que hub_ground.png. */
  buildWingGrounds() {
    if (this.westGroundImg && this.eastGroundImg) return;
    const ground = this.game.assets.getImage('hub/hub_ground.png');
    if (!ground) return;
    const grassCol = ground.get(4, 120);

    const makeWing = (isWest) => {
      const img = createGraphics(BUFFER_W, BUFFER_H);
      img.pixelDensity(1);
      img.noSmooth();
      img.background(grassCol[0], grassCol[1], grassCol[2]);

      // Allée sable principale prolongeant exactement celle du Hub central (y=134..168)
      img.noStroke();
      img.fill(218, 194, 148);
      img.rect(0, 134, BUFFER_W, 34);
      img.fill(232, 210, 166);
      img.rect(0, 137, BUFFER_W, 28);

      // Parvis propres devant chaque stand / pavillon
      if (isWest) {
        // Coordonnées locales dans [-480..0] -> +480
        img.rect(82, 126, 62, 16, 5);   // Cotton Candy (-398)
        img.rect(225, 124, 70, 22, 6);  // Prize Booth (-245) — parvis central mis en valeur
        img.rect(366, 126, 62, 16, 5);  // Photo Booth (-114)
      } else {
        // Coordonnées locales dans [480..960] -> -480
        img.rect(78, 126, 62, 16, 5);   // Ring Toss (558)
        img.rect(278, 126, 62, 16, 5);  // Fortune Tent (758)
      }

      // Clôture bois basse copiée de hub_ground.png
      for (let tx = 0; tx < BUFFER_W; tx += 16) {
        img.image(ground, tx, 236, 16, 36, 16, 236, 16, 36);
      }

      // Poteaux de clôture d'extrémité tout à gauche (Ouest) ou tout à droite (Est)
      const endX = isWest ? 8 : BUFFER_W - 12;
      for (let py = 102; py < 236; py += 24) {
        img.fill(107, 75, 91);
        img.rect(endX, py, 4, 14);
        img.fill(182, 137, 98);
        img.rect(endX + 1, py + 1, 2, 11);
      }

      // Brins d'herbe subtils et réguliers
      img.fill(Math.max(0, grassCol[0] - 16), Math.max(0, grassCol[1] - 14), Math.max(0, grassCol[2] - 14));
      for (let i = 0; i < 48; i++) {
        const gx = (i * 61 + (isWest ? 13 : 29)) % (BUFFER_W - 24) + 12;
        const gy = (i * 41 + 104) % 124 + 102;
        if (gy > 130 && gy < 172) continue;
        img.rect(gx, gy, 2, 1);
      }
      return img;
    };

    this.westGroundImg = makeWing(true);
    this.eastGroundImg = makeWing(false);
  }

  /** Place des décors logiques et aérés sur les ailes Ouest et Est (sans surcharge aléatoire). */
  buildWingDecor() {
    this.wingObjects = [
      // --- Aile Ouest : arbres en lisière, bancs ordonnés, massifs fleuris ---
      { sprite: 'tree_apple', x: -454, y: 66, sortY: 96 },
      { sprite: 'tree_round', x: -322, y: 66, sortY: 96 },
      { sprite: 'tree_tall',  x: -176, y: 68, sortY: 96 },
      { sprite: 'tree_round', x: -44,  y: 66, sortY: 96 },
      { sprite: 'log', x: -324, y: 196, sortY: 205 },
      { sprite: 'log', x: -158, y: 196, sortY: 205 },
      { sprite: 'flower_pink', x: -340, y: 198, sortY: 204 },
      { sprite: 'flower_yellow', x: -136, y: 198, sortY: 204 },
      { sprite: 'bush_berry', x: -444, y: 204, sortY: 218 },
      { sprite: 'flower_blue', x: -240, y: 202, sortY: 210 },

      // --- Aile Est : arbres en lisière, bancs de repos, parterres symétriques ---
      { sprite: 'tree_round', x: 500, y: 66, sortY: 96 },
      { sprite: 'tree_tall',  x: 642, y: 68, sortY: 96 },
      { sprite: 'tree_apple', x: 706, y: 66, sortY: 96 },
      { sprite: 'tree_round', x: 862, y: 66, sortY: 96 },
      { sprite: 'tree_apple', x: 912, y: 66, sortY: 96 },
      { sprite: 'log', x: 654, y: 196, sortY: 205 },
      { sprite: 'log', x: 838, y: 196, sortY: 205 },
      { sprite: 'flower_yellow', x: 636, y: 198, sortY: 204 },
      { sprite: 'flower_pink', x: 860, y: 198, sortY: 204 },
      { sprite: 'bush_berry', x: 904, y: 204, sortY: 218 }
    ];

    // Pavillons "Coming Soon" cohérents avec l'esthétique des stands Sprout Lands
    this.wingPlaceholders = [
      { x: -394, y: 76, w: 50, h: 58, sortY: 134, stripe: [248, 178, 198], label: 'SWEETS' },
      { x: -110, y: 76, w: 50, h: 58, sortY: 134, stripe: [176, 212, 240], label: 'PHOTO' },
      { x: 562,  y: 76, w: 50, h: 58, sortY: 134, stripe: [192, 226, 166], label: 'RINGS' },
      { x: 762,  y: 76, w: 50, h: 58, sortY: 134, stripe: [214, 184, 232], label: 'TAROT' }
    ];

    // Ballons discrets encadrant le Prize Booth
    this.wingBalloons = [
      { sprite: 'balloon_pink',   x: -260, y: 84, phase: 0.4 },
      { sprite: 'balloon_yellow', x: -190, y: 82, phase: 2.0 }
    ];

    // Guirlandes (y=90) et lumières basses (y=242) continues sur les deux ailes
    this.wingBunting = [];
    this.wingLights = [];
    const buntingSprites = ['bunting_a', 'bunting_b'];
    let idx = 0;
    for (let bx = -480; bx < 0; bx += 16) {
      this.wingBunting.push({ sprite: buntingSprites[idx % 2], x: bx, y: 90 });
      this.wingLights.push({ x: bx, y: 242 });
      idx++;
    }
    for (let bx = 480; bx < 960; bx += 16) {
      this.wingBunting.push({ sprite: buntingSprites[idx % 2], x: bx, y: 90 });
      this.wingLights.push({ x: bx, y: 242 });
      idx++;
    }
  }

  /** Caméra horizontale 100% continue : suit Moo sans aucun saut ni zone morte sur tout [-480 .. 960]. */
  computeTargetCamX() {
    const vw = this.game.viewW || BUFFER_W;
    const minCam = this.worldLeft;
    const maxCam = Math.max(minCam, this.worldRight - vw);
    if (!this.moo) return constrain((BUFFER_W - vw) / 2, minCam, maxCam);
    return constrain(this.moo.pos.x - vw / 2, minCam, maxCam);
  }

  showToast(msg, durationMs = 2400) {
    this.toast = msg;
    this.toastUntil = millis() + durationMs;
  }

  update() {
    if (this.overlay || this.mapOverlay || (this.prizeShop && this.prizeShop.open)) return;

    this.moo.step(this.solids, this.walkBounds);

    // Glissement exponentiel ultra-fluide indépendant du framerate
    const dt = Math.min(0.05, (typeof deltaTime === 'number' ? deltaTime : 16.6) / 1000);
    const smooth = 1 - Math.exp(-7.5 * dt);
    const targetCamX = this.computeTargetCamX();
    this.camX += (targetCamX - this.camX) * smooth;
    if (Math.abs(targetCamX - this.camX) < 0.08) this.camX = targetCamX;

    // Mise à jour de la faune et des visiteurs (100% Steering Behaviors)
    for (const v of this.visitors) v.step(this.moo, this.visitors, this.obstacles);
    for (const d of this.ducklings) d.step(this.ducklings);
    for (const b of this.butterflies) b.step(this.moo);

    // Détection du stand devant lequel Moo se tient
    const prevTrigger = this.promptTrigger;
    this.promptTrigger =
      this.triggers.find(({ rect: [x, y, w, h] }) =>
        this.moo.pos.x > x &&
        this.moo.pos.x < x + w &&
        this.moo.pos.y > y &&
        this.moo.pos.y < y + h
      ) || null;

    if (
      this.promptTrigger &&
      this.promptTrigger !== prevTrigger &&
      this.promptTrigger.id !== 'poster' &&
      this.promptTrigger.id !== 'map' &&
      this.promptTrigger.id !== 'prize'
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
    const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
    const groundTop = 94;

    g.background(156, 204, 102);

    // === 0. CIEL PARALLAXE ANIMÉ ===
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.draw(g, assets, skyMood, vw, this.camX, oy);
    }

    // === MONDE CONTINU [-480 .. 960] ===
    g.push();
    g.translate(camOffset, oy);

    // 1. Sols des 3 ailes sous l'horizon (y >= 94)
    if (this.westGroundImg) {
      g.image(this.westGroundImg, -BUFFER_W, groundTop, BUFFER_W, BUFFER_H - groundTop, 0, groundTop, BUFFER_W, BUFFER_H - groundTop);
    }
    const ground = assets.getImage('hub/hub_ground.png');
    if (ground) {
      g.image(ground, 0, groundTop, BUFFER_W, BUFFER_H - groundTop, 0, groundTop, BUFFER_W, BUFFER_H - groundTop);
    }
    if (this.eastGroundImg) {
      g.image(this.eastGroundImg, BUFFER_W, groundTop, BUFFER_W, BUFFER_H - groundTop, 0, groundTop, BUFFER_W, BUFFER_H - groundTop);
    }

    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawHorizonBlend(g, skyMood, this.worldLeft, this.worldRight, groundTop);
    }

    // Nappe de pique-nique à plat au sol
    const blanketObj = layout.objects.find((o) => o.id === 'picnic_blanket');
    if (blanketObj) {
      const bSp = assets.getSprite(blanketObj.sprite);
      if (bSp) g.image(bSp, blanketObj.x, blanketObj.y);
    }

    // 2. Objets Y-triés du Hub central original (les 4 stands + Grande Roue tournante + Poster + MAP)
    const items = layout.objects
      .filter((o) => {
        if (o.id === 'picnic_blanket') return false;
        if (o.id !== 'title_sign' && o.id !== 'ferris' && !o.sprite.startsWith('tree_') && !o.sprite.startsWith('booth_') && o.y < 88) {
          return false;
        }
        return true;
      })
      .map((o) => {
        let ox = o.x;
        let oyObj = o.y;
        let sortY = o.sortY;
        if (o.id === 'poster') ox += this.posterOffsetX;
        if (o.id === 'kid_balloon') sortY = 207;
        if (o.id === 'picnic_basket') sortY = 226;
        if (o.sprite.startsWith('tree_') && o.y < 52) {
          oyObj = 66 + (o.x % 5);
          sortY = 96;
        }
        return {
          sortY,
          draw: () => {
            // Grande Roue animée qui tourne doucement avec ses nacelles et ses guirlandes lumineuses !
            if (o.id === 'ferris') {
              this.drawAnimatedFerrisWheel(g, ox + 41, oyObj + 44);
              return;
            }
            if (o.id === 'title_sign') {
              g.push();
              g.noStroke();
              g.fill(107, 75, 91);
              g.rect(ox + 10, oyObj + 32, 8, 64);
              g.rect(ox + 154, oyObj + 32, 8, 64);
              g.fill(144, 98, 93);
              g.rect(ox + 11, oyObj + 32, 6, 63);
              g.rect(ox + 155, oyObj + 32, 6, 63);
              g.pop();
            }
            const sp = assets.getSprite(o.sprite);
            if (sp) g.image(sp, ox, oyObj);
          }
        };
      });

    // Miniatures des 4 jeux sur le panneau GAMES
    const pb = layout.objects.find((o) => o.id === 'poster');
    if (pb) {
      const pbx = pb.x + this.posterOffsetX;
      items.push({
        sortY: pb.sortY + 0.1,
        draw: () => {
          layout.games.forEach((gm, i) => {
            const [sx, sy] = layout.poster.slots_in_sprite[i];
            const bSp = assets.getSprite('booth_' + gm.id);
            if (bSp) g.image(bSp, pbx + sx + 4, pb.y + sy + 2, 14, 12, 18, 1, 14, 12);
          });
        }
      });
    }

    // Panneau MAP en bois juste à côté du panneau GAMES !
    items.push({
      sortY: this.mapBoardPos.sortY,
      draw: () => this.drawMapSignpost(g, font, this.mapBoardPos)
    });

    // Stand Prize Booth dans l'aile Ouest
    items.push({
      sortY: this.prizeBoothPos.sortY,
      draw: () => {
        const sp = assets.getImage('generated/booths/booth_prize.png');
        if (sp) g.image(sp, this.prizeBoothPos.x, this.prizeBoothPos.y);
      }
    });

    // Pavillons "Coming Soon" cohérents des ailes Ouest & Est
    for (const ph of this.wingPlaceholders) {
      items.push({
        sortY: ph.sortY,
        draw: () => this.drawPlaceholderBooth(g, font, ph)
      });
    }

    // Décors des ailes Ouest & Est
    for (const wo of this.wingObjects) {
      items.push({
        sortY: wo.sortY,
        draw: () => {
          const sp = assets.getSprite(wo.sprite);
          if (sp) g.image(sp, wo.x, wo.y);
        }
      });
    }

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

    // Visiteurs & mascottes sur les 3 ailes
    for (const v of this.visitors) {
      items.push({ sortY: v.pos.y, draw: () => v.show(g) });
    }

    // Canetons de la mare
    for (const d of this.ducklings) {
      items.push({ sortY: d.pos.y, draw: () => d.show(g) });
    }

    // Ficelles des ballons du chat
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

    // Moo (avec tenue cosmétique sauvegardée)
    items.push({
      sortY: this.moo.pos.y,
      draw: () => this.moo.show(g, this.game.save.data.equippedOutfit)
    });

    items.sort((a, b) => a.sortY - b.sortY).forEach((it) => it.draw());

    // 3. Guirlandes, lumières, ballons et papillons
    layout.rows.bunting.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, 90 + ((Math.abs(b.x) / 16) % 2 ? 1 : 0));
    });
    this.wingBunting.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, 90 + ((Math.abs(b.x) / 16) % 2 ? 1 : 0));
    });
    layout.rows.lights.forEach((l, i) => {
      const sp = assets.getSprite((Math.floor(frameCount / 30) + i) % 2 ? 'lights_on' : 'lights_dim');
      if (sp) g.image(sp, l.x, l.y);
    });
    this.wingLights.forEach((l, i) => {
      const sp = assets.getSprite((Math.floor(frameCount / 30) + i) % 2 ? 'lights_on' : 'lights_dim');
      if (sp) g.image(sp, l.x, l.y);
    });
    layout.balloons.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, Math.round(b.y + Math.sin(frameCount * 0.05 + b.phase) * 2));
    });
    this.wingBalloons.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, Math.round(b.y + Math.sin(frameCount * 0.05 + b.phase) * 2));
    });
    for (const bf of this.butterflies) bf.show(g);

    if (Vehicle.debug) {
      for (const obs of this.obstacles) obs.showDebug(g);
    }

    // Bulle d'interaction au-dessus de Moo
    if (this.promptTrigger && !this.overlay && !this.mapOverlay && !this.prizeShop.open) {
      const label =
        this.promptTrigger.id === 'poster'
          ? 'Pick a game! (P)'
          : (this.promptTrigger.id === 'map'
            ? 'Open Funfair Map! (Space)'
            : (this.promptTrigger.id === 'prize'
              ? 'Open Prize Booth! (Space)'
              : 'Play ' + this.promptTrigger.title + '? (Space)'));
      const bob = Math.sin(frameCount * 0.12) * 1.5;
      PixelUI.drawTag(g, font, label, this.moo.pos.x, this.moo.pos.y - 40 + bob);
    }

    g.pop();

    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawMoodGlaze(g, skyMood, vw, vh);
    }

    // === INTERFACE ÉCRAN ===
    if (Vehicle.debug) {
      PixelUI.drawTag(g, font, 'DEBUG [H]: Vehicles & Avoid', vw - 102, 22, g.color(223, 240, 187));
    }

    this.drawHud(g);

    if (this.overlay) this.drawPosterOverlay(g);
    if (this.mapOverlay) this.drawMapOverlay(g);
    if (this.prizeShop && this.prizeShop.open) this.prizeShop.draw(g);

    if (millis() < this.toastUntil && this.toast) {
      const w = Math.round(PixelUI.measureText(g, this.toast, 9) + 16);
      const cx = Math.round(vw / 2);
      PixelUI.panel(g, cx - Math.round(w / 2), vh - 26, w, 18, g.color(223, 240, 187));
      PixelUI.txt(g, font, this.toast, cx, vh - 23, g.color(70, 101, 80), CENTER, 9, w - 8);
    }
  }

  /**
   * Grande Roue centrale animée :
   * - Support en A en bois Sprout Lands fixe
   * - Roue et rayons qui tournent doucement en continu
   * - 8 nacelles colorées pastel qui restent toujours droites pendant la rotation
   * - Guirlande de petites ampoules chaudes qui scintillent sur la jante !
   */
  drawAnimatedFerrisWheel(g, cx, cy) {
    const r = 34;
    const rot = frameCount * 0.008;
    const podColors = [
      [246, 152, 174], // rose
      [252, 222, 128], // jaune
      [158, 212, 236], // bleu ciel
      [176, 226, 158], // menthe
      [212, 176, 232], // lavande
      [250, 188, 138], // pêche
      [246, 152, 174],
      [158, 212, 236]
    ];

    g.push();
    // 1. Structure arrière (support en A)
    g.stroke(107, 75, 91);
    g.strokeWeight(5);
    g.line(cx, cy, cx - 22, cy + 48);
    g.line(cx, cy, cx + 22, cy + 48);
    g.stroke(166, 118, 92);
    g.strokeWeight(3);
    g.line(cx, cy, cx - 22, cy + 48);
    g.line(cx, cy, cx + 22, cy + 48);

    // Socle en bois
    g.noStroke();
    g.fill(107, 75, 91);
    g.rect(cx - 28, cy + 45, 56, 7, 2);
    g.fill(182, 137, 98);
    g.rect(cx - 26, cy + 46, 52, 5, 1);

    // 2. Rayons tournants + double jante
    g.stroke(144, 98, 93);
    g.strokeWeight(1.5);
    for (let i = 0; i < 8; i++) {
      const a = rot + (TWO_PI * i) / 8;
      g.line(cx, cy, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r));
    }

    g.noFill();
    g.stroke(107, 75, 91);
    g.strokeWeight(4);
    g.circle(cx, cy, r * 2);
    g.stroke(232, 207, 166);
    g.strokeWeight(2);
    g.circle(cx, cy, r * 2);
    g.stroke(182, 137, 98);
    g.strokeWeight(1);
    g.circle(cx, cy, r * 1.2);

    // 3. Guirlande d'ampoules scintillantes autour de la roue (16 lumières)
    g.noStroke();
    for (let i = 0; i < 16; i++) {
      const a = rot + (TWO_PI * i) / 16;
      const lx = Math.round(cx + Math.cos(a) * r);
      const ly = Math.round(cy + Math.sin(a) * r);
      const lit = (Math.floor(frameCount / 14) + i) % 2 === 0;
      g.fill(lit ? g.color(255, 246, 164) : g.color(255, 188, 198, 210));
      g.rect(lx - 1, ly - 1, 2, 2);
    }

    // 4. Moyeu central doré
    g.fill(107, 75, 91);
    g.circle(cx, cy, 10);
    g.fill(247, 224, 134);
    g.circle(cx, cy, 6);

    // 5. 8 Nacelles suspendues qui restent droites pendant la rotation !
    for (let i = 0; i < 8; i++) {
      const a = rot + (TWO_PI * i) / 8;
      const gx = Math.round(cx + Math.cos(a) * r);
      const gy = Math.round(cy + Math.sin(a) * r);
      const col = podColors[i];

      // Barre de suspension
      g.stroke(107, 75, 91);
      g.strokeWeight(1);
      g.line(gx, gy, gx, gy + 3);

      // Nacelle pastel
      g.fill(col[0], col[1], col[2]);
      g.rect(gx - 4, gy + 3, 8, 7, 1);
      g.noStroke();
      g.fill(255, 250, 232);
      g.rect(gx - 3, gy + 4, 6, 2);
    }
    g.pop();
  }

  /** Dessine un pavillon "Coming Soon" proprement intégré dans le style Sprout Lands. */
  drawPlaceholderBooth(g, font, ph) {
    const x = ph.x;
    const y = ph.y;
    g.push();
    // Fond intérieur + poteaux
    g.noStroke();
    g.fill(236, 224, 198);
    g.rect(x + 5, y + 22, 40, 20);
    g.fill(107, 75, 91);
    g.rect(x + 4, y + 22, 5, 34);
    g.rect(x + 41, y + 22, 5, 34);
    g.fill(182, 137, 98);
    g.rect(x + 5, y + 23, 3, 32);
    g.rect(x + 42, y + 23, 3, 32);

    // Comptoir bois
    g.fill(107, 75, 91);
    g.rect(x + 3, y + 38, 44, 19);
    g.fill(218, 178, 134);
    g.rect(x + 4, y + 39, 42, 5);
    g.fill(166, 118, 92);
    g.rect(x + 4, y + 45, 42, 11);

    // Auvent rayé pastel
    for (let i = 0; i < 6; i++) {
      const sx = x + 2 + i * 8;
      const sw = Math.min(8, x + 48 - sx);
      g.fill(107, 75, 91);
      g.rect(sx, y + 13, sw, 13);
      g.fill(i % 2 === 0 ? g.color(ph.stripe[0], ph.stripe[1], ph.stripe[2]) : g.color(247, 236, 198));
      g.rect(sx + 1, y + 14, sw - 2, 10);
    }

    // Enseigne bois "SOON"
    PixelUI.panel(g, x + 8, y + 2, 34, 11, g.color(247, 236, 198));
    PixelUI.txt(g, font, ph.label, x + 25, y + 3, g.color(107, 75, 91), CENTER, 6.5, 32);
    PixelUI.txt(g, font, 'SOON', x + 25, y + 28, g.color(144, 98, 93), CENTER, 6.5, 34);
    g.pop();
  }

  /** Dessine le petit panneau en bois MAP juste à côté du panneau GAMES. */
  drawMapSignpost(g, font, m) {
    g.push();
    g.noStroke();
    // Poteau bois
    g.fill(107, 75, 91);
    g.rect(m.x + 9, m.y + 20, 6, 16);
    g.fill(166, 118, 92);
    g.rect(m.x + 10, m.y + 20, 4, 15);
    // Panneau parchemin encadré
    PixelUI.panel(g, m.x, m.y, m.w, 22, g.color(247, 236, 198));
    g.fill(112, 162, 198);
    g.rect(m.x + 1, m.y + 1, m.w - 2, 9);
    PixelUI.txt(g, font, 'MAP', m.x + m.w / 2, m.y + 2, g.color(255, 252, 238), CENTER, 6.5);
    // Mini schéma de 3 points reliés
    g.fill(189, 117, 126);
    g.rect(m.x + 4, m.y + 14, 3, 3);
    g.fill(114, 172, 106);
    g.rect(m.x + 11, m.y + 14, 3, 3);
    g.fill(112, 162, 198);
    g.rect(m.x + 18, m.y + 14, 3, 3);
    g.pop();
  }

  /** Carte interactive de la fête foraine (3 ailes + position en direct de Moo + téléportation rapide). */
  getMapDestinations() {
    const { ox, oy } = this.getOverlayOffsets();
    return [
      { id: 'west',  label: 'Prize Booth',  x: ox + 80,  y: oy + 102, w: 96, h: 42, targetX: -220, targetY: 152, col: [248, 184, 200] },
      { id: 'plaza', label: 'Main Plaza',   x: ox + 192, y: oy + 102, w: 96, h: 42, targetX: 240,  targetY: 160, col: [223, 240, 187] },
      { id: 'east',  label: 'East Meadow',  x: ox + 304, y: oy + 102, w: 96, h: 42, targetX: 660,  targetY: 156, col: [186, 224, 244] }
    ];
  }

  drawMapOverlay(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    const { ox, oy, vw, vh } = this.getOverlayOffsets();

    g.push();
    g.noStroke();
    g.fill(26, 20, 32, 130);
    g.rect(0, 0, vw, vh);

    PixelUI.panel(g, ox + 58, oy + 42, 364, 172, g.color(250, 242, 212));
    g.fill(112, 162, 198);
    g.rect(ox + 60, oy + 44, 360, 22, 1);
    PixelUI.txt(g, font, "MOO'S FUNFAIR — PARK MAP", ox + 240, oy + 49, g.color(255, 252, 238), CENTER, 10);

    PixelUI.txt(g, font, 'Walk left/right smoothly or click any area to fast-travel:', ox + 240, oy + 76, g.color(107, 75, 91), CENTER, 8.5, 340);

    // Ligne de promenade reliant les 3 zones
    g.stroke(182, 137, 98);
    g.strokeWeight(4);
    g.line(ox + 128, oy + 123, ox + 352, oy + 123);

    const dests = this.getMapDestinations();
    for (const d of dests) {
      const hov = PixelUI.pointInRect(mx, my, d);
      PixelUI.panel(g, d.x, d.y, d.w, d.h, hov ? g.color(255, 248, 208) : g.color(d.col[0], d.col[1], d.col[2]));
      PixelUI.txt(g, font, d.label, d.x + d.w / 2, d.y + 8, g.color(82, 52, 66), CENTER, 8.5, d.w - 8);
      const sub = d.id === 'west' ? 'Shop + Soon' : (d.id === 'plaza' ? '4 Games + Wheel' : 'Rest + Soon');
      PixelUI.txt(g, font, sub, d.x + d.w / 2, d.y + 24, g.color(107, 75, 91), CENTER, 7, d.w - 8);
    }

    // Marqueur animé "YOU ARE HERE" sur la position réelle de Moo [-480 .. 960]
    const normX = constrain((this.moo.pos.x - this.worldLeft) / (this.worldRight - this.worldLeft), 0, 1);
    const pinX = Math.round(ox + 80 + normX * 320);
    const pinY = oy + 158 + Math.round(Math.sin(frameCount * 0.14) * 1.5);
    g.noStroke();
    g.fill(189, 117, 126);
    g.circle(pinX, pinY, 8);
    g.fill(255, 248, 210);
    g.circle(pinX, pinY, 4);
    PixelUI.txt(g, font, 'Moo is here!', pinX, pinY + 8, g.color(168, 86, 98), CENTER, 7.5);

    PixelUI.txt(g, font, 'Click outside or press Esc / M to close', ox + 240, oy + 194, g.color(144, 98, 93), CENTER, 8);
    g.pop();
  }

  drawHud(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const tickets = this.game.save.data.tickets;
    PixelUI.panel(g, 6, 6, 56, 16);
    const ticketSp = assets.getSprite('ticket');
    if (ticketSp) g.image(ticketSp, 10, 8);
    PixelUI.txt(g, font, 'x ' + tickets, 28, 9, g.color(107, 75, 91), LEFT, 9, 32);

    if (Vehicle.debug && this.showTicketCheat) {
      const { mx, my } = this.game.getMouseBufferPos();
      const hov = PixelUI.pointInRect(mx, my, this.ticketPlusBtn);
      PixelUI.panel(
        g,
        this.ticketPlusBtn.x,
        this.ticketPlusBtn.y,
        this.ticketPlusBtn.w,
        this.ticketPlusBtn.h,
        hov ? g.color(202, 236, 162) : g.color(223, 240, 187)
      );
      PixelUI.txt(
        g,
        font,
        '+',
        this.ticketPlusBtn.x + Math.round(this.ticketPlusBtn.w / 2),
        this.ticketPlusBtn.y + 3,
        g.color(62, 108, 70),
        CENTER,
        10
      );
    }
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
    PixelUI.txt(g, font, "TODAY'S GAMES", ox + 240, oy + 40, g.color(243, 244, 231), CENTER, 10);

    const titleMap = {
      derby: 'Bunny Derby',
      snake: 'PokeMoo Feast!!',
      ducklings: 'Catch the Purins!',
      fox: 'The Legend of Moo'
    };
    this.cardRects().forEach((c, i) => {
      const hov = PixelUI.pointInRect(mx, my, c);
      const yy = Math.round(c.y + (hov ? -2 + Math.sin(frameCount * 0.3) : 0));
      PixelUI.panel(g, c.x, yy, c.w, c.h, g.color(232, 207, 166));
      PixelUI.txt(g, font, titleMap[c.gm.id] || c.gm.title, c.x + 8, yy + 5, g.color(107, 75, 91), LEFT, 9, c.w - 14);

      const bSp = assets.getSprite('booth_' + c.gm.id);
      if (bSp) g.image(bSp, c.x + 8, yy + 26, 28, 24, 18, 1, 14, 12);

      const stars = this.game.save.data.stars[c.gm.id] || 0;
      const starStr = '*'.repeat(stars) + '-'.repeat(3 - stars);
      PixelUI.txt(g, font, 'press ' + (i + 1) + '  [' + starStr + ']', c.x + 42, yy + 32, g.color(144, 98, 93), LEFT, 8.5, 108);
    });

    PixelUI.txt(g, font, 'Esc / M to close', ox + 240, oy + 190, g.color(144, 98, 93), CENTER, 8.5);
  }

  enterGame(gameId) {
    this.overlay = false;
    this.mapOverlay = false;
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

    if (Vehicle.debug && this.showTicketCheat && !this.overlay && !this.mapOverlay && PixelUI.pointInRect(mx, my, this.ticketPlusBtn)) {
      this.game.save.addTickets(50);
      this.game.sound.playSfx('success_bell', 0.65);
      return;
    }

    if (this.mapOverlay) {
      const hit = this.getMapDestinations().find((d) => PixelUI.pointInRect(mx, my, d));
      if (hit) {
        this.moo.pos.set(hit.targetX, hit.targetY);
        this.moo.stop();
        this.mapOverlay = false;
        this.game.sound.playSfx('ui_click', 0.8);
        return;
      }
      if (mx < ox + 58 || mx > ox + 422 || my < oy + 42 || my > oy + 214) {
        this.mapOverlay = false;
      }
      return;
    }

    if (this.overlay) {
      const card = this.cardRects().find((c) => PixelUI.pointInRect(mx, my, c));
      if (card) this.enterGame(card.gm.id);
      else if (mx < ox + 70 || mx > ox + 410 || my < oy + 34 || my > oy + 210) this.overlay = false;
      return;
    }

    const wx = mx + this.camX;
    const wy = my - oy;

    // Clic sur le panneau MAP à côté des affiches GAMES
    const mb = this.mapBoardPos;
    if (wx >= mb.x && wx <= mb.x + mb.w && wy >= mb.y && wy <= mb.y + mb.h) {
      this.moo.stop();
      this.game.sound.playSfx('ui_click');
      this.mapOverlay = true;
      return;
    }

    // Clic sur le Prize Booth (Aile Ouest)
    const pbPos = this.prizeBoothPos;
    if (wx >= pbPos.x && wx <= pbPos.x + pbPos.w && wy >= pbPos.y && wy <= pbPos.y + pbPos.h) {
      this.moo.stop();
      this.prizeShop.show();
      return;
    }

    // Clic sur le panneau GAMES
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

    // Clic sur un stand -> Moo y marche
    const t = this.triggers.find(
      ({ rect: [x, y, w, h] }) => wx > x - 10 && wx < x + w + 10 && wy > y - 70 && wy < y + h + 4
    );
    if (t) {
      this.moo.setTarget(t.stand[0], t.stand[1]);
      return;
    }

    this.moo.setTarget(wx, wy);
  }

  keyPressed(k, kc) {
    const layout = this.game.assets.hubLayout;

    if (this.prizeShop && this.prizeShop.open) {
      this.prizeShop.keyPressed(k, kc);
      return;
    }

    if (Vehicle.debug) {
      if (k === 'n' || k === 'N') {
        this.secretLastWasN = true;
        this.secretStarCount = 0;
        return;
      }
      if (k === '*') {
        if (this.secretLastWasN) {
          this.showTicketCheat = false;
          this.secretLastWasN = false;
          this.secretStarCount = 0;
          this.game.sound.playSfx('ui_click', 0.5);
          return;
        }
        this.secretStarCount++;
        if (this.secretStarCount >= 3) {
          this.showTicketCheat = true;
          this.secretStarCount = 0;
          this.game.sound.playSfx('success_bell', 0.7);
        }
        return;
      }
      this.secretLastWasN = false;
      this.secretStarCount = 0;
    }

    // Touche T : basculer Jour / Sunset
    if (k === 't' || k === 'T') {
      const next = this.game.save.data.skyMood === 'sunset' ? 'day' : 'sunset';
      this.game.save.data.skyMood = next;
      this.game.save.save();
      this.game.sound.playSfx('ui_click', 0.7);
      this.showToast(next === 'sunset' ? 'Sky: Sunset Glow!' : 'Sky: Sunny Day!', 1800);
      return;
    }

    if (k === 'p' || k === 'P') {
      this.game.sound.playSfx('ui_click');
      this.mapOverlay = false;
      this.overlay = !this.overlay;
      return;
    }

    if (this.overlay && k >= '1' && k <= '4') {
      const gm = layout.games[parseInt(k, 10) - 1];
      if (gm) this.enterGame(gm.id);
      return;
    }

    if (k === ' ' && this.promptTrigger && !this.overlay && !this.mapOverlay) {
      if (this.promptTrigger.id === 'poster') {
        this.game.sound.playSfx('ui_click');
        this.overlay = true;
      } else if (this.promptTrigger.id === 'map') {
        this.game.sound.playSfx('ui_click');
        this.mapOverlay = true;
      } else if (this.promptTrigger.id === 'prize') {
        this.moo.stop();
        this.prizeShop.show();
      } else {
        this.enterGame(this.promptTrigger.id);
      }
    }
  }
}
