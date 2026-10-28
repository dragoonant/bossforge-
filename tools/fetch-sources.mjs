// Refetches the raw sources listed in docs/sources.md into gitignored scratch/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'user-agent': 'Mozilla/5.0 (BossForge source fetch)' };
const SOURCES = [
  ['scratch/rules/BossMonsterRules10thAnniversary.pdf', 'https://brotherwisegames.com/s/BossMonsterRules10thAnniversary.pdf'],
  ['scratch/rules/AdvancedRulesGuideandFAQ.pdf', 'https://brotherwisegames.com/s/AdvancedRulesGuideandFAQ.pdf'],
  ['scratch/rules/BM_v12_unofficiallyofficialguide.pdf', 'https://brotherwisegames.com/s/BM_v12_unofficiallyofficialguide.pdf'],
  ['scratch/wiki/list.json', 'https://bossmonster.fandom.com/api.php?action=parse&page=List_of_Cards&prop=wikitext&format=json'],
];

for (const [file, url] of SOURCES) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), bytes);
  console.log(`${file}  ${bytes.length} bytes  ${new Date().toISOString().slice(0, 10)}`);
}
console.log('Text extraction: pdftotext <pdf> <txt> (see docs/sources.md).');
