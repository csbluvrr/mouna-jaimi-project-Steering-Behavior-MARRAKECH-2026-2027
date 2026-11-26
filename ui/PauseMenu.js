/**
 * Menu Pause / Jeu global déclenché par la touche Échap (Escape).
 * S'affiche par-dessus n'importe quelle scène (Hub ou mini-jeu) dans le style
 * bois pastel Sprout Lands, met le jeu en pause et permet de naviguer sans
 * quitter le mode plein écran.
 */
class PauseMenu {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.selectedIdx = 0;
  }

  toggle() {
    this.open = !this.open;
    this.selectedIdx = 0;
    if (this.game.sound) {
      this.game.sound.playSfx('ui_click', 0.85);
    }
  }

  close() {
    this.open = false;
  }

  /** Construit la liste des actions contextuelles selon la scène active. */
  getItems() {
    const sceneName = this.game.scenes ? this.game.scenes.currentName : 'hub';
    const isFS = Boolean(document.fullscreenElement);
    const muted = this.game.sound ? this.game.sound.muted : false;
    const items = [];

    items.push({
      id: 'resume',
      label: 'Resume Game',
      action: () => this.close()
    });

    if (sceneName === 'hub') {
      items.push({
        id: 'games',
        label: "Today's Games",
        action: () => {
          this.close();
          if (this.game.scenes.current) {
            this.game.scenes.current.overlay = true;
          }
        }
      });
    } else if (sceneName !== 'title') {
      items.push({
        id: 'hub',
        label: 'Back to Funfair Hub',
        action: () => {
          this.close();
          this.game.scenes.switchTo('hub', { fromBooth: sceneName });
        }
      });
    }

    items.push({
      id: 'fullscreen',
      label: isFS ? 'Exit Fullscreen (F)' : 'Fullscreen (F)',
      action: () => {
        if (typeof toggleFullscreen === 'function') toggleFullscreen();
      }
    });

    items.push({
      id: 'sound',
      label: muted ? 'Sound: OFF' : 'Sound: ON',
      action: () => {
        if (this.game.sound) this.game.sound.toggleMute();
      }
    });

    items.push({
      id: 'debug',
      label: Vehicle.debug ? 'Debug Mode [H]: ON' : 'Debug Mode [H]: OFF',
      action: () => {
        Vehicle.debug = !Vehicle.debug;
      }
    });

    if (sceneName !== 'title') {
      items.push({
        id: 'title',
        label: 'Title Screen',
        action: () => {
          this.close();
          this.game.scenes.switchTo('title');
        }
      });
    }

    return items;
  }

  getLayout() {
    const vw = this.game.viewW || BUFFER_W;
    const vh = this.game.viewH || BUFFER_H;
    const items = this.getItems();
    const panelW = 196;
    const btnH = 20;
    const gap = 5;
    const headerH = 26;
    const footerH = 18;
    const panelH = headerH + items.length * (btnH + gap) + footerH;
    const px = Math.round((vw - panelW) / 2);
    const py = Math.round((vh - panelH) / 2);

    const buttons = items.map((item, i) => ({
      ...item,
      x: px + 14,
      y: py + headerH + 4 + i * (btnH + gap),
      w: panelW - 28,
      h: btnH
    }));

    return { vw, vh, px, py, panelW, panelH, buttons };
  }

  draw(g) {
    if (!this.open) return;

    const font = this.game.assets ? this.game.assets.font : null;
    const { vw, vh, px, py, panelW, panelH, buttons } = this.getLayout();

    // Coordonnées brutes de la souris dans le buffer complet viewW x viewH
    const mx = (mouseX / Math.max(1, width)) * vw;
    const my = (mouseY / Math.max(1, height)) * vh;

    // Voile assombri derrière le menu
    g.push();
    g.noStroke();
    g.fill(28, 22, 34, 150);
    g.rect(0, 0, vw, vh);

    // Cadre bois pastel Sprout Lands
    PixelUI.panel(g, px, py, panelW, panelH);

    // Bandeau titre rose-bois
    g.noStroke();
    g.fill(189, 117, 126);
    g.rect(px + 2, py + 2, panelW - 4, 20);
    PixelUI.txt(g, font, 'MENU', px + Math.round(panelW / 2), py + 6, g.color(243, 244, 231), CENTER);

    // Boutons interactifs
    buttons.forEach((b, i) => {
      const hov = PixelUI.pointInRect(mx, my, b);
      if (hov) this.selectedIdx = i;
      const active = i === this.selectedIdx;
      const bg = active ? g.color(223, 240, 187) : g.color(232, 207, 166);
      const fg = active ? g.color(70, 101, 80) : g.color(107, 75, 91);

      PixelUI.panel(g, b.x, b.y, b.w, b.h, bg);
      const prefix = active ? '> ' : '';
      PixelUI.txt(g, font, prefix + b.label, b.x + Math.round(b.w / 2), b.y + 4, fg, CENTER);
    });

    // Indication discrète en pied de panneau
    PixelUI.txt(
      g,
      font,
      'Esc / M: Resume  |  F: Fullscreen',
      px + Math.round(panelW / 2),
      py + panelH - 14,
      g.color(144, 98, 93),
      CENTER
    );
    g.pop();
  }

  mousePressed(rawX, rawY) {
    if (!this.open) return false;
    const { px, py, panelW, panelH, buttons } = this.getLayout();

    const hit = buttons.find((b) => PixelUI.pointInRect(rawX, rawY, b));
    if (hit) {
      if (this.game.sound) this.game.sound.playSfx('ui_click', 0.9);
      hit.action();
      return true;
    }

    // Clic à l'extérieur du panneau -> referme le menu
    if (rawX < px || rawX > px + panelW || rawY < py || rawY > py + panelH) {
      this.close();
      return true;
    }
    return true;
  }

  keyPressed(k, kc) {
    if (!this.open) return false;
    const items = this.getItems();
    if (kc === UP_ARROW || k === 'w' || k === 'W' || k === 'z' || k === 'Z') {
      this.selectedIdx = (this.selectedIdx - 1 + items.length) % items.length;
      if (this.game.sound) this.game.sound.playSfx('ui_click', 0.5);
      return true;
    }
    if (kc === DOWN_ARROW || k === 's' || k === 'S') {
      this.selectedIdx = (this.selectedIdx + 1) % items.length;
      if (this.game.sound) this.game.sound.playSfx('ui_click', 0.5);
      return true;
    }
    if (kc === ENTER || kc === RETURN || k === ' ') {
      const item = items[this.selectedIdx];
      if (item) {
        if (this.game.sound) this.game.sound.playSfx('ui_click', 0.9);
        item.action();
      }
      return true;
    }
    return true;
  }
}
