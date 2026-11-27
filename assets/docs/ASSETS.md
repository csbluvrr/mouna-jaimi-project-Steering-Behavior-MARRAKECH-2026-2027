# Bunny Funfair: asset guide

**Setup that makes everything line up**
- Draw at a low internal resolution (e.g. 480x270) and scale the canvas up 3x or 4x with no smoothing (`noSmooth()` in p5, `image-rendering: pixelated` on the canvas). Tile size is **16 px**.
- Every sprite below is in its native size. Never resize sprites individually, only the whole canvas.
- Moo is about 27x36 px, booths 50x58, the little Minifolks bunnies 12x8. Moo is the biggest character on purpose (she has to read at a glance), the kids/NPCs are small.

Folders: `sprites/ tiles/ decor/ items/ ui/ fonts/ audio/ derby/ generated/`. `atlas.json` has frame sizes and animation rows, `ui/ui_atlas.json` has named UI rectangles. `PREVIEW_generated_art.png` shows everything I drew.

## Per game

### Hub
| Need | File |
|---|---|
| **Moo** (hero, 4 directions, walk cycle) | `sprites/moo/moo_sheet.png` (cells 32x40, rows down/left/right/up, 4 frames each, feet on the bottom row). `moo_hd_cleaned_cutout.png` is the transparent full-res version for portraits / dialogs |
| Ground, paths, water, fences | `tiles/grass_tileset.png`, `dirt_paths.png`, `water_tileset.png`, `fences_tileset.png`, `grass_layers_day/night.png` (night = dusk tint) |
| Trees, bushes, flowers, rocks, mushrooms | `decor/nature_objects.png`, `trees_bushes_stumps.png`, `cherry_blossom.png`, `wood_and_mushrooms.png` |
| Booths (4, one per game, with emblem) | `generated/booths/booth_*.png` (48x56) |
| Quick-pick poster board (4 card slots) | `generated/hub/poster_board.png` (64x80), slot rects in `build_report.json` |
| Balloons, bunting, string lights (on/off), ferris wheel | `generated/hub/` |
| Tickets, stamp card (empty/full) | `generated/hub/ticket.png`, `stamp_empty_full_16x16.png` |
| Title sign | `generated/hub/title_sign_moos_funfair.png` |
| Ambient critters | `sprites/ambient/` (bird, bee as bug/butterfly, frog, mice, cow, deer) and `generated/ambient/butterfly_2frames_12x10.png` |
| NPC kids (4 directions) | `sprites/npc/kid_4dir_sheet.png` (48x48 frames, rows: front/back/left/right) |
| Prize shop | `generated/shop/` (party hat, top hat, bow tie, scarf, crown), `decor/present_*.png`, `decor/candy_and_pie.png` |

### Bunny Derby
- Racers: `sprites/bunny/bunny_<snow|peach|butter|mint|lavender|sky|caramel|smoke>.png`, 8 colours, same layout.
- Track: `derby/track_01.png` (640x360) + `track_01_mask.png` (white = drivable, use it for collisions and rays) + `track_01_meta.json` (start, heading, ordered checkpoints for the fitness function). It is an example, replace it with your own track if you want.
- `generated/derby/`: finish flag, checker tile, hay bale, crown for the leader.
- Debug panel: `ui/` sliders (`slider_track_*` in the atlas), panels, buttons, check/cross, font.

### Snake (caterpillar)
- `generated/snake/caterpillar_head|body|tail_<green|pink|blue|gold>.png` (head 16x16, bead 14x14, tail 10x10).
- Fruit: `decor/nature_objects.png` (apples, berries, cherries), `items/plants_items.png`.
- Obstacles: `decor/wood_and_mushrooms.png`, rocks in `nature_objects.png`, puddles from `tiles/water_tileset.png`.
- Win: `generated/ambient/butterfly_2frames_12x10.png`, `generated/fx/confetti_*`.

### Duckling Herder
- Ducklings: `sprites/ducklings/duckling_sheet.png` (16x16, 4x2 grid, the pack's chick recoloured, no comb). Original in `chick_sheet_original.png`.
- Goose: `generated/ducklings/goose_2frames_30x28.png`. Pen sign: `pen_sign.png`. Fences: `tiles/fences_tileset.png`. Pond: `tiles/water_tileset.png`.
- Countdown "3 2 1 START": use `fonts/pixelFont-7-8x14-sproutLands.ttf` with `textToPoints` (load it with `loadFont`).
- Sunset sky icons: `ui/weather_icons_small.png`, `ui/emoji_sheet.png`.

### Fox Showdown
- Fox: `sprites/fox/fox_sheet.png` (32x32, 6x6 grid: idle, walk, run, throw/bark row, crouch, KO). Dizzy stars: `generated/fx/dizzy_star.png`.
- Projectiles: `generated/fox/projectile_acorn.png` (fox), `projectile_carrot.png` (you).
- Power-ups: `powerup_shield.png`, `powerup_triple.png`, `powerup_heal.png`, `pickup_ring_0/1.png`.
- Health bars: hearts and bars in `ui/ui_main_sheet.png` (`heart_*`, bar regions in `ui_main_sheet_regions.json`).
- Stalls to hide behind: the booths, hay bales, `decor/furniture_*.png`.

## Sounds (`audio/`, trimmed and volume-matched)
| File | Use it for |
|---|---|
| `ui_click`, `ui_hover` | menus, poster |
| `countdown_tick` | 3-2-1 |
| `success_bell` | win, ticket, pickup |
| `fail_soft`, `fail_soft_2` | lose |
| `hit_1..6` | acorn/carrot hits, bonks |
| `squeak_1/2`, `squeak_double_1/2` | bunny hop, ducklings |
| `jingle_derby/snake/ducklings/fox` | short intro stinger per game |
| `long_melody_1/2` (6 s) | maybe a title jingle |
The names are my guess from length and size, so listen to them once and rename what is wrong.

## What the packs do NOT have (you still need)
1. **Music.** None in the packs. You need 1 hub loop, 1 loop per game (or one shared), a win and a lose sting. Free chiptune/cozy loops from sites like OpenGameArt or itch.io work, check each licence and credit.
2. **Moo has no idle-sit, run or interact poses**, only stand + walk in 4 directions. The Minifolks bunnies are still there for the derby racers and little ambient friends.
3. **Dedicated ducks/geese animations** beyond the chick and my static goose, and a fox walking *away* from you (it only faces left/right).
4. **Particle art** (confetti, fireworks, dust): do these in code, I only gave you sparkle and confetti pieces.
5. **Real caterpillar/butterfly animation frames.** Mine are single sprites. Wiggle them in code.
6. **Hub map layout.** Build it from the tiles (Tiled, or a 2D array).

## Licence
Sprout Lands is free for non-commercial use, credit Cup Nooble, no NFT or AI training, don't redistribute the pack itself. Put the credit line from `CREDITS.txt` in your README and in a credits screen. The Minifolks and Farm packs came without a readme in your archive, so check their pages. I did not use the Farm pack, the dungeon, village, winter, halloween or ocean assets.

## Hub viewer (`hub/`)
A runnable p5 page of the Moo's Funfair hub, built from the pieces above. `hub_layout.json` says what sits where (objects, collision boxes, booth trigger zones, poster slots, spawn point), `sketch.js` draws it and handles clicks.
Run it from the pack folder (the page loads files, so double-clicking won't work):
`python3 -m http.server 8765` then open `http://localhost:8765/hub/`
Click to move, walk to a booth + Space, P = game poster, 1-4 picks a game. The movement in `sketch.js` is a placeholder arrive, swap in your own Vehicle. `hub_ground.png` is the pre-drawn grass + paths + pond.
