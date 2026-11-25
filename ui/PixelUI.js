/**
 * Helpers de dessin pixel-art (palette Sprout Lands pastel & bois chaud).
 * Tous les tracés s'effectuent sur le buffer 480x272 sans lissage.
 */
class PixelUI {
  static txt(g, font, textStr, x, y, col, align = LEFT) {
    if (font) g.textFont(font);
    g.textSize(14);
    g.textAlign(align, TOP);
    g.noStroke();
    g.fill(col || g.color(107, 75, 91));
    g.text(textStr, Math.round(x), Math.round(y));
  }

  static panel(g, x, y, w, h, fillc) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    g.noStroke();
    g.fill(107, 75, 91);
    g.rect(rx - 2, ry - 2, rw + 4, rh + 4);
    g.fill(182, 137, 98);
    g.rect(rx - 1, ry - 1, rw + 2, rh + 2);
    g.fill(fillc || g.color(247, 235, 170));
    g.rect(rx, ry, rw, rh);
  }

  static drawTag(g, font, label, cx, cy, fillc) {
    if (font) g.textFont(font);
    g.textSize(14);
    const w = Math.round(g.textWidth(label) + 10);
    const x = constrain(Math.round(cx - w / 2), 4, 476 - w);
    const y = Math.round(cy - 14);
    PixelUI.panel(g, x, y, w, 16, fillc);
    PixelUI.txt(g, font, label, x + 5, y + 3, g.color(107, 75, 91));
  }

  static drawButton(g, font, rectObj, label, hovered, fillNormal, fillHover) {
    const yy = hovered ? rectObj.y - 1 : rectObj.y;
    const bg = hovered
      ? (fillHover || g.color(223, 240, 187))
      : (fillNormal || g.color(247, 235, 170));
    PixelUI.panel(g, rectObj.x, yy, rectObj.w, rectObj.h, bg);
    PixelUI.txt(
      g,
      font,
      label,
      rectObj.x + rectObj.w / 2,
      yy + Math.floor((rectObj.h - 10) / 2),
      g.color(107, 75, 91),
      CENTER
    );
  }

  static pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }
}
