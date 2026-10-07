// Copy the single-file build to the places GitHub Pages can serve from:
// the repository root (index.html) and /docs (docs/index.html).
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const built = resolve(root, 'dist/dev.html');
mkdirSync(resolve(root, 'docs'), { recursive: true });
for (const dest of ['index.html', 'docs/index.html', 'dist/index.html']) copyFileSync(built, resolve(root, dest));
for (const dir of ['', 'docs']) writeFileSync(resolve(root, dir, '.nojekyll'), '');
console.log('site files updated: index.html, docs/index.html');
