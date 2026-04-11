# CLAUDE.md — Entrenamiento Cognitivo-Motor (ECM)

Proyecto independiente extraído de SWD-nextjs (Movimiento Funcional / Hirit).

---

## Qué es este proyecto

Colección de herramientas interactivas de entrenamiento cognitivo-motor:
temporizadores, herramientas reactivas y juegos cognitivos para entrenadores
personales y de grupos.

**Objetivo final:**
- Web app pública (sin login, sin backend)
- PWA instalable en Android (vía "Añadir a pantalla de inicio" o TWA)
- HTML Vanilla + CSS + JavaScript puro (sin frameworks)

---

## Estado actual

Los archivos en `src/herramientas/` son los **originales en React/TSX** de SWD-nextjs.
Sirven como **referencia de lógica y diseño** para la migración a vanilla HTML.

### Herramientas a migrar (12)

#### Temporizadores y reactivas
- `temporizadores/` — EMOM, Intervalos, AMRAP, AFAP
- `flechas/` — Flechas Reactivas (cambios de dirección)
- `colores/` — Colores Reactivos (toma de decisiones)
- `sonidos/` — Sonidos Reactivos (reacción auditiva)

#### Cognitivas
- `stroop/` — Test de Stroop (función ejecutiva e inhibición)
- `dual-task/` — Tarea Doble (coordinación cognitivo-motora)
- `simon/` — Simon Dice (memoria de secuencias)
- `minisopa/` — Minisopa (encuentra palabras)
- `pagos-exactos/` — Pagos Exactos (cálculo con monedas)
- `numeros-ocultos/` — Números Ocultos (memoriza posiciones)
- `de-menor-a-mayor/` — Ordena números
- `memoria/` — Memoria Visual (emparejar cartas)

---

## Estructura objetivo del proyecto

```
ECM-cognitivo-motor/
├── index.html              ← Menú principal con las 12 herramientas
├── manifest.json           ← PWA config
├── sw.js                   ← Service Worker (offline support)
├── assets/
│   ├── css/
│   │   ├── design-tokens.css   ← Variables CSS (colores, tipografía, etc.)
│   │   ├── base.css            ← Reset + estilos globales
│   │   └── components.css      ← Componentes reutilizables (botones, cards)
│   ├── js/
│   │   └── utils.js            ← Helpers compartidos
│   └── icons/                  ← Iconos PWA (192x192, 512x512)
├── tools/
│   ├── temporizadores/index.html
│   ├── flechas/index.html
│   ├── colores/index.html
│   ├── sonidos/index.html
│   ├── stroop/index.html
│   ├── dual-task/index.html
│   ├── simon/index.html
│   ├── minisopa/index.html
│   ├── pagos-exactos/index.html
│   ├── numeros-ocultos/index.html
│   ├── de-menor-a-mayor/index.html
│   └── memoria/index.html
└── src/herramientas/       ← Originales React/TSX (solo referencia, NO editar)
```

---

## Design System

Mismos tokens que SWD-nextjs. Archivo: `assets/css/design-tokens.css`

### Colores principales
- **Turquesa** (`--turquesa-600: #00bec8`) — Primary, botones principales
- **Rosa** (`--rosa-600: #e11d48`) — Cognitivas, acciones críticas
- **Amarillo/Tulip** (`--tulip-tree-500: #eab308`) — Reactivas, alertas
- **Grises** — Neutros, fondos, textos

### Tipografía
- Headings: `Righteous` (Google Fonts)
- Body: `ABeeZee` (Google Fonts)

### Iconografía
**SOLO Material Symbols Sharp** (Google Fonts CDN). NUNCA emojis en la UI.
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp" rel="stylesheet">
<span class="material-symbols-sharp">timer</span>
```

---

## Principios de desarrollo

- **Sin frameworks** — HTML + CSS + JS vanilla puro
- **Sin login / sin backend** — Todo client-side
- **Mobile-first** — Diseñado para tablet y móvil (uso en sala)
- **PWA-ready** — manifest.json + service worker para instalación Android
- **Accesibilidad** — Touch targets mínimo 44px, contraste WCAG AA

---

## Cómo migrar una herramienta

1. Leer el `.tsx` de referencia en `src/herramientas/<nombre>/page.tsx`
2. Extraer la lógica de estado (useState → variables JS)
3. Convertir el JSX a HTML semántico
4. Reemplazar imports de React por lógica vanilla
5. Reemplazar `<MaterialIcon name="x" />` por `<span class="material-symbols-sharp">x</span>`
6. Eliminar dependencias de `NavigationMenu` y `DashboardHomeButton` (crear nav simple)
7. Guardar en `tools/<nombre>/index.html`

---

## Convenciones de código

- Archivos: kebab-case (`de-menor-a-mayor/`)
- Variables JS: camelCase
- Clases CSS: kebab-case con BEM cuando aplique
- Sin `console.log` en producción
- Sin comentarios obvios

---

## Notas de producto

- Las herramientas cognitivas están basadas en investigación (Perplexity + Gemini Deep Research)
- La selección final de herramientas a incluir en v1 está pendiente de revisión
- Posible publicación en Google Play Store via TWA (Trusted Web Activity) en fases posteriores
