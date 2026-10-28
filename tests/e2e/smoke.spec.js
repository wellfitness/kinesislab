import { test, expect } from '@playwright/test';

const TOOLS = [
  'arrows', 'boxing', 'clock', 'colores', 'comba', 'd50',
  'flechas', 'fluency', 'go-nogo', 'list-sorting', 'matrix',
  'memoria', 'nback', 'reactive', 'search', 'simon', 'sonidos',
  'sort', 'timers', 'trace', 'tracking'
];

const PAGES = [
  { name: 'landing', path: '/index.html' },
  { name: 'dashboard', path: '/src/herramientas/vanilla/dashboard.html' },
  { name: 'acerca', path: '/src/herramientas/vanilla/acerca.html' },
  { name: 'ranking', path: '/src/herramientas/vanilla/ranking.html' },
  ...TOOLS.map(t => ({ name: `tool:${t}`, path: `/src/herramientas/vanilla/tools/${t}/index.html` }))
];

for (const p of PAGES) {
  test(`${p.name} carga sin errores de consola`, async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    // La prueba no debe depender de la red externa. Una hoja de estilos de
    // Google Fonts bloquea DOMContentLoaded, así que si la red falla o va
    // lenta la navegación se queda colgada hasta el timeout de 30 s y la
    // prueba falla de forma intermitente y siempre en una página distinta.
    // Se responde con una hoja vacía: sin reglas @font-face el navegador ni
    // siquiera pide los ficheros de fuente, y no queda ningún error en consola.
    const emptyCss = { status: 200, contentType: 'text/css', body: '' };
    await page.route('**://fonts.googleapis.com/**', route => route.fulfill(emptyCss));
    await page.route('**://fonts.gstatic.com/**', route => route.fulfill(emptyCss));

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignorar fallos triviales en servidor estatico Python (sin SW, sin .well-known en local)
        if (text.includes('Failed to load resource') && text.match(/(manifest\.json|favicon|apple-touch|sw\.js|assetlinks)/)) return;
        consoleErrors.push(text);
      }
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    const response = await page.goto(p.path, { waitUntil: 'domcontentloaded' });
    expect(response, `${p.name}: sin response`).not.toBeNull();
    expect(response.status(), `${p.name}: status ${response.status()}`).toBeLessThan(400);

    // dar tiempo a scripts diferidos
    await page.waitForTimeout(400);

    expect(pageErrors, `${p.name} page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `${p.name} console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
}
