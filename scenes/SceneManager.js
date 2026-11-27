/**
 * Gestionnaire de scènes (SceneManager) avec transitions fluides (glissement + fondu doux).
 * Bascule proprement entre Title, Hub et les 4 mini-jeux en appelant cleanup() sur
 * l'ancienne scène et init(data) sur la nouvelle au sommet de la transition.
 */
class SceneManager {
  constructor() {
    this.scenes = {};
    this.current = null;
    this.currentName = null;

    // État de transition fluide entre scènes
    this.transPhase = 'IDLE'; // 'IDLE' | 'OUT' | 'IN'
    this.transT = 0;          // 0..1
    this.pendingSwitch = null;
  }

  register(name, sceneInstance) {
    this.scenes[name] = sceneInstance;
  }

  /**
   * Lance un changement de scène fluide (glissement + fondu pastel).
   * Lors du tout premier affichage (aucune scène courante), charge directement sans attendre.
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
      this.transPhase = 'IN';
      this.transT = 1;
      return;
    }

    this.pendingSwitch = { name, data };
    this.transPhase = 'OUT';
    this.transT = 0;
  }

  update() {
    const dt = Math.min(0.05, (typeof deltaTime === 'number' ? deltaTime : 16.6) / 1000);
    const speed = 4.2; // ~0.24s par demi-transition (vif et soyeux)

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
    return this.transPhase === 'OUT' ? -Math.round(ease * 22) : Math.round(ease * 22);
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

  /** Voile doux dessiné par-dessus le buffer complet (viewW x viewH) pendant les transitions. */
  drawTransitionOverlay(g, vw, vh) {
    if (this.transPhase === 'IDLE' || this.transT <= 0.01) return;
    const ease = this.transT * this.transT * (3 - 2 * this.transT);
    g.push();
    g.noStroke();
    g.fill(48, 34, 46, Math.round(ease * 245));
    g.rect(0, 0, vw, vh);
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
