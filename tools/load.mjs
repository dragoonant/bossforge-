// Loads the engine half of index.html (or a page's whole script list) into a node:vm context, so
// tools and tests run exactly the files the browser runs, in the same order.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The <script src> list of a page, split at the <!-- ui --> marker. */
export function scriptList(page) {
  const html = readFileSync(join(root, page), 'utf8');
  const marker = html.indexOf('<!-- ui -->');
  const srcs = (part) => [...part.matchAll(/<script\s+src="([^"?]+)(?:\?[^"]*)?"/g)].map((m) => m[1]);
  return marker < 0 ? { engine: srcs(html), ui: [] } : { engine: srcs(html.slice(0, marker)), ui: srcs(html.slice(marker)) };
}

/** A fresh context with `files` evaluated in order; returns its BF namespace. */
export function load(files) {
  const ctx = { console, structuredClone };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
  return ctx.BF;
}

/** The engine exactly as tests.html loads it (no printed text pack). */
export const loadEngine = () => load(scriptList('tests.html').engine);
