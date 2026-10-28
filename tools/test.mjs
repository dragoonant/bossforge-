// Runs tests.html's script list headless under node:vm (CLAUDE.md rule 11: one script list).
//   node tools/test.mjs [--quiet] [--filter text]
import { load, scriptList } from './load.mjs';

const quiet = process.argv.includes('--quiet');
const fi = process.argv.indexOf('--filter');
const filter = fi < 0 ? undefined : process.argv[fi + 1];

const { engine, ui } = scriptList('tests.html');
const BF = load([...engine, ...ui]);
const r = BF.T.runAll(filter);
for (const l of r.lines) if (!quiet || !l.ok) console.log(l.text);
console.log(`tests: ${r.total - r.failed}/${r.total} passed`);
process.exit(r.failed ? 1 : 0);
