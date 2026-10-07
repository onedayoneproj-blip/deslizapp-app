# Catálogo del comprador: ver por catálogo (rama `feat/catalogo-por-tipo`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Es el catálogo que ven los compradores: **deja el PR abierto con su preview** para que Lewis lo pruebe en el iPhone. No hagas merge.

> **En paralelo con** `docs/prompts/selector-de-catalogos.md` (el panel). Tocan archivos distintos: tú trabajas en `components/tienda/*`, `lib/tienda/*` y `app/tienda/catalogo.css` (bloque propio al final). No toques el panel ni `lib/rubros.ts` más que para leer. Antes del PR, `git fetch origin && git rebase origin/main`.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (reglas de gestos de las hojas, teclado y movimiento), `docs/12-catalogo-conectado.md`, `docs/prompts/tipo-de-producto.md` (#67: de ahí salen los rubros y el tipo de cada producto) y `docs/11-voz-y-frases.md`. Tu puesto es **Coding**.

Mira: `components/tienda/catalogo.tsx` (el estado `filter`, `seleccionarFiltro`, `cols`, `lista`, el perfil con `.pname`, `.hls` y `.gridtabs`, la hoja «Colecciones» `#coBg`, el buscador con `tiposBusqueda`), `lib/tienda/catalogo.ts` (`coleccionesDe`, `mostrarDetalle`), `lib/tienda/busqueda.ts` (`tiposDelCatalogo`), `lib/rubros.ts` (`rubrosDeTienda`, `tipoDeProducto`, `NOMBRE_TIPO`) y `app/tienda/catalogo.css`.

## 1. Qué decidió Lewis (7 oct 2026)

En el panel, a los rubros de la tienda se les llama **«catálogo»** y se ve **uno a la vez** (`selector-de-catalogos.md`). Para el **comprador**:

- Por defecto ve **todo combinado**, como en Instagram (opción «Todo»).
- Quien quiera, **filtra por catálogo** («Perfumes», «Accesorios»…).
- **Sin `<select>` nativo** (Lewis lo descartó, 7 oct, también en el panel). Dos formas, según el lugar:
  - **Perfil de la tienda:** una **barra de pestañas de texto** como la de Instagram en el perfil (ícono o texto, y una raya debajo de la activa), pero con **el nombre de cada catálogo** en vez de símbolos: «Todo · Perfumes · Accesorios».
  - **Feed de deslizar (hoja «Colecciones»):** el **menú flotante** del panel (el nombre con chevron; al tocarlo se abre una tarjeta con los catálogos), con el aspecto de la tienda.
- **Solo cuando la tienda vende más de un rubro.** Con uno solo, nada cambia.
- **No va en la cabecera** (ahí vive la marca de la tienda: logo o cabecera personalizada, y tocarla lleva al perfil).

## 2. Qué se construye

1. **Perfil de la tienda (lugar principal): pestañas de texto.** El rótulo `.gridtabs` (hoy ícono de cuadrícula + `nombres.plural`) pasa a ser una **barra de pestañas** como la de Instagram: el texto de cada catálogo, la activa en negrita y con una **raya debajo** (en el color de tinta del tema de la tienda; las inactivas en tono suave). Primero **«Todo»** (la de por defecto) y después cada rubro de la tienda en su orden. Sin números. Con 4 o más pestañas que no caben, la barra **se desplaza en horizontal** (sin barra visible). Cada pestaña de 44 px o más de alto táctil, `role="tablist"` / `role="tab"` con `aria-selected`, flechas del teclado. Con un solo rubro, queda el rótulo de hoy.
2. **Hoja «Colecciones» (segunda entrada, para quien solo desliza): menú flotante.** Arriba, antes de la rejilla, una fila «Catálogo» con el nombre activo («Todo») y un chevron; al tocarla se abre una **tarjeta flotante** con «Todo» y cada catálogo (check en el activo), que cierra al elegir, al tocar fuera y con Escape. Es un componente propio de la superficie del comprador (`components/tienda/`), con los colores y la fuente de la tienda; no uses el del panel. Mismo estado que las pestañas. Con un solo rubro, no sale.
3. **Un solo estado manda:** `catalogoActivo: Rubro | null` (`null` = Todo). Todo lo demás se calcula sobre el catálogo filtrado: las colecciones (`coleccionesDe` sobre un catálogo cuyos productos son solo los de ese tipo; las colecciones vacías no salen), `lista` (la cuadrícula **y** el feed de deslizar), los círculos `.hls`, los contadores de la hoja «Colecciones» y las cifras del perfil. Un producto con `rubro = null` cuenta como el rubro principal (`tipoDeProducto`). Al cambiar de catálogo, si la colección elegida ya no existe, vuelve a «Todos»; el feed se reacomoda como hoy al cambiar de colección (mira `seleccionarFiltro` y cómo maneja el producto que queda fuera de la lista).
4. **Textos que se equivocan con varios rubros:** el contador del perfil dice «N productos» (no el plural del rubro principal), y los `aria-label` que nombran `nombres.plural` («Volver a los perfumes», «Filtrar perfumes») dicen «productos» cuando hay varios catálogos. Con un solo rubro quedan idénticos a hoy.
5. **El buscador no cambia:** sigue buscando en todo el catálogo, con los filtros por tipo de #67.
6. **La cabecera no cambia:** el logo o nombre, las pestañas «Novedades / Colecciones» y todo lo demás quedan.

## 3. Reglas

- Sin migraciones y sin cambiar `catalogo_publico`; los datos ya traen los rubros de la tienda y el tipo de cada producto (#67).
- **Superficie propia del comprador:** no uses `components/ui` ni los tokens del panel; respeta `app/tienda/catalogo.css` y el tema de cada tienda (colores y fuentes de `temaDeTienda`). Las pestañas y el menú toman los colores del tema.
- Sin movimiento nuevo en la cuadrícula ni en el feed (cambiar de catálogo es instantáneo); el menú puede aparecer con `transform` y `opacity`, respetando `prefers-reduced-motion`.
- Gestos de las hojas y teclado: la hoja «Colecciones» sigue siendo un `DialogoCatalogo`; el menú flotante vive dentro de ese diálogo: tocarlo no debe cerrar la hoja ni activar su gesto de arrastre, y cierra primero él. Agrégalo a la prueba de gestos.
- **Una tienda con un solo rubro (Esencias Michel) se ve y se comporta exactamente igual**: compara capturas antes y después.
- No hay enlace por catálogo (`?catalogo=`) todavía; queda anotado como idea para más adelante.
- Novedad en `lib/novedades.ts` (una frase para la dueña, p. ej. que sus compradores ya pueden ver por catálogo); versión siguiente a la de `main` en el momento del merge.

## 4. Pruebas y cierre

- Unitarias: filtrar por catálogo (el `null` cuenta como principal), colecciones sin vacías, contadores, reinicio de la colección si desaparece, textos con uno y con varios rubros.
- Navegador (demo `?demo`, 390 y 360; Lino & Algodón tiene dos rubros): perfil con «Todo» por defecto, elegir un catálogo, ver la cuadrícula y el feed, la hoja «Colecciones» con su fila de catálogo, colección + catálogo juntos, una tienda de un solo rubro **sin ningún cambio visible**, y la Tienda de ensayo real (vende General y Accesorios) en el preview.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build`, `probar:hojas-gestos` y las regresiones del catálogo del cliente (`probar-catalogo-*`, pedido, Avísame, presentaciones).
- `docs/04-pantallas.md`, `docs/12-catalogo-conectado.md` y `HANDOFF.md` si cambia una regla.
- **PR abierto con preview.** Resume en español, corto: qué cambió, qué debe probar Lewis en el iPhone (en la Tienda de ensayo: abrir el perfil, cambiar de catálogo con las pestañas del perfil y desde «Colecciones», deslizar el feed, abrir un producto, volver; y Esencias Michel sin cambios) y lo que no pudiste probar (Safari físico).
