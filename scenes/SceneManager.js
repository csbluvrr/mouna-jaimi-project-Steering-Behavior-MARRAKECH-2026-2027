/**
 * Gestionnaire de scènes (SceneManager) avec transitions thématiques fluides :
 * - Bunny Derby      : rideau à damier de course (checkered flag wipe)
 * - PokéMoo Feast!!  : iris circulaire inspiré d'une Poké Ball
 * - Catch the Purins!: nuée de bulles pastel crème & pudding
 * - The Legend of Moo: voile mystique et losange doré étincelant
 * - Hub / Title      : glissement doux + fondu pastel de fête foraine
 */
class SceneManager {
  constructor() {
    this.scenes = {};
    this.current = null;
    this.currentName = null;

    // État de transition fluide entre scènes
    this.transPhase = 'IDLE'; // 'IDLE' | 'OUT' | 'IN'
    this.transT = 0;          // 0..1
    this.transTheme = 'default';
    this.pendingSwitch = null;
  }

  register(name, sceneInstance) {
    this.scenes[name] = sceneInstance;
  }

  /** Choisit le thème visuel de transition selon la scène d'origine ou de destination. */
  resolveTheme(fromName, toName) {
    const themed = ['derby', 'snake', 'ducklings', 'fox'];
    if (themed.includes(toName)) return toName;
    if (themed.includes(fromName)) return fromName;
    return 'default';
  }

  /**
   * Lance un changement de scène fluide avec effet thématique.
   * Lors du tout premier affichage (aucune scène courante), charge directement.
   */
  switchTo(name, data = {}) {
    const next = this.scenes[name];
    if (!next) {
      console.warn('Scène introuvable :', name);
      return;
    }

    if (!this.current) {
      this.current = next;
      this.currentName = name;
      this.current.init(data);
      this.transTheme = 'default';
      this.transPhase = 'IN';
      this.transT = 1;
      return;
    }

    this.transTheme = this.resolveTheme(this.currentName, name);
    this.pendingSwitch = { name, data };
    this.transPhase = 'OUT';
    this.transT = 0;
  }

  update() {
    const dt = Math.min(0.05, (typeof deltaTime === 'number' ? deltaTime : 16.6) / 1000);
    const speed = 3.8; // ~0.26s par demi-transition (lisible et soyeux)

    if (this.transPhase === 'OUT') {
      this.transT = Math.min(1, this.transT + dt * speed);
      if (this.transT >= 1 && this.pendingSwitch) {
        const { name, data } = this.pendingSwitch;
        this.pendingSwitch = null;
        if (this.current) this.current.cleanup();
        this.current = this.scenes[name];
        this.currentName = name;
        this.current.init(data);
        this.transPhase = 'IN';
        this.transT = 1;
      }
      return;
    }

    if (this.transPhase === 'IN') {
      this.transT = Math.max(0, this.transT - dt * speed);
      if (this.transT <= 0) {
        this.transPhase = 'IDLE';
      }
    }

    if (this.current) this.current.update();
  }

  /** Décalage horizontal léger pour l'effet de glissement doux lors des transitions. */
  getSlideOffset() {
    if (this.transPhase === 'IDLE') return 0;
    const ease = this.transT * this.transT * (3 - 2 * this.transT);
    return this.transPhase === 'OUT' ? -Math.round(ease * 20) : Math.round(ease * 20);
  }

  draw(g) {
    if (!this.current) return;
    const slideX = this.getSlideOffset();
    if (slideX !== 0) {
      g.push();
      g.translate(slideX, 0);
      this.current.draw(g);
      g.pop();
    } else {
      this.current.draw(g);
    }
  }

  /** Dessine la transition thématique par-dessus le buffer complet (viewW x viewH). */
  drawTransitionOverlay(g, vw, vh) {
    if (this.transPhase === 'IDLE' || this.transT <= 0.01) return;
    const ease = this.transT * this.transT * (3 - 2 * this.transT);

    g.push();
    g.noStroke();

    if (this.transTheme === 'derby') {
      // Damier de course (Checkered racing flag wipe)
      const cell = 16;
      const wipeW = Math.ceil((vw + 48) * ease);
      const fromRight = this.transPhase === 'IN';
      for (let y = 0; y < vh; y += cell) {
        const rowOffset = ((y / cell) % 2) * 8;
        for (let x = 0; x < vw + cell; x += cell) {
          const dist = fromRight ? (vw - x) : x;
          if (dist < wipeW - rowOffset) {
            const dark = ((Math.floor(x / cell) + Math.floor(y / cell)) % 2) === 0;
            g.fill(dark ? g.color(68, 48, 62) : g.color(248, 240, 218));
            g.rect(x, y, cell, cell);
          }
        }
      }
      // Liseré doré de drapeau de course sur le bord du rideau
      const edgeX = fromRight ? vw - wipeW : wipeW;
      g.fill(244, 198, 92, 230);
      g.rect(edgeX - 2, 0, 4, vh);
    } else if (this.transTheme === 'snake') {
      // Transition circulaire Poké Ball (rouge en haut, crème en bas, bande centrale)
      const cx = vw / 2;
      const cy = vh / 2;
      const maxR = Math.hypot(cx, cy) + 18;
      const holeR = Math.max(0, maxR * (1 - ease));
      if (holeR <= 2) {
        g.fill(218, 72, 78);
        g.rect(0, 0, vw, cy);
        g.fill(248, 244, 232);
        g.rect(0, cy, vw, vh - cy);
        g.fill(56, 44, 54);
        g.rect(0, cy - 6, vw, 12);
        g.fill(56, 44, 54);
        g.circle(cx, cy, 34);
        g.fill(248, 244, 232);
        g.circle(cx, cy, 20);
      } else {
        // Anneau épais entourant le cercle qui se referme
        const ringW = (maxR - holeR) * 2;
        g.noFill();
        g.stroke(218, 72, 78, 238);
        g.strokeWeight(Math.max(2, ringW));
        g.arc(cx, cy, holeR * 2 + ringW, holeR * 2 + ringW, PI, TWO_PI);
        g.stroke(246, 240, 224, 238);
        g.arc(cx, cy, holeR * 2 + ringW, holeR * 2 + ringW, 0, PI);
        g.stroke(58, 44, 56, 245);
        g.strokeWeight(3);
        g.circle(cx, cy, holeR * 2);
      }
    } else if (this.transTheme === 'ducklings') {
      // Transition bulles pastel crème & caramel (Purin bubbles)
      const cols = Math.ceil(vw / 36) + 1;
      const rows = Math.ceil(vh / 36) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const delay = ((c * 0.04 + r * 0.05) % 0.25);
          const local = constrain((ease - delay * 0.5) / (1 - delay * 0.5), 0, 1);
          const rad = local * 38;
          if (rad <= 1) continue;
          const bx = c * 36 + (r % 2) * 18;
          const by = r * 36;
          g.fill(252, 230, 148, 245);
          g.circle(bx, by, rad * 2);
          g.fill(255, 248, 212, 180);
          g.circle(bx - rad * 0.28, by - rad * 0.28, rad * 0.5);
        }
      }
    } else if (this.transTheme === 'fox') {
      // Voile du temple + losange doré étincelant (Legend of Moo)
      g.fill(44, 34, 56, Math.round(ease * 245));
      g.rect(0, 0, vw, vh);
      const cx = vw / 2;
      const cy = vh / 2;
      const sz = Math.round(ease * 54);
      g.fill(244, 206, 102, Math.round(ease * 220));
      g.beginShape();
      g.vertex(cx, cy - sz);
      g.vertex(cx + sz * 0.72, cy);
      g.vertex(cx, cy + sz);
      g.vertex(cx - sz * 0.72, cy);
      g.endShape(CLOSE);
      g.fill(255, 248, 206, Math.round(ease * 240));
      g.circle(cx, cy, Math.max(2, sz * 0.35));
      // Petites étoiles dorées
      for (let i = 0; i < 8; i++) {
        const a = (TWO_PI * i) / 8 + ease * 1.4;
        const d = sz + 14 + (i % 2) * 10;
        g.rect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 2, 2);
      }
    } else {
      // Transition pastel douce (Hub / Title)
      g.fill(48, 34, 46, Math.round(ease * 242));
      g.rect(0, 0, vw, vh);
      if (ease > 0.35) {
        g.fill(247, 235, 170, Math.round((ease - 0.35) * 120));
        g.rect(0, Math.round(vh / 2 - 1), vw, 2);
      }
    }

    g.pop();
  }

  mousePressed(mx, my) {
    if (this.transPhase === 'OUT') return;
    if (this.current) this.current.mousePressed(mx, my);
  }

  keyPressed(k, kc) {
    if (this.transPhase === 'OUT') return;
    if (this.current) this.current.keyPressed(k, kc);
  }
}
