// The art kit (PLAN D15): a posable MGSD figure rig, heads, hair, weapons, effects and scenes for
// the pixel renderer. Angles are degrees: 0 points down, 90 points the way the figure faces, 180
// points up. Every card's plate in js/ui/cardart.js is composed from these parts.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;
  const K = (ui.artkit = {});
  const R = Math.PI / 180;
  K.W = 80;
  K.H = 112;

  /** p moved len along angle a for facing f. */
  const at = (K.at = (p, a, f, len) => [p[0] + Math.sin(a * R) * f * len, p[1] + Math.cos(a * R) * len]);
  K.shade = (cv, x, y, d) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
    const i = y * cv.w + x;
    cv.s[i] = Math.max(0, Math.min(1, cv.s[i] + d));
  };
  const rnd = (K.rnd = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });

  // ------------------------------------------------------------------ the figure rig
  /**
   * o: { x, ground, f (1 right / -1 left), s (scale), jump, crouch, lean, head (tilt),
   *   aF / aB: [shoulder, elbow] front and back arm, lF / lB: [hip, knee],
   *   skin, body (torso), arm (sleeves), legs, boot, glove, trim, cape, capeFly,
   *   headType, hair, hairMat, eyes, eyeMat, mouth, brows, ears, helm, crown, horns, beard,
   *   pauldrons, belly, torsoW, wF / wB: { type, rot, len, mat }, wings, tail, noLegs, ghost }
   * Returns the joint positions so callers can add effects at hands and weapon tips.
   */
  K.figure = (cv, o) => {
    cv.figure();
    const f = o.f ?? 1;
    const s = o.s ?? 1;
    const P = { hx: 14 * s, hy: 13 * s, torso: 18 * s, tw: (o.torsoW ?? 21) * s, up: 8.5 * s, fore: 8 * s, thigh: 7.5 * s, shin: 7.5 * s, limb: 3.7 * s, foot: 5.8 * s };
    const ground = o.ground ?? 104;
    const lean = o.lean ?? 0;
    const hip = [o.x ?? 40, ground - (P.thigh + P.shin) - P.foot * 0.55 - (o.jump || 0) + (o.crouch || 0)];
    const top = at(hip, 180 - lean, f, P.torso);
    const perp = (p, k) => at(p, 90 - lean, f, k);
    const head = at(top, 180 - lean - (o.head ?? 0), f, P.hy * 0.92);
    const shF = perp([top[0], top[1] + 3 * s], P.tw * 0.4);
    const shB = perp([top[0], top[1] + 3 * s], -P.tw * 0.4);
    const hpF = perp(hip, 4.2 * s);
    const hpB = perp(hip, -4.2 * s);
    const m = {
      skin: o.skin || 'skinPeach', body: o.body || 'armor', arm: o.arm || o.body || 'armor', legs: o.legs || 'cloth',
      boot: o.boot || 'leather', glove: o.glove || o.arm || o.body || 'armor', trim: o.trim || 'gold',
    };
    const J = { f, s, hip, top, head, P };
    const limb = (from, [a, e], len1, len2, mat, r1, r2) => {
      const mid = at(from, a, f, len1);
      const end = at(mid, a + e, f, len2);
      cv.capsule(from[0], from[1], mid[0], mid[1], r1, r1 * 0.92, mat);
      cv.capsule(mid[0], mid[1], end[0], end[1], r1 * 0.92, r2, mat);
      return { mid, end, dir: a + e };
    };
    const leg = (hp, ang, side) => {
      if (o.noLegs) return null;
      const L = limb(hp, ang, P.thigh, P.shin, m.legs, P.limb * 1.05, P.limb);
      const ft = L.end;
      const toe = at(ft, 90, f, 2.4 * s);
      cv.ellipse(toe[0], ft[1] + 1.2 * s, P.foot, P.foot * 0.62, m.boot, { bias: side === 'B' ? -0.08 : 0.04 });
      cv.line(toe[0] - P.foot, Math.round(ft[1] + 1.2 * s + P.foot * 0.55), toe[0] + P.foot, Math.round(ft[1] + 1.2 * s + P.foot * 0.55), m.boot, 0);
      return L;
    };
    const arm = (sh, ang, side) => {
      const L = limb(sh, ang, P.up, P.fore, m.arm, P.limb, P.limb * 0.95);
      cv.ellipse(L.end[0], L.end[1], 4.4 * s, 4 * s, m.glove, { bias: side === 'B' ? -0.06 : 0.02 });
      return L;
    };

    if (o.wings) K.wings(cv, top, f, s, o.wings);
    if (o.tail) K.tail(cv, hip, f, s, o.tail);
    J.lB = leg(hpB, o.lB || [-8, 4], 'B');
    J.aB = arm(shB, o.aB || [-15, 20], 'B');
    if (o.wB) J.tipB = K.weapon(cv, J.aB.end, J.aB.dir + (o.wB.rot ?? 0), f, s, o.wB);
    if (o.pauldrons) cv.ellipse(shB[0], shB[1], 7 * s, 6 * s, m.body, { bias: -0.06 });
    if (o.cape) {
      // Hangs from both shoulders and streams behind the figure; capeFly tilts it back.
      const fly = o.capeFly ?? 20;
      const len = P.torso + P.thigh + P.shin;
      const tipBack = at(shB, -(15 + fly), f, len * 0.95);
      const tipMid = at(hip, -(5 + fly * 0.55), f, len * 0.55);
      const tipFront = at(hpF, -(fly * 0.25), f, len * 0.35);
      const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      const hem1 = mix(tipBack, tipMid, 0.5), hem2 = mix(tipMid, tipFront, 0.5);
      const wave = (p, k) => [p[0], p[1] - k * 3 * s];
      cv.poly([shF, shB, at(shB, -(40 + fly), f, 6 * s), tipBack, wave(hem1, 1), tipMid, wave(hem2, 1), tipFront], o.cape, { flat: 0.4, grad: 0.32 });
      if (o.capeLining) {
        const inner = (p) => mix(p, hip, 0.35);
        cv.poly([at(shB, -(40 + fly), f, 4 * s), inner(tipBack), inner(tipMid), mix(shB, hip, 0.5)], o.capeLining, { flat: 0.36, grad: 0.2 });
      }
    }
    // Torso: a tapered block, or a round belly for monsters.
    const c1 = perp(top, P.tw / 2), c2 = perp(top, -P.tw / 2), c3 = perp(hip, -P.tw * 0.38), c4 = perp(hip, P.tw * 0.38);
    if (o.belly) cv.ellipse((top[0] + hip[0]) / 2, (top[1] + hip[1]) / 2 + 2 * s, P.tw * 0.62, P.torso * 0.66, m.body);
    else cv.poly([c1, c2, c3, c4], m.body, { flat: 0.58, grad: 0.3 });
    if (o.chest) o.chest(cv, J, m);
    else if (!o.belly && m.body === 'armor') {
      const y1 = (top[1] * 2 + hip[1]) / 3, y2 = (top[1] + hip[1] * 2) / 3;
      cv.line(Math.round(hip[0] - P.tw * 0.3), Math.round(y2), Math.round(hip[0] + P.tw * 0.3), Math.round(y2), m.body, 0.12);
      cv.line(Math.round(top[0] - P.tw * 0.3), Math.round(y1), Math.round(top[0] + P.tw * 0.3), Math.round(y1), m.trim, 0.7);
    }
    J.lF = leg(hpF, o.lF || [10, -4], 'F');
    if (!o.belly && !o.noBelt) cv.line(Math.round(c3[0]), Math.round(hip[1] - 1), Math.round(c4[0]), Math.round(hip[1] - 1), o.beltMat || 'leather', 0.4);
    // Head.
    K.head(cv, head, f, s, o, m);
    if (o.pauldrons) {
      cv.ellipse(shF[0], shF[1], 7.5 * s, 6.2 * s, m.body);
      cv.ellipse(shF[0], shF[1] + 2.6 * s, 7.5 * s, 3.4 * s, m.trim, { clip: (x, y) => y >= shF[1] + 3 * s });
      cv.px(shF[0] - f * 2, shF[1] - 3 * s, m.body, 1);
    }
    J.aF = arm(shF, o.aF || [20, 20], 'F');
    if (o.wF) J.tipF = K.weapon(cv, J.aF.end, J.aF.dir + (o.wF.rot ?? 0), f, s, o.wF);
    cv.figure();
    return J;
  };

  // ------------------------------------------------------------------ heads
  K.head = (cv, c, f, s, o, m) => {
    const rx = 14 * s * (o.headW ?? 1), ry = 13 * s;
    const hx = (dx) => c[0] + dx * f;
    const type = o.headType || 'human';
    const skin = m.skin;
    if (o.hair === 'long' || o.hair === 'ponytail' || o.hair === 'wild') {
      if (o.hair === 'ponytail') cv.capsule(hx(-rx * 0.6), c[1] - ry * 0.4, hx(-rx * 1.25), c[1] + ry * 0.7, 4 * s, 2.4 * s, o.hairMat || 'hairBrown');
      else cv.ellipse(hx(-rx * 0.25), c[1] + ry * 0.35, rx * 1.05, ry * 1.1, o.hairMat || 'hairBrown', { bias: -0.05 });
    }
    if (o.horns) {
      for (const k of [-1, 1]) {
        const base = [hx(k * rx * 0.5), c[1] - ry * 0.7];
        cv.capsule(base[0], base[1], base[0] + k * f * 5 * s, base[1] - 7 * s, 2.4 * s, 1 * s, o.horns);
        cv.capsule(base[0] + k * f * 5 * s, base[1] - 7 * s, base[0] + k * f * 3 * s, base[1] - 11 * s, 1.2 * s, 0.5 * s, o.horns);
      }
    }
    if (o.ears === 'pointy') cv.poly([[hx(-rx * 0.6), c[1] - 1], [hx(-rx * 1.25), c[1] - ry * 0.7], [hx(-rx * 0.45), c[1] + ry * 0.35]], skin, { flat: 0.5 });
    if (o.ears === 'big') {
      cv.poly([[hx(-rx * 0.55), c[1] - 2], [hx(-rx * 1.7), c[1] - ry * 0.9], [hx(-rx * 1.05), c[1] + 2], [hx(-rx * 0.5), c[1] + ry * 0.4]], skin, { flat: 0.55, grad: 0.2 });
      cv.poly([[hx(rx * 0.55), c[1] - 2], [hx(rx * 1.55), c[1] - ry * 0.85], [hx(rx * 1.0), c[1] + 2], [hx(rx * 0.5), c[1] + ry * 0.4]], skin, { flat: 0.45, grad: 0.2 });
    }
    if (o.ears === 'round') {
      cv.ellipse(hx(-rx * 0.85), c[1] - ry * 0.55, 4.5 * s, 4.5 * s, skin);
      cv.ellipse(hx(rx * 0.85), c[1] - ry * 0.55, 4.5 * s, 4.5 * s, skin);
    }
    if (o.ears === 'floppy') cv.capsule(hx(-rx * 0.7), c[1] - ry * 0.5, hx(-rx * 1.05), c[1] + ry * 0.6, 4 * s, 3.2 * s, o.hairMat || skin);
    const H = K.HEADS[type] || K.HEADS.human;
    H(cv, c, f, s, rx, ry, o, m, hx);
    if (o.crown) {
      const y0 = c[1] - ry * 0.78;
      cv.poly([[hx(-rx * 0.62), y0 + 3 * s], [hx(-rx * 0.62), y0 - 4 * s], [hx(-rx * 0.3), y0], [hx(0), y0 - 6 * s], [hx(rx * 0.3), y0], [hx(rx * 0.62), y0 - 4 * s], [hx(rx * 0.62), y0 + 3 * s]], o.crown, { flat: 0.7 });
      cv.px(hx(0), y0 - 1 * s, 'gem', 0.8);
    }
  };

  /** Eyes in 3/4 view: the near eye toward the facing side, the far eye smaller. */
  K.eyes = (cv, c, f, s, rx, ry, o, hx) => {
    const style = o.eyes || 'big';
    const ey = c[1] + ry * 0.12 + (o.eyeY || 0);
    const mat = o.eyeMat || 'eyeBlue';
    if (style === 'none') return;
    if (style === 'dot') {
      cv.px(hx(rx * 0.32), ey, 'void', 0);
      cv.px(hx(-rx * 0.22), ey, 'void', 0);
      return;
    }
    if (style === 'glow') {
      for (const [dx, w] of [[rx * 0.3, 3], [-rx * 0.25, 2]]) {
        cv.rect(Math.round(hx(dx) - w / 2), Math.round(ey), w, 2, mat, { flat: 0.95, bevel: false });
      }
      cv.light(hx(rx * 0.05), ey, 8, 0.15);
      return;
    }
    if (style === 'closed' || style === 'happy') {
      cv.line(Math.round(hx(rx * 0.18)), Math.round(ey + 2), Math.round(hx(rx * 0.48)), Math.round(ey + (style === 'happy' ? 1 : 2)), 'void', 0);
      cv.line(Math.round(hx(-rx * 0.35)), Math.round(ey + 2), Math.round(hx(-rx * 0.12)), Math.round(ey + (style === 'happy' ? 1 : 2)), 'void', 0);
      return;
    }
    if (style === 'spiral') {
      for (const dx of [rx * 0.32, -rx * 0.24]) {
        const x = Math.round(hx(dx));
        cv.rect(x - 2, Math.round(ey), 4, 4, 'white', { flat: 1, bevel: false });
        cv.px(x - 1, ey + 1, 'void', 0);
        cv.px(x, ey + 2, 'void', 0);
        cv.px(x + 1, ey + 1, 'void', 0);
      }
      return;
    }
    // Big anime eyes.
    const near = [Math.round(hx(rx * 0.32) - 2), Math.round(ey)];
    const far = [Math.round(hx(-rx * 0.24) - 1), Math.round(ey + 0.5)];
    cv.rect(near[0], near[1], 4, 5, 'void', { flat: 0, bevel: false });
    cv.rect(near[0] + 1, near[1] + 1, 2, 4, mat, { flat: 0.7, bevel: false });
    cv.px(near[0] + (f > 0 ? 1 : 2), near[1] + 1, 'white', 1);
    cv.rect(far[0], far[1], 3, 4, 'void', { flat: 0, bevel: false });
    cv.px(far[0] + 1, far[1] + 2, mat, 0.6);
    cv.px(far[0] + 1, far[1] + 1, 'white', 1);
    if (o.brows !== false) {
      const angry = o.brows === 'angry' ? 1 : o.brows === 'worried' ? -1 : 0;
      cv.line(near[0] - 1, near[1] - 2 - angry, near[0] + 4, near[1] - 2 + angry, o.hairMat || 'hairBrown', 0.1);
      cv.line(far[0] - 1, far[1] - 2 + angry, far[0] + 3, far[1] - 2 - angry, o.hairMat || 'hairBrown', 0.1);
    }
  };

  K.mouth = (cv, c, f, s, rx, ry, o, hx, skin) => {
    const mx = Math.round(hx(rx * 0.12)), my = Math.round(c[1] + ry * 0.55);
    const st = o.mouth || 'line';
    if (st === 'open' || st === 'roar') {
      const w = st === 'roar' ? 3 : 2;
      cv.ellipse(mx, my + 1, w, st === 'roar' ? 2.6 : 1.8, 'void', { flat: 0 });
      cv.px(mx, my + 2, 'flesh', 0.6);
      if (st === 'roar') {
        cv.px(mx - 2, my, 'white', 1);
        cv.px(mx + 2, my, 'white', 1);
      }
    } else if (st === 'grin') {
      cv.line(mx - 3, my, mx + 3, my, 'void', 0);
      cv.line(mx - 2, my + 1, mx + 2, my + 1, 'white', 1);
    } else if (st === 'fangs') {
      cv.line(mx - 2, my, mx + 2, my, 'void', 0);
      cv.px(mx - 2, my + 1, 'white', 1);
      cv.px(mx + 2, my + 1, 'white', 1);
    } else if (st === 'smile') {
      cv.px(mx - 2, my, 'void', 0);
      cv.line(mx - 1, my + 1, mx + 1, my + 1, 'void', 0);
      cv.px(mx + 2, my, 'void', 0);
    } else if (st === 'line') cv.line(mx - 1, my, mx + 2, my, skin, 0.05);
  };

  const humanFace = (cv, c, f, s, rx, ry, o, m, hx) => {
    K.eyes(cv, c, f, s, rx, ry, o, hx);
    K.mouth(cv, c, f, s, rx, ry, o, hx, m.skin);
    if (o.beard) {
      cv.ellipse(hx(rx * 0.1), c[1] + ry * 0.62, rx * 0.62, ry * 0.42, o.beard, { clip: (x, y) => y > c[1] + ry * 0.38 });
      K.mouth(cv, c, f, s, rx, ry, { mouth: o.mouth === 'line' ? 'none' : o.mouth }, hx, m.skin);
    }
    if (o.blush) {
      cv.px(hx(rx * 0.62), c[1] + ry * 0.45, 'blush', 0.7);
      cv.px(hx(-rx * 0.45), c[1] + ry * 0.45, 'blush', 0.7);
    }
  };

  const hairTop = (cv, c, f, s, rx, ry, o, hx) => {
    const mat = o.hairMat || 'hairBrown';
    const st = o.hair;
    if (!st || st === 'bald') return;
    if (st === 'spiky' || st === 'wild') {
      cv.ellipse(c[0], c[1] - ry * 0.35, rx * 1.02, ry * 0.75, mat, { clip: (x, y) => y < c[1] - ry * 0.05 || (x - c[0]) * f < -rx * 0.55 });
      for (const [dx, dy, len] of [[-0.9, -0.2, 9], [-0.6, -0.75, 9], [-0.15, -1, 8], [0.3, -0.95, 7], [0.7, -0.6, 6]]) {
        const b = [hx(dx * rx * 0.85), c[1] + dy * ry * 0.8];
        const tip = [hx(dx * rx * 0.85 - 6 * s * (dx < 0 ? 1 : 0.3)), c[1] + dy * ry * 0.8 - len * s * (dy < -0.4 ? 1 : 0.4)];
        cv.poly([[b[0] - 3 * s, b[1] + 2], [tip[0], tip[1]], [b[0] + 3 * s, b[1] + 2]], mat, { flat: 0.5 });
      }
      return;
    }
    if (st === 'slick') {
      cv.ellipse(c[0], c[1] - ry * 0.35, rx * 1.03, ry * 0.72, mat, { clip: (x, y) => y < c[1] - ry * 0.12 || (x - c[0]) * f < -rx * 0.6 });
      cv.poly([[hx(-2 * s), c[1] - ry * 0.4], [hx(1 * s), c[1] - ry * 0.02], [hx(4 * s), c[1] - ry * 0.4]], mat, { flat: 0.4 });
      return;
    }
    if (st === 'mohawk') {
      cv.ellipse(c[0], c[1] - ry * 0.85, 3.5 * s, ry * 0.55, mat);
      return;
    }
    if (st === 'bun') cv.ellipse(hx(-rx * 0.55), c[1] - ry * 0.85, 5 * s, 5 * s, mat);
    // bob / long / ponytail / bangs: a cap plus a fringe over the forehead.
    cv.ellipse(c[0], c[1] - ry * 0.32, rx * 1.04, ry * 0.76, mat, { clip: (x, y) => y < c[1] - ry * 0.15 || (x - c[0]) * f < -rx * 0.5 });
    for (let k = 0; k < 4; k++) {
      const x = hx(rx * (0.75 - k * 0.38));
      cv.poly([[x - 3 * s, c[1] - ry * 0.3], [x + 0.5 * s * f, c[1] - ry * 0.02 + (k % 2) * 2], [x + 3 * s, c[1] - ry * 0.3]], mat, { flat: 0.45 });
    }
  };

  K.HEADS = {
    human(cv, c, f, s, rx, ry, o, m, hx) {
      cv.ellipse(c[0], c[1], rx, ry, m.skin, { round: 0.9 });
      if (o.helm) return K.HEADS.helm(cv, c, f, s, rx, ry, o, m, hx);
      if (o.hood) return K.HEADS.hood(cv, c, f, s, rx, ry, o, m, hx);
      hairTop(cv, c, f, s, rx, ry, o, hx);
      humanFace(cv, c, f, s, rx, ry, o, m, hx);
      if (o.hat === 'wizard') {
        cv.poly([[hx(-rx * 1.15), c[1] - ry * 0.45], [hx(rx * 1.1), c[1] - ry * 0.45], [hx(rx * 0.1), c[1] - ry * 0.75], [hx(-rx * 0.9), c[1] - ry * 2.3], [hx(-rx * 0.15), c[1] - ry * 0.8]], o.hatMat || 'robeBlue', { flat: 0.5, grad: 0.3 });
        cv.ellipse(c[0], c[1] - ry * 0.5, rx * 1.25, 3 * s, o.hatMat || 'robeBlue', { bias: -0.05 });
      }
      if (o.hat === 'cap') cv.ellipse(c[0], c[1] - ry * 0.55, rx * 1.02, ry * 0.55, o.hatMat || 'leather', { clip: (x, y) => y < c[1] - ry * 0.35 });
      if (o.headband) cv.line(Math.round(c[0] - rx), Math.round(c[1] - ry * 0.35), Math.round(c[0] + rx), Math.round(c[1] - ry * 0.35), o.headband, 0.6);
    },
    helm(cv, c, f, s, rx, ry, o, m, hx) {
      const mat = o.helmMat || 'steel';
      if (o.plume) {
        const pts = [[-1.05, 0.05], [-0.85, -0.6], [-0.35, -1.05], [0.15, -1.1], [0.6, -0.85]];
        for (let k = 0; k < pts.length - 1; k++) cv.capsule(hx(pts[k][0] * rx), c[1] + pts[k][1] * ry - 2 * s, hx(pts[k + 1][0] * rx), c[1] + pts[k + 1][1] * ry - 2 * s, 3.4 * s, 3 * s, o.plume);
      }
      cv.ellipse(c[0], c[1], rx * 1.06, ry * 1.04, mat, { round: 0.92 });
      if (o.helm === 'open') {
        cv.ellipse(hx(rx * 0.3), c[1] + ry * 0.25, rx * 0.6, ry * 0.55, m.skin, { round: 0.8 });
        humanFace(cv, [c[0], c[1] + 2], f, s, rx, ry, { ...o, brows: false }, m, hx);
      } else {
        cv.rect(Math.round(hx(-rx * 0.2) - (f < 0 ? rx * 1.1 : 0)), Math.round(c[1] + ry * 0.05), Math.round(rx * 1.3), 3, 'void', { flat: 0, bevel: false });
        cv.px(hx(rx * 0.45), c[1] + ry * 0.05 + 1, o.eyeMat || 'eyeGlow', 1);
        cv.px(hx(rx * 0.05), c[1] + ry * 0.05 + 1, o.eyeMat || 'eyeGlow', 0.8);
        for (let k = 0; k < 3; k++) cv.px(hx(rx * (0.2 + k * 0.18)), c[1] + ry * 0.5, mat, 0.1);
      }
      cv.line(Math.round(c[0] - rx), Math.round(c[1] - ry * 0.25), Math.round(c[0] + rx), Math.round(c[1] - ry * 0.25), m.trim, 0.7);
      cv.px(hx(-rx * 0.6), c[1] - ry * 0.55, mat, 1);
    },
    hood(cv, c, f, s, rx, ry, o, m, hx) {
      const mat = o.hoodMat || 'cloak';
      cv.ellipse(c[0], c[1] - 1, rx * 1.12, ry * 1.12, mat, { round: 0.9 });
      cv.poly([[hx(-rx * 1.1), c[1]], [hx(-rx * 1.4), c[1] + ry * 1.1], [hx(-rx * 0.3), c[1] + ry * 0.8]], mat, { flat: 0.35 });
      cv.ellipse(hx(rx * 0.32), c[1] + ry * 0.2, rx * 0.66, ry * 0.68, o.faceShadow ? 'void' : m.skin, { round: 0.6, bias: -0.15 });
      if (o.faceShadow) K.eyes(cv, [hx(rx * 0.1), c[1]], f, s, rx * 0.8, ry, { ...o, eyes: 'glow' }, hx);
      else humanFace(cv, [hx(rx * 0.12), c[1] + 1], f, s, rx * 0.85, ry, { ...o, brows: o.brows ?? 'angry' }, m, (dx) => hx(rx * 0.12) - c[0] + c[0] + dx * f);
    },
    skull(cv, c, f, s, rx, ry, o, m, hx) {
      cv.ellipse(c[0], c[1] - 1, rx * 0.95, ry * 0.9, 'bone', { round: 0.9 });
      cv.rect(Math.round(hx(-rx * 0.3) - (f < 0 ? rx * 0.75 : 0)), Math.round(c[1] + ry * 0.45), Math.round(rx * 0.75), Math.round(ry * 0.4), 'bone', { flat: 0.55 });
      for (const dx of [rx * 0.35, -rx * 0.2]) cv.ellipse(hx(dx), c[1] + ry * 0.05, 3 * s, 3.4 * s, 'void', { flat: 0 });
      for (const dx of [rx * 0.35, -rx * 0.2]) cv.px(hx(dx), c[1] + ry * 0.05, o.eyeMat || 'eyeGlow', 1);
      cv.light(c[0], c[1], 10, 0.2);
      for (let k = 0; k < 4; k++) cv.px(hx(-rx * 0.15 + k * 2 * s), c[1] + ry * 0.62, 'void', 0);
    },
    frog(cv, c, f, s, rx, ry, o, m, hx) {
      cv.ellipse(c[0], c[1] + ry * 0.15, rx * 1.25, ry * 0.85, m.skin, { round: 0.85 });
      for (const dx of [rx * 0.55, -rx * 0.45]) {
        cv.ellipse(hx(dx), c[1] - ry * 0.55, 5.5 * s, 5.5 * s, m.skin);
        cv.ellipse(hx(dx + 1), c[1] - ry * 0.55, 3.2 * s, 3.6 * s, 'eyeGold', { round: 0.6 });
        cv.rect(Math.round(hx(dx + 1)), Math.round(c[1] - ry * 0.7), 1, 4, 'void', { flat: 0, bevel: false });
      }
      cv.line(Math.round(hx(-rx * 0.9)), Math.round(c[1] + ry * 0.4), Math.round(hx(rx * 1.15)), Math.round(c[1] + ry * 0.25), 'void', 0);
      if (o.mouth === 'open' || o.mouth === 'roar') cv.ellipse(hx(rx * 0.55), c[1] + ry * 0.55, 5 * s, 3 * s, 'flesh', { flat: 0.4 });
      cv.px(hx(rx * 0.95), c[1] - ry * 0.05, m.skin, 0.1);
    },
    brain(cv, c, f, s, rx, ry, o, m, hx) {
      cv.ellipse(c[0], c[1] - ry * 0.2, rx * 1.35, ry * 1.1, 'flesh', { round: 0.9 });
      const r = rnd(7);
      for (let k = 0; k < 9; k++) {
        const x0 = c[0] - rx + r() * rx * 2, y0 = c[1] - ry * 0.9 + r() * ry * 1.2;
        cv.line(Math.round(x0), Math.round(y0), Math.round(x0 + (r() - 0.5) * 8), Math.round(y0 + (r() - 0.5) * 5), 'flesh', 0.1);
      }
      cv.line(Math.round(c[0]), Math.round(c[1] - ry * 1.2), Math.round(c[0] + 2), Math.round(c[1] + ry * 0.3), 'flesh', 0.05);
      K.eyes(cv, [c[0], c[1] + ry * 0.35], f, s, rx, ry, o, hx);
    },
    golem(cv, c, f, s, rx, ry, o, m, hx) {
      cv.poly([[c[0] - rx * 0.95, c[1] - ry * 0.85], [c[0] + rx * 0.95, c[1] - ry * 0.85], [c[0] + rx, c[1] + ry * 0.8], [c[0] - rx, c[1] + ry * 0.8]], m.skin, { flat: 0.6, grad: 0.25 });
      cv.rect(Math.round(hx(-rx * 0.3) - (f < 0 ? rx * 0.9 : 0)), Math.round(c[1] - 1), Math.round(rx * 0.9), 3, 'void', { flat: 0, bevel: false });
      cv.line(Math.round(hx(-rx * 0.2)), Math.round(c[1]), Math.round(hx(rx * 0.55)), Math.round(c[1]), o.eyeMat || 'eyeGlow', 1);
      cv.light(c[0], c[1], 12, 0.25);
      for (const [dx, dy] of [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.55], [0.7, 0.55]]) cv.px(c[0] + dx * rx, c[1] + dy * ry, m.skin, 1);
    },
    mummy(cv, c, f, s, rx, ry, o, m, hx) {
      cv.ellipse(c[0], c[1], rx, ry, 'bandage', { round: 0.9 });
      for (let k = -3; k <= 3; k++) cv.line(Math.round(c[0] - rx * 0.9), Math.round(c[1] + k * 3.4 * s), Math.round(c[0] + rx * 0.9), Math.round(c[1] + k * 3.4 * s + 2), 'bandage', 0.15);
      cv.rect(Math.round(hx(rx * 0.12)), Math.round(c[1] - 1), Math.round(rx * 0.55) * f, 4, 'void', { flat: 0, bevel: false });
      cv.px(hx(rx * 0.38), c[1] + 1, o.eyeMat || 'eyeGlow', 1);
    },
    beast(cv, c, f, s, rx, ry, o, m, hx) {
      // Muzzled head: dog, wolf, bull, lion, monkey and lizard all start here.
      const fur = m.skin;
      if (o.mane) cv.ellipse(hx(-rx * 0.15), c[1], rx * 1.35, ry * 1.25, o.mane, { bias: -0.05 });
      cv.ellipse(c[0], c[1], rx, ry, fur, { round: 0.9 });
      cv.ellipse(hx(rx * 0.75), c[1] + ry * 0.38, rx * 0.62, ry * 0.45, o.muzzle || fur, { round: 0.8 });
      cv.px(hx(rx * 1.25), c[1] + ry * 0.2, 'void', 0);
      cv.line(Math.round(hx(rx * 0.55)), Math.round(c[1] + ry * 0.68), Math.round(hx(rx * 1.25)), Math.round(c[1] + ry * 0.6), 'void', 0);
      if (o.mouth === 'roar' || o.mouth === 'open') {
        cv.ellipse(hx(rx * 0.95), c[1] + ry * 0.72, 4 * s, 2.4 * s, 'flesh', { flat: 0.35 });
        cv.px(hx(rx * 0.7), c[1] + ry * 0.6, 'white', 1);
        cv.px(hx(rx * 1.2), c[1] + ry * 0.6, 'white', 1);
      }
      if (o.ring) cv.ellipse(hx(rx * 1.2), c[1] + ry * 0.62, 2, 2, 'gold', { flat: 0.8 });
      const ey = c[1] - ry * 0.12;
      cv.rect(Math.round(hx(rx * 0.25) - 1), Math.round(ey), 3, 3, 'void', { flat: 0, bevel: false });
      cv.px(hx(rx * 0.25), ey + 1, o.eyeMat || 'eyeGold', 0.9);
      cv.line(Math.round(hx(rx * 0.05)), Math.round(ey - 2), Math.round(hx(rx * 0.55)), Math.round(ey - 1), fur, 0.05);
      if (o.hair) hairTop(cv, c, f, s, rx * 0.9, ry, o, hx);
    },
    slime(cv, c, f, s, rx, ry, o, m, hx) {
      cv.ellipse(c[0], c[1] + ry * 0.2, rx * 1.1, ry, m.skin, { round: 0.7 });
      cv.px(hx(-rx * 0.4), c[1] - ry * 0.4, 'white', 1);
      K.eyes(cv, c, f, s, rx, ry, { ...o, eyes: o.eyes || 'big', brows: false }, hx);
      K.mouth(cv, c, f, s, rx, ry, o, hx, m.skin);
    },
    ghost(cv, c, f, s, rx, ry, o, m, hx) {
      cv.ellipse(c[0], c[1], rx * 1.05, ry * 1.05, 'ghost', { round: 0.8 });
      for (const dx of [rx * 0.35, -rx * 0.2]) cv.ellipse(hx(dx), c[1], 2.6 * s, 3.6 * s, 'void', { flat: 0 });
      cv.ellipse(hx(rx * 0.1), c[1] + ry * 0.55, 3 * s, 3.6 * s, 'void', { flat: 0 });
      cv.light(c[0], c[1], 16, 0.2);
    },
  };

  // ------------------------------------------------------------------ wings and tails
  K.wings = (cv, top, f, s, mat) => {
    for (const k of [-1, 1]) {
      const b = [top[0] - f * 2, top[1] + 4 * s];
      const tip = [b[0] + k * 20 * s, b[1] - 16 * s];
      const pts = mat === 'feather' || mat === 'white'
        ? [b, [b[0] + k * 8 * s, b[1] - 14 * s], tip, [b[0] + k * 22 * s, b[1] - 4 * s], [b[0] + k * 16 * s, b[1] + 6 * s], [b[0] + k * 8 * s, b[1] + 8 * s]]
        : [b, [b[0] + k * 6 * s, b[1] - 12 * s], tip, [b[0] + k * 18 * s, b[1] - 2 * s], [b[0] + k * 14 * s, b[1] + 1 * s], [b[0] + k * 10 * s, b[1] + 6 * s], [b[0] + k * 5 * s, b[1] + 3 * s]];
      cv.poly(pts, mat, { flat: k === f ? 0.5 : 0.36, grad: 0.25 });
    }
  };
  K.tail = (cv, hip, f, s, mat) => {
    let p = [hip[0] - f * 4 * s, hip[1] + 2 * s];
    const segs = [[-110, 8], [-150, 7], [-190, 6], [-215, 5]];
    for (const [a, l] of segs) {
      const q = at(p, a, f, l * s);
      cv.capsule(p[0], p[1], q[0], q[1], 2.4 * s, 1.8 * s, mat);
      p = q;
    }
    cv.poly([[p[0] - 3, p[1]], [p[0] - f * 4, p[1] - 5], [p[0] + 3, p[1]], [p[0], p[1] + 3]], mat, { flat: 0.5 });
  };

  // ------------------------------------------------------------------ weapons and held things
  /** Draws a held item from `hand` pointing along angle `a`; returns the tip position. */
  K.weapon = (cv, hand, a, f, s, w) => {
    const len = (w.len ?? K.WLEN[w.type] ?? 18) * s;
    const tip = at(hand, a, f, len);
    const back = at(hand, a + 180, f, (w.grip ?? 3) * s);
    const side = (p, k) => at(p, a + 90, f, k);
    const t = w.type;
    const blade = w.mat || 'steel';
    if (t === 'sword' || t === 'greatsword' || t === 'katana' || t === 'dagger') {
      const wide = t === 'greatsword' ? 2.4 : t === 'dagger' ? 1.2 : t === 'katana' ? 1.1 : 1.7;
      const from = at(hand, a, f, 3 * s);
      cv.capsule(from[0], from[1], tip[0], tip[1], wide * s, 0.6 * s, blade, { bias: 0.15 });
      const hl = at(from, a, f, 2);
      cv.line(Math.round(hl[0]), Math.round(hl[1]), Math.round(tip[0]), Math.round(tip[1]), blade, 1);
      if (t !== 'katana') {
        const g1 = side(at(hand, a, f, 2.4 * s), 4.5 * s * (t === 'dagger' ? 0.6 : 1)), g2 = side(at(hand, a, f, 2.4 * s), -4.5 * s * (t === 'dagger' ? 0.6 : 1));
        cv.capsule(g1[0], g1[1], g2[0], g2[1], 1.2 * s, 1.2 * s, w.guard || 'gold');
      }
      cv.capsule(hand[0], hand[1], back[0], back[1], 1.2 * s, 1.2 * s, 'leather');
      cv.ellipse(back[0], back[1], 1.6 * s, 1.6 * s, w.guard || 'gold');
    } else if (t === 'axe' || t === 'greataxe') {
      cv.capsule(back[0], back[1], tip[0], tip[1], 1.3 * s, 1.3 * s, 'wood');
      const h0 = at(tip, a + 180, f, 2 * s);
      const big = t === 'greataxe' ? 1.5 : 1;
      cv.poly([side(h0, 1.5 * s), side(at(h0, a, f, 3 * s), 9 * big * s), side(at(h0, a + 180, f, 9 * big * s), 10 * big * s), side(at(h0, a + 180, f, 7 * big * s), 1.5 * s)], blade, { flat: 0.6 });
      if (t === 'greataxe') cv.poly([side(h0, -1.5 * s), side(at(h0, a, f, 3 * s), -8 * s), side(at(h0, a + 180, f, 8 * s), -8 * s), side(at(h0, a + 180, f, 6 * s), -1.5 * s)], blade, { flat: 0.5 });
    } else if (t === 'mace' || t === 'hammer' || t === 'club') {
      cv.capsule(back[0], back[1], tip[0], tip[1], (t === 'club' ? 1.6 : 1.2) * s, (t === 'club' ? 3.6 : 1.2) * s, t === 'club' ? 'wood' : 'wood');
      if (t === 'mace') {
        cv.ellipse(tip[0], tip[1], 4.2 * s, 4.2 * s, blade);
        for (let k = 0; k < 6; k++) cv.px(tip[0] + Math.cos(k) * 5.5 * s, tip[1] + Math.sin(k) * 5.5 * s, blade, 0.9);
      }
      if (t === 'hammer') cv.poly([side(tip, -6 * s), side(tip, 6 * s), side(at(tip, a, f, 7 * s), 6 * s), side(at(tip, a, f, 7 * s), -6 * s)], blade, { flat: 0.6 });
    } else if (t === 'spear' || t === 'trident' || t === 'staff' || t === 'scythe' || t === 'wand') {
      cv.capsule(back[0], back[1], tip[0], tip[1], (t === 'wand' ? 0.9 : 1.2) * s, (t === 'wand' ? 0.9 : 1.1) * s, w.shaft || 'wood');
      if (t === 'spear') cv.poly([side(tip, 2.4 * s), at(tip, a, f, 7 * s), side(tip, -2.4 * s)], blade, { flat: 0.7 });
      if (t === 'trident') {
        cv.capsule(side(tip, -4 * s)[0], side(tip, -4 * s)[1], side(tip, 4 * s)[0], side(tip, 4 * s)[1], 1 * s, 1 * s, w.mat || 'gold');
        for (const k of [-4, 0, 4]) {
          const b = side(tip, k * s), e = at(b, a, f, (k === 0 ? 8 : 6) * s);
          cv.capsule(b[0], b[1], e[0], e[1], 0.9 * s, 0.5 * s, w.mat || 'gold');
        }
      }
      if (t === 'staff' || t === 'wand') {
        const orb = w.orb || 'gem';
        cv.ellipse(tip[0], tip[1], (t === 'wand' ? 2.2 : 3.6) * s, (t === 'wand' ? 2.2 : 3.6) * s, orb, { flat: 0.75 });
        cv.px(tip[0] - 1, tip[1] - 1, 'white', 1);
        cv.light(tip[0], tip[1], 16 * s, 0.35);
      }
      if (t === 'scythe') {
        const b = at(tip, a + 180, f, 1);
        cv.poly([side(b, 0), side(at(b, a, f, 3 * s), -14 * s), side(at(b, a + 180, f, 2 * s), -16 * s), side(at(b, a + 180, f, 2 * s), -2 * s)], blade, { flat: 0.65 });
      }
    } else if (t === 'bow') {
      const up = at(hand, a - 90, f, 13 * s), dn = at(hand, a + 90, f, 13 * s), bend = at(hand, a, f, 5 * s);
      cv.capsule(up[0], up[1], bend[0], bend[1], 1 * s, 1.2 * s, 'wood');
      cv.capsule(bend[0], bend[1], dn[0], dn[1], 1.2 * s, 1 * s, 'wood');
      cv.line(Math.round(up[0]), Math.round(up[1]), Math.round(dn[0]), Math.round(dn[1]), 'white', 0.9);
    } else if (t === 'crossbow') {
      cv.capsule(back[0], back[1], tip[0], tip[1], 1.6 * s, 1.6 * s, 'wood');
      const c1 = side(tip, 8 * s), c2 = side(tip, -8 * s);
      cv.capsule(c1[0], c1[1], c2[0], c2[1], 1 * s, 1 * s, 'steel');
      cv.line(Math.round(c1[0]), Math.round(c1[1]), Math.round(at(hand, a, f, 2)[0]), Math.round(at(hand, a, f, 2)[1]), 'white', 0.9);
      cv.line(Math.round(c2[0]), Math.round(c2[1]), Math.round(at(hand, a, f, 2)[0]), Math.round(at(hand, a, f, 2)[1]), 'white', 0.9);
    } else if (t === 'shield' || t === 'kite') {
      const c = at(hand, a, f, 2 * s);
      const r = (w.r ?? 9) * s;
      cv.ellipse(c[0], c[1], r, t === 'kite' ? r * 1.25 : r, w.rim || 'gold');
      cv.ellipse(c[0], c[1], r * 0.82, (t === 'kite' ? r * 1.25 : r) * 0.84, w.mat || 'blue', { round: 0.6 });
      if (w.emblem) w.emblem(cv, c, s);
      else cv.ellipse(c[0], c[1], 2.4 * s, 2.4 * s, w.rim || 'gold');
      return c;
    } else if (t === 'orb' || t === 'fireball' || t === 'holy') {
      const c = at(hand, a, f, 4 * s);
      const mat = t === 'fireball' ? 'fire' : t === 'holy' ? 'holy' : w.mat || 'magic';
      cv.ellipse(c[0], c[1], (w.r ?? 4.5) * s, (w.r ?? 4.5) * s, mat, { flat: 0.55 });
      cv.ellipse(c[0], c[1], (w.r ?? 4.5) * s * 0.55, (w.r ?? 4.5) * s * 0.55, mat, { flat: 1 });
      cv.light(c[0], c[1], 22 * s, 0.5);
      return c;
    } else if (t === 'goblet') {
      cv.poly([side(hand, -3 * s), side(hand, 3 * s), side(at(hand, a + 180, f, 5 * s), 1 * s), side(at(hand, a + 180, f, 5 * s), -1 * s)], 'gold', { flat: 0.7 });
    } else if (t === 'book') {
      const c = at(hand, a, f, 3 * s);
      cv.rect(c[0] - 5 * s, c[1] - 4 * s, 10 * s, 8 * s, w.mat || 'robeRed', { flat: 0.55 });
      cv.line(Math.round(c[0] - 4 * s), Math.round(c[1] - 3 * s), Math.round(c[0] + 4 * s), Math.round(c[1] - 3 * s), 'white', 0.9);
    } else if (t === 'torch') {
      cv.capsule(back[0], back[1], tip[0], tip[1], 1.3 * s, 1.3 * s, 'wood');
      K.flame(cv, tip[0], tip[1] - 2, 3 * s);
    } else if (t === 'claw') {
      for (const k of [-3, 0, 3]) {
        const b = side(hand, k * s), e = at(b, a, f, 6 * s);
        cv.capsule(b[0], b[1], e[0], e[1], 0.9 * s, 0.3 * s, w.mat || 'bone');
      }
    } else if (t === 'net' || t === 'whip') {
      let p = hand;
      for (let k = 0; k < 6; k++) {
        const q = at(p, a + Math.sin(k) * 40, f, 5 * s);
        cv.capsule(p[0], p[1], q[0], q[1], 0.9, 0.9, 'leather');
        p = q;
      }
      return p;
    }
    return tip;
  };
  K.WLEN = { sword: 20, greatsword: 27, katana: 22, dagger: 9, axe: 20, greataxe: 24, mace: 15, hammer: 18, club: 16, spear: 32, trident: 30, staff: 28, wand: 10, scythe: 30, bow: 10, crossbow: 14, torch: 12 };

  // ------------------------------------------------------------------ effects
  K.slash = (cv, cx, cy, r, a0, a1, mat = 'slash') => {
    cv.figure();
    cv.arc(cx, cy, r - 4, r, a0, a1, mat, { flat: 0.95, taper: true });
    cv.light(cx + Math.cos(((a0 + a1) / 2) * R) * r, cy + Math.sin(((a0 + a1) / 2) * R) * r, 18, 0.35);
  };
  K.flame = (cv, x, y, r, mat = 'fire') => {
    cv.ellipse(x, y, r, r * 1.5, mat, { flat: 0.35 });
    cv.ellipse(x, y + r * 0.2, r * 0.62, r, mat, { flat: 0.68 });
    cv.ellipse(x, y + r * 0.45, r * 0.3, r * 0.5, mat, { flat: 1 });
    cv.light(x, y, r * 7, 0.45);
  };
  K.fireball = (cv, x, y, r, a, f = 1, mat = 'fire') => {
    for (let k = 4; k >= 1; k--) {
      const p = at([x, y], a + 180, f, k * r * 0.75);
      cv.ellipse(p[0], p[1], r * (1 - k * 0.18), r * (1 - k * 0.18), mat, { flat: 0.25 + 0.05 * (4 - k) });
    }
    K.flame(cv, x, y, r, mat);
  };
  K.bolt = (cv, x1, y1, x2, y2, mat = 'holy', seed = 3) => {
    const r = rnd(seed);
    let p = [x1, y1];
    const n = 6;
    for (let k = 1; k <= n; k++) {
      const q = [x1 + ((x2 - x1) * k) / n + (k < n ? (r() - 0.5) * 8 : 0), y1 + ((y2 - y1) * k) / n + (k < n ? (r() - 0.5) * 5 : 0)];
      cv.capsule(p[0], p[1], q[0], q[1], 1.6, 1.6, mat, { bias: 0.4 });
      cv.line(Math.round(p[0]), Math.round(p[1]), Math.round(q[0]), Math.round(q[1]), 'white', 1);
      p = q;
    }
    cv.light(x2, y2, 22, 0.5);
  };
  K.sparkle = (cv, x, y, r = 3, mat = 'holy') => {
    cv.line(Math.round(x - r), Math.round(y), Math.round(x + r), Math.round(y), mat, 0.9);
    cv.line(Math.round(x), Math.round(y - r), Math.round(x), Math.round(y + r), mat, 0.9);
    cv.px(x, y, 'white', 1);
  };
  K.burst = (cv, x, y, r, mat = 'holy') => {
    for (let k = 0; k < 8; k++) {
      const a = k * 45 + 22;
      const p1 = [x + Math.cos(a * R) * r * 0.45, y + Math.sin(a * R) * r * 0.45], p2 = [x + Math.cos(a * R) * r, y + Math.sin(a * R) * r];
      cv.capsule(p1[0], p1[1], p2[0], p2[1], 1.4, 0.4, mat, { bias: 0.35 });
    }
    cv.ellipse(x, y, r * 0.35, r * 0.35, 'white', { flat: 1 });
    cv.light(x, y, r * 2.2, 0.45);
  };
  K.speed = (cv, x, y, f, n = 4, len = 14, mat = 'slash') => {
    for (let k = 0; k < n; k++) {
      const yy = y + k * 5 - n * 2;
      const x0 = x - f * (4 + (k % 2) * 4);
      cv.line(Math.round(x0), Math.round(yy), Math.round(x0 - f * len), Math.round(yy), mat, 0.8);
    }
  };
  K.dust = (cv, x, y, n = 3, mat = 'dust') => {
    for (let k = 0; k < n; k++) cv.ellipse(x + (k - (n - 1) / 2) * 6, y - (k % 2) * 2, 3.5 - (k % 2), 2.6, mat, { flat: 0.6 });
  };
  K.circle = (cv, x, y, rx, ry, mat = 'magic') => {
    cv.scene();
    for (let k = 0; k < 360; k += 4) {
      const px = x + Math.cos(k * R) * rx, py = y + Math.sin(k * R) * ry;
      cv.px(px, py, mat, 0.95);
      if (k % 40 === 0) cv.px(x + Math.cos(k * R) * rx * 0.75, y + Math.sin(k * R) * ry * 0.75, mat, 0.8);
    }
    cv.light(x, y, rx * 1.4, 0.35);
  };
  K.coins = (cv, pts) => {
    for (const [x, y] of pts) {
      cv.ellipse(x, y, 2.2, 2.2, 'gold', { flat: 0.75 });
      cv.px(x - 1, y - 1, 'white', 1);
    }
  };

  // ------------------------------------------------------------------ scenes
  const bricks = (cv, x0, y0, x1, y1, h = 6, w = 11) => {
    for (let y = y0; y < y1; y++) {
      const row = Math.floor((y - y0) / h);
      for (let x = x0; x < x1; x++) {
        const off = row % 2 ? Math.floor(w / 2) : 0;
        if ((y - y0) % h === 0) K.shade(cv, x, y, -0.22);
        else if ((x - x0 + off) % w === 0) K.shade(cv, x, y, -0.2);
        else if ((y - y0) % h === 1) K.shade(cv, x, y, 0.08);
      }
    }
  };
  const floorTiles = (cv, y0) => {
    for (let y = y0; y < K.H; y++) {
      const depth = (y - y0) / (K.H - y0);
      if (Math.round((y - y0) ** 1.35) % 5 === 0) for (let x = 0; x < K.W; x++) K.shade(cv, x, y, -0.18);
      for (let k = -6; k <= 6; k++) K.shade(cv, Math.round(K.W / 2 + k * (6 + depth * 10)), y, -0.16);
    }
  };
  K.torch = (cv, x, y) => {
    cv.scene();
    cv.rect(x - 1, y, 3, 7, 'wood', { flat: 0.45 });
    K.flame(cv, x + 0.5, y - 2, 2.6);
  };
  K.groundShadow = (cv, cx, cy, rx, ry) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1) K.shade(cv, x, y, -0.32 * (1 - d * 0.6));
    }
  };

  /**
   * A room: { wall: 'brick'|'rock'|'plank'|'tile'|'hedge'|'none', wallMat, floorMat, floorY,
   *   torches: [x...], pillars: bool, props: [fn], light: [[x, y, r, k]] }
   */
  K.room = (cv, o = {}) => {
    cv.scene();
    const fy = o.floorY ?? 90;
    const wall = o.wall || 'brick';
    const wm = o.wallMat || 'stone';
    cv.rect(0, 0, K.W, fy, wm, { flat: 0.44, grad: 0.3, bevel: false });
    if (wall === 'brick') bricks(cv, 0, 0, K.W, fy);
    if (wall === 'tile') bricks(cv, 0, 0, K.W, fy, 9, 9);
    if (wall === 'plank') for (let y = 0; y < fy; y += 7) for (let x = 0; x < K.W; x++) K.shade(cv, x, y, -0.25);
    if (wall === 'rock') {
      const r = rnd(o.seed || 5);
      for (let k = 0; k < 26; k++) cv.ellipse(r() * K.W, r() * fy, 6 + r() * 8, 4 + r() * 6, wm, { bias: -0.1 + r() * 0.15 });
    }
    if (wall === 'hedge') {
      const r = rnd(o.seed || 9);
      for (let k = 0; k < 60; k++) cv.ellipse(r() * K.W, r() * fy, 3 + r() * 3, 3 + r() * 3, wm, { bias: -0.15 + r() * 0.2 });
    }
    if (o.pillars) {
      for (const px of [1, 70]) {
        cv.rect(px, 0, 9, fy + 2, o.pillarMat || wm, { flat: 0.52, gradX: 0.45, bevel: false });
        for (let y = 6; y < fy; y += 12) for (let x = px; x < px + 9; x++) K.shade(cv, x, y, -0.2);
      }
    }
    cv.rect(0, fy, K.W, K.H - fy, o.floorMat || 'floor', { flat: 0.5, grad: -0.25, bevel: false });
    if (o.floor !== 'plain') floorTiles(cv, fy);
    for (const x of o.torches || []) K.torch(cv, x, o.torchY ?? 46);
    for (const L of o.light || []) cv.light(...L);
    for (const p of o.props || []) {
      cv.scene();
      p(cv);
    }
    cv.scene();
  };

  /** Outdoors: { sky, ground, hills, trees: [x...], sun: [x, y], castle: x } */
  K.outdoor = (cv, o = {}) => {
    cv.scene();
    const gy = o.groundY ?? 84;
    cv.rect(0, 0, K.W, gy, o.sky || 'sky', { flat: 0.6, grad: 0.45, bevel: false });
    if (o.sun) {
      cv.ellipse(o.sun[0], o.sun[1], 6, 6, o.sunMat || 'moon', { flat: 0.95 });
      cv.light(o.sun[0], o.sun[1], 30, 0.25);
    }
    if (o.clouds) for (const [x, y] of o.clouds) for (let k = 0; k < 3; k++) cv.ellipse(x + k * 6, y - (k % 2) * 2, 6, 3.5, 'white', { flat: 0.85 });
    if (o.hills !== false) {
      cv.ellipse(18, gy + 6, 34, 16, o.hillMat || 'grassDark', { flat: 0.4, grad: 0.2 });
      cv.ellipse(66, gy + 8, 30, 14, o.hillMat || 'grassDark', { flat: 0.34 });
    }
    if (o.castle != null) {
      const x = o.castle;
      cv.rect(x, gy - 22, 18, 22, 'stone', { flat: 0.5 });
      for (const tx of [x - 3, x + 15]) {
        cv.rect(tx, gy - 30, 6, 30, 'stone', { flat: 0.55 });
        cv.poly([[tx - 1, gy - 30], [tx + 3, gy - 38], [tx + 7, gy - 30]], 'carpet', { flat: 0.55 });
      }
      cv.rect(x + 6, gy - 9, 6, 9, 'void', { flat: 0, bevel: false });
    }
    for (const x of o.trees || []) {
      cv.rect(x - 1, gy - 10, 3, 12, 'bark', { flat: 0.45 });
      cv.ellipse(x, gy - 16, 7, 9, 'leaf', { round: 0.7 });
    }
    cv.rect(0, gy, K.W, K.H - gy, o.ground || 'grass', { flat: 0.55, grad: -0.3, bevel: false });
    const r = rnd(o.seed || 4);
    for (let k = 0; k < 40; k++) K.shade(cv, r() * K.W, gy + 2 + r() * (K.H - gy - 2), -0.15);
    if (o.path) cv.poly([[34, gy], [46, gy], [60, K.H], [20, K.H]], 'dirt', { flat: 0.55, grad: -0.2, bevel: false });
  };

  /** The arcane void behind Spells: a swirl of colour and a rune circle. */
  K.arcane = (cv, o = {}) => {
    cv.scene();
    const mat = o.mat || 'arcane';
    cv.rect(0, 0, K.W, K.H, mat, { flat: 0.3, grad: 0.25, bevel: false });
    const cx = o.cx ?? 40, cy = o.cy ?? 56;
    for (let y = 0; y < K.H; y++) for (let x = 0; x < K.W; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const a = Math.atan2(y - cy, x - cx) + d / 9;
      K.shade(cv, x, y, 0.22 * Math.sin(a * 3) * Math.max(0, 1 - d / 70) + Math.max(0, 0.35 - d / 120));
    }
    const r = rnd(o.seed || 11);
    for (let k = 0; k < 30; k++) cv.px(r() * K.W, r() * K.H, 'white', 0.6 + r() * 0.4);
    if (o.circle !== false) K.circle(cv, cx, o.circleY ?? 96, 30, 8, o.circleMat || 'magic');
  };
})();
