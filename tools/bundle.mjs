// Empaqueta el juego para poder abrir index.html con doble clic (file://):
//  - dist/assets-data.js: manifest, créditos e imágenes incrustadas en base64
//  - dist/game.js: todo el código en un único script clásico (esbuild)
// Uso: node tools/bundle.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const manifest = JSON.parse(readFileSync('assets/manifest.json', 'utf8'));
const credits = JSON.parse(readFileSync('assets/credits.json', 'utf8'));
const images = {};
for (const kind of Object.keys(manifest)) {
  for (const v of Object.values(manifest[kind])) {
    images[v.file] = 'data:image/png;base64,' + readFileSync('assets/' + v.file).toString('base64');
  }
}
mkdirSync('dist', { recursive: true });
writeFileSync('dist/assets-data.js', '// Generado por tools/bundle.mjs\nwindow.__DBS_ASSETS = ' + JSON.stringify({ manifest, credits, images }) + ';\n');
execSync('npx -y esbuild@0.23.1 src/main.js --bundle --format=iife --target=es2020 --minify --outfile=dist/game.js', { stdio: 'inherit' });
console.log('Listo: dist/assets-data.js y dist/game.js');
