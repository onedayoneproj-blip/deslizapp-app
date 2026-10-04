# Catálogo conectado, parte 1: base de datos y capa de datos (rama `feature/catalogo-base`)

Este prompt prepara Supabase y la capa de datos de la app para el catálogo público conectado. **No hay pantallas nuevas**: la app tiene que verse y funcionar exactamente igual que hoy al terminar. Las pantallas vienen en las partes 2, 3 y 4.

Antes de empezar lee completo `docs/12-catalogo-conectado.md` (la especificación, decidida con Lewis) y `docs/03-modelo-de-datos.md`. Si algo de este prompt choca con la especificación, gana la especificación y lo anotas en el PR.

Proyecto de Supabase: `euihaeyfdlpvmbtfzvnt`. Sigue las reglas de siempre en las funciones: `security definer`, `set search_path = ''`, nombres con esquema (`public.…`, `extensions.…`), `revoke all … from public, anon` y `grant execute … to authenticated` (o `to anon, authenticated` en las públicas, solo donde este prompt lo dice). Errores con códigos cortos en español (`slug_en_uso`, `variante_invalida`…) y su `errcode`, como en las migraciones que ya existen.

## 0. Cómo se aplica (importante)

- Son **cuatro migraciones**, en este orden, en `supabase/migrations/`:
  1. `20261004010000_productos_slug_tipo_medios_detalles.sql`
  2. `20261004020000_variantes_y_stock.sql`
  3. `20261004030000_catalogo_publico.sql`
  4. `20261004040000_datos_esencias_michel.sql`
- Cada una tiene que ser **compatible con la app que está hoy en producción** (main): la app vieja sigue leyendo y escribiendo `fotos`, `foto_retocada`, `stock`, y llamando a `ajustar_stock`, `reponer_stock`, `guardar_producto_inventario`, `despachar_pedido`, `deshacer_despacho`, `editar_pedido`, `eliminar_pedido` y `registrar_venta_pasada` con los argumentos de hoy. Nada de eso puede romperse.
- **El número de cada archivo tiene que ser el mismo que Supabase guarda.** Hoy hay archivos del repo con un número distinto al que tiene Supabase en su historial (ver `docs/prompts/reconciliar-migraciones.md`). Para no sumar más: aplica cada migración, mira con `list_migrations` qué `version` le puso Supabase, y **renombra el archivo a esa versión** antes del commit (por ejemplo, si Supabase la guardó como `20261004023117`, el archivo es `20261004023117_productos_slug_tipo_medios_detalles.sql`). En el PR pon la tabla archivo ↔ versión de Supabase de las cuatro. No toques los archivos viejos: eso va en otra tarea.
- Aplícalas una por una en Supabase. Después de cada una corre su parte del script de verificación (§7). **Si una falla, para**, no apliques la siguiente, deja el PR abierto y explica qué pasó.

## 1. Migración 1: productos (slug, tipo, medios, detalles, por encargo)

En `public.productos` agrega:

- `slug text` — corto, único por tienda (`unique (tienda_id, slug)`), formato `^[a-z0-9]+(-[a-z0-9]+)*$`, de 1 a 40 caracteres. Llénalo para todos los productos existentes a partir del nombre (minúsculas, sin tildes, espacios a guiones, sin símbolos; si choca dentro de la tienda, agrega `-2`, `-3`…). Después `not null`. Un trigger `before insert` lo genera igual cuando llega vacío. Se puede cambiar después (otro slug válido y libre).
- `tipo text not null default 'producto' check (tipo in ('producto','servicio'))`. Un servicio no puede tener `stock` (debe ser null), ni variantes, ni `por_encargo`.
- `medios jsonb not null default '[]'` — lista ordenada. Cada elemento: `{"tipo":"foto","url":…,"retocada":bool}` o `{"tipo":"video","url":…,"portada":…,"duracion_s":entero 1..30}`. Máximo 10 elementos y 2 videos. Valida forma, tipos y límites con un `check` (función inmutable `public.medios_validos(jsonb)`).
  - Llénalo desde `fotos` (cada foto → `{"tipo":"foto","url":…,"retocada":false}`; la primera con `retocada = foto_retocada`).
  - **Sincronía mientras la app use `fotos`:** trigger `before insert or update` en productos:
    - si cambió `medios` → `fotos` = las `url` de las fotos de `medios`, en orden, y `foto_retocada` = `retocada` de la primera foto;
    - si cambió `fotos` (o `foto_retocada`) y no `medios` → reconstruye las fotos de `medios` desde `fotos`, **conservando los videos** en las posiciones donde estaban (o al final si ya no caben).
  - `fotos` se borra en una migración futura, cuando ninguna pantalla la use. No la toques ahora.
- `por_encargo boolean not null default false` y `encargo_texto text check (encargo_texto is null or char_length(encargo_texto) between 1 and 40)`.
- **Detalles por rubro:** crea `lib/rubros.ts` con la lista exacta de `docs/12-catalogo-conectado.md` §1 (llave, nombre visible, tipo de dato y, cuando aplica, los valores permitidos) y las opciones típicas por rubro. En la base, `public.detalles_validos(p_rubro text, p_detalles jsonb) returns boolean` con la misma lista, y un trigger en productos que la aplica con el rubro de la tienda (`detalles_invalidos`, 22023). Reglas:
  - Todas las llaves son opcionales. `descripcion` (texto, ≤ 600) vale en todos los rubros.
  - Tipos: `texto` = string de 1 a 120 (salvo `descripcion`); `numero` = entero > 0; `lista` = arreglo de 1 a 12 strings de 1 a 40; `elegir` = uno de los valores permitidos.
  - Perfumes: `marca` texto, `para` elegir (`ella`, `el`, `unisex`), `tamano_ml` número, `concentracion` elegir (`edp`, `edt`, `parfum`, `extrait`, `colonia`), `familia` texto, `ocasiones` lista con valores de: `Día`, `Oficina`, `Universidad`, `Verano`, `Primavera y verano`, `Salidas casuales`, `Noche`, `Citas`, `Cenas`, `Fiestas`, `Noches casuales`, `Ocasiones especiales` (los mismos del HTML, para que el filtro Día/Noche funcione igual), `notas_salida`, `notas_corazon`, `notas_fondo` listas.
  - Ropa: `material`, `corte`, `cuidado` texto; `para` elegir (`ella`, `el`, `unisex`, `ninos`).
  - Accesorios: `material`, `medidas` texto; `para` elegir (`ella`, `el`, `unisex`).
  - Belleza: `contenido`, `tipo_piel`, `modo_uso` texto; `ingredientes` lista.
  - Comida: `porcion`, `conservacion`, `anticipacion` texto; `ingredientes` lista.
  - Hogar: `medidas`, `material`, `cuidado` texto.
  - General: `marca`, `tamano` texto.
  - Servicio (cualquier rubro): además `duracion_min` número.
  - Si una tienda cambia de rubro, los detalles que ya no valen se conservan (no se validan al cambiar el rubro, solo al editar el producto) y la app los ignora.
  - Una prueba en `tests/` compara `lib/rubros.ts` con `detalles_validos` (lee la función de la migración o llama a la base) para que no se separen.
- `opciones` sigue siendo la lista de ejes (`[{"nombre":"Talla","valores":["S","M"]}]`). Agrega un `check` de forma: máximo 2 ejes, nombres de 1 a 20 únicos, de 1 a 12 valores de 1 a 20 únicos por eje.

## 2. Migración 2: variantes y stock por variante

Tabla **`public.producto_variantes`**:
- `id uuid pk default gen_random_uuid()`, `tienda_id uuid not null` (fk tiendas, cascade), `producto_id uuid not null` (fk productos, cascade), `valores jsonb not null` (objeto `{"Talla":"M","Color":"Negro"}`), `stock integer check (stock is null or stock >= 0)`, `precio integer check (precio is null or precio >= 0)`, `activa boolean not null default true`, `orden smallint not null default 0`, `creado_en`, `actualizado_en`.
- `unique (producto_id, valores)`. Trigger que valida: la variante es de la misma tienda que el producto, el producto es de `tipo = 'producto'`, y `valores` tiene exactamente una llave por eje de `productos.opciones`, con un valor que existe en ese eje.
- RLS: lectura y escritura para miembros de la tienda (`tienda_id in (select public.mis_tiendas())`), igual que productos.
- **`productos.stock` con variantes = la suma:** trigger `after insert/update/delete` en variantes que pone `productos.stock` = suma del stock de las variantes activas (null si todas son null). Si el producto se queda sin variantes, `stock` vuelve a ser editable y queda como estaba la suma.
- **Guardar opciones y variantes juntos:** `public.guardar_variantes(p_tienda_id uuid, p_producto_id uuid, p_opciones jsonb, p_variantes jsonb)` (authenticated):
  - guarda `opciones` y deja exactamente esas variantes; cada variante trae `valores`, `stock`, `precio`, `activa`, `orden`;
  - las que ya existían se reconocen por `valores` y conservan su `id`;
  - las que desaparecen se borran, salvo que tengan pedidos: entonces quedan `activa = false`;
  - registra en `ajustes_inventario` cada cambio de stock de variante con `motivo = 'correccion_inventario'`;
  - con `p_opciones = '[]'` quita las variantes (mismas reglas) y el producto vuelve a stock simple.
- `ajustes_inventario` suma `variante_id uuid` (fk variantes, `on delete set null`).
- **`ajustar_stock`** y **`reponer_stock`**: suma un argumento opcional al final, `p_variante_id uuid default null` (en `reponer_stock`, cada item puede traer `variante_id`). Bórralas y vuelve a crearlas con el argumento nuevo al final, para que las llamadas de hoy (sin ese argumento) sigan funcionando. Si el producto tiene variantes activas y no viene `variante_id` → `usar_variante` (22023). Con variante, el ajuste va a la variante (y la suma sube sola).
- **`guardar_producto_inventario`**: si el producto tiene variantes activas, el cambio de stock se rechaza con `usar_variante` (los demás cambios sí se guardan). Sin variantes, igual que hoy.
- **`pedido_items`** suma `variante_id uuid` (fk variantes, `on delete restrict`), `variante_texto text` (foto fija, ej. "Talla M · Negro"; la arma la base desde `valores` en el orden de los ejes, separados por " · ") y `por_encargo boolean not null default false`. `validar_item_pedido` además revisa que la variante sea de ese producto, y que un producto con variantes activas no entre a un pedido sin `variante_id`.
- **`editar_pedido`** y **`registrar_venta_pasada`**: cada item de `p_items` puede traer `variante_id` y `por_encargo`. Precio por defecto: `variantes.precio` si existe, si no `productos.precio`. Mismos argumentos de hoy (son campos dentro del jsonb).
- **`despachar_pedido`, `deshacer_despacho`, `eliminar_pedido` y el descuento de stock en `editar_pedido` / `registrar_venta_pasada`**: agrupan por `(producto_id, variante_id)`:
  - item con variante → valida y mueve el stock de la variante (bloquea la fila de la variante y la del producto);
  - item sin variante → como hoy, en el producto;
  - item con `por_encargo = true` → **no toca el stock** ni lo valida;
  - el error `stock_insuficiente: <nombre>` nombra la variante cuando aplica ("Camisa de lino · L · Arena").

## 3. Migración 3: lo público (catálogo, solicitudes, aaah, avisos)

Ninguna función pública devuelve stock exacto mayor que 3, costos, clientes, códigos de promo ni datos internos. Todas revisan que la tienda tenga `estado = 'activa'` y `catalogo_estado = 'publicado'` (si no, `catalogo_no_disponible`, P0002). Para valores al azar usa `extensions.gen_random_bytes`.

**Disponibilidad** (función interna `public.disponibilidad(stock integer, por_encargo boolean)`): `hay` si stock es null o > 3 · `quedan` si 1 a 3 (y devuelve el número) · `agotado` si 0 y sin encargo · `por_encargo` si 0 con encargo.

**`public.catalogo_publico(p_slug text) returns jsonb`** (anon y authenticated):
- `tienda`: `slug`, `nombre`, `logo_url`, `foto_perfil_url`, `marca_color_principal`, `marca_color_acento`, `marca_estilo`, `personalizacion`, `whatsapp`, `instagram`, `descripcion`, `nombre_vendedora`, `rubro`.
- `productos` (solo `activo = true`, ordenados como los ordena hoy la app: destacados primero, luego más nuevos): `id`, `slug`, `nombre`, `tipo`, `categoria`, `precio`, `precio_promo` (con promo automática de producto o colección vigente, o null), `promo` (nombre y porcentaje, o null), `medios`, `detalles`, `opciones`, `likes`, `disponibilidad`, `quedan`, `encargo_texto` (si aplica), y `variantes` (solo activas: `id`, `valores`, `precio`, `precio_promo`, `disponibilidad`, `quedan`).
- **Promos en SQL:** escribe `public.precio_con_promo(p_producto_id uuid, p_precio integer, p_ahora timestamptz)` que replica exactamente `precioConPromo` de `lib/promos.ts` (tipos producto y colección, vigencia por fechas, `pausada`, la mejor promo si hay varias). Agrega una prueba que compare la función de TypeScript con la de SQL en los mismos casos (vigente, programada, terminada, pausada, dos promos a la vez, colección).

**`public.solicitudes_pedido`** (tabla):
- `id`, `tienda_id`, `codigo text unique not null` (10 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), `items jsonb not null` (foto fija por item: `producto_id`, `variante_id`, `nombre`, `variante_texto`, `foto`, `precio_unitario`, `cantidad`, `por_encargo`), `codigo_promo text`, `descuento integer not null default 0`, `total integer not null`, `dispositivo text not null` (≤ 64), `creada_en`, `vence_en` (+7 días), `pedido_id uuid` (fk pedidos, `on delete set null`), `descartada_en timestamptz`.
- RLS: lectura para miembros de la tienda. Sin políticas de escritura (solo funciones).

**`public.crear_solicitud_pedido(p_slug text, p_items jsonb, p_codigo_promo text, p_dispositivo text) returns jsonb`** (anon y authenticated):
- `p_items`: 1 a 30 items `{producto_id, variante_id?, cantidad}` (cantidad 1 a 20). Cada producto debe ser de esa tienda, visible y pedible (`hay`, `quedan` o `por_encargo`; si tiene variantes, `variante_id` es obligatorio y la variante debe ser pedible). Si no → `producto_no_disponible: <nombre>`.
- La base calcula precios (`precio_con_promo`), el código (solo códigos de promo vigentes **sin** `cliente_id`, con su límite de usos; si no vale → `codigo_no_valido` y no se crea nada) y el total. Nunca confía en precios que mande el navegador.
- Límites: 10 por `dispositivo` por hora y 300 por tienda por día (`demasiadas_solicitudes`, 54000). Antes de crear, borra las solicitudes vencidas sin registrar de esa tienda.
- Devuelve `codigo`, `total` y el resumen.

**`public.ver_solicitud(p_codigo text) returns jsonb`** (anon y authenticated): la tienda (nombre, slug, logo, foto de perfil, whatsapp), los items de la foto fija, total, descuento, `creada_en`, y el **estado**: `enviado` (sin registrar, vigente) · `confirmado` (pedido nuevo o por despachar) · `despachado` · `cancelado` · `vencido` (pasó `vence_en` sin registrar, o descartada). Si el código no existe → `solicitud_no_encontrada`. Para un miembro de la tienda con sesión agrega `es_mi_tienda: true`.

**`public.registrar_solicitud(p_solicitud_id uuid, p_cliente_id uuid, p_cliente_nuevo jsonb, p_quitar uuid[], p_encargo uuid[]) returns public.pedidos`** (authenticated, miembro de la tienda):
- Solicitud vigente, sin registrar ni descartar (si no, `solicitud_no_registrable`).
- Cliente: `p_cliente_id` existente de la tienda, **o** `p_cliente_nuevo` `{nombre, telefono}` → se crea con `origen = 'catalogo'` (si el teléfono ya es de un cliente de la tienda → `cliente_duplicado` con el id existente en el detalle, igual que `crearCliente` hoy).
- `p_quitar`: items (por `producto_id` o `variante_id`) que se quitan. `p_encargo`: items que pasan a `por_encargo = true`.
- Crea el pedido `origen = 'catalogo'`, `estado = 'nuevo'`, `pago_modo = 'contado'`, con los items y el código de la solicitud (recalcula el total con lo quitado), y guarda `pedido_id`.
- Si después de quitar no queda ningún item → `pedido_vacio`.

**`public.descartar_solicitud(p_solicitud_id uuid)`** (authenticated, miembro): pone `descartada_en`.

**Aaahs:** `eventos_aaah` suma `dispositivo text` (null en los que ya existen) y `unique (producto_id, dispositivo)`. **`public.registrar_aaah(p_slug text, p_producto_id uuid, p_dispositivo text, p_on boolean)`** (anon y authenticated): con `true` lo inserta si no existe; con `false` lo borra. El trigger de `likes` que ya existe sigue sumando y restando. Límite: 120 por dispositivo por hora.

**Avísame:** tabla **`public.avisos_llegada`**: `id`, `tienda_id`, `producto_id` (cascade), `variante_id` (cascade, null si no aplica), `telefono text not null` (solo dígitos con código de país, como `tiendas.whatsapp`), `nombre text` (≤ 60), `dispositivo text not null`, `creado_en`, `avisado_en`. Índice único parcial `(producto_id, coalesce(variante_id, '00000000-0000-0000-0000-000000000000'), telefono) where avisado_en is null`. RLS: lectura para miembros.
- **`public.pedir_aviso(p_slug, p_producto_id, p_variante_id, p_telefono, p_nombre, p_dispositivo)`** (anon y authenticated): solo si eso está `agotado` (o `por_encargo`); normaliza el teléfono dominicano igual que `lib/telefono.ts` (10 dígitos → `1` + número; acepta 11 con 1 delante). Si ya existe, no duplica. Límite: 10 por dispositivo por hora.
- **`public.marcar_avisado(p_aviso_ids uuid[])`** (authenticated, miembro).

## 4. Migración 4: datos de Esencias Michel

Solo para la tienda `esencias-michel`. Llena `slug` y `detalles` desde `public/catalogos/esencias-michel.html` (el arreglo `PRODUCTS`). Lee ese arreglo con un script (no a mano) y genera los `update` de la migración. Emparejamiento por nombre:

| HTML (`id` → slug) | Producto en la base |
|---|---|
| `mayar` | Mayar Natural Intense |
| `zakat` | Zakat |
| `majestic` | Majestic |
| `parade` | Parade |
| `urbantoy` | Urban Toy Bubble Gum |
| `she` | Shé |
| `oxana` | Oxana Black |
| `wildflower` | Wild Flower Gold |
| `kiara` | Kiara Pink |
| `asad-bourbon` | Lattafa Asad Bourbon |
| `pistache-absolu` | Orientica Pistache Absolu |
| `yara-rosa` | Lattafa Yara rosa |
| `delilah` | Maison Alhambra Delilah |

Los dos que no están en el HTML conservan el slug que les dio la migración 1 (`mirsaal-valentine`, `zakat-z36`).

De cada producto del HTML: `line` → `marca` · `gender` (`Mujer` → `ella`, `Hombre` → `el`, `Unisex` → `unisex`) → `para` · `size` ("EDP 100 ml") → `tamano_ml` y `concentracion` · `family` → `familia` · `occasions` → `ocasiones` · `notes.top/heart/base` → `notas_salida/corazon/fondo` (separa por comas y " y ") · `desc` → `descripcion`. Si un campo viene vacío o null, no se escribe. No toques precios, stock, fotos ni visibilidad. No migres `rifa` ni las reseñas.

## 5. Capa de datos y tipos (sin pantallas nuevas)

- `lib/types.ts`: `Producto` suma `slug`, `tipo`, `medios`, `porEncargo`, `encargoTexto`, `variantes?`; tipos nuevos `Medio`, `Variante`, `Disponibilidad`, `SolicitudPedido`, `AvisoLlegada`, `CatalogoPublico`. `PedidoItem` suma `varianteId`, `varianteTexto`, `porEncargo`.
- `lib/data/*` (Supabase **y** el modo demo con sus datos de `lib/data/seed/`): leer y escribir lo nuevo; funciones nuevas `guardarVariantes`, `solicitudesPendientes`, `registrarSolicitud`, `descartarSolicitud`, `avisosDeProducto`, `marcarAvisado`, y las públicas `catalogoPublico`, `crearSolicitudPedido`, `verSolicitud`, `registrarAaah`, `pedirAviso`. Los errores nuevos se traducen en `lib/data/errores.ts` con el tono de `docs/11-voz-y-frases.md`.
- En el modo demo, los productos traen `slug`, `medios` y detalles de ejemplo (la camisa de lino de ropa con Talla y Color sirve para probar variantes), y las funciones nuevas funcionan en memoria con las mismas reglas.
- Las pantallas de hoy no cambian. Lo que hoy escribe `fotos` sigue funcionando por el trigger de sincronía.

## 6. Componentes

Esta parte no lleva pantallas. Si por algo necesitas tocar una, usa los componentes de `components/ui/` (docs/09 §16.5). No copies HTML de los tableros.

## 7. Verificación

- `npm run lint`, `npm run build`, `npm test` y los scripts de siempre (`probar:hojas`, `probar:teclado`, `probar:inventario` y los demás que existan).
- **`supabase/tests/catalogo_conectado.sql`**: escenarios dentro de `begin … rollback` (no dejan nada guardado), que corres en el proyecto después de aplicar cada migración. Cada caso con `assert` o `raise exception` si falla:
  1. Slugs: todos los productos tienen uno y son únicos por tienda; uno nuevo sin slug recibe uno.
  2. Medios: cambiar `fotos` actualiza `medios` y conserva un video; cambiar `medios` actualiza `fotos` y `foto_retocada`; 3 videos o 11 elementos fallan.
  3. Detalles: válidos pasan; llave de otro rubro, tipo malo o valor no permitido fallan.
  4. Variantes: `guardar_variantes` crea 4 (2 × 2); la suma queda en `productos.stock`; `ajustar_stock` sin variante falla con `usar_variante`; con variante ajusta y registra el ajuste.
  5. Pedido con variante: despachar baja la variante, deshacer la devuelve, sin stock falla nombrando la variante; un item `por_encargo` no toca stock.
  6. Lo de hoy sigue igual: un pedido sin variantes se despacha y deshace como antes; `ajustar_stock` con los 5 argumentos de hoy funciona.
  7. `catalogo_publico('esencias-michel')` como `anon`: trae solo visibles, sin stock mayor que 3, con `disponibilidad` correcta (Oxana `agotado`, Mayar `quedan` 1), con detalles y slugs del HTML.
  8. Solicitud como `anon`: se crea, cobra lo que dice la base (no lo que mande el navegador), rechaza un agotado, un código con `cliente_id` y el límite por dispositivo; `ver_solicitud` dice `enviado`; `registrar_solicitud` con un cliente nuevo crea pedido y cliente, y `ver_solicitud` pasa a `confirmado`; quitar todos → `pedido_vacio`.
  9. Aaah: encender suma 1 a `likes`, apagar resta 1, repetir no duplica.
  10. Avísame: en un agotado se crea, en uno con stock falla, repetido no duplica, `marcar_avisado` lo cierra.
  11. Seguridad: como `anon` no se puede leer ninguna tabla nueva ni llamar `registrar_solicitud`, `guardar_variantes` ni `marcar_avisado`; un miembro de otra tienda tampoco.
- Corre `get_advisors` (seguridad y rendimiento) en Supabase y arregla lo que salga de estas migraciones.
- Regenera los tipos de Supabase si el proyecto los usa.
- Abre la app en producción después de aplicar (sin merge todavía) y revisa que Catálogo, Inventario, + Pedido, despachar y deshacer funcionen igual.

## 8. Cierre

- PR contra `main` con: qué se creó en cada migración, el resultado del script de verificación (los 11 casos) y de los advisors, y cualquier decisión que no estaba aquí.
- Si todo pasa, haz el merge tú mismo (squash) y borra la rama.
- Si algo falla, o tuviste que decidir algo que cambia la especificación, deja el PR abierto y explícalo.
