// Structural gate: both entry points load the same engine files in the same order, every script
// exists, the printed pack stays out of tests, and the bypasses this series has paid for are absent.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { root, scriptList } from './load.mjs';

const problems = [];
const index = scriptList('index.html');
const tests = scriptList('tests.html');
const PRINTED = 'data/printed.js';

if (!index.engine.includes(PRINTED)) problems.push('index.html does not load data/printed.js');
if (tests.engine.includes(PRINTED)) problems.push('tests.html must not load data/printed.js (tests check our own words)');
const a = index.engine.filter((f) => f !== PRINTED).join('\n');
const b = tests.engine.join('\n');
if (a !== b) problems.push(`engine script lists differ:\nindex.html:\n${a}\ntests.html:\n${b}`);
for (const f of [...index.engine, ...index.ui, ...tests.engine, ...tests.ui]) if (!existsSync(join(root, f))) problems.push(`missing script ${f}`);

const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const read = (f) => strip(readFileSync(join(root, f), 'utf8'));
const jsFiles = (dir) => readdirSync(join(root, dir)).filter((f) => f.endsWith('.js')).map((f) => `${dir}/${f}`);

// CLAUDE.md rule 8: no silent fallbacks in UI code.
for (const f of jsFiles('js/ui')) {
  const src = read(f);
  if (/if\s*\(\s*!\s*BF\.\w+\s*\)/.test(src)) problems.push(`${f}: silent fallback "if (!BF.x)"`);
  if (/BF\.\w+\s*\|\|\s*\{\s*\}/.test(src)) problems.push(`${f}: silent fallback "BF.x || {}"`);
}
// CLAUDE.md rule 10: one log door.
for (const f of [...jsFiles('js'), ...jsFiles('js/ui')]) {
  const src = read(f);
  if (/\.log\.push\(/.test(src) && f !== 'js/engine.js') problems.push(`${f}: writes s.log directly; use BF.log`);
  if (/s\.discard\.push\(/.test(src) && f !== 'js/engine.js') problems.push(`${f}: pushes to the discard pile directly; use BF.discardCard`);
  if (/\.dungeon\[[^\]]+\]\.push\(/.test(src) && f !== 'js/engine.js') problems.push(`${f}: builds into a dungeon directly; use BF.buildRoom`);
}
// PLAN D15: every card in the data has its own art plate, and a plate is drawn only once.
{
  const ids = [...readFileSync(join(root, 'data/cards.js'), 'utf8').matchAll(/"id":\s*"(BMR\d{3})"/g)].map((m) => m[1]);
  const plates = index.ui.filter((f) => /cardart\d*\.js$/.test(f)).flatMap((f) => [...read(f).matchAll(/\bART\.(BMR\d{3})\s*=/g)].map((m) => m[1]));
  for (const id of new Set(ids)) if (!plates.includes(id)) problems.push(`no art plate for ${id}`);
  for (const id of plates) if (plates.indexOf(id) !== plates.lastIndexOf(id)) problems.push(`art plate for ${id} drawn twice`);
  if (!ids.length) problems.push('read no card ids from data/cards.js');
}
// The engine never touches the DOM.
for (const f of index.engine.filter((x) => x.startsWith('js/'))) {
  if (/\bdocument\.|\bwindow\./.test(read(f))) problems.push(`${f}: engine file touches the DOM`);
}

if (problems.length) {
  console.log(`check-pages: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`check-pages: ok (${index.engine.length} engine + ${index.ui.length} ui scripts, lists match)`);
