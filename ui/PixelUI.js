/**
 * Helpers de dessin UI vifs et lisibles (palette Sprout Lands pastel & bois chaud).
 * - Police nette et lisible avec ombre douce subtile et ajustement automatique (zéro débordement !).
 * - Panneaux bois biseautés avec ombre portée, reflet intérieur et rivets d'angle.
 * - Cartes de règles claires et boutons tactiles.
 */
class PixelUI {
  /**
   * Dessine un texte parfaitement lisible, sans jamais déborder de maxW.
   * @param {p5.Graphics} g
   * @param {p5.Font|null} font (conservé pour compatibilité)
   * @param {string} textStr
   * @param {number} x
   * @param {number} y
   * @param {p5.Color} col
   * @param {string} align LEFT | CENTER | RIGHT
   * @param {number} size taille en px buffer (défaut 9.5)
   * @param {number|null} maxW largeur max autorisée (réduit la taille si besoin)
   */
  static txt(g, font, textStr, x, y, col, align = LEFT, size = 9.5, maxW = null) {
    const str = String(textStr == null ? '' : textStr);
    g.push();
    g.textFont('Verdana, Trebuchet MS, sans-serif');
    g.textStyle(BOLD);
    let sz = size;
    g.textSize(sz);

    // Auto-ajustement anti-débordement si maxW est précisé
    if (maxW && maxW > 12) {
      let tw = g.textWidth(str);
      while (tw > maxW && sz > 6.5) {
        sz -= 0.5;
        g.textSize(sz);
        tw = g.textWidth(str);
      }
    }

    g.textAlign(align, TOP);
    g.noStroke();
    const rx = Math.round(x);
    const ry = Math.round(y);

    // Ombre légère pour un contraste net sur fonds clairs et foncés
    const c = col || g.color(107, 75, 91);
    const lum = (red(c) + green(c) + blue(c)) / 3;
    if (lum > 185) {
      g.fill(78, 50, 66, 150);
      g.text(str, rx, ry + 1);
    } else {
      g.fill(255, 250, 232, 120);
      g.text(str, rx, ry + 1);
    }

    g.fill(c);
    g.text(str, rx, ry);
    g.pop();
  }

  /** Mesure proprement la largeur d'un texte avec la police UI courante. */
  static measureText(g, textStr, size = 9.5) {
    g.push();
    g.textFont('Verdana, Trebuchet MS, sans-serif');
    g.textStyle(BOLD);
    g.textSize(size);
    const w = g.textWidth(String(textStr || ''));
    g.pop();
    return w;
  }

  /**
   * Panneau bois pastel Sprout Lands animé / vivant :
   * ombre portée douce, double bordure bois, reflet lumineux haut et petits rivets d'angle.
   */
  static panel(g, x, y, w, h, fillc) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    g.push();
    g.noStroke();

    // Ombre portée douce
    g.fill(54, 34, 48, 70);
    g.rect(rx - 1, ry + 1, rw + 4, rh + 4, 3);

    // Contour extérieur prune-brun
    g.fill(107, 75, 91);
    g.rect(rx - 2, ry - 2, rw + 4, rh + 4, 3);

    // Cadre bois chaud
    g.fill(186, 139, 98);
    g.rect(rx - 1, ry - 1, rw + 2, rh + 2, 2);

    // Fond crème / couleur personnalisée
    g.fill(fillc || g.color(247, 236, 198));
    g.rect(rx, ry, rw, rh, 1);

    // Fin reflet clair sur le bord supérieur pour du relief
    if (rh >= 14) {
      g.fill(255, 252, 236, 125);
      g.rect(rx + 1, ry, Math.max(0, rw - 2), 2);
    }

    // Petits rivets bois aux 4 coins des grands panneaux
    if (rw >= 60 && rh >= 40) {
      g.fill(144, 98, 93, 140);
      g.rect(rx + 2, ry + 2, 2, 2);
      g.rect(rx + rw - 4, ry + 2, 2, 2);
      g.rect(rx + 2, ry + rh - 4, 2, 2);
      g.rect(rx + rw - 4, ry + rh - 4, 2, 2);
    }
    g.pop();
  }

  static drawTag(g, font, label, cx, cy, fillc) {
    const w = Math.round(PixelUI.measureText(g, label, 9) + 14);
    const maxScreenW = (g && g.width) ? g.width : 480;
    const x = constrain(Math.round(cx - w / 2), 4, Math.max(4, maxScreenW - 4 - w));
    const y = Math.round(cy - 15);
    PixelUI.panel(g, x, y, w, 16, fillc);
    PixelUI.txt(g, font, label, x + w / 2, y + 3, g.color(107, 75, 91), CENTER, 9, w - 6);
  }

  static drawButton(g, font, rectObj, label, hovered, fillNormal, fillHover) {
    const yy = hovered ? rectObj.y - 1 : rectObj.y;
    const bg = hovered
      ? (fillHover || g.color(223, 240, 187))
      : (fillNormal || g.color(247, 236, 198));
    PixelUI.panel(g, rectObj.x, yy, rectObj.w, rectObj.h, bg);
    // Petite bordure basse tactile
    g.push();
    g.noStroke();
    g.fill(107, 75, 91, 45);
    g.rect(rectObj.x + 1, yy + rectObj.h - 2, rectObj.w - 2, 2);
    g.pop();

    const textY = yy + Math.floor((rectObj.h - 10) / 2);
    PixelUI.txt(
      g,
      font,
      label,
      rectObj.x + rectObj.w / 2,
      textY,
      hovered ? g.color(62, 98, 72) : g.color(107, 75, 91),
      CENTER,
      9.5,
      rectObj.w - 10
    );
  }

  /**
   * Dessine une carte d'introduction & règles claire et bien cadrée (zéro débordement).
   * @param {Object} cfg { title, headerCol, rules: string[], controls: string, btnRect, btnLabel, mx, my }
   */
  static drawRulesCard(g, font, cfg) {
    const px = 54;
    const py = 32;
    const pw = 372;
    const ph = 204;

    g.push();
    g.noStroke();
    g.fill(26, 20, 32, 135);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, px, py, pw, ph, g.color(250, 242, 212));

    // Bandeau titre coloré
    g.fill(cfg.headerCol || g.color(189, 117, 126));
    g.rect(px + 2, py + 2, pw - 4, 22, 1);
    PixelUI.txt(g, font, cfg.title, px + pw / 2, py + 7, g.color(255, 252, 238), CENTER, 10.5, pw - 16);

    // Encadré "RULES"
    PixelUI.panel(g, px + 12, py + 32, pw - 24, 102, g.color(244, 230, 190));
    PixelUI.txt(g, font, 'HOW TO PLAY & RULES', px + 20, py + 37, g.color(168, 86, 98), LEFT, 8.5);

    const rules = cfg.rules || [];
    for (let i = 0; i < rules.length; i++) {
      PixelUI.txt(
        g,
        font,
        '- ' + rules[i],
        px + 20,
        py + 52 + i * 19,
        g.color(92, 62, 76),
        LEFT,
        8.5,
        pw - 42
      );
    }

    // Barre commandes
    if (cfg.controls) {
      PixelUI.panel(g, px + 12, py + 140, pw - 24, 20, g.color(223, 240, 187));
      PixelUI.txt(g, font, cfg.controls, px + pw / 2, py + 145, g.color(62, 98, 72), CENTER, 8.5, pw - 36);
    }

    // Bouton principal
    const br = cfg.btnRect || { x: 180, y: 204, w: 120, h: 24 };
    PixelUI.drawButton(
      g,
      font,
      br,
      cfg.btnLabel || 'PLAY! (Space)',
      PixelUI.pointInRect(cfg.mx, cfg.my, br),
      g.color(223, 240, 187),
      g.color(202, 234, 162)
    );
    g.pop();
  }

  static pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }
}
