/**
 * Point d'entrée principal de Moo's Funfair.
 * Le buffer interne garde des pixels carrés 1:1 (hauteur 272px, largeur adaptée au ratio
 * de la fenêtre sans jamais étirer l'image) :
 * - En mode fenêtré large : révèle du décor sur les côtés au lieu de bandes noires.
 * - En plein écran (16:9) : revient exactement au cadrage classique 480x272 (et la caméra
 *   du Hub suit Moo si le joueur marche vers les prairies latérales).
 */
const BUFFER_W = 480;
const BUFFER_H = 272;

let g; // Buffer pixel-art interne (viewW x viewH)
let displayScale = 3;

// Objet central partagé par toutes les scènes
const game = {
  assets: null,
  save: null,
  sound: null,
  scenes: null,
  pauseMenu: null,
  viewW: BUFFER_W,
  viewH: BUFFER_H,
  offsetX: 0,
  offsetY: 0,

  /**
   * Convertit la position de la souris vers les coordonnées du buffer.
   * - Pour les scènes à caméra large (Hub) : coordonnées écran dans [0..viewW, 0..viewH].
   * - Pour les scènes centrées 480x272 : coordonnées locales dans [0..480, 0..272].
   */
  getMouseBufferPos() {
    const rawX = (mouseX / Math.max(1, width)) * this.viewW;
    const rawY = (mouseY / Math.max(1, height)) * this.viewH;
    const cur = this.scenes ? this.scenes.current : null;
    if (cur && cur.usesWideCamera) {
      return { mx: rawX, my: rawY };
    }
    return {
      mx: rawX - this.offsetX,
      my: rawY - this.offsetY
    };
  }
};

/**
 * Calcule la taille du canvas (plein écran sans bandes) ET la résolution logique
 * du buffer pixel-art pour garantir des pixels strictement carrés (aucun étirement).
 */
function computeViewportLayout() {
  const winW = Math.max(1, window.innerWidth);
  const winH = Math.max(1, window.innerHeight);
  const winAspect = winW / winH;
  const baseAspect = BUFFER_W / BUFFER_H;

  let viewW = BUFFER_W;
  let viewH = BUFFER_H;

  if (winAspect >= baseAspect) {
    // Fenêtre plus large que 480:272 -> on élargit la vue logique (décor sur les côtés)
    viewH = BUFFER_H;
    viewW = Math.min(720, Math.max(BUFFER_W, Math.round(BUFFER_H * winAspect)));
    displayScale = winH / viewH;
  } else {
    // Fenêtre plus haute que 480:272 -> on agrandit verticalement sans écraser
    viewW = BUFFER_W;
    viewH = Math.min(420, Math.max(BUFFER_H, Math.round(BUFFER_W / winAspect)));
    displayScale = winW / viewW;
  }

  game.viewW = viewW;
  game.viewH = viewH;
  game.offsetX = Math.floor((viewW - BUFFER_W) / 2);
  game.offsetY = Math.floor((viewH - BUFFER_H) / 2);

  return { canvasW: winW, canvasH: winH, viewW, viewH };
}

function rebuildOffscreenBuffer(viewW, viewH) {
  if (g && g.width === viewW && g.height === viewH) return;
  if (g) g.remove();
  g = createGraphics(viewW, viewH);
  g.hide();
  g.pixelDensity(1);
  applyPixelCrispness();
}

/**
 * Remplit les marges latérales des mini-jeux / écran titre avec une bordure prairie
 * assortie à Sprout Lands lorsqu'on est en mode fenêtré large (zéro bande noire).
 */
function drawCozySideDecor(buf) {
  const ox = game.offsetX;
  const oy = game.offsetY;
  const vw = game.viewW;
  const vh = game.viewH;

  // Prairie pastel Sprout Lands
  buf.background(156, 204, 102);

  // Touffes d'herbe et fleurs discrètes sur les bandes latérales
  const assets = game.assets;
  if (assets && assets.ready) {
    const treeRound = assets.getSprite('tree_round');
    const treeApple = assets.getSprite('tree_apple');
    const bush = assets.getSprite('bush_berry');
    const flowerY = assets.getSprite('flower_yellow');
    const flowerP = assets.getSprite('flower_pink');
    const mush = assets.getSprite('mush_red');

    // Décor à gauche
    if (ox > 8) {
      if (treeApple) buf.image(treeApple, Math.max(2, ox - 34), 20);
      if (treeRound) buf.image(treeRound, Math.max(2, ox - 38), 118);
      if (bush) buf.image(bush, Math.max(2, ox - 40), 214);
      if (flowerP) buf.image(flowerP, Math.max(4, ox - 20), 76);
      if (flowerY) buf.image(flowerY, Math.max(4, ox - 26), 178);
      if (mush) buf.image(mush, Math.max(4, ox - 18), 246);
    }

    // Décor à droite
    if (ox > 8) {
      const rx = ox + BUFFER_W;
      if (treeRound) buf.image(treeRound, rx + 8, 22);
      if (treeApple) buf.image(treeApple, rx + 10, 124);
      if (bush) buf.image(bush, rx + 6, 214);
      if (flowerY) buf.image(flowerY, rx + 14, 82);
      if (flowerP) buf.image(flowerP, rx + 18, 180);
      if (mush) buf.image(mush, rx + 12, 246);
    }
  }

  // Cadre bois fin séparant proprement le mini-jeu de la bordure prairie
  buf.push();
  buf.noFill();
  buf.stroke(107, 75, 91);
  buf.strokeWeight(2);
  buf.rect(ox - 1, oy - 1, BUFFER_W + 2, BUFFER_H + 2);
  buf.pop();
}

function applyPixelCrispness() {
  noSmooth();
  if (drawingContext) {
    drawingContext.imageSmoothingEnabled = false;
  }
  if (g && g.drawingContext) {
    g.noSmooth();
    g.drawingContext.imageSmoothingEnabled = false;
  }
}

/** Verrouille Échap en plein écran (Chrome/Opera/Edge) pour ouvrir le menu au lieu de quitter le plein écran. */
function lockEscapeInFullscreen() {
  if (navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
    navigator.keyboard.lock(['Escape']).catch(() => {});
  }
}

function unlockEscapeFromFullscreen() {
  if (navigator.keyboard && typeof navigator.keyboard.unlock === 'function') {
    try {
      navigator.keyboard.unlock();
    } catch (e) {}
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
      .then(() => lockEscapeInFullscreen())
      .catch(() => {});
  } else {
    unlockEscapeFromFullscreen();
    document.exitFullscreen().catch(() => {});
  }
}

function setupFullscreenButton() {
  const btn = document.getElementById('fullscreen-btn');
  if (!btn) return;

  const updateLabel = () => {
    const isFS = Boolean(document.fullscreenElement);
    btn.textContent = isFS ? '[F] Exit Fullscreen' : '[F] Fullscreen';
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      lockEscapeInFullscreen();
    } else {
      unlockEscapeFromFullscreen();
    }
    updateLabel();
    setTimeout(windowResized, 60);
  });

  // Empêcher le comportement navigateur par défaut sur Échap (géré par notre menu pause)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
    }
  });

  updateLabel();
}

function setup() {
  // Backend CPU pour TensorFlow.js (comme l'exemple 9 du cours : évite les blocages WebGL)
  if (typeof tf !== 'undefined' && typeof tf.setBackend === 'function') {
    tf.setBackend('cpu').catch(() => {});
  }

  // pixelDensity(1) + nearest-neighbor : pixel-art 100% net et 3-4x plus rapide à 60 FPS !
  pixelDensity(1);
  const vp = computeViewportLayout();
  createCanvas(vp.canvasW, vp.canvasH);
  applyPixelCrispness();

  // Buffer interne basse résolution (pixels carrés 1:1, aucun lissage)
  rebuildOffscreenBuffer(vp.viewW, vp.viewH);

  setupFullscreenButton();

  game.save = new SaveManager();
  game.assets = new AssetManager();
  game.sound = new SoundManager(ASSET_BASE);
  game.scenes = new SceneManager();
  game.pauseMenu = new PauseMenu(game);

  // Enregistrement de toutes les scènes du jeu (Title, Hub et les 4 mini-jeux)
  game.scenes.register('title', new TitleScene(game));
  game.scenes.register('hub', new HubScene(game));
  game.scenes.register('snake', new SnakeScene(game));
  game.scenes.register('ducklings', new DucklingScene(game));
  game.scenes.register('derby', new DerbyScene(game));
  game.scenes.register('fox', new FoxScene(game));

  // Chargement des ressources puis ouverture de l'écran titre
  game.assets.loadAll(() => {
    game.scenes.switchTo('title');
  });
}

function draw() {
  if (drawingContext && drawingContext.imageSmoothingEnabled) {
    drawingContext.imageSmoothingEnabled = false;
  }

  if (!game.assets.ready) {
    g.background(140, 178, 128);
    g.fill(247, 235, 170);
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textSize(14);
    g.text("Loading Moo's Funfair...", game.viewW / 2, game.viewH / 2);
    image(g, 0, 0, width, height);
    return;
  }

  // Met le jeu en pause tant que le menu Échap est ouvert
  if (!game.pauseMenu || !game.pauseMenu.open) {
    game.scenes.update();
  }

  const cur = game.scenes.current;
  if (cur && cur.usesWideCamera) {
    // Scène à caméra large (Hub) : dessine directement sur toute la largeur viewW x viewH
    game.scenes.draw(g);
  } else {
    // Scènes 480x272 centrées avec bordure prairie chaleureuse sur les côtés
    if (game.offsetX > 0 || game.offsetY > 0) {
      drawCozySideDecor(g);
    }
    g.push();
    g.translate(game.offsetX, game.offsetY);
    game.scenes.draw(g);
    g.pop();
  }

  // Menu pause global dessiné par-dessus la scène
  if (game.pauseMenu && game.pauseMenu.open) {
    game.pauseMenu.draw(g);
  }

  image(g, 0, 0, width, height);
}

function windowResized() {
  const vp = computeViewportLayout();
  resizeCanvas(vp.canvasW, vp.canvasH);
  rebuildOffscreenBuffer(vp.viewW, vp.viewH);
  applyPixelCrispness();
}

function mousePressed(event) {
  if (!game.assets.ready) return;
  // Ignorer les clics sur le bouton Fullscreen ou les panneaux latéraux (Derby / Debug)
  if (event && event.target && (
    event.target.id === 'fullscreen-btn' ||
    event.target.closest('#derby-panel') ||
    event.target.closest('.debug-side-panel')
  )) {
    return;
  }

  // Si le menu Échap est ouvert, il intercepte les clics
  if (game.pauseMenu && game.pauseMenu.open) {
    const rawX = (mouseX / Math.max(1, width)) * game.viewW;
    const rawY = (mouseY / Math.max(1, height)) * game.viewH;
    game.pauseMenu.mousePressed(rawX, rawY);
    return;
  }

  const { mx, my } = game.getMouseBufferPos();
  const cur = game.scenes.current;
  if (cur && cur.usesWideCamera) {
    if (mx < 0 || mx > game.viewW || my < 0 || my > game.viewH) return;
  } else {
    if (mx < 0 || mx > BUFFER_W || my < 0 || my > BUFFER_H) return;
  }
  game.scenes.mousePressed(mx, my);
}

function keyPressed() {
  if (!game.assets.ready) return;

  // Touche F : bascule plein écran
  if (key === 'f' || key === 'F') {
    toggleFullscreen();
    return false;
  }

  // Touche Échap : ferme un sous-panneau éventuel, sinon ouvre/ferme le menu pause
  // (sans jamais quitter le plein écran grâce à Keyboard Lock API)
  if (keyCode === ESCAPE) {
    const cur = game.scenes.current;
    if (cur && cur.showCredits) {
      cur.showCredits = false;
      return false;
    }
    if (cur && cur.overlay) {
      cur.overlay = false;
      return false;
    }
    if (game.pauseMenu) {
      game.pauseMenu.toggle();
    }
    return false;
  }

  // Touche H : bascule globale du mode debug des Steering Behaviors (évite conflit avec D/WASD)
  if (key === 'h' || key === 'H') {
    Vehicle.debug = !Vehicle.debug;
  }

  // Si le menu Échap est ouvert, la navigation clavier reste dans le menu
  if (game.pauseMenu && game.pauseMenu.open) {
    game.pauseMenu.keyPressed(key, keyCode);
    return false;
  }

  game.scenes.keyPressed(key, keyCode);
  return false;
}
