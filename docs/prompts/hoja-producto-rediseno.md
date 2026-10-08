# Hoja de producto: rediseño (rama `feat/hoja-producto-rediseno`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Sin migraciones.** Solo el panel (`components/catalogo/hoja-producto.tsx` y sus secciones). **Deja el PR abierto con su preview** para que Lewis lo vea en el iPhone. No hagas merge.

> **Orden:** el PR #76 (`feat/ficha-tecnica`) agrega a esta misma hoja la descripción y la ficha técnica, y el #75/avatares tocan fotos de producto. **Si #76 no está en `main`, parte de su rama** (`git fetch origin feat/ficha-tecnica`), crea `feat/hoja-producto-rediseno` desde ahí y abre el PR con **base en `feat/ficha-tecnica`**, diciendo que depende de él. Si ya está en `main`, parte de `main`. Rebasa antes del PR.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado e iPhone, permisos, Ver como, movimiento), `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md`, **`referencias/hoja-producto-nuevo/LEEME.md`** con sus tres dibujos (lienzo https://claude.ai/artifact/3H12c2DraFoWTBvkCuccCN) y `docs/prompts/ficha-tecnica.md`. Tu puesto es **Coding**. No copies el HTML de las referencias.

Mira: `components/catalogo/hoja-producto.tsx` (el formulario de crear/editar, `ControlInventario`, `ListaAgrupada`/`FilaLista`, `HojaColeccion`), `ficha-medios.tsx` (`SeccionMedios`), `ficha-presentaciones.tsx`, `ficha-detalles.tsx` y los componentes de `components/ui/`.

## 1. Qué quiere Lewis (8 oct 2026)

La hoja de producto nuevo «se siente anticuada»: una columna larga de campos sueltos que pesan igual. Quiere el diseño de las referencias:

1. **Foto grande arriba:** la principal a todo el ancho (cuadrado de bordes redondeados, **nunca círculo**), con contador «1 / 10», debajo una tira de miniaturas con «+» para agregar. Sin fotos: un espacio amplio con borde punteado, ícono de cámara y «Agrega la primera foto». Conserva el mecanismo actual de fotos (subir, ordenar, quitar, límites, `VIDEO_PERMITIDO`).
2. **Lo básico a la vista:** Nombre y Precio como campos grandes; el precio con el tipo de letra y el tamaño de número del catálogo (Fredoka).
3. **Una tarjeta** con «Cosas que cambian» (las presentaciones: resumen en pastillas, «Color · 2», «Tamaño · 3»; al tocar abre el flujo actual) y «En stock» (sin presentaciones: el control actual de llevar la cuenta; con presentaciones: «N presentaciones · M en total»). Es la lógica que ya hay, con otra presentación.
4. **«Más opciones» plegadas** en filas que muestran su valor y se abren al tocarlas: Descripción (con contador y la línea de la búsqueda), Ficha técnica, Colección, Por encargo (con «Cuándo llega»), Visible en el catálogo. Todo lo de #76 se conserva; los Detalles antiguos siguen apareciendo solo en productos que ya los tienen.
5. **Barra fija abajo:** «Cómo se ve» (abre la vista previa del producto tal como lo ve el comprador; si ya existe una vista previa en la app, úsala; si no, decide lo mínimo y explícalo) y «Publicar» / «Guardar cambios». «Publicar» está apagado hasta que haya al menos una foto, nombre y precio válido (si hoy se puede publicar sin foto, **no cambies esa regla**: dilo y deja el botón con la regla de hoy).
6. **Editar un producto existente** usa la misma hoja (mismo orden), con lo que ya tiene: `ControlInventario`, historial, lista de espera, avisos de plan lleno, «Eliminar». No pierdas ninguna función de hoy.

## 2. Reglas

- Mismos datos, mismas funciones de guardado y mismos permisos (grupo `catalogo`; Ayudante lo ve apagado con «Esto lo hace quien administra la tienda.»; Ver como bloquea). No toques la base, `catalogo_publico` ni el catálogo del comprador.
- Componentes de `components/ui/` y tokens (no colores sueltos); textos mínimos y con la voz de `docs/11`; sin exclamaciones. Plegar/desplegar una fila **instantáneo** (nada de animar la altura; `docs/08`).
- **Teclado e iPhone (`HANDOFF.md`):** Nombre, Precio, Descripción y «Cuándo llega» en hoja `grande`; la barra fija no tapa el campo enfocado; abrir una fila no mueve ni quita el foco de un campo; foco dentro del gesto. Actualiza `scripts/probar-teclado.mjs`.
- Gestos de las hojas (`lib/gesto-hoja.ts`) y la regla de movimiento (solo `transform`/`opacity`) intactos.
- Novedad en `lib/novedades.ts` si la dueña lo nota (versión siguiente a la de `main`).

## 3. Pruebas y cierre

- Unitarias de lo que sea lógica (cuándo se habilita «Publicar», los resúmenes de las filas y de las pastillas).
- Navegador (demo `?demo` y la Tienda de ensayo en el preview; 390 y 360): crear un producto vacío, con fotos, con presentaciones, con descripción y ficha, por encargo; editar uno de Michel (conserva sus Detalles) y uno con presentaciones; Ayudante y Ver como. Capturas junto a los dibujos.
- Compara contra las pantallas 1–3 de `referencias/hoja-producto-nuevo/` y di en el PR en qué se diferencia.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build`, `probar:teclado` y las regresiones de producto, presentaciones, ficha y catálogo. Actualiza `docs/04-pantallas.md` y `docs/09`.
- **PR abierto con preview.** Resume en español, corto: qué cambió, las decisiones (vista previa, regla de «Publicar») y qué debe probar Lewis en el iPhone. Di claro que Safari físico no se pudo probar.
