/**
 * Helpers de dessin UI vifs et lisibles (palette Sprout Lands pastel & bois chaud).
 * - Police nette et lisible avec ombre douce subtile et ajustement automatique (zéro débordement !).
 * - Panneaux bois biseautés avec ombre portée, reflet intérieur et rivets d'angle.
 * - Cartes de règles claires et boutons tactiles.
 */
class PixelUI {
  static _textQueue = [];

  /** Vide la file de rendu texte HD au début de chaque frame. */
  static beginFrame() {
    PixelUI._textQueue.length = 0;
  }

  /**
   * Enregistre un texte pour un rendu natif Haute Définition (zéro pixelisation !)
   * en capturant exactement la transformation courante du buffer pixel-art `g`.
   */
  static txt(g, font, textStr, x, y, col, align = LEFT, size = 9.5, maxW = null) {
    const str = String(textStr == null ? '' : textStr);
    let gx = x;
    let gy = y;
    if (g && g.drawingContext && typeof g.drawingContext.getTransform === 'function') {
      const m = g.drawingContext.getTransform();
      gx = m.a * x + m.c * y + m.e;
      gy = m.b * x + m.d * y + m.f;
    }

    const c = col || (g ? g.color(107, 75, 91) : null);
    const r = c ? red(c) : 107;
    const gr = c ? green(c) : 75;
    const b = c ? blue(c) : 91;
    const a = c ? alpha(c) : 255;

    PixelUI._textQueue.push({
      str,
      gx,
      gy,
      r,
      gr,
      b,
      a,
      align,
      size,
      maxW
    });
  }

  /**
   * Dessine tous les textes accumulés directement sur le canvas principal natif (HD, lisse, ultra-lisible)
   * après l'affichage du buffer pixel-art `g`.
   */
  static flushText(scaleX, scaleY) {
    const q = PixelUI._textQueue;
    if (q.length === 0) return;

    const ctx = drawingContext;
    if (!ctx) return;

    ctx.save();
    ctx.textBaseline = 'top';

    for (let i = 0; i < q.length; i++) {
      const it = q[i];
      let pxSize = Math.max(10, Math.round(it.size * scaleY * 1.05));
      ctx.font = '700 ' + pxSize + 'px "Trebuchet MS", "Segoe UI", Verdana, sans-serif';

      if (it.maxW && it.maxW > 10) {
        const limitPx = it.maxW * scaleX;
        let tw = ctx.measureText(it.str).width;
        while (tw > limitPx && pxSize > 9) {
          pxSize -= 1;
          ctx.font = '700 ' + pxSize + 'px "Trebuchet MS", "Segoe UI", Verdana, sans-serif';
          tw = ctx.measureText(it.str).width;
        }
      }

      if (it.align === CENTER) ctx.textAlign = 'center';
      else if (it.align === RIGHT) ctx.textAlign = 'right';
      else ctx.textAlign = 'left';

      const sx = Math.round(it.gx * scaleX);
      const sy = Math.round(it.gy * scaleY);
      const lum = (it.r + it.gr + it.b) / 3;
      const alphaNorm = it.a / 255;

      // Ombre douce anti-aliased pour un contraste net sur tous les fonds
      if (lum > 185) {
        ctx.fillStyle = 'rgba(62, 38, 52, ' + (0.65 * alphaNorm).toFixed(2) + ')';
        ctx.fillText(it.str, sx, sy + Math.max(1, Math.round(scaleY * 0.45)));
      } else {
        ctx.fillStyle = 'rgba(255, 250, 232, ' + (0.65 * alphaNorm).toFixed(2) + ')';
        ctx.fillText(it.str, sx, sy + Math.max(1, Math.round(scaleY * 0.35)));
      }

      ctx.fillStyle = 'rgba(' + Math.round(it.r) + ',' + Math.round(it.gr) + ',' + Math.round(it.b) + ',' + alphaNorm.toFixed(2) + ')';
      ctx.fillText(it.str, sx, sy);
    }

    ctx.restore();
    PixelUI._textQueue.length = 0;
  }

  /**
   * Valide la couche courante (pixel-art + textes HD accumulés) sur l'écran principal,
   * puis efface le buffer `g` afin qu'un menu ou overlay dessiné ensuite recouvre
   * proprement TOUS les textes HD situés dessous (tout en gardant 100% du texte en HD !).
   */
  static flushLayer(g) {
    if (!g || typeof image !== 'function') return;
    const vw = (typeof game !== 'undefined' && game.viewW) ? game.viewW : g.width;
    const vh = (typeof game !== 'undefined' && game.viewH) ? game.viewH : g.height;
    image(g, 0, 0, width, height);
    PixelUI.flushText(width / Math.max(1, vw), height / Math.max(1, vh));
    if (g.drawingContext) {
      g.drawingContext.save();
      g.drawingContext.setTransform(1, 0, 0, 1, 0, 0);
      g.drawingContext.clearRect(0, 0, g.width, g.height);
      g.drawingContext.restore();
    } else {
      g.clear();
    }
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
    // Tient compte de la translation caméra courante (g.translate(-camX, oy)) pour les ailes Ouest [-480..0] et Est [480..960] !
    let tx = 0;
    if (g && g.drawingContext && typeof g.drawingContext.getTransform === 'function') {
      tx = g.drawingContext.getTransform().e || 0;
    }
    const minX = Math.round(4 - tx);
    const maxX = Math.max(minX, Math.round(maxScreenW - 4 - w - tx));
    const x = constrain(Math.round(cx - w / 2), minX, maxX);
    const y = Math.round(cy - 15);
    PixelUI.panel(g, x, y, w, 16, fillc);

    // Petite pointe de bulle attachée au-dessus du personnage qui parle
    const tailX = constrain(Math.round(cx), x + 6, x + w - 6);
    g.push();
    g.noStroke();
    g.fill(107, 75, 91);
    g.triangle(tailX - 4, y + 16, tailX + 4, y + 16, tailX, y + 20);
    g.fill(fillc || g.color(247, 236, 198));
    g.triangle(tailX - 3, y + 15, tailX + 3, y + 15, tailX, y + 19);
    g.pop();

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
    PixelUI.flushLayer(g);
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
