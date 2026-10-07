# Tipo de producto: «lo que vendes» en la tienda y el tipo de cada producto (rama `feat/tipo-de-producto`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Una migración **aditiva**. Cuando todo pase, **fusiona (squash) a `main`**: una tienda con un solo rubro (Esencias Michel hoy) tiene que verse y comportarse **exactamente igual**. Déjalo abierto solo si algo falla o decides algo que no estaba aquí.

> **Orden:** va después de `docs/prompts/presentaciones-catalogo.md` (parte 2), porque las dos tocan el catálogo del cliente; si esa aún no está en `main`, haz `git fetch` seguido y rebasa antes de abrir el PR.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (teclado e iPhone, permisos, la nota sobre las herramientas de Supabase que se cuelgan con `drop function` y con `delete from`), `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md`. Tu puesto es **Coding**.

Mira antes: `lib/rubros.ts` (`Rubro`, `OPCIONES_TIPICAS`), `lib/types.ts` (`Tienda.rubro`, `Producto`), `components/catalogo/hoja-producto.tsx`, `components/catalogo/vista-catalogo.tsx`, `components/catalogo/ficha-opciones.tsx`, `lib/data/*` (fuente, demo y supabase), en el catálogo del cliente `components/tienda/catalogo.tsx` y **`lib/tienda/busqueda.ts`**, y en la base `tiendas.rubro`, `catalogo_publico`.

## 1. Qué decidió Lewis (7 oct 2026)

1. Una tienda puede vender **uno o varios rubros** («Lo que vendes»). Hoy es uno solo (`tiendas.rubro`).
2. **Cada producto lleva su propio tipo** (su rubro). Es una dimensión de organización: **más amplia que la colección**, que cada tienda inventa. Dentro de un tipo, la tienda sigue teniendo sus Colecciones.
3. **El comprador también puede usarla:** en la búsqueda del catálogo puede buscar por tipo («perfumes», «ropa»), no solo por colección.
4. En la app se dice **«Lo que vendes»** (la tienda) y **«Tipo de producto»** (cada producto); la palabra «rubro» no sale en pantalla. Internamente la columna se llama `rubro`.
5. Con **un solo rubro**, nada de esto aparece y todo queda como hoy.

## 2. Alcance (importante: decidido para que sea pequeño)

- El tipo de producto es **solo una etiqueta de organización y búsqueda**. **No cambia qué «Detalles» se muestran**: los Detalles siguen decididos por el rubro **principal de la tienda**, como hoy (Lewis piensa reemplazar los Detalles más adelante; no construyas la lógica de «conservar los detalles comunes al cambiar de tipo»).
- Lo único que el tipo sí decide: las **presentaciones típicas** que se sugieren al crear presentaciones (`OPCIONES_TIPICAS` del tipo del producto).

## 3. Datos (migración aditiva)

- `tiendas`: una forma de guardar varios rubros conservando `rubro` como **principal** (p. ej. `rubros text[]` validado contra la lista de `lib/rubros.ts`, con el principal siempre incluido; o una tabla; elige lo más simple y compruébalo). Rellena `rubros = [rubro]` para las existentes.
- `productos.rubro` (nullable; **null = el rubro principal de la tienda**), validado: debe estar entre los rubros de la tienda. No toques `productos.tipo` (producto o servicio): es otra cosa; usa nombres que no se confundan en el código y en los textos.
- Si se quita un rubro de la tienda que algún producto usa, **no se puede** (avisa cuáles); o los pasa al principal con confirmación. Decide y explícalo.
- Funciones de escritura con `exigir_no_viendo` y `exigir_permiso(..., 'catalogo')`, `search_path = ''`, sin `anon`. `catalogo_publico` devuelve los rubros de la tienda y el tipo de cada producto con `create or replace` y **la misma firma** (sin `drop`). Los productos existentes quedan con `rubro` null.
- Migración nueva, ensayo en `BEGIN; … ROLLBACK;` con `execute_sql`, replay (`probar:admin-db`), luego `apply_migration` con la versión de Supabase; `list_migrations` antes (Lewis trabaja con una sola sesión a la vez). `npm run revisar:migraciones` en cero, `get_advisors` sin nada nuevo.
- Demo: Lino & Algodón con un segundo rubro (accesorios) y algunos productos de cada uno.

## 4. Panel

1. **«Lo que vendes»:** dónde se cambia (propón el lugar más simple: una fila en la hoja de **Mi marca**, o junto al nombre de la tienda en el menú). Pastillas de los rubros con check; al menos uno; el primero es el principal. «Vendo otra cosa también» desde el formulario del producto suma un rubro sin salir.
2. **En el formulario del producto**, justo debajo del título («Producto nuevo» / el nombre): una fila **«Tipo de producto»** con el estilo de la fila **Colección** (etiqueta a la izquierda, valor gris y chevron a la derecha). Por dentro es un **`<select>` nativo** (la rueda de iOS) puesto sobre la fila, con su `<label>`; no abre hoja. **Solo aparece con más de un rubro.** Un producto nuevo sale con el tipo del **último producto creado** en esa sesión (si no hay, el principal).
3. **En la vista del Catálogo:** un `<select>` nativo «Todos los tipos / Perfumes / Ropa…» junto a las pastillas que ya existen (Todos, Por agotarse, Agotados…), solo con más de un rubro. Combina con la búsqueda y con las pastillas.
4. **Presentaciones típicas** según el tipo del producto (y, para «Agregar presentaciones», las del tipo elegido).
5. **Permisos:** todo es del grupo `catalogo` (un Ayudante lo ve apagado con «Esto lo hace quien administra la tienda.»).
6. Teclado e iPhone: un `<select>` no abre el teclado, pero revisa que no rompa el foco y agrégalo a `scripts/probar-teclado.mjs` si lo toca.

## 5. Catálogo del cliente

- **Búsqueda:** `lib/tienda/busqueda.ts` hoy se apoya en los Detalles del producto (sinónimos de notas, «para ella», ocasiones…). **No la rompas.** Añade el tipo como una dimensión más: las palabras que coinciden con el nombre de un tipo de la tienda («perfumes», «ropa») filtran por ese tipo, y arriba de los resultados (solo con más de un rubro) salen pastillas con los tipos para filtrar de un toque. Sin más de un rubro, la búsqueda queda **idéntica**.
- Las Colecciones siguen donde están. El orden y la presentación del catálogo no cambian para una tienda con un solo rubro.
- Superficie propia del catálogo: no uses `components/ui`; respeta `app/tienda/catalogo.css`.

## 6. Pruebas y cierre

- Unitarias: validación de rubros de la tienda, tipo por defecto (último usado), qué pasa al quitar un rubro en uso, presentaciones típicas por tipo, búsqueda por tipo (con y sin más de un rubro) y que la búsqueda de perfumes existente da **los mismos resultados** que antes (compara con un caso fijo).
- Replay de la migración (permisos por nivel, Ver como, lectura pública). Navegador (demo, 390 y 360): crear un producto de cada tipo, cambiarlo con el selector, el filtro del Catálogo, la búsqueda del cliente por tipo; **y una tienda con un solo rubro sin ningún cambio visible**.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones de producto, presentaciones, catálogo del cliente, equipo y Mi marca.
- Novedad en `lib/novedades.ts`, `docs/03` y `docs/04`.
- Resume en español, corto: qué cambió, qué debe probar Lewis (Lino & Algodón con dos rubros: crear, cambiar, filtrar y buscar) y las decisiones que tomaste.
