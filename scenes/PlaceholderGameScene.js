/**
 * Scène temporaire (PLACEHOLDER) pour les mini-jeux pas encore construits
 * lors de l'Étape 1. Sera remplacée au fur et à mesure aux Étapes 2, 3, 4 et 5.
 * Permet déjà de tester le SceneManager et le retour devant le bon stand dans le Hub.
 */
class PlaceholderGameScene extends Scene {
  constructor(game, gameId, title, stepNote) {
    super(game);
    this.gameId = gameId;
    this.title = title;
    this.stepNote = stepNote;
    this.backBtn = { x: 165, y: 186, w: 150, h: 24 };
  }

  init() {
    this.game.sound.playMusic(this.gameId);
  }

  draw(g) {
    const font = this.game.assets.font;
    g.background(148, 178, 134);

    PixelUI.panel(g, 76, 48, 328, 176);
    g.noStroke();
    g.fill(189, 117, 126);
    g.rect(76, 48, 328, 22);
    PixelUI.txt(g, font, this.title.toUpperCase(), 240, 52, g.color(243, 244, 231), CENTER);

    const boothSp = this.game.assets.getSprite('booth_' + this.gameId);
    if (boothSp) {
      g.image(boothSp, 216, 78);
    }

    PixelUI.txt(g, font, '[PLACEHOLDER - ' + this.stepNote + ']', 240, 146, g.color(144, 98, 93), CENTER);
    PixelUI.txt(g, font, 'SceneManager routing works!', 240, 162, g.color(107, 75, 91), CENTER);

    const { mx, my } = this.game.getMouseBufferPos();
    PixelUI.drawButton(
      g,
      font,
      this.backBtn,
      'BACK TO FAIR (Esc)',
      PixelUI.pointInRect(mx, my, this.backBtn)
    );
  }

  goBack() {
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo('hub', { fromBooth: this.gameId });
  }

  mousePressed(mx, my) {
    if (PixelUI.pointInRect(mx, my, this.backBtn)) {
      this.goBack();
    }
  }

  keyPressed(k, kc) {
    if (kc === ESCAPE || k === ' ') {
      this.goBack();
    }
  }
}
