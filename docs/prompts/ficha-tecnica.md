# Ficha técnica y descripción (rama `feat/ficha-tecnica`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. **Una migración aditiva que cambia lo que ven los compradores** (el botón de la ficha y su foto): **deja el PR abierto con su preview** para que Planning revise el SQL y Lewis lo pruebe en el iPhone. No hagas merge.

> **Orden:** una sola migración a la vez. Antes de aplicar, `list_migrations` (hoy hay 57, la última `20261008015455_publicar_catalogo`) y que no haya otra sesión con migración en curso. `git fetch` seguido y rebasa antes de abrir el PR.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (migraciones, permisos, ver como, la nota sobre las herramientas de Supabase que se cuelgan con `drop function` y con `delete from`, teclado y gestos), `docs/03-modelo-de-datos.md`, `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md`, **`referencias/ficha-tecnica/LEEME.md`** con sus dibujos (y el lienzo https://claude.ai/artifact/Wpsj134KTDLQk34zcLU9CU), y `docs/prompts/presentaciones-panel.md` (la migración `20261007125411_presentaciones_fotos_por_valor` es **el mismo tipo de cambio y tu modelo**: columna nueva, limpieza por trigger, función de guardado con permiso y `catalogo_publico` con la misma firma). Tu puesto es **Coding**.

Mira: `components/catalogo/hoja-producto.tsx` (`SeccionDetalles`, `SeccionMedios`), `components/catalogo/ficha-detalles.tsx`, `components/catalogo/ficha-medios.tsx`, `lib/rubros.ts` (`LARGO_DESCRIPCION = 600`, `detallesValidos`), `lib/data/supabase.ts` (`subirMedios`, `BUCKET`), `lib/data/productos.ts` y `lib/types.ts`; del comprador: `components/tienda/reel.tsx` (el texto corto `short`, el botón `más` / `data-more`, `pres-fila-cap`, `botonPresentaciones`), `components/tienda/dialogo.tsx`, `components/tienda/catalogo.tsx` y `app/tienda/catalogo.css`.

## 1. Qué decidió Lewis (8 oct 2026)

Los **Detalles** por rubro se reemplazan por dos cosas simples:

1. **«Descripción»**: texto de hasta **600 caracteres** (el campo `detalles.descripcion` que ya existe y la base ya valida). La búsqueda del comprador ya la usa (PR #75), y el formulario lo explica en una línea.
2. **«Ficha técnica»**: **una foto** con las especificaciones, **que sube la tienda** (opcional). Deslizapp **no** la hace ni se cobra con créditos, y no hay cola en el admin. La foto no se busca; la descripción sí.

**Los Detalles que ya existen se conservan y se siguen mostrando** (Esencias Michel). Los productos nuevos ya no los piden.

## 2. Datos (migración aditiva)

Sigue el modelo de `fotos_por_valor`:

- `productos.ficha_url text` nullable (la foto de la ficha). Con una validación: debe ser una dirección `https` del almacenamiento de Deslizapp (`productos` bucket, la carpeta de esa tienda), sin cuerpo arbitrario; o `null`.
- Una función para guardarla (p. ej. `guardar_ficha_producto(p_producto_id, p_url)`): `security definer`, `set search_path = ''`, **grupo de permiso `catalogo`**, empieza con `exigir_no_viendo` y `exigir_permiso(<tienda>, 'catalogo')`, valida que el producto sea de una tienda de quien llama y no esté eliminado, `revoke … from public, anon`, `grant … to authenticated`. Quitar la ficha es llamarla con `null`.
- Si el producto se guarda con `guardar_producto_inventario` / `crear_producto`, mira si conviene pasar la ficha en el mismo guardado (como la foto por valor) o con la función aparte; **no cambies firmas existentes** (nada de `drop function`): `create or replace` con la misma firma o una función nueva.
- `catalogo_publico` (misma firma, `create or replace`): cada producto devuelve `ficha_url`. Todo lo demás idéntico (compara con la definición vigente, última en `20261008015455_publicar_catalogo.sql`, que ya trae `indexable`).
- **Los archivos:** la foto se sube con el mismo mecanismo y bucket de las fotos del producto (solo imágenes). Al quitar o cambiar la ficha se borra el archivo viejo, como se hace con las fotos (mira `quitar` en `lib/data/supabase.ts`).
- Migración nueva, ensayo en `BEGIN; … ROLLBACK;` con `execute_sql` sobre la base real, replay (`probar:admin-db`) con pruebas nuevas (permisos por nivel, Ver como, tienda ajena, lectura pública), luego `apply_migration` con la versión de Supabase; `npm run revisar:migraciones` en cero y `get_advisors` sin nada nuevo. **Ningún dato real en migraciones.** Comprueba antes y después que Esencias Michel responde igual (15 productos, mismo catálogo).

## 3. Panel (hoja de producto)

Se ve como `referencias/ficha-tecnica/` (`4` y `5`).

1. **«Descripción»** (con contador «43 / 600») justo debajo de las fotos o donde hoy está el primer campo de texto, y debajo, en una línea con la voz de `docs/11`: «Lo que escribas aquí también lo usa la búsqueda de tu catálogo.» Es `detalles.descripcion`; si el producto ya tiene otros Detalles, no se duplica en esa sección.
2. **`SeccionDetalles`:** solo se muestra en un producto que **ya tiene Detalles guardados** (cualquier llave distinta de `descripcion`). Un producto nuevo no los pide. No borres el código ni los datos: es solo cuándo se pinta.
3. **Tarjeta «Ficha técnica»:** sin ficha («Si tienes la foto de las especificaciones, súbela.» y un botón «Subir foto de la ficha») y con ficha (miniatura, «Cambiar», «Quitar», con confirmación breve al quitar). Usa el selector de fotos que ya hay (solo imágenes; el video sigue apagado, `VIDEO_PERMITIDO = false`). Se guarda con el producto o al instante, como decidas y expliques.
4. **Permisos:** todo es del grupo `catalogo` (un Ayudante lo ve apagado con «Esto lo hace quien administra la tienda.»).
5. **Teclado e iPhone** (`HANDOFF.md`): el campo de descripción está en una hoja `grande`; agrégalo a `scripts/probar-teclado.mjs`.
6. **Demo:** a «Majestic Oud» de Michel y a un producto de Lino & Algodón ponles una ficha de muestra (una imagen en `public/`, p. ej. una hoja de especificaciones dibujada).

## 4. Catálogo del comprador

Se ve como `referencias/ficha-tecnica/` (`1`, `2` y `3`). Superficie propia del catálogo: no uses `components/ui`; respeta `app/tienda/catalogo.css` (bloque propio al final) y el tema de cada tienda.

1. **La descripción siempre se ve en el reel**, debajo del precio y encima de los botones, cortada a dos líneas y terminada en **«…»** tocable **sin la palabra «más»** (como en Instagram; área de toque de 44 px, `aria-label` «Ver la descripción completa»). Tocarla abre el detalle que hoy abre el «más». Esto vale para **todos** los productos, también los que tienen presentaciones (hoy ahí el «más» va en la fila de botones y no hay texto): cambia `data-more`, los textos y las pruebas que dependan de la palabra «más». Productos sin descripción: sin texto y sin «…».
2. **Botón de la ficha** (solo si el producto tiene `ficha_url`): **con presentaciones**, un **círculo de vidrio con el ícono de ficha** al lado de «Ver presentaciones», con `aria-label` «Ver la ficha técnica»; **sin presentaciones**, una **píldora de vidrio con el ícono y «Ficha técnica»**. Mismo estilo de vidrio que «Ver presentaciones».
3. **Visor:** un `DialogoCatalogo` a pantalla completa, fondo oscuro, la foto de la ficha, título «Ficha técnica» con el nombre del producto, X para cerrar y **zoom** (pellizcar y mover; que funcione en Safari de iPhone sin romper los gestos de las hojas: mira «Regla permanente: gestos de las hojas del catálogo del cliente» de `HANDOFF.md`; si el pellizco libre no es fiable, un toque que alterna entre ajustar y acercar). Sin movimiento nuevo salvo `transform`/`opacity` y `prefers-reduced-motion`.
3. **Detalles que ya existen (Michel):** siguen mostrándose en el detalle («más» / «…») como hoy.
4. **No cambies** el pedido, el stock, el «aaah», las presentaciones ni la búsqueda (ya la actualizó #75).

## 5. Reglas

- Una tienda con productos que no tienen ficha ni descripción nueva se ve **igual** que hoy salvo el «…» en lugar de «más»: compara capturas de Esencias Michel antes y después y di en el PR qué cambió.
- Textos mínimos y con la voz de `docs/11`. Novedad en `lib/novedades.ts` (versión siguiente a la de `main`).
- `docs/03`, `docs/04`, `docs/12` y `HANDOFF.md` al día; copia el diseño final a `referencias/ficha-tecnica/` si algo se aparta del dibujo (di en qué).

## 6. Pruebas y cierre

- Unitarias: cuándo se muestran los Detalles, el contador de la descripción, la ficha (subir, cambiar, quitar), el texto cortado con «…», cuándo sale cada forma del botón (círculo, píldora, ninguno).
- Navegador (demo, 390 y 360; Lino & Algodón y Michel): crear un producto sin Detalles, con descripción y con ficha; editar uno de Michel (conserva sus Detalles); el reel con y sin presentaciones, con y sin ficha; el visor y el zoom; el «…» que abre el detalle. Capturas.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones de producto, presentaciones, catálogo del cliente, equipo y Mi marca.
- **PR abierto con preview.** Resume en español, corto: qué cambió, la migración y su ensayo, qué debe probar Lewis en el iPhone (Tienda de ensayo: crear un producto, subir una ficha, abrirla desde el catálogo; y Esencias Michel sin cambios) y lo que no pudiste probar (Safari físico).
