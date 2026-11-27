/**
 * Scène principale du Hub : Moo's Funfair — Parc forain vivant en 3 ailes continues (0 chevauchement !).
 *
 * Plan spatial strict sur [-480 .. 960] :
 * - AILE OUEST  [-480 ..   0] : Chariot Barbe à Papa (interactif), Prize Booth détaillé (peluches & cadeaux),
 *                               Chariot Pop-Corn (interactif), cerisiers en fleurs, bancs & visiteurs.
 * - PLACE CŒUR  [   0 .. 480] : Arche MOO'S FUNFAIR illuminée, Grande Roue animée au centre (espace 124px libre),
 *                               4 stands de jeux à architectures distinctes (Derby, PokéMoo, Purins, Legend),
 *                               Coin Pique-nique (encas + chat endormi), Chat aux ballons, Panneau MAP,
 *                               Panneau GAMES (oiseau perché), Mare aux canetons (grenouille) & Vache.
 * - AILE EST    [ 480 .. 960] : Mini Carrousel animé (interactif !), Tente Tarot (SOON), Stand Anneaux (SOON),
 *                               Fontaine à vœux (interactive !), Renard endormi, Faon paisible & cerisiers.
 */
class HubScene extends Scene {
  constructor(game) {
    super(game);
    this.usesWideCamera = true;
    this.worldLeft = -480;
    this.worldRight = 960;
    this.camX = 0;

    this.moo = null;
    this.obstacles = [];
    this.solids = [];
    this.triggers = [];
    this.visitors = [];
    this.butterflies = [];
    this.ducklings = [];
    this.fx = [];
    this.ambientFlowers = [];
    this.ambientTrees = [];
    this.buntingRow = [];
    this.lightsRow = [];

    this.westGroundImg = null;
    this.plazaGroundImg = null;
    this.eastGroundImg = null;
    this.walkBounds = [-462, 114, 942, 234];

    this.promptTrigger = null;
    this.nearbyVisitor = null;
    this.activeDialogue = null; // { npc, speaker, text, choices, stage: 'ASK'|'REPLY' }
    this.wishModalOpen = false;
    this.overlay = false;
    this.mapOverlay = false;
    this.prizeShop = new PrizeShop(game);

    // Coordonnées maîtresses sans aucun chevauchement
    this.booths = [
      { id: 'derby',     title: 'Bunny Derby',       sprite: 'booth_derby',     x: 32,  y: 76, w: 50, h: 58 },
      { id: 'snake',     title: 'PokeMoo Feast!!',   sprite: 'booth_snake',     x: 122, y: 76, w: 50, h: 58 },
      { id: 'ducklings', title: 'Catch the Purins!', sprite: 'booth_ducklings', x: 308, y: 76, w: 50, h: 58 },
      { id: 'fox',       title: 'The Legend of Moo', sprite: 'booth_fox',       x: 398, y: 76, w: 50, h: 58 }
    ];
    this.prizeBoothPos    = { x: -265, y: 76,  w: 50, h: 58 };
    this.cottonCartPos    = { x: -408, y: 84,  w: 48, h: 50 };
    this.lemonadeCartPos  = { x: -336, y: 84,  w: 48, h: 50 };
    this.popcornCartPos   = { x: -120, y: 84,  w: 48, h: 50 };
    this.carouselPos      = { x: 542,  y: 66,  w: 72, h: 68 };
    this.stagePos         = { x: 676,  y: 66,  w: 84, h: 68 };
    this.creekX           = 790;
    this.ringsBoothPos    = { x: 854,  y: 76,  w: 50, h: 58, stripe: [192, 226, 166], label: 'RINGS' };
    this.fireworks        = [];
    this.fireworkTimer    = 90;
    this.cherryPetals     = [];

    this.mapBoardPos    = { x: 254,  y: 184, w: 24, h: 36 };
    this.posterPos      = { x: 286,  y: 148, w: 66, h: 82 };
    this.pondCenter     = { x: 404,  y: 214, rx: 38, ry: 19 };
    this.fountainPos    = { x: 578,  y: 204 };

    // Code secret Debug [H] : *** montre [+], n* cache [+]
    this.secretStarCount = 0;
    this.secretLastWasN = false;
    this.showTicketCheat = false;
    this.ticketPlusBtn = { x: 66, y: 6, w: 18, h: 16 };

    this.ambientSoundTimer = 260;
    this.toast = '';
    this.toastUntil = 0;
  }

  init(data = {}) {
    this.overlay = false;
    this.mapOverlay = false;
    this.promptTrigger = null;
    this.nearbyVisitor = null;
    this.activeDialogue = null;
    this.wishModalOpen = false;
    this.closeWishModal();
    this.fx = [];

    // 1. Sols pré-rendus propres & cohérents pour les 3 ailes [-480..0], [0..480], [480..960]
    this.buildAllWingGrounds();

    // 2. Collisions strictement alignées sur chaque structure (0 zone fantôme, 0 chevauchement)
    this.solids = [
      // Aile Ouest (Barbe à Papa, Limonade, Prize Boutique, Pop-Corn, Tables & Bancs)
      [this.cottonCartPos.x + 2,   this.cottonCartPos.y + 26,   44, 22],
      [this.lemonadeCartPos.x + 2, this.lemonadeCartPos.y + 26, 44, 22],
      [this.prizeBoothPos.x + 4,   this.prizeBoothPos.y + 36,   42, 22],
      [this.popcornCartPos.x + 2,  this.popcornCartPos.y + 26,  44, 22],
      [-386, 198, 22, 10], // Banc Ouest 1
      [-334, 204, 28, 14], // Table pique-nique 1
      [-194, 204, 28, 14], // Table pique-nique 2
      [-104, 198, 22, 10], // Banc Ouest 2

      // Place Centrale (4 stands + Grande Roue + Pique-nique + Chat + MAP + GAMES + Mare + Vache)
      ...this.booths.map((b) => [b.x + 4, b.y + 36, 42, 22]),
      [212, 118, 56, 18],  // Socle Grande Roue
      [34,  212, 18, 12],  // Panier pique-nique
      [146, 198, 20, 14],  // Chat aux ballons (kid_front)
      [this.mapBoardPos.x + 2, this.mapBoardPos.y + 24, 20, 10],
      [this.posterPos.x + 6,   this.posterPos.y + 66,   54, 14],
      [368, 196, 72, 36],  // Mare aux canetons
      [444, 188, 22, 14],  // Vache

      // Aile Est (Carrousel + Scène & Feux d'artifice + Mare aux nénuphars + Anneaux + Fontaine + Banc)
      [this.carouselPos.x + 6,   this.carouselPos.y + 42,   60, 26],
      [this.stagePos.x + 4,      this.stagePos.y + 42,      76, 24],
      [this.ringsBoothPos.x + 4, this.ringsBoothPos.y + 36, 42, 22],
      [this.fountainPos.x - 16,  this.fountainPos.y - 6,    32, 16],
      [804, 200, 48, 26],  // Mare aux nénuphars Est
      [690, 198, 22, 10]   // Banc Est
    ];

    this.obstacles = [];
    this.solids.forEach(([sx, sy, sw, sh]) => {
      for (const o of Obstacle.fromRect(sx, sy, sw, sh)) this.obstacles.push(o);
    });

    // 3. Zones d'interaction (4 Mini-jeux + Poster + MAP + Prize Shop + 4 Objets Interactifs !)
    this.triggers = [
      ...this.booths.map((b) => ({
        id: b.id,
        title: b.title,
        rect: [b.x - 2, b.y + 56, 54, 22],
        stand: [b.x + 25, b.y + 72]
      })),
      {
        id: 'poster',
        title: "Today's Games",
        rect: [this.posterPos.x - 4, this.posterPos.y + 64, this.posterPos.w + 8, 22],
        stand: [this.posterPos.x + 33, this.posterPos.y + 78]
      },
      {
        id: 'map',
        title: 'Funfair Map',
        rect: [this.mapBoardPos.x - 4, this.mapBoardPos.y + 28, 32, 20],
        stand: [this.mapBoardPos.x + 12, this.mapBoardPos.y + 44]
      },
      {
        id: 'prize',
        title: 'Prize Boutique',
        rect: [this.prizeBoothPos.x - 2, this.prizeBoothPos.y + 56, 54, 22],
        stand: [this.prizeBoothPos.x + 25, this.prizeBoothPos.y + 72]
      },
      {
        id: 'cotton_candy',
        title: 'Cotton Candy Cart',
        rect: [this.cottonCartPos.x - 2, this.cottonCartPos.y + 48, 52, 22],
        stand: [this.cottonCartPos.x + 24, this.cottonCartPos.y + 62]
      },
      {
        id: 'lemonade',
        title: 'Lemonade Stand',
        rect: [this.lemonadeCartPos.x - 2, this.lemonadeCartPos.y + 48, 52, 22],
        stand: [this.lemonadeCartPos.x + 24, this.lemonadeCartPos.y + 62]
      },
      {
        id: 'popcorn',
        title: 'Popcorn Cart',
        rect: [this.popcornCartPos.x - 2, this.popcornCartPos.y + 48, 52, 22],
        stand: [this.popcornCartPos.x + 24, this.popcornCartPos.y + 62]
      },
      {
        id: 'carousel',
        title: 'Mini Carousel',
        rect: [this.carouselPos.x - 2, this.carouselPos.y + 66, 76, 20],
        stand: [this.carouselPos.x + 36, this.carouselPos.y + 78]
      },
      {
        id: 'stage',
        title: 'Stage + Fireworks',
        rect: [this.stagePos.x - 2, this.stagePos.y + 66, this.stagePos.w + 4, 22],
        stand: [this.stagePos.x + 42, this.stagePos.y + 78]
      },
      {
        id: 'fountain',
        title: 'Wishing Fountain',
        rect: [this.fountainPos.x - 26, this.fountainPos.y - 16, 52, 34],
        stand: [this.fountainPos.x, this.fountainPos.y + 18]
      }
    ];

    // Pétales de cerisier flottants dans la prairie Ouest
    this.cherryPetals = [];
    for (let i = 0; i < 22; i++) {
      this.cherryPetals.push({
        x: random(-472, -210),
        y: random(76, 228),
        vx: random(-0.22, -0.06),
        vy: random(0.14, 0.34),
        phase: random(TWO_PI)
      });
    }
    this.fireworks = [];

    // 4. Décors animés (arbres, cerisiers, fleurs, guirlandes & lumières sur 3 ailes)
    this.buildParkDecor();

    // 5. Spawn de Moo
    let spawnX = 240;
    let spawnY = 162;
    if (data && data.fromBooth) {
      const trig = this.triggers.find((t) => t.id === data.fromBooth);
      if (trig && trig.stand) {
        spawnX = trig.stand[0];
        spawnY = trig.stand[1];
      }
    }
    this.moo = new Moo(spawnX, spawnY, this.game.assets);
    this.camX = this.computeTargetCamX();

    // 6. Canetons nageant dans la mare animée (cx=404, cy=214)
    this.ducklings = [
      new HubDuckling(392, 210, this.game.assets),
      new HubDuckling(412, 216, this.game.assets),
      new HubDuckling(402, 206, this.game.assets),
      new HubDuckling(416, 208, this.game.assets)
    ];
    for (const d of this.ducklings) {
      d.pondCenter = createVector(this.pondCenter.x, this.pondCenter.y);
      d.pondRadius = 24;
    }

    // 7. Visiteurs avec routines quotidiennes, conversations NPC-à-NPC et dialogues à choix [Space]
    this.visitors = [
      // Aile Ouest (Shopping & Gourmandises)
      new FairVisitor(-202, 138, 'girl', this.game.assets, {
        name: 'Lina', stationary: true, emote: 'Heart',
        dialogue: {
          text: "Welcome to the Prize Boutique, Moo! Looking for a new outfit today?",
          choices: [
            { label: '1. Show me the Prize Boutique!', reply: "Right away! Try on anything you like!", action: 'open_prize' },
            { label: '2. What accessory suits me?', reply: "The Flower Crown or Fairy Wings look magical on you!" }
          ]
        }
      }),
      new FairVisitor(-316, 158, 'carrot', this.game.assets, {
        name: 'Chef Carrot', bounds: [-420, 140, 260, 52], emote: 'Star',
        greeting: 'Fresh cotton candy & warm popcorn! Press Space at the carts!'
      }),
      new FairVisitor(-352, 166, 'neighbour', this.game.assets, {
        name: 'Clara', npcId: 4, tone: 0, emote: 'Happy', bounds: [-435, 142, 175, 52],
        greeting: 'The strawberry cotton candy here is the sweetest treat in town!'
      }),
      new FairVisitor(-172, 160, 'neighbour', this.game.assets, {
        name: 'Sora', npcId: 2, tone: 1, emote: 'Heart', bounds: [-240, 142, 165, 50],
        greeting: 'Your hoodie looks super cozy, Moo! I love your bunny ears.'
      }),
      new FairVisitor(-250, 198, 'new_bunny', this.game.assets, {
        name: 'Fluffy Bunny', bounds: [-320, 182, 160, 44], emote: 'Happy'
      }),

      // Place Centrale (Cœur animé de la fête foraine)
      new FairVisitor(212, 162, 'carrot', this.game.assets, {
        name: 'Mr. Carrot', bounds: [90, 142, 240, 44], emote: 'Star',
        dialogue: {
          text: "Hey Moo! Welcome to Moo's Funfair! What are you in the mood for?",
          choices: [
            { label: '1. Which mini-game is your favorite?', reply: "PokeMoo Feast!! Chasing Scorbunnies as Onix is so much fun!" },
            { label: '2. Tell me a funfair secret!', reply: "Press [T] anytime to watch the whole park glow in Sunset light!" }
          ]
        }
      }),
      new FairVisitor(84, 154, 'neighbour', this.game.assets, {
        name: 'Milo', npcId: 7, tone: 0, emote: 'Exclamation', bounds: [24, 142, 150, 40],
        dialogue: {
          text: "Bunny Derby is about to start! Are you betting on a racer?",
          choices: [
            { label: '1. Who is your lucky pick?', reply: "I always cheer for Peach or Mochi — 1st place pays 3x tickets!" },
            { label: '2. How do the bunnies steer?', reply: "They use raycast sensors and a TensorFlow.js neural network!" }
          ]
        }
      }),
      new FairVisitor(186, 150, 'neighbour', this.game.assets, {
        name: 'Noah', npcId: 11, tone: 1, emote: 'Happy', bounds: [120, 140, 160, 40],
        greeting: 'The Ferris wheel lights look extra dreamy at sunset!'
      }),
      new FairVisitor(334, 154, 'neighbour', this.game.assets, {
        name: 'Iris', npcId: 6, tone: 2, emote: 'Heart', bounds: [260, 142, 185, 40],
        greeting: 'Watch the little green frog by the pond — it flicks its tongue!'
      }),
      new FairVisitor(118, 174, 'new_bunny', this.game.assets, {
        name: 'Clover Bunny', bounds: [66, 154, 110, 38], emote: 'Happy'
      }),
      new FairVisitor(276, 160, 'kid', this.game.assets, {
        name: 'Toby', bounds: [190, 142, 170, 40], emote: 'Star',
        greeting: 'Press [M] anytime to open the Park Map and fast-travel!'
      }),

      // Aile Est (Manège, Fontaine & Prairie)
      new FairVisitor(628, 148, 'girl', this.game.assets, {
        name: 'Pip', stationary: true, emote: 'Happy',
        dialogue: {
          text: "Isn't the East Meadow peaceful? Have you visited our attractions?",
          choices: [
            { label: '1. Ring the Mini Carousel bell!', reply: "Ding-ding! Listen to the carousel chime!", action: 'ring_carousel' },
            { label: '2. Tell me about the Fountain!', reply: "Walk up to the Wishing Fountain and press Space to type a wish!" }
          ]
        }
      }),
      new FairVisitor(746, 198, 'fox_nap', this.game.assets, {
        name: 'Sleepy Fox', stationary: true, emote: 'Heart',
        dialogue: {
          text: "*Yawn*... Zzz... Oh, hello Moo... This meadow is so warm...",
          choices: [
            { label: '1. Gently pet the fox', reply: "*Happy tail wag!* Thank you, Moo! Good luck in the Legend of Moo!", action: 'pet_fox' },
            { label: '2. Let him keep napping', reply: "Zzz... Sweet dreams of golden tickets..." }
          ]
        }
      }),
      new FairVisitor(548, 164, 'neighbour', this.game.assets, {
        name: 'Leo', npcId: 9, tone: 0, emote: 'Surprised', bounds: [495, 142, 185, 50],
        greeting: 'I just tossed a wish into the fountain — it sparkled!'
      }),
      new FairVisitor(768, 158, 'neighbour', this.game.assets, {
        name: 'Maya', npcId: 13, tone: 2, emote: 'Interrogation', bounds: [670, 142, 225, 48],
        greeting: 'I cannot wait for the Tarot Tent and Ring Toss to open!'
      }),
      new FairVisitor(648, 166, 'kid', this.game.assets, {
        name: 'Benji', bounds: [560, 144, 180, 46], emote: 'Happy'
      }),
      new FairVisitor(812, 184, 'new_bunny', this.game.assets, {
        name: 'Meadow Bunny', bounds: [740, 154, 145, 54], emote: 'Heart'
      }),

      // === INVITÉS CROSSOVER SPÉCIAUX (Deltarune Fun Gang ensemble, OneShot, Hollow Knight, Zelda, One Piece) ===
      new FairVisitor(-376, 154, 'guest_strip', this.game.assets, {
        name: 'Chopper', guestFile: 'chopper_walk', guestW: 32, guestH: 32, guestFrames: 4,
        bounds: [-435, 138, 105, 48], emote: 'Heart',
        dialogue: {
          text: "COTTON CANDY!! Moo, this is the best funfair on the Grand Line!",
          choices: [
            { label: '1. Grab Cotton Candy together!', reply: "Yaaay! *Happy reindeer dance!* Here's to sweet snacks!", action: 'treat_cotton' },
            { label: '2. Have you seen Zoro?', reply: "He wandered off east again... I hope he didn't get lost!" }
          ]
        }
      }),
      // Fun Gang (Kris, Ralsei & Susie) en routine de groupe synchronisée (marchent ensemble + actions + boucle !)
      new FairVisitor(-258, 156, 'guest_strip', this.game.assets, {
        name: 'Kris', guestFile: 'kris_walk', guestW: 32, guestH: 36, guestFrames: 4,
        trioMode: true, bounds: [-450, 136, 1380, 74], emote: 'Star',
        greeting: '* (Kris holds up a shiny golden balloon while hanging out with Ralsei and Susie.)'
      }),
      new FairVisitor(-234, 158, 'guest_strip', this.game.assets, {
        name: 'Ralsei', guestFile: 'ralsei_walk', guestW: 32, guestH: 32, guestFrames: 4,
        trioMode: true, bounds: [-450, 136, 1380, 74], emote: 'Heart',
        greeting: 'Hello Moo! Kris, Susie and I are exploring every corner of your funfair together!'
      }),
      new FairVisitor(-280, 160, 'guest_strip', this.game.assets, {
        name: 'Susie', guestFile: 'susie_walk', guestW: 32, guestH: 34, guestFrames: 4,
        trioMode: true, bounds: [-450, 136, 1380, 74], emote: 'Exclamation',
        greeting: "Heh, stick with us! First snacks, then the Ferris wheel, then fireworks!"
      }),
      new FairVisitor(248, 170, 'guest_strip', this.game.assets, {
        name: 'Luffy', guestFile: 'luffy_walk', guestW: 32, guestH: 32, guestFrames: 4,
        bounds: [175, 146, 170, 46], emote: 'Exclamation',
        dialogue: {
          text: "Shishishi! Hey Moo! This funfair is awesome! Where's the meat?!",
          choices: [
            { label: '1. Try the snack carts in the West!', reply: "Awesome!! I'm gonna eat ALL the popcorn and cotton candy!" },
            { label: '2. Race in Bunny Derby!', reply: "A race?! Count me in — I'm gonna be King of the Funfair!" }
          ]
        }
      }),
      new FairVisitor(386, 148, 'guest_strip', this.game.assets, {
        name: 'Link', guestFile: 'link_walk', guestW: 32, guestH: 32, guestFrames: 6,
        bounds: [320, 138, 130, 42], emote: 'Star',
        dialogue: {
          text: "HUT! HYAAH! ... Hup! Hyaa!",
          choices: [
            { label: '1. Any tips for the boss?', reply: "HYAAH! HUP! HUT-HUT! SEIYAAH!" },
            { label: '2. Cool green tunic!', reply: "Heh! ... Hup! HYAA!" }
          ]
        }
      }),
      new FairVisitor(688, 176, 'guest_strip', this.game.assets, {
        name: 'Niko', guestFile: 'niko_walk', guestW: 32, guestH: 32, guestFrames: 4,
        bounds: [625, 150, 135, 52], emote: 'Star',
        dialogue: {
          text: "Whoa, Moo! This Wishing Fountain glows almost as warmly as my Sun!",
          choices: [
            { label: '1. Make a wish at the Fountain!', reply: "I wish for pancakes for everyone at the funfair!", action: 'open_wish' },
            { label: '2. Keep the Sun safe, Niko!', reply: "I will! And thank you for showing me around!" }
          ]
        }
      }),
      new FairVisitor(584, 156, 'guest_strip', this.game.assets, {
        name: 'The Knight', guestFile: 'knight_walk', guestW: 32, guestH: 32, guestFrames: 4,
        bounds: [515, 140, 140, 48], emote: 'Interrogation',
        greeting: '... (The tiny vessel quietly admires the spinning pastel carousel.)'
      }),
      new FairVisitor(862, 166, 'guest_strip', this.game.assets, {
        name: 'Zoro', guestFile: 'zoro_walk', guestW: 32, guestH: 32, guestFrames: 4,
        bounds: [805, 144, 115, 54], emote: 'Interrogation',
        greeting: "Wait... how did I end up at a funfair? Which way is the Sunny?!"
      })
    ];

    // Attribuer de vrais points d'intérêt du parc à chaque visiteur mobile (finit les cercles sur place !)
    const westSpots = [
      { x: -384, y: 150, lookUp: true,  emote: 'Heart' },       // Cotton Candy
      { x: -312, y: 150, lookUp: true,  emote: 'Happy' },       // Lemonade
      { x: -240, y: 152, lookUp: true,  emote: 'Star' },        // Prize Boutique
      { x: -334, y: 184, lookUp: false, emote: 'Happy' },       // Picnic Table 1
      { x: -194, y: 184, lookUp: false, emote: 'Heart' },       // Picnic Table 2
      { x: -96,  y: 150, lookUp: true,  emote: 'Exclamation' }  // Popcorn Cart
    ];
    const plazaSpots = [
      { x: 57,   y: 152, lookUp: true,  emote: 'Exclamation' }, // Bunny Derby
      { x: 147,  y: 152, lookUp: true,  emote: 'Star' },        // PokeMoo Feast
      { x: 240,  y: 160, lookUp: true,  emote: 'Heart' },       // Ferris Wheel
      { x: 318,  y: 178, lookUp: false, emote: 'Interrogation' }, // Games Board
      { x: 333,  y: 152, lookUp: true,  emote: 'Happy' },       // Catch the Purins
      { x: 423,  y: 152, lookUp: true,  emote: 'Star' },        // Legend of Moo
      { x: 374,  y: 184, lookUp: false, emote: 'Heart' }        // Duck Pond
    ];
    const eastSpots = [
      { x: 578,  y: 154, lookUp: true,  emote: 'Star' },        // Mini Carousel
      { x: 578,  y: 182, lookUp: false, emote: 'Heart' },       // Wishing Fountain
      { x: 718,  y: 154, lookUp: true,  emote: 'Exclamation' }, // Stage + Fireworks
      { x: 800,  y: 158, lookUp: false, emote: 'Happy' },       // Wooden Bridge
      { x: 874,  y: 154, lookUp: true,  emote: 'Interrogation' } // Ring Toss
    ];
    const allSpots = westSpots.concat(plazaSpots, eastSpots);

    for (const v of this.visitors) {
      if (v.stationary || v.trioMode || v.kind === 'new_bunny') continue;
      if (v.name === 'Zoro') v.parkSpots = allSpots; // Zoro se perd dans TOUT le parc !
      else if (v.name === 'Chopper') v.parkSpots = westSpots;
      else if (v.name === 'Luffy') v.parkSpots = westSpots.concat(plazaSpots);
      else if (v.pos.x < 0) v.parkSpots = westSpots.concat(plazaSpots.slice(0, 2));
      else if (v.pos.x > 480) v.parkSpots = eastSpots.concat(plazaSpots.slice(4));
      else v.parkSpots = plazaSpots.concat(westSpots.slice(4), eastSpots.slice(0, 2));
      v.pickNextParkSpot();
      // Décaler le départ de chacun (certains admirent déjà un stand, d'autres marchent)
      if (Math.random() < 0.45) {
        v.routineState = 'PAUSE';
        v.routineTimer = Math.floor(random(60, 220));
      }
    }

    // Initialiser la tournée synchronisée du Trio Fun Gang (Kris, Ralsei, Susie)
    this.funGang = {
      kris:   this.visitors.find((v) => v.name === 'Kris'),
      ralsei: this.visitors.find((v) => v.name === 'Ralsei'),
      susie:  this.visitors.find((v) => v.name === 'Susie'),
      phase: 'HANGOUT', // 'HANGOUT' | 'WALK'
      stopIdx: 0,
      timer: 320,
      stops: [
        { x: -255, y: 158, mode: 'SNACK',  label: 'West Snacks' },
        { x: -355, y: 162, mode: 'PICNIC', label: 'Sweet Street' },
        { x: 228,  y: 160, mode: 'CHEER',  label: 'Ferris Plaza' },
        { x: 716,  y: 158, mode: 'PARTY',  label: 'Concert Stage' }
      ]
    };
    this.applyFunGangHangoutActions();

    // 8. Papillons répartis sur tout le parc
    this.butterflies = [];
    for (let i = 0; i < 12; i++) {
      this.butterflies.push(new HubButterfly(random(-430, 910), random(108, 226), this.game.assets));
    }

    this.game.sound.playMusic('hub');
    if (data && data.toast) this.showToast(data.toast, 2600);
  }

  /** Pré-rend les 3 sols du parc dans un style 100% unifié, sans aucun décalage ni chevauchement. */
  buildAllWingGrounds() {
    if (this.westGroundImg && this.plazaGroundImg && this.eastGroundImg) return;
    const baseGround = this.game.assets.getImage('world/hub/hub_ground.png');
    const grass = [156, 204, 102];

    const makeSection = (section) => {
      const img = createGraphics(BUFFER_W, BUFFER_H);
      img.pixelDensity(1);
      img.noSmooth();
      img.background(grass[0], grass[1], grass[2]);
      img.noStroke();

      // Douces plaques d'herbe nuancées pour donner du relief
      img.fill(146, 194, 94);
      for (let i = 0; i < 18; i++) {
        const px = ((i * 89 + (section === 'west' ? 17 : section === 'east' ? 41 : 7)) % 440) + 20;
        const py = ((i * 53 + 104) % 126) + 102;
        img.ellipse(px, py, 34 + (i % 3) * 10, 14 + (i % 2) * 6);
      }

      // Grande allée sable continue reliant les 3 ailes (y = 136..174)
      img.fill(210, 184, 138);
      img.rect(0, 134, BUFFER_W, 42);
      img.fill(232, 210, 166);
      img.rect(0, 137, BUFFER_W, 36);
      // Petits galets décoratifs sur l'allée
      img.fill(218, 194, 148);
      for (let gx = 12; gx < BUFFER_W; gx += 26) {
        img.rect(gx, 143 + (gx % 5), 4, 2, 1);
        img.rect(gx + 12, 163 - (gx % 4), 3, 2, 1);
      }

      if (section === 'west') {
        // Parvis propres devant Barbe à Papa, Prize Boutique & Pop-Corn
        img.fill(232, 210, 166);
        img.rect(64,  126, 64, 18, 6);
        img.rect(206, 124, 68, 22, 6);
        img.rect(352, 126, 64, 18, 6);
      } else if (section === 'plaza') {
        // Place circulaire pavée au centre de la fête foraine + allée d'entrée sud
        img.fill(210, 184, 138);
        img.ellipse(240, 166, 118, 72);
        img.rect(222, 174, 36, 98);
        img.fill(232, 210, 166);
        img.ellipse(240, 166, 110, 64);
        img.rect(225, 174, 30, 98);
        // Parvis devant les 4 stands de jeux
        for (const bx of [24, 114, 300, 390]) {
          img.rect(bx, 126, 66, 18, 6);
        }
        // Bassin de la mare aux canetons (cx=404, cy=214)
        img.fill(107, 75, 91, 140);
        img.ellipse(404, 215, 80, 42);
        img.fill(128, 194, 218);
        img.ellipse(404, 214, 76, 38);
        img.fill(164, 218, 236);
        img.ellipse(396, 210, 44, 20);
      } else {
        // Aile Est : parvis devant Carrousel, Tarot, Anneaux + placette de la fontaine
        img.fill(232, 210, 166);
        img.rect(54,  124, 86, 20, 8);
        img.rect(218, 126, 64, 18, 6);
        img.rect(348, 126, 64, 18, 6);
        img.fill(210, 184, 138);
        img.ellipse(98, 206, 62, 34);
        img.fill(232, 210, 166);
        img.ellipse(98, 206, 56, 28);
      }

      // Clôture en bois chaleureuse Sprout Lands le long du bord sud (y=240..254) — zéro rocher !
      // Herbe douce + petites touches de fleurs sous la clôture (y=252..272)
      img.fill(142, 190, 92);
      img.rect(0, 248, BUFFER_W, 24);
      for (let fx = 10; fx < BUFFER_W; fx += 28) {
        if (section === 'plaza' && fx >= 210 && fx <= 270) continue;
        img.fill(124, 174, 82);
        img.ellipse(fx + 6, 260, 14, 6);
        img.fill((fx % 56 === 10) ? img.color(248, 174, 198) : img.color(255, 238, 144));
        img.rect(fx + 4, 258, 2, 2);
        img.rect(fx + 9, 261, 2, 2);
      }

      const drawHorizontalFenceSegment = (xStart, xEnd) => {
        if (xEnd <= xStart) return;
        // Ombre douce au pied de la clôture
        img.fill(98, 142, 72, 110);
        img.rect(xStart, 251, xEnd - xStart, 4);
        // 2 traverses horizontales en bois (haut + bas)
        img.fill(107, 75, 91);
        img.rect(xStart, 241, xEnd - xStart, 4);
        img.rect(xStart, 247, xEnd - xStart, 4);
        img.fill(204, 158, 112);
        img.rect(xStart, 242, xEnd - xStart, 2);
        img.rect(xStart, 248, xEnd - xStart, 2);
        // Poteaux verticaux réguliers tous les 16px
        for (let px = xStart; px <= xEnd - 4; px += 16) {
          img.fill(107, 75, 91);
          img.rect(px, 237, 6, 16, 1);
          img.fill(222, 178, 130);
          img.rect(px + 1, 238, 4, 14);
          img.fill(244, 214, 168);
          img.rect(px + 1, 238, 4, 2);
        }
      };

      if (section === 'plaza') {
        // Ouverture d'entrée centrale de la fête foraine (x = 212 .. 268) !
        drawHorizontalFenceSegment(0, 210);
        drawHorizontalFenceSegment(270, BUFFER_W);

        // Deux beaux piliers d'entrée bois + lanternes dorées + petits buissons fleuris
        for (const gx of [208, 264]) {
          img.fill(96, 140, 70, 120);
          img.ellipse(gx + 4, 253, 14, 5);
          img.fill(107, 75, 91);
          img.rect(gx, 232, 9, 22, 1);
          img.fill(206, 158, 110);
          img.rect(gx + 1, 233, 7, 20);
          img.fill(242, 212, 164);
          img.rect(gx + 1, 233, 3, 20);
          // Petite lanterne chaleureuse au sommet du pilier d'entrée
          img.fill(107, 75, 91);
          img.rect(gx + 1, 226, 7, 7, 1);
          img.fill(255, 240, 156);
          img.rect(gx + 2, 227, 5, 5);
          img.fill(255, 252, 224);
          img.rect(gx + 3, 228, 3, 3);
        }
      } else {
        drawHorizontalFenceSegment(section === 'west' ? 12 : 0, section === 'east' ? BUFFER_W - 12 : BUFFER_W);
      }

      // Bords Ouest & Est paysagers : haies fleuries + vraie clôture bois verticale continue + lanternes d'extrémité
      if (section === 'west' || section === 'east') {
        const isW = section === 'west';
        const hedgeX = isW ? 0 : BUFFER_W - 12;
        const fenceX = isW ? 10 : BUFFER_W - 16;

        // Haie verdoyante fleurie tout le long du bord extérieur
        for (let hy = 98; hy < 258; hy += 14) {
          img.fill(88, 138, 72);
          img.ellipse(hedgeX + 6, hy + 4, 18, 16);
          img.fill(118, 174, 92);
          img.ellipse(hedgeX + 6, hy + 2, 14, 13);
          img.fill((hy % 28 === 0) ? img.color(248, 170, 196) : img.color(255, 234, 138));
          img.rect(hedgeX + (isW ? 4 : 6), hy, 2, 2);
        }

        // Clôture bois verticale continue reliant le haut de la prairie au bord sud
        img.fill(107, 75, 91);
        img.rect(fenceX + 1, 102, 4, 144);
        img.fill(204, 158, 112);
        img.rect(fenceX + 2, 102, 2, 144);
        for (let py = 102; py <= 238; py += 17) {
          img.fill(107, 75, 91);
          img.rect(fenceX, py, 6, 12, 1);
          img.fill(222, 178, 130);
          img.rect(fenceX + 1, py + 1, 4, 10);
          img.fill(244, 214, 168);
          img.rect(fenceX + 1, py + 1, 4, 2);
        }

        // Petits poteaux lanternes encadrant la fin de l'allée sable (y = 130 & y = 176)
        for (const ly of [130, 174]) {
          img.fill(107, 75, 91);
          img.rect(fenceX, ly - 5, 6, 6, 1);
          img.fill(255, 240, 156);
          img.rect(fenceX + 1, ly - 4, 4, 4);
        }
      }
      return img;
    };

    this.westGroundImg  = makeSection('west');
    this.plazaGroundImg = makeSection('plaza');
    this.eastGroundImg  = makeSection('east');
  }

  /** Construit les arbres, cerisiers, fleurs animées et guirlandes sans aucun chevauchement. */
  buildParkDecor() {
    this.ambientTrees = [
      // Arrière-plan Ouest
      { kind: 'cherry_big', x: -468, y: 52, sortY: 96 },
      { kind: 'tree_round', x: -344, y: 66, sortY: 96 },
      { kind: 'cherry_med', x: -196, y: 64, sortY: 96 },
      { kind: 'tree_tall',  x: -48,  y: 66, sortY: 96 },
      // Arrière-plan Place Centrale (encadre proprement les 4 stands & l'arche)
      { kind: 'tree_round', x: -2,   y: 66, sortY: 96 },
      { kind: 'tree_apple', x: 86,   y: 66, sortY: 96 },
      { kind: 'tree_apple', x: 360,  y: 66, sortY: 96 },
      { kind: 'tree_round', x: 452,  y: 66, sortY: 96 },
      // Arrière-plan Est
      { kind: 'tree_tall',  x: 500,  y: 66, sortY: 96 },
      { kind: 'cherry_big', x: 632,  y: 52, sortY: 96 },
      { kind: 'tree_apple', x: 778,  y: 66, sortY: 96 },
      { kind: 'cherry_med', x: 904,  y: 64, sortY: 96 }
    ];

    this.ambientFlowers = [
      { sprite: 'flower_pink',   x: -436, y: 204, phase: 0.2 },
      { sprite: 'flower_yellow', x: -346, y: 214, phase: 1.1 },
      { sprite: 'flower_blue',   x: -178, y: 212, phase: 2.0 },
      { sprite: 'flower_pink',   x: -64,  y: 206, phase: 2.9 },
      { sprite: 'flower_yellow', x: 108,  y: 218, phase: 0.6 },
      { sprite: 'flower_pink',   x: 184,  y: 218, phase: 1.8 },
      { sprite: 'flower_blue',   x: 206,  y: 224, phase: 2.5 },
      { sprite: 'flower_yellow', x: 516,  y: 214, phase: 0.9 },
      { sprite: 'flower_pink',   x: 646,  y: 216, phase: 1.7 },
      { sprite: 'flower_blue',   x: 804,  y: 218, phase: 3.1 },
      { sprite: 'flower_yellow', x: 906,  y: 212, phase: 4.0 }
    ];

    this.buntingRow = [];
    this.lightsRow = [];
    let idx = 0;
    for (let bx = -480; bx < 960; bx += 16) {
      this.buntingRow.push({ sprite: idx % 2 === 0 ? 'bunting_a' : 'bunting_b', x: bx });
      this.lightsRow.push({ x: bx, y: 242, idx });
      idx++;
    }
  }

  computeTargetCamX() {
    const vw = this.game.viewW || BUFFER_W;
    const minCam = this.worldLeft;
    const maxCam = Math.max(minCam, this.worldRight - vw);
    if (!this.moo) return constrain((BUFFER_W - vw) / 2, minCam, maxCam);
    return constrain(this.moo.pos.x - vw / 2, minCam, maxCam);
  }

  showToast(msg, durationMs = 2400) {
    this.toast = msg;
    this.toastUntil = millis() + durationMs;
  }

  update() {
    if (this.overlay || this.mapOverlay || this.activeDialogue || this.wishModalOpen || (this.prizeShop && this.prizeShop.open)) return;

    this.moo.step(this.solids, this.walkBounds);

    // Glissement de caméra continu ultra-fluide
    const dt = Math.min(0.05, (typeof deltaTime === 'number' ? deltaTime : 16.6) / 1000);
    const smooth = 1 - Math.exp(-7.5 * dt);
    const targetCamX = this.computeTargetCamX();
    this.camX += (targetCamX - this.camX) * smooth;
    if (Math.abs(targetCamX - this.camX) < 0.08) this.camX = targetCamX;

    // Mise à jour du Trio Fun Gang (boucle synchronisée : action ensemble -> marche groupée -> spot suivant)
    this.updateFunGangTrio();

    // Mise à jour de toute la faune et des visiteurs (Steering Behaviors + routines + NPC-à-NPC)
    for (const v of this.visitors) v.step(this.moo, this.visitors, this.obstacles);
    for (const d of this.ducklings) d.step(this.ducklings);
    for (const b of this.butterflies) b.step(this.moo);
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].update();
      if (this.fx[i].isDead) this.fx.splice(i, 1);
    }

    // Pétales de cerisier qui tourbillonnent doucement dans l'Aile Ouest
    for (const pt of this.cherryPetals) {
      pt.x += pt.vx + Math.sin(frameCount * 0.04 + pt.phase) * 0.14;
      pt.y += pt.vy;
      if (pt.y > 234 || pt.x < -478) {
        pt.x = random(-465, -205);
        pt.y = random(64, 92);
      }
    }

    // Feux d'artifice au-dessus de la Scène (automatiques si les 4 tampons sont complétés !)
    const st = this.game.save && this.game.save.data && this.game.save.data.stars;
    const allStamped = st && st.derby > 0 && st.snake > 0 && st.ducklings > 0 && st.fox > 0;
    if (allStamped) {
      this.fireworkTimer--;
      if (this.fireworkTimer <= 0) {
        this.launchFirework(this.stagePos.x + random(14, 70), random(20, 48));
        this.fireworkTimer = Math.floor(random(140, 240));
      }
    }
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];
      if (!fw.burst) {
        fw.y += fw.vy;
        if (fw.y <= fw.targetY) {
          fw.burst = true;
          fw.sparks = [];
          for (let k = 0; k < 18; k++) {
            const a = (TWO_PI * k) / 18 + random(-0.12, 0.12);
            const sp = random(0.7, 2.0);
            fw.sparks.push({ x: fw.x, y: fw.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: random(26, 44) });
          }
        }
      } else {
        for (let k = fw.sparks.length - 1; k >= 0; k--) {
          const sp = fw.sparks[k];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.032;
          sp.vx *= 0.97;
          sp.life--;
          if (sp.life <= 0) fw.sparks.splice(k, 1);
        }
        if (fw.sparks.length === 0) this.fireworks.splice(i, 1);
      }
    }

    // Sons d'ambiance discrets de fête foraine (gazouillis près de la mare)
    this.ambientSoundTimer--;
    if (this.ambientSoundTimer <= 0) {
      this.ambientSoundTimer = Math.floor(random(340, 560));
      const dPond = dist(this.moo.pos.x, this.moo.pos.y, this.pondCenter.x, this.pondCenter.y);
      if (dPond < 110) {
        this.game.sound.playSfx('squeak_1', 0.25);
      }
    }

    // Détection de la zone d'interaction devant Moo
    const prevTrigger = this.promptTrigger;
    this.promptTrigger =
      this.triggers.find(({ rect: [x, y, w, h] }) =>
        this.moo.pos.x > x && this.moo.pos.x < x + w &&
        this.moo.pos.y > y && this.moo.pos.y < y + h
      ) || null;

    // Détection du visiteur le plus proche auquel Moo peut parler avec [Space]
    this.nearbyVisitor = null;
    let bestD2 = 38 * 38;
    for (const v of this.visitors) {
      if (!v.greeting && !v.dialogue) continue;
      const dx = v.pos.x - this.moo.pos.x;
      const dy = v.pos.y - this.moo.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        this.nearbyVisitor = v;
      }
    }

    if (
      this.promptTrigger &&
      this.promptTrigger !== prevTrigger &&
      ['derby', 'snake', 'ducklings', 'fox'].includes(this.promptTrigger.id)
    ) {
      const awarded = this.game.save.claimFirstVisitBonus(this.promptTrigger.id);
      if (awarded) {
        this.game.sound.playSfx('success_bell', 0.8);
        this.showToast('First visit to ' + this.promptTrigger.title + '! +2 tickets', 2600);
      }
    }
  }

  /** Ouvre la boîte de dialogue RPG avec un NPC (salutation ou choix multiples). */
  startNpcDialogue(npc) {
    if (!npc) return;
    this.moo.stop();
    npc.facingLeft = this.moo.pos.x < npc.pos.x;
    this.game.sound.playSfx('ui_click', 0.7);
    if (npc.dialogue) {
      this.activeDialogue = {
        npc,
        speaker: npc.name,
        text: npc.dialogue.text,
        choices: npc.dialogue.choices || [],
        stage: 'ASK',
        pendingAction: null
      };
    } else if (npc.greeting) {
      this.activeDialogue = {
        npc,
        speaker: npc.name,
        text: npc.greeting,
        choices: [],
        stage: 'REPLY',
        pendingAction: null
      };
    }
  }

  /** Valide un choix dans la conversation avec un NPC. */
  pickDialogueChoice(idx) {
    if (!this.activeDialogue || this.activeDialogue.stage !== 'ASK') return;
    const ch = this.activeDialogue.choices[idx];
    if (!ch) return;
    this.game.sound.playSfx('success_bell', 0.55);
    this.activeDialogue.text = ch.reply;
    this.activeDialogue.stage = 'REPLY';
    this.activeDialogue.pendingAction = ch.action || null;
    if (ch.action === 'pet_fox' && this.activeDialogue.npc) {
      for (let i = 0; i < 8; i++) {
        this.fx.push(new SparkleFX(this.activeDialogue.npc.pos.x + random(-8, 8), this.activeDialogue.npc.pos.y - 16, 'sparkle'));
      }
    }
  }

  /** Ferme la boîte de dialogue (et exécute l'action éventuelle du choix). */
  closeDialogue() {
    if (!this.activeDialogue) return;
    const action = this.activeDialogue.pendingAction;
    this.activeDialogue = null;
    this.game.sound.playSfx('ui_click', 0.6);
    if (action === 'open_prize') this.prizeShop.show();
    else if (action === 'ring_carousel') this.interactWithProp('carousel');
    else if (action === 'treat_cotton') this.interactWithProp('cotton_candy');
    else if (action === 'open_wish') this.interactWithProp('fountain');
  }

  /** Ouvre la fenêtre de saisie de vœu de la Fontaine à Vœux ! */
  openWishModal() {
    const modal = document.getElementById('wish-modal');
    const input = document.getElementById('wish-input');
    const subBtn = document.getElementById('wish-submit');
    const canBtn = document.getElementById('wish-cancel');
    if (!modal || !input) {
      this.completeWish('a wonderful funfair day');
      return;
    }
    this.moo.stop();
    this.wishModalOpen = true;
    input.value = '';
    modal.classList.add('open');
    setTimeout(() => input.focus(), 30);

    const doSubmit = () => {
      const txt = input.value.trim();
      this.closeWishModal();
      this.completeWish(txt || 'a lucky secret wish');
    };
    const doCancel = () => this.closeWishModal();

    subBtn.onclick = (e) => { e.stopPropagation(); doSubmit(); };
    canBtn.onclick = (e) => { e.stopPropagation(); doCancel(); };
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); doSubmit(); }
      else if (e.key === 'Escape') { e.preventDefault(); doCancel(); }
    };
  }

  closeWishModal() {
    this.wishModalOpen = false;
    const modal = document.getElementById('wish-modal');
    if (modal) modal.classList.remove('open');
  }

  completeWish(wishText) {
    if (this.game.save && this.game.save.data) {
      this.game.save.data.lastWish = wishText;
      this.game.save.save();
    }
    this.game.sound.playSfx('success_bell', 0.75);
    for (let i = 0; i < 14; i++) {
      this.fx.push(new SparkleFX(this.fountainPos.x + random(-10, 10), this.fountainPos.y - 8, 'sparkle'));
    }
    this.fx.push(new SparkleFX(this.fountainPos.x, this.fountainPos.y - 18, 'text', 'WISH SENT!', color(255, 242, 150)));
    this.showToast('Your wish "' + wishText + '" sparkles in the fountain!', 3200);
  }

  /** Déclenche une interaction joyeuse avec les objets environnementaux du parc. */
  interactWithProp(id) {
    if (id === 'fountain') {
      this.openWishModal();
    } else if (id === 'cotton_candy') {
      this.game.sound.playSfx('squeak_2', 0.55);
      for (let i = 0; i < 8; i++) {
        this.fx.push(new SparkleFX(this.moo.pos.x + random(-8, 8), this.moo.pos.y - 18, 'confetti'));
      }
      this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 26, 'text', 'YUM!', color(252, 178, 206)));
      this.showToast('Fluffy strawberry cotton candy! So sweet!', 2000);
    } else if (id === 'popcorn') {
      this.game.sound.playSfx('squeak_double_1', 0.55);
      for (let i = 0; i < 10; i++) {
        this.fx.push(new SparkleFX(this.popcornCartPos.x + 24 + random(-8, 8), this.popcornCartPos.y + 18, 'sparkle'));
      }
      this.fx.push(new SparkleFX(this.moo.pos.x, this.moo.pos.y - 26, 'text', 'POP POP!', color(255, 232, 128)));
      this.showToast('Warm buttered carnival popcorn!', 2000);
    } else if (id === 'carousel') {
      this.game.sound.playSfx('success_bell', 0.7);
      for (let i = 0; i < 12; i++) {
        this.fx.push(new SparkleFX(this.carouselPos.x + 36 + random(-22, 22), this.carouselPos.y + 24, 'confetti'));
      }
      this.fx.push(new SparkleFX(this.carouselPos.x + 36, this.carouselPos.y + 4, 'text', 'DING-DING!', color(255, 244, 166)));
      this.showToast('The Mini Carousel chimes merrily!', 2000);
    } else if (id === 'lemonade') {
      this.game.sound.playSfx('success_bell', 0.65);
      for (let i = 0; i < 8; i++) {
        this.fx.push(new SparkleFX(this.lemonadeCartPos.x + 24 + random(-14, 14), this.lemonadeCartPos.y + 18, 'sparkle'));
      }
      this.fx.push(new SparkleFX(this.lemonadeCartPos.x + 24, this.lemonadeCartPos.y + 2, 'text', 'ZESTY!', color(255, 240, 128)));
      this.showToast('Chilled sparkling funfair lemonade!', 2000);
    } else if (id === 'stage') {
      this.game.sound.playSfx('success_bell', 0.85);
      for (let k = 0; k < 3; k++) {
        this.launchFirework(this.stagePos.x + 16 + k * 26 + random(-6, 6), random(16, 44));
      }
      this.fx.push(new SparkleFX(this.stagePos.x + 42, this.stagePos.y - 2, 'text', 'FIREWORKS!', color(255, 232, 136)));
      this.showToast('Boom! Funfair Fireworks Show!', 2200);
    }
  }

  /** Lance une fusée de feu d'artifice pastel au-dessus de la scène. */
  launchFirework(x, targetY) {
    const palettes = [
      [255, 148, 178],
      [255, 232, 124],
      [148, 218, 255],
      [212, 164, 252],
      [164, 238, 168]
    ];
    this.fireworks.push({
      x,
      y: this.stagePos.y + 10,
      vy: -2.4,
      targetY,
      col: palettes[Math.floor(random(palettes.length))],
      burst: false,
      sparks: []
    });
  }

  /** Attribue les animations d'action synchronisées du Trio Fun Gang (boire, gâteau, applaudir, barbe à papa). */
  applyFunGangHangoutActions() {
    const fg = this.funGang;
    if (!fg || !fg.kris || !fg.ralsei || !fg.susie) return;
    const stop = fg.stops[fg.stopIdx];
    const cx = stop.x;
    fg.kris.trioFaceX = cx;
    fg.ralsei.trioFaceX = cx;
    fg.susie.trioFaceX = cx;
    fg.kris.emoteTimer = 0;
    fg.ralsei.emoteTimer = 0;
    fg.susie.emoteTimer = 0;

    if (stop.mode === 'SNACK') {
      // Jeu de maillet forain (Kris & Susie balancent leur gros maillet rose, Ralsei applaudit !)
      fg.kris.trioAction   = { file: 'kris_act_mallet',  w: 42, h: 36, frames: 8, speed: 6, emote: 'Exclamation', allowFlip: false };
      fg.ralsei.trioAction = { file: 'ralsei_act_cheer', w: 36, h: 36, frames: 8, speed: 6, emote: 'Heart',       allowFlip: false };
      fg.susie.trioAction  = { file: 'susie_act_mallet', w: 42, h: 38, frames: 8, speed: 6, emote: 'Happy',       allowFlip: false };
    } else if (stop.mode === 'PICNIC') {
      // Spectacle de magie de Ralsei (boules de feu!) + glaces de Susie + soda de Kris
      fg.kris.trioAction   = { file: 'kris_act_drink',   w: 32, h: 34, frames: 4, speed: 8, emote: 'Star',        allowFlip: false };
      fg.ralsei.trioAction = { file: 'ralsei_act_magic', w: 40, h: 36, frames: 8, speed: 6, emote: 'Star',        allowFlip: true };
      fg.susie.trioAction  = { file: 'susie_act_laugh',  w: 36, h: 38, frames: 8, speed: 7, emote: 'Happy',       allowFlip: false };
    } else if (stop.mode === 'CHEER') {
      // Danse d'écharpe magique de Ralsei + rires de Susie + maillet de Kris
      fg.kris.trioAction   = { file: 'kris_act_mallet',  w: 42, h: 36, frames: 8, speed: 6, emote: 'Happy',       allowFlip: false };
      fg.ralsei.trioAction = { file: 'ralsei_act_dance', w: 44, h: 36, frames: 8, speed: 6, emote: 'Heart',       allowFlip: true };
      fg.susie.trioAction  = { file: 'susie_act_cheer',  w: 36, h: 38, frames: 8, speed: 7, emote: 'Exclamation', allowFlip: false };
    } else {
      // PARTY devant la scène : boules de feu + glaces/danse + ballon doré + feux d'artifice !
      fg.kris.trioAction   = { file: 'kris_act_balloon', w: 32, h: 36, frames: 4, speed: 8, emote: 'Star',        allowFlip: false };
      fg.ralsei.trioAction = { file: 'ralsei_act_magic', w: 40, h: 36, frames: 8, speed: 6, emote: 'Heart',       allowFlip: true };
      fg.susie.trioAction  = { file: 'susie_act_laugh',  w: 36, h: 38, frames: 8, speed: 7, emote: 'Exclamation', allowFlip: false };
      this.launchFirework(this.stagePos.x + 42, 26);
    }
  }

  /** Machine à états du Trio Fun Gang : HANGOUT (action ensemble) -> WALK (marche groupée vers le spot suivant) -> boucle. */
  updateFunGangTrio() {
    const fg = this.funGang;
    if (!fg || !fg.kris || !fg.ralsei || !fg.susie) return;
    const members = [fg.kris, fg.ralsei, fg.susie];
    const offsets = [[0, 0], [24, 2], [-24, 4]];

    if (fg.phase === 'HANGOUT') {
      fg.timer--;
      // Alterner les émotes toutes les 1.5s pour donner l'impression qu'ils discutent & rient !
      if (fg.timer % 90 === 0) {
        const emotes = ['Happy', 'Heart', 'Star', 'Exclamation'];
        for (const m of members) {
          if (m.trioAction) {
            m.trioAction.emote = emotes[Math.floor(random(emotes.length))];
            m.emoteTimer = 0;
          }
        }
      }
      if (fg.timer <= 0) {
        fg.stopIdx = (fg.stopIdx + 1) % fg.stops.length;
        fg.phase = 'WALK';
        fg.timer = 1400; // Garde-fou anti-blocage
        const nextStop = fg.stops[fg.stopIdx];
        for (let i = 0; i < members.length; i++) {
          members[i].trioAction = null;
          members[i].trioTarget = createVector(nextStop.x + offsets[i][0], nextStop.y + offsets[i][1]);
        }
      }
    } else {
      // WALK : Ralsei et Susie marchent en formation avec Kris jusqu'au prochain lieu
      fg.timer--;
      const stop = fg.stops[fg.stopIdx];
      fg.kris.trioTarget = createVector(stop.x, stop.y);
      fg.ralsei.trioTarget = createVector(stop.x + 24, stop.y + 2);
      fg.susie.trioTarget = createVector(stop.x - 24, stop.y + 4);

      const allArrived = members.every((m) =>
        m.trioTarget && p5.Vector.dist(m.pos, m.trioTarget) < 16
      );
      if (allArrived || fg.timer <= 0) {
        fg.phase = 'HANGOUT';
        fg.timer = 360; // ~6 secondes d'action animée ensemble avant de repartir !
        this.applyFunGangHangoutActions();
      }
    }
  }

  draw(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const vw = this.game.viewW || BUFFER_W;
    const vh = this.game.viewH || BUFFER_H;
    const oy = Math.floor((vh - BUFFER_H) / 2);
    const camOffset = -Math.round(this.camX);
    const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
    const groundTop = 94;

    g.background(156, 204, 102);

    // === 0. CIEL PARALLAXE 7 COUCHES ===
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.draw(g, assets, skyMood, vw, this.camX, oy);
    }

    // === 1. MONDE CONTINU [-480 .. 960] ===
    g.push();
    g.translate(camOffset, oy);

    // Sols pré-rendus des 3 ailes
    if (this.westGroundImg)  g.image(this.westGroundImg,  -BUFFER_W, groundTop, BUFFER_W, BUFFER_H - groundTop, 0, groundTop, BUFFER_W, BUFFER_H - groundTop);
    if (this.plazaGroundImg) g.image(this.plazaGroundImg, 0,         groundTop, BUFFER_W, BUFFER_H - groundTop, 0, groundTop, BUFFER_W, BUFFER_H - groundTop);
    if (this.eastGroundImg)  g.image(this.eastGroundImg,  BUFFER_W,  groundTop, BUFFER_W, BUFFER_H - groundTop, 0, groundTop, BUFFER_W, BUFFER_H - groundTop);

    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawHorizonBlend(g, skyMood, this.worldLeft, this.worldRight, groundTop);
    }

    // Ondulations & nénuphars de la mare aux canetons + Ruisseau/Pont Est + Esplanade pavée de la Fontaine !
    this.drawPondSurfaceDetails(g, this.pondCenter.x, this.pondCenter.y);
    this.drawEastCreekAndBridge(g);
    this.drawFountainPlazaGround(g, this.fountainPos.x, this.fountainPos.y);

    // Fleurs animées par la brise au sol
    for (const fl of this.ambientFlowers) {
      const sp = assets.getSprite(fl.sprite);
      const sway = Math.round(Math.sin(frameCount * 0.045 + fl.phase) * 0.8);
      if (sp) g.image(sp, fl.x + sway, fl.y);
    }

    // Nappe de pique-nique + encas pixel-art (picnic_foods.png)
    const blanketSp = assets.getSprite('picnic_blanket');
    if (blanketSp) g.image(blanketSp, 26, 192);
    const toast = assets.getSheetFrame('world/decor/picnic_foods.png', 16, 16, 2, 0);
    const sandwich = assets.getSheetFrame('world/decor/picnic_foods.png', 16, 16, 6, 0);
    const onigiri = assets.getSheetFrame('world/decor/picnic_foods.png', 16, 16, 0, 1);
    if (toast) g.image(toast, 45, 199, 11, 11);
    if (sandwich) g.image(sandwich, 54, 210, 11, 11);
    if (onigiri) g.image(onigiri, 34, 216, 10, 10);

    // === 2. TOUS LES OBJETS TRIÉS EN Y (0 chevauchement) ===
    const nearId = this.promptTrigger ? this.promptTrigger.id : null;
    const items = [];

    // Arbres & cerisiers en fleurs (avec léger balancement)
    for (const tr of this.ambientTrees) {
      items.push({
        sortY: tr.sortY,
        draw: () => {
          const sway = Math.round(Math.sin(frameCount * 0.03 + tr.x * 0.02) * 0.6);
          if (tr.kind === 'cherry_big') this.drawCherryBlossom(g, tr.x + sway, tr.y, 'big');
          else if (tr.kind === 'cherry_med') this.drawCherryBlossom(g, tr.x + sway, tr.y, 'med');
          else {
            const sp = assets.getSprite(tr.kind);
            if (sp) g.image(sp, tr.x + sway, tr.y);
          }
        }
      });
    }

    // Arche d'entrée MOO'S FUNFAIR + Grande Roue centrale illuminée
    items.push({
      sortY: 94,
      draw: () => {
        this.drawArchPillarsAndLanterns(g, 154, 18);
        const sign = assets.getSprite('title_sign');
        if (sign) g.image(sign, 154, 18);
      }
    });
    items.push({
      sortY: 134,
      draw: () => this.drawAnimatedFerrisWheel(g, 240, 88)
    });

    // Les 4 stands de jeux principaux (architectures & props distincts + ballons numérotés 1..4)
    const boothBalloonCols = [[236, 98, 114], [122, 198, 126], [118, 178, 232], [186, 138, 224]];
    for (let bi = 0; bi < this.booths.length; bi++) {
      const b = this.booths[bi];
      const bCol = boothBalloonCols[bi];
      const bNum = bi + 1;
      items.push({
        sortY: b.y + b.h,
        draw: () => {
          const sp = assets.getSprite(b.sprite);
          if (sp) g.image(sp, b.x, b.y);
          this.drawMainBoothProps(g, font, b.id, b.x, b.y, nearId === b.id);
          this.drawBoothNumberBalloon(g, b.x + 25, b.y - 12, bNum, bCol);
        }
      });
    }

    // Aile Ouest : Barbe à Papa, Limonade, Prize Boutique détaillé & Pop-Corn
    items.push(
      { sortY: this.cottonCartPos.y + this.cottonCartPos.h,    draw: () => this.drawCottonCandyCart(g, font, this.cottonCartPos, nearId === 'cotton_candy') },
      { sortY: this.lemonadeCartPos.y + this.lemonadeCartPos.h, draw: () => this.drawLemonadeStand(g, font, this.lemonadeCartPos, nearId === 'lemonade') },
      { sortY: this.prizeBoothPos.y + this.prizeBoothPos.h,    draw: () => {
        const sp = assets.getImage('world/hub/booths/booth_prize.png');
        if (sp) g.image(sp, this.prizeBoothPos.x, this.prizeBoothPos.y);
        this.drawPrizeBoothDecor(g, this.prizeBoothPos.x, this.prizeBoothPos.y, nearId === 'prize');
      }},
      { sortY: this.popcornCartPos.y + this.popcornCartPos.h,  draw: () => this.drawPopcornCart(g, font, this.popcornCartPos, nearId === 'popcorn') }
    );

    // Aile Est : Mini Carrousel animé + Scène & Feux d'artifice + Stand Anneaux
    items.push(
      { sortY: this.carouselPos.y + this.carouselPos.h,     draw: () => this.drawMiniCarousel(g, this.carouselPos, nearId === 'carousel') },
      { sortY: this.stagePos.y + this.stagePos.h,           draw: () => this.drawConcertStage(g, font, this.stagePos, nearId === 'stage') },
      { sortY: this.ringsBoothPos.y + this.ringsBoothPos.h, draw: () => this.drawThemedSoonBooth(g, font, this.ringsBoothPos) }
    );

    // Mobilier, scènes narratives, panneaux & animaux
    items.push(
      // Bancs en bois + Tables de pique-nique Ouest
      { sortY: 206, draw: () => this.drawWoodenBench(g, -386, 196) },
      { sortY: 214, draw: () => this.drawPicnicTable(g, -334, 200) },
      { sortY: 214, draw: () => this.drawPicnicTable(g, -194, 200) },
      { sortY: 206, draw: () => this.drawWoodenBench(g, -104, 196) },
      { sortY: 206, draw: () => this.drawWoodenBench(g, 690, 196) },
      { sortY: 214, draw: () => this.drawCherryBlossom(g, -412, 198, 'bush') },
      { sortY: 214, draw: () => this.drawCherryBlossom(g, 822,  198, 'bush') },

      // Panier pique-nique + amis lapins + chat endormi (scène narrative)
      { sortY: 222, draw: () => { const sp = assets.getSprite('picnic_basket'); if (sp) g.image(sp, 35, 208); } },
      { sortY: 218, draw: () => { const img = assets.getSheetFrame('characters/animals/bunnies/bunny_lavender.png', 32, 32, 0, 0); if (img) g.image(img, 42, 190); } },
      { sortY: 220, draw: () => { const img = assets.getSheetFrame('characters/animals/bunnies/bunny_mint.png', 32, 32, 1, 0); if (img) g.image(img, 58, 192); } },
      { sortY: 222, draw: () => this.drawSleepingCat(g, 86, 214) },

      // Chat aux ballons (vrai sprite 'kid_front' 48x48) + ficelles attachées à sa main !
      { sortY: 212, draw: () => {
        const catBalloons = [
          { sp: 'balloon_red',    x: 138, y: 158, ph: 0.2 },
          { sp: 'balloon_yellow', x: 150, y: 152, ph: 1.4 },
          { sp: 'balloon_blue',   x: 162, y: 158, ph: 2.6 }
        ];
        g.push();
        g.stroke(107, 75, 91, 185);
        g.strokeWeight(1);
        for (const bl of catBalloons) {
          const by = bl.y + Math.sin(frameCount * 0.05 + bl.ph) * 2;
          g.line(bl.x + 6, Math.round(by + 13), 156, 198);
        }
        g.pop();
        const catSp = assets.getSprite('kid_front');
        if (catSp) g.image(catSp, 132, 168);
        for (const bl of catBalloons) {
          const sp = assets.getSprite(bl.sp);
          if (sp) g.image(sp, bl.x, Math.round(bl.y + Math.sin(frameCount * 0.05 + bl.ph) * 2));
        }
      }},

      // Panneau MAP & Panneau GAMES (espacés proprement sans chevauchement)
      { sortY: this.mapBoardPos.y + this.mapBoardPos.h, draw: () => this.drawMapSignpost(g, font, this.mapBoardPos) },
      { sortY: this.posterPos.y + this.posterPos.h, draw: () => {
        const pSp = assets.getSprite('poster_board');
        if (pSp) g.image(pSp, this.posterPos.x, this.posterPos.y);
        const layout = assets.hubLayout;
        if (layout && layout.games) {
          layout.games.forEach((gm, i) => {
            const [sx, sy] = layout.poster.slots_in_sprite[i];
            // Dessine nos 4 nouveaux logos (drapeau, Poké Ball, patte marron, Triforce) sur le panneau GAMES !
            this.drawGameLogo(g, gm.id, this.posterPos.x + sx + 11, this.posterPos.y + sy + 8, 0.95);
          });
        }
        this.drawPerchedBird(g, this.posterPos.x + 44, this.posterPos.y - 2);
      }},

      // Grenouille près de la mare + Canard de bain (Tiny Swords) + Vache paisible
      { sortY: 224, draw: () => this.drawPondFrog(g, 356, 218) },
      { sortY: 215, draw: () => {
        const rdCol = Math.floor(frameCount / 14) % 3;
        const rd = assets.getSheetFrame('packs/tiny_swords/terrain/Decorations/Rubber Duck/Rubber duck.png', 32, 32, rdCol, 0);
        if (rd) g.image(rd, 394, 212 + Math.round(Math.sin(frameCount * 0.08) * 1.2), 14, 14);
      }},
      { sortY: 202, draw: () => {
        const cowCol = Math.floor(frameCount / 22) % 3;
        const cow = assets.getSheetFrame('characters/animals/ambient/cow_sheet.png', 32, 32, cowCol, 0);
        if (cow) g.image(cow, 438, 174);
      }},

      // Moutons broutant paisiblement (Tiny Swords) dans les prairies Ouest & Est
      { sortY: 226, draw: () => {
        const shCol = Math.floor(frameCount / 9) % 12;
        const sh = assets.getSheetFrame('packs/tiny_swords/terrain/Resources/Meat/Sheep/Sheep_Grass.png', 128, 128, shCol, 0);
        if (sh) g.image(sh, -448, 200, 32, 32);
      }},
      { sortY: 222, draw: () => {
        const shCol = Math.floor(frameCount / 9 + 5) % 12;
        const sh = assets.getSheetFrame('packs/tiny_swords/terrain/Resources/Meat/Sheep/Sheep_Grass.png', 128, 128, shCol, 0);
        g.push();
        g.translate(836, 198);
        g.scale(-1, 1);
        if (sh) g.image(sh, -16, 0, 32, 32);
        g.pop();
      }},

      // Fontaine à vœux (Est) + Bancs & Lampadaires de l'esplanade + Faon paisible + Lampadaires de jardin
      { sortY: this.fountainPos.y - 6,  draw: () => this.drawGardenLamp(g, this.fountainPos.x - 44, this.fountainPos.y - 24, skyMood) },
      { sortY: this.fountainPos.y - 6,  draw: () => this.drawGardenLamp(g, this.fountainPos.x + 40, this.fountainPos.y - 24, skyMood) },
      { sortY: this.fountainPos.y + 8,  draw: () => this.drawWoodenBench(g, this.fountainPos.x - 58, this.fountainPos.y + 2) },
      { sortY: this.fountainPos.y + 8,  draw: () => this.drawWoodenBench(g, this.fountainPos.x + 34, this.fountainPos.y + 2) },
      { sortY: this.fountainPos.y + 10, draw: () => this.drawHubFountain(g, this.fountainPos.x, this.fountainPos.y, nearId === 'fountain') },
      { sortY: 208, draw: () => this.drawMeadowDeer(g, 878, 204) },
      { sortY: 132, draw: () => this.drawGardenLamp(g, -306, 114, skyMood) },
      { sortY: 132, draw: () => this.drawGardenLamp(g, -166, 114, skyMood) },
      { sortY: 132, draw: () => this.drawGardenLamp(g, 514,  114, skyMood) },
      { sortY: 132, draw: () => this.drawGardenLamp(g, 664,  114, skyMood) },
      { sortY: 132, draw: () => this.drawGardenLamp(g, 796,  114, skyMood) }
    );

    // Visiteurs, canetons & Moo
    for (const v of this.visitors) {
      items.push({
        sortY: v.pos.y,
        draw: () => {
          v.show(g);
          if (v.kind === 'fox_nap') this.drawSleepZzz(g, v.pos.x + 6, v.pos.y - 16);
        }
      });
    }
    for (const d of this.ducklings) items.push({ sortY: d.pos.y, draw: () => d.show(g) });
    items.push({ sortY: this.moo.pos.y, draw: () => this.moo.show(g, this.game.save.data.equippedOutfit) });

    items.sort((a, b) => a.sortY - b.sortY).forEach((it) => it.draw());

    // === 3. GUIRLANDES, LUMIÈRES, PAPILLONS, ABEILLES & FX ===
    for (const b of this.buntingRow) {
      const sp = assets.getSprite(b.sprite);
      const sway = Math.round(Math.sin(frameCount * 0.045 + b.x * 0.04) * 1);
      if (sp) g.image(sp, b.x, 90 + ((Math.abs(b.x) / 16) % 2 ? 1 : 0) + sway);
    }
    for (const l of this.lightsRow) {
      const lit = (Math.floor(frameCount / 28) + l.idx) % 2 === 0;
      const sp = assets.getSprite(lit ? 'lights_on' : 'lights_dim');
      if (sp) g.image(sp, l.x, l.y);
      // Halo lumineux chaud des guirlandes basses lorsque le coucher de soleil s'installe !
      const sb = typeof SkyBackdrop !== 'undefined' ? SkyBackdrop.getBlend(skyMood) : 0;
      if (lit && sb > 0.1) {
        g.noStroke();
        g.fill(255, 232, 142, Math.round(52 * sb));
        g.circle(l.x + 8, l.y + 4, 14);
      }
    }
    for (const bf of this.butterflies) bf.show(g);
    this.drawHubBees(g);

    // Pétales de cerisier flottants (Aile Ouest)
    g.noStroke();
    for (const pt of this.cherryPetals) {
      g.fill(255, 196, 214, 215);
      g.rect(Math.round(pt.x), Math.round(pt.y), 2, 2);
      g.fill(255, 226, 236, 180);
      g.rect(Math.round(pt.x) + 1, Math.round(pt.y) - 1, 1, 1);
    }

    // Feux d'artifice pastel dans le ciel au-dessus de la Scène Est !
    for (const fw of this.fireworks) {
      if (!fw.burst) {
        g.fill(255, 248, 196);
        g.rect(Math.round(fw.x), Math.round(fw.y), 2, 4);
      } else {
        for (const sp of fw.sparks) {
          const a = Math.min(255, sp.life * 8);
          g.fill(fw.col[0], fw.col[1], fw.col[2], a);
          g.rect(Math.round(sp.x), Math.round(sp.y), 2, 2);
          g.fill(255, 252, 236, Math.round(a * 0.7));
          g.rect(Math.round(sp.x), Math.round(sp.y), 1, 1);
        }
      }
    }

    for (const fx of this.fx) fx.show(g, assets);

    if (Vehicle.debug) {
      for (const obs of this.obstacles) obs.showDebug(g);
    }

    // Bulle d'invitation au-dessus de Moo (stand / objet interactif OU visiteur proche)
    if (!this.overlay && !this.mapOverlay && !this.activeDialogue && !this.wishModalOpen && !this.prizeShop.open) {
      if (this.promptTrigger) {
        const labels = {
          poster:       'Pick a game! (P / Space)',
          map:          'Open Funfair Map! (Space)',
          prize:        'Open Prize Boutique! (Space)',
          cotton_candy: 'Get Cotton Candy! (Space)',
          lemonade:     'Grab Fresh Lemonade! (Space)',
          popcorn:      'Grab Popcorn! (Space)',
          carousel:     'Ring Carousel Bell! (Space)',
          stage:        'Launch Fireworks Show! (Space)',
          fountain:     'Make a Wish! (Space)'
        };
        const label = labels[this.promptTrigger.id] || ('Play ' + this.promptTrigger.title + '? (Space)');
        PixelUI.drawTag(g, font, label, this.moo.pos.x, this.moo.pos.y - 40 + Math.sin(frameCount * 0.12) * 1.4);
      } else if (this.nearbyVisitor) {
        // Petite icône pixel de bulle de dialogue animée (•••) au-dessus du personnage !
        const ix = Math.round(this.nearbyVisitor.pos.x);
        const iy = Math.round(this.nearbyVisitor.pos.y - 34 + Math.sin(frameCount * 0.14) * 1.5);
        g.push();
        g.noStroke();
        g.fill(107, 75, 91);
        g.rect(ix - 8, iy - 6, 16, 11, 3);
        g.triangle(ix - 2, iy + 5, ix + 2, iy + 5, ix, iy + 8);
        g.fill(255, 250, 224);
        g.rect(ix - 7, iy - 5, 14, 9, 2);
        g.triangle(ix - 1, iy + 4, ix + 1, iy + 4, ix, iy + 7);
        // 3 petits points qui ondulent doucement
        g.fill(189, 117, 126);
        for (let k = 0; k < 3; k++) {
          const dy = Math.round(Math.sin(frameCount * 0.16 + k * 1.1) * 0.8);
          g.rect(ix - 4 + k * 3, iy - 1 + dy, 2, 2);
        }
        g.pop();
      }
    }

    g.pop();

    // Voile chaud & lucioles au coucher du soleil
    if (typeof SkyBackdrop !== 'undefined') {
      SkyBackdrop.drawMoodGlaze(g, skyMood, vw, vh);
    }

    if (Vehicle.debug) {
      PixelUI.drawTag(g, font, 'DEBUG [H]: Vehicles, Routines & Avoid', vw - 118, 22, g.color(223, 240, 187));
    }

    this.drawHud(g);
    if (this.overlay) { PixelUI.flushLayer(g); this.drawPosterOverlay(g); }
    if (this.mapOverlay) { PixelUI.flushLayer(g); this.drawMapOverlay(g); }
    if (this.activeDialogue) { PixelUI.flushLayer(g); this.drawDialogueOverlay(g); }
    if (this.prizeShop && this.prizeShop.open) { PixelUI.flushLayer(g); this.prizeShop.draw(g); }

    if (millis() < this.toastUntil && this.toast) {
      const w = Math.round(PixelUI.measureText(g, this.toast, 9) + 16);
      const cx = Math.round(vw / 2);
      PixelUI.panel(g, cx - Math.round(w / 2), vh - 26, w, 18, g.color(223, 240, 187));
      PixelUI.txt(g, font, this.toast, cx, vh - 23, g.color(70, 101, 80), CENTER, 9, w - 8);
    }
  }

  /** Grand Carrousel pastel féerique : socle velours, colonne dorée, 5 poneys galopants 3D, baldaquin festonné & fanion ! */
  drawMiniCarousel(g, c, isNear) {
    const t = frameCount;
    const cx = c.x + 36;
    const baseY = c.y + 58;
    const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
    const sb = typeof SkyBackdrop !== 'undefined' ? SkyBackdrop.getBlend(skyMood) : 0;

    g.push();
    g.noStroke();

    // Halo lumineux chaleureux (renforcé au coucher de soleil ou quand Moo s'approche)
    const haloA = isNear ? Math.round(36 + Math.sin(t * 0.14) * 14) : Math.round(14 + 34 * sb);
    g.fill(255, 242, 186, haloA);
    g.ellipse(cx, baseY - 16, 86, 66);

    // 1. Socle rond à étages avec jupe rose-velours et bordure dorée
    g.fill(72, 54, 68, 72);
    g.ellipse(cx, baseY + 6, 78, 22);
    // Jupe inférieure festonnée
    g.fill(107, 75, 91);
    g.ellipse(cx, baseY + 4, 74, 21);
    g.fill(198, 114, 134);
    g.ellipse(cx, baseY + 2, 71, 19);
    g.fill(244, 212, 126);
    g.ellipse(cx, baseY + 1, 70, 17);
    // Plancher en bois crème chaud
    g.fill(228, 192, 146);
    g.ellipse(cx, baseY, 66, 15);
    g.fill(250, 238, 206);
    g.ellipse(cx, baseY - 1, 56, 11);

    // 2. 5 Poneys de carrousel détaillés en orbite 3D (arrière -> colonne centrale -> avant)
    const ponySpecs = [
      { body: [252, 248, 240], mane: [246, 152, 178], saddle: [246, 152, 178] }, // Blanc & Rose
      { body: [255, 232, 168], mane: [212, 148, 86],  saddle: [138, 202, 236] }, // Crème doré & Ciel
      { body: [234, 212, 248], mane: [184, 136, 224], saddle: [252, 224, 124] }, // Lavande & Or
      { body: [254, 208, 218], mane: [255, 248, 230], saddle: [164, 218, 156] }, // Pêche-rose & Menthe
      { body: [204, 234, 248], mane: [252, 224, 134], saddle: [246, 152, 178] }  // Bleu ciel & Rose
    ];

    const ponies = [];
    for (let i = 0; i < 5; i++) {
      const a = t * 0.022 + (TWO_PI * i) / 5;
      ponies.push({
        x: Math.round(cx + Math.cos(a) * 23),
        z: Math.sin(a),
        facingLeft: Math.sin(a) > 0, // Tourne dans le sens naturel de l'orbite !
        bob: Math.round(Math.sin(t * 0.095 + i * 1.35) * 3),
        spec: ponySpecs[i]
      });
    }
    ponies.sort((a, b) => a.z - b.z);

    const drawPony = (p) => {
      const py = Math.round(baseY - 11 + p.z * 4.5 + p.bob);
      // Barre torsadée en laiton doré
      g.fill(198, 152, 68);
      g.rect(p.x, c.y + 22, 2, 34);
      g.fill(255, 238, 156);
      g.rect(p.x, c.y + 22, 1, 34);

      g.push();
      g.translate(p.x, py);
      if (p.facingLeft) g.scale(-1, 1);
      const b = p.spec.body;
      const m = p.spec.mane;
      const s = p.spec.saddle;

      // Queue flottante
      g.fill(m[0], m[1], m[2]);
      g.rect(-7, -2, 3, 4, 1);
      // Contour corps + pattes cabrées
      g.fill(107, 75, 91);
      g.rect(-5, -4, 10, 6, 2);
      g.rect(-4, 2, 2, 3);
      g.rect(3, 1, 2, 3);
      // Corps pastel du poney
      g.fill(b[0], b[1], b[2]);
      g.rect(-4, -3, 8, 4, 1);
      g.rect(-3, 2, 1, 2);
      g.rect(3, 1, 1, 2);
      // Selle colorée + détail or
      g.fill(s[0], s[1], s[2]);
      g.rect(-2, -3, 4, 3);
      g.fill(252, 224, 118);
      g.rect(-1, -3, 2, 1);
      // Encolure + tête + oreille + crinière
      g.fill(107, 75, 91);
      g.rect(2, -8, 5, 5, 1);
      g.fill(b[0], b[1], b[2]);
      g.rect(3, -7, 4, 3, 1);
      g.rect(4, -9, 1, 2); // petite oreille
      g.fill(m[0], m[1], m[2]);
      g.rect(1, -7, 2, 4); // crinière
      g.fill(72, 48, 62);
      g.rect(5, -6, 1, 1); // œil mignon
      g.pop();
    };

    // Poneys à l'arrière
    for (const p of ponies) {
      if (p.z < 0) drawPony(p);
    }

    // 3. Colonne centrale ornée (panneaux crème/rose + garnitures dorées + lumières)
    g.fill(107, 75, 91);
    g.rect(cx - 7, c.y + 20, 14, 36);
    g.fill(248, 236, 206);
    g.rect(cx - 6, c.y + 20, 12, 35);
    g.fill(242, 174, 192);
    g.rect(cx - 4, c.y + 24, 8, 26);
    g.fill(248, 212, 108);
    g.rect(cx - 6, c.y + 22, 12, 2);
    g.rect(cx - 6, c.y + 50, 12, 3);
    g.rect(cx - 1, c.y + 24, 2, 26);
    // Petites lumières scintillantes sur la colonne
    const colLit = Math.floor(t / 16) % 2 === 0;
    g.fill(colLit ? g.color(255, 250, 188) : g.color(255, 218, 168));
    g.rect(cx - 5, c.y + 30, 2, 2);
    g.rect(cx + 3, c.y + 30, 2, 2);
    g.rect(cx - 5, c.y + 42, 2, 2);
    g.rect(cx + 3, c.y + 42, 2, 2);

    // Poneys à l'avant (passent devant la colonne centrale !)
    for (const p of ponies) {
      if (p.z >= 0) drawPony(p);
    }

    // 4. Grand toit chapiteau pastel rayé avec nervures dorées
    g.fill(107, 75, 91);
    g.triangle(cx - 38, c.y + 24, cx, c.y - 1, cx + 38, c.y + 24);
    g.fill(246, 152, 178); // Rose bonbon
    g.triangle(cx - 35, c.y + 23, cx, c.y + 1, cx + 35, c.y + 23);
    g.fill(255, 246, 218); // Crème
    g.triangle(cx - 24, c.y + 23, cx, c.y + 1, cx + 24, c.y + 23);
    g.fill(158, 214, 240); // Bleu ciel pastel
    g.triangle(cx - 13, c.y + 23, cx, c.y + 1, cx + 13, c.y + 23);
    g.fill(255, 246, 218); // Panneau central crème
    g.triangle(cx - 5, c.y + 23, cx, c.y + 1, cx + 5, c.y + 23);

    // Nervures dorées fines du chapiteau
    g.stroke(246, 206, 102, 200);
    g.strokeWeight(1);
    g.line(cx, c.y + 2, cx - 24, c.y + 22);
    g.line(cx, c.y + 2, cx + 24, c.y + 22);
    g.line(cx, c.y + 2, cx - 12, c.y + 22);
    g.line(cx, c.y + 2, cx + 12, c.y + 22);
    g.noStroke();

    // 5. Frise festonnée dorée & 11 ampoules féeriques scintillantes
    g.fill(107, 75, 91);
    g.rect(cx - 37, c.y + 21, 74, 7, 2);
    g.fill(218, 120, 144);
    g.rect(cx - 36, c.y + 22, 72, 5, 1);
    // Festons arrondis suspendus sous le bord du toit
    for (let sx = cx - 33; sx <= cx + 33; sx += 6) {
      g.fill(107, 75, 91);
      g.circle(sx, c.y + 28, 6);
      g.fill(252, 224, 134);
      g.circle(sx, c.y + 27, 4);
    }
    for (let i = 0; i < 11; i++) {
      const lx = cx - 32 + i * 6.4;
      const lit = (Math.floor(t / 10) + i) % 2 === 0;
      if (lit && sb > 0.1) {
        g.fill(255, 242, 162, Math.round(70 * sb));
        g.circle(lx + 1, c.y + 24, 8);
      }
      g.fill(lit ? g.color(255, 250, 180) : g.color(255, 198, 212));
      g.rect(Math.round(lx), c.y + 23, 2, 2);
    }

    // 6. Flèche dorée + étoile + petit fanion rose qui flotte au vent !
    g.fill(107, 75, 91);
    g.rect(cx - 1, c.y - 10, 3, 11);
    g.fill(252, 214, 96);
    g.rect(cx, c.y - 9, 1, 10);
    g.circle(cx, c.y - 2, 5);
    const wave = Math.round(Math.sin(t * 0.14) * 1.5);
    g.fill(246, 134, 168);
    g.triangle(cx + 1, c.y - 10, cx + 11, c.y - 8 + wave, cx + 1, c.y - 5);
    g.fill(255, 246, 188);
    g.rect(cx - 1, c.y - 3, 2, 2);
    g.pop();
  }

  /** Chariot Barbe à Papa & Douceurs (world/decor/candy_and_pie.png) — Interactif ! */
  drawCottonCandyCart(g, font, c, isNear) {
    const x = c.x;
    const y = c.y;
    g.push();
    g.noStroke();
    if (isNear) {
      g.fill(255, 236, 200, Math.round(28 + Math.sin(frameCount * 0.14) * 14));
      g.rect(x - 2, y + 4, c.w + 4, c.h, 4);
    }
    // Roues + corps du chariot
    g.fill(107, 75, 91);
    g.circle(x + 11, y + 45, 10);
    g.circle(x + 37, y + 45, 10);
    g.fill(218, 178, 134);
    g.circle(x + 11, y + 45, 6);
    g.circle(x + 37, y + 45, 6);
    g.fill(107, 75, 91);
    g.rect(x + 4, y + 26, 40, 19, 2);
    g.fill(248, 186, 206);
    g.rect(x + 5, y + 27, 38, 17, 1);
    g.fill(252, 244, 218);
    g.rect(x + 5, y + 27, 38, 4);
    // Poteaux + auvent rayé rose & crème
    g.fill(144, 98, 93);
    g.rect(x + 6, y + 12, 3, 16);
    g.rect(x + 39, y + 12, 3, 16);
    for (let i = 0; i < 6; i++) {
      g.fill(i % 2 === 0 ? g.color(246, 152, 174) : g.color(252, 244, 218));
      g.rect(x + 3 + i * 7, y + 6, 7, 8);
    }
    // Vrais bonbons pixel-art (world/decor/candy_and_pie.png) sur le chariot !
    const pie = this.game.assets.getSheetFrame('world/decor/candy_and_pie.png', 16, 16, 0, 0);
    const candy = this.game.assets.getSheetFrame('world/decor/candy_and_pie.png', 16, 16, 1, 0);
    const pop = this.game.assets.getSheetFrame('world/decor/candy_and_pie.png', 16, 16, 3, 0);
    if (pie) g.image(pie, x + 8, y + 16, 11, 11);
    if (candy) g.image(candy, x + 19, y + 15, 11, 11);
    if (pop) g.image(pop, x + 30, y + 16, 11, 11);
    PixelUI.panel(g, x + 4, y + 33, 40, 10, g.color(252, 244, 218));
    this.drawWorldSign(g, 'SWEETS', x + 24, y + 38, g.color(168, 78, 104));
    g.pop();
  }

  /** Chariot Pop-Corn animé avec grains dorés qui sautent — Interactif ! */
  drawPopcornCart(g, font, c, isNear) {
    const x = c.x;
    const y = c.y;
    const t = frameCount;
    g.push();
    g.noStroke();
    if (isNear) {
      g.fill(255, 244, 180, Math.round(28 + Math.sin(t * 0.14) * 14));
      g.rect(x - 2, y + 4, c.w + 4, c.h, 4);
    }
    // Roues + caisse rayée rouge/crème
    g.fill(107, 75, 91);
    g.circle(x + 11, y + 45, 10);
    g.circle(x + 37, y + 45, 10);
    g.fill(218, 178, 134);
    g.circle(x + 11, y + 45, 6);
    g.circle(x + 37, y + 45, 6);
    g.fill(107, 75, 91);
    g.rect(x + 4, y + 26, 40, 19, 2);
    for (let i = 0; i < 6; i++) {
      g.fill(i % 2 === 0 ? g.color(224, 92, 98) : g.color(252, 244, 218));
      g.rect(x + 6 + i * 6, y + 27, 6, 17);
    }
    // Vitrine transparente avec pop-corn animé !
    g.fill(224, 244, 252, 165);
    g.rect(x + 8, y + 13, 32, 13);
    g.fill(255, 238, 152);
    for (let i = 0; i < 6; i++) {
      const popY = Math.round(Math.abs(Math.sin(t * 0.12 + i * 1.3)) * 4);
      g.circle(x + 12 + i * 5, y + 23 - popY, 4);
    }
    // Auvent doré & rouge
    for (let i = 0; i < 6; i++) {
      g.fill(i % 2 === 0 ? g.color(252, 214, 102) : g.color(224, 92, 98));
      g.rect(x + 3 + i * 7, y + 6, 7, 7);
    }
    PixelUI.panel(g, x + 3, y + 33, 42, 10, g.color(252, 244, 218));
    this.drawWorldSign(g, 'POPCORN', x + 24, y + 38, g.color(168, 66, 68));
    g.pop();
  }

  /** Grande Roue centrale illuminée (8 nacelles droites + passagers + 16 ampoules + halo). */
  drawAnimatedFerrisWheel(g, cx, cy) {
    const r = 34;
    const rot = frameCount * 0.008;
    const podColors = [
      [246, 152, 174], [252, 222, 128], [158, 212, 236], [176, 226, 158],
      [212, 176, 232], [250, 188, 138], [246, 152, 174], [158, 212, 236]
    ];
    g.push();
    g.noStroke();
    g.fill(255, 244, 194, 26);
    g.circle(cx, cy, r * 2.45);
    g.fill(255, 250, 224, 28);
    g.circle(cx, cy, r * 1.7);

    // Support en A + socle
    g.stroke(107, 75, 91);
    g.strokeWeight(5);
    g.line(cx, cy, cx - 22, cy + 44);
    g.line(cx, cy, cx + 22, cy + 44);
    g.stroke(166, 118, 92);
    g.strokeWeight(3);
    g.line(cx, cy, cx - 22, cy + 44);
    g.line(cx, cy, cx + 22, cy + 44);
    g.noStroke();
    g.fill(107, 75, 91);
    g.rect(cx - 28, cy + 41, 56, 7, 2);
    g.fill(182, 137, 98);
    g.rect(cx - 26, cy + 42, 52, 5, 1);

    // Rayons + jante
    g.stroke(144, 98, 93);
    g.strokeWeight(1.5);
    for (let i = 0; i < 8; i++) {
      const a = rot + (TWO_PI * i) / 8;
      g.line(cx, cy, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r));
    }
    g.noFill();
    g.stroke(107, 75, 91);
    g.strokeWeight(4);
    g.circle(cx, cy, r * 2);
    g.stroke(236, 212, 172);
    g.strokeWeight(2);
    g.circle(cx, cy, r * 2);
    g.stroke(182, 137, 98);
    g.strokeWeight(1);
    g.circle(cx, cy, r * 1.2);

    // 16 ampoules scintillantes
    g.noStroke();
    for (let i = 0; i < 16; i++) {
      const a = rot + (TWO_PI * i) / 16;
      const lit = (Math.floor(frameCount / 14) + i) % 2 === 0;
      g.fill(lit ? g.color(255, 246, 164) : g.color(255, 188, 198, 210));
      g.rect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 2, 2);
    }

    // Moyeu doré
    g.fill(107, 75, 91);
    g.circle(cx, cy, 10);
    g.fill(247, 224, 134);
    g.circle(cx, cy, 6);

    // 8 Nacelles droites avec silhouettes de passagers
    for (let i = 0; i < 8; i++) {
      const a = rot + (TWO_PI * i) / 8;
      const gx = Math.round(cx + Math.cos(a) * r);
      const gy = Math.round(cy + Math.sin(a) * r);
      const col = podColors[i];
      g.stroke(107, 75, 91);
      g.strokeWeight(1);
      g.line(gx, gy, gx, gy + 3);
      g.fill(col[0], col[1], col[2]);
      g.rect(gx - 4, gy + 3, 8, 7, 1);
      g.noStroke();
      g.fill(255, 250, 232);
      g.rect(gx - 3, gy + 4, 6, 3);
      if (i % 2 === 0) {
        g.fill(107, 75, 91, 185);
        g.rect(gx - 2, gy + 4, 2, 2);
        g.rect(gx + 1, gy + 5, 2, 1);
      }
    }
    g.pop();
  }

  drawArchPillarsAndLanterns(g, ox, oyObj) {
    const glow = Math.round(45 + Math.sin(frameCount * 0.08) * 16);
    g.push();
    g.noStroke();
    const xs = [ox + 10, ox + 154];
    for (let i = 0; i < xs.length; i++) {
      const px = xs[i];
      g.fill(107, 75, 91);
      g.rect(px, oyObj + 32, 8, 64);
      g.fill(144, 98, 93);
      g.rect(px + 1, oyObj + 32, 6, 63);
      g.fill(218, 178, 134);
      g.rect(px + 1, oyObj + 34, 2, 58);

      const lx = i === 0 ? px + 9 : px - 5;
      const ly = oyObj + 40;
      g.fill(255, 232, 148, glow);
      g.circle(lx + 2, ly + 4, 14);
      g.fill(107, 75, 91);
      g.rect(lx, ly, 4, 6, 1);
      g.fill(255, 236, 152);
      g.rect(lx + 1, ly + 1, 2, 4);

      g.fill(118, 174, 98);
      g.rect(px - 2, oyObj + 91, 12, 4, 1);
      g.fill(i === 0 ? g.color(246, 152, 174) : g.color(252, 224, 134));
      g.rect(px, oyObj + 90, 2, 2);
      g.rect(px + 6, oyObj + 91, 2, 2);
    }
    g.pop();
  }

  /** Dessine une enseigne directement sur le buffer monde g (reste collée au stand, sous Moo & les menus !). */
  drawWorldSign(g, text, cx, cy, col) {
    g.push();
    g.noStroke();
    g.fill(col);
    if (this.game.assets && this.game.assets.font) {
      g.textFont(this.game.assets.font);
    } else {
      g.textFont('monospace');
    }
    g.textSize(7);
    g.textAlign(CENTER, CENTER);
    g.text(text, Math.round(cx), Math.round(cy));
    g.pop();
  }

  /** Architectures & props distincts pour les 4 stands principaux (nouveaux logos remplaçant les anciens). */
  drawMainBoothProps(g, font, id, x, y, isNear) {
    const t = frameCount;
    g.push();
    g.noStroke();
    if (isNear) {
      g.fill(255, 246, 176, Math.round(28 + Math.sin(t * 0.14) * 14));
      g.rect(x - 2, y + 6, 54, 52, 4);
    }

    // Plaque de toit parchemin propre pour masquer complètement l'ancien logo du sprite
    g.fill(107, 75, 91);
    g.rect(x + 15, y, 20, 14, 2);
    g.fill(247, 236, 198);
    g.rect(x + 16, y + 1, 18, 12, 1);

    if (id === 'derby') {
      // Nouveau logo : Drapeau à damier de course au sommet + mini trophée
      g.fill(107, 75, 91);
      g.rect(x + 20, y + 3, 1, 9);
      g.fill(252, 248, 236);
      g.rect(x + 21, y + 3, 9, 6);
      g.fill(58, 44, 56);
      g.rect(x + 21, y + 3, 3, 2); g.rect(x + 27, y + 3, 3, 2);
      g.rect(x + 24, y + 5, 3, 2);
      g.rect(x + 21, y + 7, 3, 2); g.rect(x + 27, y + 7, 3, 2);
      g.fill(244, 198, 78);
      g.rect(x + 38, y + 32, 5, 5);
      g.rect(x + 39, y + 37, 3, 2);
      PixelUI.panel(g, x + 7, y + 43, 36, 10, g.color(248, 236, 198));
      this.drawWorldSign(g, 'DERBY', x + 25, y + 48, g.color(142, 66, 78));
    } else if (id === 'snake') {
      // Nouveau logo : Poké Ball nette
      g.fill(107, 75, 91);
      g.circle(x + 25, y + 7, 11);
      g.fill(220, 74, 80);
      g.arc(x + 25, y + 7, 9, 9, PI, TWO_PI);
      g.fill(250, 248, 240);
      g.arc(x + 25, y + 7, 9, 9, 0, PI);
      g.fill(58, 44, 56);
      g.rect(x + 20, y + 6, 10, 2);
      g.fill(250, 248, 240);
      g.circle(x + 25, y + 7, 3);
      g.fill(134, 138, 152);
      g.ellipse(x + 9, y + 36, 8, 6);
      PixelUI.panel(g, x + 5, y + 43, 40, 10, g.color(248, 236, 198));
      this.drawWorldSign(g, 'POKEMOO', x + 25, y + 48, g.color(184, 58, 66));
    } else if (id === 'ducklings') {
      // Nouveau logo : Empreinte de patte marron (Purins)
      g.fill(128, 78, 50);
      // Coussinet central
      g.ellipse(x + 25, y + 9, 7, 5);
      // 3 petits coussinets d'orteils au-dessus
      g.circle(x + 21, y + 5, 3);
      g.circle(x + 25, y + 4, 3);
      g.circle(x + 29, y + 5, 3);
      // Petit reflet doux
      g.fill(164, 108, 72);
      g.rect(x + 24, y + 8, 2, 1);
      g.fill(116, 176, 104);
      g.rect(x + 36, y + 35, 8, 4);
      g.fill(252, 224, 134); g.rect(x + 37, y + 34, 2, 2);
      g.fill(246, 152, 174); g.rect(x + 41, y + 34, 2, 2);
      PixelUI.panel(g, x + 7, y + 43, 36, 10, g.color(248, 236, 198));
      this.drawWorldSign(g, 'PURINS', x + 25, y + 48, g.color(150, 96, 56));
    } else if (id === 'fox') {
      // Nouveau logo : Triforce dorée avec contour net prune-brun pour bien ressortir
      g.stroke(107, 75, 91);
      g.strokeWeight(1.2);
      g.fill(244, 192, 46);
      g.triangle(x + 25, y + 2, x + 21, y + 7, x + 29, y + 7);
      g.triangle(x + 21, y + 7, x + 17, y + 12, x + 25, y + 12);
      g.triangle(x + 29, y + 7, x + 25, y + 12, x + 33, y + 12);
      g.noStroke();
      const pot = this.game.assets.getImage('minigames/legend_of_moo/zelda/Props/PNG/sprFancyPot.png');
      if (pot) g.image(pot, x + 5, y + 29, 11, 11);
      PixelUI.panel(g, x + 7, y + 43, 36, 10, g.color(248, 236, 198));
      this.drawWorldSign(g, 'LEGEND', x + 25, y + 48, g.color(102, 72, 136));
    }
    g.pop();
  }

  /** Prize Boutique détaillé avec peluches suspendues, guirlande et cadeaux animés. */
  drawPrizeBoothDecor(g, x, y, isNear) {
    const t = frameCount;
    g.push();
    g.noStroke();
    if (isNear) {
      g.fill(255, 242, 178, Math.round(28 + Math.sin(t * 0.14) * 14));
      g.rect(x - 2, y + 6, 54, 52, 4);
    }
    for (let i = 0; i < 6; i++) {
      const lit = (Math.floor(t / 16) + i) % 2 === 0;
      g.fill(lit ? g.color(255, 248, 172) : g.color(248, 176, 198));
      g.rect(x + 7 + i * 7, y + 23, 2, 2);
    }
    // Peluches suspendues (lapin rose, caneton jaune, renard pêche)
    g.fill(246, 168, 192); g.rect(x + 10, y + 26, 4, 5, 1);
    g.fill(252, 224, 128); g.rect(x + 23, y + 26, 4, 5, 1);
    g.fill(242, 164, 108); g.rect(x + 36, y + 26, 4, 5, 1);

    const giftCol = Math.floor(t / 16) % 4;
    const redGift = this.game.assets.getSheetFrame('world/decor/present_red.png', 16, 16, giftCol, 0);
    const greenGift = this.game.assets.getSheetFrame('world/decor/present_green.png', 16, 16, (giftCol + 2) % 4, 0);
    if (redGift) g.image(redGift, x - 14, y + 40, 14, 14);
    if (greenGift) g.image(greenGift, x + 49, y + 42, 13, 13);
    g.pop();
  }

  /** Stands Tarot & Rings "SOON" de l'Aile Est. */
  drawThemedSoonBooth(g, font, ph) {
    const x = ph.x;
    const y = ph.y;
    const t = frameCount;
    g.push();
    g.noStroke();
    g.fill(ph.label === 'TAROT' ? g.color(84, 62, 108) : g.color(236, 224, 198));
    g.rect(x + 5, y + 22, 40, 20);
    g.fill(107, 75, 91);
    g.rect(x + 4, y + 22, 5, 34);
    g.rect(x + 41, y + 22, 5, 34);
    g.fill(182, 137, 98);
    g.rect(x + 5, y + 23, 3, 32);
    g.rect(x + 42, y + 23, 3, 32);

    if (ph.label === 'RINGS') {
      g.fill(246, 244, 236);
      g.rect(x + 14, y + 31, 3, 7);
      g.rect(x + 23, y + 31, 3, 7);
      g.rect(x + 32, y + 31, 3, 7);
      g.noFill();
      g.stroke(246, 152, 174); g.strokeWeight(1); g.ellipse(x + 18, y + 36, 6, 3);
      g.stroke(252, 222, 128); g.ellipse(x + 30, y + 36, 6, 3);
      g.noStroke();
    } else {
      g.fill(248, 214, 114);
      g.rect(x + 13, y + 26, 2, 2);
      g.rect(x + 34, y + 27, 2, 2);
      g.fill(176, 224, 248);
      g.triangle(x + 25, y + 24, x + 22, y + 30, x + 28, y + 30);
      const flick = Math.floor(t / 10) % 2;
      g.fill(255, 236, 156);
      g.rect(x + 13, y + 34 - flick, 2, 2);
      g.rect(x + 35, y + 34 + flick, 2, 2);
    }

    g.fill(107, 75, 91); g.rect(x + 3, y + 38, 44, 19);
    g.fill(218, 178, 134); g.rect(x + 4, y + 39, 42, 5);
    g.fill(166, 118, 92); g.rect(x + 4, y + 45, 42, 11);

    for (let i = 0; i < 6; i++) {
      const sx = x + 2 + i * 8;
      const sw = Math.min(8, x + 48 - sx);
      g.fill(107, 75, 91); g.rect(sx, y + 13, sw, 13);
      g.fill(i % 2 === 0 ? g.color(ph.stripe[0], ph.stripe[1], ph.stripe[2]) : g.color(247, 236, 198));
      g.rect(sx + 1, y + 14, sw - 2, 10);
    }
    PixelUI.panel(g, x + 8, y + 2, 34, 11, g.color(247, 236, 198));
    this.drawWorldSign(g, ph.label, x + 25, y + 7, g.color(107, 75, 91));
    PixelUI.panel(g, x + 11, y + 45, 28, 10, g.color(247, 236, 198));
    this.drawWorldSign(g, 'SOON', x + 25, y + 50, g.color(144, 98, 93));
    g.pop();
  }

  drawWoodenBench(g, x, y) {
    g.push();
    g.noStroke();
    g.fill(68, 96, 62, 70);
    g.rect(x + 1, y + 8, 22, 4, 2);
    g.fill(107, 75, 91);
    g.rect(x, y, 24, 10, 2);
    g.fill(198, 152, 108);
    g.rect(x + 1, y + 1, 22, 4);
    g.fill(166, 118, 92);
    g.rect(x + 1, y + 6, 22, 3);
    g.pop();
  }

  drawCherryBlossom(g, x, y, size = 'big') {
    const img = this.game.assets.getImage('world/decor/cherry_blossom.png');
    if (!img) return;
    if (size === 'big') g.image(img, x, y, 48, 48, 112, 0, 48, 48);
    else if (size === 'med') g.image(img, x, y, 32, 32, 80, 16, 32, 32);
    else g.image(img, x, y, 16, 16, 80, 64, 16, 16);
  }

  drawPondSurfaceDetails(g, cx, cy) {
    const t = frameCount;
    const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
    const sb = typeof SkyBackdrop !== 'undefined' ? SkyBackdrop.getBlend(skyMood) : 0;
    g.push();
    if (sb > 0.05) {
      // Reflet doré-rosé du coucher de soleil sur l'eau de la mare !
      g.noStroke();
      g.fill(255, 178, 128, Math.round(115 * sb));
      g.ellipse(cx - 2, cy - 1, 56, 24);
      g.fill(255, 232, 162, Math.round(85 * sb));
      g.ellipse(cx - 6 + Math.sin(t * 0.04) * 2, cy - 3, 24, 8);
    }
    g.noFill();
    g.strokeWeight(1);
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.014 + i * 0.5) % 1;
      g.stroke(236, 250, 255, Math.round((1 - p) * 140));
      g.ellipse(cx + (i === 0 ? -10 : 12), cy + (i === 0 ? -2 : 4), 6 + p * 20, 3 + p * 9);
    }
    g.noStroke();
    g.fill(118, 182, 104);
    g.circle(cx - 18, cy + 7, 7);
    g.circle(cx + 22, cy - 6, 6);
    g.fill(248, 174, 198);
    g.rect(cx - 19, cy + 6, 2, 2);
    g.pop();
  }

  drawPondFrog(g, x, y) {
    const cycle = frameCount % 220;
    const row = cycle > 172 ? 4 : 2;
    const col = row === 4 ? Math.min(7, Math.floor((cycle - 172) / 6)) : Math.floor(frameCount / 10) % 14;
    const img = this.game.assets.getSheetFrame('characters/animals/ambient/frog_sheet.png', 16, 16, col, row);
    if (img) g.image(img, x, y, 14, 14);
  }

  drawMeadowDeer(g, x, y) {
    const col = Math.floor(frameCount / 16) % 4;
    const img = this.game.assets.getSheetFrame('characters/animals/ambient/deer1_sheet.png', 32, 32, col, 0);
    if (img) {
      g.push();
      g.translate(x, y);
      g.scale(-1, 1);
      g.image(img, -16, -28);
      g.pop();
    }
  }

  drawHubBees(g) {
    const spots = [
      { cx: -346, cy: 204, ph: 0.4 },
      { cx: 108,  cy: 208, ph: 1.9 },
      { cx: 646,  cy: 206, ph: 3.5 }
    ];
    const col = Math.floor(frameCount / 5) % 8;
    const img = this.game.assets.getSheetFrame('characters/animals/ambient/bee_small_sheet.png', 16, 16, col, 0);
    if (!img) return;
    for (const s of spots) {
      const bx = Math.round(s.cx + Math.cos(frameCount * 0.045 + s.ph) * 14);
      const by = Math.round(s.cy + Math.sin(frameCount * 0.08 + s.ph) * 6);
      g.image(img, bx - 6, by - 6, 12, 12);
    }
  }

  drawSleepingCat(g, x, y) {
    const breath = Math.floor(frameCount / 36) % 2;
    g.push();
    g.noStroke();
    g.fill(68, 48, 62, 55);
    g.ellipse(x + 5, y + 6, 13, 4);
    g.fill(107, 75, 91);
    g.rect(x, y + breath, 10, 6 - breath, 2);
    g.fill(246, 196, 146);
    g.rect(x + 1, y + 1 + breath, 8, 4 - breath, 1);
    g.fill(186, 118, 86);
    g.rect(x + 2, y + 1 + breath, 3, 2);
    g.fill(246, 196, 146);
    g.rect(x + 7, y - 1 + breath, 2, 2);
    g.rect(x + 9, y + 4, 2, 2);
    this.drawSleepZzz(g, x + 9, y - 4);
    g.pop();
  }

  drawPerchedBird(g, x, y) {
    const col = Math.floor(frameCount / 18) % 4;
    const img = this.game.assets.getSheetFrame('characters/animals/ambient/bird_sheet.png', 16, 16, col, 0);
    if (img) g.image(img, x - 4, y - 9, 14, 14);
  }

  /** Esplanade pavée en mosaïque de pierre entourant la Fontaine à Vœux (100% marchable). */
  drawFountainPlazaGround(g, cx, cy) {
    g.push();
    g.noStroke();

    // Allée nord reliant le chemin principal à l'esplanade de la fontaine
    g.fill(158, 134, 126);
    g.rect(cx - 14, cy - 36, 28, 20);
    g.fill(236, 222, 194);
    g.rect(cx - 12, cy - 35, 24, 18);

    // Grand parvis ovale pavé (contour pierre + pavés crème + anneau mosaïque rose-doré)
    g.fill(134, 110, 114);
    g.ellipse(cx, cy + 2, 118, 56);
    g.fill(232, 218, 192);
    g.ellipse(cx, cy + 1, 114, 52);
    g.fill(244, 234, 210);
    g.ellipse(cx, cy + 1, 96, 44);

    // Anneau décoratif en briques pastel autour du bassin
    g.noFill();
    g.stroke(214, 178, 152);
    g.strokeWeight(1.5);
    g.ellipse(cx, cy + 1, 78, 35);
    g.stroke(189, 144, 142, 150);
    g.strokeWeight(1);
    for (let i = 0; i < 12; i++) {
      const a = (TWO_PI * i) / 12;
      g.line(
        Math.round(cx + Math.cos(a) * 32),
        Math.round(cy + 1 + Math.sin(a) * 14),
        Math.round(cx + Math.cos(a) * 54),
        Math.round(cy + 1 + Math.sin(a) * 24)
      );
    }

    // 4 petits parterres fleuris aux 4 coins diagonaux de l'esplanade
    g.noStroke();
    const beds = [
      { x: cx - 44, y: cy - 12, col: [248, 156, 182] },
      { x: cx + 44, y: cy - 12, col: [252, 222, 124] },
      { x: cx - 42, y: cy + 18, col: [164, 214, 244] },
      { x: cx + 42, y: cy + 18, col: [248, 156, 182] }
    ];
    for (const bd of beds) {
      g.fill(107, 75, 91);
      g.ellipse(bd.x, bd.y, 14, 8);
      g.fill(118, 178, 102);
      g.ellipse(bd.x, bd.y - 1, 12, 6);
      g.fill(bd.col[0], bd.col[1], bd.col[2]);
      g.rect(bd.x - 4, bd.y - 3, 2, 2);
      g.rect(bd.x + 1, bd.y - 2, 2, 2);
      g.fill(255, 246, 188);
      g.rect(bd.x - 1, bd.y - 1, 2, 2);
    }
    g.pop();
  }

  /** Grande Fontaine à Vœux sculptée à 3 niveaux avec pièces dorées, cascades et jets scintillants. */
  drawHubFountain(g, cx, cy, isNear) {
    const t = frameCount;
    const skyMood = this.game.save && this.game.save.data.skyMood === 'sunset' ? 'sunset' : 'day';
    const sb = typeof SkyBackdrop !== 'undefined' ? SkyBackdrop.getBlend(skyMood) : 0;

    g.push();
    g.noStroke();

    // Halo lumineux magique quand Moo s'approche (ou au coucher de soleil)
    if (isNear || sb > 0.1) {
      const a = isNear ? Math.round(36 + Math.sin(t * 0.14) * 16) : Math.round(24 * sb);
      g.fill(210, 246, 255, a);
      g.ellipse(cx, cy + 2, 66, 30);
    }

    // 1. Grand bassin inférieur en marbre crème sculpté
    g.fill(78, 62, 74, 70);
    g.ellipse(cx, cy + 7, 56, 22);
    g.fill(107, 75, 91);
    g.ellipse(cx, cy + 4, 52, 21);
    g.fill(226, 216, 204);
    g.ellipse(cx, cy + 1, 50, 19);
    g.fill(248, 242, 232);
    g.ellipse(cx, cy, 46, 16);

    // Eau turquoise scintillante du grand bassin + reflet coucher de soleil
    g.fill(98, 178, 212);
    g.ellipse(cx, cy + 1, 42, 13);
    g.fill(142, 214, 238);
    g.ellipse(cx, cy, 38, 10);
    if (sb > 0.1) {
      g.fill(255, 198, 152, Math.round(95 * sb));
      g.ellipse(cx, cy, 34, 8);
    }

    // Pièces porte-bonheur dorées scintillant au fond de l'eau !
    for (let i = 0; i < 5; i++) {
      const glint = Math.sin(t * 0.12 + i * 1.9) > 0.3;
      g.fill(glint ? g.color(255, 248, 184) : g.color(238, 192, 78, 190));
      const coinX = cx - 13 + i * 6.5;
      const coinY = cy + 1 + ((i % 2) ? 2 : -1);
      g.rect(Math.round(coinX), Math.round(coinY), 2, 1);
    }

    // 2 ondes concentriques animées sur le bassin
    g.noFill();
    g.strokeWeight(1);
    for (let r = 0; r < 2; r++) {
      const rip = ((t * 0.022) + r * 0.5) % 1;
      g.stroke(236, 252, 255, Math.round((1 - rip) * 175));
      g.ellipse(cx, cy + 1, 8 + rip * 30, 3 + rip * 9);
    }

    // 2. Pilier central + vasque intermédiaire avec cascades d'eau
    g.noStroke();
    g.fill(107, 75, 91);
    g.rect(cx - 5, cy - 13, 10, 14, 1);
    g.fill(214, 204, 194);
    g.rect(cx - 4, cy - 13, 8, 13);
    g.fill(244, 236, 226);
    g.rect(cx - 2, cy - 13, 3, 13);

    // Vasque du milieu (largeur 26)
    g.fill(107, 75, 91);
    g.ellipse(cx, cy - 12, 28, 10);
    g.fill(236, 228, 218);
    g.ellipse(cx, cy - 13, 26, 8);
    g.fill(142, 214, 238);
    g.ellipse(cx, cy - 13, 22, 6);

    // Petites cascades d'eau qui coulent de la vasque vers le grand bassin
    const dropOff = (t % 10) / 10;
    g.fill(218, 246, 255, 200);
    for (const dx of [-10, -4, 4, 10]) {
      g.rect(cx + dx, cy - 10 + Math.round(dropOff * 8), 2, 4);
    }

    // 3. Sommet sculpté + étoile dorée porte-bonheur + 6 jets d'eau en arche !
    g.fill(107, 75, 91);
    g.rect(cx - 3, cy - 23, 6, 10);
    g.fill(238, 230, 220);
    g.rect(cx - 2, cy - 23, 4, 9);
    g.fill(252, 214, 98);
    g.circle(cx, cy - 24, 5);
    g.fill(255, 250, 216);
    g.rect(cx - 1, cy - 25, 2, 2);

    // 6 gouttes d'eau en arcs gracieux (haut -> vasque -> bassin)
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.055 + i / 6) % 1;
      const dir = i % 2 === 0 ? 1 : -1;
      const span = i < 4 ? 11 : 16;
      const wx = Math.round(cx + dir * p * span);
      const wy = Math.round(cy - 24 - Math.sin(p * Math.PI) * 9 + p * 23);
      g.fill(228, 250, 255, Math.round(230 * (1 - p * 0.25)));
      g.rect(wx, wy, 2, 2);
    }

    // Étincelles magiques flottant au-dessus de la fontaine
    if (Math.floor(t / 12) % 2 === 0) {
      g.fill(255, 248, 186, 210);
      g.rect(cx - 14 + Math.round(Math.sin(t * 0.05) * 3), cy - 18, 2, 2);
      g.rect(cx + 12 + Math.round(Math.cos(t * 0.06) * 3), cy - 22, 2, 2);
    }

    g.pop();
  }

  drawGardenLamp(g, x, y, skyMood) {
    const sb = typeof SkyBackdrop !== 'undefined' ? SkyBackdrop.getBlend(skyMood) : (skyMood === 'sunset' ? 1 : 0);
    const glowA = Math.round((24 + 68 * sb) + Math.sin(frameCount * 0.08 + x) * 10);
    g.push();
    g.noStroke();
    g.fill(255, 224, 134, glowA);
    g.circle(x + 2, y + 3, 14 + sb * 18);
    if (sb > 0.15) {
      g.fill(255, 244, 182, Math.round(55 * sb));
      g.circle(x + 2, y + 3, 12);
    }
    g.fill(107, 75, 91);
    g.rect(x + 1, y + 5, 2, 14);
    g.rect(x, y + 17, 4, 2);
    g.rect(x, y, 4, 5, 1);
    g.fill(255, 242, 166);
    g.rect(x + 1, y + 1, 2, 3);
    g.pop();
  }

  drawSleepZzz(g, x, y) {
    const p = (frameCount * 0.022) % 1;
    const zx = Math.round(x + Math.sin(p * TWO_PI) * 2);
    const zy = Math.round(y - p * 10);
    const a = Math.round(Math.sin(p * Math.PI) * 210);
    if (a < 20) return;
    g.push();
    g.noStroke();
    g.fill(255, 250, 236, a);
    g.rect(zx, zy, 3, 1);
    g.rect(zx + 1, zy + 1, 1, 1);
    g.rect(zx, zy + 2, 3, 1);
    g.pop();
  }

  /** Ballon coloré numéroté (1..4) flottant au-dessus de chaque stand de mini-jeu. */
  drawBoothNumberBalloon(g, cx, cy, num, col) {
    const bob = Math.round(Math.sin(frameCount * 0.065 + num * 1.4) * 2);
    const by = cy + bob;
    g.push();
    g.stroke(107, 75, 91, 180);
    g.strokeWeight(1);
    g.line(cx, by + 6, cx, cy + 16);
    g.noStroke();
    g.fill(107, 75, 91);
    g.ellipse(cx, by, 13, 14);
    g.fill(col[0], col[1], col[2]);
    g.ellipse(cx, by, 11, 12);
    g.fill(255, 252, 240, 175);
    g.rect(cx - 3, by - 4, 2, 2);
    g.fill(255, 252, 244);
    g.textAlign(CENTER, CENTER);
    g.textSize(7);
    g.text(String(num), cx, by + 0.5);
    g.pop();
  }

  /** Stand de Limonade fraîche (3e stand gourmand de Sweet Street — Interactif !). */
  drawLemonadeStand(g, font, c, isNear) {
    const x = c.x;
    const y = c.y;
    g.push();
    g.noStroke();
    if (isNear) {
      g.fill(255, 248, 176, Math.round(28 + Math.sin(frameCount * 0.14) * 14));
      g.rect(x - 2, y + 4, c.w + 4, c.h, 4);
    }
    // Comptoir bois & citron pastel
    g.fill(107, 75, 91);
    g.rect(x + 4, y + 26, 40, 22, 2);
    g.fill(244, 214, 146);
    g.rect(x + 5, y + 27, 38, 20, 1);
    g.fill(252, 244, 218);
    g.rect(x + 5, y + 27, 38, 4);
    // Poteaux + auvent rayé jaune citron & crème
    g.fill(144, 98, 93);
    g.rect(x + 6, y + 12, 3, 16);
    g.rect(x + 39, y + 12, 3, 16);
    for (let i = 0; i < 6; i++) {
      g.fill(i % 2 === 0 ? g.color(252, 220, 96) : g.color(255, 250, 230));
      g.rect(x + 3 + i * 7, y + 6, 7, 8);
    }
    // Carafe de limonade + verres sur le comptoir
    g.fill(107, 75, 91);
    g.rect(x + 13, y + 19, 8, 9, 2);
    g.fill(255, 234, 94);
    g.rect(x + 14, y + 21, 6, 6, 1);
    g.fill(255, 250, 220);
    g.rect(x + 25, y + 22, 4, 5);
    g.rect(x + 31, y + 22, 4, 5);
    g.fill(255, 224, 88);
    g.rect(x + 26, y + 23, 2, 3);
    g.rect(x + 32, y + 23, 2, 3);
    PixelUI.panel(g, x + 3, y + 34, 42, 10, g.color(252, 244, 218));
    this.drawWorldSign(g, 'LEMONADE', x + 24, y + 39, g.color(154, 114, 34));
    g.pop();
  }

  /** Table de pique-nique en bois (Sweet Street). */
  drawPicnicTable(g, x, y) {
    g.push();
    g.noStroke();
    g.fill(68, 96, 62, 65);
    g.ellipse(x + 14, y + 15, 32, 8);
    // Bancs avant/arrière
    g.fill(107, 75, 91);
    g.rect(x, y + 11, 28, 4, 1);
    g.fill(198, 152, 108);
    g.rect(x + 1, y + 12, 26, 2);
    // Pieds + plateau principal
    g.fill(107, 75, 91);
    g.rect(x + 5, y + 8, 3, 7);
    g.rect(x + 20, y + 8, 3, 7);
    g.rect(x + 2, y + 2, 24, 8, 1);
    g.fill(222, 180, 132);
    g.rect(x + 3, y + 3, 22, 6);
    g.fill(244, 216, 174);
    g.rect(x + 3, y + 3, 22, 2);
    g.pop();
  }

  /** Scène de concert + Feux d'artifice (Aile Est — Interactif !). */
  drawConcertStage(g, font, s, isNear) {
    const x = s.x;
    const y = s.y;
    const t = frameCount;
    g.push();
    g.noStroke();
    if (isNear) {
      g.fill(255, 240, 176, Math.round(30 + Math.sin(t * 0.14) * 14));
      g.rect(x - 3, y + 2, s.w + 6, s.h + 2, 4);
    }
    // Cadre bois & fond de scène sombre
    g.fill(107, 75, 91);
    g.rect(x + 2, y + 10, s.w - 4, s.h - 10, 2);
    g.fill(78, 52, 74);
    g.rect(x + 5, y + 18, s.w - 10, 32);
    // Rideaux rouges de théâtre à gauche & droite
    g.fill(196, 82, 102);
    g.rect(x + 5, y + 18, 14, 30);
    g.rect(x + s.w - 19, y + 18, 14, 30);
    g.fill(224, 114, 130);
    g.rect(x + 7, y + 18, 4, 28);
    g.rect(x + s.w - 13, y + 18, 4, 28);
    // Micro cœur lumineux au centre de la scène
    g.fill(224, 216, 228);
    g.rect(x + 41, y + 31, 2, 14);
    g.fill(252, 152, 186);
    g.circle(x + 42, y + 29, 7);
    g.fill(255, 232, 240);
    g.rect(x + 40, y + 27, 2, 2);
    // Plancher bois + rampes lumineuses animées
    g.fill(198, 146, 104);
    g.rect(x + 4, y + 46, s.w - 8, 18);
    g.fill(228, 184, 138);
    g.rect(x + 4, y + 46, s.w - 8, 5);
    for (let i = 0; i < 9; i++) {
      const lit = (Math.floor(t / 10) + i) % 2 === 0;
      g.fill(lit ? g.color(255, 246, 160) : g.color(255, 174, 194));
      g.rect(x + 8 + i * 8, y + 51, 3, 3);
    }
    // Fronton STAGE + FIREWORKS
    PixelUI.panel(g, x + 4, y + 4, s.w - 8, 14, g.color(247, 236, 198));
    this.drawWorldSign(g, 'STAGE + FIREWORKS', x + s.w / 2, y + 11, g.color(168, 66, 88));
    g.pop();
  }

  /** Ruisseau scintillant, Pont en bois franchissable & Mare aux nénuphars (Aile Est). */
  drawEastCreekAndBridge(g) {
    const cx = this.creekX;
    const t = frameCount;
    g.push();
    g.noStroke();
    // Lit du ruisseau vertical (y = 94 .. 216)
    g.fill(102, 162, 184);
    g.rect(cx - 2, 94, 24, 122);
    g.fill(132, 198, 224);
    g.rect(cx, 94, 20, 122);
    // Mare aux nénuphars reliée au ruisseau (cx+34, y=214)
    g.fill(102, 162, 184);
    g.ellipse(cx + 34, 214, 56, 30);
    g.fill(132, 198, 224);
    g.ellipse(cx + 34, 214, 50, 24);
    // Reflets d'eau qui glissent vers le bas
    g.fill(220, 248, 255, 165);
    for (let i = 0; i < 5; i++) {
      const ry = 98 + ((t * 0.45 + i * 24) % 108);
      g.rect(cx + 4 + (i % 2) * 7, Math.round(ry), 5, 2);
    }
    // Nénuphars verts & fleurs de lotus roses sur la mare
    g.fill(106, 174, 98);
    g.ellipse(cx + 22, 212, 9, 5);
    g.ellipse(cx + 44, 218, 10, 6);
    g.fill(252, 174, 198);
    g.circle(cx + 44, 216, 4);
    g.fill(255, 242, 168);
    g.rect(cx + 43, 215, 2, 2);

    // Pont en bois traversant le chemin principal (y = 142 .. 176, 100% marchable !)
    g.fill(107, 75, 91);
    g.rect(cx - 5, 142, 30, 34, 2);
    for (let px = cx - 3; px < cx + 23; px += 4) {
      g.fill((px % 8 === 0) ? g.color(206, 160, 114) : g.color(222, 178, 130));
      g.rect(px, 144, 3, 30);
    }
    // Rambardes haut & bas du pont
    g.fill(107, 75, 91);
    g.rect(cx - 5, 140, 30, 4);
    g.rect(cx - 5, 173, 30, 4);
    g.fill(176, 128, 88);
    g.rect(cx - 4, 141, 28, 2);
    g.rect(cx - 4, 174, 28, 2);
    g.pop();
  }

  drawMapSignpost(g, font, m) {
    g.push();
    g.noStroke();
    g.fill(107, 75, 91);
    g.rect(m.x + 9, m.y + 20, 6, 16);
    g.fill(166, 118, 92);
    g.rect(m.x + 10, m.y + 20, 4, 15);
    PixelUI.panel(g, m.x, m.y, m.w, 22, g.color(247, 236, 198));
    g.fill(112, 162, 198);
    g.rect(m.x + 1, m.y + 1, m.w - 2, 9);
    this.drawWorldSign(g, 'MAP', m.x + m.w / 2, m.y + 5, g.color(255, 252, 238));
    g.fill(189, 117, 126); g.rect(m.x + 4,  m.y + 14, 3, 3);
    g.fill(114, 172, 106); g.rect(m.x + 11, m.y + 14, 3, 3);
    g.fill(112, 162, 198); g.rect(m.x + 18, m.y + 14, 3, 3);
    g.pop();
  }

  /** Convertit une coordonnée monde (wx, wy) vers le cadre de la mini-carte illustrée. */
  worldToMiniMap(wx, wy) {
    const { ox, oy } = this.getOverlayOffsets();
    const mx0 = ox + 52;
    const my0 = oy + 62;
    const mw = 376;
    const mh = 128;
    const nx = constrain((wx - this.worldLeft) / (this.worldRight - this.worldLeft), 0, 1);
    const ny = constrain((wy - 60) / (244 - 60), 0, 1);
    return { x: Math.round(mx0 + nx * mw), y: Math.round(my0 + ny * mh), mx0, my0, mw, mh };
  }

  /** Tous les stands & attractions cliquables sur la mini-carte (téléportation directe !). */
  getMapDestinations() {
    const spots = [
      { id: 'cotton_candy', label: 'Cotton Candy Cart', wx: -384, wy: 108, targetX: -384, targetY: 146, kind: 'sweets' },
      { id: 'lemonade',     label: 'Lemonade Stand',    wx: -312, wy: 108, targetX: -312, targetY: 146, kind: 'sweets' },
      { id: 'prize',        label: 'Prize Boutique',    wx: -240, wy: 105, targetX: -240, targetY: 148, kind: 'prize' },
      { id: 'popcorn',      label: 'Popcorn Cart',      wx: -96,  wy: 108, targetX: -96,  targetY: 146, kind: 'popcorn' },
      { id: 'derby',        label: 'Bunny Derby',       wx: 57,   wy: 105, targetX: 57,   targetY: 148, kind: 'derby' },
      { id: 'snake',        label: 'PokeMoo Feast!!',   wx: 147,  wy: 105, targetX: 147,  targetY: 148, kind: 'snake' },
      { id: 'ferris',       label: 'Ferris Wheel Plaza',wx: 240,  wy: 96,  targetX: 240,  targetY: 162, kind: 'ferris' },
      { id: 'ducklings',    label: 'Catch the Purins!', wx: 333,  wy: 105, targetX: 333,  targetY: 148, kind: 'ducklings' },
      { id: 'fox',          label: 'The Legend of Moo', wx: 423,  wy: 105, targetX: 423,  targetY: 148, kind: 'fox' },
      { id: 'carousel',     label: 'Mini Carousel',     wx: 578,  wy: 102, targetX: 578,  targetY: 148, kind: 'carousel' },
      { id: 'fountain',     label: 'Wishing Fountain',  wx: 578,  wy: 204, targetX: 578,  targetY: 222, kind: 'fountain' },
      { id: 'stage',        label: 'Stage + Fireworks', wx: 718,  wy: 102, targetX: 718,  targetY: 148, kind: 'tarot' },
      { id: 'rings',        label: 'Ring Toss (Soon)',  wx: 879,  wy: 105, targetX: 879,  targetY: 148, kind: 'rings' }
    ];
    return spots.map((s) => {
      const p = this.worldToMiniMap(s.wx, s.wy);
      return { ...s, cx: p.x, cy: p.y, x: p.x - 13, y: p.y - 11, w: 26, h: 22 };
    });
  }

  /** Mini-carte illustrée adorable montrant les 3 ailes, chemins, mare, stands, logos & position de Moo. */
  drawMapOverlay(g) {
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    const { ox, oy, vw, vh } = this.getOverlayOffsets();
    const t = frameCount;

    g.push();
    g.noStroke();
    g.fill(26, 20, 32, 135);
    g.rect(0, 0, vw, vh);

    // Cadre parchemin principal de la carte
    PixelUI.panel(g, ox + 40, oy + 28, 400, 212, g.color(250, 242, 212));
    g.fill(112, 162, 198);
    g.rect(ox + 42, oy + 30, 396, 22, 1);
    PixelUI.txt(g, font, "MOO'S FUNFAIR — MINI MAP", ox + 240, oy + 35, g.color(255, 252, 238), CENTER, 10);

    // Zone prairie illustrée de la mini-carte (mx0..mx0+mw, my0..my0+mh)
    const mx0 = ox + 52;
    const my0 = oy + 62;
    const mw = 376;
    const mh = 128;
    PixelUI.panel(g, mx0, my0, mw, mh, g.color(164, 208, 114));

    // Lignes subtiles séparant les 3 ailes (West | Main Plaza | East)
    g.stroke(134, 182, 92);
    g.strokeWeight(1);
    g.line(mx0 + Math.round(mw / 3), my0 + 2, mx0 + Math.round(mw / 3), my0 + mh - 2);
    g.line(mx0 + Math.round((mw * 2) / 3), my0 + 2, mx0 + Math.round((mw * 2) / 3), my0 + mh - 2);
    g.noStroke();

    // Allée sable principale + place circulaire centrale + entrée sud
    const pathY = this.worldToMiniMap(0, 155).y;
    g.fill(218, 194, 148);
    g.rect(mx0 + 4, pathY - 10, mw - 8, 20, 4);
    g.fill(236, 216, 174);
    g.rect(mx0 + 5, pathY - 8, mw - 10, 16, 3);
    const plazaC = this.worldToMiniMap(240, 166);
    g.fill(218, 194, 148); g.ellipse(plazaC.x, plazaC.y, 44, 30);
    g.fill(236, 216, 174); g.ellipse(plazaC.x, plazaC.y, 38, 24);
    g.rect(plazaC.x - 6, plazaC.y + 8, 12, my0 + mh - plazaC.y - 10);

    // Petits cerisiers roses & arbres verts le long du bord haut
    for (const tr of this.ambientTrees) {
      const tp = this.worldToMiniMap(tr.x + 12, tr.y + 14);
      g.fill(tr.kind.startsWith('cherry') ? g.color(246, 176, 198) : g.color(112, 166, 86));
      g.circle(tp.x, tp.y, 8);
    }

    // Mare aux canetons (bleu) + Coin Pique-nique (rose)
    const pondP = this.worldToMiniMap(this.pondCenter.x, this.pondCenter.y);
    g.fill(128, 194, 218); g.ellipse(pondP.x, pondP.y, 24, 14);
    g.fill(252, 224, 118); g.circle(pondP.x - 3, pondP.y - 1, 3); g.circle(pondP.x + 4, pondP.y + 1, 3);
    const picP = this.worldToMiniMap(50, 212);
    g.fill(244, 162, 176); g.rect(picP.x - 7, picP.y - 5, 14, 10, 2);
    g.fill(255, 244, 232); g.rect(picP.x - 5, picP.y - 3, 4, 3); g.rect(picP.x + 1, picP.y + 1, 4, 3);

    // Dessiner tous les stands & attractions miniatures cliquables (et sélectionnables au clavier !)
    const dests = this.getMapDestinations();
    if (this.mapIdx === undefined) this.mapIdx = 0;
    if (this.mapIdx >= dests.length) this.mapIdx = 0;
    let hoveredDest = null;
    for (let di = 0; di < dests.length; di++) {
      const d = dests[di];
      const hov = PixelUI.pointInRect(mx, my, d);
      if (hov) {
        hoveredDest = d;
        this.mapIdx = di;
      }
      const isSel = di === this.mapIdx;

      if (hov || isSel) {
        g.fill(255, 248, 168, hov ? 210 : 175);
        g.circle(d.cx, d.cy, 22);
      }

      if (['derby', 'snake', 'ducklings', 'fox'].includes(d.kind)) {
        // Mini stand de jeu + son vrai logo thématique !
        g.fill(107, 75, 91); g.rect(d.cx - 9, d.cy - 8, 18, 16, 2);
        g.fill(247, 236, 198); g.rect(d.cx - 8, d.cy - 7, 16, 14, 1);
        this.drawGameLogo(g, d.kind, d.cx, d.cy, 0.85);
      } else if (d.kind === 'ferris') {
        // Mini Grande Roue tournante !
        g.noFill();
        g.stroke(107, 75, 91); g.strokeWeight(2); g.circle(d.cx, d.cy, 18);
        g.stroke(252, 224, 128); g.strokeWeight(1); g.circle(d.cx, d.cy, 15);
        g.noStroke();
        for (let i = 0; i < 6; i++) {
          const a = t * 0.03 + (TWO_PI * i) / 6;
          g.fill(i % 2 === 0 ? g.color(246, 152, 174) : g.color(158, 212, 236));
          g.circle(d.cx + Math.cos(a) * 8, d.cy + Math.sin(a) * 8, 3);
        }
      } else if (d.kind === 'carousel') {
        // Mini Carrousel rayé
        g.fill(107, 75, 91); g.circle(d.cx, d.cy, 17);
        g.fill(246, 152, 174); g.circle(d.cx, d.cy, 14);
        g.fill(252, 244, 214); g.circle(d.cx, d.cy, 8);
        g.fill(248, 208, 86); g.circle(d.cx, d.cy, 3);
      } else if (d.kind === 'fountain') {
        // Mini Fontaine à Vœux
        g.fill(107, 75, 91); g.circle(d.cx, d.cy, 14);
        g.fill(138, 206, 230); g.circle(d.cx, d.cy, 11);
        g.fill(255, 250, 236); g.circle(d.cx, d.cy, 4);
      } else if (d.kind === 'prize') {
        // Mini Prize Boutique (paquet cadeau rose & doré)
        g.fill(107, 75, 91); g.rect(d.cx - 8, d.cy - 7, 16, 14, 2);
        g.fill(246, 152, 174); g.rect(d.cx - 7, d.cy - 6, 14, 12, 1);
        g.fill(255, 234, 134); g.rect(d.cx - 1, d.cy - 6, 2, 12); g.rect(d.cx - 7, d.cy - 1, 14, 2);
      } else {
        // Chariots Sweets / Popcorn / Tarot / Rings
        const colMap = {
          sweets: [248, 178, 198],
          popcorn: [236, 114, 110],
          tarot: [198, 164, 224],
          rings: [176, 222, 154]
        };
        const cc = colMap[d.kind] || [232, 207, 166];
        g.fill(107, 75, 91); g.rect(d.cx - 7, d.cy - 6, 14, 12, 2);
        g.fill(cc[0], cc[1], cc[2]); g.rect(d.cx - 6, d.cy - 5, 12, 10, 1);
      }
    }

    // Étiquettes discrètes des 3 ailes en bas de la mini-carte
    PixelUI.txt(g, font, 'WEST: SHOP & TREATS', mx0 + Math.round(mw / 6), my0 + mh - 12, g.color(72, 106, 62), CENTER, 6.8);
    PixelUI.txt(g, font, 'MAIN PLAZA', mx0 + Math.round(mw / 2), my0 + mh - 12, g.color(72, 106, 62), CENTER, 6.8);
    PixelUI.txt(g, font, 'EAST: RIDES & WISH', mx0 + Math.round((mw * 5) / 6), my0 + mh - 12, g.color(72, 106, 62), CENTER, 6.8);

    // Marqueur animé en direct de Moo (suit X et Y dans tout le parc !)
    const mp = this.worldToMiniMap(this.moo.pos.x, this.moo.pos.y);
    const pinY = mp.y + Math.round(Math.sin(t * 0.16) * 1.5);
    g.fill(107, 75, 91); g.circle(mp.x, pinY, 10);
    g.fill(246, 134, 164); g.circle(mp.x, pinY, 8);
    g.fill(255, 250, 228); g.circle(mp.x, pinY, 4);
    // Petites oreilles de lapin sur le marqueur de Moo !
    g.fill(246, 134, 164);
    g.rect(mp.x - 3, pinY - 8, 2, 4);
    g.rect(mp.x + 1, pinY - 8, 2, 4);

    // Barre d'info en bas : nom du lieu sélectionné/survolé + astuce clic/clavier
    const activeDest = hoveredDest || dests[this.mapIdx];
    const infoTxt = activeDest
      ? 'Click or Enter/Space -> ' + activeDest.label + '  (Arrows to switch)'
      : 'Arrows / Click any attraction to fast-travel!  •  Esc / M to close';
    PixelUI.panel(g, ox + 52, oy + 198, 376, 20, activeDest ? g.color(223, 240, 187) : g.color(244, 232, 194));
    PixelUI.txt(g, font, infoTxt, ox + 240, oy + 203, activeDest ? g.color(62, 106, 70) : g.color(107, 75, 91), CENTER, 8.2, 366);
    PixelUI.txt(g, font, 'Pink Bunny Pin = You are here!', ox + 240, oy + 223, g.color(168, 86, 98), CENTER, 7.5);
    g.pop();
  }

  drawHud(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const vw = this.game.viewW || BUFFER_W;
    const tickets = this.game.save.data.tickets;
    PixelUI.panel(g, 6, 6, 56, 16);
    const ticketSp = assets.getSprite('ticket');
    if (ticketSp) g.image(ticketSp, 10, 8);
    PixelUI.txt(g, font, 'x ' + tickets, 28, 9, g.color(107, 75, 91), LEFT, 9, 32);

    if (Vehicle.debug && this.showTicketCheat) {
      const { mx, my } = this.game.getMouseBufferPos();
      const hov = PixelUI.pointInRect(mx, my, this.ticketPlusBtn);
      PixelUI.panel(
        g, this.ticketPlusBtn.x, this.ticketPlusBtn.y, this.ticketPlusBtn.w, this.ticketPlusBtn.h,
        hov ? g.color(202, 236, 162) : g.color(223, 240, 187)
      );
      PixelUI.txt(g, font, '+', this.ticketPlusBtn.x + 9, this.ticketPlusBtn.y + 3, g.color(62, 108, 70), CENTER, 10);
    }
  }

  getOverlayOffsets() {
    const vw = this.game.viewW || BUFFER_W;
    const vh = this.game.viewH || BUFFER_H;
    return { ox: Math.floor((vw - BUFFER_W) / 2), oy: Math.floor((vh - BUFFER_H) / 2), vw, vh };
  }

  cardRects() {
    const { ox, oy } = this.getOverlayOffsets();
    const x0 = ox + 80;
    const y0 = oy + 66;
    return this.booths.map((gm, i) => ({
      gm,
      x: x0 + (i % 2) * 164,
      y: y0 + Math.floor(i / 2) * 64,
      w: 156,
      h: 56
    }));
  }

  /** Dessine le nouveau logo thématique d'un mini-jeu centré en (cx, cy) à l'échelle `sc`. */
  drawGameLogo(g, id, cx, cy, sc = 1) {
    g.push();
    g.translate(Math.round(cx), Math.round(cy));
    g.scale(sc);
    g.noStroke();
    if (id === 'derby') {
      // Drapeau à damier de course
      g.fill(107, 75, 91);
      g.rect(-5, -4, 1, 9);
      g.fill(252, 248, 236);
      g.rect(-4, -4, 9, 6);
      g.fill(58, 44, 56);
      g.rect(-4, -4, 3, 2); g.rect(2, -4, 3, 2);
      g.rect(-1, -2, 3, 2);
      g.rect(-4, 0, 3, 2);  g.rect(2, 0, 3, 2);
    } else if (id === 'snake') {
      // Poké Ball
      g.fill(107, 75, 91); g.circle(0, 0, 11);
      g.fill(220, 74, 80); g.arc(0, 0, 9, 9, PI, TWO_PI);
      g.fill(250, 248, 240); g.arc(0, 0, 9, 9, 0, PI);
      g.fill(58, 44, 56); g.rect(-5, -1, 10, 2);
      g.fill(250, 248, 240); g.circle(0, 0, 3);
    } else if (id === 'ducklings') {
      // Empreinte de patte marron (Purins)
      g.fill(128, 78, 50);
      g.ellipse(0, 2, 7, 5);
      g.circle(-4, -2, 3);
      g.circle(0, -3, 3);
      g.circle(4, -2, 3);
      g.fill(164, 108, 72);
      g.rect(-1, 1, 2, 1);
    } else if (id === 'fox') {
      // Triforce dorée avec contour net prune-brun
      g.stroke(107, 75, 91);
      g.strokeWeight(1.1);
      g.fill(244, 192, 46);
      g.triangle(0, -5, -4, 0, 4, 0);
      g.triangle(-4, 0, -8, 5, 0, 5);
      g.triangle(4, 0, 0, 5, 8, 5);
      g.noStroke();
    }
    g.pop();
  }

  drawPosterOverlay(g) {
    const assets = this.game.assets;
    const font = assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    const { ox, oy, vw, vh } = this.getOverlayOffsets();

    g.noStroke();
    g.fill(0, 0, 0, 110);
    g.rect(0, 0, vw, vh);

    PixelUI.panel(g, ox + 70, oy + 34, 340, 176);
    g.fill(189, 117, 126);
    g.rect(ox + 70, oy + 34, 340, 22);
    PixelUI.txt(g, font, "TODAY'S GAMES", ox + 240, oy + 40, g.color(243, 244, 231), CENTER, 10);

    if (this.posterIdx === undefined) this.posterIdx = 0;
    this.cardRects().forEach((c, i) => {
      const hov = PixelUI.pointInRect(mx, my, c);
      if (hov) this.posterIdx = i;
      const sel = i === this.posterIdx;
      const yy = Math.round(c.y + (sel ? -2 + Math.sin(frameCount * 0.3) : 0));
      PixelUI.panel(g, c.x, yy, c.w, c.h, sel ? g.color(223, 240, 187) : g.color(232, 207, 166));
      PixelUI.txt(g, font, (sel ? '> ' : '') + c.gm.title, c.x + 8, yy + 5, sel ? g.color(62, 106, 70) : g.color(107, 75, 91), LEFT, 9, c.w - 14);
      // Nouveau logo thématique encadré (2x) sur chaque carte du poster
      PixelUI.panel(g, c.x + 8, yy + 25, 26, 24, g.color(247, 236, 198));
      this.drawGameLogo(g, c.gm.id, c.x + 21, yy + 37, 1.5);
      const stars = this.game.save.data.stars[c.gm.id] || 0;
      PixelUI.txt(g, font, 'press ' + (i + 1) + '  [' + '*'.repeat(stars) + '-'.repeat(3 - stars) + ']', c.x + 42, yy + 32, g.color(144, 98, 93), LEFT, 8.5, 108);
    });
    PixelUI.txt(g, font, 'Arrows / 1-4: Pick  •  Space/Enter: Play  •  Esc / M: Close', ox + 240, oy + 190, g.color(144, 98, 93), CENTER, 8);
  }

  /** Géométrie des boutons de choix dans la boîte de dialogue RPG. */
  getDialogueChoiceRects() {
    if (!this.activeDialogue || this.activeDialogue.stage !== 'ASK') return [];
    const { ox, oy } = this.getOverlayOffsets();
    return this.activeDialogue.choices.map((ch, i) => ({
      idx: i,
      label: ch.label,
      x: ox + 66,
      y: oy + 206 + i * 24,
      w: 348,
      h: 20
    }));
  }

  /** Boîte de dialogue RPG chaleureuse en bas de l'écran (avec choix cliquables / 1-2 / Space). */
  drawDialogueOverlay(g) {
    const d = this.activeDialogue;
    if (!d) return;
    const font = this.game.assets.font;
    const { mx, my } = this.game.getMouseBufferPos();
    const { ox, oy } = this.getOverlayOffsets();

    const bx = ox + 52;
    const by = d.stage === 'ASK' ? oy + 158 : oy + 186;
    const bw = 376;
    const bh = d.stage === 'ASK' ? 102 : 70;

    PixelUI.panel(g, bx, by, bw, bh, g.color(250, 242, 212));
    // Étiquette du nom du personnage
    PixelUI.panel(g, bx + 10, by - 12, 118, 16, g.color(189, 117, 126));
    PixelUI.txt(g, font, d.speaker, bx + 69, by - 9, g.color(255, 252, 238), CENTER, 8.5, 110);

    PixelUI.txt(g, font, d.text, bx + 14, by + 12, g.color(82, 52, 66), LEFT, 9, bw - 28);

    if (d.stage === 'ASK') {
      if (this.dialogueChoiceIdx === undefined) this.dialogueChoiceIdx = 0;
      const rects = this.getDialogueChoiceRects();
      for (const r of rects) {
        const hov = PixelUI.pointInRect(mx, my, r);
        if (hov) this.dialogueChoiceIdx = r.idx;
        const sel = this.dialogueChoiceIdx === r.idx;
        PixelUI.drawButton(
          g, font, r, (sel ? '> ' : '') + r.label, sel,
          g.color(238, 224, 186), g.color(223, 240, 187)
        );
      }
    } else {
      PixelUI.txt(g, font, 'Press Space or click to continue...', bx + bw - 14, by + bh - 16, g.color(144, 98, 93), RIGHT, 7.5);
    }
  }

  cleanup() {
    this.closeWishModal();
  }

  enterGame(gameId) {
    this.overlay = false;
    this.mapOverlay = false;
    this.moo.stop();
    this.game.sound.playSfx('ui_click');
    this.game.scenes.switchTo(gameId, { fromBooth: gameId });
  }

  mousePressed(mx, my) {
    const { ox, oy } = this.getOverlayOffsets();
    if (this.wishModalOpen) return;
    if (this.prizeShop && this.prizeShop.open) { this.prizeShop.mousePressed(mx, my); return; }

    if (this.activeDialogue) {
      if (this.activeDialogue.stage === 'ASK') {
        const hit = this.getDialogueChoiceRects().find((r) => PixelUI.pointInRect(mx, my, r));
        if (hit) this.pickDialogueChoice(hit.idx);
      } else {
        this.closeDialogue();
      }
      return;
    }

    if (Vehicle.debug && this.showTicketCheat && !this.overlay && !this.mapOverlay && PixelUI.pointInRect(mx, my, this.ticketPlusBtn)) {
      this.game.save.addTickets(50);
      this.game.sound.playSfx('success_bell', 0.65);
      return;
    }

    if (this.mapOverlay) {
      const hit = this.getMapDestinations().find((d) => PixelUI.pointInRect(mx, my, d));
      if (hit) {
        this.moo.pos.set(hit.targetX, hit.targetY);
        this.moo.stop();
        this.mapOverlay = false;
        this.game.sound.playSfx('ui_click', 0.8);
        return;
      }
      if (mx < ox + 40 || mx > ox + 440 || my < oy + 28 || my > oy + 240) this.mapOverlay = false;
      return;
    }

    if (this.overlay) {
      const card = this.cardRects().find((c) => PixelUI.pointInRect(mx, my, c));
      if (card) this.enterGame(card.gm.id);
      else if (mx < ox + 70 || mx > ox + 410 || my < oy + 34 || my > oy + 210) this.overlay = false;
      return;
    }

    const wx = mx + this.camX;
    const wy = my - oy;

    const hitBox = (b) => wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h;
    if (hitBox(this.mapBoardPos)) { this.moo.stop(); this.game.sound.playSfx('ui_click'); this.mapOverlay = true; return; }
    if (hitBox(this.prizeBoothPos)) { this.moo.stop(); this.prizeShop.show(); return; }
    if (hitBox(this.posterPos)) { this.game.sound.playSfx('ui_click'); this.overlay = true; return; }
    if (hitBox(this.cottonCartPos)) { this.interactWithProp('cotton_candy'); return; }
    if (hitBox(this.lemonadeCartPos)) { this.interactWithProp('lemonade'); return; }
    if (hitBox(this.popcornCartPos)) { this.interactWithProp('popcorn'); return; }
    if (hitBox(this.carouselPos)) { this.interactWithProp('carousel'); return; }
    if (hitBox(this.stagePos)) { this.interactWithProp('stage'); return; }
    if (dist(wx, wy, this.fountainPos.x, this.fountainPos.y) < 22) { this.interactWithProp('fountain'); return; }

    const t = this.triggers.find(({ rect: [x, y, w, h] }) => wx > x - 8 && wx < x + w + 8 && wy > y - 64 && wy < y + h + 4);
    if (t) { this.moo.setTarget(t.stand[0], t.stand[1]); return; }
    this.moo.setTarget(wx, wy);
  }

  keyPressed(k, kc) {
    if (this.wishModalOpen) return;
    if (this.prizeShop && this.prizeShop.open) { this.prizeShop.keyPressed(k, kc); return; }

    if (this.activeDialogue) {
      if (this.activeDialogue.stage === 'ASK') {
        const count = this.activeDialogue.choices.length || 2;
        if (this.dialogueChoiceIdx === undefined) this.dialogueChoiceIdx = 0;
        if (kc === UP_ARROW || k === 'w' || k === 'W' || k === 'z' || k === 'Z') {
          this.dialogueChoiceIdx = (this.dialogueChoiceIdx - 1 + count) % count;
          this.game.sound.playSfx('ui_click', 0.5);
        } else if (kc === DOWN_ARROW || k === 's' || k === 'S') {
          this.dialogueChoiceIdx = (this.dialogueChoiceIdx + 1) % count;
          this.game.sound.playSfx('ui_click', 0.5);
        } else if (k === ' ' || kc === ENTER) {
          this.pickDialogueChoice(this.dialogueChoiceIdx);
          this.dialogueChoiceIdx = 0;
        } else if (k === '1') {
          this.pickDialogueChoice(0);
          this.dialogueChoiceIdx = 0;
        } else if (k === '2') {
          this.pickDialogueChoice(1);
          this.dialogueChoiceIdx = 0;
        } else if (kc === ESCAPE) {
          this.activeDialogue = null;
        }
      } else if (k === ' ' || kc === ENTER || kc === ESCAPE) {
        this.closeDialogue();
      }
      return;
    }

    if (Vehicle.debug) {
      if (k === 'n' || k === 'N') { this.secretLastWasN = true; this.secretStarCount = 0; return; }
      if (k === '*') {
        if (this.secretLastWasN) {
          this.showTicketCheat = false; this.secretLastWasN = false; this.secretStarCount = 0;
          this.game.sound.playSfx('ui_click', 0.5); return;
        }
        this.secretStarCount++;
        if (this.secretStarCount >= 3) {
          this.showTicketCheat = true; this.secretStarCount = 0;
          this.game.sound.playSfx('success_bell', 0.7);
        }
        return;
      }
      this.secretLastWasN = false;
      this.secretStarCount = 0;
    }

    if (k === 't' || k === 'T') {
      const next = this.game.save.data.skyMood === 'sunset' ? 'day' : 'sunset';
      this.game.save.data.skyMood = next;
      this.game.save.save();
      this.game.sound.playSfx('ui_click', 0.7);
      this.showToast(next === 'sunset' ? 'Sky: Sunset Glow!' : 'Sky: Sunny Day!', 1800);
      return;
    }

    if (k === 'm' || k === 'M') {
      this.game.sound.playSfx('ui_click');
      this.overlay = false;
      this.mapOverlay = !this.mapOverlay;
      return;
    }

    if (k === 'p' || k === 'P') {
      this.game.sound.playSfx('ui_click');
      this.mapOverlay = false;
      this.overlay = !this.overlay;
      return;
    }

    // Navigation clavier dans la mini-carte (Park Map)
    if (this.mapOverlay) {
      const dests = this.getMapDestinations();
      if (dests.length > 0) {
        if (this.mapIdx === undefined) this.mapIdx = 0;
        if (kc === LEFT_ARROW || k === 'a' || k === 'A' || k === 'q' || k === 'Q' || kc === UP_ARROW || k === 'w' || k === 'W' || k === 'z' || k === 'Z') {
          this.mapIdx = (this.mapIdx - 1 + dests.length) % dests.length;
          this.game.sound.playSfx('ui_click', 0.45);
        } else if (kc === RIGHT_ARROW || k === 'd' || k === 'D' || kc === DOWN_ARROW || k === 's' || k === 'S') {
          this.mapIdx = (this.mapIdx + 1) % dests.length;
          this.game.sound.playSfx('ui_click', 0.45);
        } else if (k === ' ' || kc === ENTER) {
          const hit = dests[this.mapIdx];
          if (hit) {
            this.moo.pos.set(hit.targetX, hit.targetY);
            this.moo.stop();
            this.mapOverlay = false;
            this.game.sound.playSfx('ui_click', 0.8);
          }
        }
      }
      return;
    }

    // Navigation clavier dans l'overlay "Today's Games" (grille 2x2)
    if (this.overlay) {
      if (this.posterIdx === undefined) this.posterIdx = 0;
      if (k >= '1' && k <= '4') {
        const gm = this.booths[parseInt(k, 10) - 1];
        if (gm) this.enterGame(gm.id);
      } else if (kc === LEFT_ARROW || kc === RIGHT_ARROW || k === 'a' || k === 'A' || k === 'd' || k === 'D' || k === 'q' || k === 'Q') {
        this.posterIdx = this.posterIdx ^ 1;
        this.game.sound.playSfx('ui_click', 0.45);
      } else if (kc === UP_ARROW || kc === DOWN_ARROW || k === 'w' || k === 'W' || k === 's' || k === 'S' || k === 'z' || k === 'Z') {
        this.posterIdx = (this.posterIdx + 2) % 4;
        this.game.sound.playSfx('ui_click', 0.45);
      } else if (k === ' ' || kc === ENTER) {
        const gm = this.booths[this.posterIdx];
        if (gm) this.enterGame(gm.id);
      }
      return;
    }

    if (k === ' ' && !this.overlay && !this.mapOverlay) {
      if (this.promptTrigger) {
        const id = this.promptTrigger.id;
        if (id === 'poster') { this.game.sound.playSfx('ui_click'); this.overlay = true; }
        else if (id === 'map') { this.game.sound.playSfx('ui_click'); this.mapOverlay = true; }
        else if (id === 'prize') { this.moo.stop(); this.prizeShop.show(); }
        else if (['cotton_candy', 'lemonade', 'popcorn', 'carousel', 'stage', 'fountain'].includes(id)) { this.interactWithProp(id); }
        else { this.enterGame(id); }
      } else if (this.nearbyVisitor) {
        this.startNpcDialogue(this.nearbyVisitor);
      }
    }
  }
}
