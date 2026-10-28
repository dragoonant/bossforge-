// Every gate, one line each (CLAUDE.md). Exit code is non-zero if any gate fails.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './load.mjs';

const steps = [
  ['tests', ['tools/test.mjs', '--quiet']],
  ['check-pages', ['tools/check-pages.mjs']],
  ['sim random', ['tools/sim.mjs', '--games', '60', '--policy', 'random', '--quiet']],
  ['sim ai', ['tools/sim.mjs', '--games', '30', '--policy', 'ai', '--quiet', '--seed', '900']],
  ['stamp-assets', ['tools/stamp-assets.mjs', '--check']],
  ['art-audition lint', ['tools/art-audition.mjs', '--dry-run', '--quiet']],
];
if (existsSync(join(root, 'scratch/wiki/list.json'))) steps.unshift(['build-printed', ['tools/build-printed.mjs']]);

let failed = 0;
for (const [name, args] of steps) {
  const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  const lines = `${r.stdout}${r.stderr}`.trim().split('\n');
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${lines[lines.length - 1]}`);
  if (!ok) console.log(lines.slice(0, 12).map((l) => `     ${l}`).join('\n'));
}

// Rules index: every "RB p<n> <Heading>" cited in js/ must be a row in docs/rules.md.
const index = readFileSync(join(root, 'docs/rules.md'), 'utf8');
const cited = new Set();
for (const dir of ['js', 'js/ui']) {
  for (const f of readdirSync(join(root, dir)).filter((x) => x.endsWith('.js'))) {
    for (const m of readFileSync(join(root, dir, f), 'utf8').matchAll(/RB p(\d+) ([A-Z][\w-]*)/g)) cited.add(`RB p${m[1]} ${m[2]}`);
  }
}
const missing = [...cited].filter((c) => !index.includes(c));
if (missing.length) failed++;
console.log(`${missing.length ? 'FAIL' : 'ok  '} rules-index: ${cited.size} cited rulebook tags${missing.length ? `, missing: ${missing.join('; ')}` : ', all indexed'}`);
process.exit(failed ? 1 : 0);
