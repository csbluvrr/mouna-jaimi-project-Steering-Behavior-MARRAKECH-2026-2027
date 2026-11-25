/**
 * Scène principale du Hub : Moo's Funfair (sous-classe de Scene).
 * Reprend fidèlement la mise en page de hub/sketch.js et hub_layout.json,
 * mais remplace tous les mouvements placeholders par des sous-classes de Vehicle
 * gérées via BehaviorManager :
 * - Moo (arrive + avoid + boundaries)
 * - HubButterfly (wander + flee + boundaries)
 * - HubDuckling (wander + separation + boundaries)
 * - Obstacle (Vehicle statique avec maxSpeed = 0)
 */
class HubScene extends Scene {
  constructor(game) {
    super(game);
    this.moo = null;
    this.obstacles = [];
    this.butterflies = [];
    this.ducklings = [];
    this.promptTrigger = null;
    this.overlay = false;
    this.toast = '';
    this.toastUntil = 0;
  }

  init(data = {}) {
    const layout = this.game.assets.hubLayout;
    this.overlay = false;
    this.promptTrigger = null;

    // Ajustements propres de position/collision du décor (sans altérer le fichier source)
    this.posterOffsetX = -16; // Décale le panneau d'affiches à gauche pour ne plus chevaucher la mare
    this.solids = layout.solids.map(([sx, sy, sw, sh]) => {
      // Décaler la collision du panneau d'affiches avec lui
      if (sx === 304 && sy === 220 && sw === 58) {
        return [sx + this.posterOffsetX, sy, sw, sh];
      }
      // Élargir et recaler la collision du chat aux ballons pour empêcher de le traverser
      if (sx === 158 && sy === 196 && sw === 14) {
        return [157, 192, 20, 15];
      }
      return [sx, sy, sw, sh];
    });
    // Ajouter une boîte de collision solide sur le panier de pique-nique (36, 210, 16x16)
    this.solids.push([36, 214, 16, 12]);

    // Triggers ajustés (avec le panneau d'affiches décalé)
    this.triggers = layout.triggers.map((t) => {
      if (t.id === 'poster') {
        return {
          ...t,
          rect: [t.rect[0] + this.posterOffsetX, t.rect[1], t.rect[2], t.rect[3]],
          stand: [t.stand[0] + this.posterOffsetX, t.stand[1]]
        };
      }
      return t;
    });

    // Convertir les zones solides du hub en Obstacles circulaires (Vehicle fixes)
    this.obstacles = [];
    this.solids.forEach(([sx, sy, sw, sh]) => {
      const obsList = Obstacle.fromRect(sx, sy, sw, sh);
      for (const o of obsList) {
        this.obstacles.push(o);
      }
    });

    // Position de spawn : devant le stand qu'on vient de quitter, ou à l'entrée
    let spawnX = layout.spawn[0];
    let spawnY = layout.spawn[1];
    if (data && data.fromBooth) {
      const trig = this.triggers.find((t) => t.id === data.fromBooth);
      if (trig && trig.stand) {
        spawnX = trig.stand[0];
        spawnY = trig.stand[1];
      }
    }

    this.moo = new Moo(spawnX, spawnY, this.game.assets);

    // Canetons autour de la mare (Vehicle : wander + separation + boundaries)
    this.ducklings = layout.ducklings.map(
      ([x, y]) => new HubDuckling(x, y, this.game.assets)
    );

    // Papillons d'ambiance (Vehicle : wander + flee quand Moo approche + boundaries)
    this.butterflies = [];
    for (let i = 0; i < layout.butterflies; i++) {
      this.butterflies.push(
        new HubButterfly(random(40, 440), random(90, 235), this.game.assets)
      );
    }

    this.game.sound.playMusic('hub');

    if (data && data.toast) {
      this.showToast(data.toast, 2600);
    }
  }

  showToast(msg, durationMs = 2400) {
    this.toast = msg;
    this.toastUntil = millis() + durationMs;
  }

  update() {
    if (this.overlay) return;

    const layout = this.game.assets.hubLayout;

    // Mise à jour de Moo (déplacement normal de personnage principal)
    this.moo.step(this.solids, layout.walk_bounds);

    // Mise à jour de la faune d'ambiance (100% Steering Behaviors)
    for (const d of this.ducklings) {
      d.step(this.ducklings);
    }
    for (const b of this.butterflies) {
      b.step(this.moo);
    }

    // Détection de la zone de stand devant laquelle Moo se tient
    const prevTrigger = this.promptTrigger;
    this.promptTrigger =
      this.triggers.find(({ rect: [x, y, w, h] }) =>
        this.moo.pos.x > x &&
        this.moo.pos.x < x + w &&
        this.moo.pos.y > y &&
        this.moo.pos.y < y + h
      ) || null;

    // Bonus d'exploration (+2 tickets) lors de la toute première visite à pied d'un stand
    if (
      this.promptTrigger &&
      this.promptTrigger !== prevTrigger &&
      this.promptTrigger.id !== 'poster'
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

    // 1. Sol pré-rendu du parc + nappe de pique-nique toujours à plat au sol
    const ground = assets.getImage('hub/hub_ground.png');
    if (ground) g.image(ground, 0, 0);

    const blanketObj = layout.objects.find((o) => o.id === 'picnic_blanket');
    if (blanketObj) {
      const bSp = assets.getSprite(blanketObj.sprite);
      if (bSp) g.image(bSp, blanketObj.x, blanketObj.y);
    }

    // 2. Objets triés en Y (stands, arbres, panneau, chat, panier, Moo, amis lapins, canetons)
    const items = layout.objects
      .filter((o) => o.id !== 'picnic_blanket')
      .map((o) => {
        const ox = o.id === 'poster' ? o.x + this.posterOffsetX : o.x;
        let sortY = o.sortY;
        if (o.id === 'kid_balloon') sortY = 207;
        if (o.id === 'picnic_basket') sortY = 226;
        return {
          sortY,
          draw: () => {
            const sp = assets.getSprite(o.sprite);
            if (sp) g.image(sp, ox, o.y);
          }
        };
      });

    // Miniatures des 4 jeux collées sur le panneau d'affiches (décalé avec le panneau)
    const pb = layout.objects.find((o) => o.id === 'poster');
    if (pb) {
      const pbx = pb.x + this.posterOffsetX;
      items.push({
        sortY: pb.sortY + 0.1,
        draw: () => {
          layout.games.forEach((gm, i) => {
            const [sx, sy] = layout.poster.slots_in_sprite[i];
            const bSp = assets.getSprite('booth_' + gm.id);
            if (bSp) {
              g.image(bSp, pbx + sx + 4, pb.y + sy + 2, 14, 12, 18, 1, 14, 12);
            }
          });
        }
      });
    }

    // Moo (Vehicle)
    items.push({ sortY: this.moo.pos.y, draw: () => this.moo.show(g) });

    // Amis lapins du coin pique-nique
    layout.friends.forEach((f) => {
      items.push({
        sortY: f.y,
        draw: () => {
          const img = assets.getSheetFrame(f.sheet, 32, 32, f.frame[1], f.frame[0]);
          if (img) g.image(img, f.x - 16, f.y - 32);
        }
      });
    });

    // Canetons de la mare (Vehicle)
    this.ducklings.forEach((d) => {
      items.push({ sortY: d.pos.y, draw: () => d.show(g) });
    });

    // Ficelles des ballons dessinées juste derrière le chat (sortY = 206.5 < 207)
    items.push({
      sortY: 206.5,
      draw: () => {
        g.push();
        g.stroke(107, 75, 91, 190);
        g.strokeWeight(1);
        layout.balloons.forEach((b) => {
          const by = b.y + Math.sin(frameCount * 0.05 + b.phase) * 2;
          g.line(Math.round(b.x + 6), Math.round(by + 13), 167, 196);
        });
        g.pop();
      }
    });

    items.sort((a, b) => a.sortY - b.sortY).forEach((it) => it.draw());

    // 3. Éléments toujours au premier plan (guirlandes, lumières, ballons, papillons)
    layout.rows.bunting.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, b.y + ((b.x / 16) % 2 ? 1 : 0));
    });
    layout.rows.lights.forEach((l, i) => {
      const sp = assets.getSprite((Math.floor(frameCount / 30) + i) % 2 ? 'lights_on' : 'lights_dim');
      if (sp) g.image(sp, l.x, l.y);
    });
    layout.balloons.forEach((b) => {
      const sp = assets.getSprite(b.sprite);
      if (sp) g.image(sp, b.x, Math.round(b.y + Math.sin(frameCount * 0.05 + b.phase) * 2));
    });
    for (const bf of this.butterflies) {
      bf.show(g);
    }

    // 4. Affichage des obstacles en mode debug (touche D)
    if (Vehicle.debug) {
      for (const obs of this.obstacles) {
        obs.showDebug(g);
      }
      PixelUI.drawTag(g, font, 'DEBUG ON [D] - Vehicles & Avoid', 382, 22, g.color(223, 240, 187));
    }

    // 5. HUD en haut à gauche (tickets)
    this.drawHud(g);

    // 6. Bulle d'interaction au-dessus de Moo ou étiquette au survol d'un stand
    if (this.promptTrigger && !this.overlay) {
      const label =
        this.promptTrigger.id === 'poster'
          ? 'Pick a game! (P)'
          : 'Play ' + this.promptTrigger.title + '? (Space)';
      const bob = Math.sin(frameCount * 0.12) * 1.5;
      PixelUI.drawTag(g, font, label, this.moo.pos.x, this.moo.pos.y - 40 + bob);
    }

    const hov = this.hoveredTrigger();
    if (hov && !this.overlay && hov !== this.promptTrigger) {
      PixelUI.drawTag(g, font, hov.title, hov.rect[0] + hov.rect[2] / 2, hov.rect[1] - 6);
    }

    // 7. Panneau "TODAY'S GAMES" (Poster overlay)
    if (this.overlay) {
      this.drawPosterOverlay(g);
    }

    // 8. Message toast temporaire en bas de l'écran
    if (millis() < this.toastUntil && this.toast) {
      const w = Math.round(g.textWidth(this.toast) + 14);
      PixelUI.panel(g, 240 - Math.round(w / 2), 244, w, 18, g.color(223, 240, 187));
      PixelUI.txt(g, font, this.toast, 240 - Math.round(w / 2) + 7, 244, g.color(86, 101, 96));
    }
  }

  drawHud(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const tickets = this.game.save.data.tickets;
    PixelUI.panel(g, 6, 6, 56, 16);
    const ticketSp = assets.getSprite('ticket');
    if (ticketSp) g.image(ticketSp, 10, 8);
    PixelUI.txt(g, font, 'x ' + tickets, 28, 6, g.color(107, 75, 91));
  }

  cardRects() {
    const layout = this.game.assets.hubLayout;
    const x0 = 80;
    const y0 = 66;
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

    g.noStroke();
    g.fill(0, 0, 0, 110);
    g.rect(0, 0, 480, 272);

    PixelUI.panel(g, 70, 34, 340, 176);
    g.fill(189, 117, 126);
    g.rect(70, 34, 340, 22);
    PixelUI.txt(g, font, "TODAY'S GAMES", 240, 38, g.color(243, 244, 231), CENTER);

    this.cardRects().forEach((c, i) => {
      const hov = PixelUI.pointInRect(mx, my, c);
      const yy = Math.round(c.y + (hov ? -2 + Math.sin(frameCount * 0.3) : 0));
      PixelUI.panel(g, c.x, yy, c.w, c.h, g.color(232, 207, 166));
      PixelUI.txt(g, font, c.gm.title, c.x + 8, yy + 4, g.color(107, 75, 91));

      const bSp = assets.getSprite('booth_' + c.gm.id);
      if (bSp) {
        g.image(bSp, c.x + 8, yy + 26, 28, 24, 18, 1, 14, 12);
      }

      const stars = this.game.save.data.stars[c.gm.id] || 0;
      const starStr = '*'.repeat(stars) + '-'.repeat(3 - stars);
      PixelUI.txt(g, font, 'press ' + (i + 1) + '  [' + starStr + ']', c.x + 44, yy + 30, g.color(144, 98, 93));
    });

    PixelUI.txt(g, font, 'Esc to close', 240, 190, g.color(144, 98, 93), CENTER);
  }

  hoveredTrigger() {
    const assets = this.game.assets;
    const layout = assets.hubLayout;
    const { mx, my } = this.game.getMouseBufferPos();

    return (
      layout.triggers.find((t) => {
        if (t.id === 'poster') return false;
        const o = layout.objects.find((obj) => obj.id === 'booth_' + t.id);
        if (!o) return false;
        const sp = assets.getSprite(o.sprite);
        if (!sp) return false;
        return mx > o.x && mx < o.x + sp.width && my > o.y && my < o.y + sp.height;
      }) || null
    );
  }

  enterGame(gameId) {
    this.overlay = false;
    this.moo.stop();
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo(gameId, { fromBooth: gameId });
  }

  mousePressed(mx, my) {
    const layout = this.game.assets.hubLayout;

    if (this.overlay) {
      const card = this.cardRects().find((c) => PixelUI.pointInRect(mx, my, c));
      if (card) {
        this.enterGame(card.gm.id);
      } else if (mx < 70 || mx > 410 || my < 34 || my > 210) {
        this.overlay = false;
      }
      return;
    }

    // Clic sur le panneau d'affiches -> ouvre directement "Today's Games"
    const posterObj = layout.objects.find((o) => o.id === 'poster');
    if (posterObj) {
      const sp = this.game.assets.getSprite(posterObj.sprite);
      const pbx = posterObj.x + this.posterOffsetX;
      if (sp && mx >= pbx && mx <= pbx + sp.width && my >= posterObj.y && my <= posterObj.y + sp.height) {
        this.game.sound.playSfx('ui_click');
        this.overlay = true;
        return;
      }
    }

    // Clic sur un stand -> Moo s'y rend
    const t = this.triggers.find(
      ({ rect: [x, y, w, h] }) => mx > x - 10 && mx < x + w + 10 && my > y - 70 && my < y + h + 4
    );
    if (t) {
      this.moo.setTarget(t.stand[0], t.stand[1]);
      return;
    }

    // Clic libre dans le parc -> Moo marche jusqu'au point cliqué
    this.moo.setTarget(mx, my);
  }

  keyPressed(k, kc) {
    const layout = this.game.assets.hubLayout;

    if (k === 'p' || k === 'P') {
      this.game.sound.playSfx('ui_click');
      this.overlay = !this.overlay;
      return;
    }

    if (kc === ESCAPE) {
      if (this.overlay) {
        this.overlay = false;
      } else {
        this.game.scenes.switchTo('title');
      }
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
      } else {
        this.enterGame(this.promptTrigger.id);
      }
    }
  }
}
