# Selector de catálogos: ajustes tras probarlo (rama `fix/selector-catalogos-ajustes`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Solo el panel. Es un diseño que Lewis ya rechazó una vez, así que **deja el PR abierto con su preview** para que lo apruebe en el iPhone. No hagas merge.

## 0. Antes de empezar

Lee `docs/prompts/selector-de-catalogos.md` (lo que se construyó en #68), `referencias/selector-catalogos/LEEME.md` y `CatalogoMenu.dc.html` / `CatalogoCerrado.dc.html` (el menú que Lewis aprobó), `HANDOFF.md` (teclado e iPhone, movimiento), `docs/09-sistema-de-diseno.md` §16.5 y `docs/11-voz-y-frases.md`. Tu puesto es **Coding**. Parte de `main` actualizado.

Mira: `components/catalogo/selector-catalogo.tsx`, `components/catalogo/vista-catalogo.tsx`, `components/catalogo/hoja-producto.tsx`, `components/panel/boton-flotante.tsx`, `components/hoja.tsx` y `components/ui/` (por si ya hay un menú o popover que sirva).

## 1. Lo que Lewis vio en #68 y no le gustó (7 oct 2026)

1. **El botón de crear producto cambió de lugar y perdió el «+».** Pasa cuando el catálogo elegido está vacío (por ejemplo, Accesorios en la Tienda de ensayo): se escondió el botón naranja y el estado vacío puso un «Agregar producto» al centro, sin ícono. **Eso lo pidió mi prompt y estaba mal.** El botón flotante «+ Producto» tiene que estar **siempre en su sitio de siempre** (abajo a la derecha, con el «+»), también con un catálogo vacío.
2. **El selector nativo de iOS (la rueda) no lo convence.** Quiere el **menú flotante** del dibujo (`CatalogoMenu.dc.html`), en los dos lugares donde hoy hay selector: el título de la pestaña Catálogo y la cabecera fija de la hoja de producto.

## 2. Qué se arregla

### 2.1 Botón «+ Producto»

- Vuelve a verse **siempre**, con su «+», donde estaba antes de #68 (`BotonFlotante`, sin cambios). Solo se oculta, como antes de #67, cuando la tienda entera no tiene ningún producto (ahí manda el estado vacío «Tu vitrina está vacía»).
- **Catálogo vacío:** el estado vacío pequeño queda (título y remate con voz de `docs/11`), **sin botón propio**; el flotante es el que invita. Si el texto dice algo como «Toca + Producto…», sin repetir el verbo del botón.
- Revisa que ningún otro estado (cargando, filtros sin resultado, permisos) lo esconda ni lo mueva.

### 2.2 Menú flotante (reemplaza el `<select>` nativo)

Un componente reutilizable (`components/ui/menu-flotante.tsx`; documéntalo en `docs/09` §16.5 y en la página `/diseno`) que se usa en los dos sitios:

- **Disparador:** el mismo nombre del catálogo con chevron que hoy (título de pantalla en la pestaña; `titulo-seccion` en la hoja, sin píldora ni fondo). `aria-haspopup="menu"`, `aria-expanded`, área de toque de 44 px o más.
- **El menú:** una tarjeta que se abre justo debajo del disparador (borde redondeado, superficie, sombra suave, ancho de unos 240 a 260 px, sin salirse de la pantalla), con `role="menu"`; cada catálogo es un `menuitemradio` («Perfumes», cantidad a la derecha, check en el activo), una línea separadora y, al final, **«Lo que vendes»** con un «+» (abre `HojaLoQueVendes`; en la hoja de producto sigue siendo «Vendo otra cosa también»). **Sin «Todo».**
- **Cierra** al elegir, al tocar fuera (un fondo transparente a pantalla completa, que además atenúa un poco como en el dibujo), con Escape y al abrir otra hoja. Teclado: flechas para moverse, Enter para elegir; al abrir, el foco va al elemento activo **dentro del gesto del toque** (regla de `HANDOFF.md`) y al cerrar vuelve al disparador.
- **En la hoja de producto** la cabecera arrastra la hoja con pointer events y recorta lo que se sale: pinta el menú en un portal (`document.body`) con posición calculada desde el disparador y por encima de la hoja; tocar el disparador no arrastra ni cierra la hoja. El desenfoque progresivo y `--cabecera` no deben cambiar con el menú abierto.
- **Movimiento:** solo `transform` y `opacity`, y que respete `prefers-reduced-motion` (`docs/08`). Nada de animar ancestros ni de cambiar el tamaño de nada al abrir.
- **Sin permiso de catálogo** (Ayudante): como hoy, el nombre sin chevron y la tostada de siempre.
- Quita el `<select>` de `selector-catalogo.tsx` y lo que ya no se use.

## 3. Reglas

- Sin migraciones; no toques el catálogo del comprador ni `lib/tienda/*` (otra sesión trabaja ahí).
- Una tienda con un solo rubro sigue **exactamente igual**.
- Textos en la voz de la marca, mínimos. Novedad solo si lo que ve la dueña cambia de forma que merezca una línea (versión siguiente a la de `main`).

## 4. Pruebas y cierre

- Unitarias de lo que sea lógica (foco, navegación con flechas, qué hace cada ítem).
- Navegador (demo, 390 y 360; Lino & Algodón y la Tienda de ensayo): abrir y cerrar el menú de la pantalla y el de la hoja de producto, elegir un catálogo, «Lo que vendes», catálogo vacío con el botón flotante visible y con «+», la hoja de producto con scroll y el desenfoque, y **una tienda de un solo rubro sin cambios** (capturas antes y después). Agrega los dos menús a `scripts/probar-teclado.mjs`.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones de producto, presentaciones y equipo.
- Actualiza `docs/04-pantallas.md` y `referencias/selector-catalogos/LEEME.md` si algo se aparta del dibujo.
- **PR abierto con preview.** Resume en español, corto: qué cambió, qué debe probar Lewis en el iPhone (en la Tienda de ensayo: abrir el menú del título, elegir Accesorios —que está vacío— y ver el «+ Producto» abajo a la derecha; abrir un producto y probar el menú de la cabecera; ver que no se corte con el scroll) y lo que no pudiste probar (Safari físico).
