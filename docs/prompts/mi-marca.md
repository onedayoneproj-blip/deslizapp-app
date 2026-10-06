# Mi marca + bienvenida animada del retoque (rama `feat/mi-marca`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Incluye una migración con una tabla, un bucket y sus políticas, que son simples y siguen el patrón que ya existe; **si dudas de una política de seguridad, para y pregúntale a Lewis** en vez de improvisar. Cuando todo pase, **fusiona (squash) a `main`** según la regla de cierre de `docs/00`; deja el PR abierto solo si algo falla o decides algo que no estaba aquí.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md` (reglas de migraciones, «Dos Coding en paralelo» y cierre de PR), `AGENTS.md`, `HANDOFF.md`, `docs/09-sistema-de-diseno.md`, `docs/08-movimiento.md` (reglas de movimiento: solo `transform` y `opacity`, nada que bloquee un toque, apagado con `prefers-reduced-motion`), `docs/11-voz-y-frases.md`, `docs/13-admin.md` §7 y `docs/14-precios-y-lanzamiento.md` §2. Tu puesto es **Coding**.

Diseño aprobado: `referencias/mi-marca/` (LEEME y tableros `MiMarca`, `MiMarcaVacia`, `Bienvenida`, `AdminFoto`). **Abre `Bienvenida.dc.html` en un navegador: es animada y no hay captura que lo cuente.** No copies su HTML: se construye con `components/ui/`, los tokens del panel y `lib/movimiento.ts`.

Este PR toca `components/catalogo/ficha-medios.tsx` y el taller, igual que `docs/prompts/retoque-beta-y-tienda-de-ensayo.md`. Si ese PR no está en `main`, espéralo o haz rebase; no dupliques su etiqueta Beta ni sus textos.

## 1. Qué es y por qué

El retoque se hace **con la foto que manda la tienda y con su marca**. Quien retoca (hoy Lewis, con IA) necesita saber qué es «una foto de calidad» para esa tienda: sus mejores fotos de Instagram o cómo quiere que se vean. Por eso la tienda completa **Mi marca** y no puede pedir un retoque sin tenerla lista.

## 2. Datos (migración)

Aplica `docs/00`: antes `list_migrations`; ensaya con `BEGIN; … ROLLBACK;`; pregunta a Lewis antes de aplicar en la base compartida; el archivo lleva la versión que Supabase le puso; `npm run revisar:migraciones` da cero diferencias. **Ningún dato real de tiendas va en la migración.**

- **Ya existen y se reutilizan:** `tiendas.logo_url` (logo) y `tiendas.instagram` (sin `@`, con su restricción). No los dupliques.
- **Tabla `marca_tienda`** (una fila por tienda): `tienda_id uuid primary key` → `tiendas`, `palabras text[] not null default '{}'` (hasta 3, cada una de 1 a 24 caracteres, comprueba en la tabla), `evita text` (hasta 160, opcional), `actualizado_en timestamptz`.
- **Tabla `marca_referencias`**: `id uuid`, `tienda_id`, `ruta text` (ruta en el bucket), `orden int`, `creado_en`. **Máximo 6 por tienda** (compruébalo en la base, no solo en la app).
- **Bucket `marca-referencias`**, **privado** (las fotos de referencia son de uso interno, no del catálogo), imágenes `jpeg/png/webp`, hasta 5 MB, ruta `<tienda_id>/<archivo>`. La app reduce la foto antes de subirla con `reducirFoto`, como en los productos.
- **Políticas** (sigue el patrón de `20260929225923_seguridad_rls.sql` para «miembros de la tienda» y el de `admin_base` para admins):
  - Miembros de la tienda: leer, crear, cambiar y borrar **lo suyo**, en las dos tablas y en su carpeta del bucket.
  - Admins (`soy_admin()`): leer todo, nada más. No pueden escribir ahí.
  - Ver como (`admin_viendo`): lectura de la tienda que se está viendo, como en las demás tablas; **nada de escribir**.
  - `anon`: nada.
- Corre `get_advisors` (seguridad) después de aplicar y arregla lo que salga de tus objetos.
- **«Marca lista»** es una regla derivada, no una columna: hay **3 palabras y al menos 3 fotos de referencia**. Ponla en una sola función de `lib/` (y, si el admin la necesita en SQL, una vista o función aparte) para que app y admin digan lo mismo.

## 3. La pantalla «Mi marca» (panel de la tienda)

Es una **hoja** (los formularios del panel son hojas), según `MiMarca` y `MiMarcaVacia`.

- **Entrada:** una fila «Mi marca» en el menú que se abre al tocar el nombre de la tienda (`components/panel/menu-tienda.tsx`), con un punto de atención mientras no esté lista. También se abre sola desde el retoque (§4).
- **Campos:** logo (el existente, con su cambio), Instagram (`@` fijo, se guarda sin él), «Tu marca en 3 palabras» (3 campos cortos, obligatorios para que la marca esté lista), «Así quiero que se vean mis fotos» (de 3 a 6; arrastrar para ordenar no hace falta; quitar sí) y «Lo que no quiero» (una línea, opcional).
- **Estados:** vacía (aviso rojo «Faltan N fotos de referencia» según el tablero), parcial y lista («Tu marca está lista para el taller.», franja verde). Guarda con «Guardar», con confirmación «¿Salir sin guardar?» como las demás hojas.
- **Tarjeta «¿Todavía no tienes marca?»** (en la vacía): «Te la hacemos. Buscamos lo que tu tienda quiere decir y lo convertimos en logo, colores y estilo, como hicimos con Deslizapp.» El precio sale del registro de `precios_extra` del paquete «Marca y diseño» (míralo en la base; no escribas RD$5,000 a mano). Si no existe, no se muestra el precio. «Hablemos» abre WhatsApp con un mensaje ya escrito, usando `WHATSAPP_DESLIZAPP` de `lib/config.ts`; **hoy está vacío**: mientras lo esté, oculta el botón y dilo en el PR para que Lewis ponga el número.
- Los textos de la pantalla en la voz de `docs/11`, con la menor cantidad de palabras (principio de `docs/09`). Los del diseño son la base.
- **Ver como:** se ve, no se edita. **Demo:** funciona con datos locales, sin Supabase.

## 4. El retoque exige la marca

- Al tocar «Retocar foto» con la marca **no lista**, abre «Mi marca» con el aviso y, al guardarla lista, **sigue al pedido** sin que tenga que volver a tocar nada. Con la marca lista, sigue la bienvenida o el pedido normal.
- Con la marca lista, el pedido de retoque no cambia (reserva créditos, etc.): no toques `pedir_retoque` salvo que haga falta para algo de este PR, y dilo.

## 5. La bienvenida animada (`Bienvenida`)

- **Cuándo:** la primera vez que se toca «Retocar foto» en una tienda (y con la marca ya lista), **antes** de reservar créditos. Se recuerda por tienda y dispositivo en el almacenamiento local, con `try/catch` (sin almacenamiento, sale cada vez, sin romper nada). El enlace «Cómo funciona» de la ficha la abre otra vez; entonces el botón principal sigue siendo «Retocar foto» y cancelar cierra.
- **Qué lleva:** exactamente lo del tablero. En la escena usa **la foto real del producto** y **hasta 3 referencias reales de la tienda** (las miniaturas «Tu marca»). La versión «después» es una **ilustración**: la misma foto con más luz y un fondo suave (filtro y capas), nunca un resultado inventado ni de otra foto. Así se cuida la franja de honestidad: «Tu producto sigue siendo tu producto…».
- **Movimiento:** corre una vez (~2,5 s), solo `transform` y `opacity`, sin librerías, sin bloquear toques. La hoja usa el movimiento de `components/hoja.tsx`; las excepciones de la escena se documentan en `docs/08-movimiento.md` (solo para esta pantalla). Con `prefers-reduced-motion` se ve el resultado directo. Los toques y «Cancelar» funcionan durante la animación.
- **Textos:** los del tablero, sin signos de exclamación. No inventes un tiempo de entrega (`TIEMPO_RETOQUE_TEXTO` en `lib/config.ts` queda vacío hasta que Lewis lo fije).
- No se muestra en Ver como.

## 6. En el admin (Trabajo › Fotos)

- En cada pedido de retoque, el bloque «Su marca» del tablero `AdminFoto`: sus referencias (tocar abre grande), las 3 palabras, «Lo que no quiere» e Instagram. Si la marca no está lista (retoques pedidos antes de que existiera Mi marca, como los de Michel), dilo («Esta tienda todavía no completó su marca») y deja trabajar igual.
- **«Copiar instrucciones»:** copia un texto listo para pegar en la IA, con este formato (valores de la tienda; sin las líneas que no tengan dato):
  `Retoca esta foto para <tienda>. Marca: <palabra 1>, <palabra 2>, <palabra 3>. Estilo: como las fotos de referencia. Evita: <lo que no quiero>. No cambies el producto.`
  Muestra un aviso corto al copiar.
- El admin **lee**; no escribe nada de la marca de la tienda (las políticas ya lo impiden).

## 7. Pruebas y cierre

- Pruebas de la regla «marca lista» (casos de 0, 2 y 3 fotos; 2 y 3 palabras), del tope de 6, del texto de «Copiar instrucciones» y de que la bienvenida sale una vez por tienda.
- En la **tienda de ensayo** (la que creó `retoque-beta-y-tienda-de-ensayo`, mira su `id` en ese PR): completar Mi marca, pedir un retoque, ver la bienvenida con sus fotos, y en `/admin` ver la marca al lado del pedido. **No pruebes con Esencias Michel ni dejes datos de prueba en tiendas reales.**
- Prueba también: Ver como (solo mirar), demo, modo oscuro (si el panel ya lo soporta; si no, no lo presentes como validado), `prefers-reduced-motion`.
- `tsc`, tests, lint y build sin errores nuevos; scripts de regresión de la ficha y del admin; `npm run revisar:migraciones` en cero.
- Novedad en el panel con el siguiente número de versión (mira `lib/novedades.ts`), con una frase en la voz de la marca.
- Resume en español, corto: qué cambió, qué quedó pendiente de Lewis (el número de WhatsApp de `WHATSAPP_DESLIZAPP`, el precio del paquete de marca si no existe en `precios_extra`) y qué debe probar él.
