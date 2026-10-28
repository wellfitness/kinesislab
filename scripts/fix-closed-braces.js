// Reparación puntual: una pasada anterior del transformador dejó el cierre
// del bloque @media pegado al de la regla interior ("  }}"). Este script
// desdobla esos cierres y normaliza la sangría interior.
//
// Uso: node scripts/fix-closed-braces.js <fichero.css> [...]

import fs from 'node:fs';

for (const file of process.argv.slice(2)) {
  const raw = fs.readFileSync(file, 'utf8');
  // El repositorio almacena LF (.gitattributes: * text=auto eol=lf).
  const css = raw.replace(/\r\n/g, '\n');
  const out = css.replace(/^([ \t]*)\}\}([ \t]*)$/gm, (m, indent, rest) => `${indent}}\n}${rest}`);
  const changed = out !== css;
  fs.writeFileSync(file, out, 'utf8');
  console.log(`${file}: ${changed ? 'cierres desdoblados' : 'sin cambios'}`);
}
