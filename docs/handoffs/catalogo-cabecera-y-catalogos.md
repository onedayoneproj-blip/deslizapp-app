# Cabecera del perfil y pestañas por colecciones o catálogos · entrega de Coding

11 oct 2026. Encargo de Planning, aprobado por Lewis. Rama `feat/catalogo-cabecera-y-catalogos` desde `main` con #106. PR aparte; Planning fusiona con «Revisión» en verde.

## Qué cambia

1. **Cabecera del perfil con desenfoque progresivo.**
   - `.hdr-borde`, dentro de `.hdr`, solo en `view-grid`, sustituye al degradado crema casi opaco de `.view-grid .hdr::before`.
   - Usa la técnica de `.hoja-borde` (`app/globals.css`): 4 capas de `backdrop-filter` de 1, 2, 4 y 8 px, la mayor arriba, cada una con su máscara de degradado, sobre una rampa de 72 px.
   - Encima va un velo de `--bg` de la tienda (92 % arriba, 80 % a media rampa, 0 abajo).
   - Cubre también la franja de la barra de estado. Sin animaciones. Con `prefers-reduced-transparency`, el fondo es sólido.
2. **Pestañas del feed** (`pestanaDelFeed`, con prueba unitaria en `tests/catalogo-por-tipo.test.mjs`):
   - **Con colecciones en algún catálogo:** «Novedades · Colecciones». El abanico mide según `data-n` (1: 26 px, 2: 36 px, 3: 46 px) y no se pinta si el catálogo activo no tiene colecciones.
   - **Varios catálogos sin colecciones:** «Novedades · Catálogos». La hoja `#catBg` reutiliza `DialogoCatalogo` y las tarjetas `.coitem` de Colecciones («Todo» más cada rubro con `NOMBRE_TIPO`, carátula y número de productos, ✓ en el activo).
     - `elegirCatalogo` cierra primero la hoja (`history.back()` + `trasCerrar`) y luego llama a `cambiarCatalogo`, igual que `seleccionarFiltro`.
     - La pestaña (`#colTab[data-tab="cat"]`) muestra el catálogo activo. Comparte `id` y la clase `co-open` con Colecciones para centrarse como título de la hoja.
     - «Novedades» vuelve a «Todo».
   - **Un catálogo sin colecciones:** sin `.htabs`. Nada depende de `#colTab`: el efecto que centra el título tolera que no exista, y el cálculo del alto del reel ya tenía un valor por defecto sin pestañas.
   - El interruptor `secciones.colecciones === false` cuenta como «sin colecciones».
   - En la vista previa del panel se aplica la misma regla (`vista-previa-reel.tsx`).
3. **Estado vacío en Colecciones:** con varios catálogos y el activo sin colecciones, aparece «Este catálogo todavía no tiene colecciones. Mira las de otro catálogo.» (`.co-vacio`, `role="status"`).

Novedad `0.65.0`. Documentación en `docs/04-pantallas.md` (catálogo público).

## Pruebas

- `npm run tipos`, `npm run lint`, `npm test` (más la prueba de `pestanaDelFeed`) y `npm run build`.
- `scripts/probar-catalogo-cabecera.mjs` (nuevo), con Lino & Algodón modificada a 360, 390 y 430 px, cubre estos casos:
  - varias colecciones (abanico de 3);
  - una colección (abanico de 26 px sin hueco);
  - un catálogo sin colecciones (sin pestañas, el feed funciona);
  - varios catálogos sin colecciones: pestaña «Catálogos» centrada; la hoja lista Todo, Ropa y Accesorios y marca el activo; «atrás» la cierra; elegir cambia el catálogo, cierra la hoja y consume su entrada; «Novedades» vuelve a todo;
  - colecciones solo en otro catálogo (estado vacío, abanico sin hueco);
  - perfil con desenfoque de 1, 2, 4 y 8 px, velo y `pointer-events: none`.
- Capturas en `docs/capturas/catalogo-cabecera/`.
- `probar-presentaciones.mjs` ajustado: la vista previa de un borrador sin colección ni otros catálogos ya no lleva pestañas.
- Safari de iPhone no se probó; el desenfoque usa `-webkit-backdrop-filter`, como las hojas del panel.

## Actualización: cabecera flotante del perfil (`fix/perfil-cabecera-flotante`)

El desenfoque progresivo (`.hdr-borde`) se retiró del perfil: dejaba un hueco transparente entre la barra de estado y la cabecera fija. Ahora, en `view-grid`, `.hdr` es `position: absolute` (el nombre de la tienda se va con el scroll) y solo «atrás» e Instagram son botones fijos de cristal (44 px, separados del borde con `--hdrT`, nada fijo toca y=0). Sin backdrop-filter ni transparencia.
