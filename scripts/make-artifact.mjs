// Turn the single-file Vite build into an Artifact page body:
// the Artifact publisher wraps the page in its own <!doctype>/<head>/<body>,
// so we emit only <title>, font links, the inlined <style>, the mount point
// and the inlined module script.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'dist/index.html'), 'utf8');

const pick = (re, label) => {
  const all = [...html.matchAll(re)].map((m) => m[0]);
  if (!all.length) throw new Error(`missing ${label} in dist/index.html`);
  return all;
};

const title = pick(/<title>[\s\S]*?<\/title>/g, 'title')[0];
const links = [...html.matchAll(/<link[^>]+(fonts\.googleapis|fonts\.gstatic)[^>]*>/g)].map((m) => m[0]);
const styles = pick(/<style[^>]*>[\s\S]*?<\/style>/g, 'style');
const scripts = pick(/<script type="module"[^>]*>[\s\S]*?<\/script>/g, 'script');

const out = [
  title,
  '<meta name="theme-color" content="#0b0820">',
  ...links,
  ...styles,
  '<div id="app"></div>',
  ...scripts.map((s) => s.replace(/\s+crossorigin(?=[\s>])/, '')),
  '',
].join('\n');

mkdirSync(resolve(root, 'artifact'), { recursive: true });
const dest = resolve(root, 'artifact/dopaverse.html');
writeFileSync(dest, out);
console.log(`wrote ${dest} (${(out.length / 1024).toFixed(0)} KB)`);
