# Selector de catálogos: el nombre del catálogo como título y el selector fijo en la hoja de producto (rama `feat/selector-catalogos`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Es solo el panel de la tienda (no cambia datos ni lo que ven los compradores). Cuando todo pase y se vea como `referencias/selector-catalogos/`, **fusiona (squash) a `main`**; una tienda con un solo rubro (Esencias Michel) tiene que verse **exactamente igual**. Déjalo abierto solo si algo falla o decides algo que no estaba aquí.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado e iPhone, permisos, movimiento), `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md`, `docs/prompts/tipo-de-producto.md` (PR #67, ya en `main`: de ahí sale todo esto) y **`referencias/selector-catalogos/LEEME.md`** con sus tres dibujos. Tu puesto es **Coding**. No copies el HTML de las referencias.

Mira: `components/catalogo/vista-catalogo.tsx` (el `<select>` «Tipo de producto / Todos los tipos» y `tipoFiltro`), `components/catalogo/fila-tipo-producto.tsx`, `components/catalogo/hoja-producto.tsx` (`tipo`, `leerUltimoTipo`, `FilaTipoProducto`, `HojaLoQueVendes`), `components/hoja.tsx` (`HojaFijoArriba`, el desenfoque progresivo y `--cabecera`), `components/panel/titulo-pantalla.tsx`, `components/panel/boton-flotante.tsx`, `lib/rubros.ts` (`rubrosDeTienda`, `tipoDeProducto`, `tipoPorDefecto`, `NOMBRE_TIPO`).

## 1. Qué decidió Lewis (7 oct 2026)

Lewis no quedó convencido de cómo salió #67 (un renglón «Tipo de producto» en el Catálogo y otra fila dentro del formulario). Eligió esto, y **a los rubros de la tienda se les llama «catálogo» en pantalla** (en `docs/04`, `HANDOFF.md` y los textos; «catálogo» ya es también el enlace público, por eso el título deja de decir «Tu catálogo» cuando hay varios):

1. **Pestaña Catálogo:** el título es **el nombre del catálogo que se está viendo** con un chevron, y es el selector. **Un catálogo a la vez, sin «Todo».**
2. **Hoja de producto:** el mismo selector, **fijo en la cabecera, justo debajo del título**, **sin píldora ni fondo** (mira `HojaProducto.dc.html`), dentro de la zona con el **desenfoque progresivo** de la hoja.
3. Todo esto **solo con más de un rubro**. Con uno solo, nada cambia.

## 2. Pestaña Catálogo

Con 2 o más rubros:

- **Título:** el nombre del catálogo activo (`NOMBRE_TIPO`) en lugar de «Tu catálogo», con chevron, en el mismo estilo del título de pantalla (`font-display`, `text-titulo-pantalla`; el chevron en `texto-secundario`). Es un `<button>`-a-la-vista con un **`<select>` nativo** encima (opacity 0, a todo el alto y ancho del título), igual que el patrón de `fila-tipo-producto.tsx`: la rueda de iOS, sin menú propio. `aria-label`: «Catálogo: Accesorios. Cambiar». Área de toque de 44 px o más.
- **Opciones del `<select>`:** los rubros de la tienda en su orden (el principal primero), cada uno como «Perfumes · 8» (con su cantidad de productos de la lista que la vista ya carga; sin consultas nuevas) y una última «Lo que vendes…» que abre `HojaLoQueVendes` y deja el catálogo elegido como estaba (mismo truco que `OTRA_COSA`). **Sin «Todo».**
- **Subtítulo:** «Tus catálogos viven aquí. Toca el nombre y cambia.» (una constante, no texto suelto). Con un solo rubro quedan «Tu catálogo» y «Lo que tus clientes deslizan. Tú solo lo mantienes bonito.», sin chevron, como hoy.
- **Qué catálogo se abre:** el **último que miró esa persona en esa tienda** (guárdalo por tienda en `localStorage`, con `try/catch`, igual que `leerUltimoTipo`); si no hay, o ese rubro ya no está en la tienda, el **principal**.
- **El resto de la vista trabaja sobre el catálogo activo:** el buscador («Busca en Accesorios»), las pastillas (Todos, Por agotarse, Agotados, En espera) y sus contadores, y la grilla. Un producto con `rubro = null` pertenece al principal (`tipoDeProducto`). **Quita** el renglón «Tipo de producto / Todos los tipos» y el estado `tipoFiltro` que puso #67.
- **Catálogo vacío** (por ejemplo, Accesorios recién agregado, sin productos): un estado vacío pequeño en la voz de `docs/11` con el botón de agregar producto; no es el «Tu vitrina está vacía» de la tienda sin productos.
- **Lo que no cambia:** la dona y «N disponibles» (son de toda la tienda y abren «Tu inventario»; si ves una razón para que cambien, explícala en el PR, no lo hagas), la tarjeta «Tu catálogo está en línea», el botón naranja «+ Producto» en su sitio y el catálogo del comprador (sigue viendo todo junto, con la búsqueda por tipo de #67).
- **«+ Producto» desde un catálogo:** el producto nuevo sale con **el catálogo que se está viendo** como su tipo (reemplaza a «el del último producto creado»; puede usar el mismo almacenamiento si es más simple). Editar un producto que ya existe no cambia.

## 3. Hoja de producto (nuevo y editar)

- El selector va en la **cabecera fija** con `<HojaFijoArriba>` (`components/hoja.tsx`), **debajo del título**, y **desaparece de dentro del formulario** (quita `FilaTipoProducto` del cuerpo; borra el componente si queda sin uso).
- **Se ve como el selector de la pantalla Catálogo, no como una píldora:** el nombre («Accesorios») en `font-display` (`text-titulo-seccion`, 20 px) con el chevron en `texto-secundario`, **sin fondo, sin borde, sin cápsula**. Con un `<select>` nativo encima, igual que arriba y con las mismas opciones (la última, «Vendo otra cosa también», abre `HojaLoQueVendes`).
- **Comprueba el desenfoque progresivo:** la cabecera crece una fila y `--cabecera` (ResizeObserver) tiene que seguirla; al hacer scroll del formulario, el contenido pasa por detrás y se desvanece **justo debajo del selector**, sin recortes ni saltos. Haz captura antes y después.
- **Gestos y foco (regla de `HANDOFF.md`):** la cabecera arrastra la hoja con pointer events; tocar el selector tiene que abrir la rueda y **no** arrastrar ni cerrar la hoja. El `<select>` no abre teclado, pero no debe quitarle el foco a nada ni mover la hoja. Agrégalo a `scripts/probar-teclado.mjs`.
- **Sin permiso de catálogo** (Ayudante): se ve el nombre sin chevron y, al tocarlo, la tostada de siempre («Esto lo hace quien administra la tienda.»). Nada de `select` activo.
- Para un producto nuevo sale el catálogo activo de la pestaña (§2); para uno existente, su tipo.

## 4. Reglas

- Sin migraciones ni cambios en `catalogo_publico`. Nada de datos reales.
- `components/ui/` y los tokens; sin movimiento nuevo (nada de animar la cabecera ni la lista al cambiar de catálogo; el cambio es instantáneo).
- No toques `dialogo.tsx`, `lib/gesto-hoja.ts` ni el catálogo del cliente.
- Textos en la voz de la marca (`docs/11`), mínimos.
- Novedad en `lib/novedades.ts` (una frase; versión siguiente a la de `main` en el momento del merge).

## 5. Pruebas y cierre

- Unitarias: catálogo inicial (último visto → principal si no hay o ya no existe), filtro sin «Todo» (el `null` cuenta como principal), contadores por catálogo, tipo por defecto de un producto nuevo = catálogo activo.
- Navegador (demo, 390 y 360; Lino & Algodón ya tiene dos rubros): cambiar de catálogo, buscar, pastillas, estado vacío, «+ Producto» con el catálogo activo, la hoja con el selector fijo y el desenfoque al hacer scroll, «Lo que vendes…» desde los dos lugares; **y una tienda con un solo rubro sin ningún cambio visible** (captura antes y después).
- Compara contra `referencias/selector-catalogos/` y di en el PR en qué se diferencia.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build`, `probar:teclado` y las regresiones de producto, presentaciones y equipo.
- `docs/04-pantallas.md`, `docs/00-contexto-del-proyecto.md` (sección «Dónde va el trabajo») y `HANDOFF.md` si cambia una regla.
- Resume en español, corto: qué cambió, qué debe probar Lewis en el iPhone (Tienda de ensayo, que ya vende General y Accesorios: cambiar de catálogo desde el título, crear un producto desde cada uno, el selector de la hoja al hacer scroll) y las decisiones que tomaste. Di claro que Safari/iPhone no se pudo probar.

## Acuerdos posteriores vigentes (10 oct 2026)

Este prompt conserva el encargo original. Para el comportamiento actual del selector, estos acuerdos posteriores lo amplían y prevalecen:

- Al desplazar la página, el menú se cierra. Si el menú tiene scroll interno, desplazar sus opciones no lo cierra.
- El rubro físico `general` se muestra como «De todo» en los selectores; sus productos, clave y selección guardada no cambian.
- «General» es una opción virtual agregada, no un rubro de la tienda. Reúne todos los productos una sola vez por ID. Desde esa vista, crear un producto parte del rubro principal.
- No renombrar registros ni hacer migraciones para distinguir las dos opciones. El estado local del selector usa un identificador virtual separado del rubro `general`.
