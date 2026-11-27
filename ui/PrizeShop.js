/**
 * Interface de la Boutique des Prix & Garde-Robe de Moo (Prize Booth).
 * Permet d'acheter les 18 cosmétiques + 7 couleurs de hoodie avec les tickets,
 * d'essayer au survol en direct sur Moo en 4 directions (Face, Gauche, Droite, Dos),
 * d'équiper/retirer un objet par emplacement, et de sauvegarder la tenue dans localStorage.
 */
class PrizeShop {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.mode = 'SHOP';      // 'SHOP' | 'EQUIP'
    this.slotIdx = 0;        // 0..4 (head, face, neck, back, hoodie)
    this.page = 0;           // Pagination (6 objets par page)
    this.previewDir = 0;     // 0=Face, 1=Gauche, 2=Droite, 3=Dos
    this.previewWalk = false;
    this.feedback = '';
    this.feedbackUntil = 0;
  }

  show() {
    this.open = true;
    this.page = 0;
    this.previewDir = 0;
    this.feedback = '';
    if (this.game.sound) this.game.sound.playSfx('ui_click', 0.9);
  }

  close() {
    this.open = false;
    if (this.game.sound) this.game.sound.playSfx('ui_click', 0.7);
  }

  setFeedback(msg) {
    this.feedback = msg;
    this.feedbackUntil = millis() + 1800;
  }

  getLayout() {
    const vw = this.game.viewW || BUFFER_W;
    const vh = this.game.viewH || BUFFER_H;
    const pw = 424;
    const ph = 244;
    const px = Math.round((vw - pw) / 2);
    const py = Math.round((vh - ph) / 2);

    const modeTabs = [
      { id: 'SHOP',  label: 'PRIZE SHOP', x: px + 8,   y: py + 6, w: 96, h: 18 },
      { id: 'EQUIP', label: 'WARDROBE',   x: px + 108, y: py + 6, w: 88, h: 18 }
    ];
    const closeBtn = { x: px + pw - 24, y: py + 6, w: 18, h: 18 };

    // Panneau aperçu Moo à gauche
    const previewBox = { x: px + 10, y: py + 32, w: 126, h: 176 };
    const rotLeftBtn  = { x: px + 14, y: py + 150, w: 24, h: 18 };
    const walkBtn     = { x: px + 42, y: py + 150, w: 62, h: 18 };
    const rotRightBtn = { x: px + 108, y: py + 150, w: 24, h: 18 };
    const clearBtn    = { x: px + 14, y: py + 174, w: 118, h: 18 };

    // Onglets de catégories en haut à droite
    const slotTabs = CosmeticCatalog.SLOTS.map((s, i) => ({
      ...s,
      idx: i,
      x: px + 144 + i * 54,
      y: py + 32,
      w: 52,
      h: 18
    }));

    // Grille 2 colonnes x 3 lignes d'objets
    const cards = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        cards.push({
          x: px + 144 + c * 136,
          y: py + 56 + r * 48,
          w: 132,
          h: 44
        });
      }
    }

    const prevPageBtn = { x: px + 144, y: py + 204, w: 56, h: 18 };
    const nextPageBtn = { x: px + 356, y: py + 204, w: 56, h: 18 };

    return {
      vw, vh, px, py, pw, ph,
      modeTabs, closeBtn,
      previewBox, rotLeftBtn, walkBtn, rotRightBtn, clearBtn,
      slotTabs, cards, prevPageBtn, nextPageBtn
    };
  }

  getVisibleItems() {
    const slot = CosmeticCatalog.SLOTS[this.slotIdx].id;
    const all = CosmeticCatalog.getBySlot(slot);
    if (this.mode === 'EQUIP') {
      return all.filter((it) => this.game.save.isCosmeticOwned(it.slot, it.id));
    }
    return all;
  }

  draw(g) {
    if (!this.open) return;

    const assets = this.game.assets;
    const font = assets.font;
    const save = this.game.save;
    const L = this.getLayout();
    const mx = (mouseX / Math.max(1, width)) * L.vw;
    const my = (mouseY / Math.max(1, height)) * L.vh;

    g.push();
    // Fond assombri
    g.noStroke();
    g.fill(26, 20, 32, 150);
    g.rect(0, 0, L.vw, L.vh);

    // Cadre principal Sprout Lands
    PixelUI.panel(g, L.px, L.py, L.pw, L.ph, g.color(247, 236, 198));

    // Bandeau haut rose-bois
    g.noStroke();
    g.fill(189, 117, 126);
    g.rect(L.px + 2, L.py + 2, L.pw - 4, 24);

    // Onglets SHOP / WARDROBE
    for (const mt of L.modeTabs) {
      const act = this.mode === mt.id;
      const hov = PixelUI.pointInRect(mx, my, mt);
      PixelUI.panel(
        g, mt.x, mt.y, mt.w, mt.h,
        act ? g.color(223, 240, 187) : (hov ? g.color(247, 235, 170) : g.color(232, 207, 166))
      );
      PixelUI.txt(
        g, font, mt.label,
        mt.x + Math.round(mt.w / 2), mt.y + 3,
        act ? g.color(70, 101, 80) : g.color(107, 75, 91),
        CENTER
      );
    }

    // Compteur de tickets dans le bandeau
    const ticketSp = assets.getSprite('ticket');
    const tx = L.px + L.pw - 106;
    PixelUI.panel(g, tx, L.py + 6, 76, 18, g.color(247, 235, 170));
    if (ticketSp) g.image(ticketSp, tx + 5, L.py + 8);
    PixelUI.txt(g, font, 'x ' + (save.data.tickets || 0), tx + 24, L.py + 9, g.color(107, 75, 91));

    // Bouton fermer X
    const closeHov = PixelUI.pointInRect(mx, my, L.closeBtn);
    PixelUI.panel(g, L.closeBtn.x, L.closeBtn.y, L.closeBtn.w, L.closeBtn.h, closeHov ? g.color(245, 198, 198) : g.color(232, 207, 166));
    PixelUI.txt(g, font, 'X', L.closeBtn.x + 9, L.closeBtn.y + 3, g.color(107, 75, 91), CENTER);

    // Onglets de catégories (Head / Face / Neck / Back / Hoodies)
    for (const st of L.slotTabs) {
      const act = this.slotIdx === st.idx;
      const hov = PixelUI.pointInRect(mx, my, st);
      PixelUI.panel(
        g, st.x, st.y, st.w, st.h,
        act ? g.color(223, 240, 187) : (hov ? g.color(247, 235, 170) : g.color(232, 207, 166))
      );
      PixelUI.txt(
        g, font, st.label,
        st.x + Math.round(st.w / 2), st.y + 3,
        act ? g.color(70, 101, 80) : g.color(107, 75, 91),
        CENTER
      );
    }

    // Items de la page courante + détection du survol pour l'essayage en direct !
    const items = this.getVisibleItems();
    const totalPages = Math.max(1, Math.ceil(items.length / 6));
    if (this.page >= totalPages) this.page = totalPages - 1;
    const pageItems = items.slice(this.page * 6, this.page * 6 + 6);

    let hoveredItem = null;
    for (let i = 0; i < pageItems.length; i++) {
      if (PixelUI.pointInRect(mx, my, L.cards[i])) {
        hoveredItem = pageItems[i];
        break;
      }
    }

    // === PANNEAU APERÇU MOO À GAUCHE (cabine boutique pastel + essayage en direct 2x en 4 directions) ===
    PixelUI.panel(g, L.previewBox.x, L.previewBox.y, L.previewBox.w, L.previewBox.h, g.color(228, 244, 198));
    // Petits rideaux roses de cabine boutique + guirlande dorée dans l'encadré d'aperçu
    g.noStroke();
    g.fill(236, 152, 178, 170);
    g.rect(L.previewBox.x + 2, L.previewBox.y + 2, 10, 44, 0, 0, 4, 0);
    g.rect(L.previewBox.x + L.previewBox.w - 12, L.previewBox.y + 2, 10, 44, 0, 0, 0, 4);
    // Petites étoiles scintillantes de boutique autour de Moo
    const sparkA = Math.round(130 + Math.sin(frameCount * 0.1) * 80);
    g.fill(255, 232, 128, sparkA);
    g.rect(L.previewBox.x + 18, L.previewBox.y + 26, 2, 2);
    g.rect(L.previewBox.x + L.previewBox.w - 22, L.previewBox.y + 34, 2, 2);

    const dirNames = ['Front', 'Left', 'Right', 'Back'];
    PixelUI.txt(
      g, font,
      hoveredItem ? 'Try: ' + hoveredItem.name : 'Moo (' + dirNames[this.previewDir] + ')',
      L.previewBox.x + Math.round(L.previewBox.w / 2),
      L.previewBox.y + 6,
      g.color(70, 101, 80),
      CENTER,
      8,
      L.previewBox.w - 12
    );

    // Podium herbe & tapis boutique sous Moo
    g.noStroke();
    g.fill(189, 117, 126, 90);
    g.ellipse(L.previewBox.x + 63, L.previewBox.y + 107, 64, 18);
    g.fill(168, 206, 124);
    g.ellipse(L.previewBox.x + 63, L.previewBox.y + 106, 56, 15);

    // Tenue prévisualisée (tenue actuelle + objet survolé temporairement)
    const previewOutfit = { ...save.data.equippedOutfit };
    if (hoveredItem) {
      previewOutfit[hoveredItem.slot] = hoveredItem.id;
    }

    const walkCycle = (this.previewDir === 1 || this.previewDir === 2) ? [1, 2, 3, 0] : [2, 0, 3, 0];
    const animCol = this.previewWalk
      ? walkCycle[Math.floor(frameCount / 8) % 4]
      : (this.previewDir === 0 && Math.floor(frameCount / 75) % 4 === 3 ? 1 : 0);

    CosmeticCatalog.drawMooWithOutfit(
      g, assets, previewOutfit,
      L.previewBox.x + 31, L.previewBox.y + 26,
      animCol, this.previewDir, 2
    );

    // Boutons rotation < | Walk/Idle | > et Clear Outfit
    this.drawMiniBtn(g, font, L.rotLeftBtn, '<', PixelUI.pointInRect(mx, my, L.rotLeftBtn));
    this.drawMiniBtn(g, font, L.walkBtn, this.previewWalk ? 'Walk: ON' : 'Idle', PixelUI.pointInRect(mx, my, L.walkBtn), this.previewWalk);
    this.drawMiniBtn(g, font, L.rotRightBtn, '>', PixelUI.pointInRect(mx, my, L.rotRightBtn));
    this.drawMiniBtn(g, font, L.clearBtn, 'Reset Outfit', PixelUI.pointInRect(mx, my, L.clearBtn));

    // Résumé des emplacements portés en bas à gauche
    const eqCount = ['head', 'face', 'neck', 'back'].filter((s) => Boolean(save.data.equippedOutfit[s])).length;
    PixelUI.txt(
      g, font,
      'Wearing: ' + eqCount + '/4 + Hoodie',
      L.previewBox.x + Math.round(L.previewBox.w / 2),
      L.py + 214,
      g.color(107, 75, 91),
      CENTER
    );

    // === GRILLE DES OBJETS À DROITE ===
    if (pageItems.length === 0) {
      PixelUI.txt(
        g, font,
        'No items owned in this slot yet!',
        L.px + 278, L.py + 116,
        g.color(144, 98, 93),
        CENTER
      );
      PixelUI.txt(
        g, font,
        'Switch to PRIZE SHOP to buy!',
        L.px + 278, L.py + 134,
        g.color(107, 75, 91),
        CENTER
      );
    }

    for (let i = 0; i < pageItems.length; i++) {
      const it = pageItems[i];
      const card = L.cards[i];
      const owned = save.isCosmeticOwned(it.slot, it.id);
      const equipped = save.data.equippedOutfit[it.slot] === it.id;
      const hov = PixelUI.pointInRect(mx, my, card);

      const bg = equipped
        ? g.color(223, 240, 187)
        : (hov ? g.color(255, 246, 206) : g.color(238, 220, 182));
      PixelUI.panel(g, card.x, card.y, card.w, card.h, bg);

      // Vignette aperçu à gauche de la carte (32x34)
      g.push();
      g.fill(247, 238, 210);
      g.stroke(107, 75, 91);
      g.strokeWeight(1);
      g.rect(card.x + 4, card.y + 5, 30, 34);
      g.pop();

      if (it.slot === 'hoodie' && it.swatch) {
        // Pastille couleur + miniature hoodie
        g.noStroke();
        g.fill(it.swatch[0], it.swatch[1], it.swatch[2]);
        g.rect(card.x + 8, card.y + 10, 22, 24, 3);
        g.noFill();
        g.stroke(107, 75, 91);
        g.rect(card.x + 8, card.y + 10, 22, 24, 3);
      } else {
        // Aperçu direct du cosmétique sur le frame 0 de Moo
        const iconOutfit = { hoodie: 'default', head: null, face: null, neck: null, back: null };
        iconOutfit[it.slot] = it.id;
        const iconRow = it.slot === 'back' ? 3 : 0;
        CosmeticCatalog.drawMooWithOutfit(g, assets, iconOutfit, card.x + 3, card.y + 2, 0, iconRow, 1);
      }

      // Nom + Statut / Prix
      PixelUI.txt(g, font, it.name, card.x + 38, card.y + 6, g.color(107, 75, 91));

      if (equipped) {
        PixelUI.txt(g, font, 'EQUIPPED', card.x + 38, card.y + 24, g.color(70, 130, 78));
      } else if (owned) {
        PixelUI.txt(g, font, 'Click to equip', card.x + 38, card.y + 24, g.color(144, 98, 93));
      } else {
        const canAfford = (save.data.tickets || 0) >= it.price;
        PixelUI.txt(
          g, font,
          it.price + ' tickets',
          card.x + 38, card.y + 24,
          canAfford ? g.color(189, 117, 126) : g.color(180, 90, 90)
        );
      }
    }

    // Pagination + message de retour
    if (totalPages > 1) {
      this.drawMiniBtn(g, font, L.prevPageBtn, '< Prev', PixelUI.pointInRect(mx, my, L.prevPageBtn));
      PixelUI.txt(g, font, (this.page + 1) + ' / ' + totalPages, L.px + 278, L.py + 207, g.color(107, 75, 91), CENTER);
      this.drawMiniBtn(g, font, L.nextPageBtn, 'Next >', PixelUI.pointInRect(mx, my, L.nextPageBtn));
    }

    if (millis() < this.feedbackUntil && this.feedback) {
      const fw = Math.round(g.textWidth(this.feedback) + 16);
      const fx = Math.round(L.px + L.pw / 2 - fw / 2);
      PixelUI.panel(g, fx, L.py + L.ph - 12, fw, 18, g.color(223, 240, 187));
      PixelUI.txt(g, font, this.feedback, fx + 8, L.py + L.ph - 10, g.color(70, 101, 80));
    }

    g.pop();
  }

  drawMiniBtn(g, font, rect, label, hov, active = false) {
    PixelUI.panel(
      g, rect.x, rect.y, rect.w, rect.h,
      active ? g.color(223, 240, 187) : (hov ? g.color(255, 246, 206) : g.color(232, 207, 166))
    );
    PixelUI.txt(
      g, font, label,
      rect.x + Math.round(rect.w / 2), rect.y + 3,
      active ? g.color(70, 101, 80) : g.color(107, 75, 91),
      CENTER
    );
  }

  mousePressed(rawX, rawY) {
    if (!this.open) return false;
    const L = this.getLayout();
    const save = this.game.save;

    // Fermer (X ou clic extérieur)
    if (
      PixelUI.pointInRect(rawX, rawY, L.closeBtn) ||
      rawX < L.px || rawX > L.px + L.pw || rawY < L.py || rawY > L.py + L.ph
    ) {
      this.close();
      return true;
    }

    // Changer d'onglet SHOP / WARDROBE
    for (const mt of L.modeTabs) {
      if (PixelUI.pointInRect(rawX, rawY, mt)) {
        this.mode = mt.id;
        this.page = 0;
        this.game.sound.playSfx('ui_click', 0.8);
        return true;
      }
    }

    // Changer de catégorie
    for (const st of L.slotTabs) {
      if (PixelUI.pointInRect(rawX, rawY, st)) {
        this.slotIdx = st.idx;
        this.page = 0;
        this.game.sound.playSfx('ui_click', 0.7);
        return true;
      }
    }

    // Contrôles d'aperçu 4 directions + marche + reset
    if (PixelUI.pointInRect(rawX, rawY, L.rotLeftBtn)) {
      const order = [0, 1, 3, 2]; // Face -> Gauche -> Dos -> Droite
      const pos = order.indexOf(this.previewDir);
      this.previewDir = order[(pos + 1) % 4];
      this.game.sound.playSfx('ui_click', 0.5);
      return true;
    }
    if (PixelUI.pointInRect(rawX, rawY, L.rotRightBtn)) {
      const order = [0, 2, 3, 1]; // Face -> Droite -> Dos -> Gauche
      const pos = order.indexOf(this.previewDir);
      this.previewDir = order[(pos + 1) % 4];
      this.game.sound.playSfx('ui_click', 0.5);
      return true;
    }
    if (PixelUI.pointInRect(rawX, rawY, L.walkBtn)) {
      this.previewWalk = !this.previewWalk;
      this.game.sound.playSfx('ui_click', 0.6);
      return true;
    }
    if (PixelUI.pointInRect(rawX, rawY, L.clearBtn)) {
      save.data.equippedOutfit = { hoodie: 'default', head: null, face: null, neck: null, back: null };
      save.save();
      this.setFeedback('Outfit reset to default!');
      this.game.sound.playSfx('ui_click', 0.7);
      return true;
    }

    // Pagination
    const items = this.getVisibleItems();
    const totalPages = Math.max(1, Math.ceil(items.length / 6));
    if (totalPages > 1) {
      if (PixelUI.pointInRect(rawX, rawY, L.prevPageBtn)) {
        this.page = (this.page - 1 + totalPages) % totalPages;
        this.game.sound.playSfx('ui_click', 0.6);
        return true;
      }
      if (PixelUI.pointInRect(rawX, rawY, L.nextPageBtn)) {
        this.page = (this.page + 1) % totalPages;
        this.game.sound.playSfx('ui_click', 0.6);
        return true;
      }
    }

    // Clic sur une carte d'objet (acheter ou équiper/retirer)
    const pageItems = items.slice(this.page * 6, this.page * 6 + 6);
    for (let i = 0; i < pageItems.length; i++) {
      if (PixelUI.pointInRect(rawX, rawY, L.cards[i])) {
        const it = pageItems[i];
        if (save.isCosmeticOwned(it.slot, it.id)) {
          const wasEquipped = save.data.equippedOutfit[it.slot] === it.id;
          save.toggleEquipCosmetic(it.slot, it.id);
          this.setFeedback(wasEquipped ? 'Unequipped ' + it.name : 'Equipped ' + it.name + '!');
          this.game.sound.playSfx('ui_click', 0.85);
        } else {
          if (save.buyCosmetic(it.slot, it.id, it.price)) {
            this.setFeedback('Bought & equipped ' + it.name + '!');
            this.game.sound.playSfx('success_bell', 0.85);
          } else {
            this.setFeedback('Need ' + (it.price - (save.data.tickets || 0)) + ' more tickets!');
            this.game.sound.playSfx('ui_click', 0.4);
          }
        }
        return true;
      }
    }

    return true;
  }

  keyPressed(k, kc) {
    if (!this.open) return false;
    if (kc === LEFT_ARROW || k === 'a' || k === 'A' || k === 'q' || k === 'Q') {
      const order = [0, 1, 3, 2];
      this.previewDir = order[(order.indexOf(this.previewDir) + 1) % 4];
      return true;
    }
    if (kc === RIGHT_ARROW || k === 'd' || k === 'D') {
      const order = [0, 2, 3, 1];
      this.previewDir = order[(order.indexOf(this.previewDir) + 1) % 4];
      return true;
    }
    return true;
  }
}
