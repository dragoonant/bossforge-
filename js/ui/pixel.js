// Procedural 16-bit placeholder art, one deterministic sprite per card id (PLAN D7 until the art
// audition is decided). Original pixel shapes only: nothing here imitates an official illustration.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = (BF.ui = {}); // the first UI file creates the namespace
  const W = 40;
  const H = 56; // 5:7, the card's own aspect

  const PAL = {
    cleric: ['#fff4c2', '#f2c94c', '#b8862b', '#5c3d0f'],
    fighter: ['#ffd0c2', '#e5533d', '#9c2a1c', '#4a120b'],
    mage: ['#e3d4ff', '#9b6bff', '#5b34b8', '#26145c'],
    thief: ['#d8ffd0', '#5fd068', '#2e8a3a', '#123d18'],
    none: ['#f0f0f0', '#a0a8b8', '#5d6578', '#22262f'],
  };
  const BG = {
    monster: ['#3b1d1a', '#4e2723', '#2a1412'],
    trap: ['#1b2633', '#25344a', '#121a24'],
    spell: ['#22163a', '#33205a', '#160e26'],
    hero: ['#1d3324', '#28452f', '#122016'],
    boss: ['#3a2a0c', '#57401a', '#231806'],
  };

  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const cache = new Map();

  /** A data-URL sprite for card `id`. Browser only (needs a canvas). */
  ui.art = (id) => {
    if (cache.has(id)) return cache.get(id);
    const d = BF.CARD_DATA[id];
    const r = rng(hash(id));
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const bgKey = d.kind === 'room' ? d.sub : d.kind;
    const bg = BG[bgKey];
    // Background: bricks for Rooms, starfield for Spells, hills for Heroes, a throne glow for Bosses.
    g.fillStyle = bg[0];
    g.fillRect(0, 0, W, H);
    if (d.kind === 'room') {
      for (let y = 0; y < H; y += 4) {
        const off = (y / 4) % 2 ? 0 : 4;
        for (let x = -off; x < W; x += 8) {
          g.fillStyle = r() < 0.5 ? bg[1] : bg[0];
          g.fillRect(x + 1, y + 1, 6, 2);
        }
      }
      g.fillStyle = bg[2];
      g.fillRect(0, H - 10, W, 10);
    } else if (d.kind === 'spell') {
      for (let i = 0; i < 40; i++) {
        g.fillStyle = r() < 0.5 ? bg[1] : '#8a6bd8';
        g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1);
      }
    } else if (d.kind === 'hero') {
      g.fillStyle = bg[1];
      for (let x = 0; x < W; x++) g.fillRect(x, H - 12 - Math.round(3 * Math.sin(x / 5 + r())), 1, 14);
    } else {
      const grd = g.createRadialGradient(W / 2, H / 2 - 4, 2, W / 2, H / 2 - 4, 26);
      grd.addColorStop(0, bg[1]);
      grd.addColorStop(1, bg[0]);
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
    }

    // Sprite: a mirrored 20x22 figure with a big head (MGSD-like proportions: head ~40%).
    const pal = PAL[d.treasure?.[0] ?? (d.kind === 'spell' ? 'mage' : 'none')] || PAL.none;
    const SW = 10;
    const SH = 22;
    const grid = [];
    for (let y = 0; y < SH; y++) {
      grid.push([]);
      for (let x = 0; x < SW; x++) {
        const head = y < 9;
        const width = head ? 7 - Math.abs(y - 4) * 0.35 : y < 16 ? 4.5 : 3.5;
        const edge = SW - x;
        let p = edge <= width ? 0.85 : edge <= width + 1.5 ? 0.35 : 0;
        if (d.kind === 'spell') p = Math.max(0, 0.75 - Math.hypot(edge - 1, y - 11) / 9);
        grid[y].push(r() < p ? 1 : 0);
      }
    }
    const ox = W / 2 - SW;
    const oy = d.kind === 'boss' ? 10 : 12;
    const filled = (x, y) => y >= 0 && y < SH && x >= 0 && x < SW * 2 && grid[y][x < SW ? x : SW * 2 - 1 - x] === 1;
    for (let y = -1; y <= SH; y++) {
      for (let x = -1; x <= SW * 2; x++) {
        if (filled(x, y)) {
          const shade = y < SH * 0.3 ? 0 : y < SH * 0.75 ? 1 : 2;
          g.fillStyle = pal[shade];
          g.fillRect(ox + x, oy + y, 1, 1);
        } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
          g.fillStyle = pal[3]; // outline
          g.fillRect(ox + x, oy + y, 1, 1);
        }
      }
    }
    // Eyes, and a crown for Bosses, a blade glint for Heroes.
    const ey = oy + 4 + Math.floor(r() * 2);
    g.fillStyle = d.kind === 'hero' ? '#ffffff' : '#ff3b3b';
    g.fillRect(W / 2 - 3, ey, 1, 2);
    g.fillRect(W / 2 + 2, ey, 1, 2);
    if (d.kind === 'boss') {
      g.fillStyle = '#ffd34d';
      for (const x of [-4, -2, 0, 2]) g.fillRect(W / 2 + x, oy - 3, 1, 3);
      g.fillRect(W / 2 - 4, oy - 1, 8, 1);
    }
    if (d.kind === 'hero') {
      g.fillStyle = '#dfe8f5';
      g.fillRect(W / 2 + 8, oy + 8, 1, 9);
      g.fillRect(W / 2 + 7, oy + 15, 3, 1);
    }
    const url = c.toDataURL();
    cache.set(id, url);
    return url;
  };

  /** The card back, drawn once. */
  ui.back = () => {
    if (cache.has('back')) return cache.get('back');
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#2a1830';
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) for (let x = (y / 4) % 2 ? 0 : 2; x < W; x += 4) {
      g.fillStyle = '#3a2242';
      g.fillRect(x, y, 2, 2);
    }
    g.fillStyle = '#c9a227';
    g.fillRect(8, 20, 24, 16);
    g.fillStyle = '#2a1830';
    g.fillRect(10, 22, 20, 12);
    g.fillStyle = '#e8c14a';
    g.fillRect(16, 25, 2, 2);
    g.fillRect(22, 25, 2, 2);
    g.fillRect(17, 30, 6, 1);
    const url = c.toDataURL();
    cache.set('back', url);
    return url;
  };
})();
