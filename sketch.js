/**
 * Point d'entrée principal de Moo's Funfair.
 * Tout le jeu est dessiné dans un buffer pixel-art 480x272 (createGraphics)
 * puis affiché en plein écran / haute netteté sans aucun lissage (nearest-neighbor)
 * pour un rendu pixel-art parfaitement net à toutes les résolutions.
 */
const BUFFER_W = 480;
const BUFFER_H = 272;

let g; // Buffer pixel-art interne 480x272
let displayScale = 3;

// Objet central partagé par toutes les scènes
const game = {
  assets: null,
  save: null,
  sound: null,
  scenes: null,

  /** Convertit la position de la souris vers les coordonnées exactes du buffer 480x272. */
  getMouseBufferPos() {
    return {
      mx: (mouseX / width) * BUFFER_W,
      my: (mouseY / height) * BUFFER_H
    };
  }
};

/**
 * Calcule la meilleure taille d'affichage nette (respectant exactement 480:272).
 * Utilise un facteur entier si possible pour des pixels 100% uniformes,
 * sinon s'adapte proprement à la fenêtre en gardant le ratio exact.
 */
function computeCrispCanvasSize() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const exactScale = Math.min(maxW / BUFFER_W, maxH / BUFFER_H);
  const intScale = Math.floor(exactScale);

  // Si un facteur entier couvre >= 78% de la fenêtre, on le préfère pour des pixels parfaits
  if (intScale >= 1 && intScale / exactScale >= 0.78) {
    displayScale = intScale;
  } else {
    displayScale = exactScale;
  }

  return {
    w: Math.round(BUFFER_W * displayScale),
    h: Math.round(BUFFER_H * displayScale)
  };
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

function setupFullscreenButton() {
  const btn = document.getElementById('fullscreen-btn');
  if (!btn) return;

  const updateLabel = () => {
    const isFS = Boolean(document.fullscreenElement);
    btn.textContent = isFS ? '[x] Exit Fullscreen' : '[ ] Fullscreen';
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  document.addEventListener('fullscreenchange', () => {
    updateLabel();
    setTimeout(windowResized, 60);
  });

  updateLabel();
}

function setup() {
  // Utiliser le ratio physique de l'écran sur le canvas principal pour éviter le flou DPI Windows
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  const sz = computeCrispCanvasSize();
  createCanvas(sz.w, sz.h);

  // Buffer interne basse résolution (1:1 pixel logique, aucun lissage)
  g = createGraphics(BUFFER_W, BUFFER_H);
  g.hide();
  g.pixelDensity(1);
  applyPixelCrispness();

  setupFullscreenButton();

  game.save = new SaveManager();
  game.assets = new AssetManager();
  game.sound = new SoundManager(ASSET_BASE);
  game.scenes = new SceneManager();

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
  applyPixelCrispness();
  background(43, 35, 48);

  if (!game.assets.ready) {
    g.background(140, 178, 128);
    g.fill(247, 235, 170);
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textSize(14);
    g.text("Loading Moo's Funfair...", BUFFER_W / 2, BUFFER_H / 2);
    image(g, 0, 0, width, height);
    return;
  }

  game.scenes.update();
  game.scenes.draw(g);
  image(g, 0, 0, width, height);
}

function windowResized() {
  const sz = computeCrispCanvasSize();
  resizeCanvas(sz.w, sz.h);
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
  const { mx, my } = game.getMouseBufferPos();
  if (mx < 0 || mx > BUFFER_W || my < 0 || my > BUFFER_H) return;
  game.scenes.mousePressed(mx, my);
}

function keyPressed() {
  if (!game.assets.ready) return;

  // Touche H : bascule globale du mode debug des Steering Behaviors (évite conflit avec D/WASD)
  if (key === 'h' || key === 'H') {
    Vehicle.debug = !Vehicle.debug;
  }

  game.scenes.keyPressed(key, keyCode);
  return false;
}
