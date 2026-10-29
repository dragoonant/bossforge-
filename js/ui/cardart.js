// Card art (PLAN D15): one action plate per card id, drawn by the pixel renderer in style A
// "Console JRPG". Every figure and scene is an original archetype that fits the card's role; none
// copies a printed illustration. ui.art(id) returns a cached data URL.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;
  const PA = ui.PA;
  const K = ui.artkit;
  const fig = K.figure;
  const ART = (ui.ART = {});

  // ------------------------------------------------------------------ style A, as picked
  ui.ART_STYLE = {
    id: 'A', name: 'Console JRPG',
    palette: {
      stone: '#6c6a8c', floor: '#5d5064', carpet: '#a3263f', gold: '#e2b23e', wood: '#8c5a36', fire: '#ff9a2e', sky: '#3c5cab',
      moon: '#f3f0cf', grass: '#4aa24f', grassDark: '#2f7a45', steel: '#9ba8bb', armor: '#5a6490', skinPale: '#f1dad2', skinPeach: '#f0c49c',
      skinTan: '#c98d5e', skinDark: '#8a5a3c', skinGob: '#78c04b', skinFrog: '#5aa83c', skinRed: '#c8443a', skinBlue: '#6a8ad8', skinPurple: '#9a6ac8',
      hairBrown: '#6b4128', hairBlack: '#2b2442', hairBlonde: '#e8c45a', hairRed: '#d2452e', hairWhite: '#e6e2ee', hairPink: '#e889b8', hairGreen: '#4f9a52', hairBlue: '#4a6ad0',
      cape: '#2e1b3d', lining: '#c4283c', cloth: '#3b2f52', leather: '#7d4b2b', gem: '#e3203f', eyeBlue: '#3f8dff', eyeGreen: '#3fc06a', eyeRed: '#ff3445',
      eyeGold: '#ffd23a', eyeGlow: '#7fe3ff', white: '#ffffff', blue: '#2f62c4', plume: '#c9304a', shieldRed: '#b23040', void: '#120a18', bone: '#e8dfc4',
      flesh: '#e88aa0', bandage: '#d9cfae', ghost: '#bfe8ff', magic: '#b46bff', holy: '#ffe36b', slash: '#e8f8ff', dust: '#b8a890', arcane: '#2a1b52',
      dirt: '#8a6a44', bark: '#6a4428', leaf: '#3f9a46', robeWhite: '#e8e4f0', robeRed: '#b8303c', robeBlue: '#3050b0', robeGreen: '#3f8a4a', robePurple: '#6a3ca0',
      robeBrown: '#7a5434', cloak: '#3a4a3a', blush: '#ff8aa0', fur: '#a8743c', furLight: '#e8c890', furGrey: '#8a8a96', mane: '#c87a2a', water: '#3a8ac8',
      slime: '#6ad84a', rock: '#7a7068', sand: '#d8b468', marble: '#d8d4e4', ice: '#9ae0ff', poison: '#8ad83a', copper: '#c87a3a', rust: '#9a4a2a',
      glass: '#a8e0f0', silk: '#e86aa8', scale: '#3a9a6a', pinkTile: '#c87aa8', sewer: '#4a5a44', hive: '#7a3a6a', green: '#3fa04a', orange: '#e8742a',
      yellow: '#f0d040', purple: '#7a3ab8', teal: '#2aa8a0', black: '#2a2430', grey: '#8a8a96', snow: '#e8f0ff', night: '#1c2448', sunset: '#e87a4a', lava: '#ff5a2a',
    },
    tones: { default: 5, fire: 4, white: 1, void: 1, moon: 2, slash: 2, holy: 4 }, spread: 0.62, shift: 0.5, coolHue: 250, sat: 1, bright: 0, contrast: 1,
    sceneDim: -0.06, ditherFig: false, ditherScene: false, outline: 'dark', inner: true, rim: null, vignette: 0.5,
  };

  const cache = new Map();
  /** A data URL of card `id`'s plate (browser only). */
  ui.art = (id) => {
    if (cache.has(id)) return cache.get(id);
    const draw = ART[id];
    if (!draw) throw new Error(`no art for ${id}`);
    const cv = new PA.Canvas(K.W, K.H, draw.light);
    draw(cv);
    const url = PA.toCanvas(cv, ui.ART_STYLE).toDataURL();
    cache.set(id, url);
    return url;
  };

  // Small helpers shared by many plates.
  const bat = (cv, x, y, k = 1) => {
    cv.figure();
    cv.poly([[x, y], [x - 5 * k, y - 3 * k], [x - 7 * k, y + 1 * k], [x - 3 * k, y + 1 * k], [x, y + 3 * k], [x + 3 * k, y + 1 * k], [x + 7 * k, y + 1 * k], [x + 5 * k, y - 3 * k]], 'black', { flat: 0.45 });
    cv.px(x - 1, y, 'eyeRed', 1);
    cv.px(x + 1, y, 'eyeRed', 1);
  };
  ui.artBat = bat;
  const bones = (cv, pts) => {
    for (const [x, y, a] of pts) {
      const dx = Math.cos(a) * 4, dy = Math.sin(a) * 4;
      cv.capsule(x - dx, y - dy, x + dx, y + dy, 1, 1, 'bone');
      cv.ellipse(x - dx, y - dy, 1.5, 1.5, 'bone');
      cv.ellipse(x + dx, y + dy, 1.5, 1.5, 'bone');
    }
  };
  ui.artBones = bones;

  // ------------------------------------------------------------------ Bosses
  ART.BMR001 = (cv) => {
    // A vampire lord leaping out of the dark, cape thrown wide like wings, claws first.
    K.room(cv, { wallMat: 'stone', pillars: true, torches: [14, 66], props: [(c) => {
      for (const wx of [24, 50]) c.poly([[wx, 30], [wx, 12], [wx + 3, 6], [wx + 6, 12], [wx + 6, 30]], 'night', { flat: 0.4, grad: 0.4, bevel: false });
      c.ellipse(53, 13, 2.2, 2.2, 'moon', { flat: 1 });
    }] });
    K.groundShadow(cv, 38, 106, 18, 3);
    bat(cv, 14, 20);
    bat(cv, 66, 28, 0.8);
    bat(cv, 60, 12, 0.7);
    fig(cv, { x: 38, jump: 6, lean: 14, f: 1, skin: 'skinPale', body: 'armor', arm: 'cloth', legs: 'cloth', boot: 'armor', pauldrons: true,
      cape: 'cape', capeLining: 'lining', capeFly: 70, hair: 'slick', hairMat: 'hairBlack', eyeMat: 'eyeRed', mouth: 'fangs', brows: 'angry', ears: 'pointy',
      aF: [115, 25], aB: [-120, -30], lF: [40, -55], lB: [-30, -20], wF: { type: 'claw', rot: 0, mat: 'bone' } });
    K.slash(cv, 52, 62, 18, -80, 20, 'eyeRed');
  };

  ART.BMR002 = (cv) => {
    // A lich rising from its crypt, staff high, flinging green soulfire.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', light: [[60, 60, 30, 0.2]], props: [(c) => {
      c.rect(6, 70, 20, 22, 'stone', { flat: 0.45 });
      c.rect(4, 66, 24, 5, 'stone', { flat: 0.6 });
      for (const x of [33, 47]) { c.rect(x, 82, 3, 8, 'bone', { flat: 0.7 }); K.flame(c, x + 1.5, 80, 1.6); }
    }] });
    bones(cv, [[60, 100, 0.3], [18, 104, 2.2], [70, 96, 1.2]]);
    cv.figure();
    cv.poly([[30, 66], [50, 66], [58, 104], [22, 104]], 'robePurple', { flat: 0.45, grad: 0.35 });
    for (let k = 0; k < 5; k++) cv.poly([[22 + k * 8, 103], [26 + k * 8, 110], [30 + k * 8, 103]], 'robePurple', { flat: 0.3 });
    const J = fig(cv, { x: 40, jump: 8, lean: -6, f: 1, s: 0.95, skin: 'bone', body: 'robePurple', arm: 'robePurple', glove: 'bone', headType: 'skull', crown: 'gold', eyeMat: 'slime',
      noLegs: true, trim: 'gold', aB: [175, -20], aF: [95, -25], wB: { type: 'staff', orb: 'slime', shaft: 'bone', rot: 0 } });
    K.fireball(cv, J.aF.end[0] + 14, J.aF.end[1] - 2, 5, 90, 1, 'slime');
    cv.light(J.aF.end[0] + 14, J.aF.end[1] - 2, 30, 0.4);
  };

  ART.BMR003 = (cv) => {
    // A frog king bursting out of sewer water, trident thrust.
    K.room(cv, { wall: 'brick', wallMat: 'sewer', floorMat: 'water', floorY: 86, floor: 'plain', props: [(c) => {
      for (const y of [18, 40]) c.rect(0, y, 80, 6, 'copper', { flat: 0.5 });
      c.rect(60, 18, 6, 50, 'copper', { flat: 0.45, gradX: 0.4 });
      c.ellipse(63, 68, 6, 3, 'slime', { flat: 0.6 });
      for (let k = 0; k < 6; k++) c.ellipse(8 + k * 13, 90 + (k % 2) * 6, 7, 1.4, 'white', { flat: 0.7 });
    }] });
    const J = fig(cv, { x: 36, jump: 10, lean: 18, f: 1, s: 1, skin: 'skinFrog', body: 'skinFrog', belly: true, arm: 'skinFrog', legs: 'skinFrog', boot: 'skinFrog', glove: 'skinFrog',
      headType: 'frog', crown: 'gold', mouth: 'open', cape: 'robeRed', capeFly: 50, aF: [100, -5], aB: [-60, 40], lF: [70, -80], lB: [-35, -40],
      wF: { type: 'trident', mat: 'gold', len: 32 } });
    cv.figure();
    for (let k = 0; k < 7; k++) cv.ellipse(18 + k * 7, 100 - (k % 3) * 4, 2.4, 3, 'water', { flat: 0.85 });
    K.burst(cv, J.tipF[0], J.tipF[1], 7, 'slash');
  };

  ART.BMR004 = (cv) => {
    // A stone golem throwing a ground-shaking punch.
    K.room(cv, { wall: 'rock', wallMat: 'rock', floorMat: 'floor', light: [[12, 70, 30, 0.45]], props: [(c) => {
      c.rect(2, 74, 18, 16, 'steel', { flat: 0.4 });
      K.flame(c, 11, 70, 4);
      for (let k = 0; k < 6; k++) c.px(10 + k * 2, 58 + (k % 3) * 3, 'fire', 1);
    }] });
    K.groundShadow(cv, 40, 106, 22, 4);
    const J = fig(cv, { x: 38, lean: 22, f: 1, s: 1.08, skin: 'rock', body: 'rock', arm: 'rock', legs: 'rock', boot: 'rock', glove: 'steel', headType: 'golem', eyeMat: 'fire',
      torsoW: 26, aF: [92, 0], aB: [-50, 70], lF: [45, -40], lB: [-40, 10], chest: (c, j) => {
        c.ellipse(j.top[0] + 2, j.top[1] + 9, 3, 3, 'fire', { flat: 0.9 });
        c.light(j.top[0] + 2, j.top[1] + 9, 14, 0.3);
      } });
    K.burst(cv, J.aF.end[0] + 6, J.aF.end[1], 10, 'holy');
    K.speed(cv, J.aF.end[0] - 10, J.aF.end[1], 1, 3, 10);
    K.dust(cv, 30, 104, 3);
  };

  ART.BMR005 = (cv) => {
    // A giant brain in a glass dome on a walking machine, firing psychic rings.
    K.room(cv, { wall: 'tile', wallMat: 'steel', floorMat: 'floor', props: [(c) => {
      for (const x of [8, 66]) { c.rect(x, 20, 8, 40, 'glass', { flat: 0.5, gradX: 0.3 }); c.ellipse(x + 4, 50, 3, 6, 'slime', { flat: 0.6 }); }
    }] });
    const J = fig(cv, { x: 36, f: 1, s: 0.95, skin: 'flesh', body: 'steel', arm: 'steel', legs: 'steel', boot: 'steel', glove: 'steel', headType: 'brain', eyeMat: 'magic', eyes: 'glow',
      aF: [100, 30], aB: [60, -40], lF: [30, -10], lB: [-20, 20], lean: 8 });
    cv.figure();
    cv.arc(J.head[0], J.head[1] - 3, 19, 21, 180, 360, 'glass', { flat: 0.7 });
    cv.px(J.head[0] - 12, J.head[1] - 14, 'white', 1);
    cv.px(J.head[0] - 11, J.head[1] - 16, 'white', 1);
    cv.rect(J.head[0] - 21, J.head[1] - 3, 42, 4, 'steel', { flat: 0.6 });
    for (let k = 0; k < 3; k++) cv.arc(J.aF.end[0] + 6, J.aF.end[1], 6 + k * 6, 8 + k * 6, -50, 50, 'magic', { flat: 0.9 - k * 0.15 });
    cv.light(J.aF.end[0] + 14, J.aF.end[1], 24, 0.35);
  };

  ART.BMR006 = (cv) => {
    // A sorceress mid-spin, hair flying, hurling a ribbon of pink magic.
    K.room(cv, { wall: 'tile', wallMat: 'robePurple', floorMat: 'marble', pillars: true, pillarMat: 'marble', props: [(c) => {
      for (const x of [24, 56]) { c.rect(x, 8, 2, 30, 'gold', { flat: 0.7 }); c.ellipse(x + 1, 40, 4, 4, 'magic', { flat: 0.85 }); c.light(x + 1, 40, 14, 0.3); }
    }] });
    const J = fig(cv, { x: 40, f: -1, lean: -10, s: 0.98, skin: 'skinPale', body: 'robePurple', arm: 'skinPale', legs: 'skinPale', boot: 'robePurple', glove: 'skinPale',
      hair: 'long', hairMat: 'hairPink', eyeMat: 'magic', mouth: 'smile', horns: 'black', torsoW: 18, aF: [150, -40], aB: [80, 30], lF: [80, -100], lB: [-5, 0],
      wF: { type: 'wand', orb: 'magic' } });
    cv.figure();
    cv.poly([[28, 74], [52, 74], [60, 96], [20, 96]], 'robePurple', { flat: 0.5, grad: 0.3 });
    cv.arc(J.tipF[0] - 2, J.tipF[1] + 18, 14, 18, 180, 330, 'silk', { flat: 0.9, taper: true });
    for (const [x, y] of [[16, 30], [62, 22], [12, 58], [66, 52]]) K.sparkle(cv, x, y, 2, 'silk');
  };

  ART.BMR007 = (cv) => {
    // A mummy queen commanding her wraps to lash forward.
    K.room(cv, { wall: 'tile', wallMat: 'sand', floorMat: 'sand', torches: [10, 70], props: [(c) => {
      c.poly([[52, 90], [52, 44], [60, 36], [70, 44], [70, 90]], 'gold', { flat: 0.55, grad: 0.3 });
      c.ellipse(61, 52, 5, 6, 'carpet', { flat: 0.6 });
      for (let y = 16; y < 34; y += 4) c.line(20, y, 60, y, 'sand', 0.25);
    }] });
    const J = fig(cv, { x: 32, f: 1, lean: 12, skin: 'bandage', body: 'gold', arm: 'bandage', legs: 'bandage', boot: 'gold', glove: 'bandage', headType: 'mummy', eyeMat: 'eyeGlow',
      crown: 'gold', aF: [100, -10], aB: [150, -30], lF: [30, -20], lB: [-25, 10], cape: 'blue', capeFly: 30, chest: (c, j) => {
        c.ellipse(j.top[0], j.top[1] + 2, 9, 4, 'gold', { flat: 0.8 });
        c.ellipse(j.top[0], j.top[1] + 2, 6, 2, 'blue', { flat: 0.7 });
      } });
    cv.figure();
    let p = J.aF.end;
    for (let k = 0; k < 7; k++) {
      const q = [p[0] + 5, p[1] + Math.sin(k * 1.4) * 4];
      cv.capsule(p[0], p[1], q[0], q[1], 1.6, 1.4, 'bandage');
      p = q;
    }
    K.speed(cv, p[0] - 4, p[1], 1, 2, 8, 'bandage');
  };

  ART.BMR008 = (cv) => {
    // A gorgon whose gaze turns a charging knight to stone.
    K.room(cv, { wall: 'tile', wallMat: 'marble', floorMat: 'marble', pillars: true, pillarMat: 'marble' });
    // The petrified knight.
    fig(cv, { x: 62, f: -1, s: 0.62, ground: 104, lean: 25, skin: 'grey', body: 'grey', arm: 'grey', legs: 'grey', boot: 'grey', glove: 'grey', helm: 'full', helmMat: 'grey',
      trim: 'grey', aF: [150, 10], lF: [45, -40], lB: [-40, 10], wF: { type: 'sword', mat: 'grey', guard: 'grey' } });
    const J = fig(cv, { x: 30, f: 1, lean: 6, skin: 'skinGob', body: 'scale', arm: 'skinGob', legs: 'scale', boot: 'scale', glove: 'skinGob', hair: 'bald', eyes: 'glow', eyeMat: 'eyeGold',
      mouth: 'fangs', tail: 'scale', noLegs: false, aF: [80, 40], aB: [140, -20], lF: [25, -10], lB: [-20, 5] });
    cv.figure();
    const h = J.head;
    for (let k = 0; k < 7; k++) {
      const a = -160 + k * 25;
      let p = [h[0] + Math.cos(a * Math.PI / 180) * 12, h[1] - 4 + Math.sin(a * Math.PI / 180) * 11];
      for (let j = 0; j < 3; j++) {
        const q = [p[0] + Math.cos((a + j * 35) * Math.PI / 180) * 5, p[1] + Math.sin((a + j * 35) * Math.PI / 180) * 5];
        cv.capsule(p[0], p[1], q[0], q[1], 1.8, 1.4, 'green');
        p = q;
      }
      cv.ellipse(p[0], p[1], 2, 1.6, 'green');
      cv.px(p[0], p[1], 'eyeRed', 1);
    }
    for (let k = 0; k < 3; k++) cv.line(Math.round(h[0] + 8), Math.round(h[1] + 1 + k), 50, 60 + k * 2, 'eyeGold', 0.95);
    cv.light(52, 62, 16, 0.4);
  };
})();
