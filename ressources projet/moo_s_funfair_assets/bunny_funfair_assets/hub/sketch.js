// Moo's Funfair: hub viewer
// Everything is drawn into a small 480x272 buffer and scaled up with no smoothing, so pixels stay crisp.
// The layout (what goes where) lives in hub_layout.json, this file just draws it and makes it clickable.
// The bunny movement below is a PLACEHOLDER (simple arrive). Swap it for your own Vehicle / behaviors.

const SCALE = 3;
let layout, g, font;
let ready = false, pending = 0;
const imgs = {};      // file -> p5.Image
const sprite = {};    // sprite name -> cropped p5.Image

// state
let hero, friends = [], ducklings = [], butterflies = [];
let promptTrigger = null, overlay = false, toast = '', toastUntil = 0, tickets = 0;

function setup() {
  pixelDensity(1);
  createCanvas(480 * SCALE, 272 * SCALE);
  noSmooth();
  g = createGraphics(480, 272);
  g.hide();                       // the buffer is only drawn onto the main canvas, never shown on the page
  g.pixelDensity(1);
  g.noSmooth();
  font = loadFont('../fonts/pixelFont-7-8x14-sproutLands.ttf');
  loadJSON('hub_layout.json', (data) => {
    layout = data;
    load('hub_ground.png', 'hub_ground.png');
    const files = new Set(Object.values(layout.sprites).map((s) => '../' + s.file));
    layout.friends.forEach((f) => files.add('../' + f.sheet));
    files.add('../sprites/moo/moo_sheet.png');
    files.add('../sprites/ducklings/duckling_sheet.png');
    files.add('../generated/ambient/butterfly_2frames_12x10.png');
    files.forEach((f) => load(f, f));
  });
}

function load(path, key) {
  pending++;
  imgs[key] = loadImage(path, () => { if (--pending === 0) init(); });
}

function init() {
  // crop every named sprite out of its file once
  for (const [name, s] of Object.entries(layout.sprites)) {
    const [x, y, w, h] = s.rect;
    sprite[name] = imgs['../' + s.file].get(x, y, w, h);
  }
  hero = { x: layout.spawn[0], y: layout.spawn[1], vx: 0, vy: 0, tx: null, ty: null, dir: 0 };   // dir rows: 0 down, 1 left, 2 right, 3 up
  friends = layout.friends;
  ducklings = layout.ducklings.map(([x, y]) => ({ x, y, dx: 0, dy: 0, t: 0 }));
  for (let i = 0; i < layout.butterflies; i++) butterflies.push({ x: random(40, 440), y: random(90, 240), a: random(TWO_PI), s: random(0.3, 0.6) });
  ready = true;
}

function draw() {
  background(120, 170, 110);
  if (!ready) return;
  const [bx0, by0, bx1, by1] = layout.walk_bounds;
  updateHero(bx0, by0, bx1, by1);
  updateAmbient();
  drawWorld();
  image(g, 0, 0, width, height);
}

// ------------------------------------------------------------------ update
function blocked(x, y) {                     // hero feet box 10x5
  const bx = x - 6, by = y - 4, bw = 12, bh = 5;
  return layout.solids.some(([sx, sy, sw, sh]) => bx < sx + sw && bx + bw > sx && by < sy + sh && by + bh > sy);
}

function updateHero(bx0, by0, bx1, by1) {
  const maxSpeed = 1.1, maxForce = 0.12, slowRadius = 28;
  if (hero.tx !== null) {
    let dx = hero.tx - hero.x, dy = hero.ty - hero.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.5) { hero.tx = null; hero.vx = hero.vy = 0; }
    else {
      const sp = d < slowRadius ? maxSpeed * d / slowRadius : maxSpeed;      // arrive
      let sx = dx / d * sp - hero.vx, sy = dy / d * sp - hero.vy;
      const m = Math.hypot(sx, sy); if (m > maxForce) { sx = sx / m * maxForce; sy = sy / m * maxForce; }
      hero.vx += sx; hero.vy += sy;
    }
  }
  let nx = hero.x + hero.vx, ny = hero.y + hero.vy;
  nx = constrain(nx, bx0, bx1); ny = constrain(ny, by0, by1);
  if (!blocked(nx, hero.y)) hero.x = nx; else hero.vx = 0;
  if (!blocked(hero.x, ny)) hero.y = ny; else hero.vy = 0;
  if (hero.tx !== null) hero.dir = abs(hero.vx) > abs(hero.vy) ? (hero.vx < 0 ? 1 : 2) : (hero.vy < 0 ? 3 : 0);
  // which trigger zone are we standing in?
  promptTrigger = layout.triggers.find(({ rect: [x, y, w, h] }) => hero.x > x && hero.x < x + w && hero.y > y && hero.y < y + h) || null;
}

function updateAmbient() {
  ducklings.forEach((d) => {
    if (--d.t <= 0) { d.t = random(50, 140); const a = random(TWO_PI), s = random() < 0.35 ? 0 : 0.25; d.dx = cos(a) * s; d.dy = sin(a) * s; }
    d.x = constrain(d.x + d.dx, 340, 462); d.y = constrain(d.y + d.dy, 196, 248);
  });
  butterflies.forEach((b) => { b.a += random(-0.15, 0.15); b.x += cos(b.a) * b.s; b.y += sin(b.a) * b.s * 0.7; b.x = constrain(b.x, 10, 470); b.y = constrain(b.y, 80, 245); });
}

// ------------------------------------------------------------------ draw
function sheetFrame(img, fw, fh, col, row) { return img.get(col * fw, row * fh, fw, fh); }
const frameCache = {};
function frame(file, fw, fh, col, row) {
  const k = file + col + ',' + row;
  return frameCache[k] || (frameCache[k] = sheetFrame(imgs[file], fw, fh, col, row));
}

function drawWorld() {
  g.image(imgs['hub_ground.png'], 0, 0);
  // y-sorted things: layout objects + hero + friends + ducklings
  const items = layout.objects.map((o) => ({ sortY: o.sortY, draw: () => g.image(sprite[o.sprite], o.x, o.y) }));
  const pb = layout.objects.find((o) => o.id === 'poster');
  items.push({ sortY: pb.sortY + 0.1, draw: () => layout.games.forEach((gm, i) => {
    const [sx, sy] = layout.poster.slots_in_sprite[i];
    g.image(sprite['booth_' + gm.id], pb.x + sx + 4, pb.y + sy + 2, 14, 12, 18, 1, 14, 12);
  }) });
  items.push({ sortY: hero.y, draw: drawHero });
  friends.forEach((f) => items.push({ sortY: f.y, draw: () => g.image(frame('../' + f.sheet, 32, 32, f.frame[1], f.frame[0]), f.x - 16, f.y - 32) }));
  ducklings.forEach((d) => items.push({ sortY: d.y, draw: () => {
    const moving = d.dx !== 0 || d.dy !== 0;
    const col = moving ? 1 + floor(frameCount / 8) % 3 : 0;
    g.push(); g.translate(d.x, d.y - 15); if (d.dx < 0) { g.scale(-1, 1); g.translate(-16, 0); }
    g.image(frame('../sprites/ducklings/duckling_sheet.png', 16, 16, col, 1), 0, 0); g.pop();
  } }));
  items.sort((a, b) => a.sortY - b.sortY).forEach((i) => i.draw());

  // bunting + lights + balloons (always above)
  layout.rows.bunting.forEach((b) => g.image(sprite[b.sprite], b.x, b.y + (b.x / 16 % 2 ? 1 : 0)));
  layout.rows.lights.forEach((l, i) => g.image(sprite[(floor(frameCount / 30) + i) % 2 ? 'lights_on' : 'lights_dim'], l.x, l.y));
  layout.balloons.forEach((b) => g.image(sprite[b.sprite], b.x, b.y + sin(frameCount * 0.05 + b.phase) * 2));
  const bf = imgs['../generated/ambient/butterfly_2frames_12x10.png'];
  butterflies.forEach((b) => g.image(frame('../generated/ambient/butterfly_2frames_12x10.png', 12, 10, floor(frameCount / 6) % 2, 0), b.x, b.y + sin(frameCount * 0.1 + b.a) * 2));

  drawHud();
  if (promptTrigger && !overlay) drawBubble(promptTrigger);
  const hov = hoveredTrigger();
  if (hov && !overlay && hov !== promptTrigger) drawTag(hov.title, hov.rect[0] + hov.rect[2] / 2, hov.rect[1] - 6);
  if (overlay) drawPoster();
  if (millis() < toastUntil) drawToast();
}

// Moo: 32x40 cells, rows = down / left / right / up, 4 frames each. Feet sit on the bottom row, centred on x.
function drawHero() {
  const moving = hero.tx !== null;
  const walk = [2, 0, 3, 0];
  const col = moving ? walk[floor(frameCount / 7) % 4] : (floor(frameCount / 90) % 4 === 3 ? 1 : 0);   // idle = slow blink
  g.image(frame('../sprites/moo/moo_sheet.png', 32, 40, col, hero.dir), round(hero.x) - 16, round(hero.y) - 40);
}

function txt(s, x, y, col, align) {
  g.textFont(font); g.textSize(14); g.textAlign(align || LEFT, TOP); g.noStroke(); g.fill(col); g.text(s, round(x), round(y));
}
function panel(x, y, w, h, fillc) {
  g.noStroke(); g.fill(107, 75, 91); g.rect(x - 2, y - 2, w + 4, h + 4);
  g.fill(182, 137, 98); g.rect(x - 1, y - 1, w + 2, h + 2);
  g.fill(fillc || color(247, 235, 170)); g.rect(x, y, w, h);
}
function drawHud() {
  panel(6, 6, 48, 16);
  g.image(sprite.ticket, 10, 8); txt('x ' + tickets, 30, 6, color(107, 75, 91));
}
function drawTag(s, cx, cy) {
  g.textFont(font); g.textSize(14);
  const w = round(g.textWidth(s) + 10), x = constrain(round(cx - w / 2), 4, 476 - w);
  panel(x, round(cy - 14), w, 16); txt(s, x + 5, cy - 14, color(107, 75, 91));
}
function drawBubble(t) {
  const label = t.id === 'poster' ? 'Pick a game! (P)' : 'Play ' + t.title + '? (Space)';
  const bob = sin(frameCount * 0.12) * 1.5;
  drawTag(label, hero.x, hero.y - 40 + bob);
}
function drawToast() {
  g.textFont(font); g.textSize(14);
  const w = round(g.textWidth(toast) + 14); panel(240 - round(w / 2), 244, w, 18, color(223, 240, 187));
  txt(toast, 240 - round(w / 2) + 7, 244, color(86, 101, 96));
}

// poster overlay: 4 cards (title on top, booth emblem + key hint below)
function cardRects() {
  const x0 = 80, y0 = 66, cw = 156, ch = 56;
  return layout.games.map((gm, i) => ({ gm, x: x0 + (i % 2) * (cw + 8), y: y0 + floor(i / 2) * (ch + 8), w: cw, h: ch }));
}
function drawPoster() {
  g.noStroke(); g.fill(0, 0, 0, 110); g.rect(0, 0, 480, 272);
  panel(70, 34, 340, 176);
  g.fill(189, 117, 126); g.rect(70, 34, 340, 22); txt("TODAY'S GAMES", 240, 38, color(243, 244, 231), CENTER);
  const mx = mouseX / SCALE, my = mouseY / SCALE;
  cardRects().forEach((c, i) => {
    const hov = mx > c.x && mx < c.x + c.w && my > c.y && my < c.y + c.h;
    const yy = round(c.y + (hov ? -2 + sin(frameCount * 0.3) : 0));
    panel(c.x, yy, c.w, c.h, color(232, 207, 166));
    txt(c.gm.title, c.x + 8, yy + 4, color(107, 75, 91));
    g.image(sprite['booth_' + c.gm.id], c.x + 8, yy + 26, 28, 24, 18, 1, 14, 12);     // booth emblem at 2x
    txt('press ' + (i + 1), c.x + 46, yy + 30, color(144, 98, 93));
  });
  txt('Esc to close', 240, 190, color(144, 98, 93), CENTER);
}

// ------------------------------------------------------------------ input
function hoveredTrigger() {
  const mx = mouseX / SCALE, my = mouseY / SCALE;
  return layout.triggers.find((t) => {
    if (t.id === 'poster') return false;
    const o = layout.objects.find((o) => o.id === 'booth_' + t.id); const [w, h] = [sprite[o.sprite].width, sprite[o.sprite].height];
    return mx > o.x && mx < o.x + w && my > o.y && my < o.y + h;
  }) || null;
}
function enter(id) {
  const gm = layout.games.find((x) => x.id === id);
  overlay = false;
  toast = 'Entering ' + gm.title + '... (hook your scene manager here)'; toastUntil = millis() + 2600; tickets++;
}
function mousePressed() {
  if (!ready) return;
  const mx = mouseX / SCALE, my = mouseY / SCALE;
  if (overlay) { const c = cardRects().find((c) => mx > c.x && mx < c.x + c.w && my > c.y && my < c.y + c.h); if (c) enter(c.gm.id); return; }
  const t = layout.triggers.find(({ rect: [x, y, w, h], id }) => mx > x - 10 && mx < x + w + 10 && my > y - 70 && my < y + h + 4);
  if (t) { hero.tx = t.stand[0]; hero.ty = t.stand[1]; return; }
  hero.tx = mx; hero.ty = my;
}
function keyPressed() {
  if (!ready) return;
  if (key === 'p' || key === 'P') overlay = !overlay;
  if (keyCode === ESCAPE) overlay = false;
  if (overlay && key >= '1' && key <= '4') enter(layout.games[int(key) - 1].id);
  if (key === ' ' && promptTrigger && !overlay) { if (promptTrigger.id === 'poster') overlay = true; else enter(promptTrigger.id); }
  return false;
}
