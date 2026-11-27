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
    this.derbyMeta = null;
    this.skyMeta = null;
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
      files.add('sprites/moo/better sprite.png');
      files.add('sprites/ducklings/duckling_sheet.png');
      files.add('sprites/npc/kid_4dir_sheet.png');
      files.add('generated/ambient/butterfly_2frames_12x10.png');
      files.add('generated/hub/stamp_empty_full_16x16.png');

      // Nouveaux assets NPC, Mr. Carrot, Nouveau Lapin & Nouveau Renard
      files.add('FREE SAMPLE NPC Characters by antarcticbees/girl1_idle.png');
      files.add('mr.carrot by caoduy/carrot sprite sheet.png');
      files.add('Bunny/Bunny 1 16x16 animation.png');
      files.add('Fox Sprite Sheet.png');

      // Nouveaux assets PokéMoo Feast!! (Onix, Scorbunny, Gengar)
      files.add('generated/pokemon/onix_head.png');
      files.add('generated/pokemon/onix_rock.png');
      files.add('generated/pokemon/onix_tail.png');
      files.add('scorbunny.png');
      files.add('gengar.png');

      // Nouveaux assets Catch the Purins! (Pompompurin transparent)
      files.add('generated/purin/pompompurin_sheet.png');

      // Nouveaux assets The Legend of Moo (Legend_of_Zink_Asset_Pack)
      const zBase = 'Legend_of_Zink_Asset_Pack/Legend_of_Zink_Asset_Pack/';
      files.add(zBase + 'Enemies/PNG/sprFireCultistE.png');
      files.add(zBase + 'Enemies/PNG/sprFireCultistW.png');
      files.add(zBase + 'Enemies/PNG/sprFireBall.png');
      files.add(zBase + 'Zink/PNG/sprWeaponBoomerang.png');
      files.add(zBase + 'Collectables/PNG/sprHealthPotion.png');
      files.add(zBase + 'Collectables/PNG/sprMagicPotion.png');
      files.add(zBase + 'Collectables/PNG/sprHeartContainer.png');
      files.add(zBase + 'Collectables/PNG/sprRuby.png');
      files.add(zBase + 'Props/PNG/sprBlueBlock.png');
      files.add(zBase + 'Props/PNG/sprDarkPurpleBlock.png');

      // Ressources Caterpillar Crawl (Snake) + effets communs
      ['green', 'pink', 'blue', 'gold'].forEach((col) => {
        files.add('generated/snake/caterpillar_head_' + col + '.png');
        files.add('generated/snake/caterpillar_body_' + col + '.png');
        files.add('generated/snake/caterpillar_tail_' + col + '.png');
      });
      files.add('items/plants_items.png');
      files.add('generated/fx/sparkle_4frames_9x9.png');
      files.add('generated/fx/confetti_6colors_3x3.png');
      files.add('generated/fx/dizzy_star.png');

      // Ressources Duckling Herder
      files.add('generated/ducklings/goose_2frames_30x28.png');
      files.add('generated/ducklings/pen_sign.png');

      // Ressources Bunny Derby (circuit + 8 lapins + drapeau/couronne/foin)
      files.add('derby/track_01.png');
      files.add('derby/track_01_mask.png');
      files.add('generated/derby/crown.png');
      files.add('generated/derby/finish_flag.png');
      files.add('generated/derby/hay_bale.png');
      ['snow', 'peach', 'butter', 'mint', 'lavender', 'sky', 'caramel', 'smoke'].forEach((c) => {
        files.add('sprites/bunny/bunny_' + c + '.png');
      });

      // Ressources Fox Showdown
      files.add('sprites/fox/fox_sheet.png');
      files.add('generated/fox/projectile_acorn.png');
      files.add('generated/fox/projectile_carrot.png');
      files.add('generated/fox/powerup_shield.png');
      files.add('generated/fox/powerup_triple.png');
      files.add('generated/fox/powerup_heal.png');
      files.add('generated/fox/pickup_ring_0.png');
      files.add('generated/fox/pickup_ring_1.png');

      // Animation du livre de menu (ouverture / fermeture / pages)
      for (let i = 1; i <= 5; i++) {
        files.add('ui/Icon & Menu/Icon & Menu/Menu/menu swipe animation' + i + '.png');
      }

      // Stand Prize Booth + 18 cosmétiques + 7 hoodies de Moo
      if (typeof CosmeticCatalog !== 'undefined') {
        CosmeticCatalog.getAllAssetPaths().forEach((p) => files.add(p));
      }

      // Couches du ciel parallaxe (Jour & Coucher de soleil)
      ['day', 'sunset'].forEach((m) => {
        ['bg', 'sun', 'cloud_far', 'cloud_near', 'rocks', 'haze', 'treeline'].forEach((layer) => {
          files.add('sky/' + m + '_' + layer + '.png');
        });
      });

      files.forEach((relPath) => this.loadImageKey(relPath));
      this.checkDone();
    });

    // Métadonnées du ciel (sky/sky.json)
    this.pending++;
    loadJSON(this.base + 'sky/sky.json', (skyData) => {
      this.skyMeta = skyData;
      this.checkDone();
    }, () => this.checkDone());

    // Métadonnées du circuit Bunny Derby (checkpoints ordonnés & départ)
    this.pending++;
    loadJSON(this.base + 'derby/track_01_meta.json', (meta) => {
      this.derbyMeta = meta;
      this.checkDone();
    }, () => this.checkDone());
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
