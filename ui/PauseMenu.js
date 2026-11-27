/**
 * Menu Livre animé (déclenché par Échap ou M).
 * Utilise les 5 sprites d'ouverture/fermeture du livre (menu swipe animation1..5.png)
 * avec 4 onglets marque-pages cliquables et une animation fluide de page qui tourne :
 * - Page 0 (Status)   : Profil de Moo, tickets, étoiles, carte de tampons + accès rapide
 * - Page 1 (Games)    : Les 4 mini-jeux de la fête foraine + accès direct & commandes
 * - Page 2 (Settings) : Plein écran (F), Son, Mode Debug (H) + légende Steering Behaviors
 * - Page 3 (Exit)     : Reprendre, Retour au Hub, Écran Titre
 */
class PauseMenu {
  constructor(game) {
    this.game = game;
    this.state = 'CLOSED'; // 'CLOSED' | 'OPENING' | 'OPEN' | 'FLIPPING' | 'CLOSING'
    this.animFrame = 0;
    this.pageIdx = 0;      // 0..3
    this.selectedIdx = 0;  // Bouton surligné dans la page courante

    // État de l'animation de page qui tourne
    this.flipFrom = 0;
    this.flipTo = 0;
    this.flipDir = 1;
    this.flipT = 0;

    // Action exécutée automatiquement dès que le livre finit de se refermer
    this.pendingAction = null;

    // Cache des 5 frames du livre recolorisées dans la palette pastel Sprout Lands
    this.recoloredFrames = null;
  }

  /**
   * Recolorise une seule fois les 5 sprites du livre dans la palette Sprout Lands
   * (parchemin crème #f7ecc2, contour prune #6b4b5b, bois #b68962, rose poudré #bd757e,
   * onglets pastel) — zéro coût CPU dans draw() !
   */
  ensureRecoloredBookFrames() {
    if (this.recoloredFrames) return this.recoloredFrames;
    const assets = this.game.assets;
    if (!assets || !assets.ready) return null;

    // Table de correspondance exacte des couleurs du sprite -> palette Moo's Funfair
    const paletteMap = [
      [[224, 131, 32],  [247, 236, 194]], // Page principale -> parchemin beurre crème
      [[245, 193, 61],  [255, 249, 224]], // Reflet page -> crème lumineux
      [[161, 65, 21],   [214, 174, 134]], // Ombre / coins -> bois biscuit chaud
      [[125, 38, 20],   [182, 132, 106]], // Reliure / tranche -> bois caramel Sprout Lands
      [[0, 0, 0],       [107, 75, 91]],   // Contour noir -> prune-brun #6b4b5b
      [[24, 25, 26],    [107, 75, 91]],   // Contour sombre -> prune-brun #6b4b5b
      [[143, 11, 66],   [189, 117, 126]], // Onglet 1 -> rose poudré #bd757e
      [[194, 17, 70],   [228, 160, 148]], // Onglet 2 -> pêche pastel
      [[245, 61, 77],   [158, 196, 214]], // Onglet 3 -> bleu ciel pastel
      [[47, 138, 33],   [152, 198, 126]], // Onglet 4 -> sauge prairie
      [[10, 64, 35],    [104, 146, 98]],  // Ombre onglet 4 -> vert doux
      [[160, 212, 63],  [223, 240, 187]], // Flèche onglet 4 -> menthe pastel #dff0bb
      [[89, 117, 133],  [126, 104, 118]], // Engrenage -> prune doux
      [[178, 205, 212], [243, 244, 231]]  // Reflet icône -> ivoire
    ];

    this.recoloredFrames = {};
    for (let i = 1; i <= 5; i++) {
      const src = assets.getImage('ui/Icon & Menu/Icon & Menu/Menu/menu swipe animation' + i + '.png');
      if (!src) continue;
      const copy = createImage(src.width, src.height);
      copy.copy(src, 0, 0, src.width, src.height, 0, 0, src.width, src.height);
      copy.loadPixels();
      const px = copy.pixels;
      for (let p = 0; p < px.length; p += 4) {
        if (px[p + 3] === 0) continue;
        const r = px[p];
        const gr = px[p + 1];
        const b = px[p + 2];
        for (let k = 0; k < paletteMap.length; k++) {
          const from = paletteMap[k][0];
          if (Math.abs(r - from[0]) <= 12 && Math.abs(gr - from[1]) <= 12 && Math.abs(b - from[2]) <= 12) {
            const to = paletteMap[k][1];
            px[p] = to[0];
            px[p + 1] = to[1];
            px[p + 2] = to[2];
            break;
          }
        }
      }
      copy.updatePixels();
      this.recoloredFrames[i] = copy;
    }
    return this.recoloredFrames;
  }

  /** Vrai tant que le livre est visible (ouvert ou en cours d'animation). */
  get open() {
    return this.state !== 'CLOSED';
  }

  toggle() {
    if (this.state === 'CLOSED' || this.state === 'CLOSING') {
      this.state = 'OPENING';
      this.animFrame = 0;
      this.selectedIdx = 0;
      this.pendingAction = null;
      if (this.game.sound) this.game.sound.playSfx('ui_click', 0.85);
    } else if (this.state === 'OPEN' || this.state === 'FLIPPING') {
      this.close();
    }
  }

  close(afterCloseAction = null) {
    if (this.state === 'CLOSED' || this.state === 'CLOSING') return;
    this.pendingAction = afterCloseAction;
    this.state = 'CLOSING';
    this.animFrame = 0;
    if (this.game.sound) this.game.sound.playSfx('ui_click', 0.7);
  }

  switchPage(newIdx) {
    const target = ((newIdx % 4) + 4) % 4;
    if (target === this.pageIdx && this.state === 'OPEN') return;
    this.flipFrom = this.pageIdx;
    this.flipTo = target;
    this.flipDir = target >= this.pageIdx ? 1 : -1;
    this.flipT = 0;
    this.selectedIdx = 0;
    this.state = 'FLIPPING';
    if (this.game.sound) this.game.sound.playSfx('ui_click', 0.6);
  }

  /** Met à jour les animations d'ouverture, de fermeture et de tournage de page. */
  update() {
    if (this.state === 'OPENING') {
      this.animFrame++;
      if (this.animFrame >= 15) {
        this.state = 'OPEN';
      }
    } else if (this.state === 'CLOSING') {
      this.animFrame++;
      if (this.animFrame >= 14) {
        this.state = 'CLOSED';
        const act = this.pendingAction;
        this.pendingAction = null;
        if (act) act();
      }
    } else if (this.state === 'FLIPPING') {
      this.flipT += 0.085;
      if (this.flipT >= 1) {
        this.flipT = 1;
        this.pageIdx = this.flipTo;
        this.state = 'OPEN';
      }
    }
  }

  /** Calcule la géométrie du livre (320x256 à l'échelle 2x exacte) et ses zones cliquables. */
  getBookMetrics() {
    const vw = this.game.viewW || BUFFER_W;
    const vh = this.game.viewH || BUFFER_H;
    const bw = 320;
    const bh = 256;
    const bx = Math.round((vw - bw) / 2);
    const by = Math.round((vh - bh) / 2);

    // 4 onglets marque-pages alignés sur les pixels exacts de menu swipe animation1.png (x2)
    const tabs = [
      { idx: 0, name: 'Status',   x: bx + 276, y: by + 42,  w: 34, h: 28 },
      { idx: 1, name: 'Games',    x: bx + 276, y: by + 76,  w: 34, h: 28 },
      { idx: 2, name: 'Settings', x: bx + 276, y: by + 110, w: 34, h: 30 },
      { idx: 3, name: 'Exit',     x: bx + 276, y: by + 146, w: 34, h: 32 }
    ];

    return {
      vw,
      vh,
      bx,
      by,
      bw,
      bh,
      spineX: bx + 144,
      leftPage:  { x: bx + 14,  y: by + 40, w: 118, h: 170 },
      rightPage: { x: bx + 156, y: by + 40, w: 118, h: 170 },
      tabs
    };
  }

  /** Retourne les boutons interactifs de la page active. */
  getPageButtons(pageIdx, m) {
    const sceneName = this.game.scenes ? this.game.scenes.currentName : 'hub';
    const isFS = Boolean(document.fullscreenElement);
    const muted = this.game.sound ? this.game.sound.muted : false;
    const rp = m.rightPage;
    const lp = m.leftPage;

    if (pageIdx === 0) {
      const btns = [
        { label: 'Resume Game', action: () => this.close(), accent: true }
      ];
      if (sceneName === 'hub') {
        btns.push({
          label: 'Prize Shop',
          action: () => this.close(() => {
            if (this.game.scenes.current && this.game.scenes.current.prizeShop) {
              this.game.scenes.current.prizeShop.show();
            }
          })
        });
        btns.push({
          label: "Today's Games",
          action: () => this.close(() => {
            if (this.game.scenes.current) this.game.scenes.current.overlay = true;
          })
        });
      } else if (sceneName !== 'title') {
        btns.push({
          label: 'Back to Hub',
          action: () => this.close(() => this.game.scenes.switchTo('hub', { fromBooth: sceneName }))
        });
      }
      btns.push({ label: 'Mini-Games >', action: () => this.switchPage(1) });
      return btns.map((b, i) => ({
        ...b,
        x: rp.x + 6,
        y: rp.y + 34 + i * 28,
        w: rp.w - 12,
        h: 22
      }));
    }

    if (pageIdx === 1) {
      const games = [
        { id: 'derby',     label: 'Bunny Derby' },
        { id: 'snake',     label: 'Caterpillar' },
        { id: 'ducklings', label: 'Ducklings' },
        { id: 'fox',       label: 'Fox Showdown' }
      ];
      return games.map((gm, i) => ({
        label: gm.label,
        gameId: gm.id,
        action: () => this.close(() => this.game.scenes.switchTo(gm.id, { fromBooth: gm.id })),
        x: lp.x + 6,
        y: lp.y + 32 + i * 32,
        w: lp.w - 12,
        h: 25
      }));
    }

    if (pageIdx === 2) {
      const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
      const btns = [
        {
          label: skyMood === 'sunset' ? 'Sky: Sunset' : 'Sky: Sunny Day',
          action: () => {
            if (this.game.save) {
              this.game.save.data.skyMood = skyMood === 'sunset' ? 'day' : 'sunset';
              this.game.save.save();
            }
          }
        },
        {
          label: isFS ? 'Fullscreen: ON' : 'Fullscreen: OFF',
          action: () => { if (typeof toggleFullscreen === 'function') toggleFullscreen(); }
        },
        {
          label: muted ? 'Sound: OFF' : 'Sound: ON',
          action: () => { if (this.game.sound) this.game.sound.toggleMute(); }
        },
        {
          label: Vehicle.debug ? 'Debug [H]: ON' : 'Debug [H]: OFF',
          action: () => { Vehicle.debug = !Vehicle.debug; }
        }
      ];
      return btns.map((b, i) => ({
        ...b,
        x: lp.x + 6,
        y: lp.y + 34 + i * 28,
        w: lp.w - 12,
        h: 22
      }));
    }

    // Page 3 : Exit / Navigation
    const exitBtns = [
      { label: 'Resume Game', action: () => this.close(), accent: true }
    ];
    if (sceneName !== 'hub' && sceneName !== 'title') {
      exitBtns.push({
        label: 'Back to Hub',
        action: () => this.close(() => this.game.scenes.switchTo('hub', { fromBooth: sceneName }))
      });
    }
    if (sceneName !== 'title') {
      exitBtns.push({
        label: 'Title Screen',
        action: () => this.close(() => this.game.scenes.switchTo('title'))
      });
    }
    return exitBtns.map((b, i) => ({
      ...b,
      x: rp.x + 6,
      y: rp.y + 42 + i * 32,
      w: rp.w - 12,
      h: 24
    }));
  }

  draw(g) {
    if (this.state === 'CLOSED') return;

    this.update();
    if (this.state === 'CLOSED') return;

    const assets = this.game.assets;
    const font = assets ? assets.font : null;
    const m = this.getBookMetrics();
    const mx = (mouseX / Math.max(1, width)) * m.vw;
    const my = (mouseY / Math.max(1, height)) * m.vh;

    // 1. Fond assombri animé (fondu doux à l'ouverture/fermeture)
    let dimAlpha = 148;
    if (this.state === 'OPENING') dimAlpha = Math.round((this.animFrame / 15) * 148);
    else if (this.state === 'CLOSING') dimAlpha = Math.round((1 - this.animFrame / 14) * 148);

    g.push();
    g.noStroke();
    g.fill(26, 20, 32, dimAlpha);
    g.rect(0, 0, m.vw, m.vh);

    // 2. Choisir la frame du livre (5 = fermé -> 1 = grand ouvert)
    let spriteNum = 1;
    if (this.state === 'OPENING') {
      const idx = Math.min(4, Math.floor((this.animFrame / 15) * 5));
      spriteNum = 5 - idx; // 5, 4, 3, 2, 1
    } else if (this.state === 'CLOSING') {
      const idx = Math.min(4, Math.floor((this.animFrame / 14) * 5));
      spriteNum = 1 + idx; // 1, 2, 3, 4, 5
    }

    const frames = this.ensureRecoloredBookFrames();
    const bookImg = (frames && frames[spriteNum])
      || (assets ? assets.getImage('ui/Icon & Menu/Icon & Menu/Menu/menu swipe animation' + spriteNum + '.png') : null);

    // Léger rebond vertical à l'ouverture
    const bounceY = this.state === 'OPENING'
      ? Math.round((1 - this.animFrame / 15) * 8)
      : (this.state === 'CLOSING' ? Math.round((this.animFrame / 14) * 8) : 0);

    if (bookImg) {
      g.image(bookImg, m.bx, m.by + bounceY, m.bw, m.bh);
    } else {
      PixelUI.panel(g, m.bx + 12, m.by + 32, m.bw - 24, m.bh - 64);
    }

    // Petit ruban marque-page rose poudré qui dépasse doucement en bas de la reliure
    if (this.state === 'OPEN' || this.state === 'FLIPPING') {
      g.noStroke();
      g.fill(107, 75, 91);
      g.rect(m.spineX - 4, m.by + 220, 8, 15);
      g.fill(189, 117, 126);
      g.rect(m.spineX - 3, m.by + 220, 6, 13);
      g.fill(247, 236, 194);
      g.triangle(m.spineX - 3, m.by + 234, m.spineX + 3, m.by + 234, m.spineX, m.by + 230);
    }

    // 3. Contenu des pages (uniquement quand le livre est ouvert ou en train de tourner une page)
    if (this.state === 'OPEN') {
      this.drawTabHighlight(g, m, this.pageIdx, mx, my);
      this.drawPageSpread(g, font, this.pageIdx, m, mx, my);
      this.drawFooterHint(g, font, m);
    } else if (this.state === 'FLIPPING') {
      this.drawTabHighlight(g, m, this.flipTo, mx, my);
      // Pages visibles sous la feuille qui tourne
      const leftIdx = this.flipDir > 0 ? this.flipFrom : this.flipTo;
      const rightIdx = this.flipDir > 0 ? this.flipTo : this.flipFrom;
      this.drawLeftPageOnly(g, font, leftIdx, m, -999, -999);
      this.drawRightPageOnly(g, font, rightIdx, m, -999, -999);
      this.drawFlippingSheet(g, m, this.flipT, this.flipDir);
      this.drawFooterHint(g, font, m);
    }

    g.pop();
  }

  /** Dessine la feuille de parchemin animée qui se soulève et bascule par-dessus la reliure. */
  drawFlippingSheet(g, m, t, dir) {
    // Progression lissée (ease in-out)
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const angle = ease * Math.PI;
    const cosA = Math.cos(angle); // +1 -> 0 -> -1
    const sinA = Math.sin(angle); // 0 -> +1 -> 0

    const pageW = 122;
    const pageH = 172;
    const topY = m.by + 38;
    const lift = Math.round(sinA * 10);

    // Direction : dir > 0 tourne de droite vers gauche ; dir < 0 de gauche vers droite
    const signedX = dir > 0 ? cosA * pageW : -cosA * pageW;
    const x0 = m.spineX;
    const x1 = Math.round(m.spineX + signedX);

    g.push();
    // Ombre douce prune-bois portée sur la reliure pendant le mouvement
    g.noStroke();
    g.fill(107, 75, 91, Math.round(sinA * 85));
    const shadowW = Math.max(6, Math.round(sinA * 26));
    g.rect(m.spineX - Math.round(shadowW / 2), topY + 2, shadowW, pageH - 2);

    // Feuille de parchemin crème Sprout Lands qui pivote (effet 3D de courbure)
    const isFront = (dir > 0 && cosA >= 0) || (dir < 0 && cosA <= 0);
    g.fill(isFront ? g.color(255, 248, 220) : g.color(238, 218, 174));
    g.stroke(107, 75, 91);
    g.strokeWeight(1.5);
    g.beginShape();
    g.vertex(x0, topY);
    g.vertex(x1, topY - lift);
    g.vertex(x1, topY + pageH - lift);
    g.vertex(x0, topY + pageH);
    g.endShape(CLOSE);

    // Lignes d'écriture esquissées sur la page qui tourne
    if (Math.abs(x1 - x0) > 22) {
      g.stroke(182, 137, 98, 150);
      g.strokeWeight(1);
      const minX = Math.min(x0, x1) + 8;
      const maxX = Math.max(x0, x1) - 8;
      for (let ly = topY + 26; ly < topY + pageH - 24; ly += 16) {
        g.line(minX, ly - Math.round(lift * 0.5), maxX, ly - Math.round(lift * 0.5));
      }
    }
    g.pop();
  }

  /** Met en valeur l'onglet marque-page actif (et le survol souris). */
  drawTabHighlight(g, m, activeIdx, mx, my) {
    for (const tab of m.tabs) {
      const isAct = tab.idx === activeIdx;
      const isHov = PixelUI.pointInRect(mx, my, tab);
      if (isAct || isHov) {
        g.push();
        g.noFill();
        g.stroke(isAct ? g.color(255, 249, 224) : g.color(247, 235, 170, 190));
        g.strokeWeight(isAct ? 2 : 1);
        g.rect(tab.x + 1, tab.y + 1, tab.w - 2, tab.h - 2);
        if (isAct) {
          g.noStroke();
          g.fill(255, 249, 224);
          g.triangle(
            tab.x + tab.w + 2, tab.y + Math.round(tab.h / 2),
            tab.x + tab.w + 7, tab.y + Math.round(tab.h / 2) - 4,
            tab.x + tab.w + 7, tab.y + Math.round(tab.h / 2) + 4
          );
        }
        g.pop();
      }
    }
  }

  drawFooterHint(g, font, m) {
    PixelUI.txt(
      g,
      font,
      'Click tabs or <- / -> to flip  |  Esc / M: Close',
      Math.round(m.vw / 2),
      m.by + m.bh - 14,
      g.color(247, 235, 170),
      CENTER
    );
  }

  /** Dessine une bannière de titre rose poudré Sprout Lands sur une page du livre. */
  drawPageHeader(g, font, title, pageRect) {
    g.push();
    g.fill(189, 117, 126);
    g.stroke(107, 75, 91);
    g.strokeWeight(1.5);
    g.rect(pageRect.x + 8, pageRect.y + 6, pageRect.w - 16, 18, 2);
    PixelUI.txt(
      g,
      font,
      title,
      pageRect.x + Math.round(pageRect.w / 2),
      pageRect.y + 9,
      g.color(255, 249, 235),
      CENTER
    );
    g.pop();
  }

  /** Dessine un bouton pastel bois/menthe assorti au reste de Moo's Funfair. */
  drawBookButton(g, font, b, active) {
    g.push();
    g.fill(active ? g.color(223, 240, 187) : (b.accent ? g.color(236, 244, 210) : g.color(232, 207, 166)));
    g.stroke(107, 75, 91);
    g.strokeWeight(1.5);
    g.rect(b.x, b.y, b.w, b.h, 2);

    const fg = active ? g.color(70, 101, 80) : g.color(107, 75, 91);
    const prefix = active ? '> ' : '';
    PixelUI.txt(g, font, prefix + b.label, b.x + Math.round(b.w / 2), b.y + 5, fg, CENTER);
    g.pop();
  }

  drawPageSpread(g, font, idx, m, mx, my) {
    this.drawLeftPageOnly(g, font, idx, m, mx, my);
    this.drawRightPageOnly(g, font, idx, m, mx, my);
  }

  drawLeftPageOnly(g, font, idx, m, mx, my) {
    const lp = m.leftPage;
    const assets = this.game.assets;
    const save = this.game.save ? this.game.save.data : { tickets: 0, stars: {} };
    const ink = g.color(107, 75, 91);
    const roseInk = g.color(168, 92, 102);

    if (idx === 0) {
      // PAGE 0 GAUCHE : Profil de Moo + Tickets + Étoiles
      this.drawPageHeader(g, font, 'MOO PROFILE', lp);

      // Cadre portrait de Moo (cligne des yeux !) sur fond prairie pastel
      g.push();
      g.fill(223, 240, 187);
      g.stroke(107, 75, 91);
      g.strokeWeight(1.5);
      g.rect(lp.x + 36, lp.y + 30, 46, 48, 2);
      g.pop();

      const blinkCol = Math.floor(frameCount / 80) % 4 === 3 ? 1 : 0;
      if (typeof CosmeticCatalog !== 'undefined') {
        CosmeticCatalog.drawMooWithOutfit(
          g,
          assets,
          save.equippedOutfit,
          lp.x + 43,
          lp.y + 34,
          blinkCol,
          0,
          1
        );
      } else {
        const mooImg = assets.getSheetFrame('sprites/moo/better sprite.png', 32, 40, blinkCol, 0);
        if (mooImg) {
          g.image(mooImg, lp.x + 43, lp.y + 34);
        }
      }

      // Tickets + Étoiles totales
      const ticketSp = assets.getSprite('ticket');
      if (ticketSp) g.image(ticketSp, lp.x + 14, lp.y + 88);
      PixelUI.txt(g, font, 'Tickets: ' + (save.tickets || 0), lp.x + 32, lp.y + 89, ink);

      const totalStars = ['derby', 'snake', 'ducklings', 'fox']
        .reduce((acc, k) => acc + ((save.stars && save.stars[k]) || 0), 0);
      PixelUI.txt(g, font, 'Stars: ' + totalStars + ' / 12', lp.x + 14, lp.y + 108, ink);

      // Mini carte de tampons (4 jeux)
      PixelUI.txt(g, font, 'Fair Stamps:', lp.x + 14, lp.y + 128, roseInk);
      const ids = ['derby', 'snake', 'ducklings', 'fox'];
      ids.forEach((id, i) => {
        const won = (save.stars && save.stars[id] > 0);
        const sx = lp.x + 14 + i * 24;
        const sy = lp.y + 144;
        const stampImg = assets.getSheetFrame('generated/hub/stamp_empty_full_16x16.png', 16, 16, won ? 1 : 0, 0);
        if (stampImg) {
          g.image(stampImg, sx, sy);
        } else {
          g.fill(won ? g.color(152, 198, 126) : g.color(232, 207, 166));
          g.rect(sx, sy, 14, 14);
        }
      });
    } else if (idx === 1) {
      // PAGE 1 GAUCHE : Liste des 4 mini-jeux cliquables
      this.drawPageHeader(g, font, 'MINI-GAMES', lp);
      const buttons = this.getPageButtons(1, m);
      buttons.forEach((b, i) => {
        const hov = PixelUI.pointInRect(mx, my, b);
        if (hov) this.selectedIdx = i;
        this.drawBookButton(g, font, b, i === this.selectedIdx);
      });
    } else if (idx === 2) {
      // PAGE 2 GAUCHE : Réglages (Fullscreen, Son, Debug)
      this.drawPageHeader(g, font, 'SETTINGS', lp);
      const buttons = this.getPageButtons(2, m);
      buttons.forEach((b, i) => {
        const hov = PixelUI.pointInRect(mx, my, b);
        if (hov) this.selectedIdx = i;
        this.drawBookButton(g, font, b, i === this.selectedIdx);
      });
    } else {
      // PAGE 3 GAUCHE : Récapitulatif & Fermeture
      this.drawPageHeader(g, font, 'FUNFAIR', lp);
      const sceneName = this.game.scenes ? this.game.scenes.currentName : 'hub';
      PixelUI.txt(g, font, 'Current:', lp.x + 12, lp.y + 40, ink);
      PixelUI.txt(g, font, sceneName.toUpperCase(), lp.x + 12, lp.y + 56, roseInk);
      PixelUI.txt(g, font, 'Progress is', lp.x + 12, lp.y + 88, ink);
      PixelUI.txt(g, font, 'auto-saved!', lp.x + 12, lp.y + 104, ink);
      PixelUI.txt(g, font, 'See you soon,', lp.x + 12, lp.y + 132, ink);
      PixelUI.txt(g, font, 'Moo!', lp.x + 12, lp.y + 148, roseInk);
    }
  }

  drawRightPageOnly(g, font, idx, m, mx, my) {
    const rp = m.rightPage;
    const save = this.game.save ? this.game.save.data : { stars: {} };
    const ink = g.color(107, 75, 91);
    const roseInk = g.color(168, 92, 102);

    if (idx === 0) {
      // PAGE 0 DROITE : Actions rapides
      this.drawPageHeader(g, font, 'QUICK MENU', rp);
      const buttons = this.getPageButtons(0, m);
      buttons.forEach((b, i) => {
        const hov = PixelUI.pointInRect(mx, my, b);
        if (hov) this.selectedIdx = i;
        this.drawBookButton(g, font, b, i === this.selectedIdx);
      });
    } else if (idx === 1) {
      // PAGE 1 DROITE : Étoiles par jeu + Raccourcis
      this.drawPageHeader(g, font, 'PROGRESS', rp);
      const games = [
        { id: 'derby',     name: 'Derby' },
        { id: 'snake',     name: 'Snake' },
        { id: 'ducklings', name: 'Ducks' },
        { id: 'fox',       name: 'Fox' }
      ];
      games.forEach((gm, i) => {
        const st = (save.stars && save.stars[gm.id]) || 0;
        const starsTxt = '*'.repeat(st) + '-'.repeat(3 - st);
        PixelUI.txt(g, font, gm.name + ': [' + starsTxt + ']', rp.x + 10, rp.y + 36 + i * 20, ink);
      });
      PixelUI.txt(g, font, 'Controls:', rp.x + 10, rp.y + 122, roseInk);
      PixelUI.txt(g, font, 'WASD / Arrows', rp.x + 10, rp.y + 138, ink);
      PixelUI.txt(g, font, 'F: Full  H: Debug', rp.x + 10, rp.y + 152, ink);
    } else if (idx === 2) {
      // PAGE 2 DROITE : Info Steering Behaviors
      this.drawPageHeader(g, font, 'STEERING AI', rp);
      PixelUI.txt(g, font, 'Craig Reynolds', rp.x + 10, rp.y + 36, roseInk);
      PixelUI.txt(g, font, 'Press [H] anytime', rp.x + 10, rp.y + 56, ink);
      PixelUI.txt(g, font, 'to inspect rays,', rp.x + 10, rp.y + 70, ink);
      PixelUI.txt(g, font, 'forces, obstacles', rp.x + 10, rp.y + 84, ink);
      PixelUI.txt(g, font, '& debug sliders!', rp.x + 10, rp.y + 98, ink);
      PixelUI.txt(g, font, '100% Vehicle +', rp.x + 10, rp.y + 128, roseInk);
      PixelUI.txt(g, font, 'BehaviorManager', rp.x + 10, rp.y + 142, roseInk);
    } else {
      // PAGE 3 DROITE : Boutons Exit / Hub / Resume
      this.drawPageHeader(g, font, 'EXIT MENU', rp);
      const buttons = this.getPageButtons(3, m);
      buttons.forEach((b, i) => {
        const hov = PixelUI.pointInRect(mx, my, b);
        if (hov) this.selectedIdx = i;
        this.drawBookButton(g, font, b, i === this.selectedIdx);
      });
    }
  }

  mousePressed(rawX, rawY) {
    if (this.state !== 'OPEN') return true;
    const m = this.getBookMetrics();

    // 1. Clic sur un des 4 onglets marque-pages -> tourne la page avec animation !
    const hitTab = m.tabs.find((t) => PixelUI.pointInRect(rawX, rawY, t));
    if (hitTab) {
      this.switchPage(hitTab.idx);
      return true;
    }

    // 2. Clic sur un bouton de la page active
    const buttons = this.getPageButtons(this.pageIdx, m);
    const hitBtn = buttons.find((b) => PixelUI.pointInRect(rawX, rawY, b));
    if (hitBtn) {
      if (this.game.sound) this.game.sound.playSfx('ui_click', 0.9);
      hitBtn.action();
      return true;
    }

    // 3. Clic à l'extérieur du livre -> referme le livre avec animation
    if (rawX < m.bx || rawX > m.bx + m.bw || rawY < m.by + 28 || rawY > m.by + m.bh - 28) {
      this.close();
      return true;
    }

    return true;
  }

  keyPressed(k, kc) {
    if (this.state !== 'OPEN') return true;
    const m = this.getBookMetrics();
    const buttons = this.getPageButtons(this.pageIdx, m);

    // Flèches Gauche/Droite ou A/D : tourner les pages du livre !
    if (kc === LEFT_ARROW || k === 'a' || k === 'A' || k === 'q' || k === 'Q') {
      this.switchPage(this.pageIdx - 1);
      return true;
    }
    if (kc === RIGHT_ARROW || k === 'd' || k === 'D') {
      this.switchPage(this.pageIdx + 1);
      return true;
    }

    // Touches 1..4 : saut direct à un onglet avec animation de page
    if (k >= '1' && k <= '4') {
      this.switchPage(parseInt(k, 10) - 1);
      return true;
    }

    // Navigation verticale dans les boutons de la page
    if (buttons.length > 0) {
      if (kc === UP_ARROW || k === 'w' || k === 'W' || k === 'z' || k === 'Z') {
        this.selectedIdx = (this.selectedIdx - 1 + buttons.length) % buttons.length;
        if (this.game.sound) this.game.sound.playSfx('ui_click', 0.5);
        return true;
      }
      if (kc === DOWN_ARROW || k === 's' || k === 'S') {
        this.selectedIdx = (this.selectedIdx + 1) % buttons.length;
        if (this.game.sound) this.game.sound.playSfx('ui_click', 0.5);
        return true;
      }
      if (kc === ENTER || kc === RETURN || k === ' ') {
        const btn = buttons[this.selectedIdx];
        if (btn) {
          if (this.game.sound) this.game.sound.playSfx('ui_click', 0.9);
          btn.action();
        }
        return true;
      }
    }
    return true;
  }
}
