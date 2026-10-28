// Transformación CSS: envuelve cada regla con ":hover" en un bloque
// @media (hover: hover), para que en táctil no quede el estado pegado
// después del toque. No toca @keyframes ni los selectores sin :hover.
//
// Es idempotente: una regla ya envuelta se reindenta, no se vuelve a envolver.
// El contenido que no cambia se conserva byte a byte.
//
// Uso: node scripts/wrap-hover.js <fichero.css> [...]

import fs from 'node:fs';

const HOVER_QUERY = '(hover: hover)';

function splitTopLevel(css) {
  // Divide en bloques de primer nivel: reglas, @media y @keyframes.
  const parts = [];
  let i = 0;
  let depth = 0;
  let start = 0;
  let inString = null;
  let inComment = false;

  while (i < css.length) {
    const ch = css[i];
    const next = css[i + 1];

    if (inComment) {
      if (ch === '*' && next === '/') { inComment = false; i += 2; continue; }
      i++; continue;
    }
    if (inString) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === inString) inString = null;
      i++; continue;
    }
    if (ch === '/' && next === '*') { inComment = true; i += 2; continue; }
    if (ch === '"' || ch === "'") { inString = ch; i++; continue; }
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') {
      depth--;
      // Solo corta en el cierre de primer nivel: las llaves internas de un
      // bloque @media pertenecen a la regla que contiene.
      if (depth === 0) {
        parts.push({ text: css.slice(start, i + 1) });
        start = i + 1;
      }
      i++; continue;
    }
    if (depth === 0 && ch === ';') {
      const text = css.slice(start, i + 1);
      if (text.trim()) parts.push({ text, statement: true });
      start = i + 1;
      i++; continue;
    }
    i++;
  }
  const tail = css.slice(start);
  if (tail.trim()) parts.push({ text: tail, statement: true });
  return parts;
}

function indentBody(body, indent) {
  // Reindenta preservando la indentación relativa entre líneas.
  const lines = body.split('\n').filter(l => l.trim() !== '');
  if (!lines.length) return '';
  const min = Math.min(...lines.map(l => l.match(/^[ \t]*/)[0].length));
  return lines.map(l => indent + l.slice(min).trimEnd()).join('\n');
}

function isHoverQuery(query) {
  return query.replace(/\s+/g, ' ').trim().toLowerCase() === HOVER_QUERY;
}

function transform(css, inHover, stats, base) {
  const parts = splitTopLevel(css);
  let out = '';

  for (const part of parts) {
    const text = part.text;
    if (part.statement) { out += text; continue; }

    const m = text.match(/^(\s*)([^{]+)\{([\s\S]*)\}\s*$/);
    if (!m) { out += text; continue; }

    const [, rawIndent, selector, body] = m;
    const sel = selector.trim();
    // Saltos de línea que preceden a la regla; la sangría la aporta `base`.
    const lead = inHover ? '\n' : rawIndent.replace(/[^\n]/g, '');

    // --- Bloque @media ---
    if (/^@media\b/i.test(sel)) {
      const query = selector.replace(/^@media/i, '');
      const hover = isHoverQuery(query);
      const changesBefore = stats.wrapped + stats.reformatted;
      const inner = transform(body, hover || inHover, stats, base + '  ')
        .replace(/^\n+/, '')
        .replace(/\n+$/, '');
      if (stats.wrapped + stats.reformatted === changesBefore) { out += text; continue; }
      out += `${lead}${base}@media ${query.trim()} {\n${inner}\n${base}}`;
      continue;
    }

    // --- Regla con :hover fuera de un bloque hover ---
    if (sel.includes(':hover') && !inHover) {
      // Una lista de selectores puede mezclar estados. Solo los selectores
      // con :hover van dentro del envoltorio: encerrar también un
      // :focus-visible dejaría el indicador de foco sin efecto en táctil,
      // donde (hover: hover) no se cumple.
      const parts = sel.split(',').map(s => s.trim()).filter(Boolean);
      const hoverParts = parts.filter(s => s.includes(':hover'));
      const otherParts = parts.filter(s => !s.includes(':hover'));

      if (otherParts.length) {
        out += `${lead}${base}${otherParts.join(',\n' + base)} {\n${indentBody(body, base + '  ')}\n${base}}\n`;
      }
      stats.wrapped += hoverParts.length;
      out += `${lead}${base}@media ${HOVER_QUERY} {\n`
           + hoverParts.map(p => `${base}  ${p} {\n${indentBody(body, base + '    ')}\n${base}  }\n`).join('')
           + `${base}}\n`;
      continue;
    }

    // --- Regla dentro de un bloque hover: solo se reindenta ---
    if (inHover) {
      const reindented = `${lead}${base}${sel} {\n${indentBody(body, base + '  ')}\n${base}}`;
      if (reindented !== text) stats.reformatted++;
      out += reindented;
      continue;
    }

    out += text;
  }
  return out;
}

let total = 0;
for (const file of process.argv.slice(2)) {
  const raw = fs.readFileSync(file, 'utf8');
  // El repositorio almacena LF (.gitattributes: * text=auto eol=lf).
  const css = raw.replace(/\r\n/g, '\n');

  if (file.endsWith('.html')) {
    // Los bloques <style> inline de las herramientas llevan sus propias
    // reglas :hover, que también deben quedar dentro del envoltorio.
    let changed = 0;
    const out = css.replace(/<style>([\s\S]*?)<\/style>/g, (match, inner) => {
      const stats = { wrapped: 0, reformatted: 0 };
      let body = transform(inner, false, stats, '').replace(/\n(?:[ \t]*\n){2,}/g, '\n\n');
      if (!body.endsWith('\n')) body += '\n';
      changed += stats.wrapped;
      return `<style>${body}</style>`;
    });
    fs.writeFileSync(file, out, 'utf8');
    total += changed;
    console.log(`${file}: ${changed} reglas :hover envueltas`);
    continue;
  }

  const stats = { wrapped: 0, reformatted: 0 };
  let out = transform(css, false, stats, '');
  // Normaliza las separaciones: como máximo una línea en blanco entre reglas.
  out = out.replace(/\n(?:[ \t]*\n){2,}/g, '\n\n');
  if (!out.endsWith('\n')) out += '\n';
  fs.writeFileSync(file, out, 'utf8');
  total += stats.wrapped;
  console.log(`${file}: ${stats.wrapped} reglas :hover envueltas, ${stats.reformatted} reindentadas`);
}
console.log(`Total: ${total}`);
