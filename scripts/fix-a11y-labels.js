// Correcciones de accesibilidad en las 21 herramientas:
//   1. Nombre accesible en el botón de cerrar del modal de ayuda.
//   2. Nombre accesible en los botones de solo icono (pantalla completa,
//      reinicio y los cuatro cuadrantes de Simon).
//   3. Encabezado principal <h1> en la jerarquía del documento.
//   4. La barra de estadísticas de Búsqueda Visual se anuncia al lector.
//
// Es idempotente: si el atributo ya está, no lo duplica.
//
// Uso: node scripts/fix-a11y-labels.js <directorio de herramientas>

import fs from 'node:fs';
import path from 'node:path';

const toolsDir = process.argv[2];
if (!toolsDir) {
  console.error('Uso: node scripts/fix-a11y-labels.js <directorio de herramientas>');
  process.exit(1);
}

const SIMON_LABELS = { 'simon-0': 'Cian', 'simon-1': 'Amarillo', 'simon-2': 'Rosa', 'simon-3': 'Azul' };

let touched = 0;

for (const entry of fs.readdirSync(toolsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(toolsDir, entry.name, 'index.html');
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  // 1. Botón de cerrar del modal de ayuda.
  html = html.replace(
    /<button class="info-modal-close"([^>]*)>/g,
    (m, attrs) => (attrs.includes('aria-label') ? m : `<button class="info-modal-close"${attrs} aria-label="Cerrar">`)
  );

  // 2. Botones de solo icono con nombre propio.
  html = html.replace(
    /<button class="fullscreen-btn"([^>]*)>/g,
    (m, attrs) => (attrs.includes('aria-label') ? m : `<button class="fullscreen-btn"${attrs} aria-label="Pantalla completa">`)
  );
  html = html.replace(
    /<button class="btn-secondary" onclick="tool\.reset\(\)"([^>]*)>/g,
    (m, attrs) => (attrs.includes('aria-label') ? m : `<button class="btn-secondary" onclick="tool.reset()"${attrs} aria-label="Reiniciar">`)
  );
  for (const [id, label] of Object.entries(SIMON_LABELS)) {
    html = html.replace(
      new RegExp(`<button id="${id}"([^>]*)>`, 'g'),
      (m, attrs) => (attrs.includes('aria-label') ? m : `<button id="${id}"${attrs} aria-label="${label}">`)
    );
  }

  // 3. Encabezado principal, tomado del nombre de la herramienta.
  if (!/<h1/.test(html)) {
    const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (h2) {
      const name = h2[1].replace(/\s+/g, ' ').trim();
      html = html.replace(/(<body[^>]*>)/, `$1\n  <h1 class="sr-only">${name}</h1>`);
    }
  }

  // 4. La barra de estadísticas de Búsqueda Visual se anuncia.
  if (entry.name === 'search') {
    html = html.replace(
      /<div class="stats-bar">/g,
      '<div class="stats-bar" role="status" aria-live="polite">'
    );
  }

  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    touched++;
    console.log(`${entry.name}: corregido`);
  }
}
console.log(`Herramientas modificadas: ${touched}`);
