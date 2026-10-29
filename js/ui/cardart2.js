// Card art, part 2 (PLAN D15): Rooms and Spells, each caught mid-action.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;
  const K = ui.artkit;
  const fig = K.figure;
  const ART = ui.ART;
  const bat = ui.artBat;
  const bones = ui.artBones;
  const D = Math.PI / 180;

  /** A four-legged beast: pose 'pounce' (airborne), 'run' or 'lunge'. */
  const beast = (cv, o) => {
    cv.figure();
    const f = o.f ?? 1, s = o.s ?? 1, g = o.ground ?? 102;
    const lift = o.pose === 'pounce' ? 22 * s : o.pose === 'run' ? 4 * s : 0;
    const tilt = o.pose === 'pounce' ? -14 : o.pose === 'lunge' ? 10 : 0;
    const cx = o.x ?? 40, cy = g - 16 * s - lift;
    const hip = [cx - f * 13 * s, cy + Math.sin(tilt * D) * 10 * f * -1];
    const sh = [cx + f * 12 * s, cy - Math.sin(tilt * D) * 10 * f * -1];
    const legs = o.pose === 'pounce'
      ? [[sh, 120, -40], [sh, 100, -20], [hip, -60, 30], [hip, -80, 40]]
      : o.pose === 'run' ? [[sh, 60, -50], [sh, -10, 30], [hip, 40, -30], [hip, -50, 20]] : [[sh, 30, -20], [sh, -5, 0], [hip, 10, -10], [hip, -30, 20]];
    if (o.tail) {
      let p = [hip[0] - f * 4 * s, hip[1] - 2 * s];
      for (const a of [-120, -150, -170]) {
        const q = K.at(p, a, f, 6 * s);
        cv.capsule(p[0], p[1], q[0], q[1], 2 * s, 1.6 * s, o.tail);
        p = q;
      }
    }
    legs.slice(1, 2).concat(legs.slice(3, 4)).forEach(([p, a, e]) => {
      const m = K.at(p, a, f, 8 * s), e2 = K.at(m, a + e, f, 8 * s);
      cv.capsule(p[0], p[1], m[0], m[1], 3.4 * s, 3 * s, o.body, { bias: -0.1 });
      cv.capsule(m[0], m[1], e2[0], e2[1], 3 * s, 2.6 * s, o.body, { bias: -0.1 });
      cv.ellipse(e2[0] + f * 1.5, e2[1], 3.6 * s, 2.4 * s, o.paw || o.body, { bias: -0.1 });
    });
    cv.capsule(hip[0], hip[1], sh[0], sh[1], 11 * s, 12 * s, o.body);
    if (o.belly) cv.ellipse(cx, cy + 5 * s, 12 * s, 5 * s, o.belly, { clip: (x, y) => y > cy + 3 * s });
    if (o.stripes) for (let k = -2; k <= 2; k++) cv.line(Math.round(cx + k * 5 * s), Math.round(cy - 10 * s), Math.round(cx + k * 5 * s - 2), Math.round(cy - 3 * s), o.stripes, 0.1);
    legs.slice(0, 1).concat(legs.slice(2, 3)).forEach(([p, a, e]) => {
      const m = K.at(p, a, f, 8 * s), e2 = K.at(m, a + e, f, 8 * s);
      cv.capsule(p[0], p[1], m[0], m[1], 3.6 * s, 3.2 * s, o.body);
      cv.capsule(m[0], m[1], e2[0], e2[1], 3.2 * s, 2.8 * s, o.body);
      cv.ellipse(e2[0] + f * 1.5, e2[1], 3.8 * s, 2.6 * s, o.paw || o.body);
      if (o.claws) for (let k = -1; k <= 1; k++) cv.px(e2[0] + f * 4 + k, e2[1] + 2, 'white', 1);
    });
    const head = [sh[0] + f * 9 * s, sh[1] - 9 * s + (o.pose === 'pounce' ? -2 : 0)];
    K.HEADS.beast(cv, head, f, s * 0.85, 14 * s * 0.85, 13 * s * 0.85, { mane: o.mane, muzzle: o.muzzle, mouth: o.mouth || 'roar', eyeMat: o.eyeMat }, { skin: o.body }, (dx) => head[0] + dx * f);
    for (const k of [-1, 1]) cv.poly([[head[0] - f * 4 * s + k * 3 * s, head[1] - 9 * s], [head[0] - f * 6 * s + k * 4 * s, head[1] - 17 * s], [head[0] - f * 1 * s + k * 3 * s, head[1] - 11 * s]], o.body, { flat: 0.5 });
    return { head, sh, hip };
  };
  ui.artBeast = beast;

  /** A crowd-pleasing small hero in trouble, used by trap plates. */
  const victim = (cv, o) => fig(cv, { s: 0.68, skin: 'skinPeach', body: 'steel', arm: 'blue', legs: 'blue', boot: 'leather', hair: 'spiky', hairMat: 'hairBrown', mouth: 'open', brows: 'worried', ...o });

  // ------------------------------------------------------------------ Rooms
  ART.BMR009 = (cv) => {
    // Dark Altar: a cultist calls a pillar of violet fire from the altar.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', light: [[40, 56, 40, 0.3]], props: [(c) => {
      c.rect(26, 70, 28, 18, 'stone', { flat: 0.5 });
      c.rect(24, 66, 32, 5, 'marble', { flat: 0.6 });
      for (const x of [27, 51]) { c.rect(x, 58, 2, 8, 'bone', { flat: 0.7 }); K.flame(c, x + 1, 56, 1.5, 'magic'); }
    }] });
    cv.figure();
    for (let k = 0; k < 5; k++) K.flame(cv, 40 + Math.sin(k * 1.3) * 3, 62 - k * 8, 7 - k, 'magic');
    cv.light(40, 44, 26, 0.45);
    fig(cv, { x: 16, f: 1, s: 0.72, hood: true, faceShadow: true, hoodMat: 'robeRed', body: 'robeRed', arm: 'robeRed', legs: 'robeRed', boot: 'black', glove: 'skinPale',
      eyeMat: 'magic', aF: [160, 10], aB: [150, 20], lean: -8, lF: [15, 0], lB: [-10, 0] });
  };

  ART.BMR010 = (cv) => {
    // Open Grave: a skeleton bursts from fresh earth, grabbing at the night air.
    K.outdoor(cv, { sky: 'night', ground: 'dirt', hillMat: 'grassDark', sun: [62, 14], seed: 8 });
    cv.scene();
    for (const x of [8, 66]) {
      cv.rect(x, 58, 8, 22, 'stone', { flat: 0.5 });
      cv.ellipse(x + 4, 58, 4, 4, 'stone', { flat: 0.55 });
    }
    cv.ellipse(40, 98, 22, 7, 'dirt', { bias: -0.15 });
    fig(cv, { x: 40, f: -1, ground: 112, crouch: 0, s: 0.95, skin: 'bone', body: 'bone', arm: 'bone', legs: 'bone', glove: 'bone', headType: 'skull', eyeMat: 'slime',
      noLegs: true, noBelt: true, aF: [160, -30], aB: [120, 30], lean: -10, wF: { type: 'claw' }, chest: (c, j) => {
        for (let k = 0; k < 4; k++) c.line(Math.round(j.hip[0] - 6), Math.round(j.top[1] + 4 + k * 4), Math.round(j.hip[0] + 6), Math.round(j.top[1] + 4 + k * 4), 'bone', 0.1);
      } });
    cv.figure();
    for (const [x, y] of [[22, 92], [58, 90], [30, 84], [52, 82], [44, 78]]) cv.ellipse(x, y, 2.4, 2, 'dirt', { flat: 0.6 });
  };

  ART.BMR011 = (cv) => {
    // Specter's Sanctum: a shrieking ghost swoops at the viewer, chains trailing.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', torches: [10, 70] });
    cv.figure();
    cv.poly([[30, 60], [52, 56], [62, 82], [50, 76], [44, 92], [36, 80], [24, 88], [26, 70]], 'ghost', { flat: 0.6, grad: 0.3 });
    const J = fig(cv, { x: 40, jump: 26, f: 1, lean: 30, s: 0.9, skin: 'ghost', body: 'ghost', arm: 'ghost', glove: 'ghost', headType: 'ghost', noLegs: true, noBelt: true,
      aF: [130, 20], aB: [100, 40], wF: { type: 'claw', mat: 'ghost' } });
    K.speed(cv, 26, 54, 1, 4, 12, 'ghost');
    let p = J.aB.end;
    for (let k = 0; k < 6; k++) {
      cv.ellipse(p[0], p[1], 1.8, 1.4, 'steel', { flat: 0.6 });
      p = [p[0] - 3, p[1] + 3];
    }
  };

  ART.BMR012 = (cv) => {
    // Succubus Spa: a winged hostess flings a wave of scented steam from the pool.
    K.room(cv, { wall: 'tile', wallMat: 'pinkTile', floorMat: 'marble', pillars: true, pillarMat: 'marble', props: [(c) => {
      c.ellipse(40, 98, 34, 9, 'water', { flat: 0.6 });
      for (let k = 0; k < 5; k++) c.ellipse(14 + k * 13, 82 - (k % 2) * 6, 6, 4, 'white', { flat: 0.5 });
    }] });
    const J = fig(cv, { x: 38, f: 1, ground: 104, s: 0.92, skin: 'skinRed', body: 'silk', arm: 'skinRed', legs: 'silk', boot: 'silk', glove: 'skinRed', hair: 'long', hairMat: 'hairBlack',
      eyeMat: 'eyeGold', horns: 'black', wings: 'black', tail: 'skinRed', mouth: 'smile', torsoW: 18, aF: [130, -40], aB: [40, 60], lF: [20, -10], lB: [-10, 0], lean: -6 });
    cv.figure();
    cv.ellipse(40, 100, 24, 6, 'water', { flat: 0.7 });
    cv.arc(J.aF.end[0] + 2, J.aF.end[1] + 18, 14, 18, -110, -20, 'water', { flat: 0.85, taper: true });
    for (const [x, y] of [[62, 40], [68, 52], [58, 30]]) cv.ellipse(x, y, 2, 2, 'water', { flat: 0.85 });
  };

  ART.BMR013 = (cv) => {
    // Dracolich Lair: a skeletal dragon's skull lunges in, breathing green fire.
    K.room(cv, { wall: 'rock', wallMat: 'rock', floorMat: 'floor', seed: 13 });
    bones(cv, [[12, 100, 0.2], [26, 106, 1.9], [70, 104, 0.8], [60, 98, 2.6]]);
    cv.figure();
    // Neck vertebrae.
    for (let k = 0; k < 5; k++) cv.ellipse(70 - k * 7, 24 + k * 6, 4.5, 4, 'bone');
    // Skull: long snout, open jaw, horns.
    cv.poly([[40, 46], [62, 34], [70, 42], [60, 54], [30, 60]], 'bone', { flat: 0.6, grad: 0.3 });
    cv.poly([[34, 62], [58, 56], [62, 66], [26, 74]], 'bone', { flat: 0.5 });
    for (let k = 0; k < 5; k++) { cv.px(34 + k * 5, 60, 'white', 1); cv.px(36 + k * 5, 63, 'white', 1); }
    cv.capsule(60, 36, 74, 22, 2.4, 1, 'bone');
    cv.ellipse(54, 44, 3.5, 3, 'void', { flat: 0 });
    cv.px(54, 44, 'slime', 1);
    cv.light(54, 44, 10, 0.3);
    K.fireball(cv, 14, 74, 7, 120, 1, 'slime');
    for (const [x, y] of [[22, 70], [30, 64], [8, 84]]) K.flame(cv, x, y, 3, 'slime');
  };

  ART.BMR014 = (cv) => {
    // Vampire Bordello: a vampire hostess raises a toast as bats scatter from the chandelier.
    K.room(cv, { wall: 'tile', wallMat: 'carpet', floorMat: 'carpet', props: [(c) => {
      c.rect(39, 0, 2, 14, 'gold', { flat: 0.7 });
      c.ellipse(40, 16, 16, 4, 'gold', { flat: 0.6 });
      for (const x of [26, 33, 40, 47, 54]) K.flame(c, x, 11, 1.4);
      c.poly([[2, 56], [18, 50], [20, 90], [2, 90]], 'cape', { flat: 0.5 });
    }] });
    for (const [x, y, k] of [[20, 30, 0.8], [60, 28, 0.9], [66, 44, 0.7], [12, 46, 0.6]]) bat(cv, x, y, k);
    fig(cv, { x: 42, f: -1, s: 0.95, skin: 'skinPale', body: 'lining', arm: 'skinPale', legs: 'lining', boot: 'black', glove: 'skinPale', hair: 'ponytail', hairMat: 'hairBlack',
      eyeMat: 'eyeRed', mouth: 'fangs', ears: 'pointy', torsoW: 18, aF: [165, -10], aB: [-40, 50], lF: [25, -20], lB: [-20, 10], lean: -12, cape: 'cape', capeFly: 35,
      wF: { type: 'goblet', rot: 180 } });
  };

  ART.BMR015 = (cv) => {
    // Goblin Armory: a goblin charges out of the rack with a spear, another hurls an axe.
    K.room(cv, { wall: 'plank', wallMat: 'wood', floorMat: 'floor', props: [(c) => {
      c.rect(4, 22, 72, 4, 'wood', { flat: 0.55 });
      for (const x of [8, 14, 66, 72]) { c.capsule(x, 6, x, 60, 0.8, 0.8, 'wood'); c.poly([[x - 2, 7], [x, 1], [x + 2, 7]], 'steel', { flat: 0.7 }); }
    }] });
    fig(cv, { x: 62, f: -1, s: 0.62, skin: 'skinGob', body: 'leather', arm: 'skinGob', legs: 'leather', glove: 'skinGob', ears: 'big', mouth: 'grin', eyeMat: 'eyeGold',
      hat: 'cap', aF: [170, 20], lF: [20, -10], jump: 10, lean: -10 });
    K.weapon(cv, [50, 40], 140, 1, 0.7, { type: 'axe' });
    K.speed(cv, 58, 38, -1, 2, 6);
    fig(cv, { x: 32, f: 1, lean: 24, s: 0.9, skin: 'skinGob', body: 'armor', arm: 'skinGob', legs: 'leather', glove: 'skinGob', ears: 'big', mouth: 'roar', eyeMat: 'eyeGold',
      hat: 'cap', hatMat: 'leather', brows: 'angry', aF: [95, -5], aB: [-50, 40], lF: [50, -50], lB: [-45, 10], wF: { type: 'spear', len: 34 } });
    K.dust(cv, 20, 104, 2);
  };

  ART.BMR016 = (cv) => {
    // Golem Factory: lightning crackles as a freshly forged golem stomps off the line.
    K.room(cv, { wall: 'tile', wallMat: 'steel', floorMat: 'floor', props: [(c) => {
      for (const [x, y, r] of [[12, 20, 9], [68, 26, 7]]) {
        c.ellipse(x, y, r, r, 'copper', { flat: 0.55 });
        c.ellipse(x, y, r * 0.4, r * 0.4, 'stone', { flat: 0.4 });
      }
      c.rect(0, 84, 80, 4, 'steel', { flat: 0.45 });
    }] });
    K.bolt(cv, 8, 6, 30, 44, 'eyeGlow', 5);
    K.bolt(cv, 74, 4, 52, 40, 'eyeGlow', 9);
    fig(cv, { x: 42, f: -1, s: 1, skin: 'rock', body: 'rock', arm: 'rock', legs: 'rock', boot: 'steel', glove: 'rock', headType: 'golem', eyeMat: 'eyeGlow',
      torsoW: 25, aF: [60, 50], aB: [-60, 40], lF: [55, -20], lB: [-20, 10], lean: 6 });
    K.dust(cv, 30, 106, 3);
  };

  ART.BMR017 = (cv) => {
    // Minotaur's Maze: the bull charges down a hedge corridor, horns low.
    K.room(cv, { wall: 'hedge', wallMat: 'leaf', floorMat: 'dirt', floor: 'plain', seed: 17 });
    cv.scene();
    cv.poly([[0, 40], [20, 46], [20, 92], [0, 104]], 'leaf', { flat: 0.42 });
    cv.poly([[80, 40], [60, 46], [60, 92], [80, 104]], 'leaf', { flat: 0.38 });
    const J = fig(cv, { x: 40, f: -1, lean: 40, s: 1, skin: 'fur', body: 'fur', arm: 'fur', legs: 'fur', boot: 'black', glove: 'fur', headType: 'beast', muzzle: 'furLight',
      horns: 'bone', ring: true, mouth: 'roar', eyeMat: 'eyeRed', head: 20, aF: [60, 60], aB: [-70, 40], lF: [55, -50], lB: [-40, -10], wB: { type: 'greataxe', rot: 40 } });
    K.dust(cv, 54, 104, 3);
    K.speed(cv, J.head[0] + 18, J.head[1] + 4, -1, 3, 10, 'dust');
  };

  ART.BMR018 = (cv) => {
    // Neanderthal Cave: a caveman leaps from a ledge with his club overhead.
    K.room(cv, { wall: 'rock', wallMat: 'rock', floorMat: 'dirt', floor: 'plain', seed: 18, light: [[16, 88, 26, 0.5]], props: [(c) => {
      for (let k = 0; k < 5; k++) c.capsule(8 + k * 3, 94, 14 + k * 3, 90, 1, 1, 'wood');
      K.flame(c, 16, 86, 4);
      c.poly([[8, 22], [20, 26], [18, 40], [6, 36]], 'white', { flat: 0.5 });
      c.line(10, 28, 16, 34, 'rust', 0.5);
    }] });
    fig(cv, { x: 46, f: -1, jump: 14, lean: 10, s: 1, skin: 'skinTan', body: 'fur', arm: 'skinTan', legs: 'skinTan', boot: 'fur', glove: 'skinTan', hair: 'wild', hairMat: 'hairBrown',
      beard: 'hairBrown', mouth: 'roar', brows: 'angry', eyeMat: 'eyeGold', aF: [175, 20], aB: [100, 30], lF: [70, -90], lB: [-20, -50], wF: { type: 'club', len: 20, rot: 10 } });
  };

  ART.BMR019 = (cv) => {
    // Beast Menagerie: a beast snaps its chain and pounces from its cage.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', props: [(c) => {
      for (let x = 50; x < 80; x += 5) c.rect(x, 20, 2, 70, 'steel', { flat: 0.5 });
      c.rect(48, 18, 32, 4, 'steel', { flat: 0.6 });
    }] });
    const B = beast(cv, { x: 36, f: -1, pose: 'pounce', s: 1, body: 'fur', belly: 'furLight', muzzle: 'furLight', claws: true, tail: 'fur', eyeMat: 'eyeRed' });
    cv.figure();
    let p = [B.sh[0] + 4, B.sh[1] - 4];
    for (let k = 0; k < 6; k++) {
      cv.ellipse(p[0], p[1], 2, 1.6, 'steel', { flat: 0.6 });
      p = [p[0] + 4, p[1] + 2];
    }
    K.burst(cv, p[0], p[1], 5, 'holy');
  };

  ART.BMR020 = (cv) => {
    // Monster's Ballroom: a skeleton spins a slime across the dance floor.
    K.room(cv, { wall: 'tile', wallMat: 'robePurple', floorMat: 'marble', props: [(c) => {
      c.rect(39, 0, 2, 10, 'gold', { flat: 0.7 });
      c.ellipse(40, 14, 7, 7, 'glass', { flat: 0.8 });
      for (let k = 0; k < 8; k++) c.light(10 + k * 9, 30 + (k % 3) * 12, 10, 0.25);
    }] });
    fig(cv, { x: 30, f: 1, s: 0.85, skin: 'bone', body: 'black', arm: 'bone', legs: 'black', boot: 'black', glove: 'bone', headType: 'skull', eyeMat: 'magic',
      aF: [120, 20], aB: [170, 10], lF: [70, -60], lB: [-10, 0], lean: -8 });
    fig(cv, { x: 54, f: -1, s: 0.75, jump: 12, skin: 'slime', body: 'slime', arm: 'slime', glove: 'slime', headType: 'slime', noLegs: true, belly: true, eyeMat: 'eyeBlue', mouth: 'smile',
      aF: [130, 10], aB: [160, 10] });
    for (const [x, y] of [[12, 40], [66, 30], [40, 34], [20, 60]]) K.sparkle(cv, x, y, 2, 'magic');
  };

  ART.BMR021 = (cv) => {
    // Brainsucker Hive: a floating brain lashes out with tentacles.
    K.room(cv, { wall: 'rock', wallMat: 'hive', floorMat: 'hive', floor: 'plain', seed: 21, props: [(c) => {
      for (let k = 0; k < 6; k++) c.ellipse(8 + k * 13, 16 + (k % 2) * 10, 5, 7, 'flesh', { bias: -0.2 });
    }] });
    cv.figure();
    for (let k = 0; k < 6; k++) {
      let p = [32 + k * 3, 64];
      for (let j = 0; j < 5; j++) {
        const a = 90 + Math.sin(k * 1.7 + j) * 50 + (k - 2.5) * 18;
        const q = [p[0] + Math.cos(a * D) * 5, p[1] + Math.sin(a * D) * 5];
        cv.capsule(p[0], p[1], q[0], q[1], 2 - j * 0.3, 1.8 - j * 0.3, 'skinPurple');
        p = q;
      }
    }
    K.HEADS.brain(cv, [38, 50], 1, 1, 15, 13, { eyes: 'glow', eyeMat: 'magic' }, { skin: 'flesh' }, (dx) => 38 + dx);
    for (let k = 0; k < 3; k++) cv.arc(38, 50, 22 + k * 5, 23 + k * 5, 200, 340, 'magic', { flat: 0.8 });
  };

  ART.BMR022 = (cv) => {
    // Dark Laboratory: a flask explodes and an imp assistant dives for cover.
    K.room(cv, { wall: 'tile', wallMat: 'stone', floorMat: 'floor', props: [(c) => {
      c.rect(4, 34, 72, 3, 'wood', { flat: 0.55 });
      for (const [x, m] of [[10, 'slime'], [18, 'magic'], [58, 'fire'], [66, 'water']]) { c.ellipse(x, 30, 3, 4, 'glass', { flat: 0.6 }); c.ellipse(x, 31, 2, 2.4, m, { flat: 0.7 }); }
      c.rect(16, 70, 48, 4, 'wood', { flat: 0.55 });
      c.rect(18, 74, 3, 16, 'wood', { flat: 0.45 });
      c.rect(59, 74, 3, 16, 'wood', { flat: 0.45 });
    }] });
    K.burst(cv, 40, 58, 14, 'poison');
    cv.figure();
    for (const [x, y, r] of [[28, 44, 5], [52, 40, 6], [40, 34, 4], [20, 56, 3], [62, 54, 4]]) cv.ellipse(x, y, r, r * 0.8, 'poison', { flat: 0.55 });
    for (const [x, y] of [[30, 50], [52, 52], [46, 46]]) cv.poly([[x, y], [x + 3, y - 2], [x + 2, y + 2]], 'glass', { flat: 0.8 });
    fig(cv, { x: 66, f: 1, s: 0.55, jump: 8, lean: 50, skin: 'skinRed', body: 'robeWhite', arm: 'robeWhite', legs: 'black', glove: 'skinRed', horns: 'black', eyes: 'closed',
      mouth: 'open', tail: 'skinRed', aF: [150, 0], aB: [170, 0], lF: [-30, 40], lB: [-60, 40] });
  };

  ART.BMR023 = (cv) => {
    // Haunted Library: a ghostly librarian sends the books whirling.
    K.room(cv, { wall: 'plank', wallMat: 'wood', floorMat: 'floor', props: [(c) => {
      for (const y of [12, 32, 52, 72]) {
        c.rect(0, y + 14, 80, 3, 'wood', { flat: 0.6 });
        for (let x = 1; x < 80; x += 4) c.rect(x, y + 4, 3, 10, ['robeRed', 'robeBlue', 'robeGreen', 'gold'][(x * 7 + y) % 4], { flat: 0.45 });
      }
    }] });
    cv.figure();
    for (let k = 0; k < 9; k++) {
      const a = k * 40, r = 18 + (k % 3) * 6;
      const x = 40 + Math.cos(a * D) * r, y = 52 + Math.sin(a * D) * r * 0.7;
      cv.poly([[x - 4, y - 2], [x, y - 4], [x + 4, y - 2], [x + 4, y + 3], [x, y + 1], [x - 4, y + 3]], ['robeRed', 'robeBlue', 'robeGreen'][k % 3], { flat: 0.6 });
      cv.line(Math.round(x - 3), Math.round(y - 1), Math.round(x + 3), Math.round(y - 1), 'white', 0.9);
    }
    fig(cv, { x: 40, jump: 18, f: 1, s: 0.8, skin: 'ghost', body: 'ghost', arm: 'ghost', glove: 'ghost', headType: 'ghost', noLegs: true, noBelt: true, aF: [160, -20], aB: [150, 30] });
    cv.poly([[32, 76], [48, 76], [52, 96], [44, 90], [40, 98], [36, 90], [28, 96]], 'ghost', { flat: 0.6 });
  };

  ART.BMR024 = (cv) => {
    // Witch's Kitchen: a witch stirs a boiling cauldron as ingredients fly.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', light: [[44, 84, 34, 0.5]], props: [(c) => {
      for (const x of [10, 62]) c.rect(x, 8, 3, 18, 'herb' in {} ? 'leaf' : 'leaf', { flat: 0.5 });
    }] });
    cv.figure();
    cv.ellipse(46, 90, 16, 12, 'black', { round: 0.8 });
    cv.ellipse(46, 80, 15, 4, 'poison', { flat: 0.75 });
    for (const [x, y, r] of [[40, 74, 3], [50, 70, 4], [46, 62, 2.5], [56, 66, 2]]) cv.ellipse(x, y, r, r, 'poison', { flat: 0.6 });
    K.flame(cv, 40, 104, 3);
    K.flame(cv, 52, 104, 3);
    fig(cv, { x: 20, f: 1, s: 0.86, skin: 'skinGob', body: 'robePurple', arm: 'robePurple', legs: 'black', boot: 'black', glove: 'skinGob', hat: 'wizard', hatMat: 'black',
      hair: 'long', hairMat: 'hairWhite', mouth: 'grin', eyeMat: 'eyeGold', aF: [110, -10], aB: [150, -20], lean: 14, wF: { type: 'staff', orb: 'bone', len: 26, rot: 0 } });
    bones(cv, [[62, 40, 0.5]]);
    cv.ellipse(30, 40, 3, 3, 'white', { flat: 0.9 });
    cv.px(31, 40, 'eyeBlue', 0.5);
  };

  ART.BMR025 = (cv) => {
    // All-Seeing Eye: a great eye in the wall burns a beam into the floor.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor' });
    cv.figure();
    cv.ellipse(40, 30, 22, 14, 'flesh', { round: 0.7 });
    cv.ellipse(40, 30, 16, 11, 'white', { round: 0.6 });
    cv.ellipse(40, 31, 8, 8, 'eyeRed', { round: 0.6 });
    cv.ellipse(40, 31, 3.5, 6, 'void', { flat: 0 });
    cv.px(37, 27, 'white', 1);
    for (const k of [-1, 1]) cv.arc(40, 30 + k * 10, 20, 22, k > 0 ? 200 : 20, k > 0 ? 340 : 160, 'flesh', { flat: 0.4 });
    for (let k = 0; k < 4; k++) cv.capsule(40 + k - 2, 40, 54 + k - 2, 96, 2, 3, 'eyeRed', { bias: 0.4 });
    K.burst(cv, 55, 98, 9, 'fire');
    victim(cv, { x: 24, f: -1, lean: 30, aF: [150, 20], aB: [120, 30], lF: [50, -60], lB: [-40, -20] });
  };

  ART.BMR026 = (cv) => {
    // Liger's Den: the liger pounces, claws out.
    K.room(cv, { wall: 'rock', wallMat: 'rock', floorMat: 'dirt', floor: 'plain', seed: 26, props: [(c) => {
      for (let k = 0; k < 5; k++) c.capsule(6 + k * 16, 0, 10 + k * 16, 24, 3, 2, 'leaf');
    }] });
    beast(cv, { x: 40, f: 1, pose: 'pounce', s: 1.05, body: 'mane', belly: 'furLight', mane: 'hairBrown', muzzle: 'furLight', stripes: 'hairBrown', claws: true, tail: 'mane', eyeMat: 'eyeGreen' });
    K.dust(cv, 22, 104, 3);
  };

  ART.BMR027 = (cv) => {
    // Bottomless Pit: the floor gives way and a hero tumbles into darkness.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor' });
    cv.scene();
    cv.ellipse(40, 102, 30, 11, 'void', { flat: 0 });
    cv.ellipse(40, 98, 30, 4, 'floor', { bias: -0.2, clip: (x, y) => y < 95 });
    for (const [x, y] of [[14, 88], [62, 84], [50, 78]]) cv.poly([[x, y], [x + 4, y - 2], [x + 5, y + 3], [x + 1, y + 4]], 'floor', { flat: 0.55 });
    victim(cv, { x: 40, jump: 4, f: 1, lean: -12, s: 0.82, aF: [170, -50], aB: [160, 50], lF: [60, -80], lB: [-30, -40], eyes: 'big', mouth: 'roar', brows: 'worried' });
    for (const x of [24, 56]) K.speed(cv, x, 40, 1, 1, 12, 'dust');
    K.dust(cv, 40, 96, 3);
  };

  ART.BMR028 = (cv) => {
    // Boulder Ramp: a hero sprints for the exit with the boulder right behind.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', props: [(c) => {
      c.poly([[44, 20], [80, 10], [80, 40], [52, 50]], 'stone', { flat: 0.4 });
    }] });
    victim(cv, { x: 24, f: -1, lean: 30, s: 0.78, aF: [-60, 80], aB: [70, 30], lF: [60, -70], lB: [-50, -30], eyes: 'big', brows: 'worried' });
    K.speed(cv, 34, 70, -1, 3, 8, 'dust');
    cv.figure();
    cv.ellipse(58, 72, 20, 20, 'rock', { round: 0.95 });
    for (const [x, y] of [[50, 62], [64, 78], [58, 66], [68, 64]]) cv.px(x, y, 'rock', 0.1);
    K.dust(cv, 58, 96, 3);
  };

  ART.BMR029 = (cv) => {
    // Dizzygas Hallway: green gas and a hero reeling with spinning eyes.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', light: [[40, 60, 40, 0.15]] });
    cv.figure();
    for (let k = 0; k < 9; k++) cv.ellipse(8 + (k * 17) % 70, 30 + (k * 23) % 60, 9, 6, 'poison', { flat: 0.45, round: 0.6 });
    victim(cv, { x: 40, f: 1, lean: -24, s: 0.88, eyes: 'spiral', mouth: 'open', aF: [140, -60], aB: [60, 60], lF: [40, -10], lB: [20, 30] });
    for (const [x, y] of [[30, 40], [50, 36], [40, 32]]) K.sparkle(cv, x, y, 2, 'holy');
  };

  ART.BMR030 = (cv) => {
    // Jackpot Stash: the chest blows open in a fountain of gold.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', light: [[40, 70, 40, 0.5]] });
    cv.figure();
    cv.rect(24, 76, 32, 20, 'wood', { flat: 0.5 });
    cv.rect(24, 82, 32, 3, 'gold', { flat: 0.7 });
    cv.poly([[22, 76], [58, 76], [62, 58], [26, 60]], 'wood', { flat: 0.6 });
    cv.ellipse(40, 76, 14, 4, 'gold', { flat: 0.85 });
    K.coins(cv, [[30, 50], [44, 40], [52, 54], [36, 30], [58, 36], [22, 40], [48, 22], [64, 48], [16, 58], [40, 60]]);
    for (const [x, y, m] of [[34, 44, 'gem'], [56, 26, 'eyeGlow'], [26, 30, 'slime']]) { cv.poly([[x, y - 3], [x + 3, y], [x, y + 3], [x - 3, y]], m, { flat: 0.8 }); }
    K.sparkle(cv, 46, 32, 3, 'holy');
    K.sparkle(cv, 20, 48, 2, 'holy');
  };

  ART.BMR031 = (cv) => {
    // Recycling Center: gears grind and a claw drops scrap into the crusher.
    K.room(cv, { wall: 'tile', wallMat: 'steel', floorMat: 'floor' });
    cv.figure();
    for (const [x, y, r] of [[16, 30, 13], [36, 18, 8], [64, 42, 11]]) {
      cv.ellipse(x, y, r, r, 'copper', { round: 0.6 });
      for (let k = 0; k < 8; k++) cv.ellipse(x + Math.cos(k * 45 * D) * r, y + Math.sin(k * 45 * D) * r, 2.6, 2.6, 'copper');
      cv.ellipse(x, y, r * 0.35, r * 0.35, 'steel');
    }
    cv.rect(10, 86, 60, 8, 'steel', { flat: 0.45 });
    for (let x = 12; x < 70; x += 6) cv.ellipse(x, 94, 2.6, 2.6, 'black');
    cv.capsule(50, 0, 50, 54, 2, 2, 'steel');
    cv.poly([[44, 54], [56, 54], [60, 62], [40, 62]], 'steel', { flat: 0.6 });
    for (const [x, y] of [[44, 72], [52, 76], [36, 80]]) cv.poly([[x, y], [x + 5, y - 2], [x + 6, y + 3], [x, y + 4]], 'rust', { flat: 0.6 });
    K.burst(cv, 30, 84, 6, 'fire');
  };

  ART.BMR032 = (cv) => {
    // The Crushinator: the press slams down and a hero dives clear.
    K.room(cv, { wall: 'tile', wallMat: 'steel', floorMat: 'floor' });
    cv.figure();
    for (const x of [26, 52]) cv.rect(x, 0, 4, 60, 'steel', { flat: 0.55 });
    cv.rect(18, 54, 44, 18, 'black', { flat: 0.45 });
    for (let x = 20; x < 62; x += 6) cv.poly([[x, 72], [x + 3, 80], [x + 6, 72]], 'steel', { flat: 0.7 });
    K.burst(cv, 40, 90, 12, 'fire');
    for (const [x, y] of [[22, 92], [58, 94], [30, 86], [52, 84]]) K.sparkle(cv, x, y, 2, 'fire');
    victim(cv, { x: 66, f: 1, jump: 10, lean: 70, s: 0.66, aF: [120, 0], aB: [140, 0], lF: [-40, 30], lB: [-70, 30], eyes: 'closed' });
  };

  ART.BMR033 = (cv) => {
    // Centipede Tunnel: a giant centipede rears out of the wall.
    K.room(cv, { wall: 'rock', wallMat: 'rock', floorMat: 'dirt', floor: 'plain', seed: 33 });
    cv.scene();
    cv.ellipse(20, 60, 16, 20, 'void', { flat: 0 });
    cv.figure();
    let p = [16, 70];
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const q = [p[0] + 6, p[1] - 6 + k * 0.4 - (k > 4 ? -4 : 0)];
      pts.push(q);
      p = q;
    }
    pts.forEach((q, k) => {
      for (const sgn of [-1, 1]) cv.capsule(q[0], q[1], q[0] + sgn * 2, q[1] + 8, 0.9, 0.7, 'black');
      cv.ellipse(q[0], q[1], 6 - k * 0.2, 5, k % 2 ? 'rust' : 'copper', { round: 0.8 });
    });
    const h = pts[pts.length - 1];
    cv.ellipse(h[0] + 4, h[1] - 3, 6, 5, 'rust', { round: 0.8 });
    cv.px(h[0] + 6, h[1] - 5, 'eyeGold', 1);
    cv.capsule(h[0] + 8, h[1], h[0] + 12, h[1] + 5, 1, 0.5, 'bone');
    cv.capsule(h[0] + 6, h[1] + 1, h[0] + 9, h[1] + 7, 1, 0.5, 'bone');
    cv.capsule(h[0], h[1] - 6, h[0] - 4, h[1] - 14, 0.8, 0.5, 'rust');
    for (const [x, y] of [[18, 46], [30, 42], [12, 80]]) cv.ellipse(x, y, 2.4, 2, 'rock', { flat: 0.6 });
  };

  ART.BMR034 = (cv) => {
    // Construction Zone: kobolds hammer, haul and hoist on the scaffold.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'dirt', floor: 'plain', props: [(c) => {
      for (const x of [6, 40, 74]) c.rect(x, 20, 2, 70, 'wood', { flat: 0.55 });
      c.rect(4, 44, 74, 3, 'wood', { flat: 0.6 });
    }] });
    const kob = { skin: 'skinRed', body: 'yellow', arm: 'skinRed', legs: 'leather', boot: 'leather', glove: 'skinRed', headType: 'beast', muzzle: 'skinRed', eyeMat: 'eyeGold', tail: 'skinRed', s: 0.56 };
    fig(cv, { ...kob, x: 24, ground: 44, f: 1, helm: null, hat: 'cap', hatMat: 'yellow', aF: [170, 30], aB: [60, 20], lean: 10, wF: { type: 'hammer', len: 14 } });
    K.burst(cv, 34, 30, 5, 'holy');
    fig(cv, { ...kob, x: 22, f: 1, lean: 20, hat: 'cap', hatMat: 'yellow', aF: [120, -30], aB: [130, -30], lF: [40, -40], lB: [-30, 10] });
    cv.figure();
    cv.rect(10, 58, 34, 4, 'wood', { flat: 0.6 });
    fig(cv, { ...kob, x: 58, f: -1, lean: -20, hat: 'cap', hatMat: 'yellow', mouth: 'open', aF: [175, 0], aB: [160, 20], lF: [20, -10], lB: [-20, 0] });
    K.dust(cv, 50, 104, 2);
  };

  ART.BMR035 = (cv) => {
    // Dragon Hatchery: a hatchling bursts from its egg breathing its first flame.
    K.room(cv, { wall: 'rock', wallMat: 'rock', floorMat: 'sand', floor: 'plain', seed: 35, light: [[40, 80, 30, 0.35]] });
    cv.scene();
    for (const [x, y, m] of [[12, 92, 'teal'], [68, 94, 'purple'], [60, 82, 'yellow']]) cv.ellipse(x, y, 6, 8, m, { round: 0.8 });
    const J = fig(cv, { x: 36, f: 1, s: 0.8, jump: 6, skin: 'scale', body: 'scale', arm: 'scale', legs: 'scale', boot: 'scale', glove: 'scale', headType: 'beast', muzzle: 'furLight',
      horns: 'bone', wings: 'scale', tail: 'scale', mouth: 'roar', eyeMat: 'eyeGold', belly: true, aF: [140, -20], aB: [120, 20], lF: [40, -40], lB: [-20, 10], head: -15 });
    cv.figure();
    cv.poly([[20, 100], [24, 86], [30, 92], [36, 84], [42, 92], [48, 86], [54, 100], [48, 108], [26, 108]], 'robeWhite', { flat: 0.6, grad: 0.2 });
    K.fireball(cv, J.head[0] + 22, J.head[1] - 6, 5, 70, 1);
    for (const [x, y] of [[14, 70], [60, 104]]) cv.poly([[x, y], [x + 4, y - 3], [x + 5, y + 2]], 'robeWhite', { flat: 0.6 });
  };

  ART.BMR036 = (cv) => {
    // Mimic Vault: the treasure chest lunges, tongue out, at a reaching thief.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', torches: [40] });
    K.coins(cv, [[12, 100], [18, 104], [66, 102]]);
    cv.figure();
    cv.rect(36, 74, 30, 20, 'wood', { flat: 0.5 });
    cv.rect(36, 80, 30, 3, 'gold', { flat: 0.7 });
    cv.poly([[34, 72], [66, 74], [62, 48], [38, 54]], 'wood', { flat: 0.6 });
    for (let k = 0; k < 6; k++) { cv.poly([[38 + k * 5, 72], [40 + k * 5, 66], [42 + k * 5, 72]], 'white', { flat: 1 }); cv.poly([[38 + k * 4, 56], [40 + k * 4, 62], [42 + k * 4, 56]], 'white', { flat: 1 }); }
    cv.capsule(44, 70, 26, 74, 3, 2, 'flesh');
    cv.ellipse(46, 62, 3, 2.4, 'eyeGold', { flat: 0.8 });
    cv.px(46, 62, 'void', 0);
    fig(cv, { x: 18, f: 1, s: 0.66, lean: -30, skin: 'skinPeach', body: 'cloak', arm: 'cloak', legs: 'black', boot: 'leather', hood: true, hoodMat: 'cloak', mouth: 'open',
      brows: 'worried', aF: [110, 20], aB: [150, 20], lF: [30, -20], lB: [-40, 20] });
  };

  ART.BMR037 = (cv) => {
    // Monstrous Monument: a towering statue's eyes ignite and its stone fist swings down.
    K.outdoor(cv, { sky: 'sunset', ground: 'sand', sun: [14, 20], sunMat: 'fire', seed: 37, hills: false });
    cv.scene();
    cv.rect(22, 84, 36, 10, 'stone', { flat: 0.55 });
    fig(cv, { x: 40, ground: 86, f: -1, s: 1, skin: 'stone', body: 'stone', arm: 'stone', legs: 'stone', boot: 'stone', glove: 'stone', headType: 'beast', muzzle: 'stone', horns: 'stone',
      eyeMat: 'fire', mouth: 'roar', aF: [140, 50], aB: [-30, 20], lF: [20, -20], lB: [-15, 10], lean: 10 });
    K.burst(cv, 18, 56, 8, 'fire');
    for (const [x, y] of [[10, 70], [26, 40], [16, 80]]) cv.poly([[x, y], [x + 4, y - 3], [x + 5, y + 2], [x + 1, y + 4]], 'stone', { flat: 0.55 });
  };

  ART.BMR038 = (cv) => {
    // Torture Chamber: a pendulum blade sweeps and the spiked wheel spins.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', torches: [8, 72] });
    cv.figure();
    cv.capsule(40, 0, 26, 56, 1, 1, 'steel');
    cv.arc(26, 62, 2, 12, 30, 150, 'steel', { flat: 0.75 });
    cv.arc(40, 0, 56, 60, 95, 125, 'slash', { flat: 0.9, taper: true });
    cv.ellipse(56, 84, 14, 14, 'wood', { round: 0.6 });
    for (let k = 0; k < 10; k++) cv.poly([[56 + Math.cos(k * 36 * D) * 13, 84 + Math.sin(k * 36 * D) * 13], [56 + Math.cos((k * 36 + 10) * D) * 19, 84 + Math.sin((k * 36 + 10) * D) * 19], [56 + Math.cos((k * 36 + 20) * D) * 13, 84 + Math.sin((k * 36 + 20) * D) * 13]], 'steel', { flat: 0.7 });
    cv.ellipse(56, 84, 4, 4, 'steel');
    cv.arc(56, 84, 22, 24, 200, 300, 'slash', { flat: 0.9, taper: true });
    for (let k = 0; k < 4; k++) cv.capsule(4 + k * 4, 20 + k * 6, 6 + k * 4, 26 + k * 6, 1, 1, 'steel');
  };

  ART.BMR039 = (cv) => {
    // Zombie Prison: zombies tear the bars loose and lurch forward.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', props: [(c) => {
      c.rect(0, 30, 80, 4, 'steel', { flat: 0.55 });
    }] });
    const z = { skin: 'skinGob', body: 'cloth', arm: 'skinGob', legs: 'cloth', boot: 'black', glove: 'skinGob', hair: 'wild', hairMat: 'hairBlack', eyes: 'glow', eyeMat: 'eyeRed', mouth: 'open' };
    fig(cv, { ...z, x: 18, s: 0.6, f: 1, lean: 10, aF: [100, 0], aB: [90, 10], ground: 92 });
    fig(cv, { ...z, x: 62, s: 0.62, f: -1, lean: 14, aF: [95, 10], aB: [100, 0], ground: 92 });
    cv.scene();
    for (let x = 4; x < 80; x += 9) if (x < 30 || x > 52) cv.rect(x, 30, 2, 62, 'steel', { flat: 0.5 });
    cv.figure();
    cv.capsule(30, 34, 22, 70, 1.2, 1.2, 'steel');
    cv.capsule(50, 34, 60, 66, 1.2, 1.2, 'steel');
    fig(cv, { ...z, x: 40, s: 0.92, f: 1, lean: 22, aF: [92, 0], aB: [88, 6], lF: [40, -40], lB: [-30, 10] });
  };

  // ------------------------------------------------------------------ Spells
  const spellBack = (cv, mat, seed) => K.arcane(cv, { mat, seed });

  ART.BMR040 = (cv) => {
    // Annihilator: a spike trap supercharged until the floor erupts.
    spellBack(cv, 'arcane', 40);
    cv.figure();
    cv.rect(10, 84, 60, 8, 'stone', { flat: 0.5 });
    for (let k = 0; k < 7; k++) {
      const h = 18 + (k % 3) * 10;
      cv.poly([[12 + k * 8, 84], [16 + k * 8, 84 - h], [20 + k * 8, 84]], 'steel', { flat: 0.75 });
    }
    K.burst(cv, 40, 54, 22, 'lava');
    K.burst(cv, 40, 54, 12, 'holy');
  };

  ART.BMR041 = (cv) => {
    // Assassin: a hooded assassin drops from above, twin blades drawn.
    spellBack(cv, 'night', 41);
    const J = fig(cv, { x: 40, jump: 26, f: 1, lean: 30, s: 0.92, skin: 'skinPeach', body: 'black', arm: 'black', legs: 'black', boot: 'black', glove: 'black', hood: true, hoodMat: 'black',
      faceShadow: true, eyeMat: 'eyeRed', cape: 'black', capeFly: 60, aF: [70, 50], aB: [160, 20], lF: [70, -100], lB: [10, -70], wF: { type: 'dagger', rot: 30 }, wB: { type: 'dagger', rot: 0 } });
    K.slash(cv, J.tipF[0] - 6, J.tipF[1] - 2, 14, -30, 70);
    K.speed(cv, 30, 20, 1, 3, 10);
  };

  ART.BMR042 = (cv) => {
    // Cave-In: the ceiling gives way on a hero shielding his head.
    K.room(cv, { wall: 'rock', wallMat: 'rock', floorMat: 'floor', seed: 42 });
    victim(cv, { x: 40, f: 1, crouch: 6, s: 0.86, helm: 'open', helmMat: 'steel', aF: [170, -110], aB: [170, 110], lF: [40, -60], lB: [-30, 30], eyes: 'closed', mouth: 'open' });
    cv.figure();
    for (const [x, y, r] of [[30, 20, 7], [52, 12, 9], [18, 44, 5], [62, 40, 6], [44, 32, 4]]) cv.ellipse(x, y, r, r * 0.85, 'rock', { round: 0.8 });
    K.dust(cv, 40, 104, 3);
    K.burst(cv, 40, 46, 6, 'holy');
  };

  ART.BMR043 = (cv) => {
    // Counterspell: a fireball shatters against a hexagonal ward.
    spellBack(cv, 'arcane', 43);
    const J = fig(cv, { x: 22, f: 1, s: 0.82, skin: 'skinPale', body: 'robePurple', arm: 'robePurple', legs: 'black', boot: 'black', hat: 'wizard', hatMat: 'robePurple', hair: 'long',
      hairMat: 'hairWhite', beard: 'hairWhite', eyeMat: 'magic', lean: -10, aF: [95, -10], aB: [150, -10], lF: [30, -20], lB: [-20, 10] });
    cv.figure();
    const cx = J.aF.end[0] + 14, cy = J.aF.end[1];
    for (let k = 0; k < 6; k++) {
      const a1 = k * 60 * D, a2 = (k + 1) * 60 * D;
      cv.capsule(cx + Math.cos(a1) * 6, cy + Math.sin(a1) * 14, cx + Math.cos(a2) * 6, cy + Math.sin(a2) * 14, 1.4, 1.4, 'magic', { bias: 0.3 });
    }
    K.burst(cv, cx + 10, cy, 10, 'fire');
    for (const [x, y] of [[cx + 18, cy - 10], [cx + 20, cy + 8], [cx + 14, cy - 16]]) K.flame(cv, x, y, 2);
  };

  ART.BMR044 = (cv) => {
    // Exhaustion: a hero drops to one knee, sword dragging, gasping.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor', torches: [12, 68] });
    victim(cv, { x: 40, f: 1, crouch: 10, lean: 40, s: 0.92, helm: 'open', eyes: 'closed', mouth: 'open', aF: [30, 20], aB: [-10, 0], lF: [80, -110], lB: [-20, -80],
      wF: { type: 'sword', rot: -20 } });
    cv.figure();
    for (const [x, y] of [[56, 34], [60, 42], [24, 36]]) cv.ellipse(x, y, 1.6, 2.4, 'water', { flat: 0.85 });
  };

  ART.BMR045 = (cv) => {
    // Fear: a hero bolts away screaming from shadowy claws.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor' });
    cv.figure();
    for (let k = 0; k < 4; k++) {
      const y = 30 + k * 14;
      cv.capsule(80, y, 56 - k * 2, y - 4, 4, 2, 'black');
      for (let j = 0; j < 3; j++) cv.capsule(56 - k * 2, y - 4, 50 - k * 2, y - 8 + j * 4, 1.2, 0.5, 'black');
    }
    victim(cv, { x: 30, f: -1, lean: 30, s: 0.86, eyes: 'big', mouth: 'roar', brows: 'worried', head: -30, aF: [130, 40], aB: [160, -20], lF: [60, -70], lB: [-50, -40] });
    K.speed(cv, 44, 62, -1, 3, 10);
    for (const [x, y] of [[20, 40], [16, 46]]) cv.ellipse(x, y, 1.4, 2.2, 'water', { flat: 0.85 });
  };

  ART.BMR046 = (cv) => {
    // Freeze: a leaping monster locked in a block of ice.
    spellBack(cv, 'night', 46);
    cv.scene();
    cv.poly([[14, 30], [40, 14], [66, 26], [70, 96], [44, 104], [12, 92]], 'ice', { flat: 0.35 });
    const ice = { skin: 'ice', body: 'ice', arm: 'ice', legs: 'ice', boot: 'ice', glove: 'ice' };
    fig(cv, { x: 40, jump: 10, f: 1, lean: 20, s: 0.86, ...ice, ears: 'big', mouth: 'roar', eyeMat: 'white', aF: [130, 20], aB: [-40, 30], lF: [60, -70], lB: [-30, -30], wF: { type: 'club', mat: 'ice' } });
    cv.figure();
    for (const [x, y] of [[20, 40], [58, 34], [64, 80], [24, 88]]) cv.poly([[x, y - 5], [x + 3, y], [x, y + 5], [x - 3, y]], 'ice', { flat: 0.9 });
    for (const [x1, y1, x2, y2] of [[14, 30, 40, 14], [40, 14, 66, 26], [66, 26, 70, 96], [12, 92, 14, 30], [18, 36, 30, 22], [60, 30, 66, 46], [16, 80, 22, 92]]) cv.line(x1, y1, x2, y2, 'white', 1);
    for (const [x, y] of [[8, 20], [72, 18], [74, 60], [6, 70]]) K.sparkle(cv, x, y, 2, 'ice');
  };

  ART.BMR047 = (cv) => {
    // Giant Size: a goblin swells to fill the room, horns scraping the ceiling.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor' });
    fig(cv, { x: 40, f: 1, s: 1.32, ground: 112, skin: 'skinGob', body: 'leather', arm: 'skinGob', legs: 'leather', glove: 'skinGob', ears: 'big', horns: 'bone', mouth: 'roar',
      brows: 'angry', eyeMat: 'eyeRed', aF: [150, 30], aB: [140, -20], lF: [25, -10], lB: [-20, 0] });
    for (const [x, y] of [[10, 20], [70, 18], [8, 60], [72, 70], [40, 6]]) K.sparkle(cv, x, y, 3, 'holy');
    for (let k = 0; k < 4; k++) cv.arc(40, 60, 34 + k * 3, 35 + k * 3, 200 + k * 20, 230 + k * 20, 'holy', { flat: 0.9 });
  };

  ART.BMR048 = (cv) => {
    // Jeopardy: every hand of cards whirls up into a storm.
    spellBack(cv, 'arcane', 48);
    cv.figure();
    for (let k = 0; k < 14; k++) {
      const a = k * 50, r = 8 + k * 2.2;
      const x = 40 + Math.cos(a * D) * r, y = 54 + Math.sin(a * D) * r * 0.8;
      const w = 5, h = 7;
      const ca = Math.cos((a + 30) * D), sa = Math.sin((a + 30) * D);
      const pts = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([dx, dy]) => [x + dx * ca - dy * sa, y + dx * sa + dy * ca]);
      cv.poly(pts, k % 2 ? 'cape' : 'robeRed', { flat: 0.55 });
      cv.px(x, y, 'gold', 0.9);
    }
    for (let k = 0; k < 3; k++) cv.arc(40, 54, 26 + k * 6, 27 + k * 6, k * 60, k * 60 + 140, 'magic', { flat: 0.85, taper: true });
  };

  ART.BMR049 = (cv) => {
    // Kobold Strike: kobolds march with blank placards and raised tools.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'dirt', floor: 'plain' });
    const kob = { skin: 'skinRed', body: 'yellow', arm: 'skinRed', legs: 'leather', boot: 'leather', glove: 'skinRed', headType: 'beast', muzzle: 'skinRed', eyeMat: 'eyeGold',
      tail: 'skinRed', hat: 'cap', hatMat: 'yellow', mouth: 'roar', brows: 'angry' };
    const signs = [];
    for (const [x, s, ff, step] of [[18, 0.55, 1, 1], [42, 0.66, 1, -1], [64, 0.55, -1, 1]]) {
      const J = fig(cv, { ...kob, x, s, f: ff, aF: [170, 0], aB: [60, 40], lF: [step * 30, -20], lB: [-step * 25, 10], lean: 6 });
      signs.push(J.aF.end);
    }
    cv.figure();
    for (const [x, y] of signs) {
      cv.capsule(x, y + 4, x, y - 12, 1, 1, 'wood');
      cv.rect(x - 8, y - 24, 16, 12, 'robeWhite', { flat: 0.7 });
      cv.line(Math.round(x - 6), Math.round(y - 20), Math.round(x + 5), Math.round(y - 16), 'robeRed', 0.6);
      cv.line(Math.round(x - 6), Math.round(y - 16), Math.round(x + 5), Math.round(y - 20), 'robeRed', 0.6);
    }
  };

  ART.BMR050 = (cv) => {
    // Motivation: an imp foreman leaps, fist up, rallying the workers.
    spellBack(cv, 'sunset', 50);
    const J = fig(cv, { x: 40, jump: 16, f: 1, s: 0.95, skin: 'skinRed', body: 'yellow', arm: 'skinRed', legs: 'leather', boot: 'black', glove: 'skinRed', horns: 'black', wings: 'black',
      tail: 'skinRed', mouth: 'open', eyes: 'happy', aF: [178, 0], aB: [80, 60], lF: [60, -90], lB: [-30, -60] });
    K.burst(cv, J.aF.end[0], J.aF.end[1] - 6, 10, 'holy');
    for (const [x, y] of [[14, 30], [66, 40], [20, 70]]) K.sparkle(cv, x, y, 3, 'holy');
  };

  ART.BMR051 = (cv) => {
    // Princess in Peril: a bat-winged imp carries off a princess calling for help.
    K.outdoor(cv, { sky: 'sky', ground: 'grass', castle: 52, clouds: [[8, 18], [56, 10]], seed: 51 });
    const P = fig(cv, { x: 30, jump: 40, f: 1, s: 0.6, lean: -20, skin: 'skinPeach', body: 'silk', arm: 'skinPeach', legs: 'silk', boot: 'silk', glove: 'skinPeach', hair: 'long',
      hairMat: 'hairBlonde', crown: 'gold', mouth: 'open', brows: 'worried', aF: [150, -10], aB: [-60, 30], lF: [30, 40], lB: [-20, 50] });
    fig(cv, { x: 40, jump: 58, f: -1, s: 0.55, skin: 'skinPurple', body: 'black', arm: 'skinPurple', legs: 'black', glove: 'skinPurple', horns: 'black', wings: 'black', tail: 'skinPurple',
      mouth: 'grin', eyeMat: 'eyeRed', aF: [10, 30], aB: [20, 20], lF: [30, 30], lB: [0, 30] });
    cv.figure();
    cv.capsule(P.top[0], P.top[1], 38, 46, 1, 1, 'skinPurple');
  };

  ART.BMR052 = (cv) => {
    // Soul Harvest: a reaper sweeps its scythe and gathers glowing souls.
    spellBack(cv, 'night', 52);
    const J = fig(cv, { x: 34, f: 1, s: 0.96, skin: 'bone', body: 'black', arm: 'black', legs: 'black', boot: 'black', glove: 'bone', hood: true, hoodMat: 'black', faceShadow: true,
      eyeMat: 'eyeGlow', noLegs: true, aF: [130, 30], aB: [60, 40], lean: 16, wF: { type: 'scythe', rot: -60 } });
    cv.figure();
    cv.poly([[24, 70], [44, 70], [52, 104], [16, 104]], 'black', { flat: 0.4, grad: 0.3 });
    K.slash(cv, J.tipF[0] - 4, J.tipF[1] + 10, 22, -120, 0, 'eyeGlow');
    for (const [x, y] of [[60, 70], [66, 52], [56, 88], [70, 82]]) {
      cv.ellipse(x, y, 3, 3, 'eyeGlow', { flat: 0.95 });
      cv.capsule(x, y + 2, x + 3, y + 8, 2, 0.5, 'eyeGlow', { flat: 0.7 });
      cv.light(x, y, 10, 0.3);
    }
  };

  ART.BMR053 = (cv) => {
    // Teleportation: a hero mid-stride vanishes into a swirling portal.
    K.room(cv, { wall: 'brick', wallMat: 'stone', floorMat: 'floor' });
    cv.figure();
    for (let k = 0; k < 4; k++) cv.arc(54, 60, 6 + k * 5, 9 + k * 5, k * 70, k * 70 + 250, 'magic', { flat: 0.9 - k * 0.12 });
    cv.light(54, 60, 30, 0.6);
    victim(cv, { x: 32, f: 1, lean: 20, s: 0.8, eyes: 'big', mouth: 'open', aF: [110, -10], aB: [-50, 30], lF: [50, -40], lB: [-40, 10] });
    for (const [x, y] of [[44, 40], [62, 36], [40, 80], [66, 84]]) K.sparkle(cv, x, y, 2, 'magic');
  };

  ART.BMR054 = (cv) => {
    // Trepidation: a hero freezes at the dungeon door, knees knocking, as eyes glare from the dark.
    K.outdoor(cv, { sky: 'night', ground: 'grass', hills: false, seed: 54 });
    cv.scene();
    cv.poly([[30, 84], [30, 30], [40, 20], [50, 30], [50, 84]], 'void', { flat: 0 });
    cv.poly([[20, 84], [20, 26], [40, 8], [60, 26], [60, 84], [54, 84], [54, 30], [40, 16], [26, 30], [26, 84]], 'stone', { flat: 0.5 });
    for (const [x, y] of [[36, 44], [44, 44]]) cv.ellipse(x, y, 2, 1.4, 'eyeRed', { flat: 1 });
    cv.light(40, 44, 10, 0.3);
    victim(cv, { x: 40, f: -1, s: 0.86, crouch: 4, eyes: 'big', mouth: 'open', brows: 'worried', aF: [60, 70], aB: [50, 80], lF: [20, 30], lB: [-20, 30], lean: -10 });
    cv.figure();
    for (const [x, y] of [[28, 92], [52, 92]]) cv.line(x - 2, y, x + 2, y, 'white', 1);
    for (const [x, y] of [[24, 54], [56, 54]]) cv.ellipse(x, y, 1.4, 2.2, 'water', { flat: 0.85 });
  };

  ART.BMR055 = (cv) => {
    // Zombie Attack: a dead hero claws back up out of the grave, raging.
    K.outdoor(cv, { sky: 'night', ground: 'dirt', sun: [16, 16], seed: 55 });
    cv.scene();
    cv.rect(52, 58, 10, 26, 'stone', { flat: 0.5 });
    cv.ellipse(57, 58, 5, 5, 'stone', { flat: 0.55 });
    fig(cv, { x: 36, f: 1, ground: 112, s: 0.96, skin: 'skinGob', body: 'steel', arm: 'skinGob', legs: 'cloth', glove: 'skinGob', hair: 'wild', hairMat: 'hairBrown', eyes: 'glow',
      eyeMat: 'eyeRed', mouth: 'roar', noLegs: true, lean: 20, aF: [140, -10], aB: [110, 20] });
    cv.figure();
    for (const [x, y] of [[20, 96], [52, 98], [30, 88], [48, 86]]) cv.ellipse(x, y, 2.4, 2, 'dirt', { flat: 0.6 });
    cv.ellipse(36, 104, 22, 6, 'dirt', { bias: -0.1 });
  };
})();
