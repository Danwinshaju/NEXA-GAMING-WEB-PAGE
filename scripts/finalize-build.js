import { copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
const source = resolve('dist/source.html'); const target = resolve('dist/index.html'); const fallback = resolve('dist/404.html');
if (!existsSync(source)) throw new Error('The Vite HTML output was not created.');
copyFileSync(source, target); copyFileSync(source, fallback); unlinkSync(source);
