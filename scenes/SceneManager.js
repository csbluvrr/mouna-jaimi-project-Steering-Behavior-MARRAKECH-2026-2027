/**
 * Gestionnaire de scènes (SceneManager).
 * Permet de basculer proprement entre Title, Hub et les 4 mini-jeux
 * en appelant cleanup() sur l'ancienne scène et init(data) sur la nouvelle.
 */
class SceneManager {
  constructor() {
    this.scenes = {};
    this.current = null;
    this.currentName = null;
  }

  register(name, sceneInstance) {
    this.scenes[name] = sceneInstance;
  }

  switchTo(name, data = {}) {
    const next = this.scenes[name];
    if (!next) {
      console.warn('Scène introuvable :', name);
      return;
    }
    if (this.current) {
      this.current.cleanup();
    }
    this.current = next;
    this.currentName = name;
    this.current.init(data);
  }

  update() {
    if (this.current) this.current.update();
  }

  draw(g) {
    if (this.current) this.current.draw(g);
  }

  mousePressed(mx, my) {
    if (this.current) this.current.mousePressed(mx, my);
  }

  keyPressed(k, kc) {
    if (this.current) this.current.keyPressed(k, kc);
  }
}
