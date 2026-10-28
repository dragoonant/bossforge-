// The art audition (PLAN D7): one representative card rendered in ten directions, all within the
// owner's brief "MGSD style with original 16-bit art", on the local Flux Studio (FLUX.2 klein,
// docs/lessons/local-ai-studios.md). The owner picks one; it becomes the STYLE constant for every card.
//
//   node tools/art-audition.mjs --dry-run            print the plan and all prompts; no network
//   node tools/art-audition.mjs                      render all ten (one GPU job at a time)
//   node tools/art-audition.mjs --only 03 --seed-bump 1   redo one direction
//   node tools/art-audition.mjs --subject room       audition on a Room instead of a Boss
//   FLUX=http://localhost:7880 overrides the studio address.
//
// Output: art/audition/out/<nn>-<slug>.png plus index.html (a labelled contact sheet). The output
// folder is gitignored; commit only the chosen direction's STYLE text, back into PLAN.md.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './load.mjs';

const args = process.argv.slice(2);
const flag = (k) => args.includes(`--${k}`);
const val = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const DRY = flag('dry-run');
const QUIET = flag('quiet');
const ONLY = val('only', null);
const BUMP = Number(val('seed-bump', 0));
const FLUX = process.env.FLUX || 'http://localhost:7880';
const OUT = join(root, 'art/audition/out');

// Shared by every direction: the MGSD figure standard (local-ai-studios.md, approved 2026-10-05)
// written in plain words, and the card's own subject and setting (never the card's name).
const FIGURE =
  'super-deformed figure about two and a half heads tall, oversized head about forty percent of its height, tiny torso, short stubby legs with big chunky boots, short arms with oversized hands, crisp hard-surface armor plating with panel lines and rivets';
const SUBJECTS = {
  boss: 'a frog monarch villain with a jeweled crown and a three-pronged spear, seated on a throne of pipes in a flooded sewer vault, green slime pools and dripping arches behind it',
  room: 'a cramped goblin armory chamber inside a stone dungeon, racks of crude spears and shields, a squat goblin quartermaster polishing an axe by torchlight',
};
const SUBJECT = SUBJECTS[val('subject', 'boss')] || SUBJECTS.boss;
const TAIL = 'full-bleed vertical card illustration, wordless and untitled, crisp pixel grid, centered character, readable silhouette at small size';

// The ten directions. Each is a complete STYLE line; the winner is copied verbatim into PLAN.md.
const DIRECTIONS = [
  ['01', 'jrpg-battle', 'sixteen-bit console role-playing-game battle sprite pixel art, clean dark outlines, thirty-two color palette, soft two-tone shading, bright saturated colors'],
  ['02', 'arcade-fighter', 'nineties arcade fighting-game pixel art, large detailed sprite, chunky three-step shading, bold black outlines, dramatic rim light, high contrast'],
  ['03', 'dithered-console', 'sixteen-bit home console pixel art with ordered dithering gradients, limited sixty-four color palette, punchy contrast, slightly gritty texture'],
  ['04', 'handheld-bright', 'thirty-two-bit handheld pixel art, bright candy palette, soft colored outlines instead of black, smooth cel shading, cheerful lighting'],
  ['05', 'gothic-castle', 'gothic sixteen-bit action-platformer pixel art, muted purples and blood reds, deep shadows, moonlit stone, ornate detail, moody atmosphere'],
  ['06', 'isometric-tactics', 'isometric tactics role-playing-game pixel art, three-quarter top-down view of the figure on a tiled stone floor, painterly pixel shading, warm palette'],
  ['07', 'hd-indie', 'modern high-definition pixel art, large pixel canvas, many hues, colored rim lighting, subpixel detail, glowing effects, polished indie-game look'],
  ['08', 'pc98-anime', 'nineteen-nineties Japanese computer pixel art, sixteen-color palette, anime-style faces, heavy dithered shading, sharp highlights on armor'],
  ['09', 'dungeon-diorama', 'pixel art dungeon cutaway diorama, the figure standing inside a single cross-section room tile with visible brick walls and floor, side view, crisp sixteen-bit palette'],
  ['10', 'trading-card-pixel', 'collectible card game key art rendered as sixteen-bit pixel art, dynamic heroic pose, bold black outlines, vivid gradient sky glow behind the figure, high detail'],
];

// Prompt lint (LESSONS-DIGEST §8, CROSS-PROJECT-LESSONS §5.3): refuse before any GPU time is spent.
const BANNED = [
  // names: the game, the publisher, characters, franchises, studios, consoles by brand
  /boss monster/i, /brotherwise/i, /king croak/i, /croak/i, /draculord/i, /nintendo|sega|snes|genesis|mega drive|capcom|square|konami|castlevania|final fantasy|street fighter|zelda|gundam/i,
  /in the style of/i, /\bartist\b/i,
  // negations draw the noun they negate
  /\bno\b|\bnot\b|\bwithout\b|\bnever\b/i,
  // text magnets
  /\b(sign|banner|logo|text|letters?|title card|label|caption|signature|watermark|book|scroll|map|poster|emblem|insignia|flag)\b/i,
  // counts above two
  /\b(three|four|five|six|seven|eight|nine|ten)\s+(figures|people|heroes|monsters|goblins)\b/i,
];
const lint = (p) => BANNED.filter((re) => re.test(p)).map((re) => re.source);

const plan = DIRECTIONS.filter(([n]) => !ONLY || ONLY === n).map(([n, slug, style], i) => ({
  n,
  slug,
  style,
  seed: 4100 + i + BUMP * 1000,
  prompt: `${style}. ${FIGURE}. ${SUBJECT}. ${TAIL}.`,
}));

const problems = [];
for (const p of plan) for (const hit of lint(p.prompt)) problems.push(`${p.n} ${p.slug}: matches /${hit}/`);
for (const part of [FIGURE, SUBJECT, TAIL]) for (const hit of lint(part)) problems.push(`shared clause matches /${hit}/`);
if (problems.length) {
  console.log(`art-audition: prompt lint failed\n${problems.join('\n')}`);
  process.exit(1);
}

if (DRY) {
  if (!QUIET) {
    console.log(`Studio: ${FLUX}  model: klein  aspect: 2:3  output: art/audition/out/\n`);
    for (const p of plan) console.log(`[${p.n}] ${p.slug}  seed ${p.seed}\n${p.prompt}\n`);
  }
  console.log(`art-audition: ${plan.length} direction(s) planned, lint clean, dry run (no network)`);
  process.exit(0);
}

const j = async (url, opts) => {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
};

mkdirSync(OUT, { recursive: true });
try {
  await j(`${FLUX}/api/settings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ freeAfter: false }) });
} catch (e) {
  console.log(`Flux Studio is not reachable at ${FLUX} (${e.message}). Start it, or set FLUX=<url>.`);
  process.exit(1);
}
for (const p of plan) {
  const file = join(OUT, `${p.n}-${p.slug}.png`);
  if (existsSync(file) && !flag('force') && !ONLY) {
    console.log(`[${p.n}] exists, skipped (use --force or --only ${p.n})`);
    continue;
  }
  const t0 = Date.now();
  const job = await j(`${FLUX}/api/jobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'klein', prompt: p.prompt, aspect: '2:3', megapixels: 1, batch: 1, seed: p.seed }),
  });
  let st;
  for (;;) {
    await new Promise((r) => setTimeout(r, 1500));
    st = await j(`${FLUX}/api/jobs/${job.id}`);
    if (st.status === 'done' || st.status === 'error' || st.status === 'failed') break;
  }
  if (st.status !== 'done' || !st.images?.length) throw new Error(`[${p.n}] job ${job.id} ended as ${st.status}`);
  const img = await fetch(`${FLUX}/files/${job.id}/${st.images[0]}`);
  writeFileSync(file, Buffer.from(await img.arrayBuffer()));
  console.log(`[${p.n}] ${p.slug}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

// Contact sheet: labelled tiles, the style line under each, for picking at a glance.
const tiles = DIRECTIONS.map(
  ([n, slug, style]) =>
    `<figure><img src="${n}-${slug}.png" alt=""><figcaption><b>${n} ${slug}</b><br><small>${style}</small></figcaption></figure>`,
).join('\n');
writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>BossForge art audition</title>
<style>body{background:#151018;color:#eee;font:14px system-ui;margin:20px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}
img{width:100%;aspect-ratio:2/3;object-fit:cover;image-rendering:pixelated;border-radius:10px;background:#000}small{color:#aaa}</style>
<h1>Art audition: MGSD + original 16-bit</h1><p>Subject: ${SUBJECT}</p><main>${tiles}</main>`,
);
console.log(`Contact sheet: ${join('art/audition/out', 'index.html')}`);
