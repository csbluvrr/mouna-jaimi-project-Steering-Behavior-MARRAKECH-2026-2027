/**
 * Scène principale du Hub : Moo's Funfair — Fête foraine vivante en 3 zones reliées !
 * - Zone 0 (Ouest)  : Prize Booth + Bunny Derby + Coin Pique-Nique + NPCs
 * - Zone 1 (Centre) : Arche MOO'S FUNFAIR + Grande Roue + Caterpillar Crawl + Duckling Herder + Poster GAMES + Chat aux ballons + foule vivante
 * - Zone 2 (Est)    : Fox Showdown + Nouveau Renard + Mare aux Canetons + Vache + NPCs
 *
 * Moo peut marcher librement d'une zone à l'autre par les allées gauche/droite (transition fondue fluide),
 * et chaque visiteur/mascotte/animal est une sous-classe de Vehicle pilotée via BehaviorManager :
 * - Moo (personnage principal + tenue cosmétique sauvegardée)
 * - FairVisitor (Mr. Carrot, Girl NPC, Nouveau Lapin, Enfants visiteurs, Nouveau Renard)
 * - HubButterfly (wander + flee + boundaries)
 * - HubDuckling (wander + separation + boundaries)
 * - Obstacle (Vehicle statique avec maxSpeed = 0)
 */
class HubScene extends Scene {
  static ZONE_NAMES = [
    'WEST: PRIZE & DERBY',
    "MOO'S FUNFAIR — PLAZA",
    'EAST: FOX & POND'
  ];

  constructor(game) {
    super(game);
    this.usesWideCamera = true;
    this.worldLeft = -120;
    this.worldRight = 480 + 120;
    this.camX = 0;

    this.zone = 1; // 0 = Ouest, 1 = Centre (défaut), 2 = Est
    this.transitionAlpha = 0;
    this.transitionDir = 0; // -1 fondu sortant, +1 fondu entrant
    this.pendingZone = null;

    this.moo = null;
    this.obstacles = [];
    this.solids = [];
    this.triggers = [];
    this.visitors = [];
    this.butterflies = [];
    this.ducklings = [];
    this.zoneObjects = [];
    this.zoneBalloons = [];
    this.zoneSignposts = [];
    this.sideObjects = [];
    this.sideBunting = [];
    this.sideLights = [];

    this.leftGroundImg = null;
    this.rightGroundImg = null;
    this.westGroundImg = null;
    this.eastGroundImg = null;
    this.walkBounds = [10, 96, 470, 240];

    this.promptTrigger = null;
    this.overlay = false;
    this.prizeShop = new PrizeShop(game);
    this.posterOffsetX = -16;

    // Code secret Debug [H] : *** pour afficher [+], n* pour cacher
    this.secretStarCount = 0;
    this.secretLastWasN = false;
    this.showTicketCheat = false;
    this.ticketPlusBtn = { x: 66, y: 6, w: 18, h: 16 };

    this.toast = '';
    this.toastUntil = 0;
  }

  init(data = {}) {
    this.overlay = false;
    this.promptTrigger = null;
    this.transitionAlpha = 0;
    this.transitionDir = 0;
    this.pendingZone = null;

    this.buildSideMeadows();
    this.buildExtraZoneGrounds();

    // Déterminer la zone de départ selon le stand d'où l'on revient
    let startZone = 1;
    if (data && data.fromBooth) {
      if (data.fromBooth === 'derby' || data.fromBooth === 'prize') startZone = 0;
      else if (data.fromBooth === 'fox') startZone = 2;
      else startZone = 1;
    }

    this.loadZone(startZone, data && data.fromBooth ? { fromBooth: data.fromBooth } : {});
    this.game.sound.playMusic('hub');

    if (data && data.toast) {
      this.showToast(data.toast, 2600);
    }
  }

  /** Charge une des 3 zones reliées de la fête foraine (0=Ouest, 1=Centre, 2=Est). */
  loadZone(zoneIdx, spawnOpts = {}) {
    this.zone = constrain(zoneIdx, 0, 2);
    const layout = this.game.assets.hubLayout;

    this.solids = [];
    this.triggers = [];
    this.zoneObjects = [];
    this.zoneBalloons = [];
    this.zoneSignposts = [];
    this.visitors = [];
    this.ducklings = [];
    this.promptTrigger = null;

    // Clôture basse commune sur les 3 zones
    this.solids.push([0, 256, 208, 10], [272, 256, 208, 10]);

    if (this.zone === 0) {
      // === ZONE 0 : OUEST (PRIZE BOOTH + BUNNY DERBY + PIQUE-NIQUE) ===
      this.zoneObjects = [
        { id: 'tree_w1', sprite: 'tree_apple', x: 14, y: 66, sortY: 96 },
        { id: 'tree_w2', sprite: 'tree_round', x: 182, y: 66, sortY: 96 },
        { id: 'tree_w3', sprite: 'tree_tall', x: 368, y: 68, sortY: 96 },
        { id: 'tree_w4', sprite: 'tree_apple', x: 422, y: 66, sortY: 96 },
        { id: 'booth_prize', sprite: '__prize__', x: 84, y: 76, sortY: 134 },
        { id: 'booth_derby', sprite: 'booth_derby', x: 268, y: 76, sortY: 134 },
        { id: 'picnic_blanket', sprite: 'picnic_blanket', x: 40, y: 186, sortY: 180 },
        { id: 'picnic_basket', sprite: 'picnic_basket', x: 48, y: 200, sortY: 216 },
        { id: 'bush_w1', sprite: 'bush_berry', x: 176, y: 196, sortY: 212 },
        { id: 'sunf_w1', sprite: 'sunflower', x: 360, y: 170, sortY: 214 },
        { id: 'mush_w1', sprite: 'mush_red', x: 230, y: 208, sortY: 220 },
        { id: 'flw_w1', sprite: 'flower_pink', x: 148, y: 180, sortY: 188 },
        { id: 'flw_w2', sprite: 'flower_yellow', x: 320, y: 202, sortY: 210 },
        { id: 'log_w1', sprite: 'log', x: 288, y: 192, sortY: 202 }
      ];
      this.solids.push(
        [88, 112, 42, 22],  // Prize Booth
        [270, 112, 46, 22], // Bunny Derby
        [48, 204, 16, 12],  // Picnic basket
        [178, 200, 26, 10], // Berry bush
        [290, 194, 14, 8]   // Log bench
      );
      this.triggers.push(
        { id: 'prize', title: 'Prize Booth', rect: [82, 134, 54, 22], stand: [109, 148] },
        { id: 'derby', title: 'Bunny Derby', rect: [266, 134, 54, 22], stand: [293, 148] }
      );
      this.zoneBalloons = [
        { sprite: 'balloon_pink', x: 66, y: 84, phase: 0.4 },
        { sprite: 'balloon_yellow', x: 138, y: 82, phase: 1.8 },
        { sprite: 'balloon_blue', x: 326, y: 84, phase: 3.1 }
      ];
      this.zoneSignposts = [
        { x: 446, y: 148, label: 'Plaza ->', targetZone: 1, enterX: 28 }
      ];

      // NPCs vivants de la zone Ouest (100% Vehicle + BehaviorManager)
      this.visitors = [
        new FairVisitor(146, 138, 'girl', this.game.assets, {
          stationary: true,
          greeting: 'Try hats & hoodies!'
        }),
        new FairVisitor(205, 164, 'carrot', this.game.assets, {
          bounds: [120, 140, 290, 88],
          greeting: 'Bet on Bunny Derby!'
        }),
        new FairVisitor(336, 162, 'new_bunny', this.game.assets, {
          bounds: [220, 142, 210, 86],
          greeting: 'Hop hop! Race time!'
        }),
        new FairVisitor(118, 206, 'new_bunny', this.game.assets, {
          bounds: [90, 166, 140, 62]
        }),
        new FairVisitor(382, 184, 'kid', this.game.assets, {
          bounds: [250, 142, 180, 84],
          greeting: 'I love the Prize Shop!'
        })
      ];
    } else if (this.zone === 1) {
      // === ZONE 1 : CENTRE (ARCHE + GRANDE ROUE + SNAKE + DUCKLINGS + POSTER + FOULE) ===
      this.zoneObjects = layout.objects
        .filter((o) => {
          if (o.id === 'picnic_blanket' || o.id === 'picnic_basket') return false;
          if (o.id === 'booth_derby' || o.id === 'booth_fox' || o.id === 'cow') return false;
          if (o.id !== 'title_sign' && o.id !== 'ferris' && !o.sprite.startsWith('tree_') && !o.sprite.startsWith('booth_') && o.y < 88) {
            return false;
          }
          return true;
        })
        .map((o) => {
          let ox = o.x;
          let oyObj = o.y;
          let sortY = o.sortY;
          // Espacer proprement Snake (gauche) et Ducklings (droite) autour de la Grande Roue
          if (o.id === 'booth_snake') ox = 86;
          if (o.id === 'booth_ducklings') ox = 344;
          if (o.id === 'poster') ox = 304;
          if (o.id === 'kid_balloon') sortY = 207;
          if (o.sprite.startsWith('tree_') && o.y < 52) {
            oyObj = 66 + (o.x % 5);
            sortY = 96;
          }
          return { ...o, x: ox, y: oyObj, sortY };
        });

      this.solids.push(
        [213, 134, 54, 8],  // Ferris wheel base
        [88, 112, 46, 22],  // Caterpillar Crawl booth
        [346, 112, 46, 22], // Duckling Herder booth
        [308, 220, 58, 8],  // Poster board
        [157, 192, 20, 15]  // Balloon cat
      );
      this.triggers.push(
        { id: 'snake', title: 'Caterpillar Crawl', rect: [84, 134, 54, 22], stand: [111, 148] },
        { id: 'ducklings', title: 'Duckling Herder', rect: [342, 134, 54, 22], stand: [369, 148] },
        { id: 'poster', title: 'Pick a game', rect: [298, 222, 74, 20], stand: [335, 236] }
      );
      this.zoneBalloons = layout.balloons.map((b) => ({ ...b }));
      this.zoneSignposts = [
        { x: 34, y: 148, label: '<- Prize', targetZone: 0, enterX: 446 },
        { x: 446, y: 148, label: 'Fox & Pond ->', targetZone: 2, enterX: 28 }
      ];

      // Foule joyeuse sur la grande place centrale !
      this.visitors = [
        new FairVisitor(192, 166, 'carrot', this.game.assets, {
          bounds: [120, 142, 220, 88],
          greeting: "Welcome to Moo's Fair!"
        }),
        new FairVisitor(276, 152, 'girl', this.game.assets, {
          stationary: true,
          greeting: 'Walk West & East to explore!'
        }),
        new FairVisitor(74, 192, 'kid', this.game.assets, {
          bounds: [36, 154, 110, 74],
          greeting: 'Watch out for rotten fruit!'
        }),
        new FairVisitor(406, 184, 'kid', this.game.assets, {
          bounds: [370, 148, 82, 80],
          greeting: 'Go West for the Prize Shop!'
        }),
        new FairVisitor(248, 212, 'new_bunny', this.game.assets, {
          bounds: [185, 162, 110, 70],
          greeting: 'So many funfair games!'
        })
      ];
    } else {
      // === ZONE 2 : EST (FOX SHOWDOWN + MARE AUX CANETONS + RENARD + VACHE) ===
      this.zoneObjects = [
        { id: 'tree_e1', sprite: 'tree_round', x: 24, y: 66, sortY: 96 },
        { id: 'tree_e2', sprite: 'tree_apple', x: 224, y: 66, sortY: 96 },
        { id: 'tree_e3', sprite: 'tree_tall', x: 326, y: 68, sortY: 96 },
        { id: 'tree_e4', sprite: 'tree_round', x: 416, y: 66, sortY: 96 },
        { id: 'booth_fox', sprite: 'booth_fox', x: 112, y: 76, sortY: 134 },
        { id: 'cow', sprite: 'cow', x: 414, y: 136, sortY: 168 },
        { id: 'bush_e1', sprite: 'bush_berry', x: 44, y: 196, sortY: 212 },
        { id: 'log_e1', sprite: 'log', x: 186, y: 198, sortY: 208 },
        { id: 'sunf_e1', sprite: 'sunflower', x: 232, y: 168, sortY: 212 },
        { id: 'mush_e1', sprite: 'mush_purple_b', x: 116, y: 212, sortY: 224 },
        { id: 'flw_e1', sprite: 'flower_blue', x: 88, y: 184, sortY: 192 },
        { id: 'flw_e2', sprite: 'flower_pink', x: 260, y: 216, sortY: 224 }
      ];
      this.solids.push(
        [114, 112, 46, 22], // Fox Showdown booth
        [420, 156, 20, 8],  // Cow
        [46, 200, 26, 10],  // Bush
        [188, 200, 14, 8],  // Log
        [330, 194, 92, 42]  // Pond
      );
      this.triggers.push(
        { id: 'fox', title: 'Fox Showdown', rect: [110, 134, 54, 22], stand: [137, 148] }
      );
      this.zoneBalloons = [
        { sprite: 'balloon_red', x: 96, y: 84, phase: 0.2 },
        { sprite: 'balloon_purple', x: 168, y: 82, phase: 2.1 }
      ];
      this.zoneSignposts = [
        { x: 34, y: 148, label: '<- Plaza', targetZone: 1, enterX: 446 }
      ];

      // Canetons nageant autour de la mare de la zone Est
      this.ducklings = [
        new HubDuckling(346, 206, this.game.assets),
        new HubDuckling(372, 224, this.game.assets),
        new HubDuckling(404, 212, this.game.assets)
      ];

      // Visiteurs + Nouveau Renard du Fox Sprite Sheet !
      this.visitors = [
        new FairVisitor(194, 136, 'fox_nap', this.game.assets, {
          stationary: true,
          greeting: 'Care for a carrot duel?'
        }),
        new FairVisitor(282, 166, 'girl', this.game.assets, {
          stationary: true,
          greeting: 'The ducklings love this pond!'
        }),
        new FairVisitor(152, 178, 'carrot', this.game.assets, {
          bounds: [60, 146, 220, 84],
          greeting: 'Watch out for homing acorns!'
        }),
        new FairVisitor(248, 194, 'new_bunny', this.game.assets, {
          bounds: [120, 150, 180, 78]
        }),
        new FairVisitor(78, 166, 'kid', this.game.assets, {
          bounds: [44, 144, 140, 82]
        })
      ];
    }

    // Ajouter les collisions des prairies latérales
    for (const obj of this.sideObjects) {
      if (obj.solid) this.solids.push(obj.solid);
    }

    // Convertir les zones solides en Obstacles circulaires (Vehicle fixes)
    this.obstacles = [];
    this.solids.forEach(([sx, sy, sw, sh]) => {
      const obsList = Obstacle.fromRect(sx, sy, sw, sh);
      for (const o of obsList) this.obstacles.push(o);
    });

    // Limites de marche (les bords ouverts vers les autres zones vont jusqu'à 4..476)
    const minX = this.zone > 0 ? 4 : this.worldLeft + 14;
    const maxX = this.zone < 2 ? 476 : this.worldRight - 14;
    this.walkBounds = [minX, 102, maxX, 240];

    // Position de spawn de Moo
    let spawnX = 240;
    let spawnY = 204;
    if (spawnOpts.enterX != null) {
      spawnX = spawnOpts.enterX;
      spawnY = spawnOpts.enterY != null ? spawnOpts.enterY : 154;
    } else if (spawnOpts.fromBooth) {
      const trig = this.triggers.find((t) => t.id === spawnOpts.fromBooth);
      if (trig && trig.stand) {
        spawnX = trig.stand[0];
        spawnY = trig.stand[1];
      }
    }

    if (!this.moo) {
      this.moo = new Moo(spawnX, spawnY, this.game.assets);
    } else {
      this.moo.pos.set(spawnX, spawnY);
      this.moo.stop();
    }
    this.camX = this.computeTargetCamX();

    // Papillons d'ambiance dans chaque zone
    this.butterflies = [];
    for (let i = 0; i < 6; i++) {
      this.butterflies.push(
        new HubButterfly(random(40, 440), random(104, 232), this.game.assets)
      );
    }
  }

  /** Démarre une transition fondue fluide vers une zone voisine (Ouest / Centre / Est). */
  beginZoneTransition(targetZone, enterX, enterY) {
    if (this.pendingZone !== null) return;
    this.pendingZone = { zone: targetZone, enterX, enterY };
    this.transitionDir = 1; // monte l'alpha vers 255
    this.moo.stop();
    this.game.sound.playSfx('ui_click', 0.45);
  }

  /** Pré-rend les sols des zones Ouest et Est assortis à hub_ground.png (herbe, allée, clôture, mare). */
  buildExtraZoneGrounds() {
    if (this.westGroundImg && this.eastGroundImg) return;
    const ground = this.game.assets.getImage('hub/hub_ground.png');
    if (!ground) return;
    const grassCol = ground.get(4, 120);

    const makeZoneGround = (isEast) => {
      const img = createGraphics(BUFFER_W, BUFFER_H);
      img.pixelDensity(1);
      img.noSmooth();
      img.background(grassCol[0], grassCol[1], grassCol[2]);

      // Allée sable horizontale principale (y=136..166) raccordée parfaitement au Centre
      img.noStroke();
      img.fill(218, 194, 148);
      img.rect(0, 134, BUFFER_W, 34);
      img.fill(232, 210, 166);
      img.rect(0, 137, BUFFER_W, 28);

      // Parvis arrondis devant les stands de la zone
      if (!isEast) {
        img.fill(232, 210, 166);
        img.rect(78, 126, 62, 18, 6);
        img.rect(262, 126, 62, 18, 6);
      } else {
        img.fill(232, 210, 166);
        img.rect(106, 126, 62, 18, 6);
        // Mare bleue scintillante des canetons (Est)
        img.fill(107, 75, 91);
        img.ellipse(376, 214, 96, 46);
        img.fill(124, 192, 214);
        img.ellipse(376, 214, 92, 42);
        img.fill(164, 222, 238);
        img.ellipse(366, 208, 48, 18);
      }

      // Clôture basse copiée fidèlement de hub_ground.png
      for (let tx = 0; tx < BUFFER_W; tx += 16) {
        img.image(ground, tx, 236, 16, 36, 16, 236, 16, 36);
      }

      // Touffes d'herbe subtiles
      img.fill(Math.max(0, grassCol[0] - 16), Math.max(0, grassCol[1] - 14), Math.max(0, grassCol[2] - 14));
      for (let i = 0; i < 65; i++) {
        const gx = (i * 53 + (isEast ? 17 : 7)) % (BUFFER_W - 12) + 6;
        const gy = (i * 37 + 104) % 124 + 102;
        if (gy > 132 && gy < 170) continue;
        img.rect(gx, gy, 2, 1);
        img.rect(gx + 2, gy - 1, 1, 2);
      }
      return img;
    };

    this.westGroundImg = makeZoneGround(false);
    this.eastGroundImg = makeZoneGround(true);
  }

  /** Pré-rend les bandes prairie latérales (pour les fenêtres larges sans bandes noires). */
  buildSideMeadows() {
    const assets = this.game.assets;
    const ground = assets.getImage('hub/hub_ground.png');
    const sideW = 120;

    if (!this.leftGroundImg && ground) {
      const makeStrip = (isLeft) => {
        const strip = createGraphics(sideW, BUFFER_H);
        strip.pixelDensity(1);
        strip.noSmooth();

        const grassCol = ground.get(4, 120);
        strip.background(grassCol[0], grassCol[1], grassCol[2]);

        // Prolonger l'allée horizontale sur les bords ouverts
        strip.noStroke();
        strip.fill(218, 194, 148);
        strip.rect(0, 134, sideW, 34);
        strip.fill(232, 210, 166);
        strip.rect(0, 137, sideW, 28);

        for (let tx = 0; tx < sideW; tx += 16) {
          strip.image(ground, tx, 236, 16, 36, 16, 236, 16, 36);
        }

        strip.fill(Math.max(0, grassCol[0] - 16), Math.max(0, grassCol[1] - 14), Math.max(0, grassCol[2] - 14));
        for (let i = 0; i < 36; i++) {
          const gx = (i * 29 + (isLeft ? 7 : 19)) % (sideW - 6) + 3;
          const gy = (i * 47 + 104) % 120 + 102;
          if (gy > 132 && gy < 170) continue;
          strip.rect(gx, gy, 2, 1);
        }
        return strip;
      };

      this.leftGroundImg = makeStrip(true);
      this.rightGroundImg = makeStrip(false);
    }

    this.sideObjects = [
      { sprite: 'tree_apple', x: -102, y: 66, sortY: 96, solid: [-98, 86, 16, 10] },
      { sprite: 'tree_tall', x: -58, y: 68, sortY: 96, solid: [-56, 86, 10, 8] },
      { sprite: 'tree_round', x: -28, y: 66, sortY: 96, solid: [-24, 84, 18, 10] },
      { sprite: 'bush_berry', x: -68, y: 204, sortY: 219, solid: [-66, 208, 26, 10] },
      { sprite: 'flower_pink', x: -42, y: 184, sortY: 192 },
      { sprite: 'mush_red', x: -24, y: 206, sortY: 218 },

      { sprite: 'tree_round', x: 486, y: 66, sortY: 96, solid: [490, 84, 18, 10] },
      { sprite: 'tree_tall', x: 526, y: 68, sortY: 96, solid: [528, 86, 10, 8] },
      { sprite: 'tree_apple', x: 558, y: 66, sortY: 96, solid: [562, 86, 16, 10] },
      { sprite: 'hedge_b', x: 492, y: 206, sortY: 221, solid: [494, 210, 26, 10] },
      { sprite: 'flower_yellow', x: 536, y: 182, sortY: 190 },
      { sprite: 'mush_purple', x: 520, y: 214, sortY: 222 }
    ];

    this.sideBunting = [];
    this.sideLights = [];
    const buntingSprites = ['bunting_a', 'bunting_b'];
    let idx = 0;
    for (let bx = -112; bx < 0; bx += 16) {
      this.sideBunting.push({ sprite: buntingSprites[idx % 2], x: bx, y: 90 });
      this.sideLights.push({ x: bx, y: 242 });
      idx++;
    }
    for (let bx = 480; bx < 592; bx += 16) {
      this.sideBunting.push({ sprite: buntingSprites[idx % 2], x: bx, y: 90 });
      this.sideLights.push({ x: bx, y: 242 });
      idx++;
    }
  }

  computeTargetCamX() {
    const vw = this.game.viewW || BUFFER_W;
    const minCam = this.worldLeft;
    const maxCam = Math.max(minCam, this.worldRight - vw);
    const restingCam = constrain((BUFFER_W - vw) / 2, minCam, maxCam);
    if (!this.moo) return restingCam;
    const mx = this.moo.pos.x;
    if (mx >= 100 && mx <= 380) return restingCam;
    return constrain(mx - vw / 2, minCam, maxCam);
  }

  showToast(msg, durationMs = 2400) {
    this.toast = msg;
    this.toastUntil = millis() + durationMs;
  }

  update() {
    // Transition fondue fluide entre les 3 zones de la fête foraine
    if (this.transitionDir !== 0) {
      this.transitionAlpha += this.transitionDir * 24;
      if (this.transitionDir > 0 && this.transitionAlpha >= 255) {
        this.transitionAlpha = 255;
        if (this.pendingZone) {
          this.loadZone(this.pendingZone.zone, {
            enterX: this.pendingZone.enterX,
            enterY: this.pendingZone.enterY
          });
          this.pendingZone = null;
        }
        this.transitionDir = -1;
      } else if (this.transitionDir < 0 && this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionDir = 0;
      }
      return;
    }

    if (this.overlay || (this.prizeShop && this.prizeShop.open)) return;

    // Mise à jour de Moo
    this.moo.step(this.solids, this.walkBounds);

    // Passage fluide à la zone Ouest ou Est quand Moo franchit le bord de l'allée !
    if (this.zone > 0 && this.moo.pos.x <= 10 && this.moo.pos.y >= 122 && this.moo.pos.y <= 184) {
      this.beginZoneTransition(this.zone - 1, 450, this.moo.pos.y);
      return;
    }
    if (this.zone < 2 && this.moo.pos.x >= 470 && this.moo.pos.y >= 122 && this.moo.pos.y <= 184) {
      this.beginZoneTransition(this.zone + 1, 30, this.moo.pos.y);
      return;
    }

    // Caméra fluide
    const targetCamX = this.computeTargetCamX();
    this.camX += (targetCamX - this.camX) * 0.14;
    if (Math.abs(targetCamX - this.camX) < 0.2) this.camX = targetCamX;

    // Mise à jour de toute la vie du parc (100% Vehicle + BehaviorManager)
    for (const v of this.visitors) v.step(this.moo, this.visitors, this.obstacles);
    for (const d of this.ducklings) d.step(this.ducklings);
    for (const b of this.butterflies) b.step(this.moo);

    // Détection de la zone de stand devant Moo
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

    // === 0. CIEL PARALLAXE ANIMÉ (Jour / Sunset) ===
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.draw(g, assets, skyMood, vw, this.camX + (this.zone - 1) * 140, oy);
    }

    // === MONDE ===
    g.push();
    g.translate(camOffset, oy);

    // 1. Sols sous l'horizon (y >= 94)
    if (this.leftGroundImg) {
      g.image(this.leftGroundImg, this.worldLeft, groundTop, 120, BUFFER_H - groundTop, 0, groundTop, 120, BUFFER_H - groundTop);
    }
    const centerGround = this.zone === 0
      ? this.westGroundImg
      : (this.zone === 2 ? this.eastGroundImg : assets.getImage('hub/hub_ground.png'));
    if (centerGround) {
      g.image(centerGround, 0, groundTop, BUFFER_W, BUFFER_H - groundTop, 0, groundTop, BUFFER_W, BUFFER_H - groundTop);
    }
    if (this.rightGroundImg) {
      g.image(this.rightGroundImg, BUFFER_W, groundTop, 120, BUFFER_H - groundTop, 0, groundTop, 120, BUFFER_H - groundTop);
    }

    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawHorizonBlend(g, skyMood, this.worldLeft, this.worldRight, groundTop);
    }

    // Nappe de pique-nique à plat au sol (Zone Ouest)
    const blanket = this.zoneObjects.find((o) => o.id === 'picnic_blanket');
    if (blanket) {
      const bSp = assets.getSprite(blanket.sprite);
      if (bSp) g.image(bSp, blanket.x, blanket.y);
    }

    // Panneaux directionnels en bois aux sorties gauche/droite
    for (const sp of this.zoneSignposts) {
      const pulse = Math.round(Math.sin(frameCount * 0.1) * 1.5);
      PixelUI.drawTag(g, font, sp.label, sp.x + pulse, sp.y - 12, g.color(247, 235, 170));
    }

    // 2. Objets Y-triés
    const items = this.zoneObjects
      .filter((o) => o.id !== 'picnic_blanket')
      .map((o) => ({
        sortY: o.sortY,
        draw: () => {
          if (o.id === 'title_sign') {
            g.push();
            g.noStroke();
            g.fill(107, 75, 91);
            g.rect(o.x + 10, o.y + 32, 8, 64);
            g.rect(o.x + 154, o.y + 32, 8, 64);
            g.fill(144, 98, 93);
            g.rect(o.x + 11, o.y + 32, 6, 63);
            g.rect(o.x + 155, o.y + 32, 6, 63);
            g.pop();
          }
          const sp = o.sprite === '__prize__'
            ? assets.getImage('generated/booths/booth_prize.png')
            : assets.getSprite(o.sprite);
          if (sp) g.image(sp, o.x, o.y);

          // Petites lumières scintillantes sur la Grande Roue (Zone Centre)
          if (o.id === 'ferris') {
            g.push();
            g.noStroke();
            const fcx = o.x + 41;
            const fcy = o.y + 40;
            for (let k = 0; k < 8; k++) {
              const a = frameCount * 0.012 + (TWO_PI * k) / 8;
              const lx = Math.round(fcx + Math.cos(a) * 30);
              const ly = Math.round(fcy + Math.sin(a) * 30);
              const lit = (Math.floor(frameCount / 18) + k) % 2 === 0;
              g.fill(lit ? g.color(255, 244, 156) : g.color(255, 176, 198));
              g.rect(lx - 1, ly - 1, 3, 3);
            }
            g.pop();
          }
        }
      }));

    // Miniatures des 4 jeux sur le panneau GAMES (Zone Centre)
    const pb = this.zoneObjects.find((o) => o.id === 'poster');
    if (pb) {
      items.push({
        sortY: pb.sortY + 0.1,
        draw: () => {
          layout.games.forEach((gm, i) => {
            const [sx, sy] = layout.poster.slots_in_sprite[i];
            const bSp = assets.getSprite('booth_' + gm.id);
            if (bSp) g.image(bSp, pb.x + sx + 4, pb.y + sy + 2, 14, 12, 18, 1, 14, 12);
          });
        }
      });
    }

    // Décorations des prairies latérales
    for (const so of this.sideObjects) {
      items.push({
        sortY: so.sortY,
        draw: () => {
          const sp = assets.getSprite(so.sprite);
          if (sp) g.image(sp, so.x, so.y);
        }
      });
    }

    // Amis lapins du coin pique-nique (Zone Ouest)
    if (this.zone === 0) {
      layout.friends.forEach((f) => {
        items.push({
          sortY: f.y - 10,
          draw: () => {
            const img = assets.getSheetFrame(f.sheet, 32, 32, f.frame[1], f.frame[0]);
            if (img) g.image(img, f.x - 4, f.y - 42);
          }
        });
      });
    }

    // Visiteurs, mascottes, nouveaux lapins & nouveau renard (FairVisitor extends Vehicle)
    for (const v of this.visitors) {
      items.push({ sortY: v.pos.y, draw: () => v.show(g) });
    }

    // Canetons de la mare (Zone Est)
    for (const d of this.ducklings) {
      items.push({ sortY: d.pos.y, draw: () => d.show(g) });
    }

    // Ficelles des ballons du chat (Zone Centre)
    if (this.zone === 1) {
      items.push({
        sortY: 206.5,
        draw: () => {
          g.push();
          g.stroke(107, 75, 91, 190);
          g.strokeWeight(1);
          this.zoneBalloons.forEach((b) => {
            const by = b.y + Math.sin(frameCount * 0.05 + b.phase) * 2;
            g.line(Math.round(b.x + 6), Math.round(by + 13), 167, 196);
          });
          g.pop();
        }
      });
    }

    // Moo (avec tenue sauvegardée !)
    items.push({
      sortY: this.moo.pos.y,
      draw: () => this.moo.show(g, this.game.save.data.equippedOutfit)
    });

    items.sort((a, b) => a.sortY - b.sortY).forEach((it) => it.draw());

    // 3. Guirlandes, lumières, ballons et papillons au premier plan
    layout.rows.bunting.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, 90 + ((Math.abs(b.x) / 16) % 2 ? 1 : 0));
    });
    this.sideBunting.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, 90 + ((Math.abs(b.x) / 16) % 2 ? 1 : 0));
    });
    layout.rows.lights.forEach((l, i) => {
      const sp = assets.getSprite((Math.floor(frameCount / 30) + i) % 2 ? 'lights_on' : 'lights_dim');
      if (sp) g.image(sp, l.x, l.y);
    });
    this.sideLights.forEach((l, i) => {
      const sp = assets.getSprite((Math.floor(frameCount / 30) + i) % 2 ? 'lights_on' : 'lights_dim');
      if (sp) g.image(sp, l.x, l.y);
    });
    this.zoneBalloons.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, Math.round(b.y + Math.sin(frameCount * 0.05 + b.phase) * 2));
    });
    for (const bf of this.butterflies) bf.show(g);

    if (Vehicle.debug) {
      for (const obs of this.obstacles) obs.showDebug(g);
    }

    // Bulle d'interaction au-dessus de Moo
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

    g.pop();

    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawMoodGlaze(g, skyMood, vw, vh);
    }

    // === INTERFACE ÉCRAN ===
    if (Vehicle.debug) {
      PixelUI.drawTag(g, font, 'DEBUG [H]: Vehicles & Avoid', vw - 102, 22, g.color(223, 240, 187));
    }

    this.drawHud(g);

    // Indicateur de zone discret en bas au centre (W • PLAZA • E)
    this.drawZoneBar(g, vw, vh);

    if (this.overlay) this.drawPosterOverlay(g);
    if (this.prizeShop && this.prizeShop.open) this.prizeShop.draw(g);

    if (millis() < this.toastUntil && this.toast) {
      const w = Math.round(PixelUI.measureText(g, this.toast, 9) + 16);
      const cx = Math.round(vw / 2);
      PixelUI.panel(g, cx - Math.round(w / 2), vh - 46, w, 18, g.color(223, 240, 187));
      PixelUI.txt(g, font, this.toast, cx, vh - 43, g.color(70, 101, 80), CENTER, 9, w - 8);
    }

    // Voile fondu lors d'une transition entre zones
    if (this.transitionAlpha > 0) {
      g.noStroke();
      g.fill(40, 28, 38, this.transitionAlpha);
      g.rect(0, 0, vw, vh);
    }
  }

  /** Petit bandeau discret en bas indiquant la zone actuelle parmi les 3 scènes du parc. */
  drawZoneBar(g, vw, vh) {
    const font = this.game.assets.font;
    const labels = ['West: Prize & Derby', 'Main Plaza', 'East: Fox & Pond'];
    const txt = (this.zone > 0 ? '< ' : '') + labels[this.zone] + (this.zone < 2 ? ' >' : '');
    const w = Math.round(PixelUI.measureText(g, txt, 8) + 16);
    const cx = Math.round(vw / 2);
    PixelUI.panel(g, cx - Math.round(w / 2), vh - 20, w, 15, g.color(247, 236, 198));
    PixelUI.txt(g, font, txt, cx, vh - 17, g.color(107, 75, 91), CENTER, 8, w - 8);
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

    this.cardRects().forEach((c, i) => {
      const hov = PixelUI.pointInRect(mx, my, c);
      const yy = Math.round(c.y + (hov ? -2 + Math.sin(frameCount * 0.3) : 0));
      PixelUI.panel(g, c.x, yy, c.w, c.h, g.color(232, 207, 166));
      PixelUI.txt(g, font, c.gm.title, c.x + 8, yy + 5, g.color(107, 75, 91), LEFT, 9, c.w - 14);

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
    this.moo.stop();
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo(gameId, { fromBooth: gameId });
  }

  mousePressed(mx, my) {
    const { ox, oy } = this.getOverlayOffsets();

    if (this.prizeShop && this.prizeShop.open) {
      this.prizeShop.mousePressed(mx, my);
      return;
    }

    if (Vehicle.debug && this.showTicketCheat && !this.overlay && PixelUI.pointInRect(mx, my, this.ticketPlusBtn)) {
      this.game.save.addTickets(50);
      this.game.sound.playSfx('success_bell', 0.65);
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

    // Clic sur un panneau directionnel -> téléporte doucement vers la zone voisine
    for (const sp of this.zoneSignposts) {
      if (Math.abs(wx - sp.x) < 38 && Math.abs(wy - (sp.y - 16)) < 18) {
        this.beginZoneTransition(sp.targetZone, sp.enterX, 154);
        return;
      }
    }

    // Clic sur le Prize Booth (Zone Ouest)
    const prizeObj = this.zoneObjects.find((o) => o.id === 'booth_prize');
    if (prizeObj && wx >= prizeObj.x && wx <= prizeObj.x + 50 && wy >= prizeObj.y && wy <= prizeObj.y + 58) {
      this.moo.stop();
      this.prizeShop.show();
      return;
    }

    // Clic sur le panneau GAMES (Zone Centre)
    const posterObj = this.zoneObjects.find((o) => o.id === 'poster');
    if (posterObj && wx >= posterObj.x && wx <= posterObj.x + 66 && wy >= posterObj.y && wy <= posterObj.y + 82) {
      this.game.sound.playSfx('ui_click');
      this.overlay = true;
      return;
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

    // Code secret Debug [H] : *** montre [+], n* cache [+]
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
      this.overlay = !this.overlay;
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
