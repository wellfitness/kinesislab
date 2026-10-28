// Sube el versionador (?v=) de los recursos compartidos que han cambiado,
// para que el navegador no sirva la versión cacheada.
//
// Solo actúa sobre la fuente; el bundle de Android lo regenera
// scripts/sync-android-assets.sh.
//
// Uso: node scripts/bump-asset-versions.js <version>

import fs from 'node:fs';
import path from 'node:path';

const version = process.argv[2];
if (!version) {
  console.error('Uso: node scripts/bump-asset-versions.js <version>');
  process.exit(1);
}

const ROOT = path.resolve(process.cwd());
const TARGETS = ['tts-bridge.js', 'session-stats-ui.js', 'tool-base.css', 'dashboard.css'];
const SOURCE_DIRS = ['src/herramientas/vanilla'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = [];
for (const dir of SOURCE_DIRS) files.push(...walk(path.join(ROOT, dir)));
files.push(path.join(ROOT, 'index.html'));

let changed = 0;
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  let out = html;
  for (const target of TARGETS) {
    const re = new RegExp(`(${target.replace('.', '\\.')}\\?v=)([0-9.]+)`, 'g');
    out = out.replace(re, `$1${version}`);
  }
  if (out !== html) {
    fs.writeFileSync(file, out, 'utf8');
    changed++;
  }
}
console.log(`Versionador actualizado a ${version} en ${changed} ficheros.`);
