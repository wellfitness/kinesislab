// Verificación del BUNDLE ANDROID (android/app/src/main/assets).
//
// El bundle es lo que se empaqueta en el APK. Puede quedar desincronizado
// con la fuente sin que se note: el commit que introdujo SessionStats
// dejo fuera del bundle session-stats.js, session-stats-ui.js y
// design-tokens.css, y la app publicada salio sin estadisticas, sin ranking
// y con las paginas legales sin estilos.
//
// Esta comprobacion sirve el bundle tal cual esta en disco, carga las
// paginas dentro del APK y falla si:
//   - alguna peticion local responde 404
//   - alguna pagina registra un error de consola
//   - las variables CSS de diseño no resuelven
//   - window.SessionStats o SessionStatsUI no estan disponibles
//
// Uso: node scripts/verify-bundle.mjs

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(process.cwd());
const BUNDLE = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets');
const PORT = 4192;

if (!fs.existsSync(BUNDLE)) {
  console.error('ERROR: no existe el bundle. Ejecuta antes scripts/sync-android-assets.sh');
  process.exit(1);
}

// Paginas del APK: la entrada real es el dashboard, no index.html.
// `stats` no se fija a mano: se deduce del propio HTML. Si la pagina
// referencia session-stats.js, esa libreria tiene que estar disponible.
const PAGES = [
  { url: '/src/herramientas/vanilla/dashboard.html' },
  { url: '/src/herramientas/vanilla/acerca.html' },
  { url: '/src/herramientas/vanilla/ranking.html' },
  { url: '/legal.html' },
  { url: '/privacy.html' }
];

// Se recorren tambien todas las herramientas del bundle.
const TOOLS_DIR = path.join(BUNDLE, 'src', 'herramientas', 'vanilla', 'tools');
if (fs.existsSync(TOOLS_DIR)) {
  for (const tool of fs.readdirSync(TOOLS_DIR).sort()) {
    PAGES.push({ url: `/src/herramientas/vanilla/tools/${tool}/index.html` });
  }
}

// El HTML del bundle es el que decide: se lee el fichero del disco.
// Se miran los src exactos, porque session-stats-ui.js contiene el nombre
// de session-stats.js como subcadena y las dos librerías son distintas.
function cargaScript(url, nombre) {
  const file = path.join(BUNDLE, url.replace(/^\//, ''));
  if (!fs.existsSync(file)) return false;
  return new RegExp(`src="[^"]*/${nombre.replace('.', '\\.')}\\?v=`).test(fs.readFileSync(file, 'utf8'));
}

const server = spawn('python', [path.join(ROOT, 'scripts', 'serve.py'), String(PORT)], {
  cwd: BUNDLE, stdio: 'ignore'
});
await new Promise(r => setTimeout(r, 1500));

const browser = await chromium.launch();
let fallos = 0;

console.log(`=== VERIFICACION DEL BUNDLE ANDROID ===\n`);

for (const p of PAGES) {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  const errores = [];
  const rotas = [];
  const esperaStats = cargaScript(p.url, 'session-stats.js');
  const esperaStatsUI = cargaScript(p.url, 'session-stats-ui.js');

  page.on('console', m => { if (m.type() === 'error') errores.push(m.text().slice(0, 140)); });
  page.on('pageerror', e => errores.push('PAGEERROR: ' + String(e.message).slice(0, 140)));
  page.on('response', r => {
    if (r.status() >= 400) rotas.push(`${r.url().split('/').pop()} -> HTTP ${r.status()}`);
  });

  await page.goto(`http://127.0.0.1:${PORT}${p.url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--turquesa-600)';
    document.body.appendChild(probe);
    const turquesa = getComputedStyle(probe).color;
    probe.remove();
    return {
      turquesa,
      sessionStats: typeof window.SessionStats,
      sessionStatsUI: typeof window.SessionStatsUI
    };
  });

  const problemas = [];
  if (rotas.length) problemas.push(`referencias rotas: ${rotas.join(', ')}`);
  if (errores.length) problemas.push(`errores de consola: ${errores.join(' | ')}`);
  if (info.turquesa !== 'rgb(0, 190, 200)') {
    problemas.push(`--turquesa-600 no resuelve (${info.turquesa})`);
  }
  if (esperaStats && info.sessionStats !== 'object') {
    problemas.push(`window.SessionStats = ${info.sessionStats}`);
  }
  if (esperaStatsUI && info.sessionStatsUI !== 'object') {
    problemas.push(`window.SessionStatsUI = ${info.sessionStatsUI}`);
  }

  if (problemas.length) {
    fallos++;
    console.log(`--- ${p.url} ---`);
    for (const pr of problemas) console.log(`  FALLA: ${pr}`);
  } else {
    console.log(`ok  ${p.url}`);
  }
  await page.close();
}

await browser.close();
server.kill();

console.log('');
if (fallos) {
  console.error(`FALLAN ${fallos} de ${PAGES.length} paginas del bundle.`);
  process.exit(1);
}
console.log(`Las ${PAGES.length} paginas del bundle cargan limpias.`);
