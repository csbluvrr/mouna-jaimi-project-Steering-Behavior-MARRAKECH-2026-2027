/**
 * Gestionnaire centralisé des ressources (images, spritesheets, police, JSON).
 * Utilise une unique constante ASSET_BASE pointant vers le pack existant,
 * sans dupliquer les fichiers sur le disque.
 */
const ASSET_BASE = 'ressources projet/moo_s_funfair_assets/bunny_funfair_assets/';

class AssetManager {
  constructor() {
    this.base = ASSET_BASE;
    this.images = {};      // clé relative -> p5.Image
    this.sprites = {};     // nom de sprite découpé -> p5.Image
    this.frameCache = {};  // clé spritesheet+col+row -> p5.Image
    this.font = null;
    this.hubLayout = null;
    this.ready = false;
    this.pending = 0;
    this.onReadyCallback = null;
  }

  /** Charge la police pixel et toutes les ressources nécessaires au démarrage + Hub. */
  loadAll(onReady) {
    this.onReadyCallback = onReady;
    this.pending++;
    this.font = loadFont(this.base + 'fonts/pixelFont-7-8x14-sproutLands.ttf', () => {
      this.checkDone();
    }, () => {
      this.checkDone();
    });

    this.pending++;
    loadJSON(this.base + 'hub/hub_layout.json', (data) => {
      this.hubLayout = data;

      // Sol pré-rendu du hub
      this.loadImageKey('hub/hub_ground.png');

      // Tous les sprites référencés par hub_layout.json
      const files = new Set(Object.values(data.sprites).map((s) => s.file));
      data.friends.forEach((f) => files.add(f.sheet));

      // Personnages & éléments d'ambiance du hub + écran titre
      files.add('sprites/moo/moo_sheet.png');
      files.add('sprites/ducklings/duckling_sheet.png');
      files.add('generated/ambient/butterfly_2frames_12x10.png');
      files.add('generated/hub/stamp_empty_full_16x16.png');

      // Ressources Caterpillar Crawl (Snake) + effets communs
      ['green', 'pink', 'blue', 'gold'].forEach((col) => {
        files.add('generated/snake/caterpillar_head_' + col + '.png');
        files.add('generated/snake/caterpillar_body_' + col + '.png');
        files.add('generated/snake/caterpillar_tail_' + col + '.png');
      });
      files.add('items/plants_items.png');
      files.add('generated/fx/sparkle_4frames_9x9.png');
      files.add('generated/fx/confetti_6colors_3x3.png');

      files.forEach((relPath) => this.loadImageKey(relPath));
      this.checkDone();
    });
  }

  loadImageKey(relPath) {
    if (this.images[relPath]) return;
    this.pending++;
    this.images[relPath] = loadImage(
      this.base + relPath,
      () => this.checkDone(),
      (err) => {
        console.warn('Ressource introuvable :', relPath, err);
        this.checkDone();
      }
    );
  }

  checkDone() {
    this.pending--;
    if (this.pending <= 0 && !this.ready) {
      // Découpe unique des sprites nommés du hub pour éviter des .get() dans draw()
      if (this.hubLayout && this.hubLayout.sprites) {
        for (const [name, s] of Object.entries(this.hubLayout.sprites)) {
          const img = this.images[s.file];
          if (img) {
            const [x, y, w, h] = s.rect;
            this.sprites[name] = img.get(x, y, w, h);
          }
        }
      }
      this.ready = true;
      if (this.onReadyCallback) {
        this.onReadyCallback();
      }
    }
  }

  getImage(relPath) {
    return this.images[relPath] || null;
  }

  getSprite(name) {
    return this.sprites[name] || null;
  }

  /** Extrait et met en cache une cellule (col, row) d'une spritesheet. */
  getSheetFrame(relPath, fw, fh, col, row) {
    const key = relPath + ':' + col + ',' + row;
    if (this.frameCache[key]) return this.frameCache[key];
    const sheet = this.images[relPath];
    if (!sheet) return null;
    const cropped = sheet.get(col * fw, row * fh, fw, fh);
    this.frameCache[key] = cropped;
    return cropped;
  }
}
