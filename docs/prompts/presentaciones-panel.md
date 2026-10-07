# Presentaciones del producto, parte 1: el panel y los datos (rama `feat/presentaciones-panel`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Una migración **aditiva** (foto por color). Cuando todo pase, **fusiona (squash) a `main`** (solo toca el panel y datos que el comprador todavía no usa); deja el PR abierto solo si algo falla o decides algo que no estaba aquí. La parte 2 (`presentaciones-catalogo.md`) va después.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md` (en especial las reglas de teclado, movimiento, permisos de colaboradores y la nota sobre las herramientas de Supabase que se cuelgan con `drop function` y con cuerpos que llevan `delete from`), `docs/09-sistema-de-diseno.md` y `docs/11-voz-y-frases.md`. Tu puesto es **Coding**.

Diseño aprobado: `referencias/presentaciones/` (**abre los `.dc.html` en un navegador**; empieza por `LEEME.md`). No copies su HTML: se construye con `components/ui/` y los tokens del panel.

Mira antes: `components/catalogo/ficha-opciones.tsx` (la sección «Opciones» de hoy), `components/catalogo/hoja-producto.tsx`, `lib/rubros.ts` (`OPCIONES_TIPICAS`), `lib/colores.ts`, `components/ui/fila-variante.tsx`, `lib/data/fuente.ts`, `lib/data/supabase.ts`, `lib/data/demo.ts`, y en la base `producto_variantes`, `guardar_variantes`, `opciones_validas`, `texto_variante`.

## 1. Qué decidió Lewis (7 oct 2026)

1. **Un producto con presentaciones**, no un producto por cada talla o tamaño. El producto lleva lo común (nombre, descripción, fotos, precio base); cada presentación lleva lo suyo (su talla, color o tamaño, su stock y, si hace falta, su precio).
2. Cada presentación tiene **su propia hoja de edición**.
3. Para crear muchas de golpe (4 tallas × 3 colores) se eligen los valores y salen todas; para una sola, «Agregar presentación».
4. La **foto va por color**, no por combinación: se elige entre las fotos que ya tiene el producto.
5. **Nombre en el panel: «Presentaciones»** (el catálogo del cliente dice «Elige tu talla / tamaño», según lo que varíe).
6. Quitar una presentación que ya vendió **la oculta, no la borra**.
7. Cuenta como **un solo producto** para el límite del plan.

## 2. Lo que ya existe (verificado en el código; no lo rehagas)

- Los productos ya tienen `opciones` (hasta **2 ejes**, hasta 12 valores cada uno, 20 caracteres) y `producto_variantes` con `valores`, `stock`, **`precio` (nullable)**, `activa` y `orden`. `guardar_variantes` (hasta 144) ya acepta `precio` y `activa`: una variante que desaparece se **borra si no tiene pedidos y queda inactiva si los tiene**, y cada cambio de stock queda en el historial. La app lo llama «Opciones» + «Stock» y casi no se ve: una fila discreta «Agregar opción».
- La base ya calcula el precio de una variante (`coalesce(precio de la variante, precio del producto)`) en pedidos.
- **Falta:** poder escribir el **precio propio** en el panel, la **foto por color**, la hoja de cada presentación, el flujo de «crear varias a la vez», el nombre y el empujón para que se descubra, y las presentaciones típicas de los perfumes.

## 3. Lo que se construye en el panel

Todo con el diseño de `referencias/presentaciones/`, **solo para productos de tipo `producto`**.

1. **La sección «Presentaciones»** (reemplaza «Opciones»), arriba del Stock:
   - **Sin presentaciones:** la tarjeta de `Main` («¿Viene en varias tallas, colores o tamaños?», «Agregar presentaciones», «No, solo viene de una forma», que deja el stock simple de hoy). En tiendas de ropa, accesorios, belleza, comida, hogar y perfumes la tarjeta se ve; en `general` también (no se esconde por rubro).
   - **«¿Qué cambia de una a otra?»** (`Elegir`): pastillas con las típicas del rubro (`OPCIONES_TIPICAS`) y «Otra…» (hasta 2). Valores con los atajos que ya existen («XS a XL», «36 a 42», «Única») y, para perfumes, «Tamaño» con atajos «30 · 50 · 100 ml». Muestra «Salen N presentaciones» y **«Crear las N»**.
   - **Con presentaciones** (`Lista`): una fila por combinación, con la muestra de color si el eje es Color, su estado («Quedan 2», «Agotada», «RD$ 2,100 · precio propio»), stock con − / + (el mismo `Cantidad` y el mismo motivo de ajuste de hoy al restar), filtro por el primer eje (pastillas), «Ver las N» cuando pasen de cinco, «Agregar presentación» (suelta) y «Cambiar qué varía».
2. **La hoja de UNA presentación** (`Hoja`; `Hoja altura="auto"`): stock, precio («El mismo» / «Uno propio», con `CampoMonto`), foto del color (ver §4), «Ocultar esta presentación» (activa = false) y «Quitar» (pide confirmación; si tiene pedidos, dice «Ya tiene pedidos: la ocultamos para no perder tu historial» y solo oculta).
3. **La foto de cada color** (`Foto`): una hoja con una fila por valor del eje Color (o del primer eje si no hay Color), su foto actual o «Sin foto: se ve la del producto», y un selector con las fotos del producto (y «subir otra aquí mismo», que la agrega a las fotos del producto).
4. **Cambiar qué varía:** conserva las presentaciones que existen con su stock; las que cambian de eje pasan a «Sin <eje>» y el dueño las completa. Nada se duplica ni se pierde; con pedidos, lo que desaparezca queda oculto (lo que ya hace `guardar_variantes`). Avisos en la voz de `docs/11`.
5. **En el catálogo del panel** (`Panel`): la tarjeta del producto dice «Desde RD$ X · N presentaciones», con las etiquetas «N agotadas» y «N en total». «Por reponer» y «Tu inventario» listan por presentación («Camisa de lino · L · Negro»), como ya hacen con variantes; compruébalo.
6. **Perfumes:** agrega `Tamaño` a `OPCIONES_TIPICAS.perfumes` (hoy no sugiere ninguna) sin cambiar nada de los perfumes que ya existen.
7. **Permisos de colaboradores (PR #61):** todo lo que cambia presentaciones es del grupo `catalogo`. Un Ayudante las ve pero «Agregar», «+/−», la hoja y la foto salen apagados con «Esto lo hace quien administra la tienda.» (reutiliza `usePermisos()` / `sinCatalogo`). Ver como y solo mirar: no se escribe.
8. **Teclado e iPhone:** las hojas con campos (`precio`, valores nuevos) siguen las reglas de `HANDOFF.md`; agrega los campos a `scripts/probar-teclado.mjs`.

## 4. Datos: la foto por color (migración aditiva)

Hoy `opciones_validas` **rechaza cualquier llave que no sea `nombre` y `valores`**, así que la foto no puede vivir dentro de `opciones` sin reescribir esa función. Propuesta (tú decides los detalles tras auditar, y lo explicas en el PR):

- Una columna nueva en `productos`, p. ej. **`fotos_por_valor jsonb not null default '{}'`**, con la forma `{"Color": {"Negro": "<url de una de las fotos del producto>"}}`, validada por una función nueva (el eje existe en `opciones`, el valor existe en el eje y la URL es una de las fotos de `medios`).
- Una **función nueva** `guardar_foto_valor(...)` (no reescribas `guardar_variantes`: contiene `delete from` y las herramientas de Supabase se cuelgan con eso), con `exigir_no_viendo` y `exigir_permiso(..., 'catalogo')` como el resto, y revocada a `public` y `anon`.
- Si una foto sale de `medios`, o un valor sale de `opciones`, su entrada se limpia (por la misma función que guarda medios u opciones, o por un trigger; elige lo más simple y compruébalo).
- Que el catálogo público la pueda leer: **añádela a lo que devuelve `catalogo_publico`** con `create or replace` y **la misma firma**, sin `drop`. (La lectura en el comprador se usa en la parte 2.)
- Migración nueva (nunca edites una aplicada), ensayo en `BEGIN; … ROLLBACK;` con `execute_sql` sobre la base real, luego replay (`probar:admin-db`), luego `apply_migration`; el archivo lleva la versión que asigne Supabase. `list_migrations` antes (Lewis trabaja con una sola sesión a la vez; no hace falta preguntarle). `npm run revisar:migraciones` en cero y `get_advisors` sin nada nuevo. Ningún dato real en migraciones.
- Demo: `lib/data/demo.ts` con la misma regla. Ponle presentaciones con foto por color a un producto de Lino & Algodón, y una presentación con **precio propio** (XL más cara). Un perfume de la demo con «Tamaño» (30 / 50 / 100 ml) y precio distinto.

## 5. Reglas

- Texto de la app en español, con la voz de `docs/11` y mínimo. Los textos de los tableros son la base.
- Movimiento solo el de las hojas (`docs/08`); nada que anime filas o listas. Áreas de toque de 44 px, contraste AA; «Agotada» y «precio propio» nunca dependen solo del color.
- No cambies cómo se ve ni cómo se guarda un producto **sin** presentaciones.
- Cuidado con el límite de 144 presentaciones y 2 ejes (`MAX_EJES`): no los subas.

## 6. Pruebas y cierre

- Pruebas unitarias: crear N combinaciones, quitar con y sin pedidos (oculta / borra), cambiar qué varía, precio propio, foto por color (y que se limpie al quitar la foto o el valor), «Desde» y los conteos, Ayudante apagado.
- Replay y pruebas de la base de la migración nueva (permisos por nivel, Ver como, la limpieza, la lectura pública).
- Navegador (`scripts/probar-presentaciones.mjs`, demo, 390 y 360, tema claro): los recorridos de los tableros `Main` → `Elegir` → `Lista` → `Hoja` → `Foto`, el perfume, y el Ayudante.
- `tsc`, `npm test`, `npm run lint` (sin avisos nuevos), `npm run build` y las regresiones de producto, inventario, hojas, teclado, equipo, Mi marca y retoque (el retoque sigue siendo por foto del producto: una foto de color es una de esas mismas fotos).
- Novedad en `lib/novedades.ts` (número siguiente al de `main`), una frase en la voz de la marca. Actualiza `docs/04-pantallas.md` y `docs/03-modelo-de-datos.md`.
- Resume en español, corto: qué cambió, qué debe probar Lewis (crear una camisa con tallas y colores en la demo de Lino & Algodón; un perfume con tamaños) y cualquier decisión que tomaste.
