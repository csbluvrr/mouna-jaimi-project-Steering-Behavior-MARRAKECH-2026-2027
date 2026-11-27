/**
 * Écran titre de Moo's Funfair (sous-classe de Scene).
 * Affiche un aperçu doux de la fête foraine, la pancarte en bois, Moo qui
 * cligne des yeux, un bouton PLAY et un écran CREDITS (obligatoire pour les licences).
 */
class TitleScene extends Scene {
  constructor(game) {
    super(game);
    this.showCredits = false;
    this.playBtn = { x: 186, y: 172, w: 108, h: 24 };
    this.creditsBtn = { x: 196, y: 204, w: 88, h: 20 };
    this.closeCreditsBtn = { x: 196, y: 214, w: 88, h: 20 };
  }

  init() {
    this.showCredits = false;
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const ground = assets.getImage('hub/hub_ground.png');
    const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';

    // Ciel parallaxe animé en haut + prairie du parc sous l'horizon (y >= 94)
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.draw(g, assets, skyMood, 480, 0, 0);
    } else {
      g.background(140, 185, 130);
    }

    if (ground) {
      g.image(ground, 0, 94, 480, 178, 0, 94, 480, 178);
    }
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawHorizonBlend(g, skyMood, 0, 480, 94);
    }

    // Guirlandes et grande roue en arrière-plan si déjà chargées
    const ferris = assets.getSprite('ferris_wheel');
    if (ferris) {
      g.image(ferris, 200, 52);
    }

    g.noStroke();
    g.fill(40, 28, 36, 95);
    g.rect(0, 0, 480, 272);

    // Pancarte en bois "MOO'S FUNFAIR"
    const sign = assets.getSprite('title_sign');
    if (sign) {
      g.image(sign, Math.round((480 - sign.width) / 2), 18);
    } else {
      PixelUI.panel(g, 130, 24, 220, 32);
      PixelUI.txt(g, font, "MOO'S FUNFAIR", 240, 32, g.color(107, 75, 91), CENTER);
    }

    // Portrait animé de Moo avec sa tenue sauvegardée
    const blinkCol = Math.floor(frameCount / 90) % 4 === 3 ? 1 : 0;
    const bob = Math.round(Math.sin(frameCount * 0.06) * 2);
    if (typeof CosmeticCatalog !== 'undefined') {
      CosmeticCatalog.drawMooWithOutfit(
        g,
        assets,
        this.game.save ? this.game.save.data.equippedOutfit : null,
        224,
        114 + bob,
        blinkCol,
        0,
        1
      );
    } else {
      const mooImg = assets.getSheetFrame('sprites/moo/better sprite.png', 32, 40, blinkCol, 0);
      if (mooImg) g.image(mooImg, 224, 114 + bob);
    }

    const { mx, my } = this.game.getMouseBufferPos();

    if (!this.showCredits) {
      PixelUI.drawTag(g, font, 'A cozy steering behaviors funfair', 240, 104, g.color(247, 235, 170));

      PixelUI.drawButton(
        g,
        font,
        this.playBtn,
        'PLAY (Space)',
        PixelUI.pointInRect(mx, my, this.playBtn),
        g.color(223, 240, 187),
        g.color(202, 232, 152)
      );

      PixelUI.drawButton(
        g,
        font,
        this.creditsBtn,
        'CREDITS',
        PixelUI.pointInRect(mx, my, this.creditsBtn)
      );

      PixelUI.txt(g, font, 'Click PLAY or press Space', 240, 242, g.color(247, 235, 170), CENTER);
    } else {
      // Fenêtre de crédits (Sprout Lands + Minifolks)
      PixelUI.panel(g, 74, 62, 332, 180, g.color(247, 235, 170));
      g.noStroke();
      g.fill(189, 117, 126);
      g.rect(74, 62, 332, 20);
      PixelUI.txt(g, font, 'CREDITS & LICENSES', 240, 65, g.color(243, 244, 231), CENTER);

      PixelUI.txt(g, font, 'Game & Steering AI: Mouna (Master IA2)', 240, 92, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, 'Tiles & UI: Sprout Lands by Cup Nooble', 240, 114, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, '(non-commercial use, credited)', 240, 128, g.color(144, 98, 93), CENTER);
      PixelUI.txt(g, font, 'Animals: Minifolks Animals Pack', 240, 150, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, 'Course: Craig Reynolds & M. Buffa (p5.js)', 240, 172, g.color(107, 75, 91), CENTER);
      PixelUI.txt(g, font, 'Built step by step in p5.js (480x272 x3)', 240, 192, g.color(144, 98, 93), CENTER);

      PixelUI.drawButton(
        g,
        font,
        this.closeCreditsBtn,
        'BACK (Esc)',
        PixelUI.pointInRect(mx, my, this.closeCreditsBtn)
      );
    }
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
      if (kc === ESCAPE || k === ' ') {
        this.game.sound.playSfx('ui_click');
        this.showCredits = false;
      }
      return;
    }

    if (k === ' ' || kc === ENTER) {
      this.game.sound.playSfx('ui_click');
      this.game.scenes.switchTo('hub');
    }
  }
}
