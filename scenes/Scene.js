/**
 * Classe de base abstraite pour toutes les scènes du jeu
 * (Title, Hub, Derby, Snake, Ducklings, Fox).
 */
class Scene {
  constructor(game) {
    this.game = game;
  }

  /** Appelé à chaque entrée dans la scène (reçoit éventuellement des données). */
  init(data = {}) {}

  /** Mise à jour logique (60 FPS). */
  update() {}

  /** Dessin dans le buffer pixel-art 480x272. */
  draw(g) {}

  /** Nettoyage avant de quitter la scène. */
  cleanup() {}

  mousePressed(mx, my) {}
  keyPressed(k, kc) {}
}
