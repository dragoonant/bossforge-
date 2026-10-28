// Headless games with invariants after every step. A crash gate and a behaviour readout, never a
// balance instrument (Brotherwise owns balance, CLAUDE.md regime 2).
//   node tools/sim.mjs --games 200 --policy random|ai --players 2|3|4|mixed --seed 1 [--quiet]
import { loadEngine } from './load.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i < 0 ? d : process.argv[i + 1];
};
const GAMES = Number(arg('games', 100));
const POLICY = arg('policy', 'random');
const PLAYERS = arg('players', 'mixed');
const SEED = Number(arg('seed', 1));
const QUIET = process.argv.includes('--quiet');
const CAP = 20000; // decisions per game before it counts as stalled

const BF = loadEngine();

/** Every card instance must be in exactly one place. */
function zoneAudit(s) {
  const seen = new Map();
  const put = (iid, where) => {
    if (seen.has(iid)) throw new Error(`card ${iid} (${s.cards[iid].id}) in ${seen.get(iid)} and ${where}`);
    seen.set(iid, where);
  };
  for (const z of ['bossDeck', 'roomDeck', 'spellDeck', 'heroDeck', 'discard', 'removed', 'town']) for (const i of s[z]) put(i, z);
  for (const p of s.players) {
    if (p.boss != null) put(p.boss, `boss${p.seat}`);
    else for (const i of p.bossOffer) put(i, `offer${p.seat}`);
    for (const i of p.hand) put(i, `hand${p.seat}`);
    for (const i of p.entrance) put(i, `entrance${p.seat}`);
    for (const x of p.score) put(x.iid, `score${p.seat}`);
    p.dungeon.forEach((st, k) => {
      if (!st.length) throw new Error(`empty slot ${k} in dungeon ${p.seat}`);
      for (const i of st) put(i, `dungeon${p.seat}`);
    });
    if (p.dungeon.length > BF.MAX_ROOMS) throw new Error(`dungeon ${p.seat} has ${p.dungeon.length} slots`);
  }
  for (const it of s.stack) if (it.kind === 'spell') put(it.src, 'stack');
  if (s.adv) put(s.adv.hero, 'adventuring');
  const total = Object.keys(s.cards).length;
  if (seen.size !== total) {
    const lost = Object.keys(s.cards).map(Number).filter((i) => !seen.has(i));
    throw new Error(`${total - seen.size} card(s) in no zone: ${lost.map((i) => s.cards[i].id).join(',')}`);
  }
  for (const c of Object.values(s.cards)) if (c.dmg != null && !Number.isFinite(c.dmg)) throw new Error(`NaN damage on ${c.id}`);
}

function pickRandom(s, acts, rnd) {
  return acts[Math.floor(rnd() * acts.length)];
}

function mulberry(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const stats = { games: 0, turns: 0, souls: 0, wounds: 0, decisions: 0, windowsAsked: 0, windowsActed: 0, buildTurns: 0, emptyBuildTurns: 0, byReason: {}, stalled: 0, levelUps: 0, casts: 0 };
const failures = [];

for (let g = 0; g < GAMES; g++) {
  const seed = SEED + g;
  const rnd = mulberry(seed * 7919);
  const n = PLAYERS === 'mixed' ? 2 + (g % 3) : Number(PLAYERS);
  let s = BF.newGame({ seed, players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, ai: true })) });
  let lastTurn = 0;
  let steps = 0;
  try {
    while (!BF.isTerminal(s)) {
      if (++steps > CAP) throw new Error('stalled');
      zoneAudit(s);
      if (s.turn < lastTurn) throw new Error('turn went backwards');
      lastTurn = s.turn;
      const acts = BF.legalActions(s);
      if (!acts.length) throw new Error('no legal action');
      const who = BF.whoActs(s);
      if (who == null || !s.players[who]) throw new Error('nobody acts');
      // Fuzz: every listed option must be accepted (1 decision in 20, on a clone).
      if (rnd() < 0.05) for (const a of acts) BF.apply(s, a);
      const kind = s.pending.kind;
      const a = POLICY === 'ai' ? BF.ai.choose(s, who) : pickRandom(s, acts, rnd);
      if (kind === 'window') {
        stats.windowsAsked++;
        if (a.v !== 'pass') stats.windowsActed++;
        if (a.v?.cast != null || a.v?.act != null) stats.casts++;
      }
      s = BF.apply(s, a);
      stats.decisions++;
    }
    zoneAudit(s);
    stats.games++;
    stats.turns += s.turn;
    for (const p of s.players) {
      stats.souls += BF.souls(s, p.seat);
      stats.wounds += BF.wounds(s, p.seat);
      if (p.leveled) stats.levelUps++;
      stats.buildTurns += s.turn;
    }
    const reason = s.players.some((p) => BF.souls(s, p.seat) >= BF.WIN_SOULS) ? 'souls' : s.players.some((p) => BF.wounds(s, p.seat) >= BF.MAX_WOUNDS) ? 'wounds' : 'heroes';
    stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
  } catch (e) {
    if (e.message === 'stalled') stats.stalled++;
    failures.push(`seed ${seed} (${n}p): ${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}`);
  }
}

const per = (x) => (stats.games ? (x / stats.games).toFixed(1) : '-');
const line = `sim ${POLICY} ${PLAYERS}p: ${stats.games}/${GAMES} finished, ${failures.length} failed; turns/game ${per(stats.turns)}, souls ${per(stats.souls)}, wounds ${per(stats.wounds)}, level-ups ${per(stats.levelUps)}, casts ${per(stats.casts)}, window act rate ${(stats.windowsActed / Math.max(1, stats.windowsAsked)).toFixed(2)}, ends ${JSON.stringify(stats.byReason)}`;
console.log(line);
if (failures.length && !QUIET) console.log(failures.slice(0, 5).join('\n\n'));
if (failures.length) process.exit(1);
