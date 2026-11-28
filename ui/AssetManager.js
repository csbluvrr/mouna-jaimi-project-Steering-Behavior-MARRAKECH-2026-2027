/**
 * Gestionnaire centralisé des ressources (images, spritesheets, police, JSON).
 * Utilise une unique constante ASSET_BASE pointant vers le pack existant,
 * sans dupliquer les fichiers sur le disque.
 */
const ASSET_BASE = 'assets/';

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
    loadJSON(this.base + 'world/hub/hub_layout.json', (data) => {
      this.hubLayout = data;

      // Sol pré-rendu du hub
      this.loadImageKey('world/hub/hub_ground.png');

      // Tous les sprites référencés par hub_layout.json
      const files = new Set(Object.values(data.sprites).map((s) => s.file));
      data.friends.forEach((f) => files.add(f.sheet));

      // Personnages & éléments d'ambiance du hub + écran titre
      files.add('characters/moo/moo_main.png');
      files.add('characters/animals/ducklings/duckling_sheet.png');
      files.add('characters/npcs/catboy/kid_4dir_sheet.png');
      files.add('characters/animals/ambient/butterfly_2frames_12x10.png');
      files.add('world/hub/props/stamp_empty_full_16x16.png');

      // Nouveaux assets NPC, Mr. Carrot, Nouveau Lapin, Nouveau Renard & Tiny Neighbours Vol1
      files.add('characters/npcs/mr_carrot/carrot_sheet.png');
      files.add('characters/animals/bunnies/bunny_anim.png');
      files.add('characters/animals/fox/fox_new_sheet.png');
      for (let i = 1; i <= 15; i++) {
        files.add('characters/npcs/tiny_neighbours/NPC_' + i + '.png');
      }
      ['Heart', 'Happy', 'Star', 'Exclamation', 'Surprised', 'Interrogation'].forEach((em) => {
        files.add('characters/npcs/tiny_neighbours/emotes/' + em + '_emote_16x16.png');
      });

      // Nouveaux invités crossover du Hub (Deltarune, OneShot, Hollow Knight, Zelda, One Piece) + Portraits RPG
      [
        'kris_walk', 'ralsei_walk', 'susie_walk',
        'kris_act_mallet', 'kris_act_drink', 'kris_act_balloon',
        'ralsei_act_magic', 'ralsei_act_dance', 'ralsei_act_cheer', 'ralsei_act_cake',
        'susie_act_mallet', 'susie_act_laugh', 'susie_act_cheer', 'susie_act_drink', 'susie_act_snack',
        'niko_walk', 'niko_sit', 'knight_walk', 'link_walk',
        'luffy_walk', 'zoro_walk', 'chopper_walk', 'perona_walk', 'law_walk',
        'portrait_niko', 'portrait_ralsei', 'portrait_susie', 'portrait_knight'
      ].forEach((gName) => {
        files.add('characters/npcs/guests/' + gName + '.png');
      });

      // Sélection utile du pack Tiny Swords (moutons animés, canard de bain, flammes de temple)
      files.add('packs/tiny_swords/terrain/Resources/Meat/Sheep/Sheep_Grass.png');
      files.add('packs/tiny_swords/terrain/Decorations/Rubber Duck/Rubber duck.png');
      files.add('packs/tiny_swords/fx/Fire_01.png');

      // Décors & faune Sprout Lands / Minifolks (cerisiers, cadeaux, bonbons, pique-nique, grenouille, abeilles, cerf, oiseau)
      files.add('world/decor/cherry_blossom.png');
      files.add('world/decor/candy_and_pie.png');
      files.add('world/decor/present_red.png');
      files.add('world/decor/present_green.png');
      files.add('world/decor/picnic_foods.png');
      files.add('characters/animals/ambient/bird_sheet.png');
      files.add('characters/animals/ambient/bee_small_sheet.png');
      files.add('characters/animals/ambient/frog_sheet.png');
      files.add('characters/animals/ambient/deer1_sheet.png');
      for (let h = 1; h <= 4; h++) {
        files.add('ui/book_menu/heart_hp/heart idle' + h + '.png');
      }

      // Nouveaux assets PokéMoo Feast!! (Onix, Scorbunny, Gengar)
      files.add('minigames/pokemoo/onix_head.png');
      files.add('minigames/pokemoo/onix_rock.png');
      files.add('minigames/pokemoo/onix_tail.png');
      files.add('minigames/pokemoo/onix_head_shiny.png');
      files.add('minigames/pokemoo/onix_rock_shiny.png');
      files.add('minigames/pokemoo/onix_tail_shiny.png');
      files.add('minigames/pokemoo/scorbunny.png');
      files.add('minigames/pokemoo/scorbunny_shiny.png');
      files.add('minigames/pokemoo/gengar.png');

      // Nouveaux assets Catch the Purins! (Pompompurin transparent)
      files.add('minigames/purins/pompompurin_sheet.png');

      // Nouveaux assets The Legend of Moo (Legend_of_Zink_Asset_Pack)
      const zBase = 'minigames/legend_of_moo/zelda/';
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
      files.add(zBase + 'Props/PNG/sprFancyPot.png');
      files.add(zBase + 'Props/PNG/sprBluePot.png');

      // Ressources Caterpillar Crawl (Snake) + effets communs
      ['green', 'pink', 'blue', 'gold'].forEach((col) => {
        files.add('minigames/pokemoo/legacy_caterpillar/caterpillar_head_' + col + '.png');
        files.add('minigames/pokemoo/legacy_caterpillar/caterpillar_body_' + col + '.png');
        files.add('minigames/pokemoo/legacy_caterpillar/caterpillar_tail_' + col + '.png');
      });
      files.add('world/items/plants_items.png');
      files.add('fx/sparkle_4frames_9x9.png');
      files.add('fx/confetti_6colors_3x3.png');
      files.add('fx/dizzy_star.png');

      // Ressources Duckling Herder
      files.add('minigames/purins/goose_2frames_30x28.png');
      files.add('minigames/purins/pen_sign.png');

      // Ressources Bunny Derby (circuit + 8 lapins + drapeau/couronne/foin)
      files.add('minigames/derby/track_01.png');
      files.add('minigames/derby/track_01_mask.png');
      files.add('minigames/derby/crown.png');
      files.add('minigames/derby/finish_flag.png');
      files.add('minigames/derby/hay_bale.png');
      ['snow', 'peach', 'butter', 'mint', 'lavender', 'sky', 'caramel', 'smoke'].forEach((c) => {
        files.add('characters/animals/bunnies/bunny_' + c + '.png');
      });

      // Ressources Fox Showdown
      files.add('characters/animals/fox/fox_sheet.png');
      files.add('minigames/legend_of_moo/legacy_fox/projectile_acorn.png');
      files.add('minigames/legend_of_moo/legacy_fox/projectile_carrot.png');
      files.add('minigames/legend_of_moo/legacy_fox/powerup_shield.png');
      files.add('minigames/legend_of_moo/legacy_fox/powerup_triple.png');
      files.add('minigames/legend_of_moo/legacy_fox/powerup_heal.png');
      files.add('minigames/legend_of_moo/legacy_fox/pickup_ring_0.png');
      files.add('minigames/legend_of_moo/legacy_fox/pickup_ring_1.png');

      // Animation du livre de menu (ouverture / fermeture / pages)
      for (let i = 1; i <= 5; i++) {
        files.add('ui/book_menu/menu/menu swipe animation' + i + '.png');
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
    loadJSON(this.base + 'minigames/derby/track_01_meta.json', (meta) => {
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
