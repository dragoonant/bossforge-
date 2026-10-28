// BossForge pixel-art renderer (art proof, PLAN D7). Draws original MGSD figures (about two and a
// half heads tall, oversized head, chunky boots and gauntlets, armor plates with panel lines and
// rivets) as 16-bit pixel art: every part is shaded as a volume, quantised to a per-material colour
// ramp with hue-shifted shadows, then outlined. A style is a set of rendering rules over the same
// drawing, so one drawing proofs in five looks. Nothing here copies an official illustration.
(function () {
  'use strict';
  const PA = (globalThis.PA = {});

  // ------------------------------------------------------------------ colour
  const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgb2hsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  };
  const hsl2rgb = ([h, s, l]) => {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerpHue = (a, b, t) => {
    let d = ((b - a + 540) % 360) - 180;
    return a + d * t;
  };

  /** A dark-to-light ramp of n colours from one base colour, shadows cooled and highlights warmed. */
  PA.ramp = (base, n, st) => {
    const [h, s, l] = rgb2hsl(hex2rgb(base));
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const lt = clamp(l + (t - 0.5) * st.spread + st.bright, 0.04, 0.96);
      const hh = t < 0.5 ? lerpHue(h, st.coolHue, (0.5 - t) * st.shift) : lerpHue(h, 55, (t - 0.5) * st.shift * 0.7);
      const ss = clamp(s * st.sat * (1 - Math.abs(t - 0.5) * 0.35));
      out.push(hsl2rgb([hh, ss, lt]));
    }
    return out;
  };

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  // ------------------------------------------------------------------ the drawing surface
  PA.Canvas = class {
    constructor(w, h, light) {
      Object.assign(this, { w, h });
      const n = w * h;
      this.m = new Array(n).fill(null); // material name
      this.s = new Float32Array(n); // shade 0..1
      this.o = new Int32Array(n).fill(-1); // object id, for internal lines
      this.fg = new Uint8Array(n); // 1 = figure, 0 = scene
      this.c = new Array(n).fill(null); // explicit colour override [mat, tone] or rgb
      this.L = norm(light || [-0.55, -0.68, 0.5]);
      this.nextObj = 0;
      this.layer = 0;
      this.glow = []; // light sources: [x, y, r, k]
    }
    figure() { this.layer = 1; }
    scene() { this.layer = 0; }
    set(x, y, mat, s, obj) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x;
      this.m[i] = mat; this.s[i] = s; this.o[i] = obj; this.fg[i] = this.layer; this.c[i] = null;
    }
    lit(nx, ny, nz, bias = 0) {
      const d = nx * this.L[0] + ny * this.L[1] + nz * this.L[2];
      return clamp(0.22 + 0.78 * Math.max(0, d) + bias);
    }
    ellipse(cx, cy, rx, ry, mat, o = {}) {
      const obj = this.nextObj++;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d2 = nx * nx + ny * ny;
          if (d2 > 1) continue;
          if (o.clip && !o.clip(x, y)) continue;
          const s = o.flat != null ? o.flat : this.lit(nx * (o.round ?? 1), ny * (o.round ?? 1), Math.sqrt(Math.max(0, 1 - d2)), o.bias);
          this.set(x, y, mat, s, obj);
        }
      }
      return obj;
    }
    capsule(x1, y1, x2, y2, r1, r2, mat, o = {}) {
      const obj = this.nextObj++;
      const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1, R = Math.max(r1, r2);
      for (let y = Math.floor(Math.min(y1, y2) - R); y <= Math.ceil(Math.max(y1, y2) + R); y++) {
        for (let x = Math.floor(Math.min(x1, x2) - R); x <= Math.ceil(Math.max(x1, x2) + R); x++) {
          const px = x + 0.5, py = y + 0.5;
          const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2);
          const cx = x1 + dx * t, cy = y1 + dy * t, r = r1 + (r2 - r1) * t;
          const vx = px - cx, vy = py - cy, d = Math.hypot(vx, vy);
          if (d > r) continue;
          const k = d / r;
          const s = this.lit((vx / (d || 1)) * k, (vy / (d || 1)) * k, Math.sqrt(1 - k * k), o.bias);
          this.set(x, y, mat, s, obj);
        }
      }
      return obj;
    }
    /** Polygon with bevelled edges: lit on the light side, shadowed on the far side. */
    poly(pts, mat, o = {}) {
      const obj = this.nextObj++;
      const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
      const inside = (x, y) => {
        let c = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
        }
        return c;
      };
      const y0 = Math.min(...ys), y1 = Math.max(...ys), x0 = Math.min(...xs), x1 = Math.max(...xs);
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
          if (!inside(x + 0.5, y + 0.5)) continue;
          let s = o.flat ?? 0.55;
          if (o.grad) s += o.grad * ((y - y0) / (y1 - y0 || 1) - 0.5) * -1;
          if (o.gradX) s += o.gradX * ((x - x0) / (x1 - x0 || 1) - 0.5) * -1;
          if (o.bevel !== false) {
            if (!inside(x - 0.5, y - 0.5)) s += 0.22;
            else if (!inside(x + 1.5, y + 1.5)) s -= 0.2;
          }
          this.set(x, y, mat, clamp(s + (o.bias || 0)), obj);
        }
      }
      return obj;
    }
    rect(x, y, w, h, mat, o = {}) {
      return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], mat, o);
    }
    /** A detail pixel: material tone 0 (darkest) .. 1 (lightest), drawn after shading. */
    px(x, y, mat, tone) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x;
      this.c[i] = [mat, tone];
      if (this.layer) this.fg[i] = 1;
    }
    line(x1, y1, x2, y2, mat, tone) {
      const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) || 1;
      for (let k = 0; k <= n; k++) this.px(x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n, mat, tone);
    }
    light(x, y, r, k) { this.glow.push([x, y, r, k]); }
  };
  const norm = (v) => {
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };

  // ------------------------------------------------------------------ rendering a canvas in a style
  PA.render = (cv, st) => {
    const { w, h } = cv;
    const ramps = {};
    const rampOf = (mat) => (ramps[mat] ||= PA.ramp(st.palette[mat] || '#ff00ff', st.tones[mat] || st.tones.default, st.accent?.includes(mat) ? { ...st, sat: Math.max(st.sat, 1), coolHue: st.coolHue } : st));
    const img = new Uint8ClampedArray(w * h * 4);
    const toneIdx = (mat, s, x, y, fg) => {
      const r = rampOf(mat);
      const n = r.length;
      let t = clamp(s * st.contrast + (fg ? 0 : st.sceneDim));
      const v = t * (n - 1);
      const dither = fg ? st.ditherFig : st.ditherScene;
      const idx = dither ? Math.floor(v + BAYER[(y % 4) * 4 + (x % 4)] * 0.999) : Math.round(v);
      return clamp(idx, 0, n - 1);
    };
    // Light sources brighten the scene in bands.
    const S = Float32Array.from(cv.s);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let add = 0;
      for (const [gx, gy, gr, gk] of cv.glow) {
        const d = Math.hypot(x - gx, y - gy);
        if (d < gr) add += gk * (1 - d / gr) ** 1.6;
      }
      const vx = (x - w / 2) / (w / 2), vy = (y - h / 2) / (h / 2);
      const vig = 1 - st.vignette * (vx * vx + vy * vy) * 0.5;
      const glowable = cv.m[i] !== 'fire' && cv.m[i] !== 'moon';
      S[i] = cv.fg[i] ? S[i] + add * 0.35 : (S[i] + (glowable ? add : 0)) * vig;
    }
    const out = new Array(w * h);
    const idxAt = new Int8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ov = cv.c[i];
      if (ov) {
        const r = rampOf(ov[0]);
        const k = Math.round(clamp(ov[1]) * (r.length - 1));
        out[i] = r[k];
        idxAt[i] = k;
        continue;
      }
      const mat = cv.m[i];
      if (!mat) { out[i] = hex2rgb(st.palette.void || '#000000'); continue; }
      const k = toneIdx(mat, S[i], x, y, cv.fg[i]);
      out[i] = rampOf(mat)[k];
      idxAt[i] = k;
    }
    const isFg = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cv.fg[y * w + x];
    // Internal lines: an object's edge against an object drawn beneath it gets its darkest tone.
    if (st.inner) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!cv.fg[i] || cv.c[i] || !cv.m[i]) continue;
        const me = cv.o[i];
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          const xx = x + dx, yy = y + dy;
          if (!isFg(xx, yy)) continue;
          const j = yy * w + xx;
          if (cv.o[j] >= 0 && cv.o[j] < me && cv.m[j] !== cv.m[i]) {
            out[i] = rampOf(cv.m[i])[Math.max(0, Math.min(idxAt[i] - 2, 1))];
            break;
          }
        }
      }
    }
    // Rim light on the side away from the key light.
    if (st.rim) {
      const rim = hex2rgb(st.rim);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!cv.fg[i]) continue;
        const sx = cv.L[0] < 0 ? 1 : -1;
        if (!isFg(x + sx, y) && !isFg(x + sx, y - 1)) {
          const a = out[i];
          out[i] = [0, 1, 2].map((k) => Math.round(a[k] * 0.35 + rim[k] * 0.65));
        }
      }
    }
    // The outline: one pixel around the figure, drawn over the scene.
    if (st.outline !== 'none') {
      const ol = hex2rgb(st.outlineColor || '#140c1c');
      const marks = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (isFg(x, y)) continue;
        let nb = null;
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (isFg(x + dx, y + dy)) { nb = (y + dy) * w + (x + dx); break; }
        if (nb == null) continue;
        if (st.outline === 'selout') {
          const r = rampOf(cv.m[nb] || cv.c[nb]?.[0] || 'void');
          marks.push([y * w + x, r[0]]);
        } else marks.push([y * w + x, ol]);
      }
      for (const [i, c] of marks) out[i] = c;
    }
    for (let i = 0; i < w * h; i++) {
      const [r, g, b] = out[i];
      img.set([r, g, b, 255], i * 4);
    }
    return img;
  };

  PA.toCanvas = (cv, st, scale) => {
    const c = document.createElement('canvas');
    c.width = cv.w;
    c.height = cv.h;
    const g = c.getContext('2d');
    g.putImageData(new ImageData(PA.render(cv, st), cv.w, cv.h), 0, 0);
    if (!scale) return c;
    const big = document.createElement('canvas');
    big.width = cv.w * scale;
    big.height = cv.h * scale;
    const bg = big.getContext('2d');
    bg.imageSmoothingEnabled = false;
    bg.drawImage(c, 0, 0, big.width, big.height);
    return big;
  };
})();
