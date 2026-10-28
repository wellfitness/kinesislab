// Verificación en navegador de los puntos críticos del arreglo:
//   - contraste real (calculado desde el render) del botón principal
//   - tamaño real de los controles táctiles
//   - fuente real de los campos de formulario
//   - presencia y funcionamiento del control global de voz
//
// Uso: node scripts/verify-ui.mjs

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(process.cwd());
const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(ROOT, 'docs', 'capturas');

function luminance(rgb) {
  const c = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function parseRgb(value) {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map(s => parseFloat(s.trim()));
  return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 };
}

function blend(fg, bg) {
  return fg.rgb.map((v, i) => v * fg.a + bg[i] * (1 - fg.a));
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = spawn('python', [path.join(ROOT, 'scripts', 'serve.py'), String(PORT)], {
    cwd: ROOT, stdio: 'ignore'
  });
  await new Promise(r => setTimeout(r, 1200));

  const browser = await chromium.launch();
  const results = [];

  const TOOLS = ['arrows', 'boxing', 'clock', 'colores', 'comba', 'd50', 'flechas', 'fluency',
    'go-nogo', 'list-sorting', 'matrix', 'memoria', 'nback', 'reactive', 'search', 'simon',
    'sonidos', 'sort', 'timers', 'trace', 'tracking'];

  const PAGES = [
    { name: 'landing', path: '/index.html' },
    { name: 'dashboard', path: '/src/herramientas/vanilla/dashboard.html' },
    { name: 'acerca', path: '/src/herramientas/vanilla/acerca.html' },
    { name: 'ranking', path: '/src/herramientas/vanilla/ranking.html' },
    { name: 'legal', path: '/legal.html' },
    { name: 'privacy', path: '/privacy.html' },
    ...TOOLS.map(t => ({ name: `tool:${t}`, path: `/src/herramientas/vanilla/tools/${t}/index.html` }))
  ];

  try {
    for (const p of PAGES) {
      const label = `${p.name}-movil`;
      const width = 360;
      const height = 800;
      const url = p.path;
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const data = await page.evaluate(() => {
        const out = { controles: [], voice: null, overflowX: document.documentElement.scrollWidth > window.innerWidth };
        // Todos los controles interactivos visibles: botón, campo, selector
        // o enlace. Los enlaces también son zona de toque y deben medir al
        // menos 44px, y su foco tiene que ser visible.
        document.querySelectorAll('button, input, select, textarea, a[href], [role=button]')
          .forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;   // oculto
            const cs = getComputedStyle(el);
            const rec = {
              tag: el.tagName.toLowerCase(),
              id: el.id || el.className.split(' ')[0] || '(sin id)',
              w: Math.round(r.width), h: Math.round(r.height),
              fontSize: parseFloat(cs.fontSize),
              bg: cs.backgroundColor, color: cs.color,
              inline: false
            };

            // Zona de toque efectiva: en un checkbox con etiqueta, la zona
            // real es la etiqueta, no la casilla.
            if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
              const lab = el.labels && el.labels.length ? el.labels[0] : null;
              if (lab) {
                const lr = lab.getBoundingClientRect();
                rec.effectiveW = Math.round(lr.width);
                rec.effectiveH = Math.round(lr.height);
              }
            }

            // Enlace en línea: dentro de un texto. WCAG 2.5.8 lo exime del
            // mínimo de 44px porque aumentarlo rompería la lectura. Se
            // detecta por dos señales: que el padre contenga más texto que
            // el propio enlace, o que el alto del enlace no supere el
            // interlineado del bloque que lo contiene (el tamaño está
            // ceñido al texto, no al objetivo).
            if (el.tagName === 'A' && el.parentElement) {
              const own = el.textContent.trim();
              const around = el.parentElement.textContent.trim();
              if (around.length > own.length + 2) rec.inline = true;
              const pcs = getComputedStyle(el.parentElement);
              const plh = parseFloat(pcs.lineHeight);
              const pfs = parseFloat(pcs.fontSize) || 16;
              const lineHeight = isNaN(plh) ? pfs * 1.2 : plh;
              if (r.height <= lineHeight + 1) rec.inline = true;
            }

            out.controles.push(rec);
          });
        const vr = document.getElementById('voiceRate');
        if (vr) {
          const r = vr.getBoundingClientRect();
          const warn = document.getElementById('voiceWarning');
          out.voice = {
            value: vr.value, label: document.getElementById('voiceRateLabel')?.textContent,
            w: Math.round(r.width), h: Math.round(r.height),
            // Visibilidad real: el atributo hidden no vence a display:flex.
            warningVisible: warn ? getComputedStyle(warn).display !== 'none' : false
          };
        }
        const btn = document.querySelector('.btn-primary');
        if (btn) {
          const cs = getComputedStyle(btn);
          out.primary = { bg: cs.backgroundColor, color: cs.color };
          // Fondo real detrás del botón: se sube por los ancestros hasta el
          // primero que aporta color, empezando por el padre.
          let el = btn.parentElement, bg = null;
          while (el && !bg) {
            const p = getComputedStyle(el).backgroundColor;
            const m = p.match(/rgba?\(([^)]+)\)/);
            if (m) {
              const parts = m[1].split(',').map(s => parseFloat(s.trim()));
              if (parts.length < 4 || parts[3] > 0) bg = { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 };
            }
            el = el.parentElement;
          }
          out.primaryBehind = bg ? bg.rgb : null;
        }
        return out;
      });

      const shot = path.join(SHOTS, `${label}.png`);
      await page.screenshot({ path: shot, fullPage: false });

      results.push({ label, ...data });
      await page.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }

  // Comprobación aparte: el aviso de voz en español, forzado a visible, para
  // confirmar que no se parte en columnas y que no desborda.
  {
    const server2 = spawn('python', [path.join(ROOT, 'scripts', 'serve.py'), String(PORT + 1)], {
      cwd: ROOT, stdio: 'ignore'
    });
    await new Promise(r => setTimeout(r, 1200));
    const browser2 = await chromium.launch();
    const page = await browser2.newPage({ viewport: { width: 360, height: 800 } });
    await page.goto(`http://127.0.0.1:${PORT + 1}/src/herramientas/vanilla/dashboard.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.evaluate(() => { document.getElementById('voiceWarning').hidden = false; });
    await page.waitForTimeout(200);
    const box = await page.evaluate(() => {
      const w = document.getElementById('voiceWarning');
      const r = w.getBoundingClientRect();
      return {
        visible: getComputedStyle(w).display !== 'none',
        w: Math.round(r.width), h: Math.round(r.height),
        scrollX: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    console.log(`--- aviso de voz forzado (360px) ---`);
    console.log(`  visible=${box.visible} tamaño=${box.w}x${box.h} scroll horizontal=${box.scrollX ? 'SÍ (mal)' : 'no'}`);
    await page.screenshot({ path: path.join(SHOTS, 'dashboard-aviso.png') });
    await browser2.close();
    server2.kill();
  }

  // Comprobación aparte: en contexto táctil real (hover:none) ninguna regla
  // :hover puede quedar fuera de @media (hover: hover), y ninguna regla
  // :focus-visible puede quedar encerrada dentro (el indicador de foco
  // desaparecería en tablet y móvil).
  {
    const server2 = spawn('python', [path.join(ROOT, 'scripts', 'serve.py'), String(PORT + 1)], {
      cwd: ROOT, stdio: 'ignore'
    });
    await new Promise(r => setTimeout(r, 1200));
    const browser2 = await chromium.launch();
    const TOUCH_PAGES = ['/legal.html', '/privacy.html', '/index.html',
      '/src/herramientas/vanilla/dashboard.html',
      '/src/herramientas/vanilla/tools/boxing/index.html',
      '/src/herramientas/vanilla/tools/matrix/index.html',
      '/src/herramientas/vanilla/tools/timers/index.html'];

    console.log('=== HOVER EN CONTEXTO TÁCTIL (hover: none) ===\n');
    for (const url of TOUCH_PAGES) {
      const context = await browser2.newContext({
        viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true
      });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${PORT + 1}${url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);
      const res = await page.evaluate(() => {
        const sueltos = [];      // :hover fuera del envoltorio
        const atrapados = [];    // :focus-visible dentro del envoltorio
        const recorrer = (reglas, enHover) => {
          for (const r of reglas) {
            if (r.media) {
              const esHover = r.conditionText && r.conditionText.replace(/\s+/g, ' ').trim().toLowerCase() === '(hover: hover)';
              recorrer(r.cssRules, enHover || esHover);
              continue;
            }
            if (!r.selectorText) continue;
            const partes = r.selectorText.split(',').map(s => s.trim()).filter(Boolean);
            const conHover = partes.filter(s => s.includes(':hover'));
            const conFoco = partes.filter(s => s.includes(':focus-visible'));
            if (conHover.length && !enHover) sueltos.push(...conHover);
            if (conFoco.length && enHover) atrapados.push(...conFoco);
          }
        };
        for (const sheet of document.styleSheets) {
          try { recorrer(sheet.cssRules, false); } catch { /* hoja externa no accesible */ }
        }
        return {
          hoverActivo: matchMedia('(hover: hover)').matches,
          sueltos, atrapados
        };
      });
      const ok = res.sueltos.length === 0 && res.atrapados.length === 0 && !res.hoverActivo;
      console.log(`--- ${url} ---`);
      console.log(`  (hover: hover) coincide: ${res.hoverActivo ? 'SÍ (mal en táctil)' : 'no'}`);
      console.log(`  :hover fuera del envoltorio: ${res.sueltos.length}${res.sueltos.length ? ' -> ' + res.sueltos.join(', ') : ''}`);
      console.log(`  :focus-visible encerrado: ${res.atrapados.length}${res.atrapados.length ? ' -> ' + res.atrapados.join(', ') : ''}`);
      console.log(`  veredicto: ${ok ? 'OK' : 'FALLA'}`);
      console.log('');
      await context.close();
    }
    await browser2.close();
    server2.kill();
  }

  console.log('\n=== VERIFICACIÓN EN NAVEGADOR ===\n');
  for (const r of results) {
    console.log(`--- ${r.label} ---`);
    if (r.primary) {
      const fg = parseRgb(r.primary.color);
      const bg = parseRgb(r.primary.bg);
      const behind = r.primaryBehind || [0, 0, 0];
      const bgSolid = blend(bg, behind);
      const ratio = contrast(fg.rgb, bgSolid);
      const border = contrast(bgSolid, behind);
      console.log(`  botón principal: texto ${r.primary.color} sobre ${r.primary.bg} -> ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? 'OK AA' : 'FALLA AA'}`);
      console.log(`  separación del fondo: ${border.toFixed(2)}:1 ${border >= 3 ? 'OK (WCAG 1.4.11)' : 'FALLA 1.4.11'}`);
    }
    const small = r.controles.filter(c => {
      if (c.inline) return false;   // enlace en línea: exento (WCAG 2.5.8)
      const w = c.effectiveW != null ? c.effectiveW : c.w;
      const h = c.effectiveH != null ? c.effectiveH : c.h;
      return w < 44 || h < 44;
    });
    const smallFont = r.controles.filter(c => ['input', 'select', 'textarea'].includes(c.tag) && c.fontSize < 16);
    console.log(`  controles < 44px: ${small.length}${small.length ? ' -> ' + small.map(s => `${s.tag}#${s.id}(${s.effectiveW ?? s.w}x${s.effectiveH ?? s.h})`).join(', ') : ''}`);
    console.log(`  campos con fuente < 16px: ${smallFont.length}${smallFont.length ? ' -> ' + smallFont.map(s => `${s.tag}#${s.id}(${s.fontSize}px)`).join(', ') : ''}`);
    console.log(`  scroll horizontal: ${r.overflowX ? 'SÍ (mal)' : 'no'}`);
    if (r.voice) {
      console.log(`  control de voz: valor=${r.voice.value} etiqueta=${r.voice.label} tamaño=${r.voice.w}x${r.voice.h} aviso=${r.voice.warningVisible ? 'visible' : 'oculto'}`);
    }
    console.log('');
  }
  console.log(`Capturas en ${SHOTS}`);
}

main().catch(e => { console.error(e); process.exit(1); });
