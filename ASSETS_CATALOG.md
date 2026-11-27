# Moo's Funfair — Organized Asset Catalog

> **Asset Base Path:** `projet/ressources projet/moo_s_funfair_assets/bunny_funfair_assets/`  
> **Total Files Indexed:** 2,601 (organized cleanly without moving/breaking any live game paths)

---

## 1. Protagonist & Cosmetics (100% Integrated)
* **Moo Sprites** (`sprites/moo/`):
  * `better sprite.png` (`128×160`, 4×4 `32×40` frames) — **ACTIVE** main sprite sheet
  * `moo_sheet.png` (`128×160`), `moo_hd_cleaned_cutout.png` (`1230×1278`), `PREVIEW_moo_sheet_x6.png` (`768×960`)
* **18 Cosmetics + 7 Hoodie Colors** (`generated/cosmetics/`, all `128×160` aligned to Moo):
  * **Head (9)**: `party_hat`, `top_hat`, `mushroom_cap`, `flower_crown`, `tiny_sprout`, `big_red_bow`, `gold_crown`, `angel_halo`, `headphones`
  * **Face (3)**: `round_glasses`, `heart_sunglasses`, `cheek_stars`
  * **Neck (4)**: `red_bow_tie`, `knit_scarf`, `bell_choker`, `flower_lei`
  * **Back (2 + behind layers)**: `green_backpack` (+ `_behind`), `fairy_wings` (+ `_behind`)
  * **Hoodies (7)**: `pink`, `mint`, `lavender`, `sky`, `red`, `white`, `black`
* **Shop Icons** (`generated/shop/`): `bow_tie.png`, `hat_crown.png`, `hat_party.png`, `hat_top.png`, `scarf.png`

---

## 2. NPCs, Visitors & Animals
* **Tiny Neighbours Vol1** (`Tiny Neighbours Vol1/`, 29 files) — **ACTIVE in Hub**:
  * `NPC_1.png` .. `NPC_15.png` (`128×208`, `16×16` cells: row 0 header, 3 skin tones × 4 directions `Down/Left/Up/Right`, cols 0–3 `IDLE`, cols 4–7 `WALK`)
  * **10 Animated 4-Frame Emotes** (`Emotes/*_emote_16x16.png`, `64×16`): `Heart`, `Happy`, `Star`, `Exclamation`, `Surprised`, `Interrogation` (active), plus `Angry`, `Evil`, `HeartBreak`, `Sad` (available)
* **Mr. Carrot** (`mr.carrot by caoduy/`): `carrot sprite sheet.png` (`352×224`, `32×32` cells) — **ACTIVE**
* **Girl NPC** (`FREE SAMPLE NPC Characters by antarcticbees/`): `girl1_idle.png` (`32×32`, **ACTIVE**), `girl1_walk_left.gif`, `girl1_walk_right.gif`
* **New Bunny** (`Bunny/`): `Bunny 1 16x16 animation.png` (`352×1088`, `32×32` cells) — **ACTIVE** (Hub + Derby Smokey)
* **New Fox** (`Fox Sprite Sheet.png`, `448×224`, `32×32` cells) — **ACTIVE** (East Wing napping fox)
* **Classic Hub NPCs & Fauna** (`sprites/`):
  * **ACTIVE**: `npc/kid_4dir_sheet.png` (`192×192`), `ducklings/duckling_sheet.png` (`64×32`), `ambient/cow_sheet.png` (`96×64`), `fox/fox_sheet.png` (`192×192`), `bunny/bunny_*.png` (8 colors: `snow`, `peach`, `butter`, `mint`, `lavender`, `sky`, `caramel`, `smoke`, `128×128`), `generated/ambient/butterfly_2frames_12x10.png` (`24×10`)
  * **AVAILABLE (Unused Ambient Wildlife Gems)**:
    * `sprites/ambient/bee_sheet.png` (`128×16`) & `bee_small_sheet.png` (`128×16`)
    * `sprites/ambient/bird_sheet.png` (`64×48`)
    * `sprites/ambient/deer1_sheet.png` (`160×192`) & `deer2_sheet.png` (`224×224`)
    * `sprites/ambient/frog_sheet.png` (`224×96`)
    * `sprites/ambient/mouse_grey_sheet.png` & `mouse_white_sheet.png` (`208×64`)
    * `sprites/npc/kid_8dir_sheet.png` (`128×48`)

---

## 3. World, Sky, Tiles & Decor
* **7-Layer Parallax Sky** (`sky/`, 15 files) — **ACTIVE**:
  * `day_*.png` & `sunset_*.png` (`bg`, `sun`, `cloud_far`, `cloud_near`, `rocks`, `haze`, `treeline`) + `sky.json`
* **Hub Base & Booths** (`hub/`, `generated/booths/`, `generated/hub/`):
  * `hub/hub_ground.png` (`480×272`), `hub/hub_layout.json`
  * 5 Booths (`50×58`): `booth_derby`, `booth_snake`, `booth_ducklings`, `booth_fox`, `booth_prize`
  * 14 Hub props (`generated/hub/`): 5 colored balloons, `bunting_a/b`, `lights_on/dim`, `ferris_wheel`, `title_sign`, `poster_board`, `ticket`, `stamp_empty_full_16x16.png`
* **Decor Sheets** (`decor/`, 13 files):
  * **ACTIVE**: `picnic_blanket.png` (`48×48`), `picnic_basket.png` (`16×16`), `trees_bushes_stumps.png` (`192×128`), `nature_objects.png` (`144×80`), `wood_and_mushrooms.png` (`96×80`)
  * **AVAILABLE (Unused Decor Gems)**:
    * `decor/cherry_blossom.png` (`160×80`) — cherry blossom trees
    * `decor/candy_and_pie.png` (`96×16`) — pixel sweets & pies (great for Sweets booth!)
    * `decor/present_green.png` & `present_red.png` (`160×16`) — pixel gift boxes (great for Prize booth!)
    * `decor/chests.png` (`240×96`) — pixel treasure chests
    * `decor/furniture_basic.png` (`144×96`), `decor/furniture_wooden.png` (`240×128`), `decor/picnic_foods.png` (`112×32`)
* **Tilesets** (`tiles/`, 11 files):
  * `grass_tileset.png`, `grass_layers_day.png`, **`grass_layers_night.png`** (`176×400` — ready for Night Festival!), `dirt_paths.png`, `fences_tileset.png`, `hills_tileset.png`, `water_tileset.png`, `wood_bridge.png`, `doors.png`, `wooden_roof.png`, `wooden_walls.png`
* **Items** (`items/`, 4 files):
  * `plants_items.png` (`80×224`, **ACTIVE**), plus `basic_plants.png` (`96×32`), `bread_jam_honey.png` (`64×64`), `milk_and_grass.png` (`64×16`)

---

## 4. Mini-Game Specific Packs
* **Bunny Derby** (`derby/`, `generated/derby/`):
  * `track_01.png` (`640×360`), `track_01_mask.png`, `track_01_meta.json`, `crown.png`, `finish_checker_tile.png`, `finish_flag.png`, `hay_bale.png`
* **PokéMoo Feast!!** (`(root)`, `generated/pokemon/`, `generated/snake/`):
  * **ACTIVE**: `generated/pokemon/onix_head.png` (`22×22`), `onix_rock.png` (`15×15`), `onix_tail.png` (`11×11`), `scorbunny.png` (`320×640`), `gengar.png` (`256×256`), legacy `caterpillar_*.png` (12 files)
  * Source: `onix.png` (`240×300`)
* **Catch the Purins!** (`generated/purin/`, `generated/ducklings/`):
  * **ACTIVE**: `generated/purin/pompompurin_sheet.png` (`128×192`, transparent 4-dir), `goose_2frames_30x28.png`, `pen_sign.png`
  * Source: `pompompurin.jpg` (`236×354`)
* **The Legend of Moo** (`Legend_of_Zink_Asset_Pack/`, 896 files + `generated/fox/`):
  * **ACTIVE**: `sprFireCultistE/W.png`, `sprFireBall.png`, `sprWeaponBoomerang.png`, `sprHealthPotion.png`, `sprMagicPotion.png`, `sprHeartContainer.png`, `sprRuby.png`, `sprBlueBlock.png`, `sprDarkPurpleBlock.png`
  * **AVAILABLE (Huge Unused Zelda Library)**:
    * `Effects/` (16 files): `sprBombExplosion`, `sprFlameExplosion`, `sprMagicExplosion`, `sprEnemyExplosion`, `sprDirtShockWave`
    * `Enemies/` (96 files): Fire Cultist N/S/Cast animations, Goblins, Boulders, Fire
    * `NPCs/` (86 files): `sprBunnyGirl*`, `sprBaseballTurtle*`, `sprChickenRun`, villagers
    * `Props/` (42 files) & `Tiles/` (76 files): `tileBaseTileset.png` (`800×432`), `tileBossDoor`, `tileBlueTreasureChest`, pots, royal/purple blocks
    * `HUD/` (12 files) & `Menu_Icons/` (78 files): health/magic meters, keys, bombs, bows, boomerangs
    * `Zink/` (471 files): full hero animations & weapons (`sprWeaponArrow`, `sprWeaponBomb`)
* **Shared FX** (`generated/fx/`): `sparkle_4frames_9x9.png`, `confetti_6colors_3x3.png`, `dizzy_star.png`

---

## 5. UI, Fonts & Audio
* **Fonts** (`fonts/`): `pixelFont-7-8x14-sproutLands.ttf`
* **Book Menu & Icons** (`ui/Icon & Menu/`, 22 files):
  * **ACTIVE**: `Menu/menu swipe animation1..5.png` (`160×128`)
  * **AVAILABLE**: `Heart HP/heart idle1..4.png` & `heart gethit1..4.png` (`16×16`), `Menu/Menu1..4.png` (`160×96`)
* **Sprout Lands UI** (`ui/`):
  * `ui_main_sheet.png` (`896×240`) + `ui_atlas.json`, `dialog_box_*.png`, `buttons_*.png`, `speech_bubble.png`, `emoji_sheet.png`, `emotes_sheet.png`, `weather_icons_small.png`, `cursors/cursor_paw*.png` (6 paw/triangle cursors)
* **Humble Gift - Paper UI System v1.1** (`ui/Humble Gift - Paper UI System/`, 1,416 files):
  * Full paper UI kit (folding/cutout/plain paper panels, shop UI, reward popups, day/night item holders) — **AVAILABLE** if we ever want extra parchment widgets.
* **Audio** (`audio/`, 22 `.wav` files) — **ACTIVE**:
  * SFX: `ui_click`, `ui_hover`, `success_bell`, `countdown_tick`, `fail_soft`, `fail_soft_2`, `hit_1..6`, `squeak_1..2`, `squeak_double_1..2`
  * Music/Jingles: `jingle_derby`, `jingle_snake`, `jingle_ducklings`, `jingle_fox`, `long_melody_1`, `long_melody_2`
