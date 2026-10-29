// Card art, part 3 (PLAN D15): Heroes, each caught mid-action outside the dungeon.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;
  const K = ui.artkit;
  const fig = K.figure;
  const ART = ui.ART;
  const D = Math.PI / 180;

  const hero = (cv, o) => fig(cv, { s: 0.92, skin: 'skinPeach', boot: 'leather', ...o });
  const field = (cv, o) => K.outdoor(cv, { clouds: [[6, 16], [52, 24]], ...o });
  const stars = (cv, n, seed) => {
    const r = K.rnd(seed);
    cv.scene();
    for (let k = 0; k < n; k++) cv.px(Math.round(r() * 80), Math.round(r() * 60), 'white', 0.6 + r() * 0.4);
  };
  const rainbow = ['fire', 'orange', 'yellow', 'green', 'water', 'blue', 'purple'];

  // ------------------------------------------------------------------ Clerics
  ART.BMR056 = (cv) => {
    // Nick: leaps in with his mace high, holy symbol blazing.
    field(cv, { castle: 58, seed: 56 });
    const J = hero(cv, { x: 38, jump: 18, lean: 12, body: 'robeWhite', arm: 'robeWhite', legs: 'cloth', hair: 'slick', hairMat: 'hairBrown', mouth: 'roar', brows: 'angry',
      aF: [172, 20], aB: [80, 40], lF: [70, -100], lB: [-20, -60], wF: { type: 'mace', rot: 10 } });
    K.burst(cv, J.tipF[0], J.tipF[1], 7, 'holy');
    K.sparkle(cv, J.aB.end[0] + 4, J.aB.end[1], 3, 'holy');
  };

  ART.BMR057 = (cv) => {
    // Pugi: a druid twirls her staff and flowers burst up around her.
    field(cv, { trees: [10, 70], seed: 57 });
    const J = hero(cv, { x: 40, f: -1, lean: -8, body: 'robeGreen', arm: 'robeGreen', legs: 'robeGreen', hair: 'long', hairMat: 'hairGreen', eyes: 'happy', mouth: 'smile', blush: true,
      aF: [140, -20], aB: [100, 40], lF: [40, -50], lB: [-10, 10], wF: { type: 'staff', orb: 'leaf', rot: 20 } });
    cv.figure();
    for (let k = 0; k < 7; k++) {
      const a = k * 52 * D, x = 40 + Math.cos(a) * 26, y = 64 + Math.sin(a) * 18;
      for (let p = 0; p < 4; p++) cv.ellipse(x + Math.cos(p * 90 * D) * 2, y + Math.sin(p * 90 * D) * 2, 1.8, 1.8, k % 2 ? 'hairPink' : 'yellow', { flat: 0.8 });
      cv.px(x, y, 'gold', 1);
    }
    cv.arc(J.tipF[0], J.tipF[1], 8, 10, 180, 330, 'leaf', { flat: 0.8, taper: true });
  };

  ART.BMR058 = (cv) => {
    // Acacia: braced behind a radiant shield, spear thrust past its rim.
    field(cv, { seed: 58 });
    const J = hero(cv, { x: 34, lean: 16, body: 'armor', arm: 'armor', legs: 'steel', helm: 'open', plume: 'plume', hair: 'long', hairMat: 'hairBlonde', mouth: 'line', brows: 'angry',
      aF: [92, 0], aB: [70, 20], lF: [55, -30], lB: [-45, 10], wF: { type: 'spear', len: 34 }, wB: { type: 'kite' } });
    cv.light(J.aB.end[0] + 6, J.aB.end[1], 22, 0.55);
    for (let k = 0; k < 6; k++) {
      const a = (-60 + k * 24) * D;
      cv.capsule(J.aB.end[0] + 10 + Math.cos(a) * 8, J.aB.end[1] + Math.sin(a) * 10, J.aB.end[0] + 10 + Math.cos(a) * 16, J.aB.end[1] + Math.sin(a) * 18, 1, 0.4, 'holy');
    }
  };

  ART.BMR059 = (cv) => {
    // Charles: a kid races home at sunset, lantern swinging.
    field(cv, { sky: 'sunset', sun: [62, 40], sunMat: 'fire', hillMat: 'grassDark', clouds: null, path: true, seed: 59 });
    const J = hero(cv, { x: 36, s: 0.74, lean: 22, body: 'robeBlue', arm: 'robeBlue', legs: 'leather', hair: 'bob', hairMat: 'hairBrown', eyes: 'big', mouth: 'open',
      aF: [120, -30], aB: [-60, 60], lF: [65, -70], lB: [-55, -30], wF: { type: 'torch', rot: -120 } });
    cv.light(J.tipF[0], J.tipF[1], 16, 0.5);
    K.speed(cv, 20, 78, -1, 3, 8, 'dust');
  };

  ART.BMR060 = (cv) => {
    // Delatorious: a winged kid hovers and looses a crossbow bolt.
    field(cv, { seed: 60 });
    const J = hero(cv, { x: 32, s: 0.78, jump: 26, lean: 6, wings: 'white', body: 'robeWhite', arm: 'robeWhite', legs: 'cloth', hair: 'spiky', hairMat: 'hairBlonde', brows: 'angry', mouth: 'grin',
      aF: [92, -4], aB: [96, 10], lF: [30, 40], lB: [-30, 60], wF: { type: 'crossbow' } });
    cv.figure();
    cv.capsule(J.tipF[0] + 6, J.tipF[1], J.tipF[0] + 20, J.tipF[1], 0.8, 0.8, 'wood');
    cv.poly([[J.tipF[0] + 20, J.tipF[1] - 2], [J.tipF[0] + 24, J.tipF[1]], [J.tipF[0] + 20, J.tipF[1] + 2]], 'steel', { flat: 0.8 });
    K.speed(cv, J.tipF[0] + 4, J.tipF[1] - 4, -1, 2, 8);
    K.dust(cv, 32, 104, 2);
  };

  ART.BMR061 = (cv) => {
    // Romero: a blue friar preaches, holy book thrust skyward.
    field(cv, { castle: 4, seed: 61 });
    const J = hero(cv, { x: 44, f: -1, lean: -10, body: 'robeBlue', arm: 'robeBlue', legs: 'robeBlue', hair: 'slick', hairMat: 'hairWhite', beard: 'hairWhite', mouth: 'open',
      torsoW: 24, aF: [165, -20], aB: [50, 60], lF: [25, -10], lB: [-15, 10], wF: { type: 'book', rot: 90 } });
    K.burst(cv, J.aF.end[0], J.aF.end[1] - 6, 10, 'holy');
    for (let k = 0; k < 3; k++) cv.capsule(J.aF.end[0] - 4 + k * 4, 0, J.aF.end[0] - 2 + k * 2, J.aF.end[1] - 10, 1.5, 0.6, 'holy', { flat: 0.9 });
  };

  // ------------------------------------------------------------------ Fighters
  ART.BMR062 = (cv) => {
    // Boden: charges in bellowing, greatsword up, no trousers at all.
    field(cv, { seed: 62 });
    hero(cv, { x: 38, lean: 26, body: 'armor', arm: 'armor', legs: 'skinPeach', boot: 'leather', helm: 'open', hair: 'wild', hairMat: 'hairRed', beard: 'hairRed', mouth: 'roar', brows: 'angry',
      aF: [168, 30], aB: [150, 40], lF: [60, -70], lB: [-55, -20], wF: { type: 'greatsword', rot: 20 }, chest: (c, j) => c.ellipse(j.hip[0], j.hip[1] + 2, 6, 3, 'robeWhite', { flat: 0.7 }) });
    K.dust(cv, 22, 104, 3);
    K.speed(cv, 16, 60, -1, 3, 10);
  };

  ART.BMR063 = (cv) => {
    // Jarek: slams forward behind his lion shield, sword cocked behind.
    field(cv, { castle: 2, seed: 63 });
    const J = hero(cv, { x: 36, lean: 22, body: 'armor', arm: 'armor', legs: 'steel', boot: 'steel', helm: 'closed', plume: 'plume', eyeMat: 'eyeBlue', pauldrons: true, cape: 'cape', capeFly: 40,
      aF: [80, 10], aB: [150, 30], lF: [50, -40], lB: [-50, 0], wF: { type: 'kite' }, wB: { type: 'sword', rot: 10 } });
    cv.figure();
    const e = J.aF.end;
    cv.ellipse(e[0] + 3, e[1] - 1, 4, 4, 'mane', { flat: 0.7 });
    cv.ellipse(e[0] + 3, e[1], 2.2, 2.2, 'gold', { flat: 0.8 });
    K.burst(cv, e[0] + 12, e[1], 6, 'holy');
  };

  ART.BMR064 = (cv) => {
    // Fire's Breath: spins with twin blades, trailing a ring of fire.
    field(cv, { sky: 'sunset', sun: [14, 22], sunMat: 'fire', seed: 64 });
    const J = hero(cv, { x: 40, jump: 6, f: -1, lean: -14, body: 'leather', arm: 'skinTan', skin: 'skinTan', legs: 'robeRed', hair: 'wild', hairMat: 'hairRed', mouth: 'grin', brows: 'angry',
      aF: [100, -10], aB: [-100, 20], lF: [45, -60], lB: [-30, -10], wF: { type: 'sword' }, wB: { type: 'sword' } });
    cv.arc(40, 62, 24, 28, 140, 400, 'fire', { flat: 0.85, taper: true });
    for (const [x, y] of [[16, 56], [62, 76], [30, 40]]) K.flame(cv, x, y, 2.5);
    K.dust(cv, 40, 104, 2);
  };

  ART.BMR065 = (cv) => {
    // Samurai Tom: the iaido cut, blade already through, petals flying.
    field(cv, { trees: [70], seed: 65 });
    const J = hero(cv, { x: 30, crouch: 8, lean: 30, body: 'robeBlue', arm: 'robeBlue', legs: 'black', hair: 'ponytail', hairMat: 'hairBlack', mouth: 'line', brows: 'angry', eyes: 'closed',
      aF: [96, 0], aB: [20, 40], lF: [75, -80], lB: [-55, 10], wF: { type: 'katana', len: 26 } });
    K.slash(cv, J.aF.end[0] - 8, J.aF.end[1] + 4, 30, -80, 10);
    const r = K.rnd(65);
    for (let k = 0; k < 10; k++) cv.ellipse(10 + r() * 60, 14 + r() * 60, 1.4, 1, 'hairPink', { flat: 0.85 });
  };

  ART.BMR066 = (cv) => {
    // Johnny: a grey-cloaked swordsman stalks in under the moon, blade low.
    field(cv, { sky: 'night', sun: [60, 16], hillMat: 'grassDark', ground: 'grassDark', clouds: null, seed: 66 });
    stars(cv, 14, 66);
    hero(cv, { x: 36, lean: 18, body: 'cloak', arm: 'cloak', legs: 'black', hood: true, hoodMat: 'cloak', faceShadow: true, eyeMat: 'eyeBlue', cape: 'cloak', capeFly: 50,
      aF: [40, 50], aB: [-40, 30], lF: [55, -40], lB: [-40, -10], wF: { type: 'sword', rot: 10 } });
    K.speed(cv, 14, 70, -1, 3, 8, 'ghost');
  };

  ART.BMR067 = (cv) => {
    // Crystol & A'lan: she charges with sword; he draws a bow behind her.
    field(cv, { seed: 67 });
    hero(cv, { x: 20, s: 0.7, f: 1, ground: 92, body: 'robeGreen', arm: 'robeGreen', legs: 'leather', hair: 'slick', hairMat: 'hairBlonde', ears: 'pointy', mouth: 'line',
      aF: [92, 0], aB: [92, 140], lF: [20, -10], lB: [-25, 0], wF: { type: 'bow', rot: 0 } });
    const J = hero(cv, { x: 50, lean: 24, body: 'armor', arm: 'armor', legs: 'robeBlue', hair: 'ponytail', hairMat: 'hairRed', mouth: 'roar', brows: 'angry',
      aF: [130, -40], aB: [-50, 40], lF: [60, -60], lB: [-50, -20], wF: { type: 'sword', rot: 0 } });
    K.slash(cv, J.tipF[0] - 4, J.tipF[1] + 6, 14, -40, 60);
    cv.capsule(36, 64, 74, 62, 0.6, 0.6, 'wood');
  };

  // ------------------------------------------------------------------ Mages
  ART.BMR068 = (cv) => {
    // Tieg: floats inside a shimmering bubble shield, hands flaring.
    field(cv, { seed: 68 });
    hero(cv, { x: 40, jump: 16, s: 0.8, body: 'robeBlue', arm: 'robeBlue', legs: 'robeBlue', hat: 'wizard', hatMat: 'robeBlue', hair: 'bob', hairMat: 'hairBlack', eyes: 'happy', mouth: 'smile',
      aF: [130, -40], aB: [120, 40], lF: [40, 60], lB: [-10, 70] });
    cv.figure();
    cv.arc(40, 60, 28, 30, 0, 360, 'water', { flat: 0.85 });
    cv.arc(40, 60, 24, 26, 200, 250, 'white', { flat: 1 });
    for (const [x, y] of [[14, 30], [68, 40], [62, 90]]) cv.arc(x, y, 3, 4, 0, 360, 'water', { flat: 0.9 });
  };

  ART.BMR069 = (cv) => {
    // Brandork: staff overhead, a seven-colour spiral pours out of the orb.
    field(cv, { sky: 'night', ground: 'grassDark', hillMat: 'grassDark', clouds: null, seed: 69 });
    stars(cv, 12, 69);
    const J = hero(cv, { x: 30, lean: -12, body: 'robePurple', arm: 'robePurple', legs: 'robePurple', hat: 'wizard', hatMat: 'robePurple', hair: 'long', hairMat: 'hairWhite', beard: 'hairWhite',
      mouth: 'open', aF: [165, 0], aB: [120, 40], lF: [30, -20], lB: [-25, 10], wF: { type: 'staff', orb: 'gem', rot: 0 } });
    cv.figure();
    rainbow.forEach((m, k) => cv.arc(J.tipF[0] + 14, J.tipF[1] + 22, 4 + k * 3, 6 + k * 3, k * 40, k * 40 + 220, m, { flat: 0.85, taper: true }));
  };

  ART.BMR070 = (cv) => {
    // Mitchell: tears a planar rift open with both hands.
    field(cv, { sky: 'night', ground: 'grassDark', hillMat: 'grassDark', clouds: null, seed: 70 });
    cv.figure();
    cv.poly([[52, 16], [64, 34], [58, 54], [66, 76], [52, 96], [46, 70], [50, 50], [42, 32]], 'magic', { flat: 0.8 });
    cv.poly([[52, 22], [60, 36], [54, 54], [60, 74], [52, 88], [49, 70], [52, 50], [46, 34]], 'void', { flat: 0 });
    for (const [x, y] of [[54, 40], [52, 62], [56, 78]]) cv.px(x, y, 'white', 1);
    hero(cv, { x: 28, lean: 10, body: 'robeRed', arm: 'robeRed', legs: 'black', hair: 'spiky', hairMat: 'hairBlack', mouth: 'roar', brows: 'angry', eyeMat: 'magic',
      aF: [110, -30], aB: [80, 30], lF: [45, -40], lB: [-40, 10] });
    for (const [x, y] of [[40, 30], [68, 60], [36, 84]]) K.sparkle(cv, x, y, 2, 'magic');
  };

  ART.BMR071 = (cv) => {
    // Kalish: hurls a fireball from a nine-fingered hand.
    field(cv, { seed: 71 });
    const J = hero(cv, { x: 26, lean: 20, body: 'robeRed', arm: 'robeRed', legs: 'black', hat: 'wizard', hatMat: 'robeRed', beard: 'hairBlack', hair: 'long', hairMat: 'hairBlack', brows: 'angry', mouth: 'roar',
      aF: [92, -6], aB: [-60, 40], lF: [55, -40], lB: [-45, 0] });
    K.fireball(cv, J.aF.end[0] + 20, J.aF.end[1], 7, 90, 1);
    K.fireball(cv, 70, 30, 4, 90, 1);
  };

  ART.BMR072 = (cv) => {
    // Dartteon: an elf pyromancer lifts twin flames in a burning circle.
    field(cv, { sky: 'sunset', sun: [14, 18], sunMat: 'fire', seed: 72 });
    const J = hero(cv, { x: 40, jump: 4, body: 'robeGreen', arm: 'robeGreen', legs: 'leather', hair: 'long', hairMat: 'hairBlonde', ears: 'pointy', eyeMat: 'fire', mouth: 'grin',
      aF: [150, -30], aB: [150, 30], lF: [20, -10], lB: [-20, 10] });
    K.flame(cv, J.aF.end[0], J.aF.end[1] - 6, 5);
    K.flame(cv, J.aB.end[0], J.aB.end[1] - 6, 5);
    K.circle(cv, 40, 104, 24, 5, 'fire');
  };

  ART.BMR073 = (cv) => {
    // Koey: summons a coiling green dragon spirit.
    field(cv, { seed: 73 });
    hero(cv, { x: 24, s: 0.84, lean: -6, body: 'robeWhite', arm: 'robeWhite', legs: 'robeGreen', hair: 'bun', hairMat: 'hairBlack', mouth: 'open', eyeMat: 'eyeGreen',
      aF: [130, -30], aB: [110, 10], lF: [40, -40], lB: [-30, 10] });
    cv.figure();
    let p = [34, 60];
    for (let k = 0; k < 12; k++) {
      const q = [34 + k * 3.4, 60 - Math.sin(k * 0.9) * 14 - k * 2];
      cv.capsule(p[0], p[1], q[0], q[1], 3.6 - k * 0.15, 3.4 - k * 0.15, 'slime');
      p = q;
    }
    cv.ellipse(p[0] + 3, p[1] - 2, 6, 4.5, 'slime');
    cv.capsule(p[0] + 4, p[1] - 4, p[0] - 2, p[1] - 12, 1, 0.5, 'gold');
    cv.px(p[0] + 4, p[1] - 3, 'eyeGold', 1);
    cv.light(p[0], p[1], 22, 0.4);
  };

  // ------------------------------------------------------------------ Thieves
  ART.BMR074 = (cv) => {
    // Joman: tiptoes past with a lifted coin purse.
    field(cv, { castle: 54, seed: 74 });
    const J = hero(cv, { x: 36, crouch: 4, lean: 24, body: 'cloak', arm: 'cloak', legs: 'black', hood: true, hoodMat: 'cloak', mouth: 'grin',
      aF: [70, 40], aB: [140, -60], lF: [40, -70], lB: [-40, -20] });
    cv.figure();
    cv.ellipse(J.aF.end[0] + 3, J.aF.end[1] + 3, 4, 4, 'leather');
    K.coins(cv, [[J.aF.end[0] + 6, J.aF.end[1] + 12], [J.aF.end[0] + 2, J.aF.end[1] + 20]]);
  };

  ART.BMR075 = (cv) => {
    // Lance: an uppercut so hard it bent his own blade.
    field(cv, { seed: 75 });
    const J = hero(cv, { x: 38, jump: 8, lean: -14, body: 'leather', arm: 'leather', legs: 'robeBlue', hair: 'spiky', hairMat: 'hairBlack', mouth: 'roar', brows: 'angry',
      aF: [172, -10], aB: [-40, 40], lF: [60, -90], lB: [-20, -10] });
    K.burst(cv, J.aF.end[0], J.aF.end[1] - 4, 9, 'holy');
    cv.figure();
    cv.capsule(J.aB.end[0], J.aB.end[1], J.aB.end[0] - 4, J.aB.end[1] + 8, 1.2, 1, 'steel');
    cv.capsule(J.aB.end[0] - 4, J.aB.end[1] + 8, J.aB.end[0] + 2, J.aB.end[1] + 14, 1, 0.5, 'steel');
  };

  ART.BMR076 = (cv) => {
    // Jesta: dives headfirst at an open treasure chest.
    field(cv, { seed: 76 });
    cv.figure();
    cv.rect(56, 86, 20, 14, 'wood', { flat: 0.5 });
    cv.poly([[54, 86], [76, 86], [74, 72], [56, 74]], 'wood', { flat: 0.6 });
    cv.ellipse(66, 86, 9, 2.5, 'gold', { flat: 0.9 });
    cv.light(66, 84, 16, 0.4);
    hero(cv, { x: 30, jump: 20, lean: 76, body: 'robePurple', arm: 'robePurple', legs: 'black', hair: 'ponytail', hairMat: 'hairPink', eyes: 'happy', mouth: 'open',
      aF: [96, 0], aB: [104, 0], lF: [-20, -10], lB: [-40, -30] });
    K.speed(cv, 14, 56, -1, 3, 10);
  };

  ART.BMR077 = (cv) => {
    // Kins: a conquistador charges, rapier levelled.
    field(cv, { sky: 'sunset', sun: [16, 18], sunMat: 'fire', ground: 'sand', hillMat: 'sand', seed: 77 });
    const J = hero(cv, { x: 30, lean: 24, body: 'armor', arm: 'armor', legs: 'robeRed', boot: 'black', helm: 'open', plume: 'plume', beard: 'hairBlack', mouth: 'roar', brows: 'angry',
      aF: [92, 0], aB: [-60, 60], lF: [60, -60], lB: [-55, -20], wF: { type: 'sword', len: 26, guard: 'gold' } });
    K.speed(cv, 12, 64, -1, 3, 10);
    K.dust(cv, 20, 104, 3);
    K.sparkle(cv, J.tipF[0], J.tipF[1], 2, 'holy');
  };

  ART.BMR078 = (cv) => {
    // Sir Digby: drops to a crouch over fresh footprints, lens raised.
    field(cv, { path: true, seed: 78 });
    for (const [x, y] of [[48, 96], [54, 102], [60, 94], [66, 100]]) cv.ellipse(x, y, 1.6, 2.6, 'dirt', { flat: 0.3 });
    const J = hero(cv, { x: 30, crouch: 10, lean: 34, body: 'robeBrown', arm: 'robeBrown', legs: 'robeBrown', hat: 'cap', hatMat: 'robeBrown', hair: 'slick', hairMat: 'hairBrown', beard: 'hairBrown',
      eyes: 'big', mouth: 'line', aF: [70, -20], aB: [10, 60], lF: [80, -110], lB: [-10, -90] });
    cv.figure();
    const e = J.aF.end;
    cv.capsule(e[0], e[1], e[0] + 5, e[1] + 3, 1, 1, 'wood');
    cv.arc(e[0] + 9, e[1] + 5, 4, 5.5, 0, 360, 'gold', { flat: 0.8 });
    cv.ellipse(e[0] + 9, e[1] + 5, 3.4, 3.4, 'glass', { flat: 0.9 });
  };

  ART.BMR079 = (cv) => {
    // Jerome: a monkey thief's flying kick.
    field(cv, { trees: [8, 72], seed: 79 });
    hero(cv, { x: 36, jump: 22, f: 1, lean: -30, skin: 'fur', body: 'robeRed', arm: 'fur', legs: 'fur', boot: 'fur', glove: 'fur', headType: 'beast', muzzle: 'furLight', tail: 'fur',
      headband: 'robeRed', mouth: 'grin', eyeMat: 'eyeGold', aF: [-80, 40], aB: [160, 20], lF: [100, -5], lB: [-30, -90] });
    K.speed(cv, 18, 50, -1, 4, 12);
    K.burst(cv, 66, 58, 6, 'holy');
  };

  ART.BMR080 = (cv) => {
    // The Fool: juggling, tripping over his own feet.
    field(cv, { castle: 60, seed: 80 });
    hero(cv, { x: 36, lean: -26, body: 'purple', arm: 'yellow', legs: 'purple', boot: 'yellow', hat: 'cap', hatMat: 'purple', hair: 'bob', hairMat: 'hairBlonde', eyes: 'spiral', mouth: 'open',
      blush: true, aF: [150, -40], aB: [130, 40], lF: [80, 0], lB: [-40, -50], chest: (c, j) => c.poly([[j.top[0], j.top[1]], [j.hip[0], j.hip[1]], [j.hip[0] + 6, j.hip[1]], [j.top[0] + 8, j.top[1]]], 'yellow', { flat: 0.6 }) });
    cv.figure();
    for (const [x, y, m] of [[22, 22, 'fire'], [36, 14, 'water'], [52, 20, 'slime'], [62, 34, 'yellow']]) cv.ellipse(x, y, 3, 3, m, { round: 0.8 });
    cv.arc(42, 40, 22, 23, 200, 340, 'slash', { flat: 0.9, taper: true });
  };

  // ------------------------------------------------------------------ Epic heroes
  ART.BMR081 = (cv) => {
    // Katelyn: an angel healer swoops down pouring light from her palms.
    field(cv, { seed: 81 });
    const J = hero(cv, { x: 40, jump: 26, lean: 10, wings: 'white', body: 'robeWhite', arm: 'robeWhite', legs: 'robeWhite', hair: 'long', hairMat: 'hairBlonde', eyes: 'closed', mouth: 'smile',
      aF: [110, -20], aB: [90, 20], lF: [10, 40], lB: [-20, 50] });
    cv.figure();
    cv.arc(J.head[0], J.head[1] - 14, 7, 8, 180, 360, 'gold', { flat: 0.9 });
    for (let k = 0; k < 4; k++) cv.capsule(J.aF.end[0], J.aF.end[1], J.aF.end[0] + 6 + k * 4, 104, 1.4, 3, 'holy', { flat: 0.85 });
    for (const [x, y] of [[60, 90], [52, 70], [68, 76]]) K.sparkle(cv, x, y, 2, 'holy');
  };

  ART.BMR082 = (cv) => {
    // Kerberos: a dog cleric bounds forward swinging a flail of light.
    field(cv, { seed: 82 });
    const J = hero(cv, { x: 36, jump: 10, lean: 16, skin: 'furGrey', body: 'robeWhite', arm: 'robeWhite', legs: 'furGrey', boot: 'furGrey', glove: 'furGrey', headType: 'beast', muzzle: 'furLight',
      tail: 'furGrey', mouth: 'roar', eyeMat: 'eyeGold', aF: [160, 40], aB: [80, 30], lF: [60, -80], lB: [-40, -40], wF: { type: 'mace', mat: 'gold' } });
    K.burst(cv, J.tipF[0], J.tipF[1], 8, 'holy');
    K.dust(cv, 30, 104, 2);
  };

  ART.BMR083 = (cv) => {
    // Lord Van Ette: rises off the ground, arms wide, the sky splitting with light.
    field(cv, { sky: 'sunset', seed: 83, clouds: [[4, 20], [50, 14]] });
    cv.scene();
    cv.light(40, 20, 50, 0.6);
    for (let k = 0; k < 5; k++) cv.poly([[36 + k * 2, 0], [40 + k * 2, 0], [26 + k * 8, 100], [22 + k * 8, 100]], 'holy', { flat: 0.95, bevel: false });
    hero(cv, { x: 40, jump: 14, body: 'robeWhite', arm: 'robeWhite', legs: 'robeWhite', trim: 'gold', hair: 'long', hairMat: 'hairWhite', beard: 'hairWhite', eyes: 'closed', mouth: 'open', crown: 'gold',
      torsoW: 24, aF: [140, -30], aB: [140, 30], lF: [10, 20], lB: [-10, 20] });
  };

  ART.BMR084 = (cv) => {
    // Jejune & Everlea: two sisters cross their wands into one beam.
    field(cv, { sky: 'night', ground: 'grassDark', hillMat: 'grassDark', clouds: null, seed: 84 });
    stars(cv, 12, 84);
    const A = hero(cv, { x: 18, s: 0.74, body: 'robeBlue', arm: 'robeBlue', legs: 'robeBlue', hair: 'long', hairMat: 'hairBlue', mouth: 'line', brows: 'angry',
      aF: [110, -10], aB: [60, 40], lF: [40, -40], lB: [-30, 10], wF: { type: 'wand' } });
    const B = hero(cv, { x: 40, s: 0.8, ground: 108, body: 'robePurple', arm: 'robePurple', legs: 'robePurple', hair: 'ponytail', hairMat: 'hairPink', mouth: 'roar', brows: 'angry',
      aF: [96, -10], aB: [-50, 40], lF: [50, -50], lB: [-40, 10], wF: { type: 'wand' } });
    cv.figure();
    cv.capsule(A.tipF[0], A.tipF[1], 76, 52, 1, 2.4, 'water', { flat: 0.85 });
    cv.capsule(B.tipF[0], B.tipF[1], 76, 52, 1, 2.4, 'magic', { flat: 0.85 });
    K.burst(cv, 74, 52, 7, 'holy');
  };

  ART.BMR085 = (cv) => {
    // Frankov: a lone warrior catches the storm on his raised greatsword.
    field(cv, { sky: 'night', ground: 'grassDark', hillMat: 'grassDark', clouds: [[0, 14], [40, 8], [60, 20]], seed: 85 });
    const J = hero(cv, { x: 40, f: -1, body: 'armor', arm: 'armor', legs: 'black', boot: 'steel', hair: 'wild', hairMat: 'hairBlack', mouth: 'roar', brows: 'angry', cape: 'cape', capeFly: 50,
      aF: [178, 0], aB: [170, 10], lF: [30, -20], lB: [-30, 10], wF: { type: 'greatsword', rot: 0 } });
    K.bolt(cv, 60, 0, J.tipF[0], J.tipF[1], 'holy', 85);
    K.burst(cv, J.tipF[0], J.tipF[1], 6, 'holy');
    for (let k = 0; k < 14; k++) cv.line(4 + k * 6, 30 + (k % 3) * 20, 1 + k * 6, 38 + (k % 3) * 20, 'water', 0.8);
  };

  ART.BMR086 = (cv) => {
    // Nate: squid-like tentacles lash from his back as he lunges.
    field(cv, { ground: 'sand', hillMat: 'water', seed: 86 });
    const J = hero(cv, { x: 34, lean: 18, skin: 'skinBlue', body: 'teal', arm: 'skinBlue', legs: 'teal', hair: 'wild', hairMat: 'hairBlue', mouth: 'grin', eyeMat: 'eyeGold',
      aF: [96, 0], aB: [-40, 40], lF: [55, -50], lB: [-45, 0], wF: { type: 'trident' } });
    cv.figure();
    for (let t = 0; t < 4; t++) {
      let p = [J.top[0] - 4, J.top[1] + 6];
      for (let k = 0; k < 6; k++) {
        const a = (-130 - t * 25 + Math.sin(k + t) * 30) * D;
        const q = [p[0] + Math.cos(a) * 5, p[1] + Math.sin(a) * 5];
        cv.capsule(p[0], p[1], q[0], q[1], 2.6 - k * 0.35, 2.3 - k * 0.35, 'skinPurple');
        p = q;
      }
    }
  };

  ART.BMR087 = (cv) => {
    // Antonius: a rune dragoon plunges from the sky, lance first.
    field(cv, { seed: 87 });
    const J = hero(cv, { x: 34, jump: 30, lean: 34, body: 'armor', arm: 'armor', legs: 'steel', boot: 'steel', helm: 'closed', plume: 'robeBlue', eyeMat: 'magic', pauldrons: true,
      aF: [40, 10], aB: [60, 20], lF: [-10, -40], lB: [-40, -20], wF: { type: 'spear', len: 38, mat: 'magic' } });
    for (const x of [20, 30, 40]) K.speed(cv, x, 8, 1, 1, 14, 'magic');
    K.burst(cv, J.tipF[0], J.tipF[1], 6, 'magic');
  };

  ART.BMR088 = (cv) => {
    // Asmor: kicks a dungeon door clean off its hinges.
    field(cv, { castle: null, seed: 88 });
    cv.scene();
    cv.rect(52, 30, 28, 60, 'stone', { flat: 0.5 });
    cv.rect(58, 44, 16, 46, 'void', { flat: 0, bevel: false });
    cv.figure();
    cv.poly([[60, 40], [76, 46], [72, 86], [56, 80]], 'wood', { flat: 0.55 });
    for (const y of [50, 70]) cv.line(58, y, 74, y + 4, 'steel', 0.4);
    hero(cv, { x: 30, lean: -18, body: 'leather', arm: 'skinTan', skin: 'skinTan', legs: 'robeBrown', hair: 'mohawk', hairMat: 'hairRed', mouth: 'roar', brows: 'angry',
      aF: [-40, 60], aB: [140, 30], lF: [100, 0], lB: [-10, 10], wB: { type: 'axe' } });
    K.burst(cv, 52, 72, 6, 'holy');
  };

  ART.BMR089 = (cv) => {
    // Tempros: stops time, clocks frozen in the air around him.
    K.arcane(cv, { mat: 'night', seed: 89 });
    hero(cv, { x: 40, jump: 6, body: 'robeBlue', arm: 'robeBlue', legs: 'robeBlue', hat: 'wizard', hatMat: 'robeBlue', hair: 'long', hairMat: 'hairWhite', beard: 'hairWhite', eyeMat: 'magic',
      aF: [170, -10], aB: [120, 40], lF: [20, -10], lB: [-20, 10], wF: { type: 'staff', orb: 'gold' } });
    cv.figure();
    for (const [x, y, r] of [[14, 26, 7], [66, 40, 6], [16, 76, 5], [64, 86, 7]]) {
      cv.ellipse(x, y, r, r, 'gold', { round: 0.7 });
      cv.ellipse(x, y, r - 1.6, r - 1.6, 'white', { flat: 0.85 });
      cv.line(x, y, x, Math.round(y - r + 2), 'black', 0);
      cv.line(x, y, Math.round(x + r - 3), y, 'black', 0);
    }
  };

  ART.BMR090 = (cv) => {
    // Chia Kang: a warlock fires a hex bolt, fairy familiar at his shoulder.
    field(cv, { sky: 'night', ground: 'grassDark', hillMat: 'grassDark', clouds: null, seed: 90 });
    stars(cv, 10, 90);
    const J = hero(cv, { x: 28, lean: 14, body: 'robePurple', arm: 'robePurple', legs: 'black', hood: true, hoodMat: 'robePurple', mouth: 'grin', eyeMat: 'magic',
      aF: [92, 0], aB: [-40, 40], lF: [45, -40], lB: [-40, 10], wF: { type: 'wand' } });
    K.fireball(cv, J.tipF[0] + 16, J.tipF[1], 6, 90, 1, 'magic');
    cv.figure();
    const fx = J.head[0] - 12, fy = J.head[1] - 10;
    for (const k of [-1, 1]) cv.ellipse(fx + k * 3, fy - 2, 3, 2, 'glass', { flat: 0.9 });
    cv.ellipse(fx, fy, 2, 2.4, 'hairPink', { flat: 0.85 });
    cv.light(fx, fy, 10, 0.4);
  };

  ART.BMR091 = (cv) => {
    // Terric: red robes, a magic helm, lightning from both hands.
    field(cv, { sky: 'night', ground: 'grassDark', hillMat: 'grassDark', clouds: null, seed: 91 });
    const J = hero(cv, { x: 26, lean: 8, body: 'robeRed', arm: 'robeRed', legs: 'robeRed', helm: 'closed', helmMat: 'gold', eyeMat: 'eyeGlow', trim: 'gem',
      aF: [96, -10], aB: [84, 10], lF: [40, -30], lB: [-35, 10] });
    K.bolt(cv, J.aF.end[0] + 2, J.aF.end[1], 78, 40, 'eyeGlow', 91);
    K.bolt(cv, J.aB.end[0] + 2, J.aB.end[1], 76, 80, 'eyeGlow', 92);
    cv.light(J.head[0], J.head[1], 14, 0.35);
  };

  ART.BMR092 = (cv) => {
    // Wayward: a drifter's spinning greatsword cut, scarf whipping.
    field(cv, { ground: 'sand', hillMat: 'sand', sky: 'sunset', clouds: null, seed: 92 });
    const J = hero(cv, { x: 38, lean: 10, f: -1, crouch: 4, body: 'cloak', arm: 'leather', legs: 'robeBrown', hair: 'wild', hairMat: 'hairBlack', mouth: 'line', brows: 'angry',
      aF: [110, 30], aB: [100, 40], lF: [60, -60], lB: [-50, 0], wF: { type: 'greatsword', rot: 10 } });
    cv.figure();
    let p = [J.top[0] + 4, J.top[1] + 2];
    for (let k = 0; k < 5; k++) {
      const q = [p[0] + 5, p[1] + Math.sin(k * 1.4) * 3 - 1];
      cv.capsule(p[0], p[1], q[0], q[1], 2.2, 2, 'robeRed');
      p = q;
    }
    K.slash(cv, J.aF.end[0] + 4, J.aF.end[1], 26, 200, 340);
    K.dust(cv, 40, 104, 3);
  };

  ART.BMR093 = (cv) => {
    // Hya: a ninja mid-flip loosing a fan of shuriken.
    field(cv, { sky: 'night', ground: 'grassDark', hillMat: 'grassDark', sun: [14, 14], clouds: null, seed: 93 });
    stars(cv, 10, 93);
    const J = hero(cv, { x: 32, jump: 20, lean: -24, body: 'black', arm: 'black', legs: 'black', boot: 'black', glove: 'black', hood: true, hoodMat: 'black', headband: 'robeRed', mouth: 'line',
      aF: [90, -20], aB: [150, 30], lF: [60, -110], lB: [10, -90] });
    cv.figure();
    for (const [x, y] of [[54, 40], [64, 52], [70, 66]]) {
      cv.poly([[x, y - 3], [x + 1, y - 1], [x + 3, y], [x + 1, y + 1], [x, y + 3], [x - 1, y + 1], [x - 3, y], [x - 1, y - 1]], 'steel', { flat: 0.85 });
      K.speed(cv, x - 4, y, -1, 1, 6);
    }
  };

  ART.BMR094 = (cv) => {
    // Blackbeard Jake: swings aboard on a rope, cutlass out.
    K.outdoor(cv, { sky: 'sky', ground: 'wood', groundY: 90, hills: false, clouds: [[50, 14]], seed: 94 });
    cv.scene();
    cv.rect(0, 74, 80, 16, 'water', { flat: 0.6, bevel: false });
    cv.rect(0, 86, 80, 4, 'wood', { flat: 0.55 });
    const J = hero(cv, { x: 40, jump: 20, lean: 20, body: 'robeRed', arm: 'robeRed', legs: 'black', boot: 'black', hat: 'cap', hatMat: 'black', hair: 'wild', hairMat: 'hairBlack', beard: 'hairBlack',
      mouth: 'grin', brows: 'angry', aF: [130, -20], aB: [170, 0], lF: [60, -70], lB: [-20, -50], wF: { type: 'sword', mat: 'steel', rot: 20 } });
    cv.figure();
    cv.capsule(J.aB.end[0], J.aB.end[1], 18, 0, 0.8, 0.8, 'wood');
    K.speed(cv, 20, 60, -1, 3, 10);
  };

  ART.BMR095 = (cv) => {
    // Cecil: a jack-of-all-trades lunges with a rapier, gear rattling.
    field(cv, { castle: 4, seed: 95 });
    const J = hero(cv, { x: 34, lean: 26, crouch: 4, body: 'robeGreen', arm: 'robeGreen', legs: 'robeBrown', hat: 'cap', hatMat: 'robeRed', hair: 'bob', hairMat: 'hairBlonde', mouth: 'grin',
      aF: [92, 0], aB: [160, 30], lF: [75, -60], lB: [-60, 0], wF: { type: 'sword', len: 26 }, wB: { type: 'torch', rot: 0 } });
    cv.figure();
    cv.capsule(J.top[0] - 8, J.top[1] + 2, J.top[0] - 12, J.top[1] - 10, 1, 1, 'wood');
    cv.ellipse(J.top[0] - 12, J.top[1] - 12, 3, 2, 'steel');
    K.sparkle(cv, J.tipF[0], J.tipF[1], 2, 'holy');
  };

  ART.BMR096 = (cv) => {
    // Wallbanger: a halfling hurls cookies out of a basket.
    field(cv, { trees: [70], seed: 96 });
    const J = hero(cv, { x: 30, s: 0.72, lean: 10, body: 'robeGreen', arm: 'robeGreen', legs: 'robeBrown', boot: 'skinPeach', hair: 'wild', hairMat: 'hairBrown', eyes: 'happy', mouth: 'open', blush: true,
      aF: [150, -40], aB: [30, 70], lF: [50, -50], lB: [-40, 0] });
    cv.figure();
    cv.ellipse(J.aB.end[0] + 2, J.aB.end[1] + 3, 6, 4, 'wood', { round: 0.6 });
    cv.arc(J.aB.end[0] + 2, J.aB.end[1] + 1, 4, 5, 180, 360, 'wood', { flat: 0.6 });
    for (const [x, y] of [[44, 36], [54, 46], [62, 30], [68, 54]]) {
      cv.ellipse(x, y, 3, 3, 'sand', { round: 0.7 });
      for (const [dx, dy] of [[-1, -1], [1, 1]]) cv.px(x + dx, y + dy, 'robeBrown', 0.2);
    }
    K.speed(cv, 40, 44, -1, 2, 6);
  };
})();

// The card back: a gilt frame round a horned skull on the arcane swirl.
(function () {
  'use strict';
  const ui = globalThis.BF.ui;
  const K = ui.artkit;
  ui.ART.back = (cv) => {
    K.arcane(cv, { mat: 'arcane', seed: 7 });
    cv.figure();
    for (const [i, m] of [[2, 'gold'], [5, 'cape']]) {
      cv.rect(i, i, 80 - i * 2, 2, m, { flat: 0.7 });
      cv.rect(i, 110 - i, 80 - i * 2, 2, m, { flat: 0.7 });
      cv.rect(i, i, 2, 112 - i * 2, m, { flat: 0.7 });
      cv.rect(78 - i, i, 2, 112 - i * 2, m, { flat: 0.7 });
    }
    for (const [x, y] of [[4, 4], [76, 4], [4, 108], [76, 108]]) cv.ellipse(x, y, 3, 3, 'gem', { round: 0.8 });
    for (const k of [-1, 1]) cv.poly([[40 + k * 8, 48], [40 + k * 20, 34], [40 + k * 22, 24], [40 + k * 14, 40]], 'bone', { flat: 0.6 });
    K.HEADS.skull(cv, [40, 56], 1, 1.1, 14, 13, { eyeMat: 'eyeRed' }, { skin: 'bone' }, (dx) => 40 + dx);
    cv.light(40, 56, 30, 0.35);
  };
  ui.back = () => ui.art('back');
})();
