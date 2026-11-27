/**
 * Écran titre de Moo's Funfair (sous-classe de Scene).
 * Carte postale animée de fête foraine : ciel parallaxe 7 couches, grande roue tournante,
 * stands colorés, fontaine scintillante, guirlandes au vent, ballons, papillons,
 * portrait de Moo (2x) avec sa tenue sauvegardée, boutons PLAY / CONTINUE et CREDITS.
 */
class TitleScene extends Scene {
  constructor(game) {
    super(game);
    this.showCredits = false;
    this.menuIdx = 0; // 0 = PLAY/CONTINUE, 1 = CREDITS
    this.playBtn = { x: 256, y: 146, w: 150, h: 26 };
    this.creditsBtn = { x: 274, y: 182, w: 114, h: 22 };
    this.closeCreditsBtn = { x: 196, y: 214, w: 88, h: 20 };

    // Papillons décoratifs suivant des courbes organiques
    this.butterflies = [
      { cx: 92,  cy: 132, rx: 28, ry: 12, speed: 0.024, phase: 0.2, col: [252, 224, 134] },
      { cx: 368, cy: 112, rx: 32, ry: 14, speed: 0.020, phase: 2.1, col: [248, 174, 198] },
      { cx: 212, cy: 186, rx: 24, ry: 10, speed: 0.028, phase: 4.0, col: [176, 224, 246] }
    ];

    // Ballons flottants de l'écran titre
    this.balloons = [
      { x: 46,  y: 126, col: [246, 152, 174], phase: 0.3 },
      { x: 60,  y: 118, col: [252, 222, 128], phase: 1.5 },
      { x: 74,  y: 128, col: [158, 212, 236], phase: 2.7 },
      { x: 422, y: 122, col: [212, 176, 232], phase: 0.9 },
      { x: 436, y: 130, col: [176, 226, 158], phase: 2.2 }
    ];
  }

  init() {
    this.showCredits = false;
    this.menuIdx = 0;
    if (this.game.sound) this.game.sound.playMusic('title');
  }

  hasSavedProgress() {
    const d = this.game.save && this.game.save.data;
    if (!d) return false;
    const totalStars = d.stars ? Object.values(d.stars).reduce((a, b) => a + b, 0) : 0;
    return (d.tickets || 0) > 0 || totalStars > 0 || (d.unlockedCosmetics && d.unlockedCosmetics.length > 0);
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const ground = assets.getImage('world/hub/hub_ground.png');
    const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
    const t = frameCount;

    // 1. Ciel parallaxe 7 couches + prairie
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.draw(g, assets, skyMood, 480, t * 0.12, 0);
    } else {
      g.background(140, 185, 130);
    }

    if (ground) {
      g.image(ground, 0, 94, 480, 178, 0, 94, 480, 178);
    }
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawHorizonBlend(g, skyMood, 0, 480, 94);
    }

    // 2. Arbres et stands de fête foraine en arrière-plan
    const drawSp = (name, x, y) => {
      const sp = assets.getSprite(name);
      if (sp) g.image(sp, Math.round(x), Math.round(y));
    };
    drawSp('tree_round', 10, 68);
    drawSp('tree_apple', 428, 66);
    drawSp('booth_derby', 48, 84);
    drawSp('booth_snake', 112, 86);
    drawSp('booth_ducklings', 318, 86);
    drawSp('booth_fox', 380, 84);

    // 3. Grande Roue animée au centre-arrière
    this.drawMiniFerrisWheel(g, 240, 96);

    // 4. Guirlande de fanions qui ondule doucement
    for (let bx = 0; bx < 480; bx += 16) {
      const sway = Math.round(Math.sin(t * 0.05 + bx * 0.06) * 1);
      drawSp(((bx / 16) % 2 === 0) ? 'bunting_a' : 'bunting_b', bx, 90 + sway);
    }

    // 5. Petite fontaine à vœux animée au centre-bas gauche
    this.drawWishingFountain(g, 204, 212);

    // 6. Ballons flottants avec ficelles
    g.push();
    for (const b of this.balloons) {
      const by = Math.round(b.y + Math.sin(t * 0.045 + b.phase) * 3);
      g.stroke(107, 75, 91, 170);
      g.strokeWeight(1);
      g.line(b.x, by + 8, b.x, by + 26);
      g.noStroke();
      g.fill(107, 75, 91);
      g.ellipse(b.x, by, 12, 14);
      g.fill(b.col[0], b.col[1], b.col[2]);
      g.ellipse(b.x, by, 10, 12);
      g.fill(255, 252, 240, 190);
      g.rect(b.x - 3, by - 4, 2, 3);
    }
    g.pop();

    // 7. Fleurs et petits animaux explorant la prairie
    drawSp('flower_pink', 32, 214);
    drawSp('flower_yellow', 64, 224);
    drawSp('flower_blue', 248, 228);
    drawSp('flower_pink', 418, 218);
    drawSp('bush_berry', 432, 196);

    const duckFrame = Math.floor(t / 18) % 2;
    const duckImg = assets.getSheetFrame('characters/animals/ducklings/duckling_sheet.png', 16, 16, duckFrame, 0);
    if (duckImg) {
      const dx = Math.round(284 + Math.sin(t * 0.015) * 18);
      g.image(duckImg, dx, 222);
    }

    // 8. Léger voile d'ambiance chaud pour faire ressortir le titre et Moo
    g.noStroke();
    g.fill(44, 30, 42, 62);
    g.rect(0, 0, 480, 272);

    // 9. Grande pancarte en bois "MOO'S FUNFAIR" avec lampions scintillants
    const sign = assets.getSprite('title_sign');
    if (sign) {
      const sx = Math.round((480 - sign.width) / 2);
      g.image(sign, sx, 14);
      // Petites ampoules chaudes aux coins de l'enseigne
      const lit = Math.floor(t / 18) % 2 === 0;
      g.fill(lit ? g.color(255, 246, 168) : g.color(255, 194, 178));
      g.rect(sx + 6, 19, 3, 3);
      g.rect(sx + sign.width - 9, 19, 3, 3);
      g.rect(sx + 6, 40, 3, 3);
      g.rect(sx + sign.width - 9, 40, 3, 3);
    } else {
      PixelUI.panel(g, 130, 18, 220, 32);
      PixelUI.txt(g, font, "MOO'S FUNFAIR", 240, 27, g.color(107, 75, 91), CENTER);
    }

    // 10. Moo au premier plan (à gauche, échelle 2x) avec sa tenue complète sauvegardée !
    const blinkCol = Math.floor(t / 95) % 5 === 4 ? 1 : 0;
    const bob = Math.round(Math.sin(t * 0.06) * 2);
    const mooX = 104;
    const mooY = 128 + bob;

    // Ombre douce sous Moo
    g.noStroke();
    g.fill(68, 48, 62, 75);
    g.ellipse(mooX + 32, 208, 42, 10);

    if (typeof CosmeticCatalog !== 'undefined') {
      CosmeticCatalog.drawMooWithOutfit(
        g,
        assets,
        this.game.save ? this.game.save.data.equippedOutfit : null,
        mooX,
        mooY,
        blinkCol,
        0,
        2
      );
    } else {
      const mooImg = assets.getSheetFrame('characters/moo/moo_main.png', 32, 40, blinkCol, 0);
      if (mooImg) g.image(mooImg, mooX, mooY, 64, 80);
    }

    // Petit cœur / étincelle de bienvenue au-dessus de Moo
    const waveAlpha = Math.round(140 + Math.sin(t * 0.09) * 90);
    g.fill(255, 246, 182, waveAlpha);
    g.rect(mooX + 54, mooY + 6 + Math.round(Math.sin(t * 0.1) * 2), 2, 2);
    g.rect(mooX + 8,  mooY + 14 + Math.round(Math.cos(t * 0.08) * 2), 2, 2);

    // 11. Papillons animés au premier plan
    for (const bf of this.butterflies) {
      const bx = Math.round(bf.cx + Math.cos(t * bf.speed + bf.phase) * bf.rx);
      const by = Math.round(bf.cy + Math.sin(t * bf.speed * 1.7 + bf.phase) * bf.ry);
      const flap = Math.floor(t / 6 + bf.phase * 3) % 2 === 0 ? 2 : 1;
      g.fill(bf.col[0], bf.col[1], bf.col[2]);
      g.rect(bx - flap, by - 1, flap, 2);
      g.rect(bx + 1, by - 1, flap, 2);
      g.fill(107, 75, 91);
      g.rect(bx, by - 1, 1, 2);
    }

    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawMoodGlaze(g, skyMood, 480, 272);
    }

    const { mx, my } = this.game.getMouseBufferPos();

    if (!this.showCredits) {
      // Panneau parchemin d'accueil à droite de Moo
      PixelUI.panel(g, 232, 108, 198, 118, g.color(247, 236, 202));
      g.noStroke();
      g.fill(189, 117, 126);
      g.rect(235, 111, 192, 18, 2);
      PixelUI.txt(g, font, 'WELCOME TO THE FUNFAIR!', 331, 114, g.color(255, 250, 236), CENTER, 8.5, 186);

      const playHover = PixelUI.pointInRect(mx, my, this.playBtn);
      const credHover = PixelUI.pointInRect(mx, my, this.creditsBtn);
      if (playHover) this.menuIdx = 0;
      else if (credHover) this.menuIdx = 1;

      const playSel = this.menuIdx === 0;
      const playRect = {
        x: this.playBtn.x,
        y: this.playBtn.y + (playSel ? Math.round(Math.sin(t * 0.2) * 1.2) - 1 : 0),
        w: this.playBtn.w,
        h: this.playBtn.h
      };
      const playLabel = this.hasSavedProgress() ? 'CONTINUE' : 'PLAY';
      PixelUI.drawButton(
        g,
        font,
        playRect,
        (playSel ? '> ' : '') + playLabel,
        playSel,
        g.color(218, 240, 182),
        g.color(194, 230, 146)
      );

      const credSel = this.menuIdx === 1;
      const credRect = {
        x: this.creditsBtn.x,
        y: this.creditsBtn.y + (credSel ? -1 : 0),
        w: this.creditsBtn.w,
        h: this.creditsBtn.h
      };
      PixelUI.drawButton(g, font, credRect, (credSel ? '> ' : '') + 'CREDITS', credSel);

      PixelUI.txt(g, font, '4 Steering & AI Mini-Games', 331, 210, g.color(144, 98, 93), CENTER, 7.5, 188);
      PixelUI.txt(g, font, 'Arrows: Select  •  Space/Enter: Confirm  •  [F] Fullscreen', 240, 250, g.color(255, 246, 206), CENTER, 8);
    } else {
      // Fenêtre de crédits (Sprout Lands + Minifolks + Nouveaux packs)
      PixelUI.panel(g, 68, 56, 344, 188, g.color(247, 236, 200));
      g.noStroke();
      g.fill(189, 117, 126);
      g.rect(71, 59, 338, 20, 2);
      PixelUI.txt(g, font, 'CREDITS & LICENSES', 240, 63, g.color(255, 250, 236), CENTER, 9);

      PixelUI.txt(g, font, 'Game & Steering AI: Mouna (Master IA2)', 240, 88, g.color(107, 75, 91), CENTER, 8.5, 326);
      PixelUI.txt(g, font, 'Tiles & UI: Sprout Lands by Cup Nooble (credited)', 240, 108, g.color(107, 75, 91), CENTER, 8, 326);
      PixelUI.txt(g, font, 'Animals & Characters: Minifolks, Fox, Bunny & NPC Packs', 240, 126, g.color(107, 75, 91), CENTER, 8, 326);
      PixelUI.txt(g, font, 'Mini-Games Art: Pokemon, Pompompurin & Legend of Zink Packs', 240, 144, g.color(107, 75, 91), CENTER, 8, 326);
      PixelUI.txt(g, font, 'Course: Craig Reynolds & M. Buffa (p5.js + TensorFlow.js)', 240, 164, g.color(144, 98, 93), CENTER, 8, 326);
      PixelUI.txt(g, font, 'Dynamic Pixel Art + Native HD Typography', 240, 184, g.color(144, 98, 93), CENTER, 7.5, 326);

      PixelUI.drawButton(
        g,
        font,
        this.closeCreditsBtn,
        'BACK (Esc)',
        PixelUI.pointInRect(mx, my, this.closeCreditsBtn)
      );
    }
  }

  /** Grande roue tournante avec 8 nacelles pastel et 16 ampoules scintillantes. */
  drawMiniFerrisWheel(g, cx, cy) {
    const r = 34;
    const rot = frameCount * 0.009;
    const podColors = [
      [246, 152, 174], [252, 222, 128], [158, 212, 236], [176, 226, 158],
      [212, 176, 232], [250, 188, 138], [246, 152, 174], [158, 212, 236]
    ];

    g.push();
    // Halo lumineux subtil
    g.noStroke();
    g.fill(255, 244, 198, 26);
    g.circle(cx, cy, r * 2.35);

    // Support en A
    g.stroke(107, 75, 91);
    g.strokeWeight(4);
    g.line(cx, cy, cx - 22, cy + 44);
    g.line(cx, cy, cx + 22, cy + 44);
    g.stroke(166, 118, 92);
    g.strokeWeight(2);
    g.line(cx, cy, cx - 22, cy + 44);
    g.line(cx, cy, cx + 22, cy + 44);

    // Rayons + jante
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
    g.stroke(236, 212, 172);
    g.strokeWeight(2);
    g.circle(cx, cy, r * 2);

    // 16 ampoules
    g.noStroke();
    for (let i = 0; i < 16; i++) {
      const a = rot + (TWO_PI * i) / 16;
      const lit = (Math.floor(frameCount / 14) + i) % 2 === 0;
      g.fill(lit ? g.color(255, 248, 172) : g.color(255, 188, 198, 210));
      g.rect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 2, 2);
    }

    // Moyeu
    g.fill(107, 75, 91);
    g.circle(cx, cy, 9);
    g.fill(247, 224, 134);
    g.circle(cx, cy, 5);

    // 8 nacelles droites
    for (let i = 0; i < 8; i++) {
      const a = rot + (TWO_PI * i) / 8;
      const gx = Math.round(cx + Math.cos(a) * r);
      const gy = Math.round(cy + Math.sin(a) * r);
      const col = podColors[i];
      g.stroke(107, 75, 91);
      g.strokeWeight(1);
      g.line(gx, gy, gx, gy + 3);
      g.fill(col[0], col[1], col[2]);
      g.rect(gx - 4, gy + 3, 8, 7, 1);
      g.noStroke();
      g.fill(255, 250, 232);
      g.rect(gx - 3, gy + 4, 6, 2);
    }
    g.pop();
  }

  /** Petite fontaine à vœux animée avec jets d'eau scintillants. */
  drawWishingFountain(g, cx, cy) {
    const t = frameCount;
    g.push();
    g.noStroke();
    // Bassin en pierre
    g.fill(107, 75, 91);
    g.ellipse(cx, cy + 4, 34, 14);
    g.fill(208, 198, 186);
    g.ellipse(cx, cy + 2, 32, 12);
    g.fill(138, 206, 230);
    g.ellipse(cx, cy + 2, 26, 8);
    // Ondulations d'eau
    const rip = (t % 36) / 36;
    g.noFill();
    g.stroke(230, 248, 255, Math.round((1 - rip) * 180));
    g.strokeWeight(1);
    g.ellipse(cx, cy + 2, 8 + rip * 16, 3 + rip * 5);
    // Colonne centrale + jet
    g.noStroke();
    g.fill(186, 174, 164);
    g.rect(cx - 3, cy - 10, 6, 12);
    g.fill(224, 214, 204);
    g.rect(cx - 5, cy - 11, 10, 3);
    // Gouttes d'eau qui jaillissent
    for (let i = 0; i < 4; i++) {
      const p = ((t * 0.06 + i * 0.25) % 1);
      const dir = i % 2 === 0 ? 1 : -1;
      const wx = Math.round(cx + dir * p * 9);
      const wy = Math.round(cy - 12 - Math.sin(p * Math.PI) * 8 + p * 12);
      g.fill(220, 246, 255, 220);
      g.rect(wx, wy, 2, 2);
    }
    g.pop();
  }

  mousePressed(mx, my) {
    if (this.showCredits) {
      if (PixelUI.pointInRect(mx, my, this.closeCreditsBtn)) {
        this.game.sound.playSfx('ui_click');
        this.showCredits = false;
      }
      return;
    }

    if (PixelUI.pointInRect(mx, my, this.playBtn)) {
      this.game.sound.playSfx('ui_click');
      this.game.scenes.switchTo('hub');
    } else if (PixelUI.pointInRect(mx, my, this.creditsBtn)) {
      this.game.sound.playSfx('ui_click');
      this.showCredits = true;
    }
  }

  keyPressed(k, kc) {
    if (this.showCredits) {
      if (kc === ESCAPE || k === ' ' || kc === ENTER) {
        this.game.sound.playSfx('ui_click');
        this.showCredits = false;
      }
      return;
    }

    if (kc === UP_ARROW || kc === DOWN_ARROW || kc === LEFT_ARROW || kc === RIGHT_ARROW ||
        k === 'w' || k === 'W' || k === 's' || k === 'S' || k === 'z' || k === 'Z') {
      this.menuIdx = (this.menuIdx + 1) % 2;
      this.game.sound.playSfx('ui_click', 0.5);
      return;
    }

    if (k === ' ' || kc === ENTER) {
      this.game.sound.playSfx('ui_click');
      if (this.menuIdx === 0) this.game.scenes.switchTo('hub');
      else this.showCredits = true;
    }
  }
}
