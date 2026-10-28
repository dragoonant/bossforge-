// Rewrites every local <script src> and stylesheet in index.html to carry ?v=<content hash>, so a
// returning player never mixes a new page with a cached old script (LESSONS-DIGEST §8).
//   node tools/stamp-assets.mjs          rewrite
//   node tools/stamp-assets.mjs --check  fail if any stamp is stale
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './load.mjs';

const check = process.argv.includes('--check');
const page = join(root, 'index.html');
const html = readFileSync(page, 'utf8');
const hash = (f) => createHash('sha256').update(readFileSync(join(root, f))).digest('hex').slice(0, 10);
let stale = 0;
const out = html.replace(/(src|href)="((?:js|data)\/[^"?]+\.js|styles\.css)(?:\?v=([0-9a-f]+))?"/g, (m, attr, file, v) => {
  const h = hash(file);
  if (v !== h) stale++;
  return `${attr}="${file}?v=${h}"`;
});
if (check) {
  if (stale) {
    console.log(`stamp-assets: ${stale} stale stamp(s); run node tools/stamp-assets.mjs`);
    process.exit(1);
  }
  console.log('stamp-assets: ok');
} else {
  writeFileSync(page, out);
  console.log(`stamp-assets: ${stale} stamp(s) updated`);
}
