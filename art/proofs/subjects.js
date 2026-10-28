// Three proof subjects drawn with the PA renderer, and five candidate styles (PLAN D7). The
// figures are original archetypes for a Boss, a Monster Room and a Hero; none copies a printed card.
(function () {
  'use strict';
  const PA = globalThis.PA;
  const W = 80;
  const H = 112; // 5:7, the card's aspect

  // ------------------------------------------------------------------ shared scene helpers
  const darken = (cv, x, y, d) => {
    if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
    cv.s[y * cv.w + x] = Math.max(0, Math.min(1, cv.s[y * cv.w + x] + d));
  };
  const bricks = (cv, x0, y0, x1, y1, h = 6, w = 11) => {
    for (let y = y0; y < y1; y++) {
      const row = Math.floor((y - y0) / h);
      for (let x = x0; x < x1; x++) {
        const off = row % 2 ? Math.floor(w / 2) : 0;
        if ((y - y0) % h === 0) darken(cv, x, y, -0.22);
        else if ((x - x0 + off) % w === 0) darken(cv, x, y, -0.2);
        else if ((y - y0) % h === 1) darken(cv, x, y, 0.08);
      }
    }
  };
  const floorTiles = (cv, y0) => {
    for (let y = y0; y < H; y++) {
      const depth = (y - y0) / (H - y0);
      if (Math.round((y - y0) ** 1.35) % 5 === 0) for (let x = 0; x < W; x++) darken(cv, x, y, -0.18);
      for (let k = -6; k <= 6; k++) {
        const x = Math.round(W / 2 + k * (6 + depth * 10));
        darken(cv, x, y, -0.16);
      }
    }
  };
  const torch = (cv, x, y) => {
    cv.rect(x - 1, y, 3, 7, 'wood', { flat: 0.45 });
    cv.ellipse(x + 0.5, y - 2, 2.8, 4.2, 'fire', { flat: 0.35 });
    cv.ellipse(x + 0.5, y - 1.4, 1.8, 2.8, 'fire', { flat: 0.68 });
    cv.ellipse(x + 0.5, y - 0.8, 0.9, 1.4, 'fire', { flat: 1 });
    cv.light(x, y - 2, 26, 0.55);
  };
  const shadow = (cv, cx, cy, rx, ry) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1) darken(cv, x, y, -0.35 * (1 - d * 0.6));
    }
  };
  const rivet = (cv, x, y, mat = 'armor') => {
    cv.px(x, y, mat, 1);
    cv.px(x + 1, y + 1, mat, 0.15);
  };

  // ------------------------------------------------------------------ Boss: vampire lord on a throne
  const vampireLord = (cv) => {
    cv.scene();
    cv.rect(0, 0, W, 90, 'stone', { flat: 0.44, grad: 0.3, bevel: false });
    bricks(cv, 0, 0, W, 90);
    // Two tall lancet windows letting in moonlight.
    for (const wx of [18, 56]) {
      cv.poly([[wx, 26], [wx, 10], [wx + 3, 5], [wx + 6, 10], [wx + 6, 26]], 'sky', { flat: 0.42, grad: 0.4, bevel: false });
      cv.light(wx + 3, 14, 12, 0.2);
    }
    // Pillars.
    for (const px of [2, 68]) {
      cv.rect(px, 0, 10, 92, 'stone', { flat: 0.5, gradX: 0.45, bevel: false });
      for (let y = 6; y < 92; y += 12) for (let x = px; x < px + 10; x++) darken(cv, x, y, -0.2);
    }
    torch(cv, 13, 48);
    torch(cv, 66, 48);
    // Throne back: tall spiked chair.
    cv.poly([[20, 92], [20, 40], [24, 26], [28, 34], [33, 20], [40, 12], [47, 20], [52, 34], [56, 26], [60, 40], [60, 92]], 'wood', { flat: 0.38, grad: 0.25 });
    cv.poly([[23, 92], [23, 44], [57, 44], [57, 92]], 'carpet', { flat: 0.35, grad: 0.2 });
    // Floor with a carpet running toward the viewer.
    cv.rect(0, 90, W, 22, 'floor', { flat: 0.5, grad: -0.25, bevel: false });
    floorTiles(cv, 90);
    cv.poly([[30, 90], [50, 90], [60, 112], [20, 112]], 'carpet', { flat: 0.55, grad: -0.2, bevel: false });
    cv.line(30, 90, 20, 111, 'gold', 0.55);
    cv.line(50, 90, 60, 111, 'gold', 0.55);
    shadow(cv, 40, 105, 20, 4);

    cv.figure();
    // Cape and high collar, behind everything.
    cv.poly([[40, 50], [57, 54], [66, 101], [55, 107], [40, 104], [25, 107], [14, 101], [23, 54]], 'cape', { flat: 0.42, grad: 0.3 });
    cv.poly([[29, 72], [40, 66], [51, 72], [56, 103], [40, 100], [24, 103]], 'lining', { flat: 0.32, grad: 0.25 });
    cv.poly([[27, 49], [16, 22], [24, 30], [31, 42]], 'lining', { flat: 0.55, grad: 0.3 });
    cv.poly([[53, 49], [64, 22], [56, 30], [49, 42]], 'lining', { flat: 0.45, grad: 0.3 });
    cv.poly([[27, 49], [16, 22], [20, 23], [30, 44]], 'cape', { flat: 0.4 });
    cv.poly([[53, 49], [64, 22], [60, 23], [50, 44]], 'cape', { flat: 0.4 });
    // Legs and big armored boots.
    cv.capsule(35, 84, 35, 95, 4, 4, 'cloth');
    cv.capsule(45, 84, 45, 95, 4, 4, 'cloth');
    cv.rect(28, 93, 11, 10, 'armor', { flat: 0.6 });
    cv.rect(41, 93, 11, 10, 'armor', { flat: 0.55 });
    cv.ellipse(31, 102, 5, 2.6, 'armor', { bias: 0.05 });
    cv.ellipse(49, 102, 5, 2.6, 'armor');
    cv.line(28, 97, 38, 97, 'gold', 0.6);
    cv.line(42, 97, 51, 97, 'gold', 0.6);
    cv.line(27, 104, 37, 104, 'armor', 0);
    cv.line(43, 104, 53, 104, 'armor', 0);
    // Torso: master-grade breastplate with panel lines and a gem.
    cv.poly([[27, 60], [53, 60], [51, 82], [29, 82]], 'armor', { flat: 0.58, grad: 0.3 });
    cv.line(31, 70, 49, 70, 'armor', 0.1);
    cv.line(31, 76, 49, 76, 'armor', 0.1);
    cv.line(40, 62, 40, 80, 'armor', 0.12);
    cv.line(28, 60, 52, 60, 'gold', 0.8);
    cv.line(30, 61, 36, 67, 'gold', 0.6);
    cv.line(50, 61, 44, 67, 'gold', 0.6);
    cv.ellipse(40, 66, 2.6, 2.6, 'gem');
    cv.px(39, 65, 'white', 1);
    for (const [x, y] of [[32, 73], [47, 73], [32, 79], [47, 79]]) rivet(cv, x, y);
    cv.rect(28, 81, 24, 4, 'leather', { flat: 0.45 });
    cv.rect(38, 81, 5, 4, 'gold', { flat: 0.75 });
    // Arms, gauntlets, pauldrons.
    cv.capsule(23, 64, 21, 78, 4.2, 3.8, 'cloth');
    cv.capsule(57, 64, 59, 78, 4.2, 3.8, 'cloth');
    // A scepter in the right hand.
    cv.capsule(63, 52, 63, 104, 1.1, 1.1, 'gold');
    cv.ellipse(63, 50, 3.6, 3.6, 'gem');
    cv.px(62, 48, 'white', 1);
    cv.ellipse(20, 82, 5.6, 5, 'armor');
    cv.ellipse(60, 82, 5.6, 5, 'armor');
    cv.line(17, 84, 22, 84, 'armor', 0.15);
    cv.line(58, 84, 63, 84, 'armor', 0.15);
    cv.ellipse(23, 61, 9.5, 8, 'armor');
    cv.ellipse(57, 61, 9.5, 8, 'armor');
    cv.ellipse(23, 64, 9.5, 5, 'gold', { clip: (x, y) => y >= 66 });
    cv.ellipse(57, 64, 9.5, 5, 'gold', { clip: (x, y) => y >= 66 });
    rivet(cv, 19, 58);
    rivet(cv, 26, 57);
    rivet(cv, 54, 57);
    rivet(cv, 60, 58);
    // Head: pointed ears, big face, slicked hair with a widow's peak.
    cv.poly([[27, 41], [21, 33], [29, 46]], 'skinPale', { flat: 0.6 });
    cv.poly([[53, 41], [59, 33], [51, 46]], 'skinPale', { flat: 0.5 });
    cv.ellipse(40, 41, 14, 13.5, 'skinPale', { round: 0.9 });
    cv.ellipse(40, 33, 15, 10.5, 'hair', { clip: (x, y) => y < 37 || x < 28 || x > 52 });
    cv.poly([[35, 31], [40, 40], [45, 31]], 'hair', { flat: 0.4 });
    cv.line(31, 29, 37, 26, 'hair', 0.95);
    cv.line(43, 26, 48, 28, 'hair', 0.8);
    // Big menacing eyes (MGSD), brows, fangs.
    for (const ex of [31, 45]) {
      cv.rect(ex, 41, 5, 6, 'void', { flat: 0, bevel: false });
      cv.rect(ex + 1, 42, 3, 4, 'eye', { flat: 0.7, bevel: false });
      cv.px(ex + 1, 42, 'white', 1);
      cv.px(ex + 3, 45, 'eye', 0.2);
    }
    cv.line(30, 39, 36, 41, 'hair', 0.1);
    cv.line(50, 39, 44, 41, 'hair', 0.1);
    cv.line(38, 50, 42, 50, 'skinPale', 0.05);
    cv.px(38, 51, 'white', 1);
    cv.px(42, 51, 'white', 1);
    cv.px(34, 48, 'lining', 0.7);
    cv.px(46, 48, 'lining', 0.7);
  };

  // ------------------------------------------------------------------ Monster Room: goblin armoury
  const goblinArmory = (cv) => {
    cv.scene();
    cv.rect(0, 0, W, 88, 'wood', { flat: 0.42, grad: 0.25, bevel: false });
    for (let y = 0; y < 88; y += 7) for (let x = 0; x < W; x++) darken(cv, x, y, -0.25);
    for (let y = 0; y < 88; y++) for (const x of [9, 30, 51, 72]) darken(cv, x + ((Math.floor(y / 7) % 2) * 10), y, -0.15);
    // A weapon rack with spears, and two round shields.
    cv.rect(4, 22, 72, 4, 'wood', { flat: 0.55 });
    for (const x of [8, 14, 20, 60, 66, 72]) {
      cv.capsule(x, 6, x, 60, 0.8, 0.8, 'wood');
      cv.poly([[x - 2, 7], [x, 1], [x + 2, 7]], 'steel', { flat: 0.7 });
    }
    for (const sx of [24, 56]) {
      cv.ellipse(sx, 44, 9, 9, 'steel');
      cv.ellipse(sx, 44, 7.2, 7.2, 'shieldRed', { round: 0.6 });
      cv.ellipse(sx, 44, 2.4, 2.4, 'gold');
    }
    cv.rect(0, 88, W, 24, 'floor', { flat: 0.5, grad: -0.25, bevel: false });
    floorTiles(cv, 88);
    // A brazier glowing at the right.
    cv.rect(66, 80, 10, 12, 'steel', { flat: 0.45 });
    cv.ellipse(71, 77, 6, 4, 'fire', { flat: 0.35 });
    cv.ellipse(71, 77, 3.6, 2.6, 'fire', { flat: 0.7 });
    cv.ellipse(71, 77.5, 1.6, 1.2, 'fire', { flat: 1 });
    cv.light(71, 76, 34, 0.6);
    shadow(cv, 38, 105, 21, 4);

    cv.figure();
    // A huge axe held across the body.
    cv.capsule(14, 100, 64, 22, 1.4, 1.4, 'wood');
    cv.poly([[58, 10], [75, 14], [77, 32], [67, 34], [61, 24]], 'steel', { flat: 0.6, grad: 0.3 });
    cv.line(59, 11, 75, 15, 'steel', 1);
    cv.line(67, 33, 77, 31, 'steel', 0.1);
    // Boots, legs.
    cv.capsule(32, 84, 32, 94, 4, 4, 'leather');
    cv.capsule(44, 84, 44, 94, 4, 4, 'leather');
    cv.rect(25, 93, 11, 10, 'armor', { flat: 0.58 });
    cv.rect(40, 93, 11, 10, 'armor', { flat: 0.52 });
    cv.line(24, 104, 36, 104, 'armor', 0);
    cv.line(40, 104, 52, 104, 'armor', 0);
    rivet(cv, 27, 96);
    rivet(cv, 48, 96);
    // A squat body in a riveted apron of plates.
    cv.ellipse(38, 74, 15, 13, 'leather');
    cv.poly([[27, 66], [49, 66], [47, 86], [29, 86]], 'armor', { flat: 0.55, grad: 0.3 });
    cv.line(29, 72, 47, 72, 'armor', 0.1);
    cv.line(30, 79, 46, 79, 'armor', 0.1);
    for (const [x, y] of [[30, 68], [45, 68], [30, 75], [45, 75], [31, 82], [44, 82]]) rivet(cv, x, y);
    // Arms gripping the haft.
    cv.capsule(25, 66, 22, 82, 4.4, 4, 'skinGob');
    cv.capsule(51, 66, 50, 60, 4.4, 4, 'skinGob');
    cv.ellipse(23, 86, 5.5, 5, 'skinGob');
    cv.ellipse(50, 56, 5.5, 5, 'skinGob');
    cv.ellipse(26, 63, 7, 6, 'armor');
    cv.ellipse(50, 63, 7, 6, 'armor');
    rivet(cv, 24, 61);
    rivet(cv, 52, 61);
    // Head: giant ears, a leather cap with a steel plate, yellow eyes, tusks.
    cv.poly([[25, 40], [5, 30], [12, 40], [26, 47]], 'skinGob', { flat: 0.6, grad: 0.2 });
    cv.poly([[51, 40], [71, 30], [64, 40], [50, 47]], 'skinGob', { flat: 0.5, grad: 0.2 });
    cv.ellipse(38, 44, 14.5, 13, 'skinGob', { round: 0.9 });
    cv.ellipse(38, 35, 15, 9, 'leather', { clip: (x, y) => y < 37 });
    cv.rect(31, 27, 14, 6, 'steel', { flat: 0.65 });
    rivet(cv, 33, 29, 'steel');
    rivet(cv, 42, 29, 'steel');
    for (const ex of [29, 42]) {
      cv.rect(ex, 40, 6, 6, 'void', { flat: 0, bevel: false });
      cv.rect(ex + 1, 41, 4, 4, 'eyeGob', { flat: 0.75, bevel: false });
      cv.px(ex + 1, 41, 'white', 1);
      cv.px(ex + 3, 43, 'void', 0);
    }
    cv.line(28, 38, 35, 40, 'skinGob', 0.05);
    cv.line(48, 38, 41, 40, 'skinGob', 0.05);
    cv.line(33, 51, 43, 51, 'skinGob', 0.05);
    cv.px(34, 50, 'white', 1);
    cv.px(42, 50, 'white', 1);
    cv.px(37, 47, 'skinGob', 0.2);
  };

  // ------------------------------------------------------------------ Hero: knight at the entrance
  const knight = (cv) => {
    cv.scene();
    cv.rect(0, 0, W, 90, 'stone', { flat: 0.4, grad: 0.25, bevel: false });
    bricks(cv, 0, 0, W, 90, 7, 13);
    // The dungeon entrance, daylight beyond.
    cv.poly([[14, 92], [14, 26], [22, 12], [40, 6], [58, 12], [66, 26], [66, 92]], 'sky', { flat: 0.75, grad: 0.35, bevel: false });
    cv.poly([[14, 92], [14, 70], [30, 64], [50, 66], [66, 72], [66, 92]], 'grass', { flat: 0.55, grad: 0.3, bevel: false });
    cv.ellipse(56, 22, 4, 4, 'moon', { flat: 1 });
    cv.light(40, 30, 50, 0.32);
    for (let a = 0; a <= 20; a++) {
      const t = a / 20;
      const x = Math.round(14 + (66 - 14) * t);
      const y = Math.round(26 - Math.sin(Math.PI * t) * 20);
      for (let k = 0; k < 3; k++) darken(cv, x, y - k, 0.15);
    }
    cv.rect(0, 90, W, 22, 'floor', { flat: 0.5, grad: -0.25, bevel: false });
    floorTiles(cv, 90);
    shadow(cv, 40, 105, 20, 4);

    cv.figure();
    // Plume and cape.
    cv.poly([[40, 52], [58, 58], [62, 100], [40, 102], [18, 100], [22, 58]], 'plume', { flat: 0.4, grad: 0.3 });
    // Legs and sabatons.
    cv.capsule(35, 84, 35, 95, 4, 4, 'steel');
    cv.capsule(45, 84, 45, 95, 4, 4, 'steel');
    cv.rect(28, 93, 11, 10, 'steel', { flat: 0.62 });
    cv.rect(41, 93, 11, 10, 'steel', { flat: 0.55 });
    cv.line(28, 98, 38, 98, 'steel', 0.15);
    cv.line(42, 98, 51, 98, 'steel', 0.15);
    cv.line(27, 104, 38, 104, 'steel', 0);
    cv.line(42, 104, 53, 104, 'steel', 0);
    // Breastplate under a blue tabard.
    cv.poly([[27, 60], [53, 60], [51, 84], [29, 84]], 'steel', { flat: 0.6, grad: 0.3 });
    cv.poly([[32, 62], [48, 62], [47, 88], [33, 88]], 'blue', { flat: 0.55, grad: 0.25 });
    cv.line(40, 64, 40, 84, 'gold', 0.7);
    cv.line(35, 70, 45, 70, 'gold', 0.7);
    cv.rect(28, 82, 24, 3, 'leather', { flat: 0.45 });
    // Sword raised in the right hand, a round shield on the left arm.
    cv.capsule(58, 66, 60, 80, 4.2, 3.8, 'steel');
    cv.capsule(60, 76, 66, 18, 1.6, 1.0, 'steel', { bias: 0.15 });
    cv.line(61, 74, 66, 20, 'steel', 1);
    cv.rect(55, 72, 11, 3, 'gold', { flat: 0.75 });
    cv.ellipse(60, 80, 5.2, 4.8, 'steel');
    cv.capsule(22, 64, 20, 78, 4.2, 3.8, 'steel');
    cv.ellipse(18, 78, 11, 12, 'gold');
    cv.ellipse(18, 78, 9.4, 10.4, 'blue', { round: 0.7 });
    cv.poly([[18, 70], [22, 78], [18, 86], [14, 78]], 'gold', { flat: 0.75 });
    cv.ellipse(23, 61, 9.5, 8, 'steel');
    cv.ellipse(57, 61, 9.5, 8, 'steel');
    cv.ellipse(23, 64, 9.5, 5, 'gold', { clip: (x, y) => y >= 66 });
    cv.ellipse(57, 64, 9.5, 5, 'gold', { clip: (x, y) => y >= 66 });
    rivet(cv, 20, 58, 'steel');
    rivet(cv, 55, 57, 'steel');
    // A big helmet with a visor slit and a crest.
    const crest = [[27, 34], [30, 27], [36, 23], [43, 22], [50, 24], [55, 29], [57, 35]];
    for (let k = 0; k < crest.length - 1; k++) cv.capsule(...crest[k], ...crest[k + 1], 3.4, 3.2, 'plume');
    cv.ellipse(40, 41, 15, 14, 'steel', { round: 0.92 });
    cv.rect(26, 44, 28, 3, 'void', { flat: 0, bevel: false });
    cv.line(27, 45, 53, 45, 'eyeHero', 0.85);
    cv.px(33, 45, 'white', 1);
    cv.px(47, 45, 'white', 1);
    cv.line(40, 29, 40, 52, 'steel', 0.15);
    for (const [x, y] of [[30, 50], [36, 52], [44, 52], [50, 50]]) cv.px(x, y, 'steel', 0.1);
    rivet(cv, 29, 38, 'steel');
    rivet(cv, 50, 38, 'steel');
    cv.line(27, 40, 53, 40, 'gold', 0.7);
  };

  PA.SUBJECTS = [
    ['Boss', 'a vampire lord on his throne', vampireLord],
    ['Monster Room', 'a goblin armoury', goblinArmory],
    ['Hero', 'a knight at the dungeon entrance', knight],
  ];

  // ------------------------------------------------------------------ five styles
  const BASE = {
    stone: '#6c6a8c', floor: '#5d5064', carpet: '#a3263f', gold: '#e2b23e', wood: '#8c5a36', fire: '#ffb02e', sky: '#3c5cab',
    moon: '#f3f0cf', grass: '#4aa24f', steel: '#9ba8bb', armor: '#5a6490', skinPale: '#f1dad2', skinGob: '#78c04b', hair: '#2b2442',
    cape: '#2e1b3d', lining: '#c4283c', cloth: '#3b2f52', leather: '#7d4b2b', gem: '#e3203f', eye: '#ff3445', eyeGob: '#ffd23a',
    eyeHero: '#7fe3ff', white: '#ffffff', blue: '#2f62c4', plume: '#c9304a', shieldRed: '#b23040', void: '#120a18',
  };
  const tones = (n) => ({ default: n, fire: 3, white: 1, void: 1, moon: 2 });

  PA.STYLES = [
    {
      id: 'A', name: 'Console JRPG',
      blurb: 'Clean black outlines, five-tone cel shading, warm torchlight. The classic 16-bit role-playing-game sprite look.',
      palette: BASE, tones: tones(5), spread: 0.62, shift: 0.5, coolHue: 250, sat: 1, bright: 0, contrast: 1, sceneDim: -0.06,
      ditherFig: false, ditherScene: false, outline: 'dark', inner: true, rim: null, vignette: 0.5,
    },
    {
      id: 'B', name: 'Arcade Fighter',
      blurb: 'Six tones, coloured self-outlines, a cyan rim light and a darker stage so the figure pops. Nineties arcade energy.',
      palette: { ...BASE, stone: '#4f4d72', floor: '#45384e' }, tones: tones(6), spread: 0.7, shift: 0.6, coolHue: 245, sat: 1.12, bright: 0,
      contrast: 1.12, sceneDim: -0.14, ditherFig: false, ditherScene: false, outline: 'selout', inner: true, rim: '#9ff3ff', vignette: 0.8,
    },
    {
      id: 'C', name: 'Dithered Console',
      blurb: 'Four tones blended with ordered dithering, punchy saturated colour and gritty texture, the way 16-bit hardware faked gradients.',
      palette: { ...BASE, sky: '#2d43c9', carpet: '#c4185a', armor: '#4e58b8' }, tones: tones(4), spread: 0.7, shift: 0.55, coolHue: 265,
      sat: 1.3, bright: 0, contrast: 1.08, sceneDim: -0.04, ditherFig: true, ditherScene: true, outline: 'dark', inner: true, rim: null, vignette: 0.6,
    },
    {
      id: 'D', name: 'Bright Handheld',
      blurb: 'A candy palette with soft coloured outlines and gentle shading: cheerful, readable at thumbnail size, like a 32-bit handheld.',
      palette: { ...BASE, stone: '#8d8fbf', floor: '#a7889b', cape: '#4a3270', cloth: '#5a4c86', armor: '#6f86d6', wood: '#b07a48' }, tones: tones(5),
      spread: 0.5, shift: 0.45, coolHue: 230, sat: 1.25, bright: 0.07, contrast: 0.92, sceneDim: 0.02, ditherFig: false, ditherScene: false,
      outline: 'selout', inner: false, rim: null, vignette: 0.25,
    },
    {
      id: 'E', name: 'Gothic Night',
      blurb: 'Moonlight from the right, muted purples and blues, deep shadows, dithered gloom; only blood-red accents keep their full colour.',
      palette: { ...BASE, stone: '#4a4566', floor: '#3b3448', wood: '#5a3a3a', armor: '#4a4f72', steel: '#7f88a8', grass: '#3d6a5a', sky: '#283a7a' },
      tones: tones(5), spread: 0.66, shift: 0.7, coolHue: 260, sat: 0.72, bright: -0.03, contrast: 1.18, sceneDim: -0.1, ditherFig: false, ditherScene: true,
      outline: 'dark', inner: true, rim: '#c9c3ff', vignette: 0.9, light: [0.6, -0.7, 0.45], accent: ['lining', 'gem', 'eye', 'carpet', 'plume', 'fire', 'shieldRed'],
    },
  ];

  PA.draw = (subject, style) => {
    const cv = new PA.Canvas(W, H, style.light);
    subject(cv);
    return cv;
  };
})();
