/**
 * Catalogue officiel des cosmétiques de Moo's Funfair (18 cosmétiques + 7 hoodies).
 * Tous les cosmétiques sont des spritesheets 128x160 (4x4 cellules 32x40) alignées
 * frame par frame sur sprites/moo/better sprite.png :
 * - Ordre de rendu strict : behind -> Moo (hoodie) -> over (back, neck, face, head).
 * - Un seul objet équipé par emplacement (head, face, neck, back, hoodie).
 */
class CosmeticCatalog {
  static SLOTS = [
    { id: 'head',   label: 'Head' },
    { id: 'face',   label: 'Face' },
    { id: 'neck',   label: 'Neck' },
    { id: 'back',   label: 'Back' },
    { id: 'hoodie', label: 'Hoodies' }
  ];

  static ITEMS = [
    // --- HEAD (9) ---
    { id: 'party_hat',    slot: 'head', name: 'Party Hat',    price: 15, sheet: 'generated/cosmetics/head/party_hat.png' },
    { id: 'top_hat',      slot: 'head', name: 'Top Hat',      price: 20, sheet: 'generated/cosmetics/head/top_hat.png' },
    { id: 'mushroom_cap', slot: 'head', name: 'Mushroom Cap', price: 22, sheet: 'generated/cosmetics/head/mushroom_cap.png' },
    { id: 'flower_crown', slot: 'head', name: 'Flower Crown', price: 18, sheet: 'generated/cosmetics/head/flower_crown.png' },
    { id: 'tiny_sprout',  slot: 'head', name: 'Tiny Sprout',  price: 12, sheet: 'generated/cosmetics/head/tiny_sprout.png' },
    { id: 'big_red_bow',  slot: 'head', name: 'Big Red Bow',  price: 15, sheet: 'generated/cosmetics/head/big_red_bow.png' },
    { id: 'gold_crown',   slot: 'head', name: 'Gold Crown',   price: 40, sheet: 'generated/cosmetics/head/gold_crown.png' },
    { id: 'angel_halo',   slot: 'head', name: 'Angel Halo',   price: 35, sheet: 'generated/cosmetics/head/angel_halo.png' },
    { id: 'headphones',   slot: 'head', name: 'Headphones',   price: 28, sheet: 'generated/cosmetics/head/headphones.png' },

    // --- FACE (3) ---
    { id: 'round_glasses',    slot: 'face', name: 'Round Glasses',  price: 18, sheet: 'generated/cosmetics/face/round_glasses.png' },
    { id: 'heart_sunglasses', slot: 'face', name: 'Heart Shades',   price: 24, sheet: 'generated/cosmetics/face/heart_sunglasses.png' },
    { id: 'cheek_stars',      slot: 'face', name: 'Cheek Stars',    price: 14, sheet: 'generated/cosmetics/face/cheek_stars.png' },

    // --- NECK (4) ---
    { id: 'red_bow_tie', slot: 'neck', name: 'Red Bow Tie', price: 14, sheet: 'generated/cosmetics/neck/red_bow_tie.png' },
    { id: 'knit_scarf',  slot: 'neck', name: 'Knit Scarf',  price: 20, sheet: 'generated/cosmetics/neck/knit_scarf.png' },
    { id: 'bell_choker', slot: 'neck', name: 'Bell Choker', price: 16, sheet: 'generated/cosmetics/neck/bell_choker.png' },
    { id: 'flower_lei',  slot: 'neck', name: 'Flower Lei',  price: 22, sheet: 'generated/cosmetics/neck/flower_lei.png' },

    // --- BACK (2 — couche behind + couche over) ---
    {
      id: 'green_backpack',
      slot: 'back',
      name: 'Green Pack',
      price: 30,
      sheet: 'generated/cosmetics/back/green_backpack.png',
      behindSheet: 'generated/cosmetics/back/green_backpack_behind.png'
    },
    {
      id: 'fairy_wings',
      slot: 'back',
      name: 'Fairy Wings',
      price: 45,
      sheet: 'generated/cosmetics/back/fairy_wings.png',
      behindSheet: 'generated/cosmetics/back/fairy_wings_behind.png'
    },

    // --- HOODIES (défaut jaune + 7 couleurs de remplacement complet) ---
    { id: 'default',  slot: 'hoodie', name: 'Sunny Yellow', price: 0,  swatch: [253, 218, 119], sheet: 'sprites/moo/better sprite.png' },
    { id: 'pink',     slot: 'hoodie', name: 'Pink Hoodie',  price: 20, swatch: [242, 152, 182], sheet: 'generated/cosmetics/hoodies/moo_hoodie_pink.png' },
    { id: 'mint',     slot: 'hoodie', name: 'Mint Hoodie',  price: 20, swatch: [150, 222, 182], sheet: 'generated/cosmetics/hoodies/moo_hoodie_mint.png' },
    { id: 'lavender', slot: 'hoodie', name: 'Lavender',     price: 22, swatch: [188, 160, 236], sheet: 'generated/cosmetics/hoodies/moo_hoodie_lavender.png' },
    { id: 'sky',      slot: 'hoodie', name: 'Sky Blue',     price: 20, swatch: [142, 198, 242], sheet: 'generated/cosmetics/hoodies/moo_hoodie_sky.png' },
    { id: 'red',      slot: 'hoodie', name: 'Berry Red',    price: 22, swatch: [218, 82, 90],   sheet: 'generated/cosmetics/hoodies/moo_hoodie_red.png' },
    { id: 'white',    slot: 'hoodie', name: 'Cloud White',  price: 18, swatch: [244, 242, 238], sheet: 'generated/cosmetics/hoodies/moo_hoodie_white.png' },
    { id: 'black',    slot: 'hoodie', name: 'Midnight',     price: 25, swatch: [68, 62, 74],    sheet: 'generated/cosmetics/hoodies/moo_hoodie_black.png' }
  ];

  static keyFor(slot, id) {
    return slot + ':' + id;
  }

  static getBySlot(slot) {
    return CosmeticCatalog.ITEMS.filter((it) => it.slot === slot);
  }

  static find(slot, id) {
    return CosmeticCatalog.ITEMS.find((it) => it.slot === slot && it.id === id) || null;
  }

  /** Retourne tous les chemins d'images à précharger dans AssetManager. */
  static getAllAssetPaths() {
    const paths = ['generated/booths/booth_prize.png'];
    for (const it of CosmeticCatalog.ITEMS) {
      if (it.sheet) paths.push(it.sheet);
      if (it.behindSheet) paths.push(it.behindSheet);
    }
    return paths;
  }

  /**
   * Dessine Moo et sa tenue complète exactement au même point (x, y) :
   * 1) behind (back item derrière elle en vue face/côté)
   * 2) Moo (spritesheet du hoodie équipé)
   * 3) over (back vue de dos, neck, face, head avec oreilles par-dessus)
   */
  static drawMooWithOutfit(g, assets, outfit, x, y, col, row, scale = 1) {
    if (!assets) return;
    const eq = outfit || { hoodie: 'default', head: null, face: null, neck: null, back: null };
    const w = 32 * scale;
    const h = 40 * scale;

    const drawLayer = (sheetPath) => {
      if (!sheetPath) return;
      const frame = assets.getSheetFrame(sheetPath, 32, 40, col, row);
      if (frame) {
        if (scale === 1) g.image(frame, x, y);
        else g.image(frame, x, y, w, h);
      }
    };

    // 1. Couche BEHIND (ailes / sac à dos derrière Moo en vues face et profil)
    const backItem = eq.back ? CosmeticCatalog.find('back', eq.back) : null;
    if (backItem && backItem.behindSheet) {
      drawLayer(backItem.behindSheet);
    }

    // 2. Couche MOO (spritesheet de base ou hoodie couleur équipé)
    const hoodieItem = CosmeticCatalog.find('hoodie', eq.hoodie || 'default');
    drawLayer(hoodieItem ? hoodieItem.sheet : 'sprites/moo/better sprite.png');

    // 3. Couches OVER (dos en vue arrière, cou, visage, tête)
    if (backItem && backItem.sheet) drawLayer(backItem.sheet);

    const neckItem = eq.neck ? CosmeticCatalog.find('neck', eq.neck) : null;
    if (neckItem) drawLayer(neckItem.sheet);

    const faceItem = eq.face ? CosmeticCatalog.find('face', eq.face) : null;
    if (faceItem) drawLayer(faceItem.sheet);

    const headItem = eq.head ? CosmeticCatalog.find('head', eq.head) : null;
    if (headItem) drawLayer(headItem.sheet);
  }
}
