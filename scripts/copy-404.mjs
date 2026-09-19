import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'frontend', 'dist', 'index.html');
const out = join(root, 'frontend', 'dist', '404.html');

copyFileSync(src, out);
console.log(`copied ${src} -> ${out}`);