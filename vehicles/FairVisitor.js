/**
 * Visiteur / Mascotte animée du Hub (sous-classe de Vehicle).
 * Gère les routines quotidiennes individuelles (STROLL -> PAUSE -> CHAT) et les
 * interactions NPC-à-NPC avec émotes pixel animées (Tiny Neighbours Vol1) !
 * Tous les déplacements passent par BehaviorManager (wander + separation + avoid + boundaries).
 */
class FairVisitor extends Vehicle {
  constructor(x, y, kind, assets, options = {}) {
    const stationary = Boolean(options.stationary);
    const speed = stationary ? 0 : (kind === 'new_bunny' ? 0.72 : (kind === 'carrot' ? 0.56 : 0.48));
    super(x, y, speed, stationary ? 0 : 0.045);

    this.kind = kind;
    this.assets = assets;
    this.stationary = stationary;
    this.r = 7;
    this.name = options.name || 'Fairgoer';
    this.greeting = options.greeting || null;
    this.dialogue = options.dialogue || null; // { text, choices: [{ label, reply, action? }] }
    this.npcId = options.npcId || 1;       // 1..15 pour 'neighbour' (Tiny Neighbours Vol1)
    this.tone = options.tone || 0;         // 0..2 teinte dans la spritesheet Tiny Neighbours
    this.guestFile = options.guestFile || null; // Nom de fichier dans characters/npcs/guests/
    this.guestW = options.guestW || 32;
    this.guestH = options.guestH || 32;
    this.guestFrames = options.guestFrames || 4;
    this.guestDrawW = options.guestDrawW || this.guestW;
    this.guestDrawH = options.guestDrawH || this.guestH;
    this.trioMode = Boolean(options.trioMode); // Mode groupe synchronisé (Fun Gang : Kris, Ralsei, Susie)
    this.trioTarget = null;
    this.trioAction = null; // { file, w, h, frames, emote }
    this.trioFaceX = null;
    this.emote = options.emote || 'Happy'; // 'Heart' | 'Happy' | 'Star' | 'Exclamation' | 'Surprised' | 'Interrogation'
    this.emoteTimer = 0;
    this.bounds = options.bounds || [24, 136, 432, 86];
    this.phase = random(TWO_PI);
    this.facingLeft = Boolean(options.facingLeft);
    this.dirRow = 0; // 0=bas, 1=gauche, 2=droite, 3=haut
    this.showBubble = false;

    // Routine quotidienne vivante : WALK_TO_SPOT (arrive vers un stand) -> ADMIRE -> CHAT
    this.parkSpots = options.parkSpots || null;
    this.destSpot = null;
    this.destVec = null;
    this.routineState = stationary ? 'PAUSE' : 'STROLL';
    this.routineTimer = Math.floor(random(80, 220));
    this.chatPartner = null;
    this.chatCooldown = Math.floor(random(90, 220));
    this.chatEmote = this.emote;

    this.othersRef = [];
    this.obstaclesRef = [];

    if (!stationary) {
      this.vel = p5.Vector.random2D().mult(speed * 0.7);
      this.behaviors.add('wander', (v) => v.wander(), 1.1, true);
      this.behaviors.add('separation', (v) => v.separation(v.othersRef, 22), 1.4, true);
      this.behaviors.add('avoid', (v) => v.avoid(v.obstaclesRef), 2.1, true);
      this.behaviors.add('boundaries', (v) => {
        const [bx, by, bw, bh] = v.bounds;
        return v.boundaries(bx, by, bw, bh, 14);
      }, 2.3, true);
      if (this.parkSpots && this.parkSpots.length > 0 && !this.trioMode && this.kind !== 'new_bunny') {
        this.pickNextParkSpot();
      }
    }
  }

  /** Choisit un nouveau stand / attraction différent à visiter dans le parc. */
  pickNextParkSpot() {
    if (!this.parkSpots || this.parkSpots.length === 0) return;
    const candidates = this.parkSpots.filter((s) => s !== this.destSpot);
    const list = candidates.length > 0 ? candidates : this.parkSpots;
    const chosen = list[Math.floor(random(list.length))];
    this.destSpot = chosen;
    this.destVec = createVector(chosen.x + random(-14, 14), chosen.y + random(-6, 8));
    this.routineState = 'STROLL';
    this.routineTimer = Math.floor(random(420, 720)); // garde-fou anti-blocage
  }

  /** Démarre une petite conversation animée entre deux visiteurs qui se croisent. */
  startChatWith(other, emoteName) {
    this.routineState = 'CHAT';
    this.routineTimer = 125;
    this.chatPartner = other;
    this.chatEmote = emoteName;
    this.emoteTimer = 0;
    this.vel.mult(0);
    this.acc.mult(0);
    this.facingLeft = other.pos.x < this.pos.x;
    this.dirRow = this.facingLeft ? 1 : 2;
  }

  step(moo, others, obstacles) {
    this.othersRef = others || [];
    this.obstaclesRef = obstacles || [];
    if (this.chatCooldown > 0) this.chatCooldown--;

    if (this.trioMode) {
      // Mode groupe synchronisé (Fun Gang) : soit en train de faire une action ensemble, soit en marche groupée via arrive() !
      if (this.trioAction) {
        this.routineState = 'CHAT';
        this.vel.mult(0.75);
        this.acc.mult(0);
        this.emoteTimer++;
        if (this.trioFaceX !== null) {
          this.facingLeft = this.trioFaceX < this.pos.x;
        }
      } else if (this.trioTarget) {
        this.routineState = 'STROLL';
        this.maxSpeed = 0.72;
        const arr = this.arrive(this.trioTarget, 16);
        const av = this.avoid(this.obstaclesRef);
        const sep = this.separation(this.othersRef, 16);
        this.applyForce(arr.mult(1.35));
        this.applyForce(av.mult(1.8));
        this.applyForce(sep.mult(0.85));
        this.update();
        if (Math.abs(this.vel.x) > 0.05) this.facingLeft = this.vel.x < 0;
      }
    } else if (!this.stationary) {
      this.routineTimer--;

      if (this.routineState === 'CHAT') {
        this.emoteTimer++;
        if (this.chatPartner) {
          this.facingLeft = this.chatPartner.pos.x < this.pos.x;
          this.dirRow = this.facingLeft ? 1 : 2;
        }
        if (this.routineTimer <= 0) {
          this.routineState = 'STROLL';
          this.routineTimer = Math.floor(random(180, 340));
          this.chatPartner = null;
          this.chatCooldown = Math.floor(random(240, 420));
          this.vel = p5.Vector.random2D().mult(this.maxSpeed * 0.65);
        }
      } else if (this.routineState === 'PAUSE') {
        this.vel.mult(0.8);
        this.acc.mult(0);
        this.emoteTimer++;
        if (this.routineTimer <= 0) {
          if (this.parkSpots && this.parkSpots.length > 0 && this.kind !== 'new_bunny') {
            this.pickNextParkSpot();
          } else {
            this.routineState = 'STROLL';
            this.routineTimer = Math.floor(random(180, 360));
            this.vel = p5.Vector.random2D().mult(this.maxSpeed * 0.7);
          }
        }
      } else {
        // STROLL : déplacement vers un vrai stand/attraction (arrive + avoid + separation) au lieu de tourner en rond !
        if (this.destVec && this.kind !== 'new_bunny') {
          const arr = this.arrive(this.destVec, 18);
          const av = this.avoid(this.obstaclesRef);
          const sep = this.separation(this.othersRef, 20);
          this.applyForce(arr.mult(1.25));
          this.applyForce(av.mult(2.0));
          this.applyForce(sep.mult(1.0));
          this.update();

          const dxT = this.destVec.x - this.pos.x;
          const dyT = this.destVec.y - this.pos.y;
          if (dxT * dxT + dyT * dyT < 16 * 16 || this.routineTimer <= 0) {
            // Arrivé devant l'attraction : s'arrête pour l'admirer 3 à 6 secondes avec une émote !
            this.routineState = 'PAUSE';
            this.routineTimer = Math.floor(random(180, 360));
            this.dirRow = (this.destSpot && this.destSpot.lookUp) ? 3 : 0;
            this.chatEmote = (this.destSpot && this.destSpot.emote) ? this.destSpot.emote : this.emote;
            this.emoteTimer = 0;
            this.vel.mult(0);
          }
        } else {
          this.applyManagedBehaviors();
          this.update();
          const [bx, by, bw, bh] = this.bounds;
          this.pos.x = constrain(this.pos.x, bx, bx + bw);
          this.pos.y = constrain(this.pos.y, by, by + bh);
          if (this.routineTimer <= 0) {
            this.routineState = 'PAUSE';
            this.routineTimer = Math.floor(random(90, 170));
            this.dirRow = 0;
          }
        }

        if (Math.abs(this.vel.x) > 0.06) this.facingLeft = this.vel.x < 0;
        if (Math.abs(this.vel.x) > Math.abs(this.vel.y)) {
          this.dirRow = this.vel.x < 0 ? 1 : 2;
        } else if (Math.abs(this.vel.y) > 0.04) {
          this.dirRow = this.vel.y < 0 ? 3 : 0;
        }

        // Interaction NPC-à-NPC : deux visiteurs proches s'arrêtent pour échanger une émote !
        if (this.chatCooldown <= 0 && this.kind !== 'new_bunny' && others) {
          for (const other of others) {
            if (other === this || other.stationary || other.trioMode || other.kind === 'new_bunny') continue;
            if (other.routineState !== 'STROLL' || other.chatCooldown > 0) continue;
            const dx = other.pos.x - this.pos.x;
            const dy = other.pos.y - this.pos.y;
            if (dx * dx + dy * dy < 24 * 24) {
              const chatEmotes = ['Heart', 'Happy', 'Star', 'Exclamation'];
              const emA = chatEmotes[Math.floor(random(chatEmotes.length))];
              const emB = chatEmotes[Math.floor(random(chatEmotes.length))];
              this.startChatWith(other, emA);
              other.startChatWith(this, emB);
              break;
            }
          }
        }
      }
    } else if (moo) {
      this.facingLeft = moo.pos.x < this.pos.x;
    }

    // Bulle de dialogue & émote pixel animée quand Moo passe tout près !
    if (moo && (this.greeting || this.emote)) {
      const dx = moo.pos.x - this.pos.x;
      const dy = moo.pos.y - this.pos.y;
      const near = dx * dx + dy * dy < 38 * 38;
      if (near && !this.showBubble) this.emoteTimer = 0;
      this.showBubble = near;
      if (near) this.emoteTimer++;
    } else {
      this.showBubble = false;
    }
  }

  show(g) {
    const px = Math.round(this.pos.x);
    const py = Math.round(this.pos.y);
    const moving = !this.stationary && this.routineState === 'STROLL' && this.vel.magSq() > 0.015;

    // Ombre douce au sol
    g.push();
    g.noStroke();
    g.fill(68, 96, 62, 75);
    g.ellipse(px, py - 1, 14, 5);
    g.pop();

    g.push();
    g.translate(px, py);

    if (this.kind === 'neighbour') {
      const dirMap = [0, 1, 3, 2]; // 0=bas, 1=gauche, 2=droite, 3=haut -> ordre Tiny Neighbours
      const row = 1 + (this.tone % 3) * 4 + (dirMap[this.dirRow] || 0);
      const colBase = moving ? 4 : 0;
      const col = colBase + (Math.floor(frameCount / (moving ? 8 : 14) + this.phase) % 4);
      const sheet = 'characters/npcs/tiny_neighbours/NPC_' + this.npcId + '.png';
      const img = this.assets.getSheetFrame(sheet, 16, 16, col, row);
      if (img) g.image(img, -10, -21, 20, 20);
    } else if (this.kind === 'carrot') {
      const row = moving ? 2 : 1;
      const col = Math.floor(frameCount / 7 + this.phase) % (moving ? 7 : 6);
      const img = this.assets.getSheetFrame('characters/npcs/mr_carrot/carrot_sheet.png', 32, 32, col, row);
      if (this.facingLeft) g.scale(-1, 1);
      if (img) g.image(img, -16, -30);
    } else if (this.kind === 'guest_strip') {
      // Invités crossover animés (action spéciale de groupe si trioAction actif, sinon marche normale)
      const act = this.trioAction;
      const file = act ? act.file : this.guestFile;
      const fw = act ? (act.w || 32) : this.guestW;
      const fh = act ? (act.h || 32) : this.guestH;
      const frames = act ? (act.frames || 4) : this.guestFrames;
      const dw = act ? fw : this.guestDrawW;
      const dh = act ? fh : this.guestDrawH;
      const col = (moving || act) ? Math.floor(frameCount / (act ? (act.speed || 7) : 7) + this.phase) % frames : 0;
      const img = this.assets.getSheetFrame('characters/npcs/guests/' + file + '.png', fw, fh, col, 0);
      const bob = act ? Math.round(Math.sin(frameCount * 0.14 + this.phase) * 0.8) : (moving ? 0 : Math.round(Math.sin(frameCount * 0.08 + this.phase) * 0.6));
      if (this.facingLeft && (!act || act.allowFlip !== false)) g.scale(-1, 1);
      if (img) g.image(img, -Math.round(dw / 2), -dh + 2 + bob, dw, dh);
    } else if (this.kind === 'guest_single') {
      // Invités crossover 1-frame avec petit sautillement mignon en marchant (Luffy, Zoro, Chopper)
      const img = this.assets.getImage('characters/npcs/guests/' + this.guestFile + '.png');
      const hop = moving ? -Math.abs(Math.round(Math.sin(frameCount * 0.22 + this.phase) * 2.2)) : Math.round(Math.sin(frameCount * 0.08 + this.phase) * 0.6);
      if (this.facingLeft) g.scale(-1, 1);
      if (img) g.image(img, -16, -30 + hop);
    } else if (this.kind === 'girl') {
      // Ancienne entrée 'girl' redirigée proprement vers Tiny Neighbours Vol1
      const col = Math.floor(frameCount / 14 + this.phase) % 4;
      const img = this.assets.getSheetFrame('characters/npcs/tiny_neighbours/NPC_' + (this.npcId || 1) + '.png', 16, 16, col, 1);
      if (img) g.image(img, -10, -21, 20, 20);
    } else if (this.kind === 'new_bunny') {
      const row = moving ? (this.facingLeft ? 5 : 4) : 0;
      const col = Math.floor(frameCount / 6 + this.phase) % (moving ? 6 : 8);
      const img = this.assets.getSheetFrame('characters/animals/bunnies/bunny_anim.png', 32, 32, col, row);
      if (img) g.image(img, -16, -24);
    } else if (this.kind === 'fox_nap') {
      const row = this.showBubble ? 0 : 5;
      const col = Math.floor(frameCount / 12 + this.phase) % (this.showBubble ? 5 : 6);
      const img = this.assets.getSheetFrame('characters/animals/fox/fox_new_sheet.png', 32, 32, col, row);
      if (this.facingLeft) g.scale(-1, 1);
      if (img) g.image(img, -16, -26);
    } else {
      const col = moving ? Math.floor(frameCount / 9 + this.phase) % 4 : 0;
      const img = this.assets.getSheetFrame('characters/npcs/catboy/kid_4dir_sheet.png', 48, 48, col, this.dirRow);
      if (img) g.image(img, -24, -32);
    }

    g.pop();

    // Émotes animées uniquement (les dialogues texte ne s'ouvrent que quand le joueur appuie sur Space !)
    const bob = Math.sin(frameCount * 0.12) * 1.2;
    const pauseEmote = (this.routineState === 'PAUSE' && this.destSpot && this.emoteTimer < 95) ? this.chatEmote : null;
    const activeEmote = this.showBubble
      ? this.emote
      : (this.trioAction && this.trioAction.emote ? this.trioAction.emote : (this.routineState === 'CHAT' ? this.chatEmote : pauseEmote));
    if (activeEmote) {
      const emFrame = Math.min(3, Math.floor(this.emoteTimer / 4));
      const emPath = 'characters/npcs/tiny_neighbours/emotes/' + activeEmote + '_emote_16x16.png';
      const emImg = this.assets.getSheetFrame(emPath, 16, 16, emFrame, 0);
      if (emImg) {
        g.image(emImg, px - 8, py - 35 + Math.round(bob));
      }
    }

    if (Vehicle.debug && !this.stationary) {
      this.drawDebugVectors(g);
    }
  }
}
